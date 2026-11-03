const puppeteer=require('puppeteer-core');const url=require('./lib/serve');const S=require('path').resolve(__dirname,'..');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));const res=[];const ok=(n,c)=>res.push((c?'PASS ':'FAIL ')+n);
(async()=>{const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox']});
const p=await b.newPage();await p.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.evaluateOnNewDocument(()=>{try{localStorage.setItem('sb-test-auth-token','{"refresh_token":"x"}')}catch(e){}});
await p.goto(await url('pwa/index.html'),{waitUntil:'domcontentloaded'});await sleep(900);
const ev=(f,...a)=>p.evaluate(f,...a);const tasks=()=>ev(()=>JSON.parse(localStorage.getItem('prumo.v1')).tasks);
await ev(()=>document.querySelector('[data-act=clear-ex]').click());await sleep(150);
// new task with staged kids
await ev(()=>document.querySelector('.tab-add').click());await sleep(150);
await p.type('#f-title','Pauta LinkedIn');
await ev(()=>document.querySelector('[data-act=sh-est][data-v="240"]').click());
await ev(()=>document.querySelector('[data-act=sh-sec][data-v=split]').click());await sleep(100);
await p.type('[data-in=gname]','Post');
await ev(()=>{const n=document.querySelector('[data-in=gn]');n.value='3';n.dispatchEvent(new Event('input',{bubbles:true}));const e=document.querySelector('[data-in=gest]');e.value='90';e.dispatchEvent(new Event('input',{bubbles:true}))});
await ev(()=>document.querySelector('[data-act=kid-add]').click());await sleep(200);
ok('pending shown',/Serão criadas ao salvar: 3 × Post de 1h30/.test(await ev(()=>document.querySelector('.sheet').innerText)));
await ev(()=>document.querySelector('[data-act=sh-save]').click());await sleep(300);
let t=await tasks();const g=t.find(x=>x.title==='Pauta LinkedIn');
ok('new pauta with 3 kids',t.filter(x=>x.parent===g.id).length===3&&g.day===null);
// loose task -> into pauta
await ev(()=>document.querySelector('.tab-add').click());await sleep(150);
await p.type('#f-title','Post extra');
await ev(()=>document.querySelector('[data-act=sh-sec][data-v=split]').click());await sleep(100);
ok('pauta chips offered',await ev(()=>!!document.querySelector('[data-act=sh-par]')));
await ev(()=>{const c=[...document.querySelectorAll('[data-act=sh-par]')].find(x=>/Pauta LinkedIn/.test(x.innerText));c.click()});await sleep(100);
await ev(()=>document.querySelector('[data-act=sh-save]').click());await sleep(300);
t=await tasks();const ex=t.find(x=>x.title==='Post extra');
ok('new task created inside pauta',ex.parent===g.id);
// move kid out
await ev(i=>document.querySelector('[data-act=edit][data-id="'+i+'"]').click(),ex.id);await sleep(200);
await ev(()=>document.querySelector('[data-act=sh-sec][data-v=par]').click());await sleep(100);
await ev(()=>{const c=[...document.querySelectorAll('[data-act=sh-par]')].find(x=>/Nenhuma/.test(x.innerText));c.click()});await sleep(100);
await ev(()=>document.querySelector('[data-act=sh-save]').click());await sleep(300);
t=await tasks();
ok('task removed from pauta',!t.find(x=>x.id===ex.id).parent);
// kid-open keeps unsaved parent edits
await ev(i=>document.querySelector('[data-act=edit][data-id="'+i+'"]').click(),g.id);await sleep(200);
await ev(()=>{const i=document.querySelector('#f-title');i.value='Pauta LinkedIn editada';i.dispatchEvent(new Event('input',{bubbles:true}))});
await ev(()=>document.querySelector('[data-act=kid-open]').click());await sleep(300);
t=await tasks();
ok('parent edit kept when opening kid',t.find(x=>x.id===g.id).title==='Pauta LinkedIn editada');
ok('kid sheet shows link to pauta',/Abrir a pauta/.test(await ev(()=>document.querySelector('.sheet').innerText)));
console.log(res.join('\n'));console.log(errs.length?'ERRORS '+errs:'NO PAGE ERRORS');await b.close()})();
