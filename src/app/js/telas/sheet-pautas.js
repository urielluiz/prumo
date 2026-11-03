/* ---------- sheet ---------- */
function chip(label,pressed,attrs,extra){return '<button class="chip" aria-pressed="'+pressed+'" '+attrs+'>'+(extra||'')+label+'</button>'}
function sugInner(d){
  var g=suggestion(d),cur=d.fw||g.fw;
  return '<span class="lab">Método sugerido</span><p class="verdict" style="margin-top:0"><b>'+esc(FW[g.fw].name)+'.</b> '+esc(g.why)+'</p>'+(cur!==g.fw?'<button class="btn btn-s sm" data-act="sh-usesug" style="margin-top:8px">Usar '+esc(FW[g.fw].name)+' (você escolheu '+esc(FW[cur].name)+')</button>':'');
}
function kidsSheetHTML(){
  var k=sh.mode==='edit'?kidsOf(sh.id):[],g=sh.g=sh.g||{name:'',n:'1',est:''};
  var h='<div><span class="lab">Entregas dentro desta tarefa</span>';
  if(sh.pend&&sh.pend.length)h+='<p class="hint" style="margin:0 0 8px">Serão criadas ao salvar: '+sh.pend.map(function(x){return x.plan?(x.days.length+' dias de '+fmt(x.est)+' a partir de '+shortDate(x.days[0])):(x.n+' × '+esc(x.name)+' de '+fmt(x.est))}).join(', ')+'.</p>';
  if(k.length)h+='<div class="list" style="margin-bottom:10px">'+k.map(function(c){return '<button class="kidrow" data-act="kid-open" data-id="'+c.id+'"><span style="min-width:0;overflow-wrap:anywhere">'+(isDone(c)?'✓ ':'')+esc(c.title)+'</span><span class="muted" style="flex:none;font-size:13px">'+fmt(c.est)+' · '+(c.day?shortDate(c.day):'sem data')+'</span></button>'}).join('')+'</div>';
  h+='<div class="kidadd"><input class="inp" data-in="gname" placeholder="Nome da entrega, ex.: Post" value="'+esc(g.name)+'" autocomplete="off"><div class="kidnum"><label>Quantas<input class="inp" data-in="gn" type="number" inputmode="numeric" min="1" max="20" value="'+esc(g.n)+'"></label><label>Minutos cada<input class="inp" data-in="gest" type="number" inputmode="numeric" min="1" max="960" placeholder="90" value="'+esc(g.est)+'"></label></div><button class="btn btn-s" data-act="kid-add">Adicionar entregas</button></div>';
  h+='<div class="kidadd" style="margin-top:16px"><span class="lab">Ou dedicar tempo por vários dias</span><label class="kl">Começa em<input class="inp" data-in="pstart" type="date" value="'+esc(g.pstart||todayISO())+'"></label><div class="kidnum"><label>Quantos dias<input class="inp" data-in="pn" type="number" inputmode="numeric" min="1" max="60" placeholder="5" value="'+esc(g.pn||'')+'"></label><label>Minutos por dia<input class="inp" data-in="pest" type="number" inputmode="numeric" min="1" max="960" placeholder="120" value="'+esc(g.pest||'')+'"></label></div><div class="chips">'+chip('Só dias úteis',g.pwk!==false,'data-act="plan-wk"')+'</div><button class="btn btn-s" data-act="plan-add">Criar plano</button></div>';
  return h+'</div>';
}
function planDays(start,n,wk){
  var out=[],d=start||todayISO(),guard=0;
  while(out.length<n&&guard++<400){var w=parseISO(d).getDay();if(!wk||(w!==0&&w!==6))out.push(d);d=addDays(d,1)}
  return out;
}
function mkKids(t,name,n,est,days,type){
  var have=S.tasks.filter(function(c){return c.parent===t.id&&c.type===(type||name)}).length;
  if(days)n=days.length;
  for(var i=1;i<=n;i++)S.tasks.push({id:uid(),title:(n>1||have)?name+' '+(have+i):name,type:type||name,parent:t.id,ctx:t.ctx,est:est,est0:est,day:days?days[i-1]:(t.day||null),status:'todo',fw:null,urg:!!t.urg,imp:!!t.imp,dod:[],mit:false,slips:0,focus:0,pomos:0,created:Date.now(),ex:false});
}
function addKids(){
  var g=sh.g||{},name=(g.name||'').trim(),n=Math.max(1,Math.min(20,Math.round(Number(g.n)||1))),est=Math.round(Number(g.est)||0);
  if(!name){toast('Dê um nome à entrega.');return}
  if(!(est>=1&&est<=960)){toast('Informe os minutos de cada entrega.');return}
  sh.g={name:'',n:'1',est:''};
  if(sh.mode==='new'){sh.pend=sh.pend||[];sh.pend.push({name:name,n:n,est:est});renderSheet();return}
  var t=byId(sh.id);if(!t)return;
  mkKids(t,name,n,est);
  t.day=null;sh.d.day=null;
  persist();renderSheet();render();toast(n+' entrega'+(n>1?'s':'')+' adicionada'+(n>1?'s':'')+'.');
}
function addPlan(){
  var g=sh.g||{},n=Math.round(Number(g.pn)||0),est=Math.round(Number(g.pest)||0),wk=g.pwk!==false,start=g.pstart||todayISO();
  if(!(n>=1&&n<=60)){toast('Informe quantos dias, de 1 a 60.');return}
  if(!(est>=1&&est<=960)){toast('Informe os minutos por dia.');return}
  var days=planDays(start,n,wk);
  sh.g={name:'',n:'1',est:'',pstart:start,pn:'',pest:'',pwk:wk};
  if(sh.mode==='new'){sh.pend=sh.pend||[];sh.pend.push({name:'Sessão',n:n,est:est,days:days,plan:true});renderSheet();return}
  var t=byId(sh.id);if(!t)return;
  mkKids(t,'Sessão',n,est,days,t.title);
  t.day=null;sh.d.day=null;t.est=sum(kidsOf(t.id),function(c){return c.est});sh.d.est=t.est;
  persist();renderSheet();render();toast('Plano criado: '+n+' dias de '+fmt(est)+'.');
}
function parSheetHTML(){
  var self=sh.mode==='edit'?sh.id:null,gs=S.tasks.filter(function(t){return isGrp(t)&&!isDone(t)&&t.id!==self});
  if(!gs.length&&!sh.d.parent)return '';
  return '<div><span class="lab">Pauta</span><div class="chips">'+chip('Nenhuma',!sh.d.parent,'data-act="sh-par" data-v=""')+gs.map(function(g){return chip(esc(g.title),sh.d.parent===g.id,'data-act="sh-par" data-v="'+g.id+'"')}).join('')+'</div></div>';
}
