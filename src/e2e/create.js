const puppeteer=require('puppeteer-core');const url=require('./lib/serve');const fs=require('fs');const FAKE=require('./lib/fakesb');
const S=require('path').resolve(__dirname,'..');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));const res=[];const ok=(n,c)=>res.push((c?'PASS ':'FAIL ')+n);
let html=fs.readFileSync(S+'/pwa/index.html','utf8');
html=html.replace(/<script>window\.PRUMO_SB=.*?<\/script>\n?/,'').replace('<script src="supabase.js"></script>\n','');
fs.writeFileSync(S+'/e2e/createtest.html',html);
const pad=n=>String(n).padStart(2,'0');const iso=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const nextSat=(()=>{const d=new Date();d.setDate(d.getDate()+((6-d.getDay()+7)%7||7));return iso(d)})();

(async()=>{const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox']});
const p=await b.newPage();await p.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.evaluateOnNewDocument(FAKE);
await p.evaluateOnNewDocument(()=>{localStorage.setItem('sb-test-auth-token',JSON.stringify({refresh_token:'x',user:{id:'u1',email:'dono@example.com'}}))});
const ev=(f,...a)=>p.evaluate(f,...a);
const click=s=>ev(s=>{const e=document.querySelector(s);if(!e)throw new Error('missing '+s);e.click()},s);
const toastTxt=()=>ev(()=>{const t=document.querySelector('#toast');return t.hidden?'':t.innerText});
const st=()=>ev(()=>JSON.parse(localStorage.getItem('prumo.v1')));
const flashed=()=>ev(()=>{const e=document.querySelector('.row.flash');return e?e.dataset.tid:null});
await p.goto(await url('e2e/createtest.html'),{waitUntil:'domcontentloaded'});await sleep(1200);
await ev(()=>{const c=document.querySelector('[data-act=clear-ex]');if(c)c.click()});await sleep(150);

// ---------- calendário de "Outra data" não fecha ----------
await click('.tab-add');await sleep(200);
await p.type('#f-title','Revisar contrato');
const same=await ev(async d=>{const i=document.querySelector('#f-date');window.__dateEl=i;i.value=d;i.dispatchEvent(new Event('change',{bubbles:true}));await new Promise(r=>setTimeout(r,100));return document.querySelector('#f-date')===window.__dateEl},nextSat);
ok('picking a date keeps the same field (native picker stays open)',same);
ok('picked date shown on the chip',await ev(()=>{const l=document.querySelector('#f-date').parentNode;return l.getAttribute('aria-pressed')==='true'&&/\d/.test(l.textContent)}));
ok('other "Quando" chips unselected',await ev(()=>[...document.querySelectorAll('[data-act="sh-day"]')].every(b=>b.getAttribute('aria-pressed')==='false')));
ok('title kept while picking date',(await ev(()=>document.querySelector('#f-title').value))==='Revisar contrato');

// ---------- salvar diz para onde foi e leva até lá ----------
await click('[data-act=sh-save]');await sleep(300);
let t=(await st()).tasks.find(x=>x.title==='Revisar contrato');
ok('task saved on the picked date',!!t&&t.day===nextSat);
let tt=await toastTxt();
ok('toast says where it went',/Tarefa criada para (sáb|sab)/i.test(tt));
ok('toast offers "Ver"',/Ver/.test(tt));
await click('[data-act=toast-act]');await sleep(400);
ok('"Ver" opens the week on that day',await ev(d=>document.querySelector('.tab[data-t=semana]').getAttribute('aria-current')==='page'&&!!document.querySelector('[data-act=selday][data-d="'+d+'"][aria-pressed=true]'),nextSat));
ok('"Ver" highlights the card',(await flashed())===t.id);

// hoje: destaca na própria tela
await click('.tab[data-t=hoje]');await sleep(200);
await click('.tab-add');await sleep(200);await p.type('#f-title','Ligar para o contador');await click('[data-act=sh-save]');await sleep(300);
t=(await st()).tasks.find(x=>x.title==='Ligar para o contador');
ok('today: toast says hoje',/criada para hoje/.test(await toastTxt()));
ok('today: card highlighted on Hoje',(await flashed())===t.id);

// sem data
await click('.tab-add');await sleep(200);await p.type('#f-title','Ideia de post');await click('[data-act="sh-day"][data-v=none]');await sleep(100);await click('[data-act=sh-save]');await sleep(300);
ok('no date: toast says backlog',/backlog/.test(await toastTxt()));

// plano por vários dias (o caso do teste real: sábado a terça)
await click('.tab-add');await sleep(200);await p.type('#f-title','Projeto do cliente X');
await click('[data-act=sh-sec][data-v=split]');await sleep(150);
await ev(d=>{const set=(k,v)=>{const i=document.querySelector('[data-in='+k+']');i.value=v;i.dispatchEvent(new Event('input',{bubbles:true}))};set('pstart',d);set('pn','4');set('pest','120')},nextSat);
await ev(()=>[...document.querySelectorAll('.sheet button')].find(x=>/dias úteis/.test(x.innerText)).click());await sleep(100);
await ev(()=>[...document.querySelectorAll('.sheet button')].find(x=>/Criar plano/.test(x.innerText)).click());await sleep(150);
await click('[data-act=sh-save]');await sleep(300);
const g=(await st()).tasks.find(x=>x.title==='Projeto do cliente X');
ok('plan: toast names the start day and count',/Pauta criada: 4 etapas a partir de (sáb|sab)/i.test(await toastTxt()));
await click('[data-act=toast-act]');await sleep(400);
const k1=(await st()).tasks.find(x=>x.parent===g.id&&x.day===nextSat);
ok('plan: "Ver" opens the first day and highlights it',(await flashed())===k1.id);

console.log(res.join('\n'));console.log(errs.length?'ERRORS '+errs:'NO PAGE ERRORS');await b.close()})();
