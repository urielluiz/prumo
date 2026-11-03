# Prumo

PWA de organização semanal (iPhone + Mac/Chrome), com frameworks ágeis por tarefa. Multiusuário (cadastro por e-mail, controlado por chave no banco). Idioma da interface: português do Brasil. Segurança é requisito de primeira classe: ver `SECURITY.md` antes de mexer em login, sync, push ou banco.

## Estrutura
- `src/app/`: fonte do app (HTML, CSS e JS vanilla), dividida em módulos. Edite aqui.
  - `shell.html`: esqueleto (marcação, `<style>` e o IIFE `'use strict'`) com linhas `/* @include caminho */`.
  - `css/`: `base.css`, `retro.css`, `motion.css`.
  - `js/`: `util`, `estado`, `sync`, `dominio`, `recorrencia`, `tarefas`, `push`, `resumo`, `retro`, `eventos`, `boot`; `telas/` (componentes, views, painel, render, sheets, vazios); `timer/` (alertas, sessao).
  - `auth/`: tela de entrada (`gate.html/.css/.js`): login, cadastro, código por e-mail, recuperação, nova senha, regras de senha e checagem de vazamento (`window.prumoPw`). Roda fora do IIFE do app; fala com ele por `window.prumoSB` e `window.prumoLogout`.
  - Todos os JS rodam no mesmo escopo (o IIFE do shell), na ordem dos includes. A ordem importa para `var` inicializado no topo; funções são içadas.
- `src/build.py`: junta shell + módulos num único HTML e gera `src/pwa/` (index.html, sw.js, manifest, ícones). Calcula a CSP com hash de cada script inline: script inline novo entra sozinho; script externo novo ou domínio novo de rede precisa ser liberado na CSP. Precisa de Pillow.
- `src/deploy.sh`: build + copia para a raiz, que é o que o GitHub Pages publica. Raiz = saída gerada, não edite à mão.
- `src/sb.json`: URL e chave publicável do Supabase e chave VAPID pública.
- `src/e2e/*.js`: testes com puppeteer-core + Chrome headless e Supabase falso. Rodar: `cd src && node e2e/rec.js` (npm i puppeteer-core antes). Rodar todos antes de publicar. As páginas são servidas por http via `e2e/lib/serve.js` (por file:// o Chrome headless às vezes perde o localStorage num reload).
- `supabase/migrations/`: cópia versionada das migrações (segredos e e-mail redigidos). Toda mudança no banco: aplicar e salvar o arquivo aqui.
- `supabase/functions/prumo-push/`: fonte da Edge Function.
- `supabase/templates/`: modelos de e-mail (código + link `#token_hash`).
- `ROADMAP.md`: próximas fases. `SECURITY.md`: proteções e ajustes do painel.

## Backend (Supabase, projeto cpdeptlintjvdqcfrafg)
- Tabelas: `prumo_items` (kinds task/cap/ctx/retro/blk/log/rec, última escrita vence por `updated_at`), `prumo_push_subs`, `prumo_timers`, `prumo_reminders` (PK user_id, day, kind), `prumo_private` (chaves VAPID e segredo do cron, sem policy).
- pg_cron `prumo-push` a cada 10 s chama a Edge Function `prumo-push` (web-push) quando há timer ou lembrete vencido.
- Trigger `prumo_signup_gate` em auth.users: cadastro só se `prumo_private.signup_open = 'true'` e abaixo de `signup_max` contas (o `owner_email` sempre entra).
- Trigger `prumo_guard`: limites por conta (20 mil itens, 10 aparelhos com push, 40 lembretes) e por tempo. Endpoint de push só de serviços conhecidos (SSRF).
- `anon` não tem acesso a nenhuma tabela.
- Chave VAPID privada, segredo do cron e e-mail do dono ficam só em `prumo_private`. Nunca commitar (o repositório é público).

## Convenções
- Sync offline-first com carimbo por item (`S.u`, `S.dirty`, `S.del`).
- Pautas: tarefa com filhas (`parent`). Recorrência: `S.rec`, ocorrências com id `r_<rid>_<data>`.
- Mudou o service worker? Aumente `V` em build.py.
- Dados locais têm dono (`S.owner`). Sair ou trocar de conta chama `wipeLocal()` (apaga tudo `prumo.*`) e recarrega. Nada de guardar dado de usuário fora de chaves `prumo.*`.
- Mensagens de login/cadastro/recuperação não revelam se um e-mail tem conta.
- Texto vindo do usuário sempre por `esc()` ou `textContent`, nunca direto em `innerHTML`.
- Respeitar prefers-reduced-motion. Sem travessão nos textos da interface.
