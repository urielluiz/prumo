# Segurança do Prumo

O Prumo guarda a rotina das pessoas: tarefas, horários, o que travou na semana. Tratamos isso como dado sensível.

## Como reportar uma falha
Abra uma issue **sem detalhes técnicos** pedindo um contato privado, ou use o "Report a vulnerability" do GitHub (aba Security). Não publique a falha antes de ela ser corrigida.

## O que protege os dados hoje

**Banco (Supabase)**
- Row Level Security em todas as tabelas: cada conta só lê e escreve as próprias linhas. O papel `anon` não tem acesso a nenhuma tabela.
- Cadastro controlado por uma chave no banco (`prumo_private.signup_open`), com teto de contas (`signup_max`). Fechar o cadastro numa emergência não depende de publicar código.
- Limites por conta, verificados no banco: 20 mil itens, 64 KB por item, 10 aparelhos com aviso, 40 lembretes pendentes, datas dentro de uma janela razoável.
- Avisos push só podem apontar para os serviços oficiais (Apple, Google, Mozilla, Microsoft). Isso vale no banco e de novo na Edge Function, para que ninguém use o servidor para chamar endereços internos (SSRF).
- Chaves VAPID, segredo do cron e e-mail do dono ficam numa tabela sem acesso por API. Nada disso vai para o repositório, que é público. O segredo do cron é comparado em tempo constante.

**Conta e sessão**
- Cadastro com confirmação de e-mail por código de 6 dígitos (ou link de uso único). O código funciona dentro do app instalado no iPhone.
- Senha: no mínimo 12 caracteres e no máximo 72 bytes (limite do bcrypt, para não haver corte silencioso). Não pode conter o próprio e-mail. É checada contra vazamentos conhecidos pelo método de k-anonimato do Have I Been Pwned: só os 5 primeiros caracteres do hash SHA-1 saem do aparelho, e a resposta vem com preenchimento.
- Mensagens de login, cadastro e recuperação não revelam se um e-mail tem conta.
- Espera crescente no aparelho depois de 3 senhas erradas, além do limite do próprio Supabase.
- Verificação em duas etapas opcional (TOTP, app autenticador), ativada no Perfil depois de confirmar a senha. Com ela ativa, o banco só entrega e aceita dados de sessões que passaram pelo código (`aal2`): policies restritivas em todas as tabelas do app e na foto, pela função `prumo_sec.aal_ok()`, fora do schema exposto pela API. O app não sincroniza antes do código. Trocar a senha, excluir a conta (conferido também na Edge Function) e desativar a verificação pedem o código. Na recuperação de senha, o código do app vem antes da nova senha.
- Trocar a senha exige a senha atual. Depois de trocar ou recuperar a senha, as outras sessões são encerradas.
- "Sair de todos os aparelhos" encerra todas as sessões da conta.

**Perfil e privacidade**
- Foto em bucket privado: cada conta só lê e grava o próprio arquivo, com nome fixo, até 256 KB, só JPEG/WebP. O app reduz para 256 px e regrava a imagem antes de enviar, então os metadados do arquivo original (como a localização do GPS) não saem do aparelho.
- Nome limitado a 60 caracteres, sem caracteres de controle nem de inversão de direção do texto; sempre exibido como texto.
- Exportar meus dados: um arquivo JSON com tudo o que a conta guarda (itens, lembretes, perfil e foto). Dos aparelhos com aviso, só o serviço e a data, nunca o endereço de push.
- Minimização: um job diário (`prumo-cleanup`) apaga lembretes enviados há mais de 2 dias e cronômetros enviados há mais de 1 dia.
- Política de privacidade e termos de uso em páginas estáticas (`privacidade.html`, `termos.html`), sem script e com CSP própria; links no login, no cadastro e no Perfil.
- Excluir minha conta: pede a senha e uma confirmação. A Edge Function confere no servidor que houve login com senha nos últimos 5 minutos (pela claim `amr`, que não muda quando o token é renovado), aceita chamadas só da origem do app, apaga a foto e a conta; as tabelas caem junto por cascade.

**Aparelho**
- Os dados locais têm dono. Ao sair, o app envia o que falta (ou pede confirmação se estiver sem rede), desliga o aviso push deste aparelho e apaga tudo o que guardou. Se aparecerem dados de outra conta, eles são apagados antes de qualquer sincronização.
- Content Security Policy: só rodam os scripts do próprio app (inline liberado por hash, calculado no build) e a rede só alcança o próprio site, o Supabase e a checagem de senha vazada. As fontes são servidas pelo próprio site (nada de Google Fonts, que receberia o IP de quem abre o app). `object-src`, `base-uri`, `form-action` e `frame-src` bloqueados.
- O app se recusa a carregar dentro de um iframe de outro site (clickjacking).
- `Referrer-Policy: no-referrer`.
- Todo texto vindo do usuário entra na tela escapado ou por `textContent`.

**Testes**
`src/e2e/auth.js` cobre cadastro, código, recuperação, link do e-mail, isolamento entre contas, sair e voltar sem perder dados, saída com dados pendentes, CSP bloqueando script injetado e o bloqueio de iframe. `src/e2e/mfa.js` cobre ativar, login com código, bloqueio dos dados antes do código, recuperação e desativar. `src/e2e/profile.js` cobre nome, foto (redimensionada e sem EXIF/GPS), exportação e exclusão de conta.

## Ajustes no painel do Supabase (não dá para fazer por código)

Antes de abrir o cadastro (`update prumo_private set value = 'true' where key = 'signup_open'`):

- [ ] **Authentication > Sign In / Providers > Email**: "Confirm email" ligado; "Secure email change" ligado; "Secure password change" ligado; tamanho mínimo da senha 12; exigir letras e números.
- [ ] **Leaked password protection** ligado (plano Pro). O app já checa no aparelho, mas a checagem no servidor não pode ser contornada.
- [ ] **SMTP próprio** (Resend, Postmark, Amazon SES...) com SPF, DKIM e DMARC no domínio. O SMTP padrão do Supabase só entrega para membros da organização e tem limite muito baixo: sem isso, quem se cadastrar não recebe o código.
- [ ] **Emails > Templates**: colar `supabase/templates/confirmar-cadastro.html` em "Confirm signup" e `recuperar-senha.html` em "Reset password" (assuntos no comentário de cada arquivo).
- [ ] Ao trocar de domínio: atualizar `ORIGINS` em `supabase/functions/prumo-delete-account/index.ts` e o assunto VAPID em `prumo-push`.
- [ ] **URL Configuration**: Site URL `https://urielluiz.github.io/prumo` (sem barra no fim) e Redirect URLs só com `https://urielluiz.github.io/prumo/**`.
- [ ] **Rate limits**: revisar envio de e-mail e verificação de código.
- [ ] **Sessions**: considerar "Time-box user sessions" e "Inactivity timeout".
- [ ] **Attack Protection**: CAPTCHA (Cloudflare Turnstile) quando o cadastro abrir. O app ainda precisa ser ajustado para isso.

## Limitações conhecidas
- O GitHub Pages não permite cabeçalhos HTTP: a CSP vai por `<meta>` (sem `frame-ancestors`, por isso o bloqueio de iframe por script) e não há HSTS próprio. Resolver na migração para a Hostinger.
- As funções do `pg_net` ficam liberadas para `PUBLIC` pelo `supabase_admin`, e o nosso papel não consegue revogar isso. O schema `net` não é exposto pela API. Regra: nunca criar função em `public` que chame `net.*` com parâmetro vindo do cliente.
- O token de sessão fica no `localStorage` (padrão do supabase-js). A CSP é a principal defesa contra roubo por XSS.
- O histórico de migrações dentro do Supabase guarda os valores iniciais das chaves VAPID e do segredo do cron. Ele só é visível com acesso administrativo ao projeto. Trocar esses segredos se houver suspeita de vazamento.
