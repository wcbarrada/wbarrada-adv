import base64, os, shutil
# Gera dist/artifact.html (prévia em arquivo único) e dist/barrada-site/ (pacote de hospedagem).
# Uso: python3 build.py  (executar na raiz do projeto)
ROOT=os.path.dirname(os.path.abspath(__file__)); os.chdir(ROOT)
SRC='src'; LOGO=os.path.join(SRC,'assets','logo.png')
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
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; "
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
wr(d+'/styles.css', css)
wr(d+'/app.js', app)
shutil.copy(os.path.join(SRC,'config.js'), d+'/config.js')
shutil.copy('supabase/schema.sql', d+'/supabase/schema.sql')
shutil.copy(os.path.join(SRC,'LEIA-ME.md'), d+'/LEIA-ME.md')
idx = f'''<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta http-equiv="Content-Security-Policy" content="{CSP_BASE}; upgrade-insecure-requests">
<meta name="referrer" content="strict-origin-when-cross-origin">
<title>Wanderson Barrada · Advogado · Previdenciário e Direito Público · Campos, Cordeiro e Cantagalo</title>
<meta name="description" content="Advocacia previdenciária e em Direito Público em Campos dos Goytacazes, Cordeiro e Cantagalo/RJ, com atendimento presencial e por videochamada. OAB/RJ nº 164.135.">
<meta name="theme-color" content="#0e0d0b">
<meta property="og:type" content="website">
<meta property="og:locale" content="pt_BR">
<meta property="og:title" content="Wanderson Corrêa Barrada · Advogado">
<meta property="og:description" content="Previdenciário e Direito Público em Campos dos Goytacazes, Cordeiro e Cantagalo/RJ. Agendamento online.">
<meta property="og:image" content="logo.png">
<script type="application/ld+json">
{{"@context":"https://schema.org","@type":"LegalService","name":"Wanderson Corrêa Barrada · Advogado","description":"Advocacia previdenciária e em Direito Público. OAB/RJ nº 164.135.","email":"wcbarrada.adv@gmail.com","areaServed":["Campos dos Goytacazes","Cordeiro","Cantagalo"],"sameAs":["https://www.instagram.com/wbarrada.adv/"],"address":[{{"@type":"PostalAddress","streetAddress":"Rua Evandro do Vale Moreira, 69, sala 102","addressLocality":"Cantagalo","addressRegion":"RJ","addressCountry":"BR"}},{{"@type":"PostalAddress","streetAddress":"Av. Bicok, 41","addressLocality":"Campos dos Goytacazes","addressRegion":"RJ","addressCountry":"BR"}}]}}
</script>
<link rel="icon" href="logo.png">
{fonts}
<link rel="stylesheet" href="styles.css">
<style>body{{margin:0}}[hidden]{{display:none!important}}img{{max-width:100%}}</style>
</head>
<body>
{body.replace('__LOGO__','logo.png')}
{QR}
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.2/dist/umd/supabase.js"></script>
<script src="config.js"></script>
<script src="app.js"></script>
</body>
</html>
'''
wr(d+'/index.html', idx)
wr(d+'/_headers', HEADERS)
open(d+'/.nojekyll','w').close()
print('ok', len(art))
