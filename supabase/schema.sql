-- Matriz Hualito · esquema de base de datos (Supabase / Postgres)
-- Se pega completo en Supabase → SQL Editor → New query → Run. Se puede correr más de una vez.
--
-- Modelo: cada marca pertenece a una organización (la agencia). Cada persona del equipo es un "miembro" de una
-- organización, identificado por su email. Las reglas de acceso (RLS) hacen que cada uno vea y edite solo las marcas
-- de su organización: preparado para el paso a SaaS, donde cada cliente será su propia organización.

create table if not exists organizaciones (
  id text primary key,
  nombre text not null
);

create table if not exists miembros (
  email text primary key,
  organizacion_id text not null references organizaciones (id) on delete cascade,
  creado timestamptz not null default now()
);

create table if not exists marcas (
  id text primary key,
  organizacion_id text not null references organizaciones (id) on delete cascade,
  nombre text not null,
  rubro text not null,
  -- Objeto de marca completo (manual cap. 9): diagnóstico, paleta, tipografía y logos.
  datos jsonb not null,
  creada timestamptz not null default now(),
  actualizada timestamptz not null default now()
);

create index if not exists marcas_organizacion_idx on marcas (organizacion_id);

-- Organización de quien está conectado, según su email.
create or replace function mi_organizacion() returns text
language sql stable security definer set search_path = public as $$
  select organizacion_id from miembros where lower(email) = lower(auth.jwt() ->> 'email')
$$;

create or replace function tocar_actualizada() returns trigger language plpgsql as $$
begin
  new.actualizada = now();
  return new;
end $$;

drop trigger if exists marcas_actualizada on marcas;
create trigger marcas_actualizada before update on marcas for each row execute function tocar_actualizada();

alter table organizaciones enable row level security;
alter table miembros enable row level security;
alter table marcas enable row level security;

drop policy if exists "ver mi membresía" on miembros;
create policy "ver mi membresía" on miembros for select
  using (lower(email) = lower(auth.jwt() ->> 'email'));

drop policy if exists "ver mi organización" on organizaciones;
create policy "ver mi organización" on organizaciones for select
  using (id = mi_organizacion());

drop policy if exists "marcas de mi organización" on marcas;
create policy "marcas de mi organización" on marcas for all
  using (organizacion_id = mi_organizacion())
  with check (organizacion_id = mi_organizacion());

-- Datos iniciales: la agencia y quién puede entrar. Para sumar a alguien del equipo, agregá una fila a `miembros`
-- con su email y creale el usuario en Authentication → Users → Add user (o Invite).
insert into organizaciones (id, nombre) values ('hualito', 'Hualito') on conflict (id) do nothing;
insert into miembros (email, organizacion_id) values ('federicolescan8@gmail.com', 'hualito') on conflict (email) do nothing;
