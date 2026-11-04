const puppeteer=require('puppeteer-core');const url=require('./lib/serve');const fs=require('fs');const FAKE=require('./lib/fakesb');
const S=require('path').resolve(__dirname,'..');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));const res=[];const ok=(n,c)=>res.push((c?'PASS ':'FAIL ')+n);
let html=fs.readFileSync(S+'/pwa/index.html','utf8');
html=html.replace(/<script>window\.PRUMO_SB=.*?<\/script>\n?/,'').replace('<script src="supabase.js"></script>\n','');
fs.writeFileSync(S+'/e2e/revtest.html',html);
const pad=n=>String(n).padStart(2,'0');const iso=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const plus=n=>{const d=new Date();d.setDate(d.getDate()+n);return iso(d)};
const TD=plus(0),dow=(new Date().getDay()+6)%7; // 0 = segunda
const ws=plus(-dow),we=plus(6-dow);
const B={status:'todo',fw:null,urg:false,imp:true,dod:[],mit:false,slips:0,focus:0,pomos:0,created:1,ex:false};
const T=o=>Object.assign({},B,o);
const tasks=[];
// semana atual: uma concluída hoje, uma que ficou aberta (se houver dia passado), uma planejada para depois
tasks.push(T({id:'d1',title:'Feita hoje',ctx:'trabalho',est:30,day:TD,status:'done',doneAt:Date.now(),focus:1800}));
if(dow>0)tasks.push(T({id:'o1',title:'Ficou para trás nesta semana',ctx:'freelas',est:60,day:plus(-1)}));
if(dow<6)tasks.push(T({id:'f1',title:'Planejada para depois',ctx:'pessoal',est:60,day:plus(1)}));
// semana passada: 3 concluídas até o mesmo dia da semana e 3 depois dele
for(let i=0;i<6;i++){const d=plus(-7-dow+i);tasks.push(T({id:'p'+i,title:'Semana passada '+i,ctx:'trabalho',est:30,day:d,status:'done',doneAt:Date.parse(d+'T12:00:00')}))}

(async()=>{const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox']});
const p=await b.newPage();await p.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.evaluateOnNewDocument(FAKE);
await p.evaluateOnNewDocument(tasks=>{if(sessionStorage.getItem('s'))return;sessionStorage.setItem('s','1');
  localStorage.setItem('sb-test-auth-token',JSON.stringify({refresh_token:'x',user:{id:'u1',email:'dono@example.com'}}));
  localStorage.setItem('prumo.v1',JSON.stringify({v:1,upd:1,owner:'u1',seeded:true,prof:{},tasks,rec:{},cap:[300,300,300,300,300,300,300],ctx:{},retro:{},blockers:{},log:{},session:null,u:{},dirty:{},del:{},synced:true}))},tasks);
const ev=(f,...a)=>p.evaluate(f,...a);
const click=s=>ev(s=>{const e=document.querySelector(s);if(!e)throw new Error('missing '+s);e.click()},s);
const has=s=>ev(s=>!!document.querySelector(s),s);
const txt=s=>ev(s=>{const e=document.querySelector(s);return e?e.innerText:''},s);
await p.goto(await url('e2e/revtest.html'),{waitUntil:'domcontentloaded'});await sleep(1200);
await click('.tab[data-t=revisao]');await sleep(250);

const v=await txt('#view');
ok('Semana: "Ficou aberto" never lists future tasks',!/Planejada para depois/.test(v));
if(dow>0)ok('Semana: past open task listed',/Ficou aberto/i.test(v)&&/Ficou para trás nesta semana/.test(v));
if(dow<6)ok('Semana: future tasks only counted in a note',/ainda planejada/.test(v));
ok('Semana: concluded counts only days up to today',new RegExp('1/'+(dow>0?2:1)).test(await txt('.panel .nums')));
ok('Semana: retro right after the summary',await ev(()=>{const c=document.querySelector('#view .col');const secs=[...c.querySelectorAll('.sec')].map(s=>s.innerText);return /Fechar a semana/i.test(secs[0]||'')}));
await ev(()=>{const i=document.querySelector('#rt-worked');i.value='Blocos de manhã';i.dispatchEvent(new Event('input',{bubbles:true}))});await sleep(150);
ok('Semana: retro answer saved for this week',await ev(ws=>{const v=JSON.parse(localStorage.getItem('prumo.v1'));return (v.retro[ws]||{}).worked==='Blocos de manhã'},ws));
ok('Semana: no method-count section',!/Como você trabalhou/i.test(v));
ok('Semana: retro in stories is a button in the summary',await has('.panel [data-act=wr-open]'));

await click('[data-act=rev][data-v=dash]');await sleep(250);
const d=await txt('#view');
ok('Tendências: named and compares up to the same weekday',/Tendências/.test(d)&&/até .* contra a anterior até/i.test(d));
ok('Tendências: fair comparison (1 vs '+(dow+1)+' done by this weekday)',/1\s*\n\s*concluídas/.test(d)&&new RegExp('−'+dow+' vs. anterior|igual ao anterior').test(d));
ok('Tendências: charts skip empty weeks at the start',(await ev(()=>document.querySelectorAll('.bars')[0].querySelectorAll('.bc').length))<=3);
ok('Tendências: secondary details collapsed',!(await ev(()=>[...document.querySelectorAll('details.more-d')].some(x=>x.open))));

console.log(res.join('\n'));console.log(errs.length?'ERRORS '+errs:'NO PAGE ERRORS');await b.close()})();
