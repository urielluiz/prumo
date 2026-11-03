const puppeteer=require('puppeteer-core');const url=require('./lib/serve');const fs=require('fs');const FAKE=require('./lib/fakesb');
const S=require('path').resolve(__dirname,'..');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));const res=[];const ok=(n,c)=>res.push((c?'PASS ':'FAIL ')+n);
let html=fs.readFileSync(S+'/pwa/index.html','utf8');
html=html.replace(/<script>window\.PRUMO_SB=.*?<\/script>\n?/,'').replace('<script src="supabase.js"></script>\n','');
fs.writeFileSync(S+'/e2e/profiletest.html',html);

(async()=>{const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox']});
const p=await b.newPage();await p.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.evaluateOnNewDocument(FAKE);
const ev=(f,...a)=>p.evaluate(f,...a);
const click=s=>ev(s=>{const e=document.querySelector(s);if(!e)throw new Error('missing '+s);e.click()},s);
const st=()=>ev(()=>JSON.parse(localStorage.getItem('prumo.v1')||'null'));
const LSget=k=>ev(k=>JSON.parse(localStorage.getItem(k)||'null'),k);
const view=()=>ev(()=>document.querySelector('#view').innerText);
const perfil=async()=>{await ev(()=>{document.querySelector('.tab[data-t=hoje]').click();document.querySelector('[data-act=perfil]').click()});await sleep(250)};
const hoje=async()=>{await click('.tab[data-t=hoje]');await sleep(200)};

// entra como o dono
await p.goto(await url('e2e/profiletest.html'),{waitUntil:'domcontentloaded'});await sleep(900);
await ev(()=>{document.querySelector('#g-em').value='dono@example.com';document.querySelector('#g-pw').value='senha-do-dono-123';document.querySelector('#g-b').click()});await sleep(1200);
ok('home shows avatar button with initial',(await ev(()=>{const b=document.querySelector('[data-act=perfil]');return b&&b.innerText.trim()}))==='D');

// perfil e revisão
await perfil();
ok('avatar opens profile',/perfil/i.test(await view())&&/conta/i.test(await view())&&/privacidade/i.test(await view()));
ok('profile shows account e-mail',/dono@example\.com/.test(await view()));
ok('profile has settings moved from review',!!(await ev(()=>document.querySelector('[data-act=lock]')&&document.querySelector('[data-act=pw-open]')&&document.querySelector('[data-in=ctxname]')&&document.querySelector('[data-act=copy-backup]')&&document.querySelector('[data-act=help]'))));
await click('.tab[data-t=revisao]');await sleep(200);
ok('review no longer has account settings',!(await ev(()=>document.querySelector('[data-act=lock]')||document.querySelector('[data-act=pw-open]')||document.querySelector('[data-in=ctxname]'))));
await perfil();await click('[data-act=perfil-back]');await sleep(200);
ok('back returns to previous tab',await ev(()=>document.querySelector('.tab[data-t=hoje]').getAttribute('aria-current')==='page'));

// nome
await perfil();
await ev(()=>{const i=document.querySelector('#pf-name');i.value='  Uriel ‮  Santos\u0007 ';i.dispatchEvent(new Event('input',{bubbles:true}))});await sleep(1500);
let s=await st();
ok('name cleaned (spaces, control and direction characters)',s.prof.name==='Uriel Santos');
await hoje();
ok('home greets by first name',/Olá, Uriel/i.test(await ev(()=>document.querySelector('.eyebrow').innerText)));
ok('initials from name',(await ev(()=>document.querySelector('[data-act=perfil]').innerText.trim()))==='US');
ok('profile synced to the account',((await LSget('fake-db'))||{}).u1&&(await LSget('fake-db')).u1['prof/me'].data.name==='Uriel Santos');
await perfil();
await ev(()=>{const i=document.querySelector('#pf-name');i.value='<img src=x onerror=window.__xss=1>';i.dispatchEvent(new Event('input',{bubbles:true}))});await sleep(200);
await hoje();
ok('name with HTML shown as text',!(await ev(()=>window.__xss))&&(await ev(()=>document.querySelectorAll('header img').length))===0);
await perfil();
await ev(()=>{const i=document.querySelector('#pf-name');i.value='Uriel Santos';i.dispatchEvent(new Event('input',{bubbles:true}))});await sleep(200);

// foto: JPEG grande com EXIF de GPS -> 256 px, sem metadados
await ev(async()=>{
  const c=document.createElement('canvas');c.width=1200;c.height=800;const x=c.getContext('2d');x.fillStyle='#3a6';x.fillRect(0,0,1200,800);x.fillStyle='#f63';x.fillRect(500,300,200,200);
  const jb=await new Promise(r=>c.toBlob(r,'image/jpeg',.9));const j=new Uint8Array(await jb.arrayBuffer());
  const pay=new TextEncoder().encode('Exif\0\0GPSLatitude=-23.5505;GPSLongitude=-46.6333');const len=pay.length+2;
  const app1=new Uint8Array(4+pay.length);app1.set([0xFF,0xE1,len>>8,len&255]);app1.set(pay,4);
  const out=new Uint8Array(j.length+app1.length);out.set(j.slice(0,2));out.set(app1,2);out.set(j.slice(2),2+app1.length);
  window.__orig=out.length;
  const f=new File([out],'IMG_0001.jpg',{type:'image/jpeg'});const dt=new DataTransfer();dt.items.add(f);
  const i=document.querySelector('#pf-photo');i.files=dt.files;i.dispatchEvent(new Event('change',{bubbles:true}));
});
await sleep(1500);
const sto=await LSget('fake-storage')||{};const key=Object.keys(sto).find(k=>/^avatars\/u1\/avatar\.(webp|jpg)$/.test(k));
ok('photo uploaded to own folder',!!key);
const info=key?await ev(async d=>{const r=atob(d),u=new Uint8Array(r.length);for(let i=0;i<r.length;i++)u[i]=r.charCodeAt(i);const t=new TextDecoder('latin1').decode(u);
  const bm=await createImageBitmap(new Blob([u]));return {w:bm.width,h:bm.height,size:u.length,exif:/Exif|GPS/.test(t)}},sto[key].d):{};
ok('photo resized to 256x256',info.w===256&&info.h===256);
ok('photo has no EXIF/GPS metadata',info.exif===false);
ok('photo small enough for bucket limit',info.size>0&&info.size<262144);
s=await st();ok('profile points to the photo',s.prof.avk===key.replace('avatars/','')&&s.prof.av>0);
await hoje();
ok('home avatar shows the photo',await ev(()=>{const i=document.querySelector('[data-act=perfil] img');return !!i&&/^data:image\/(webp|jpeg);base64,/.test(i.getAttribute('src'))}));
// outro aparelho: sem cópia local, baixa do Storage
await ev(()=>localStorage.removeItem('prumo.avatar'));await p.reload({waitUntil:'domcontentloaded'});await sleep(1500);
ok('photo downloaded when missing locally',await ev(()=>!!document.querySelector('[data-act=perfil] img')));
// arquivo que não é imagem
await perfil();
await ev(()=>{const f=new File(['oi'],'nota.txt',{type:'text/plain'});const dt=new DataTransfer();dt.items.add(f);const i=document.querySelector('#pf-photo');i.files=dt.files;i.dispatchEvent(new Event('change',{bubbles:true}))});await sleep(400);
ok('non-image file refused',/Não consegui ler essa imagem/.test(await ev(()=>document.querySelector('#toast').innerText)));
await click('[data-act=photo-del]');await sleep(500);
ok('remove photo deletes it from storage',!Object.keys((await LSget('fake-storage'))||{}).some(k=>k.indexOf('avatars/u1/')===0));
await hoje();ok('initials back after removing',(await ev(()=>document.querySelector('[data-act=perfil]').innerText.trim()))==='US');

// exportar
await ev(()=>{navigator.canShare=undefined;window.__blobs=[];const o=URL.createObjectURL;URL.createObjectURL=function(b){window.__blobs.push(b);return o.call(URL,b)}});
await perfil();await click('[data-act=export]');await sleep(800);
const exp=await ev(async()=>{const b=window.__blobs.pop();return b?JSON.parse(await b.text()):null});
ok('export produces a JSON file',!!exp&&exp.app==='Prumo');
ok('export has account, profile and server data',exp&&exp.conta.email==='dono@example.com'&&exp.perfil.nome==='Uriel Santos'&&Array.isArray(exp.no_servidor)&&exp.no_servidor.some(r=>r.tipo==='prof'));
ok('export does not leak other accounts',exp&&!JSON.stringify(exp).includes('outra@example.com'));

// excluir conta
await click('[data-act=del-open]');await sleep(200);
ok('delete sheet explains it is permanent',/para sempre/.test(await ev(()=>document.querySelector('.sheet').innerText)));
const delTry=async(pw,chk)=>{await ev((pw,chk)=>{document.querySelector('#del-pw').value=pw;document.querySelector('#del-ok').checked=chk},pw,chk);await click('[data-act=del-go]');await sleep(400);return ev(()=>(document.querySelector('#del-msg')||{}).textContent||'')};
ok('delete requires confirmation checkbox',/Marque a confirmação/.test(await delTry('senha-do-dono-123',false)));
ok('delete with wrong password blocked',/Senha incorreta/.test(await delTry('errada',true))&&!(await LSget('fake-invoke')));
await ev(()=>{window.__delfail=1});
ok('server failure: nothing deleted, user told',/Nada foi apagado/.test(await delTry('senha-do-dono-123',true))&&!!(await st())&&!!(await ev(()=>localStorage.getItem('sb-test-auth-token'))));
await ev(()=>{window.__delfail=0});
await delTry('senha-do-dono-123',true);
await p.waitForNavigation({waitUntil:'domcontentloaded',timeout:5000}).catch(()=>{});await sleep(1000);
ok('delete calls server function as the user',(await LSget('fake-invoke')||{}).me==='u1');
ok('after delete: gate with confirmation',await ev(()=>!document.getElementById('gate').hidden&&/excluída/.test(document.querySelector('#g-e').textContent)));
ok('after delete: address cleaned',await ev(()=>location.hash===''));
ok('after delete: no account data left on device',await ev(()=>{const v=JSON.parse(localStorage.getItem('prumo.v1')||'null');return !localStorage.getItem('prumo.avatar')&&!(v&&(v.owner||(v.prof&&v.prof.name)))&&!localStorage.getItem('sb-test-auth-token')}));
ok('after delete: account gone on server',await ev(()=>{const u=JSON.parse(localStorage.getItem('fake-users')||'{}'),db=JSON.parse(localStorage.getItem('fake-db')||'{}');return !u['dono@example.com']&&!db.u1}));

console.log(res.join('\n'));console.log(errs.length?'ERRORS '+errs:'NO PAGE ERRORS');await b.close()})();
