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
