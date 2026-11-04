/* ---------- verificação em duas etapas (TOTP, app autenticador) ---------- */
// Ativar pede a senha de novo; desativar pede o código. Quem ativou só lê e grava dados com sessão aal2
// (policies restritivas no banco). Trocar a senha e excluir a conta também pedem o código.
var mfaOn=null,mfaBusy=false;
async function mfaFactors(){var r=await SB.auth.mfa.listFactors();if(r.error)throw r.error;return (r.data&&r.data.totp)||[]}
async function mfaRefresh(){
  if(!SB||!SBU)return;
  try{var on=(await mfaFactors()).some(function(f){return f.status==='verified'});
    if(on!==mfaOn){mfaOn=on;if(sh&&/^(pw|del)$/.test(sh.kind))renderSheet();else if(tab==='perfil'&&!sh)softRender()}}catch(e){}
}
// a sessão já passou pelo segundo fator, ou a conta não usa
async function aalOk(){try{var a=await SB.auth.mfa.getAuthenticatorAssuranceLevel();return !(a.data&&a.data.nextLevel==='aal2'&&a.data.currentLevel!=='aal2')}catch(e){return true}}
async function mfaVerify(code){
  var f=(await mfaFactors()).filter(function(x){return x.status==='verified'})[0];
  if(!f)return {error:{message:'sem fator'}};
  return SB.auth.mfa.challengeAndVerify({factorId:f.id,code:code});
}
function mfaCode(id){return String(($('#'+id)||{}).value||'').replace(/\D/g,'')}
function mfaCodeField(id,label){return '<div><label class="lab" for="'+id+'">'+(label||'Código do app autenticador')+'</label><input id="'+id+'" class="inp mfa-code" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" autocapitalize="none" autocorrect="off" spellcheck="false"></div>'}
function mfaPanelHTML(){
  return '<div><span class="lab">Verificação em duas etapas</span>'+
    (mfaOn===null?'<p class="hint" style="margin:0">Verificando...</p>':
    mfaOn?'<p style="margin:0 0 10px"><b class="mfa-on">Ativada.</b> Ao entrar num aparelho, o Prumo pede também o código do seu app autenticador.</p><div class="btns"><button class="btn btn-s sm" data-act="mfa-open">Desativar</button></div>':
    '<p class="hint" style="margin:0 0 10px">Além da senha, pede um código de 6 dígitos do app autenticador (Senhas do iPhone, Google Authenticator, 1Password...). Mesmo que alguém descubra a sua senha, não entra.</p><div class="btns"><button class="btn btn-s sm" data-act="mfa-open">Ativar</button></div>')+'</div>';
}
function mfaSheetHTML(){
  var st=sh.step,h='<div class="sh-head"><h2 class="h2">'+(st==='off'?'Desativar a verificação':'Verificação em duas etapas')+'</h2><button class="ib" data-act="sh-close" aria-label="Fechar">'+ic('x')+'</button></div>';
  if(st==='pw')h+='<p class="hint" style="margin:-8px 0 0">Primeiro, confirme que é você.</p><div><label class="lab" for="mfa-pw">Sua senha</label><input id="mfa-pw" class="inp" type="password" autocomplete="current-password" autocapitalize="none" autocorrect="off" spellcheck="false" maxlength="128"></div>'+
    '<p class="hint" id="mfa-msg" style="margin:0" aria-live="polite"></p><div class="sh-actions"><button class="btn btn-p" data-act="mfa-start">Continuar</button></div>';
  else if(st==='qr')h+='<ol class="mfa-steps"><li>No iPhone, toque em <b>Adicionar ao app de senhas</b>. Em outro aparelho, leia o QR code com o app autenticador.</li><li>Digite abaixo o código de 6 dígitos que aparecer.</li></ol>'+
    '<div class="mfa-qr"><img src="'+esc(sh.qr)+'" width="176" height="176" alt="QR code para o app autenticador"><div class="btns"><a class="btn btn-s sm" href="'+esc(sh.uri)+'">Adicionar ao app de senhas</a></div></div>'+
    '<div><span class="lab">Ou digite esta chave no app</span><p class="mfa-key" id="mfa-key">'+esc(String(sh.secret).replace(/(.{4})/g,'$1 ').trim())+'</p><div class="btns"><button class="btn btn-s sm" data-act="mfa-copy">Copiar chave</button></div></div>'+
    mfaCodeField('mfa-c')+'<p class="hint" id="mfa-msg" style="margin:0" aria-live="polite">Ao ativar, os outros aparelhos saem da conta e pedem o código no próximo login.</p><div class="sh-actions"><button class="btn btn-p" data-act="mfa-confirm">Ativar</button></div>';
  else h+='<p class="hint" style="margin:-8px 0 0">Sem a verificação, a sua conta fica protegida só pela senha.</p>'+mfaCodeField('mfa-c')+
    '<p class="hint" id="mfa-msg" style="margin:0" aria-live="polite"></p><div class="sh-actions"><button class="btn btn-d" data-act="mfa-off">Desativar</button><button class="btn btn-s" data-act="sh-close">Cancelar</button></div>';
  return h;
}
function mfaSay(t,ok){var m=$('#mfa-msg');if(m){m.textContent=t;m.style.color=ok?'':'var(--bad)'}}
async function mfaRun(fn){if(mfaBusy)return;mfaBusy=true;try{await fn()}catch(e){mfaSay('Sem conexão. Tente de novo.')}finally{mfaBusy=false}}
function mfaStart(){return mfaRun(async function(){
  var pw=($('#mfa-pw')||{}).value||'';if(!pw){mfaSay('Digite sua senha.');return}
  mfaSay('Verificando...',true);
  var v=await SB.auth.signInWithPassword({email:meEmail,password:pw});
  if(v.error){mfaSay(v.error.status===429?'Muitas tentativas. Aguarde alguns minutos.':'Senha incorreta.');return}
  // tentativa anterior que não foi até o fim: descarta
  var fs=await mfaFactors();for(var i=0;i<fs.length;i++)if(fs[i].status!=='verified')await SB.auth.mfa.unenroll({factorId:fs[i].id});
  var r=await SB.auth.mfa.enroll({factorType:'totp',issuer:'Prumo'});
  if(r.error||!r.data){mfaSay('Não consegui começar agora. Tente de novo.');return}
  sh={kind:'mfa',step:'qr',fid:r.data.id,qr:r.data.totp.qr_code,secret:r.data.totp.secret,uri:r.data.totp.uri};renderSheet();
  setTimeout(function(){var c=$('#mfa-c');if(c)c.focus()},60);
})}
function mfaConfirm(){return mfaRun(async function(){
  var c=mfaCode('mfa-c');if(c.length!==6){mfaSay('Digite os 6 dígitos do app.');return}
  var r=await SB.auth.mfa.challengeAndVerify({factorId:sh.fid,code:c});
  if(r.error){mfaSay('Código incorreto. Confira se o horário do aparelho está certo e tente de novo.');return}
  mfaOn=true;sh=null;renderSheet();render();toast('Verificação em duas etapas ativada.');
})}
function mfaOff(){return mfaRun(async function(){
  var c=mfaCode('mfa-c');if(c.length!==6){mfaSay('Digite os 6 dígitos do app.');return}
  var v=await mfaVerify(c);if(v.error){mfaSay('Código incorreto.');return}
  var fs=await mfaFactors();for(var i=0;i<fs.length;i++){var u=await SB.auth.mfa.unenroll({factorId:fs[i].id});if(u.error){mfaSay('Não consegui desativar. Tente de novo.');return}}
  try{await SB.auth.refreshSession()}catch(e){}
  mfaOn=false;sh=null;renderSheet();render();toast('Verificação em duas etapas desativada.');
})}
