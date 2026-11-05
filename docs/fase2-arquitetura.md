# Fase 2 — Arquitetura (proposta, aguardando aprovação)

## Dados do usuário relevantes
- Cerca de 95% da clientela é de baixa renda, com contratos de êxito.
- Atua em Campos dos Goytacazes, Cordeiro e Cantagalo.
- Google Meu Negócio (jul/2026): 100 visualizações, 62 pedidos de rota, 2 ligações e **0 cliques no site**.
- Instagram: @wbarrada.adv.

## Personas [PREMISSA]
- **P1:** segurado ou aposentado do INSS, mais de 55 anos, usa o WhatsApp como canal principal.
- **P2:** servidor estadual ou de outros municípios. Servidores do Município de Campos não podem ser atendidos contra esse Município (EAOAB, art. 30, I).
- **P3:** contribuinte com cobrança de ISS ou CDA.

## KPIs
- Cliques no site vindos do Google Meu Negócio (linha de base: 0).
- Contatos iniciados pelo WhatsApp.
- Taxa de conclusão da agenda.
- Taxa de confirmação das reservas.
- Taxa de faltas.
- Contratações por consulta realizada.
- As metas serão definidas após 30 dias de medição.

## Mapa do site (alvo)
| Rota | Indexação |
|---|---|
| `/` (home em página única, com âncoras) | Sim |
| `/privacidade.html` | Sim |
| `/cliente/` | `noindex` |
| `/admin/` | `noindex` |
| `/404.html` | — |
| `sitemap.xml`, `robots.txt` | — |
| `/previdenciario/`, `/servidor-publico/` | Fase posterior |

## Seções da home, em ordem
1. Cabeçalho.
2. Hero, com os próximos horários livres.
3. Sobre, com a foto.
4. Áreas de atuação.
5. Como funciona.
6. Agenda (conversão principal).
7. Assistente de WhatsApp (conversão secundária).
8. Orientações com base legal.
9. Dúvidas frequentes.
10. Contato.
11. Rodapé com avisos éticos.

Há também o botão flutuante de WhatsApp.

## Diretrizes visuais
- Tokens de cor:
  - `--ink #0e0d0b`;
  - `--fg #f2ebdb` (16,36:1);
  - `--muted #aba38e` (7,73:1);
  - `--gold #e4c58e` (11,73:1);
  - `--gold-2 #b98f4c` (6,17:1);
  - `--line-2`: trocar `#4a4130` (1,93:1) por `#76694f`, que atinge 3,1 a 3,6:1.
- Tipografia: Bodoni Moda (títulos), Public Sans (texto) e IBM Plex Mono (dados). Hospedar no próprio site em woff2, apenas o subconjunto latino.
- Imagens:
  - logo vetorizado em SVG;
  - foto 4:5 em AVIF e WebP, com `srcset` de 480, 800 e 1200 px e carregamento tardio (`loading="lazy"`);
  - imagem de compartilhamento (OG) com 1200 × 630;
  - sem objetos de ostentação (Prov. 205, art. 6º, parágrafo único).

## Modelo de dados
- Tabelas existentes: `profiles`, `admins`, `configuracoes` (linha única), `modalidades`, `disponibilidade`, `bloqueios`, `horarios_extras` e `agendamentos` (com restrição de não sobreposição).
- Alterações propostas:
  - limite de reservas ativas por cliente;
  - restrições no bucket de comprovantes;
  - CPF opcional e único;
  - tabela `consentimentos`;
  - tabela `eventos` (auditoria);
  - tabela `pagamentos`, somente se D3 for "gateway";
  - rotina de retenção de dados.

## Stack
- Recomendada: HTML, CSS e JavaScript puros, Supabase (Postgres, Auth e Storage, mais Edge Function apenas para o webhook do gateway) e Cloudflare Pages.
- Supabase Free: 500 MB de banco, 1 GB de storage, 5 GB de egress, 50 mil usuários ativos por mês e 500 mil execuções de função. Pausa após 7 dias de baixa atividade; e-mail padrão limitado a 2 por hora.
- Cloudflare Pages Free: 500 builds por mês, 20 mil arquivos e 25 MiB por arquivo; aceita arquivo `_headers`.
- Alternativas descartadas: página estática só com WhatsApp (perde a agenda e as áreas restritas) e WordPress (custo e manutenção maiores).

## Estrutura alvo
```
index.html, privacidade.html, 404.html, cliente/, admin/,
assets/{css,js,fonts,img}, _headers, sitemap.xml, robots.txt,
supabase/{migrations,seed.sql,functions/webhook-pagamento}, LEIA-ME.md
```

## Decisões D1–D5
Ver `CLAUDE.md`.
