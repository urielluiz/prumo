/* ---------- copiar ---------- */
function copyText(txt,okMsg){
  var fb=function(){try{var a=document.createElement('textarea');a.value=txt;a.style.cssText='position:fixed;opacity:0;top:0';document.body.appendChild(a);a.select();var ok=document.execCommand('copy');document.body.removeChild(a);toast(ok?okMsg:'Não consegui copiar. Selecione o texto manualmente.')}catch(e){toast('Não consegui copiar.')}};
  try{navigator.clipboard.writeText(txt).then(function(){toast(okMsg)},fb)}catch(e){fb()}
}
function summaryText(){return summaryTextFor(curWk())}
function summaryTextFor(wk){
  var wt=weekTasks(wk),dn=wt.filter(isDone),op=wt.filter(function(t){return !isDone(t)});
  var L=['Semana de '+rangeLabel(wk),'Concluídas: '+dn.length+' de '+wt.length];
  CTX.forEach(function(c){var l=dn.filter(function(t){return t.ctx===c.id});if(l.length){L.push('',cname(c.id)+' ('+l.length+')');l.forEach(function(t){L.push('- '+t.title)})}});
  if(op.length){L.push('','Ficou aberto ('+op.length+')');op.forEach(function(t){L.push('- '+t.title)})}
  var r=S.retro[wk];
  if(r&&(r.worked||r.stuck||r.tweak)){L.push('','Retrospectiva');if(r.worked)L.push('Funcionou: '+r.worked);if(r.stuck)L.push('Travou: '+r.stuck);if(r.tweak)L.push('Muda: '+r.tweak)}
  return L.join('\n');
}

