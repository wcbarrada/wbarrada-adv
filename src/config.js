/* Configuração do site.
   Sem supabaseUrl/supabaseAnonKey, o site roda em modo demonstração. */
window.SITE_CONFIG = {
  agendaAtiva: true,          // false = agendamento suspenso; true = agenda online de volta (rodar build.py depois)
  supabaseUrl: "https://pgwgsniiwgvsghvlrlas.supabase.co",
  supabaseAnonKey: "sb_publishable_SfWxULLOdb0KqzhiGR6yZA_MbS9WmyB",   // chave pública (a segurança está nas regras do banco)
  foto: "foto.jpg",                   // ex.: "foto.jpg" (retrato 4:5, mínimo 800 x 1000 px, na mesma pasta)
  privacidadeAtualizada: "09/11/2026"     // data exibida na Política de Privacidade
};
