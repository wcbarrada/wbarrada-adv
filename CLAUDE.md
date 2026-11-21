# CLAUDE.md — Site WBarrada Advogado

## Contexto
Site profissional de advocacia de **Wanderson Corrêa Barrada (OAB/RJ nº 164.135)**, com atendimento em Campos dos Goytacazes, Cordeiro, Cantagalo e por videochamada. O site não destaca área principal (pedido do usuário em 06/11/2026): a apresentação é centrada no advogado, e casos fora do seu campo podem ser indicados a colegas.

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
BASE_URL=http://localhost:4173/ python3 tests/e2e/must.py   # regressão dos itens Must; exige build com agendaAtiva: true
# RLS: num Postgres de teste (não no projeto real)
psql -d teste -f supabase/tests/mock-supabase.sql -f supabase/schema.sql -f supabase/tests/rls.sql
```
- Lighthouse no Windows: usar `--chrome-flags="--headless=new --disable-backgrounding-occluded-windows --disable-renderer-backgrounding --disable-background-timer-throttling --disable-features=CalculateNativeWinOcclusion"`. Sem elas, o Speed Index variou de 3 s a 16 s na mesma versão do site.
- Contas do modo demonstração: `cliente@demo.com` e `admin@demo.com`, ambas com o código `123456`. Os dados ficam no `localStorage`.
- `mock-supabase.sql` cria os papéis `anon` e `authenticated`. Se eles já existirem, remova a primeira linha.

## Onde trabalhar (decisão do usuário em 07/11/2026)
- **Fonte única: o GitHub** (`wcbarrada/wbarrada-adv`). A branch `main` publica o site a cada envio (`.github/workflows/pages.yml`).
- **Trabalhar em sessões na nuvem** do Claude Code (ambiente **Cloud**), abertas pelo aplicativo do Claude, pelo navegador (claude.ai/code) ou pelo celular. Elas não dependem de nenhum computador ligado. O Claude GitHub App está instalado só neste repositório.
- Não usar Remote Control para trabalhar no site: ele depende do PC de origem ligado. Não guardar o código no OneDrive. No PC da Prefeitura, nenhuma cópia local.
- **Não há mais cópias locais** (decisão do usuário em 13/11/2026): as pastas do PC da Prefeitura e do PC de casa foram excluídas. O repositório no GitHub é a única cópia do código.
- **Ao concluir uma alteração autorizada** (Fase 3), sem pedir ao usuário que rode comandos:
  1. commit na branch da sessão e `git push`;
  2. abrir pull request para a `main` com resumo em português;
  3. informar ao usuário o que muda no site e **pedir confirmação para publicar**, porque o merge publica;
  4. com a confirmação, fazer o merge (squash) e conferir no Actions se a publicação terminou;
  5. nunca deixar trabalho só numa branch sem avisar o usuário.
- Os testes extras do `rls.sql` que existiam só na pasta do PC de casa foram perdidos com a exclusão (13/11/2026). A matriz do repositório tem 80 casos; casos novos são escritos a partir do `schema.sql`.

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

## Marca e identidade visual (21/11/2026)
- Nome da marca: **WBarrada Advogados** (sem "s" em Barrada; "Advogados" no plural). Logo em `src/assets/logo.svg` (vetor, do arquivo CDR original) e `src/assets/logo.png` (940 × 342, transparente, gerado do SVG).
- Cores, tipografia e limites em `docs/identidade-visual.md`. Os tokens atuais do site (`--gold`, `--ink`) continuam; trocar só com pedido, e só a aparência.

## Método de trabalho (Imersão Claude, aulas 2 e 3)
- Ler antes de construir; uma alteração por rodada, aberta no navegador antes da próxima.
- Perguntar antes de decidir regra nova (uma pergunta por vez, com opções).
- Não entregar a primeira versão: conferir em 1366 × 768 e 390 × 800; Fase 4 só passa com os testes rodados, nunca desligados.
- Corrigiu duas vezes o mesmo problema sem resolver: recomeçar em conversa nova com o pedido reescrito.

## Onde está o resto
- `docs/estado-e-decisoes.md` — estado atual, decisões D1–D5, backlog Must/Should/Could, pendências de conteúdo e prazos de guarda.
- `docs/fase2-arquitetura.md`, `docs/fase4-verificacao.md`.
- `docs/identidade-visual.md` — marca.
