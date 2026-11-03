/* ---------- sincronizacao com o Supabase (so quando ha configuracao) ---------- */
var SBCFG=(window.PRUMO_SB&&window.supabase&&window.supabase.createClient)?window.PRUMO_SB:null;
var SB=null,SBU=null,sbChan=null,sbBusy=false,sbQ=0,sbT=null,sbPT=null,base={},pendRender=false;
function jstr(o){return JSON.stringify(o)}
function kindOf(k){return k.split('/')[0]}
function idOf(k){return k.slice(kindOf(k).length+1)}
function itemsOf(){
  var m={};
  S.tasks.forEach(function(t){m['task/'+t.id]=t});
  m['cap/cap']={cap:S.cap};
  m['ctx/ctx']=S.ctx||{};
  Object.keys(S.rec||{}).forEach(function(k){m['rec/'+k]=S.rec[k]});
  Object.keys(S.retro||{}).forEach(function(k){m['retro/'+k]=S.retro[k]});
  Object.keys(S.blockers||{}).forEach(function(k){m['blk/'+k]={t:S.blockers[k]}});
  Object.keys(S.log||{}).forEach(function(k){m['log/'+k]={s:S.log[k]}});
  return m;
}
function rebase(){base={};var m=itemsOf();Object.keys(m).forEach(function(k){base[k]=jstr(m[k])})}
function stamp(){
  var cur=itemsOf(),now=Date.now();
  Object.keys(cur).forEach(function(k){var s=jstr(cur[k]);if(base[k]!==s){base[k]=s;S.u[k]=now;S.dirty[k]=1;delete S.del[k]}});
  Object.keys(base).forEach(function(k){if(!(k in cur)){delete base[k];delete S.u[k];S.del[k]=now;S.dirty[k]=1}});
}
function applyItem(k,data){
  var kind=kindOf(k),id=idOf(k);
  if(kind==='task'){data.id=id;var i=S.tasks.findIndex(function(t){return t.id===id});if(i>=0)S.tasks[i]=data;else S.tasks.push(data)}
  else if(kind==='rec'){data.id=id;S.rec=S.rec||{};S.rec[id]=data}
  else if(kind==='cap'){if(Array.isArray(data.cap)&&data.cap.length===7)S.cap=data.cap}
  else if(kind==='ctx')S.ctx=data||{};
  else if(kind==='retro')S.retro[id]=data;
  else if(kind==='blk')S.blockers[id]=data.t;
  else if(kind==='log')S.log[id]=data.s;
}
function dropItem(k){
  var kind=kindOf(k),id=idOf(k);
  if(kind==='task')S.tasks=S.tasks.filter(function(t){return t.id!==id});
  else if(kind==='rec'){if(S.rec)delete S.rec[id]}
  else if(kind==='retro')delete S.retro[id];
  else if(kind==='blk')delete S.blockers[id];
  else if(kind==='log')delete S.log[id];
  else if(kind==='ctx')S.ctx={};
}
function mergeRemote(rows){
  var changed=false,rem={};
  rows.forEach(function(r){rem[r.kind+'/'+r.id]=r});
  if(!S.synced){
    if(rows.length)S.seeded=true;
    if(pristine()&&rows.length){S.tasks=[];S.dirty={};S.u={};S.del={};changed=true}
    S.synced=true;
  }
  var cur=itemsOf();
  Object.keys(rem).forEach(function(k){
    var r=rem[k],ru=Number(r.updated_at)||0,lt=Math.max(S.u[k]||0,S.del[k]||0);
    if(ru>lt){
      if(r.deleted){if(k in cur)changed=true;dropItem(k);delete S.u[k];delete S.dirty[k];S.del[k]=ru}
      else if(r.data&&typeof r.data==='object'){applyItem(k,r.data);S.u[k]=ru;delete S.del[k];delete S.dirty[k];changed=true}
    }
  });
  cur=itemsOf();
  Object.keys(cur).forEach(function(k){
    var r=rem[k];
    if(!r){S.u[k]=S.u[k]||((k==='cap/cap'||k==='ctx/ctx')?1:(S.upd||1));S.dirty[k]=1}
    else if((S.u[k]||0)>(Number(r.updated_at)||0))S.dirty[k]=1;
  });
  Object.keys(S.del).forEach(function(k){if(!rem[k]){delete S.del[k];delete S.dirty[k]}});
  try{if(topUpRec()){changed=true;stamp()}}catch(e){}
  return changed;
}
async function sbFetchAll(){
  var out=[],from=0,step=1000;
  for(;;){
    var r=await SB.from('prumo_items').select('kind,id,data,deleted,updated_at').order('kind').order('id').range(from,from+step-1);
    if(r.error)throw r.error;
    out=out.concat(r.data||[]);
    if(!r.data||r.data.length<step)break;
    from+=step;
  }
  return out;
}
async function sbPush(){
  var keys=Object.keys(S.dirty);if(!keys.length)return;
  var cur=itemsOf(),rows=[],sent={};
  keys.forEach(function(k){
    var row=null;
    if(k in cur)row={user_id:SBU,kind:kindOf(k),id:idOf(k),data:cur[k],deleted:false,updated_at:S.u[k]||S.upd||Date.now()};
    else if(S.del[k])row={user_id:SBU,kind:kindOf(k),id:idOf(k),data:{},deleted:true,updated_at:S.del[k]};
    if(row){rows.push(row);sent[k]=row.updated_at}else delete S.dirty[k];
  });
  for(var i=0;i<rows.length;i+=200){
    var r=await SB.from('prumo_items').upsert(rows.slice(i,i+200),{onConflict:'user_id,kind,id'});
    if(r&&r.error)throw r.error;
  }
  Object.keys(sent).forEach(function(k){var now=(S.u[k]||0)>(S.del[k]||0)?S.u[k]:S.del[k];if(now===sent[k])delete S.dirty[k]});
}
function softRender(){
  var a=document.activeElement;
  if(a&&(a.tagName==='INPUT'||a.tagName==='TEXTAREA')&&$('#view').contains(a)){pendRender=true;return}
  render();
}
async function syncNow(pull){
  if(!SB||!SBU)return;
  if(sbBusy){sbQ=Math.max(sbQ,pull?2:1);return}
  sbBusy=true;
  try{
    if(navigator.onLine===false){setSync('off');return}
    var changed=false;
    if(pull||!S.synced){changed=mergeRemote(await sbFetchAll());rebase()}
    await sbPush();
    setSync('ok');writeLocal();
    if(changed)softRender();
  }catch(e){
    setSync(navigator.onLine===false?'off':'err');
    clearTimeout(sbT);sbT=setTimeout(function(){syncNow(true)},30000);
  }
  finally{sbBusy=false}
  if(sbQ){var q=sbQ;sbQ=0;syncNow(q===2)}
}
function pullSoon(ms){clearTimeout(sbT);sbT=setTimeout(function(){syncNow(true)},ms)}
function pushSoon(ms){clearTimeout(sbPT);sbPT=setTimeout(function(){syncNow(false)},ms)}
function subscribeRT(){
  if(sbChan||!SBU)return;
  try{sbChan=SB.channel('prumo-items').on('postgres_changes',{event:'*',schema:'public',table:'prumo_items',filter:'user_id=eq.'+SBU},function(){pullSoon(500)}).subscribe()}catch(e){}
}
function startSync(){setSync('boot');syncNow(true).then(subscribeRT);pushRefresh()}
function stopSync(){if(sbChan){try{SB.removeChannel(sbChan)}catch(e){}sbChan=null}setSync('out')}
// Sair: envia o que falta, desliga o push deste aparelho, encerra a sessão e apaga os dados locais.
// scope 'global' encerra a sessão em todos os aparelhos.
async function logout(scope){
  if(!SB)return;
  if(Object.keys(S.dirty).length&&navigator.onLine!==false){try{await Promise.race([syncNow(false),new Promise(function(r){setTimeout(r,5000)})])}catch(e){}}
  if(Object.keys(S.dirty).length&&!confirm('Há alterações que ainda não foram enviadas e serão perdidas neste aparelho. Sair mesmo assim?'))return;
  try{
    var reg=await Promise.race([navigator.serviceWorker.ready,new Promise(function(r){setTimeout(function(){r(null)},3000)})]);
    var sub=reg&&await reg.pushManager.getSubscription();
    if(sub){var ep=sub.endpoint;try{await SB.from('prumo_push_subs').delete().eq('endpoint',ep)}catch(e){}await sub.unsubscribe()}
  }catch(e){}
  stopSync();SBU=null;
  try{await SB.auth.signOut({scope:scope==='global'?'global':'local'})}catch(e){}
  wipeLocal();location.reload();
}
window.prumoLogout=logout;
function initSB(){
  if(!SBCFG)return false;
  try{SB=window.supabase.createClient(SBCFG.url,SBCFG.key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}})}
  catch(e){SB=null;return false}
  window.prumoSB=SB;
  SB.auth.onAuthStateChange(function(ev,session){
    setTimeout(function(){
      var id=session&&session.user?session.user.id:null;
      if(id){
        // dados locais de outra conta: apaga antes de qualquer sincronização
        if(S.owner&&S.owner!==id){wipeLocal();location.reload();return}
        if(!S.owner){S.owner=id;writeLocal()}
        if(id!==SBU){SBU=id;startSync()}
      }
      else if(ev==='SIGNED_OUT'){SBU=null;stopSync();wipeLocal();location.reload()}
    },0);
  });
  window.addEventListener('online',function(){if(SBU)syncNow(true)});
  window.addEventListener('offline',function(){if(SBU)setSync('off')});
  document.addEventListener('focusout',function(){
    if(!pendRender)return;
    setTimeout(function(){var a=document.activeElement;if(pendRender&&!(a&&(a.tagName==='INPUT'||a.tagName==='TEXTAREA'))){pendRender=false;render()}},300);
  });
  setInterval(function(){if(SBU&&document.visibilityState==='visible')syncNow(true)},90000);
  return true;
}

