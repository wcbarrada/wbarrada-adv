\set QUIET on
\pset tuples_only on
\pset format unaligned
insert into auth.users (id,email,raw_user_meta_data) values
 ('11111111-1111-1111-1111-111111111111','adv@x.com','{"nome":"Adv"}'),
 ('22222222-2222-2222-2222-222222222222','a@x.com','{"nome":"Cliente A","cpf":"52998224725"}'),
 ('33333333-3333-3333-3333-333333333333','b@x.com','{"nome":"Cliente B"}');
insert into public.admins values ('11111111-1111-1111-1111-111111111111');
create temp table s as select ((date_trunc('week', now() at time zone 'America/Sao_Paulo')::date + 21)::text || ' 14:30:00-03')::timestamptz as t;
grant select on s to anon, authenticated;
create or replace function pg_temp.t(label text, q text, expect text) returns void language plpgsql as $f$
declare r text; begin
  begin execute q into r; r := coalesce(r,'(null)'); exception when others then r := 'ERRO: '||sqlerrm; end;
  raise notice '%|%|%|%', case when r like expect then 'PASSA' else 'FALHA' end, label, expect, left(r,90);
end $f$;
-- ANON
set role anon; set request.jwt.sub='';
select pg_temp.t('anon lê agendamentos','select count(*)::text from agendamentos','0');
select pg_temp.t('anon lê profiles','select count(*)::text from profiles','0');
select pg_temp.t('anon insere agendamento direto','insert into agendamentos(protocolo,cliente_id,modalidade_id,inicio,fim) values(''x'',''22222222-2222-2222-2222-222222222222'',''campos'',now(),now()) returning 1','ERRO%');
select pg_temp.t('anon chama criar_agendamento','select (criar_agendamento(''campos'',(select t from s),''a'',''b'',''c'',''pix'')).protocolo','ERRO%');
select pg_temp.t('anon altera valor','with u as (update modalidades set valor=1 returning 1) select count(*)::text from u','0');
select pg_temp.t('anon lê horários ocupados (sem identidade)','select count(*)::text from horarios_ocupados(now(),now()+interval ''60 days'')','0');
select pg_temp.t('anon lê admins','select count(*)::text from admins','ERRO%');
reset role;
-- CLIENTE A
set role authenticated; set request.jwt.sub='22222222-2222-2222-2222-222222222222';
select pg_temp.t('A cria reserva válida','select (criar_agendamento(''campos'',(select t from s),''Prev'','''',''resumo'',''pix'')).status','aguardando_pagamento');
select pg_temp.t('A insere direto (sem RPC)','insert into agendamentos(protocolo,cliente_id,modalidade_id,inicio,fim) values(''y'',''22222222-2222-2222-2222-222222222222'',''campos'',now(),now()) returning 1','ERRO%');
select pg_temp.t('A confirma o próprio pagamento','with u as (update agendamentos set status=''confirmado'' returning 1) select count(*)::text from u','0');
select pg_temp.t('A se promove a admin','insert into admins values(''22222222-2222-2222-2222-222222222222'') returning 1','ERRO%');
select pg_temp.t('A altera grade semanal','with u as (delete from disponibilidade returning 1) select count(*)::text from u','0');
select pg_temp.t('A lê perfil de B','select count(*)::text from profiles where id=''33333333-3333-3333-3333-333333333333''','0');
select pg_temp.t('A altera perfil de B','with u as (update profiles set nome=''x'' where id=''33333333-3333-3333-3333-333333333333'' returning 1) select count(*)::text from u','0');
select pg_temp.t('A altera e-mail exibido no próprio perfil','with u as (update profiles set email=''falso@x.com'' where id=''22222222-2222-2222-2222-222222222222'' returning 1) select count(*)::text from u','0');
select pg_temp.t('A grava nome com 10.000 caracteres','with u as (update profiles set nome=repeat(''a'',10000) where id=''22222222-2222-2222-2222-222222222222'' returning 1) select count(*)::text from u','0');
select pg_temp.t('A grava CPF inválido','with u as (update profiles set cpf=''123'' where id=''22222222-2222-2222-2222-222222222222'' returning 1) select count(*)::text from u','0');
select pg_temp.t('A anexa caminho de outra pasta','select (anexar_comprovante((select id from agendamentos limit 1),''33333333-3333-3333-3333-333333333333/x.pdf'')).id::text','ERRO%');
select pg_temp.t('A grava horário desalinhado','select (criar_agendamento(''campos'',(select t from s)+interval ''7 min'',''x'','''',''y'',''pix'')).id::text','ERRO%');
select pg_temp.t('A tenta valor via parâmetro (valor vem do banco)','select (criar_agendamento(''campos'',(select t from s)+interval ''1 hour'',''x'','''',''y'',''pix'')).valor::text','(null)');
-- abuso: A já tem 2 reservas ativas; o limite deve barrar as demais
create temp table abuso (n int); grant all on abuso to authenticated;
do $$ declare i int; n int:=0; begin for i in 0..20 loop begin perform criar_agendamento('campos',(select t from s)+make_interval(days=>i%5, mins=>60*(i/5)),'x','','spam','pix'); n:=n+1; exception when others then null; end; end loop; insert into abuso values (n); end $$;
select pg_temp.t('A cria reservas além do limite de 2 ativas','select n::text from abuso','0');
select pg_temp.t('A recebe a mensagem do limite','select (criar_agendamento(''campos'',(select t from s)+interval ''2 days'',''x'','''',''y'',''pix'')).id::text','ERRO: Você já tem 2 consultas ativas%');
reset role;
-- CLIENTE B
set role authenticated; set request.jwt.sub='33333333-3333-3333-3333-333333333333';
select pg_temp.t('B lê agendamentos de A','select count(*)::text from agendamentos','0');
select pg_temp.t('B cancela reserva de A','select (cancelar_agendamento((select id from agendamentos limit 1))).status','ERRO%');
select pg_temp.t('B vê horários ocupados sem dados de A','select count(*)::text from horarios_ocupados(now(),now()+interval ''60 days'')','%');
reset role;
-- ADMIN
set role authenticated; set request.jwt.sub='11111111-1111-1111-1111-111111111111';
select pg_temp.t('Admin lê todos agendamentos','select (count(*)>0)::text from agendamentos','true');
select pg_temp.t('Admin altera valor','with u as (update modalidades set valor=250 where id=''online'' returning 1) select count(*)::text from u','1');
select pg_temp.t('Admin grava link javascript:','with u as (update agendamentos set link_reuniao=''javascript:alert(1)'' where id=(select id from agendamentos limit 1) returning 1) select count(*)::text from u','ERRO%');
select pg_temp.t('Admin grava link https','with u as (update agendamentos set link_reuniao=''https://meet.google.com/abc-defg-hij'' where id=(select id from agendamentos limit 1) returning 1) select count(*)::text from u','1');
select pg_temp.t('Admin grava link_cartao http:','with u as (update configuracoes set link_cartao=''http://x.com'' returning 1) select count(*)::text from u','ERRO%');
select pg_temp.t('Admin grava observação interna','with u as (insert into agendamento_notas(agendamento_id,obs) select id,''nota interna'' from agendamentos limit 1 returning 1) select count(*)::text from u','1');
select pg_temp.t('Admin lê observação interna','select count(*)::text from agendamento_notas','1');
reset role;
-- CLIENTE A depois das observações
set role authenticated; set request.jwt.sub='22222222-2222-2222-2222-222222222222';
select pg_temp.t('A lê observações internas','select count(*)::text from agendamento_notas','0');
select pg_temp.t('A lê coluna obs_admin (removida)','select count(obs_admin)::text from agendamentos','ERRO%');
reset role;
select pg_temp.t('Bucket comprovantes: 5 MB e tipos restritos','select file_size_limit::text||'' ''||array_to_string(allowed_mime_types,'','') from storage.buckets where id=''comprovantes''','5242880 image/jpeg,image/png,application/pdf');
