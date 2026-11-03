function recLabel(r){
  if(!r)return 'Não repete';
  if(r.t==='daily')return 'Todo dia';
  if(r.t==='weekdays')return 'Dias úteis';
  if(r.t==='monthly')return 'Todo mês';
  var n=(r.dows||[]).slice().sort(function(a,b){return ((a+6)%7)-((b+6)%7)}).map(function(x){return DABR[x]});
  return 'Toda '+(n.join(', ')||'semana');
}
function recMatch(s,d){
  if(d<s.start)return false;if(s.until&&d>s.until)return false;if((s.skip||[]).indexOf(d)>=0)return false;
  var p=parseISO(d),w=p.getDay(),r=s.rule||{};
  if(r.t==='daily')return true;
  if(r.t==='weekdays')return w>0&&w<6;
  if(r.t==='weekly')return (r.dows||[]).indexOf(w)>=0;
  if(r.t==='monthly'){var sd=parseISO(s.start).getDate(),last=new Date(p.getFullYear(),p.getMonth()+1,0).getDate();return p.getDate()===Math.min(sd,last)}
  return false;
}
function topUpRec(){
  var made=0,td=todayISO();
  Object.keys(S.rec||{}).forEach(function(id){
    var s=S.rec[id];if(!s||!s.rule)return;
    for(var i=0;i<14;i++){
      var d=addDays(td,i);if(!recMatch(s,d))continue;
      if(S.tasks.some(function(t){return t.rid===id&&(t.od||t.day)===d}))continue;
      S.tasks.push({id:'r_'+id+'_'+d,rid:id,od:d,title:s.title,ctx:s.ctx,est:s.est,est0:s.est,day:d,status:'todo',fw:s.fw||null,urg:!!s.urg,imp:!!s.imp,
        dod:(s.dodText||'').split('\n').map(function(x){return x.trim()}).filter(Boolean).slice(0,12).map(function(x){return {t:x,d:false}}),mit:false,slips:0,focus:0,pomos:0,created:Date.now(),ex:false});
      made++;
    }
  });
  return made;
}
function rolloverRec(){try{if(topUpRec())persist()}catch(e){}}
function purgeFuture(rid,od){S.tasks=S.tasks.filter(function(x){return !(x.rid===rid&&!isDone(x)&&(x.od||x.day)>od)})}
function applyRec(t,d){
  if(t.parent||isGrp(t)||d.parent)return;
  var s=t.rid&&S.rec[t.rid],want=d.rec||null,od=t.od||t.day;
  var dod=function(){return (d.dodText||'').split('\n').map(function(x){return x.trim()}).filter(Boolean).slice(0,12)};
  if(!s&&want){
    if(!t.day)t.day=todayISO();
    if(want.t==='weekly'&&(!want.dows||!want.dows.length))want={t:'weekly',dows:[parseISO(t.day).getDay()]};
    var rid=uid();
    S.rec[rid]={id:rid,title:t.title,ctx:t.ctx,est:t.est,fw:t.fw||null,urg:!!t.urg,imp:!!t.imp,dodText:dod().join('\n'),rule:want,start:t.day,until:null,skip:[]};
    t.rid=rid;t.od=t.day;
  }else if(s&&!want){
    s.until=od;purgeFuture(t.rid,od);delete t.rid;delete t.od;
  }else if(s&&want){
    if(JSON.stringify(s.rule)!==JSON.stringify(want)){s.rule=want;purgeFuture(t.rid,od)}
    if(d.recAll){
      s.title=t.title;s.ctx=t.ctx;s.est=t.est;s.fw=t.fw||null;s.urg=!!t.urg;s.imp=!!t.imp;s.dodText=dod().join('\n');
      S.tasks.forEach(function(x){if(x.rid===t.rid&&x.id!==t.id&&!isDone(x)&&(x.od||x.day)>od){x.title=s.title;x.ctx=s.ctx;x.est=s.est;x.fw=s.fw;x.urg=s.urg;x.imp=s.imp;x.dod=dod().map(function(l){return {t:l,d:false}})}});
    }
  }
}
function endSeries(id){
  var t=byId(id);if(!t||!t.rid||!S.rec[t.rid]){dropTask(id);return}
  var rid=t.rid,s=S.rec[rid],od=t.od||t.day,prev=s.until,gone=S.tasks.filter(function(x){return x.rid===rid&&!isDone(x)&&(x.od||x.day)>=od});
  s.until=addDays(od,-1);
  S.tasks=S.tasks.filter(function(x){return gone.indexOf(x)<0});
  if(S.session&&gone.some(function(g){return g.id===S.session.tid})){S.session=null;unlock()}
  persist();render();
  toast('Repetição encerrada.','Desfazer',function(){s.until=prev;gone.forEach(function(x){S.tasks.push(x)});persist();render()});
}
