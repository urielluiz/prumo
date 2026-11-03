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
 auth:{updateUser(o){window.__pw=o.password;return Promise.resolve({error:null})},onAuthStateChange(cb){setTimeout(()=>cb('INITIAL_SESSION',{user:{id:'u1'}}),10);return {data:{subscription:{unsubscribe(){}}}}},signInWithPassword(o){window.__signin=o;return Promise.resolve({error:o.password==='senha-atual-certa'?null:{status:400,code:'invalid_credentials',message:'Invalid login credentials'}})},getUser(){return Promise.resolve({data:{user:{id:'u1',email:'eu@example.com'}}})},signOut(o){window.__signout=o;return Promise.resolve({error:null})},getSession(){return Promise.resolve({data:{session:{user:{id:'u1'}}},error:null})}}}}};
const _f=window.fetch;window.fetch=function(u,o){if(String(u).indexOf('api.pwnedpasswords.com')>=0){window.__hibp=String(u);return Promise.resolve(new Response('0000000000000000000000000000000000A:0'))}return _f.apply(this,arguments)};
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
const ev=(f,...a)=>p.evaluate(f,...a);const st=()=>ev(()=>JSON.parse(localStorage.getItem('prumo.v1')));
const click=(sel)=>ev(s=>document.querySelector(s).click(),sel);
await click('[data-act=clear-ex]');await sleep(150);
// --- new recurring task: dias uteis
await click('.tab-add');await sleep(150);
await p.type('#f-title','Relatório diário');
await click('[data-act=sh-sec][data-v=rep]');await sleep(100);
await click('[data-act=sh-rec][data-v=weekdays]');await sleep(100);
await p.screenshot({path:S+'/e2e/sheet-rep.png'});
await click('[data-act=sh-save]');await sleep(400);
let s=await st();let ts=s.tasks.filter(t=>t.title==='Relatório diário');
const iso=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
let expect=0;for(let i=0;i<14;i++){const d=new Date();d.setDate(d.getDate()+i);const w=d.getDay();if(w>0&&w<6)expect++}
ok('series created with 14-day window of weekdays ('+ts.length+'/'+expect+')',ts.length===expect&&Object.keys(s.rec).length===1);
ok('deterministic ids',ts.filter(t=>t.id.startsWith('r_')).length===ts.length-1);
// reload must not duplicate
await p.reload({waitUntil:'domcontentloaded'});await sleep(2500);
s=await st();ok('no duplicates after reload',s.tasks.filter(t=>t.title==='Relatório diário').length===expect);
// delete one occurrence via trash -> skipped, not regenerated
const victim=s.tasks.filter(t=>t.title==='Relatório diário'&&t.day>iso(new Date()))[0];
if(victim){
 await ev(i=>{const b=document.querySelector('[data-act=rowdel][data-id="'+i+'"]');if(b)b.click();else{window.__nodel=1}},victim.id);
 if(await ev(()=>window.__nodel)){ /* not on Hoje: use persist path */ await ev(i=>{window.dropTask&&0},victim.id)}
}
await sleep(300);
let s2=await st();
ok('deleted occurrence is skipped and not regenerated',!!victim&&!s2.tasks.some(t=>t.rid&&(t.od||t.day)===victim.day)&&Object.values(s2.rec)[0].skip.includes(victim.day));
await p.reload({waitUntil:'domcontentloaded'});await sleep(2500);
s2=await st();
ok('skip survives reload (still absent)',!s2.tasks.some(t=>t.rid&&(t.od||t.day)===victim.day));
// edit series: rename and apply to next
await click('.tab[data-t=semana]');await sleep(150);
const first=(await st()).tasks.find(t=>t.title==='Relatório diário'&&t.day===iso(new Date())||t.title==='Relatório diário');
await ev(i=>document.querySelector('[data-act=edit][data-id="'+i+'"]')&&document.querySelector('[data-act=edit][data-id="'+i+'"]').click(),first.id);await sleep(200);
const opened=await ev(()=>!!document.querySelector('#f-title'));
if(opened){
 await ev(()=>{const i=document.querySelector('#f-title');i.value='Relatório semanal do time';i.dispatchEvent(new Event('input',{bubbles:true}))});
 await click('[data-act=sh-sec][data-v=rep]');await sleep(100);
 ok('apply-to-next chip shown for series',!!(await ev(()=>document.querySelector('[data-act=rec-all]'))));
 await click('[data-act=sh-save]');await sleep(400);
 s=await st();
 ok('rename applied to future occurrences',s.tasks.filter(t=>t.rid).every(t=>t.title==='Relatório semanal do time'||t.done));
 ok('series template renamed',Object.values(s.rec)[0].title==='Relatório semanal do time');
}else ok('could open occurrence',false);
// delete this and following via sheet
const tgt=(await st()).tasks.filter(t=>t.rid).sort((a,b)=>a.day<b.day?-1:1)[2];
await ev(i=>{window.openTask&&0;},0);
await click('.tab[data-t=hoje]');await sleep(100);
// find any rendered occurrence to open
let ids=await ev(()=>[...document.querySelectorAll('[data-act=edit]')].map(x=>x.dataset.id));
ok('occurrence rows have repete tag',/repete/.test(await ev(()=>document.querySelector('#view').innerText)));
await ev(i=>document.querySelector('[data-act=edit][data-id="'+i+'"]').click(),ids[0]);await sleep(200);
await click('[data-act=sh-del]');await sleep(100);
ok('series delete offers two choices',!!(await ev(()=>document.querySelector('[data-act=sh-delall]')))&&!!(await ev(()=>document.querySelector('[data-act=sh-del1]'))));
await click('[data-act=sh-delall]');await sleep(300);
s=await st();
ok('ending series removes open occurrences and sets until',s.tasks.filter(t=>t.rid&&t.status!=='done').length===0&&!!Object.values(s.rec)[0].until);
await click('[data-act=toast-act]');await sleep(250);
s=await st();
ok('undo restores series',s.tasks.filter(t=>t.rid).length===expect-1&&Object.values(s.rec)[0].until===null);
// weekly custom
await click('.tab-add');await sleep(150);
await p.type('#f-title','Treino');
await click('[data-act=sh-sec][data-v=rep]');await sleep(100);
await click('[data-act=sh-rec][data-v=weekly]');await sleep(100);
await ev(()=>{[...document.querySelectorAll('[data-act=rec-dow]')].forEach(b=>{if(/qua|sex/.test(b.innerText))b.click()})});
await click('[data-act=sh-save]');await sleep(400);
s=await st();const tr=s.tasks.filter(t=>t.title==='Treino');
ok('weekly rule respects chosen days',tr.length>=1&&tr.every(t=>{const w=new Date(t.day+'T12:00:00').getDay();return [new Date().getDay(),3,5].includes(w)}));
// help sheet and password
await click('.tab[data-t=revisao]');await sleep(200);
await click('[data-act=help]');await sleep(150);
ok('help guide opens',/Guia do Prumo/.test(await ev(()=>document.querySelector('.sheet').innerText))&&/Pomodoro/.test(await ev(()=>document.querySelector('.sheet').innerText)));
await p.screenshot({path:S+'/e2e/help.png'});
await click('[data-act=sh-close]');await sleep(100);
await click('[data-act=pw-open]');await sleep(150);
const pwMsg=()=>ev(()=>document.querySelector('#pw-msg').innerText);
const pwFill=async(c,a,b2)=>{await ev((c,a,b2)=>{document.querySelector('#pw0').value=c;document.querySelector('#pw1').value=a;document.querySelector('#pw2').value=b2},c,a,b2);await click('[data-act=pw-save]');await sleep(250)};
await pwFill('','uma-senha-bem-longa-1','uma-senha-bem-longa-1');
ok('password change requires current password',/senha atual/.test(await pwMsg()));
await pwFill('senha-atual-certa','curta','curta');
ok('short password rejected (12+)',/pelo menos 12/.test(await pwMsg()));
await pwFill('senha-errada','uma-senha-bem-longa-1','uma-senha-bem-longa-1');
ok('wrong current password blocks change',/não confere/.test(await pwMsg())&&!(await ev(()=>window.__pw)));
await pwFill('senha-atual-certa','uma-senha-bem-longa-1','uma-senha-bem-longa-1');
ok('password sent to auth.updateUser',(await ev(()=>window.__pw))==='uma-senha-bem-longa-1');
ok('leak check sends only 5 hash chars',/\/range\/[0-9A-F]{5}$/.test(await ev(()=>window.__hibp||'')));
ok('other devices signed out after change',(await ev(()=>window.__signout&&window.__signout.scope))==='others');
console.log(res.join('\n'));console.log(errs.length?'ERRORS '+errs:'NO PAGE ERRORS');await b.close()})();
