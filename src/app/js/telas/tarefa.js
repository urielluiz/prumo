/* ---------- folha de tarefa: criar e editar ---------- */
// Título e "Quando" bastam; o resto tem padrão. Ao criar, o título reconhece data, período, tempo,
// contexto, repetição e "!" (importante). Calendário próprio: um dia ou vários (início e fim).
var EST_MAIN=[2,15,30,60,120,240],MAXSTEPS=30;
function chip(label,pressed,attrs,extra){return '<button class="chip" aria-pressed="'+pressed+'" '+attrs+'>'+(extra||'')+label+'</button>'}

/* reconhecimento de texto (pt-BR) */
var deacc=function(s){return String(s).normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase()};
var WDN={dom:0,domingo:0,seg:1,segunda:1,ter:2,terca:2,qua:3,quarta:3,qui:4,quinta:4,sex:5,sexta:5,sab:6,sabado:6};
var DAYRX='(hoje|amanha|depois de amanha|(?:domingo|segunda|terca|quarta|quinta|sexta|sabado|dom|seg|ter|qua|qui|sex|sab)(?:-feira)?|\\d{1,2}/\\d{1,2})';
function resolveDay(w,from){
  var td=todayISO();w=w.replace(/-feira$/,'');
  if(w==='hoje')return td;if(w==='amanha')return addDays(td,1);if(w==='depois de amanha')return addDays(td,2);
  var m=w.match(/^(\d{1,2})\/(\d{1,2})$/);
  if(m){var mo=+m[2],da=+m[1];if(mo<1||mo>12||da<1||da>31)return null;var y=new Date().getFullYear(),c=new Date(y,mo-1,da);if(c.getMonth()!==mo-1)return null;var s=iso(c);if(s<td)s=iso(new Date(y+1,mo-1,da));return s}
  var w0=WDN[w];if(w0==null)return null;
  var s0=from||td;for(var i=0;i<7;i++){var x=addDays(s0,i);if(parseISO(x).getDay()===w0)return x}
  return null;
}
function recognize(raw,off){
  var low=deacc(raw),out={toks:[]},used=[];
  var take=function(re,kind,fn){
    if(off[kind])return;var m=re.exec(low);if(!m)return;var r=fn(m);if(!r)return;
    used.push([m.index,m.index+m[0].length]);low=low.slice(0,m.index)+' '.repeat(m[0].length)+low.slice(m.index+m[0].length);
    out.toks.push({kind:kind,label:r.label,text:raw.substr(m.index,m[0].length)});Object.assign(out,r.set);
  };
  take(/\b(?:todo dia|todos os dias|dias uteis|todo mes|toda semana|toda (segunda|terca|quarta|quinta|sexta)(?:-feira)?|todo (sabado|domingo))\b/,'rep',function(m){
    var w=m[1]||m[2];
    if(w){var d=WDN[w],nd=resolveDay(w);return {label:'Toda '+DAYS[d].toLowerCase().replace('-feira',''),set:{rec:{t:'weekly',dows:[d]},day:nd,end:null}}}
    if(/uteis/.test(m[0]))return {label:'Dias úteis',set:{rec:{t:'weekdays'}}};
    if(/mes/.test(m[0]))return {label:'Todo mês',set:{rec:{t:'monthly'}}};
    if(/semana/.test(m[0]))return {label:'Toda semana',set:{rec:{t:'weekly',dows:[new Date().getDay()]}}};
    return {label:'Todo dia',set:{rec:{t:'daily'}}};
  });
  take(new RegExp('\\b(?:de\\s+)?'+DAYRX+'\\s+(?:a|ate|-)\\s+'+DAYRX+'\\b'),'when',function(m){
    var a=resolveDay(m[1]),b=a&&resolveDay(m[2],a);if(!a||!b)return null;if(b<a){var x=a;a=b;b=x}
    return {label:shortDate(a)+' a '+shortDate(b),set:{day:a,end:b===a?null:b}};
  });
  take(new RegExp('\\b(?:ate|prazo)(?:\\s+(?:o\\s+)?dia)?\\s+'+DAYRX+'\\b'),'due',function(m){var a=resolveDay(m[1]);return a?{label:'Prazo '+(a===todayISO()?'hoje':shortDate(a)),set:{due:a}}:null});
  take(new RegExp('\\b'+DAYRX+'\\b'),'when',function(m){var a=resolveDay(m[1]);return a?{label:a===todayISO()?'Hoje':shortDate(a),set:{day:a,end:null}}:null});
  take(/\b(\d{1,2})\s*h\s*(\d{1,2})?\b|\b(\d{1,3})\s*min\b/,'est',function(m){var v=m[3]?+m[3]:(+m[1]*60+(+m[2]||0));return v>=1&&v<=960?{label:fmt(v),set:{est:v}}:null});
  take(/#([a-z0-9]+)/,'ctx',function(m){var c=CTX.find(function(c){return c.id===m[1]||deacc(cname(c.id)).replace(/[^a-z0-9]/g,'').indexOf(m[1])===0});return c?{label:cname(c.id),set:{ctx:c.id}}:null});
  take(/(^|\s)!(?=\s|$)/,'imp',function(){return {label:'Importante',set:{imp:true}}});
  used.sort(function(a,b){return b[0]-a[0]});var t=raw;used.forEach(function(u){t=t.slice(0,u[0])+t.slice(u[1])});
  out.title=t.replace(/\s+/g,' ').trim();
  return out;
}
var TKF=['day','end','est','ctx','rec','imp','due'];
// valores efetivos: o que foi escolhido + o que o texto reconheceu (só ao criar)
function eff(){
  var d=Object.assign({},sh.d);
  if(sh.mode!=='new'){d.title=(d.raw||'').trim();d.toks=[];return d}
  var r=recognize(d.raw||'',sh.off);TKF.forEach(function(k){if(r[k]!==undefined)d[k]=r[k]});
  d.title=r.title||(d.raw||'').trim();d.toks=r.toks;return d;
}
// ao tocar em qualquer controle, o que o texto reconheceu vira escolha e sai do título
function absorb(){
  if(!sh||sh.kind!=='task'||sh.mode!=='new')return;
  var r=recognize(sh.d.raw||'',sh.off);if(!r.toks.length)return;
  TKF.forEach(function(k){if(r[k]!==undefined)sh.d[k]=r[k]});
  if(r.end)sh.multi=true;
  if(r.title)sh.d.raw=r.title;
}

/* partes da folha */
function whenLabel(d){
  if(!d.day)return 'Sem data';
  var td=todayISO(),f=function(x){return x===td?'Hoje':(x===addDays(td,1)?'Amanhã':shortDate(x))};
  return d.end?f(d.day)+' a '+f(d.end).toLowerCase():f(d.day);
}
function tokHTML(d){return d.toks.map(function(t){return '<span class="tok">'+esc(t.label)+'<button data-act="tok-off" data-v="'+t.kind+'" aria-label="Tratar &quot;'+esc(t.text)+'&quot; como texto">'+ic('x',14,2.4)+'</button></span>'}).join('')}
function pillsHTML(d){
  var c=ctxOf(d.ctx),p=function(k,label,val){return '<button class="pill" data-act="sh-sec" data-v="'+k+'" aria-expanded="'+(sh.open===k)+'">'+(label?'<span class="pk">'+label+'</span>':'')+val+'</button>'};
  return p('when','Quando',esc(whenLabel(d)))+p('est','Tempo',fmt(d.est)+(d.end?' por dia':''))+p('ctx','','<i class="dot" style="background:var('+c.v+')"></i>'+esc(cname(c.id)))+p('rep','',ic('repeat',16,2)+esc(recLabel(d.rec)));
}
// calendário do mês: a = dia escolhido (ou início), b = fim do período; act/monAct = ações dos botões
function calGrid(mon,a,b,act,monAct){
  var td=todayISO(),m=mon.split('-').map(Number),first=new Date(m[0],m[1]-1,1),lead=(first.getDay()+6)%7,n=new Date(m[0],m[1],0).getDate(),cur=td.slice(0,7)===mon,h='';
  h+='<div class="cal"><div class="cal-h"><button class="ib" data-act="'+monAct+'" data-v="-1" aria-label="Mês anterior"'+(cur?' disabled':'')+'>'+ic('left',20)+'</button><span>'+MONF[m[1]-1]+' de '+m[0]+'</span><button class="ib" data-act="'+monAct+'" data-v="1" aria-label="Próximo mês">'+ic('right',20)+'</button></div><div class="cal-g" role="group" aria-label="'+MONF[m[1]-1]+' de '+m[0]+'">';
  ['seg','ter','qua','qui','sex','sáb','dom'].forEach(function(x){h+='<small aria-hidden="true">'+x+'</small>'});
  for(var i=0;i<lead;i++)h+='<span></span>';
  for(var k=1;k<=n;k++){
    var s=m[0]+'-'+pad(m[1])+'-'+pad(k),cl=[];
    if(s===td)cl.push('now');
    if(a&&s===a)cl.push(b?'s':'one');
    if(b&&s===b)cl.push('e');
    if(a&&b&&s>a&&s<b)cl.push('in');
    var on=(a&&s===a)||(b&&s===b);
    h+='<button data-act="'+act+'" data-v="'+s+'" class="'+cl.join(' ')+'"'+(s<td?' disabled':'')+' aria-pressed="'+!!on+'" aria-label="'+k+' de '+MONF[m[1]-1]+'">'+k+'</button>';
  }
  return h+'</div></div>';
}
function calHTML(d){return calGrid(sh.mon,sh.pick||d.day,sh.pick?null:d.end,'cal-day','cal-mon')}
function panelHTML(d){
  var td=todayISO(),h='';
  if(sh.open==='when'){
    var sat=resolveDay('sab'),mon=resolveDay('seg',addDays(td,1));
    h+='<div class="tk-panel"><div class="chips">'+[['Hoje',td],['Amanhã',addDays(td,1)],[sat===td?'Sábado':'Sábado',sat],['Segunda',mon],['Sem data','none']].map(function(x){var on=x[1]==='none'?!d.day:(!d.end&&d.day===x[1]);return chip(x[0],on,'data-act="sh-day" data-v="'+x[1]+'"')}).join('')+'</div>';
    h+='<div class="seg" role="group" aria-label="Duração"><button data-act="sh-multi" data-v="0" aria-pressed="'+!sh.multi+'">Um dia</button><button data-act="sh-multi" data-v="1" aria-pressed="'+!!sh.multi+'"'+(d.rec?' disabled':'')+'>Vários dias</button></div>';
    h+=calHTML(d);
    var msg=d.rec?'Tarefas que repetem são de um dia.':(sh.multi?(sh.pick?'Agora toque no último dia.':(d.end?'De '+shortDate(d.day)+' a '+shortDate(d.end)+', '+spanOf(d)+' dias. A tarefa aparece em cada um até você concluir.':'Toque no primeiro e no último dia.')):'Toque num dia.');
    h+='<p class="hint" aria-live="polite">'+msg+'</p></div>';
  }
  if(sh.open==='est'){
    var other=EST_MAIN.indexOf(d.est)<0||sh.estOpen;
    h+='<div class="tk-panel"><div class="chips">'+EST_MAIN.map(function(m){return chip(fmt(m),d.est===m&&!sh.estOpen,'data-act="sh-est" data-v="'+m+'"')}).join('')+chip(other&&EST_MAIN.indexOf(d.est)<0?'Outro: '+fmt(d.est):'Outro',other,'data-act="sh-est-other"')+'</div>'+
      (other?'<div class="est-in"><label class="lab" for="f-est" style="margin:0">Minutos</label><input id="f-est" class="inp" data-in="est" type="number" inputmode="numeric" min="1" max="960" placeholder="ex.: 200" value="'+(EST_MAIN.indexOf(d.est)<0?d.est:'')+'"></div>':'')+
      (d.end?'<p class="hint">Tempo por dia. No período todo: '+fmt(d.est*spanOf(d))+'.</p>':'')+estTipHTML(d)+'</div>';
  }
  if(sh.open==='ctx')h+='<div class="tk-panel"><div class="chips">'+CTX.map(function(c){return chip(esc(cname(c.id)),d.ctx===c.id,'data-act="sh-ctx" data-v="'+c.id+'"','<i class="dot" style="background:var('+c.v+')"></i>')}).join('')+'</div></div>';
  if(sh.open==='rep'){
    var cur0=sh.mode==='edit'?byId(sh.id):null;
    h+='<div class="tk-panel"><div class="chips">'+[['none','Não repete'],['daily','Todo dia'],['weekdays','Dias úteis'],['weekly','Toda semana'],['monthly','Todo mês']].map(function(x){var on=x[0]==='none'?!d.rec:(d.rec&&d.rec.t===x[0]);return chip(x[1],!!on,'data-act="sh-rec" data-v="'+x[0]+'"')}).join('')+'</div>';
    if(d.rec&&d.rec.t==='weekly')h+='<div class="chips">'+[1,2,3,4,5,6,0].map(function(w){return chip(DABR[w],(d.rec.dows||[]).indexOf(w)>=0,'data-act="rec-dow" data-v="'+w+'"')}).join('')+'</div>';
    if(d.rec&&cur0&&cur0.rid)h+='<div class="chips">'+chip('Aplicar às próximas repetições',!!d.recAll,'data-act="rec-all"')+'</div>';
    h+='<p class="hint">'+(d.rec?'Os próximos 14 dias são criados automaticamente, e novos aparecem a cada dia.':'Para o que volta sempre, como treino, fatura ou relatório.')+'</p></div>';
  }
  return h;
}
function moreHTML(d){
  var sug=suggestFw(d),cur=d.fw||sug,q=quad(d),n=(d.dod||[]).length,dn=(d.dod||[]).filter(function(x){return x.d}).length;
  var sum=(d.due?['prazo '+shortDate(d.due)]:[]).concat([QD[q].n,FW[cur].name]).concat(n?[dn+'/'+n+' etapas']:[]).join(' · ');
  var h='<button class="tk-more" data-act="sh-sec" data-v="more" aria-expanded="'+!!sh.more+'"><span>Mais opções</span><span class="pk">'+esc(sum)+'</span>'+ic(sh.more?'up':'down',18)+'</button>';
  if(!sh.more)return h;
  h+='<div class="tk-opts">';
  h+='<div><span class="lab">Prioridade</span><div class="chips">'+chip('Importante',!!d.imp,'data-act="sh-imp"')+chip('Urgente',!!d.urg,'data-act="sh-urg"')+'</div><p class="verdict"><b>'+QD[q].n+'.</b> '+QD[q].s+'.</p></div>';
  var td=todayISO(),fri=resolveDay('sex'),nw=resolveDay('seg',addDays(td,1));
  h+='<div><span class="lab">Prazo final</span><div class="chips">'+chip('Sem prazo',!d.due,'data-act="due-set" data-v=""')+chip('Sexta',d.due===fri,'data-act="due-set" data-v="'+fri+'"')+chip('Próxima segunda',d.due===nw,'data-act="due-set" data-v="'+nw+'"')+chip(d.due&&d.due!==fri&&d.due!==nw?shortDate(d.due):'Escolher dia',!!(sh.dueOpen||(d.due&&d.due!==fri&&d.due!==nw)),'data-act="due-pick"')+'</div>'+
    (sh.dueOpen?calGrid(sh.dmon,d.due,null,'due-day','due-mon'):'')+
    '<p class="hint" style="margin:8px 0 0">'+(d.due&&d.day&&d.due<lastDay(d)?'O prazo é antes do último dia planejado.':'Até quando precisa estar pronto. A tarefa continua no dia escolhido em Quando e aparece na tela Hoje no dia do prazo.')+'</p></div>';
  h+='<div><span class="lab">Etapas</span>'+(n?'<ul class="steps">'+d.dod.map(function(x,i){return '<li><button class="st-chk" data-act="st-tog" data-v="'+i+'" aria-pressed="'+!!x.d+'" aria-label="'+(x.d?'Desmarcar':'Marcar')+' etapa">'+(x.d?ic('check',13,2.6):'')+'</button><span'+(x.d?' class="dn"':'')+'>'+esc(x.t)+'</span><button class="ib" data-act="st-del" data-v="'+i+'" aria-label="Remover etapa">'+ic('x',16)+'</button></li>'}).join('')+'</ul>':'')+
    (n<MAXSTEPS?'<div class="st-add"><input id="f-step" class="inp" maxlength="120" autocomplete="off" enterkeyhint="done" placeholder="'+(n?'Próxima etapa':'Ex.: Mandar o briefing')+'" aria-label="Nova etapa"><button class="btn btn-s sm" data-act="st-add">Adicionar</button></div>':'')+'</div>';
  h+='<div><span class="lab">Como atacar</span><div class="fwgrid">'+Object.keys(FW).map(function(k){return '<button class="fwopt" data-act="sh-fw" data-v="'+k+'" aria-pressed="'+(cur===k)+'"><b>'+esc(FW[k].name)+'</b><small>'+esc(FW[k].best)+(k===sug?' · sugerido':'')+'</small></button>'}).join('')+'</div><p class="verdict">'+esc(FW[cur].how)+'<b id="pomo-n">'+pomoText(d,cur)+'</b></p><button class="link" data-act="help">Entender os métodos</button></div>';
  if(sh.mode==='edit')h+='<div><label class="lab" for="f-real">Tempo real gasto (minutos)</label><input id="f-real" class="inp" data-in="real" type="number" inputmode="numeric" min="0" max="10000" placeholder="Preenche sozinho se usar o cronômetro" value="'+esc(d.real)+'"></div>';
  return h+'</div>';
}
function sumText(d){
  if(!d.title)return 'Escreva o que precisa ser feito.';
  return '<b>'+esc(d.title)+'</b> · '+esc(whenLabel(d))+(d.end?' ('+spanOf(d)+' dias)':'')+' · '+fmt(d.est)+(d.end?' por dia':'')+' · '+esc(cname(d.ctx))+(d.due?' · prazo '+esc(shortDate(d.due)):'');
}
function taskSheetHTML(){
  var d=eff(),cur0=sh.mode==='edit'?byId(sh.id):null,isRec=!!(cur0&&cur0.rid&&S.rec[cur0.rid]);
  var h='<div class="sh-head"><h2 class="h2">'+(sh.mode==='new'?'Nova tarefa':'Editar tarefa')+'</h2><button class="ib" data-act="sh-close" aria-label="Fechar">'+ic('x')+'</button></div>';
  h+='<div class="tk-top"><textarea id="f-title" class="tk-title" data-in="title" rows="1" maxlength="300" autocomplete="off" enterkeyhint="done" placeholder="O que precisa ser feito?" aria-label="O que precisa ser feito?">'+esc(sh.d.raw||'')+'</textarea>'+
    '<div class="tk-toks" id="tk-toks">'+tokHTML(d)+'</div>'+(sh.mode==='new'&&!sh.d.raw?'<p class="hint" id="tk-tip">Dica: escreva "sáb a ter 2h #freelas" e o Prumo preenche para você.</p>':'')+'</div>';
  h+='<div class="tk-pills" id="tk-pills">'+pillsHTML(d)+'</div><div id="tk-est">'+(sh.open!=='est'?estTipHTML(d,true):'')+'</div>';
  h+=panelHTML(d);
  h+=moreHTML(d);
  h+='<div class="tk-foot"><p class="tk-sum" id="tk-sum" aria-live="polite">'+sumText(d)+'</p><div class="sh-actions"><button class="btn btn-p" data-act="sh-save" id="tk-save"'+(d.title?'':' aria-disabled="true"')+'>'+(sh.mode==='new'?'Adicionar tarefa':'Salvar')+'</button>';
  if(sh.mode==='edit'){
    if(isRec&&sh.del)h+='<button class="btn btn-s" data-act="sh-del1" style="color:var(--bad)">Excluir só esta</button><button class="btn btn-s" data-act="sh-delall" style="color:var(--bad)">Esta e as próximas</button>';
    else h+='<button class="btn btn-s" data-act="sh-del" style="color:var(--bad)">'+(sh.del?'Confirmar exclusão':'Excluir tarefa')+'</button>';
  }
  return h+'</div></div>';
}
// enquanto digita o título: só destaques, pílulas e resumo mudam (o teclado não pisca)
function liveTask(){
  var d=eff(),q=function(id){return document.getElementById(id)};
  if(q('tk-toks'))q('tk-toks').innerHTML=tokHTML(d);
  if(q('tk-pills'))q('tk-pills').innerHTML=pillsHTML(d);
  if(q('tk-est'))q('tk-est').innerHTML=sh.open!=='est'?estTipHTML(d,true):'';
  if(q('tk-sum'))q('tk-sum').innerHTML=sumText(d);
  if(q('tk-save')){if(d.title)q('tk-save').removeAttribute('aria-disabled');else q('tk-save').setAttribute('aria-disabled','true')}
  var tip=q('tk-tip');if(tip&&sh.d.raw)tip.remove();
  fitTitle();
}
function fitTitle(){var t=document.getElementById('f-title');if(t){t.style.height='auto';t.style.height=t.scrollHeight+'px'}}

/* abrir, aplicar e salvar */
function openTask(id,day){
  if(id){var t=byId(id);if(!t)return;
    sh={kind:'task',mode:'edit',id:id,off:{},open:null,more:false,multi:!!t.end,mon:(t.day&&t.day>todayISO()?t.day:todayISO()).slice(0,7),pick:null,del:false,
      d:{raw:t.title,ctx:t.ctx,est:t.est,day:t.day||null,end:t.end||null,urg:!!t.urg,imp:!!t.imp,fw:t.fw||null,rec:(t.rid&&S.rec[t.rid]?clone(S.rec[t.rid].rule):null),recAll:true,dod:clone(t.dod||[]),real:Math.round((t.focus||0)/60)||'',due:t.due||null}};
    sh.dmon=(t.due&&t.due>todayISO()?t.due:todayISO()).slice(0,7);
  }else{
    var dd=day===undefined?todayISO():day;
    sh={kind:'task',mode:'new',off:{},open:null,more:false,multi:false,mon:((dd&&dd>todayISO())?dd:todayISO()).slice(0,7),pick:null,del:false,
      d:{raw:'',ctx:lastCtx,est:30,day:dd,end:null,urg:false,imp:true,fw:null,rec:null,dod:[],due:null}};
    sh.dmon=todayISO().slice(0,7);
  }
  renderSheet();fitTitle();
  if(sh.mode==='new')setTimeout(function(){var i=$('#f-title');if(i)i.focus()},60);
}
function applySheet(t,d){
  var day=d.day||null,end=(!d.rec&&day&&d.end&&d.end>day)?d.end:null;
  Object.assign(t,{title:d.title,ctx:d.ctx,est:d.est,day:day,urg:!!d.urg,imp:!!d.imp,fw:d.fw||null,dod:(d.dod||[]).slice(0,MAXSTEPS).map(function(x){return {t:String(x.t).slice(0,120),d:!!x.d}})});
  if(end)t.end=end;else delete t.end;
  if(d.due&&/^\d{4}-\d{2}-\d{2}$/.test(d.due))t.due=d.due;else delete t.due;
  if(!t.day)t.mit=false;
  if(sh.mode==='edit'&&d.real!=null&&d.real!==''&&Number(d.real)>=0&&Number(d.real)!==Math.round((t.focus||0)/60))t.focus=Math.round(Number(d.real))*60;
  d.dodText=t.dod.map(function(x){return x.t}).join('\n');
  applyRec(t,d);
}
function saveTask(){
  absorb();
  var d=eff();
  if(!d.title){toast('Dê um nome à tarefa.');var i=$('#f-title');if(i)i.focus();return}
  var isNew=sh.mode==='new',t;
  if(isNew){t={id:uid(),status:'todo',slips:0,focus:0,pomos:0,mit:false,ex:false,created:Date.now(),est0:d.est};S.tasks.push(t)}
  else t=byId(sh.id);
  if(!t){sh=null;renderSheet();return}
  applySheet(t,d);
  lastCtx=d.ctx;
  sh=null;persist();renderSheet();render();
  toast(whereText(t,isNew),'Ver',function(){showTask(t.id)});
  if(tab==='hoje'&&covers(t,todayISO()))flashTask(t.id);
}
function addStep(){
  var i=$('#f-step'),v=i?i.value.trim():'';
  if(!v){if(i)i.focus();return}
  sh.d.dod=sh.d.dod||[];if(sh.d.dod.length>=MAXSTEPS)return;
  sh.d.dod.push({t:v.slice(0,120),d:false});renderSheet();
  var n=$('#f-step');if(n)n.focus();
}
