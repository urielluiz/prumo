/* ---------- toast ---------- */
var toastT=null,toastFn=null;
function toast(msg,label,fn){
  var e=$('#toast');toastFn=fn||null;
  e.innerHTML='<span>'+esc(msg)+'</span>'+(label?'<button data-act="toast-act">'+esc(label)+'</button>':'');
  e.hidden=false;clearTimeout(toastT);toastT=setTimeout(function(){e.hidden=true;toastFn=null},label?6000:2800);
}

/* ---------- componentes ---------- */
function ringHTML(n,m){
  var C=2*Math.PI*28,off=m?C*(1-n/m):C;
  return '<div class="pring" role="img" aria-label="'+n+' de '+m+' concluídas hoje"><svg width="68" height="68" viewBox="0 0 68 68"><circle cx="34" cy="34" r="28" fill="none" stroke="var(--soft)" stroke-width="7"/><circle cx="34" cy="34" r="28" fill="none" stroke="var(--ok)" stroke-width="7" stroke-linecap="round" stroke-dasharray="'+C.toFixed(1)+'" stroke-dashoffset="'+off.toFixed(1)+'"/></svg><b>'+n+'/'+m+'</b></div>';
}
function rowHTML(t,o){
  o=o||{};var done=isDone(t),c=ctxOf(t.ctx);
  var dt=(t.dod||[]).length,dn=(t.dod||[]).filter(function(x){return x.d}).length;
  var vd=o.day||todayISO(),per=t.end&&covers(t,vd)?dayIdx(t,vd):0;
  var m=['<span><i class="dot" style="background:var('+c.v+')"></i>'+esc(cname(c.id))+'</span>','<span>'+fmt(t.est)+(t.end?' por dia':'')+'</span>'];
  if(dt)m.push('<span>'+dn+'/'+dt+' etapas</span>');
  if(t.due&&!done)m.push(dueTag(t));
  if(t.end)m.push('<span class="tag per">'+(per?'dia '+per+' de '+spanOf(t):shortDate(t.day)+' a '+shortDate(t.end))+'</span>');
  if(o.sapo&&!done)m.push('<span class="tag hot">Sapo</span>');
  if(t.status==='doing'&&!done)m.push('<span class="tag go">em andamento</span>');
  if((t.slips||0)>0&&!done)m.push('<span class="tag warn">adiada '+t.slips+'×</span>');
  if(t.rid&&S.rec&&S.rec[t.rid])m.push('<span class="tag">repete</span>');
  if(t.ex)m.push('<span class="tag">exemplo</span>');
  var right=(done?'':'<button class="ib play" data-act="start" data-id="'+t.id+'" aria-label="Começar">'+ic('play')+'</button>')+'<button class="ib more" data-act="rowmenu" data-id="'+t.id+'" aria-label="Mais ações">'+ic('more',20)+'</button>';
  return '<div class="rw"><div class="sw" aria-hidden="true"><button class="sw-a" data-act="mv" data-id="'+t.id+'" data-d="'+addDays(todayISO(),1)+'" tabindex="-1">Amanhã</button><button class="sw-b" data-act="rowmenu" data-id="'+t.id+'" tabindex="-1">Outro dia</button></div>'+
    '<div class="row'+(done?' is-done':'')+'" data-tid="'+t.id+'"'+(o.drag&&CANDRAG&&!done?' draggable="true"':'')+'><button class="chk" data-act="toggle" data-id="'+t.id+'" aria-label="'+(done?'Reabrir':'Concluir')+' tarefa"><i class="'+(done?'on':'')+(popId===t.id?' pop':'')+'">'+(done?ic('check',15,2.6):'')+'</i></button>'+
    '<button class="row-main" data-act="edit" data-id="'+t.id+'"><div class="row-title">'+(t.mit&&!done?'<span class="star" aria-label="Prioridade">'+ic('star',15)+'</span>':'')+esc(t.title)+'</div><div class="row-meta">'+m.join('')+'</div>'+(per&&!done?'<span class="rbar" aria-hidden="true"><i style="width:'+Math.round(per/spanOf(t)*100)+'%"></i></span>':'')+'</button>'+right+'</div></div>';
}
function listHTML(arr,o,sapoId){return '<div class="list">'+arr.map(function(t){return rowHTML(t,Object.assign({sapo:t.id===sapoId},o))}).join('')+'</div>'}
function secHTML(title,count){return '<div class="sec"><h2 class="h2">'+title+'</h2>'+(count!=null?'<span class="cnt">'+count+'</span>':'')+'</div>'}
function heroHTML(t,isSapo){
  if(!t){
    var any=S.tasks.some(function(x){return !isDone(x)});
    return '<section class="hero"><div class="eyebrow">Próximo passo</div><div class="hero-t">Nada planejado para hoje.</div><p class="hero-p">'+(any?'Traga uma tarefa de outro dia ou sem data pelo ⋯, ou crie uma nova.':'Crie a primeira tarefa e escolha como atacá-la.')+'</p><div class="btns"><button class="btn btn-p" data-act="new">Nova tarefa</button>'+(any?'<button class="btn btn-s" data-act="tab" data-t="semana">Ver a semana</button>':'')+'</div></section>';
  }
  var f=FW[fwOf(t)],sl=(t.slips||0)>=2,doing=t.status==='doing';
  return '<section class="hero" data-tid="'+t.id+'"><div class="eyebrow">'+(doing?'Em andamento':'Agora'+(isSapo?' · Sapo':''))+'</div><button class="hero-t" data-act="edit" data-id="'+t.id+'">'+esc(t.title)+'</button><p class="hero-p">'+(t.end&&covers(t,todayISO())?'<b>Dia '+dayIdx(t,todayISO())+' de '+spanOf(t)+'</b> · '+fmt(t.est)+' hoje. ':'')+(sl?'Adiada '+t.slips+' vezes. Só 5 minutos já quebram a inércia.':esc(f.name)+': '+esc(f.how))+'</p><div class="btns"><button class="btn btn-p" data-act="start" data-id="'+t.id+'">'+ic('play',18)+(doing?'Retomar':'Começar')+'</button><button class="btn btn-s" data-act="start5" data-id="'+t.id+'">Só 5 min</button></div></section>';
}

