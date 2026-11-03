// Servidor estático de src/ para os testes. Por file:// o Chrome headless às vezes
// perde o localStorage num reload quando a máquina está carregada; por http não.
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.css': 'text/css' };
let base = null;
function start() {
  if (base) return base;
  base = new Promise(res => {
    const srv = http.createServer((q, r) => {
      const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]));
      if (!f.startsWith(ROOT + path.sep)) { r.writeHead(403); return r.end(); }
      fs.readFile(f, (e, d) => {
        if (e) { r.writeHead(404); return r.end(); }
        r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' });
        r.end(d);
      });
    });
    srv.listen(0, '127.0.0.1', () => { srv.unref(); res('http://127.0.0.1:' + srv.address().port + '/'); });
  });
  return base;
}
// url('pwa/index.html') -> 'http://127.0.0.1:<porta>/pwa/index.html'
module.exports = async rel => (await start()) + rel;
