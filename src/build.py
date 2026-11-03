import os, re, zipfile
from PIL import Image, ImageDraw

D = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(D, 'pwa')
os.makedirs(OUT, exist_ok=True)

# ---- monta o app: shell.html + modulos (linhas "/* @include caminho */", relativo a app/) ----
APP = os.path.join(D, 'app')
def include(m):
    return open(os.path.join(APP, m.group(1)), encoding='utf-8').read()
app = re.sub(r'^[ \t]*/\* @include (\S+) \*/\n', include, open(os.path.join(APP, 'shell.html'), encoding='utf-8').read(), flags=re.M)
import datetime
app = app.replace('__BUILD__', (datetime.datetime.utcnow() - datetime.timedelta(hours=3)).strftime('%d/%m %H:%M'))

# ---- standalone index.html (head com manifest e tags do iOS) ----
body = re.sub(r'<meta name="claude:viewport-fit-sides"[^>]*>\s*', '', app, count=1)
body = re.sub(r'<title>.*?</title>\s*', '', body, count=1, flags=re.S)

head = '''<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Prumo</title>
<meta name="theme-color" content="#EEF0F4" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0D0F17" media="(prefers-color-scheme: dark)">
<meta name="robots" content="noindex,nofollow">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Prumo">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<link rel="manifest" href="manifest.webmanifest">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<link rel="icon" type="image/png" href="icon-192.png">
<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px);color-scheme:light}body{margin:0;font:14px system-ui}[hidden]{display:none!important}img{max-width:100%}</style>
</head>
<body>
'''
tail = '''
<script>if('serviceWorker' in navigator&&location.protocol.indexOf('http')===0){addEventListener('load',function(){navigator.serviceWorker.register('sw.js').catch(function(){})})}</script>
</body>
</html>
'''
# ---- tela de senha (so na versao hospedada) ----
import json, secrets, hashlib
AUTH = os.path.join(D, 'auth.json')
ITER = 210000
if not os.path.exists(AUTH):
    alpha = 'abcdefghjkmnpqrstuvwxyz23456789'
    pw = '-'.join(''.join(secrets.choice(alpha) for _ in range(4)) for _ in range(4))
    salt = secrets.token_bytes(16)
    dk = hashlib.pbkdf2_hmac('sha256', pw.encode(), salt, ITER, 32)
    json.dump({'salt': salt.hex(), 'hash': dk.hex(), 'iter': ITER}, open(AUTH, 'w'))
    print('SENHA NOVA (mostrar uma vez):', pw)
A = json.load(open(AUTH))

GATE = '''
<style>
#gate{position:fixed;inset:0;z-index:200;background:var(--bg);color:var(--ink);display:grid;place-items:center;padding:24px max(16px,env(safe-area-inset-right,0px)) 24px max(16px,env(safe-area-inset-left,0px));font-family:var(--body)}
#gate[hidden]{display:none!important}
#gate form{width:100%;max-width:380px;display:grid;gap:14px}
#gate .g-mark{width:44px;height:44px}
#gate h1{font:800 36px/1.02 var(--display);letter-spacing:-.025em;margin:0}
#gate p{margin:0;color:var(--muted);font-size:15px}
#gate .g-err{color:var(--bad);min-height:20px;font-size:14px}
#gate .g-u{position:absolute;width:1px;height:1px;opacity:0;pointer-events:none}
</style>
<div id="gate" role="dialog" aria-modal="true" aria-labelledby="g-t">
  <form id="g-f" autocomplete="on">
    <svg class="g-mark" viewBox="0 0 44 44" aria-hidden="true"><circle cx="22" cy="6" r="2.2" fill="currentColor"/><path d="M22 6v20" stroke="currentColor" stroke-width="2"/><path d="M22 24l7 9-7 11-7-11z" fill="var(--accent)"/></svg>
    <h1 id="g-t">Prumo</h1>
    <p>Acesso restrito. Digite a senha para entrar.</p>
    <input class="g-u" type="text" name="username" value="prumo" autocomplete="username" tabindex="-1" aria-hidden="true">
    <div><label class="lab" for="g-pw">Senha</label><input id="g-pw" class="inp" type="password" name="password" autocomplete="current-password" autocapitalize="none" autocorrect="off" spellcheck="false" enterkeyhint="go" required></div>
    <div class="g-err" id="g-e" role="alert"></div>
    <button class="btn btn-p btn-full" id="g-b" type="submit">Entrar</button>
  </form>
</div>
<script>
(function(){
var SALT="%SALT%",HASH="%HASH%",ITER=%ITER%,KEY="prumo.k",DAYS=30;
var gate=document.getElementById('gate'),form=document.getElementById('g-f'),pw=document.getElementById('g-pw'),err=document.getElementById('g-e'),btn=document.getElementById('g-b');
var LOCKABLE=['.wrap','#tabs','#sheet','#toast'];
function setInert(v){LOCKABLE.forEach(function(s){var e=document.querySelector(s);if(e){if(v)e.setAttribute('inert','');else e.removeAttribute('inert')}})}
function saved(){try{var r=JSON.parse(localStorage.getItem(KEY)||'null');return !!(r&&r.h===HASH&&Date.now()-r.t<DAYS*864e5)}catch(e){return false}}
function unlock(){gate.hidden=true;setInert(false);pw.value='';try{var a=document.querySelector('#view button');}catch(e){}}
function lock(){try{localStorage.removeItem(KEY)}catch(e){}gate.hidden=false;setInert(true);setTimeout(function(){pw.focus()},50)}
window.prumoLock=lock;
function hex(b){return Array.prototype.map.call(new Uint8Array(b),function(x){return x.toString(16).padStart(2,'0')}).join('')}
function bytes(h){var o=new Uint8Array(h.length/2);for(var i=0;i<o.length;i++)o[i]=parseInt(h.substr(i*2,2),16);return o}
async function derive(s){
  var k=await crypto.subtle.importKey('raw',new TextEncoder().encode(s),'PBKDF2',false,['deriveBits']);
  return hex(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:bytes(SALT),iterations:ITER},k,256));
}
var fails=0,until=0;
form.addEventListener('submit',async function(e){
  e.preventDefault();
  var wait=until-Date.now();
  if(wait>0){err.textContent='Aguarde '+Math.ceil(wait/1000)+'s para tentar de novo.';return}
  btn.disabled=true;err.textContent='';
  try{
    var h=await derive(pw.value.trim().toLowerCase());
    if(h===HASH){fails=0;try{localStorage.setItem(KEY,JSON.stringify({h:HASH,t:Date.now()}))}catch(x){}unlock()}
    else{fails++;until=Date.now()+Math.min(30,fails*3)*1000;err.textContent='Senha incorreta.';pw.select()}
  }catch(x){err.textContent='Este navegador não consegue verificar a senha. Abra o endereço https no Safari.'}
  btn.disabled=false;
});
if(saved()){unlock()}else{setInert(true);setTimeout(function(){pw.focus()},50)}
})();
</script>
'''.replace('%SALT%', A['salt']).replace('%HASH%', A['hash']).replace('%ITER%', str(A['iter']))

# ---- login real com Supabase (quando houver sb.json) ----
import shutil
SBSCRIPTS = ''
SBJ = os.path.join(D, 'sb.json')
if os.path.exists(SBJ):
    sbcfg = json.load(open(SBJ))
    shutil.copy(os.path.join(D, 'vendor', 'supabase.js'), os.path.join(OUT, 'supabase.js'))
    SBSCRIPTS = '<script>window.PRUMO_SB=' + json.dumps(sbcfg) + ';</script>\n<script src="supabase.js"></script>\n'
    GATE = r'''
<style>
#gate{position:fixed;inset:0;z-index:200;background:var(--bg);color:var(--ink);display:grid;place-items:center;padding:24px max(16px,env(safe-area-inset-right,0px)) 24px max(16px,env(safe-area-inset-left,0px));font-family:var(--body)}
#gate[hidden]{display:none!important}
#gate form{width:100%;max-width:380px;display:grid;gap:14px}
#gate .g-mark{width:44px;height:44px}
#gate h1{font:800 36px/1.02 var(--display);letter-spacing:-.025em;margin:0}
#gate p{margin:0;color:var(--muted);font-size:15px}
#gate .g-err{color:var(--bad);min-height:20px;font-size:14px}
</style>
<div id="gate" role="dialog" aria-modal="true" aria-labelledby="g-t" hidden>
  <form id="g-f" autocomplete="on" novalidate>
    <svg class="g-mark" viewBox="0 0 44 44" aria-hidden="true"><circle cx="22" cy="6" r="2.2" fill="currentColor"/><path d="M22 6v20" stroke="currentColor" stroke-width="2"/><path d="M22 24l7 9-7 11-7-11z" fill="var(--accent)"/></svg>
    <h1 id="g-t">Prumo</h1>
    <p>Entre com a sua conta para ver e sincronizar suas tarefas.</p>
    <div><label class="lab" for="g-em">E-mail</label><input id="g-em" class="inp" type="email" name="username" autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false" inputmode="email" required></div>
    <div><label class="lab" for="g-pw">Senha</label><input id="g-pw" class="inp" type="password" name="password" autocomplete="current-password" required></div>
    <div class="g-err" id="g-e" role="alert"></div>
    <button class="btn btn-p btn-full" id="g-b" type="submit">Entrar</button>
  </form>
</div>
<script>
(function(){
var gate=document.getElementById('gate'),form=document.getElementById('g-f'),em=document.getElementById('g-em'),pw=document.getElementById('g-pw'),err=document.getElementById('g-e'),btn=document.getElementById('g-b');
var LOCKABLE=['.wrap','#tabs','#sheet','#toast'];
function setInert(v){LOCKABLE.forEach(function(s){var e=document.querySelector(s);if(e){if(v)e.setAttribute('inert','');else e.removeAttribute('inert')}})}
function stored(){try{for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);if(/^sb-.*-auth-token$/.test(k)){var v=JSON.parse(localStorage.getItem(k));if(v&&v.refresh_token)return true}}}catch(e){}return false}
function unlock(){gate.hidden=true;setInert(false);pw.value=''}
function lock(){gate.hidden=false;setInert(true);err.textContent='';setTimeout(function(){em.focus()},50)}
window.prumoLock=async function(){try{await window.prumoSB.auth.signOut()}catch(e){}lock()};
var sb=window.prumoSB;
if(sb){
  sb.auth.onAuthStateChange(function(ev){if(ev==='SIGNED_OUT')lock();else if(ev==='SIGNED_IN')unlock()});
}
form.addEventListener('submit',async function(e){
  e.preventDefault();
  if(!window.prumoSB){err.textContent='Não consegui carregar o login. Recarregue a página.';return}
  var mail=em.value.trim(),pass=pw.value;
  if(!mail||!pass){err.textContent='Informe e-mail e senha.';return}
  btn.disabled=true;err.textContent='';
  try{
    var r=await window.prumoSB.auth.signInWithPassword({email:mail,password:pass});
    if(r.error){
      var m=(r.error.message||'');
      err.textContent=/invalid login/i.test(m)?'E-mail ou senha incorretos.':(/not confirmed/i.test(m)?'Confirme o e-mail da conta antes de entrar.':(/fetch|network|retryable/i.test(m+r.error.name)?'Sem conexão. Tente de novo.':'Não consegui entrar. Tente de novo.'));
    }else unlock();
  }catch(x){err.textContent='Sem conexão. Tente de novo.'}
  btn.disabled=false;
});
if(stored()){unlock()}else{lock()}
})();
</script>
'''

open(os.path.join(OUT, 'index.html'), 'w', encoding='utf-8').write(head + SBSCRIPTS + body + GATE + tail)

# ---- manifest ----
open(os.path.join(OUT, 'manifest.webmanifest'), 'w', encoding='utf-8').write('''{
  "name": "Prumo",
  "short_name": "Prumo",
  "description": "Organização semanal com frameworks ágeis por tarefa.",
  "lang": "pt-BR",
  "start_url": "./",
  "scope": "./",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#EEF0F4",
  "theme_color": "#12141F",
  "icons": [
    {"src": "icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any"},
    {"src": "icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any"},
    {"src": "icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"}
  ]
}
''')

# ---- service worker ----
open(os.path.join(OUT, 'sw.js'), 'w', encoding='utf-8').write('''const V = 'prumo-v6';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png', 'supabase.js'];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  const same = u.origin === location.origin;
  const font = u.hostname === 'fonts.googleapis.com' || u.hostname === 'fonts.gstatic.com';
  if (!same && !font) return;
  if (r.mode === 'navigate' || (same && u.pathname.endsWith('index.html'))) {
    e.respondWith(fetch(r).then(res => { const cp = res.clone(); caches.open(V).then(c => c.put('index.html', cp)); return res; }).catch(() => caches.match('index.html')));
    return;
  }
  e.respondWith(caches.match(r).then(hit => hit || fetch(r).then(res => { const cp = res.clone(); caches.open(V).then(c => c.put(r, cp)); return res; }).catch(() => hit)));
});
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (x) { d = { body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || 'Prumo', { body: d.body || '', tag: d.tag || 'prumo-timer', renotify: true, icon: 'icon-192.png', badge: 'icon-192.png', data: { url: d.url || './' } }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
    const url = (e.notification.data && e.notification.data.url) || './';
    for (const c of cs) { if ('focus' in c) { if (url.indexOf('retro') >= 0) c.postMessage({ go: 'retro' }); return c.focus(); } }
    return self.clients.openWindow(url);
  }));
});
''')

# ---- icones: fio de prumo (linha com peso) ----
def icon(size, path):
    k = 4
    s = size * k
    im = Image.new('RGB', (s, s), '#12141F')
    d = ImageDraw.Draw(im)
    cx = s / 2
    # prego no topo
    r = s * 0.028
    d.ellipse([cx - r, s * 0.15 - r, cx + r, s * 0.15 + r], fill='#F4F5F9')
    # fio
    w = max(2, int(s * 0.016))
    d.rectangle([cx - w / 2, s * 0.15, cx + w / 2, s * 0.56], fill='#F4F5F9')
    # peso (losango)
    d.polygon([(cx, s * 0.54), (cx + s * 0.115, s * 0.68), (cx, s * 0.86), (cx - s * 0.115, s * 0.68)], fill='#FF7A45')
    # brilho do peso
    d.polygon([(cx, s * 0.54), (cx + s * 0.115, s * 0.68), (cx, s * 0.68)], fill='#FF9B72')
    im = im.resize((size, size), Image.LANCZOS)
    im.save(os.path.join(OUT, path))

icon(512, 'icon-512.png')
icon(192, 'icon-192.png')
icon(180, 'apple-touch-icon.png')

open(os.path.join(OUT, 'LEIA-ME.txt'), 'w', encoding='utf-8').write('''PRUMO - como instalar no iPhone

1. Publique esta pasta em qualquer hospedagem estática com HTTPS
   (Netlify Drop, GitHub Pages, Vercel, Cloudflare Pages).
   Basta arrastar os arquivos. Não há build nem servidor.
2. No iPhone, abra o endereço no Safari.
3. Toque em Compartilhar e depois em "Adicionar à Tela de Início".
4. Abra pelo ícone. O app roda em tela cheia e funciona offline.

Entre com seu e-mail e senha: as tarefas sincronizam entre iPhone e Mac (Supabase). Também funciona offline; use Revisão > Ajustes > Copiar backup de vez em quando.
''')

# ---- zip ----
zp = os.path.join(D, 'prumo-pwa.zip')
with zipfile.ZipFile(zp, 'w', zipfile.ZIP_DEFLATED) as z:
    for f in sorted(os.listdir(OUT)):
        z.write(os.path.join(OUT, f), f)
print('ok', zp, os.path.getsize(zp))
