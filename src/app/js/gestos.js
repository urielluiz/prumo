/* ---------- deslizar o card para a esquerda: Amanhã e Outro dia ---------- */
// Atalho de toque; o mesmo vem pelo botão ⋯ (todo gesto tem um caminho com botão).
var swOpen=null,swRow=null,swX=0,swY=0,swDx=0,swLock=0,SWW=172;
function closeSwipe(){if(swOpen){swOpen.style.transform='';swOpen=null}}
document.addEventListener('pointerdown',function(e){
  if(e.pointerType==='mouse')return;
  var r=e.target.closest&&e.target.closest('.rw .row');
  if(swOpen&&r!==swOpen&&!(e.target.closest&&e.target.closest('.sw')))closeSwipe();
  if(!r)return;
  swRow=r;swX=e.clientX;swY=e.clientY;swDx=swOpen===r?-SWW:0;swLock=0;
},{passive:true});
document.addEventListener('pointermove',function(e){
  if(!swRow)return;
  var x=e.clientX-swX,y=e.clientY-swY;
  if(!swLock){if(Math.abs(x)<8&&Math.abs(y)<8)return;swLock=Math.abs(x)>Math.abs(y)?1:2}
  if(swLock===2){swRow=null;return}
  var base=swOpen===swRow?-SWW:0;swDx=Math.min(0,Math.max(-SWW-24,base+x));
  swRow.style.transition='none';swRow.style.transform='translateX('+swDx+'px)';
},{passive:true});
function swEnd(){
  if(!swRow)return;var r=swRow;swRow=null;r.style.transition='';
  if(swLock!==1)return;
  if(swDx<-70){r.style.transform='translateX(-'+SWW+'px)';swOpen=r;r.dataset.swiped='1';setTimeout(function(){delete r.dataset.swiped},350)}
  else{r.style.transform='';if(swOpen===r)swOpen=null}
}
document.addEventListener('pointerup',swEnd,{passive:true});
document.addEventListener('pointercancel',function(){if(swRow){swRow.style.transition='';swRow.style.transform=swOpen===swRow?'translateX(-'+SWW+'px)':'';swRow=null}},{passive:true});
// o toque que termina um deslize não abre a tarefa; com um card aberto, tocar fora só fecha
document.addEventListener('click',function(e){
  var r=e.target.closest&&e.target.closest('.rw .row');
  if(r&&r.dataset.swiped){e.stopPropagation();e.preventDefault();return}
  if(swOpen&&!(e.target.closest&&e.target.closest('.sw'))){closeSwipe();e.stopPropagation();e.preventDefault()}
},true);

/* ---------- arrastar entre dias (computador, Semana) ---------- */
// Solte num dia da faixa ou na seção de um dia. Pelo teclado, o mesmo vem pelo menu ⋯.
var dragId=null,CANDRAG=!(window.matchMedia&&matchMedia('(pointer: coarse)').matches); // dedo como ponteiro principal: sem arrastar
function dropTarget(e){return e.target.closest&&(e.target.closest('.wstrip .dy')||e.target.closest('.dz'))}
function dropDay(el){var v=el.classList.contains('dy')?el.dataset.d:el.dataset.drop;return v==='none'?null:v}
function clearOver(){Array.prototype.forEach.call(document.querySelectorAll('.drop-over'),function(x){x.classList.remove('drop-over')})}
document.addEventListener('dragstart',function(e){
  var r=e.target.closest&&e.target.closest('.row[draggable]');if(!r)return;
  dragId=r.dataset.tid;r.classList.add('dragging');document.documentElement.classList.add('dragmode');
  try{e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',dragId)}catch(x){}
});
document.addEventListener('dragend',function(e){
  var r=e.target.closest&&e.target.closest('.row');if(r)r.classList.remove('dragging');
  dragId=null;clearOver();document.documentElement.classList.remove('dragmode');
});
document.addEventListener('dragover',function(e){
  if(!dragId)return;var t=dropTarget(e);if(!t)return;
  e.preventDefault();try{e.dataTransfer.dropEffect='move'}catch(x){}
  if(!t.classList.contains('drop-over')){clearOver();t.classList.add('drop-over')}
});
document.addEventListener('drop',function(e){
  if(!dragId)return;var t=dropTarget(e);if(!t)return;
  e.preventDefault();var id=dragId,d=dropDay(t),cur=byId(id);dragId=null;clearOver();document.documentElement.classList.remove('dragmode');
  if(!cur||(cur.day||null)===d)return;
  var was=moveTask(id,d);if(!was)return;
  render();toast('Movida para '+(d?relDay(d):'Sem data')+'.','Desfazer',function(){undoMove(id,was)});flashTask(id);
});
