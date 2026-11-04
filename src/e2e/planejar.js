// Planejar a semana, busca e atalhos do ícone.
const puppeteer=require('puppeteer-core');const url=require('./lib/serve');const fs=require('fs');const FAKE=require('./lib/fakesb');
const S=require('path').resolve(__dirname,'..');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));const res=[];const ok=(n,c)=>res.push((c?'PASS ':'FAIL ')+n);
let html=fs.readFileSync(S+'/pwa/index.html','utf8');
html=html.replace(/<script>window\.PRUMO_SB=.*?<\/script>\n?/,'').replace('<script src="supabase.js"></script>\n','');
fs.writeFileSync(S+'/e2e/plantest.html',html);
const pad=n=>String(n).padStart(2,'0');const iso=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const plus=n=>{const d=new Date();d.setDate(d.getDate()+n);return iso(d)};
const TD=plus(0),W=new Date().getDay();
const B={status:'todo',fw:null,urg:false,imp:true,dod:[],mit:false,slips:0,focus:0,pomos:0,created:1,ex:false};
const T=o=>Object.assign({},B,o);
const tasks=[T({id:'a',title:'Revisar as peças',ctx:'trabalho',est:60,day:TD}),
  T({id:'late1',title:'Enviar nota fiscal',ctx:'freelas',est:15,day:plus(-2)}),
  T({id:'s1',title:'Atualizar portfólio',ctx:'pessoal',est:120,day:null}),
  T({id:'s2',title:'Ligar para o contador',ctx:'freelas',est:30,day:null,urg:true}),
  T({id:'s3',title:'Pesquisar referências',ctx:'freelas',est:60,day:null,dod:[{t:'Montar painel no Figma',d:false}]}),
  T({id:'d1',title:'Reunião de orçamento',ctx:'trabalho',est:30,day:plus(-3),status:'done',doneAt:Date.parse(plus(-3)+'T12:00:00')})];
const CAP=[0,300,300,300,300,300,120];

(async()=>{const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox']});
const errs=[];
const open=async(q)=>{const p=await b.newPage();await p.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
  p.on('pageerror',e=>errs.push(e.message));await p.evaluateOnNewDocument(FAKE);
  await p.evaluateOnNewDocument((tasks,cap)=>{if(sessionStorage.getItem('s'))return;sessionStorage.setItem('s','1');localStorage.removeItem('fake-db');
    localStorage.setItem('sb-test-auth-token',JSON.stringify({refresh_token:'x',user:{id:'u1',email:'dono@example.com'}}));
    localStorage.setItem('prumo.v1',JSON.stringify({v:1,upd:1,owner:'u1',seeded:true,prof:{},tasks,rec:{},cap,ctx:{},retro:{},blockers:{},log:{},days:{},g:{},session:null,u:{},dirty:{},del:{},synced:true}))},tasks,CAP);
  await p.goto((await url('e2e/plantest.html'))+(q||''),{waitUntil:'domcontentloaded'});await sleep(1200);return p};
const st=p=>p.evaluate(()=>JSON.parse(localStorage.getItem('prumo.v1')));
const click=(p,s)=>p.evaluate(s=>{const e=document.querySelector(s);if(!e)throw new Error('missing '+s);e.click()},s);
const sheet=p=>p.evaluate(()=>{const s=document.querySelector('.sheet');return s?s.innerText:''});

// 1) planejar a semana
{const p=await open();
 ok('Hoje invites to plan only on Sunday or Monday',(await p.evaluate(()=>!!document.querySelector('.closec.plan')))===(W===0||W===1));
 await click(p,'.tab[data-t=semana]');await sleep(200);
 await click(p,'[data-act=plan]');await sleep(250);
 let t=await sheet(p);
 ok('plan sheet named, with 7 day rows',/Planejar a semana/.test(t)&&await p.evaluate(()=>document.querySelectorAll('.sheet .wp-d').length===7));
 ok('overdue shown first with a way to resolve',/ficou para trás/i.test(t)&&await p.evaluate(()=>!!document.querySelector('.sheet [data-act=late][data-back=plan]')));
 ok('lists the 3 tasks without a date',/Sem data · 3/i.test(t));
 // capacidade
 const w1=new Date(plus(1)+'T12:00:00').getDay();
 await click(p,'.sheet [data-act=cap][data-i="'+w1+'"][data-d="30"]');await sleep(200);
 ok('capacity arrows change that weekday',(await st(p)).cap[w1]===CAP[w1]+30);
 // resolver atrasada e voltar
 await click(p,'.sheet [data-act=late]');await sleep(200);
 await p.evaluate(d=>document.querySelector('.sheet [data-act=mv][data-id=late1][data-d="'+d+'"]').click(),plus(1));await sleep(250);
 ok('after resolving overdue, back to the plan',/Planejar a semana/.test(await sheet(p))&&!/ficou para trás/i.test(await sheet(p)));
 // sugestão
 await click(p,'.sheet [data-act=wp-prop]');await sleep(200);
 const sel=await p.evaluate(()=>[...document.querySelectorAll('.sheet select[data-in=wp-d]')].map(s=>[s.dataset.id,s.value,!!document.querySelector('label[for="'+s.id+'"]')]));
 ok('one labelled day picker per task without a date',sel.length===3&&sel.every(x=>x[2]));
 ok('every suggestion fits a day',sel.every(x=>x[1]));
 const s2=sel.find(x=>x[0]==='s2');const firstFit=await p.evaluate(()=>[...document.querySelectorAll('.sheet select[data-id=s2] option')].map(o=>o.value).filter(Boolean).filter(v=>{const n=new Date();const t=n.getFullYear()+'-'+String(n.getMonth()+1).padStart(2,'0')+'-'+String(n.getDate()).padStart(2,'0');return v!==t||n.getHours()<17})[0]);
 ok('urgent task goes to the first day with room',s2[1]===firstFit);
 ok('suggested time shows in the day bars',await p.evaluate(()=>document.querySelectorAll('.sheet .wp-bar i.add').length>=1));
 // ajustar uma e deixar outra sem data
 await p.select('.sheet select[data-id=s1]',plus(3));await sleep(200);
 await p.select('.sheet select[data-id=s3]','');await sleep(200);
 await click(p,'.sheet [data-act=wp-apply]');await sleep(250);
 let s=await st(p);const by=id=>s.tasks.find(x=>x.id===id);
 ok('apply uses the adjusted days',by('s1').day===plus(3)&&by('s2').day===s2[1]&&!by('s3').day);
 ok('sheet back to the plan with 1 without a date',/Sem data · 1/i.test(await sheet(p)));
 await click(p,'[data-act=toast-act]');await sleep(250);
 s=await st(p);ok('apply can be undone',!s.tasks.find(x=>x.id==='s1').day&&!s.tasks.find(x=>x.id==='s2').day);
 // pronto aplica a sugestão pendente
 await click(p,'.sheet [data-act=wp-prop]');await sleep(200);
 await click(p,'.sheet [data-act=wp-done]');await sleep(300);
 s=await st(p);
 ok('"Pronto" applies pending suggestion and marks the week planned',s.tasks.filter(x=>/^s/.test(x.id)).every(x=>x.day)&&((s.days||{})[TD]||{}).p>0);
 ok('toast confirms',/Semana planejada/.test(await p.evaluate(()=>document.querySelector('#toast').innerText)));
 ok('no plan invite after planning',!(await p.evaluate(()=>{document.querySelector('.tab[data-t=hoje]').click();return !!document.querySelector('.closec.plan')})));
 await sleep(1600);
 const db=await p.evaluate(()=>JSON.parse(localStorage.getItem('fake-db')||'{}'));
 ok('planned day synced',!!((db.u1||{})['day/'+TD]||{}).data?.p||JSON.stringify((db.u1||{})['day/'+TD]||{}).includes('"p"'));
 await sleep(200);await click(p,'.drings');await sleep(250);
 ok('obra marks the week as planned',await p.evaluate(()=>/planejada/.test(document.querySelector('.sheet .floor').getAttribute('aria-label'))));
 await p.screenshot({path:S+'/e2e/plan-obra.png'});
 await p.close()}

// 2) Revisão leva ao planejamento
{const p=await open();
 await click(p,'.tab[data-t=revisao]');await sleep(250);
 await click(p,'#view [data-act=plan]');await sleep(250);
 ok('Revisão has "Planejar a próxima semana"',/Planejar a semana/.test(await sheet(p)));
 await p.close()}

// 3) busca
{const p=await open();
 await click(p,'.tab[data-t=semana]');await sleep(200);
 await click(p,'[data-act=busca]');await sleep(250);
 ok('search sheet named, field focused',/Buscar/.test(await sheet(p))&&await p.evaluate(()=>document.activeElement&&document.activeElement.id==='bs-q'));
 await p.type('#bs-q','referencias');await sleep(200);
 ok('search ignores accents',/Pesquisar referências/.test(await p.evaluate(()=>document.querySelector('#bs-res').innerText)));
 ok('typing keeps focus in the field',await p.evaluate(()=>document.activeElement.id==='bs-q'));
 await p.evaluate(()=>{const i=document.querySelector('#bs-q');i.value='';i.dispatchEvent(new Event('input',{bubbles:true}))});
 await p.type('#bs-q','figma');await sleep(200);
 ok('search finds text in steps',/Pesquisar referências/.test(await p.evaluate(()=>document.querySelector('#bs-res').innerText)));
 await p.evaluate(()=>{const i=document.querySelector('#bs-q');i.value='';i.dispatchEvent(new Event('input',{bubbles:true}))});
 await p.type('#bs-q','orcamento');await sleep(200);
 const r=await p.evaluate(()=>document.querySelector('#bs-res').innerText);
 ok('search includes done tasks, marked as done',/Reunião de orçamento/.test(r)&&/Concluída/.test(r));
 await p.evaluate(()=>{const i=document.querySelector('#bs-q');i.value='';i.dispatchEvent(new Event('input',{bubbles:true}))});
 await p.type('#bs-q','portfolio');await sleep(200);
 ok('task without a date says so',/Sem data/.test(await p.evaluate(()=>document.querySelector('#bs-res').innerText)));
 await click(p,'.sheet [data-act=bs-open]');await sleep(300);
 ok('result opens the task',await p.evaluate(()=>{const i=document.querySelector('#f-title');return !!i&&/portfólio/.test(i.value)}));
 await p.keyboard.press('Escape');await sleep(200);
 await p.keyboard.press('/');await sleep(250);
 ok('"/" opens search on the keyboard',/Buscar/.test(await sheet(p)));
 await p.close()}

// 4) atalhos do ícone
{const m=JSON.parse(fs.readFileSync(S+'/pwa/manifest.webmanifest','utf8'));
 ok('manifest has 4 shortcuts',(m.shortcuts||[]).length===4&&m.shortcuts.every(s=>/^\.\/\?(nova|foco|buscar|fechar)=1$/.test(s.url)));
 let p=await open('?nova=1');await sleep(4500);
 ok('?nova=1 opens a new task',await p.evaluate(()=>!!document.querySelector('#f-title')&&!document.querySelector('#f-title').value&&!location.search));await p.close();
 p=await open('?foco=1');await sleep(4500);
 ok('?foco=1 opens Foco',await p.evaluate(()=>!!document.querySelector('.tab[data-t=foco][aria-current]')||/Foco/.test(document.querySelector('#view h1').textContent)));await p.close();
 p=await open('?buscar=1');await sleep(4500);
 ok('?buscar=1 opens search',/Buscar/.test(await sheet(p)));await p.close()}

console.log(res.join('\n'));console.log(errs.length?'ERRORS '+errs:'NO PAGE ERRORS');await b.close()})();
