-- ============================================================
-- ESQUEMA SUPABASE PARA SIGA AUTOMOTRIZ
-- Ejecuta esto en el SQL Editor de tu proyecto Supabase
-- ============================================================

-- Tabla de usuarios del sistema
create table if not exists system_users (
  id text primary key,
  emp_no text unique not null,
  name text not null,
  system_role text not null check (system_role in ('ADMIN','RH','SUPERVISOR','INSPECTOR')),
  role text,
  plant_id jsonb, -- puede ser 'ALL' o array de ids
  shift text,
  phone text,
  pin text,
  active boolean default true,
  created_at timestamptz default now()
);

-- Tabla de plantas
create table if not exists plants (
  id text primary key,
  code text unique not null,
  name text not null,
  supervisor text,
  required_headcount int default 1,
  shifts jsonb,
  active_lines text
);

-- Tabla de registros de asistencia
create table if not exists attendance_records (
  id text primary key,
  inspector_id text references system_users(id),
  emp_no text,
  inspector_name text,
  plant_id text references plants(id),
  plant_name text,
  shift text,
  date date not null,
  transport_check_in text,
  plant_qr_scan text,
  departure_time text,
  status text,
  incident_reason text,
  comments text,
  validated_by_supervisor boolean default false,
  replacement_status text,
  created_at timestamptz default now()
);

-- Tabla de auditoría
create table if not exists audit_log (
  id bigint generated always as identity primary key,
  user_id text,
  user_name text,
  user_role text,
  action text not null,
  details text,
  plant_id text,
  created_at timestamptz default now()
);

-- Índices útiles
create index if not exists idx_attendance_date on attendance_records(date);
create index if not exists idx_attendance_plant on attendance_records(plant_id);
create index if not exists idx_audit_created on audit_log(created_at desc);

-- Habilitar Realtime (opcional, para actualizaciones en vivo)
alter publication supabase_realtime add table attendance_records;
alter publication supabase_realtime add table system_users;
alter publication supabase_realtime add table plants;
