const puppeteer=require('puppeteer-core');const fs=require('fs');
const url=require('./lib/serve');
const S=require('path').resolve(__dirname,'..');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));const res=[];const ok=(n,c)=>res.push((c?'PASS ':'FAIL ')+n);
let html=fs.readFileSync(S+'/pwa/index.html','utf8');
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
const ev=(f,...a)=>p.evaluate(f,...a);const calls=()=>ev(()=>window.__calls.slice());
await ev(()=>document.querySelector('.tab[data-t=revisao]').click());await sleep(300);
let txt=await ev(()=>document.querySelector('#view').innerText);
ok('settings shows off state + enable button',/aviso com a tela bloqueada/i.test(txt)&&!!(await ev(()=>document.querySelector('[data-act=push-on]'))));
await p.screenshot({path:S+'/e2e/push-set.png',fullPage:true});
await ev(()=>document.querySelector('[data-act=push-on]').click());await sleep(500);
let c=await calls();
ok('subscribed row saved',c.some(x=>x.tbl==='prumo_push_subs'&&x.op==='upsert'&&x.row.endpoint==='https://push.example/abc'&&x.row.p256dh==='P'));
ok('applicationServerKey is 65 bytes',(await ev(()=>window.__subOpts.applicationServerKey.length))===65);
txt=await ev(()=>document.querySelector('#view').innerText);
ok('state on, test+off buttons',!!(await ev(()=>document.querySelector('[data-act=push-test]')))&&!!(await ev(()=>document.querySelector('[data-act=push-off]'))));
// start a timer
await ev(()=>document.querySelector('.tab[data-t=hoje]').click());await sleep(200);
await ev(()=>document.querySelector('[data-act=start]').click());await sleep(500);
c=await calls();
let up=c.filter(x=>x.tbl==='prumo_timers'&&x.op==='upsert');
ok('timer row upserted on start',up.length>=1&&new Date(up[up.length-1].row.ends_at)>new Date()&&up[up.length-1].row.sent===false);
const n1=up.length;
// pause
await ev(()=>document.querySelector('[data-act=pause]').click());await sleep(400);
c=await calls();
ok('timer row deleted on pause',c.some(x=>x.tbl==='prumo_timers'&&x.op==='delete'));
await ev(()=>document.querySelector('[data-act=resume]').click());await sleep(400);
c=await calls();up=c.filter(x=>x.tbl==='prumo_timers'&&x.op==='upsert');
ok('timer row re-upserted on resume',up.length>n1);
// test button
await ev(()=>document.querySelector('[data-act=stop]').click());await sleep(300);
await ev(()=>document.querySelector('.tab[data-t=revisao]').click());await sleep(200);
const before=(await calls()).length;
await ev(()=>document.querySelector('[data-act=push-test]').click());await sleep(400);
c=await calls();const t=c.filter(x=>x.tbl==='prumo_timers'&&x.op==='upsert').pop();
ok('test schedules row ~15s ahead',t.tbl==='prumo_timers'&&t.op==='upsert'&&Math.abs(new Date(t.row.ends_at)-Date.now()-15000)<4000);
// unrelated persist must not delete the test row
await ev(()=>{const i=document.querySelector('[data-in=ctxname]');i.value='Trabalho X';i.dispatchEvent(new Event('input',{bubbles:true}))});await sleep(500);
c=await calls();
ok('persist does not delete test row',!c.slice(before+1).some(x=>x.tbl==='prumo_timers'&&x.op==='delete'));
await ev(()=>document.querySelector('[data-act=push-off]').click());await sleep(500);
c=await calls();
ok('disable removes sub',c.some(x=>x.tbl==='prumo_push_subs'&&x.op==='delete'&&x.eq[1]==='https://push.example/abc'));
// convite na tela Hoje: some assim que os avisos são ligados
{const q=await b.newPage();await q.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
await q.evaluateOnNewDocument(FAKE);await q.goto(await url('e2e/pushtest.html'),{waitUntil:'domcontentloaded'});await sleep(1500);
const has=()=>q.evaluate(()=>!!document.querySelector('#view .banner [data-act=push-on]'));
ok('home: invite to enable push shown',await has());
await q.evaluate(()=>document.querySelector('#view .banner [data-act=push-on]').click());await sleep(600);
ok('home: invite disappears after enabling (no reload)',!(await has()));
await q.close()}
console.log(res.join('\n'));console.log(errs.length?'ERRORS '+errs:'NO PAGE ERRORS');await b.close()})();
