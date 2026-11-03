/* ---------- boot ---------- */
async function boot(){
  prune(400);S.rec=S.rec||{};
  initSB();
  rebase();
  rolloverRec();
  initNav();
  if(S.session)tab='foco';
  render();
  var tw=null;
  try{tw=new Worker(URL.createObjectURL(new Blob(['setInterval(function(){postMessage(1)},500)'],{type:'text/javascript'})));tw.onmessage=function(){tick()}}catch(e){tw=null}
  if(!tw)setInterval(tick,250);
  await Promise.race([initRemote(),new Promise(function(r){setTimeout(r,4500)})]);
  booted=true;
  if(!S.seeded&&!S.tasks.length)seed();
  render();
  tick();
  try{if(/[?&]retro=1/.test(location.search)){history.replaceState(null,'',location.pathname);wrOpen(weekStart(todayISO()))}}catch(e){}
  try{navigator.serviceWorker.addEventListener('message',function(e){if(e.data&&e.data.go==='retro')wrOpen(weekStart(todayISO()))})}catch(e){}
}
boot();
