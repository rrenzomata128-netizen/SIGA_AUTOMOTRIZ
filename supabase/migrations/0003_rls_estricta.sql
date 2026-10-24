-- ============================================================================
-- 0003_rls_estricta.sql   (Fase 1 - paso 3)
-- EJECUTAR UNA SOLA VEZ, y SOLO después de:
--   1) 0002_auth_perfiles.sql ejecutado
--   2) usuarios migrados (migrar-usuarios.mjs) y plantas reparadas (reparar-plantas.mjs)
--   3) la app nueva (login con Supabase Auth) ya puesta en tu proyecto
-- Todo corre en una transacción: si algo falla, no se aplica nada.
-- ============================================================================
begin;

-- ---------- 1. attendance_records.inspector_id pasa a uuid de profiles ----------
alter table public.attendance_records drop constraint if exists attendance_records_inspector_id_fkey;
alter table public.attendance_records add column inspector_uid uuid;

update public.attendance_records a
   set inspector_uid = p.id
  from public.profiles p
 where p.legacy_id = a.inspector_id;

alter table public.attendance_records rename column inspector_id  to inspector_id_legacy;
alter table public.attendance_records rename column inspector_uid to inspector_id;
alter table public.attendance_records
    add constraint attendance_records_inspector_id_fkey
    foreign key (inspector_id) references public.profiles(id);
create index if not exists idx_attendance_inspector on public.attendance_records (inspector_id);

-- ---------- 2. Quitar TODAS las políticas abiertas ----------
do $$
declare r record;
begin
    for r in
        select schemaname, tablename, policyname from pg_policies
        where schemaname = 'public'
          and tablename in ('plants','system_users','attendance_records','audit_log')
    loop
        execute format('drop policy %I on %I.%I', r.policyname, r.schemaname, r.tablename);
    end loop;
end $$;

-- Defensa extra: el rol anónimo no necesita tocar ninguna tabla (el login usa Auth, no tablas)
revoke all on all tables in schema public from anon;
alter default privileges in schema public revoke all on tables from anon;

-- La tabla vieja queda sin políticas = inaccesible desde la app (se conserva solo como respaldo)
revoke all on public.system_users from authenticated;

-- ---------- 3. Políticas nuevas ----------
-- plants
create policy plants_select on public.plants for select to authenticated
    using (public.has_plant_access(id));
create policy plants_insert on public.plants for insert to authenticated
    with check (public.current_role_name() in ('ADMIN','RH'));
create policy plants_update on public.plants for update to authenticated
    using (public.current_role_name() in ('ADMIN','RH'))
    with check (public.current_role_name() in ('ADMIN','RH'));

-- attendance_records
create policy att_select on public.attendance_records for select to authenticated
    using (
        inspector_id = auth.uid()
        or (public.current_role_name() in ('ADMIN','RH','SUPERVISOR') and public.has_plant_access(plant_id))
    );

create policy att_insert on public.attendance_records for insert to authenticated
    with check (
        public.current_role_name() in ('ADMIN','RH')
        or (inspector_id = auth.uid() and public.has_plant_access(plant_id))
    );

create policy att_update on public.attendance_records for update to authenticated
    using (
        public.current_role_name() in ('ADMIN','RH')
        or (public.current_role_name() = 'SUPERVISOR' and public.has_plant_access(plant_id))
        or (inspector_id = auth.uid() and not coalesce(validated_by_supervisor, false))
    )
    with check (
        public.current_role_name() in ('ADMIN','RH')
        or (public.current_role_name() = 'SUPERVISOR' and public.has_plant_access(plant_id))
        or (inspector_id = auth.uid() and not coalesce(validated_by_supervisor, false) and public.has_plant_access(plant_id))
    );
-- Sin política DELETE: nadie borra asistencias desde la app.

-- audit_log: solo ADMIN/RH leen; cualquiera autenticado inserta (identidad forzada por trigger)
create policy audit_select on public.audit_log for select to authenticated
    using (public.current_role_name() in ('ADMIN','RH'));
create policy audit_insert on public.audit_log for insert to authenticated
    with check (user_id = auth.uid()::text);

create or replace function public.audit_fill_identity()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare p record;
begin
    if auth.uid() is not null then
        select name, system_role into p from public.profiles where id = auth.uid();
        new.user_id   := auth.uid()::text;
        new.user_name := coalesce(p.name, new.user_name);
        new.user_role := coalesce(p.system_role, new.user_role);
    end if;
    new.created_at := now();
    return new;
end $$;

drop trigger if exists audit_fill_identity on public.audit_log;
create trigger audit_fill_identity before insert on public.audit_log
    for each row execute function public.audit_fill_identity();

-- ---------- 4. Realtime para las tablas nuevas ----------
do $$
begin
    if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='profiles') then
        alter publication supabase_realtime add table public.profiles;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='user_plants') then
        alter publication supabase_realtime add table public.user_plants;
    end if;
end $$;

commit;

-- ---------- Verificación (ejecutar después, una por una) ----------
-- select tablename, policyname, cmd, roles from pg_policies where schemaname='public' order by 1,2;
-- select count(*) as asistencias_sin_inspector from public.attendance_records
--  where inspector_id is null and inspector_id_legacy is not null;
-- Cuando todo funcione y ya no necesites el respaldo:
-- drop table public.system_users;
