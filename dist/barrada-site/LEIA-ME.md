# Site Barrada Advogado — instalação

Conteúdo da pasta:

| Arquivo | Função |
|---|---|
| `index.html` | Site público, agenda, Área do cliente e Área do advogado (`#cliente`, `#admin`), com o CSS embutido |
| `app.js` | Lógica da aplicação |
| `config.js` | Endereço e chave pública do banco de dados |
| `logo.png` | Logo com fundo transparente |
| `fonts/` | Fontes do site e respectivas licenças (SIL OFL 1.1) |
| `foto.jpg` | **[INSERIR]** Sua foto profissional (retrato 4:5). Informe o nome do arquivo em `config.js` > `foto` |
| `supabase/schema.sql` | Criação do banco, regras de acesso e funções de reserva |

Sem `config.js` preenchido, o site roda em **modo demonstração** (dados só no navegador).

---

## 1. Criar o banco de dados (Supabase)

1. Crie uma conta em https://supabase.com e um projeto novo. Região sugerida: São Paulo.
2. Menu **SQL Editor > New query**: cole todo o conteúdo de `supabase/schema.sql` e clique em **Run**.
3. Menu **Project Settings > API**: copie **Project URL** e a chave **anon public** para o `config.js`.
   - A chave `anon` pode ficar no site. A proteção está nas regras de acesso (RLS) criadas pelo `schema.sql`.
   - **Nunca** coloque a chave `service_role` no site.

## 2. Configurar o login

Menu **Authentication**:

1. **URL Configuration**
   - Site URL: `https://SEU-DOMINIO`
   - Redirect URLs: `https://SEU-DOMINIO/**`
2. **Providers > Email**: mantenha o provedor ligado. O acesso de clientes e do advogado é por código enviado ao e-mail, sem senha.
3. **SMTP Settings**: configure um e-mail próprio para envio. **Sem isso o login não funciona na prática**: o envio padrão do Supabase tem limite de poucos e-mails por hora. Depois, em **Rate Limits**, confira o limite de e-mails, que começa baixo. [VERIFICAR valores vigentes no painel]
   - Provisório com Gmail: servidor `smtp.gmail.com`, porta `587`, usuário e remetente iguais ao seu Gmail e uma senha de app do Google. A senha de app exige verificação em duas etapas e dá acesso à caixa de e-mail.
   - Definitivo: serviço de e-mail transacional com remetente do seu domínio. Ao trocar, revogue a senha de app.
4. **Email Templates**, depois do SMTP (em projetos Free novos, os modelos só podem ser editados com SMTP próprio): nos modelos **Magic Link** e **Confirm signup**, use o assunto "Seu código de acesso" e cole o conteúdo de `supabase/email-templates/codigo-de-acesso.html`. Sem isso, o cliente recebe um link em vez do código.
5. **Email OTP Expiration**: use um prazo curto, como 10 minutos. [VERIFICAR nome e local da opção no painel]

## 3. Publicar o site

Envie a pasta inteira para uma hospedagem com HTTPS. Exemplos: Netlify (arrastar a pasta), Vercel, Cloudflare Pages ou a hospedagem do seu domínio. Não há servidor para manter: o site é estático e o banco fica no Supabase.

## 4. Tornar sua conta administradora

1. No site publicado, acesse **Área do cliente > Criar conta** com o seu e-mail e digite o código recebido.
2. No Supabase, **SQL Editor**, execute (troque o e-mail se for outro):

```sql
insert into public.admins (user_id)
select id from auth.users where email = 'wcbarrada.adv@gmail.com';
```

3. Acesse `https://SEU-DOMINIO/#admin` (link "Área do advogado" no rodapé).

## 5. Primeira configuração na Área do advogado

1. **Modalidades e valores**: informe o valor de cada modalidade (presencial e online). Enquanto vazio, o site mostra `[INSERIR VALOR]`.
2. **Configurações**: chave PIX, nome e cidade do recebedor, link de pagamento com cartão, WhatsApp, política de cancelamento, duração da consulta e regras da agenda.
3. **Agenda e horários**: grade semanal de cada modalidade, dias bloqueados e horários avulsos.

---

## 6. Depois de publicar

1. **Google Meu Negócio:** troque o site do perfil pelo novo domínio. O link atual do perfil não gera cliques.
2. **Instagram @wbarrada.adv:** coloque o novo domínio no link da bio (ou mantenha o WhatsApp e acrescente o site).
3. **Política de Privacidade:** preencha a data em `config.js` > `privacidadeAtualizada` e defina o prazo de retenção marcado com [VERIFICAR] no texto.

## Como funciona o agendamento

| Etapa | O que acontece |
|---|---|
| Cliente escolhe horário e cria conta | O banco valida o horário (grade, bloqueios, antecedência, sobreposição) e cria a reserva com status **Aguardando pagamento** |
| Cliente paga por PIX ou cartão | Envia o comprovante pela Área do cliente (arquivo privado, só ele e o advogado veem) |
| Advogado confere o extrato | Em **Agendamentos**, clica em **Confirmar pagamento** → status **Confirmado** |
| Consulta online | O advogado cola o link da videochamada; o cliente vê o botão "Entrar na videochamada" |
| Após a consulta | **Marcar como realizada** |

Regras automáticas:

- Reserva sem pagamento expira no prazo definido em Configurações e o horário volta para a agenda.
- O cliente cancela sozinho enquanto a reserva não foi paga, ou até X horas antes (Configurações). Depois disso, só o escritório cancela.
- Dois atendimentos nunca se sobrepõem, mesmo em modalidades diferentes.
- Cada cliente pode ter no máximo 2 consultas ativas (aguardando pagamento ou confirmadas).
- Comprovantes: até 5 MB, somente JPEG, PNG ou PDF.
- Links de videochamada e de pagamento com cartão só são aceitos com `https://`.
- As observações internas do advogado ficam em uma tabela própria, que o cliente não consegue ler.
- O arquivo `_headers` aplica CSP e cabeçalhos de segurança no Cloudflare Pages. No GitHub Pages, que não aceita cabeçalhos próprios, vale só a CSP do `<meta>` (sem `frame-ancestors`).

## Limitações conhecidas

- **Confirmação de pagamento manual.** O PIX gerado é estático, então a baixa depende da conferência do extrato. Para baixa automática, é preciso integrar um gateway (Mercado Pago, Asaas etc.) com webhook, o que exige uma função de servidor no Supabase (Edge Function).
- **Plano gratuito do Supabase.** Projetos gratuitos podem ser pausados após período sem uso. [VERIFICAR regra vigente] Para uso profissional contínuo, avalie o plano pago.
- **LGPD.** O banco guarda nome, CPF, telefone, e-mail, resumo do caso e comprovantes. Publique uma política de privacidade e defina prazo de retenção dos comprovantes.
