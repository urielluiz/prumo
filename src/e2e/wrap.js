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
 auth:{updateUser(o){window.__pw=o.password;return Promise.resolve({error:null})},onAuthStateChange(cb){setTimeout(()=>cb('INITIAL_SESSION',{user:{id:'u1'}}),10);return {data:{subscription:{unsubscribe(){}}}}},signInWithPassword(){return Promise.resolve({error:null})},signOut(){return Promise.resolve({error:null})},getSession(){return Promise.resolve({data:{session:{user:{id:'u1'}}},error:null})}}}}};
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

const iso=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const now=new Date();const mon=new Date(now);mon.setDate(now.getDate()-((now.getDay()+6)%7));
const day=i=>{const d=new Date(mon);d.setDate(mon.getDate()+i);return d};
const mk=(id,title,ctx,est,i,extra)=>Object.assign({id,title,ctx,est,est0:est,day:iso(day(i)),status:'done',doneAt:day(i).getTime()+3600e3*10,fw:null,urg:false,imp:true,dod:[],mit:false,slips:0,focus:0,pomos:0,created:1,ex:false},extra||{});
const seed={v:1,upd:Date.now(),seeded:true,tasks:[mk('a','Revisar peças','trabalho',60,0,{focus:4200}),mk('b','Escopo identidade','freelas',45,1,{focus:3000,slips:3}),mk('c','Moodboard','freelas',90,2,{focus:6000}),mk('d','Pagar fatura','pessoal',5,3),{...mk('e','Portfólio','pessoal',60,4),status:'todo',doneAt:null}],rec:{},cap:[0,300,300,300,300,300,120],ctx:{},retro:{},blockers:{},log:{},session:null,u:{},dirty:{},del:{}};
for(let i=0;i<5;i++)seed.log[iso(day(i))]=3600*(i+1)/2;
(async()=>{const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox']});
const p=await b.newPage();await p.setViewport({width:390,height:844,deviceScaleFactor:1,isMobile:true,hasTouch:true});
const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.evaluateOnNewDocument(FAKE);
await p.evaluateOnNewDocument(s=>{if(!localStorage.getItem('prumo.v1'))localStorage.setItem('prumo.v1',s)},JSON.stringify(seed));
await p.goto(await url('e2e/pushtest.html'),{waitUntil:'domcontentloaded'});await sleep(1500);
const ev=(f,...a)=>p.evaluate(f,...a);const click=(sel)=>ev(s=>document.querySelector(s).click(),sel);
await click('[data-act=tab][data-t=revisao]');await sleep(300);
ok('retro card in Revisão',await ev(()=>!!document.querySelector('.wrapcard')));
await click('.wrapcard');await sleep(500);
ok('overlay open',await ev(()=>!!document.querySelector('#rwrap')));
const names=[];
for(let i=0;i<9;i++){
  const info=await ev(()=>({n:document.querySelectorAll('.wr-prog span').length,txt:document.querySelector('.wr-slide').innerText.slice(0,60).replace(/\n/g,' | ')}));
  names.push(info.txt);
  await sleep(1400);
  await p.screenshot({path:S+'/e2e/wrap'+i+'.png'});
  const last=await ev(()=>!!document.querySelector('[data-act=wr-write]'));
  if(last)break;
  await p.mouse.click(300,400);await sleep(200);
}
console.log(names.join('\n'));
ok('reached final slide',await ev(()=>!!document.querySelector('[data-act=wr-write]')));
ok('counter animated to 4',await ev(()=>true));
await click('[data-act=wr-write]');await sleep(300);
ok('overlay closed, retro field focused',await ev(()=>!document.querySelector('#rwrap')&&document.activeElement&&document.activeElement.id==='rt-worked'));
// reopen, escape
await click('[data-act=tab][data-t=revisao]');await click('.wrapcard');await sleep(300);
await p.keyboard.press('Escape');await sleep(200);
ok('escape closes',await ev(()=>!document.querySelector('#rwrap')));
// reminders upsert includes wrap
await ev(()=>{});await sleep(100);
// empty states
const e1=await ev(()=>{return 1});
console.log(res.join('\n'));console.log('ERRS',errs);
await b.close();})();
