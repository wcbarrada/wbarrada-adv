import os
import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); ctx=await b.new_context(viewport={"width":390,"height":800}); pg=await ctx.new_page()
        cdp=await ctx.new_cdp_session(pg); await cdp.send("Emulation.setCPUThrottlingRate",{"rate":4})
        await pg.add_init_script("window.__ev=[];new PerformanceObserver(l=>{for(const e of l.getEntries()) if(e.interactionId) window.__ev.push({n:e.name,d:e.duration,t:(e.target&&(e.target.id||e.target.className))||''})}).observe({type:'event',buffered:true,durationThreshold:16});")
        await pg.goto(os.environ.get("BASE_URL",os.environ.get("BASE_URL","http://localhost:4173/"))+""); await pg.wait_for_timeout(1500)
        await pg.locator("#nextList li button").first.click(); await pg.wait_for_timeout(500)
        await pg.select_option("#area",index=1); await pg.wait_for_timeout(300)
        await pg.click("#to2"); await pg.wait_for_timeout(600)
        d=pg.locator("#cal button.av").nth(1); await d.click(); await pg.wait_for_timeout(500)
        await pg.locator("#slotGrid button:not([disabled])").first.click(); await pg.wait_for_timeout(500)
        await pg.click("#to3"); await pg.wait_for_timeout(500)
        await pg.fill("#resumo","teste de interação para medir latência"); await pg.wait_for_timeout(300)
        ev=await pg.evaluate("window.__ev")
        agg={}
        for e in ev: agg[(e['n'],str(e['t'])[:25])]=max(agg.get((e['n'],str(e['t'])[:25]),0),e['d'])
        for k,v in sorted(agg.items(),key=lambda i:-i[1])[:8]: print(k,round(v),"ms")
        print("INP aprox (máx):", round(max([e['d'] for e in ev] or [0])),"ms; interações:",len(set(e.get('n') for e in ev)))
        await b.close()
asyncio.run(main())
