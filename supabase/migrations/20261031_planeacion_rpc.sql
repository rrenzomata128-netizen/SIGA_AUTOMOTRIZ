-- Before creating the unique indexes, check for existing duplicates (index creation fails if any exist):
--   select supervisor_id, plant_id, plan_date, shift, count(*)
--   from public.planeacion group by 1,2,3,4 having count(*) > 1;

create unique index if not exists planeacion_unique_slot
  on public.planeacion (supervisor_id, plant_id, plan_date, shift);

create unique index if not exists planeacion_inspectores_unique
  on public.planeacion_inspectores (planeacion_id, inspector_id);

-- Atomic create/update: the parent row and its inspectors are written in a single transaction.
-- SECURITY INVOKER keeps the existing RLS policies in effect.
create or replace function public.save_planeacion(
  p_id            public.planeacion.id%type,
  p_supervisor_id public.planeacion.supervisor_id%type,
  p_plant_id      public.planeacion.plant_id%type,
  p_plan_date     public.planeacion.plan_date%type,
  p_shift         public.planeacion.shift%type,
  p_notes         public.planeacion.notes%type,
  p_inspectores   jsonb
)
returns public.planeacion.id%type
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id       public.planeacion.id%type := p_id;
  v_date     public.planeacion.plan_date%type := p_plan_date;
  v_locked   boolean;
  v_conflict text;
begin
  if p_inspectores is null
     or jsonb_typeof(p_inspectores) <> 'array'
     or jsonb_array_length(p_inspectores) = 0 then
    raise exception 'Agrega al menos un inspector.';
  end if;

  if v_id is null then
    if p_plan_date < current_date then
      raise exception 'No se pueden crear planeaciones en fechas pasadas.';
    end if;
  else
    select locked, plan_date into v_locked, v_date
    from planeacion
    where id = v_id and supervisor_id = p_supervisor_id
    for update;

    if not found then
      raise exception 'Planeación no encontrada.';
    end if;
    if coalesce(v_locked, false) then
      raise exception 'Esta planeación ya está bloqueada.';
    end if;
    if v_date < current_date then
      raise exception 'No se pueden editar planeaciones pasadas.';
    end if;
  end if;

  select string_agg(distinct i->>'inspector_id', ', ')
    into v_conflict
  from jsonb_array_elements(p_inspectores) i
  join planeacion_inspectores pi on pi.inspector_id::text = i->>'inspector_id'
  join planeacion p on p.id = pi.planeacion_id
  where p.plan_date = v_date
    and p.shift = p_shift
    and (v_id is null or p.id <> v_id);

  if v_conflict is not null then
    raise exception 'Inspector(es) ya asignado(s) a otra planeación en ese turno: %', v_conflict;
  end if;

  if v_id is null then
    insert into planeacion (supervisor_id, plant_id, plan_date, shift, notes)
    values (p_supervisor_id, p_plant_id, p_plan_date, p_shift, p_notes)
    returning id into v_id;
  else
    update planeacion set shift = p_shift, notes = p_notes where id = v_id;
    delete from planeacion_inspectores where planeacion_id = v_id;
  end if;

  insert into planeacion_inspectores (planeacion_id, inspector_id, orden_trabajo)
  select v_id, r.inspector_id, nullif(upper(trim(r.orden_trabajo)), '')
  from jsonb_populate_recordset(null::planeacion_inspectores, p_inspectores) r;

  return v_id;
end;
$$;

create or replace function public.delete_planeacion(
  p_id            public.planeacion.id%type,
  p_supervisor_id public.planeacion.supervisor_id%type
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_locked boolean;
  v_date   public.planeacion.plan_date%type;
begin
  select locked, plan_date into v_locked, v_date
  from planeacion
  where id = p_id and supervisor_id = p_supervisor_id
  for update;

  if not found then
    raise exception 'Planeación no encontrada.';
  end if;
  if coalesce(v_locked, false) or v_date < current_date then
    raise exception 'Esta planeación ya no se puede eliminar.';
  end if;

  delete from planeacion_inspectores where planeacion_id = p_id;
  delete from planeacion where id = p_id;
end;
$$;

grant execute on function public.save_planeacion to authenticated;
grant execute on function public.delete_planeacion to authenticated;
