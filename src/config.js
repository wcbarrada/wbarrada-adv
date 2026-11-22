/* Configuração do site.
   Sem supabaseUrl/supabaseAnonKey, o site roda em modo demonstração. */
window.SITE_CONFIG = {
  agendaAtiva: true,          // false = agendamento suspenso; true = agenda online de volta (rodar build.py depois)
  supabaseUrl: "https://pgwgsniiwgvsghvlrlas.supabase.co",
  supabaseAnonKey: "sb_publishable_SfWxULLOdb0KqzhiGR6yZA_MbS9WmyB",   // chave pública (a segurança está nas regras do banco)
  foto: "foto.jpg",                   // ex.: "foto.jpg" (retrato 4:5, mínimo 800 x 1000 px, na mesma pasta)
  privacidadeAtualizada: "09/11/2026",    // data exibida na Política de Privacidade
  /* Prazos → assunto da agenda (aprovado em 22/11/2026).
     A chave é o título do prazo, igual ao da seção "Prazos que costumam passar despercebidos".
     O valor é uma opção do seletor "Assunto da consulta". */
  prazosAssunto: {
    "Desistir de compra feita fora da loja": "Consumidor",
    "Defeito fácil de ver em produto ou serviço": "Consumidor",
    "Seguro negado": "Consumidor",
    "Negócio feito por engano, golpe ou ameaça": "Imobiliário e contratos",
    "Prejuízo causado por outra pessoa": "Outro assunto",
    "Dívida com documento e aluguel atrasado": "Imobiliário e contratos",
    "Cheque sem fundo": "Outro assunto",
    "Imóvel alugado vendido sem oferta ao inquilino": "Imobiliário e contratos",
    "Renovação de aluguel de ponto comercial": "Imobiliário e contratos",
    "Aviso para sair do imóvel alugado": "Imobiliário e contratos",
    "Problema grave na construção": "Imobiliário e contratos",
    "Imóvel com metragem menor": "Imobiliário e contratos",
    "Imóvel com defeito escondido": "Imobiliário e contratos",
    "Anular decisão de assembleia de condomínio": "Imobiliário e contratos",
    "Pensão alimentícia atrasada": "Família",
    "Abrir o inventário": "Inventário",
    "INSS negou ou cortou o benefício": "INSS",
    "Revisão de aposentadoria ou pensão": "INSS",
    "Direitos de quem saiu do emprego": "Trabalhista",
    "Cobrar valores do governo": "Servidor público",
    "Correção de precatório e RPV": "Precatórios e RPV",
    "Imposto recolhido a mais": "Outro assunto"
  },
  /* Temas de prazos que recebem a nota do art. 30, I junto aos botões */
  prazosTemasGoverno: ["Governo e impostos"]
};
