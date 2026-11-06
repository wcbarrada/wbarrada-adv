/* =====================================================================
   Barrada Advogado · site, agenda, área do cliente e área do advogado
   Sem SUPABASE configurado em config.js, roda em modo demonstração.
   ===================================================================== */
(function(){
"use strict";

const TZ = "America/Sao_Paulo";
const SITE = window.SITE_CONFIG || {};

/* ---------------- utilitários ---------------- */
const $ = (s, r=document) => r.querySelector(s);
// O build.py oculta a seção #agenda quando config.js traz agendaAtiva:false
const AGENDA = !$("#agenda").hidden;
const $$ = (s, r=document) => [...r.querySelectorAll(s)];
const pad = n => String(n).padStart(2,"0");
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const MES = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
const MES3 = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
const WD = ["dom","seg","ter","qua","qui","sex","sáb"];
const WDL = ["domingo","segunda-feira","terça-feira","quarta-feira","quinta-feira","sexta-feira","sábado"];
const STATUS = { aguardando_pagamento:"Aguardando pagamento", confirmado:"Confirmado", realizado:"Realizado", cancelado:"Cancelado", expirado:"Reserva expirada" };

const fmtYMD = new Intl.DateTimeFormat("en-CA",{timeZone:TZ,year:"numeric",month:"2-digit",day:"2-digit"});
const fmtHM  = new Intl.DateTimeFormat("en-GB",{timeZone:TZ,hour:"2-digit",minute:"2-digit",hour12:false});
const todaySP = () => fmtYMD.format(new Date());
const spDate = iso => fmtYMD.format(new Date(iso));
const spTime = iso => fmtHM.format(new Date(iso));
const addDays = (ds,n) => { const d=new Date(ds+"T12:00:00Z"); d.setUTCDate(d.getUTCDate()+n); return d.toISOString().slice(0,10); };
const dowOf = ds => new Date(ds+"T12:00:00Z").getUTCDay();
const toISO = (ds,hm) => `${ds}T${hm}:00-03:00`;
const toMin = t => { const [h,m] = String(t).slice(0,5).split(":").map(Number); return h*60+m; };
const toHM = m => `${pad(Math.floor(m/60))}:${pad(m%60)}`;
const brDate = ds => { const [y,m,d]=ds.split("-"); return `${d}/${m}/${y}`; };
const longWhen = iso => { const ds=spDate(iso); return `${WDL[dowOf(ds)]}, ${brDate(ds)} às ${spTime(iso)}`; };
const money = v => (v===null||v===undefined||v==="") ? "[INSERIR VALOR]" : Number(v).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const plain = s => String(s||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toUpperCase();
const slug = s => plain(s).toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,30) || ("mod-"+Date.now());
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : "id-"+Math.random().toString(36).slice(2)+Date.now());

function toast(msg, err){
  const t=$("#toast"); t.textContent=msg; t.className="toast"+(err?" err":""); t.hidden=false;
  clearTimeout(toast._t); toast._t=setTimeout(()=>t.hidden=true, 3200);
}
async function busy(btn, fn){
  const old=btn?btn.innerHTML:null; if(btn){btn.disabled=true;btn.innerHTML=`<span class="spin"></span>`;}
  try { return await fn(); } finally { if(btn){btn.disabled=false;btn.innerHTML=old;} }
}
async function copyText(text, btn, input){
  try { await navigator.clipboard.writeText(text); const o=btn.textContent; btn.textContent="Copiado"; setTimeout(()=>btn.textContent=o,1600); }
  catch(e){ if(input){input.focus();input.select();} btn.textContent="Selecione e copie"; }
}
const maskCPF = v => v.replace(/\D/g,"").slice(0,11).replace(/(\d{3})(\d)/,"$1.$2").replace(/(\d{3})\.(\d{3})(\d)/,"$1.$2.$3").replace(/(\d{3})(\d{1,2})$/,"$1-$2");
const maskTel = v => { const d=v.replace(/\D/g,"").slice(0,11); if(d.length<=2) return d.length?`(${d}`:""; if(d.length<=6) return `(${d.slice(0,2)}) ${d.slice(2)}`; if(d.length<=10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`; return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`; };
function cpfOK(v){
  const c=String(v).replace(/\D/g,""); if(c.length!==11||/^(\d)\1+$/.test(c)) return false;
  for(const n of [9,10]){ let s=0; for(let i=0;i<n;i++) s+=Number(c[i])*(n+1-i); let r=(s*10)%11; if(r===10) r=0; if(r!==Number(c[n])) return false; }
  return true;
}
const emailOK = e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
const httpsOK = u => /^https:\/\/[^\s"'<>]+$/i.test(String(u||""));
const safeUrl = u => httpsOK(u) ? u : null;
const MAX_ATIVAS = 2;
const DEMO_CODE = "123456";
const RECEIPT_MAX = 5*1024*1024, RECEIPT_TYPES = ["image/jpeg","image/png","application/pdf"];

/* PIX (BR Code estático, padrão EMV do Banco Central) */
const emv = (id,v) => id+pad(v.length)+v;
function crc16(s){ let c=0xFFFF; for(let i=0;i<s.length;i++){ c^=s.charCodeAt(i)<<8; for(let j=0;j<8;j++) c=(c&0x8000)?((c<<1)^0x1021):(c<<1); c&=0xFFFF; } return c.toString(16).toUpperCase().padStart(4,"0"); }
function pixPayload(cfg, valor, txid){
  let s=emv("00","01")+emv("26",emv("00","br.gov.bcb.pix")+emv("01",cfg.pix_chave.trim()))+emv("52","0000")+emv("53","986");
  if(valor!=null && valor!=="") s+=emv("54",Number(valor).toFixed(2));
  s+=emv("58","BR")+emv("59",plain(cfg.pix_nome||"RECEBEDOR").slice(0,25))+emv("60",plain(cfg.pix_cidade||"CIDADE").slice(0,15))+emv("62",emv("05",String(txid).replace(/[^A-Za-z0-9]/g,"").slice(0,25)||"***"))+"6304";
  return s+crc16(s);
}
function payBlockHTML(cfg, bk, idp){
  const hasPix = !!(cfg.pix_chave && cfg.pix_chave.trim());
  const code = hasPix ? pixPayload(cfg, bk.valor, bk.protocolo) : "";
  return `
  <div class="tabs" role="tablist">
    <button role="tab" aria-selected="true" data-paytab="pix" data-p="${idp}">PIX</button>
    <button role="tab" aria-selected="false" data-paytab="card" data-p="${idp}">Cartão de crédito</button>
  </div>
  <div data-paypane="pix" data-p="${idp}">
    <div class="pix">
      <div class="qr ${hasPix?"":"empty"}" data-qr="${idp}" data-code="${esc(code)}">${hasPix?"":"QR Code gerado após<br>cadastrar a chave PIX"}</div>
      <div style="min-width:0;display:grid;gap:10px">
        <p class="note">No app do banco, escolha pagar com PIX e leia o QR Code, ou use o código copia e cola. Valor: <b>${esc(money(bk.valor))}</b>.</p>
        <div><label class="note" for="pc-${idp}">PIX copia e cola</label>
          <div class="code"><input id="pc-${idp}" readonly value="${esc(hasPix?code:"[INSERIR CHAVE PIX]")}"><button class="btn ghost sm" data-copy="pc-${idp}">Copiar</button></div></div>
        <p class="note">${hasPix?`Recebedor: ${esc(cfg.pix_nome)} · identificador ${esc(bk.protocolo)}`:`<span class="ph">Configuração pendente:</span> a chave PIX é cadastrada na Área do advogado.`}</p>
      </div>
    </div>
  </div>
  <div data-paypane="card" data-p="${idp}" hidden>
    <p class="note" style="margin-bottom:14px">O pagamento com cartão é feito no ambiente da operadora de pagamentos, em nova aba. Depois, envie o comprovante.</p>
    ${safeUrl(cfg.link_cartao) ? `<a class="btn" href="${esc(safeUrl(cfg.link_cartao))}" target="_blank" rel="noopener">Pagar com cartão</a>` : `<p class="note"><span class="ph">[INSERIR LINK DE PAGAMENTO]</span> O link é cadastrado na Área do advogado.</p>`}
  </div>
  <div class="field" style="margin-top:18px"><label for="rc-${idp}">Enviar comprovante (imagem ou PDF)</label><input type="file" id="rc-${idp}" data-receipt="${esc(bk.id)}" accept="image/jpeg,image/png,application/pdf"></div>
  <p class="note" role="status" data-rcmsg="${esc(bk.id)}">${bk.comprovante_path?"Comprovante já enviado. Você pode enviar outro, se precisar.":""}</p>`;
}
function hydratePay(root){
  $$("[data-qr]", root).forEach(el=>{ const code=el.dataset.code; if(code && window.QRCode && !el.dataset.done){ el.dataset.done="1"; el.innerHTML=""; try{ new QRCode(el,{text:code,width:160,height:160,colorDark:"#000000",colorLight:"#ffffff",correctLevel:QRCode.CorrectLevel.M}); }catch(e){ el.className="qr empty"; el.textContent="Use o copia e cola."; } } });
}
document.addEventListener("click", e=>{
  const t=e.target.closest("[data-paytab]"); if(t){ const p=t.dataset.p;
    $$(`[data-paytab][data-p="${p}"]`).forEach(b=>b.setAttribute("aria-selected", b===t));
    $$(`[data-paypane][data-p="${p}"]`).forEach(x=>x.hidden = x.dataset.paypane!==t.dataset.paytab); }
  const c=e.target.closest("[data-copy]"); if(c){ const i=document.getElementById(c.dataset.copy); copyText(i.value,c,i); }
});
document.addEventListener("change", async e=>{
  const f=e.target.closest("[data-receipt]"); if(!f||!f.files[0]) return;
  const id=f.dataset.receipt, msg=$(`[data-rcmsg="${CSS.escape(id)}"]`);
  if(!RECEIPT_TYPES.includes(f.files[0].type)){ if(msg) msg.textContent="Formato não aceito. Envie JPEG, PNG ou PDF."; return; }
  if(f.files[0].size>RECEIPT_MAX){ if(msg) msg.textContent="Arquivo acima de 5 MB. Envie uma imagem ou PDF menor."; return; }
  if(msg) msg.innerHTML=`<span class="spin"></span> Enviando…`;
  try{ await API.attachReceipt(id, f.files[0]); if(msg) msg.innerHTML=`<span class="ok-msg">Comprovante enviado. O escritório confere e confirma a consulta.</span>`; if(App.route==="cliente") Client.render(); }
  catch(err){ if(msg) msg.textContent=err.message; }
});

const App = { pub:null, busy:[], user:null, route:"" };

/* =====================================================================
   Camada de dados · modo demonstração
   ===================================================================== */
function DemoAPI(){
  const KEY="wb_demo_v2"; let db=null, me=null;
  const save=()=>{ try{ localStorage.setItem(KEY, JSON.stringify({db,me})); }catch(e){} };
  const clone=o=>JSON.parse(JSON.stringify(o));
  const receipts={};
  function seed(){
    const d={
      config:{ duracao_min:50, intervalo_min:10, antecedencia_horas:12, horizonte_dias:45, reserva_expira_horas:24, cancelamento_horas:24,
        whatsapp:"5522998285300", pix_chave:"", pix_nome:"WANDERSON C BARRADA", pix_cidade:"CANTAGALO", link_cartao:"",
        politica:"Remarcação ou cancelamento sem custo com até 24 horas de antecedência. Ausência sem aviso prévio não gera reembolso." },
      modalidades:[
        {id:"campos",nome:"Presencial · Campos",descricao:"Local informado na confirmação",tipo:"presencial",valor:300,ativo:true,ordem:1},
        {id:"cantagalo",nome:"Presencial · Cantagalo",descricao:"Local informado na confirmação",tipo:"presencial",valor:300,ativo:true,ordem:2},
        {id:"online",nome:"Online · videochamada",descricao:"Link da videochamada enviado após a confirmação",tipo:"online",valor:300,ativo:true,ordem:3}],
      disponibilidade:[], bloqueios:[], extras:[], users:[], agendamentos:[]
    };
    let n=1; const r=(m,dw,a,b)=>d.disponibilidade.push({id:n++,modalidade_id:m,dia_semana:dw,inicio:a,fim:b});
    [1,2,3,4,5].forEach(w=>r("campos",w,"14:30","18:30")); r("cantagalo",6,"09:00","13:00");
    [1,2,3,4].forEach(w=>r("online",w,"18:30","20:30")); r("online",6,"14:00","16:00");
    ["2026-10-12","2026-11-02","2026-11-15","2026-11-20","2026-12-25","2027-01-01"].forEach((x,i)=>d.bloqueios.push({id:i+1,data:x,modalidade_id:null,motivo:"Feriado nacional"}));
    d.users=[
      {id:"u-admin",email:"admin@demo.com",nome:"Wanderson Corrêa Barrada",cpf:"",telefone:"",admin:true},
      {id:"u-cli",email:"cliente@demo.com",nome:"Cliente de Exemplo",cpf:"529.982.247-25",telefone:"(22) 99999-0000"},
      {id:"u-ana",email:"ana@exemplo.com",nome:"Ana Exemplo",cpf:"111.444.777-35",telefone:"(22) 98888-1111"},
      {id:"u-car",email:"carlos@exemplo.com",nome:"Carlos Exemplo",cpf:"123.456.789-09",telefone:"(21) 97777-2222"}];
    const t=todaySP();
    const firstSlot=(mod,from)=>{ for(let i=from;i<from+30;i++){ const ds=addDays(t,i); const rr=d.disponibilidade.find(x=>x.modalidade_id===mod&&x.dia_semana===dowOf(ds)); if(rr && !d.bloqueios.some(b=>b.data===ds)) return toISO(ds,rr.inicio); } };
    const mk=(user,mod,iso,st,ex={})=>d.agendamentos.push(Object.assign({id:uid(),protocolo:"WB-EX-"+Math.random().toString(36).slice(2,7).toUpperCase(),cliente_id:user,modalidade_id:mod,inicio:iso,fim:new Date(Date.parse(iso)+50*60e3).toISOString(),assunto:"Servidor público (progressão, gratificações, férias)",parte_contraria:"",resumo:"Registro de exemplo do modo demonstração.",valor:d.modalidades.find(m=>m.id===mod).valor,forma_pagamento:"pix",status:st,comprovante_path:null,pago_informado_em:null,link_reuniao:null,obs_admin:null,created_at:new Date().toISOString()},ex));
    mk("u-cli","campos",firstSlot("campos",3),"confirmado",{assunto:"Execução contra a Fazenda (RPV, precatório, cálculos)",parte_contraria:"Município (exemplo)"});
    mk("u-cli","online",toISO(addDays(t,-12),"18:30"),"realizado",{assunto:"Previdenciário (INSS, BPC/LOAS)"});
    mk("u-ana","online",firstSlot("online",2),"aguardando_pagamento",{assunto:"Previdenciário (INSS, BPC/LOAS)",parte_contraria:"INSS",comprovante_path:"u-ana/comprovante-exemplo.pdf",pago_informado_em:new Date().toISOString()});
    mk("u-car","cantagalo",firstSlot("cantagalo",1),"confirmado",{assunto:"Tributário municipal (ISS, execução fiscal, protesto)",parte_contraria:"Município (exemplo)"});
    return d;
  }
  function load(){ try{ const raw=localStorage.getItem(KEY); if(raw){ const o=JSON.parse(raw); db=o.db; me=o.me; } }catch(e){} if(!db){ db=seed(); save(); } }
  load();
  const expireOld=()=>{ const lim=Date.now()-db.config.reserva_expira_horas*3600e3; db.agendamentos.forEach(a=>{ if(a.status==="aguardando_pagamento" && Date.parse(a.created_at)<lim) a.status="expirado"; }); };
  const user=()=>db.users.find(u=>u.id===me)||null;
  const pubUser=u=>u&&({id:u.id,email:u.email,nome:u.nome,cpf:u.cpf,telefone:u.telefone,isAdmin:!!u.admin});
  const needAdmin=()=>{ const u=user(); if(!u||!u.admin) throw new Error("Acesso restrito ao advogado."); };
  const wait=(v)=>new Promise(r=>setTimeout(()=>r(v),120));
  return {
    mode:"demo",
    async getPublicData(){ return clone({config:db.config, modalidades:db.modalidades.slice().sort((a,b)=>a.ordem-b.ordem), disponibilidade:db.disponibilidade, bloqueios:db.bloqueios, extras:db.extras}); },
    async getBusy(de,ate){ expireOld(); const a=Date.parse(de), b=Date.parse(ate); return db.agendamentos.filter(x=>["aguardando_pagamento","confirmado"].includes(x.status)&&Date.parse(x.inicio)<b&&Date.parse(x.fim)>a).map(x=>({inicio:x.inicio,fim:x.fim})); },
    async getUser(){ return pubUser(user()); },
    async sendCode({email,signup}){ const e=email.trim().toLowerCase(); if(!db.users.some(x=>x.email.toLowerCase()===e)){ if(!signup) throw new Error("Não encontramos cadastro com este e-mail. Use a opção Criar conta."); db.users.push({id:uid(),email:email.trim(),nome:"",cpf:"",telefone:""}); save(); } return wait(); },
    async verifyCode(email,code,signup){ if(code!==DEMO_CODE) throw new Error("Código incorreto ou expirado. Confira ou peça um novo."); const u=db.users.find(x=>x.email.toLowerCase()===email.trim().toLowerCase()); if(signup && !u.nome) Object.assign(u,signup); me=u.id; save(); return wait(pubUser(u)); },
    async signOut(){ me=null; save(); },
    async updateProfile(p){ const u=user(); Object.assign(u,{nome:p.nome,telefone:p.telefone,cpf:p.cpf??u.cpf}); save(); return wait(pubUser(u)); },
    async createBooking(o){
      const u=user(); if(!u) throw new Error("Faça login para agendar.");
      const c=db.config, m=db.modalidades.find(x=>x.id===o.modalidade_id&&x.ativo); if(!m) throw new Error("Modalidade indisponível.");
      expireOld();
      const pub=await this.getPublicData(); const ds=spDate(o.inicio), hm=spTime(o.inicio);
      if(!rawSlots(ds,o.modalidade_id,pub).includes(hm)) throw new Error("Horário não disponível na agenda.");
      if(Date.parse(o.inicio)<Date.now()+c.antecedencia_horas*3600e3) throw new Error(`Horário fora da antecedência mínima de ${c.antecedencia_horas} horas.`);
      const s=Date.parse(o.inicio), e=s+c.duracao_min*60e3;
      if(db.agendamentos.filter(x=>x.cliente_id===u.id&&["aguardando_pagamento","confirmado"].includes(x.status)&&Date.parse(x.fim)>Date.now()).length>=MAX_ATIVAS) throw new Error(`Você já tem ${MAX_ATIVAS} consultas ativas. Cancele uma delas ou fale com o escritório.`);
      if(db.agendamentos.some(x=>["aguardando_pagamento","confirmado"].includes(x.status)&&Date.parse(x.inicio)<e&&Date.parse(x.fim)>s)) throw new Error("Este horário acabou de ser reservado. Escolha outro.");
      const row={id:uid(),protocolo:`WB-${todaySP().replace(/-/g,"")}-${Math.random().toString(36).slice(2,7).toUpperCase()}`,cliente_id:u.id,modalidade_id:m.id,inicio:new Date(s).toISOString(),fim:new Date(e).toISOString(),assunto:o.assunto,parte_contraria:o.parte,resumo:o.resumo,valor:m.valor,forma_pagamento:o.forma||"pix",status:"aguardando_pagamento",comprovante_path:null,pago_informado_em:null,link_reuniao:null,obs_admin:null,created_at:new Date().toISOString()};
      db.agendamentos.push(row); save(); return wait(clone(row));
    },
    async myBookings(){ const u=user(); if(!u) return []; expireOld(); return clone(db.agendamentos.filter(a=>a.cliente_id===u.id).sort((a,b)=>b.inicio.localeCompare(a.inicio))).map(({obs_admin,...a})=>a); },
    async cancelBooking(id){ const u=user(); const a=db.agendamentos.find(x=>x.id===id&&x.cliente_id===u?.id); if(!a) throw new Error("Agendamento não encontrado.");
      if(!["aguardando_pagamento","confirmado"].includes(a.status)) throw new Error("Este agendamento não pode mais ser cancelado.");
      if(a.status==="confirmado"&&Date.parse(a.inicio)<Date.now()+db.config.cancelamento_horas*3600e3) throw new Error(`Cancelamento online só é possível com ${db.config.cancelamento_horas} horas de antecedência. Fale com o escritório.`);
      a.status="cancelado"; a.cancelado_por="cliente"; save(); return wait(clone(a)); },
    async attachReceipt(id,file){ const u=user(); const a=db.agendamentos.find(x=>x.id===id&&x.cliente_id===u?.id); if(!a) throw new Error("Agendamento não encontrado.");
      const path=`${u.id}/${id}-${Date.now()}-${file.name}`; receipts[path]=URL.createObjectURL(file); a.comprovante_path=path; a.pago_informado_em=new Date().toISOString(); save(); return wait(clone(a)); },
    async receiptUrl(path){ if(receipts[path]) return receipts[path]; throw new Error("No modo demonstração, só os comprovantes enviados nesta sessão podem ser abertos."); },
    async listBookings(){ needAdmin(); expireOld(); return clone(db.agendamentos.map(a=>{ const u=db.users.find(x=>x.id===a.cliente_id)||{}; return Object.assign({},a,{cliente:{nome:u.nome,cpf:u.cpf,telefone:u.telefone,email:u.email}}); })); },
    async updateBooking(id,patch){ needAdmin(); const a=db.agendamentos.find(x=>x.id===id); Object.assign(a,patch); save(); return wait(clone(a)); },
    async saveModalidade(m){ needAdmin(); const i=db.modalidades.findIndex(x=>x.id===m.id); if(i>=0) db.modalidades[i]=Object.assign(db.modalidades[i],m); else db.modalidades.push(m); save(); return wait(); },
    async saveDisponibilidade(mod,rows){ needAdmin(); db.disponibilidade=db.disponibilidade.filter(r=>r.modalidade_id!==mod); let n=Math.max(0,...db.disponibilidade.map(r=>r.id))+1; rows.forEach(r=>db.disponibilidade.push(Object.assign({id:n++,modalidade_id:mod},r))); save(); return wait(); },
    async addBloqueio(b){ needAdmin(); db.bloqueios.push(Object.assign({id:Date.now()},b)); save(); return wait(); },
    async delBloqueio(id){ needAdmin(); db.bloqueios=db.bloqueios.filter(b=>b.id!==id); save(); return wait(); },
    async addExtra(x){ needAdmin(); db.extras.push(Object.assign({id:Date.now()},x)); save(); return wait(); },
    async delExtra(id){ needAdmin(); db.extras=db.extras.filter(b=>b.id!==id); save(); return wait(); },
    async saveConfig(c){ needAdmin(); Object.assign(db.config,c); save(); return wait(); },
    async resetDemo(){ db=seed(); save(); }
  };
}

/* =====================================================================
   Camada de dados · Supabase
   ===================================================================== */
function SupabaseAPI(){
  const sb = window.supabase.createClient(SITE.supabaseUrl, SITE.supabaseAnonKey, { auth:{ flowType:"pkce", persistSession:true, detectSessionInUrl:true } });
  const chk = ({data,error}) => { if(error) throw new Error(friendly(error.message)); return data; };
  const friendly = m => /Token has expired|otp_expired|invalid.*token/i.test(m) ? "Código incorreto ou expirado. Confira ou peça um novo."
    : /Signups not allowed/i.test(m) ? "Não encontramos cadastro com este e-mail. Use a opção Criar conta."
    : /only request this after|rate limit/i.test(m) ? "Aguarde um minuto antes de pedir outro código."
    : /Error sending/i.test(m) ? "Não foi possível enviar o e-mail agora. Tente novamente em instantes ou fale com o escritório."
    : m;
  let cachedUser; const uidNow = async()=> (await sb.auth.getSession()).data.session?.user?.id;
  sb.auth.onAuthStateChange((ev)=>{ cachedUser=undefined;
    if(ev==="SIGNED_IN" || ev==="SIGNED_OUT"){ setTimeout(()=>{ if(App.pub) onAuthChanged(true); },0); } });
  return {
    mode:"supabase", sb,
    async getPublicData(){
      const t=addDays(todaySP(),-1);
      const [c,m,d,b,x] = await Promise.all([
        sb.from("configuracoes").select("*").eq("id",1).single(),
        sb.from("modalidades").select("*").order("ordem"),
        sb.from("disponibilidade").select("*"),
        sb.from("bloqueios").select("*").gte("data",t).order("data"),
        sb.from("horarios_extras").select("*").gte("data",t).order("data")]);
      return { config:chk(c), modalidades:chk(m), disponibilidade:chk(d), bloqueios:chk(b), extras:chk(x) };
    },
    async getBusy(de,ate){ return chk(await sb.rpc("horarios_ocupados",{p_de:de,p_ate:ate})) || []; },
    async getUser(){
      if(cachedUser!==undefined) return cachedUser;
      const s=(await sb.auth.getSession()).data.session; if(!s){ cachedUser=null; return null; }
      const p=chk(await sb.from("profiles").select("*").eq("id",s.user.id).maybeSingle())||{};
      const adm=chk(await sb.rpc("is_admin"));
      cachedUser={id:s.user.id,email:s.user.email,nome:p.nome||"",cpf:p.cpf||"",telefone:p.telefone||"",isAdmin:!!adm};
      return cachedUser;
    },
    async sendCode({email,signup}){ chk(await sb.auth.signInWithOtp({email:email.trim(),options:{shouldCreateUser:!!signup,emailRedirectTo:location.origin+location.pathname+"#cliente"}})); },
    async verifyCode(email,code,signup){
      chk(await sb.auth.verifyOtp({email:email.trim(),token:code,type:"email"}));
      // Nome, CPF e telefone só são gravados depois de confirmar o e-mail, e nunca sobrescrevem um cadastro existente
      if(signup){ const id=await uidNow(); chk(await sb.from("profiles").update(signup).eq("id",id).eq("nome","")); }
      cachedUser=undefined; return this.getUser();
    },
    async signOut(){ await sb.auth.signOut(); cachedUser=null; },
    async updateProfile(p){ const id=await uidNow(); chk(await sb.from("profiles").update({nome:p.nome,telefone:p.telefone,cpf:p.cpf}).eq("id",id)); cachedUser=undefined; return this.getUser(); },
    async createBooking(o){ return chk(await sb.rpc("criar_agendamento",{p_modalidade:o.modalidade_id,p_inicio:o.inicio,p_assunto:o.assunto,p_parte:o.parte||"",p_resumo:o.resumo,p_forma:o.forma||"pix"})); },
    async myBookings(){ const id=await uidNow(); if(!id) return []; return chk(await sb.from("agendamentos").select("*").eq("cliente_id",id).order("inicio",{ascending:false})); },
    async cancelBooking(id){ return chk(await sb.rpc("cancelar_agendamento",{p_id:id})); },
    async attachReceipt(id,file){
      const u=await uidNow(); const ext=(file.name.split(".").pop()||"bin").toLowerCase().replace(/[^a-z0-9]/g,"");
      const path=`${u}/${id}-${Date.now()}.${ext}`;
      chk(await sb.storage.from("comprovantes").upload(path,file,{upsert:false,contentType:file.type||undefined}));
      return chk(await sb.rpc("anexar_comprovante",{p_id:id,p_path:path}));
    },
    async receiptUrl(path){ return chk(await sb.storage.from("comprovantes").createSignedUrl(path,600)).signedUrl; },
    async listBookings(){
      const de=new Date(Date.now()-120*864e5).toISOString();
      const rows=chk(await sb.from("agendamentos").select("*, cliente:profiles(nome,cpf,telefone,email), nota:agendamento_notas(obs)").gte("inicio",de).order("inicio"));
      return rows.map(({nota,...a})=>Object.assign(a,{obs_admin:(Array.isArray(nota)?nota[0]:nota)?.obs??null}));
    },
    async updateBooking(id,patch){
      // Observações internas ficam em agendamento_notas, legível só pelo advogado
      if("obs_admin" in patch){ const {obs_admin,...rest}=patch; chk(await sb.from("agendamento_notas").upsert({agendamento_id:id,obs:obs_admin,updated_at:new Date().toISOString()})); if(!Object.keys(rest).length) return; patch=rest; }
      return chk(await sb.from("agendamentos").update(patch).eq("id",id).select().single());
    },
    async saveModalidade(m){ chk(await sb.from("modalidades").upsert(m)); },
    async saveDisponibilidade(mod,rows){
      chk(await sb.from("disponibilidade").delete().eq("modalidade_id",mod));
      if(rows.length) chk(await sb.from("disponibilidade").insert(rows.map(r=>Object.assign({modalidade_id:mod},r))));
    },
    async addBloqueio(b){ chk(await sb.from("bloqueios").insert(b)); },
    async delBloqueio(id){ chk(await sb.from("bloqueios").delete().eq("id",id)); },
    async addExtra(x){ chk(await sb.from("horarios_extras").insert(x)); },
    async delExtra(id){ chk(await sb.from("horarios_extras").delete().eq("id",id)); },
    async saveConfig(c){ chk(await sb.from("configuracoes").update(c).eq("id",1)); }
  };
}

const API = (SITE.supabaseUrl && SITE.supabaseAnonKey && window.supabase) ? SupabaseAPI() : DemoAPI();

/* =====================================================================
   Motor de horários (mesmas regras validadas no servidor)
   ===================================================================== */
function rawSlots(ds, mod, pub){
  const c=pub.config;
  if(pub.bloqueios.some(b=>b.data===ds && (!b.modalidade_id || b.modalidade_id===mod))) return [];
  if(ds > addDays(todaySP(), c.horizonte_dias)) return [];
  const ranges=[...pub.disponibilidade.filter(r=>r.modalidade_id===mod && Number(r.dia_semana)===dowOf(ds)),
                ...pub.extras.filter(e=>e.modalidade_id===mod && e.data===ds)];
  const step=c.duracao_min+c.intervalo_min, out=new Set();
  for(const r of ranges){ const a=toMin(r.inicio), b=toMin(r.fim); for(let t=a; t+c.duracao_min<=b; t+=step) out.add(toHM(t)); }
  return [...out].sort();
}
function slotsFor(ds, mod){
  const pub=App.pub, c=pub.config, minT=Date.now()+c.antecedencia_horas*3600e3;
  return rawSlots(ds,mod,pub).map(hm=>{
    const s=Date.parse(toISO(ds,hm)), e=s+c.duracao_min*60e3;
    if(s<minT) return null;
    return {time:hm, iso:toISO(ds,hm), busy: App.busy.some(x=>Date.parse(x.inicio)<e && Date.parse(x.fim)>s)};
  }).filter(Boolean);
}
const dayHasFree = (ds,mod) => slotsFor(ds,mod).some(s=>!s.busy);
function modTag(mod){
  const rows=App.pub.disponibilidade.filter(r=>r.modalidade_id===mod);
  const days=[...new Set(rows.map(r=>Number(r.dia_semana)))].sort();
  if(!days.length) return "horários avulsos";
  const lbl = days.join()==="1,2,3,4,5" ? "seg a sex" : days.map(d=>WD[d]).join(", ");
  return lbl;
}

/* =====================================================================
   Aplicação
   ===================================================================== */

async function refreshPublic(){
  App.pub = await API.getPublicData();
  const t=todaySP();
  App.busy = await API.getBusy(toISO(t,"00:00"), toISO(addDays(t,App.pub.config.horizonte_dias+2),"00:00"));
  const c=App.pub.config;
  const cd=$("#credDur"); if(cd) cd.textContent=`${c.duracao_min} min`;
  $("#faqPolicy").textContent=(c.politica||"")+" Cancelamentos e acompanhamento ficam na Área do cliente.";
  const telFmt = c.whatsapp ? c.whatsapp.replace(/^55(\d{2})(\d{4,5})(\d{4})$/,"($1) $2-$3") : "";
  $("#footTel").innerHTML = telFmt ? esc(telFmt) : `<span class="ph">[INSERIR WHATSAPP]</span>`;
  $("#ctTel").innerHTML = telFmt ? `<span style="user-select:all">${esc(telFmt)}</span>` : `<span class="ph">[INSERIR WHATSAPP]</span>`;
  $("#ctTelGo").innerHTML = c.whatsapp ? `<a href="https://wa.me/${esc(c.whatsapp)}" target="_blank" rel="noopener">Abrir conversa</a>` : `<a href="#whatsapp">Montar mensagem</a>`;
  waUpdate();
}

/* ---------------- assistente de WhatsApp (nada é gravado) ---------------- */
function waText(){
  const a=$("#waAssunto").value, l=$("#waLocal").value, p=$("#waPeriodo").value, n=$("#waNome").value.trim();
  if(!a) return "";
  return `Olá, Dr. Wanderson.${n?` Meu nome é ${n}.`:""} Gostaria de agendar uma consulta sobre ${a}, ${l}, de preferência ${p}. Vi o contato pelo site.`;
}
function waUpdate(){
  if(!$("#waForm") || !App.pub) return;
  const t=waText(), num=App.pub.config.whatsapp;
  $("#waPreview").value = t || "Escolha o assunto para montar a mensagem.";
  $("#waGo").innerHTML = !num ? `<span class="note"><span class="ph">[INSERIR WHATSAPP]</span> O número é cadastrado na Área do advogado.</span>`
    : t ? `<a class="btn" href="https://wa.me/${esc(num)}?text=${encodeURIComponent(t)}" target="_blank" rel="noopener">Abrir no WhatsApp</a>`
    : `<button type="button" class="btn" disabled>Abrir no WhatsApp</button>`;
}
["#waAssunto","#waLocal","#waPeriodo","#waNome"].forEach(id=>{ const el=$(id); if(el){ el.addEventListener("input",waUpdate); el.addEventListener("change",waUpdate); } });
$("#waForm").addEventListener("submit",e=>e.preventDefault());
$("#waCopy").onclick=e=>{ const t=waText(); if(!t){ $("#waMsg").textContent="Escolha o assunto antes de copiar."; return; } $("#waMsg").textContent=""; copyText(t,e.currentTarget,$("#waPreview")); };
document.addEventListener("click", e=>{ const b=e.target.closest("[data-copytext]"); if(b) copyText(b.dataset.copytext,b); });

/* ---------------- próximos horários (hero) ---------------- */
function renderNext(){
  const list=$("#nextList"); list.innerHTML="";
  const mods=App.pub.modalidades.filter(m=>m.ativo); const found=[]; const t=todaySP();
  for(let i=0;i<=App.pub.config.horizonte_dias && found.length<4;i++){
    const ds=addDays(t,i);
    for(const m of mods){ const f=slotsFor(ds,m.id).find(s=>!s.busy); if(f && found.length<4) found.push({ds,mod:m,slot:f}); }
  }
  for(const f of found){
    const li=document.createElement("li"); const b=document.createElement("button");
    b.innerHTML=`<span class="d">${brDate(f.ds).slice(0,5)}<br>${f.slot.time}</span><span><b style="font-weight:600;font-size:.92rem">${WDL[dowOf(f.ds)]}</b><br><span class="m">${esc(f.mod.nome)}</span></span><span class="go">Agendar ›</span>`;
    b.onclick=()=>{ W.mod=f.mod.id; W.date=f.ds; W.time=f.slot.time; W.month=f.ds.slice(0,7); renderMods();
      if(location.hash==="#agenda") $("#agenda").scrollIntoView({behavior:"smooth"}); else location.hash="agenda";
      if(W.area) goStep(2); else { goStep(1); $("#msg1").textContent="Horário pré-selecionado. Informe o assunto da consulta para continuar."; } };
    li.appendChild(b); list.appendChild(li);
  }
  if(!found.length) list.innerHTML=`<li class="muted" style="font-size:.9rem">Sem horários livres nos próximos dias.</li>`;
}

/* ---------------- agendamento (wizard) ---------------- */
const W = { step:1, mod:null, area:"", date:null, time:null, month:null, booking:null, authTab:"login" };

function goStep(n,noFocus){
  W.step=n;
  $$(".pane[data-step]").forEach(p=>p.hidden = Number(p.dataset.step)!==n);
  $$("#steps li").forEach((li,i)=>{ li.className = i+1===n?"on":(i+1<n?"done":""); });
  if(n===2) renderCal();
  if(n===3) renderAuthSlot();
  if(n===4) renderPayStep();
  if(n===5) renderDone();
  if(!noFocus){ const p=$(`.pane[data-step="${n}"]`), t=p.querySelector("h3")||p; t.tabIndex=-1; t.focus(); }
}
$$("[data-back]").forEach(b=>b.onclick=()=>goStep(Number(b.dataset.back)));

function renderMods(){
  const box=$("#modOpts"); box.innerHTML="";
  const mods=App.pub.modalidades.filter(m=>m.ativo);
  if(!mods.length){ box.innerHTML=`<p class="muted">Nenhuma modalidade disponível no momento.</p>`; return; }
  box.classList.remove("n1","n2"); if(mods.length<3) box.classList.add("n"+mods.length);
  for(const m of mods){
    const div=document.createElement("div"); div.className="opt";
    div.innerHTML=`<input type="radio" name="mod" id="mod-${esc(m.id)}" value="${esc(m.id)}" ${W.mod===m.id?"checked":""}><label for="mod-${esc(m.id)}"><span class="tag">${esc(modTag(m.id))} · ${m.tipo==="online"?"online":"presencial"}</span><b>${esc(m.nome)}</b><small>${esc(m.descricao||"")}</small></label>`;
    div.querySelector("input").onchange=()=>{ if(W.mod!==m.id){W.date=null;W.time=null;} W.mod=m.id; $("#msg1").textContent=""; };
    box.appendChild(div);
  }
}
$("#area").onchange=e=>{ W.area=e.target.value; $("#msg1").textContent=""; };
$("#to2").onclick=()=>{
  if(!W.mod) return $("#msg1").textContent="Escolha a modalidade de atendimento.";
  if(!W.area) return $("#msg1").textContent="Selecione o assunto da consulta.";
  $("#msg1").textContent=""; goStep(2);
};

function renderCal(){
  const m=App.pub.modalidades.find(x=>x.id===W.mod);
  $("#hint2").textContent=`${m.nome} · consulta de ${App.pub.config.duracao_min} minutos.`;
  const t=todaySP(), lim=addDays(t,App.pub.config.horizonte_dias);
  if(!W.month) W.month=t.slice(0,7);
  const [y,mo]=W.month.split("-").map(Number);
  $("#monthLbl").textContent=`${MES[mo-1]} ${y}`;
  $("#prevM").disabled = W.month<=t.slice(0,7);
  $("#nextM").disabled = W.month>=lim.slice(0,7);
  const cal=$("#cal"); cal.innerHTML=WD.map(w=>`<div class="wd">${w}</div>`).join("");
  const first=`${W.month}-01`;
  for(let i=0;i<dowOf(first);i++) cal.insertAdjacentHTML("beforeend","<span></span>");
  const days=new Date(Date.UTC(y,mo,0)).getUTCDate();
  for(let d=1; d<=days; d++){
    const ds=`${W.month}-${pad(d)}`; const b=document.createElement("button"); b.type="button"; b.textContent=d;
    if(ds>=t && dayHasFree(ds,W.mod)){ b.classList.add("av"); b.onclick=()=>{W.date=ds;W.time=null;renderCal();}; b.setAttribute("aria-label",`${d} de ${MES[mo-1]}, com horários livres`); }
    else b.disabled=true;
    if(ds===t) b.classList.add("today");
    if(W.date===ds) b.classList.add("sel");
    cal.appendChild(b);
  }
  renderSlots();
}
$("#prevM").onclick=()=>{ const [y,m]=W.month.split("-").map(Number); const d=new Date(Date.UTC(y,m-2,1)); W.month=d.toISOString().slice(0,7); renderCal(); };
$("#nextM").onclick=()=>{ const [y,m]=W.month.split("-").map(Number); const d=new Date(Date.UTC(y,m,1)); W.month=d.toISOString().slice(0,7); renderCal(); };
function renderSlots(){
  const g=$("#slotGrid"); g.innerHTML="";
  if(!W.date){ $("#dayLbl").textContent="Selecione um dia"; $("#daySub").textContent="Os dias marcados no calendário têm horários livres."; return; }
  $("#dayLbl").textContent=`${WDL[dowOf(W.date)]}, ${Number(W.date.slice(8))} de ${MES[Number(W.date.slice(5,7))-1]}`;
  const sl=slotsFor(W.date,W.mod);
  $("#daySub").textContent=`${sl.filter(s=>!s.busy).length} horário(s) livre(s). Horários riscados já estão ocupados.`;
  for(const s of sl){
    const b=document.createElement("button"); b.type="button"; b.textContent=s.time; b.disabled=s.busy;
    if(W.time===s.time) b.classList.add("sel");
    b.onclick=()=>{W.time=s.time;$("#msg2").textContent="";renderSlots();};
    g.appendChild(b);
  }
}
$("#to3").onclick=()=>{ if(!W.date||!W.time) return $("#msg2").textContent="Escolha um dia e um horário."; goStep(3); };

/* ----- formulário de acesso reutilizável ----- */
const AuthFlow = {}; // prefixo do formulário -> dados do código já enviado
function authFormHTML(prefix, tab, opts={}){
  const signup = tab==="signup", sent = AuthFlow[prefix];
  if(sent) return `
  <form data-authform="${prefix}" data-mode="code" novalidate>
    <p class="note">Enviamos um código para <b>${esc(sent.email)}</b>. Se não chegar em instantes, confira a caixa de spam.${API.mode==="demo"?` No modo demonstração, use <code>${DEMO_CODE}</code>.`:""}</p>
    <div class="field"><label for="${prefix}-codigo">Código recebido por e-mail</label><input id="${prefix}-codigo" inputmode="numeric" autocomplete="one-time-code" maxlength="10"></div>
    ${opts.inline?"":`<button class="btn" type="submit">Entrar</button>`}
    <p class="msg" role="alert" data-authmsg="${prefix}" style="margin:0"></p>
    <div style="display:flex;flex-wrap:wrap;gap:8px 18px"><button type="button" class="linkbtn" data-authresend="${prefix}">Reenviar código</button><button type="button" class="linkbtn" data-authback="${prefix}">Usar outro e-mail</button></div>
  </form>`;
  return `
  ${opts.noTabs?"":`<div class="tabs" role="tablist" style="margin:0">
    <button role="tab" aria-selected="${!signup}" data-authtab="login" data-pfx="${prefix}">Já tenho cadastro</button>
    <button role="tab" aria-selected="${signup}" data-authtab="signup" data-pfx="${prefix}">Criar conta</button>
  </div>`}
  <form data-authform="${prefix}" data-mode="${tab}" novalidate>
    ${signup?`
    <div class="fgrid">
      <div class="field full"><label for="${prefix}-nome">Nome completo</label><input id="${prefix}-nome" autocomplete="name"></div>
      <div class="field"><label for="${prefix}-cpf">CPF</label><input id="${prefix}-cpf" inputmode="numeric" placeholder="000.000.000-00" maxlength="14" data-mask="cpf"></div>
      <div class="field"><label for="${prefix}-tel">WhatsApp</label><input id="${prefix}-tel" inputmode="tel" placeholder="(22) 90000-0000" maxlength="15" data-mask="tel"></div>
    </div>`:""}
    <div class="field"><label for="${prefix}-email">E-mail</label><input id="${prefix}-email" type="email" autocomplete="email"></div>
    <p class="note">Enviaremos um código de acesso para este e-mail. Não é preciso criar senha.</p>
    ${opts.inline?"":`<button class="btn" type="submit">Receber código</button>`}
    <p class="msg" role="alert" data-authmsg="${prefix}" style="margin:0"></p>
  </form>`;
}
function rerenderAuth(p){ return p==="wz" ? renderAuthSlot() : p==="cl" ? Client.render() : Admin.render(); }
document.addEventListener("input", e=>{
  const m=e.target.dataset && e.target.dataset.mask;
  if(m==="cpf") e.target.value=maskCPF(e.target.value);
  if(m==="tel") e.target.value=maskTel(e.target.value);
});
document.addEventListener("click", e=>{
  const t=e.target.closest("[data-authtab]"); if(!t) return;
  const p=t.dataset.pfx, tab=t.dataset.authtab;
  if(p==="wz"){ W.authTab=tab; renderAuthSlot(); }
  if(p==="cl"){ Client.authTab=tab; Client.render(); }
});
document.addEventListener("click", async e=>{
  const back=e.target.closest("[data-authback]");
  if(back){ const p=back.dataset.authback; delete AuthFlow[p]; await rerenderAuth(p); $(`#${p}-email`)?.focus(); return; }
  const re=e.target.closest("[data-authresend]"); if(!re) return;
  const p=re.dataset.authresend, msg=$(`[data-authmsg="${p}"]`); msg.textContent="";
  try{ await busy(re,()=>API.sendCode(AuthFlow[p])); msg.innerHTML=`<span class="ok-msg">Novo código enviado.</span>`; }catch(err){ msg.textContent=err.message; }
});
async function doAuth(prefix, mode){
  const v=id=>($(`#${prefix}-${id}`)?.value||"").trim();
  if(mode==="code"){
    const code=v("codigo").replace(/\s/g,"");
    if(!/^\d{6,10}$/.test(code)) throw new Error("Informe o código recebido por e-mail.");
    const user=await API.verifyCode(AuthFlow[prefix].email,code,AuthFlow[prefix].signup);
    delete AuthFlow[prefix]; return {user};
  }
  const email=v("email");
  if(!emailOK(email)) throw new Error("Informe um e-mail válido.");
  if(mode==="login"){ await API.sendCode({email}); AuthFlow[prefix]={email}; return {codeSent:true}; }
  const nome=v("nome"), cpf=v("cpf"), tel=v("tel");
  if(nome.split(/\s+/).length<2) throw new Error("Informe nome e sobrenome.");
  if(!cpfOK(cpf)) throw new Error("CPF inválido. Confira os 11 dígitos.");
  if(tel.replace(/\D/g,"").length<10) throw new Error("Informe o WhatsApp com DDD.");
  const signup={nome,cpf,telefone:tel};
  await API.sendCode({email,signup}); AuthFlow[prefix]={email,signup};
  return {codeSent:true};
}
document.addEventListener("submit", async e=>{
  const f=e.target.closest("[data-authform]"); if(!f) return; e.preventDefault();
  const p=f.dataset.authform, msg=$(`[data-authmsg="${p}"]`); msg.textContent="";
  // Na agenda, o código confirma o acesso e já conclui a reserva
  if(p==="wz" && f.dataset.mode==="code"){ $("#to4").click(); return; }
  const btn=f.querySelector("button[type=submit]");
  try{
    const r=await busy(btn, ()=>doAuth(p, f.dataset.mode));
    if(r.codeSent){ await rerenderAuth(p); $(`#${p}-codigo`)?.focus(); return; }
    App.user=r.user; onAuthChanged();
  }catch(err){ msg.textContent=err.message; }
});

async function renderAuthSlot(){
  const slot=$("#authSlot"); App.user=await API.getUser();
  if(App.user){
    slot.innerHTML=`<div class="logged-as"><span>Agendando como <b>${esc(App.user.nome||App.user.email)}</b> · ${esc(App.user.email)}</span><button class="linkbtn" id="wzOut">Não é você? Sair</button></div>`;
    $("#wzOut").onclick=async()=>{ await API.signOut(); App.user=null; onAuthChanged(); };
  } else {
    slot.innerHTML=`<div class="auth-inline">${authFormHTML("wz", W.authTab, {inline:true})}</div>`;
  }
}

$("#to4").onclick=async e=>{
  const msg=$("#msg3"); msg.textContent="";
  const resumo=$("#resumo").value.trim();
  if(resumo.length<20) return msg.textContent="Descreva o caso em pelo menos uma frase no resumo.";
  if(!$("#lgpd").checked) return msg.textContent="Para continuar, confirme que leu a Política de Privacidade.";
  await busy(e.currentTarget, async()=>{
    try{
      if(!App.user){
        const form=$("[data-authform=wz]"); const am=$("[data-authmsg=wz]"); am.textContent="";
        let r; try{ r=await doAuth("wz", form.dataset.mode); }catch(err){ am.textContent=err.message; msg.textContent="Confira os dados de acesso."; return; }
        if(r.codeSent){ await renderAuthSlot(); $("#wz-codigo")?.focus(); msg.innerHTML=`Digite o código recebido por e-mail e confirme novamente. <b>O horário ainda não está reservado.</b>`; return; }
        App.user=r.user; onAuthChanged(true);
      }
      W.booking = await API.createBooking({ modalidade_id:W.mod, inicio:toISO(W.date,W.time), assunto:W.area, parte:$("#parte").value.trim(), resumo, forma:"pix" });
      await refreshPublic(); renderNext();
      goStep(4);
    }catch(err){
      msg.textContent=err.message;
      if(/reservado|disponível|antecedência|Data/i.test(err.message)){ await refreshPublic(); W.time=null; goStep(2); $("#msg2").textContent=err.message; }
    }
  });
};

function summaryHTML(bk){
  const m=App.pub.modalidades.find(x=>x.id===bk.modalidade_id)||{nome:bk.modalidade_id};
  return `<div><dt>Protocolo</dt><dd class="mono">${esc(bk.protocolo)}</dd></div>
  <div><dt>Atendimento</dt><dd>${esc(m.nome)}</dd></div>
  <div><dt>Data</dt><dd>${esc(longWhen(bk.inicio))}</dd></div>
  <div><dt>Assunto</dt><dd>${esc(bk.assunto||"")}</dd></div>
  <div class="total"><dt>Valor da consulta</dt><dd>${esc(money(bk.valor))}</dd></div>`;
}
function renderPayStep(){
  const bk=W.booking, c=App.pub.config;
  $("#hint4").textContent=`Horário reservado. Para a confirmação, conclua o pagamento da consulta. Sem ele, a reserva expira em ${c.reserva_expira_horas} horas.`;
  $("#sum4").innerHTML=summaryHTML(bk);
  $("#payBox").innerHTML=payBlockHTML(c,bk,"wz");
  hydratePay($("#payBox"));
}
$("#to5").onclick=()=>goStep(5);
$("#payLater").onclick=()=>goStep(5);
function gcalLink(bk){
  const f=iso=>{ const ds=spDate(iso).replace(/-/g,""); return `${ds}T${spTime(iso).replace(":","")}00`; };
  const m=App.pub.modalidades.find(x=>x.id===bk.modalidade_id)||{};
  const loc = m.tipo==="online" ? "Videochamada (link na Área do cliente)" : (m.descricao||"");
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent("Consulta jurídica · Barrada Advogado")}&dates=${f(bk.inicio)}/${f(bk.fim)}&ctz=${TZ}&details=${encodeURIComponent("Protocolo "+bk.protocolo)}&location=${encodeURIComponent(loc)}`;
}
function renderDone(){
  const bk=W.booking, c=App.pub.config;
  $("#proto").textContent=bk.protocolo;
  $("#sum5").innerHTML=summaryHTML(bk);
  $("#txt5").textContent=`O escritório confere a reserva e confirma a consulta. Você acompanha o status, envia o comprovante e ${App.pub.modalidades.find(x=>x.id===bk.modalidade_id)?.tipo==="online"?"recebe o link da videochamada":"consulta o endereço"} na Área do cliente.`;
  $("#policy").textContent=c.politica||"";
  $("#gcal").href=gcalLink(bk);
  const txt=encodeURIComponent(`Olá. Agendei uma consulta pelo site. Protocolo ${bk.protocolo}, ${longWhen(bk.inicio)}. Segue o comprovante de pagamento.`);
  $("#waAction").innerHTML = c.whatsapp ? `<a class="btn ghost" href="https://wa.me/${esc(c.whatsapp)}?text=${txt}" target="_blank" rel="noopener">Enviar comprovante pelo WhatsApp</a>` : "";
}
$("#restart").onclick=()=>{ Object.assign(W,{mod:null,area:"",date:null,time:null,month:null,booking:null}); $("#area").value=""; $("#parte").value=""; $("#resumo").value=""; $("#lgpd").checked=false; renderMods(); goStep(1); };

/* =====================================================================
   Área do cliente
   ===================================================================== */
const Client = {
  tab:"consultas", authTab:"login", confirmCancel:null, openPay:null,
  async render(){
    const root=$("#clientRoot"); App.user=await API.getUser();
    if(!App.user){
      root.innerHTML=`<div class="app-head"><div><p class="eyebrow"><b>§</b>Área do cliente</p><h1>Entre para acompanhar suas consultas</h1><p class="who">Veja o status, envie comprovantes, acesse o link da videochamada e cancele quando precisar.</p></div></div>
      <div class="auth-card">${authFormHTML("cl", this.authTab)}</div>`;
      return;
    }
    root.innerHTML=`<div class="app-head"><div><p class="eyebrow"><b>§</b>Área do cliente</p><h1>Olá, ${esc((App.user.nome||"").split(" ")[0]||"cliente")}</h1><p class="who">${esc(App.user.email)}</p></div>
      <div class="btns">${AGENDA?`<a class="btn sm" href="#agenda">Nova consulta</a>`:""}${App.user.isAdmin?`<a class="btn ghost sm" href="#admin">Área do advogado</a>`:""}<button class="btn ghost sm" id="clOut">Sair</button></div></div>
      <div class="subtabs" role="tablist"><button role="tab" data-ctab="consultas" aria-selected="${this.tab==="consultas"}">Minhas consultas</button><button role="tab" data-ctab="dados" aria-selected="${this.tab==="dados"}">Meus dados</button></div>
      <div id="clBody"><p class="loading-note"><span class="spin"></span> Carregando</p></div>`;
    $("#clOut").onclick=async()=>{ await API.signOut(); App.user=null; onAuthChanged(); };
    $$("[data-ctab]").forEach(b=>b.onclick=()=>{ this.tab=b.dataset.ctab; this.render(); });
    if(this.tab==="dados") return this.renderDados();
    const list=await API.myBookings(); const c=App.pub.config; const now=Date.now();
    const upcoming=list.filter(a=>Date.parse(a.fim)>=now && ["aguardando_pagamento","confirmado"].includes(a.status)).sort((a,b)=>a.inicio.localeCompare(b.inicio));
    const past=list.filter(a=>!upcoming.includes(a));
    const card=a=>{
      const m=App.pub.modalidades.find(x=>x.id===a.modalidade_id)||{nome:a.modalidade_id};
      const ds=spDate(a.inicio); const isUp=upcoming.includes(a);
      const canCancel = a.status==="aguardando_pagamento" || (a.status==="confirmado" && Date.parse(a.inicio)>now+c.cancelamento_horas*3600e3);
      let acts="";
      if(isUp){
        if(a.status==="aguardando_pagamento") acts+=`<button class="btn sm" data-act="pay" data-id="${a.id}">${this.openPay===a.id?"Ocultar pagamento":"Pagar ou enviar comprovante"}</button>`;
        if(a.status==="confirmado" && m.tipo==="online") acts+= safeUrl(a.link_reuniao) ? `<a class="btn sm" href="${esc(safeUrl(a.link_reuniao))}" target="_blank" rel="noopener">Entrar na videochamada</a>` : `<span class="note">O link da videochamada aparece aqui antes do horário.</span>`;
        acts+=`<a class="btn ghost sm" href="${gcalLink(a)}" target="_blank" rel="noopener">Google Agenda</a>`;
        if(canCancel) acts+= this.confirmCancel===a.id ? `<span class="confirm-row">Cancelar esta consulta? <button class="btn danger sm" data-act="cancel-yes" data-id="${a.id}">Sim, cancelar</button><button class="btn ghost sm" data-act="cancel-no">Não</button></span>` : `<button class="btn ghost sm" data-act="cancel" data-id="${a.id}">Cancelar</button>`;
        else if(a.status==="confirmado") acts+=`<span class="note">Para cancelar com menos de ${c.cancelamento_horas} horas, fale com o escritório.</span>`;
      }
      return `<article class="bk ${isUp?"":"past"}">
        <div class="when"><div class="d">${Number(ds.slice(8))}</div><div class="m">${MES3[Number(ds.slice(5,7))-1]} ${ds.slice(0,4)}</div><div class="h">${spTime(a.inicio)}</div></div>
        <div class="info"><b>${esc(m.nome)}</b><small>${esc(a.assunto||"")}</small><small>Protocolo <span class="mono" style="font-family:var(--mono)">${esc(a.protocolo)}</span>${a.comprovante_path?" · comprovante enviado":""}</small>${a.status==="confirmado"&&m.tipo!=="online"&&m.descricao?`<small>Local: ${esc(m.descricao)}</small>`:""}</div>
        <div class="right"><span class="pill ${a.status}">${STATUS[a.status]||a.status}</span><span class="val">${esc(money(a.valor))}</span></div>
        ${acts?`<div class="acts">${acts}</div>`:""}
        ${this.openPay===a.id?`<div class="extra"><div class="inline-pay">${payBlockHTML(c,a,"cl-"+a.id.slice(0,8))}</div></div>`:""}
      </article>`;
    };
    $("#clBody").innerHTML = `
      <h2 style="margin-bottom:14px">Próximas consultas</h2>
      ${upcoming.length?`<div class="bk-list">${upcoming.map(card).join("")}</div>`:`<div class="empty"><span>Nenhuma consulta agendada.</span>${AGENDA?`<a class="btn sm" href="#agenda">Agendar consulta</a>`:`<a class="btn sm" href="#whatsapp">Falar pelo WhatsApp</a>`}</div>`}
      ${past.length?`<h2 style="margin:36px 0 14px">Histórico</h2><div class="bk-list">${past.map(card).join("")}</div>`:""}`;
    hydratePay($("#clBody"));
    $$("[data-act]", $("#clBody")).forEach(b=>b.onclick=async()=>{
      const id=b.dataset.id, act=b.dataset.act;
      if(act==="pay"){ this.openPay = this.openPay===id?null:id; return this.render(); }
      if(act==="cancel"){ this.confirmCancel=id; return this.render(); }
      if(act==="cancel-no"){ this.confirmCancel=null; return this.render(); }
      if(act==="cancel-yes"){ try{ await busy(b,()=>API.cancelBooking(id)); toast("Consulta cancelada."); this.confirmCancel=null; await refreshPublic(); renderNext(); this.render(); }catch(err){ toast(err.message,true); } }
    });
  },
  renderDados(){
    const u=App.user;
    $("#clBody").innerHTML=`<form id="pfForm" class="auth-card" style="max-width:560px" novalidate>
      <div class="field"><label for="pf-nome">Nome completo</label><input id="pf-nome" value="${esc(u.nome)}"></div>
      <div class="fgrid">
        <div class="field"><label for="pf-cpf">CPF</label><input id="pf-cpf" data-mask="cpf" maxlength="14" value="${esc(u.cpf)}"></div>
        <div class="field"><label for="pf-tel">WhatsApp</label><input id="pf-tel" data-mask="tel" maxlength="15" value="${esc(u.telefone)}"></div>
      </div>
      <div class="field"><label for="pf-email">E-mail</label><input id="pf-email" value="${esc(u.email)}" disabled></div>
      <button class="btn" type="submit" style="width:max-content">Salvar dados</button><p class="msg" role="alert" id="pfMsg" style="margin:0"></p></form>`;
    $("#pfForm").onsubmit=async e=>{ e.preventDefault(); const nome=$("#pf-nome").value.trim(), cpf=$("#pf-cpf").value, tel=$("#pf-tel").value;
      if(nome.split(/\s+/).length<2) return $("#pfMsg").textContent="Informe nome e sobrenome.";
      if(cpf && !cpfOK(cpf)) return $("#pfMsg").textContent="CPF inválido.";
      try{ App.user=await busy(e.submitter,()=>API.updateProfile({nome,cpf,telefone:tel})); toast("Dados salvos."); $("#pfMsg").textContent=""; }catch(err){ $("#pfMsg").textContent=err.message; } };
  }
};

/* =====================================================================
   Área do advogado
   ===================================================================== */
const Admin = {
  tab:"agendamentos", filter:"proximos", q:"", open:null, confirm:null, modSel:null, rows:null, week:null,
  async render(){
    const root=$("#adminRoot"); App.user=await API.getUser();
    if(!App.user){
      root.innerHTML=`<div class="app-head"><div><p class="eyebrow"><b>§</b>Área do advogado</p><h1>Acesso restrito</h1><p class="who">Entre com a conta de administrador do escritório.</p></div></div>
      <div class="auth-card">${authFormHTML("ad","login",{noTabs:true})}</div>`;
      return;
    }
    if(!App.user.isAdmin){
      root.innerHTML=`<div class="app-head"><div><p class="eyebrow"><b>§</b>Área do advogado</p><h1>Acesso restrito</h1><p class="who">A conta ${esc(App.user.email)} não tem permissão de administrador.</p></div><div class="btns"><a class="btn ghost sm" href="#cliente">Ir para a Área do cliente</a><button class="btn ghost sm" id="adOut">Sair</button></div></div>`;
      $("#adOut").onclick=async()=>{ await API.signOut(); App.user=null; onAuthChanged(); };
      return;
    }
    const T=[["agendamentos","Agendamentos"],["agenda","Agenda e horários"],["valores","Modalidades e valores"],["config","Configurações"]];
    root.innerHTML=`<div class="app-head"><div><p class="eyebrow"><b>§</b>Área do advogado</p><h1>Painel do escritório</h1><p class="who">${esc(App.user.nome||App.user.email)}</p></div>
      <div class="btns"><a class="btn ghost sm" href="${AGENDA?"#agenda":"#inicio"}">${AGENDA?"Ver agenda pública":"Ver o site"}</a><button class="btn ghost sm" id="adOut">Sair</button></div></div>
      <div class="subtabs" role="tablist">${T.map(([k,l])=>`<button role="tab" data-atab="${k}" aria-selected="${this.tab===k}">${l}</button>`).join("")}</div>
      <div id="adBody"><p class="loading-note"><span class="spin"></span> Carregando</p></div>`;
    $("#adOut").onclick=async()=>{ await API.signOut(); App.user=null; onAuthChanged(); };
    $$("[data-atab]").forEach(b=>b.onclick=()=>{ this.tab=b.dataset.atab; this.week=null; this.render(); });
    try{ await this["tab_"+this.tab](); }catch(err){ $("#adBody").innerHTML=`<p class="msg" role="alert">${esc(err.message)}</p>`; }
  },

  /* ----- agendamentos ----- */
  async tab_agendamentos(){
    this.rows = await API.listBookings();
    this.drawBookings();
  },
  drawBookings(){
    const now=Date.now(), t=todaySP(), rows=this.rows||[];
    const active=a=>["aguardando_pagamento","confirmado"].includes(a.status);
    const st={ hoje: rows.filter(a=>active(a)&&spDate(a.inicio)===t).length,
      pend: rows.filter(a=>a.status==="aguardando_pagamento").length,
      conf7: rows.filter(a=>a.status==="confirmado"&&Date.parse(a.inicio)>=now&&Date.parse(a.inicio)<now+7*864e5).length,
      comp: rows.filter(a=>a.status==="aguardando_pagamento"&&a.comprovante_path).length };
    const F={proximos:["Próximos",a=>active(a)&&Date.parse(a.fim)>=now],aguardando_pagamento:["Aguardando pagamento",a=>a.status==="aguardando_pagamento"],confirmado:["Confirmados",a=>a.status==="confirmado"],historico:["Histórico",a=>!active(a)||Date.parse(a.fim)<now],todos:["Todos",()=>true]};
    const q=this.q.toLowerCase();
    let list=rows.filter(F[this.filter][1]).filter(a=>!q||[a.protocolo,a.cliente?.nome,a.cliente?.email,a.cliente?.cpf,a.assunto].join(" ").toLowerCase().includes(q));
    list.sort((a,b)=> this.filter==="historico" ? b.inicio.localeCompare(a.inicio) : a.inicio.localeCompare(b.inicio));
    const modName=id=>(App.pub.modalidades.find(m=>m.id===id)||{nome:id}).nome;
    const det=a=>{
      const c=a.cliente||{}; const m=App.pub.modalidades.find(x=>x.id===a.modalidade_id)||{};
      let btns="";
      if(a.status==="aguardando_pagamento") btns+=`<button class="btn sm" data-b="confirm" data-id="${a.id}">Confirmar pagamento</button>`;
      if(a.status==="confirmado") btns+=`<button class="btn ghost sm" data-b="done" data-id="${a.id}">Marcar como realizada</button>`;
      if(active(a)) btns+= this.confirm===a.id ? `<span class="confirm-row">Cancelar? <button class="btn danger sm" data-b="cancel-yes" data-id="${a.id}">Sim, cancelar</button><button class="btn ghost sm" data-b="cancel-no">Não</button></span>` : `<button class="btn ghost sm" data-b="cancel" data-id="${a.id}">Cancelar agendamento</button>`;
      return `<tr class="det"><td colspan="6"><div class="det-grid">
        <dl><dt>Cliente</dt><dd>${esc(c.nome)}<br>CPF ${esc(c.cpf||"—")}<br>${esc(c.telefone||"")}${c.telefone?` · <a href="https://wa.me/55${esc(String(c.telefone).replace(/\D/g,""))}" target="_blank" rel="noopener">WhatsApp</a>`:""}<br>${esc(c.email||"")}</dd>
            <dt>Parte contrária</dt><dd>${esc(a.parte_contraria||"—")}</dd></dl>
        <dl><dt>Protocolo</dt><dd class="mono" style="font-family:var(--mono)">${esc(a.protocolo)}</dd>
            <dt>Pagamento</dt><dd>${esc(money(a.valor))} · ${a.comprovante_path?`comprovante enviado${a.pago_informado_em?" em "+brDate(spDate(a.pago_informado_em))+" "+spTime(a.pago_informado_em):""} · <button class="linkbtn" data-b="rc" data-path="${esc(a.comprovante_path)}" data-id="${a.id}">abrir comprovante</button><span data-rclink="${a.id}"></span>`:"sem comprovante"}</dd>
            <dt>Reservado em</dt><dd>${brDate(spDate(a.created_at))} ${spTime(a.created_at)}</dd></dl>
        <dl class="full"><dt>Resumo do caso</dt><dd>${esc(a.resumo||"—")}</dd></dl>
        ${m.tipo==="online"?`<div class="full field"><label for="lk-${a.id}">Link da videochamada (aparece para o cliente)</label><div class="row-form"><input id="lk-${a.id}" value="${esc(a.link_reuniao||"")}" placeholder="https://meet.google.com/…"><button class="btn ghost sm" data-b="link" data-id="${a.id}">Salvar link</button></div></div>`:""}
        <div class="full field"><label for="ob-${a.id}">Observações internas (não aparecem para o cliente)</label><div class="row-form"><textarea id="ob-${a.id}" rows="2">${esc(a.obs_admin||"")}</textarea><button class="btn ghost sm" data-b="obs" data-id="${a.id}">Salvar</button></div></div>
        <div class="full" style="display:flex;flex-wrap:wrap;gap:8px;align-items:center">${btns}</div>
      </div></td></tr>`;
    };
    $("#adBody").innerHTML=`
      <div class="stats"><div><b>${st.hoje}</b><span>consultas hoje</span></div><div><b>${st.pend}</b><span>aguardando pagamento</span></div><div><b>${st.comp}</b><span>comprovantes a conferir</span></div><div><b>${st.conf7}</b><span>confirmadas nos próximos 7 dias</span></div></div>
      <div class="toolbar"><div class="chips">${Object.entries(F).map(([k,[l]])=>`<button data-f="${k}" aria-pressed="${this.filter===k}">${l}</button>`).join("")}</div>
        <input type="search" id="adQ" placeholder="Buscar nome, CPF ou protocolo" value="${esc(this.q)}"></div>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Data</th><th>Cliente</th><th>Modalidade</th><th>Assunto</th><th>Valor</th><th>Status</th></tr></thead><tbody>
      ${list.length?list.map(a=>`<tr class="row ${this.open===a.id?"open":""}" data-row="${a.id}"><td class="mono"><button type="button" class="rowbtn" data-rowbtn aria-expanded="${this.open===a.id}" aria-label="${esc(`${brDate(spDate(a.inicio))} ${spTime(a.inicio)}, ${a.cliente?.nome||""}: detalhes do agendamento`)}">${brDate(spDate(a.inicio))}<br>${spTime(a.inicio)}</button></td><td>${esc(a.cliente?.nome||"")}${a.comprovante_path&&a.status==="aguardando_pagamento"?`<br><small style="color:var(--warn)">comprovante enviado</small>`:""}</td><td>${esc(modName(a.modalidade_id))}</td><td>${esc(a.assunto||"")}</td><td class="mono">${esc(money(a.valor))}</td><td><span class="pill ${a.status}">${STATUS[a.status]||a.status}</span></td></tr>${this.open===a.id?det(a):""}`).join(""):`<tr><td colspan="6" class="muted" style="padding:28px 14px;text-align:center">Nenhum agendamento neste filtro.</td></tr>`}
      </tbody></table></div>`;
    $$("[data-f]").forEach(b=>b.onclick=()=>{ this.filter=b.dataset.f; this.drawBookings(); });
    const q_=$("#adQ"); q_.oninput=()=>{ this.q=q_.value; const pos=q_.selectionStart; this.drawBookings(); const n=$("#adQ"); n.focus(); n.setSelectionRange(pos,pos); };
    $$("[data-row]").forEach(r=>r.onclick=()=>{ const id=r.dataset.row; this.open = this.open===id?null:id; this.confirm=null; this.drawBookings(); $(`[data-row="${CSS.escape(id)}"] [data-rowbtn]`)?.focus(); });
    $$("[data-b]").forEach(b=>b.onclick=async ev=>{
      ev.stopPropagation(); const id=b.dataset.id, k=b.dataset.b;
      const upd=async(patch,okMsg)=>{ try{ await busy(b,()=>API.updateBooking(id,patch)); toast(okMsg); this.rows=await API.listBookings(); await refreshPublic(); renderNext(); this.drawBookings(); }catch(err){ toast(err.message,true); } };
      if(k==="confirm") return upd({status:"confirmado"},"Pagamento confirmado. A consulta aparece como confirmada para o cliente.");
      if(k==="done") return upd({status:"realizado"},"Consulta marcada como realizada.");
      if(k==="cancel"){ this.confirm=id; return this.drawBookings(); }
      if(k==="cancel-no"){ this.confirm=null; return this.drawBookings(); }
      if(k==="cancel-yes"){ this.confirm=null; return upd({status:"cancelado",cancelado_por:"escritorio"},"Agendamento cancelado. O horário voltou para a agenda."); }
      if(k==="link"){ const v=$(`#lk-${id}`).value.trim(); if(v && !httpsOK(v)) return toast("O link da videochamada deve começar com https://",true); return upd({link_reuniao:v||null},"Link salvo."); }
      if(k==="obs") return upd({obs_admin:$(`#ob-${id}`).value.trim()||null},"Observação salva.");
      if(k==="rc"){ try{ const url=await busy(b,()=>API.receiptUrl(b.dataset.path)); $(`[data-rclink="${id}"]`).innerHTML=` · <a href="${esc(url)}" target="_blank" rel="noopener">abrir em nova aba</a>`; }catch(err){ toast(err.message,true); } }
    });
  },

  /* ----- agenda semanal, bloqueios e horários avulsos ----- */
  async tab_agenda(){
    await refreshPublic();
    const mods=App.pub.modalidades;
    if(!this.modSel || !mods.some(m=>m.id===this.modSel)) this.modSel=mods[0]?.id;
    if(!this.week){ this.week={}; for(let d=0;d<7;d++) this.week[d]=App.pub.disponibilidade.filter(r=>r.modalidade_id===this.modSel&&Number(r.dia_semana)===d).map(r=>({inicio:String(r.inicio).slice(0,5),fim:String(r.fim).slice(0,5)})).sort((a,b)=>a.inicio.localeCompare(b.inicio)); }
    const c=App.pub.config, step=c.duracao_min+c.intervalo_min;
    const count=Object.values(this.week).flat().reduce((n,r)=>{ const a=toMin(r.inicio),b=toMin(r.fim); return n+(b>a?Math.max(0,Math.floor((b-a-c.duracao_min)/step)+1):0); },0);
    const modOpts=(sel,all)=>`${all?`<option value="">Todas as modalidades</option>`:""}${mods.map(m=>`<option value="${esc(m.id)}" ${sel===m.id?"selected":""}>${esc(m.nome)}</option>`).join("")}`;
    const t=todaySP();
    $("#adBody").innerHTML=`
      <div class="seg" role="group" aria-label="Modalidade">${mods.map(m=>`<button data-ms="${esc(m.id)}" aria-pressed="${m.id===this.modSel}">${esc(m.nome)}</button>`).join("")}</div>
      <p class="hint" style="color:var(--muted);margin-bottom:14px">Grade semanal de <b style="color:var(--fg)">${esc((mods.find(m=>m.id===this.modSel)||{}).nome||"")}</b>. Cada faixa é dividida em consultas de ${c.duracao_min} min com ${c.intervalo_min} min de intervalo. Esta grade gera <b style="color:var(--gold)">${count}</b> horário(s) por semana.</p>
      <div class="week">${[1,2,3,4,5,6,0].map(d=>`<div class="day ${this.week[d].length?"":"off"}"><b>${WDL[d]}</b><div class="ranges">
        ${this.week[d].map((r,i)=>`<span class="range"><input type="time" value="${r.inicio}" data-wd="${d}" data-i="${i}" data-k="inicio" aria-label="Início"> até <input type="time" value="${r.fim}" data-wd="${d}" data-i="${i}" data-k="fim" aria-label="Fim"><button data-rm="${d}:${i}" aria-label="Remover faixa">×</button></span>`).join("")}
        <button class="addr" data-add="${d}">+ faixa</button>${this.week[d].length?"":`<span class="note">sem atendimento</span>`}</div></div>`).join("")}</div>
      <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:16px;align-items:center"><button class="btn" id="saveWeek">Salvar grade semanal</button><button class="btn ghost" id="undoWeek">Descartar alterações</button><span class="msg" role="alert" id="wkMsg" style="margin:0"></span></div>

      <div class="two">
        <div class="panel"><h2>Dias bloqueados</h2><p class="note">Feriados, férias, audiências. Bloqueia o dia inteiro.</p>
          <div class="row-form"><input type="date" id="bqD" min="${t}" aria-label="Data"><select id="bqM" aria-label="Modalidade">${modOpts("",true)}</select><input id="bqT" placeholder="Motivo (opcional)" aria-label="Motivo"><button class="btn sm" id="bqAdd">Bloquear</button></div>
          <ul class="plist">${App.pub.bloqueios.filter(b=>b.data>=t).sort((a,b)=>a.data.localeCompare(b.data)).map(b=>`<li><span><span class="mono">${brDate(b.data)}</span> · ${b.modalidade_id?esc((mods.find(m=>m.id===b.modalidade_id)||{}).nome):"todas"}${b.motivo?` · <span class="muted">${esc(b.motivo)}</span>`:""}</span><button class="x" data-dbq="${b.id}" aria-label="Remover bloqueio">×</button></li>`).join("")||`<li class="muted">Nenhum bloqueio futuro.</li>`}</ul></div>
        <div class="panel"><h2>Horários avulsos</h2><p class="note">Abre uma faixa em data específica, fora da grade semanal.</p>
          <div class="row-form"><input type="date" id="exD" min="${t}" aria-label="Data"><select id="exM" aria-label="Modalidade">${modOpts(this.modSel,false)}</select><input type="time" id="exA" value="09:00" aria-label="Início"><input type="time" id="exB" value="12:00" aria-label="Fim"><button class="btn sm" id="exAdd">Abrir</button></div>
          <ul class="plist">${App.pub.extras.filter(x=>x.data>=t).sort((a,b)=>a.data.localeCompare(b.data)).map(x=>`<li><span><span class="mono">${brDate(x.data)} · ${String(x.inicio).slice(0,5)}–${String(x.fim).slice(0,5)}</span> · ${esc((mods.find(m=>m.id===x.modalidade_id)||{}).nome)}</span><button class="x" data-dex="${x.id}" aria-label="Remover horário">×</button></li>`).join("")||`<li class="muted">Nenhum horário avulso futuro.</li>`}</ul></div>
      </div>`;
    $$("[data-ms]").forEach(b=>b.onclick=()=>{ this.modSel=b.dataset.ms; this.week=null; this.tab_agenda(); });
    $$("[data-wd]").forEach(i=>i.onchange=()=>{ this.week[i.dataset.wd][i.dataset.i][i.dataset.k]=i.value; this.tab_agenda(); });
    $$("[data-add]").forEach(b=>b.onclick=()=>{ const d=b.dataset.add; const last=this.week[d][this.week[d].length-1]; this.week[d].push(last?{inicio:last.fim,fim:toHM(Math.min(toMin(last.fim)+180,1439))}:{inicio:"14:00",fim:"18:00"}); this.tab_agenda(); });
    $$("[data-rm]").forEach(b=>b.onclick=()=>{ const [d,i]=b.dataset.rm.split(":"); this.week[d].splice(Number(i),1); this.tab_agenda(); });
    $("#undoWeek").onclick=()=>{ this.week=null; this.tab_agenda(); };
    $("#saveWeek").onclick=async e=>{
      const rows=[]; for(const [d,rs] of Object.entries(this.week)) for(const r of rs){ if(!r.inicio||!r.fim||toMin(r.fim)<=toMin(r.inicio)) return $("#wkMsg").textContent=`Faixa inválida em ${WDL[d]}: o fim precisa ser depois do início.`; rows.push({dia_semana:Number(d),inicio:r.inicio,fim:r.fim}); }
      for(const d in this.week){ const rs=this.week[d].slice().sort((a,b)=>a.inicio.localeCompare(b.inicio)); for(let i=1;i<rs.length;i++) if(toMin(rs[i].inicio)<toMin(rs[i-1].fim)) return $("#wkMsg").textContent=`Faixas sobrepostas em ${WDL[d]}.`; }
      try{ await busy(e.currentTarget,()=>API.saveDisponibilidade(this.modSel,rows)); toast("Grade semanal salva. A agenda pública já reflete a mudança."); this.week=null; await refreshPublic(); renderNext(); this.tab_agenda(); }catch(err){ toast(err.message,true); }
    };
    $("#bqAdd").onclick=async e=>{ const data=$("#bqD").value; if(!data) return toast("Escolha a data do bloqueio.",true);
      try{ await busy(e.currentTarget,()=>API.addBloqueio({data,modalidade_id:$("#bqM").value||null,motivo:$("#bqT").value.trim()||null})); toast("Dia bloqueado."); await refreshPublic(); renderNext(); this.tab_agenda(); }catch(err){ toast(err.message,true); } };
    $$("[data-dbq]").forEach(b=>b.onclick=async()=>{ try{ await API.delBloqueio(Number(b.dataset.dbq)); toast("Bloqueio removido."); await refreshPublic(); renderNext(); this.tab_agenda(); }catch(err){ toast(err.message,true); } });
    $("#exAdd").onclick=async e=>{ const data=$("#exD").value, a=$("#exA").value, b=$("#exB").value;
      if(!data) return toast("Escolha a data do horário avulso.",true);
      if(!a||!b||toMin(b)-toMin(a)<c.duracao_min) return toast(`A faixa precisa ter pelo menos ${c.duracao_min} minutos.`,true);
      try{ await busy(e.currentTarget,()=>API.addExtra({data,modalidade_id:$("#exM").value,inicio:a,fim:b})); toast("Horário avulso aberto."); await refreshPublic(); renderNext(); this.tab_agenda(); }catch(err){ toast(err.message,true); } };
    $$("[data-dex]").forEach(b=>b.onclick=async()=>{ try{ await API.delExtra(Number(b.dataset.dex)); toast("Horário removido."); await refreshPublic(); renderNext(); this.tab_agenda(); }catch(err){ toast(err.message,true); } });
  },

  /* ----- modalidades e valores ----- */
  async tab_valores(){
    await refreshPublic();
    const mods=App.pub.modalidades;
    const row=m=>`<tr data-mrow="${esc(m.id)}">
      <td><input data-k="nome" value="${esc(m.nome)}" aria-label="Nome"></td>
      <td><select data-k="tipo" aria-label="Tipo"><option value="presencial" ${m.tipo==="presencial"?"selected":""}>Presencial</option><option value="online" ${m.tipo==="online"?"selected":""}>Online</option></select></td>
      <td><input data-k="descricao" value="${esc(m.descricao||"")}" aria-label="Endereço ou descrição"></td>
      <td><input data-k="valor" type="number" min="0" step="0.01" value="${m.valor??""}" placeholder="0,00" aria-label="Valor" style="font-family:var(--mono)"></td>
      <td style="text-align:center"><input data-k="ativo" type="checkbox" ${m.ativo?"checked":""} aria-label="Ativa" style="width:auto;accent-color:var(--gold)"></td>
      <td><input data-k="ordem" type="number" value="${m.ordem??0}" aria-label="Ordem" style="width:4.5em"></td>
      <td><button class="btn ghost sm" data-msave="${esc(m.id)}">Salvar</button></td></tr>`;
    $("#adBody").innerHTML=`
      <p class="note" style="margin-bottom:16px;max-width:70ch">Defina o valor de cada modalidade. O cliente vê o valor ao escolher a modalidade no agendamento, e ele fica gravado em cada reserva. Uma modalidade desativada some da agenda pública, mas mantém o histórico.</p>
      <div class="tbl-wrap"><table class="tbl mods-tbl"><thead><tr><th>Nome</th><th>Tipo</th><th>Endereço ou descrição</th><th>Valor (R$)</th><th>Ativa</th><th>Ordem</th><th>Ação</th></tr></thead>
      <tbody>${mods.map(row).join("")}</tbody></table></div>
      <div class="panel" style="margin-top:28px;max-width:760px"><h2>Nova modalidade</h2>
        <div class="row-form"><input id="nmN" aria-label="Nome da modalidade" placeholder="Nome, ex.: Presencial · Cordeiro"><select id="nmT" aria-label="Tipo de atendimento"><option value="presencial">Presencial</option><option value="online">Online</option></select><input id="nmD" aria-label="Endereço ou descrição" placeholder="Endereço ou descrição"><input id="nmV" aria-label="Valor" type="number" min="0" step="0.01" placeholder="Valor"><button class="btn sm" id="nmAdd">Adicionar</button></div>
        <p class="note">Depois de criar, cadastre os horários dela em Agenda e horários.</p></div>`;
    $$("[data-msave]").forEach(b=>b.onclick=async()=>{
      const tr=b.closest("tr"), g=k=>$(`[data-k="${k}"]`,tr);
      const m={id:b.dataset.msave,nome:g("nome").value.trim(),tipo:g("tipo").value,descricao:g("descricao").value.trim(),valor:g("valor").value===""?null:Number(g("valor").value),ativo:g("ativo").checked,ordem:Number(g("ordem").value)||0};
      if(!m.nome) return toast("Informe o nome da modalidade.",true);
      try{ await busy(b,()=>API.saveModalidade(m)); toast("Modalidade salva."); await refreshPublic(); renderMods(); renderNext(); }catch(err){ toast(err.message,true); } });
    $("#nmAdd").onclick=async e=>{ const nome=$("#nmN").value.trim(); if(!nome) return toast("Informe o nome da nova modalidade.",true);
      let id=slug(nome); while(mods.some(m=>m.id===id)) id+="-2";
      const m={id,nome,tipo:$("#nmT").value,descricao:$("#nmD").value.trim(),valor:$("#nmV").value===""?null:Number($("#nmV").value),ativo:true,ordem:mods.length+1};
      try{ await busy(e.currentTarget,()=>API.saveModalidade(m)); toast("Modalidade criada. Cadastre os horários dela."); await refreshPublic(); renderMods(); this.tab_valores(); }catch(err){ toast(err.message,true); } };
  },

  /* ----- configurações ----- */
  async tab_config(){
    await refreshPublic(); const c=App.pub.config;
    const n=(id,l,v,extra="")=>`<div class="field"><label for="cf-${id}">${l}</label><input id="cf-${id}" type="number" min="0" value="${esc(v)}" ${extra}></div>`;
    const s=(id,l,v,ph="")=>`<div class="field"><label for="cf-${id}">${l}</label><input id="cf-${id}" value="${esc(v||"")}" placeholder="${esc(ph)}"></div>`;
    $("#adBody").innerHTML=`<form id="cfForm" novalidate style="max-width:860px">
      <div class="form-sec"><h2>Consulta</h2><div class="fgrid3">${n("duracao_min","Duração (minutos)",c.duracao_min)}${n("intervalo_min","Intervalo entre consultas (min)",c.intervalo_min)}</div></div>
      <div class="form-sec"><h2>Regras da agenda</h2><div class="fgrid3">${n("antecedencia_horas","Antecedência mínima (horas)",c.antecedencia_horas)}${n("horizonte_dias","Agenda aberta por (dias)",c.horizonte_dias)}${n("reserva_expira_horas","Reserva sem pagamento expira em (horas)",c.reserva_expira_horas)}${n("cancelamento_horas","Cliente cancela até (horas antes)",c.cancelamento_horas)}</div></div>
      <div class="form-sec"><h2>Pagamento</h2><div class="fgrid3">${s("pix_chave","Chave PIX",c.pix_chave,"CPF, e-mail, telefone ou aleatória")}${s("pix_nome","Nome do recebedor (até 25)",c.pix_nome)}${s("pix_cidade","Cidade do recebedor (até 15)",c.pix_cidade)}</div>${s("link_cartao","Link de pagamento com cartão",c.link_cartao,"https://…")}</div>
      <div class="form-sec"><h2>Contato e política</h2>${s("whatsapp","WhatsApp do escritório (só números, com 55 e DDD)",c.whatsapp,"5522999999999")}<div class="field"><label for="cf-politica">Política de cancelamento (exibida ao cliente)</label><textarea id="cf-politica">${esc(c.politica||"")}</textarea></div></div>
      <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center"><button class="btn" type="submit">Salvar configurações</button>${API.mode==="demo"?`<button class="btn ghost" type="button" id="resetDemo">Restaurar dados de exemplo</button>`:""}<span class="msg" role="alert" id="cfMsg" style="margin:0"></span></div></form>`;
    $("#cfForm").onsubmit=async e=>{ e.preventDefault();
      const g=id=>$(`#cf-${id}`).value.trim(), num=id=>Number(g(id));
      const o={duracao_min:num("duracao_min"),intervalo_min:num("intervalo_min"),antecedencia_horas:num("antecedencia_horas"),horizonte_dias:num("horizonte_dias"),reserva_expira_horas:num("reserva_expira_horas"),cancelamento_horas:num("cancelamento_horas"),
        pix_chave:g("pix_chave")||null,pix_nome:g("pix_nome").slice(0,25)||null,pix_cidade:g("pix_cidade").slice(0,15)||null,link_cartao:g("link_cartao")||null,whatsapp:g("whatsapp").replace(/\D/g,"")||null,politica:g("politica")||null};
      if(o.duracao_min<10) return $("#cfMsg").textContent="A duração mínima é de 10 minutos.";
      if(o.horizonte_dias<1) return $("#cfMsg").textContent="A agenda precisa ficar aberta por pelo menos 1 dia.";
      if(o.reserva_expira_horas<1) return $("#cfMsg").textContent="A reserva precisa valer por pelo menos 1 hora.";
      if(o.link_cartao && !httpsOK(o.link_cartao)) return $("#cfMsg").textContent="O link de pagamento deve começar com https://";
      try{ await busy(e.submitter,()=>API.saveConfig(o)); toast("Configurações salvas."); $("#cfMsg").textContent=""; await refreshPublic(); renderMods(); renderNext(); }catch(err){ $("#cfMsg").textContent=err.message; } };
    const rd=$("#resetDemo"); if(rd) rd.onclick=async()=>{ await API.resetDemo(); await API.sendCode({email:"admin@demo.com"}); await API.verifyCode("admin@demo.com",DEMO_CODE); await refreshPublic(); renderMods(); renderNext(); toast("Dados de exemplo restaurados."); this.render(); };
  }
};

/* =====================================================================
   Navegação e inicialização
   ===================================================================== */
function onAuthChanged(stay){
  if(App.route==="cliente") Client.render();
  if(App.route==="admin") Admin.render();
  if(W.step===3 && !stay) renderAuthSlot();
}
const BASE_TITLE=document.title, TITLES={cliente:"Área do cliente",admin:"Área do advogado",privacidade:"Política de Privacidade"};
function focusView(){
  const t=$(`${{site:"#siteView",cliente:"#clientView",admin:"#adminView",privacidade:"#privacyView"}[App.route]} h1`);
  if(t){ t.tabIndex=-1; t.focus(); }
}
function route(ev){
  if(!AGENDA && location.hash==="#agenda") history.replaceState(null,"","#whatsapp");
  const h=location.hash.replace("#","");
  const r = ["cliente","admin","privacidade"].includes(h) ? h : "site";
  App.route=r;
  $("#siteView").hidden = r!=="site"; $("#clientView").hidden = r!=="cliente"; $("#adminView").hidden = r!=="admin"; $("#privacyView").hidden = r!=="privacidade";
  $("#waFloat").hidden = r!=="site";
  document.title = r==="site" ? BASE_TITLE : `${TITLES[r]} · WBarrada Advogado`;
  const done = r==="cliente" ? Client.render() : r==="admin" ? Admin.render() : null;
  if(r==="site" && h){ const el=document.getElementById(h); if(el) requestAnimationFrame(()=>el.scrollIntoView({behavior:"smooth"})); }
  else window.scrollTo(0,0);
  // Em troca de tela (hashchange), o foco vai para o título da nova tela
  if(ev && r!=="site") Promise.resolve(done).then(focusView);
}
window.addEventListener("hashchange", route);
$(".skip").onclick=e=>{ e.preventDefault(); focusView(); };
$("#menuBtn").onclick=()=>{ const o=$("#nav").classList.toggle("open"); $("#menuBtn").setAttribute("aria-expanded",o); };
$$("#nav a").forEach(a=>a.addEventListener("click",()=>{ $("#nav").classList.remove("open"); $("#menuBtn").setAttribute("aria-expanded","false"); }));

(async function init(){
  $("#demoBar").hidden = API.mode!=="demo" || !AGENDA;
  $("#year").textContent = todaySP().slice(0,4);
  // Sem data informada em config.js, a política não exibe "Última atualização"
  if(SITE.privacidadeAtualizada){ $("#privDate").textContent = SITE.privacidadeAtualizada; $("#privUpd").hidden = false; }
  if(SITE.foto){ const ph=$("#portrait .portrait-ph"); const img=new Image(); img.alt="Wanderson Corrêa Barrada, advogado"; img.src=SITE.foto; img.onload=()=>ph.replaceWith(img); }
  try{
    await refreshPublic();
    App.user = await API.getUser();
    if(AGENDA){ renderMods(); renderNext(); goStep(1,true); }
  }catch(err){
    $("#nextList").innerHTML=`<li class="msg">Não foi possível carregar a agenda: ${esc(err.message)}</li>`;
    $("#modOpts").innerHTML=`<p class="msg" role="alert">Não foi possível carregar a agenda. Tente novamente em instantes.</p>`;
  }
  route();
})();
})();
