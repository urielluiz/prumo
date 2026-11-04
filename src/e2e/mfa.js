// Verificação em duas etapas: ativar no Perfil, código no login, dados só depois do código, senha/exclusão com código, desativar, recuperação.
const puppeteer=require('puppeteer-core');const url=require('./lib/serve');const fs=require('fs');const FAKE=require('./lib/fakesb');
const S=require('path').resolve(__dirname,'..');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));const res=[];const ok=(n,c)=>res.push((c?'PASS ':'FAIL ')+n);
let html=fs.readFileSync(S+'/pwa/index.html','utf8');
html=html.replace(/<script>window\.PRUMO_SB=.*?<\/script>\n?/,'').replace('<script src="supabase.js"></script>\n','');
fs.writeFileSync(S+'/e2e/mfatest.html',html);
const PW='senha-do-dono-123';

(async()=>{const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox']});
const p=await b.newPage();await p.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.evaluateOnNewDocument(FAKE);
// a conta já tem uma tarefa na nuvem
await p.evaluateOnNewDocument(()=>{if(sessionStorage.getItem('s'))return;sessionStorage.setItem('s','1');
  localStorage.setItem('fake-db',JSON.stringify({u1:{'task/t1':{kind:'task',id:'t1',deleted:false,updated_at:5,data:{id:'t1',title:'Tarefa guardada na nuvem',ctx:'trabalho',est:30,day:null,status:'todo',dod:[],slips:0,focus:0,pomos:0,created:1}}}}))});
const U=await url('e2e/mfatest.html');
await p.goto(U,{waitUntil:'domcontentloaded'});await sleep(1200);
const ev=(f,...a)=>p.evaluate(f,...a);
const click=s=>ev(s=>{const e=document.querySelector(s);if(!e)throw new Error('missing '+s);e.click()},s);
const type=async(s,v)=>{await ev(s=>{const e=document.querySelector(s);e.value='';e.focus()},s);await p.type(s,v)};
const gateView=()=>ev(()=>document.getElementById('gate').hidden?'':document.getElementById('g-t').textContent);
const gateMsg=()=>ev(()=>document.getElementById('g-e').textContent);
const login=async()=>{await type('#g-em','dono@example.com');await type('#g-pw',PW);await click('#g-b');await sleep(900)};
const msg=()=>ev(()=>{const e=document.getElementById('mfa-msg');return e?e.textContent:''});
const hasTask=()=>ev(()=>/Tarefa guardada na nuvem/.test(JSON.stringify(JSON.parse(localStorage.getItem('prumo.v1')||'{}').tasks||[])));

// 1) entrar sem verificação e ativar
await login();
ok('logs in without a code while 2FA is off',await gateView()==='');
await click('[data-act=perfil]');await sleep(500);
ok('Perfil offers to turn on 2FA',await ev(()=>/Verificação em duas etapas/i.test(document.querySelector('#view').innerText)&&!!document.querySelector('[data-act=mfa-open]')));
await click('[data-act=mfa-open]');await sleep(250);
ok('turning on asks for the password first',await ev(()=>!!document.querySelector('#mfa-pw')));
await type('#mfa-pw','errada-errada-1');await click('[data-act=mfa-start]');await sleep(400);
ok('wrong password is refused',/Senha incorreta/.test(await msg()));
await type('#mfa-pw',PW);await click('[data-act=mfa-start]');await sleep(500);
ok('shows QR code, key and the "add to passwords" link',await ev(()=>!!document.querySelector('.mfa-qr img[alt]')&&/JBSW/.test(document.querySelector('#mfa-key').textContent)&&/^otpauth:/.test(document.querySelector('.mfa-qr a').getAttribute('href'))));
ok('code field focused, numeric and one-time-code',await ev(()=>{const c=document.activeElement;return c.id==='mfa-c'&&c.inputMode==='numeric'&&c.autocomplete==='one-time-code'}));
await type('#mfa-c','111111');await click('[data-act=mfa-confirm]');await sleep(400);
ok('wrong code is refused',/Código incorreto/.test(await msg()));
await type('#mfa-c','654321');await click('[data-act=mfa-confirm]');await sleep(500);
ok('activated: sheet closes and toast confirms',await ev(()=>!document.querySelector('.sheet')&&/ativada/.test(document.querySelector('#toast').innerText)));
ok('Perfil shows it is on',await ev(()=>/Ativada/.test(document.querySelector('#view').innerText)));

// 2) trocar a senha pede o código
await click('[data-act=pw-open]');await sleep(400);
ok('changing password asks for the code',await ev(()=>!!document.querySelector('#pw-c')));
await p.keyboard.press('Escape');await sleep(150);
await click('[data-act=del-open]');await sleep(400);
ok('deleting the account asks for the code',await ev(()=>!!document.querySelector('#del-c')));
await p.keyboard.press('Escape');await sleep(150);

// 3) sair e entrar de novo: código depois da senha, dados só depois
await ev(()=>window.prumoLogout('local'));await sleep(1800);
await login();
ok('after the password, login asks for the code',/Verificação em duas etapas/.test(await gateView()));
ok('nothing synced before the code',!(await hasTask()));
ok('no data request reaches the database before the code',await ev(()=>!window.__calls.some(c=>c.tbl==='prumo_items'&&c.blocked&&c.op!=='select')));
await type('#g-mfa','000000');await click('#g-b');await sleep(400);
ok('wrong code at login is refused',/Código incorreto/.test(await gateMsg()));
await type('#g-mfa','654321');await click('#g-b');await sleep(1500);
ok('right code opens the app',await gateView()==='');
ok('data syncs after the code',await hasTask());

// 4) sessão guardada que ainda não passou pelo código (aal1) pede o código ao abrir
await ev(()=>{const t=JSON.parse(localStorage.getItem('sb-test-auth-token'));delete t.aal;localStorage.setItem('sb-test-auth-token',JSON.stringify(t))});
await p.reload({waitUntil:'domcontentloaded'});await sleep(1500);
ok('reopening with an aal1 session asks for the code',/Verificação em duas etapas/.test(await gateView()));
await type('#g-mfa','654321');await click('#g-b');await sleep(1000);
await p.reload({waitUntil:'domcontentloaded'});await sleep(1500);
ok('aal2 session opens straight away',await gateView()==='');

// 5) recuperação de senha com 2FA: código do e-mail, depois o do app, depois a nova senha
await ev(()=>window.prumoLogout('local'));await sleep(1800);
await click('[data-go=forgot]');await sleep(150);await type('#g-em','dono@example.com');await click('#g-b');await sleep(500);
await type('#g-code','123456');await click('#g-b');await sleep(800);
ok('recovery asks for the app code before the new password',/Verificação em duas etapas/.test(await gateView()));
await type('#g-mfa','654321');await click('#g-b');await sleep(600);
ok('then the new password',/Nova senha/.test(await gateView()));
await type('#g-pw','nova-senha-bem-longa-9');await type('#g-pw2','nova-senha-bem-longa-9');await click('#g-b');await sleep(1500);
ok('recovery finishes in the app',await gateView()==='');

// 6) "Entrar com outra conta" na tela do código
await ev(()=>{const t=JSON.parse(localStorage.getItem('sb-test-auth-token'));delete t.aal;localStorage.setItem('sb-test-auth-token',JSON.stringify(t))});
await p.reload({waitUntil:'domcontentloaded'});await sleep(1500);
await click('[data-go=out]');await sleep(1800);
ok('"Entrar com outra conta" signs out',/Entrar/.test(await gateView())&&!(await ev(()=>localStorage.getItem('sb-test-auth-token'))));

// 7) desativar pede o código
await type('#g-em','dono@example.com');await type('#g-pw','nova-senha-bem-longa-9');await click('#g-b');await sleep(900);
await type('#g-mfa','654321');await click('#g-b');await sleep(1200);
await click('[data-act=perfil]');await sleep(500);
await click('[data-act=mfa-open]');await sleep(250);
ok('turning off asks for the code',await ev(()=>!!document.querySelector('#mfa-c')&&!!document.querySelector('[data-act=mfa-off]')));
await type('#mfa-c','654321');await click('[data-act=mfa-off]');await sleep(600);
ok('turned off',await ev(()=>/desativada/.test(document.querySelector('#toast').innerText)&&!!document.querySelector('[data-act=mfa-open]')&&!/Ativada\./.test(document.querySelector('#view').innerText)));
await ev(()=>window.prumoLogout('local'));await sleep(1800);
await type('#g-em','dono@example.com');await type('#g-pw','nova-senha-bem-longa-9');await click('#g-b');await sleep(900);
ok('login without a code again',await gateView()==='');

console.log(res.join('\n'));console.log(errs.length?'ERRORS '+errs:'NO PAGE ERRORS');await b.close()})();
