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
