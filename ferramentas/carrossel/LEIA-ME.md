# Carrossel para Instagram e Facebook

Gera as imagens de um post em carrossel (1080 × 1350) com as cores, as fontes e a logo do site.

```bash
node ferramentas/carrossel/gerar.js post.json pasta-de-saida
```

- `post.json`: `area`, `capa`, `slides` (1 a 8, cada um com `titulo` opcional e `texto`) e `fonte`. Ver o comentário no início de `gerar.js`.
- `**negrito**` e `*itálico*` funcionam nos textos.
- O último slide (nome, OAB, cidades, site e aviso de conteúdo informativo) é fixo e fica em `gerar.js`.
- Se o texto não couber num slide, o script para com erro em vez de gerar a imagem cortada.

## Uso pela tarefa agendada
Nos dias úteis de manhã, uma tarefa agendada do Claude Code pesquisa um tema, confere cada afirmação em fonte oficial, gera o carrossel e envia ao advogado por e-mail para aprovação. Nada é publicado sem ele.

Regras que todo post segue (Provimento CFOAB nº 205/2021 e Lei nº 8.906/1994, art. 30, I):
- sem valores, gratuidade ou forma de pagamento;
- sem promessa de resultado, casos concretos ou autoelogio;
- sem chamada para contratar e sem estímulo a processo;
- nada que ofereça atuação contra o Município de Campos dos Goytacazes;
- cada afirmação confirmada em fonte oficial (lei, órgão, tribunal), com o trecho citado no e-mail.
