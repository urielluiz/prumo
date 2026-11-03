# Migrações do Supabase (projeto cpdeptlintjvdqcfrafg)

Cópia versionada do que foi aplicado no banco, na ordem. Valores secretos (chaves VAPID,
segredo do cron) e o e-mail do dono aparecem como `<redigido>` / `<owner_email>`: eles ficam
só na tabela `prumo_private`, nunca no repositório.

Chaves em `prumo_private` (sem policy, só o banco e a Edge Function leem):
- `vapid_public`, `vapid_private`, `cron_secret`: push.
- `owner_email`: o dono sempre consegue se cadastrar.
- `signup_open`: `'true'` abre o cadastro; qualquer outro valor fecha. Chave de emergência.
- `signup_max`: teto de contas.
