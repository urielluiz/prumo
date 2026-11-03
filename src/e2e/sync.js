const puppeteer = require('puppeteer-core');
const fs = require('fs');
const url=require('./lib/serve');
const S=require('path').resolve(__dirname,'..');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const res = []; const ok = (n, c) => res.push((c ? 'PASS ' : 'FAIL ') + n);
const errs = [];

// test page = real build without the config/lib tags (the fake client is injected instead)
let html = fs.readFileSync(S + '/pwa/index.html', 'utf8');
html = html.replace(/<script>window\.PRUMO_SB=.*?<\/script>\n?/, '').replace('<script src="supabase.js"></script>\n', '');
fs.writeFileSync(S + '/e2e/sbtest.html', html);

const FAKE = `
window.__off=false; window.__rt=null; window.__cbs=[];
function builder(){
  const b={};
  b.select=()=>b; b.order=()=>b; b.range=()=>b;
  b.upsert=rows=>{b._rows=rows;return b};
  b.then=function(res,rej){
    return (async()=>{
      if(window.__off) return {data:null,error:{message:'Failed to fetch',name:'AuthRetryableFetchError'}};
      if(b._rows){await window.__srv('upsert',JSON.stringify(b._rows));return {error:null}}
      return {data:JSON.parse(await window.__srv('select','')),error:null};
    })().then(res,rej);
  };
  return b;
}
window.supabase={createClient(){return {
  from(){return builder()},
  channel(){const c={on(a,b,cb){window.__rt=cb;return c},subscribe(){return c}};return c},
  removeChannel(){},
  auth:{
    onAuthStateChange(cb){window.__cbs.push(cb);setTimeout(()=>cb('INITIAL_SESSION',{user:{id:'u1'}}),10);return {data:{subscription:{unsubscribe(){}}}}},
    signInWithPassword(){return Promise.resolve({error:null})},
    signOut(){window.__cbs.forEach(c=>c('SIGNED_OUT',null));return Promise.resolve({error:null})},
    getSession(){return Promise.resolve({data:{session:{user:{id:'u1'}}},error:null})}
  }
}}};
window.PRUMO_SB={url:'x',key:'y'};
try{localStorage.setItem('sb-test-auth-token',JSON.stringify({refresh_token:'x'}))}catch(e){}
`;

const server = new Map();
const srvTasks = () => [...server.values()].filter(r => r.kind === 'task' && !r.deleted).map(r => r.data.title).sort();
const srv = (op, json) => {
  if (op === 'select') return JSON.stringify([...server.values()]);
  const rows = JSON.parse(json);
  rows.forEach(r => { const k = r.kind + '/' + r.id, old = server.get(k); if (old && r.updated_at < old.updated_at) return; server.set(k, r); });
  return '1';
};

(async () => {
  const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
  async function device() {
    const ctx = browser.createBrowserContext ? await browser.createBrowserContext() : await browser.createIncognitoBrowserContext();
    const page = await ctx.newPage();
    await page.setViewport({ width: 1200, height: 900 });
    page.on('pageerror', e => errs.push('pageerror: ' + e.message));
    await page.exposeFunction('__srv', srv);
    await page.evaluateOnNewDocument(FAKE);
    await page.goto(await url('e2e/sbtest.html'), { waitUntil: 'domcontentloaded' });
    await sleep(2200);
    return page;
  }
  const local = p => p.evaluate(() => JSON.parse(localStorage.getItem('prumo.v1')));
  const titles = async p => (await local(p)).tasks.map(t => t.title).sort();
  const ids = async p => (await local(p)).tasks.map(t => t.id).sort();
  const pull = async p => { await p.evaluate(() => window.__rt && window.__rt()); await sleep(1300); };
  const idOf = async (p, title) => (await local(p)).tasks.find(t => t.title === title).id;
  const create = async (p, title) => {
    await p.evaluate(() => document.querySelector('.tab-add').click()); await sleep(150);
    await p.type('#f-title', title);
    await p.evaluate(() => document.querySelector('[data-act=sh-save]').click()); await sleep(1600);
  };
  const rename = async (p, id, title) => {
    await p.evaluate(i => document.querySelector('[data-act=edit][data-id="' + i + '"]').click(), id); await sleep(150);
    await p.evaluate(() => document.querySelector('#f-title').select()); await p.type('#f-title', title);
    await p.evaluate(() => document.querySelector('[data-act=sh-save]').click()); await sleep(1600);
  };

  // 1) device A, first login: examples are pushed because the server is empty
  const A = await device();
  const aIds = await ids(A);
  ok('A: seeded 11 example tasks', aIds.length === 11);
  ok('A: pushed tasks to server', srvTasks().length === 11);
  ok('A: pushed capacity and context rows', server.has('cap/cap') && server.has('ctx/ctx'));

  // 2) device B, fresh: its own examples are dropped, A's tasks adopted, no duplicates
  const B = await device();
  const bIds = await ids(B);
  ok('B: adopted A tasks (same ids, no duplicates)', JSON.stringify(bIds) === JSON.stringify(aIds));
  ok('B: did not push duplicate examples', srvTasks().length === 11);

  // 3) A creates, B receives
  await create(A, 'Tarefa criada no A');
  ok('A->server: new task stored', srvTasks().includes('Tarefa criada no A'));
  await pull(B);
  ok('A->B: task appears on B', (await titles(B)).includes('Tarefa criada no A'));
  ok('A->B: B screen shows it', (await B.evaluate(() => document.body.innerText)).includes('Tarefa criada no A'));

  // 4) B completes it, A receives
  const tid = await idOf(B, 'Tarefa criada no A');
  await B.evaluate(i => document.querySelector('[data-act=toggle][data-id="' + i + '"]').click(), tid); await sleep(1600);
  await pull(A);
  ok('B->A: completion synced', (await local(A)).tasks.find(t => t.id === tid).status === 'done');

  // 5) A deletes, B receives the deletion
  await A.evaluate(i => document.querySelector('[data-act=edit][data-id="' + i + '"]').click(), tid); await sleep(150);
  await A.evaluate(() => document.querySelector('[data-act=sh-del]').click()); await sleep(100);
  await A.evaluate(() => document.querySelector('[data-act=sh-del]').click()); await sleep(1800);
  ok('A: deletion stored as tombstone', server.get('task/' + tid).deleted === true);
  await pull(B);
  ok('A->B: deletion applied on B', !(await titles(B)).includes('Tarefa criada no A'));
  ok('server: only live tasks counted', srvTasks().length === 11);

  // 6) conflict: A edits offline (older), B edits online (newer) -> B wins on both
  const t1 = await idOf(A, 'Pagar a fatura do cartão');
  await A.evaluate(() => { window.__off = true; });
  await rename(A, t1, 'Fatura editada offline no A');
  ok('A offline: edit kept locally', (await titles(A)).includes('Fatura editada offline no A'));
  ok('A offline: server untouched', srvTasks().includes('Pagar a fatura do cartão') && !srvTasks().includes('Fatura editada offline no A'));
  await pull(B);
  await rename(B, t1, 'Fatura editada no B');
  ok('B online: edit stored', srvTasks().includes('Fatura editada no B'));
  await A.evaluate(() => { window.__off = false; window.dispatchEvent(new Event('online')); }); await sleep(2000);
  ok('conflict: newest edit (B) wins on A', (await titles(A)).includes('Fatura editada no B') && !(await titles(A)).includes('Fatura editada offline no A'));
  ok('conflict: server keeps B edit', srvTasks().includes('Fatura editada no B'));

  // 7) offline create then reconnect
  await A.evaluate(() => { window.__off = true; });
  await create(A, 'Criada offline');
  ok('A offline: task not on server yet', !srvTasks().includes('Criada offline'));
  await A.evaluate(() => { window.__off = false; window.dispatchEvent(new Event('online')); }); await sleep(2000);
  ok('A reconnect: offline task pushed', srvTasks().includes('Criada offline'));
  await pull(B);
  ok('A->B: offline-created task reaches B', (await titles(B)).includes('Criada offline'));

  // 8) capacity change
  await A.evaluate(() => document.querySelector('.tab[data-t=semana]').click()); await sleep(150);
  await A.evaluate(() => document.querySelector('[data-act=plan]').click()); await sleep(150);
  await A.evaluate(() => document.querySelector('[data-act=cap][data-i="1"][data-d="30"]').click()); await sleep(1800);
  const capA = (await local(A)).cap[1];
  await pull(B);
  ok('capacity: change reaches B', (await local(B)).cap[1] === capA && capA === 330);

  // 9) final convergence
  await pull(A); await pull(B);
  const srvLive = [...server.values()].filter(r => r.kind === 'task' && !r.deleted).map(r => r.id).sort();
  ok('convergence: A == B == server', JSON.stringify(await ids(A)) === JSON.stringify(await ids(B)) && JSON.stringify(await ids(A)) === JSON.stringify(srvLive));
  ok('no dirty items left on A and B', Object.keys((await local(A)).dirty).length === 0 && Object.keys((await local(B)).dirty).length === 0);

  console.log(res.join('\n')); console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO PAGE ERRORS');
  await browser.close();
})().catch(e => { console.error('RUN FAILED', e); process.exit(1); });
