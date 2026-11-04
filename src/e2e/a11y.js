// Acessibilidade: axe-core (WCAG 2.2 AA + boas práticas), alvos de toque, foco das folhas, rótulos, aviso e texto grande.
const puppeteer=require('puppeteer-core');const url=require('./lib/serve');const fs=require('fs');const FAKE=require('./lib/fakesb');
const S=require('path').resolve(__dirname,'..');
const AXE=fs.readFileSync(require.resolve('axe-core/axe.min.js'),'utf8');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));const res=[];const ok=(n,c)=>res.push((c?'PASS ':'FAIL ')+n);
let html=fs.readFileSync(S+'/pwa/index.html','utf8');
html=html.replace(/<script>window\.PRUMO_SB=.*?<\/script>\n?/,'').replace('<script src="supabase.js"></script>\n','');
fs.writeFileSync(S+'/e2e/a11ytest.html',html);
const pad=n=>String(n).padStart(2,'0');const iso=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const plus=n=>{const d=new Date();d.setDate(d.getDate()+n);return iso(d)};
const B={status:'todo',fw:null,urg:false,imp:true,dod:[],mit:false,slips:0,focus:0,pomos:0,created:1,ex:false};
const T=o=>Object.assign({},B,o);
const tasks=[T({id:'a',title:'Revisar as peças da campanha',ctx:'trabalho',est:60,day:plus(0),mit:true}),
  T({id:'b',title:'Fechar escopo do site',ctx:'freelas',est:120,day:plus(-1),end:plus(3),dod:[{t:'Briefing',d:true},{t:'Wireframe',d:false}],due:plus(2)}),
  T({id:'c',title:'Responder pendências do time',ctx:'trabalho',est:30,day:plus(0)}),
  T({id:'e',title:'Enviar nota fiscal',ctx:'freelas',est:15,day:plus(-2),slips:1}),
  T({id:'f',title:'Treino',ctx:'pessoal',est:60,day:plus(0),status:'done',doneAt:Date.now()-3600e3,focus:3000}),
  T({id:'g',title:'Moodboard do cliente',ctx:'freelas',est:90,day:plus(1)}),
  T({id:'j',title:'Organizar portfólio',ctx:'pessoal',est:120,day:null})];

(async()=>{const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox']});
const errs=[];
const open=async(scheme,fontPx)=>{const p=await b.newPage();await p.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
  await p.emulateMediaFeatures([{name:'prefers-color-scheme',value:scheme}]);await p.setBypassCSP(true);p.on('pageerror',e=>errs.push(e.message));
  await p.evaluateOnNewDocument(FAKE);
  await p.evaluateOnNewDocument((tasks,fontPx)=>{if(fontPx)document.addEventListener('DOMContentLoaded',()=>{document.documentElement.style.fontSize=fontPx+'px'});
    if(sessionStorage.getItem('s'))return;sessionStorage.setItem('s','1');localStorage.setItem('sb-test-auth-token',JSON.stringify({refresh_token:'x',user:{id:'u1',email:'dono@example.com'}}));
    localStorage.setItem('prumo.v1',JSON.stringify({v:1,upd:1,owner:'u1',seeded:true,prof:{name:'Uriel'},tasks,rec:{},cap:[120,300,300,300,300,300,120],ctx:{},retro:{},blockers:{},log:{},session:null,u:{},dirty:{},del:{},synced:true}))},tasks,fontPx||0);
  await p.goto(await url('e2e/a11ytest.html'),{waitUntil:'domcontentloaded'});await sleep(1200);return p};
const go=(p,sel,ms=220)=>p.evaluate(s=>{const e=document.querySelector(s);if(e)e.click();return !!e},sel).then(r=>sleep(ms).then(()=>r));
const axe=async p=>{
  // mede com a tela parada: animações de entrada deixam as cores lavadas no meio do caminho
  await p.evaluate(()=>Promise.race([Promise.all(document.getAnimations().map(x=>x.finished.catch(()=>{}))),new Promise(r=>setTimeout(r,3000))]));
  await p.evaluate(AXE);return p.evaluate(async()=>(await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa','best-practice']},resultTypes:['violations']})).violations.map(v=>v.id+'('+v.nodes.length+'): '+v.nodes.slice(0,3).map(n=>n.target.join(' ')+' ['+((n.any[0]&&n.any[0].message)||'').slice(0,160)+'] '+n.html.slice(0,120)).join(' ; ')))};
const small=p=>p.evaluate(()=>[...document.querySelectorAll('button,a,input,textarea,select,label.chip')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&!e.closest('[hidden],[inert],.sw')&&getComputedStyle(e).visibility!=='hidden'}).filter(e=>{const r=e.getBoundingClientRect();return Math.min(r.width,r.height)<44}).map(e=>(e.dataset.act||e.id||e.className)+':'+Math.round(e.getBoundingClientRect().width)+'x'+Math.round(e.getBoundingClientRect().height)));
const screens=[['Hoje',null],['menu ⋯','[data-act=rowmenu][data-id=c]'],['atrasadas','[data-act=late]'],['fechar o dia','[data-act=close]'],['obra','.drings'],['nova tarefa','.tab-add'],['Semana','.tab[data-t=semana]'],['planejar','[data-act=plan]'],['buscar','[data-act=busca]'],['Foco','.tab[data-t=foco]'],['Revisão','.tab[data-t=revisao]'],['Tendências','[data-act=rev][data-v=dash]'],['Perfil','.tab[data-t=hoje]']];
for(const scheme of ['light','dark']){
  const p=await open(scheme);
  for(const [name,sel] of screens){
    if(sel)await go(p,sel);
    if(name==='Perfil')await go(p,'[data-act=perfil]');
    if(name==='nova tarefa'){await go(p,'[data-act=sh-sec][data-v=when]');}
    const v=await axe(p);ok('axe '+scheme+' '+name+': no violations'+(v.length?' '+v.join(','):''),v.length===0);
    if(scheme==='light'){const s=await small(p);ok('targets '+name+': all at least 44px'+(s.length?' '+s.slice(0,4).join(' '):''),s.length===0)}
    if(sel&&/rowmenu|late|tab-add|close|drings|plan|busca/.test(sel)){await p.keyboard.press('Escape');await sleep(150)}
  }
  if(scheme==='light'){
    await p.evaluate(()=>window.prumoLogout('local'));await sleep(1500);
    const v=await axe(p);ok('axe light entrada: no violations'+(v.length?' '+v.join(','):''),v.length===0);
    const s=await small(p);ok('targets entrada: all at least 44px'+(s.length?' '+s.join(' '):''),s.length===0);
  }
  await p.close();
}

// foco, rótulos e aviso
{const p=await open('light');
 const lbl=await p.evaluate(()=>[...document.querySelectorAll('[data-tid=c] button')].map(b=>b.getAttribute('aria-label')).filter(Boolean));
 ok('card buttons name the task',lbl.length>=3&&lbl.every(l=>/Responder pendências do time/.test(l)));
 await p.focus('[data-act=rowmenu][data-id=c]');await p.keyboard.press('Enter');await sleep(250);
 ok('sheet has an accessible name',await p.evaluate(()=>{const s=document.querySelector('.sheet');const t=s&&document.getElementById(s.getAttribute('aria-labelledby'));return !!t&&/Responder pendências/.test(t.textContent)}));
 ok('focus moves into the sheet',await p.evaluate(()=>!!document.activeElement.closest('.sheet')));
 ok('background is inert while the sheet is open',await p.evaluate(()=>document.querySelector('.wrap').hasAttribute('inert')&&document.querySelector('#tabs').hasAttribute('inert')));
 await p.keyboard.press('Escape');await sleep(200);
 ok('focus returns to the ⋯ button on close',await p.evaluate(()=>document.activeElement&&document.activeElement.matches('[data-act=rowmenu][data-id=c]')));
 ok('background usable again after close',await p.evaluate(()=>!document.querySelector('.wrap').hasAttribute('inert')));
 await go(p,'.tab-add');await go(p,'[data-act=sh-sec][data-v=est]');
 await p.focus('[data-act=sh-est][data-v="60"]');await p.keyboard.press('Enter');await sleep(200);
 ok('focus stays on the chip after the sheet redraws',await p.evaluate(()=>document.activeElement&&document.activeElement.matches('[data-act=sh-est][data-v="60"]')));
 await p.keyboard.press('Escape');await sleep(150);
 await go(p,'[data-act=rowmenu][data-id=c]');await go(p,'.sheet [data-act=mv][data-v]');
 await p.evaluate(d=>{const b=document.querySelector('.sheet [data-act=mv][data-d="'+d+'"]');b.click()},plus(1));await sleep(200);
 await p.focus('[data-act=toast-act]');await sleep(11000);
 ok('undo toast stays while focused',await p.evaluate(()=>!document.querySelector('#toast').hidden));
 await p.evaluate(()=>document.activeElement.blur());await sleep(10500);
 ok('undo toast hides after leaving',await p.evaluate(()=>document.querySelector('#toast').hidden));
 await p.close()}

// texto grande (tamanhos de acessibilidade do iPhone)
for(const fs of [23,30]){const p=await open('light',fs);
  const over=async()=>p.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
  let o=await over();await go(p,'.tab[data-t=semana]');o=Math.max(o,await over());
  await go(p,'.tab-add');await go(p,'[data-act=sh-sec][data-v=when]');o=Math.max(o,await over());
  const sh=await p.evaluate(()=>{const s=document.querySelector('.sheet');return s.scrollWidth-s.clientWidth});
  ok('text at '+fs+'px: nothing wider than the screen',o<=0&&sh<=0);
  await p.close()}

console.log(res.join('\n'));console.log(errs.length?'ERRORS '+errs:'NO PAGE ERRORS');await b.close()})();
