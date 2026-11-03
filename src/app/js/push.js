/* ---------- aviso push (tela bloqueada) ---------- */
var pushState='boot',tmLast='-';
var IOSDEV=/iphone|ipad|ipod/i.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
var STANDALONE=(window.matchMedia&&matchMedia('(display-mode: standalone)').matches)||navigator.standalone===true;
function b64u(s){var p='='.repeat((4-s.length%4)%4),b=(s+p).replace(/-/g,'+').replace(/_/g,'/'),r=atob(b),o=new Uint8Array(r.length);for(var i=0;i<r.length;i++)o[i]=r.charCodeAt(i);return o}
var BUILD='__BUILD__',pushDiag='';
function pushBanner(){
  if(pushState!=='off')return '';
  try{if(localStorage.getItem('prumo.pushno')==='1')return ''}catch(e){}
  return '<div class="banner"><span>Quer ser avisado quando o tempo acabar, mesmo com a tela bloqueada?</span><button class="btn btn-p sm" data-act="push-on">Ativar</button><button class="btn btn-s sm" data-act="push-later">Agora não</button></div>';
}
async function pushRefresh(){
  var st='na',hasN='Notification' in window,hasPM='PushManager' in window,hasSW='serviceWorker' in navigator,swOK='-';
  try{
    if(!SBCFG||!SBCFG.vapid||!hasSW||!hasPM||!hasN){st=(IOSDEV&&!STANDALONE)?'ios-install':'na'}
    else if(Notification.permission==='denied')st='denied';
    else{
      var reg=await Promise.race([navigator.serviceWorker.ready,new Promise(function(r){setTimeout(function(){r(null)},5000)})]);
      if(!reg){st='sw';swOK='não iniciou'}
      else{swOK='ativo';var sub=await reg.pushManager.getSubscription();st=(sub&&Notification.permission==='granted')?'on':'off'}
    }
  }catch(e){st='err';swOK='erro: '+(e&&e.message||e)}
  var vm=(navigator.userAgent.match(/OS (\d+)[_.](\d+)/)||[]);
  pushDiag='Instalado na tela de início: '+(STANDALONE?'sim':'não')+' · Push: '+(hasPM?'sim':'não')+' · Notificações: '+(hasN?'sim':'não')+' · Serviço do app: '+swOK+' · Permissão: '+(hasN?Notification.permission:'-')+(vm.length?' · iOS '+vm[1]+'.'+vm[2]:'');
  if(st!==pushState){pushState=st;tmLast='-'}
  if(tab==='revisao'&&!sh)render();
  if(st==='on'){timerSync(true);remSync()}
}
async function pushEnable(){
  try{
    if(!SB||!SBU){toast('Entre na conta primeiro.');return}
    var perm=await Notification.requestPermission();
    if(perm!=='granted'){toast('Permissão negada. Libere nas configurações do celular.');pushRefresh();return}
    var reg=await navigator.serviceWorker.ready,sub=await reg.pushManager.getSubscription();
    if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64u(SBCFG.vapid)});
    var j=sub.toJSON(),r=await SB.from('prumo_push_subs').upsert({endpoint:j.endpoint,p256dh:j.keys.p256dh,auth:j.keys.auth},{onConflict:'endpoint'});
    if(r&&r.error)throw r.error;
    toast('Avisos ligados neste aparelho.');
  }catch(e){toast('Não consegui ligar os avisos. Tente de novo.')}
  pushRefresh();
}
async function pushDisable(){
  try{
    var reg=await navigator.serviceWorker.ready,sub=await reg.pushManager.getSubscription();
    if(sub){var ep=sub.endpoint;await sub.unsubscribe();if(SB)await SB.from('prumo_push_subs').delete().eq('endpoint',ep)}
    if(SB&&SBU)await SB.from('prumo_timers').delete().eq('user_id',SBU);
    toast('Avisos desligados neste aparelho.');
  }catch(e){}
  pushRefresh();
}
async function pushTest(){
  if(!SB||!SBU||pushState!=='on')return;
  var r=await SB.from('prumo_timers').upsert({user_id:SBU,ends_at:new Date(Date.now()+15000).toISOString(),title:'Prumo · Teste',body:'Se você viu isto, os avisos funcionam. Pode desbloquear.',sent:false},{onConflict:'user_id'});
  tmLast='-';
  toast(r&&r.error?'Não consegui agendar o teste.':'Teste em 15 s. Bloqueie a tela agora.');
}
var remSig='',remT=null;
function briefHour(){try{var v=localStorage.getItem('prumo.brief');return v===null?8:(v==='off'?null:Number(v))}catch(e){return 8}}
function remBuild(){
  var h=briefHour();
  var out=[],td=todayISO(),now=Date.now();
  for(var j=0;j<14;j++){
    var wd=addDays(td,j),wp=parseISO(wd);if(wp.getDay()!==0)continue;wp.setHours(19,0,0,0);
    if(wp.getTime()<=now+60000)continue;
    out.push({day:wd,kind:'wrap',url:'./?retro=1',fire_at:wp.toISOString(),title:'Prumo · Sua semana está pronta',body:'Toque para ver a retrô: números, foco e conquistas.'});
  }
  if(h==null)return out;
  for(var i=0;i<8;i++){
    var d=addDays(td,i),p=parseISO(d);p.setHours(h,0,0,0);
    if(p.getTime()<=now+60000)continue;
    var l=tasksOn(d).filter(function(t){return !isDone(t)&&!isGrp(t)});
    if(!l.length)continue;
    var by={};l.forEach(function(t){var par=t.parent&&byId(t.parent),k=par?par.title:t.title;by[k]=(by[k]||0)+t.est});
    var ks=Object.keys(by).sort(function(a,b){return by[b]-by[a]});
    out.push({day:d,kind:'day',fire_at:p.toISOString(),title:'Prumo · Hoje: '+l.length+(l.length>1?' tarefas':' tarefa')+', '+fmt(sum(l,function(t){return t.est})),body:(ks.slice(0,3).map(function(k){return fmt(by[k])+' em '+k}).join(' · ')+(ks.length>3?' · +'+(ks.length-3):'')).slice(0,1000),sent:false});
  }
  return out;
}
async function remSync(){
  if(!SB||!SBU||pushState!=='on')return;
  var rows=remBuild(),sig=JSON.stringify(rows.map(function(r){return [r.day,r.kind,r.fire_at,r.title,r.body]}));
  if(sig===remSig)return;
  remSig=sig;
  try{
    await SB.from('prumo_reminders').delete().eq('user_id',SBU).eq('sent',false);
    if(rows.length)await SB.from('prumo_reminders').upsert(rows,{onConflict:'user_id,day,kind'});
  }catch(e){remSig=''}
}
function timerSync(force){
  if(!SB||!SBU||pushState!=='on')return;
  var se=S.session,run=!!(se&&se.running&&se.endsAt),sig=run?(se.endsAt+'|'+se.phase+'|'+se.tid):'-';
  if(sig===tmLast&&!force)return;
  if(force&&sig==='-'&&tmLast==='-')return;
  tmLast=sig;
  if(!run){SB.from('prumo_timers').delete().eq('user_id',SBU).then(function(){},function(){});return}
  var t=se.tid?byId(se.tid):null,brk=se.phase==='break';
  SB.from('prumo_timers').upsert({user_id:SBU,ends_at:new Date(se.endsAt).toISOString(),title:brk?'Prumo · A pausa acabou':(se.fw==='pomodoro'?'Prumo · Pomodoro completo':'Prumo · Tempo esgotado'),body:(brk?'Volte ao foco quando estiver pronto.':((t?t.title+'. ':'')+'Toque para abrir.')).slice(0,1000),sent:false},{onConflict:'user_id'}).then(function(){},function(){});
}
