// Obra: anéis do dia, sequência com folga e pausa, fechar o dia, Sapo de amanhã, andares, preferências e sync.
const puppeteer=require('puppeteer-core');const url=require('./lib/serve');const fs=require('fs');const FAKE=require('./lib/fakesb');
const S=require('path').resolve(__dirname,'..');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));const res=[];const ok=(n,c)=>res.push((c?'PASS ':'FAIL ')+n);
let html=fs.readFileSync(S+'/pwa/index.html','utf8');
html=html.replace(/<script>window\.PRUMO_SB=.*?<\/script>\n?/,'').replace('<script src="supabase.js"></script>\n','');
fs.writeFileSync(S+'/e2e/obratest.html',html);
const pad=n=>String(n).padStart(2,'0');const iso=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const plus=n=>{const d=new Date();d.setDate(d.getDate()+n);return iso(d)};
const wd=s=>new Date(s+'T12:00:00').getDay();
const TD=plus(0),dow=(new Date().getDay()+6)%7,WS=-dow; // deslocamento da segunda desta semana
const B={status:'todo',fw:null,urg:false,imp:true,dod:[],mit:false,slips:0,focus:0,pomos:0,created:1,ex:false};
const T=o=>Object.assign({},B,o);
const done=(id,n)=>T({id,title:'Feita '+id,ctx:'trabalho',est:30,day:plus(n),status:'done',doneAt:Date.parse(plus(n)+'T12:00:00')});
// histórico: dias úteis das 3 semanas anteriores até ontem, todos firmes
function history(skip){const t=[];for(let n=WS-21;n<0;n++){const w=wd(plus(n));if(w===0||w===6)continue;if(skip.includes(n))continue;t.push(done('h'+(-n),n))}return t}
const expected=skip=>{let run=0;let used={};for(let n=WS-21;n<0;n++){const w=wd(plus(n));const firm=!(w===0||w===6)&&!skip.includes(n);const wk=Math.floor((n-WS)/7);
  if(firm)run++;else if(w===0||w===6){}else if(!used[wk]){used[wk]=1}else run=0}return run};
const today=[T({id:'a',title:'Revisar as peças',ctx:'trabalho',est:60,day:TD}),T({id:'b',title:'Responder o time',ctx:'trabalho',est:30,day:TD}),
  T({id:'c',title:'Moodboard do cliente',ctx:'freelas',est:90,day:plus(1)}),T({id:'d',title:'Proposta nova',ctx:'freelas',est:60,day:plus(1)}),
  T({id:'p',title:'Site em período',ctx:'freelas',est:60,day:plus(-1),end:plus(2)})];

(async()=>{const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox']});
const errs=[];
const open=async(tasks,extra)=>{const p=await b.newPage();await p.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
  p.on('pageerror',e=>errs.push(e.message));await p.evaluateOnNewDocument(FAKE);
  await p.evaluateOnNewDocument((tasks,extra)=>{if(sessionStorage.getItem('s'))return;sessionStorage.setItem('s','1');localStorage.removeItem('fake-db');
    localStorage.setItem('sb-test-auth-token',JSON.stringify({refresh_token:'x',user:{id:'u1',email:'dono@example.com'}}));
    localStorage.setItem('prumo.v1',JSON.stringify(Object.assign({v:1,upd:1,owner:'u1',seeded:true,prof:{},tasks,rec:{},cap:[0,300,300,300,300,300,120],ctx:{},retro:{},blockers:{},log:{},days:{},g:{},session:null,u:{},dirty:{},del:{},synced:true},extra||{})))},tasks,extra||null);
  await p.goto(await url('e2e/obratest.html'),{waitUntil:'domcontentloaded'});await sleep(1200);return p};
const st=p=>p.evaluate(()=>JSON.parse(localStorage.getItem('prumo.v1')));
const curOf=p=>p.evaluate(()=>Number(document.querySelector('.drings b').textContent));

// 1) sequência: firme todo dia útil, fim de semana é folga
{const p=await open(history([]).concat(today));
 ok('streak counts weekdays, weekends do not break ('+expected([])+')',await curOf(p)===expected([]));
 const lab=await p.evaluate(()=>document.querySelector('.drings').getAttribute('aria-label'));
 ok('rings button names the three rings and the streak',/planejar feito/.test(lab)&&/fazer 0 de 1/.test(lab)&&/fechar pendente/.test(lab)&&/Sequência de/.test(lab));
 // concluir a primeira tarefa do dia: dia firme
 await p.evaluate(()=>document.querySelector('[data-act=toggle][data-id=b]').click());await sleep(300);
 ok('first completion of the day says "Dia firme"',/Dia firme/.test(await p.evaluate(()=>document.querySelector('#toast').innerText)));
 ok('streak grows with today',await curOf(p)===expected([])+1);
 // folha da obra
 await p.evaluate(()=>document.querySelector('.drings').click());await sleep(250);
 ok('obra sheet opens with a name',await p.evaluate(()=>/Sua obra/.test(document.querySelector('.sheet h2').textContent)));
 const fl=await p.evaluate(()=>[...document.querySelectorAll('.sheet .floor')].map(f=>f.getAttribute('aria-label')));
 ok('one floor per week with bricks, newest first ('+fl.length+')',fl.length>=4&&/Semana de/.test(fl[0]));
 ok('today brick is firm',await p.evaluate(()=>!!document.querySelector('.sheet .bk.td.f')));
 await p.screenshot({path:S+'/e2e/obra-sheet.png'});
 await p.keyboard.press('Escape');await sleep(150);
 await p.close()}

// 2) um dia útil em branco usa a pausa; dois na mesma semana quebram
{const one=[WS-6];const p=await open(history(one).concat(today));
 ok('one blank weekday uses the pause ('+expected(one)+')',await curOf(p)===expected(one)&&expected(one)===expected([])-1);
 await p.close()}
{const two=[WS-7,WS-6];const p=await open(history(two).concat(today));
 const e=expected(two);ok('two blank weekdays in a week restart the streak ('+e+')',await curOf(p)===e&&e<expected([])-2);
 await p.evaluate(()=>document.querySelector('.drings').click());await sleep(250);
 ok('restart message is neutral and shows the record',await p.evaluate(()=>/Recorde: \d+ dias|Recomeço/.test(document.querySelector('.sheet').innerText)));
 await p.close()}

// 3) fechar o dia
{const p=await open(history([]).concat(today));
 ok('Hoje has the close card',await p.evaluate(()=>!!document.querySelector('.closec [data-act=close]')));
 await p.evaluate(()=>document.querySelector('.closec [data-act=close]').click());await sleep(250);
 const txt=await p.evaluate(()=>document.querySelector('.sheet').innerText);
 ok('close sheet named and lists leftovers (not running periods)',/Fechar o dia/.test(txt)&&/Revisar as peças/.test(txt)&&/Responder o time/.test(txt)&&!/Site em período/.test(txt.split(/sapo de amanhã/i)[0]));
 ok('focus moves into the close sheet',await p.evaluate(()=>!!document.activeElement.closest('.sheet')));
 await p.evaluate(tm=>document.querySelector('.sheet [data-act=mv][data-id=b][data-d="'+tm+'"]').click(),plus(1));await sleep(250);
 ok('moving a leftover keeps the close sheet open',await p.evaluate(()=>/Fechar o dia/.test(document.querySelector('.sheet h2').textContent)));
 ok('moved task now a Sapo candidate',await p.evaluate(()=>!!document.querySelector('.sheet [data-act=close-sapo][data-id=b]')));
 ok('leftover moved to tomorrow',(await st(p)).tasks.find(t=>t.id==='b').day===plus(1));
 await p.evaluate(()=>document.querySelector('.sheet [data-act=close-sapo][data-id=c]').click());await sleep(200);
 ok('Sapo chip pressed',await p.evaluate(()=>document.querySelector('.sheet [data-act=close-sapo][data-id=c]').getAttribute('aria-pressed')==='true'));
 ok('Sapo of tomorrow saved',((await st(p)).days[plus(1)]||{}).s==='c');
 await p.evaluate(()=>document.querySelector('.sheet [data-act=close-done]').click());await sleep(300);
 ok('day marked closed',((await st(p)).days[TD]||{}).c>0);
 ok('closing shows the obra with a status line',await p.evaluate(()=>/Sua obra/.test(document.querySelector('.sheet h2').textContent)&&!!document.querySelector('.sheet [role=status]')));
 await p.keyboard.press('Escape');await sleep(200);
 ok('Hoje says the day is closed and names tomorrow',await p.evaluate(()=>/Dia fechado/.test(document.querySelector('.closec').innerText)&&/Moodboard do cliente/.test(document.querySelector('.closec').innerText)));
 ok('rings: fechar done',await p.evaluate(()=>/fechar feito/.test(document.querySelector('.drings').getAttribute('aria-label'))));
 // sync: dia vai para a nuvem como item 'day'
 await sleep(1800);
 const db=await p.evaluate(()=>JSON.parse(localStorage.getItem('fake-db')||'{}'));
 const rows=Object.keys((db.u1)||{});
 ok('day items synced (today closed, tomorrow Sapo)',rows.includes('day/'+TD)&&rows.includes('day/'+plus(1)));
 // "tudo para amanhã" com desfazer
 await p.close()}
{const p=await open(today);
 await p.evaluate(()=>document.querySelector('[data-act=close]').click());await sleep(250);
 await p.evaluate(()=>document.querySelector('.sheet [data-act=close-all]').click());await sleep(250);
 let s=await st(p);ok('"Tudo para amanhã" moves every leftover',s.tasks.filter(t=>['a','b'].includes(t.id)).every(t=>t.day===plus(1)));
 await p.evaluate(()=>document.querySelector('[data-act=toast-act]').click());await sleep(250);
 s=await st(p);ok('and can be undone',s.tasks.filter(t=>['a','b'].includes(t.id)).every(t=>t.day===TD));
 await p.close()}

// 4) Sapo escolhido ontem abre o dia
{const p=await open(today,{days:{[TD]:{s:'b'}}});
 const hero=await p.evaluate(()=>document.querySelector('.hero').innerText);
 ok('chosen Sapo is "Agora" today',/Responder o time/.test(hero)&&/sapo/i.test(hero));
 await p.close()}

// 5) preferências no Perfil
{const p=await open(history([]).concat(today));
 await p.evaluate(()=>document.querySelector('[data-act=perfil]').click());await sleep(250);
 ok('Perfil has the streak settings',await p.evaluate(()=>/Sequência e obra/.test(document.querySelector('#view').innerText)));
 ok('weekends are folga by default',await p.evaluate(()=>document.querySelector('[data-act=g-off][data-v="6"]').getAttribute('aria-pressed')==='true'&&document.querySelector('[data-act=g-off][data-v="0"]').getAttribute('aria-pressed')==='true'));
 await p.evaluate(()=>document.querySelector('[data-act=g-off][data-v="6"]').click());await sleep(200);
 await p.evaluate(()=>document.querySelector('[data-act=g-meta][data-v="2"]').click());await sleep(200);
 const g=(await st(p)).g;ok('folga and daily goal saved',JSON.stringify(g.off)==='[0]'&&g.meta===2);
 await sleep(1500);
 const db=await p.evaluate(()=>JSON.parse(localStorage.getItem('fake-db')||'{}'));
 ok('settings synced as cap/g',!!(db.u1||{})['cap/g']);
 await p.evaluate(()=>document.querySelector('[data-act=tab][data-t=hoje], .tab[data-t=hoje]').click());await sleep(250);
 ok('meta 2: one firm unit is not enough',/fazer 0 de 2/.test(await p.evaluate(()=>document.querySelector('.drings').getAttribute('aria-label'))));
 await p.close()}

// 6) aviso abre a folha de fechar o dia
{const p=await b.newPage();await p.setViewport({width:390,height:844});p.on('pageerror',e=>errs.push(e.message));await p.evaluateOnNewDocument(FAKE);
 await p.evaluateOnNewDocument(tasks=>{if(sessionStorage.getItem('s'))return;sessionStorage.setItem('s','1');localStorage.setItem('sb-test-auth-token',JSON.stringify({refresh_token:'x',user:{id:'u1',email:'dono@example.com'}}));
   localStorage.setItem('prumo.v1',JSON.stringify({v:1,upd:1,owner:'u1',seeded:true,prof:{},tasks,rec:{},cap:[0,300,300,300,300,300,120],ctx:{},retro:{},blockers:{},log:{},session:null,u:{},dirty:{},del:{},synced:true}))},today);
 await p.goto((await url('e2e/obratest.html'))+'?fechar=1',{waitUntil:'domcontentloaded'});await sleep(5500);
 ok('?fechar=1 opens the close sheet (old data without days still works)',await p.evaluate(()=>!!document.querySelector('.sheet')&&/Fechar o dia/.test(document.querySelector('.sheet h2').textContent)));
 ok('query string removed',await p.evaluate(()=>!location.search));
 await p.screenshot({path:S+'/e2e/obra-fechar.png'});
 await p.close()}

console.log(res.join('\n'));console.log(errs.length?'ERRORS '+errs:'NO PAGE ERRORS');await b.close()})();
