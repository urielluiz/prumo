/* ---------- perfil: nome, foto, exportar e excluir conta ---------- */
var meEmail='',prevTab='hoje',avLoading='',AVKEY='prumo.avatar';
function profName(){return (S.prof&&S.prof.name)||''}
function cleanName(s){return String(s||'').replace(/[\u0000-\u001f\u007f​-‏‪-‮⁦-⁩]/g,'').replace(/\s+/g,' ').slice(0,60)}
function initials(){
  var n=profName().trim();
  if(n){var p=n.split(' ');return ((p[0]||'')[0]+(p.length>1?(p[p.length-1]||'')[0]:'')).toUpperCase()}
  return (meEmail[0]||'?').toUpperCase();
}
// foto: cópia local (data URL) para funcionar offline; baixa do Storage quando outro aparelho trocou
function avCache(){try{return JSON.parse(localStorage.getItem(AVKEY)||'null')}catch(e){return null}}
function avSrc(){
  var p=S.prof||{};if(!p.avk)return '';
  var c=avCache();if(c&&c.v===p.av&&c.k===p.avk&&/^data:image\/(jpeg|webp);base64,/.test(c.d))return c.d;
  avFetch(p);return '';
}
async function avFetch(p){
  if(!SB||!SBU||avLoading===p.avk+p.av)return;
  avLoading=p.avk+p.av;
  try{
    var r=await SB.storage.from('avatars').download(p.avk);
    if(r.error||!r.data)return;
    var d=await blobURL(r.data);
    if(S.prof&&S.prof.av===p.av){try{localStorage.setItem(AVKEY,JSON.stringify({v:p.av,k:p.avk,d:d}))}catch(e){}softRender()}
  }catch(e){}
  finally{avLoading=''}
}
function blobURL(b){return new Promise(function(ok,no){var f=new FileReader();f.onload=function(){ok(f.result)};f.onerror=no;f.readAsDataURL(b)})}
function avatarHTML(cls){
  var s=avSrc();
  return '<span class="av'+(cls?' '+cls:'')+'" aria-hidden="true">'+(s?'<img src="'+esc(s)+'" alt="">':esc(initials()))+'</span>';
}

// Reduz para 256 px e regrava a imagem: some tudo que vinha no arquivo original (inclusive a localização do GPS).
async function photoBlob(file){
  if(!file||!/^image\//.test(file.type||'image/'))throw 'tipo';
  if(file.size>20*1024*1024)throw 'grande';
  var img;
  try{img=await createImageBitmap(file)}
  catch(e){img=await new Promise(function(ok,no){var u=URL.createObjectURL(file),i=new Image();i.onload=function(){URL.revokeObjectURL(u);ok(i)};i.onerror=function(){URL.revokeObjectURL(u);no('ler')};i.src=u})}
  var w=img.width,h=img.height;if(!w||!h||w>12000||h>12000)throw 'ler';
  var s=Math.min(w,h),c=document.createElement('canvas');c.width=c.height=256;
  var x=c.getContext('2d');x.imageSmoothingQuality='high';x.drawImage(img,(w-s)/2,(h-s)/2,s,s,0,0,256,256);
  if(img.close)img.close();
  var tb=function(t){return new Promise(function(ok){c.toBlob(ok,t,.85)})};
  var b=await tb('image/webp');if(!b||b.type!=='image/webp')b=await tb('image/jpeg');
  if(!b)throw 'ler';
  return b;
}
async function setPhoto(file){
  if(!SB||!SBU){toast('Entre na conta para trocar a foto.');return}
  var b;
  try{b=await photoBlob(file)}catch(e){toast(e==='grande'?'Essa imagem é grande demais. Escolha outra.':'Não consegui ler essa imagem. Tente uma foto JPEG ou PNG.');return}
  var ext=b.type==='image/webp'?'webp':'jpg',path=SBU+'/avatar.'+ext,old=S.prof&&S.prof.avk;
  try{
    var r=await SB.storage.from('avatars').upload(path,b,{upsert:true,contentType:b.type,cacheControl:'3600'});
    if(r.error)throw r.error;
    if(old&&old!==path)await SB.storage.from('avatars').remove([old]);
  }catch(e){toast(navigator.onLine===false?'Sem conexão. Tente de novo quando voltar.':'Não consegui enviar a foto. Tente de novo.');return}
  S.prof=Object.assign({},S.prof,{avk:path,av:Date.now()});
  try{localStorage.setItem(AVKEY,JSON.stringify({v:S.prof.av,k:path,d:await blobURL(b)}))}catch(e){}
  persist();render();toast('Foto atualizada.');
}
async function removePhoto(){
  var k=S.prof&&S.prof.avk;if(!k)return;
  try{var r=await SB.storage.from('avatars').remove([k]);if(r&&r.error)throw r.error}
  catch(e){toast('Não consegui remover a foto agora. Tente de novo.');return}
  S.prof=Object.assign({},S.prof,{avk:'',av:Date.now()});
  try{localStorage.removeItem(AVKEY)}catch(e){}
  persist();render();toast('Foto removida.');
}

// Exportar: tudo o que a conta tem no servidor, mais o que está só neste aparelho. Vai para o compartilhar do iPhone ou baixa.
async function exportData(){
  var out={app:'Prumo',formato:1,exportado_em:new Date().toISOString(),conta:{id:SBU,email:meEmail||null},perfil:{nome:profName()||null,foto:(avCache()||{}).d||null},neste_aparelho:itemsOf()};
  if(SB&&SBU){
    try{
      out.no_servidor=(await sbFetchAll()).map(function(r){return {tipo:r.kind,id:r.id,dados:r.data,excluido:r.deleted,atualizado_em:new Date(Number(r.updated_at)).toISOString()}});
      var rm=await SB.from('prumo_reminders').select('day,kind,fire_at,title,body,sent');if(!rm.error)out.lembretes=rm.data;
      var ps=await SB.from('prumo_push_subs').select('endpoint,created_at');
      if(!ps.error)out.aparelhos_com_aviso=(ps.data||[]).map(function(s){return {servico:String(s.endpoint).split('/')[2],desde:s.created_at}});
    }catch(e){out.no_servidor=null;out.aviso='Sem conexão: este arquivo tem só os dados deste aparelho.'}
  }
  var name='prumo-meus-dados-'+todayISO()+'.json',blob=new Blob([JSON.stringify(out,null,2)],{type:'application/json'});
  try{
    var f=new File([blob],name,{type:'application/json'});
    if(navigator.canShare&&navigator.canShare({files:[f]})){await navigator.share({files:[f],title:'Meus dados do Prumo'});return}
  }catch(e){if(e&&e.name==='AbortError')return}
  var u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();
  setTimeout(function(){URL.revokeObjectURL(u)},4000);
  toast('Arquivo com seus dados gerado.');
}

// Excluir conta: confirma a senha (o servidor exige login de menos de 5 min) e apaga conta, tarefas e foto.
var delBusy=false;
function delSheetHTML(){
  return '<div class="sh-head"><h2 class="h2">Excluir minha conta</h2><button class="ib" data-act="sh-close" aria-label="Fechar">'+ic('x')+'</button></div>'+
    '<p class="hint" style="margin:0">Isso apaga para sempre a sua conta, todas as tarefas, retrôs, histórico de foco e a sua foto, em todos os aparelhos. Não dá para desfazer. Se quiser guardar uma cópia, use antes "Exportar meus dados".</p>'+
    '<div><label class="lab" for="del-pw">Sua senha</label><input id="del-pw" class="inp" type="password" autocomplete="current-password" autocapitalize="none" autocorrect="off" spellcheck="false" maxlength="128"></div>'+
    '<label class="chk"><input type="checkbox" id="del-ok"> <span>Entendo que a exclusão é permanente.</span></label>'+
    '<p class="hint" id="del-msg" style="margin:0" aria-live="polite"></p>'+
    '<div class="sh-actions"><button class="btn btn-d" data-act="del-go">Excluir conta</button><button class="btn btn-s" data-act="sh-close">Cancelar</button></div>';
}
async function deleteAccount(){
  if(delBusy)return;
  var pw=($('#del-pw')||{}).value||'',okc=($('#del-ok')||{}).checked,m=$('#del-msg');
  var say=function(t){if(m){m.textContent=t;m.style.color='var(--bad)'}};
  if(!SB||!SBU){say('Entre na conta para excluí-la.');return}
  if(!pw){say('Digite sua senha.');return}
  if(!okc){say('Marque a confirmação para continuar.');return}
  delBusy=true;if(m){m.textContent='Excluindo...';m.style.color=''}
  try{
    var u=await SB.auth.getUser(),me=u&&u.data&&u.data.user?u.data.user.email:meEmail;
    var v=await SB.auth.signInWithPassword({email:me,password:pw});
    if(v.error){say(v.error.status===429?'Muitas tentativas. Aguarde alguns minutos.':'Senha incorreta.');return}
    var r=await SB.functions.invoke('prumo-delete-account',{method:'POST',body:{}});
    if(r.error){say('Não consegui excluir agora. Nada foi apagado. Tente de novo.');return}
    try{var reg=await Promise.race([navigator.serviceWorker.ready,new Promise(function(ok){setTimeout(function(){ok(null)},2000)})]);var sub=reg&&await reg.pushManager.getSubscription();if(sub)await sub.unsubscribe()}catch(e){}
    // marca o endereço antes de sair: o SIGNED_OUT recarrega a página e a tela de entrada mostra a confirmação
    try{history.replaceState(null,'',location.pathname+'#conta-excluida')}catch(e){}
    stopSync();SBU=null;wipeLocal();
    try{await SB.auth.signOut({scope:'local'})}catch(e){}
    location.reload();
  }catch(e){say('Sem conexão. Nada foi apagado. Tente de novo.')}
  finally{delBusy=false}
}

