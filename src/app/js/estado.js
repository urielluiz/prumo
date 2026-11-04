/* ---------- estado e persistencia ---------- */
var LS='prumo.v1';
function blank(){return {v:1,upd:0,owner:null,prof:{},seeded:false,tasks:[],rec:{},cap:[0,300,300,300,300,300,120],ctx:{},retro:{},blockers:{},log:{},days:{},g:{},session:null,u:{},dirty:{},del:{},synced:false}}
function readLocal(){try{var r=localStorage.getItem(LS);if(r){return Object.assign(blank(),JSON.parse(r))}}catch(e){}return blank()}
var S=readLocal();
function writeLocal(){if(wiped)return;try{localStorage.setItem(LS,JSON.stringify(S))}catch(e){}}
// Apaga tudo que o app guardou neste aparelho (dados, preferências, retrôs vistas). Usado ao sair
// e ao trocar de conta, para que os dados de uma pessoa nunca fiquem para a próxima.
var wiped=false;
function wipeLocal(){wiped=true;try{Object.keys(localStorage).forEach(function(k){if(k.indexOf('prumo.')===0)localStorage.removeItem(k)})}catch(e){}}
var saveT=null,pushing=false,again=false,remote=null,sync='boot',booted=false;
function persist(){try{topUpRec()}catch(e){}S.upd=Date.now();try{timerSync();clearTimeout(remT);remT=setTimeout(remSync,2500)}catch(e){}if(SBCFG)stamp();writeLocal();clearTimeout(saveT);saveT=setTimeout(pushRemote,700);if(SBCFG)pushSoon(900)}
function setSync(s){sync=s;var e=$('#sync');if(e)e.textContent=syncText()}
function syncText(){
  if(sync==='ok')return 'Sincronizado com a sua conta.';
  if(sync==='err')return 'Não consegui sincronizar agora. Tento de novo na próxima alteração.';
  if(sync==='boot')return 'Conectando...';
  if(sync==='off')return 'Sem conexão. As alterações serão enviadas quando voltar.';
  if(sync==='out')return 'Você saiu da conta. Este aparelho não está sincronizando.';
  return 'Salvo só neste aparelho. Faça backup de vez em quando.';
}
function prune(days){
  var lim=Date.now()-days*864e5;
  // filhas de pautas antigas ficam até a conversão (convertPautas) registrar o que foi concluído
  S.tasks=S.tasks.filter(function(t){return t.parent||!(t.status==='done'&&t.doneAt&&t.doneAt<lim)});
  var keep=iso(new Date(Date.now()-400*864e5));
  Object.keys(S.log).forEach(function(k){if(k<keep)delete S.log[k]});
  Object.keys(S.days||{}).forEach(function(k){if(k<keep)delete S.days[k]});
}
async function pushRemote(){
  if(!remote)return;
  if(pushing){again=true;return}
  pushing=true;
  try{
    var data=Object.assign({},S,{session:null});
    if(JSON.stringify(data).length>230000){prune(60);data=Object.assign({},S,{session:null})}
    await remote.set(clone(data));
    setSync('ok');
  }catch(e){setSync('err')}
  pushing=false;
  if(again){again=false;pushRemote()}
}
function pristine(){return S.seeded&&S.tasks.length>0&&S.tasks.every(function(t){return t.ex})}
async function pullRemote(){
  if(!remote)return;
  try{
    var snap=await remote.get();
    var r=snap&&snap.exists?snap.data():null;
    if(r&&r.upd){
      if(r.upd>S.upd||(pristine()&&r.tasks&&r.tasks.length)){
        var keep=S.session;
        S=Object.assign(blank(),clone(r),{session:keep||null});
        writeLocal();setSync('ok');render();
      }else if(S.upd>r.upd){pushRemote()}
      else setSync('ok');
    }else if(S.upd){pushRemote()}
    else setSync('ok');
  }catch(e){setSync('err')}
}
async function initRemote(){
  if(SBCFG)return;
  try{
    if(!(window.claude&&window.claude.use)){setSync('local');return}
    var user=await window.claude.use('user');
    var db=await window.claude.use('db');
    if(!user||!db){setSync('local');return}
    var id=await user.id();
    if(!id){setSync('local');return}
    remote=db.collection('data/users/'+id).doc('prumo');
    await pullRemote();
  }catch(e){setSync('local')}
}

