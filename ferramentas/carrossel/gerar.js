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

// ---------------------------------------------------------------------------
// Estilo "visual": foto do advogado, ícones e alternância de fundo claro e escuro.
// Ativado com "estilo": "visual" no JSON. Cada slide aceita "icone" (nome de um arquivo
// em icones/, sem .svg) e "destaque" (texto curto em tamanho grande, como uma data).
// ---------------------------------------------------------------------------
const ICONES = path.join(__dirname, 'icones');
function icone(nome) {
  if (!nome) return '';
  const f = path.join(ICONES, `${nome}.svg`);
  if (!fs.existsSync(f)) { console.error(`ícone inexistente: ${nome} (veja ${ICONES})`); process.exit(2); }
  return fs.readFileSync(f, 'utf8').replace(/<!--.*?-->/s, '').replace(/width="24"/, 'width="100%"').replace(/height="24"/, 'height="100%"');
}

function cssVisual() {
  return css() + `
  .v{position:relative;width:1080px;height:1350px;overflow:hidden;font-family:'Public Sans',sans-serif}
  .v.escuro{background:radial-gradient(110% 80% at 100% 0%,#2a241a 0%,#0e0d0b 62%);color:#f2ebdb}
  .v.claro{background:#f2ebdb;color:#17150f}
  .perfil{position:absolute;left:80px;top:72px;display:flex;align-items:center;gap:22px}
  .avatar{width:92px;height:92px;border-radius:50%;background-size:250%;background-position:50% 22%;border:3px solid #e4c58e}
  .perfil b{display:block;font-size:32px;font-weight:700}
  .perfil span{font-size:26px;opacity:.7}
  .cont{position:absolute;right:80px;top:96px;font-family:'IBM Plex Mono',monospace;font-size:26px;padding:8px 18px;border-radius:40px}
  .escuro .cont{background:#211d15;color:#e4c58e}
  .claro .cont{background:#e3d8c0;color:#5b4a2a}
  .miolo{position:absolute;left:80px;right:80px;top:250px;bottom:230px;display:flex;flex-direction:column;justify-content:center}
  .ic{width:150px;height:150px;border-radius:36px;padding:34px;margin-bottom:44px}
  .escuro .ic{background:#e4c58e;color:#1a150c}
  .claro .ic{background:#17150f;color:#e4c58e}
  .dest{font-family:'Bodoni Moda',serif;font-weight:700;font-size:120px;line-height:1;margin-bottom:24px}
  .escuro .dest{color:#e4c58e} .claro .dest{color:#8a6420}
  .v h2{font-family:'Bodoni Moda',serif;font-weight:600;font-size:68px;line-height:1.1;margin-bottom:34px;color:inherit}
  .v p{font-size:44px;line-height:1.38}
  .escuro p b{color:#fff} .claro p b{color:#000}
  .base{position:absolute;left:80px;right:80px;bottom:72px;display:flex;justify-content:space-between;align-items:flex-end;gap:30px;font-size:22px;line-height:1.35;opacity:.75}
  .base .site{font-family:'IBM Plex Mono',monospace;font-size:26px;opacity:1;white-space:nowrap}
  .escuro .base .site{color:#e4c58e} .claro .base .site{color:#8a6420}
  .escuro .seta{color:#e4c58e} .claro .seta{color:#8a6420}
  /* capa */
  .capa-v .foto{position:absolute;right:-60px;bottom:0;width:820px;height:1025px;background-size:cover;background-position:center top;
     -webkit-mask-image:linear-gradient(to top,#000 62%,transparent 98%),linear-gradient(to right,transparent 0%,#000 30%);
     -webkit-mask-composite:source-in;mask-composite:intersect}
  .capa-v .txt{position:absolute;left:80px;top:250px;width:640px;z-index:2}
  .chip{display:inline-block;font-family:'IBM Plex Mono',monospace;font-size:26px;letter-spacing:.1em;text-transform:uppercase;
     background:#e4c58e;color:#1a150c;padding:12px 24px;border-radius:40px;margin-bottom:44px}
  .capa-v h1{font-family:'Bodoni Moda',serif;font-weight:700;font-size:96px;line-height:1.04;text-shadow:0 2px 30px rgba(0,0,0,.6)}
  .capa-v h1 em{font-style:italic;color:#e4c58e}
  .capa-v .deslize{margin-top:48px;display:inline-block;font-size:30px;border:2px solid #e4c58e;color:#e4c58e;padding:14px 28px;border-radius:40px}
  /* fim */
  .fim-v .grande{width:300px;height:300px;border-radius:50%;background-size:250%;background-position:50% 22%;border:5px solid #e4c58e;margin-bottom:48px}
  .fim-v .nome{font-family:'Bodoni Moda',serif;font-size:80px;font-weight:700;line-height:1.05}
  .fim-v .linha{font-size:38px;color:#e4c58e;margin:16px 0 40px}
  .fim-v .at{font-size:38px;line-height:1.35}
  .fim-v .acoes{display:flex;gap:18px;margin-top:48px;flex-wrap:wrap}
  .fim-v .acoes span{font-size:30px;border:2px solid #e4c58e;color:#e4c58e;padding:12px 26px;border-radius:40px}
  .fim-v .aviso{font-size:26px;opacity:.7;margin-top:44px}
  `;
}

function paginasVisual(post) {
  const total = post.slides.length + 2;
  const foto = `url(data:image/jpeg;base64,${b64('foto.jpg')})`;
  const perfil = `<div class="perfil"><div class="avatar" style="background-image:${foto}"></div><div><b>${ASSINATURA.nome}</b><span>@wbarrada.adv · Advogado</span></div></div>`;
  const cont = (i) => `<div class="cont">${i}/${total}</div>`;
  const base = (seta) => `<div class="base"><div>${post.fonte ? 'Fonte: ' + esc(post.fonte) : ''}</div><div class="site">${seta ? '<span class="seta">deslize →</span>' : ASSINATURA.site}</div></div>`;
  const out = [];
  out.push(`<div class="v escuro capa-v"><div class="foto" style="background-image:${foto}"></div>${perfil}${cont(1)}
    <div class="txt"><div class="chip">${esc(post.area)}</div><h1>${fmt(post.capa)}</h1><div class="deslize">Deslize para o lado →</div></div></div>`);
  post.slides.forEach((sl, k) => {
    const tom = k % 2 === 0 ? 'claro' : 'escuro';
    out.push(`<div class="v ${tom}">${perfil}${cont(k + 2)}<div class="miolo">
      ${sl.icone ? `<div class="ic">${icone(sl.icone)}</div>` : ''}${sl.destaque ? `<div class="dest">${esc(sl.destaque)}</div>` : ''}
      ${sl.titulo ? `<h2>${fmt(sl.titulo)}</h2>` : ''}<p>${fmt(sl.texto)}</p></div>${base(k < post.slides.length - 1)}</div>`);
  });
  out.push(`<div class="v escuro fim-v">${cont(total)}<div class="miolo"><div class="grande" style="background-image:${foto}"></div>
    <div class="nome">${ASSINATURA.nome}</div><div class="linha">${ASSINATURA.linha}</div><div class="at">${ASSINATURA.atendimento}</div>
    <div class="acoes"><span>Salve</span><span>Compartilhe</span><span>${ASSINATURA.site}</span></div>
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
  const visual = post.estilo === 'visual';
  const estilo = visual ? cssVisual() : css();
  for (const [i, html] of (visual ? paginasVisual(post) : paginas(post)).entries()) {
    await page.setContent(`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><style>${estilo}</style><body>${html}</body></html>`);
    await page.evaluate(() => document.fonts.ready);
    // Texto que não cabe no slide é erro: melhor falhar do que publicar cortado
    const estouro = await page.evaluate(() => {
      const c = document.querySelector('.corpo, .miolo, .capa-v .txt');
      if (c.classList.contains('txt')) return c.getBoundingClientRect().bottom > 1350 - 60;
      return c.scrollHeight > c.clientHeight + 2;
    });
    if (estouro) { console.error(`slide ${i + 1}: texto não cabe; encurte`); await browser.close(); process.exit(3); }
    const f = path.join(saida, `slide-${String(i + 1).padStart(2, '0')}.png`);
    await page.screenshot({ path: f });
    arquivos.push(f);
  }
  await browser.close();
  console.log(arquivos.join('\n'));
})();
