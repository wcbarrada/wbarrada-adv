-- =====================================================================
--  Conferência do banco real: validação do cadastro e motivo dos bloqueios
--  Somente leitura. Pode ser executada quantas vezes quiser.
--  Supabase > SQL Editor > New query > colar > Run
--
--  Resultado esperado (uma linha):
--    cliente_altera_email = false
--    restricoes_perfil    = 3
--    visitante_le_motivo  = false
--    cliente_le_motivo    = false
--    funcao_motivos       = true
--
--  Se algum valor vier diferente, colar e executar no SQL Editor o trecho
--  de supabase/schema.sql entre as linhas
--    ">>> INICIO: validação do cadastro e motivo dos bloqueios"
--    "<<< FIM: validação do cadastro e motivo dos bloqueios"
--  e rodar esta conferência de novo. O trecho pode ser executado mais de
--  uma vez sem efeito colateral e não apaga nem altera dados já gravados.
-- =====================================================================
select
  has_column_privilege('authenticated', 'public.profiles', 'email', 'UPDATE')  as cliente_altera_email,
  (select count(*) from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname in ('profiles_nome_tamanho', 'profiles_cpf_valido', 'profiles_telefone_tamanho')) as restricoes_perfil,
  has_column_privilege('anon', 'public.bloqueios', 'motivo', 'SELECT')          as visitante_le_motivo,
  has_column_privilege('authenticated', 'public.bloqueios', 'motivo', 'SELECT') as cliente_le_motivo,
  exists (select 1 from pg_proc where proname = 'bloqueios_motivos'
            and pronamespace = 'public'::regnamespace)                         as funcao_motivos;
