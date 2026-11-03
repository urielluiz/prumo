const puppeteer=require('puppeteer-core');const url=require('./lib/serve');const S=require('path').resolve(__dirname,'..');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));const res=[];const ok=(n,c)=>res.push((c?'PASS ':'FAIL ')+n);
(async()=>{const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox']});
const p=await b.newPage();await p.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.evaluateOnNewDocument(()=>{try{localStorage.setItem('sb-test-auth-token','{"refresh_token":"x"}')}catch(e){}});
await p.goto(await url('pwa/index.html'),{waitUntil:'domcontentloaded'});await sleep(900);
const ev=(f,...a)=>p.evaluate(f,...a);
await ev(()=>document.querySelector('[data-act=clear-ex]').click());await sleep(150);
// create pauta
await ev(()=>document.querySelector('.tab-add').click());await sleep(150);
await p.type('#f-title','Pauta de posts LinkedIn Agibank');
await ev(()=>document.querySelector('[data-act=sh-est][data-v="240"]').click());
await ev(()=>document.querySelector('[data-act=sh-save]').click());await sleep(200);
const id=await ev(()=>JSON.parse(localStorage.getItem('prumo.v1')).tasks[0].id);
await ev(i=>document.querySelector('[data-act=edit][data-id="'+i+'"]').click(),id);await sleep(200);
await ev(()=>document.querySelector('[data-act=sh-sec][data-v=split]').click());await sleep(100);
ok('sheet has kid form',await ev(()=>!!document.querySelector('[data-act=kid-add]')));
await p.type('[data-in=gname]','Post');
await ev(()=>{const n=document.querySelector('[data-in=gn]');n.value='3';n.dispatchEvent(new Event('input',{bubbles:true}));const e=document.querySelector('[data-in=gest]');e.value='90';e.dispatchEvent(new Event('input',{bubbles:true}))});
await p.screenshot({path:S+'/e2e/grp-sheet.png'});
await ev(()=>document.querySelector('[data-act=kid-add]').click());await sleep(300);
let st=await ev(()=>JSON.parse(localStorage.getItem('prumo.v1')).tasks);
ok('3 kids created',st.filter(t=>t.parent===id).length===3);
ok('kids named Post 1..3',st.filter(t=>t.parent===id).map(t=>t.title).join()==='Post 1,Post 2,Post 3');
ok('parent day null',st.find(t=>t.id===id).day===null);
ok('kids inherit today',st.filter(t=>t.parent===id).every(t=>!!t.day));
await ev(()=>document.querySelector('[data-act=sh-close]').click());await sleep(200);
let view=await ev(()=>document.querySelector('#view').innerText);
ok('Hoje shows kids with tag',(view.match(/Pauta: Pauta de posts/g)||[]).length===3);
ok('Hoje shows pauta card 0/3',view.includes('0/3 entregas'));
await p.screenshot({path:S+'/e2e/grp-hoje.png',fullPage:true});
// move kid 2 to tomorrow
const k2=st.find(t=>t.title==='Post 2').id;
await ev(i=>document.querySelector('[data-act=edit][data-id="'+i+'"]').click(),k2);await sleep(200);
await ev(()=>document.querySelector('[data-act=sh-day]:nth-child(2)').click());await sleep(100);
await ev(()=>document.querySelector('[data-act=sh-save]').click());await sleep(200);
st=await ev(()=>JSON.parse(localStorage.getItem('prumo.v1')).tasks);
const tm=await ev(()=>{const d=new Date();d.setDate(d.getDate()+1);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')});
ok('kid 2 moved to tomorrow',st.find(t=>t.id===k2).day===tm);
// complete all kids with focus time
await ev(()=>{const s=JSON.parse(localStorage.getItem('prumo.v1'));s.tasks.forEach(t=>{if(t.parent){t.focus=4800;t.status='done';t.doneAt=Date.now();}});localStorage.setItem('prumo.v1',JSON.stringify(s))});
await p.reload({waitUntil:'domcontentloaded'});await sleep(900);
await ev(()=>document.querySelector('.tab[data-t=revisao]').click());await sleep(100);
// trigger persist by toggling dash
await ev(()=>document.querySelector('[data-act=rev][data-v=dash]').click());await sleep(200);
const vt=await ev(()=>document.querySelector('#view').innerText);
ok('analytics by type',/Tempo por tipo de entrega/.test(vt)&&/Post · 3/.test(vt)&&/média 1h20/.test(vt));
ok('group not counted as task in estimate sample',/3\s*\n?\s*tarefas/.test(vt)||vt.includes('3 de 5'));
// group auto-complete + delete group w/ undo
await ev(()=>document.querySelector('.tab[data-t=hoje]').click());await sleep(100);
await ev(()=>document.querySelector('[data-act=mit]')&&0);
// make one kid reopened then closed -> persist
const tid=st.find(t=>t.title==='Post 1').id;
await ev(i=>document.querySelector('[data-act=toggle][data-id="'+i+'"]').click(),tid);await sleep(300);
st=await ev(()=>JSON.parse(localStorage.getItem('prumo.v1')).tasks);
ok('group reopens when a kid reopens',st.find(t=>t.id===id).status!=='done');
await ev(i=>document.querySelector('[data-act=toggle][data-id="'+i+'"]').click(),tid);await sleep(300);
st=await ev(()=>JSON.parse(localStorage.getItem('prumo.v1')).tasks);
ok('group done when all kids done',st.find(t=>t.id===id).status==='done');
await ev(i=>document.querySelector('[data-act=toggle][data-id="'+i+'"]').click(),tid);await sleep(200);
await ev(()=>document.querySelector('.tab[data-t=semana]').click());await sleep(150);
await ev(i=>document.querySelector('[data-act=rowdel][data-id="'+i+'"]').click(),id);await sleep(200);
st=await ev(()=>JSON.parse(localStorage.getItem('prumo.v1')).tasks);
ok('delete pauta removes kids',st.length===0);
await ev(()=>document.querySelector('[data-act=toast-act]').click());await sleep(250);
st=await ev(()=>JSON.parse(localStorage.getItem('prumo.v1')).tasks);
ok('undo restores pauta and kids',st.length===4);
console.log(res.join('\n'));console.log(errs.length?'ERRORS '+errs:'NO PAGE ERRORS');await b.close()})();
