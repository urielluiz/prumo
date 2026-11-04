const puppeteer=require('puppeteer-core');const url=require('./lib/serve');const fs=require('fs');const FAKE=require('./lib/fakesb');
const S=require('path').resolve(__dirname,'..');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));const res=[];const ok=(n,c)=>res.push((c?'PASS ':'FAIL ')+n);
let html=fs.readFileSync(S+'/pwa/index.html','utf8');
html=html.replace(/<script>window\.PRUMO_SB=.*?<\/script>\n?/,'').replace('<script src="supabase.js"></script>\n','');
fs.writeFileSync(S+'/e2e/converttest.html',html);
const pad=n=>String(n).padStart(2,'0');const iso=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const plus=(s,n)=>{const d=new Date(s+'T12:00:00');d.setDate(d.getDate()+n);return iso(d)};
const TD=iso(new Date());
const base={status:'todo',ctx:'trabalho',fw:null,urg:false,imp:true,dod:[],mit:false,slips:0,focus:0,pomos:0,created:1,ex:false};
const T=(o)=>Object.assign({},base,o);
// formato antigo: pauta (sem data) + filhas
const plan=[T({id:'g1',title:'Iniciar site Grupo Assaf',day:null,est:600})].concat([0,1,2,3,4].map(i=>T({id:'s'+i,title:'Sessão '+(i+1),type:'Iniciar site Grupo Assaf',parent:'g1',day:plus(TD,i-1),est:120,focus:i===1?1800:0})));
const posts=[T({id:'g2',title:'Pauta de posts',day:null,est:180}),
  T({id:'p1',title:'Post 1',type:'Post',parent:'g2',day:TD,est:60,status:'done',doneAt:Date.now()-86400000,focus:600}),
  T({id:'p2',title:'Post 2',type:'Post',parent:'g2',day:plus(TD,1),est:60}),
  T({id:'p3',title:'Post 3',type:'Post',parent:'g2',day:null,est:60})];
const done=[T({id:'g3',title:'Pauta encerrada',day:null,est:60}),T({id:'d1',title:'Sessão 1',type:'Pauta encerrada',parent:'g3',day:plus(TD,-3),est:60,status:'done',doneAt:Date.now()-3*86400000})];
const orphan=[T({id:'o1',title:'Filha sem pauta',parent:'sumiu',type:'x',day:TD,est:30})];

(async()=>{const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox']});
const errs=[];
const open=async(ctx,seed)=>{const p=await ctx.newPage();await p.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});p.on('pageerror',e=>errs.push(e.message));
  await p.evaluateOnNewDocument(FAKE);await p.evaluateOnNewDocument(seed.fn,seed.arg);
  await p.goto(await url('e2e/converttest.html'),{waitUntil:'domcontentloaded'});await sleep(1800);return p};
const mk=b.createBrowserContext?()=>b.createBrowserContext():()=>b.createIncognitoBrowserContext();

// ---------- 1) dados antigos no aparelho ----------
let ctx=await mk();
let p=await open(ctx,{fn:(tasks)=>{if(sessionStorage.getItem('seeded'))return;sessionStorage.setItem('seeded','1');
  localStorage.setItem('sb-test-auth-token',JSON.stringify({refresh_token:'x',user:{id:'u1',email:'dono@example.com'}}));
  localStorage.setItem('prumo.v1',JSON.stringify({v:1,upd:1,owner:'u1',seeded:true,tasks:tasks,rec:{},cap:[0,300,300,300,300,300,120],ctx:{},retro:{},blockers:{},log:{},session:{tid:'s1',fw:'timebox',phase:'focus',running:false,left:900,total:1500},u:{},dirty:{},del:{},synced:false}))},arg:plan.concat(posts,done,orphan)});
let s=await p.evaluate(()=>JSON.parse(localStorage.getItem('prumo.v1')));
const by=id=>s.tasks.find(t=>t.id===id);
ok('no child tasks left',!s.tasks.some(t=>t.parent));
let g=by('g1');
ok('plan became a period (first to last session)',!!g&&g.day===plus(TD,-1)&&g.end===plus(TD,3));
ok('plan: time per day kept (2h)',g.est===120);
ok('plan: focus time summed',g.focus===1800);
ok('plan: no steps when nothing was done',(g.dod||[]).length===0&&g.status==='todo');
ok('open focus session moved to the task',s.session&&s.session.tid==='g1');
g=by('g2');
ok('deliveries became steps with state',JSON.stringify(g.dod)===JSON.stringify([{t:'Post 1',d:true},{t:'Post 2',d:false},{t:'Post 3',d:false}]));
ok('deliveries: period spans the dated ones',g.day===TD&&g.end===plus(TD,1));
ok('deliveries: time per day = total / days',g.est===90);
ok('deliveries: focus summed, still open',g.focus===600&&g.status==='todo');
ok('fully done pauta stays done',by('g3').status==='done'&&by('g3').doneAt>0);
ok('orphan child loses its broken link',!by('o1').parent&&!by('o1').type);
ok('app opens on the focus session of the converted task',/Iniciar site Grupo Assaf/.test(await p.evaluate(()=>document.querySelector('#view').innerText)));
await p.evaluate(()=>document.querySelector('.tab[data-t=hoje]').click());await sleep(200);
const view=await p.evaluate(()=>document.querySelector('#view').innerText);
ok('converted period shows on Hoje as day 2 of 5',/Iniciar site Grupo Assaf[\s\S]*dia 2 de 5/.test(view));
ok('steps progress on the card',/1\/3 etapas/.test(view));
// idempotente: recarregar não muda nada
const before=JSON.stringify(s.tasks);
await p.reload({waitUntil:'domcontentloaded'});await sleep(1500);
ok('conversion is idempotent',JSON.stringify((await p.evaluate(()=>JSON.parse(localStorage.getItem('prumo.v1')))).tasks)===before);
await ctx.close();

// ---------- 2) pauta chegando do servidor (outro aparelho, versão antiga) ----------
ctx=await mk();
p=await open(ctx,{fn:(rows)=>{if(sessionStorage.getItem('seeded'))return;sessionStorage.setItem('seeded','1');
  localStorage.setItem('sb-test-auth-token',JSON.stringify({refresh_token:'x',user:{id:'u1',email:'dono@example.com'}}));
  const db={u1:{}};rows.forEach(t=>{db.u1['task/'+t.id]={kind:'task',id:t.id,data:t,deleted:false,updated_at:Date.now()-60000}});
  localStorage.setItem('fake-db',JSON.stringify(db))},arg:plan});
await sleep(2500);
s=await p.evaluate(()=>JSON.parse(localStorage.getItem('prumo.v1')));
g=s.tasks.find(t=>t.id==='g1');
ok('server pauta converted after sync',!!g&&g.end===plus(TD,3)&&!s.tasks.some(t=>t.parent));
const db=(await p.evaluate(()=>JSON.parse(localStorage.getItem('fake-db')))).u1;
ok('server: old sessions deleted',[0,1,2,3,4].every(i=>db['task/s'+i]&&db['task/s'+i].deleted===true));
ok('server: task updated with the period',db['task/g1']&&db['task/g1'].data.end===plus(TD,3)&&db['task/g1'].data.est===120);
await ctx.close();

console.log(res.join('\n'));console.log(errs.length?'ERRORS '+errs:'NO PAGE ERRORS');await b.close()})();
