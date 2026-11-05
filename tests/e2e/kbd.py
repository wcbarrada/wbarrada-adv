import os
import asyncio, json
from playwright.async_api import async_playwright
BASE=os.environ.get("BASE_URL",os.environ.get("BASE_URL","http://localhost:4173/"))
JS_TARGETS="""()=>{const out=[];for(const el of document.querySelectorAll('a[href],button,input,select,textarea,[tabindex],tr.row')){
 const cs=getComputedStyle(el); if(cs.visibility==='hidden'||el.closest('[hidden]'))continue; const r=el.getBoundingClientRect(); if(!r.width||!r.height)continue;
 const inline = el.tagName==='A' && cs.display==='inline' && el.closest('p,li,dd,summary,label,span.note');
 if(el.type==='checkbox'||el.type==='radio') {}
 if(!inline && (r.width<24||r.height<24)) out.push({el:el.tagName+(el.id?'#'+el.id:'')+'.'+String(el.className).slice(0,30),w:Math.round(r.width),h:Math.round(r.height),txt:(el.textContent||el.value||'').trim().slice(0,20)});}
 return out;}"""
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); out={}
        pg=await b.new_page(viewport={"width":1280,"height":900})
        await pg.goto(BASE); await pg.wait_for_timeout(700)
        out["alvos<24px home"]=await pg.evaluate(JS_TARGETS)
        # focus obscured: tab forward through page and back
        obsc=[]; seen=0
        for i in range(140):
            await pg.keyboard.press("Tab")
            r=await pg.evaluate("""()=>{const e=document.activeElement; if(!e||e===document.body) return null; const r=e.getBoundingClientRect(); const h=document.querySelector('.top').getBoundingClientRect(); const d=document.getElementById('demoBar'); const bot=Math.max(h.bottom, d&&!d.hidden? d.getBoundingClientRect().bottom:0);
              const wf=document.getElementById('waFloat').getBoundingClientRect();
              const coveredTop = r.bottom<=bot+1 && !e.closest('.top') && !e.closest('#demoBar');
              const coveredFloat = r.left>=wf.left-1 && r.right<=wf.right+1 && r.top>=wf.top-1 && r.bottom<=wf.bottom+1 && e.id!=='waFloat';
              const fv = getComputedStyle(e,':focus-visible'); const o=getComputedStyle(e); 
              return {id:e.tagName+(e.id?'#'+e.id:'')+' '+(e.textContent||'').trim().slice(0,25), coveredTop, coveredFloat, outline:o.outlineStyle+' '+o.outlineWidth}}""")
            if r and (r["coveredTop"] or r["coveredFloat"]): obsc.append(r)
            if r and r["outline"].startswith("none") : seen+=1
        out["foco encoberto (Tab)"]=obsc[:8]; out["foco sem outline (Tab, de 140)"]=seen
        obsc=[]
        for i in range(60):
            await pg.keyboard.press("Shift+Tab")
            r=await pg.evaluate("""()=>{const e=document.activeElement; if(!e||e===document.body) return null; const r=e.getBoundingClientRect(); const h=document.querySelector('.top').getBoundingClientRect(); const d=document.getElementById('demoBar'); const bot=Math.max(h.bottom, d&&!d.hidden? d.getBoundingClientRect().bottom:0);
              return {id:e.tagName+(e.id?'#'+e.id:'')+' '+(e.textContent||'').trim().slice(0,25), covered: r.bottom<=bot+1 && !e.closest('.top') && !e.closest('#demoBar'), partial: r.top<bot && r.bottom>bot && !e.closest('.top') && !e.closest('#demoBar')}}""")
            if r and (r["covered"]): obsc.append(r)
        out["foco totalmente encoberto (Shift+Tab)"]=obsc[:8]; out["n encoberto Shift+Tab"]=len(obsc)
        # focus after step change
        await pg.goto(BASE+"#agenda"); await pg.wait_for_timeout(500)
        await pg.focus("#mod-campos"); await pg.keyboard.press("Space"); await pg.select_option("#area",index=1)
        await pg.focus("#to2"); await pg.keyboard.press("Enter"); await pg.wait_for_timeout(300)
        out["foco após avançar etapa"]=await pg.evaluate("document.activeElement.tagName+'#'+document.activeElement.id")
        # error messages live?
        out["msg de erro com role/aria-live"]=await pg.evaluate("[...document.querySelectorAll('.msg')].map(m=>m.id+':'+(m.getAttribute('role')||m.getAttribute('aria-live')||'nenhum'))")
        # admin rows keyboard
        await pg.goto(BASE+"#admin"); await pg.wait_for_timeout(400)
        await pg.fill("#ad-email","admin@demo.com"); await pg.fill("#ad-senha","demo123"); await pg.click("[data-authform=ad] button[type=submit]"); await pg.wait_for_timeout(700)
        out["botões das linhas da tabela"]=await pg.evaluate("[...document.querySelectorAll('tr.row')].map(r=>r.querySelectorAll('button[aria-expanded]').length)")
        out["alvos<24px admin"]=await pg.evaluate(JS_TARGETS)
        await pg.click("[data-atab=agenda]"); await pg.wait_for_timeout(400)
        out["alvos<24px admin-agenda"]=await pg.evaluate(JS_TARGETS)
        out["título por tela"]=await pg.title()
        # skip link on non-site views
        out["destino do skip link visível em #admin"]=await pg.evaluate("!document.getElementById('conteudo').closest('[hidden]')")
        # reflow 320 / zoom 200% (640)
        for w in (320,640):
            m=await b.new_page(viewport={"width":w,"height":800})
            for h in ["","#cliente","#privacidade","#admin"]:
                await m.goto(BASE+h); await m.wait_for_timeout(400)
                out[f"scrollWidth {w}px {h or 'home'}"]=await m.evaluate("document.documentElement.scrollWidth")
            await m.close()
        # text spacing 1.4.12
        m=await b.new_page(viewport={"width":390,"height":800}); await m.goto(BASE); await m.wait_for_timeout(500)
        await m.add_style_tag(content="*{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}p{margin-bottom:2em!important}")
        await m.wait_for_timeout(200)
        out["text-spacing: elementos cortados"]=await m.evaluate("""[...document.querySelectorAll('body *')].filter(e=>{const c=getComputedStyle(e);return (c.overflow==='hidden'||c.textOverflow==='ellipsis')&&(e.scrollWidth>e.clientWidth+2||e.scrollHeight>e.clientHeight+2)&&e.textContent.trim()&&!e.closest('[hidden]')}).map(e=>e.tagName+'.'+String(e.className).slice(0,25)).slice(0,10)""")
        out["text-spacing scrollWidth"]=await m.evaluate("document.documentElement.scrollWidth")
        # reduced motion
        rm=await b.new_page(reduced_motion="reduce"); await rm.goto(BASE); await rm.wait_for_timeout(300)
        out["reduced-motion scroll-behavior"]=await rm.evaluate("getComputedStyle(document.documentElement).scrollBehavior")
        out["lang"]=await pg.evaluate("document.documentElement.lang")
        json.dump(out,open("kbd.json","w"),ensure_ascii=False,indent=1)
        for k,v in out.items(): print(k,"=>",v)
        await b.close()
asyncio.run(main())
