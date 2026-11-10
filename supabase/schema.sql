-- =====================================================================
--  Barrada Advogado · Agenda de consultas
--  Esquema do banco (Supabase / PostgreSQL)
--  Executar uma única vez em: Supabase > SQL Editor > New query > Run
-- =====================================================================

-- ---------- Perfis de usuário (clientes e advogado) ----------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  nome        text not null default '',
  cpf         text,
  telefone    text,
  email       text,
  created_at  timestamptz not null default now()
);

-- Quem tem acesso à área do advogado
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- Cria o perfil automaticamente no cadastro
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, nome, cpf, telefone, email)
  values (new.id,
          coalesce(new.raw_user_meta_data->>'nome', ''),
          new.raw_user_meta_data->>'cpf',
          new.raw_user_meta_data->>'telefone',
          new.email)
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Configuração geral (linha única) ----------
create table if not exists public.configuracoes (
  id                    int primary key default 1 check (id = 1),
  duracao_min           int  not null default 50  check (duracao_min between 10 and 240),
  intervalo_min         int  not null default 10  check (intervalo_min between 0 and 120),
  antecedencia_horas    int  not null default 12  check (antecedencia_horas >= 0),
  horizonte_dias        int  not null default 45  check (horizonte_dias between 1 and 365),
  reserva_expira_horas  int  not null default 24  check (reserva_expira_horas between 1 and 168),
  cancelamento_horas    int  not null default 24  check (cancelamento_horas >= 0),
  whatsapp              text,
  pix_chave             text,
  pix_nome              text default 'WANDERSON C BARRADA',
  pix_cidade            text default 'CANTAGALO',
  link_cartao           text,
  politica             text default 'Remarcação ou cancelamento sem custo com até 24 horas de antecedência. Ausência sem aviso prévio não gera reembolso.'
);
insert into public.configuracoes (id) values (1) on conflict do nothing;

-- ---------- Modalidades de atendimento e valores ----------
create table if not exists public.modalidades (
  id         text primary key,
  nome       text not null,
  descricao  text,
  tipo       text not null check (tipo in ('online','presencial')),
  valor      numeric(10,2) check (valor is null or valor >= 0),
  ativo      boolean not null default true,
  ordem      int not null default 0
);
insert into public.modalidades (id, nome, descricao, tipo, ordem) values
  ('campos',    'Presencial · Campos',    'Local informado na confirmação',                'presencial', 1),
  ('cantagalo', 'Presencial · Cantagalo', 'Local informado na confirmação',                'presencial', 2),
  ('online',    'Online · videochamada',  'Link da videochamada enviado após a confirmação',  'online',  3)
on conflict do nothing;
-- Prov. CFOAB 205/2021, art. 3º, I: texto público sem menção a pagamento
update public.modalidades set descricao = 'Link da videochamada enviado após a confirmação'
 where id = 'online' and descricao = 'Link enviado após a confirmação do pagamento';

-- ---------- Disponibilidade semanal ----------
create table if not exists public.disponibilidade (
  id             bigint generated always as identity primary key,
  modalidade_id  text not null references public.modalidades(id) on delete cascade,
  dia_semana     int  not null check (dia_semana between 0 and 6),   -- 0 = domingo
  inicio         time not null,
  fim            time not null,
  check (fim > inicio)
);
insert into public.disponibilidade (modalidade_id, dia_semana, inicio, fim)
select * from (values
  ('campos',1,'14:30'::time,'18:30'::time),('campos',2,'14:30','18:30'),('campos',3,'14:30','18:30'),
  ('campos',4,'14:30','18:30'),('campos',5,'14:30','18:30'),
  ('cantagalo',6,'09:00','13:00'),
  ('online',1,'18:30','20:30'),('online',2,'18:30','20:30'),('online',3,'18:30','20:30'),
  ('online',4,'18:30','20:30'),('online',6,'14:00','16:00')
) v where not exists (select 1 from public.disponibilidade);

-- Dias bloqueados (feriados, férias, audiências). modalidade_id nulo = todas.
create table if not exists public.bloqueios (
  id             bigint generated always as identity primary key,
  data           date not null,
  modalidade_id  text references public.modalidades(id) on delete cascade,
  motivo         text
);
insert into public.bloqueios (data, motivo)
select * from (values
  ('2026-10-12'::date,'Feriado nacional'),('2026-11-02','Feriado nacional'),('2026-11-15','Feriado nacional'),
  ('2026-11-20','Feriado nacional'),('2026-12-25','Feriado nacional'),('2027-01-01','Feriado nacional')
) v where not exists (select 1 from public.bloqueios);

-- Horários avulsos, fora da grade semanal
create table if not exists public.horarios_extras (
  id             bigint generated always as identity primary key,
  data           date not null,
  modalidade_id  text not null references public.modalidades(id) on delete cascade,
  inicio         time not null,
  fim            time not null,
  check (fim > inicio)
);

-- ---------- Agendamentos ----------
create table if not exists public.agendamentos (
  id                 uuid primary key default gen_random_uuid(),
  protocolo          text unique not null,
  cliente_id         uuid not null references public.profiles(id) on delete restrict,
  modalidade_id      text not null references public.modalidades(id),
  inicio             timestamptz not null,
  fim                timestamptz not null,
  assunto            text,
  parte_contraria    text,
  resumo             text,
  valor              numeric(10,2),
  forma_pagamento    text check (forma_pagamento in ('pix','cartao')),
  status             text not null default 'aguardando_pagamento'
                     check (status in ('aguardando_pagamento','confirmado','realizado','cancelado','expirado')),
  comprovante_path   text,
  pago_informado_em  timestamptz,
  link_reuniao       text,
  cancelado_por      text,
  created_at         timestamptz not null default now(),
  -- Um único advogado: nunca dois atendimentos ativos sobrepostos
  constraint sem_sobreposicao exclude using gist (tstzrange(inicio, fim) with &&)
    where (status in ('aguardando_pagamento','confirmado'))
);
create index if not exists agendamentos_cliente_idx on public.agendamentos (cliente_id, inicio desc);
create index if not exists agendamentos_inicio_idx  on public.agendamentos (inicio);

-- Links só https (bancos criados antes desta versão)
alter table public.configuracoes drop constraint if exists configuracoes_link_cartao_https;
alter table public.configuracoes add constraint configuracoes_link_cartao_https
  check (link_cartao is null or link_cartao ~* '^https://[^[:space:]"''<>]+$') not valid;
alter table public.agendamentos drop constraint if exists agendamentos_link_reuniao_https;
alter table public.agendamentos add constraint agendamentos_link_reuniao_https
  check (link_reuniao is null or link_reuniao ~* '^https://[^[:space:]"''<>]+$') not valid;

-- Observações internas: tabela própria, invisível para o cliente
create table if not exists public.agendamento_notas (
  agendamento_id  uuid primary key references public.agendamentos(id) on delete cascade,
  obs             text check (char_length(obs) <= 4000),
  updated_at      timestamptz not null default now()
);
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'agendamentos' and column_name = 'obs_admin') then
    insert into public.agendamento_notas (agendamento_id, obs)
    select id, obs_admin from public.agendamentos where obs_admin is not null
    on conflict (agendamento_id) do nothing;
    alter table public.agendamentos drop column obs_admin;
  end if;
end $$;

-- ---------- Funções públicas ----------

-- Horários ocupados (sem expor quem agendou)
create or replace function public.horarios_ocupados(p_de timestamptz, p_ate timestamptz)
returns table (inicio timestamptz, fim timestamptz)
language sql stable security definer set search_path = public as $$
  select a.inicio, a.fim
  from public.agendamentos a, public.configuracoes c
  where c.id = 1
    and a.inicio < p_ate and a.fim > p_de
    and (a.status = 'confirmado'
         or (a.status = 'aguardando_pagamento'
             and a.created_at >= now() - make_interval(hours => c.reserva_expira_horas)));
$$;

-- Cria a reserva validando todas as regras no servidor
create or replace function public.criar_agendamento(
  p_modalidade text, p_inicio timestamptz, p_assunto text,
  p_parte text, p_resumo text, p_forma text)
returns public.agendamentos
language plpgsql security definer set search_path = public as $$
declare
  c       public.configuracoes;
  m       public.modalidades;
  v_local timestamp;
  v_data  date;
  v_hora  time;
  v_dow   int;
  v_passo int;
  v_ok    boolean;
  v_row   public.agendamentos;
begin
  if auth.uid() is null then raise exception 'Faça login para agendar.'; end if;
  select * into c from public.configuracoes where id = 1;
  select * into m from public.modalidades where id = p_modalidade and ativo;
  if not found then raise exception 'Modalidade indisponível.'; end if;

  v_local := p_inicio at time zone 'America/Sao_Paulo';
  v_data  := v_local::date;
  v_hora  := v_local::time;
  v_dow   := extract(dow from v_local)::int;
  v_passo := c.duracao_min + c.intervalo_min;

  if p_inicio < now() + make_interval(hours => c.antecedencia_horas) then
    raise exception 'Horário fora da antecedência mínima de % horas.', c.antecedencia_horas;
  end if;
  if v_data > (now() at time zone 'America/Sao_Paulo')::date + c.horizonte_dias then
    raise exception 'Data além do período aberto na agenda.';
  end if;
  if exists (select 1 from public.bloqueios b
             where b.data = v_data and (b.modalidade_id is null or b.modalidade_id = p_modalidade)) then
    raise exception 'Data indisponível.';
  end if;

  select exists (
      select 1 from public.disponibilidade d
      where d.modalidade_id = p_modalidade and d.dia_semana = v_dow
        and v_hora >= d.inicio
        and v_hora + make_interval(mins => c.duracao_min) <= d.fim
        and (extract(epoch from (v_hora - d.inicio))::int / 60) % v_passo = 0)
    or exists (
      select 1 from public.horarios_extras e
      where e.modalidade_id = p_modalidade and e.data = v_data
        and v_hora >= e.inicio
        and v_hora + make_interval(mins => c.duracao_min) <= e.fim
        and (extract(epoch from (v_hora - e.inicio))::int / 60) % v_passo = 0)
  into v_ok;
  if not v_ok then raise exception 'Horário não disponível na agenda.'; end if;

  -- Serializa as reservas do mesmo cliente (evita burlar o limite em paralelo)
  perform pg_advisory_xact_lock(hashtext('criar_agendamento:' || auth.uid()::text));

  -- Libera reservas não pagas vencidas
  update public.agendamentos set status = 'expirado'
   where status = 'aguardando_pagamento'
     and created_at < now() - make_interval(hours => c.reserva_expira_horas);

  -- No máximo 2 consultas ativas por cliente
  if (select count(*) from public.agendamentos
       where cliente_id = auth.uid()
         and status in ('aguardando_pagamento','confirmado')
         and fim > now()) >= 2 then
    raise exception 'Você já tem 2 consultas ativas. Cancele uma delas ou fale com o escritório.';
  end if;

  begin
    insert into public.agendamentos
      (protocolo, cliente_id, modalidade_id, inicio, fim, assunto, parte_contraria, resumo, valor, forma_pagamento)
    values
      ('WB-' || to_char(now() at time zone 'America/Sao_Paulo','YYYYMMDD') || '-' || upper(substr(md5(random()::text || clock_timestamp()::text),1,5)),
       auth.uid(), p_modalidade, p_inicio, p_inicio + make_interval(mins => c.duracao_min),
       left(p_assunto,200), left(p_parte,200), left(p_resumo,4000), m.valor,
       case when p_forma in ('pix','cartao') then p_forma else 'pix' end)
    returning * into v_row;
  exception when exclusion_violation then
    raise exception 'Este horário acabou de ser reservado. Escolha outro.';
  end;
  return v_row;
end $$;

-- Cliente cancela a própria consulta
create or replace function public.cancelar_agendamento(p_id uuid)
returns public.agendamentos
language plpgsql security definer set search_path = public as $$
declare a public.agendamentos; c public.configuracoes;
begin
  select * into c from public.configuracoes where id = 1;
  select * into a from public.agendamentos where id = p_id and cliente_id = auth.uid() for update;
  if not found then raise exception 'Agendamento não encontrado.'; end if;
  if a.status not in ('aguardando_pagamento','confirmado') then
    raise exception 'Este agendamento não pode mais ser cancelado.';
  end if;
  if a.status = 'confirmado' and a.inicio < now() + make_interval(hours => c.cancelamento_horas) then
    raise exception 'Cancelamento online só é possível com % horas de antecedência. Fale com o escritório.', c.cancelamento_horas;
  end if;
  update public.agendamentos set status = 'cancelado', cancelado_por = 'cliente'
   where id = p_id returning * into a;
  return a;
end $$;

-- Cliente registra o comprovante enviado ao storage
create or replace function public.anexar_comprovante(p_id uuid, p_path text)
returns public.agendamentos
language plpgsql security definer set search_path = public as $$
declare a public.agendamentos;
begin
  if split_part(p_path, '/', 1) <> auth.uid()::text then raise exception 'Arquivo inválido.'; end if;
  update public.agendamentos
     set comprovante_path = p_path, pago_informado_em = now()
   where id = p_id and cliente_id = auth.uid()
     and status in ('aguardando_pagamento','confirmado')
  returning * into a;
  if not found then raise exception 'Agendamento não encontrado.'; end if;
  return a;
end $$;

-- ---------- Segurança (RLS) ----------
alter table public.profiles        enable row level security;
alter table public.admins          enable row level security;
alter table public.configuracoes   enable row level security;
alter table public.modalidades     enable row level security;
alter table public.disponibilidade enable row level security;
alter table public.bloqueios       enable row level security;
alter table public.horarios_extras enable row level security;
alter table public.agendamentos    enable row level security;
alter table public.agendamento_notas enable row level security;

drop policy if exists notas_admin on public.agendamento_notas;
create policy notas_admin on public.agendamento_notas for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Perfis: cada um vê e edita o seu; o advogado vê todos
drop policy if exists perfil_ler on public.profiles;
create policy perfil_ler on public.profiles for select to authenticated using (id = auth.uid() or public.is_admin());
drop policy if exists perfil_editar on public.profiles;
create policy perfil_editar on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists admins_ler on public.admins;
create policy admins_ler on public.admins for select to authenticated using (user_id = auth.uid());

-- Dados da agenda: leitura pública, escrita só do advogado
do $$
declare t text;
begin
  foreach t in array array['configuracoes','modalidades','disponibilidade','bloqueios','horarios_extras'] loop
    execute format('drop policy if exists %1$s_ler on public.%1$s', t);
    execute format('create policy %1$s_ler on public.%1$s for select to anon, authenticated using (true)', t);
    execute format('drop policy if exists %1$s_admin on public.%1$s', t);
    execute format('create policy %1$s_admin on public.%1$s for all to authenticated using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

-- Agendamentos: cliente lê os seus; advogado lê e altera todos. Criação só pela função.
drop policy if exists ag_ler on public.agendamentos;
create policy ag_ler on public.agendamentos for select to authenticated using (cliente_id = auth.uid() or public.is_admin());
drop policy if exists ag_admin on public.agendamentos;
create policy ag_admin on public.agendamentos for update to authenticated using (public.is_admin()) with check (public.is_admin());

grant execute on function public.horarios_ocupados(timestamptz, timestamptz) to anon, authenticated;
grant execute on function public.criar_agendamento(text, timestamptz, text, text, text, text) to authenticated;
grant execute on function public.cancelar_agendamento(uuid) to authenticated;
grant execute on function public.anexar_comprovante(uuid, text) to authenticated;
grant execute on function public.is_admin() to authenticated;
revoke execute on function public.criar_agendamento(text, timestamptz, text, text, text, text) from anon;

-- ---------- Comprovantes (Storage privado) ----------
-- Limite de 5 MB; somente JPEG, PNG e PDF
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('comprovantes', 'comprovantes', false, 5242880, array['image/jpeg','image/png','application/pdf'])
on conflict (id) do update
  set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists comprovante_enviar on storage.objects;
create policy comprovante_enviar on storage.objects for insert to authenticated
  with check (bucket_id = 'comprovantes' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists comprovante_ler on storage.objects;
create policy comprovante_ler on storage.objects for select to authenticated
  using (bucket_id = 'comprovantes' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

-- >>> INICIO: acesso a valores e retenção de dados (2026-11-09)
-- Prov. CFOAB 205/2021, art. 3º, I: valor, PIX e política de cancelamento só depois da identificação
revoke select on public.configuracoes from anon;
grant select (id, duracao_min, intervalo_min, antecedencia_horas, horizonte_dias, cancelamento_horas, whatsapp)
  on public.configuracoes to anon;
revoke select on public.modalidades from anon;
grant select (id, nome, descricao, tipo, ativo, ordem) on public.modalidades to anon;
grant select on public.configuracoes, public.modalidades to authenticated;

-- Arquivos só podem ser apagados pela API do Storage: a rotina anota aqui e o painel do advogado apaga
create table if not exists public.comprovantes_a_excluir (
  path       text primary key,
  criado_em  timestamptz not null default now()
);
alter table public.comprovantes_a_excluir enable row level security;
drop policy if exists comprovantes_a_excluir_admin on public.comprovantes_a_excluir;
create policy comprovantes_a_excluir_admin on public.comprovantes_a_excluir for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
revoke all on public.comprovantes_a_excluir from anon;

drop policy if exists comprovante_excluir on storage.objects;
create policy comprovante_excluir on storage.objects for delete to authenticated
  using (bucket_id = 'comprovantes' and public.is_admin());

-- Prazos aprovados em 06/11/2026: reservas não pagas, 6 meses; consultas pagas e comprovantes, 5 anos;
-- cadastro sem consulta guardada, 6 meses após o último uso. A conta do advogado nunca é excluída.
create or replace function public.aplicar_retencao()
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare n_reservas int; n_pagos int; n_cadastros int;
begin
  delete from public.agendamentos
   where status in ('aguardando_pagamento','expirado','cancelado')
     and pago_informado_em is null and comprovante_path is null
     and inicio < now() - interval '6 months';
  get diagnostics n_reservas = row_count;

  with removidos as (
    delete from public.agendamentos where fim < now() - interval '5 years' returning comprovante_path
  ), fila as (
    insert into public.comprovantes_a_excluir (path)
    select comprovante_path from removidos where comprovante_path is not null
    on conflict (path) do nothing
  )
  select count(*) into n_pagos from removidos;

  delete from auth.users u
   where coalesce(u.last_sign_in_at, u.created_at) < now() - interval '6 months'
     and not exists (select 1 from public.admins a where a.user_id = u.id)
     and not exists (select 1 from public.agendamentos g where g.cliente_id = u.id);
  get diagnostics n_cadastros = row_count;

  return jsonb_build_object('reservas', n_reservas, 'pagos', n_pagos, 'cadastros', n_cadastros);
end $$;
revoke execute on function public.aplicar_retencao() from public, anon, authenticated;

-- Execução diária às 03:30 de Brasília, onde o pg_cron estiver disponível
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.schedule('retencao-diaria', '30 6 * * *', 'select public.aplicar_retencao()');
  end if;
end $$;
-- <<< FIM: acesso a valores e retenção de dados

-- =====================================================================
--  DEPOIS de criar a sua conta pelo site (Área do cliente > Criar conta),
--  torne-a administradora executando (troque o e-mail):
--
--  insert into public.admins (user_id)
--  select id from auth.users where email = 'wcbarrada.adv@gmail.com';
-- =====================================================================
