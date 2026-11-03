const puppeteer=require('puppeteer-core');const url=require('./lib/serve');const fs=require('fs');
const S=require('path').resolve(__dirname,'..');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));const res=[];const ok=(n,c)=>res.push((c?'PASS ':'FAIL ')+n);
// mesma página publicada (com CSP), sem o cliente real do Supabase
let html=fs.readFileSync(S+'/pwa/index.html','utf8');
html=html.replace(/<script>window\.PRUMO_SB=.*?<\/script>\n?/,'').replace('<script src="supabase.js"></script>\n','');
fs.writeFileSync(S+'/e2e/authtest.html',html);
fs.writeFileSync(S+'/e2e/authframe.html','<!doctype html><iframe id="f" src="authtest.html"></iframe>');

const FAKE=require('./lib/fakesb');


(async()=>{const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox']});
const p=await b.newPage();await p.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
const errs=[];p.on('pageerror',e=>errs.push(e.message));
let dialogs=[];p.on('dialog',async d=>{dialogs.push(d.message());if(p.__dismiss)await d.dismiss();else await d.accept()});
await p.evaluateOnNewDocument(FAKE);
const ev=(f,...a)=>p.evaluate(f,...a);
const click=s=>ev(s=>{const e=document.querySelector(s);if(!e)throw new Error('missing '+s);e.click()},s);
const set=(s,v)=>ev((s,v)=>{const e=document.querySelector(s);e.value=v},s,v);
const submit=async()=>{await click('#g-b');await sleep(250)};
const msg=()=>ev(()=>document.querySelector('#g-e').textContent);
const title=()=>ev(()=>document.querySelector('#g-t').textContent);
const gateOpen=()=>ev(()=>!document.getElementById('gate').hidden);
const st=()=>ev(()=>JSON.parse(localStorage.getItem('prumo.v1')||'null'));
const auth=()=>ev(()=>window.__auth);
const nav=async u=>{await p.goto('about:blank');await p.goto(u,{waitUntil:'domcontentloaded'});await sleep(900)};
const reloaded=async()=>{await p.waitForNavigation({waitUntil:'domcontentloaded',timeout:5000}).catch(()=>{});await sleep(900)};
const base=await url('e2e/authtest.html');

// ---------- sem sessão: tela de entrada e app bloqueado ----------
await nav(base);
ok('no session: login screen shown',(await gateOpen())&&(await title())==='Entrar');
ok('no session: app is inert behind the gate',await ev(()=>document.querySelector('.wrap').hasAttribute('inert')));
await set('#g-em','dono@example.com');await set('#g-pw','errada');await submit();
ok('wrong password: generic message',(await msg())==='E-mail ou senha incorretos.');
await set('#g-em','ninguem@example.com');await set('#g-pw','qualquer');await submit();
ok('unknown e-mail: same message (no account enumeration)',(await msg())==='E-mail ou senha incorretos.');
await set('#g-pw','de-novo');await submit();
ok('repeated failures: client backoff',/Aguarde \d+s/.test(await msg()));

// ---------- cadastro ----------
await ev(()=>document.querySelector('[data-go=up]').click());await sleep(100);
ok('signup screen',(await title())==='Criar conta'&&!!(await ev(()=>document.querySelector('#g-pw[autocomplete=new-password]'))));
await set('#g-em','Nova@Example.com');await set('#g-pw','curta');await set('#g-pw2','curta');await submit();
ok('signup: short password rejected',/pelo menos 12/.test(await msg()));
await set('#g-pw','cafe-e-forte-2026');await set('#g-pw2','outro-cafe-2026x');await submit();
ok('signup: mismatch rejected',/não são iguais/.test(await msg()));
await set('#g-pw','nova@x-123456789');await set('#g-pw2','nova@x-123456789');await submit();
ok('signup: password containing e-mail rejected',/e-mail na senha/.test(await msg()));
await set('#g-pw','senha-vazada-123456');await set('#g-pw2','senha-vazada-123456');await submit();await sleep(200);
ok('signup: leaked password rejected',/vazamentos/.test(await msg()));
ok('leak check sends only a 5-char hash prefix',(await ev(()=>window.__hibp||[])).every(u=>/\/range\/[0-9A-F]{5}$/.test(u)));
await ev(()=>{window.__closed=1});
await set('#g-pw','cafe-e-forte-2026');await set('#g-pw2','cafe-e-forte-2026');await submit();await sleep(200);
ok('signup closed on server: friendly message',/indisponível/.test(await msg()));
await ev(()=>{window.__closed=0});await submit();await sleep(200);
const su=(await auth()).filter(a=>a[0]==='signup').pop();
ok('signup: e-mail normalized and redirect set',su[1]==='nova@example.com'&&/authtest\.html$|\/e2e\/$/.test(su[2]||''));
ok('signup: code screen names the e-mail',(await title())==='Confira seu e-mail'&&(await ev(()=>document.querySelector('#g-p b').textContent))==='nova@example.com');
ok('resend has cooldown',await ev(()=>document.querySelector('[data-go=resend]').disabled));
await set('#g-code','000000');await submit();
ok('wrong code rejected',/inválido ou expirado/.test(await msg())&&(await gateOpen()));
await set('#g-code','123 456');await submit();await sleep(400);
const vf=(await auth()).filter(a=>a[0]==='verify').pop();
ok('signup code verified as type email',vf[1]==='email'&&vf[3]==='123456');
ok('after confirmation: app unlocked',!(await gateOpen()));
let s=await st();ok('local data now belongs to the new account',s&&s.owner==='u3');

// e-mail com HTML no cadastro aparece como texto, nunca como marcação
await ev(()=>window.prumoLogout('local'));await reloaded();
await ev(()=>document.querySelector('[data-go=up]').click());await sleep(100);
await set('#g-em','<img/src=x/onerror=window.__xss=1>@a.co');await set('#g-pw','cafe-e-forte-2026');await set('#g-pw2','cafe-e-forte-2026');await submit();await sleep(300);
ok('e-mail shown as text (no injection)',!(await ev(()=>window.__xss))&&(await ev(()=>document.querySelectorAll('#g-p img').length))===0);
await ev(()=>document.querySelector('[data-go=in]').click());await sleep(100);

// ---------- dados isolados por conta ----------
await set('#g-em','dono@example.com');await set('#g-pw','senha-do-dono-123');await submit();await sleep(500);
ok('owner logs in',!(await gateOpen()));
await ev(()=>{const t=document.querySelector('[data-act=clear-ex]');if(t)t.click()});await sleep(100);
await click('.tab-add');await sleep(150);await p.type('#f-title','Segredo do dono');await click('[data-act=sh-save]');await sleep(1500);
s=await st();ok('owner task saved locally',s.owner==='u1'&&s.tasks.some(t=>t.title==='Segredo do dono'));
await ev(()=>{localStorage.setItem('prumo.brief','8');localStorage.setItem('prumo.wrap.2026-11-02','1')});
await ev(()=>{window.__calls=[]});
await ev(()=>{document.querySelector('.tab[data-t=hoje]').click();document.querySelector('[data-act=perfil]').click()});await sleep(200);
ok('settings offer sign out everywhere',!!(await ev(()=>document.querySelector('[data-act=lock-all]'))));
await click('[data-act=lock]');await reloaded();
ok('sign out: gate shown again',await gateOpen());
ok('sign out: all account data removed from this device',await ev(()=>{const v=JSON.parse(localStorage.getItem('prumo.v1')||'null');return !localStorage.getItem('prumo.brief')&&!localStorage.getItem('prumo.wrap.2026-11-02')&&!(v&&(v.owner||v.tasks.some(t=>t.title==='Segredo do dono')))}));
ok('sign out: this device push removed and unsubscribed',await ev(()=>{const d=JSON.parse(localStorage.getItem('fake-pushdel')||'null');return !!d&&d[0]==='endpoint'&&d[1]==='https://web.push.apple.com/abc'&&localStorage.getItem('fake-unsub')==='1'}));
ok('sign out: session ended',await ev(()=>!localStorage.getItem('sb-test-auth-token')&&localStorage.getItem('fake-signout')==='"local"'));
await set('#g-em','outra@example.com');await set('#g-pw','senha-da-outra-12');await submit();await sleep(1500);
s=await st();
ok('second account sees nothing from the first',!(s&&s.tasks.some(t=>t.title==='Segredo do dono'))&&!/Segredo do dono/.test(await ev(()=>document.body.innerText)));
ok('second account never uploads the first one\'s data',!JSON.stringify(await ev(()=>window.__calls)).includes('Segredo do dono'));

// troca de conta sem sair (ex.: sessão trocada por fora): dados de outro dono são apagados antes de sincronizar
await ev(()=>{const v=JSON.parse(localStorage.getItem('prumo.v1'));v.owner='u1';v.tasks.push({id:'x1',title:'Dado de outra conta',status:'todo',day:null,est:15,ctx:'trabalho'});localStorage.setItem('prumo.v1',JSON.stringify(v))});
await p.reload({waitUntil:'domcontentloaded'});await reloaded();
s=await st();ok('foreign local data wiped on account mismatch',!(s&&s.tasks.some(t=>t.title==='Dado de outra conta'))&&(!s||s.owner==='u2'));

// sair não perde nada: ao entrar de novo, tudo volta do servidor
await ev(()=>window.prumoLogout('local'));await reloaded();
await set('#g-em','dono@example.com');await set('#g-pw','senha-do-dono-123');await submit();await sleep(1800);
s=await st();
ok('signing back in restores the account data from the server',!!s&&s.owner==='u1'&&s.tasks.some(t=>t.title==='Segredo do dono'));
ok('restored account has no example tasks mixed in',!!s&&!s.tasks.some(t=>t.ex));
ok('restored task is on screen',/Segredo do dono/.test(await ev(()=>document.body.innerText)));

// sair com alteração não enviada: pede confirmação; cancelar mantém a sessão
await ev(()=>{Object.defineProperty(navigator,'onLine',{get:()=>false,configurable:true})});
await click('.tab-add');await sleep(150);await p.type('#f-title','Feita offline');await click('[data-act=sh-save]');await sleep(300);
p.__dismiss=true;dialogs=[];
await ev(()=>window.prumoLogout('local'));await sleep(300);
ok('unsynced changes: asks before signing out',dialogs.some(d=>/não foram enviadas/.test(d))&&!(await gateOpen()));
p.__dismiss=false;
await ev(()=>{Object.defineProperty(navigator,'onLine',{get:()=>true,configurable:true})});

// sair de todos os aparelhos
await ev(()=>{document.querySelector('.tab[data-t=hoje]').click();document.querySelector('[data-act=perfil]').click()});await sleep(200);
dialogs=[];await click('[data-act=lock-all]');await reloaded();
ok('sign out everywhere uses global scope',dialogs.some(d=>/todos os aparelhos/.test(d))&&(await ev(()=>localStorage.getItem('fake-signout')))==='"global"');

// ---------- recuperação de senha por código ----------
await ev(()=>document.querySelector('[data-go=forgot]').click());await sleep(100);
await set('#g-em','dono@example.com');await submit();
ok('forgot: neutral message (does not confirm the account exists)',/Se houver uma conta/.test(await ev(()=>document.querySelector('#g-p').textContent)));
await set('#g-code','123456');await submit();await sleep(300);
ok('recovery code opens new password screen',(await title())==='Nova senha'&&(await gateOpen()));
await set('#g-pw','troca-segura-2026x');await set('#g-pw2','troca-segura-2026x');await submit();await sleep(400);
const a2=await auth();
ok('new password saved and other devices signed out',a2.some(a=>a[0]==='update'&&a[1]==='troca-segura-2026x')&&a2.some(a=>a[0]==='signout'&&a[1]==='others'));
ok('after reset: app unlocked',!(await gateOpen()));
await ev(()=>window.prumoLogout('local'));await reloaded();

// ---------- link do e-mail (#token_hash) ----------
await nav(base+'#token_hash=hash-bom&type=recovery');
ok('e-mail link: token removed from the address bar',await ev(()=>location.hash===''));
ok('recovery link opens new password screen',(await title())==='Nova senha');
await set('#g-pw','outra-senha-forte-9');await set('#g-pw2','outra-senha-forte-9');await submit();await sleep(400);
await ev(()=>window.prumoLogout('local'));await reloaded();
await nav(base+'#token_hash=hash-ruim&type=email');
ok('expired link: clear message',/inválido ou expirou/.test(await msg())&&(await title())==='Entrar');
await nav(base+'#token_hash=hash-bom&type=magiclink');
ok('unexpected link type refused',/inválido ou expirou/.test(await msg()));

// ---------- limite de tentativas do servidor ----------
await ev(()=>{window.__rate=1});await set('#g-em','dono@example.com');await set('#g-pw','x');await submit();
ok('server rate limit: friendly message',/Muitas tentativas/.test(await msg()));

// ---------- CSP e iframe ----------
const before=(await ev(()=>window.__csp)).length;
await ev(()=>{const d=document.createElement('div');d.innerHTML='<img src="data:," onerror="window.__xss2=1">';document.body.appendChild(d);
  const sc=document.createElement('script');sc.textContent='window.__xss3=1';document.body.appendChild(sc)});await sleep(300);
ok('CSP blocks injected inline handlers and scripts',!(await ev(()=>window.__xss2))&&!(await ev(()=>window.__xss3)));
ok('no CSP violations from the app itself',before===0);
await nav(await url('e2e/authframe.html'));
ok('app refuses to run inside a frame',await ev(()=>{const d=document.getElementById('f').contentDocument;return !d||!d.getElementById('gate')}));

console.log(res.join('\n'));console.log(errs.length?'ERRORS '+errs:'NO PAGE ERRORS');await b.close()})();
