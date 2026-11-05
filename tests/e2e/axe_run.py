import os
import asyncio, json, sys
from playwright.async_api import async_playwright
BASE=os.environ.get("BASE_URL",os.environ.get("BASE_URL","http://localhost:4173/"))
AXE=open(os.environ.get("AXE_PATH","node_modules/axe-core/axe.min.js")).read()
TAGS=["wcag2a","wcag2aa","wcag21a","wcag21aa","wcag22aa","best-practice"]
results={}
async def axe(pg,name):
    await pg.add_script_tag(content=AXE)
    r=await pg.evaluate("tags=>axe.run(document,{runOnly:{type:'tag',values:tags}})",TAGS)
    results[name]=[{"id":v["id"],"impact":v["impact"],"tags":[t for t in v["tags"] if t.startswith("wcag")],"help":v["help"],"n":len(v["nodes"]),"targets":[n["target"] for n in v["nodes"]][:6]} for v in r["violations"]]
    results[name+"__incomplete"]=[{"id":v["id"],"n":len(v["nodes"])} for v in r["incomplete"]]
async def login(pg,pfx,email):
    await pg.fill(f"#{pfx}-email",email); await pg.fill(f"#{pfx}-senha","demo123"); await pg.click(f"[data-authform={pfx}] button[type=submit]"); await pg.wait_for_timeout(700)
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch()
        for vw,label in [((1280,900),"desk"),((390,844),"mob")]:
            # bypass_csp: a CSP do site bloqueia o axe injetado como script em linha
            ctx=await b.new_context(viewport={"width":vw[0],"height":vw[1]},bypass_csp=True); pg=await ctx.new_page()
            await pg.goto(BASE); await pg.wait_for_timeout(800); await axe(pg,f"{label}:home")
            # wizard steps
            await pg.locator("#nextList li button").first.click(); await pg.wait_for_timeout(200)
            await pg.select_option("#area",index=1); await pg.click("#to2"); await pg.wait_for_timeout(300); await axe(pg,f"{label}:agenda-etapa2")
            await pg.click("#to3"); await pg.wait_for_timeout(300); await axe(pg,f"{label}:agenda-etapa3")
            await pg.fill("#resumo","Benefício cessado em agosto; preciso saber se cabe recurso."); await pg.check("#lgpd")
            await pg.fill("#wz-email","cliente@demo.com"); await pg.fill("#wz-senha","demo123"); await pg.click("#to4"); await pg.wait_for_timeout(800); await axe(pg,f"{label}:agenda-etapa4")
            await pg.click("#to5"); await pg.wait_for_timeout(300); await axe(pg,f"{label}:agenda-etapa5")
            await pg.goto(BASE+"#cliente"); await pg.wait_for_timeout(700); await axe(pg,f"{label}:cliente")
            await pg.click("#clOut"); await pg.wait_for_timeout(400); await axe(pg,f"{label}:cliente-login")
            await pg.goto(BASE+"#privacidade"); await pg.wait_for_timeout(400); await axe(pg,f"{label}:privacidade")
            await pg.goto(BASE+"#admin"); await pg.wait_for_timeout(500); await login(pg,"ad","admin@demo.com")
            await pg.locator("tr.row").first.click(); await pg.wait_for_timeout(300); await axe(pg,f"{label}:admin-agendamentos")
            for t in ["agenda","valores","config"]:
                await pg.click(f"[data-atab={t}]"); await pg.wait_for_timeout(500); await axe(pg,f"{label}:admin-{t}")
            await ctx.close()
        await b.close()
    json.dump(results,open("axe.json","w"),ensure_ascii=False,indent=1)
    agg={}
    for k,v in results.items():
        if k.endswith("__incomplete"): continue
        for x in v:
            a=agg.setdefault(x["id"],{"impact":x["impact"],"tags":x["tags"],"help":x["help"],"telas":[],"n":0}); a["telas"].append(k); a["n"]+=x["n"]
    for k,a in sorted(agg.items(),key=lambda i:-i[1]["n"]): print(k,a["impact"],a["tags"],a["n"],"|",a["help"],"|",a["telas"][:5])
    print("telas auditadas:",len([k for k in results if not k.endswith("__incomplete")]))
asyncio.run(main())
