(function(){
'use strict';
var $g=function(id){return document.getElementById(id)};
var gate=$g('gate'),form=$g('g-f'),body=$g('g-body'),err=$g('g-e'),btn=$g('g-b'),links=$g('g-l');
var sb=window.prumoSB;
var APPURL=location.origin+location.pathname.replace(/index\.html$/,'');
var LOCKABLE=['.wrap','#tabs','#sheet','#toast','#mini'];
var view='in',email='',otp='',busy=false,fails=0,until=0,resendAt=0,resendT=null;

/* ---------- senha: regras locais e checagem de vazamento (k-anonimato) ---------- */
var PW_MIN=12,PW_MAXB=72;
function pwProblem(pw,mail){
  if(pw.length<PW_MIN)return 'Use pelo menos '+PW_MIN+' caracteres.';
  if(new TextEncoder().encode(pw).length>PW_MAXB)return 'Use no máximo 72 caracteres.';
  var lp=String(mail||'').split('@')[0].toLowerCase();
  if(lp.length>=4&&pw.toLowerCase().indexOf(lp)>=0)return 'Não use o seu e-mail na senha.';
  if(/^(.)\1+$/.test(pw))return 'Evite repetir o mesmo caractere.';
  return '';
}
// Só os 5 primeiros caracteres do SHA-1 saem do aparelho; a resposta vem com preenchimento.
// Se o serviço não responder, não bloqueia.
async function pwPwned(pw){
  try{
    var h=new Uint8Array(await crypto.subtle.digest('SHA-1',new TextEncoder().encode(pw)));
    var hex=Array.prototype.map.call(h,function(x){return x.toString(16).padStart(2,'0')}).join('').toUpperCase();
    var ctl=new AbortController(),t=setTimeout(function(){ctl.abort()},4000);
    var r=await fetch('https://api.pwnedpasswords.com/range/'+hex.slice(0,5),{headers:{'Add-Padding':'true'},signal:ctl.signal,credentials:'omit',referrerPolicy:'no-referrer'});
    clearTimeout(t);
    if(!r.ok)return false;
    var rest=hex.slice(5);
    return (await r.text()).split('\n').some(function(l){var p=l.trim().split(':');return p[0]===rest&&Number(p[1])>0});
  }catch(e){return false}
}
async function pwCheck(pw,pw2,mail){
  var p=pwProblem(pw,mail);if(p)return p;
  if(pw2!==undefined&&pw!==pw2)return 'As senhas não são iguais.';
  if(await pwPwned(pw))return 'Essa senha apareceu em vazamentos de dados. Escolha outra.';
  return '';
}
window.prumoPw={check:pwCheck,min:PW_MIN};

/* ---------- mensagens: genéricas para não revelar se um e-mail tem conta ---------- */
function msgOf(e){
  var c=(e&&(e.code||''))+'',m=(e&&(e.message||''))+'',st=e&&e.status;
  if(st===429||/rate_limit/.test(c))return 'Muitas tentativas. Aguarde alguns minutos e tente de novo.';
  if(c==='invalid_credentials'||/invalid login/i.test(m))return 'E-mail ou senha incorretos.';
  if(c==='otp_expired'||/expired|invalid.*(otp|token)/i.test(m))return 'Código inválido ou expirado. Peça um novo.';
  if(c==='weak_password'||/weak|pwned/i.test(m))return 'Essa senha é fraca ou apareceu em vazamentos. Escolha outra.';
  if(c==='same_password')return 'Escolha uma senha diferente da atual.';
  if(c==='signup_disabled'||c==='unexpected_failure'||/database error saving new user/i.test(m))return 'Cadastro indisponível no momento.';
  if(/fetch|network|retryable/i.test(m+(e&&e.name)))return 'Sem conexão. Tente de novo.';
  return 'Não consegui concluir. Tente de novo.';
}
function say(t,ok){err.textContent=t||'';err.className='g-err'+(ok?' ok':'')}

/* ---------- telas ---------- */
function field(id,label,type,ac,extra){
  return '<div><label class="lab" for="'+id+'">'+label+'</label><input id="'+id+'" class="inp" type="'+type+'" autocomplete="'+ac+'" autocapitalize="none" autocorrect="off" spellcheck="false" '+(extra||'')+'></div>';
}
function pwField(id,label,ac,hint){
  return '<div class="g-pw"><label class="lab" for="'+id+'">'+label+'</label><input id="'+id+'" class="inp" type="password" autocomplete="'+ac+'" autocapitalize="none" autocorrect="off" spellcheck="false" maxlength="128"'+(hint?' aria-describedby="'+id+'-h"':'')+'>'+
    '<button type="button" class="g-eye" data-eye="'+id+'" aria-pressed="false" aria-label="Mostrar senha">Mostrar</button></div>'+(hint?'<p class="g-hint" id="'+id+'-h">'+hint+'</p>':'');
}
var EMAIL=function(){return field('g-em','E-mail','email','username','inputmode="email" maxlength="254"')};
var V={
  in:{t:'Entrar',b:'Entrar',p:'Entre com a sua conta para ver e sincronizar suas tarefas.',f:function(){return EMAIL()+pwField('g-pw','Senha','current-password')},
    l:[['up','Criar conta'],['forgot','Esqueci minha senha']]},
  up:{t:'Criar conta',b:'Criar conta',p:'Use um e-mail que você acessa: vamos mandar um código para confirmar.',
    f:function(){return EMAIL()+pwField('g-pw','Senha','new-password','Pelo menos '+PW_MIN+' caracteres. Uma frase longa funciona bem, ou deixe o gerenciador de senhas criar uma.')+pwField('g-pw2','Repita a senha','new-password')+'<p class="g-hint">Ao criar a conta, você concorda com os <a href="termos.html" target="_blank" rel="noopener">Termos de uso</a> e a <a href="privacidade.html" target="_blank" rel="noopener">Política de privacidade</a>.</p>'},
    l:[['in','Já tenho conta']]},
  forgot:{t:'Recuperar acesso',b:'Enviar código',p:'Informe o e-mail da conta. Se ele estiver cadastrado, você recebe um código para criar uma nova senha.',f:function(){return EMAIL()},l:[['in','Voltar']]},
  code:{t:'Confira seu e-mail',b:'Confirmar',p:'',f:function(){return field('g-code','Código','text','one-time-code','inputmode="numeric" maxlength="10" enterkeyhint="done"')},
    l:[['resend','Reenviar código'],['in','Voltar']]},
  newpw:{t:'Nova senha',b:'Salvar e entrar',p:'Crie uma nova senha para a sua conta. Os outros aparelhos conectados serão desconectados.',
    f:function(){return pwField('g-pw','Nova senha','new-password','Pelo menos '+PW_MIN+' caracteres.')+pwField('g-pw2','Repita a nova senha','new-password')},l:[]},
  wait:{t:'Prumo',b:'Aguarde',p:'Confirmando...',f:function(){return ''},l:[]}
};
function go(v,keepMsg){
  view=v;var d=V[v];
  $g('g-t').textContent=d.t;
  body.innerHTML='<p id="g-p"></p>'+d.f();
  var p=$g('g-p');
  if(v==='code'){
    p.appendChild(document.createTextNode(otp==='signup'?'Enviamos um código para ':'Se houver uma conta para '));
    var b=document.createElement('b');b.textContent=email;p.appendChild(b);
    p.appendChild(document.createTextNode(otp==='signup'?'. Digite o código ou toque no link do e-mail.':', enviamos um código. Digite-o abaixo.'));
  }else p.textContent=d.p;
  var c=$g('g-code');if(c)c.className='inp g-code';
  btn.textContent=d.b;btn.hidden=v==='wait';
  links.innerHTML=d.l.map(function(x){return '<button type="button" class="g-link" data-go="'+x[0]+'">'+x[1]+'</button>'}).join('');
  var em=$g('g-em');if(em&&email)em.value=email;
  if(!keepMsg)say('');
  tickResend();
  setTimeout(function(){var f=body.querySelector('input:not([value])')||body.querySelector('input');if(f&&!gate.hidden)f.focus()},50);
}
function tickResend(){
  clearTimeout(resendT);
  var b=links.querySelector('[data-go=resend]');if(!b)return;
  var s=Math.ceil((resendAt-Date.now())/1000);
  if(s>0){b.disabled=true;b.textContent='Reenviar em '+s+'s';resendT=setTimeout(tickResend,1000)}
  else{b.disabled=false;b.textContent='Reenviar código'}
}

/* ---------- mostrar/esconder ---------- */
function setInert(v){LOCKABLE.forEach(function(s){var e=document.querySelector(s);if(e){if(v)e.setAttribute('inert','');else e.removeAttribute('inert')}})}
function stored(){try{for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);if(/^sb-.*-auth-token$/.test(k)){var v=JSON.parse(localStorage.getItem(k));if(v&&v.refresh_token)return true}}}catch(e){}return false}
function unlock(){gate.hidden=true;setInert(false);body.innerHTML='';email='';otp=''}
function lock(v){gate.hidden=false;setInert(true);go(v||'in')}

/* ---------- ações ---------- */
function val(id){var e=$g(id);return e?e.value:''}
function readEmail(){var m=val('g-em').trim().toLowerCase();email=m;return m}
function okEmail(m){return m.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(m)}
async function submit(){
  if(view==='in'){
    var m=readEmail(),pw=val('g-pw');
    if(!m||!pw)return say('Informe e-mail e senha.');
    var wait=until-Date.now();if(wait>0)return say('Aguarde '+Math.ceil(wait/1000)+'s para tentar de novo.');
    var r=await sb.auth.signInWithPassword({email:m,password:pw});
    if(!r.error){fails=0;unlock();return}
    if(r.error.code==='email_not_confirmed'){otp='signup';go('code');say('Confirme o e-mail antes de entrar. Se o código venceu, peça outro.',true);return}
    fails++;var m0=msgOf(r.error);
    if(fails>=3&&r.error.code==='invalid_credentials'){var w=Math.min(60,(fails-2)*5);until=Date.now()+w*1000;m0+=' Aguarde '+w+'s para tentar de novo.'}
    return say(m0);
  }
  if(view==='up'){
    var m2=readEmail(),a=val('g-pw'),b=val('g-pw2');
    if(!okEmail(m2))return say('Informe um e-mail válido.');
    var bad=await pwCheck(a,b,m2);if(bad)return say(bad);
    var r2=await sb.auth.signUp({email:m2,password:a,options:{emailRedirectTo:APPURL}});
    if(r2.error)return say(msgOf(r2.error));
    if(r2.data&&r2.data.session){unlock();return}
    otp='signup';resendAt=Date.now()+60000;go('code');return;
  }
  if(view==='forgot'){
    var m3=readEmail();if(!okEmail(m3))return say('Informe um e-mail válido.');
    var r3=await sb.auth.resetPasswordForEmail(m3,{redirectTo:APPURL});
    if(r3.error&&(r3.error.status===429||/rate_limit|fetch|network/i.test((r3.error.code||'')+r3.error.message)))return say(msgOf(r3.error));
    otp='recovery';resendAt=Date.now()+60000;go('code');return;
  }
  if(view==='code'){
    var tk=val('g-code').replace(/\D/g,'');
    if(tk.length<6)return say('Digite o código que chegou no e-mail.');
    var r4=await sb.auth.verifyOtp({email:email,token:tk,type:otp==='recovery'?'recovery':'email'});
    if(r4.error)return say(msgOf(r4.error));
    if(otp==='recovery')go('newpw');else unlock();
    return;
  }
  if(view==='newpw'){
    var n1=val('g-pw'),n2=val('g-pw2'),u=await sb.auth.getUser(),me=u&&u.data&&u.data.user?u.data.user.email:'';
    var bad2=await pwCheck(n1,n2,me);if(bad2)return say(bad2);
    var r5=await sb.auth.updateUser({password:n1});
    if(r5.error)return say(msgOf(r5.error));
    try{await sb.auth.signOut({scope:'others'})}catch(e){}
    unlock();return;
  }
}
async function resend(){
  if(Date.now()<resendAt)return;
  resendAt=Date.now()+60000;tickResend();
  var r=otp==='recovery'?await sb.auth.resetPasswordForEmail(email,{redirectTo:APPURL}):await sb.auth.resend({type:'signup',email:email,options:{emailRedirectTo:APPURL}});
  if(r.error&&(r.error.status===429||/rate_limit|fetch|network/i.test((r.error.code||'')+r.error.message)))say(msgOf(r.error));
  else say('Se o e-mail puder receber, um novo código foi enviado.',true);
}
form.addEventListener('submit',async function(e){
  e.preventDefault();
  if(busy)return;
  if(!sb){say('Não consegui carregar o login. Recarregue a página.');return}
  busy=true;btn.disabled=true;say('');
  try{await submit()}catch(x){say(msgOf(x))}
  busy=false;btn.disabled=false;
});
gate.addEventListener('click',function(e){
  var t=e.target.closest('button');if(!t)return;
  if(t.dataset.eye){var i=$g(t.dataset.eye),sh=i.type==='password';i.type=sh?'text':'password';t.textContent=sh?'Ocultar':'Mostrar';t.setAttribute('aria-pressed',String(sh));t.setAttribute('aria-label',sh?'Ocultar senha':'Mostrar senha');return}
  if(t.dataset.go==='resend'){resend();return}
  if(t.dataset.go){var em=$g('g-em');if(em)email=em.value.trim().toLowerCase();go(t.dataset.go)}
});

/* ---------- links do e-mail: #token_hash=...&type=... (funciona em qualquer navegador) ---------- */
async function fromLink(){
  var q=new URLSearchParams(location.hash.slice(1));
  var th=q.get('token_hash'),ty=q.get('type'),er=q.get('error_description')||q.get('error');
  if(!th&&!er)return false;
  try{history.replaceState(null,'',location.pathname+location.search)}catch(e){}
  if(er||!/^(email|signup|recovery)$/.test(ty||'')){lock('in');say('O link é inválido ou expirou. Entre com sua senha ou peça um novo código.');return true}
  lock('wait');
  var r=await sb.auth.verifyOtp({token_hash:th,type:ty==='signup'?'email':ty});
  if(r.error){go('in');say(msgOf(r.error)==='Código inválido ou expirado. Peça um novo.'?'O link é inválido ou expirou. Entre com sua senha ou peça um novo código.':msgOf(r.error));return true}
  if(ty==='recovery')go('newpw');else unlock();
  return true;
}

if(sb){
  sb.auth.onAuthStateChange(function(ev){
    if(ev==='SIGNED_OUT')lock('in');
    else if(ev==='PASSWORD_RECOVERY'){if(view!=='newpw')lock('newpw')}
    else if(ev==='SIGNED_IN'&&!gate.hidden&&view!=='newpw'&&!(view==='code'&&otp==='recovery'))unlock();
  });
}
if(sb&&/token_hash=|error=/.test(location.hash))fromLink();
else if(location.hash==='#conta-excluida'){try{history.replaceState(null,'',location.pathname+location.search)}catch(e){}lock('in');say('Sua conta foi excluída, com todos os dados. Obrigado por ter usado o Prumo.',true)}
else if(stored())unlock();
else lock('in');
})();
