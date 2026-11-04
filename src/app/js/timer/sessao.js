function notify(se,t){
  try{
    if(!('Notification' in window)||Notification.permission!=='granted')return;
    if(document.visibilityState==='visible'&&document.hasFocus())return;
    var e=endCard(se,t);
    var n=new Notification('Prumo · '+e.t,{body:(t?t.title+'. ':'')+e.m,tag:'prumo-timer',requireInteraction:true});
    n.onclick=function(){try{window.focus()}catch(x){}n.close()};
  }catch(x){}
}
function setTitle(s){if(s!==lastTitle){lastTitle=s;document.title=s}}
function closePip(){var w=pip;pip=null;pipKey='';try{if(w)w.close()}catch(e){}}
async function openPip(){
  if(!PIPOK){toast('A janela flutuante funciona no Chrome ou Edge, no computador.');return}
  if(pip){closePip();render();return}
  if(!S.session){toast('Dê play em uma tarefa primeiro.');return}
  var w;
  try{w=await window.documentPictureInPicture.requestWindow({width:340,height:260})}catch(e){toast('Não consegui abrir a janela flutuante.');return}
  pip=w;
  var d=w.document;
  Array.prototype.forEach.call(document.querySelectorAll('style,link[rel="stylesheet"]'),function(n){d.head.appendChild(n.cloneNode(true))});
  var th=document.documentElement.getAttribute('data-theme');if(th)d.documentElement.setAttribute('data-theme',th);
  d.body.style.cssText='margin:0;padding:14px 16px;min-height:100vh;background:var(--bg);color:var(--ink);font:16px/1.4 var(--body)';
  d.body.innerHTML='<div id="pr"></div>';
  d.addEventListener('click',function(e){var el=e.target.closest('[data-act]');if(el)act(el.dataset.act,el)});
  w.addEventListener('pagehide',function(){if(pip===w){pip=null;pipKey='';render()}});
  pipKey='';renderPip(true);render();
}
function renderPip(force){
  if(!pip)return;
  var se=S.session;
  if(!se){closePip();return}
  var d=pip.document,root=d.getElementById('pr');if(!root)return;
  var t=se.tid?byId(se.tid):null,brk=se.phase==='break',key=[se.tid,se.phase,se.running,se.alerted,se.fw].join('|');
  if(key!==pipKey||force){
    pipKey=key;
    var h='<div class="eyebrow">'+(brk?'Pausa':esc(FW[se.fw].name))+'</div><div class="row-title" style="margin:2px 0 4px">'+(t?esc(t.title):'Sessão livre')+'</div><div class="clock" id="pclock" style="text-align:center;font-size:56px"></div><div class="bar" style="margin:6px 0 14px"><i id="pbar" style="display:block;height:100%;width:0;background:var(--accent)"></i></div>';
    if(se.alerted){var e=endCard(se,t);h+='<div class="hero-t" style="font-size:17px;margin-bottom:8px">'+e.t+'</div><div class="btns">'+e.b.filter(Boolean).map(function(x){return '<button class="btn btn-'+x[2]+' sm" data-act="'+x[0]+'">'+x[1]+'</button>'}).join('')+'</div>'}
    else h+='<div class="btns">'+(se.running?'<button class="btn btn-p sm" data-act="pause">Pausar</button>':'<button class="btn btn-p sm" data-act="resume">Retomar</button>')+'<button class="btn btn-s sm" data-act="plus">+5 min</button>'+(t&&!brk?'<button class="btn btn-s sm" data-act="finish">Concluir</button>':'')+'</div>';
    root.innerHTML=h;
  }
  var r=remaining(),ck=d.getElementById('pclock'),bar=d.getElementById('pbar');
  if(ck)ck.textContent=mmss(r);
  if(bar&&se.total)bar.style.width=Math.max(0,Math.min(100,(1-r/se.total)*100))+'%';
}
function autoPip(){if(PIPOK&&DESK&&pipAuto()&&!pip&&S.session)openPip()}
function timerSettings(){
  var h='';
  if('Notification' in window&&DESK){
    var p=Notification.permission;
    h+='<div><span class="lab">Avisos do timer</span><p class="sync" style="margin:0 0 10px">'+(p==='granted'?'Ligados. Você recebe um aviso do sistema quando o tempo acabar, mesmo em outra aba.':(p==='denied'?'Bloqueados neste navegador. Clique no cadeado ao lado do endereço e libere as notificações.':'Desligados. Ative para ser avisado quando o tempo acabar.'))+'</p>'+(p==='default'?'<div class="btns"><button class="btn btn-s sm" data-act="notif">Ativar avisos</button></div>':'')+'</div>';
  }
  if(SBCFG&&SBCFG.vapid){
    var ps=pushState,pt='';
    if(ps==='on')pt='Ligados neste aparelho. Quando o tempo acabar você recebe um aviso, mesmo com a tela bloqueada.';
    else if(ps==='off')pt='Desligados neste aparelho. Ative para ser avisado quando o tempo acabar, mesmo com a tela bloqueada.';
    else if(ps==='denied')pt='Bloqueados. Libere as notificações do Prumo nos ajustes do celular ou do navegador.';
    else if(ps==='ios-install')pt='No iPhone, primeiro instale o Prumo: Compartilhar, depois Adicionar à Tela de Início. Abra por lá e volte aqui.';
    else if(ps==='boot')pt='Verificando...';
    else if(ps==='sw')pt='O serviço do app ainda não iniciou. Feche o app, abra de novo e toque em Verificar.';
    else if(ps==='err')pt='Não consegui verificar os avisos. Toque em Verificar.';
    else pt='Este aparelho ou navegador não suporta avisos com o app fechado. No iPhone é preciso o iOS 16.4 ou mais novo.';
    h+='<div><span class="lab">Aviso com a tela bloqueada</span><p class="sync" style="margin:0 0 10px">'+pt+'</p>'+(ps==='off'?'<div class="btns"><button class="btn btn-s sm" data-act="push-on">Ativar avisos neste aparelho</button></div>':'')+(ps==='on'?'<span class="lab" style="margin-top:6px">Resumo do dia por aviso</span><div class="chips" style="margin-bottom:10px">'+[['off','Desligado'],['7','7h'],['8','8h'],['9','9h']].map(function(x){var cur=briefHour(),on=(x[0]==='off'?cur===null:cur===Number(x[0]));return chip(x[1],on,'data-act="brief" data-v="'+x[0]+'"')}).join('')+'</div><div class="btns"><button class="btn btn-s sm" data-act="push-test">Testar em 15 s</button><button class="btn btn-s sm" data-act="push-off">Desligar</button></div>':'')+(ps!=='on'&&ps!=='off'?'<div class="btns"><button class="btn btn-s sm" data-act="push-check">Verificar de novo</button></div>':'')+'<p class="sync" style="margin:10px 0 0;font-size:12px">'+esc(pushDiag||'')+' · Versão '+BUILD+'</p></div>';
  }
  if(PIPOK&&DESK)h+='<div><span class="lab">Janela flutuante</span><div class="btns"><button class="btn btn-s sm" data-act="pip-auto">Abrir ao dar play: '+(pipAuto()?'ligado':'desligado')+'</button></div></div>';
  return h;
}
function focusSecs(fw,t){if(fw==='pomodoro')return 1500;if(fw==='timebox')return Math.max(5,t?t.est:25)*60;if(fw==='cinco')return 300;return 120}
function remaining(){var se=S.session;if(!se)return 0;return se.running?Math.max(0,Math.ceil((se.endsAt-Date.now())/1000)):se.left}
function logFocus(t,secs){secs=Math.max(0,Math.round(secs));if(!secs)return;if(t)t.focus=(t.focus||0)+secs;var d=todayISO();S.log[d]=(S.log[d]||0)+secs}
function settleFocus(){var se=S.session;if(!se||se.phase!=='focus'||se.alerted)return;logFocus(se.tid?byId(se.tid):null,se.total-remaining())}
function startPhase(kind,total){var se=S.session;se.phase=kind;se.total=total;se.left=total;se.endsAt=Date.now()+total*1000;se.running=true;se.alerted=false;lock();persist();render()}
function startSession(id,fw){
  var t=id?byId(id):null;
  if(id&&!t)return;
  if(t&&S.session&&S.session.tid===id){tab='foco';render();scrollTop();return}
  if(t&&t.status!=='doing'&&S.tasks.filter(function(x){return x.status==='doing'&&x.id!==t.id}).length>=WIP){toast('Já são 3 em andamento. Conclua uma antes de começar outra.');return}
  if(S.session){settleFocus();S.session=null}
  var f=fw||(t?fwOf(t):'cinco'),total=focusSecs(f,t);
  ensureAudio();askNotif();
  S.session={tid:id||null,fw:f,phase:'focus',total:total,endsAt:Date.now()+total*1000,left:total,running:true,alerted:false,pomos:0,warned:false};
  if(t)t.status='doing';
  tab='foco';persist();lock();render();scrollTop();autoPip();
}
function onPhaseEnd(){
  var se=S.session;if(!se)return;
  se.running=false;se.left=0;se.alerted=true;
  var t=se.tid?byId(se.tid):null;
  if(se.phase==='focus'){logFocus(t,se.total);if(se.fw==='pomodoro'){se.pomos++;if(t)t.pomos=(t.pomos||0)+1}}
  persist();unlock();beep();notify(se,t);
  if(tab!=='foco')toast('Tempo! Volte ao Foco.');
  render();
}
function tick(){
  var se=S.session;
  if(!se){setTitle('Prumo');return}
  var r=remaining(),c=$('#clock');
  var mt=document.getElementById('mini-t');if(mt)mt.textContent=mmss(r);
  if(c){c.textContent=mmss(r);var f=$('#ring-fg');if(f&&se.total)f.style.strokeDashoffset=String(2*Math.PI*108*(1-r/se.total))}
  if(se.running&&r<=0&&!se.alerted)onPhaseEnd();
  var tk=se.tid?byId(se.tid):null,nm=tk?tk.title:'Foco';
  setTitle(se.alerted?((Math.floor(Date.now()/1000)%2)?'Tempo! · Prumo':'00:00 · '+nm):(se.running?'':'Pausado · ')+mmss(remaining())+' · '+nm);
  if(pip)renderPip();
}
function finishSession(){
  var se=S.session;if(!se||!se.tid)return;
  var t=byId(se.tid);
  if(t&&t.dod&&t.dod.length&&t.dod.some(function(x){return !x.d})&&!se.warned){se.warned=true;toast('Faltam itens em "Pronto quando". Toque de novo para concluir mesmo assim.');return}
  settleFocus();S.session=null;unlock();
  if(t)markDone(t);
  persist();tab='hoje';render();scrollTop();toast('Tarefa concluída.');
}

