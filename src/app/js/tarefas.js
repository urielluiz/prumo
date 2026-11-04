/* ---------- acoes sobre tarefas ---------- */
function toggleDone(id){
  var t=byId(id);if(!t)return;
  if(isDone(t)){t.status='todo';t.doneAt=null}
  else{
    t.status='done';t.doneAt=Date.now();t.day=todayISO();t.mit=t.mit;
    if(S.session&&S.session.tid===id){settleFocus();S.session=null;unlock()}
    var left=tasksOn(todayISO()).filter(function(x){return !isDone(x)}).length;
    popId=id;if(left===0)confetti(document.body,46);
    toast(left===0?'Dia fechado. Bom trabalho.':'Feito. Faltam '+left+' hoje.');
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
  var ids=[id].concat(kidsOf(id).map(function(c){return c.id})),gone=S.tasks.filter(function(t){return ids.indexOf(t.id)>=0});
  var skipped=[];gone.forEach(function(t){if(t.rid&&S.rec&&S.rec[t.rid]){var k=t.od||t.day,sk=S.rec[t.rid].skip=S.rec[t.rid].skip||[];if(sk.indexOf(k)<0){sk.push(k);skipped.push([t.rid,k])}}});
  S.tasks=S.tasks.filter(function(t){return ids.indexOf(t.id)<0});
  if(S.session&&ids.indexOf(S.session.tid)>=0){S.session=null;unlock()}
  persist();render();
  toast(gone.length>1?'Pauta e '+(gone.length-1)+' entregas excluídas.':'Tarefa excluída.','Desfazer',function(){gone.forEach(function(t){S.tasks.push(t)});skipped.forEach(function(x){var a=S.rec&&S.rec[x[0]];if(a)a.skip=(a.skip||[]).filter(function(d){return d!==x[1]})});persist();render()});
}
function autoPlan(){
  var wk=curWk(),td=todayISO();
  var days=[0,1,2,3,4,5,6].map(function(i){return addDays(wk,i)}).filter(function(d){return d>=td});
  if(!days.length){toast('Esta semana já passou. Vá para a próxima.');return}
  var load={};days.forEach(function(d){load[d]=sum(tasksOn(d),function(t){return t.est})});
  var cap=function(d){return S.cap[parseISO(d).getDay()]||0};
  var pool=S.tasks.filter(function(t){return !t.day&&!isDone(t)&&!isGrp(t)}).sort(function(a,b){return quad(a)-quad(b)||(b.slips||0)-(a.slips||0)||b.est-a.est});
  var placed=0,left=0;
  pool.forEach(function(t){
    var d=days.find(function(x){return load[x]+t.est<=cap(x)});
    if(d){t.day=d;load[d]+=t.est;placed++}else left++;
  });
  persist();render();renderSheet();
  toast(placed?(placed+' tarefa'+(placed>1?'s':'')+' distribuída'+(placed>1?'s':'')+(left?'. '+left+' sem espaço.':'.')):(left?'Nenhuma coube na capacidade. Aumente os dias ou tire algo.':'O backlog está vazio.'));
}
// Depois de criar ou salvar: diz para onde a tarefa foi e leva até ela
function firstDay(t){var k=kidsOf(t.id).map(function(c){return c.day}).filter(Boolean).sort();return t.day||k[0]||null}
function whereText(t,isNew){
  var k=kidsOf(t.id),d=firstDay(t),v=isNew?'criada':'salva';
  if(k.length&&!t.day&&d)return (isNew?'Pauta criada':'Pauta salva')+': '+k.length+(k.length>1?' etapas':' etapa')+' a partir de '+shortDate(d)+'.';
  if(!d)return 'Tarefa '+v+' no backlog, sem data.';
  return 'Tarefa '+v+' para '+(d===todayISO()?'hoje':shortDate(d))+'.';
}
function flashTask(id){
  setTimeout(function(){var el=document.querySelector('[data-tid="'+id+'"]');if(!el)return;el.classList.remove('flash');void el.offsetWidth;el.classList.add('flash');try{el.scrollIntoView({block:'center',behavior:RM?'auto':'smooth'})}catch(e){}},60);
}
function showTask(id){
  var t=byId(id);if(!t)return;
  var d=firstDay(t),td=todayISO(),k=kidsOf(id),target=id;
  if(d===td&&!k.length)tab='hoje';
  else{tab='semana';wkOff=d?Math.round((parseISO(weekStart(d))-parseISO(weekStart(td)))/604800000):0;selDay=d;
    var kd=d&&k.find(function(c){return c.day===d});if(kd)target=kd.id}
  sh=null;renderSheet();render();scrollTop();flashTask(target);
}
