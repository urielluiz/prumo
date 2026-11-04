// Supabase falso para os testes: contas, sessão, itens por conta, Storage e Edge Functions
// ficam no localStorage (sobrevivem ao reload, como no real). Injetado com evaluateOnNewDocument.
module.exports=`
window.__calls=[];window.__auth=[];window.__csp=[];
document.addEventListener('securitypolicyviolation',e=>window.__csp.push(e.violatedDirective+' '+(e.blockedURI||'')));
const LS={get:k=>JSON.parse(localStorage.getItem(k)||'null'),set:(k,v)=>localStorage.setItem(k,JSON.stringify(v)),del:k=>localStorage.removeItem(k)};
const TOK='sb-test-auth-token';
const users=()=>LS.get('fake-users')||{'dono@example.com':{id:'u1',pw:'senha-do-dono-123',ok:true},'outra@example.com':{id:'u2',pw:'senha-da-outra-12',ok:true}};
const saveUsers=u=>LS.set('fake-users',u);
const subs=[];
function emit(ev,s){setTimeout(()=>subs.forEach(cb=>cb(ev,s)),5)}
function sess(){const t=LS.get(TOK);return t&&t.user?{user:t.user}:null}
function login(u,email){const s={refresh_token:'x',user:{id:u.id,email}};LS.set(TOK,s);return {user:s.user}}
const E=(code,status,message)=>({error:{code,status,message:message||code}});
// verificação em duas etapas: fator por conta em fake-users (.mfa {id,v}); o nível da sessão (aal) fica no token
const curKey=()=>{const t=LS.get(TOK),us=users();return t&&t.user?Object.keys(us).find(k=>us[k].id===t.user.id):null};
const mfaLocked=()=>{const t=LS.get(TOK),k=curKey(),u=k&&users()[k];return !!(u&&u.mfa&&u.mfa.v&&(!t||t.aal!=='aal2'))};
function builder(tbl){const b={};b.select=()=>b;b.order=()=>b;b.range=()=>b;b.limit=()=>b;
 b.upsert=(r,o)=>{b._op='upsert';b._r=r;return b};b.delete=()=>{b._op='delete';return b};b.eq=(k,v)=>{b._eq=[k,v];return b};
 b.then=function(res,rej){return (async()=>{const me=(sess()||{user:{}}).user.id,db=LS.get('fake-db')||{};if(tbl==='prumo_items'&&mfaLocked()){window.__calls.push({tbl,op:b._op||'select',blocked:true});return b._op?{error:{code:'42501',message:'new row violates row-level security policy'}}:{data:[],error:null}}if(tbl==='prumo_items'&&b._op==='upsert'&&me){(Array.isArray(b._r)?b._r:[b._r]).forEach(r=>{db[me]=db[me]||{};db[me][r.kind+'/'+r.id]=r});LS.set('fake-db',db)}if(tbl==='prumo_items'&&!b._op)return {data:Object.values((db[me])||{}),error:null};if(b._op){window.__calls.push({tbl,op:b._op,row:b._r,eq:b._eq});if(tbl==='prumo_push_subs'&&b._op==='delete')LS.set('fake-pushdel',b._eq);return {error:null}}return {data:[],error:null}})().then(res,rej)};return b}
const STO=()=>LS.get('fake-storage')||{};
const b64=async b=>{const u=new Uint8Array(await b.arrayBuffer());let s='';for(let i=0;i<u.length;i++)s+=String.fromCharCode(u[i]);return btoa(s)};
const storage={from:bucket=>({
  async upload(path,blob,o){const me=(sess()||{user:{}}).user.id;if(!me||path.split('/')[0]!==me)return {error:{message:'policy'}};const st=STO();st[bucket+'/'+path]={type:blob.type,size:blob.size,d:await b64(blob),o};LS.set('fake-storage',st);return {data:{path},error:null}},
  async download(path){const f=STO()[bucket+'/'+path];if(!f)return {data:null,error:{message:'not found'}};const r=atob(f.d),u=new Uint8Array(r.length);for(let i=0;i<r.length;i++)u[i]=r.charCodeAt(i);return {data:new Blob([u],{type:f.type}),error:null}},
  async remove(paths){const st=STO();paths.forEach(p=>delete st[bucket+'/'+p]);LS.set('fake-storage',st);LS.set('fake-removed',paths);return {data:[],error:null}}
})};
const functions={async invoke(name,o){const me=(sess()||{user:{}}).user.id;LS.set('fake-invoke',{name,me});if(window.__delfail)return {data:null,error:{message:'boom'}};
  const us=users();Object.keys(us).forEach(k=>{if(us[k].id===me)delete us[k]});saveUsers(us);const db=LS.get('fake-db')||{};delete db[me];LS.set('fake-db',db);
  const st=STO();Object.keys(st).forEach(k=>{if(k.indexOf('avatars/'+me+'/')===0)delete st[k]});LS.set('fake-storage',st);return {data:{ok:true},error:null}}};
window.supabase={createClient(){return {from:t=>builder(t),storage,functions,channel(){const c={on(){return c},subscribe(){return c}};return c},removeChannel(){},
 auth:{
  mfa:{
   async getAuthenticatorAssuranceLevel(){const t=LS.get(TOK),k=curKey(),u=k&&users()[k];if(!t||!u)return {data:{currentLevel:null,nextLevel:null},error:null};return {data:{currentLevel:t.aal||'aal1',nextLevel:u.mfa&&u.mfa.v?'aal2':(t.aal||'aal1')},error:null}},
   async listFactors(){const k=curKey(),u=k&&users()[k],f=u&&u.mfa?[{id:u.mfa.id,factor_type:'totp',status:u.mfa.v?'verified':'unverified'}]:[];return {data:{totp:f,phone:[],all:f},error:null}},
   async enroll(o){window.__auth.push(['mfa-enroll',o.factorType]);const us=users(),k=curKey();if(!k)return E('not_authenticated',401);if(us[k].mfa&&us[k].mfa.v)return E('mfa_factor_name_conflict',422);us[k].mfa={id:'fac1',v:false};saveUsers(us);
     return {data:{id:'fac1',type:'totp',totp:{qr_code:'data:image/svg+xml;utf8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="21" height="21"><rect width="21" height="21" fill="#000"/></svg>'),secret:'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP',uri:'otpauth://totp/Prumo:'+k+'?secret=JBSWY3DPEHPK3PXP&issuer=Prumo'}},error:null}},
   async challengeAndVerify(o){window.__auth.push(['mfa-verify',o.code]);const us=users(),k=curKey();if(!k||!us[k].mfa||us[k].mfa.id!==o.factorId)return E('mfa_factor_not_found',404);if(o.code!=='654321')return E('mfa_verification_failed',422,'Invalid TOTP code entered');
     us[k].mfa.v=true;saveUsers(us);const t=LS.get(TOK);t.aal='aal2';LS.set(TOK,t);emit('MFA_CHALLENGE_VERIFIED',{user:t.user});return {data:{},error:null}},
   async unenroll(o){window.__auth.push(['mfa-unenroll',o.factorId]);const us=users(),k=curKey(),t=LS.get(TOK);if(!k||!us[k].mfa)return E('mfa_factor_not_found',404);if(us[k].mfa.v&&t.aal!=='aal2')return E('insufficient_aal',403);delete us[k].mfa;saveUsers(us);return {data:{},error:null}}
  },
  async refreshSession(){return {data:{session:sess()},error:null}},
  onAuthStateChange(cb){subs.push(cb);setTimeout(()=>cb('INITIAL_SESSION',sess()),10);return {data:{subscription:{unsubscribe(){}}}}},
  getSession(){return Promise.resolve({data:{session:sess()}})},
  getUser(){const s=sess();return Promise.resolve({data:{user:s&&s.user}})},
  async signInWithPassword(o){window.__auth.push(['signin',o.email]);if(window.__rate)return E('over_request_rate_limit',429);
   const u=users()[o.email];if(!u||u.pw!==o.password)return E('invalid_credentials',400,'Invalid login credentials');
   if(!u.ok)return E('email_not_confirmed',400,'Email not confirmed');
   const s=login(u,o.email);emit('SIGNED_IN',s);return {data:{session:s},error:null}},
  async signUp(o){window.__auth.push(['signup',o.email,o.options&&o.options.emailRedirectTo]);if(window.__closed)return E('unexpected_failure',500,'Database error saving new user');
   const us=users();if(!us[o.email]){us[o.email]={id:'u'+(Object.keys(us).length+1),pw:o.password,ok:false};saveUsers(us)}
   return {data:{user:{},session:null},error:null}},
  async verifyOtp(o){window.__auth.push(['verify',o.type,o.email||'',o.token||'',o.token_hash||'']);
   if(o.token_hash){if(o.token_hash!=='hash-bom')return E('otp_expired',403);const s=login(users()['dono@example.com'],'dono@example.com');emit(o.type==='recovery'?'PASSWORD_RECOVERY':'SIGNED_IN',s);return {data:{session:s},error:null}}
   if(o.token!=='123456')return E('otp_expired',403,'Token has expired or is invalid');
   const us=users(),u=us[o.email];if(!u)return E('otp_expired',403);u.ok=true;saveUsers(us);
   const s=login(u,o.email);emit(o.type==='recovery'?'PASSWORD_RECOVERY':'SIGNED_IN',s);return {data:{session:s},error:null}},
  async resend(o){window.__auth.push(['resend',o.type,o.email]);return {error:null}},
  async resetPasswordForEmail(e,o){window.__auth.push(['reset',e,o&&o.redirectTo]);return {data:{},error:null}},
  async updateUser(o){window.__auth.push(['update',o.password]);const s=sess();const us=users();Object.keys(us).forEach(k=>{if(us[k].id===s.user.id)us[k].pw=o.password});saveUsers(us);return {error:null}},
  async signOut(o){window.__auth.push(['signout',(o&&o.scope)||'local']);LS.set('fake-signout',(o&&o.scope)||'local');if(!o||o.scope!=='others'){LS.del(TOK);emit('SIGNED_OUT',null)}return {error:null}}
 }}}};
window.PRUMO_SB={url:'x',key:'y',vapid:'BAai8ZUcouidJgwKeiS0zLvXUBK2PccmgBD-40hw0Dr1_VoXYS0vw3FaK7PpXlNNpcmAjH1B_5WvIMnHlzkP0Wc'};
// push neste aparelho
let subbed={endpoint:'https://web.push.apple.com/abc',toJSON(){return {endpoint:this.endpoint,keys:{p256dh:'P',auth:'A'}}},unsubscribe(){LS.set('fake-unsub',1);subbed=null;return Promise.resolve(true)}};
const reg={pushManager:{getSubscription:()=>Promise.resolve(subbed),subscribe:()=>Promise.resolve(subbed)}};
Object.defineProperty(navigator,'serviceWorker',{value:{ready:Promise.resolve(reg),register:()=>Promise.resolve(reg),addEventListener(){}},configurable:true});
window.PushManager=function(){};window.Notification=function(){};Notification.permission='granted';Notification.requestPermission=()=>Promise.resolve('granted');
// senha vazada: o sufixo de 'senha-vazada-123456' aparece na resposta
const _f=window.fetch;window.fetch=async function(u,o){if(String(u).indexOf('api.pwnedpasswords.com')>=0){window.__hibp=(window.__hibp||[]).concat(String(u));
  const h=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-1',new TextEncoder().encode('senha-vazada-123456')))).map(x=>x.toString(16).padStart(2,'0')).join('').toUpperCase();
  return new Response(h.slice(5)+':42'+String.fromCharCode(13,10)+'0000000000000000000000000000000000A:0')}return _f.apply(this,arguments)};
`;
