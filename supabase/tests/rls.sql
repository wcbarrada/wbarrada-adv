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
select pg_temp.t('anon lê admins','select count(*)::text from admins','0');
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
select pg_temp.t('A altera e-mail exibido no próprio perfil','with u as (update profiles set email=''falso@x.com'' where id=''22222222-2222-2222-2222-222222222222'' returning 1) select count(*)::text from u','ERRO%');
select pg_temp.t('A grava nome com 10.000 caracteres','with u as (update profiles set nome=repeat(''a'',10000) where id=''22222222-2222-2222-2222-222222222222'' returning 1) select count(*)::text from u','ERRO%');
select pg_temp.t('A grava CPF inválido','with u as (update profiles set cpf=''123'' where id=''22222222-2222-2222-2222-222222222222'' returning 1) select count(*)::text from u','ERRO%');
select pg_temp.t('A grava CPF com dígito errado','with u as (update profiles set cpf=''529.982.247-26'' where id=''22222222-2222-2222-2222-222222222222'' returning 1) select count(*)::text from u','ERRO%');
select pg_temp.t('A grava CPF de dígitos repetidos','with u as (update profiles set cpf=''111.111.111-11'' where id=''22222222-2222-2222-2222-222222222222'' returning 1) select count(*)::text from u','ERRO%');
select pg_temp.t('A grava CPF válido com máscara','with u as (update profiles set cpf=''529.982.247-25'' where id=''22222222-2222-2222-2222-222222222222'' returning 1) select count(*)::text from u','1');
select pg_temp.t('A deixa o CPF em branco','with u as (update profiles set cpf='''' where id=''22222222-2222-2222-2222-222222222222'' returning 1) select count(*)::text from u','1');
select pg_temp.t('A altera nome e telefone válidos','with u as (update profiles set nome=''Cliente A'',telefone=''(22) 99999-0000'' where id=''22222222-2222-2222-2222-222222222222'' returning 1) select count(*)::text from u','1');
select pg_temp.t('A grava telefone com 50 caracteres','with u as (update profiles set telefone=repeat(''9'',50) where id=''22222222-2222-2222-2222-222222222222'' returning 1) select count(*)::text from u','ERRO%');
select pg_temp.t('A troca o id do próprio perfil','with u as (update profiles set id=''33333333-3333-3333-3333-333333333333'' where id=''22222222-2222-2222-2222-222222222222'' returning 1) select count(*)::text from u','ERRO%');
select pg_temp.t('A cria perfil para B','insert into profiles(id,nome,email) values(''33333333-3333-3333-3333-333333333333'',''x'',''x@x.com'') returning 1','ERRO%');
select pg_temp.t('A apaga perfis','with u as (delete from profiles returning 1) select count(*)::text from u','0');
select pg_temp.t('A lê admins','select count(*)::text from admins','0');
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
-- Prov. 205/2021: valor, PIX e política só depois da identificação
set role anon; set request.jwt.sub='';
select pg_temp.t('anon lê chave PIX','select pix_chave from configuracoes','ERRO%');
select pg_temp.t('anon lê política','select politica from configuracoes','ERRO%');
select pg_temp.t('anon lê valor','select valor::text from modalidades limit 1','ERRO%');
select pg_temp.t('anon usa select * em modalidades','select count(*)::text from (select * from modalidades) m','ERRO%');
select pg_temp.t('anon lê regras da agenda','select duracao_min::text from configuracoes','50');
select pg_temp.t('anon lê modalidades sem valor','select count(nome)::text from modalidades','3');
select pg_temp.t('anon executa retenção','select aplicar_retencao()::text','ERRO%');
select pg_temp.t('anon lê fila de exclusão','select count(*)::text from comprovantes_a_excluir','ERRO%');
reset role;
set role authenticated; set request.jwt.sub='22222222-2222-2222-2222-222222222222';
select pg_temp.t('A lê dados de pagamento na etapa 4','select count(pix_nome)::text from configuracoes','1');
select pg_temp.t('A lê valor das modalidades','select count(*)::text from (select valor from modalidades) m','3');
select pg_temp.t('A executa retenção','select aplicar_retencao()::text','ERRO%');
select pg_temp.t('A lê fila de exclusão','select count(*)::text from comprovantes_a_excluir','0');
reset role;
-- Retenção: cenários com datas no passado
update auth.users set last_sign_in_at = now() - interval '2 years' where id = '11111111-1111-1111-1111-111111111111';
insert into auth.users (id,email,last_sign_in_at) values
 ('44444444-4444-4444-4444-444444444444','u4@x.com', now() - interval '7 months'),
 ('55555555-5555-5555-5555-555555555555','u5@x.com', now() - interval '1 month'),
 ('66666666-6666-6666-6666-666666666666','u6@x.com', now() - interval '7 months'),
 ('77777777-7777-7777-7777-777777777777','u7@x.com', now() - interval '7 months'),
 ('88888888-8888-8888-8888-888888888888','u8@x.com', now() - interval '2 years'),
 ('99999999-9999-9999-9999-999999999999','u9@x.com', now() - interval '5 years 2 months'),
 ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','ua@x.com', now() - interval '7 months');
insert into public.agendamentos (protocolo,cliente_id,modalidade_id,inicio,fim,status,comprovante_path,pago_informado_em) values
 ('R6','66666666-6666-6666-6666-666666666666','campos',now()-interval '7 months',now()-interval '7 months'+interval '50 min','expirado',null,null),
 ('R7','77777777-7777-7777-7777-777777777777','campos',now()-interval '5 months',now()-interval '5 months'+interval '50 min','expirado',null,null),
 ('R8','88888888-8888-8888-8888-888888888888','campos',now()-interval '2 years',now()-interval '2 years'+interval '50 min','realizado','u8/a.pdf',now()-interval '2 years'),
 ('R9','99999999-9999-9999-9999-999999999999','campos',now()-interval '5 years 1 month',now()-interval '5 years 1 month'+interval '50 min','realizado','u9/b.pdf',now()-interval '5 years 1 month'),
 ('RA','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','campos',now()-interval '7 months',now()-interval '7 months'+interval '50 min','cancelado','ua/c.pdf',now()-interval '7 months');
select pg_temp.t('Retenção: totais da execução','select aplicar_retencao()::text','{"pagos": 1, "reservas": 1, "cadastros": 3}');
select pg_temp.t('Retenção: reserva não paga com 7 meses sai','select count(*)::text from agendamentos where protocolo=''R6''','0');
select pg_temp.t('Retenção: reserva não paga com 5 meses fica','select count(*)::text from agendamentos where protocolo=''R7''','1');
select pg_temp.t('Retenção: consulta paga com 2 anos fica','select count(*)::text from agendamentos where protocolo=''R8''','1');
select pg_temp.t('Retenção: consulta paga com mais de 5 anos sai','select count(*)::text from agendamentos where protocolo=''R9''','0');
select pg_temp.t('Retenção: cancelada com comprovante fica','select count(*)::text from agendamentos where protocolo=''RA''','1');
select pg_temp.t('Retenção: comprovante antigo entra na fila','select string_agg(path,'','') from comprovantes_a_excluir','u9/b.pdf');
select pg_temp.t('Retenção: cadastro sem reserva e 7 meses sai','select count(*)::text from auth.users where email=''u4@x.com''','0');
select pg_temp.t('Retenção: cadastro com uso recente fica','select count(*)::text from auth.users where email=''u5@x.com''','1');
select pg_temp.t('Retenção: cadastro da reserva removida sai','select count(*)::text from auth.users where email=''u6@x.com''','0');
select pg_temp.t('Retenção: cadastro com reserva guardada fica','select count(*)::text from auth.users where email=''u7@x.com''','1');
select pg_temp.t('Retenção: perfil acompanha o cadastro','select count(*)::text from profiles where email=''u4@x.com''','0');
select pg_temp.t('Retenção: conta do advogado nunca sai','select count(*)::text from auth.users where email=''adv@x.com''','1');
select pg_temp.t('Retenção: segunda execução não remove nada','select aplicar_retencao()::text','{"pagos": 0, "reservas": 0, "cadastros": 0}');
-- Motivo dos bloqueios: anotação interna
set role anon; set request.jwt.sub='';
select pg_temp.t('anon lê motivo do bloqueio','select motivo from bloqueios limit 1','ERRO%');
select pg_temp.t('anon lê datas bloqueadas','select count(data)::text from bloqueios','6');
select pg_temp.t('anon chama bloqueios_motivos','select count(*)::text from bloqueios_motivos()','ERRO%');
reset role;
set role authenticated; set request.jwt.sub='22222222-2222-2222-2222-222222222222';
select pg_temp.t('A lê motivo do bloqueio','select motivo from bloqueios limit 1','ERRO%');
select pg_temp.t('A lê datas bloqueadas','select count(data)::text from bloqueios','6');
select pg_temp.t('A chama bloqueios_motivos','select count(*)::text from bloqueios_motivos()','0');
reset role;
set role authenticated; set request.jwt.sub='11111111-1111-1111-1111-111111111111';
select pg_temp.t('Admin lê motivos pela função','select count(motivo)::text from bloqueios_motivos()','6');
select pg_temp.t('Admin cria bloqueio','with u as (insert into bloqueios(data,motivo) values(''2030-01-02'',''interno'') returning 1) select count(*)::text from u','1');
select pg_temp.t('Admin remove bloqueio','with u as (delete from bloqueios where data=''2030-01-02'' returning 1) select count(*)::text from u','1');
reset role;
