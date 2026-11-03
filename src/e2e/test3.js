const puppeteer=require('puppeteer-core');const fs=require('fs');
const url=require('./lib/serve');
const S=require('path').resolve(__dirname,'..');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));const res=[];const ok=(n,c)=>res.push((c?'PASS ':'FAIL ')+n);
let html=fs.readFileSync(S+"/pwa/index.html","utf8");
html=html.replace(/<script>window\.PRUMO_SB=.*?<\/script>\n?/,'').replace('<script src="supabase.js"></script>\n','');
fs.writeFileSync(S+'/e2e/pushtest.html',html);
const FAKE=`
window.__calls=[];
function builder(tbl){const b={};b.select=()=>b;b.order=()=>b;b.range=()=>b;
 b.upsert=(r,o)=>{b._op='upsert';b._r=r;return b};b.delete=()=>{b._op='delete';return b};b.eq=(k,v)=>{b._eq=[k,v];return b};
 b.then=function(res,rej){return (async()=>{
  if(b._op){window.__calls.push({tbl,op:b._op,row:b._r,eq:b._eq});return {error:null}}
  return {data:[],error:null}})().then(res,rej)};return b}
window.supabase={createClient(){return {from(t){return builder(t)},channel(){const c={on(){return c},subscribe(){return c}};return c},removeChannel(){},
 auth:{onAuthStateChange(cb){setTimeout(()=>cb('INITIAL_SESSION',{user:{id:'u1'}}),10);return {data:{subscription:{unsubscribe(){}}}}},signInWithPassword(){return Promise.resolve({error:null})},signOut(){return Promise.resolve({error:null})},getSession(){return Promise.resolve({data:{session:{user:{id:'u1'}}},error:null})}}}}};
window.PRUMO_SB={url:'x',key:'y',vapid:'BAai8ZUcouidJgwKeiS0zLvXUBK2PccmgBD-40hw0Dr1_VoXYS0vw3FaK7PpXlNNpcmAjH1B_5WvIMnHlzkP0Wc'};
try{localStorage.setItem('sb-test-auth-token','{"refresh_token":"x"}')}catch(e){}
// fake push stack
let subbed=null;
const sub={endpoint:'https://push.example/abc',toJSON(){return {endpoint:this.endpoint,keys:{p256dh:'P',auth:'A'}}},unsubscribe(){subbed=null;return Promise.resolve(true)}};
const reg={pushManager:{getSubscription:()=>Promise.resolve(subbed),subscribe:(o)=>{window.__subOpts=o;subbed=sub;return Promise.resolve(sub)}}};
Object.defineProperty(navigator,'serviceWorker',{value:{ready:Promise.resolve(reg),register:()=>Promise.resolve(reg)},configurable:true});
window.PushManager=function(){};
window.Notification=function(){};Notification.permission='default';Notification.requestPermission=()=>{Notification.permission='granted';return Promise.resolve('granted')};
`;
(async()=>{const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox']});
const p=await b.newPage();await p.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.evaluateOnNewDocument(FAKE);
await p.goto(await url('e2e/pushtest.html'),{waitUntil:'domcontentloaded'});await sleep(1500);
const ev=(f,...a)=>p.evaluate(f,...a);const calls=()=>ev(()=>window.__calls.slice());const tasks=()=>ev(()=>JSON.parse(localStorage.getItem('prumo.v1')).tasks);
await ev(()=>document.querySelector('[data-act=clear-ex]').click());await sleep(150);
// enable push through banner on Hoje
ok('banner on Hoje',/Quer ser avisado/.test(await ev(()=>document.querySelector('#view').innerText)));
await ev(()=>document.querySelector('.banner [data-act=push-on]').click());await sleep(500);
// new task with plan: 3 working days x 2h from next monday
const nextMon=await ev(()=>{const d=new Date();d.setDate(d.getDate()+((8-d.getDay())%7||7));return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')});
await ev(()=>document.querySelector('.tab-add').click());await sleep(150);
await p.type('#f-title','Projeto X');
await ev(()=>document.querySelector('[data-act=sh-sec][data-v=split]').click());await sleep(100);

await ev(m=>{const f=(s,v)=>{const e=document.querySelector(s);e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}))};f('[data-in=pstart]',m);f('[data-in=pn]','6');f('[data-in=pest]','120')},nextMon);
await ev(()=>document.querySelector('[data-act=plan-add]').click());await sleep(200);
ok('plan pending summary',/6 dias de 2h a partir de/.test(await ev(()=>document.querySelector('.sheet').innerText)));
await ev(()=>document.querySelector('[data-act=sh-save]').click());await sleep(400);
let t=await tasks();const g=t.find(x=>x.title==='Projeto X'),kids=t.filter(x=>x.parent===g.id);
ok('6 sessions created',kids.length===6);
ok('sessions skip weekends',kids.every(k=>{const w=new Date(k.day+'T12:00:00').getDay();return w>0&&w<6}));
ok('sessions on distinct consecutive workdays',new Set(kids.map(k=>k.day)).size===6&&kids[0].day===nextMon);
ok('pauta est is total (12h)',g.est===720&&g.day===null);
ok('kids typed with project name',kids.every(k=>k.type==='Projeto X'));
// Proximos dias on Hoje: task for tomorrow
await ev(()=>document.querySelector('.tab-add').click());await sleep(150);
await p.type('#f-title','Entrega amanhã');
await ev(()=>document.querySelector('[data-act=sh-day]:nth-child(2)').click());
await ev(()=>document.querySelector('[data-act=sh-save]').click());await sleep(300);
await ev(()=>document.querySelector('.tab[data-t=hoje]').click());await sleep(150);
ok('Próximos dias lists tomorrow task',/Próximos dias/.test(await ev(()=>document.querySelector('#view').innerText))&&/Entrega amanhã/.test(await ev(()=>document.querySelector('#view').innerText)));
// reminders synced
await sleep(3500);
let c=await calls();
const rems=c.filter(x=>x.tbl==='prumo_reminders'&&x.op==='upsert');
ok('reminders upserted',rems.length>=1);
const rows=rems[rems.length-1].row;
ok('reminder for tomorrow 08:00 local',rows.some(r=>{const d=new Date(r.fire_at);return d.getHours()===8&&/Entrega amanhã/.test(r.body)&&r.sent===false}));
ok('reminder groups project sessions',rows.some(r=>/2h em Projeto X/.test(r.body)));
ok('unsent reminders cleared before upsert',c.some(x=>x.tbl==='prumo_reminders'&&x.op==='delete'));
// start timer, go to other tab -> mini player with pause
await ev(()=>document.querySelector('.tab-add').click());await sleep(150);
await p.type('#f-title','Tarefa de hoje');
await ev(()=>document.querySelector('[data-act=sh-save]').click());await sleep(300);
await ev(()=>document.querySelector('[data-act=start]')&&document.querySelector('[data-act=start]').click());
await sleep(500);
await ev(()=>document.querySelector('.tab[data-t=semana]').click());await sleep(300);
ok('mini player visible outside Foco',await ev(()=>!document.getElementById('mini').hidden&&/Pausar/.test(document.getElementById('mini').innerText)));
await p.screenshot({path:S+'/e2e/mini.png'});
await ev(()=>document.querySelector('#mini [data-act=pause]').click());await sleep(300);
ok('mini shows Pausado + Retomar',await ev(()=>/Pausado/.test(document.getElementById('mini').innerText)&&/Retomar/.test(document.getElementById('mini').innerText)));
const left1=await ev(()=>JSON.parse(localStorage.getItem('prumo.v1')).session.left);
await sleep(1500);
const left2=await ev(()=>JSON.parse(localStorage.getItem('prumo.v1')).session.left);
ok('paused time does not run',left1===left2);
await ev(()=>document.querySelector('#mini [data-act=resume]').click());await sleep(1300);
ok('resume continues from paused value',await ev(()=>{const s=JSON.parse(localStorage.getItem('prumo.v1')).session;return s.running&&s.endsAt-Date.now()<=s.left*1000+50}));
// brief setting
await ev(()=>document.querySelector('.tab[data-t=revisao]').click());await sleep(200);
await ev(()=>[...document.querySelectorAll('[data-act=brief]')].find(x=>x.dataset.v==='off').click());await sleep(500);
c=await calls();
ok('turning briefing off deletes unsent',c.filter(x=>x.tbl==='prumo_reminders'&&x.op==='delete').length>=2);
console.log(res.join('\n'));console.log(errs.length?'ERRORS '+errs:'NO PAGE ERRORS');await b.close()})();
