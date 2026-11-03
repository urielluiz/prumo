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
function builder(tbl){const b={};b.select=()=>b;b.order=()=>b;b.range=()=>b;b.limit=()=>b;
 b.upsert=(r,o)=>{b._op='upsert';b._r=r;return b};b.delete=()=>{b._op='delete';return b};b.eq=(k,v)=>{b._eq=[k,v];return b};
 b.then=function(res,rej){return (async()=>{const me=(sess()||{user:{}}).user.id,db=LS.get('fake-db')||{};if(tbl==='prumo_items'&&b._op==='upsert'&&me){(Array.isArray(b._r)?b._r:[b._r]).forEach(r=>{db[me]=db[me]||{};db[me][r.kind+'/'+r.id]=r});LS.set('fake-db',db)}if(tbl==='prumo_items'&&!b._op)return {data:Object.values((db[me])||{}),error:null};if(b._op){window.__calls.push({tbl,op:b._op,row:b._r,eq:b._eq});if(tbl==='prumo_push_subs'&&b._op==='delete')LS.set('fake-pushdel',b._eq);return {error:null}}return {data:[],error:null}})().then(res,rej)};return b}
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
