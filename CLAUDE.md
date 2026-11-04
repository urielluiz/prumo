# Prumo

PWA de organização semanal (iPhone + Mac/Chrome), com frameworks ágeis por tarefa. Multiusuário (cadastro por e-mail, controlado por chave no banco). Idioma da interface: português do Brasil. Segurança é requisito de primeira classe: ver `SECURITY.md` antes de mexer em login, sync, push ou banco.

## Estrutura
- `src/app/`: fonte do app (HTML, CSS e JS vanilla), dividida em módulos. Edite aqui.
  - `shell.html`: esqueleto (marcação, `<style>` e o IIFE `'use strict'`) com linhas `/* @include caminho */`.
  - `css/`: `base.css`, `retro.css`, `motion.css`.
  - `js/`: `util`, `estado`, `sync`, `dominio`, `recorrencia`, `tarefas`, `push`, `resumo`, `perfil` (nome, foto, exportar, excluir conta), `retro`, `eventos`, `gestos` (deslizar o card), `boot`; `telas/` (componentes, views, painel, perfil, tarefa, render, sheets, vazios); `timer/` (alertas, sessao).
  - Folha de tarefa (`telas/tarefa.js`): criar e editar. Pílulas Quando/Tempo/Contexto/Repetir abrem um painel por vez; calendário próprio (sem `input type=date`: no iPhone ele fecha quando a folha redesenha); "Mais opções" com prioridade, etapas, método e tempo real. Ao criar, `recognize()` lê data, período, tempo, `#contexto`, repetição e `!` do título; `absorb()` transforma o reconhecido em escolha quando a pessoa toca num controle. Editar não reinterpreta o título.
  - Hoje: "Agora" (`heroHTML(nextTask())`, a tarefa não se repete na lista), lista única "Depois" (em andamento, estrelas, resto), aviso de atrasadas com folha `late`, check-in numa linha (folha `note`), concluídas recolhidas (`doneOpen`), resumo de amanhã.
  - Semana: 7 dias corridos a partir de hoje (`semOff`, em passos de 7; `wkOff` é só da Revisão). Faixa fixa com carga por dia e período contínuo, uma seção por dia, "Sem data" no fim.
  - Foco: sem sessão, "Agora" com escolha do método (`focusFw`, sugestão marcada) e "Ou escolha outra"; rodando, Pausar em destaque, "+5 min"/"Concluir tarefa" secundários, Parar como link, etapas visíveis; fim do tempo, o `endCard` ocupa o lugar do cronômetro.
  - Revisão: abas Semana e Tendências. Semana: resumo (concluídas só até hoje, foco, planejado por contexto, retrô em stories), "Fechar a semana" (retrospectiva), "Ficou aberto" (só dias que já passaram), concluídas, travas. Tendências compara com o período anterior até o mesmo ponto (`periodStats(p, corte)`) e começa na primeira semana com dados.
- Nos textos, o grupo sem dia se chama "Sem data" (não "backlog").
  - Card (`rowHTML`): concluir, título (estrela se prioridade), uma linha de detalhe, play e ⋯. Estrela, editar, excluir e mudar de dia ficam no menu ⋯ (folha `menu`, `moveTask()` com desfazer). Deslizar para a esquerda é atalho (Amanhã, Outro dia); todo gesto tem caminho por botão.
  - Perfil: aberto pelo avatar da tela Hoje (`tab='perfil'`, fora da barra de abas). Concentra conta, preferências, dados, privacidade e ajuda; a Revisão fica só com a semana.
  - `auth/`: tela de entrada (`gate.html/.css/.js`): login, cadastro, código por e-mail, recuperação, nova senha, regras de senha e checagem de vazamento (`window.prumoPw`). Roda fora do IIFE do app; fala com ele por `window.prumoSB` e `window.prumoLogout`.
  - Todos os JS rodam no mesmo escopo (o IIFE do shell), na ordem dos includes. A ordem importa para `var` inicializado no topo; funções são içadas.
- `src/build.py`: junta shell + módulos num único HTML e gera `src/pwa/` (index.html, sw.js, manifest, ícones). Calcula a CSP com hash de cada script inline: script inline novo entra sozinho; script externo novo ou domínio novo de rede precisa ser liberado na CSP. Precisa de Pillow.
- `src/deploy.sh`: build + copia para a raiz, que é o que o GitHub Pages publica. Raiz = saída gerada, não edite à mão.
- `src/sb.json`: URL e chave publicável do Supabase e chave VAPID pública.
- `src/e2e/*.js`: testes com puppeteer-core + Chrome headless e Supabase falso (`e2e/lib/fakesb.js`: contas, sessão, itens, Storage e Functions no localStorage). Rodar um: `cd src && node e2e/rec.js`; todos: `cd src && sh e2e/run-all.sh` (npm i puppeteer-core e `python3 build.py` antes). O GitHub Actions (`.github/workflows/testes.yml`) roda todos a cada push e confere se a raiz publicada está igual ao build: publicar sempre com `sh src/deploy.sh`. As páginas são servidas por http via `e2e/lib/serve.js` (por file:// o Chrome headless às vezes perde o localStorage num reload).
- `supabase/migrations/`: cópia versionada das migrações (segredos e e-mail redigidos). Toda mudança no banco: aplicar e salvar o arquivo aqui.
- `supabase/functions/`: fonte das Edge Functions (`prumo-push`, `prumo-delete-account`).
- `supabase/templates/`: modelos de e-mail (código + link `#token_hash`).
- `ROADMAP.md`: próximas fases. `SECURITY.md`: proteções e ajustes do painel.

## Backend (Supabase, projeto cpdeptlintjvdqcfrafg)
- Tabelas: `prumo_items` (kinds task/cap/ctx/retro/blk/log/rec/prof, última escrita vence por `updated_at`), `prumo_push_subs`, `prumo_timers`, `prumo_reminders` (PK user_id, day, kind), `prumo_private` (chaves VAPID e segredo do cron, sem policy).
- pg_cron `prumo-push` a cada 10 s chama a Edge Function `prumo-push` (web-push) quando há timer ou lembrete vencido.
- Trigger `prumo_signup_gate` em auth.users: cadastro só se `prumo_private.signup_open = 'true'` e abaixo de `signup_max` contas (o `owner_email` sempre entra).
- Trigger `prumo_guard`: limites por conta (20 mil itens, 10 aparelhos com push, 40 lembretes) e por tempo. Endpoint de push só de serviços conhecidos (SSRF).
- `anon` não tem acesso a nenhuma tabela.
- Storage: bucket privado `avatars` (256 KB, jpeg/webp), cada conta só lê e grava `<id>/avatar.(jpg|webp)`. Foto reduzida a 256 px e regravada no aparelho (sem EXIF/GPS).
- Edge Function `prumo-delete-account`: valida o token no servidor, exige login com senha há menos de 5 min (claim `amr`), CORS só da origem do app; apaga a foto e o usuário (tabelas caem por cascade). Ao trocar de domínio, atualizar `ORIGINS` nela.
- Chave VAPID privada, segredo do cron e e-mail do dono ficam só em `prumo_private`. Nunca commitar (o repositório é público).

## Convenções
- Sync offline-first com carimbo por item (`S.u`, `S.dirty`, `S.del`).
- Período: tarefa com `day` (início) e `end` (último dia); `est` é por dia. Use `covers`, `spanOf`, `estIn`, `estAll`, `lastDay` (dominio.js) em vez de comparar `t.day`. Concluir chama `markDone()`: o período termina no dia da conclusão.
- Etapas: `t.dod` (lista `{t,d}`), até 30. Não existem mais pautas (`parent`): `convertPautas()` converte dados antigos no boot e após cada sync (plano vira período, entregas viram etapas).
- Depois de criar/salvar: `toast(whereText(t), 'Ver', showTask)`.
- Prazo final: `t.due` (opcional, separado do `day`). `dueTag()` no card; `dueNow()` põe na tela Hoje o que vence hoje ou venceu sem estar planejado para hoje. Texto: "até sexta", "prazo 12/11".
- Arrastar entre dias: só na Semana e só quando o ponteiro principal não é o dedo (`CANDRAG`); áreas `.dz[data-drop]` e dias da faixa; usa `moveTask()`.
- Recorrência: `S.rec`, ocorrências com id `r_<rid>_<data>`; tarefa que repete não tem período.
- Mudou o service worker? Aumente `V` em build.py.
- Dados locais têm dono (`S.owner`). Sair ou trocar de conta chama `wipeLocal()` (apaga tudo `prumo.*`) e recarrega. Nada de guardar dado de usuário fora de chaves `prumo.*`.
- Mensagens de login/cadastro/recuperação não revelam se um e-mail tem conta.
- Texto vindo do usuário sempre por `esc()` ou `textContent`, nunca direto em `innerHTML`.
- Respeitar prefers-reduced-motion. Sem travessão nos textos da interface.
