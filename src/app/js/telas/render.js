/* ---------- render ---------- */
function initNav(){
  var T=[['hoje','target','Hoje'],['semana','cal','Semana'],null,['foco','timer','Foco'],['revisao','bars','Revisão']];
  $('#tabs').innerHTML=T.map(function(x){return x?'<button class="tab" data-act="tab" data-t="'+x[0]+'">'+ic(x[1],24)+'<span>'+x[2]+'</span>'+(x[0]==='foco'?'<i class="pip" id="pip" hidden></i>':'')+'</button>':'<button class="tab-add" data-act="new" aria-label="Nova tarefa">'+ic('plus',28,2.4)+'<span class="add-l">Nova tarefa</span></button>'}).join('')+'<div class="brand"><svg width="22" height="22" viewBox="0 0 44 44" aria-hidden="true"><circle cx="22" cy="6" r="2.2" fill="currentColor"/><path d="M22 6v20" stroke="currentColor" stroke-width="2.4"/><path d="M22 24l7 9-7 11-7-11z" fill="var(--accent)"/></svg>Prumo</div><div class="kb">N · nova tarefa<br>Espaço · pausar ou retomar<br>1 a 4 · trocar de aba</div>';
}
function miniHTML(){
  var se=S.session;if(!se||tab==='foco')return '';
  var t=se.tid?byId(se.tid):null,nm=t?t.title:'Sessão livre';
  if(se.alerted)return '<button class="mini-main" data-act="tab" data-t="foco"><b>00:00</b><span>'+esc(nm)+'</span></button><button class="mini-btn" data-act="tab" data-t="foco">Abrir</button>';
  return '<button class="mini-main" data-act="tab" data-t="foco"><b id="mini-t">'+mmss(remaining())+'</b><span>'+(se.running?'':'Pausado · ')+esc(nm)+'</span></button>'+(se.running?'<button class="mini-btn" data-act="pause">'+ic('pause',18,2.2)+'Pausar</button>':'<button class="mini-btn" data-act="resume">'+ic('play',18)+'Retomar</button>');
}
function renderMini(){
  var m=document.getElementById('mini');if(!m)return;
  var h=miniHTML();
  if(m.dataset.k!==h){m.innerHTML=h;m.dataset.k=h}
  m.hidden=!h;document.documentElement.classList.toggle('hasmini',!!h);
}
function render(){
  var V={hoje:viewHoje,semana:viewSemana,foco:viewFoco,revisao:viewRevisao,perfil:viewPerfil};
  $('#view').innerHTML=V[tab]();
  Array.prototype.forEach.call(document.querySelectorAll('.tab'),function(b){b.setAttribute('aria-current',b.dataset.t===tab?'page':'false')});
  var p=$('#pip');if(p)p.hidden=!(S.session&&S.session.alerted&&tab!=='foco');
  renderMini();
  renderPip();
  popId=null;
}
function scrollTop(){try{window.scrollTo(0,0)}catch(e){}}

