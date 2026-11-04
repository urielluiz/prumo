const puppeteer=require('puppeteer-core');const url=require('./lib/serve');const fs=require('fs');const FAKE=require('./lib/fakesb');
const S=require('path').resolve(__dirname,'..');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));const res=[];const ok=(n,c)=>res.push((c?'PASS ':'FAIL ')+n);
let html=fs.readFileSync(S+'/pwa/index.html','utf8');
html=html.replace(/<script>window\.PRUMO_SB=.*?<\/script>\n?/,'').replace('<script src="supabase.js"></script>\n','');
fs.writeFileSync(S+'/e2e/hstest.html',html);
const pad=n=>String(n).padStart(2,'0');const iso=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const plus=(n,s)=>{const d=s?new Date(s+'T12:00:00'):new Date();d.setDate(d.getDate()+n);return iso(d)};
const TD=plus(0);
const B={status:'todo',fw:null,urg:false,imp:true,dod:[],mit:false,slips:0,focus:0,pomos:0,created:1,ex:false};
const T=o=>Object.assign({},B,o);
const tasks=[
  T({id:'a',title:'Revisar as peças da campanha',ctx:'trabalho',est:60,day:TD,mit:true}),
  T({id:'b',title:'Fechar escopo do site',ctx:'freelas',est:120,day:plus(-1),end:plus(3),dod:[{t:'Briefing',d:true},{t:'Wireframe',d:false}]}),
  T({id:'c',title:'Responder pendências do time',ctx:'trabalho',est:30,day:TD}),
  T({id:'d',title:'Pagar a fatura do cartão',ctx:'pessoal',est:15,day:TD,mit:true}),
  T({id:'e',title:'Enviar nota fiscal',ctx:'freelas',est:15,day:plus(-2),slips:1}),
  T({id:'f',title:'Treino',ctx:'pessoal',est:60,day:TD,status:'done',doneAt:Date.now()-3600e3}),
  T({id:'g',title:'Moodboard do cliente',ctx:'freelas',est:90,day:plus(1)}),
  T({id:'h',title:'Gravar vídeo do curso',ctx:'3coletivo',est:400,day:plus(4)}),
  T({id:'i',title:'Planejar o mês que vem',ctx:'trabalho',est:60,day:plus(9)}),
  T({id:'j',title:'Organizar portfólio',ctx:'pessoal',est:120,day:null})
];

(async()=>{const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox']});
const p=await b.newPage();await p.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.evaluateOnNewDocument(FAKE);
await p.evaluateOnNewDocument(tasks=>{if(sessionStorage.getItem('s'))return;sessionStorage.setItem('s','1');
  localStorage.setItem('sb-test-auth-token',JSON.stringify({refresh_token:'x',user:{id:'u1',email:'dono@example.com'}}));
  localStorage.setItem('prumo.v1',JSON.stringify({v:1,upd:1,owner:'u1',seeded:true,prof:{name:'Uriel'},tasks,rec:{},cap:[120,300,300,300,300,300,120],ctx:{},retro:{},blockers:{},log:{},session:null,u:{},dirty:{},del:{},synced:true}))},tasks);
const ev=(f,...a)=>p.evaluate(f,...a);
const click=s=>ev(s=>{const e=document.querySelector(s);if(!e)throw new Error('missing '+s);e.click()},s);
const has=s=>ev(s=>!!document.querySelector(s),s);
const txt=s=>ev(s=>{const e=document.querySelector(s);return e?e.innerText:''},s);
const st=()=>ev(()=>JSON.parse(localStorage.getItem('prumo.v1')));
const task=async id=>(await st()).tasks.find(x=>x.id===id);
const toastTxt=()=>ev(()=>{const t=document.querySelector('#toast');return t.hidden?'':t.innerText});
const rows=()=>ev(()=>[...document.querySelectorAll('#view .row')].map(r=>r.dataset.tid));
await p.goto(await url('e2e/hstest.html'),{waitUntil:'domcontentloaded'});await sleep(1300);

// ---------- Hoje ----------
ok('Hoje: "Agora" is the first star (Sapo)',/Agora · Sapo/i.test(await txt('.hero'))&&/Revisar as peças/.test(await txt('.hero')));
let r=await rows();
ok('Hoje: hero task not repeated in the list',!r.includes('a'));
ok('Hoje: list puts the other star first',r[0]==='d');
ok('Hoje: period task listed with day 2 of 5',/dia 2 de 5/.test(await txt('[data-tid=b]')));
ok('Hoje: compact card has no method or trash',!(await has('#view [data-act=mit]'))&&!(await has('#view .row [data-act=rowdel]'))&&!/pomodoros/.test(await txt('#view .list')));
ok('Hoje: overdue shown as one alert',/1 tarefa ficou para trás/.test(await txt('.alert'))&&!r.includes('e'));
ok('Hoje: done tasks folded',/1 concluída hoje/.test(await txt('[data-act=fold]'))&&!r.includes('f'));
await click('[data-act=fold]');await sleep(120);
ok('Hoje: fold opens done list',(await rows()).includes('f'));
ok('Hoje: tomorrow summary',/Amanhã · 2 tarefas/.test(await txt('.peek')));
// check-in
await click('[data-act=note]');await sleep(120);
await p.type('#blk','Reunião longa às 14h');await click('.sheet [data-act=sh-close]');await sleep(150);
ok('check-in saved and shown in one line',/Reunião longa às 14h/.test(await txt('.note'))&&(await st()).blockers[TD]==='Reunião longa às 14h');
ok('hero title opens the task',await ev(()=>{document.querySelector('.hero [data-act=edit]').click();return !!document.querySelector('#f-title')}));
await click('[data-act=sh-close]');await sleep(100);

// ---------- menu ⋯ ----------
await click('[data-act=rowmenu][data-id=c]');await sleep(150);
ok('menu: 7 day choices plus no date',(await ev(()=>document.querySelectorAll('.sheet [data-act=mv]').length))===8);
ok('menu: priority, edit and delete live here',await has('.sheet [data-act=mit][data-id=c]')&&await has('.sheet [data-act=edit][data-id=c]')&&await has('.sheet [data-act=rowdel][data-id=c]'));
await ev(d=>document.querySelector('.sheet [data-act=mv][data-d="'+d+'"]').click(),plus(1));await sleep(200);
ok('move to tomorrow: toast with undo',/Movida para amanhã/.test(await toastTxt())&&/Desfazer/.test(await toastTxt())&&(await task('c')).day===plus(1));
await click('[data-act=toast-act]');await sleep(150);
ok('undo brings it back',(await task('c')).day===TD);
// período em andamento muda inteiro
await click('[data-act=rowmenu][data-id=b]');await sleep(150);
ok('menu on a period offers to move the whole period',/Mover o período/i.test(await txt('.sheet')));
await ev(d=>document.querySelector('.sheet [data-act=mv][data-d="'+d+'"]').click(),plus(2));await sleep(200);
let tb=await task('b');ok('period shifted keeping its 5 days',tb.day===plus(2)&&tb.end===plus(6));
await click('[data-act=toast-act]');await sleep(150);
// prioridade (limite de 3 por dia) e excluir
await click('[data-act=rowmenu][data-id=c]');await sleep(120);await click('.sheet [data-act=mit][data-id=c]');await sleep(150);
ok('menu: mark as priority',(await task('c')).mit===true&&!(await has('.sheet'))&&await has('[data-tid=c] .star'));
await click('[data-act=rowmenu][data-id=c]');await sleep(120);await click('.sheet [data-act=rowdel][data-id=c]');await sleep(150);
ok('menu: delete with undo',!(await task('c'))&&/excluída/.test(await toastTxt()));
await click('[data-act=toast-act]');await sleep(150);
ok('delete undo restores',!!(await task('c')));

// ---------- deslizar ----------
const swipe=async(id,dx)=>{const bx=await ev(id=>{const r=document.querySelector('.row[data-tid="'+id+'"]').getBoundingClientRect();return {x:r.right-40,y:r.top+r.height/2}},id);
  const cdp=await p.target().createCDPSession();
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:bx.x,y:bx.y}]});
  for(let i=1;i<=8;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:bx.x+dx*i/8,y:bx.y+1}]});await sleep(16)}
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await sleep(250)};
await swipe('d',-200);
ok('swipe left reveals Amanhã / Outro dia',await ev(()=>{const r=document.querySelector('.row[data-tid=d]');return /translateX\(-1/.test(r.style.transform)}));
ok('swipe does not open the task',!(await has('#f-title')));
await ev(()=>document.querySelector('.row[data-tid=d]').parentNode.querySelector('.sw-a').click());await sleep(200);
ok('swipe action moves to tomorrow',(await task('d')).day===plus(1));
await click('[data-act=toast-act]');await sleep(150);
await swipe('a'===null?'x':'c',-40);
ok('short swipe snaps back',await ev(()=>document.querySelector('.row[data-tid=c]').style.transform===''));

// ---------- Semana ----------
await click('.tab[data-t=semana]');await sleep(250);
const days=await ev(()=>[...document.querySelectorAll('.wstrip .dy')].map(b=>b.dataset.d));
ok('Semana: 7 days starting today',days.length===7&&days[0]===TD&&days[6]===plus(6));
ok('Semana: back arrow disabled on the first 7 days',await ev(()=>document.querySelector('[data-act=sem][data-d="-1"]').disabled));
ok('Semana: overloaded day turns red',await has('.dy[data-d="'+plus(4)+'"] .ld.over')&&/passou/.test(await ev(d=>document.getElementById('d-'+d).innerText,plus(4))));
ok('Semana: period drawn on covered days',await has('.dy[data-d="'+TD+'"] .pseg.s')&&await has('.dy[data-d="'+plus(3)+'"] .pseg.e')&&!(await has('.dy[data-d="'+plus(4)+'"] .pseg')));
ok('Semana: every day has a section',(await ev(()=>document.querySelectorAll('.dayh[id^="d-2"]').length))===7);
ok('Semana: summary line, no review numbers',/planejados de .* que cabem nestes 7 dias/.test(await txt('.wline'))&&!/tarefas concluídas/.test(await txt('#view')));
ok('Semana: no-date section last',/Organizar portfólio/.test(await ev(()=>{const h=document.getElementById('d-sem');return h&&h.nextElementSibling?h.nextElementSibling.innerText:''})));
const y0=await ev(()=>scrollY);await click('[data-act=goday][data-d="'+plus(5)+'"]');await sleep(700);
ok('Semana: tapping a day scrolls to it',(await ev(()=>scrollY))>y0+200);
await ev(d=>document.querySelector('.dayh#d-'+d+' [data-act=new]').click(),plus(5));await sleep(200);
ok('Semana: day "+" creates a task on that day',/Nova tarefa/.test(await txt('.sheet'))&&new RegExp(['dom','seg','ter','qua','qui','sex','sáb'][new Date(plus(5)+'T12:00:00').getDay()]).test(await txt('#tk-pills')));
await click('[data-act=sh-close]');await sleep(100);
await click('[data-act=sem][data-d="1"]');await sleep(200);
ok('Semana: next 7 days',/Planejar o mês que vem/.test(await txt('#view'))&&await has('[data-act=sem][data-d="0"]'));
await click('[data-act=sem][data-d="0"]');await sleep(200);
ok('Semana: "Hoje" returns to today',(await ev(()=>document.querySelector('.wstrip .dy').dataset.d))===TD);

// ---------- Revisão recebe os números ----------
await click('.tab[data-t=revisao]');await sleep(200);
ok('Revisão: planned time by context',/Planejado por contexto/i.test(await txt('#view'))&&/Freelas/.test(await txt('.legend')));

console.log(res.join('\n'));console.log(errs.length?'ERRORS '+errs:'NO PAGE ERRORS');await b.close()})();
