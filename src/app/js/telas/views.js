/* ---------- views ---------- */
function viewHoje(){
  var td=todayISO(),d=new Date();
  if(!booted&&!S.tasks.length)return '<header class="top"><div><div class="eyebrow">'+DAYS[d.getDay()]+', '+d.getDate()+' de '+MONF[d.getMonth()]+'</div><h1 class="h1">Hoje</h1></div></header><p class="hint">Carregando seus dados...</p>';
  var all=tasksOn(td),done=all.filter(isDone),open=all.filter(function(t){return !isDone(t)});
  var doing=open.filter(function(t){return t.status==='doing'});
  var mitAll=open.filter(function(t){return t.mit}).sort(byPrio),sapo=mitAll[0]&&mitAll[0].id;
  var mits=open.filter(function(t){return t.mit&&t.status!=='doing'}).sort(byPrio);
  var rest=open.filter(function(t){return !t.mit&&t.status!=='doing'}).sort(byPrio);
  var over=overdue(),st=streak();
  var yest=S.tasks.filter(function(t){return isDone(t)&&t.doneAt&&iso(new Date(t.doneAt))===addDays(td,-1)}).length;
  var h='<header class="top"><div><div class="eyebrow">'+DAYS[d.getDay()]+', '+d.getDate()+' de '+MONF[d.getMonth()]+'</div><h1 class="h1">Hoje</h1></div>'+ringHTML(done.length,all.length)+'</header>';
  h+='<div class="cols"><div class="col stick">';
  if(S.tasks.some(function(t){return t.ex}))h+='<div class="banner"><span>Estas são tarefas de exemplo para você ver o app funcionando.</span><button class="btn btn-s sm" data-act="clear-ex">Limpar</button></div>';
  h+='<section class="checkin"><label class="lab" for="blk">Check-in'+(yest?' · ontem você concluiu '+yest:'')+(st>1?' · sequência de '+st+' dias':'')+'</label><input id="blk" class="inp" data-in="blk" enterkeyhint="done" autocomplete="off" placeholder="O que pode te travar hoje?" value="'+esc(S.blockers[td]||'')+'"></section>';
  h+=wrapBanner();
  h+=pushBanner();
  h+=heroHTML(nextTask());
  h+='</div><div class="col">';
  if(over.length){
    h+=secHTML('Ficou para trás',over.length)+'<div class="list">'+over.map(function(t){var c=ctxOf(t.ctx);
      return '<div class="row"><button class="row-main" data-act="edit" data-id="'+t.id+'"><div class="row-title">'+esc(t.title)+'</div><div class="row-meta"><span><i class="dot" style="background:var('+c.v+')"></i>'+esc(cname(c.id))+'</span><span>era de '+shortDate(t.day)+'</span></div></button><button class="btn btn-s sm" data-act="mtoday" data-id="'+t.id+'">Hoje</button><button class="btn btn-g sm" data-act="drop" data-id="'+t.id+'">Soltar</button></div>'}).join('')+'</div>';
  }
  if(doing.length)h+=secHTML('Em andamento',wipCount()+'/'+WIP)+listHTML(doing,{star:true,play:true},sapo);
  {
  h+=secHTML('Prioridades do dia',mitAll.length+'/'+MAXMIT);
  h+=mits.length?listHTML(mits,{star:true,play:true},sapo):(mitAll.length?'':'<p class="hint">Toque na estrela de até 3 tarefas. A primeira da lista vira o Sapo: a mais pesada, para fazer antes de tudo.</p>');
  if(rest.length)h+=secHTML('Resto do dia',rest.length)+listHTML(rest,{star:true,play:true},sapo);
  }
  if(done.length)h+=secHTML('Concluídas hoje',done.length)+listHTML(done,{},null);
  h+=grpSection();
  h+=upcomingHTML();
  h+='</div></div>';
  return h;
}

function viewSemana(){
  var wk=curWk(),td=todayISO();
  var days=[0,1,2,3,4,5,6].map(function(i){return addDays(wk,i)});
  if(!selDay||days.indexOf(selDay)<0)selDay=days.indexOf(td)>=0?td:days[0];
  var wt=weekTasks(wk),planMin=sum(wt,function(t){return t.est}),wdone=wt.filter(isDone);
  var byC=CTX.map(function(c){return {c:c,m:sum(wt.filter(function(t){return t.ctx===c.id}),function(t){return t.est})}}).filter(function(x){return x.m>0});
  var dayT=tasksOn(selDay).sort(function(a,b){return (isDone(a)-isDone(b))||byPrio(a,b)});
  var cap=S.cap[parseISO(selDay).getDay()]||0;
  var plan=sum(dayT,function(t){return t.est}),dn=sum(dayT.filter(isDone),function(t){return t.est});
  var sd=parseISO(selDay),over=cap&&plan>cap;
  var msg=!cap?(plan?'Dia sem capacidade definida. Ajuste em Planejar semana.':'Dia livre.'):(over?'Passou '+fmt(plan-cap)+' da capacidade de '+fmt(cap)+'. Mova algo para outro dia.':fmt(plan)+' planejados de '+fmt(cap)+'. Sobram '+fmt(cap-plan)+'.');
  var pc=cap?Math.min(100,plan/cap*100):0,pd=cap?Math.min(pc,dn/cap*100):0;
  var back=S.tasks.filter(function(t){return !t.day&&!isDone(t)&&!isGrp(t)}).sort(byPrio);
  var h='<header class="top"><div><div class="eyebrow">Semana</div><h1 class="h1">'+rangeLabel(wk)+'</h1></div><div class="nav"><button class="ib" data-act="wk" data-d="-1" aria-label="Semana anterior">'+ic('left')+'</button><button class="ib" data-act="wk" data-d="1" aria-label="Próxima semana">'+ic('right')+'</button></div></header>';
  h+='<div class="cols"><div class="col stick">';
  h+='<section class="panel">'+(planMin?'<div class="nums"><div><b>'+wdone.length+'/'+wt.length+'</b><small>tarefas concluídas</small></div><div><b>'+fmt(planMin)+'</b><small>planejados na semana</small></div></div><div><div class="bar" role="img" aria-label="Tempo planejado por contexto">'+byC.map(function(x){return '<i style="width:'+(x.m/planMin*100).toFixed(1)+'%;background:var('+x.c.v+')"></i>'}).join('')+'</div><div class="legend">'+byC.map(function(x){return '<span><i class="dot" style="background:var('+x.c.v+')"></i>'+esc(cname(x.c.id))+' '+fmt(x.m)+'</span>'}).join('')+'</div></div>':'<p class="hint" style="margin:0">Nada planejado nesta semana ainda.</p>')+'<div class="btns">'+(wkOff!==0?'<button class="btn btn-s sm" data-act="wk" data-d="0">Voltar para esta semana</button>':'')+'<button class="btn btn-s sm" data-act="plan">Planejar semana</button></div></section>';
  h+='<div class="sec"><h2 class="h2">Dias</h2></div><div class="strip">'+days.map(function(d){
    var l=tasksOn(d),n=l.length,k=l.filter(isDone).length,p=parseISO(d);
    return '<button class="dy'+(d===td?' today':'')+(n&&k===n?' alldone':'')+'" data-act="selday" data-d="'+d+'" aria-pressed="'+(d===selDay)+'"><small>'+DABR[p.getDay()]+'</small><b>'+p.getDate()+'</b><em>'+(n?k+'/'+n:'·')+'</em></button>'}).join('')+'</div>';
  h+='<div class="panel"><div><div class="eyebrow">'+DAYS[sd.getDay()]+', '+sd.getDate()+' de '+MONF[sd.getMonth()]+'</div></div><div><div class="bar"><i style="width:'+pd.toFixed(1)+'%;background:var(--ok)"></i><i style="width:'+Math.max(0,pc-pd).toFixed(1)+'%;background:'+(over?'var(--bad)':'var(--ink)')+'"></i></div><p class="hint" style="margin:8px 0 0'+(over?';color:var(--bad)':'')+'">'+msg+'</p></div></div>';
  h+='</div><div class="col">';
  h+='<div class="sec"><h2 class="h2">Tarefas do dia</h2><button class="btn btn-s sm" data-act="new" data-day="'+selDay+'">'+ic('plus',16,2.2)+'Adicionar</button></div>';
  h+=dayT.length?listHTML(dayT,{play:true},null):emptyHTML('dia');
  h+=grpSection();
  h+=secHTML('Backlog sem data',back.length);
  h+=back.length?listHTML(back,{pull:true},null):emptyHTML('back');
  h+='<div class="btns" style="margin-top:12px"><button class="btn btn-s btn-full" data-act="new" data-day="none">Adicionar ao backlog</button></div>';
  h+='</div></div>';
  return h;
}

function viewFocoIdle(){
  var td=todayISO(),open=tasksOn(td).filter(function(t){return !isDone(t)}).sort(byPrio);
  var h='<header class="top"><div><div class="eyebrow">Foco</div><h1 class="h1">Uma coisa de cada vez</h1></div></header><div class="cols"><div class="col stick">'+heroHTML(nextTask());
  h+='<div class="btns" style="margin-top:12px"><button class="btn btn-s btn-full" data-act="start5" data-id="">Sessão livre de 5 minutos</button></div>';
  h+='</div><div class="col">';
  if(open.length)h+=secHTML('Para hoje',open.length)+listHTML(open,{play:true},null);
  h+=secHTML('Como funciona')+'<div class="list">'+Object.keys(FW).map(function(k){return '<div class="row"><div class="row-main"><div class="row-title">'+esc(FW[k].name)+'</div><div class="row-meta"><span>'+esc(FW[k].how)+'</span></div></div></div>'}).join('')+'</div>';
  h+='</div></div>';
  return h;
}
function endCard(se,t){
  var pk=(se.pomos%4===0)?15:5,b=[];
  if(se.phase==='break')return {t:'A pausa acabou',m:'Volte ao foco quando estiver pronto.',b:[['next-focus','Voltar ao foco','p'],t?['finish','Concluir tarefa','s']:null,['stop','Encerrar','g']]};
  if(se.fw==='pomodoro')return {t:'Pomodoro '+se.pomos+' completo',m:'Faça uma pausa. Quem pausa, rende na rodada seguinte.',b:[['next-break','Pausa de '+pk+' min','p'],t?['finish','Concluir tarefa','s']:null,['stop','Encerrar','g']]};
  if(se.fw==='timebox')return {t:'Tempo esgotado',m:'Entregue o que tem. Bom o bastante conta.',b:[t?['finish','Concluir','p']:['stop','Encerrar','p'],['more','+10 min','s'],t?['stop','Parar por agora','g']:null]};
  if(se.fw==='cinco')return {t:'Você começou',m:'Isso era a parte mais difícil. Continuar ou parar, os dois valem.',b:[['cont25','Continuar por 25 min','p'],t?['finish','Concluir','s']:null,['stop','Parar por hoje','g']]};
  return {t:'2 minutos',m:'Deu tempo?',b:[t?['finish','Concluí','p']:['stop','Encerrar','p'],['more','+2 min','s'],t?['stop','Deixar para depois','g']:null]};
}
function viewFoco(){
  var se=S.session;if(!se)return viewFocoIdle();
  var t=se.tid?byId(se.tid):null;
  if(se.tid&&!t){S.session=null;return viewFocoIdle()}
  var f=FW[se.fw],r=remaining(),C=2*Math.PI*108,off=C*(1-(se.total?r/se.total:0)),brk=se.phase==='break';
  var cyc=se.pomos?((se.pomos-1)%4)+1:0;
  var h='<header class="top"><div><div class="eyebrow">'+(brk?'Pausa':esc(f.name))+'</div><h1 class="h1">'+(t?esc(t.title):'Sessão livre')+'</h1></div></header>';
  h+='<div class="cols"><div class="col">';
  h+='<section class="timer"><div class="ring'+(brk?' brk':'')+'"><svg viewBox="0 0 240 240" aria-hidden="true"><circle class="ring-bg" cx="120" cy="120" r="108"/><circle id="ring-fg" class="ring-fg" cx="120" cy="120" r="108" stroke-dasharray="'+C.toFixed(1)+'" stroke-dashoffset="'+off.toFixed(1)+'"/></svg><div class="ring-in"><div class="eyebrow">'+(brk?'Descanse':'Foco')+'</div><div id="clock" class="clock" role="timer">'+mmss(r)+'</div></div></div>'+
    (se.fw==='pomodoro'?'<div class="pomos" aria-label="Rodadas">'+[0,1,2,3].map(function(i){return '<i class="'+(i<cyc?'on':'')+'"></i>'}).join('')+'</div>':'')+
    '<p class="how">'+(brk?'Levante, beba água e olhe para longe da tela.':esc(f.how))+'</p>'+(t&&se.fw==='pomodoro'&&t.est>=50&&!brk?'<p class="how"><b>Rodada '+Math.min(Math.ceil(t.est/25),(t.pomos||0)+1)+' de ≈'+Math.ceil(t.est/25)+'</b></p>':'')+'</section>';
  if(se.alerted){
    var e=endCard(se,t);
    h+='<section class="endcard"><div class="hero-t">'+e.t+'</div><p class="hero-p">'+e.m+'</p><div class="btns">'+e.b.filter(Boolean).map(function(x){return '<button class="btn btn-'+x[2]+'" data-act="'+x[0]+'">'+x[1]+'</button>'}).join('')+'</div></section>';
  }else{
    h+='<div class="btns" style="justify-content:center">'+(se.running?'<button class="btn btn-p" data-act="pause">'+ic('pause',18,2.2)+'Pausar</button>':'<button class="btn btn-p" data-act="resume">'+ic('play',18)+'Retomar</button>')+'<button class="btn btn-s" data-act="plus">+5 min</button>'+(t&&!brk?'<button class="btn btn-s" data-act="finish">Concluir</button>':'')+'<button class="btn btn-g" data-act="stop">Parar</button>'+(PIPOK?'<button class="btn btn-s" data-act="pip">'+(pip?'Fechar janela flutuante':'Janela flutuante')+'</button>':'')+'</div>';
  }
  h+='</div><div class="col">';
  if(t&&t.dod&&t.dod.length){
    h+=secHTML('Pronto quando',t.dod.filter(function(x){return x.d}).length+'/'+t.dod.length)+'<div class="list">'+t.dod.map(function(x,i){return '<button class="dodrow" data-act="dod" data-id="'+t.id+'" data-i="'+i+'"><i class="'+(x.d?'on':'')+'">'+(x.d?ic('check',14,2.8):'')+'</i><span>'+esc(x.t)+'</span></button>'}).join('')+'</div>';
  }
  h+='</div></div>';
  return h;
}

