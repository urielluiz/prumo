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
  o=o||{};var done=isDone(t),c=ctxOf(t.ctx),f=FW[fwOf(t)];
  var dt=(t.dod||[]).length,dn=(t.dod||[]).filter(function(x){return x.d}).length;
  var tags=[];
  if(t.ex)tags.push('<span class="tag">exemplo</span>');
  if(t.rid&&S.rec&&S.rec[t.rid])tags.push('<span class="tag">repete</span>');
  if(o.sapo&&!done)tags.push('<span class="tag hot">Sapo</span>');
  if(t.status==='doing'&&!done)tags.push('<span class="tag go">em andamento</span>');
  if((t.slips||0)>0&&!done)tags.push('<span class="tag warn">adiada '+t.slips+'×</span>');
  var vd=o.day||todayISO(),per=t.end&&covers(t,vd)?dayIdx(t,vd):0;
  if(t.end)tags.push('<span class="tag per">'+(per?'dia '+per+' de '+spanOf(t):shortDate(t.day)+' a '+shortDate(t.end))+'</span>');
  var meta='<span><i class="dot" style="background:var('+c.v+')"></i>'+esc(cname(c.id))+'</span><span>'+fmt(t.est)+(t.end?' por dia':'')+'</span><span>'+esc(f.name)+'</span>'+(dt?'<span>'+dn+'/'+dt+' etapas</span>':'')+(fwOf(t)==='pomodoro'&&t.est>=50?'<span>'+(t.pomos||0)+'/'+Math.ceil(t.est/25)+' pomodoros</span>':'');
  var right='';
  if(!done){
    if(o.star)right+='<button class="ib'+(t.mit?' on':'')+'" data-act="mit" data-id="'+t.id+'" aria-pressed="'+(!!t.mit)+'" aria-label="Prioridade do dia">'+ic('star')+'</button>';
    if(o.play)right+='<button class="ib play" data-act="start" data-id="'+t.id+'" aria-label="Começar">'+ic('play')+'</button>';
    if(o.pull)right+='<button class="btn btn-s sm" data-act="pull" data-id="'+t.id+'">Puxar</button>';
  }
  right+='<button class="ib del" data-act="rowdel" data-id="'+t.id+'" aria-label="Excluir tarefa">'+ic('trash',18)+'</button>';
  return '<div class="row'+(done?' is-done':'')+'" data-tid="'+t.id+'"><button class="chk" data-act="toggle" data-id="'+t.id+'" aria-label="'+(done?'Reabrir':'Concluir')+' tarefa"><i class="'+(done?'on':'')+(popId===t.id?' pop':'')+'">'+(done?ic('check',15,2.6):'')+'</i></button>'+
    '<button class="row-main" data-act="edit" data-id="'+t.id+'"><div class="row-title">'+esc(t.title)+'</div><div class="row-meta">'+meta+'</div>'+(tags.length?'<div class="tags">'+tags.join('')+'</div>':'')+(per&&!done?'<span class="rbar" aria-hidden="true"><i style="width:'+Math.round(per/spanOf(t)*100)+'%"></i></span>':'')+'</button>'+right+'</div>';
}
function upcomingHTML(){
  var td=todayISO(),end=addDays(td,7),l=S.tasks.filter(function(t){return !isDone(t)&&t.day&&t.day>td&&t.day<=end}).sort(function(a,b){return a.day<b.day?-1:(a.day>b.day?1:byPrio(a,b))});
  if(!l.length)return '';
  var by={},ks=[];l.forEach(function(t){if(!by[t.day]){by[t.day]=[];ks.push(t.day)}by[t.day].push(t)});
  return secHTML('Próximos dias',l.length)+ks.map(function(d){var m=sum(by[d],function(t){return t.est});return '<div class="eyebrow" style="margin:12px 2px 6px">'+shortDate(d)+' · '+fmt(m)+'</div>'+listHTML(by[d],{},null)}).join('');
}
function listHTML(arr,o,sapoId){return '<div class="list">'+arr.map(function(t){return rowHTML(t,Object.assign({sapo:t.id===sapoId},o))}).join('')+'</div>'}
function secHTML(title,count){return '<div class="sec"><h2 class="h2">'+title+'</h2>'+(count!=null?'<span class="cnt">'+count+'</span>':'')+'</div>'}
function heroHTML(t){
  if(!t){
    var any=S.tasks.some(function(x){return !isDone(x)});
    return '<section class="hero"><div class="eyebrow">Próximo passo</div><div class="hero-t">Nada planejado para hoje.</div><p class="hero-p">'+(any?'Puxe tarefas do backlog para o dia ou crie uma nova.':'Crie a primeira tarefa e escolha como atacá-la.')+'</p><div class="btns"><button class="btn btn-p" data-act="new">Nova tarefa</button>'+(any?'<button class="btn btn-s" data-act="tab" data-t="semana">Ver a semana</button>':'')+'</div></section>';
  }
  var f=FW[fwOf(t)],sl=(t.slips||0)>=2,doing=t.status==='doing';
  return '<section class="hero"><div class="eyebrow">'+(doing?'Em andamento':'Comece por aqui')+'</div><div class="hero-t">'+esc(t.title)+'</div><p class="hero-p">'+(sl?'Adiada '+t.slips+' vezes. Só 5 minutos já quebram a inércia.':esc(f.name)+': '+esc(f.how))+'</p><div class="btns"><button class="btn btn-p" data-act="start" data-id="'+t.id+'">'+ic('play',18)+(doing?'Retomar':'Começar')+'</button><button class="btn btn-s" data-act="start5" data-id="'+t.id+'">Só 5 min</button></div></section>';
}

