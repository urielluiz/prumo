/* ---------- eventos ---------- */
function act(a,el){
  var id=el.dataset.id;
  // folha de tarefa nova: ao tocar num controle, o que o texto reconheceu vira escolha
  if(sh&&sh.kind==='task'&&/^(sh-(day|multi|est|est-other|ctx|rec|urg|imp|fw|sec)|cal-|rec-|st-)/.test(a))absorb();
  switch(a){
    case 'tab':tab=el.dataset.t;render();scrollTop();(function(){var v=$('#view');if(v){v.classList.remove('vin');void v.offsetWidth;v.classList.add('vin')}})();break;
    case 'wr-open':wrOpen(el.dataset.wk||curWk());break;
    case 'wr-close':wrClose();break;
    case 'wr-copy':copyText(summaryTextFor(wr?wr.wk:curWk()),'Resumo copiado.');break;
    case 'wr-write':{var w0=wr?wr.wk:curWk();wrClose(true);tab='revisao';revMode='rev';wkOff=Math.round((parseISO(w0)-parseISO(weekStart(todayISO())))/604800000);render();scrollTop();setTimeout(function(){var i=$('#rt-worked');if(i)i.focus()},80);break}
    case 'new':{var dv=el.dataset.day;openTask(null,dv===undefined?todayISO():(dv==='none'?null:dv));break}
    case 'edit':openTask(id);break;
    case 'toggle':toggleDone(id);break;
    case 'mit':if(sh&&sh.kind==='menu'){sh=null;renderSheet()}toggleMit(id);break;
    case 'start':if(sh&&sh.kind==='menu'){sh=null;renderSheet()}startSession(id);break;
    case 'start5':startSession(id||null,'cinco');break;
    case 'mtoday':{var t=byId(id);if(t){t.day=todayISO();delete t.end;t.slips=(t.slips||0)+1;persist();render();toast('Movida para hoje.')}break}
    case 'drop':dropTask(id);break;
    case 'clear-ex':S.tasks=S.tasks.filter(function(t){return !t.ex});if(S.session&&!byId(S.session.tid)&&S.session.tid){S.session=null;unlock()}persist();render();toast('Exemplos removidos. Agora é com você.');break;
    case 'wk':{var d=Number(el.dataset.d);wkOff=d===0?0:wkOff+d;render();break}
    case 'plan':sh={kind:'plan'};renderSheet();break;
    case 'cap':{var i=Number(el.dataset.i),dl=Number(el.dataset.d);S.cap[i]=Math.max(0,Math.min(720,(S.cap[i]||0)+dl));persist();renderSheet();render();break}
    case 'autoplan':autoPlan();break;
    case 'push-later':try{localStorage.setItem('prumo.pushno','1')}catch(e){}render();break;
    case 'brief':try{localStorage.setItem('prumo.brief',el.dataset.v)}catch(e){}remSig='';if(el.dataset.v==='off'&&SB&&SBU)SB.from('prumo_reminders').delete().eq('user_id',SBU).eq('sent',false).then(function(){},function(){});else remSync();render();break;
    case 'push-check':pushState='boot';pushRefresh();break;
    case 'push-on':pushEnable();break;
    case 'push-off':pushDisable();break;
    case 'push-test':pushTest();break;
    case 'rev':revMode=el.dataset.v;render();scrollTop();break;
    case 'drange':dashRange=el.dataset.v;render();break;
    case 'rowdel':if(sh&&sh.kind==='menu'){sh=null;renderSheet()}dropTask(el.dataset.id);break;
    case 'rowmenu':closeSwipe();sh={kind:'menu',id:el.dataset.id};renderSheet();break;
    case 'mv':{var mid=el.dataset.id,md=el.dataset.d||null,inLate=sh&&sh.kind==='late';closeSwipe();var was=moveTask(mid,md);if(!was)break;
      if(inLate&&overdue().length)renderSheet();else{sh=null;renderSheet()}
      render();toast('Movida para '+(md?relDay(md):'Sem data')+'.','Desfazer',function(){undoMove(mid,was)});flashTask(mid);break}
    case 'late':sh={kind:'late'};renderSheet();break;
    case 'note':sh={kind:'note'};renderSheet();setTimeout(function(){var i=$('#blk');if(i)i.focus()},60);break;
    case 'fold':doneOpen=!doneOpen;render();break;
    case 'sem':{var sd=Number(el.dataset.d);semOff=sd===0?0:Math.max(0,semOff+sd);render();scrollTop();break}
    case 'goday':{var gd=document.getElementById('d-'+el.dataset.d);if(gd)try{gd.scrollIntoView({block:'start',behavior:RM?'auto':'smooth'})}catch(x){gd.scrollIntoView()}break}
    case 'sh-close':{var wasNote=sh&&sh.kind==='note';if(sh&&sh.kind==='help'&&helpPrev){sh=helpPrev;helpPrev=null}else sh=null;renderSheet();if(wasNote)render();break}
    case 'sh-save':saveTask();break;
    case 'sh-del':{var tt=sh.mode==='edit'&&byId(sh.id);if(tt&&tt.rid&&S.rec[tt.rid]){sh.del=!sh.del;renderSheet()}else if(!sh.del){sh.del=true;renderSheet()}else{var did=sh.id;sh=null;renderSheet();dropTask(did)}break}
    case 'sh-usesug':sh.d.fw=null;renderSheet();break;
    case 'sh-sec':{var sv=el.dataset.v;if(/^(when|est|ctx|rep)$/.test(sv)){sh.open=sh.open===sv?null:sv;sh.pick=null}else sh.more=sv==='more'?!sh.more:true;renderSheet();if(sv==='more'&&sh.more){var mo=document.querySelector('.tk-opts');if(mo)try{mo.scrollIntoView({block:'nearest',behavior:RM?'auto':'smooth'})}catch(x){}}break}
    case 'tok-off':sh.off[el.dataset.v]=true;renderSheet();fitTitle();break;
    case 'sh-multi':sh.multi=el.dataset.v==='1';sh.pick=null;if(!sh.multi)sh.d.end=null;renderSheet();break;
    case 'cal-mon':{var cm=sh.mon.split('-').map(Number),cn=new Date(cm[0],cm[1]-1+Number(el.dataset.v),1);sh.mon=cn.getFullYear()+'-'+pad(cn.getMonth()+1);renderSheet();break}
    case 'cal-day':{var cv=el.dataset.v;if(!sh.multi){sh.d.day=cv;sh.d.end=null}else if(!sh.pick){sh.pick=cv}else{var ca=sh.pick,cz=cv;if(cz<ca){var cx=ca;ca=cz;cz=cx}sh.d.day=ca;sh.d.end=cz===ca?null:cz;sh.pick=null}renderSheet();break}
    case 'st-add':addStep();break;
    case 'st-del':sh.d.dod.splice(Number(el.dataset.v),1);renderSheet();break;
    case 'st-tog':{var so=sh.d.dod[Number(el.dataset.v)];if(so)so.d=!so.d;renderSheet();break}
    case 'sh-est-other':sh.estOpen=true;renderSheet();setTimeout(function(){var i=$('#f-est');if(i)i.focus()},40);break;
    case 'sh-rec':{var v=el.dataset.v;if(v==='none')sh.d.rec=null;else if(v==='weekly')sh.d.rec={t:'weekly',dows:(sh.d.rec&&sh.d.rec.t==='weekly'&&sh.d.rec.dows&&sh.d.rec.dows.length)?sh.d.rec.dows:[parseISO(sh.d.day||todayISO()).getDay()]};else sh.d.rec={t:v};if(sh.d.rec){sh.d.end=null;sh.multi=false;sh.pick=null}renderSheet();break}
    case 'rec-dow':{var w=Number(el.dataset.v),ds=(sh.d.rec&&sh.d.rec.dows||[]).slice(),ix=ds.indexOf(w);if(ix>=0){if(ds.length>1)ds.splice(ix,1)}else ds.push(w);sh.d.rec.dows=ds;renderSheet();break}
    case 'rec-all':sh.d.recAll=!sh.d.recAll;renderSheet();break;
    case 'sh-del1':{var d1=sh.id;sh=null;renderSheet();dropTask(d1);break}
    case 'sh-delall':{var d2=sh.id;sh=null;renderSheet();endSeries(d2);break}
    case 'help':helpPrev=(sh&&sh.kind==='task')?sh:null;sh={kind:'help'};renderSheet();break;
    case 'pw-open':sh={kind:'pw'};renderSheet();break;
    case 'pw-save':savePw();break;
    case 'sh-ctx':sh.d.ctx=el.dataset.v;renderSheet();break;
    case 'sh-day':sh.d.day=el.dataset.v==='none'?null:el.dataset.v;sh.d.end=null;sh.multi=false;sh.pick=null;if(sh.d.day)sh.mon=(sh.d.day>todayISO()?sh.d.day:todayISO()).slice(0,7);renderSheet();break;
    case 'sh-est':sh.d.est=Number(el.dataset.v);sh.estOpen=false;renderSheet();break;
    case 'sh-urg':sh.d.urg=!sh.d.urg;renderSheet();break;
    case 'sh-imp':sh.d.imp=!sh.d.imp;renderSheet();break;
    case 'sh-fw':sh.d.fw=el.dataset.v;renderSheet();break;
    case 'pause':{var se=S.session;if(se&&se.running){se.left=remaining();se.running=false;se.endsAt=null;unlock();persist();render()}break}
    case 'resume':{var s2=S.session;if(s2&&!s2.running){ensureAudio();s2.endsAt=Date.now()+s2.left*1000;s2.running=true;lock();persist();render()}break}
    case 'plus':{var s3=S.session;if(s3){s3.total+=300;if(s3.running)s3.endsAt+=300000;else s3.left+=300;persist();tick()}break}
    case 'finish':finishSession();break;
    case 'stop':settleFocus();S.session=null;unlock();persist();render();break;
    case 'next-break':{var s4=S.session;if(s4)startPhase('break',(s4.pomos%4===0?15:5)*60);break}
    case 'next-focus':{var s5=S.session;if(s5)startPhase('focus',focusSecs(s5.fw,s5.tid?byId(s5.tid):null));break}
    case 'more':{var s6=S.session;if(s6)startPhase('focus',(s6.fw==='dois'?2:10)*60);break}
    case 'cont25':{var s7=S.session;if(s7){s7.fw='pomodoro';startPhase('focus',1500)}break}
    case 'dod':{var dt=byId(id);if(dt&&dt.dod[Number(el.dataset.i)]){var x=dt.dod[Number(el.dataset.i)];x.d=!x.d;persist();render()}break}
    case 'pip':openPip();break;
    case 'pip-auto':try{localStorage.setItem('prumo.pip',pipAuto()?'off':'on')}catch(e){}render();break;
    case 'notif':try{Notification.requestPermission().then(function(){render()})}catch(e){}break;
    case 'perfil':if(tab!=='perfil')prevTab=tab;tab='perfil';render();scrollTop();break;
    case 'perfil-back':tab=prevTab||'hoje';render();scrollTop();break;
    case 'photo-del':removePhoto();break;
    case 'export':exportData();break;
    case 'del-open':sh={kind:'del'};renderSheet();setTimeout(function(){var i=$('#del-pw');if(i)i.focus()},50);break;
    case 'del-go':deleteAccount();break;
    case 'lock':logout('local');break;
    case 'lock-all':if(confirm('Encerrar a sessão em todos os aparelhos? Você vai precisar entrar de novo em cada um.'))logout('global');break;
    case 'copy-summary':copyText(summaryText(),'Resumo copiado.');break;
    case 'copy-backup':copyText(JSON.stringify(Object.assign({},S,{session:null})),'Backup copiado.');break;
    case 'restore':{
      try{var o=JSON.parse(restoreTxt);if(!o||!Array.isArray(o.tasks))throw 0;S=Object.assign(blank(),o,{session:null},{u:S.u,dirty:S.dirty,del:S.del,synced:S.synced,owner:S.owner,prof:S.prof});restoreTxt='';persist();render();toast('Backup restaurado.')}
      catch(e){toast('Esse texto não parece um backup do Prumo.')}
      break}
    case 'toast-act':{var fn=toastFn;toastFn=null;$('#toast').hidden=true;if(fn)fn();break}
  }
}
document.addEventListener('click',function(e){
  var el=e.target.closest('[data-act]');if(!el)return;
  act(el.dataset.act,el);
});
document.addEventListener('input',function(e){
  var el=e.target,k=el.dataset&&el.dataset.in;if(!k)return;
  if(k==='title'){if(sh&&sh.kind==='task'){sh.d.raw=el.value.replace(/\n/g,' ');liveTask()}}
  else if(k==='gname'||k==='gn'||k==='gest'||k==='pstart'||k==='pn'||k==='pest'){if(sh){sh.g=sh.g||{name:'',n:'1',est:''};sh.g[{gname:'name',gn:'n',gest:'est',pstart:'pstart',pn:'pn',pest:'pest'}[k]]=el.value}}
  else if(k==='real'){if(sh&&sh.d)sh.d.real=el.value}
  else if(k==='blk'){var td=todayISO();if(el.value.trim())S.blockers[td]=el.value;else delete S.blockers[td];persist()}
  else if(k==='retro'){var wk=curWk();S.retro[wk]=S.retro[wk]||{};S.retro[wk][el.dataset.f]=el.value;persist()}
  else if(k==='ctxname'){S.ctx=S.ctx||{};var v=el.value.trim();if(v)S.ctx[el.dataset.c]=v;else delete S.ctx[el.dataset.c];persist()}
  else if(k==='restore'){restoreTxt=el.value}
  else if(k==='pname'){S.prof=Object.assign({},S.prof,{name:cleanName(el.value).trim()});persist()}
  else if(k==='est'){var n=Math.round(Number(el.value));if(n>=1&&n<=960&&sh&&sh.d){sh.d.est=n;Array.prototype.forEach.call(document.querySelectorAll('[data-act="sh-est"]'),function(b){b.setAttribute('aria-pressed',String(Number(b.dataset.v)===n))});var pn=document.getElementById('pomo-n');if(pn)pn.textContent=pomoText(sh.d,sh.d.fw||suggestFw(sh.d));var sm=document.getElementById('tk-pills');if(sm&&sh.kind==='task')liveTask();var cf=sh.d.fw||suggestFw(sh.d);Array.prototype.forEach.call(document.querySelectorAll('[data-act="sh-fw"]'),function(b){b.setAttribute('aria-pressed',String(b.dataset.v===cf))})}}
});
document.addEventListener('change',function(e){
  var el=e.target;
  if(el.dataset&&el.dataset.in==='date'&&sh&&sh.d){
    // não redesenha a folha: no iPhone isso destrói o campo e fecha o calendário nativo no meio da escolha
    sh.d.day=el.value||null;
    var lab=el.parentNode;if(lab&&lab.firstChild&&lab.firstChild.nodeType===3)lab.firstChild.nodeValue=el.value?shortDate(el.value):'Outra data';
    Array.prototype.forEach.call(document.querySelectorAll('[data-act="sh-day"]'),function(b){b.setAttribute('aria-pressed','false')});
    if(lab)lab.setAttribute('aria-pressed',String(!!el.value));
  }
  if(el.dataset&&el.dataset.in==='photo'&&el.files&&el.files[0]){var f=el.files[0];el.value='';setPhoto(f)}
});
document.addEventListener('keydown',function(e){
  if(e.key==='Escape'&&sh){sh=null;renderSheet()}
  if(e.key==='Enter'&&e.target&&e.target.id==='f-title'){e.preventDefault();saveTask()}
  if(e.key==='Enter'&&e.target&&e.target.id==='f-step'){e.preventDefault();addStep()}
  if(e.key==='Enter'&&e.target&&e.target.id==='blk'){e.target.blur()}
});
document.addEventListener('visibilitychange',function(){
  if(document.visibilityState==='visible'){lock();tick();pullRemote();if(SBU)syncNow(true);rolloverRec()}
});

document.addEventListener('keydown',function(e){
  var t=e.target,tag=t&&t.tagName;
  if(e.metaKey||e.ctrlKey||e.altKey||sh)return;
  if(tag==='INPUT'||tag==='TEXTAREA'||tag==='SELECT'||(t&&t.isContentEditable))return;
  var g=document.getElementById('gate');if(g&&!g.hidden)return;
  var k=e.key;
  if(k==='n'||k==='N'){e.preventDefault();act('new',{dataset:{}})}
  else if(k==='1'||k==='2'||k==='3'||k==='4'){var TT=['hoje','semana','foco','revisao'];act('tab',{dataset:{t:TT[Number(k)-1]}})}
  else if(k===' '&&tag!=='BUTTON'&&S.session&&!S.session.alerted){e.preventDefault();act(S.session.running?'pause':'resume',{dataset:{}})}
});

