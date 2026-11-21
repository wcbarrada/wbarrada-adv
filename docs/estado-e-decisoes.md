# Estado atual, decisões, backlog e prazos de guarda

Movido do CLAUDE.md em 21/11/2026, sem alteração. Ler antes de mexer em agenda, banco, publicação ou na Fase 4.

## Estado atual
- Revisão comparativa com sete sites de escritórios em 06/11/2026: hero com o nome do advogado, Áreas sem hierarquia e em ordem alfabética, bloco "Como trabalho", seções claras (classe `.paper`), aviso contra golpes e mais assuntos no WhatsApp. Não adotar contadores de processos, prêmios, rankings ou "excelência" (Prov. 205/2021). **Versão aprovada pelo usuário em 06/11/2026.** Faltam dados do usuário para trajetória (formação) e horário de atendimento.
- **Agenda online reativada a pedido do usuário em 09/11/2026** (`agendaAtiva: true`); estava suspensa desde 06/11/2026. Horários, valores e regras são configurados pelo usuário em `#admin`, não no código. A Política de Privacidade informa servidores nos Estados Unidos (região us-west-2).
- **Processo com advogado constituído (decisão do usuário em 09/11/2026):** não atende nem orienta; só avalia se o colega deixar o caso. A FAQ reflete isso. Na agenda e no WhatsApp, o assunto "Processo em andamento" exige a situação (lista: Defensoria, Juizado sem advogado, sem advogado constituído, renúncia, revogação, falecimento ou impedimento, processo encerrado, administrativo sem advogado; "tenho advogado atuando" bloqueia) e o número (CNJ com dígito verificador; protocolo livre no administrativo). Situação e número vão no campo `assunto` da reserva.
- Histórico da suspensão: `build.py` oculta os elementos marcados com `data-agenda="on"` e mostra os marcados com `data-agenda="off"`; `#agenda` redireciona para `#whatsapp`. Para reativar: `agendaAtiva: true`, rodar o build e revisar o local nas modalidades. Os testes `e2e.py`, `axe_run.py` e `d2.py` exercitam a agenda: rodar contra um build com `agendaAtiva: true`.
- **Banco real conectado em 09/11/2026** (projeto `wbarrada-adv`, plano Free, região us-west-2, SMTP próprio ligado), com a agenda ainda oculta. PIX, valor e política só para usuários identificados: privilégios por coluna no banco, e `getPublicData` escolhe as colunas conforme a sessão. Rotina `aplicar_retencao` agendada no pg_cron; os comprovantes vencidos entram em `comprovantes_a_excluir` e o painel do advogado os apaga. Login real em `#admin` confirmado; `profiles` validado no banco (só nome, CPF e telefone são editáveis pelo cliente); Site URL e Redirect URL corrigidas. O código que lê `bloqueios` por colunas foi publicado em 10/11/2026: falta conferir no banco real com `supabase/conferir-banco-real.sql` e, se preciso, aplicar o bloco "validação do cadastro" do `schema.sql` (idempotente). Caminho do cliente testado no banco real em 09/11/2026 (reserva, valor e PIX após identificação, comprovante, confirmação no painel, limpeza pela fila), mas com a conta do advogado: falta repetir com uma conta comum. Antes de abrir ao público: decidir a região, criar a modalidade Cordeiro, trocar os endereços antigos.
- O domínio passa pela **Cloudflare** (`server: cloudflare`, cache de 4 h em JS; injeta `cloudflareinsights` e `email-decode` no HTML). O `build.py` versiona `config.js` e `app.js` por hash. Cabeçalhos de segurança em produção desde 09/11/2026 pela regra "Cabecalhos de seguranca" (Rules > Response Header Transform Rules): CSP igual à do `build.py` com `frame-ancestors 'none'`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` e HSTS de 1 ano com subdomínios. Ao mudar a CSP no `build.py`, mudar também nessa regra. RUM e Web Analytics estão desligados no domínio; a origem do `cloudflareinsights` injetado não foi identificada, e ele fica bloqueado pela CSP.
- Testes de banco na sessão na nuvem: o contêiner tem PostgreSQL 16; criar um cluster com `initdb` como usuário `postgres` (fora do scratchpad), rodar `mock-supabase.sql`, `schema.sql` e `rls.sql`. Se os papéis `anon` e `authenticated` já existirem no cluster, retirar a primeira linha do mock.
- Testes de banco no Windows sem psql nem Docker (sem uso enquanto não houver cópia local): `pip install pgserver tzdata`, copiar `tzdata/zoneinfo` para `pginstall/share/postgresql/timezone` e rodar `mock-supabase.sql`, `schema.sql` e `rls.sql` com o `psql` do pacote.
- Endereços de rua retirados das páginas e do JSON-LD em 06/11/2026: o atendimento presencial não será no endereço usado nas petições. Endereço definitivo pendente (provavelmente sede da OAB). A descrição das modalidades no banco real ainda traz os endereços antigos e só aparece com a agenda ativa.
- v3 publicada como prévia. Fases 0 a 2 apresentadas. **Fase 4 executada: reprovada** (ver `docs/fase4-verificacao.md`).
- **Fase 3 autorizada em 23/10/2026.** Itens Must 1–4 e 6–9 implementados. O item 5 (SMTP) é configuração no painel do Supabase. Pendente: nova rodada da Fase 4. Matriz de RLS conferida em 13/11/2026: 80 de 80 em Postgres 16 local (ver `docs/fase4-verificacao.md`).
- Hospedagem atual: GitHub Pages com o domínio `https://wbarrada.adv.br/` (DNS no registro.br, modo avançado) via `.github/workflows/pages.yml` (CSP por `<meta>`). `_headers` continua sendo gerado para o Cloudflare Pages.
- Itens Should de acessibilidade e SEO corrigidos em 05/11/2026, exceto `telephone` e `postalCode` no JSON-LD (dados pendentes). Indexação liberada pelo usuário em 06/11/2026: o build só adiciona `noindex` quando a agenda está ativa em modo demonstração (`supabaseUrl` vazio e `agendaAtiva: true`). Ao adotar domínio próprio, trocar `SITE_URL` em `build.py`.
- O pacote de hospedagem usa fontes próprias (`src/fonts.css`, `src/assets/fonts/`), sem Google Fonts e sem `preload`, que atrasou o FCP nos testes com rede lenta simulada. O CSS é embutido no `index.html` e os scripts usam `defer`, para reduzir o FCP. `dist/artifact.html` ainda carrega do Google.

## Decisões do usuário (Fase 2, tomadas em 05/11/2026)
| # | Tema | Decisão |
|---|---|---|
| D1 | Pagamento antecipado da consulta | Obrigatório só na agenda online; o WhatsApp fica como caminho sem pagamento prévio |
| D2 | Acesso à Área do cliente | Código enviado por e-mail, sem senha (exige SMTP próprio). Implementado para clientes e advogado; não testado no Supabase real |
| D3 | Confirmação de pagamento | Manual no MVP; gateway com webhook depois |
| D4 | Plano do Supabase | Free nos testes; Pro (US$ 25/mês em 05/11/2026) ao abrir para clientes |
| D5 | Domínio | `wbarrada.adv.br`, registrado em 05/11/2026 |

## Backlog da Fase 3 (originado da Fase 4)
**Must**
1. Grade de modalidades em 3 colunas e texto cortado no celular. Causa: `renderMods()` define `style.gridTemplateColumns` direto no elemento. Usar classe ou media query.
2. `tr.row` do painel inacessível por teclado: usar `<button>` na linha ou `tabindex="0"` com Enter e Espaço.
3. O cliente lê `obs_admin` pela API: mover para tabela própria ou revogar o privilégio da coluna.
4. Reservas sem limite por cliente: limitar a 2 ativas em `criar_agendamento`.
5. SMTP próprio no Supabase: o padrão envia apenas 2 e-mails por hora.
6. Criar `_headers` com CSP, `frame-ancestors 'none'`, `X-Content-Type-Options`, `Referrer-Policy` e `Permissions-Policy`.
7. Bucket `comprovantes` com `file_size_limit` de 5 MB e `allowed_mime_types` restritos a JPEG, PNG e PDF.
8. `link_reuniao` e `link_cartao`: aceitar somente `https:`, com validação no banco e na exibição.
9. Dados iniciais da modalidade online dizem "…confirmação do pagamento": remover a palavra "pagamento".

**Should**
- Acessibilidade:
  - mover o foco para o título ao trocar de etapa;
  - `role="alert"` nas mensagens `.msg`;
  - contraste dos cartões `.past`;
  - rótulo em `#nmT`;
  - link "Ir para o conteúdo" funcional em todas as telas.
- Desempenho:
  - LCP de 3,0 s e CLS de 0,176 no celular;
  - fontes no próprio site com `preload` e CSS crítico embutido;
  - tamanho fixo para `svg.arc`.
- SEO: `robots.txt`, `sitemap.xml`, `canonical`, `og:image` absoluto em 1200 × 630, JSON-LD com `url`, `telephone`, `image` e `postalCode`, página 404.
- LGPD:
  - registrar o consentimento com data e versão da política;
  - CPF opcional;
  - informar a região do Supabase e o uso do Google Fonts (ou eliminá-lo).
- Bibliotecas de CDN com SRI ou cópias locais; testes incluídos no repositório e CI.

**Could**
- Botões "×" com no mínimo 24 px.
- Borda dos campos `--line-2` em `#76694f`.
- `scroll-padding-top`.
- Título da aba por tela.
- Carregar QR Code e Supabase sob demanda.
- Logo em SVG.
- Trilha de auditoria.
- Captcha.

## Pendências de conteúdo
Foto definitiva (a atual, `src/assets/foto.jpg`, é provisória, recortada de um story com fundo trocado), link de cartão (InfinitePay). Valores, WhatsApp e chave PIX já estão no banco real.

## Prazos de guarda (aprovados pelo usuário em 06/11/2026)
Comprovantes e dados de consultas pagas: 5 anos após a consulta. Cadastro sem consulta realizada: 6 meses após o último uso. Reservas não pagas ou expiradas, com o resumo: 6 meses. Rotina de exclusão criada e agendada em 09/11/2026 (`aplicar_retencao`, em `supabase/schema.sql`).
