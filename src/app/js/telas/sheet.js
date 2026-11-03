var EST_MAIN=[2,15,30,60,120,240];
function optRow(key,title,sum){
  var o=sh.sec===key;
  return '<button class="optrow" data-act="sh-sec" data-v="'+key+'" aria-expanded="'+o+'"><span class="ot">'+title+'</span><span class="os">'+esc(sum||'')+'</span>'+ic(o?'up':'down',18)+'</button>';
}
function taskSheetHTML(){
  var cur0=sh.mode==='edit'?byId(sh.id):null,grp=!!(cur0&&isGrp(cur0)),par=cur0&&cur0.parent&&byId(cur0.parent);
  var d=sh.d,td=todayISO(),tm=addDays(td,1),sug=suggestFw(d),cur=d.fw||sug,q=quad(d);
  var custom=d.day&&d.day!==td&&d.day!==tm,other=EST_MAIN.indexOf(d.est)<0||sh.estOpen;
  var h='<div class="sh-head"><h2 class="h2">'+(sh.mode==='new'?'Nova tarefa':'Editar tarefa')+'</h2><button class="ib" data-act="sh-close" aria-label="Fechar">'+ic('x')+'</button></div>';
  if(par)h+='<p class="hint" style="margin:-6px 0 0">Entrega da pauta <b>'+esc(par.title)+'</b>. <button class="link" data-act="kid-open" data-id="'+par.id+'">Abrir a pauta</button></p>';
  h+='<div><label class="lab" for="f-title">O que precisa ser feito?</label><input id="f-title" class="inp" data-in="title" value="'+esc(d.title)+'" placeholder="Ex.: Enviar a proposta ao cliente" autocomplete="off" enterkeyhint="done"></div>';
  h+='<div><span class="lab">Contexto</span><div class="chips">'+CTX.map(function(c){return chip(esc(cname(c.id)),d.ctx===c.id,'data-act="sh-ctx" data-v="'+c.id+'"','<i class="dot" style="background:var('+c.v+')"></i>')}).join('')+'</div></div>';
  if(!grp)h+='<div><span class="lab">Quando</span><div class="chips">'+chip('Hoje',d.day===td,'data-act="sh-day" data-v="'+td+'"')+chip('Amanhã',d.day===tm,'data-act="sh-day" data-v="'+tm+'"')+
    '<label class="chip" aria-pressed="'+(!!custom)+'">'+(custom?esc(shortDate(d.day)):'Outra data')+'<input type="date" id="f-date" data-in="date" aria-label="Escolher outra data" value="'+(custom?d.day:'')+'"></label>'+chip('Sem data',!d.day,'data-act="sh-day" data-v="none"')+'</div></div>';
  h+='<div><span class="lab">'+(grp?'Estimativa da pauta':'Quanto tempo?')+'</span><div class="chips">'+EST_MAIN.map(function(m){return chip(fmt(m),d.est===m&&!sh.estOpen,'data-act="sh-est" data-v="'+m+'"')}).join('')+chip(other&&EST_MAIN.indexOf(d.est)<0?'Outro: '+fmt(d.est):'Outro',other,'data-act="sh-est-other"')+'</div>'+
    (other?'<div class="est-in"><label class="lab" for="f-est" style="margin:0">Minutos</label><input id="f-est" class="inp" data-in="est" type="number" inputmode="numeric" min="1" max="960" placeholder="ex.: 200" value="'+(EST_MAIN.indexOf(d.est)<0?d.est:'')+'"></div>':'')+'</div>';
  if(!grp)h+='<div id="sug-box" class="sugg">'+sugInner(d)+'</div>';
  h+='<div class="opts">';
  var canRec=!par&&!grp&&!d.parent&&!(sh.pend&&sh.pend.length);
  if(canRec){
    h+=optRow('rep','Repetir',recLabel(d.rec));
    if(sh.sec==='rep'){
      h+='<div class="optbody"><div class="chips">'+[['none','Não repete'],['daily','Todo dia'],['weekdays','Dias úteis'],['weekly','Toda semana'],['monthly','Todo mês']].map(function(x){var on=x[0]==='none'?!d.rec:(d.rec&&d.rec.t===x[0]);return chip(x[1],!!on,'data-act="sh-rec" data-v="'+x[0]+'"')}).join('')+'</div>';
      if(d.rec&&d.rec.t==='weekly')h+='<div class="chips" style="margin-top:10px">'+[1,2,3,4,5,6,0].map(function(w){return chip(DABR[w],(d.rec.dows||[]).indexOf(w)>=0,'data-act="rec-dow" data-v="'+w+'"')}).join('')+'</div>';
      if(d.rec&&sh.mode==='edit'&&cur0&&cur0.rid)h+='<div class="chips" style="margin-top:10px">'+chip('Aplicar às próximas repetições',!!d.recAll,'data-act="rec-all"')+'</div>';
      h+='<p class="hint" style="margin:10px 0 0">'+(d.rec?'Os próximos 14 dias são criados automaticamente, e novos aparecem a cada dia.':'Para tarefas que voltam sempre, como treino, fatura ou relatório.')+'</p></div>';
    }
  }
  if(par){
    h+=optRow('par','Pauta',par.title);
    if(sh.sec==='par')h+='<div class="optbody">'+parSheetHTML()+'</div>';
  }
  if(!par){
    var ns=grp?kidsOf(sh.id).length:0;
    h+=optRow('split','Dividir em entregas ou dias',grp?ns+' entregas':(sh.pend&&sh.pend.length?'a criar':(d.parent?'em uma pauta':'')));
    if(sh.sec==='split'){
      h+='<div class="optbody">';
      if(!grp&&!(sh.pend&&sh.pend.length))h+=parSheetHTML();
      if(!sh.d.parent)h+=kidsSheetHTML();
      h+='</div>';
    }
  }
  if(!grp){
    h+=optRow('prio','Prioridade e método',QD[q].n+' · '+FW[cur].name);
    if(sh.sec==='prio'){
      h+='<div class="optbody"><span class="lab">Prioridade</span><div class="chips">'+chip('Urgente',!!d.urg,'data-act="sh-urg"')+chip('Importante',!!d.imp,'data-act="sh-imp"')+'</div><p class="verdict"><b>'+QD[q].n+'.</b> '+QD[q].s+'.</p>'+
        '<span class="lab" style="margin-top:14px">Como atacar</span><div class="fwgrid">'+Object.keys(FW).map(function(k){return '<button class="fwopt" data-act="sh-fw" data-v="'+k+'" aria-pressed="'+(cur===k)+'"><b>'+esc(FW[k].name)+'</b><small>'+esc(FW[k].best)+(k===sug?' · sugerido':'')+'</small></button>'}).join('')+'</div><p class="verdict">'+esc(FW[cur].how)+'<b id="pomo-n">'+pomoText(d,cur)+'</b></p><button class="link" data-act="help" style="margin-top:8px">Entender os métodos</button></div>';
    }
    h+=optRow('dod','Pronto quando',(d.dodText||'').split('\n').filter(function(x){return x.trim()}).length?(d.dodText.split('\n').filter(function(x){return x.trim()}).length+' critérios'):'');
    if(sh.sec==='dod')h+='<div class="optbody"><label class="lab" for="f-dod">Uma linha por critério</label><textarea id="f-dod" class="inp" data-in="dodText" rows="3" placeholder="Ex.: Arquivos exportados&#10;Cliente aprovou">'+esc(d.dodText)+'</textarea></div>';
    if(sh.mode==='edit'){
      h+=optRow('real','Tempo real gasto',d.real?fmt(Number(d.real)):'');
      if(sh.sec==='real')h+='<div class="optbody"><label class="lab" for="f-real">Minutos</label><input id="f-real" class="inp" data-in="real" type="number" inputmode="numeric" min="0" max="1440" placeholder="Preenche sozinho se usar o cronômetro" value="'+esc(d.real)+'"></div>';
    }
  }
  h+='</div>';
  var isRec=!!(cur0&&cur0.rid&&S.rec[cur0.rid]);
  h+='<div class="sh-actions"><button class="btn btn-p" data-act="sh-save">'+(sh.mode==='new'?'Criar tarefa':'Salvar')+'</button>';
  if(sh.mode==='edit'){
    if(isRec&&sh.del)h+='<button class="btn btn-s" data-act="sh-del1" style="color:var(--bad)">Excluir só esta</button><button class="btn btn-s" data-act="sh-delall" style="color:var(--bad)">Esta e as próximas</button>';
    else h+='<button class="btn btn-s" data-act="sh-del" style="color:var(--bad)">'+(sh.del?'Confirmar exclusão':'Excluir tarefa')+'</button>';
  }
  return h+'</div>';
}
function helpSheetHTML(){
  var h='<div class="sh-head"><h2 class="h2">Guia do Prumo</h2><button class="ib" data-act="sh-close" aria-label="Fechar">'+ic('x')+'</button></div>';
  var it=function(t,use,how){return '<div class="helpit"><b>'+t+'</b><p><span class="muted">Use quando:</span> '+use+'</p><p>'+how+'</p></div>'};
  h+='<span class="lab">Como atacar uma tarefa</span>'+
    it('Pomodoro','a tarefa é longa ou exige concentração.','Trabalhe 25 minutos sem interrupção, descanse 5. A cada 4 rodadas, descanse 15. As pausas mantêm a cabeça fresca até o fim do dia.')+
    it('Timebox','você tende a refinar demais, ou a tarefa não tem um fim claro.','O tempo estimado vira um teto. Quando acabar, entregue o que tiver e decida o próximo passo. Bom o bastante conta.')+
    it('Só 5 minutos','você vem adiando a tarefa.','Combine só 5 minutos. Começar é a parte mais difícil: depois disso, continuar costuma ser fácil, e parar também vale.')+
    it('Regra dos 2 minutos','a tarefa leva até 2 minutos.','Faça agora. Anotar, agendar e responder levam mais tempo do que simplesmente fazer.')+
    '<span class="lab" style="margin-top:18px">Organização</span>'+
    it('Prioridade (Eisenhower)','você precisa decidir o que vem primeiro.','Urgente e importante: faça agora. Importante sem urgência: agende. Urgente sem importância: encurte ou delegue. Nenhum dos dois: solte.')+
    it('Prioridades do dia e o Sapo','o dia está cheio.','Marque até 3 estrelas. A mais pesada vira o Sapo: faça antes de tudo, quando a energia é maior.')+
    it('Limite de 3 em andamento','você começa muita coisa e termina pouca.','O app só deixa 3 tarefas em andamento ao mesmo tempo. Termine uma para começar outra.')+
    it('Capacidade do dia','você planeja mais do que cabe.','É o tempo de foco real que cabe em cada dia, sem reuniões. Comece com menos do que acha que consegue.')+
    it('Pronto quando','o fim da tarefa é vago.','Liste os critérios para dar a tarefa por concluída. Fica claro quando parar.')+
    '<span class="lab" style="margin-top:18px">Repetição e divisão</span>'+
    it('Repetir','a tarefa volta sempre (treino, fatura, relatório).','Escolha todo dia, dias úteis, toda semana ou todo mês. O app mantém os próximos 14 dias criados.')+
    it('Pautas e entregas','um trabalho grande tem partes que podem ir para dias diferentes.','Divida em entregas, cada uma com data, tempo e cronômetro próprios. Ou distribua tempo por vários dias, como 2h por dia durante uma semana.');
  return h+'<div class="sh-actions"><button class="btn btn-p" data-act="sh-close">Entendi</button></div>';
}
function pwSheetHTML(){
  var pf=function(id,label,ac,ph){return '<div><label class="lab" for="'+id+'">'+label+'</label><input id="'+id+'" class="inp" type="password" autocomplete="'+ac+'" autocapitalize="none" autocorrect="off" spellcheck="false" maxlength="128"'+(ph?' placeholder="'+ph+'"':'')+'></div>'};
  return '<div class="sh-head"><h2 class="h2">Alterar senha</h2><button class="ib" data-act="sh-close" aria-label="Fechar">'+ic('x')+'</button></div>'+
    pf('pw0','Senha atual','current-password')+
    pf('pw1','Nova senha','new-password','Mínimo de 12 caracteres')+
    pf('pw2','Repita a nova senha','new-password')+
    '<p class="hint" id="pw-msg" style="margin:0" aria-live="polite">Use uma senha longa e única. Ao salvar, os outros aparelhos conectados saem da conta.</p>'+
    '<div class="sh-actions"><button class="btn btn-p" data-act="pw-save">Salvar nova senha</button><button class="btn btn-s" data-act="sh-close">Cancelar</button></div>';
}
function planSheetHTML(){
  var wk=curWk();
  var h='<div class="sh-head"><h2 class="h2">Planejar a semana</h2><button class="ib" data-act="sh-close" aria-label="Fechar">'+ic('x')+'</button></div>';
  h+='<p class="hint" style="margin:0">Capacidade é o tempo de foco real que cabe em cada dia, sem contar reuniões e imprevistos. Comece com menos do que você acha que consegue.</p><div>';
  h+=[0,1,2,3,4,5,6].map(function(i){var dw=(i+1)%7,d=addDays(wk,i);
    return '<div class="step"><span>'+DAYS[dw]+' <span class="muted" style="font-size:13px">'+parseISO(d).getDate()+'</span></span><span style="display:flex;align-items:center"><button class="ib" data-act="cap" data-i="'+dw+'" data-d="-30" aria-label="Menos 30 minutos">'+ic('left',20)+'</button><span class="val">'+(S.cap[dw]?fmt(S.cap[dw]):'livre')+'</span><button class="ib" data-act="cap" data-i="'+dw+'" data-d="30" aria-label="Mais 30 minutos">'+ic('right',20)+'</button></span></div>'}).join('');
  h+='</div><p class="hint" style="margin:0">O backlog é distribuído por prioridade: primeiro o que é urgente e importante, depois o importante, sem passar da capacidade de cada dia.</p>';
  h+='<div class="sh-actions"><button class="btn btn-p" data-act="autoplan">Distribuir o backlog</button><button class="btn btn-s" data-act="sh-close">Fechar</button></div>';
  return h;
}
function renderSheet(){
  var host=$('#sheet');
  if(!sh){host.innerHTML='';document.documentElement.classList.remove('lock');return}
  var old=host.querySelector('.sheet'),sc=old?old.scrollTop:0;
  host.innerHTML='<div class="scrim"><div class="backdrop" data-act="sh-close"></div><div class="sheet" role="dialog" aria-modal="true">'+(sh.kind==='plan'?planSheetHTML():(sh.kind==='help'?helpSheetHTML():(sh.kind==='pw'?pwSheetHTML():taskSheetHTML())))+'</div></div>';
  document.documentElement.classList.add('lock');
  var n=host.querySelector('.sheet');if(n)n.scrollTop=sc;
}
function openTask(id,day){
  if(id){var t=byId(id);if(!t)return;
    sh={kind:'task',mode:'edit',id:id,more:true,sec:(isGrp(t)?'split':null),del:false,d:{title:t.title,ctx:t.ctx,est:t.est,day:t.day,urg:!!t.urg,imp:!!t.imp,fw:t.fw||null,parent:t.parent||null,rec:(t.rid&&S.rec[t.rid]?clone(S.rec[t.rid].rule):null),recAll:true,dodText:(t.dod||[]).map(function(x){return x.t}).join('\n'),real:Math.round((t.focus||0)/60)||''}};
  }else sh={kind:'task',mode:'new',more:false,del:false,d:{title:'',rec:null,ctx:lastCtx,est:30,day:day===undefined?todayISO():day,urg:false,imp:true,fw:null,parent:null,dodText:''}};
  renderSheet();
  if(sh.mode==='new')setTimeout(function(){var i=$('#f-title');if(i)i.focus()},60);
}
var pwBusy=false;
async function savePw(){
  if(pwBusy)return;
  var c=($('#pw0')||{}).value||'',a=($('#pw1')||{}).value||'',b=($('#pw2')||{}).value||'',m=$('#pw-msg');
  var say=function(t,bad){if(m){m.textContent=t;m.style.color=bad?'var(--bad)':''}};
  if(!SB||!SBU){say('Entre na conta para alterar a senha.',true);return}
  if(!c){say('Informe a senha atual.',true);return}
  if(a===c){say('Escolha uma senha diferente da atual.',true);return}
  pwBusy=true;say('Verificando...');
  try{
    var u=await SB.auth.getUser(),me=u&&u.data&&u.data.user?u.data.user.email:'';
    var bad=window.prumoPw?await window.prumoPw.check(a,b,me):(a.length<12?'Use pelo menos 12 caracteres.':(a!==b?'As senhas não são iguais.':''));
    if(bad){say(bad,true);return}
    // confirma a senha atual antes de trocar (quem pegar o aparelho desbloqueado não troca a senha)
    var v=await SB.auth.signInWithPassword({email:me,password:c});
    if(v.error){say(v.error.status===429?'Muitas tentativas. Aguarde alguns minutos.':'A senha atual não confere.',true);return}
    var r=await SB.auth.updateUser({password:a});
    if(r.error){say(r.error.code==='same_password'?'Escolha uma senha diferente da atual.':(r.error.code==='weak_password'?'Essa senha é fraca ou apareceu em vazamentos. Escolha outra.':'Não consegui alterar. Tente de novo.'),true);return}
    try{await SB.auth.signOut({scope:'others'})}catch(e){}
    sh=null;renderSheet();toast('Senha alterada. Os outros aparelhos saíram da conta.');
  }catch(e){say('Sem conexão. Tente de novo.',true)}
  finally{pwBusy=false}
}
function saveTask(){
  var d=sh.d,title=d.title.trim();
  if(!title){toast('Dê um nome à tarefa.');var i=$('#f-title');if(i)i.focus();return}
  var t;
  if(sh.mode==='new'){t={id:uid(),status:'todo',slips:0,focus:0,pomos:0,mit:false,ex:false,created:Date.now(),est0:d.est};S.tasks.push(t)}
  else t=byId(sh.id);
  if(!t){sh=null;renderSheet();return}
  applySheet(t,d);
  var isNew=sh.mode==='new';
  if(isNew&&sh.pend&&sh.pend.length){sh.pend.forEach(function(x){mkKids(t,x.name,x.n,x.est,x.days,x.plan?t.title:null)});t.day=null;if(sh.pend.some(function(x){return x.plan}))t.est=sum(kidsOf(t.id),function(c){return c.est})}
  lastCtx=d.ctx;
  sh=null;persist();renderSheet();render();toast(isNew?'Tarefa criada.':'Tarefa salva.');
}
function applySheet(t,d){
  var old=t.dod||[],lines=d.dodText.split('\n').map(function(x){return x.trim()}).filter(Boolean).slice(0,12);
  Object.assign(t,{title:d.title.trim(),ctx:d.ctx,est:d.est,day:d.day,urg:d.urg,imp:d.imp,fw:d.fw,dod:lines.map(function(x){return {t:x,d:old.some(function(o){return o.t===x&&o.d})}})});
  if(isGrp(t))t.day=null;
  if(!t.day)t.mit=false;
  if(sh.mode==='edit'&&d.real!=null&&d.real!==''&&Number(d.real)!==Math.round((t.focus||0)/60)&&Number(d.real)>=0)t.focus=Math.round(Number(d.real))*60;
  applyRec(t,d);
  if(d.parent!==undefined&&!isGrp(t)){if(d.parent&&d.parent!==t.id&&byId(d.parent)&&isGrp(byId(d.parent)))t.parent=d.parent;else if(!d.parent)delete t.parent}
}

