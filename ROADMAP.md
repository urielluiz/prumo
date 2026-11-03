# Prumo — roadmap

## Já entregue
Login (Supabase), sincronização por item, tarefas com frameworks ágeis, pautas com entregas, plano por vários dias, tarefas recorrentes, push do timer, resumo diário e retrô semanal (stories) por push, painel semanal/mensal, guia de métodos, alterar senha, código dividido em módulos (`src/app/`) com build gerando um único arquivo, cadastro de usuários com confirmação por código, recuperação de senha, sair de todos os aparelhos, dados locais isolados por conta, CSP, limites por conta no banco, tela de Perfil (nome, foto, conta, preferências), exportar meus dados, excluir minha conta.

## Próxima fase (anotado a pedido)
- Abrir o cadastro: concluir os ajustes do painel em `SECURITY.md` (SMTP próprio, confirmação de e-mail, modelos, URLs) e virar `signup_open` para `'true'`
- Login com Google
- Verificação em duas etapas (TOTP) e reautenticação para ações sensíveis
- CAPTCHA (Cloudflare Turnstile) no cadastro e na recuperação
- Privacidade: política de privacidade e termos de uso (exportar e excluir conta já entregues)
- Trocar o e-mail da conta pelo Perfil (com confirmação nos dois endereços)
- Limites de uso por conta

## Infra
- Comprar domínio próprio e migrar da GitHub Pages para a Hostinger (ajustar URL de origem do push/VAPID e do Supabase Auth). Lá, mandar a CSP e os demais cabeçalhos por HTTP (HSTS, frame-ancestors, X-Content-Type-Options, Permissions-Policy)

## Depois
- Acessibilidade (leitor de tela, contraste, texto)
- Feedback de uso e ajustes de usabilidade
