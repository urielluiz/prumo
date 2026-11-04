const puppeteer=require('puppeteer-core');const url=require('./lib/serve');const fs=require('fs');const FAKE=require('./lib/fakesb');
const S=require('path').resolve(__dirname,'..');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));const res=[];const ok=(n,c)=>res.push((c?'PASS ':'FAIL ')+n);
let html=fs.readFileSync(S+'/pwa/index.html','utf8');
html=html.replace(/<script>window\.PRUMO_SB=.*?<\/script>\n?/,'').replace('<script src="supabase.js"></script>\n','');
fs.writeFileSync(S+'/e2e/createtest.html',html);
const pad=n=>String(n).padStart(2,'0');const iso=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const plus=(s,n)=>{const d=new Date(s+'T12:00:00');d.setDate(d.getDate()+n);return iso(d)};
const TD=iso(new Date());
const nextDow=w=>{const d=new Date();for(let i=0;i<7;i++){const x=new Date(d);x.setDate(d.getDate()+i);if(x.getDay()===w)return iso(x)}};
const SAT=nextDow(6),TUE=nextDow(2)>SAT?nextDow(2):plus(SAT,3);

(async()=>{const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox']});
const p=await b.newPage();await p.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.evaluateOnNewDocument(FAKE);
await p.evaluateOnNewDocument(()=>{localStorage.setItem('sb-test-auth-token',JSON.stringify({refresh_token:'x',user:{id:'u1',email:'dono@example.com'}}))});
const ev=(f,...a)=>p.evaluate(f,...a);
const click=s=>ev(s=>{const e=document.querySelector(s);if(!e)throw new Error('missing '+s);e.click()},s);
const has=s=>ev(s=>!!document.querySelector(s),s);
const txt=s=>ev(s=>{const e=document.querySelector(s);return e?e.innerText:''},s);
const toastTxt=()=>ev(()=>{const t=document.querySelector('#toast');return t.hidden?'':t.innerText});
const st=()=>ev(()=>JSON.parse(localStorage.getItem('prumo.v1')));
const task=async n=>(await st()).tasks.find(x=>x.title===n);
const flashed=()=>ev(()=>{const e=document.querySelector('[data-tid].flash');return e?e.dataset.tid:null});
const typeTitle=async t=>{await click('.tab-add');await sleep(200);await p.type('#f-title',t);await sleep(80)};
const pickDay=async d=>{for(let i=0;i<4;i++){if(await ev(d=>{const b=document.querySelector('[data-act=cal-day][data-v="'+d+'"]');if(b){b.click();return true}return false},d)){await sleep(80);return true}await click('[data-act=cal-mon][data-v="1"]');await sleep(60)}return false};
await p.goto(await url('e2e/createtest.html'),{waitUntil:'domcontentloaded'});await sleep(1200);
await ev(()=>{const c=document.querySelector('[data-act=clear-ex]');if(c)c.click()});await sleep(150);

// ---------- reconhecimento de texto ----------
await typeTitle('Projeto do cliente X sáb a ter 2h #freelas');
const toks=await ev(()=>[...document.querySelectorAll('.tok')].map(t=>t.innerText.trim()));
ok('text: period, time and context recognized',toks.length===3&&/a ter/.test(toks[0])&&toks[1]==='2h'&&toks[2]==='Freelas');
ok('text: summary shows period per day',/Projeto do cliente X · .* \(\d dias\) · 2h por dia · Freelas/.test(await txt('#tk-sum')));
ok('text: pills follow the text',/2h por dia/.test(await txt('#tk-pills'))&&/Freelas/.test(await txt('#tk-pills')));
ok('text: typing does not rebuild the sheet (focus stays)',await ev(()=>document.activeElement&&document.activeElement.id==='f-title'));
await click('[data-act=sh-save]');await sleep(300);
let t=await task('Projeto do cliente X');
ok('text: saved as one period task',!!t&&t.day===SAT&&t.end===TUE&&t.est===120&&t.ctx==='freelas');
ok('text: toast names the period',/Tarefa criada de (sáb|sab).* a (ter).*\(\d dias\)/.test(await toastTxt()));
await click('[data-act=toast-act]');await sleep(400);
ok('"Ver" opens the week and highlights the card',(await flashed())===t.id&&await has('.tab[data-t=semana][aria-current=page]')&&await has('#d-'+SAT));
ok('week strip marks the period days',await has('.dy.per[data-d="'+SAT+'"]'));
ok('card shows day 1 of N',/dia 1 de \d/.test(await txt('[data-tid="'+t.id+'"]')));

// × trata como texto
await click('.tab[data-t=hoje]');await sleep(150);
await typeTitle('Relatório de sexta 1h');
await ev(()=>document.querySelector('[data-act=tok-off][data-v=when]').click());await sleep(120);
ok('× keeps the word in the title',/Relatório de sexta · Hoje · 1h/.test(await txt('#tk-sum')));
await click('[data-act=sh-save]');await sleep(300);
t=await task('Relatório de sexta');
ok('× : saved with the word and no date change',!!t&&t.day===TD&&t.est===60);
ok('today: toast says hoje and card flashes',/criada para hoje/.test(await toastTxt())&&(await flashed())===t.id);

// ---------- calendário: um dia, vários dias, sem data ----------
await typeTitle('Viagem a trabalho');
await click('[data-act=sh-sec][data-v=when]');await sleep(100);
ok('past days are disabled',await ev(td=>{const bs=[...document.querySelectorAll('[data-act=cal-day]')].filter(b=>b.dataset.v<td);return bs.every(b=>b.disabled)},TD));
await click('[data-act=sh-multi][data-v="1"]');await sleep(80);
const A=plus(TD,3),Z=plus(TD,5);
await pickDay(Z);ok('multi: asks for the last day',/último dia/.test(await txt('.tk-panel .hint')));
await pickDay(A);
ok('multi: picking in reverse order still makes a valid range',/3 dias/.test(await txt('.tk-panel .hint'))&&await has('[data-act=cal-day][data-v="'+A+'"].s')&&await has('[data-act=cal-day][data-v="'+Z+'"].e'));
await click('[data-act=sh-sec][data-v=est]');await sleep(80);
await click('[data-act=sh-est][data-v="240"]');await sleep(80);
ok('est panel shows total for the period',/12h/.test(await txt('.tk-panel')));
await click('[data-act=sh-save]');await sleep(300);
t=await task('Viagem a trabalho');ok('multi: saved',t.day===A&&t.end===Z&&t.est===240);
await typeTitle('Ideia de post');
await click('[data-act=sh-sec][data-v=when]');await sleep(80);
await click('[data-act=sh-day][data-v=none]');await sleep(80);
await click('[data-act=sh-save]');await sleep(300);
ok('no date: toast says sem data',/criada sem data/.test(await toastTxt())&&!(await task('Ideia de post')).day);

// ---------- repetição não combina com período ----------
await typeTitle('Treino');
await click('[data-act=sh-sec][data-v=when]');await sleep(80);await click('[data-act=sh-multi][data-v="1"]');await sleep(60);
await pickDay(plus(TD,1));await pickDay(plus(TD,2));
await click('[data-act=sh-sec][data-v=rep]');await sleep(80);await click('[data-act=sh-rec][data-v=daily]');await sleep(80);
await click('[data-act=sh-sec][data-v=when]');await sleep(80);
ok('repeat: multi-day disabled and explained',await ev(()=>document.querySelector('[data-act=sh-multi][data-v="1"]').disabled)&&/repetem são de um dia/.test(await txt('.tk-panel .hint')));
await click('[data-act=sh-save]');await sleep(300);
t=await task('Treino');ok('repeat: saved as single-day series',!!t&&!t.end&&!!t.rid);

// ---------- etapas ----------
await typeTitle('Site novo');
await click('[data-act=sh-sec][data-v=more]');await sleep(120);
await p.type('#f-step','Briefing');await p.keyboard.press('Enter');await sleep(120);
await p.type('#f-step','Wireframe');await click('[data-act=st-add]');await sleep(120);
await p.type('#f-step','Layout');await p.keyboard.press('Enter');await sleep(120);
ok('steps: added with Enter and button, focus stays in field',(await ev(()=>document.querySelectorAll('.steps li').length))===3&&await ev(()=>document.activeElement.id==='f-step'));
await click('[data-act=st-del][data-v="1"]');await sleep(80);
await click('[data-act=st-tog][data-v="0"]');await sleep(80);
await click('[data-act=sh-save]');await sleep(300);
t=await task('Site novo');
ok('steps: saved in order with state',JSON.stringify(t.dod)===JSON.stringify([{t:'Briefing',d:true},{t:'Layout',d:false}]));
ok('steps: card shows progress',/1\/2 etapas/.test(await txt('[data-tid="'+t.id+'"]')));

// ---------- editar: título não é reinterpretado ----------
await click('.tab[data-t=hoje]');await sleep(150);
const rel=await task('Relatório de sexta');
await ev(id=>document.querySelector('[data-act=edit][data-id="'+id+'"]').click(),rel.id);await sleep(200);
ok('edit: no text recognition on existing title',!(await has('.tok'))&&/Relatório de sexta/.test(await txt('#tk-sum')));
await ev(()=>{const i=document.querySelector('#f-title');i.value='Relatório de sexta revisado';i.dispatchEvent(new Event('input',{bubbles:true}))});
await click('[data-act=sh-save]');await sleep(300);
ok('edit: saved with "salva" toast',/Tarefa salva para hoje/.test(await toastTxt())&&!!(await task('Relatório de sexta revisado')));

// ---------- período nas telas ----------
await typeTitle('Campanha de lançamento');
await click('[data-act=sh-sec][data-v=when]');await sleep(80);await click('[data-act=sh-multi][data-v="1"]');await sleep(60);
await pickDay(TD);await pickDay(plus(TD,2));
await click('[data-act=sh-save]');await sleep(300);
t=await task('Campanha de lançamento');
ok('period from today shows on Hoje with day 1 of 3',/dia 1 de 3/.test(await txt('[data-tid="'+t.id+'"]'))&&await has('[data-tid="'+t.id+'"] .rbar'));
await click('.tab[data-t=semana]');await sleep(150);
ok('tomorrow shows day 2 of 3',await ev(([d,id])=>{const h=document.getElementById('d-'+d);const l=h&&h.nextElementSibling;const r=l&&l.querySelector('[data-tid="'+id+'"]');return !!r&&/dia 2 de 3/.test(r.innerText)},[plus(TD,1),t.id]));
await click('.tab[data-t=hoje]');await sleep(150);
await ev(id=>document.querySelector('[data-act=toggle][data-id="'+id+'"]').click(),t.id);await sleep(300);
t=await task('Campanha de lançamento');
ok('completing a period ends it today',t.status==='done'&&t.day===TD&&!t.end);

// atrasada: período que já passou aparece em "Ficou para trás" e "Hoje" desfaz o período
await ev(([a,z])=>{const v=JSON.parse(localStorage.getItem('prumo.v1'));v.tasks.push({id:'old1',title:'Período que passou',ctx:'trabalho',est:60,day:a,end:z,status:'todo',dod:[],slips:0,focus:0,pomos:0,mit:false});localStorage.setItem('prumo.v1',JSON.stringify(v))},[plus(TD,-5),plus(TD,-2)]);
await p.reload({waitUntil:'domcontentloaded'});await sleep(1200);
ok('overdue: alert on Hoje instead of a list',/1 tarefa ficou para trás/.test(await txt('.alert'))&&!/Período que passou/.test(await txt('#view')));
await click('[data-act=late]');await sleep(150);
ok('overdue: resolve sheet shows its last day',/Período que passou[\s\S]*Era para/.test(await txt('.sheet')));
await ev(td=>document.querySelector('.sheet [data-act=mv][data-id=old1][data-d="'+td+'"]').click(),TD);await sleep(250);
t=(await st()).tasks.find(x=>x.id==='old1');ok('overdue: moved to today as a single day, counted as postponed',t.day===TD&&!t.end&&t.slips===1);
ok('overdue: sheet closes when nothing is left and alert goes away',!(await has('.sheet'))&&!(await has('.alert')));
await click('[data-act=toast-act]');await sleep(200);
t=(await st()).tasks.find(x=>x.id==='old1');ok('undo restores the period',t.day===plus(TD,-5)&&t.end===plus(TD,-2)&&(t.slips||0)===0);


// ---------- prazo final ----------
const FRI=(()=>{for(let i=0;i<7;i++){const d=plus(TD,i);if(new Date(d+'T12:00:00').getDay()===5)return d}})();
await click('.tab[data-t=hoje]');await sleep(150);
await typeTitle('Entregar relatório até sexta 1h');
ok('due: "até sexta" recognized as deadline, not as the day',/Prazo/.test(await ev(()=>[...document.querySelectorAll('.tok')].map(t=>t.innerText).join(' ')))&&/Entregar relatório · Hoje · 1h .* · prazo/.test(await txt('#tk-sum')));
await click('[data-act=sh-save]');await sleep(300);
t=await task('Entregar relatório');
ok('due: saved separately from the day',t.day===TD&&t.due===FRI);
ok('due: card shows the deadline',new RegExp('prazo '+(FRI===TD?'hoje':'')).test(await txt('[data-tid="'+t.id+'"]')));
// escolher e limpar pelo calendário
await ev(id=>document.querySelector('[data-act=edit][data-id="'+id+'"]').click(),t.id);await sleep(200);
await click('[data-act=sh-sec][data-v=more]');await sleep(120);
await click('[data-act=due-pick]');await sleep(120);
const D9=plus(TD,9);
for(let i=0;i<3;i++){if(await has('[data-act=due-day][data-v="'+D9+'"]'))break;await click('[data-act=due-mon][data-v="1"]');await sleep(60)}
await click('[data-act=due-day][data-v="'+D9+'"]');await sleep(120);
ok('due: picked on its own calendar',/prazo/.test(await txt('#tk-sum'))&&!(await has('[data-act=due-day]')));
await click('[data-act=sh-save]');await sleep(300);
ok('due: edited',(await task('Entregar relatório')).due===D9);
// prazo hoje de tarefa planejada para depois aparece na tela Hoje; vencido fica vermelho
await ev(([td,y])=>{const v=JSON.parse(localStorage.getItem('prumo.v1'));v.tasks.push({id:'dz1',title:'Contrato com prazo hoje',ctx:'trabalho',est:30,day:null,due:td,status:'todo',dod:[],slips:0,focus:0,pomos:0,mit:false},{id:'dz2',title:'Prazo que venceu',ctx:'trabalho',est:30,day:null,due:y,status:'todo',dod:[],slips:0,focus:0,pomos:0,mit:false});localStorage.setItem('prumo.v1',JSON.stringify(v))},[TD,plus(TD,-1)]);
await p.reload({waitUntil:'domcontentloaded'});await sleep(1200);
ok('due today: shows on Hoje even without a day',/Contrato com prazo hoje/.test(await txt('#view'))&&/prazo hoje/.test(await txt('[data-tid=dz1]')));
ok('due passed: red tag',await has('[data-tid=dz2] .tag.due.bad'));
await ev(()=>document.querySelector('[data-act=edit][data-id=dz1]').click());await sleep(200);
await click('[data-act=sh-sec][data-v=more]');await sleep(100);await click('[data-act=due-set][data-v=""]');await sleep(100);
await click('[data-act=sh-save]');await sleep(300);
ok('due: cleared',!(await st()).tasks.find(x=>x.id==='dz1').due);
console.log(res.join('\n'));console.log(errs.length?'ERRORS '+errs:'NO PAGE ERRORS');await b.close()})();
