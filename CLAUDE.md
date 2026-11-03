# Prumo

PWA pessoal de organização semanal (iPhone + Mac/Chrome), com frameworks ágeis por tarefa. Usuário único (Uriel). Idioma da interface: português do Brasil.

## Estrutura
- `src/app/`: fonte do app (HTML, CSS e JS vanilla), dividida em módulos. Edite aqui.
  - `shell.html`: esqueleto (marcação, `<style>` e o IIFE `'use strict'`) com linhas `/* @include caminho */`.
  - `css/`: `base.css`, `retro.css`, `motion.css`.
  - `js/`: `util`, `estado`, `sync`, `dominio`, `recorrencia`, `tarefas`, `push`, `resumo`, `retro`, `eventos`, `boot`; `telas/` (componentes, views, painel, render, sheets, vazios); `timer/` (alertas, sessao).
  - Todos os JS rodam no mesmo escopo (o IIFE do shell), na ordem dos includes. A ordem importa para `var` inicializado no topo; funções são içadas.
- `src/build.py`: junta shell + módulos num único HTML e gera `src/pwa/` (index.html, sw.js, manifest, ícones). Precisa de Pillow.
- `src/deploy.sh`: build + copia para a raiz, que é o que o GitHub Pages publica. Raiz = saída gerada, não edite à mão.
- `src/sb.json`: URL e chave publicável do Supabase e chave VAPID pública.
- `src/e2e/*.js`: testes com puppeteer-core + Chrome headless e Supabase falso. Rodar: `cd src && node e2e/rec.js` (npm i puppeteer-core antes). Rodar todos antes de publicar. As páginas são servidas por http via `e2e/lib/serve.js` (por file:// o Chrome headless às vezes perde o localStorage num reload).
- `ROADMAP.md`: próximas fases.

## Backend (Supabase, projeto cpdeptlintjvdqcfrafg)
- Tabelas: `prumo_items` (kinds task/cap/ctx/retro/blk/log/rec, última escrita vence por `updated_at`), `prumo_push_subs`, `prumo_timers`, `prumo_reminders` (PK user_id, day, kind), `prumo_private` (chaves VAPID e segredo do cron, sem policy).
- pg_cron `prumo-push` a cada 10 s chama a Edge Function `prumo-push` (web-push) quando há timer ou lembrete vencido.
- Trigger em auth.users bloqueia cadastro de qualquer e-mail que não seja o do dono.
- Chave VAPID privada e segredo do cron ficam só no banco. Nunca commitar.

## Convenções
- Sync offline-first com carimbo por item (`S.u`, `S.dirty`, `S.del`).
- Pautas: tarefa com filhas (`parent`). Recorrência: `S.rec`, ocorrências com id `r_<rid>_<data>`.
- Mudou o service worker? Aumente `V` em build.py.
- Respeitar prefers-reduced-motion. Sem travessão nos textos da interface.
