# Prumo — roadmap

## Já entregue
Login (Supabase), sincronização por item, tarefas com frameworks ágeis, pautas com entregas, plano por vários dias, tarefas recorrentes, push do timer, resumo diário e retrô semanal (stories) por push, painel semanal/mensal, guia de métodos, alterar senha, código dividido em módulos (`src/app/`) com build gerando um único arquivo, cadastro de usuários com confirmação por código, recuperação de senha, sair de todos os aparelhos, dados locais isolados por conta, CSP, limites por conta no banco, tela de Perfil (nome, foto, conta, preferências), exportar meus dados, excluir minha conta, nova folha de tarefa (escrever do seu jeito, calendário com vários dias, etapas, aviso que leva até a tarefa), Hoje enxuta e Semana em 7 dias corridos com carga por dia, menu ⋯ e deslizar para mudar de dia, prazo final, arrastar entre dias no computador, testes automáticos no GitHub, acessibilidade (texto do sistema, foco, rótulos, alvos de 44 px, axe-core no CI), obra fase 1 (anéis do dia, fechar o dia com Sapo de amanhã e lembrete, sequência com folga e pausa, andares por semana), planejar a semana com sugestão de dias, busca de tarefas, atalhos no ícone, estimativa que aprende com o tempo real.

## Próxima fase (anotado a pedido)
- Abrir o cadastro: concluir os ajustes do painel em `SECURITY.md` (SMTP próprio, confirmação de e-mail, modelos, URLs) e virar `signup_open` para `'true'`
- Login com Google
- Verificação em duas etapas (TOTP) e reautenticação para ações sensíveis
- CAPTCHA (Cloudflare Turnstile) no cadastro e na recuperação
- Privacidade: preencher responsável e contato em `src/legal.json` (política e termos já publicados)
- Trocar o e-mail da conta pelo Perfil (com confirmação nos dois endereços)
- Limites de uso por conta

## Próximas melhorias de uso
- Horário opcional na tarefa e modelos de tarefa (checklists que se repetem)

## Obra (gamificação)
- Fase 2, depois de 1 ou 2 semanas de uso: marcos de maestria (surpresa, poucos), nível por método, desafio da semana escolhido no "Fechar a semana", obra no fim da retrô em stories
- Fase 3, junto com a abertura: parceiro de prumo (vê só anéis e obra, nunca tarefas), com tabela de convites e RLS própria
- Fora de escopo de propósito: ranking, pontos negativos, moeda e loja, notificação de culpa

## Infra
- Comprar domínio próprio e migrar da GitHub Pages para a Hostinger (ajustar URL de origem do push/VAPID e do Supabase Auth). Lá, mandar a CSP e os demais cabeçalhos por HTTP (HSTS, frame-ancestors, X-Content-Type-Options, Permissions-Policy)

## Depois
- Acessibilidade: retrô em stories com texto escalável; rodada de uso real com VoiceOver
- Feedback de uso e ajustes de usabilidade
