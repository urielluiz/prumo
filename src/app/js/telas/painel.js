/* ---------- painel (analises) ---------- */
var revMode='rev',dashRange='week';
function periodList(mode){
  var out=[],i,td=todayISO();
  if(mode==='week'){
    var w0=weekStart(td);
    for(i=7;i>=0;i--){var a=addDays(w0,-7*i);out.push({from:a,to:addDays(a,6),label:parseISO(a).getDate()+' '+MONS[parseISO(a).getMonth()],cur:i===0})}
  }else{
    var n=new Date();
    for(i=5;i>=0;i--){var d=new Date(n.getFullYear(),n.getMonth()-i,1),e=new Date(d.getFullYear(),d.getMonth()+1,0);
      out.push({from:iso(d),to:iso(e),label:MONS[d.getMonth()],cur:i===0})}
  }
  return out;
}
function periodStats(p,cut){
  var f=p.from,e=p.to,td=todayISO(),done=[],planned=0,slips=0,estSum=0,realSum=0,estReal=0,nReal=0;
  if(e>td)e=td;if(cut&&e>cut)e=cut; // só até hoje (ou até o corte), para comparar períodos de forma justa
  S.tasks.forEach(function(t){
    if(t.day&&t.day>=f&&t.day<=e){planned++;slips+=t.slips||0}
    if(isDone(t)&&t.doneAt){var dd=iso(new Date(t.doneAt));if(dd>=f&&dd<=e){
      done.push(t);var est=estAll(t,true);estSum+=est;
      if((t.focus||0)>=60){realSum+=t.focus/60;estReal+=est;nReal++}}}
  });
  var focus=0,d=f;while(d<=e){focus+=S.log[d]||0;d=addDays(d,1)}
  return {done:done.length,planned:planned,rate:planned?Math.round(done.length/planned*100):null,focus:focus/60,slips:slips,estSum:estSum,realSum:realSum,
    ratio:estReal?realSum/estReal:null,nReal:nReal};
}
function deltaHTML(cur,prev,unit,goodUp){
  if(prev==null||cur==null)return '';
  var d=cur-prev;if(Math.abs(d)<(unit==='min'?1:0.5))return '<small class="dl">igual ao anterior</small>';
  var up=d>0,good=goodUp?up:!up,txt=unit==='min'?(up?'+':'−')+fmt(Math.abs(d)):(up?'+':'−')+Math.round(Math.abs(d))+(unit==='pp'?' pp':'');
  return '<small class="dl" style="color:var('+(good?'--ok':'--warn')+')">'+txt+' vs. anterior</small>';
}
function barsHTML(ps,vals,fmtv,title){
  var mx=Math.max.apply(null,vals.concat([1]));
  return '<div class="bars" role="img" aria-label="'+esc(title)+'">'+ps.map(function(p,i){
    var v=vals[i],h=Math.max(v>0?4:0,Math.round(v/mx*100));
    return '<div class="bc"><span class="bv">'+(v>0?fmtv(v):'')+'</span><div class="bt"><i class="'+(p.cur?'cur':'')+'" style="height:'+h+'%"></i></div><span class="bl">'+esc(p.label)+'</span></div>'}).join('')+'</div>';
}
function calibText(r){
  if(r==null)return '';
  if(r<0.85)return 'Você costuma <b>superestimar</b>: leva cerca de '+Math.round(r*100)+'% do tempo que prevê.';
  if(r>1.15)return 'Você costuma <b>subestimar</b>: leva cerca de '+Math.round(r*100)+'% do tempo que prevê.';
  return 'Suas estimativas estão <b>bem calibradas</b> ('+Math.round(r*100)+'% do previsto).';
}
function viewPainel(){
  var ps=periodList(dashRange),st=ps.map(function(p){return periodStats(p)}),cur=st[st.length-1];
  var wk=dashRange==='week';
  // a anterior até o mesmo ponto: quarta contra quarta, dia 10 contra dia 10
  var pc=ps[ps.length-1],pp=ps[ps.length-2],off=Math.round((parseISO(todayISO())-parseISO(pc.from))/864e5),prev=periodStats(pp,addDays(pp.from,off));
  var cutLbl=wk?DABR[new Date().getDay()]:'dia '+new Date().getDate();
  var first=st.findIndex(function(x){return x.done||x.focus||x.planned});if(first<0||first>ps.length-2)first=Math.max(0,ps.length-2);ps=ps.slice(first);st=st.slice(first);
  var h='<header class="top"><div><div class="eyebrow">Revisão</div><h1 class="h1">Tendências</h1></div></header>';
  h+='<div class="chips" style="margin-bottom:10px">'+chip('Semana',false,'data-act="rev" data-v="rev"')+chip('Tendências',true,'data-act="rev" data-v="dash"')+'</div>';
  h+='<div class="chips" style="margin-bottom:14px">'+chip('Por semana',wk,'data-act="drange" data-v="week"')+chip('Por mês',!wk,'data-act="drange" data-v="month"')+'</div>';
  var any=st.some(function(s){return s.done||s.focus});
  h+='<div class="cols"><div class="col">';
  h+='<section class="panel"><div class="eyebrow">'+(wk?'Esta semana':'Este mês')+' até '+cutLbl+' contra '+(wk?'a anterior':'o anterior')+' até '+cutLbl+'</div><div class="nums">'+
    '<div><b>'+cur.done+'</b><small>concluídas</small>'+deltaHTML(cur.done,prev.done,'n',true)+'</div>'+
    '<div><b>'+fmt(cur.focus)+'</b><small>em foco</small>'+deltaHTML(cur.focus,prev.focus,'min',true)+'</div>'+
    '<div><b>'+(cur.rate==null?'–':cur.rate+'%')+'</b><small>do planejado até hoje</small>'+deltaHTML(cur.rate,prev.rate,'pp',true)+'</div></div></section>';
  h+=secHTML('Concluídas por '+(wk?'semana':'mês'))+'<section class="panel">'+barsHTML(ps,st.map(function(s){return s.done}),function(v){return v},'Tarefas concluídas')+'</section>';
  h+=secHTML('Tempo em foco')+'<section class="panel">'+barsHTML(ps,st.map(function(s){return s.focus}),function(v){return v>=60?(Math.round(v/6)/10)+'h':Math.round(v)+'m'},'Minutos em foco')+'</section>';
  h+=secHTML('Taxa de conclusão')+'<section class="panel">'+barsHTML(ps,st.map(function(s){return s.rate||0}),function(v){return v+'%'},'Percentual do planejado concluído')+'<p class="hint" style="margin:0">Das tarefas com data no período, quantas você concluiu.</p></section>';
  if(!any)h+=emptyHTML('painel');
  h+='</div><div class="col">';
  // estimativa vs real
  var rs=S.tasks.filter(function(t){return isDone(t)&&(t.focus||0)>=60&&(t.est0||t.est)});
  var eT=sum(rs,function(t){return estAll(t,true)}),rT=sum(rs,function(t){return t.focus/60});
  h+=secHTML('Estimado contra real');
  if(rs.length<5){
    h+='<section class="panel"><p style="margin:0">'+rs.length+' de 5 tarefas com tempo real registrado.</p><div class="bar"><i style="width:'+Math.round(rs.length/5*100)+'%;background:var(--accent)"></i></div><p class="hint" style="margin:0">Use o cronômetro até concluir a tarefa, ou preencha o tempo real ao editá-la. Com 5 tarefas, o app mostra se você costuma subestimar ou superestimar.</p></section>';
  }else{
    var rat=rT/eT;
    h+='<section class="panel"><p style="margin:0">'+calibText(rat)+'</p><div class="nums"><div><b>'+fmt(eT)+'</b><small>estimado</small></div><div><b>'+fmt(rT)+'</b><small>real</small></div><div><b>'+rs.length+'</b><small>tarefas</small></div></div>';
    var grp=function(name,f){var l=rs.filter(f);if(l.length<2)return '';var e=sum(l,function(t){return estAll(t,true)}),r=sum(l,function(t){return t.focus/60});return '<div class="rn2"><span>'+name+'</span><span>'+l.length+' · '+Math.round(r/e*100)+'%</span></div>'};
    var rows=CTX.map(function(c){return grp(esc(cname(c.id)),function(t){return t.ctx===c.id})}).join('')+
      grp('Até 30 min',function(t){return estAll(t,true)<=30})+grp('31 a 120 min',function(t){var e=estAll(t,true);return e>30&&e<=120})+grp('Mais de 2h',function(t){return (t.est0||t.est)>120});
    var rowsFw=Object.keys(FW).map(function(k){return grp(esc(FW[k].name),function(t){return fwOf(t)===k})}).join('');
    if(rows)h+='<div><span class="lab">Real em relação ao estimado (tarefas · %)</span><div class="rn2s">'+rows+'</div></div>';
    if(rowsFw)h+='<details class="more-d"><summary>Por método</summary><div class="rn2s">'+rowsFw+'</div></details>';
    h+='</section>';
    var last=rs.slice().sort(function(a,b){return (b.doneAt||0)-(a.doneAt||0)}).slice(0,6);
    h+='<details class="more-d"><summary>Últimas tarefas com tempo real</summary><div class="list">'+last.map(function(t){var e=estAll(t,true),r=t.focus/60;return '<div class="row" style="display:block;padding:12px 16px"><div class="row-title">'+esc(t.title)+'</div><div class="row-meta"><span>estimado '+fmt(e)+'</span><span>real '+fmt(r)+'</span><span style="color:var('+(r>e*1.15?'--warn':'--ok')+')">'+(r>e*1.15?'+':(r<e*.85?'−':'≈'))+(Math.abs(Math.round((r/e-1)*100))>=15?Math.abs(Math.round((r/e-1)*100))+'%':'')+'</span></div></div>'}).join('')+'</div></details>';
  }
  var types={};S.tasks.forEach(function(t){if(t.type&&isDone(t)&&(t.focus||0)>=60){var o=types[t.type]=types[t.type]||{n:0,r:0,e:0};o.n++;o.r+=t.focus/60;o.e+=t.est0||t.est}});
  var tk=Object.keys(types);
  if(tk.length)h+=secHTML('Tempo por tipo de entrega')+'<section class="panel"><div class="rn2s">'+tk.map(function(k){var o=types[k];return '<div class="rn2"><span>'+esc(k)+' · '+o.n+'</span><span>média '+fmt(o.r/o.n)+' (estimado '+fmt(o.e/o.n)+')</span></div>'}).join('')+'</div></section>';
  var other=S.tasks.filter(function(t){return isDone(t)&&!((t.focus||0)>=60)}).length;
  if(other)h+='<p class="hint" style="margin-top:10px">'+other+' tarefa'+(other>1?'s':'')+' concluída'+(other>1?'s':'')+' sem tempo real. Elas contam nas entregas, mas não na comparação de estimativa.</p>';
  h+='<p class="hint" style="margin-top:10px">Os dados ficam guardados por 400 dias para você comparar meses.</p>';
  h+='</div></div>';
  return h;
}

function viewRevisao(){
  if(revMode==='dash')return viewPainel();
  var wk=curWk(),we=addDays(wk,6),td=todayISO(),wt=weekTasks(wk),dn=wt.filter(isDone);
  // ficou aberto = tinha dia antes de hoje e não foi concluído (o que ainda vem não conta)
  var open=wt.filter(function(t){return !isDone(t)&&lastDay(t)<td}),ahead=wt.filter(function(t){return !isDone(t)&&lastDay(t)>=td});
  var due=wt.filter(function(t){return t.day<=td}),pct=due.length?Math.round(dn.length/due.length*100):0;
  var secs=sum([0,1,2,3,4,5,6],function(i){return S.log[addDays(wk,i)]||0});
  var pomos=sum(dn,function(t){return t.pomos||0});
  var rt=S.retro[wk]||{};
  var bl=[0,1,2,3,4,5,6].map(function(i){return addDays(wk,i)}).filter(function(d){return S.blockers[d]});
  var inWk=function(t){return estIn(t,wk,we)},planMin=sum(wt,inWk);
  var byC=CTX.map(function(c){return {c:c,m:sum(wt.filter(function(t){return t.ctx===c.id}),inWk)}}).filter(function(x){return x.m>0});
  var h='<header class="top"><div><div class="eyebrow">Revisão'+(wk===weekStart(td)?' · semana atual':'')+'</div><h1 class="h1">'+rangeLabel(wk)+'</h1></div><div class="nav"><button class="ib" data-act="wk" data-d="-1" aria-label="Semana anterior">'+ic('left')+'</button><button class="ib" data-act="wk" data-d="1" aria-label="Próxima semana">'+ic('right')+'</button></div></header>';
  h+='<div class="chips" style="margin-bottom:14px">'+chip('Semana',true,'data-act="rev" data-v="rev"')+chip('Tendências',false,'data-act="rev" data-v="dash"')+'</div>';
  h+='<div class="cols"><div class="col">';
  h+='<section class="panel"><div class="nums"><div><b>'+dn.length+'/'+due.length+'</b><small>concluídas'+(due.length?' ('+pct+'%)':'')+'</small></div><div><b>'+fmt(secs/60)+'</b><small>em foco</small></div>'+(pomos?'<div><b>'+pomos+'</b><small>pomodoros</small></div>':'')+'</div>'+
    (due.length?'<div class="bar"><i style="width:'+pct+'%;background:var(--ok)"></i></div>':'')+
    (planMin?'<div><span class="lab">Planejado por contexto · '+fmt(planMin)+'</span><div class="bar" role="img" aria-label="Tempo planejado por contexto">'+byC.map(function(x){return '<i style="width:'+(x.m/planMin*100).toFixed(1)+'%;background:var('+x.c.v+')"></i>'}).join('')+'</div><div class="legend">'+byC.map(function(x){return '<span><i class="dot" style="background:var('+x.c.v+')"></i>'+esc(cname(x.c.id))+' '+fmt(x.m)+'</span>'}).join('')+'</div></div>':'')+
    '<div class="btns"><button class="btn btn-s sm" data-act="wr-open" data-wk="'+wk+'">'+ic('play',16)+'Retrô em stories</button>'+(wkOff!==0?'<button class="btn btn-s sm" data-act="wk" data-d="0">Voltar para esta semana</button>':'')+'</div></section>';
  h+=secHTML('Fechar a semana')+'<div class="stack">'+
    [['worked','O que funcionou?'],['stuck','O que travou?'],['tweak','O que muda na próxima semana?']].map(function(x){return '<div><label class="lab" for="rt-'+x[0]+'">'+x[1]+'</label><textarea id="rt-'+x[0]+'" class="inp" data-in="retro" data-f="'+x[0]+'" rows="2">'+esc(rt[x[0]]||'')+'</textarea></div>'}).join('')+'</div>';
  h+='<div class="btns" style="margin-top:12px"><button class="btn btn-p btn-full" data-act="copy-summary">Copiar resumo da semana</button></div>';
  h+='</div><div class="col">';
  if(open.length){
    h+=secHTML('Ficou aberto',open.length)+listHTML(open.sort(function(a,b){return (b.slips||0)-(a.slips||0)}),{},null);
    if(open.some(function(t){return (t.slips||0)>=2}))h+='<p class="hint" style="margin-top:8px">Tarefas adiadas 2 vezes ou mais pedem um passo menor. Quebre em partes de 15 minutos ou use o Só 5 minutos.</p>';
  }
  if(ahead.length)h+='<p class="hint" style="margin:10px 4px">'+ahead.length+(ahead.length>1?' tarefas ainda planejadas':' tarefa ainda planejada')+' para os próximos dias desta semana.</p>';
  h+=secHTML('Concluídas',dn.length);
  if(dn.length){
    h+='<div class="list">'+CTX.map(function(c){var l=dn.filter(function(t){return t.ctx===c.id});if(!l.length)return '';
      return '<div class="row" style="display:block;padding:12px 16px"><div class="eyebrow" style="display:flex;align-items:center;gap:8px"><i class="dot" style="background:var('+c.v+')"></i>'+esc(cname(c.id))+' · '+l.length+'</div>'+l.map(function(t){return '<div style="display:flex;gap:10px;margin-top:8px;align-items:baseline"><span style="color:var(--ok)">'+ic('check',14,2.6)+'</span><span style="overflow-wrap:anywhere">'+esc(t.title)+'</span></div>'}).join('')+'</div>'}).join('')+'</div>';
  }else h+=emptyHTML('rev');
  if(bl.length)h+=secHTML('Travas anotadas')+'<div class="list">'+bl.map(function(d){return '<div class="row" style="display:block;padding:12px 16px"><div class="eyebrow">'+shortDate(d)+'</div><div style="margin-top:4px;overflow-wrap:anywhere">'+esc(S.blockers[d])+'</div></div>'}).join('')+'</div>';
  h+='</div></div>';
  return h;
}

