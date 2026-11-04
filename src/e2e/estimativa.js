// Estimativa que aprende: fator por contexto a partir do tempo real de foco.
const puppeteer=require('puppeteer-core');const url=require('./lib/serve');const fs=require('fs');const FAKE=require('./lib/fakesb');
const S=require('path').resolve(__dirname,'..');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));const res=[];const ok=(n,c)=>res.push((c?'PASS ':'FAIL ')+n);
let html=fs.readFileSync(S+'/pwa/index.html','utf8');
html=html.replace(/<script>window\.PRUMO_SB=.*?<\/script>\n?/,'').replace('<script src="supabase.js"></script>\n','');
fs.writeFileSync(S+'/e2e/esttest.html',html);
const pad=n=>String(n).padStart(2,'0');const iso=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const plus=n=>{const d=new Date();d.setDate(d.getDate()+n);return iso(d)};
const B={status:'todo',fw:null,urg:false,imp:true,dod:[],mit:false,slips:0,focus:0,pomos:0,created:1,ex:false};
const T=o=>Object.assign({},B,o);
const hist=[];
// freelas: 5 tarefas de 1h que levaram 1h30; trabalho: só 3 (pouco para concluir); pessoal: 6 certeiras
for(let i=1;i<=5;i++)hist.push(T({id:'f'+i,title:'Freela '+i,ctx:'freelas',est:60,est0:60,day:plus(-i),status:'done',doneAt:Date.parse(plus(-i)+'T12:00:00'),focus:5400}));
for(let i=1;i<=3;i++)hist.push(T({id:'w'+i,title:'Trab '+i,ctx:'trabalho',est:30,est0:30,day:plus(-i),status:'done',doneAt:Date.parse(plus(-i)+'T12:00:00'),focus:3600}));
for(let i=1;i<=6;i++)hist.push(T({id:'p'+i,title:'Pessoal '+i,ctx:'pessoal',est:60,est0:60,day:plus(-i),status:'done',doneAt:Date.parse(plus(-i)+'T12:00:00'),focus:3700}));
// uma antiga demais não conta
hist.push(T({id:'old',title:'Antiga',ctx:'trabalho',est:30,est0:30,day:plus(-80),status:'done',doneAt:Date.parse(plus(-80)+'T12:00:00'),focus:9000}));
const open=[T({id:'x1',title:'Site do cliente',ctx:'freelas',est:120,day:plus(1)}),T({id:'x2',title:'Identidade visual',ctx:'freelas',est:120,day:plus(2)}),T({id:'s1',title:'Logo nova',ctx:'freelas',est:60,day:null})];

(async()=>{const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox']});
const p=await b.newPage();await p.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
const errs=[];p.on('pageerror',e=>errs.push(e.message));await p.evaluateOnNewDocument(FAKE);
await p.evaluateOnNewDocument(tasks=>{if(sessionStorage.getItem('s'))return;sessionStorage.setItem('s','1');localStorage.removeItem('fake-db');
  localStorage.setItem('sb-test-auth-token',JSON.stringify({refresh_token:'x',user:{id:'u1',email:'dono@example.com'}}));
  localStorage.setItem('prumo.v1',JSON.stringify({v:1,upd:1,owner:'u1',seeded:true,prof:{},tasks,rec:{},cap:[0,300,300,300,300,300,120],ctx:{},retro:{},blockers:{},log:{},days:{},g:{},session:null,u:{},dirty:{},del:{},synced:true}))},hist.concat(open));
await p.goto(await url('e2e/esttest.html'),{waitUntil:'domcontentloaded'});await sleep(1200);
const click=s=>p.evaluate(s=>{const e=document.querySelector(s);if(!e)throw new Error('missing '+s);e.click()},s);
const tip=()=>p.evaluate(()=>{const e=document.querySelector('#tk-est');return e?e.innerText:''});

await click('.tab-add');await sleep(200);
await p.type('#f-title','Proposta comercial 1h #freelas');await sleep(250);
let t=await tip();
ok('tip under the pills when the context runs long ('+t.replace(/\s+/g,' ')+')',/Freelas/.test(t)&&/\+50%/.test(t)&&/Usar 1h30/.test(t));
await click('#tk-est [data-act=est-learn]');await sleep(200);
ok('tapping the tip sets the time',await p.evaluate(()=>/1h30/.test(document.querySelector('#tk-pills').innerText)));
ok('tip disappears once the time matches',!(await tip()));
await click('[data-act=sh-save]');await sleep(300);
ok('saved with the learned time',await p.evaluate(()=>JSON.parse(localStorage.getItem('prumo.v1')).tasks.find(t=>t.title==='Proposta comercial').est===90));

await click('.tab-add');await sleep(200);
await p.type('#f-title','Relatório 30min #trabalho');await sleep(250);
ok('no tip with fewer than 5 recent tasks',!(await tip()));
await p.evaluate(()=>{const i=document.querySelector('#f-title');i.value='Treino 1h #pessoal';i.dispatchEvent(new Event('input',{bubbles:true}))});await sleep(250);
ok('no tip when the estimate is already close',!(await tip()));
await p.evaluate(()=>{const i=document.querySelector('#f-title');i.value='Briefing 2h #freelas';i.dispatchEvent(new Event('input',{bubbles:true}))});await sleep(250);
await click('[data-act=sh-sec][data-v=est]');await sleep(200);
ok('full tip inside the Tempo panel',await p.evaluate(()=>{const e=document.querySelector('.est-tip');return !!e&&/50% a mais/.test(e.innerText)&&/5 tarefas/.test(e.innerText)&&/Usar 3h/.test(e.innerText)}));
await p.keyboard.press('Escape');await sleep(200);

await click('.tab[data-t=semana]');await sleep(200);
await click('[data-act=plan]');await sleep(250);
ok('plan shows the realistic total for the week',await p.evaluate(()=>{const e=document.querySelector('.sheet .est-wk');return !!e&&/devem levar cerca de/.test(e.innerText)}));

console.log(res.join('\n'));console.log(errs.length?'ERRORS '+errs:'NO PAGE ERRORS');await b.close()})();
