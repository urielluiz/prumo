# Prumo — roadmap

## Já entregue
Login (Supabase), sincronização por item, tarefas com frameworks ágeis, pautas com entregas, plano por vários dias, tarefas recorrentes, push do timer, resumo diário e retrô semanal (stories) por push, painel semanal/mensal, guia de métodos, alterar senha.

## Próxima fase (anotado a pedido)
- Cadastro de novos usuários (hoje o cadastro é bloqueado por trigger: só o e-mail do dono entra)
- E-mail transacional (confirmação, recuperação de senha) e proteção contra senhas vazadas (ajuste no painel do Supabase)
- Privacidade: política, termos, exportar e excluir a própria conta
- Limites de uso por conta

## Infra
- Comprar domínio próprio e migrar da GitHub Pages para a Hostinger (ajustar URL de origem do push/VAPID e do Supabase Auth)

## Depois
- Acessibilidade (leitor de tela, contraste, texto)
- Feedback de uso e ajustes de usabilidade
- Refatorar o arquivo único em módulos com build (esbuild) mantendo a saída em um único arquivo
