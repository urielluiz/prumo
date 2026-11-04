/* ---------- obra: dia firme, sequência e andares ---------- */
// Dia firme: concluir tarefas e/ou blocos de 25 min de foco até a meta do dia (padrão 1).
// Folga (padrão sábado e domingo, mais dias com capacidade zero) não quebra a sequência; se for firme, vale tijolo.
// Uma pausa por semana cobre um dia útil em branco. A obra só cresce: cada semana com tijolo é um andar,
// e o andar fica "no prumo" quando a semana foi fechada na retrospectiva.
var FOCOBLK=25*60,OFFDEF=[0,6],PAUSAS=1;
function gOff(){var o=S.g&&S.g.off;return Array.isArray(o)?o.filter(function(x){return x>=0&&x<=6}):OFFDEF}
function gMeta(){var m=Number(S.g&&S.g.meta);return m>=1&&m<=5?Math.floor(m):1}
function isFolga(d){var w=parseISO(d).getDay();return gOff().indexOf(w)>=0||!(S.cap[w]>0)}
function doneMap(){var m={};S.tasks.forEach(function(t){if(isDone(t)&&t.doneAt){var d=iso(new Date(t.doneAt));m[d]=(m[d]||0)+1}});return m}
function dayUnits(d,dm){return ((dm||doneMap())[d]||0)+Math.floor((S.log[d]||0)/FOCOBLK)}
function dayOf(d){return (S.days&&S.days[d])||{}}
function dayClosed(d){return !!dayOf(d).c}
function retroDone(wk){var r=S.retro[wk];return !!(r&&(r.worked||r.stuck||r.tweak))}
// estado de cada dia desde a primeira atividade: f firme, o folga, p pausa usada, x em branco, t hoje ainda aberto
function obra(){
  var td=todayISO(),dm=doneMap(),meta=gMeta(),start=td;
  Object.keys(dm).concat(Object.keys(S.log||{}).filter(function(k){return S.log[k]>=FOCOBLK})).forEach(function(k){if(k<start)start=k});
  var lim=addDays(td,-400);if(start<lim)start=lim;
  var days=[],run=0,best=0,used={},bricks=0,d=start;
  while(d<=td){
    var u=dayUnits(d,dm),wk=weekStart(d),s;
    if(u>=meta){s='f';run++;bricks++;if(run>best)best=run}
    else if(d===td)s='t';
    else if(isFolga(d))s='o';
    else if((used[wk]||0)<PAUSAS){s='p';used[wk]=(used[wk]||0)+1}
    else{s='x';run=0}
    days.push({d:d,s:s,u:u});d=addDays(d,1);
  }
  var floors=[],by={};
  days.forEach(function(x){var wk=weekStart(x.d);if(!by[wk]){by[wk]={wk:wk,cells:['','','','','','',''],n:0};floors.push(by[wk])}var f=by[wk];f.cells[(parseISO(x.d).getDay()+6)%7]=x.s;if(x.s==='f')f.n++});
  floors=floors.filter(function(f){return f.n>0||f.wk===weekStart(td)});
  floors.forEach(function(f){f.prumo=retroDone(f.wk)});
  var last=days[days.length-1]||{u:0};
  return {cur:run,best:best,bricks:bricks,floors:floors,today:last.u,meta:meta,firm:last.u>=meta,pauseLeft:PAUSAS-(used[weekStart(td)]||0),broke:run===0&&best>0&&days.some(function(x){return x.s==='x'})};
}
function planned(d){return !!(S.blockers[d]||dayOf(d).s||tasksOn(d).length)}
// Sapo escolhido ao fechar o dia anterior, se ainda estiver aberto hoje
function sapoOf(d){var id=dayOf(d).s,t=id&&byId(id);return t&&!isDone(t)&&covers(t,d)?t:null}
function setDay(d,o){S.days=S.days||{};var cur=Object.assign({},S.days[d]||{},o);Object.keys(cur).forEach(function(k){if(cur[k]==null||cur[k]==='')delete cur[k]});if(Object.keys(cur).length)S.days[d]=cur;else delete S.days[d]}
// dados vindos da nuvem passam por aqui antes de entrar no estado
function cleanDay(o){o=o||{};var r={};if(Number(o.c)>0)r.c=Number(o.c);if(typeof o.s==='string'&&o.s.length<=64)r.s=o.s;return r}
function cleanG(o){o=o||{};var r={};if(Array.isArray(o.off))r.off=o.off.map(Number).filter(function(x,i,a){return x>=0&&x<=6&&a.indexOf(x)===i});var m=Number(o.meta);if(m>=1&&m<=5)r.meta=Math.floor(m);return r}
