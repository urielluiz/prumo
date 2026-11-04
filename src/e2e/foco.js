const puppeteer=require('puppeteer-core');const url=require('./lib/serve');const fs=require('fs');const FAKE=require('./lib/fakesb');
const S=require('path').resolve(__dirname,'..');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));const res=[];const ok=(n,c)=>res.push((c?'PASS ':'FAIL ')+n);
let html=fs.readFileSync(S+'/pwa/index.html','utf8');
html=html.replace(/<script>window\.PRUMO_SB=.*?<\/script>\n?/,'').replace('<script src="supabase.js"></script>\n','');
fs.writeFileSync(S+'/e2e/focotest.html',html);
const pad=n=>String(n).padStart(2,'0');const TD=(d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()))(new Date());
const B={status:'todo',fw:null,urg:false,imp:true,mit:false,slips:0,focus:0,pomos:0,created:1,ex:false};
const tasks=[Object.assign({},B,{id:'a',title:'Escrever o roteiro',ctx:'trabalho',est:100,day:TD,mit:true,dod:[{t:'Abertura',d:false},{t:'Fechamento',d:false}]}),
  Object.assign({},B,{id:'b',title:'Responder e-mails',ctx:'trabalho',est:20,day:TD,dod:[]})];

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
const ses=()=>ev(()=>JSON.parse(localStorage.getItem('prumo.v1')).session);
await p.goto(await url('e2e/focotest.html'),{waitUntil:'domcontentloaded'});await sleep(1200);
await click('.tab[data-t=foco]');await sleep(250);

// sem sessão
ok('idle: next task with method choice, suggested marked',/Escrever o roteiro/.test(await txt('.fstart'))&&/sugerido/.test(await txt('.fwchip[aria-pressed=true]')));
ok('idle: hero task not repeated below',!(await has('#view .row[data-tid=a]'))&&await has('#view .row[data-tid=b]'));
ok('idle: no static "Como funciona" list, link to the guide',!/Como funciona\n/.test(await txt('#view'))&&await has('#view [data-act=help]'));
await click('[data-act=fw-pick][data-v=timebox]');await sleep(120);
ok('idle: picking a method updates the explanation and start button',/teto/.test(await txt('.fwhow'))&&(await ev(()=>document.querySelector('.fstart [data-act=start]').dataset.fw))==='timebox');
await click('.fstart [data-act=start]');await sleep(500);
let s=await ses();
ok('start uses the chosen method',!!s&&s.tid==='a'&&s.fw==='timebox');

// rodando
ok('running: no long method text under the timer',!/O tempo da estimativa é o teto/.test(await txt('.timer')));
ok('running: pause is the main action, stop is a link',await has('.fctl .btn-big[data-act=pause]')&&await has('.fter .link[data-act=stop]')&&await has('.fsec [data-act=finish]'));
ok('running: steps visible and checkable',/Abertura/.test(await txt('#view'))&&await ev(()=>{document.querySelector('[data-act=dod][data-i="0"]').click();return true}));
await sleep(150);
ok('running: step saved',(await ev(()=>JSON.parse(localStorage.getItem('prumo.v1')).tasks.find(t=>t.id==='a').dod[0].d))===true);

// fim do tempo: aviso no topo, sem cronômetro zerado
await ev(()=>{const v=JSON.parse(localStorage.getItem('prumo.v1'));v.session.endsAt=Date.now()-1000;localStorage.setItem('prumo.v1',JSON.stringify(v))});
await p.reload({waitUntil:'domcontentloaded'});await sleep(1500);
ok('end: action card replaces the timer',await has('.endcard')&&!(await has('.timer')));
ok('end: card comes first after the title',await ev(()=>{const c=document.querySelector('#view .col');return c&&c.firstElementChild&&c.firstElementChild.classList.contains('endcard')}));
await click('.endcard [data-act=stop]');await sleep(300);
ok('end: stop ends the session',!(await ses()));

// pomodoro: um indicador só, rodada atual
await click('.tab[data-t=foco]');await sleep(150);
await click('[data-act=fw-pick][data-v=pomodoro]');await sleep(100);await click('.fstart [data-act=start]');await sleep(400);
ok('pomodoro: one progress line with the current round',/Rodada 1 de ≈4/.test(await txt('.how.prog'))&&(await ev(()=>document.querySelectorAll('.timer .pomos').length))===1);
await click('.fter [data-act=stop]');await sleep(250);

// foco livre
await click('.tab[data-t=foco]');await sleep(150);
await click('[data-act=start5]');await sleep(400);
s=await ses();ok('free 5-minute focus starts without a task',!!s&&!s.tid&&s.fw==='cinco');

console.log(res.join('\n'));console.log(errs.length?'ERRORS '+errs:'NO PAGE ERRORS');await b.close()})();
