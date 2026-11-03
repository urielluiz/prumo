/* ---------- retrô em stories ---------- */
var wr=null,wrRaf=0,popId=null,RM=false;
try{RM=window.matchMedia('(prefers-reduced-motion: reduce)').matches}catch(e){}
var WSEC=6500;
function wrapData(wk){
  var days=[0,1,2,3,4,5,6].map(function(i){return addDays(wk,i)});
  var wt=weekTasks(wk).filter(function(t){return !isGrp(t)}),dn=wt.filter(isDone);
  var perDay=days.map(function(d){return dn.filter(function(t){return (t.doneAt?iso(new Date(t.doneAt)):t.day)===d}).length});
  var focus=days.map(function(d){return (S.log[d]||0)/60});
  var fm=sum(focus,function(x){return x});
  var best=0;days.forEach(function(d,i){if(focus[i]+perDay[i]*5>focus[best]+perDay[best]*5)best=i});
  var ctx=CTX.map(function(c){return {c:c,n:dn.filter(function(t){return t.ctx===c.id}).length}}).filter(function(x){return x.n>0});
  var rs=dn.filter(function(t){return (t.focus||0)>=60&&(t.est0||t.est)});
  var eT=sum(rs,function(t){return t.est0||t.est}),rT=sum(rs,function(t){return t.focus/60});
  var win=dn.slice().sort(function(a,b){return b.est-a.est})[0]||null;
  var slip=dn.filter(function(t){return (t.slips||0)>0}).sort(function(a,b){return b.slips-a.slips})[0]||null;
  var act=perDay.filter(function(n){return n>0}).length;
  var pct=wt.length?Math.round(dn.length/wt.length*100):0;
  var arch;
  if(pct>=90&&wt.length>=4)arch=['Fecha o que abre','Quase tudo que você planejou ficou pronto.'];
  else if(fm>=600)arch=['Maratonista do foco','Mais de '+Math.floor(fm/60)+' horas de foco de verdade.'];
  else if(slip&&slip.slips>=2)arch=['Quem volta','Você retomou o que tinha ficado para trás.'];
  else if(act>=5)arch=['Constância','Você entregou em '+act+' dos 7 dias.'];
  else arch=['Passo a passo','Um ritmo seu. O que importa é que andou.'];
  return {wk:wk,days:days,planned:wt.length,done:dn.length,pct:pct,perDay:perDay,focus:focus,fm:fm,best:best,ctx:ctx,eT:eT,rT:rT,nR:rs.length,win:win,slip:slip,act:act,arch:arch,streak:streak()};
}
function wrSlides(D){
  var L=[];
  L.push({k:'intro',c:'a',h:'<div class="wr-eb">Retrô Prumo</div><div class="wr-big wr-in">Sua semana<br>'+esc(rangeLabel(D.wk))+'</div><p class="wr-p wr-in2">Toque para avançar. Segure para pausar.</p>'});
  if(!D.done){
    L.push({k:'quiet',c:'b',h:'<div class="wr-eb">Semana quieta</div><div class="wr-big wr-in">Nada concluído desta vez.</div><p class="wr-p wr-in2">Semanas assim acontecem. A próxima começa com uma tarefa de 5 minutos.</p>'});
  }else{
    L.push({k:'num',c:'b',h:'<div class="wr-eb">Você concluiu</div><div class="wr-huge"><span data-count="'+D.done+'">0</span></div><div class="wr-p wr-in2">'+(D.done===1?'tarefa':'tarefas')+(D.planned>D.done?' de '+D.planned+' planejadas':', todas as planejadas')+'</div><div class="wr-track wr-in2"><i data-w="'+D.pct+'"></i></div><div class="wr-p">'+D.pct+'% da semana</div>'});
    if(D.fm>=1){
      var mx=Math.max.apply(null,D.focus.concat([1]));
      L.push({k:'focus',c:'c',h:'<div class="wr-eb">Tempo em foco</div><div class="wr-huge wr-mid"><span data-count="'+Math.round(D.fm)+'" data-fmt="min">0</span></div><div class="wr-bars">'+D.days.map(function(d,i){return '<div class="wr-bar'+(i===D.best?' best':'')+'"><i data-h="'+Math.max(4,Math.round(D.focus[i]/mx*100))+'" style="--i:'+i+'"></i><small>'+DABR[parseISO(d).getDay()]+'</small></div>'}).join('')+'</div><p class="wr-p">Melhor dia: <b>'+DAYS[parseISO(D.days[D.best]).getDay()]+'</b></p>'});
    }
    if(D.ctx.length>1||D.ctx.length===1){
      var tot=sum(D.ctx,function(x){return x.n});
      L.push({k:'ctx',c:'d',h:'<div class="wr-eb">Onde sua energia foi</div><div class="wr-seg">'+D.ctx.map(function(x,i){return '<i data-w="'+(x.n/tot*100).toFixed(1)+'" style="background:var('+x.c.v+');--i:'+i+'"></i>'}).join('')+'</div><div class="wr-leg">'+D.ctx.map(function(x){return '<div><i class="dot" style="background:var('+x.c.v+')"></i><b>'+x.n+'</b> '+esc(cname(x.c.id))+'</div>'}).join('')+'</div>'});
    }
    if(D.nR>=2){
      var diff=D.rT-D.eT,pc=D.eT?Math.round(Math.abs(diff)/D.eT*100):0;
      L.push({k:'est',c:'e',h:'<div class="wr-eb">Estimado contra real</div><div class="wr-cmp wr-in"><div><small>Você previu</small><b>'+esc(fmt(D.eT))+'</b></div><div><small>Levou</small><b>'+esc(fmt(D.rT))+'</b></div></div><p class="wr-p wr-in2">'+(pc<=10?'Estimativa afinada. Seu olho está calibrado.':(diff>0?'Levou '+pc+'% a mais. Na próxima, estime com folga.':'Sobrou '+pc+'% de tempo. Você pode planejar mais.'))+'</p>'});
    }
    if(D.win)L.push({k:'win',c:'a',h:'<div class="wr-eb">Maior entrega</div><div class="wr-quote wr-in">'+esc(D.win.title)+'</div><p class="wr-p wr-in2">'+esc(fmt(D.win.est))+' de trabalho em '+esc(cname(D.win.ctx))+'.</p>'});
    if(D.slip)L.push({k:'slip',c:'b',h:'<div class="wr-eb">Venceu o adiamento</div><div class="wr-quote wr-in">'+esc(D.slip.title)+'</div><p class="wr-p wr-in2">Tinha sido adiada '+D.slip.slips+(D.slip.slips>1?' vezes':' vez')+'. Hoje está feita.</p>'});
    L.push({k:'arch',c:'c',h:'<div class="wr-eb">Seu estilo da semana</div><div class="wr-big wr-in">'+esc(D.arch[0])+'</div><p class="wr-p wr-in2">'+esc(D.arch[1])+'</p>'+(D.streak>=2?'<div class="wr-chip wr-in2">Sequência de '+D.streak+' dias</div>':'')});
  }
  L.push({k:'end',c:'d',h:'<div class="wr-eb">Fechar a semana</div><div class="wr-big wr-in">'+(D.done?'Bom trabalho.':'Recomeço leve.')+'</div><p class="wr-p wr-in2">Anote o que funcionou e o que muda na próxima.</p><div class="wr-btns wr-in2"><button class="wr-btn p" data-act="wr-write">Escrever retrospectiva</button><button class="wr-btn" data-act="wr-copy">Copiar resumo</button><button class="wr-btn g" data-act="wr-close">Fechar</button></div>'});
  return L;
}
function wrOpen(wk){
  wrClose(true);
  var D=wrapData(wk),el=document.createElement('div');
  el.id='rwrap';el.className='rwrap';el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');el.setAttribute('aria-label','Retrô da semana');
  wr={wk:wk,D:D,L:wrSlides(D),i:-1,paused:false,t:0,last:0,el:el,prevFocus:document.activeElement};
  document.body.appendChild(el);
  try{localStorage.setItem('prumo.wrap.'+wk,'1')}catch(e){}
  wrGo(0);
  wrRaf=requestAnimationFrame(wrLoop);
  var btn=el.querySelector('.wr-x');if(btn)btn.focus();
}
function wrClose(silent){
  cancelAnimationFrame(wrRaf);
  if(wr){var p=wr.prevFocus;if(wr.el.parentNode)wr.el.parentNode.removeChild(wr.el);wr=null;if(!silent){render();try{if(p&&p.focus)p.focus()}catch(e){}}}
}
function wrGo(i){
  if(!wr)return;
  if(i<0)i=0;
  if(i>=wr.L.length){wrClose();return}
  wr.i=i;wr.t=0;wr.last=0;
  var s=wr.L[i];
  wr.el.innerHTML='<div class="wr-bg c-'+s.c+'"></div><div class="wr-prog">'+wr.L.map(function(x,j){return '<span><i style="width:'+(j<i?100:0)+'%"></i></span>'}).join('')+'</div><button class="wr-x" data-act="wr-close" aria-label="Fechar retrô">'+ic('x',22,2.2)+'</button><div class="wr-slide" aria-live="polite">'+s.h+'</div><div class="wr-hint" aria-hidden="true">'+(i===0?'':'')+'</div>';
  wrAnim(wr.el);
  if(s.k==='end'&&!RM&&(wr.D.pct>=60||wr.D.done>=5))confetti(wr.el,70);
}
function wrAnim(root){
  var set=function(){
    Array.prototype.forEach.call(root.querySelectorAll('[data-w]'),function(e){e.style.width=e.dataset.w+'%'});
    Array.prototype.forEach.call(root.querySelectorAll('[data-h]'),function(e){e.style.height=e.dataset.h+'%'});
  };
  Array.prototype.forEach.call(root.querySelectorAll('[data-count]'),function(e){
    var n=Number(e.dataset.count),f=e.dataset.fmt==='min',txt=function(v){return f?fmt(v):String(Math.round(v))};
    if(RM||n<=0){e.textContent=txt(n);return}
    var t0=null,dur=1100;
    var step=function(ts){if(!wr||!root.parentNode)return;if(t0===null)t0=ts;var p=Math.min(1,(ts-t0)/dur),q=1-Math.pow(1-p,3);e.textContent=txt(n*q);if(p<1)requestAnimationFrame(step)};
    requestAnimationFrame(step);
  });
  if(RM)set();else requestAnimationFrame(function(){requestAnimationFrame(set)});
}
function wrLoop(ts){
  if(!wr)return;
  if(wr.last){
    var dt=ts-wr.last;
    if(!wr.paused&&!RM&&wr.i<wr.L.length-1){
      wr.t+=dt;
      var bars=wr.el.querySelectorAll('.wr-prog span i'),b=bars[wr.i];if(b)b.style.width=Math.min(100,wr.t/WSEC*100)+'%';
      if(wr.t>=WSEC){wrGo(wr.i+1)}
    }
  }
  if(wr){wr.last=ts;wrRaf=requestAnimationFrame(wrLoop)}
}
function confetti(host,n){
  if(RM)return;
  var c=document.createElement('div');c.className='conf';c.setAttribute('aria-hidden','true');
  var col=['#FF7A45','#FFC247','#4CC38A','#6AA7FF','#F5F5FA','#C98BFF'];
  for(var i=0;i<n;i++){var s=document.createElement('i');
    s.style.cssText='left:'+(Math.random()*100)+'%;background:'+col[i%col.length]+';--dx:'+Math.round(Math.random()*160-80)+'px;--r:'+Math.round(Math.random()*720-360)+'deg;animation-duration:'+(1.6+Math.random()*1.6).toFixed(2)+'s;animation-delay:'+(Math.random()*.4).toFixed(2)+'s;width:'+(6+Math.round(Math.random()*5))+'px;height:'+(9+Math.round(Math.random()*6))+'px';
    c.appendChild(s)}
  host.appendChild(c);setTimeout(function(){if(c.parentNode)c.parentNode.removeChild(c)},3800);
}
(function(){
  var down=null;
  document.addEventListener('pointerdown',function(e){
    if(!wr||e.target.closest('button'))return;
    down={x:e.clientX,t:Date.now(),hold:false};
    down.h=setTimeout(function(){if(down){down.hold=true;wr.paused=true;wr.el.classList.add('hold')}},260);
  });
  var up=function(e){
    if(!wr||!down)return;
    clearTimeout(down.h);var d=down;down=null;
    wr.paused=false;wr.el.classList.remove('hold');
    if(d.hold)return;
    if(e.target.closest&&e.target.closest('button'))return;
    var w=window.innerWidth;
    if(d.x<w*.33)wrGo(wr.i-1);else wrGo(wr.i+1);
  };
  document.addEventListener('pointerup',up);
  document.addEventListener('pointercancel',function(){if(down){clearTimeout(down.h);down=null}if(wr){wr.paused=false;wr.el.classList.remove('hold')}});
  document.addEventListener('keydown',function(e){
    if(!wr)return;
    if(e.key==='Escape'){wrClose()}
    else if(e.key==='ArrowRight'||e.key===' '){e.preventDefault();wrGo(wr.i+1)}
    else if(e.key==='ArrowLeft'){wrGo(wr.i-1)}
  },true);
})();
function wrapTarget(){
  var td=todayISO(),dow=parseISO(td).getDay();
  if(dow===0)return weekStart(td);
  if(dow===1)return addDays(weekStart(td),-7);
  return null;
}
function wrapBanner(){
  var wk=wrapTarget();if(!wk)return '';
  var seen=false;try{seen=!!localStorage.getItem('prumo.wrap.'+wk)}catch(e){}
  if(seen)return '';
  if(!weekTasks(wk).some(function(t){return isDone(t)&&!isGrp(t)}))return '';
  return '<div class="wrapban"><div><b>Sua retrô da semana está pronta</b><span>'+esc(rangeLabel(wk))+'</span></div><button class="btn btn-p sm" data-act="wr-open" data-wk="'+wk+'">Ver</button></div>';
}
