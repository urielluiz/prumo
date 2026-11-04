/* ---------- boot ---------- */
async function boot(){
  prune(400);S.rec=S.rec||{};
  initSB();
  rebase();
  rolloverRec();
  if(convertPautas())persist();
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
  // ?fechar=1 vem do lembrete; os outros, dos atalhos do ícone (segurar o ícone no Android ou clicar com o botão direito no Mac)
  try{var qs=location.search,go=/[?&](fechar|nova|foco|buscar|planejar)=1/.exec(qs);if(go){history.replaceState(null,'',location.pathname);
    if(go[1]==='fechar'){sh={kind:'close'};renderSheet()}else if(go[1]==='nova')openTask(null,todayISO());else if(go[1]==='foco'){tab='foco';render()}else if(go[1]==='buscar')act('busca',{dataset:{}});else{sh={kind:'plan'};renderSheet()}}}catch(e){}
  try{navigator.serviceWorker.addEventListener('message',function(e){if(e.data&&e.data.go==='retro')wrOpen(weekStart(todayISO()));if(e.data&&e.data.go==='fechar'){sh={kind:'close'};renderSheet()}})}catch(e){}
}
boot();
