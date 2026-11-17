// Gera as imagens de um carrossel (1080 x 1350, formato 4:5 do Instagram) a partir de um JSON.
// Uso: node ferramentas/carrossel/gerar.js post.json pasta-de-saida
// Exige o Playwright já instalado no ambiente (require('playwright')).
//
// Formato do JSON:
// {
//   "area":   "INSS · Previdência",                 // aparece no alto de cada slide
//   "capa":   "Título da capa",                      // slide 1
//   "slides": [ { "titulo": "opcional", "texto": "..." }, ... ],   // slides do meio
//   "fonte":  "INSS (gov.br/inss), 27/10/2026"       // rodapé de todos os slides
// }
// O último slide (assinatura) é fixo e sai deste arquivo, para não variar de um post para outro.
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const RAIZ = path.resolve(__dirname, '..', '..');
const ASSETS = path.join(RAIZ, 'src', 'assets');
const b64 = (f) => fs.readFileSync(path.join(ASSETS, f)).toString('base64');

const ASSINATURA = {
  nome: 'Wanderson Barrada',
  linha: 'Advogado · OAB/RJ nº 164.135',
  atendimento: 'Atendimento em Cantagalo, Cordeiro, Campos dos Goytacazes e por videochamada',
  site: 'wbarrada.adv.br',
  aviso: 'Conteúdo informativo. Cada situação depende da análise do caso.',
};

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function css() {
  return `
  @font-face{font-family:'Bodoni Moda';font-weight:400 700;src:url(data:font/woff2;base64,${b64('fonts/bodoni-moda-normal.woff2')}) format('woff2')}
  @font-face{font-family:'Bodoni Moda';font-style:italic;font-weight:400 600;src:url(data:font/woff2;base64,${b64('fonts/bodoni-moda-italic.woff2')}) format('woff2')}
  @font-face{font-family:'Public Sans';font-weight:300 800;src:url(data:font/woff2;base64,${b64('fonts/public-sans-normal.woff2')}) format('woff2')}
  @font-face{font-family:'IBM Plex Mono';font-weight:500;src:url(data:font/woff2;base64,${b64('fonts/ibm-plex-mono-500.woff2')}) format('woff2')}
  *{box-sizing:border-box;margin:0;padding:0}
  html,body{width:1080px;height:1350px;background:#0e0d0b}
  .s{position:relative;width:1080px;height:1350px;padding:96px 92px 0;color:#f2ebdb;font-family:'Public Sans',sans-serif;
     background:radial-gradient(120% 70% at 100% 0%,#211d15 0%,#0e0d0b 60%);overflow:hidden}
  .s::before{content:"";position:absolute;inset:40px;border:1px solid #322c20;pointer-events:none}
  .topo{display:flex;justify-content:space-between;align-items:center;font-family:'IBM Plex Mono',monospace;font-size:26px;
        letter-spacing:.12em;text-transform:uppercase;color:#e4c58e}
  .num{color:#aba38e}
  .corpo{position:absolute;left:92px;right:92px;top:230px;bottom:250px;display:flex;flex-direction:column;justify-content:center}
  .capa h1{font-family:'Bodoni Moda',serif;font-weight:600;font-size:92px;line-height:1.06;letter-spacing:-.01em}
  .capa h1 em{font-style:italic;color:#e4c58e}
  .capa .seta{margin-top:56px;font-size:30px;color:#aba38e}
  h2{font-family:'Bodoni Moda',serif;font-weight:600;font-size:60px;line-height:1.12;color:#e4c58e;margin-bottom:40px}
  p{font-size:46px;line-height:1.36;font-weight:400}
  p b{font-weight:700;color:#fff}
  .fio{width:120px;height:4px;background:#b98f4c;margin-bottom:44px}
  .rod{position:absolute;left:92px;right:92px;bottom:84px;display:flex;justify-content:space-between;align-items:flex-end;gap:40px;
       font-size:22px;color:#aba38e;line-height:1.35}
  .rod img{height:58px;opacity:.95}
  .fonte{max-width:640px}
  .fim .corpo{align-items:flex-start}
  .fim img.logo{height:120px;margin-bottom:56px}
  .fim .nome{font-family:'Bodoni Moda',serif;font-size:76px;font-weight:600;line-height:1.05}
  .fim .linha{font-size:38px;color:#e4c58e;margin:18px 0 48px}
  .fim .at{font-size:40px;line-height:1.35;max-width:860px}
  .fim .site{font-family:'IBM Plex Mono',monospace;font-size:44px;color:#e4c58e;margin-top:48px}
  .fim .aviso{font-size:28px;color:#aba38e;margin-top:56px;max-width:860px}
  `;
}

// **negrito** e *itálico* simples no texto
const fmt = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\*(.+?)\*/g, '<em>$1</em>').replace(/\n/g, '<br>');

function paginas(post) {
  const total = post.slides.length + 2;
  const logo = `data:image/png;base64,${b64('logo.png')}`;
  const rod = `<div class="rod"><div class="fonte">${post.fonte ? 'Fonte: ' + esc(post.fonte) : ''}</div><img src="${logo}" alt=""></div>`;
  const topo = (i) => `<div class="topo"><span>${esc(post.area)}</span><span class="num">${String(i).padStart(2, '0')}/${String(total).padStart(2, '0')}</span></div>`;
  const out = [];
  out.push(`<div class="s capa">${topo(1)}<div class="corpo"><h1>${fmt(post.capa)}</h1><div class="seta">Deslize para o lado →</div></div>${rod}</div>`);
  post.slides.forEach((sl, k) => {
    out.push(`<div class="s">${topo(k + 2)}<div class="corpo"><div class="fio"></div>${sl.titulo ? `<h2>${fmt(sl.titulo)}</h2>` : ''}<p>${fmt(sl.texto)}</p></div>${rod}</div>`);
  });
  out.push(`<div class="s fim">${topo(total)}<div class="corpo"><img class="logo" src="${logo}" alt=""><div class="nome">${ASSINATURA.nome}</div>
    <div class="linha">${ASSINATURA.linha}</div><div class="at">${ASSINATURA.atendimento}</div><div class="site">${ASSINATURA.site}</div>
    <div class="aviso">${ASSINATURA.aviso}</div></div></div>`);
  return out;
}

(async () => {
  const [entrada, saida] = process.argv.slice(2);
  if (!entrada || !saida) { console.error('uso: node gerar.js post.json pasta-de-saida'); process.exit(2); }
  const post = JSON.parse(fs.readFileSync(entrada, 'utf8'));
  if (!post.capa || !Array.isArray(post.slides) || post.slides.length < 1 || post.slides.length > 8) {
    console.error('JSON inválido: precisa de "capa" e de 1 a 8 "slides"'); process.exit(2);
  }
  fs.mkdirSync(saida, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 });
  const arquivos = [];
  for (const [i, html] of paginas(post).entries()) {
    await page.setContent(`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><style>${css()}</style><body>${html}</body></html>`);
    await page.evaluate(() => document.fonts.ready);
    // Texto que não cabe no slide é erro: melhor falhar do que publicar cortado
    const estouro = await page.evaluate(() => { const c = document.querySelector('.corpo'); return c.scrollHeight > c.clientHeight + 2; });
    if (estouro) { console.error(`slide ${i + 1}: texto não cabe; encurte`); await browser.close(); process.exit(3); }
    const f = path.join(saida, `slide-${String(i + 1).padStart(2, '0')}.png`);
    await page.screenshot({ path: f });
    arquivos.push(f);
  }
  await browser.close();
  console.log(arquivos.join('\n'));
})();
