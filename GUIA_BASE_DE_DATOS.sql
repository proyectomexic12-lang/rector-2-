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

-- ✅ PASO 1.5: CREAR TABLA DE COLEGIOS / INSTITUCIONES (ARQUITECTURA MULTI-TENANT SAAS)
create table if not exists institutions (
  id text primary key, -- e.g. 'guaimaral', 'sanjose', 'laesperanza'
  name text not null,
  short_name text not null,
  slug text unique not null,
  logo_url text default '/logo_guaimaral.png',
  primary_color text default '#2563eb',
  accent_color text default '#4f46e5',
  status text default 'active' check (status in ('active', 'inactive')),
  format_schema jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- Registrar colegios iniciales del SaaS
insert into institutions (id, name, short_name, slug, logo_url, primary_color, accent_color, format_schema)
values 
(
  'guaimaral',
  'INSTITUCIÓN EDUCATIVA GUAIMARAL',
  'I.E. Guaimaral',
  'guaimaral',
  '/logo_guaimaral.png',
  '#2563eb',
  '#4f46e5',
  '{"procesoName": "PROCESO: GESTIÓN ACADÉMICA - PREPARACIÓN DE CLASES", "lema": "Calidad Humana y Excelencia Académica", "momento1Name": "Inicio", "momento2Name": "Desarrollo", "momento3Name": "Cierre", "hasCorporeidadAdi": true, "hasEjeCrese": true}'::jsonb
),
(
  'sanjose',
  'COLEGIO INTEGRADO SAN JOSÉ',
  'Col. San José',
  'sanjose',
  '/logo.png',
  '#059669',
  '#10b981',
  '{"procesoName": "PROCESO CURRICULAR - APRENDIZAJE POR COMPETENCIAS", "lema": "Ciencia, Virtud y Liderazgo Innovador", "momento1Name": "Exploración", "momento2Name": "Estructuración", "momento3Name": "Transferencia", "hasCorporeidadAdi": false, "hasEjeCrese": true}'::jsonb
),
(
  'laesperanza',
  'CENTRO EDUCATIVO RURAL LA ESPERANZA',
  'C.E.R. La Esperanza',
  'laesperanza',
  '/logo_minimal.png',
  '#d97706',
  '#f59e0b',
  '{"procesoName": "MODELO PEDAGÓGICO ESCUELA NUEVA RURAL", "lema": "Sembrando Saber en el Campo Colombiano", "momento1Name": "Vivencia", "momento2Name": "Fundamentación", "momento3Name": "Aplicación", "hasCorporeidadAdi": false, "hasEjeCrese": true}'::jsonb
)
on conflict (id) do update set
  name = excluded.name,
  short_name = excluded.short_name,
  logo_url = excluded.logo_url,
  primary_color = excluded.primary_color,
  accent_color = excluded.accent_color,
  format_schema = excluded.format_schema;

-- ✅ PASO 2: CREAR TABLA DE USUARIOS (Con aislamiento institucional)
create table if not exists app_users (
  id uuid default gen_random_uuid() primary key,
  email text unique not null,
  password text not null default 'Mw==',
  name text not null default '',
  role text not null default 'docente' check (role in ('admin', 'docente')),
  institution_id text default 'guaimaral' references institutions(id) on delete set null,
  areas text[] default '{}',
  grados text[] default '{}',
  custom_credits int default null,
  is_unlimited boolean default false,
  unlimited_start_date timestamptz default null,
  monthly_price numeric default 15000,
  subscription_months int default 1,
  created_at timestamptz default now()
);

-- ✅ PASO 2.5: CREAR TABLA DE SESIONES ACTIVAS (Control de acceso único)
create table if not exists active_sessions (
  id uuid default gen_random_uuid() primary key,
  email text unique not null,
  session_token text not null,
  device_id text,
  user_agent text,
  updated_at timestamptz default now()
);

alter table active_sessions enable row level security;
drop policy if exists "guaimaral_active_sessions_all" on active_sessions;
create policy "guaimaral_active_sessions_all" on active_sessions for all using (true) with check (true);

-- ✅ PASO 3: TABLA DE REGISTRO DE USO (USAGE LOGS CON INSTITUCIÓN)
create table if not exists usage_logs (
  id uuid default gen_random_uuid() primary key,
  user_email text not null,
  institution_id text default 'guaimaral' references institutions(id) on delete cascade,
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

-- ✅ PASO 5: TABLA DE SECUENCIAS Y PLANEACIONES GENERADAS (AISLADAS POR COLEGIO)
create table if not exists generated_sequences (
  id uuid default gen_random_uuid() primary key,
  user_email text not null,
  institution_id text default 'guaimaral' references institutions(id) on delete cascade,
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

-- ✅ PASO 7.5: TABLA DE MENSAJES Y CHAT DOCENTE-ADMIN
create table if not exists chat_messages (
  id uuid default gen_random_uuid() primary key,
  sender_email text not null,
  sender_name text not null,
  receiver_email text not null,
  message text not null,
  role text not null check (role in ('admin', 'docente')),
  is_read boolean default false,
  timestamp timestamptz default now()
);

-- ✅ PASO 8: ASEGURAR COLUMNAS MULTI-TENANT E ÍNDICES EN TABLAS EXISTENTES
alter table app_users add column if not exists institution_id text default 'guaimaral' references institutions(id) on delete set null;
alter table generated_sequences add column if not exists institution_id text default 'guaimaral' references institutions(id) on delete cascade;
alter table usage_logs add column if not exists institution_id text default 'guaimaral' references institutions(id) on delete cascade;

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

-- Rellenar registros existentes con 'guaimaral' por retrocompatibilidad para evitar registros huérfanos
update app_users set institution_id = 'guaimaral' where institution_id is null;
update generated_sequences set institution_id = 'guaimaral' where institution_id is null;
update usage_logs set institution_id = 'guaimaral' where institution_id is null;

-- Índices de alto rendimiento para que las búsquedas por colegio sean instantáneas y no se crucen
create index if not exists idx_app_users_institution on app_users(institution_id);
create index if not exists idx_generated_sequences_institution on generated_sequences(institution_id);
create index if not exists idx_generated_sequences_user_inst on generated_sequences(user_email, institution_id);
create index if not exists idx_usage_logs_institution on usage_logs(institution_id);

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

-- ✅ PASO 10: HABILITAR ROW LEVEL SECURITY (RLS) Y CREAR POLÍTICAS
alter table institutions enable row level security;
alter table app_users enable row level security;
alter table usage_logs enable row level security;
alter table api_key_logs enable row level security;
alter table generated_sequences enable row level security;
alter table security_logs enable row level security;
alter table deleted_records_backup enable row level security;
alter table chat_messages enable row level security;

create policy "saas_institutions_all" on institutions for all using (true) with check (true);
create policy "guaimaral_users_all" on app_users for all using (true) with check (true);
create policy "guaimaral_logs_all" on usage_logs for all using (true) with check (true);
create policy "guaimaral_api_all" on api_key_logs for all using (true) with check (true);
create policy "guaimaral_seqs_all" on generated_sequences for all using (true) with check (true);
create policy "guaimaral_security_all" on security_logs for all using (true) with check (true);
create policy "guaimaral_backup_all" on deleted_records_backup for all using (true) with check (true);
create policy "guaimaral_chat_all" on chat_messages for all using (true) with check (true);

-- ✅ PASO 11: PUBLICACIÓN CANAL REALTIME (INCLUYENDO INSTITUTIONS)
drop publication if exists supabase_realtime;
create publication supabase_realtime for table institutions, app_users, usage_logs, api_key_logs, generated_sequences, chat_messages;

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
