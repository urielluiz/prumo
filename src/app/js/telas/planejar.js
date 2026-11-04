/* ---------- planejar a semana (ritual) ---------- */
// Os 7 dias à frente (a partir de amanhã se o dia já foi fechado): carga contra capacidade, o que ficou
// para trás, e uma sugestão de distribuição das tarefas sem data que a pessoa ajusta antes de aplicar.
function wpDays(){var td=todayISO(),s=dayClosed(td)?addDays(td,1):td;return [0,1,2,3,4,5,6].map(function(i){return addDays(s,i)})}
function capOf(d){return S.cap[parseISO(d).getDay()]||0}
function semData(){return S.tasks.filter(function(t){return !t.day&&!isDone(t)&&!t.rid})}
function wpPropose(){
  // depois das 17h a sugestão começa amanhã: o resto de hoje já tem dono
  var days=wpDays().filter(function(d){return d!==todayISO()||new Date().getHours()<17}),load={};days.forEach(function(d){load[d]=dayLoad(d)});
  var pool=semData().sort(function(a,b){return quad(a)-quad(b)||(b.slips||0)-(a.slips||0)||b.est-a.est}),out=[];
  pool.forEach(function(t){
    var e=estAdj(t),fits=days.filter(function(d){return capOf(d)>0&&load[d]+e<=capOf(d)});
    if(!fits.length){out.push({id:t.id,d:''});return}
    // urgente vai para o primeiro dia que cabe; o resto vai para o dia com mais folga (a semana fica equilibrada)
    var d=t.urg?fits[0]:fits.reduce(function(a,b){return capOf(b)-load[b]>capOf(a)-load[a]?b:a});
    load[d]+=e;out.push({id:t.id,d:d});
  });
  return out;
}
function dayName(d){var td=todayISO();return d===td?'Hoje':(d===addDays(td,1)?'Amanhã':DABR[parseISO(d).getDay()]+' '+parseISO(d).getDate())}
function planWk(d){return weekStart(parseISO(d).getDay()===0?addDays(d,1):d)}
function weekPlanned(wk){return Object.keys(S.days||{}).some(function(d){return S.days[d].p&&planWk(d)===wk})}
function planSheetHTML(){
  var days=wpDays(),prop=sh.prop||null,add={};
  if(prop)prop.forEach(function(x){var t=byId(x.id);if(t&&x.d)add[x.d]=(add[x.d]||0)+t.est});
  var d0=parseISO(days[0]),d6=parseISO(days[6]),over=overdue(),sd=semData();
  var h='<div class="sh-head"><h2 class="h2">Planejar a semana</h2><button class="ib" data-act="sh-close" aria-label="Fechar">'+ic('x')+'</button></div>';
  h+='<p class="hint" style="margin:-8px 0 0">'+DABR[d0.getDay()]+' '+d0.getDate()+' a '+DABR[d6.getDay()]+' '+d6.getDate()+' '+MONS[d6.getMonth()]+'. Cinco minutos para a semana caber nos seus dias.</p>';
  if(over.length)h+='<div class="alert" style="margin:0"><span><b>'+over.length+(over.length>1?' tarefas ficaram':' tarefa ficou')+' para trás.</b> Comece por elas.</span><button class="btn btn-s sm" data-act="late" data-back="plan">Resolver</button></div>';
  h+='<div><span class="lab">Carga de cada dia</span><div class="wp-days">'+days.map(function(d){
    var w=parseISO(d).getDay(),c=capOf(d),m=dayLoad(d),a=add[d]||0,tot=m+a,base=Math.max(c,tot,1);
    return '<div class="wp-d'+(tot>c?' over':'')+'"><span class="wp-n">'+dayName(d)+(isFolga(d)?' <small>folga</small>':'')+'</span>'+
      '<span class="wp-bar" role="img" aria-label="'+fmt(m)+(a?' mais '+fmt(a)+' sugeridos':'')+' de '+(c?fmt(c):'nada')+'"><i style="width:'+(m/base*100).toFixed(1)+'%"></i>'+(a?'<i class="add" style="width:'+(a/base*100).toFixed(1)+'%"></i>':'')+(c&&c<base?'<b style="left:'+(c/base*100).toFixed(1)+'%"></b>':'')+'</span>'+
      '<span class="wp-v">'+fmt(tot)+' de '+(c?fmt(c):'0')+'</span>'+
      '<span class="wp-c"><button class="ib" data-act="cap" data-i="'+w+'" data-d="-30" aria-label="Menos 30 minutos de capacidade em '+DAYS[w]+'">'+ic('left',18)+'</button><button class="ib" data-act="cap" data-i="'+w+'" data-d="30" aria-label="Mais 30 minutos de capacidade em '+DAYS[w]+'">'+ic('right',18)+'</button></span></div>'}).join('')+'</div>'+
    wpRealHTML(days,prop)+'<p class="hint" style="margin:8px 2px 0">Capacidade é o tempo de foco real que cabe no dia, sem reuniões e imprevistos. As setas ajustam esse dia da semana em 30 min.</p></div>';
  h+='<div><span class="lab">Sem data · '+sd.length+'</span>';
  if(!sd.length)h+='<p class="hint" style="margin:0 2px">Nada sem data. Use o + de cada dia na Semana para planejar direto no dia.</p>';
  else if(!prop)h+='<p class="hint" style="margin:0 2px 10px">O app sugere um dia para cada uma, pela prioridade e pela folga de cada dia. Você ajusta antes de aplicar.</p><div class="btns"><button class="btn btn-s sm" data-act="wp-prop">Sugerir dias</button></div>';
  else h+='<div class="stack">'+prop.map(function(x){var t=byId(x.id);if(!t)return '';
      return '<div class="wp-p"><label for="wp-'+t.id+'"><b>'+esc(t.title)+'</b><small>'+fmt(t.est)+(t.mit?' · prioridade':'')+'</small></label><select id="wp-'+t.id+'" class="inp" data-in="wp-d" data-id="'+t.id+'">'+
        '<option value=""'+(x.d?'':' selected')+'>Deixar sem data</option>'+days.map(function(d){return '<option value="'+d+'"'+(x.d===d?' selected':'')+'>'+dayName(d)+'</option>'}).join('')+'</select></div>'}).join('')+'</div>'+
      '<div class="btns" style="margin-top:10px"><button class="btn btn-p sm" data-act="wp-apply">Aplicar</button><button class="btn btn-s sm" data-act="wp-drop">Descartar sugestão</button></div>';
  h+='</div>';
  h+='<div class="sh-actions"><button class="btn btn-p" data-act="wp-done">Pronto, semana planejada</button></div>';
  return h;
}
function wpApply(quiet){
  var prop=(sh&&sh.prop)||[],was=[];
  prop.forEach(function(x){var t=byId(x.id);if(t&&x.d&&!t.day&&!isDone(t)){was.push(t.id);t.day=x.d}});
  if(sh)sh.prop=null;
  persist();render();
  if(!quiet&&was.length)toast(was.length+(was.length>1?' tarefas planejadas.':' tarefa planejada.'),'Desfazer',function(){was.forEach(function(id){var t=byId(id);if(t&&!isDone(t))t.day=null});persist();render();if(sh&&sh.kind==='plan')renderSheet()});
  return was.length;
}
function wpDone(){
  var n=sh&&sh.prop?wpApply(true):0,td=todayISO();
  setDay(td,{p:Date.now()});persist();sh=null;renderSheet();render();
  toast('Semana planejada'+(n?', com '+n+(n>1?' tarefas novas nos dias':' tarefa nova nos dias'):'')+'.');
}
// convite na tela Hoje: domingo ou segunda, se a semana ainda não foi planejada
function planCardHTML(){
  var td=todayISO(),w=parseISO(td).getDay();
  if(w!==0&&w!==1)return '';
  if(weekPlanned(planWk(td)))return '';
  try{if(localStorage.getItem('prumo.wpno')===td)return ''}catch(e){}
  return '<section class="closec plan"><div><b>Planejar a semana</b><span>'+(w===0?'Deixe a próxima semana pronta':'Comece a semana com a carga de cada dia')+' em 5 minutos.</span></div><div class="btns"><button class="btn btn-p sm" data-act="plan">Planejar</button><button class="btn btn-s sm" data-act="wp-later">Agora não</button></div></section>';
}
// quanto a semana deve levar de verdade, pelo histórico de cada contexto
function wpRealHTML(days,prop){
  var est=0,real=0;
  days.forEach(function(d){tasksOn(d).forEach(function(t){if(isDone(t))return;est+=t.est;real+=estAdj(t)})});
  (prop||[]).forEach(function(x){var t=byId(x.id);if(t&&x.d){est+=t.est;real+=estAdj(t)}});
  if(!est||Math.abs(real-est)<Math.max(30,est*.1))return '';
  return '<p class="est-wk">Pelo seu tempo real, estes 7 dias devem levar cerca de <b>'+fmt(real)+'</b>, não '+fmt(est)+'.'+(real>est?' A sugestão de dias já conta com isso.':'')+'</p>';
}
