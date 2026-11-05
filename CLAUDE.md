# CLAUDE.md — Site WBarrada Advogado

## Contexto
Site profissional de advocacia de **Wanderson Corrêa Barrada (OAB/RJ nº 164.135)**, com atendimento em Campos dos Goytacazes, Cordeiro, Cantagalo e por videochamada. Áreas principais: Previdenciário (INSS) e Direito Público / Fazenda Pública.

Funções do site: página institucional, agenda online com reserva e pagamento da consulta, assistente de WhatsApp, Área do cliente e Área do advogado.

## Protocolo de trabalho (instruções do Projeto "Home Page")
- Responder em PT-BR, com tom técnico e impessoal, sem preâmbulos. Usar listas, tabelas e **negrito** só para decisões, riscos e pendências.
- Fases:
  - **0** Triagem;
  - **1** Diagnóstico;
  - **2** Arquitetura, que termina aguardando aprovação;
  - **3** Implementação, **somente com autorização expressa**;
  - **4** Verificação: WCAG 2.2 AA, Core Web Vitals, SEO, OWASP, LGPD e testes.
- Integridade:
  - Não inventar versões, preços, limites de planos ou métricas. Dado não confirmado recebe `[VERIFICAR]`, a ser resolvido em fonte oficial com citação.
  - Distinguir o que é dado do usuário, o que é premissa e o que é recomendação.
  - Nunca colocar chaves ou segredos no código. A chave `anon` do Supabase é pública; a `service_role` nunca vai para o front-end.
- Stack mínima suficiente, com cada escolha justificada em uma linha.
- Toda resposta termina com a seção "Limitações e pendências".

## Restrições éticas e legais (obrigatórias)
- **Provimento CFOAB nº 205/2021, art. 3º, I**: proibida qualquer referência, direta ou indireta, a valores, forma de pagamento, gratuidade ou descontos na **publicidade**.
  - Valor e pagamento só aparecem após a identificação do cliente, na etapa 4 da agenda e na Área do cliente.
  - Nas páginas públicas não pode haver "R$", "PIX", "cartão", "grátis" nem "pagamento".
  - "Descontos indevidos no benefício" é nome de área de atuação e está permitido.
- Também proibidos: expressões de autoengrandecimento, promessa de resultado e menção a casos concretos ou resultados (arts. 3º, IV; 4º, § 2º; 5º, § 3º; 6º).
- **Lei nº 8.906/1994, art. 30, I**: o advogado é servidor do Município de Campos dos Goytacazes. Nenhum texto pode oferecer atuação contra esse Município.
- **LGPD**: política de privacidade publicada (`#privacidade`). Minimizar dados, sem dados de saúde no formulário e sem rastreamento.

## Estrutura
```
src/                  fonte (editar aqui)
  body.html           marcação de todas as telas (site, privacidade, cliente, admin)
  styles.base.css     tokens e estilos do site
  styles.app.css      agenda, áreas restritas e seções da v3
  app.js              lógica: dados (Demo/Supabase), agenda, cliente, admin, WhatsApp
  config.js           Supabase URL/anon key, foto, data da política (vazio = modo demonstração)
  LEIA-ME.md          guia de instalação para o usuário final
  assets/logo.png     logo com fundo transparente (raster; vetorizar em SVG)
supabase/
  schema.sql          tabelas, RLS, funções (criar/cancelar agendamento, anexar comprovante), bucket
  tests/              mock-supabase.sql + rls.sql (matriz de RLS por papel)
tests/e2e/            Playwright (Python): e2e, axe (WCAG), teclado, XSS, INP, SEO
docs/                 fase2-arquitetura.md, fase4-verificacao.md
build.py              gera dist/ (não editar dist/ manualmente)
dist/                 artifact.html (prévia em arquivo único) e barrada-site/ (hospedagem)
```

## Comandos
```bash
python3 build.py                                  # gera dist/
npx serve -l 4173 dist/barrada-site               # servidor local (modo demonstração sem config.js)
pip install playwright && npm i axe-core          # dependências de teste
BASE_URL=http://localhost:4173/ python3 tests/e2e/e2e.py
BASE_URL=http://localhost:4173/ AXE_PATH=node_modules/axe-core/axe.min.js python3 tests/e2e/axe_run.py
# RLS: num Postgres de teste (não no projeto real)
psql -d teste -f supabase/tests/mock-supabase.sql -f supabase/schema.sql -f supabase/tests/rls.sql
```
- Lighthouse no Windows: usar `--chrome-flags="--headless=new --disable-backgrounding-occluded-windows --disable-renderer-backgrounding --disable-background-timer-throttling --disable-features=CalculateNativeWinOcclusion"`. Sem elas, o Speed Index variou de 3 s a 16 s na mesma versão do site.
- Contas do modo demonstração: `cliente@demo.com` e `admin@demo.com`, ambas com o código `123456`. Os dados ficam no `localStorage`.
- `mock-supabase.sql` cria os papéis `anon` e `authenticated`. Se eles já existirem, remova a primeira linha.

## Arquitetura
- HTML, CSS e JavaScript puros, sem etapa de build JavaScript. Navegação por hash: `#cliente`, `#admin` e `#privacidade` são telas próprias; as demais âncoras rolam o site.
- Camada de dados com a mesma interface em `DemoAPI()` (localStorage) e `SupabaseAPI()`. A escolha é automática conforme o `config.js`.
- Regras de negócio validadas no banco:
  - `criar_agendamento` é `SECURITY DEFINER` e checa a grade de horários, os bloqueios, a antecedência mínima e o horizonte da agenda.
  - A restrição `sem_sobreposicao` (tipo `exclude using gist`) impede sobreposição de horários.
  - Reservas não pagas expiram no prazo configurado.
- O valor da consulta é copiado da tabela `modalidades` no momento da reserva; o cliente não consegue enviá-lo.
- PIX estático no padrão BR Code (EMV com CRC16, conferido contra o exemplo do BACEN). A confirmação do pagamento é **manual**, feita no painel.
- Hospedagem prevista: Cloudflare Pages (estático, com `_headers` para CSP). Banco: Supabase (Postgres, Auth e Storage).

## Estado atual
- v3 publicada como prévia. Fases 0 a 2 apresentadas. **Fase 4 executada: reprovada** (ver `docs/fase4-verificacao.md`).
- **Fase 3 autorizada em 23/10/2026.** Itens Must 1–4 e 6–9 implementados. O item 5 (SMTP) é configuração no painel do Supabase. Pendente: nova rodada da Fase 4.
- Hospedagem atual: GitHub Pages (`https://wcbarrada.github.io/wbarrada-adv/`) via `.github/workflows/pages.yml` (CSP por `<meta>`). `_headers` continua sendo gerado para o Cloudflare Pages.
- Itens Should de acessibilidade e SEO corrigidos em 05/11/2026, exceto `telephone` e `postalCode` no JSON-LD (dados pendentes). Com `supabaseUrl` vazio, o build adiciona `noindex`. Ao adotar domínio próprio, trocar `SITE_URL` em `build.py`.
- O pacote de hospedagem usa fontes próprias (`src/fonts.css`, `src/assets/fonts/`), sem Google Fonts e sem `preload`, que atrasou o FCP nos testes com rede lenta simulada. O CSS é embutido no `index.html` e os scripts usam `defer`, para reduzir o FCP. `dist/artifact.html` ainda carrega do Google.

## Decisões do usuário (Fase 2, tomadas em 05/11/2026)
| # | Tema | Decisão |
|---|---|---|
| D1 | Pagamento antecipado da consulta | Obrigatório só na agenda online; o WhatsApp fica como caminho sem pagamento prévio |
| D2 | Acesso à Área do cliente | Código enviado por e-mail, sem senha (exige SMTP próprio). Implementado para clientes e advogado; não testado no Supabase real |
| D3 | Confirmação de pagamento | Manual no MVP; gateway com webhook depois |
| D4 | Plano do Supabase | Free nos testes; Pro (US$ 25/mês em 05/11/2026) ao abrir para clientes |
| D5 | Domínio | `wbarrada.adv.br`, ainda não registrado; preço e documentos exigidos pelo registro.br [VERIFICAR] |

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
Foto profissional (`config.js > foto`), número de WhatsApp (painel > Configurações), valores das modalidades, chave PIX, link de cartão, data da política e prazo de retenção de dados.
