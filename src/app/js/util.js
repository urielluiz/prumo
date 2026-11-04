/* ---------- utilidades ---------- */
var $=function(s){return document.querySelector(s)};
var pad=function(n){return String(n).padStart(2,'0')};
var iso=function(d){return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())};
var parseISO=function(s){var p=s.split('-').map(Number);return new Date(p[0],p[1]-1,p[2])};
var todayISO=function(){return iso(new Date())};
var addDays=function(s,n){var d=parseISO(s);d.setDate(d.getDate()+n);return iso(d)};
var weekStart=function(s){var d=parseISO(s);d.setDate(d.getDate()-((d.getDay()+6)%7));return iso(d)};
var esc=function(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})};
var uid=function(){return Math.random().toString(36).slice(2,9)+Date.now().toString(36).slice(-4)};
var mmss=function(s){return pad(Math.floor(s/60))+':'+pad(s%60)};
var fmt=function(m){m=Math.round(m);if(m<60)return m+' min';var h=Math.floor(m/60),r=m%60;return r?h+'h'+pad(r):h+'h'};
var sum=function(a,f){return a.reduce(function(x,t){return x+f(t)},0)};
var clone=function(o){return JSON.parse(JSON.stringify(o))};

var DAYS=['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
var DABR=['dom','seg','ter','qua','qui','sex','sáb'];
var MONS=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
var MONF=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
var WIP=3, MAXMIT=3;

var CTX=[
  {id:'trabalho',name:'Trabalho',v:'--c1'},
  {id:'3coletivo',name:'3Coletivo',v:'--c2'},
  {id:'freelas',name:'Freelas',v:'--c3'},
  {id:'pessoal',name:'Pessoal',v:'--c4'}
];
var FW={
  pomodoro:{name:'Pomodoro',how:'25 minutos de foco total, 5 de pausa. A cada 4 rodadas, a pausa é de 15.',best:'Trabalho longo ou criativo'},
  timebox:{name:'Timebox',how:'O tempo da estimativa é o teto. Quando acabar, entregue o que tem e decida o próximo passo.',best:'Sem fim claro, risco de perfeccionismo'},
  cinco:{name:'Só 5 minutos',how:'Comece por 5 minutos e pode parar depois. Começar é a parte mais difícil.',best:'Tarefa que você vem adiando'},
  dois:{name:'Regra dos 2 minutos',how:'Se leva até 2 minutos, faça agora e tire da cabeça.',best:'Tarefas rápidas'}
};
var QD={
  1:{n:'Fazer agora',s:'Urgente e importante'},
  2:{n:'Agendar',s:'Importante, sem urgência'},
  3:{n:'Encurtar ou delegar',s:'Urgente, pouco importante'},
  4:{n:'Soltar ou deixar para depois',s:'Nem urgente nem importante'}
};

var ICON={
  target:'<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3.2"/>',
  cal:'<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  timer:'<circle cx="12" cy="13.5" r="7.5"/><path d="M12 9.5v4.2l2.6 1.6M9.5 3h5"/>',
  bars:'<path d="M5.5 19V10M12 19V5M18.5 19v-6.5"/>',
  play:'<path d="M8.5 5.8v12.4l10-6.2z" fill="currentColor"/>',
  star:'<path d="M12 3.9l2.4 5 5.5.8-4 3.9.9 5.5-4.8-2.6-4.8 2.6.9-5.5-4-3.9 5.5-.8z"/>',
  check:'<path d="M5.5 12.5l4.2 4.2 8.8-9.2"/>',
  left:'<path d="M14.5 5.5L8 12l6.5 6.5"/>',
  right:'<path d="M9.5 5.5L16 12l-6.5 6.5"/>',
  pause:'<path d="M8.5 5.5v13M15.5 5.5v13"/>',
  x:'<path d="M6 6l12 12M18 6L6 18"/>',
  up:'<path d="M6 14l6-6 6 6"/>',
  down:'<path d="M6 10l6 6 6-6"/>',
  repeat:'<path d="M17 3l3 3-3 3M4 12v-2a4 4 0 0 1 4-4h12M7 21l-3-3 3-3M20 12v2a4 4 0 0 1-4 4H4"/>',
  more:'<circle cx="5" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="19" cy="12" r="1.6" fill="currentColor"/>',
  trash:'<path d="M4.5 7h15M9.5 7V4.8h5V7M6.5 7l.9 12.2h9.2L17.5 7M10 10.5v5.5M14 10.5v5.5"/>'
};
function ic(n,s,w){s=s||22;return '<svg class="ic" width="'+s+'" height="'+s+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="'+(w||1.9)+'" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+ICON[n]+'</svg>'}

