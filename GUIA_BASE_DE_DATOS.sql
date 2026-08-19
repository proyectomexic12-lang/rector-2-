-- ==============================================================================
-- 🏫 I.E. GUAIMARAL - BASE DE DATOS LIMPIA, ESTRUCTURADA Y CON RESPALDO (BACKUP)
-- ==============================================================================
-- INSTRUCCIONES: Copia y pega TODO este código en el SQL Editor de Supabase.
-- Luego presiona el botón RUN.
-- ==============================================================================

-- ✅ PASO 1: LIMPIAR POLÍTICAS Y TRIGGERS ANTIGUOS
do $$
declare
  pol record;
begin
  for pol in
    select policyname, tablename
    from pg_policies
    where tablename in ('app_users', 'usage_logs', 'api_key_logs', 'generated_sequences', 'security_logs', 'deleted_records_backup')
  loop
    execute format('drop policy if exists %I on %I', pol.policyname, pol.tablename);
  end loop;
end;
$$;

-- ✅ PASO 2: CREAR TABLA DE USUARIOS (Con todos los campos de Créditos y Suscripción)
create table if not exists app_users (
  id uuid default gen_random_uuid() primary key,
  email text unique not null,
  password text not null default 'Mw==',
  name text not null default '',
  role text not null default 'docente' check (role in ('admin', 'docente')),
  areas text[] default '{}',
  grados text[] default '{}',
  custom_credits int default null,
  is_unlimited boolean default false,
  unlimited_start_date timestamptz default null,
  monthly_price numeric default 15000,
  subscription_months int default 1,
  created_at timestamptz default now()
);

-- ✅ PASO 3: TABLA DE REGISTRO DE USO (USAGE LOGS)
create table if not exists usage_logs (
  id uuid default gen_random_uuid() primary key,
  user_email text not null,
  action text not null,
  timestamp timestamptz default now()
);

-- ✅ PASO 4: TABLA DE MONITOREO DE LLAVES DE API
create table if not exists api_key_logs (
  id uuid default gen_random_uuid() primary key,
  key_name text not null,
  status text not null,
  action text,
  error_message text,
  timestamp timestamptz default now()
);

-- ✅ PASO 5: TABLA DE SECUENCIAS Y PLANEACIONES GENERADAS
create table if not exists generated_sequences (
  id uuid default gen_random_uuid() primary key,
  user_email text not null,
  grado text,
  area text,
  tema text,
  content jsonb not null,
  timestamp timestamptz default now()
);

-- ✅ PASO 6: TABLA DE LOGS DE SEGURIDAD
create table if not exists security_logs (
  id uuid default gen_random_uuid() primary key,
  email text not null,
  event text not null,
  severity text not null default 'low',
  ip text,
  "userAgent" text,
  timestamp timestamptz default now()
);

-- ✅ PASO 7: TABLA DE RESPALDO/BACKUP AUTOMÁTICO DE ELIMINACIONES (INDELIBLE)
create table if not exists deleted_records_backup (
  id uuid default gen_random_uuid() primary key,
  table_name text not null,
  original_id text,
  deleted_data jsonb not null,
  deleted_at timestamptz default now()
);

-- ✅ PASO 8: ASEGURAR COLUMNAS SI LA TABLA YA EXISTÍA
alter table app_users add column if not exists areas text[] default '{}';
alter table app_users add column if not exists grados text[] default '{}';
alter table app_users add column if not exists custom_credits int default null;
alter table app_users add column if not exists is_unlimited boolean default false;
alter table app_users add column if not exists unlimited_start_date timestamptz default null;
alter table app_users add column if not exists monthly_price numeric default 15000;
alter table app_users add column if not exists subscription_months int default 1;
alter table app_users add column if not exists created_at timestamptz default now();
alter table api_key_logs add column if not exists action text;
alter table api_key_logs add column if not exists error_message text;

-- ✅ PASO 9: TRIGGER AUTOMÁTICO DE BACKUP AL ELIMINAR REGISTROS
create or replace function fn_backup_deleted_record()
returns trigger as $$
begin
  insert into deleted_records_backup (table_name, original_id, deleted_data, deleted_at)
  values (TG_TABLE_NAME, OLD.id::text, to_jsonb(OLD), now());
  return OLD;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_backup_sequences_delete on generated_sequences;
create trigger trg_backup_sequences_delete
before delete on generated_sequences
for each row execute function fn_backup_deleted_record();

drop trigger if exists trg_backup_users_delete on app_users;
create trigger trg_backup_users_delete
before delete on app_users
for each row execute function fn_backup_deleted_record();

-- ✅ PASO 10: HABILITAR ROW LEVEL SECURITY (RLS) Y CREAR POLÍTICAS PERMISIVAS
alter table app_users enable row level security;
alter table usage_logs enable row level security;
alter table api_key_logs enable row level security;
alter table generated_sequences enable row level security;
alter table security_logs enable row level security;
alter table deleted_records_backup enable row level security;

create policy "guaimaral_users_all" on app_users for all using (true) with check (true);
create policy "guaimaral_logs_all" on usage_logs for all using (true) with check (true);
create policy "guaimaral_api_all" on api_key_logs for all using (true) with check (true);
create policy "guaimaral_seqs_all" on generated_sequences for all using (true) with check (true);
create policy "guaimaral_security_all" on security_logs for all using (true) with check (true);
create policy "guaimaral_backup_all" on deleted_records_backup for all using (true) with check (true);

-- ✅ PASO 11: PUBLICACIÓN CANAL REALTIME
drop publication if exists supabase_realtime;
create publication supabase_realtime for table app_users, usage_logs, api_key_logs, generated_sequences;

-- ✅ PASO 12: REGISTRO E INSERTADO INICIAL DE DOCENTES CON PLANES E ILIMITADOS
insert into app_users (email, password, name, role, areas, grados, is_unlimited, unlimited_start_date, monthly_price, subscription_months) values
('admin@guaimaral.edu.co', 'Mw==', 'Admin', 'admin', '{}', '{}', true, now(), 0, 12),
('jairo.blanco@guaimaral.edu.co', 'Mw==', 'Jairo Blanco', 'docente', '{}', '{}', true, '2026-08-13 12:00:00-05', 15000, 1),
('liliana.valle@guaimaral.edu.co', 'Mw==', 'Liliana Valle', 'docente', '{}', '{}', true, '2026-08-12 12:00:00-05', 15000, 1),
('demo@guaimaral.edu.co', 'Mw==', 'Docente Demo (Ilimitado)', 'docente', '{}', '{}', true, now(), 0, 12),
('alex.sanjuan@guaimaral.edu.co', 'Mw==', 'Alex San Juan', 'docente', '{}', '{}', false, null, 15000, 1),
('deisy.arroyo@guaimaral.edu.co', 'Mw==', 'Deisy Arroyo', 'docente', '{}', '{}', false, null, 15000, 1),
('paula.padilla@guaimaral.edu.co', 'Mw==', 'Paula Padilla', 'docente', '{}', '{}', false, null, 15000, 1),
('rocio.ramirez@guaimaral.edu.co', 'Mw==', 'Rocio Ramírez', 'docente', '{}', '{}', false, null, 15000, 1),
('aleida.lara@guaimaral.edu.co', 'Mw==', 'Aleida Lara', 'docente', '{}', '{}', false, null, 15000, 1),
('alfredo.torres@guaimaral.edu.co', 'Mw==', 'Alfredo Torres', 'docente', '{}', '{}', false, null, 15000, 1),
('asterio.torres@guaimaral.edu.co', 'Mw==', 'Asterio Torres', 'docente', '{"Ciencias Naturales y Educación Ambiental","Educación Artística (Agropecuaria)","Ética y Valores"}', '{"1","2","3","4","5"}', false, null, 15000, 1),
('carlos.sandoval@guaimaral.edu.co', 'Mw==', 'Carlos Sandoval', 'docente', '{}', '{}', false, null, 15000, 1),
('deisy.mercado@guaimaral.edu.co', 'Mw==', 'Deisy Mercado', 'docente', '{"Dimensión Cognitiva","Dimensión Comunicativa","Dimensión Corporal","Dimensión Socioafectiva","Dimensión Espiritual"}', '{"Transición"}', false, null, 15000, 1),
('eduardo@guaimaral.edu.co', 'Mw==', 'Eduardo', 'docente', '{"Tecnología e Informática","Educación Física"}', '{}', false, null, 15000, 1),
('evaristo.vertel@guaimaral.edu.co', 'Mw==', 'Evaristo Vertel', 'docente', '{"Ciencias Naturales y Educación Ambiental","Biología","Química"}', '{}', false, null, 15000, 1),
('ibeth.charris@guaimaral.edu.co', 'Mw==', 'Ibeth Charris', 'docente', '{"Dimensión Cognitiva","Dimensión Comunicativa","Dimensión Corporal","Dimensión Socioafectiva","Dimensión Espiritual"}', '{"Transición"}', false, null, 15000, 1),
('jairo.benavides@guaimaral.edu.co', 'Mw==', 'Jairo Benavides', 'docente', '{"Física","Estadística","Matemáticas","Educación Artística"}', '{}', false, null, 15000, 1),
('jorge.delahoz@guaimaral.edu.co', 'Mw==', 'Jorge de la Hoz', 'docente', '{"Religión","Inglés"}', '{}', false, null, 15000, 1),
('jorge.ferrer@guaimaral.edu.co', 'Mw==', 'Jorge Ferrer', 'docente', '{"Matemáticas","Geometría","Religión","Estadística","Física"}', '{}', false, null, 15000, 1),
('leovigilda.navarro@guaimaral.edu.co', 'Mw==', 'Leovigilda Navarro', 'docente', '{"Integral (Matemáticas, Lenguaje, Sociales, Naturales)"}', '{"Multigrado"}', false, null, 15000, 1),
('linda.varela@guaimaral.edu.co', 'Mw==', 'Linda Varela', 'docente', '{"Lengua Castellana"}', '{}', false, null, 15000, 1),
('martin.celin@guaimaral.edu.co', 'Mw==', 'Martín Celin', 'docente', '{}', '{}', false, null, 15000, 1),
('nancy.vargas@guaimaral.edu.co', 'Mw==', 'Nancy Vargas', 'docente', '{}', '{}', false, null, 15000, 1),
('pedro.arroyo@guaimaral.edu.co', 'Mw==', 'Pedro Arroyo', 'docente', '{}', '{}', false, null, 15000, 1),
('roberto.daza@guaimaral.edu.co', 'Mw==', 'Roberto Daza', 'docente', '{"Ciencias Sociales","Ética y Valores","Filosofía","Cátedra de la Paz"}', '{}', false, null, 15000, 1),
('xilena.santiago@guaimaral.edu.co', 'Mw==', 'Xilena Santiago', 'docente', '{}', '{}', false, null, 15000, 1)
on conflict (email) do update set
  name = excluded.name,
  role = excluded.role,
  areas = case when excluded.areas = '{}' then app_users.areas else excluded.areas end,
  grados = case when excluded.grados = '{}' then app_users.grados else excluded.grados end,
  is_unlimited = app_users.is_unlimited or excluded.is_unlimited,
  unlimited_start_date = coalesce(app_users.unlimited_start_date, excluded.unlimited_start_date);
