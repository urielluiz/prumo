const puppeteer=require('puppeteer-core');const S=require('path').resolve(__dirname,'..');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox']});
const errs=[];
async function mk(vp){const p=await b.newPage();await p.setViewport(vp);p.on('pageerror',e=>errs.push(e.message));
 await p.evaluateOnNewDocument(()=>{try{localStorage.setItem('sb-test-auth-token','{"refresh_token":"x"}')}catch(e){}});
 await p.goto('file://'+S+'/pwa/index.html',{waitUntil:'domcontentloaded'});await sleep(900);return p}
let p=await mk({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
// seed history
await p.evaluate(()=>{const s=JSON.parse(localStorage.getItem('prumo.v1'));const iso=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
 s.tasks=[];s.log={};const ctx=['trabalho','freelas','pessoal'];
 for(let i=0;i<60;i++){const d=new Date();d.setDate(d.getDate()-Math.floor(Math.random()*150));const est=[15,30,60,120,240][i%5];const real=Math.round(est*(0.55+Math.random()*0.35));
  s.tasks.push({id:'h'+i,title:'Tarefa '+i,ctx:ctx[i%3],est,est0:est,day:iso(d),status:'done',doneAt:d.getTime(),focus:i%6?real*60:0,fw:['pomodoro','timebox','cinco','dois'][i%4],slips:i%7?0:2,pomos:0,imp:true,urg:false,dod:[],created:d.getTime()});
  s.log[iso(d)]=(s.log[iso(d)]||0)+real*60}
 localStorage.setItem('prumo.v1',JSON.stringify(s))});
await p.reload({waitUntil:'domcontentloaded'});await sleep(900);
await p.evaluate(()=>document.querySelector('.tab[data-t=revisao]').click());await sleep(150);
await p.evaluate(()=>document.querySelector('[data-act=rev][data-v=dash]').click());await sleep(200);
console.log((await p.evaluate(()=>document.querySelector('#view').innerText)).slice(0,700));
await p.screenshot({path:S+'/e2e/dash-week.png',fullPage:true});
await p.evaluate(()=>document.querySelector('[data-act=drange][data-v=month]').click());await sleep(200);
await p.screenshot({path:S+'/e2e/dash-month.png',fullPage:true});
console.log('hscroll ok:',await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
// edit real time
await p.evaluate(()=>document.querySelector('.tab[data-t=hoje]').click());await sleep(100);
await p.close();
p=await mk({width:1440,height:900,deviceScaleFactor:1});
await p.evaluate(()=>{const s=JSON.parse(localStorage.getItem('prumo.v1'));localStorage.setItem('prumo.v1',JSON.stringify(s))});
console.log(errs.length?'ERRORS '+errs:'NO PAGE ERRORS');await b.close()})();
