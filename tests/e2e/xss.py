import os
import asyncio
from playwright.async_api import async_playwright
P='<img src=x onerror="window.__xss=(window.__xss||0)+1">'
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); pg=await b.new_page(viewport={"width":1280,"height":900})
        dialogs=[]; pg.on("dialog", lambda d: (dialogs.append(d.message), asyncio.ensure_future(d.dismiss())))
        await pg.goto(os.environ.get("BASE_URL",os.environ.get("BASE_URL","http://localhost:4173/"))+"#agenda"); await pg.wait_for_timeout(800)
        await pg.focus("#mod-online"); await pg.keyboard.press("Space"); await pg.select_option("#area",index=1); await pg.click("#to2"); await pg.wait_for_timeout(300)
        await pg.locator("#cal button.av").first.click(); await pg.wait_for_timeout(200); await pg.locator("#slotGrid button:not([disabled])").first.click(); await pg.click("#to3"); await pg.wait_for_timeout(300)
        await pg.click("[data-authtab=signup][data-pfx=wz]"); await pg.wait_for_timeout(200)
        await pg.fill("#wz-nome",P+" Silva"); await pg.fill("#wz-cpf","11144477735"); await pg.fill("#wz-tel","22999990000"); await pg.fill("#wz-email","xss@exemplo.com")
        await pg.fill("#parte",P); await pg.fill("#resumo",P+" resumo do caso com texto suficiente"); await pg.check("#lgpd"); await pg.click("#to4"); await pg.wait_for_timeout(300); await pg.fill("#wz-codigo","123456"); await pg.click("#to4"); await pg.wait_for_timeout(800)
        print("etapa4:", await pg.is_visible("[data-step='4']"), await pg.text_content("#msg3"))
        await pg.goto(os.environ.get("BASE_URL",os.environ.get("BASE_URL","http://localhost:4173/"))+"#cliente"); await pg.wait_for_timeout(700)
        await pg.click("[data-ctab=dados]"); await pg.wait_for_timeout(300)
        await pg.click("#clOut"); await pg.wait_for_timeout(300)
        await pg.goto(os.environ.get("BASE_URL",os.environ.get("BASE_URL","http://localhost:4173/"))+"#admin"); await pg.wait_for_timeout(500)
        await pg.fill("#ad-email","admin@demo.com"); await pg.click("[data-authform=ad] button[type=submit]"); await pg.wait_for_timeout(200); await pg.fill("#ad-codigo","123456"); await pg.click("[data-authform=ad] button[type=submit]"); await pg.wait_for_timeout(700)
        await pg.fill("#adQ","xss"); await pg.wait_for_timeout(300)
        rows=pg.locator("tr.row"); n=await rows.count(); print("linhas encontradas:",n)
        await pg.fill("#adQ",""); await pg.wait_for_timeout(300)
        # open the booking of xss user
        cnt=await pg.locator("tr.row").count()
        for i in range(cnt):
            t=await pg.locator("tr.row").nth(i).inner_text()
            if "Silva" in t: await pg.locator("tr.row").nth(i).click(); break
        await pg.wait_for_timeout(400)
        lk=pg.locator("[id^=lk-]")
        if await lk.count(): await lk.first.fill("javascript:window.__js=1"); await pg.locator("[data-b=link]").first.click(); await pg.wait_for_timeout(500)
        await pg.click("#adOut"); await pg.wait_for_timeout(300)
        await pg.goto(os.environ.get("BASE_URL",os.environ.get("BASE_URL","http://localhost:4173/"))+"#cliente"); await pg.wait_for_timeout(400)
        await pg.fill("#cl-email","xss@exemplo.com"); await pg.click("[data-authform=cl] button[type=submit]"); await pg.wait_for_timeout(200); await pg.fill("#cl-codigo","123456"); await pg.click("[data-authform=cl] button[type=submit]"); await pg.wait_for_timeout(700)
        print("execuções do payload <img onerror>:", await pg.evaluate("window.__xss||0"), "| diálogos:", dialogs)
        hrefs=await pg.evaluate("[...document.querySelectorAll('a')].map(a=>a.getAttribute('href')).filter(h=>h&&h.startsWith('javascript'))")
        print("links javascript: renderizados para o cliente (status aguardando → link só aparece se confirmado):", hrefs)
        await b.close()
asyncio.run(main())
