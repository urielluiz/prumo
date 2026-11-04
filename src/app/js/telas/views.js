/* ---------- views ---------- */
function viewHoje(){
  var td=todayISO(),d=new Date();
  if(!booted&&!S.tasks.length)return '<header class="top"><div><div class="eyebrow">'+DAYS[d.getDay()]+', '+d.getDate()+' de '+MONF[d.getMonth()]+'</div><h1 class="h1">Hoje</h1></div></header><p class="hint">Carregando seus dados...</p>';
  var all=tasksOn(td),done=all.filter(isDone),open=all.filter(function(t){return !isDone(t)}).concat(dueNow());
  var now=nextTask(),over=overdue(),nm=profName().split(' ')[0];
  var sapo=sapoOf(td)||open.filter(function(t){return t.mit}).sort(byPrio)[0],ob=obra();
  // ordem da lista: em andamento, prioridades (estrela) e o resto; a tarefa do "Agora" não se repete
  var rest=open.filter(function(t){return !now||t.id!==now.id}).sort(function(a,b){return ((b.status==='doing')-(a.status==='doing'))||((b.mit?1:0)-(a.mit?1:0))||byPrio(a,b)});
  var h='<header class="top"><div><div class="eyebrow">'+(nm?'Olá, '+esc(nm)+' · ':'')+DAYS[d.getDay()]+', '+d.getDate()+' de '+MONF[d.getMonth()]+'</div><h1 class="h1">Hoje</h1></div><div class="hd-r">'+ringsHTML(ob)+avatarBtn()+'</div></header>';
  h+='<div class="cols"><div class="col stick">';
  var blk=S.blockers[td];
  h+='<button class="note" data-act="note">'+ic('target',16)+(blk?'<span class="note-t">'+esc(blk)+'</span>':'<span>O que pode te travar hoje?</span><b>Anotar</b>')+'</button>';
  if(S.tasks.some(function(t){return t.ex}))h+='<div class="banner"><span>Estas são tarefas de exemplo para você ver o app funcionando.</span><button class="btn btn-s sm" data-act="clear-ex">Limpar</button></div>';
  if(over.length)h+='<div class="alert"><span><b>'+over.length+(over.length>1?' tarefas ficaram':' tarefa ficou')+' para trás.</b></span><button class="btn btn-s sm" data-act="late">Resolver</button></div>';
  h+=wrapBanner();
  h+=pushBanner();
  h+=heroHTML(now,sapo&&now&&sapo.id===now.id);
  h+=planCardHTML();
  h+='</div><div class="col">';
  if(rest.length)h+=secHTML('Depois',fmt(sum(rest,function(t){return t.est})))+listHTML(rest,{day:td},sapo&&(!now||sapo.id!==now.id)?sapo.id:null);
  else if(now)h+='<p class="hint" style="margin:14px 4px">Só isso por hoje. Toque em ⋯ num card para trazer algo de outro dia.</p>';
  if(done.length){
    h+='<button class="fold" data-act="fold" aria-expanded="'+doneOpen+'"><span>'+done.length+(done.length>1?' concluídas':' concluída')+' hoje</span>'+ic(doneOpen?'up':'down',18)+'</button>';
    if(doneOpen)h+=listHTML(done,{day:td},null);
  }
  h+=closeCardHTML(ob,open.length);
  var tm=addDays(td,1),tl=tasksOn(tm).filter(function(t){return !isDone(t)});
  h+='<button class="peek" data-act="tab" data-t="semana"><span><b>Amanhã</b> · '+(tl.length?tl.length+(tl.length>1?' tarefas, ':' tarefa, ')+fmt(sum(tl,function(t){return t.est})):'nada planejado ainda')+'</span><span class="peek-r">Ver semana'+ic('right',16)+'</span></button>';
  h+='</div></div>';
  return h;
}

function dayLoad(d){return sum(tasksOn(d).filter(function(t){return !isDone(t)}),function(t){return t.est})}
function viewSemana(){
  var td=todayISO(),s0=addDays(td,semOff*7),days=[0,1,2,3,4,5,6].map(function(i){return addDays(s0,i)});
  var per=S.tasks.filter(function(t){return t.end&&!isDone(t)});
  var d0=parseISO(days[0]),d6=parseISO(days[6]);
  var h='<header class="top"><div><div class="eyebrow">'+(semOff?'Mais adiante':'Próximos 7 dias')+'</div><h1 class="h1">'+d0.getDate()+(d0.getMonth()!==d6.getMonth()?' '+MONS[d0.getMonth()]:'')+' a '+d6.getDate()+' '+MONS[d6.getMonth()]+'</h1></div><div class="nav">'+
    (semOff?'<button class="btn btn-s sm" data-act="sem" data-d="0">Hoje</button>':'')+'<button class="ib" data-act="busca" aria-label="Buscar tarefas">'+ic('search')+'</button><button class="ib" data-act="sem" data-d="-1" aria-label="7 dias antes"'+(semOff?'':' disabled')+'>'+ic('left')+'</button><button class="ib" data-act="sem" data-d="1" aria-label="Próximos 7 dias">'+ic('right')+'</button></div></header>';
  h+='<div class="wstrip"><div class="strip">'+days.map(function(d,i){
    var p=parseISO(d),m=dayLoad(d),cap=S.cap[p.getDay()]||0,pct=cap?Math.min(100,m/cap*100):(m?100:0),over=m>cap;
    var pp=per.find(function(t){return covers(t,d)}),bar='';
    if(pp)bar='<i class="pseg'+(d===pp.day||i===0?' s':'')+(d===pp.end||i===6?' e':'')+'"></i>';
    return '<button class="dy'+(d===td?' today':'')+(pp?' per':'')+'" data-act="goday" data-d="'+d+'" aria-label="'+DAYS[p.getDay()]+', '+p.getDate()+': '+fmt(m)+(cap?' de '+fmt(cap):'')+'"><small>'+DABR[p.getDay()]+'</small><b>'+p.getDate()+'</b><span class="ld'+(over?' over':'')+'"><i style="width:'+pct.toFixed(0)+'%"></i></span>'+bar+'</button>'}).join('')+'</div>';
  var tot=sum(days,dayLoad),capT=sum(days,function(d){return S.cap[parseISO(d).getDay()]||0});
  h+='<div class="wline"><span>'+fmt(tot)+' planejados de '+fmt(capT)+' que cabem nestes 7 dias.</span><button class="link" data-act="plan">Planejar</button></div></div>';
  days.forEach(function(d){
    var p=parseISO(d),l=tasksOn(d).sort(function(a,b){return (isDone(a)-isDone(b))||((b.mit?1:0)-(a.mit?1:0))||byPrio(a,b)}),m=dayLoad(d),cap=S.cap[p.getDay()]||0;
    var nm=d===td?'Hoje':(d===addDays(td,1)?'Amanhã':DAYS[p.getDay()]+', '+p.getDate());
    h+='<div class="dz" data-drop="'+d+'"><div class="dayh" id="d-'+d+'"><h2 class="h2">'+nm+'</h2><span class="dayl'+(m>cap?' over':'')+'">'+(m>cap?'passou '+fmt(m-cap)+' do que cabe':(m?fmt(m)+' de '+fmt(cap):(cap?'livre':'')))+'</span><button class="ib" data-act="new" data-day="'+d+'" aria-label="Adicionar tarefa em '+esc(nm)+'">'+ic('plus',18)+'</button></div>';
    h+=(l.length?listHTML(l,{day:d,drag:true},null):'<p class="dfree">Nada planejado.</p>')+'</div>';
  });
  var back=S.tasks.filter(function(t){return !t.day&&!isDone(t)}).sort(byPrio);
  h+='<div class="dz" data-drop="none"><div class="dayh" id="d-sem"><h2 class="h2">Sem data</h2><span class="dayl">'+back.length+'</span><button class="ib" data-act="new" data-day="none" aria-label="Adicionar tarefa sem data">'+ic('plus',18)+'</button></div>';
  h+=(back.length?listHTML(back,{drag:true},null):'<p class="dfree">Ideias sem dia ficam aqui. Quando houver espaço, toque em ⋯ para trazer para um dia.</p>')+'</div>';
  return h;
}

function viewFocoIdle(){
  var td=todayISO(),t=nextTask(),open=tasksOn(td).concat(dueNow()).filter(function(x){return !isDone(x)&&(!t||x.id!==t.id)}).sort(byPrio);
  var h='<header class="top"><div><div class="eyebrow">Foco</div><h1 class="h1">O que vem agora?</h1></div></header><div class="cols"><div class="col stick">';
  if(t){
    var sug=fwOf(t),cur=focusFw||sug;
    h+='<section class="hero fstart" data-tid="'+t.id+'"><div class="eyebrow">Agora</div><button class="hero-t" data-act="edit" data-id="'+t.id+'">'+esc(t.title)+'</button>'+
      '<p class="hero-p">'+esc(cname(t.ctx))+' · '+fmt(t.est)+(t.end&&covers(t,td)?' hoje · dia '+dayIdx(t,td)+' de '+spanOf(t):'')+((t.dod||[]).length?' · '+(t.dod.filter(function(x){return x.d}).length)+'/'+t.dod.length+' etapas':'')+'</p>'+
      '<div class="fwpick" role="group" aria-label="Método">'+Object.keys(FW).map(function(k){return '<button class="fwchip" data-act="fw-pick" data-v="'+k+'" aria-pressed="'+(cur===k)+'">'+esc(FW[k].name)+(k===sug?'<small>sugerido</small>':'')+'</button>'}).join('')+'</div>'+
      '<p class="hero-p fwhow">'+esc(FW[cur].how)+'</p>'+
      '<div class="btns"><button class="btn btn-p" data-act="start" data-id="'+t.id+'" data-fw="'+cur+'">'+ic('play',18)+'Começar</button></div></section>';
  }else h+=heroHTML(null);
  h+='<button class="btn btn-s btn-full" data-act="start5" data-id="" style="margin-top:12px">Foco livre de 5 minutos</button>';
  h+='</div><div class="col">';
  if(open.length)h+=secHTML('Ou escolha outra',open.length)+listHTML(open,{day:td},null);
  h+='<button class="link" data-act="help" style="margin:16px 4px">Como funcionam os métodos</button>';
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
  var nP=t&&se.fw==='pomodoro'&&t.est>=50?Math.ceil(t.est/25):0,done0=se.alerted&&!brk;
  if(se.alerted){
    var e=endCard(se,t);
    h+='<section class="endcard" role="status"><div class="eyebrow">'+(brk?'Pausa':esc(f.name))+' · 00:00</div><div class="hero-t">'+e.t+'</div><p class="hero-p">'+e.m+'</p><div class="btns">'+e.b.filter(Boolean).map(function(x){return '<button class="btn btn-'+x[2]+'" data-act="'+x[0]+'">'+x[1]+'</button>'}).join('')+'</div></section>';
  }
  if(!se.alerted)h+='<section class="timer"><div class="ring'+(brk?' brk':'')+'"><svg viewBox="0 0 240 240" aria-hidden="true"><circle class="ring-bg" cx="120" cy="120" r="108"/><circle id="ring-fg" class="ring-fg" cx="120" cy="120" r="108" stroke-dasharray="'+C.toFixed(1)+'" stroke-dashoffset="'+off.toFixed(1)+'"/></svg><div class="ring-in"><div class="eyebrow">'+(brk?'Descanse':'Foco')+'</div><div id="clock" class="clock" role="timer">'+mmss(r)+'</div></div></div>'+
    (se.fw==='pomodoro'&&!brk?'<p class="how prog"><span class="pomos" aria-hidden="true">'+[0,1,2,3].map(function(i){return '<i class="'+(i<((se.pomos||0)%4)?'on':'')+'"></i>'}).join('')+'</span>Rodada '+((se.pomos||0)+1)+(nP?' de ≈'+nP:'')+'</p>':'')+
    (brk?'<p class="how">Levante, beba água e olhe para longe da tela.</p>':'')+'</section>';
  if(!se.alerted){
    h+='<div class="fctl">'+(se.running?'<button class="btn btn-p btn-big" data-act="pause">'+ic('pause',20,2.2)+'Pausar</button>':'<button class="btn btn-p btn-big" data-act="resume">'+ic('play',20)+'Retomar</button>')+'</div>'+
      '<div class="btns fsec"><button class="btn btn-s" data-act="plus">+5 min</button>'+(t&&!brk?'<button class="btn btn-s" data-act="finish">'+ic('check',16,2.4)+'Concluir tarefa</button>':'')+'</div>'+
      '<div class="fter"><button class="link" data-act="stop">Parar a sessão</button>'+(PIPOK?'<button class="link" data-act="pip">'+(pip?'Fechar janela flutuante':'Janela flutuante')+'</button>':'')+'</div>';
  }
  h+='</div><div class="col">';
  if(t&&t.dod&&t.dod.length){
    h+=secHTML('Etapas',t.dod.filter(function(x){return x.d}).length+'/'+t.dod.length)+'<div class="list">'+t.dod.map(function(x,i){return '<button class="dodrow" data-act="dod" data-id="'+t.id+'" data-i="'+i+'"><i class="'+(x.d?'on':'')+'">'+(x.d?ic('check',14,2.8):'')+'</i><span>'+esc(x.t)+'</span></button>'}).join('')+'</div>';
  }
  h+='</div></div>';
  return h;
}

