/* ---------- buscar tarefas ---------- */
function cap1(s){return s.charAt(0).toUpperCase()+s.slice(1)}
function fold(s){return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()}
function searchTasks(q){
  var terms=fold(q).split(/\s+/).filter(Boolean);if(!terms.length)return [];
  var hit=S.tasks.filter(function(t){
    var hay=fold([t.title,cname(t.ctx)].concat((t.dod||[]).map(function(x){return x.t})).join(' '));
    return terms.every(function(w){return hay.indexOf(w)>=0});
  });
  var open=hit.filter(function(t){return !isDone(t)}).sort(function(a,b){return (a.day||'9999')<(b.day||'9999')?-1:(a.day||'9999')>(b.day||'9999')?1:0});
  var done=hit.filter(isDone).sort(function(a,b){return (b.doneAt||0)-(a.doneAt||0)});
  return open.concat(done);
}
function searchResHTML(q){
  if(!fold(q).trim())return '<p class="hint" style="margin:4px 2px">Busca no título, nas etapas e no contexto, em todas as tarefas, inclusive as concluídas.</p>';
  var r=searchTasks(q),shown=r.slice(0,40),td=todayISO();
  var h='<p class="hint bs-n" style="margin:4px 2px 8px">'+(r.length?r.length+(r.length>1?' tarefas':' tarefa')+(r.length>40?', mostrando 40':''):'Nada encontrado.')+'</p>';
  if(!shown.length)return h;
  return h+'<div class="bs-list">'+shown.map(function(t){
    var c=ctxOf(t.ctx),done=isDone(t);
    var when=done?'Concluída '+(t.doneAt?relDay(iso(new Date(t.doneAt))).toLowerCase():''):(t.day?(lastDay(t)<td?'Era para '+shortDate(lastDay(t)):(t.end?shortDate(t.day)+' a '+shortDate(t.end):cap1(relDay(t.day)))):'Sem data');
    return '<button class="bs-r'+(done?' done':'')+'" data-act="bs-open" data-id="'+t.id+'"><b>'+esc(t.title)+'</b><small><i class="dot" style="background:var('+c.v+')"></i>'+esc(cname(c.id))+' · '+esc(when)+'</small></button>'}).join('')+'</div>';
}
function searchSheetHTML(){
  var q=(sh&&sh.q)||'';
  return '<div class="sh-head"><h2 class="h2">Buscar</h2><button class="ib" data-act="sh-close" aria-label="Fechar">'+ic('x')+'</button></div>'+
    '<div><label class="lab" for="bs-q">Tarefa, etapa ou contexto</label><input id="bs-q" class="inp" type="search" data-in="busca" autocomplete="off" enterkeyhint="search" maxlength="80" value="'+esc(q)+'"></div>'+
    '<div id="bs-res" aria-live="polite">'+searchResHTML(q)+'</div>';
}
