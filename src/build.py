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
# ---- login com Supabase (quando houver sb.json): tela de app/auth/ + cliente ----
import json, shutil, hashlib, base64
SBSCRIPTS = ''
GATE = ''
SBJ = os.path.join(D, 'sb.json')
if os.path.exists(SBJ):
    sbcfg = json.load(open(SBJ))
    shutil.copy(os.path.join(D, 'vendor', 'supabase.js'), os.path.join(OUT, 'supabase.js'))
    SBSCRIPTS = '<script>window.PRUMO_SB=' + json.dumps(sbcfg) + ';</script>\n<script src="supabase.js"></script>\n'
    GATE = re.sub(r'^[ \t]*/\* @include (\S+) \*/\n', include, open(os.path.join(APP, 'auth', 'gate.html'), encoding='utf-8').read(), flags=re.M)

page = head + SBSCRIPTS + body + GATE + tail

# Dentro de iframe de outro site (clickjacking): para de carregar antes de qualquer outro script rodar.
FRAMEBUST = "<script>if(window.top!==window.self){window.stop();document.documentElement.innerHTML=''}</script>\n"
page = page.replace('<meta charset="utf-8">\n', '<meta charset="utf-8">\n' + FRAMEBUST, 1)
# ---- CSP: scripts inline só com hash; rede só para o próprio site, o Supabase e a checagem de senha vazada ----
# (GitHub Pages não permite cabeçalhos; frame-ancestors não vale em <meta>, por isso o bloqueio de iframe no tail)
hashes = sorted({"'sha256-" + base64.b64encode(hashlib.sha256(s.encode('utf-8')).digest()).decode() + "'"
                 for s in re.findall(r'<script>(.*?)</script>', page, flags=re.S)})
sbhost = re.sub(r'^https://', '', json.load(open(SBJ))['url']).rstrip('/') if os.path.exists(SBJ) else ''
CSP = '; '.join([
    "default-src 'self'",
    "script-src 'self' " + ' '.join(hashes),
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self'",
    "img-src 'self' data: blob:",
    "connect-src 'self' https://api.pwnedpasswords.com" + (' https://' + sbhost + ' wss://' + sbhost if sbhost else ''),
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
    "frame-src 'none'",
])
page = page.replace('<meta charset="utf-8">\n', '<meta charset="utf-8">\n<meta http-equiv="Content-Security-Policy" content="' + CSP + '">\n<meta name="referrer" content="no-referrer">\n', 1)
open(os.path.join(OUT, 'index.html'), 'w', encoding='utf-8').write(page)

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
  ],
  "shortcuts": [
    {"name": "Nova tarefa", "url": "./?nova=1", "icons": [{"src": "icon-192.png", "sizes": "192x192"}]},
    {"name": "Começar foco", "url": "./?foco=1", "icons": [{"src": "icon-192.png", "sizes": "192x192"}]},
    {"name": "Buscar", "url": "./?buscar=1", "icons": [{"src": "icon-192.png", "sizes": "192x192"}]},
    {"name": "Fechar o dia", "url": "./?fechar=1", "icons": [{"src": "icon-192.png", "sizes": "192x192"}]}
  ]
}
''')

# ---- service worker ----
open(os.path.join(OUT, 'sw.js'), 'w', encoding='utf-8').write('''const V = 'prumo-v9';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png', 'supabase.js', 'fonts/instrument-sans.woff2', 'fonts/bricolage-grotesque.woff2', 'fonts/ibm-plex-mono-500.woff2'];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  const same = u.origin === location.origin;
  if (!same) return;
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
    for (const c of cs) { if ('focus' in c) { if (url.indexOf('retro') >= 0) c.postMessage({ go: 'retro' }); else if (url.indexOf('fechar') >= 0) c.postMessage({ go: 'fechar' }); return c.focus(); } }
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

# ---- fontes servidas pelo próprio site e páginas de privacidade e termos ----
os.makedirs(os.path.join(OUT, 'fonts'), exist_ok=True)
for f in os.listdir(os.path.join(APP, 'fonts')):
    if f.endswith('.woff2'):
        shutil.copy(os.path.join(APP, 'fonts', f), os.path.join(OUT, 'fonts', f))
# responsável e contato ficam em src/legal.json (não versionar dado pessoal sem querer: o arquivo é opcional)
LJ = os.path.join(D, 'legal.json')
legal = json.load(open(LJ, encoding='utf-8')) if os.path.exists(LJ) else {}
for name in ('privacidade', 'termos'):
    txt = open(os.path.join(APP, 'legal', name + '.html'), encoding='utf-8').read()
    for _ in range(2):
        txt = re.sub(r'^[ \t]*/\* @include (\S+) \*/\n', include, txt, flags=re.M)
    txt = txt.replace('{{RESPONSAVEL}}', legal.get('responsavel', 'o mantenedor do Prumo'))
    txt = txt.replace('{{CONTATO}}', legal.get('contato', 'o contato que será publicado aqui antes da abertura do cadastro'))
    open(os.path.join(OUT, name + '.html'), 'w', encoding='utf-8').write(txt)

# ---- zip ----
zp = os.path.join(D, 'prumo-pwa.zip')
with zipfile.ZipFile(zp, 'w', zipfile.ZIP_DEFLATED) as z:
    for f in sorted(os.listdir(OUT)):
        z.write(os.path.join(OUT, f), f)
print('ok', zp, os.path.getsize(zp))
