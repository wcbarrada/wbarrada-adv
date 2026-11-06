# Fase 4 — Verificação da v3 (23/10/2026)

**Resultado: não apto para produção.**

## Método
- Pacote `dist/barrada-site` em modo demonstração, servido localmente com gzip. Os CDNs foram substituídos por cópias idênticas locais, porque estavam bloqueados no ambiente de teste.
- Ferramentas: axe-core 4.14.0 (24 telas, desktop e celular), Lighthouse 12.8.2 e Playwright com Chromium. Banco: PostgreSQL local com simulação mínima de Auth e Storage.
- [VERIFICAR] Não foram medidos: cabeçalhos reais do Cloudflare, Supabase real e dados de campo (CrUX).

## Acessibilidade (WCAG 2.2 AA)
| # | Critério | Sev. | Achado |
|---|---|---|---|
| A1 | 1.4.10 / 1.4.4 | Alta | Modalidades em 3 colunas a 390 px, com texto cortado (`style` definido no elemento em `renderMods`) |
| A2 | 2.1.1 | Alta | `tr.row` do painel sem acesso por teclado |
| A3 | 2.4.3 | Média | Foco vai para o `body` ao avançar etapa |
| A4 | 4.1.3 | Média | `.msg` sem `role="alert"` ou `aria-live` |
| A5 | 1.4.3 | Média | Cartões `.past` com `opacity: .72` abaixo de 4,5:1 |
| A6 | 4.1.2 | Média | `#nmT` sem rótulo |
| A7 | 2.4.1 | Média | Destino do link "Ir para o conteúdo" oculto nas telas cliente, admin e privacidade |
| A8 | 2.5.8 | Baixa | Botões "×" com 18 × 17 px |
| A9 | 1.4.11 | Baixa | Borda dos campos com 1,93:1 |
| A10 | 1.3.1 | Baixa | Ordem de títulos; telas internas sem `h1` e sem `main` |
| A11 | 2.4.2 | Baixa | Título da aba fixo em todas as telas |
| A12 | Usabilidade | Baixa | Seção encoberta pelo cabeçalho fixo ao saltar por âncora |

Aprovados:
- Idioma, textos alternativos e rótulos.
- Reflow a 320 px e zoom de 200%.
- Foco visível e não encoberto.
- Movimento reduzido.
- 3.3.7 e 3.3.8.
- Pontuação de acessibilidade no Lighthouse: 98.

## Core Web Vitals (laboratório)
| Métrica | Bom | Celular (produção simulada) | Desktop |
|---|---|---|---|
| LCP | ≤ 2,5 s | 3,0 s | 0,7 s |
| CLS | ≤ 0,1 | 0,176 | 0,194 |
| TBT | ≤ 200 ms | 70 ms | 10 ms |
| INP aproximado (CPU 4×) | ≤ 200 ms | 64 ms | — |

Causas:
- O elemento LCP é o `h1`; CSS e fontes bloqueiam a renderização.
- O culpado do CLS é `svg.arc`.
- `qrcode.min.js` consome 269 ms na carga da home sem ser usado ali.
- `supabase.js` tem 52 KiB não usados na home.
- Logo PNG sem dimensões declaradas.

## SEO técnico
- Ausentes: `robots.txt`, `sitemap.xml`, `canonical` e página 404.
- `og:image` relativo e sem a arte de 1200 × 630.
- Título com 94 caracteres.
- JSON-LD sem `url`, `telephone`, `image` e `postalCode`.
- Favicon retangular.
- Texto público: a descrição da modalidade online contém "pagamento", o que conflita com o Prov. 205/2021, art. 3º, I.

## Segurança (OWASP Top 10, 2021)
| Cat. | Sev. | Achado |
|---|---|---|
| A01 | Alta | Cliente lê `obs_admin` via API |
| A04 | Alta | 18 reservas criadas em sequência pela mesma conta, sem limite |
| A07 | Alta | SMTP padrão limitado a 2 e-mails por hora |
| A03 | Média | `link_reuniao` aceita `javascript:` (XSS armazenado nos campos de texto: 0 execuções) |
| A05 | Média | Sem CSP e demais cabeçalhos; bucket de comprovantes sem limite de tamanho e tipo |
| A07 | Média | Senha mínima de 6 caracteres; sem captcha |
| A08 | Média | Scripts de CDN sem SRI |
| A01 | Baixa | Cliente altera o `email` exibido no próprio perfil |
| Validação | Baixa | Nome sem limite de tamanho; CPF inválido aceito |
| A06 | Baixa | qrcodejs 1.0.0 sem manutenção; supabase-js 2.117.2 sem vulnerabilidades (`npm audit`) |
| A09 | Baixa | Sem trilha de auditoria |

Matriz de RLS (`supabase/tests/rls.sql`):
- 22 casos aprovados.
- 1 falsa reprovação: o visitante sem login lê `admins` e recebe 0 linhas, o que é seguro.
- 3 reprovações de integridade.
- Abuso de reservas confirmado.

## LGPD
- ✔ Base legal (arts. 7º, V e VI; 11, II, "d").
- ✔ Canal com o titular. A Res. CD/ANPD nº 2/2022, art. 11, dispensa encarregado para agente de pequeno porte; enquadramento [VERIFICAR] pelos arts. 3º e 4º.
- ✔ Sem rastreamento.
- ✖ Consentimento não registrado (sem data e versão da política).
- ✖ CPF obrigatório antes da contratação.
- ✖ Política não menciona a região do Supabase nem o Google Fonts.
- ✖ Data e prazo de retenção não preenchidos.
- ⚠ Exclusão de dados só por e-mail.

## Reverificação parcial após a Fase 3 (itens Must)
| Must | Situação | Como foi conferido |
|---|---|---|
| 1. Grade de modalidades | Corrigido | Navegador a 390 px: 1 coluna, sem estilo no elemento, sem rolagem horizontal |
| 2. `tr.row` por teclado | Corrigido | Enter abre, Espaço fecha, foco mantido |
| 3. `obs_admin` | Corrigido | Tabela `agendamento_notas`; matriz de RLS em PGlite. Leitura real pelo PostgREST não testada |
| 4. Limite de reservas | Corrigido | Matriz de RLS: 0 reservas além de 2 ativas |
| 5. SMTP próprio | **Pendente** | Configuração no painel do Supabase |
| 6. Cabeçalhos | Parcial | `_headers` gerado para o Cloudflare Pages; `<meta>` CSP carrega os CDNs sem erro no navegador. O GitHub Pages não aplica `_headers`, logo não há `frame-ancestors`, `nosniff` nem `Permissions-Policy` nessa hospedagem |
| 7. Bucket | Corrigido | Valores conferidos na simulação; Storage real não testado |
| 8. Links `https:` | Corrigido | Restrição no banco e validação no painel; `javascript:` recusado nos dois |
| 9. Palavra "pagamento" | Corrigido | Descrição da modalidade e texto da seção de Fazenda Pública ("até a quitação") |

Matriz de RLS (PGlite, schema executado duas vezes): 35 casos, 31 aprovados. As 4 reprovações já estavam registradas na Fase 4 e não são itens Must: falsa reprovação de `admins` e, em `profiles`, e-mail, nome longo e CPF inválido.

Não executados nesta rodada: suíte Playwright (`tests/e2e`), axe-core, Lighthouse, Supabase real.

# Fase 4 — segunda rodada (05/11/2026)

**Resultado: não apto para produção.**

## Método
- Alvo: `https://wcbarrada.github.io/wbarrada-adv/`, em modo demonstração.
- Ferramentas: Playwright 1.64.1 (Chromium 156), axe-core 4.14.0 (24 telas, desktop e celular), Lighthouse 13.6.0 (Chrome 156, instalado na máquina, com perfil temporário) e PGlite para a matriz de RLS.
- Alteração em teste: `axe_run.py` passou a usar `bypass_csp`, pois a CSP do site bloqueia o axe injetado.
- [VERIFICAR] Não medidos: Supabase real (Auth, Storage, PostgREST, e-mail), dados de campo (CrUX), leitor de tela.

## Bloqueios
| # | Sev. | Achado | Origem |
|---|---|---|---|
| B1 | **Alta (ética)** | Lei 8.906/1994, art. 30, I: o site oferece "Tributário municipal", "Defesa do contribuinte diante de cobranças municipais", "Direitos funcionais de servidores municipais e estaduais", "causas contra o poder público" e atendimento em Campos dos Goytacazes, sem ressalva sobre esse Município. Viola a restrição do `CLAUDE.md`, ao menos de forma indireta; enquadramento a confirmar pelo advogado | Texto existente; não listado na 1ª rodada |
| B2 | Alta | Must 2 corrigido para teclado, mas `aria-expanded` em `tr` de tabela é inválido (axe `aria-conditional-attr`, 4.1.2, 8 nós) | **Regressão da Fase 3** |
| B3 | Alta | Must 6 no GitHub Pages: a resposta real só traz `Strict-Transport-Security`; sem `frame-ancestors`/`X-Frame-Options`, `nosniff`, `Referrer-Policy` em cabeçalho e `Permissions-Policy` | Hospedagem |
| B4 | Alta | Must 5: SMTP próprio não configurado | Pendente |
| B5 | Média | Página pública exibe contas de demonstração, `[INSERIR WHATSAPP]` e `[VERIFICAR: ... retenção ...]` | Conteúdo |
| B6 | Média | A política mostra como "Última atualização" a data do dia (`app.js`, `privDate`) quando `privacidadeAtualizada` está vazio; a data muda sozinha | Código existente; não listado na 1ª rodada |

## Itens Must (conferidos no site publicado)
| Must | Situação | Evidência |
|---|---|---|
| 1 | Aprovado | 390 px: 1 coluna; 320 e 640 px sem rolagem horizontal |
| 2 | **Parcial** | Enter e Espaço funcionam; ver B2 |
| 3 | Parcial | Banco: aprovado em PGlite; tela do cliente sem a nota. PostgREST real não testado |
| 4 | Parcial | Demonstração: 3ª reserva ativa recusada com mensagem; banco: aprovado em PGlite. Concorrência real não testada |
| 5 | **Reprovado** | B4 |
| 6 | **Reprovado no GitHub Pages** | B3. `_headers` gerado, não medido no Cloudflare |
| 7 | Parcial | GIF e arquivo acima de 5 MB recusados no navegador; valores do bucket conferidos só na simulação |
| 8 | Aprovado (simulação) | `javascript:` antigo não vira link no cartão nem na videochamada; banco recusa |
| 9 | Aprovado | Nenhum "pagamento", "R$", "PIX", "cartão" ou "grátis" no texto público |

## Acessibilidade (WCAG 2.2 AA)
| Regra axe / critério | Sev. | Nós | Situação |
|---|---|---|---|
| `aria-conditional-attr` 4.1.2 | Séria | 8 | **Novo** (B2) |
| `select-name` 4.1.2 (`#nmT`) | Crítica | 2 | A6 aberto |
| `color-contrast` 1.4.3 (`.past`) | Séria | 10 | A5 aberto |
| `heading-order`, `region`, `landmark-one-main`, `page-has-heading-one` | Moderada | 302 | A10 aberto |
| `empty-table-header` | Menor | 2 | Novo no relatório |

Também abertos: foco no `body` ao avançar etapa (A3), `.msg` sem `role`/`aria-live` (A4), destino do link de salto oculto em `#admin` (A7), botões "×" com 18 × 17 px (A8), título fixo (A11).

Aprovados: reflow a 320 px e zoom de 200%, idioma, movimento reduzido, link de salto visível ao receber foco. Campos com foco usam borda dourada em vez de contorno. Lighthouse: 98.

A verificar: no teste de espaçamento de texto, `section.hero` aparece com conteúdo além da área (`overflow: hidden`); corte visual não confirmado.

## Core Web Vitals (laboratório)
| Métrica | Bom | Celular | Desktop | 1ª rodada (celular / desktop) |
|---|---|---|---|---|
| LCP | ≤ 2,5 s | 2,1 s | 0,8 s | 3,0 s / 0,7 s |
| CLS | ≤ 0,1 | **0,114** | **0,193** | 0,176 / 0,194 |
| TBT | ≤ 200 ms | 0 ms | 0 ms | 70 ms / 10 ms |
| INP aproximado (CPU 4×) | ≤ 200 ms | 96 ms | — | 64 ms / — |

Lighthouse: desempenho 94 (celular) e 89 (desktop). A diferença de LCP e TBT entre rodadas pode decorrer do ambiente, pois nenhuma otimização de desempenho foi feita. CLS segue reprovado (`unsized-images`, `svg.arc`).

## SEO técnico
- Lighthouse: 100, mas a checagem manual segue reprovada.
- Ausentes: `robots.txt` e `sitemap.xml` (404), `canonical`, `og:image` absoluto, página 404 própria.
- Título com 94 caracteres. JSON-LD sem `url`, `telephone`, `image` e `postalCode`.

## Segurança (OWASP Top 10, 2021)
- XSS armazenado: 0 execuções, com a CSP ativa. Sem erros de console no fluxo completo, incluindo o QR Code do PIX.
- Matriz de RLS: 35 casos, 31 aprovados. Abertas: falsa reprovação de `admins` e, em `profiles`, e-mail, nome longo e CPF inválido.
- Abertos: scripts de CDN sem SRI, senha mínima de 6 caracteres, sem captcha, sem trilha de auditoria.
- Baixa: `_headers`, `LEIA-ME.md` e `supabase/schema.sql` são publicados junto com o site.

## LGPD e Provimento 205/2021
- ✖ Política não menciona Supabase, Google Fonts nem a hospedagem; prazo de retenção não definido; data automática (B6).
- ✖ Consentimento não registrado; CPF obrigatório antes da contratação.
- ✔ Sem expressões de autoengrandecimento ou promessa de resultado na busca por termos. Revisão por termos, não substitui a leitura do advogado.
- ✔ "Descontos indevidos no benefício" é permitido; "benefício negado, cortado ou com desconto" é o mesmo sentido, a confirmar pelo advogado.
- ✖ Art. 30, I, do Estatuto: ver B1.

## Correções após a segunda rodada
| # | Situação | Evidência |
|---|---|---|
| B2 | Corrigido e publicado | Botão real na primeira célula, com `aria-expanded`. Enter, Espaço e mouse funcionam; axe sem `aria-conditional-attr` em 24 telas |
| B6 | Corrigido e publicado | Sem `privacidadeAtualizada`, a frase "Última atualização" não é exibida |
| B1 | Corrigido e publicado (texto aprovado pelo advogado) | Ressalva em Sobre, Áreas, Agenda e WhatsApp; textos sobre atuação municipal mantidos |

## Itens Should de acessibilidade e SEO
Corrigidos: A3 a A12, `empty-table-header`; `robots.txt`, `sitemap.xml`, `canonical`, `og:image` absoluto em 1200 × 630, título com 60 caracteres, descrição até 160, favicon quadrado, página 404, `url` e `image` no JSON-LD.

- axe-core: 0 violações em 24 telas, desktop e celular.
- Pendentes por falta de dado: `telephone` e `postalCode` no JSON-LD.
- `noindex` ativo enquanto o site estiver em modo demonstração.
- `robots.txt` só tem efeito na raiz do domínio; em `wcbarrada.github.io/wbarrada-adv/` ele não é lido pelos buscadores.

## CLS
Causas: barra de demonstração revelada por JS, lista de horários crescendo ao carregar e troca tardia das fontes do Google. Correções: barra visível desde o HTML no modo demonstração, espaço reservado na lista, fontes no próprio site, dimensões nos logos e no `svg.arc`.

O `preload` das fontes foi retirado depois de teste controlado (CPU 4×, 1,6 Mbps, 150 ms; 5 rodadas): FCP de 1.824 ms com `preload` contra 1.380 ms sem ele, com CLS até 0,007 no celular.

Speed Index: a variação de 3 s a 16 s no celular veio da medição, não do site. Com as flags de Chrome que desativam a redução de prioridade de janelas ocultas, 8 rodadas ficaram entre 1,98 s e 2,23 s, com desempenho de 97 a 98. Teste controlado no site publicado (8 rodadas): FCP de 1.172 ms, faixa de 1.112 a 1.188 ms.

Resultado publicado sem `preload`: CLS de 0,039 no celular e 0,007 no desktop (Lighthouse). FCP simulado no celular em torno de 2,1 s, ainda acima de 1,8 s.

## D2: acesso por código
Clientes e advogado entram com código enviado ao e-mail, sem senha. Testado em modo demonstração e no Supabase real (cópia local, 05/11/2026), com envio real pelo Gmail.

## Teste no Supabase real
Aprovados, com a conta de advogado: cadastro e login por código, reserva, limite de 2 ativas, envio e abertura de comprovante, observação interna, confirmação e cancelamento pelo cliente e pelo painel.

Cliente comum, com dados de teste de outra pessoa no banco: lê só a própria reserva e o próprio perfil; 0 observações internas e 0 administradores; coluna `obs_admin` inexistente. Sem efeito ou bloqueados: autoconfirmar, alterar valor e configurações, tornar-se administrador, criar observação, inserir ou apagar reserva, anexar caminho alheio. Bucket recusa GIF (415), 6 MB (413) e pasta alheia (403).

LGPD corrigido: antes de confirmar o código, o banco guarda só o e-mail; nome, CPF e telefone são gravados depois da confirmação. Antes da correção, eram gravados já no pedido do código.

Não testados: exibição do link de videochamada, restrição de `https:` no banco real (aprovada em PGlite). Cadastros não confirmados ficam guardados só com o e-mail, sem rotina de limpeza.

## FCP
Causa: scripts síncronos no fim da página e CSS externo. Correção: scripts com `defer` e CSS embutido no `index.html`. Efeito colateral a acompanhar: ao abrir direto `#cliente` ou `#admin`, a home pode aparecer por instantes antes de o JavaScript trocar a tela.

Resultado publicado (celular): FCP simulado de 1,08 s (mediana de 7 rodadas, era 2,07 s) e FCP em rede lenta simulada de 808 ms (era 1.172 ms). O TBT passou de cerca de 0 para mediana de 227 ms (faixa de 27 a 372, sem contar 1 rodada anômala de 2.483 ms). As tarefas longas são de estilo e layout, sem aumento relevante de script; antes ocorriam antes do FCP e não entravam nessa métrica. Desempenho: mediana de 94, era 97.
