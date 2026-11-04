/* ---------- perfil ---------- */
function avatarBtn(){
  return '<button class="avbtn" data-act="perfil" aria-label="Abrir perfil'+(profName()?' de '+esc(profName()):'')+'">'+avatarHTML()+'</button>';
}
function viewPerfil(){
  var p=S.prof||{},h='<header class="top"><div><div class="eyebrow">Perfil</div><h1 class="h1">'+(profName()?esc(profName()):'Você')+'</h1></div><div class="nav"><button class="ib" data-act="perfil-back" aria-label="Voltar">'+ic('left')+'</button></div></header>';
  h+='<div class="cols"><div class="col">';
  // você
  h+='<div class="panel"><div class="pf-me">'+avatarHTML('lg')+'<div class="btns">'+
    (SB?'<label class="btn btn-s sm pf-file">'+(p.avk?'Trocar foto':'Adicionar foto')+'<input type="file" id="pf-photo" data-in="photo" accept="image/jpeg,image/png,image/webp,image/heic,image/heif"></label>'+(p.avk?'<button class="btn btn-s sm" data-act="photo-del">Remover</button>':''):'')+
    '</div></div>'+
    '<div><label class="lab" for="pf-name">Como quer ser chamado</label><input id="pf-name" class="inp" data-in="pname" maxlength="60" autocomplete="nickname" value="'+esc(profName())+'" placeholder="Seu nome ou apelido"></div>'+
    (SB?'<p class="hint" style="margin:0">A foto é reduzida e regravada no aparelho antes de ser enviada: informações escondidas no arquivo, como o local onde foi tirada, não saem do seu celular.</p>':'')+'</div>';
  // conta
  if(SB)h+=secHTML('Conta')+'<div class="panel"><div><span class="lab">E-mail</span><p style="margin:0;word-break:break-all">'+esc(meEmail||'...')+'</p></div><div class="btns"><button class="btn btn-s sm" data-act="pw-open">Alterar senha</button><button class="btn btn-s sm" data-act="lock">Sair da conta</button><button class="btn btn-s sm" data-act="lock-all">Sair de todos os aparelhos</button></div><p class="hint" style="margin:0">Ao sair, suas tarefas continuam guardadas na sua conta. Este aparelho só apaga a cópia local.</p>'+mfaPanelHTML()+'</div>';
  // preferências
  h+=secHTML('Preferências')+'<div class="panel">'+timerSettings()+'<div><span class="lab">Nome dos contextos</span><div class="stack">'+CTX.map(function(c){return '<div class="rn"><i class="dot" style="background:var('+c.v+')"></i><input class="inp" id="cn-'+c.id+'" data-in="ctxname" data-c="'+c.id+'" value="'+esc(cname(c.id))+'" aria-label="Nome do contexto" autocomplete="off"></div>'}).join('')+'</div></div></div>';
  h+='<div id="pf-game"></div>'+secHTML('Sequência e obra')+'<div class="panel">'+gameSettings()+'</div>';
  h+='</div><div class="col">';
  // dados
  h+=secHTML('Dados')+'<div class="panel"><div><span class="lab">Sincronização</span><p class="sync" id="sync" style="margin:0 0 10px">'+syncText()+'</p><div class="btns"><button class="btn btn-s sm" data-act="copy-backup">Copiar backup</button></div></div><div><label class="lab" for="restore">Restaurar backup</label><textarea id="restore" class="inp" data-in="restore" rows="2" placeholder="Cole aqui o backup copiado antes">'+esc(restoreTxt)+'</textarea><div class="btns" style="margin-top:10px"><button class="btn btn-s sm" data-act="restore">Restaurar</button></div></div></div>';
  // privacidade
  if(SB)h+=secHTML('Privacidade')+'<div class="panel"><div><span class="lab">Seus dados</span><p class="hint" style="margin:0 0 10px">Baixe tudo o que a sua conta guarda, num arquivo que você pode abrir em qualquer lugar.</p><div class="btns"><button class="btn btn-s sm" data-act="export">Exportar meus dados</button></div></div><div><span class="lab">Excluir conta</span><p class="hint" style="margin:0 0 10px">Apaga a conta e tudo o que ela guarda, em todos os aparelhos.</p><div class="btns"><button class="btn btn-d sm" data-act="del-open">Excluir minha conta</button></div></div><div class="pf-legal"><a href="privacidade.html" target="_blank" rel="noopener">Política de privacidade</a><a href="termos.html" target="_blank" rel="noopener">Termos de uso</a></div></div>';
  // ajuda
  h+=secHTML('Ajuda')+'<div class="panel"><div class="btns"><button class="btn btn-s sm" data-act="help">Guia do Prumo</button></div><p class="hint" style="margin:0">Versão '+esc(BUILD)+'</p></div>';
  h+='</div></div>';
  return h;
}
