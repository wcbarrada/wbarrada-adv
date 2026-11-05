import base64, os, re, shutil
# Gera dist/artifact.html (prévia em arquivo único) e dist/barrada-site/ (pacote de hospedagem).
# Uso: python3 build.py  (executar na raiz do projeto)
ROOT=os.path.dirname(os.path.abspath(__file__)); os.chdir(ROOT)
SRC='src'; LOGO=os.path.join(SRC,'assets','logo.png')
# Endereço público: trocar aqui ao adotar domínio próprio
SITE_URL='https://wcbarrada.github.io/wbarrada-adv/'
b64 = base64.b64encode(open(LOGO,'rb').read()).decode()
rd = lambda p: open(p, encoding='utf-8').read()
wr = lambda p, s: open(p, 'w', encoding='utf-8', newline='\n').write(s)
css = rd(os.path.join(SRC,'styles.base.css')) + rd(os.path.join(SRC,'styles.app.css'))
body = rd(os.path.join(SRC,'body.html'))
app = rd(os.path.join(SRC,'app.js'))
fonts = '''<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,400..700;1,6..96,400..600&family=Public+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap">'''
QR = '<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>'
# CSP comum: cabeçalho (_headers, Cloudflare Pages) e <meta> (GitHub Pages, que não aceita cabeçalhos próprios)
CSP_BASE = ("default-src 'self'; script-src 'self' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net; "
  "style-src 'self' 'unsafe-inline'; font-src 'self'; "
  "img-src 'self' data: blob: https://*.supabase.co; connect-src 'self' https://*.supabase.co wss://*.supabase.co; "
  "object-src 'none'; base-uri 'self'; form-action 'self'")
HEADERS = f'''/*
  Content-Security-Policy: {CSP_BASE}; frame-ancestors 'none'; upgrade-insecure-requests
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()
  Strict-Transport-Security: max-age=31536000; includeSubDomains
'''
# 1) artifact (demo)
art = f"<title>Barrada Advocacia</title>\n{fonts}\n<style>{css}</style>\n{body.replace('__LOGO__','data:image/png;base64,'+b64)}\n{QR}\n<script>window.SITE_CONFIG={{}};</script>\n<script>{app}</script>\n"
os.makedirs('dist', exist_ok=True)
wr('dist/artifact.html', art)
# 2) hosting package
d='dist/barrada-site'; shutil.rmtree(d, ignore_errors=True); os.makedirs(d+'/supabase')
shutil.copy(LOGO, d+'/logo.png')
shutil.copy(os.path.join(SRC,'assets','og-image.png'), d+'/og-image.png')
shutil.copy(os.path.join(SRC,'assets','icon.png'), d+'/icon.png')
# Em modo demonstração (config.js sem Supabase), o site não deve ser indexado
DEMO = re.search(r'supabaseUrl:\s*""', rd(os.path.join(SRC,'config.js'))) is not None
NOINDEX = '<meta name="robots" content="noindex">\n' if DEMO else ''
# Pacote de hospedagem usa fontes próprias; a prévia em arquivo único segue com o Google Fonts
wr(d+'/styles.css', rd(os.path.join(SRC,'fonts.css')) + css)
shutil.copytree(os.path.join(SRC,'assets','fonts'), d+'/fonts')wr(d+'/app.js', app)
shutil.copy(os.path.join(SRC,'config.js'), d+'/config.js')
shutil.copy('supabase/schema.sql', d+'/supabase/schema.sql')
shutil.copy(os.path.join(SRC,'LEIA-ME.md'), d+'/LEIA-ME.md')
# Em modo demonstração, a barra de aviso já vem visível: revelá-la por JS deslocaria a página (CLS)
HOST_BODY = body.replace('__LOGO__','logo.png')
if DEMO: HOST_BODY = HOST_BODY.replace('id="demoBar" aria-label="Aviso de demonstração" hidden>','id="demoBar" aria-label="Aviso de demonstração">')
idx = f'''<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta http-equiv="Content-Security-Policy" content="{CSP_BASE}; upgrade-insecure-requests">
<meta name="referrer" content="strict-origin-when-cross-origin">
<title>Wanderson Barrada · Advogado em Campos, Cordeiro e Cantagalo</title>
{NOINDEX}<link rel="canonical" href="{SITE_URL}">
<meta name="description" content="Advocacia previdenciária e em Direito Público em Campos dos Goytacazes, Cordeiro e Cantagalo/RJ, presencial e por videochamada. OAB/RJ nº 164.135.">
<meta name="theme-color" content="#0e0d0b">
<meta property="og:type" content="website">
<meta property="og:locale" content="pt_BR">
<meta property="og:title" content="Wanderson Corrêa Barrada · Advogado">
<meta property="og:description" content="Previdenciário e Direito Público em Campos dos Goytacazes, Cordeiro e Cantagalo/RJ. Agendamento online.">
<meta property="og:url" content="{SITE_URL}">
<meta property="og:image" content="{SITE_URL}og-image.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="WBarrada Advogado. Wanderson Corrêa Barrada, OAB/RJ nº 164.135">
<meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">
{{"@context":"https://schema.org","@type":"LegalService","name":"Wanderson Corrêa Barrada · Advogado","description":"Advocacia previdenciária e em Direito Público. OAB/RJ nº 164.135.","url":"{SITE_URL}","image":"{SITE_URL}og-image.png","email":"wcbarrada.adv@gmail.com","areaServed":["Campos dos Goytacazes","Cordeiro","Cantagalo"],"sameAs":["https://www.instagram.com/wbarrada.adv/"],"address":[{{"@type":"PostalAddress","streetAddress":"Rua Evandro do Vale Moreira, 69, sala 102","addressLocality":"Cantagalo","addressRegion":"RJ","addressCountry":"BR"}},{{"@type":"PostalAddress","streetAddress":"Av. Bicok, 41","addressLocality":"Campos dos Goytacazes","addressRegion":"RJ","addressCountry":"BR"}}]}}
</script>
<link rel="icon" href="icon.png">
<link rel="apple-touch-icon" href="icon.png">
<link rel="stylesheet" href="styles.css">
<style>body{{margin:0}}[hidden]{{display:none!important}}img{{max-width:100%}}</style>
</head>
<body>
{HOST_BODY}
{QR}
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.2/dist/umd/supabase.js"></script>
<script src="config.js"></script>
<script src="app.js"></script>
</body>
</html>
'''
wr(d+'/index.html', idx)
wr(d+'/_headers', HEADERS)
wr(d+'/robots.txt', f'User-agent: *\nAllow: /\nSitemap: {SITE_URL}sitemap.xml\n')
wr(d+'/sitemap.xml', f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>{SITE_URL}</loc></url></urlset>\n')
wr(d+'/404.html', f'''<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Página não encontrada · WBarrada Advogado</title>
<link rel="icon" href="{SITE_URL}icon.png">
<style>body{{margin:0;min-height:100vh;display:grid;place-content:center;gap:16px;padding:24px;background:#0e0d0b;color:#f2ebdb;font:1rem/1.5 system-ui,sans-serif;text-align:center}}h1{{margin:0;font:500 2rem Georgia,serif}}p{{margin:0;color:#aba38e}}a{{color:#e4c58e}}</style>
</head>
<body>
<main>
<h1>Página não encontrada</h1>
<p>O endereço acessado não existe neste site.</p>
<p><a href="{SITE_URL}">Ir para a página inicial</a></p>
</main>
</body>
</html>
''')
open(d+'/.nojekyll','w').close()
print('ok', len(art))
