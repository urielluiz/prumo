function emptyHTML(kind,btn){
  var T={
    hoje:['Dia livre por enquanto','Escolha o que realmente importa hoje. Três prioridades bastam.','Nova tarefa','new'],
    dia:['Nada neste dia','Puxe algo do backlog ou crie uma tarefa para este dia.','Adicionar tarefa','new'],
    back:['Backlog vazio','Despeje ideias aqui sem data. Quando houver espaço, é só puxar para o dia.','Adicionar ao backlog','newb'],
    rev:['Nada concluído nesta semana','Uma tarefa de 5 minutos já muda isso. Volte aqui no fim da semana.',null,null],
    painel:['O painel começa com os primeiros dados','Conclua tarefas e use o cronômetro. Aqui você vê estimado contra real e para onde foi seu tempo.',null,null],
    foco:['Nada para focar agora','Sem tarefas abertas hoje. Crie uma ou comece uma sessão livre de 5 minutos.','Nova tarefa','new']
  }[kind];
  var svg='<svg class="em-ic" width="64" height="64" viewBox="0 0 64 64" fill="none" aria-hidden="true"><circle cx="32" cy="8" r="3" fill="currentColor"/><path d="M32 11v26" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M32 37l9 14H23z" fill="var(--accent)" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round"/><path d="M14 58h36" stroke="var(--line)" stroke-width="2.2" stroke-linecap="round"/></svg>';
  return '<div class="empty">'+svg+'<h3>'+T[0]+'</h3><p>'+T[1]+'</p>'+(T[2]?'<button class="btn btn-p" data-act="'+(T[3]==='newb'?'new" data-day="none':'new')+'">'+T[2]+'</button>':'')+'</div>';
}

