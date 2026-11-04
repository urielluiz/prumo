const puppeteer = require('puppeteer-core');
const fs = require('fs');
const url=require('./lib/serve');
const S=require('path').resolve(__dirname,'..');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const res = []; const ok = (n, c) => res.push((c ? 'PASS ' : 'FAIL ') + n);
const errs = [];

async function mk(browser, vp, opts = {}) {
  const page = await browser.newPage();
  await page.setViewport(vp);
  await page.evaluateOnNewDocument((hash, stub) => {
    try { localStorage.setItem('sb-test-auth-token', JSON.stringify({ refresh_token: 'x' })); } catch (e) {}
    if (stub) {
      window.__notes = [];
      const N = function (t, o) { window.__notes.push([t, o && o.body]); this.close = function () {}; };
      N.permission = 'granted'; N.requestPermission = () => Promise.resolve('granted');
      window.Notification = N;
      document.hasFocus = () => false;
    }
  }, null, !!opts.stub);
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/fonts\.g|ERR_|Failed to load resource|manifest/.test(m.text())) errs.push('console: ' + m.text()); });
  await page.goto(await url('pwa/index.html'), { waitUntil: 'domcontentloaded' });
  await sleep(900);
  return page;
}
const click = (page, sel) => page.evaluate(s => { const e = document.querySelector(s); if (!e) throw new Error('missing ' + s); e.click(); }, sel);
const text = (page, sel) => page.evaluate(s => (document.querySelector(s) || {}).innerText || '', sel);
const count = (page, sel) => page.evaluate(s => document.querySelectorAll(s).length, sel);

(async () => {
  const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });

  // ---------- PHONE: estimativas ----------
  let p = await mk(browser, { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await click(p, '.tab-add'); await sleep(150);
  await click(p, '[data-act=sh-sec][data-v=est]'); await sleep(100);
  ok('phone: estimate chips with Outro', (await text(p, '.sheet')).includes('Outro'));
  await p.type('#f-title', 'Pauta de posts do LinkedIn');
  await click(p, '[data-act=sh-est-other]'); await sleep(80);
  await p.type('#f-est', '300');
  await click(p, '[data-act=sh-sec][data-v=more]'); await sleep(100);
  ok('phone: custom estimate keeps value', (await p.evaluate(() => document.querySelector('#f-est').value)) === '300');
  await click(p, '[data-act=sh-fw][data-v=pomodoro]');
  ok('phone: shows pomodoro count', (await text(p, '#pomo-n')).includes('12 pomodoros'));
  await p.screenshot({ path: S + '/e2e/v2-sheet.png' });
  await click(p, '[data-act=sh-save]'); await sleep(150);
  const view = await text(p, '#view');
  ok('phone: task listed with 5h', view.includes('Pauta de posts do LinkedIn'));
  ok('phone: pomodoro progress in row', view.includes('0/12 pomodoros'));
  ok('phone: no horizontal scroll', await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  ok('phone: bottom tabs visible, no brand', await p.evaluate(() => getComputedStyle(document.querySelector('.brand')).display === 'none' && getComputedStyle(document.querySelector('#tabs')).position === 'fixed'));
  await p.close();

  // ---------- DESKTOP ----------
  p = await mk(browser, { width: 1440, height: 900, deviceScaleFactor: 1 }, { stub: true });
  ok('desktop: sidebar layout', await p.evaluate(() => { const t = document.querySelector('#tabs').getBoundingClientRect(); return t.width > 200 && t.height >= innerHeight - 2 && getComputedStyle(document.querySelector('.brand')).display !== 'none'; }));
  ok('desktop: two columns on Hoje', await p.evaluate(() => { const c = document.querySelectorAll('#view .cols > .col'); return c.length === 2 && c[0].getBoundingClientRect().left < c[1].getBoundingClientRect().left && Math.abs(c[0].getBoundingClientRect().top - c[1].getBoundingClientRect().top) < 40; }));
  ok('desktop: no horizontal scroll', await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  await p.screenshot({ path: S + '/e2e/v2-desk-hoje.png' });
  await click(p, '.tab[data-t=semana]'); await sleep(150);
  await p.screenshot({ path: S + '/e2e/v2-desk-semana.png' });
  await click(p, '.tab[data-t=revisao]'); await sleep(150);
  await p.screenshot({ path: S + '/e2e/v2-desk-revisao.png' });
  await click(p, '.tab[data-t=hoje]'); await sleep(100);

  // shortcuts
  await p.keyboard.press('n'); await sleep(150);
  ok('desktop: N opens new task', (await count(p, '.sheet')) === 1);
  await p.screenshot({ path: S + '/e2e/v2-desk-sheet.png' });
  await p.keyboard.press('Escape'); await sleep(100);
  ok('desktop: Esc closes sheet', (await count(p, '.sheet')) === 0);
  await p.keyboard.press('2'); await sleep(100);
  ok('desktop: key 2 goes to Semana', (await text(p, '#view')).includes('Planejar semana'));
  await p.keyboard.press('1'); await sleep(100);

  // start session by a real click (user activation) -> title, PiP attempt
  await p.click('[data-act=start]'); await sleep(1500);
  ok('desktop: focus screen', (await count(p, '#clock')) === 1);
  const title = await p.title();
  ok('desktop: tab title shows time', /^\d\d:\d\d · /.test(title));
  const hasPip = await p.evaluate(() => !!window.documentPictureInPicture);
  res.push('INFO documentPictureInPicture in headless: ' + hasPip);
  await p.screenshot({ path: S + '/e2e/v2-desk-foco.png' });
  await p.keyboard.press('Space'); await sleep(900);
  ok('desktop: Space pauses', (await count(p, '[data-act=resume]')) >= 1 && (await p.title()).startsWith('Pausado'));
  await p.keyboard.press('Space'); await sleep(200);
  ok('desktop: Space resumes', (await count(p, '[data-act=pause]')) >= 1);

  // force the timer to expire, reload so boot reads it, worker tick should end it and notify
  await p.evaluate(() => { const k = 'prumo.v1', s = JSON.parse(localStorage.getItem(k)); s.session.endsAt = Date.now() - 2000; localStorage.setItem(k, JSON.stringify(s)); });
  await p.reload({ waitUntil: 'domcontentloaded' }); await sleep(1800);
  const notes = await p.evaluate(() => window.__notes);
  ok('desktop: notification fired when timer ended', notes.length === 1 && /Prumo/.test(notes[0][0]));
  ok('desktop: end card visible', (await count(p, '.endcard')) === 1);
  const t2 = await p.title(); ok('desktop: title flashes alert', /Tempo!|00:00/.test(t2));
  await p.screenshot({ path: S + '/e2e/v2-desk-fim.png' });
  await p.close();

  console.log(res.join('\n')); console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO PAGE ERRORS');
  await browser.close();
})().catch(e => { console.error('RUN FAILED', e); process.exit(1); });
