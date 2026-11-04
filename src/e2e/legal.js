// Privacidade e termos: páginas próprias, acessíveis e sem rede de terceiros; links no login e no Perfil; fontes do próprio site.
const puppeteer=require('puppeteer-core');const url=require('./lib/serve');const fs=require('fs');const FAKE=require('./lib/fakesb');
const S=require('path').resolve(__dirname,'..');
const AXE=fs.readFileSync(require.resolve('axe-core/axe.min.js'),'utf8');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));const res=[];const ok=(n,c)=>res.push((c?'PASS ':'FAIL ')+n);
(async()=>{const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox']});
const errs=[];
for(const name of ['privacidade','termos']){
  const p=await b.newPage();await p.setViewport({width:390,height:844,isMobile:true,hasTouch:true});
  const reqs=[];p.on('request',r=>reqs.push(r.url()));p.on('pageerror',e=>errs.push(e.message));
  const csp=[];p.on('console',m=>{if(/Content Security Policy/i.test(m.text()))csp.push(m.text())});
  await p.goto(await url('pwa/'+name+'.html'),{waitUntil:'networkidle0'});
  const txt=await p.evaluate(()=>document.body.innerText);
  ok(name+': page has its title',name==='privacidade'?/Política de privacidade/.test(txt):/Termos de uso/.test(txt));
  ok(name+': no placeholders left',!/\{\{/.test(txt));
  ok(name+': only same-site requests',reqs.every(u=>u.startsWith(new URL(p.url()).origin)));
  ok(name+': fonts load from the site',await p.evaluate(()=>document.fonts.ready.then(()=>document.fonts.check('16px "Instrument Sans"'))));
  ok(name+': no CSP violations',csp.length===0);
  ok(name+': fits the phone width',await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await p.evaluate(AXE);
  const v=await p.evaluate(async()=>(await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa','best-practice']}})).violations.map(x=>x.id));
  ok(name+': axe no violations '+v.join(','),v.length===0);
  await p.close();
}
// app: fontes do próprio site, links no Perfil
{const p=await b.newPage();await p.setViewport({width:390,height:844,isMobile:true,hasTouch:true});
 const reqs=[];p.on('request',r=>reqs.push(r.url()));p.on('pageerror',e=>errs.push(e.message));
 let html=fs.readFileSync(S+'/pwa/index.html','utf8');
 html=html.replace(/<script>window\.PRUMO_SB=.*?<\/script>\n?/,'').replace('<script src="supabase.js"></script>\n','');
 fs.writeFileSync(S+'/pwa/legaltest.html',html);
 await p.evaluateOnNewDocument(FAKE);
 await p.evaluateOnNewDocument(()=>{if(sessionStorage.getItem('s'))return;sessionStorage.setItem('s','1');localStorage.removeItem('fake-db');localStorage.setItem('sb-test-auth-token',JSON.stringify({refresh_token:'x',user:{id:'u1',email:'dono@example.com'}}));
   localStorage.setItem('prumo.v1',JSON.stringify({v:1,upd:1,owner:'u1',seeded:true,prof:{},tasks:[],rec:{},cap:[0,300,300,300,300,300,120],ctx:{},retro:{},blockers:{},log:{},days:{},g:{},session:null,u:{},dirty:{},del:{},synced:true}))});
 await p.goto(await url('pwa/legaltest.html'),{waitUntil:'networkidle0'});await sleep(800);
 ok('app makes no request to Google Fonts',!reqs.some(u=>/fonts\.(googleapis|gstatic)\.com/.test(u)));
 ok('app fonts load from the site',await p.evaluate(()=>document.fonts.ready.then(()=>document.fonts.check('800 16px "Bricolage Grotesque"')&&document.fonts.check('16px "Instrument Sans"'))));
 await p.evaluate(()=>document.querySelector('[data-act=perfil]').click());await sleep(250);
 ok('Perfil links privacy and terms',await p.evaluate(()=>!!document.querySelector('#view a[href="privacidade.html"]')&&!!document.querySelector('#view a[href="termos.html"]')));
 await p.evaluate(()=>window.prumoLogout('local'));await sleep(1500);
 ok('login screen links privacy and terms',await p.evaluate(()=>!!document.querySelector('#gate a[href="privacidade.html"]')&&!!document.querySelector('#gate a[href="termos.html"]')));
 await p.evaluate(()=>document.querySelector('#gate [data-go=up]').click());await sleep(200);
 ok('signup says you agree to the terms',await p.evaluate(()=>/você concorda com os Termos de uso/.test(document.querySelector('#gate').innerText)));
 await p.close();fs.unlinkSync(S+'/pwa/legaltest.html')}
console.log(res.join('\n'));console.log(errs.length?'ERRORS '+errs:'NO PAGE ERRORS');await b.close()})();
