/* ---------- foco ---------- */
var ac=null,wl=null;
function ensureAudio(){try{if(!ac){var A=window.AudioContext||window.webkitAudioContext;if(A)ac=new A()}if(ac&&ac.state==='suspended')ac.resume()}catch(e){}}
function beep(){try{if(!ac)return;var n=ac.currentTime;[0,.22,.44,1.2,1.42,1.64].forEach(function(o,i){var os=ac.createOscillator(),g=ac.createGain();os.type='sine';os.frequency.value=(i%3===2)?988:784;g.gain.setValueAtTime(.0001,n+o);g.gain.exponentialRampToValueAtTime(.45,n+o+.02);g.gain.exponentialRampToValueAtTime(.0001,n+o+.18);os.connect(g);g.connect(ac.destination);os.start(n+o);os.stop(n+o+.2)})}catch(e){}}
async function lock(){try{if(navigator.wakeLock&&S.session&&S.session.running&&!wl&&document.visibilityState==='visible'){wl=await navigator.wakeLock.request('screen');wl.addEventListener('release',function(){wl=null})}}catch(e){}}
function unlock(){try{if(wl)wl.release()}catch(e){}wl=null}
/* ---------- avisos, titulo da aba e janela flutuante ---------- */
var pip=null,pipKey='',lastTitle='';
var PIPOK=!!(window.documentPictureInPicture&&window.documentPictureInPicture.requestWindow);
var DESK=!!(window.matchMedia&&matchMedia('(hover:hover) and (pointer:fine)').matches);
function pipAuto(){try{return localStorage.getItem('prumo.pip')!=='off'}catch(e){return true}}
function pomoText(d,fw){return fw==='pomodoro'&&d.est>=50?' ≈ '+Math.ceil(d.est/25)+' pomodoros para '+fmt(d.est)+'.':''}
function askNotif(){try{if(DESK&&'Notification' in window&&Notification.permission==='default')Notification.requestPermission()}catch(e){}}
