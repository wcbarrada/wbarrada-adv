import os
# Regressão dos itens Must da Fase 4 (modo demonstração). Itens 3 e 4 no banco: supabase/tests/rls.sql.
# Para checar a CSP, sirva dist/barrada-site com os cabeçalhos do _headers aplicados.
# Exige build com agendaAtiva: true em config.js; com a agenda suspensa, o teste para sem executar.
import asyncio, json, sys
from playwright.async_api import async_playwright
URL=os.environ.get("BASE_URL","http://localhost:4173/")
res=[]
def ok(label, cond, info=""):
    res.append((cond, label, info)); print(("PASSA" if cond else "FALHA")+"|"+label+("|"+str(info) if info!="" else ""))
CSP_SPY="window.__csp=[];document.addEventListener('securitypolicyviolation',e=>window.__csp.push(e.violatedDirective+' '+e.blockedURI));"
async def login(pg,pfx,email):
    await pg.fill(f"#{pfx}-email",email); await pg.click(f"[data-authform={pfx}] button[type=submit]"); await pg.wait_for_timeout(200)
    await pg.fill(f"#{pfx}-codigo","123456"); await pg.click(f"[data-authform={pfx}] button[type=submit]"); await pg.wait_for_timeout(700)
async def book(pg):
    await pg.goto(URL+"#agenda"); await pg.wait_for_timeout(600)
    await pg.locator("#nextList li button").first.click(); await pg.wait_for_timeout(200)
    await pg.select_option("#area", index=1); await pg.click("#to2"); await pg.wait_for_timeout(200)
    await pg.click("#to3"); await pg.wait_for_timeout(300)
    await pg.fill("#resumo","Preciso de orientação sobre o benefício cessado."); await pg.check("#lgpd")
    if await pg.is_visible("#wz-email"):
        await pg.fill("#wz-email","cliente@demo.com"); await pg.click("#to4"); await pg.wait_for_timeout(300); await pg.fill("#wz-codigo","123456")
    await pg.click("#to4"); await pg.wait_for_timeout(800)
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch()
        # 6) cabeçalhos
        ctx=await b.new_context(viewport={"width":1280,"height":900}); await ctx.add_init_script(CSP_SPY); pg=await ctx.new_page()
        r=await pg.request.get(URL); h={k.lower():v for k,v in r.headers.items()}
        await pg.goto(URL); await pg.wait_for_timeout(300)
        if await pg.evaluate("window.SITE_CONFIG&&window.SITE_CONFIG.agendaAtiva===false"):
            print("NÃO EXECUTADO: agenda suspensa (agendaAtiva: false). Gere o build com a agenda ligada."); await b.close(); sys.exit(2)
        csp=h.get("content-security-policy","")
        ok("6 CSP com frame-ancestors 'none'", "frame-ancestors 'none'" in csp, csp[:60])
        for k,v in [("x-content-type-options","nosniff"),("referrer-policy",""),("permissions-policy","camera=()")]:
            ok(f"6 cabeçalho {k}", k in h and v in h[k], h.get(k,"ausente"))
        # 1) grade de modalidades
        await pg.goto(URL+"#agenda"); await pg.wait_for_timeout(600)
        cols=await pg.evaluate("getComputedStyle(document.getElementById('modOpts')).gridTemplateColumns.split(' ').length")
        ok("1 desktop: 3 colunas", cols==3, cols)
        ok("1 sem style inline na grade", not await pg.get_attribute("#modOpts","style"))
        # 9) texto público
        t=await pg.inner_text("#modOpts"); ok("9 modalidades sem 'pagamento'", "pagamento" not in t.lower())
        # admin: configura PIX (para gerar QR na etapa 4) e testa itens 2 e 8
        await pg.goto(URL+"#admin"); await pg.wait_for_timeout(500); await login(pg,"ad","admin@demo.com")
        await pg.click("[data-atab=config]"); await pg.wait_for_timeout(400)
        await pg.fill("#cf-pix_chave","wcbarrada.adv@gmail.com"); await pg.fill("#cf-link_cartao","javascript:alert(1)")
        await pg.click("#cfForm button[type=submit]"); await pg.wait_for_timeout(400)
        ok("8 painel recusa link_cartao javascript:", "https" in (await pg.text_content("#cfMsg") or ""), await pg.text_content("#cfMsg"))
        await pg.fill("#cf-link_cartao",""); await pg.click("#cfForm button[type=submit]"); await pg.wait_for_timeout(500)
        await pg.click("[data-atab=agendamentos]"); await pg.wait_for_timeout(500)
        ok("2 cada linha tem botão focável", await pg.locator("tr.row").count()==await pg.locator("tr.row .rowbtn").count()>0)
        await pg.locator("tr.row .rowbtn").first.focus(); await pg.keyboard.press("Enter"); await pg.wait_for_timeout(300)
        st=await pg.evaluate("({det:document.querySelectorAll('tr.det').length, foco:document.activeElement.matches('tr.row .rowbtn'), exp:document.activeElement.getAttribute('aria-expanded')})")
        ok("2 Enter abre a linha e mantém o foco", st["det"]==1 and st["foco"] and st["exp"]=="true", st)
        await pg.keyboard.press("Space"); await pg.wait_for_timeout(300)
        st=await pg.evaluate("({det:document.querySelectorAll('tr.det').length, foco:document.activeElement.matches('tr.row .rowbtn'), exp:document.activeElement.getAttribute('aria-expanded')})")
        ok("2 Espaço fecha a linha", st["det"]==0 and st["foco"] and st["exp"]=="false", st)
        await pg.locator("[data-f=todos]").click(); await pg.wait_for_timeout(200)
        n=await pg.locator("tr.row").count()
        for i in range(n):
            if "Online" in await pg.locator("tr.row").nth(i).inner_text(): await pg.locator("tr.row").nth(i).click(); break
        await pg.wait_for_timeout(300)
        await pg.locator("[id^=lk-]").first.fill("javascript:window.__js=1"); await pg.locator("[data-b=link]").first.click(); await pg.wait_for_timeout(300)
        ok("8 painel recusa link_reuniao javascript:", "https" in (await pg.text_content("#toast") or ""), await pg.text_content("#toast"))
        await pg.click("#adOut"); await pg.wait_for_timeout(300)
        # 4) limite de 2 reservas ativas (cliente@demo.com já tem 1 confirmada)
        await book(pg)
        ok("4 segunda reserva ativa é aceita", await pg.is_visible("[data-step='4']"), await pg.text_content("#msg3"))
        # 7) comprovante: tipo e tamanho
        ok("7 accept restrito", await pg.get_attribute("[data-receipt]","accept")=="image/jpeg,image/png,application/pdf")
        ok("6 QR Code gerado com a CSP ativa", await pg.locator("[data-qr] canvas, [data-qr] img").count()>0)
        fi=pg.locator("[data-receipt]").first
        await fi.set_input_files({"name":"x.txt","mimeType":"text/plain","buffer":b"x"}); await pg.wait_for_timeout(200)
        ok("7 recusa .txt", "Formato" in (await pg.locator("[data-rcmsg]").first.text_content() or ""))
        await fi.set_input_files({"name":"x.pdf","mimeType":"application/pdf","buffer":b"0"*(6*1024*1024)}); await pg.wait_for_timeout(200)
        ok("7 recusa PDF de 6 MB", "5 MB" in (await pg.locator("[data-rcmsg]").first.text_content() or ""))
        await pg.click("#to5"); await pg.wait_for_timeout(200); await pg.click("#restart"); await pg.wait_for_timeout(200)
        await book(pg)
        m=await pg.text_content("#msg3") or ""
        ok("4 terceira reserva ativa é recusada", "2 consultas ativas" in m and not await pg.is_visible("[data-step='4']"), m)
        # 8) exibição: link javascript: gravado no banco não vira <a>
        await pg.evaluate("""()=>{const k='wb_demo_v2',o=JSON.parse(localStorage.getItem(k));
          const a=o.db.agendamentos.find(x=>x.cliente_id==='u-cli'&&x.status==='confirmado'); a.modalidade_id='online'; a.link_reuniao='javascript:window.__js=1';
          o.db.config.link_cartao='javascript:window.__js=2'; localStorage.setItem(k,JSON.stringify(o));}""")
        await pg.goto(URL+"#cliente"); await pg.reload(); await pg.wait_for_timeout(700)
        await pg.locator("[data-act]").first.wait_for(timeout=3000)
        for btn in await pg.locator("[data-paytab=card]").all(): await btn.click()
        hrefs=await pg.evaluate("[...document.querySelectorAll('a[href]')].map(a=>a.getAttribute('href')).filter(h=>!/^(https?:|#|mailto:|tel:)/i.test(h))")
        ok("8 nenhum link não-https renderizado para o cliente", hrefs==[], hrefs)
        ok("8 cartão sem link válido mostra pendência", await pg.locator("text=[INSERIR LINK DE PAGAMENTO]").count()>0 or await pg.locator("[data-paytab]").count()==0)
        csp_v=await pg.evaluate("window.__csp")
        ok("6 nenhuma violação de CSP nesta página", csp_v==[], csp_v)
        await ctx.close()
        # 1) celular
        ctx=await b.new_context(viewport={"width":390,"height":844}); await ctx.add_init_script(CSP_SPY); m=await ctx.new_page()
        await m.goto(URL+"#agenda"); await m.wait_for_timeout(600)
        cols=await m.evaluate("getComputedStyle(document.getElementById('modOpts')).gridTemplateColumns.split(' ').length")
        ok("1 celular: 1 coluna", cols==1, cols)
        cut=await m.evaluate("[...document.querySelectorAll('#modOpts label')].filter(l=>l.scrollWidth>l.clientWidth+1).length")
        ok("1 celular: nenhum rótulo cortado", cut==0, cut)
        ok("6 nenhuma violação de CSP (celular)", await m.evaluate("window.__csp")==[])
        await b.close()
    falhas=[r for r in res if not r[0]]
    print(f"\n{len(res)-len(falhas)}/{len(res)} aprovados")
    sys.exit(1 if falhas else 0)
asyncio.run(main())
