-- ============================================================================
-- 0002_auth_perfiles.sql   (Fase 1 - paso 1)
-- ADITIVA: crea estructuras nuevas. No modifica ni borra tablas ni políticas
-- actuales, por lo que la app actual sigue funcionando igual.
-- ============================================================================

-- ---------- Perfiles ligados a Supabase Auth ----------
create table if not exists public.profiles (
    id                    uuid primary key references auth.users(id) on delete cascade,
    emp_no                text not null unique,
    name                  text not null,
    system_role           text not null check (system_role in ('ADMIN','RH','SUPERVISOR','INSPECTOR')),
    position              text not null default 'Inspector de Calidad',
    shift                 text,
    phone                 text,
    photo_url             text,
    allow_terminal_switch boolean not null default false,
    status                text not null default 'ACTIVO' check (status in ('ACTIVO','BAJA')),
    legacy_id             text unique,          -- id anterior en system_users (para migrar datos)
    created_at            timestamptz not null default now()
);

-- ---------- Plantas asignadas por usuario (reemplaza el jsonb plant_id) ----------
-- ADMIN y RH ven todas las plantas por rol; SUPERVISOR e INSPECTOR solo las asignadas aquí.
create table if not exists public.user_plants (
    user_id  uuid not null references public.profiles(id) on delete cascade,
    plant_id text not null references public.plants(id)   on delete cascade,
    primary key (user_id, plant_id)
);
create index if not exists idx_user_plants_plant on public.user_plants (plant_id);

-- ---------- Funciones auxiliares para las políticas ----------
-- SECURITY DEFINER para consultar profiles sin entrar en recursión de RLS.
create or replace function public.current_role_name()
returns text language sql stable security definer set search_path = ''
as $$
    select system_role from public.profiles
    where id = auth.uid() and status = 'ACTIVO'
$$;

create or replace function public.has_plant_access(p_plant text)
returns boolean language sql stable security definer set search_path = ''
as $$
    select exists (
               select 1 from public.profiles p
               where p.id = auth.uid() and p.status = 'ACTIVO' and p.system_role in ('ADMIN','RH')
           )
        or exists (
               select 1 from public.user_plants up
               join public.profiles p on p.id = up.user_id
               where up.user_id = auth.uid() and up.plant_id = p_plant and p.status = 'ACTIVO'
           );
$$;

revoke execute on function public.current_role_name()        from public, anon;
revoke execute on function public.has_plant_access(text)     from public, anon;
grant  execute on function public.current_role_name()        to authenticated;
grant  execute on function public.has_plant_access(text)     to authenticated;

-- ---------- RLS ----------
alter table public.profiles   enable row level security;
alter table public.user_plants enable row level security;

-- profiles: cada quien ve su propio perfil
create policy "profiles_select_propio" on public.profiles
    for select to authenticated
    using (id = auth.uid());

-- profiles: ADMIN y RH ven todos
create policy "profiles_select_admin_rh" on public.profiles
    for select to authenticated
    using (public.current_role_name() in ('ADMIN','RH'));

-- profiles: SUPERVISOR ve a quienes comparten alguna de sus plantas
create policy "profiles_select_supervisor" on public.profiles
    for select to authenticated
    using (
        public.current_role_name() = 'SUPERVISOR'
        and exists (
            select 1 from public.user_plants up
            where up.user_id = profiles.id
              and public.has_plant_access(up.plant_id)
        )
    );

-- user_plants: propias, todas para ADMIN/RH, y las de sus plantas para SUPERVISOR
create policy "user_plants_select" on public.user_plants
    for select to authenticated
    using (
        user_id = auth.uid()
        or public.current_role_name() in ('ADMIN','RH')
        or (public.current_role_name() = 'SUPERVISOR' and public.has_plant_access(plant_id))
    );

-- Sin políticas de INSERT/UPDATE/DELETE a propósito:
-- las altas, bajas y cambios de usuarios se harán desde una función de servidor
-- (Edge Function) con llave secreta, nunca desde el navegador.

-- ---------- Verificación (ejecutar después y revisar el resultado) ----------
-- select tablename, policyname, cmd from pg_policies
-- where schemaname = 'public' and tablename in ('profiles','user_plants') order by 1,2;
