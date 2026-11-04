/* ---------- obra: anéis do dia, fechar o dia, folha da obra, preferências ---------- */
var MESC=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
function ringsHTML(o){
  var td=todayISO(),pl=planned(td),fz=Math.min(1,o.today/o.meta),fc=dayClosed(td);
  var arc=function(r,f,c){var C=2*Math.PI*r;return '<circle cx="34" cy="34" r="'+r+'" fill="none" stroke="var(--soft)" stroke-width="5.5"/><circle class="rg-a" cx="34" cy="34" r="'+r+'" fill="none" stroke="var('+c+')" stroke-width="5.5" stroke-linecap="round" stroke-dasharray="'+C.toFixed(1)+'" stroke-dashoffset="'+(C*(1-f)).toFixed(1)+'" transform="rotate(-90 34 34)"/>'};
  var lab='Seu dia: planejar '+(pl?'feito':'pendente')+', fazer '+Math.min(o.today,o.meta)+' de '+o.meta+', fechar '+(fc?'feito':'pendente')+'. Sequência de '+o.cur+(o.cur===1?' dia':' dias')+'. Ver sua obra';
  return '<button class="drings" data-act="obra" aria-label="'+lab+'"><svg width="68" height="68" viewBox="0 0 68 68" aria-hidden="true">'+arc(29,pl?1:0,'--c1')+arc(21.5,fz,'--accent')+arc(14,fc?1:0,'--ok')+'</svg><b aria-hidden="true">'+o.cur+'</b></button>';
}
function closeCardHTML(o,openN){
  var td=todayISO(),dd=dayOf(td),tm=addDays(td,1),sp=dayOf(tm).s&&byId(dayOf(tm).s);
  if(dd.c)return '<section class="closec done"><div><b>Dia fechado.</b><span>'+(sp&&!isDone(sp)?'Amanhã começa com '+esc(sp.title)+'.':'Até amanhã.')+'</span></div><button class="btn btn-s sm" data-act="close">Rever</button></section>';
  var late=new Date().getHours()>=17||!openN;
  return '<section class="closec"><div><b>Fechar o dia</b><span>O que sobrou e o Sapo de amanhã, em 30 segundos.</span></div><button class="btn '+(late?'btn-p':'btn-s')+' sm" data-act="close">Fechar</button></section>';
}
function leftovers(td){return tasksOn(td).filter(function(t){return !isDone(t)&&!(t.end&&t.end>td)})}
function nextWork(d){var x=addDays(d,1);for(var i=0;i<7&&isFolga(x);i++)x=addDays(x,1);return x}
function closeSheetHTML(){
  var td=todayISO(),tm=addDays(td,1),o=obra(),dm=doneMap(),all=tasksOn(td),dn=all.filter(isDone).length,left=leftovers(td),secs=S.log[td]||0;
  var h='<div class="sh-head"><h2 class="h2">Fechar o dia</h2><button class="ib" data-act="sh-close" aria-label="Fechar">'+ic('x')+'</button></div>';
  h+='<p class="hint" style="margin:-8px 0 0">Você concluiu '+(dm[td]||0)+(all.length?' de '+all.length:'')+' hoje'+(secs>=60?' · '+fmt(secs/60)+' em foco':'')+'.</p>';
  var falta=o.meta-o.today;
  h+='<p class="cl-st'+(o.firm?' ok':'')+'">'+(o.firm?'Dia firme: mais um tijolo na obra.':(isFolga(td)?'Hoje é folga: não conta contra a sequência.':'Para virar tijolo: '+(falta>1?'mais '+falta+' tarefas ou blocos':'concluir 1 tarefa ou fazer 25 min')+' de foco.'))+'</p>';
  if(left.length){
    var nw=nextWork(tm);
    h+='<div><span class="lab">O que sobrou</span><div class="stack">'+left.map(function(t){
      return '<div class="res"><b>'+esc(t.title)+'</b><div class="chips"><button class="chip" data-act="mv" data-id="'+t.id+'" data-d="'+tm+'">Amanhã</button>'+('<button class="chip" data-act="mv" data-id="'+t.id+'" data-d="'+nw+'">'+DABR[parseISO(nw).getDay()]+' '+parseISO(nw).getDate()+'</button>')+'<button class="chip" data-act="mv" data-id="'+t.id+'" data-d="">Sem data</button><button class="chip" data-act="rowmenu" data-id="'+t.id+'" data-back="close">Outro dia</button></div></div>'}).join('')+'</div>'+
      (left.length>1?'<div class="btns" style="margin-top:10px"><button class="btn btn-s sm" data-act="close-all">Tudo para amanhã</button></div>':'')+'</div>';
  }
  var cand=tasksOn(tm).filter(function(t){return !isDone(t)}).sort(byPrio).slice(0,8),cur=dayOf(tm).s;
  h+='<div><span class="lab">Sapo de amanhã</span>'+(cand.length?'<p class="hint" style="margin:-2px 2px 10px">A tarefa mais pesada, para fazer antes de tudo.</p><div class="chips cl-sapo">'+cand.map(function(t){return chip(esc(t.title),t.id===cur,'data-act="close-sapo" data-id="'+t.id+'"')}).join('')+'</div>':'<p class="hint" style="margin:0 2px">Nada planejado para amanhã ainda. O que você mandar para amanhã aparece aqui.</p>')+'</div>';
  h+='<div class="sh-actions"><button class="btn btn-p" data-act="close-done">'+(dayClosed(td)?'Salvar':'Fechar o dia')+'</button></div>';
  return h;
}
function towerHTML(o,fresh){
  var td=todayISO(),fl=o.floors.slice(-12).reverse(),more=o.floors.length-fl.length;
  var nm={f:'tijolo',o:'folga',p:'pausa',x:'em branco',t:'hoje'};
  var h='<div class="tower" role="list" aria-label="Andares da obra, do mais recente ao mais antigo">'+fl.map(function(f){
    var d=parseISO(f.wk),lab=d.getDate()+' '+MESC[d.getMonth()];
    return '<div class="floor'+(f.prumo?' pr':'')+'" role="listitem" aria-label="Semana de '+lab+': '+f.n+(f.n===1?' tijolo':' tijolos')+(f.plan?', planejada':'')+(f.prumo?', no prumo':'')+'"><span class="fl-l" aria-hidden="true">'+(f.plan?'<i class="ob-pl"></i>':'')+lab+'</span><div class="fl-b" aria-hidden="true">'+f.cells.map(function(c,i){var dd=addDays(f.wk,i);return '<i class="bk'+(c?' '+c:'')+(dd===td?' td':'')+(fresh&&dd===td&&c==='f'?' new':'')+'" title="'+(c?nm[c]:'')+'"></i>'}).join('')+'</div></div>'}).join('')+'</div>';
  h+='<div class="fl-d" aria-hidden="true"><span></span><div>'+['S','T','Q','Q','S','S','D'].map(function(x){return '<i>'+x+'</i>'}).join('')+'</div></div>';
  if(more>0)h+='<p class="hint" style="margin:6px 0 0">E mais '+more+(more>1?' andares':' andar')+' abaixo.</p>';
  return h;
}
function obraSheetHTML(){
  var o=obra(),td=todayISO(),fresh=sh&&sh.fresh===td,an=o.floors.filter(function(f){return f.n>0}).length;
  var h='<div class="sh-head"><h2 class="h2">Sua obra</h2><button class="ib" data-act="sh-close" aria-label="Fechar">'+ic('x')+'</button></div>';
  h+='<div class="ob-top"><div class="ob-n"><b>'+o.cur+'</b><span>'+(o.cur===1?'dia':'dias')+' no prumo</span></div><p>'+
    (o.cur===0&&o.best>0?'Recomeço. Seu recorde é '+o.best+(o.best===1?' dia.':' dias.'):(o.best>o.cur?'Recorde: '+o.best+' dias.':(o.cur>0?'Este é o seu recorde.':'O primeiro tijolo vem do primeiro dia firme.')))+
    '<br>'+an+(an===1?' andar':' andares')+' · '+o.bricks+(o.bricks===1?' tijolo':' tijolos')+'<br>Pausa desta semana: '+(o.pauseLeft>0?'disponível':'usada')+'</p></div>';
  if(fresh)h+='<p class="cl-st ok" role="status">'+(o.firm?'Tijolo de hoje assentado.':'Dia fechado. Amanhã tem mais.')+'</p>';
  h+=towerHTML(o,fresh);
  h+='<div class="ob-leg" aria-hidden="true"><span><i class="bk f"></i>dia firme</span><span><i class="bk o"></i>folga ou pausa</span><span><i class="bk x"></i>em branco</span><span><i class="ob-pl"></i>semana planejada</span><span><i class="ob-pr"></i>semana fechada</span></div>';
  var offN=gOff().slice().sort(function(a,b){return ((a+6)%7)-((b+6)%7)}).map(function(w){return DABR[w]}).join(', ');
  h+='<p class="hint" style="margin:0">Dia firme: '+(o.meta>1?o.meta+' tarefas concluídas ou blocos de 25 min de foco.':'1 tarefa concluída ou 25 min de foco.')+' Folga ('+(offN||'nenhum dia')+') não quebra a sequência e, se você fizer algo, vale tijolo. Uma pausa por semana cobre um dia útil em branco. Planejar a semana marca o andar; fechar a semana na Revisão deixa o andar no prumo.</p>';
  h+='<div class="sh-actions"><button class="btn btn-s" data-act="perfil-game">Ajustar regras</button></div>';
  return h;
}
function closeHour(){try{var v=localStorage.getItem('prumo.closeh');return v===null?18:(v==='off'?null:Number(v))}catch(e){return 18}}
function gameSettings(){
  var meta=gMeta(),off=gOff(),ch=closeHour();
  var h='<div><span class="lab">Meta do dia</span><div class="chips">'+[1,2,3].map(function(n){return chip(n===1?'1 tarefa ou bloco':n+' tarefas ou blocos',meta===n,'data-act="g-meta" data-v="'+n+'"')}).join('')+'</div><p class="hint" style="margin:8px 2px 0">Bloco = 25 min de foco.</p></div>';
  h+='<div><span class="lab">Dias de folga</span><div class="chips">'+[1,2,3,4,5,6,0].map(function(w){return chip(DABR[w],off.indexOf(w)>=0,'data-act="g-off" data-v="'+w+'"')}).join('')+'</div><p class="hint" style="margin:8px 2px 0">Não quebram a sequência. Você ainda pode planejar tarefas nesses dias.</p></div>';
  h+='<div><span class="lab">Lembrete para fechar o dia</span>'+(pushState==='on'?'<div class="chips">'+[['off','Desligado'],['17','17h'],['18','18h'],['19','19h'],['20','20h'],['21','21h']].map(function(x){var on=x[0]==='off'?ch===null:ch===Number(x[0]);return chip(x[1],on,'data-act="close-hr" data-v="'+x[0]+'"')}).join('')+'</div>':'<p class="hint" style="margin:0 2px">Ative os avisos neste aparelho (em Preferências) para receber o lembrete.</p>')+'</div>';
  h+='<div class="btns"><button class="btn btn-s sm" data-act="obra">Ver sua obra</button></div>';
  return h;
}
function closeDay(){
  var td=todayISO();setDay(td,{c:Date.now()});persist();
  sh={kind:'obra',fresh:td};renderSheet();render();
}
