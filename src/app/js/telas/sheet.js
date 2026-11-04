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
    '<span class="lab" style="margin-top:18px">Datas, etapas e repetição</span>'+
    it('Escrever do seu jeito','você quer criar rápido.','Ao criar, escreva "sáb a ter 2h #freelas" ou "amanhã 30min !". O app entende data, período, tempo, contexto e importância. Toque no × de um destaque para manter a palavra no título.')+
    it('Vários dias','o trabalho ocupa um período, como de sábado a terça.','Em Quando, escolha Vários dias e toque no primeiro e no último dia. A tarefa aparece em cada dia, com "dia 2 de 4", até você concluir. O tempo é por dia.')+
    it('Etapas','a tarefa tem partes ou o fim é vago.','Em Mais opções, liste as etapas. Elas aparecem no card e no foco, e você marca uma a uma.')+
    it('Repetir','a tarefa volta sempre (treino, fatura, relatório).','Escolha todo dia, dias úteis, toda semana ou todo mês. O app mantém os próximos 14 dias criados.')+
    '';
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
    return '<div class="step"><span>'+DAYS[dw]+' <span class="muted" style="font-size:.8125rem">'+parseISO(d).getDate()+'</span></span><span style="display:flex;align-items:center"><button class="ib" data-act="cap" data-i="'+dw+'" data-d="-30" aria-label="Menos 30 minutos">'+ic('left',20)+'</button><span class="val">'+(S.cap[dw]?fmt(S.cap[dw]):'livre')+'</span><button class="ib" data-act="cap" data-i="'+dw+'" data-d="30" aria-label="Mais 30 minutos">'+ic('right',20)+'</button></span></div>'}).join('');
  h+='</div><p class="hint" style="margin:0">As tarefas sem data são distribuídas por prioridade: primeiro o que é urgente e importante, depois o importante, sem passar da capacidade de cada dia.</p>';
  h+='<div class="sh-actions"><button class="btn btn-p" data-act="autoplan">Distribuir tarefas sem data</button><button class="btn btn-s" data-act="sh-close">Fechar</button></div>';
  return h;
}
// Folhas: diálogo com nome (o título h2), fundo inerte enquanto aberta, foco entra ao abrir,
// fica no mesmo controle quando a folha se redesenha e volta para quem abriu ao fechar.
var shOpener=null,SHBG=['.wrap','#tabs','#mini'];
function focusKey(el){if(!el||!el.closest||!el.closest('.sheet'))return null;if(el.id)return '#'+el.id;var a=el.getAttribute('data-act');if(!a)return null;var k='[data-act="'+a+'"]';['data-v','data-id','data-d','data-i'].forEach(function(x){var v=el.getAttribute(x);if(v!=null)k+='['+x+'="'+v.replace(/"/g,'\\"')+'"]'});return k}
function sheetBg(on){SHBG.forEach(function(q){var e=document.querySelector(q);if(!e)return;if(on){if(!e.hasAttribute('inert')){e.setAttribute('inert','');e.dataset.shInert='1'}}else if(e.dataset.shInert){e.removeAttribute('inert');delete e.dataset.shInert}})}
function renderSheet(){
  var host=$('#sheet');
  if(!sh){
    var had=!!host.querySelector('.sheet');
    host.innerHTML='';document.documentElement.classList.remove('lock');sheetBg(false);
    if(had){var o=shOpener;shOpener=null;setTimeout(function(){if(o&&document.body.contains(o)&&!o.closest('[inert]'))try{o.focus({preventScroll:true})}catch(e){}},0)}
    return;
  }
  var old=host.querySelector('.sheet'),sc=old?old.scrollTop:0,fk=old?focusKey(document.activeElement):null;
  if(!old)shOpener=document.activeElement&&document.activeElement!==document.body?document.activeElement:null;
  host.innerHTML='<div class="scrim"><div class="backdrop" data-act="sh-close"></div><div class="sheet" role="dialog" aria-modal="true">'+({plan:planSheetHTML,help:helpSheetHTML,pw:pwSheetHTML,del:delSheetHTML,menu:menuSheetHTML,late:lateSheetHTML,note:noteSheetHTML}[sh.kind]||taskSheetHTML)()+'</div></div>';
  document.documentElement.classList.add('lock');sheetBg(true);
  var n=host.querySelector('.sheet');if(!n)return;
  n.scrollTop=sc;
  var t=n.querySelector('h2');if(t){t.id='sh-t';n.setAttribute('aria-labelledby','sh-t')}
  var f=fk&&n.querySelector(fk);
  if(f)try{f.focus({preventScroll:true})}catch(e){}
  else if(!old&&t){t.setAttribute('tabindex','-1');setTimeout(function(){var a=document.activeElement;if(!(a&&a.closest&&a.closest('.sheet')))try{t.focus({preventScroll:true})}catch(e){}},80)}
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
