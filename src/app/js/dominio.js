/* ---------- dominio ---------- */
var helpPrev=null,tab='hoje',wkOff=0,semOff=0,doneOpen=false,focusFw=null,sh=null,lastCtx='trabalho',restoreTxt='';
var byId=function(id){return S.tasks.find(function(t){return t.id===id})};
var isDone=function(t){return t.status==='done'};
var cname=function(id){return (S.ctx&&S.ctx[id])||(CTX.find(function(c){return c.id===id})||CTX[0]).name};
var ctxOf=function(id){return CTX.find(function(c){return c.id===id})||CTX[0]};
var quad=function(t){return t.urg&&t.imp?1:(!t.urg&&t.imp?2:(t.urg&&!t.imp?3:4))};
function suggestion(t){
  var e=t.est||0,q=quad(t),n=(t.dodText?String(t.dodText).split('\n').filter(function(x){return x.trim()}).length:(t.dod||[]).length),slips=t.slips||0;
  if(slips>=2)return {fw:'cinco',why:'Você já adiou esta tarefa '+slips+' vezes. Comece só por 5 minutos e decida depois se continua.'};
  if(e<=2)return {fw:'dois',why:'Leva até 2 minutos: faça agora e tire da cabeça.'};
  if(e>=240)return {fw:'pomodoro',why:'Tarefa de '+fmt(e)+'. Pomodoro mantém o ritmo ao longo do dia; vale quebrar em entregas menores.'};
  if(e>=50)return {fw:'pomodoro',why:'Trabalho longo ('+fmt(e)+'): blocos de 25 minutos com pausa evitam o cansaço e o perfeccionismo.'};
  if(e>=30&&n>=3)return {fw:'pomodoro',why:'Tem '+n+' critérios de pronto, então é complexa para o tempo. Divida em blocos de 25 minutos.'};
  if(q===2&&e>=30)return {fw:'cinco',why:'Importante e sem urgência é o que mais se adia. Comece por 5 minutos.'};
  if(e<=15)return {fw:'timebox',why:'Tarefa curta: o tempo estimado é o teto. Acabou, entregue o que tem.'};
  return {fw:'timebox',why:'Cabe em um bloco de '+fmt(e)+'. Defina o teto e entregue quando acabar.'};
}
function suggestFw(t){return suggestion(t).fw}
var fwOf=function(t){return t.fw||suggestFw(t)};
var byPrio=function(a,b){return quad(a)-quad(b)||b.est-a.est};
// Período: tarefa com day (início) e end (último dia). O tempo (est) é por dia. Concluída, ela termina no dia da conclusão.
var lastDay=function(t){return t.end||t.day};
var spanOf=function(t){return t.end?Math.round((parseISO(t.end)-parseISO(t.day))/864e5)+1:1};
var dayIdx=function(t,d){return Math.round((parseISO(d)-parseISO(t.day))/864e5)+1};
var covers=function(t,d){return !!t.day&&(t.day===d||(!!t.end&&d>t.day&&d<=t.end))};
var estAll=function(t,orig){return ((orig&&t.est0)||t.est||0)*spanOf(t)};
var tasksOn=function(d){return S.tasks.filter(function(t){return covers(t,d)})};
var curWk=function(){return addDays(weekStart(todayISO()),wkOff*7)};
var weekTasks=function(wk){var e=addDays(wk,6);return S.tasks.filter(function(t){return t.day&&t.day<=e&&lastDay(t)>=wk})};
// minutos planejados de uma tarefa entre a e b (período conta só os dias dentro do intervalo)
var estIn=function(t,a,b){if(!t.end)return t.day>=a&&t.day<=b?t.est:0;var s=t.day>a?t.day:a,e=t.end<b?t.end:b;return s>e?0:t.est*(Math.round((parseISO(e)-parseISO(s))/864e5)+1)};
var overdue=function(){var td=todayISO();return S.tasks.filter(function(t){return !isDone(t)&&t.day&&lastDay(t)<td}).sort(function(a,b){return lastDay(a)<lastDay(b)?-1:1})};
var wipCount=function(){return S.tasks.filter(function(t){return t.status==='doing'}).length};
// prazo final: etiqueta do card (vence hoje, amanhã, venceu)
function dueTag(t){if(!t.due||isDone(t))return '';var td=todayISO(),c=t.due<td?'bad':(t.due===td?'warn':''),x=t.due<td?'prazo venceu '+shortDate(t.due):'prazo '+relDay(t.due);return '<span class="tag due'+(c?' '+c:'')+'">'+esc(x)+'</span>'}
var dueNow=function(){var td=todayISO();return S.tasks.filter(function(t){return t.due&&t.due<=td&&!isDone(t)&&!covers(t,td)&&!(t.day&&lastDay(t)<td)})};
function relDay(s){var td=todayISO();return s===td?'hoje':(s===addDays(td,1)?'amanhã':shortDate(s))}
function shortDate(s){var d=parseISO(s);return DABR[d.getDay()]+', '+d.getDate()+' '+MONS[d.getMonth()]}
function rangeLabel(wk){var a=parseISO(wk),b=parseISO(addDays(wk,6));
  return a.getMonth()===b.getMonth()?a.getDate()+'–'+b.getDate()+' '+MONS[b.getMonth()]:a.getDate()+' '+MONS[a.getMonth()]+' – '+b.getDate()+' '+MONS[b.getMonth()]}
function streak(){
  var days={};S.tasks.forEach(function(t){if(isDone(t)&&t.doneAt)days[iso(new Date(t.doneAt))]=1});
  var d=todayISO(),n=0;if(!days[d])d=addDays(d,-1);
  while(days[d]){n++;d=addDays(d,-1)}return n;
}
function nextTask(){
  var td=todayISO();
  var open=S.tasks.filter(function(t){return !isDone(t)&&covers(t,td)});
  var doing=open.filter(function(t){return t.status==='doing'});
  // o Sapo escolhido ao fechar o dia anterior vem antes das outras prioridades
  var sp=sapoOf(td),first=sp&&sp.status!=='doing'?[sp]:[],nsp=function(t){return !sp||t.id!==sp.id};
  var mits=open.filter(function(t){return t.mit&&t.status!=='doing'&&nsp(t)}).sort(byPrio);
  var rest=open.filter(function(t){return !t.mit&&t.status!=='doing'&&nsp(t)}).sort(byPrio);
  return doing.concat(first,mits,rest)[0]||null;
}
function seed(){
  var td=todayISO(),tm=addDays(td,1),d2=addDays(td,2),y=addDays(td,-1);
  var mk=function(title,ctx,est,day,o){return Object.assign({id:uid(),title:title,ctx:ctx,est:est,day:day,status:'todo',fw:null,urg:false,imp:true,dod:[],mit:false,slips:0,focus:0,pomos:0,created:Date.now(),ex:true},o||{})};
  S.tasks=[
    mk('Revisar as peças da campanha','trabalho',60,td,{urg:true,mit:true,dod:[{t:'Ajustes marcados no arquivo',d:false},{t:'Enviado para aprovação',d:false}]}),
    mk('Fechar o escopo do projeto de identidade','freelas',45,td,{mit:true}),
    mk('Organizar o portfólio','pessoal',60,td,{slips:2}),
    mk('Responder pendências do time','trabalho',15,td,{urg:true,imp:false}),
    mk('Pagar a fatura do cartão','pessoal',2,td,{urg:true}),
    mk('Montar o moodboard do cliente','freelas',90,tm),
    mk('Alinhar as entregas da semana com o sócio','3coletivo',30,tm),
    mk('Treino','pessoal',45,d2),
    mk('Enviar a nota fiscal do mês','freelas',5,y,{urg:true,slips:1}),
    mk('Pesquisar referências para o site','freelas',30,null),
    mk('Atualizar a tabela de preços dos serviços','3coletivo',45,null)
  ];
  S.seeded=true;persist();
}

