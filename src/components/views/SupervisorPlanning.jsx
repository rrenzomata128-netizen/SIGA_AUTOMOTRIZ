"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { Calendar, Plus } from "lucide-react";
import PlanForm from "./PlanForm";
import PlanList from "./PlanList";
import {
  findPlant,
  friendlyError,
  inspectorsOfPlant,
  plantsForUser,
  shiftsForPlant,
  todayISO,
  tomorrowISO,
} from "./planning-utils";

const PLAN_SELECT = `*, planeacion_inspectores ( inspector_id, orden_trabajo )`;

function inspectorDataFromPlan(plan) {
  const data = {};
  (plan.planeacion_inspectores || []).forEach((row) => {
    data[row.inspector_id] = {
      selected: true,
      ordenTrabajo: row.orden_trabajo || "",
    };
  });
  return data;
}

export default function SupervisorPlanning({
  currentUser,
  plants = [],
  systemUsers = [],
  showToast,
}) {
  const [plans, setPlans] = useState([]);
  const [isFetching, setIsFetching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [busyPlanId, setBusyPlanId] = useState(null);
  const [editing, setEditing] = useState(null);
  const [busyInspectors, setBusyInspectors] = useState(() => new Map());
  const [reloadKey, setReloadKey] = useState(0);
  const formRef = useRef(null);
  const snapshotRef = useRef("");
  const toastRef = useRef(showToast);
  toastRef.current = showToast;

  const userId = currentUser?.id;
  const myPlants = useMemo(
    () => plantsForUser(currentUser, plants),
    [currentUser, plants],
  );

  // The `cancelled` flag prevents a slow response for a previous user from overwriting the current one.
  useEffect(() => {
    if (!userId) {
      setPlans([]);
      return;
    }
    let cancelled = false;
    setIsFetching(true);
    supabase
      .from("planeacion")
      .select(PLAN_SELECT)
      .eq("supervisor_id", userId)
      .order("plan_date", { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error(error);
          toastRef.current?.("Error al cargar planeaciones", "error");
        } else {
          setPlans(data || []);
        }
        setIsFetching(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId, reloadKey]);

  const editingId = editing?.id;
  const editingDate = editing?.planDate;
  const editingShift = editing?.shift;

  // Advisory only: RLS may hide other supervisors' plans. The save_planeacion RPC is the authoritative check.
  useEffect(() => {
    if (!editingDate || !editingShift) {
      setBusyInspectors(new Map());
      return;
    }
    let cancelled = false;
    supabase
      .from("planeacion")
      .select("id, plant_id, planeacion_inspectores ( inspector_id )")
      .eq("plan_date", editingDate)
      .eq("shift", editingShift)
      .then(({ data, error }) => {
        if (cancelled || error) return;
        const map = new Map();
        (data || [])
          .filter((p) => p.id !== editingId)
          .forEach((p) => {
            const code = findPlant(plants, p.plant_id)?.code || p.plant_id;
            (p.planeacion_inspectores || []).forEach((row) =>
              map.set(String(row.inspector_id), code),
            );
          });
        setBusyInspectors(map);
      });
    return () => {
      cancelled = true;
    };
  }, [editingId, editingDate, editingShift, plants]);

  const editingPlant = editing ? findPlant(plants, editing.plantId) : null;
  const availableInspectors = useMemo(
    () => inspectorsOfPlant(systemUsers, editingPlant),
    [systemUsers, editingPlant],
  );
  const availableIds = useMemo(
    () => new Set(availableInspectors.map((i) => String(i.id))),
    [availableInspectors],
  );
  const hiddenSavedCount = editing
    ? Object.entries(editing.inspectorData).filter(
        ([id, v]) => v.selected && !availableIds.has(String(id)),
      ).length
    : 0;

  const openEditor = (draft) => {
    snapshotRef.current = JSON.stringify(draft);
    setEditing(draft);
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      formRef.current
        ?.querySelector("select, input")
        ?.focus({ preventScroll: true });
    });
  };

  const isDirty = () =>
    editing !== null && JSON.stringify(editing) !== snapshotRef.current;

  const confirmDiscard = () =>
    !isDirty() ||
    window.confirm("Tienes cambios sin guardar. ¿Deseas descartarlos?");

  const startNew = () => {
    if (!confirmDiscard()) return;
    const firstPlant = myPlants[0];
    openEditor({
      plantId: firstPlant?.id || "",
      planDate: tomorrowISO(),
      shift: shiftsForPlant(firstPlant)[0],
      notes: "",
      inspectorData: {},
    });
  };

  const startEdit = (plan) => {
    if (plan.locked) {
      showToast?.("Esta planeación ya está bloqueada.", "error");
      return;
    }
    if (!confirmDiscard()) return;
    openEditor({
      id: plan.id,
      plantId: plan.plant_id,
      planDate: plan.plan_date,
      shift: plan.shift,
      notes: plan.notes || "",
      inspectorData: inspectorDataFromPlan(plan),
    });
  };

  const duplicatePlan = (plan) => {
    if (!confirmDiscard()) return;
    const plant = findPlant(plants, plan.plant_id);
    const draft = {
      plantId: plant?.id ?? plan.plant_id,
      planDate: tomorrowISO(),
      shift: plan.shift,
      notes: plan.notes || "",
      inspectorData: inspectorDataFromPlan(plan),
    };
    setEditing(draft);
    // Snapshot an empty draft so that discarding a duplicate still asks for confirmation.
    snapshotRef.current = "";
    requestAnimationFrame(() =>
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
    showToast?.("Planeación duplicada. Revisa la fecha antes de guardar.");
  };

  const cancelEdit = () => {
    if (!confirmDiscard()) return;
    setEditing(null);
  };

  const savePlan = async () => {
    if (!editing?.plantId || !editing?.planDate || !editing?.shift) {
      showToast?.("Completa planta, fecha y turno.", "error");
      return;
    }
    if (!editing.id && editing.planDate < todayISO()) {
      showToast?.(
        "No se pueden crear planeaciones en fechas pasadas.",
        "error",
      );
      return;
    }

    const selected = Object.entries(editing.inspectorData)
      .filter(([id, v]) => v.selected && availableIds.has(String(id)))
      .map(([id, v]) => ({
        inspector_id: id,
        orden_trabajo: (v.ordenTrabajo || "").trim().toUpperCase() || null,
      }));

    if (selected.length === 0) {
      showToast?.("Agrega al menos un inspector.", "error");
      return;
    }

    setIsSaving(true);
    const { error } = await supabase.rpc("save_planeacion", {
      p_id: editing.id ?? null,
      p_supervisor_id: userId,
      p_plant_id: editing.plantId,
      p_plan_date: editing.planDate,
      p_shift: editing.shift,
      p_notes: editing.notes.trim() || null,
      p_inspectores: selected,
    });
    setIsSaving(false);

    if (error) {
      console.error(error);
      showToast?.(friendlyError(error), "error");
      return;
    }
    showToast?.("Planeación guardada.");
    setEditing(null);
    setReloadKey((k) => k + 1);
  };

  const deletePlan = async (plan) => {
    if (
      !window.confirm(
        `¿Eliminar la planeación del ${plan.plan_date} (${plan.shift})? Esta acción no se puede deshacer.`,
      )
    ) {
      return;
    }
    setBusyPlanId(plan.id);
    const { error } = await supabase.rpc("delete_planeacion", {
      p_id: plan.id,
      p_supervisor_id: userId,
    });
    setBusyPlanId(null);
    if (error) {
      console.error(error);
      showToast?.(friendlyError(error), "error");
      return;
    }
    if (editing?.id === plan.id) setEditing(null);
    showToast?.("Planeación eliminada.");
    setReloadKey((k) => k + 1);
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-emerald-600" aria-hidden="true" />
          Planeación de Turnos
        </h2>
        {!editing && (
          <button
            type="button"
            onClick={startNew}
            disabled={myPlants.length === 0}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" /> Nueva planeación
          </button>
        )}
      </div>

      {editing && (
        <PlanForm
          ref={formRef}
          draft={editing}
          setDraft={setEditing}
          myPlants={myPlants}
          plants={plants}
          inspectors={availableInspectors}
          busyInspectors={busyInspectors}
          hiddenSavedCount={hiddenSavedCount}
          isSaving={isSaving}
          onSave={savePlan}
          onCancel={cancelEdit}
        />
      )}

      <PlanList
        plans={plans}
        plants={plants}
        systemUsers={systemUsers}
        isFetching={isFetching}
        busyPlanId={busyPlanId}
        onEdit={startEdit}
        onDuplicate={duplicatePlan}
        onDelete={deletePlan}
      />
    </div>
  );
}
