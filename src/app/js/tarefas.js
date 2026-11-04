/* ---------- acoes sobre tarefas ---------- */
function toggleDone(id){
  var t=byId(id);if(!t)return;
  if(isDone(t)){t.status='todo';t.doneAt=null}
  else{
    var u0=dayUnits(todayISO());
    markDone(t);
    if(S.session&&S.session.tid===id){settleFocus();S.session=null;unlock()}
    var left=tasksOn(todayISO()).filter(function(x){return !isDone(x)}).length;
    popId=id;if(left===0)confetti(document.body,46);
    var mt=gMeta(),firm=u0<mt&&dayUnits(todayISO())>=mt;
    toast(firm?'Dia firme. Mais um tijolo na obra.':(left===0?'Tudo feito por hoje. Bom trabalho.':'Feito. Faltam '+left+' hoje.'));
  }
  persist();render();
}
function toggleMit(id){
  var t=byId(id);if(!t)return;
  if(!t.mit){
    var n=S.tasks.filter(function(x){return x.day===t.day&&x.mit&&!isDone(x)}).length;
    if(n>=MAXMIT){toast('Só 3 prioridades por dia. Tire uma estrela antes.');return}
  }
  t.mit=!t.mit;persist();render();
}
function dropTask(id){
  var t0=byId(id);if(!t0)return;
  var ids=[id],gone=[t0];
  var skipped=[];gone.forEach(function(t){if(t.rid&&S.rec&&S.rec[t.rid]){var k=t.od||t.day,sk=S.rec[t.rid].skip=S.rec[t.rid].skip||[];if(sk.indexOf(k)<0){sk.push(k);skipped.push([t.rid,k])}}});
  S.tasks=S.tasks.filter(function(t){return ids.indexOf(t.id)<0});
  if(S.session&&ids.indexOf(S.session.tid)>=0){S.session=null;unlock()}
  persist();render();
  toast('Tarefa excluída.','Desfazer',function(){gone.forEach(function(t){S.tasks.push(t)});skipped.forEach(function(x){var a=S.rec&&S.rec[x[0]];if(a)a.skip=(a.skip||[]).filter(function(d){return d!==x[1]})});persist();render()});
}
function autoPlan(){
  var wk=curWk(),td=todayISO();
  var days=[0,1,2,3,4,5,6].map(function(i){return addDays(wk,i)}).filter(function(d){return d>=td});
  if(!days.length){toast('Esta semana já passou. Vá para a próxima.');return}
  var load={};days.forEach(function(d){load[d]=sum(tasksOn(d),function(t){return t.est})});
  var cap=function(d){return S.cap[parseISO(d).getDay()]||0};
  var pool=S.tasks.filter(function(t){return !t.day&&!isDone(t)}).sort(function(a,b){return quad(a)-quad(b)||(b.slips||0)-(a.slips||0)||b.est-a.est});
  var placed=0,left=0;
  pool.forEach(function(t){
    var d=days.find(function(x){return load[x]+t.est<=cap(x)});
    if(d){t.day=d;load[d]+=t.est;placed++}else left++;
  });
  persist();render();renderSheet();
  toast(placed?(placed+' tarefa'+(placed>1?'s':'')+' distribuída'+(placed>1?'s':'')+(left?'. '+left+' sem espaço.':'.')):(left?'Nenhuma coube na capacidade. Aumente os dias ou tire algo.':'Não há tarefas sem data.'));
}
// Concluir: a tarefa passa a "morar" no dia da conclusão; um período termina nesse dia
function markDone(t){
  var td=todayISO();t.status='done';t.doneAt=Date.now();
  if(t.end&&td>=t.day&&td<t.end)t.end=td;
  else{t.day=td;delete t.end}
  if(t.end===t.day)delete t.end;
}
function whenText(t){
  if(!t.day)return 'sem data';
  var td=todayISO(),f=function(d){return d===td?'hoje':shortDate(d)};
  return t.end?'de '+f(t.day)+' a '+f(t.end)+' ('+spanOf(t)+' dias)':'para '+f(t.day);
}
// Depois de criar ou salvar: diz para onde a tarefa foi e leva até ela
function whereText(t,isNew){return 'Tarefa '+(isNew?'criada':'salva')+' '+whenText(t)+'.'}
function flashTask(id){
  setTimeout(function(){var el=document.querySelector('[data-tid="'+id+'"]');if(!el)return;el.classList.remove('flash');void el.offsetWidth;el.classList.add('flash');try{el.scrollIntoView({block:'center',behavior:RM?'auto':'smooth'})}catch(e){}},60);
}
function showTask(id){
  var t=byId(id);if(!t)return;
  var td=todayISO();
  sh=null;renderSheet();
  if(t.day&&covers(t,td)){tab='hoje';if(isDone(t))doneOpen=true;render();scrollTop();flashTask(id);return}
  tab='semana';
  var d=t.day?(t.day<td?td:t.day):null;
  semOff=d?Math.floor(Math.round((parseISO(d)-parseISO(td))/864e5)/7):0;
  render();scrollTop();
  setTimeout(function(){var el=document.getElementById(d?'d-'+d:'d-sem');if(el)try{el.scrollIntoView({block:'start'})}catch(e){}flashTask(id)},30);
}

/* ---------- conversão das antigas pautas (tarefa com filhas) ---------- */
// Plano por vários dias (sessões em dias seguidos) vira um período; entregas viram etapas.
// Nada se perde: foco e pomodoros somam na tarefa, o que já foi concluído fica marcado. Idempotente.
function kidsOf(id){return S.tasks.filter(function(c){return c.parent===id})}
function convertPautas(){
  var changed=false,ids={};S.tasks.forEach(function(t){ids[t.id]=1});
  S.tasks.forEach(function(t){if(t.parent&&!ids[t.parent]){delete t.parent;delete t.type;changed=true}});
  S.tasks.filter(function(g){return !g.parent&&S.tasks.some(function(c){return c.parent===g.id})}).forEach(function(g){
    var k=kidsOf(g.id).sort(function(a,b){return (a.day||'9')<(b.day||'9')?-1:((a.day||'9')>(b.day||'9')?1:(a.title<b.title?-1:1))});
    var days=k.map(function(c){return c.day}).filter(Boolean).filter(function(d,i,a){return a.indexOf(d)===i}).sort();
    var plan=days.length===k.length&&k.every(function(c){return c.type===g.title||/^Sess(ão|ao) \d+$/.test(c.title)});
    var nd=k.filter(isDone).length,all=nd===k.length,dod=(g.dod||[]).slice();
    if(plan){
      var cnt={};k.forEach(function(c){cnt[c.est]=(cnt[c.est]||0)+1});
      g.est=Number(Object.keys(cnt).sort(function(a,b){return cnt[b]-cnt[a]})[0])||g.est;
      if(nd&&!all)k.forEach(function(c){dod.push({t:'Sessão de '+shortDate(c.day),d:isDone(c)})});
    }else{
      k.forEach(function(c){dod.push({t:c.title,d:isDone(c)})});
      var tot=sum(k,function(c){return c.est||0});
      g.est=days.length>1?Math.max(5,Math.round(tot/days.length)):(tot||g.est);
    }
    g.day=days[0]||g.day||null;
    if(days.length>1)g.end=days[days.length-1];else delete g.end;
    g.dod=dod.slice(0,30);
    g.focus=(g.focus||0)+sum(k,function(c){return c.focus||0});
    g.pomos=(g.pomos||0)+sum(k,function(c){return c.pomos||0});
    if(all){g.status='done';g.doneAt=Math.max.apply(null,k.map(function(c){return c.doneAt||0}))||Date.now()}else if(g.status==='done'){g.status='todo';g.doneAt=null}
    if(S.session&&k.some(function(c){return c.id===S.session.tid}))S.session.tid=g.id;
    S.tasks=S.tasks.filter(function(c){return c.parent!==g.id});
    changed=true;
  });
  return changed;
}

/* ---------- mudar de dia direto do card ---------- */
var DAYMV=7;
function moveChips(id){
  var td=todayISO(),h='';
  for(var i=0;i<DAYMV;i++){var d=addDays(td,i);h+='<button class="chip" data-act="mv" data-id="'+id+'" data-d="'+d+'">'+(i===0?'Hoje':i===1?'Amanhã':DABR[parseISO(d).getDay()]+' '+parseISO(d).getDate())+'</button>'}
  return '<div class="chips">'+h+'<button class="chip" data-act="mv" data-id="'+id+'" data-d="">Sem data</button></div>';
}
// período em andamento muda inteiro (mantém a duração); atrasado ou sem data vira um dia só
function moveTask(id,d){
  var t=byId(id);if(!t)return;
  var td=todayISO(),was={day:t.day,end:t.end,mit:t.mit,slips:t.slips||0},late=!!t.day&&lastDay(t)<td&&!isDone(t);
  if(late&&d)t.slips=(t.slips||0)+1;
  var n=t.end&&!late?spanOf(t):1;
  t.day=d||null;if(d&&n>1)t.end=addDays(d,n-1);else delete t.end;
  if(!t.day)t.mit=false;
  persist();
  return was;
}
function undoMove(id,was){var t=byId(id);if(!t)return;t.day=was.day;if(was.end)t.end=was.end;else delete t.end;t.mit=was.mit;t.slips=was.slips;persist();render()}
function menuSheetHTML(){
  var t=byId(sh.id);if(!t){return ''}
  var when=t.day?(t.end?'De '+shortDate(t.day)+' a '+shortDate(t.end):'Para '+(t.day===todayISO()?'hoje':shortDate(t.day))):'Sem data';
  return '<div class="sh-head"><h2 class="h2">'+esc(t.title)+'</h2><button class="ib" data-act="sh-close" aria-label="Fechar">'+ic('x')+'</button></div><p class="hint" style="margin:-8px 0 0">'+esc(when)+'</p>'+
    '<div><span class="lab">'+(t.end&&lastDay(t)>=todayISO()?'Mover o período para começar em':'Mudar para')+'</span>'+moveChips(t.id)+'</div>'+
    '<div class="mlist">'+(isDone(t)?'':'<button data-act="mit" data-id="'+t.id+'">'+ic('star',18)+(t.mit?'Tirar das prioridades':'Marcar como prioridade')+'</button><button data-act="start" data-id="'+t.id+'">'+ic('play',18)+'Começar foco</button>')+
    '<button data-act="edit" data-id="'+t.id+'">'+ic('cal',18)+'Editar tarefa</button><button class="bad" data-act="rowdel" data-id="'+t.id+'">'+ic('trash',18)+'Excluir</button></div>';
}
function lateSheetHTML(){
  var l=overdue();
  return '<div class="sh-head"><h2 class="h2">Ficaram para trás</h2><button class="ib" data-act="sh-close" aria-label="Fechar">'+ic('x')+'</button></div><p class="hint" style="margin:-8px 0 0">Escolha um novo dia para cada uma, ou tire a data.</p>'+
    l.map(function(t){return '<div class="res"><b>'+esc(t.title)+'</b><span class="hint">Era para '+shortDate(lastDay(t))+((t.slips||0)>0?' · adiada '+t.slips+'×':'')+'</span>'+moveChips(t.id)+'</div>'}).join('');
}
function noteSheetHTML(){
  var td=todayISO(),st=streak(),y=S.tasks.filter(function(t){return isDone(t)&&t.doneAt&&iso(new Date(t.doneAt))===addDays(td,-1)}).length;
  return '<div class="sh-head"><h2 class="h2">Check-in</h2><button class="ib" data-act="sh-close" aria-label="Fechar">'+ic('x')+'</button></div>'+
    ((y||st>1)?'<p class="hint" style="margin:-8px 0 0">'+[y?'Ontem você concluiu '+y+'.':'',st>1?'Sequência de '+st+' dias.':''].filter(Boolean).join(' ')+'</p>':'')+
    '<div><label class="lab" for="blk">O que pode te travar hoje?</label><input id="blk" class="inp" data-in="blk" enterkeyhint="done" autocomplete="off" maxlength="200" value="'+esc(S.blockers[td]||'')+'"></div>'+
    '<div class="sh-actions"><button class="btn btn-p" data-act="sh-close">Pronto</button></div>';
}
