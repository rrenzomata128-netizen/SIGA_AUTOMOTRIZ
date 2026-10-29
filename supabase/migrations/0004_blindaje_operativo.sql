-- ============================================================================
-- 0004_blindaje_operativo.sql   (Fase 2 - Blindaje de Columnas y Candado RLS)
-- Protege la integridad de attendance_records a nivel de motor PostgreSQL:
--   1) Un INSPECTOR no puede auto-validarse (validated_by_supervisor) ni
--      alterar registros ya sellados por el supervisor.
--   2) Un SUPERVISOR no puede desbloquear (pasar validated_by_supervisor de
--      true a false) ni modificar un registro que ya fue sellado; solo ADMIN
--      cuenta con la Llave Maestra de Desbloqueo.
-- ============================================================================
begin;

create or replace function public.enforce_attendance_integrity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_role text;
begin
    -- Permitir operaciones de service_role / migraciones sin sesión de usuario
    if auth.uid() is null then
        return new;
    end if;

    v_role := public.current_role_name();

    if tg_op = 'INSERT' then
        if v_role = 'INSPECTOR' then
            new.inspector_id := auth.uid();
            new.validated_by_supervisor := false;
        end if;
        return new;
    end if;

    if tg_op = 'UPDATE' then
        -- 1. Si el registro ya estaba sellado por supervisor:
        if coalesce(old.validated_by_supervisor, false) = true then
            -- Solo ADMIN puede quitar el candado (Llave Maestra)
            if coalesce(new.validated_by_supervisor, false) = false and v_role <> 'ADMIN' then
                raise exception 'Operación bloqueada: Solo un Administrador General puede desbloquear un registro sellado.';
            end if;
            -- Ni SUPERVISOR ni INSPECTOR pueden alterar un registro sellado
            if v_role not in ('ADMIN', 'RH') then
                raise exception 'Operación bloqueada: Este registro ya fue validado y sellado por el supervisor.';
            end if;
        end if;

        -- 2. Restricciones estrictas para INSPECTOR sobre su turno abierto:
        if v_role = 'INSPECTOR' then
            if new.inspector_id is distinct from old.inspector_id
               or new.date is distinct from old.date then
                raise exception 'No puedes alterar los datos base de asignación del turno.';
            end if;
            -- El inspector jamás puede sellar su propia asistencia
            new.validated_by_supervisor := false;
        end if;

        return new;
    end if;

    return new;
end;
$$;

drop trigger if exists trg_enforce_attendance_integrity on public.attendance_records;
create trigger trg_enforce_attendance_integrity
    before insert or update on public.attendance_records
    for each row execute function public.enforce_attendance_integrity();

commit;
