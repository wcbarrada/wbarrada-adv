import os
import asyncio, json, re
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); pg=await b.new_page(); await pg.goto(os.environ.get("BASE_URL",os.environ.get("BASE_URL","http://localhost:4173/"))+""); await pg.wait_for_timeout(800)
        r=await pg.evaluate("""()=>({title:document.title, tlen:document.title.length,
          desc:(document.querySelector('meta[name=description]')||{}).content, canonical:!!document.querySelector('link[rel=canonical]'),
          robots:(document.querySelector('meta[name=robots]')||{}).content||null,
          og:[...document.querySelectorAll('meta[property^="og:"]')].map(m=>m.getAttribute('property')+'='+m.content),
          twitter:!!document.querySelector('meta[name^="twitter:"]'),
          h1:[...document.querySelectorAll('h1')].filter(h=>!h.closest('[hidden]')).length,
          headings:[...document.querySelectorAll('h1,h2,h3,h4')].filter(h=>!h.closest('[hidden]')).map(h=>h.tagName).join(' '),
          icon:[...document.querySelectorAll('link[rel*=icon]')].map(l=>l.href),
          imgsNoAlt:[...document.querySelectorAll('img')].filter(i=>!i.alt).length,
          imgsNoDim:[...document.querySelectorAll('img')].filter(i=>!i.getAttribute('width')).map(i=>i.src.slice(-20)),
          jsonld: JSON.parse(document.querySelector('script[type="application/ld+json"]').textContent),
          publicText: document.getElementById('siteView').innerText})""")
        t=r.pop("publicText"); r["desc_len"]=len(r["desc"] or "")
        r["termos sensíveis Prov.205 no texto público"]={w:len(re.findall(w,t,re.I)) for w in ["pagamento","pago","R\\$","pix","cartão","grátis","gratuit","desconto","honorári"]}
        print(json.dumps(r,ensure_ascii=False,indent=1))
        await b.close()
asyncio.run(main())
