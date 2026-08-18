-- ==============================================================================
-- 🏫 I.E. GUAIMARAL - BASE DE DATOS LIMPIA Y FUNCIONAL
-- ==============================================================================
-- INSTRUCCIONES: Copia y pega TODO este código en el SQL Editor de Supabase.
-- Luego dale al botón RUN.
-- ==============================================================================

-- ✅ PASO 1: LIMPIAR POLÍTICAS ANTIGUAS (Evita el error de recursión infinita)
do $$
declare
  pol record;
begin
  for pol in
    select policyname, tablename
    from pg_policies
    where tablename in ('app_users', 'usage_logs', 'api_key_logs', 'generated_sequences', 'security_logs')
  loop
    execute format('drop policy if exists %I on %I', pol.policyname, pol.tablename);
  end loop;
end;
$$;

-- ✅ PASO 2: CREAR TABLAS (Si no existen)
create table if not exists app_users (
  id uuid default gen_random_uuid() primary key,
  email text unique not null,
  password text not null default 'Mw==',
  name text not null default '',
  role text not null default 'docente' check (role in ('admin', 'docente')),
  areas text[] default '{}',
  grados text[] default '{}',
  created_at timestamptz default now()
);

create table if not exists usage_logs (
  id uuid default gen_random_uuid() primary key,
  user_email text not null,
  action text not null,
  timestamp timestamptz default now()
);

create table if not exists api_key_logs (
  id uuid default gen_random_uuid() primary key,
  key_name text not null,
  status text not null,
  action text,
  error_message text,
  timestamp timestamptz default now()
);

create table if not exists generated_sequences (
  id uuid default gen_random_uuid() primary key,
  user_email text not null,
  grado text,
  area text,
  tema text,
  content jsonb not null,
  timestamp timestamptz default now()
);

create table if not exists security_logs (
  id uuid default gen_random_uuid() primary key,
  email text not null,
  event text not null,
  severity text not null default 'low',
  ip text,
  "userAgent" text,
  timestamp timestamptz default now()
);

-- ✅ PASO 3: ASEGURAR COLUMNAS (Por si ya existían sin estas columnas)
alter table app_users add column if not exists areas text[] default '{}';
alter table app_users add column if not exists grados text[] default '{}';
alter table app_users add column if not exists created_at timestamptz default now();

-- ✅ PASO 4: HABILITAR RLS
alter table app_users enable row level security;
alter table usage_logs enable row level security;
alter table api_key_logs enable row level security;
alter table generated_sequences enable row level security;
alter table security_logs enable row level security;

-- ✅ PASO 5: CREAR POLÍTICAS SIMPLES Y SIN RECURSIÓN
create policy "guaimaral_users_all" on app_users for all using (true) with check (true);
create policy "guaimaral_logs_all" on usage_logs for all using (true) with check (true);
create policy "guaimaral_api_all" on api_key_logs for all using (true) with check (true);
create policy "guaimaral_seqs_all" on generated_sequences for all using (true) with check (true);
create policy "guaimaral_security_all" on security_logs for all using (true) with check (true);

-- ✅ PASO 6: REALTIME
drop publication if exists supabase_realtime;
create publication supabase_realtime for table usage_logs, api_key_logs, generated_sequences;

-- ✅ PASO 7: DATOS INICIALES (Solo si la tabla está vacía)
insert into app_users (email, password, name, role, areas, grados) values
('admin@guaimaral.edu.co', 'Mw==', 'Admin', 'admin', '{}', '{}'),
('alex.sanjuan@guaimaral.edu.co', 'Mw==', 'Alex San Juan', 'docente', '{}', '{}'),
('deisy.arroyo@guaimaral.edu.co', 'Mw==', 'Deisy Arroyo', 'docente', '{}', '{}'),
('jairo.blanco@guaimaral.edu.co', 'Mw==', 'Jairo Blanco', 'docente', '{}', '{}'),
('liliana.valle@guaimaral.edu.co', 'Mw==', 'Liliana Valle', 'docente', '{}', '{}'),
('paula.padilla@guaimaral.edu.co', 'Mw==', 'Paula Padilla', 'docente', '{}', '{}'),
('rocio.ramirez@guaimaral.edu.co', 'Mw==', 'Rocio Ramírez', 'docente', '{}', '{}'),
('aleida.lara@guaimaral.edu.co', 'Mw==', 'Aleida Lara', 'docente', '{}', '{}'),
('alfredo.torres@guaimaral.edu.co', 'Mw==', 'Alfredo Torres', 'docente', '{}', '{}'),
('asterio.torres@guaimaral.edu.co', 'Mw==', 'Asterio Torres', 'docente', '{"Ciencias Naturales y Educación Ambiental","Educación Artística (Agropecuaria)","Ética y Valores"}', '{"1","2","3","4","5"}'),
('carlos.sandoval@guaimaral.edu.co', 'Mw==', 'Carlos Sandoval', 'docente', '{}', '{}'),
('deisy.mercado@guaimaral.edu.co', 'Mw==', 'Deisy Mercado', 'docente', '{"Dimensión Cognitiva","Dimensión Comunicativa","Dimensión Corporal","Dimensión Socioafectiva","Dimensión Espiritual"}', '{"Transición"}'),
('eduardo@guaimaral.edu.co', 'Mw==', 'Eduardo', 'docente', '{"Tecnología e Informática","Educación Física"}', '{}'),
('evaristo.vertel@guaimaral.edu.co', 'Mw==', 'Evaristo Vertel', 'docente', '{"Ciencias Naturales y Educación Ambiental","Biología","Química"}', '{}'),
('ibeth.charris@guaimaral.edu.co', 'Mw==', 'Ibeth Charris', 'docente', '{"Dimensión Cognitiva","Dimensión Comunicativa","Dimensión Corporal","Dimensión Socioafectiva","Dimensión Espiritual"}', '{"Transición"}'),
('jairo.benavides@guaimaral.edu.co', 'Mw==', 'Jairo Benavides', 'docente', '{"Física","Estadística","Matemáticas","Educación Artística"}', '{}'),
('jorge.delahoz@guaimaral.edu.co', 'Mw==', 'Jorge de la Hoz', 'docente', '{"Religión","Inglés"}', '{}'),
('jorge.ferrer@guaimaral.edu.co', 'Mw==', 'Jorge Ferrer', 'docente', '{"Matemáticas","Geometría","Religión","Estadística","Física"}', '{}'),
('leovigilda.navarro@guaimaral.edu.co', 'Mw==', 'Leovigilda Navarro', 'docente', '{"Integral (Matemáticas, Lenguaje, Sociales, Naturales)"}', '{"Multigrado"}'),
('linda.varela@guaimaral.edu.co', 'Mw==', 'Linda Varela', 'docente', '{"Lengua Castellana"}', '{}'),
('martin.celin@guaimaral.edu.co', 'Mw==', 'Martín Celin', 'docente', '{}', '{}'),
('nancy.vargas@guaimaral.edu.co', 'Mw==', 'Nancy Vargas', 'docente', '{}', '{}'),
('pedro.arroyo@guaimaral.edu.co', 'Mw==', 'Pedro Arroyo', 'docente', '{}', '{}'),
('roberto.daza@guaimaral.edu.co', 'Mw==', 'Roberto Daza', 'docente', '{"Ciencias Sociales","Ética y Valores","Filosofía","Cátedra de la Paz"}', '{}'),
('xilena.santiago@guaimaral.edu.co', 'Mw==', 'Xilena Santiago', 'docente', '{}', '{}')
on conflict (email) do update set
  name = excluded.name,
  role = excluded.role,
  areas = case when excluded.areas = '{}' then app_users.areas else excluded.areas end,
  grados = case when excluded.grados = '{}' then app_users.grados else excluded.grados end;
