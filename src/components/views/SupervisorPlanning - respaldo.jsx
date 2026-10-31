import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "../../lib/supabaseClient";
import {
  Calendar,
  Users,
  Building2,
  Clock,
  Plus,
  Save,
  Lock,
} from "lucide-react";

export default function SupervisorPlanning({
  currentUser,
  plants = [],
  systemUsers = [],
  showToast,
}) {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(null);

  const myPlants = useMemo(() => {
    const raw = currentUser?.plantId || currentUser?.plant_id;
    if (!raw || raw === "ALL") return plants;
    const keys = (Array.isArray(raw) ? raw : String(raw).split(",")).map((k) =>
      String(k).trim().toUpperCase(),
    );
    return plants.filter(
      (p) =>
        keys.includes(String(p.id).toUpperCase()) ||
        keys.includes(String(p.code).toUpperCase()),
    );
  }, [currentUser, plants]);

  const inspectorsOfPlant = (plantId) => {
    if (!plantId) return [];
    return systemUsers.filter((u) => {
      const role = (u.systemRole || u.system_role || "").toUpperCase();
      if (role !== "INSPECTOR") return false;
      if (u.active === false || u.status === "BAJA") return false;
      const pids = Array.isArray(u.plantId)
        ? u.plantId
        : u.plantId
          ? [u.plantId]
          : [];
      return pids.some(
        (pid) => String(pid).toUpperCase() === String(plantId).toUpperCase(),
      );
    });
  };

  const loadPlans = async () => {
    if (!currentUser?.id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("planeacion")
      .select(`*, planeacion_inspectores ( inspector_id, orden_trabajo )`)
      .eq("supervisor_id", currentUser.id)
      .order("plan_date", { ascending: false });

    if (error) {
      console.error(error);
      showToast?.("Error al cargar planeaciones", "error");
    } else {
      setPlans(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadPlans();
  }, [currentUser?.id]);

  const startNew = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const y = tomorrow.getFullYear();
    const m = String(tomorrow.getMonth() + 1).padStart(2, "0");
    const d = String(tomorrow.getDate()).padStart(2, "0");
    const firstPlant = myPlants[0];
    const firstShift =
      (Array.isArray(firstPlant?.shifts) && firstPlant.shifts[0]) ||
      "Turno 1 (06:00 - 14:30)";
    setEditing({
      plantId: firstPlant?.id || "",
      planDate: `${y}-${m}-${d}`,
      shift: firstShift,
      notes: "",
      inspectorData: {},
    });
  };

  const startEdit = (plan) => {
    if (plan.locked) {
      showToast?.("Esta planeación ya está bloqueada.", "error");
      return;
    }
    const inspectorData = {};
    (plan.planeacion_inspectores || []).forEach((row) => {
      inspectorData[row.inspector_id] = {
        selected: true,
        ordenTrabajo: row.orden_trabajo || "",
      };
    });
    setEditing({
      id: plan.id,
      plantId: plan.plant_id,
      planDate: plan.plan_date,
      shift: plan.shift,
      notes: plan.notes || "",
      inspectorData,
    });
  };

  const toggleInspector = (id) => {
    setEditing((prev) => {
      const current = prev.inspectorData[id] || {
        selected: false,
        ordenTrabajo: "",
      };
      return {
        ...prev,
        inspectorData: {
          ...prev.inspectorData,
          [id]: { ...current, selected: !current.selected },
        },
      };
    });
  };

  const setOrdenTrabajo = (id, value) => {
    setEditing((prev) => {
      const current = prev.inspectorData[id] || {
        selected: true,
        ordenTrabajo: "",
      };
      return {
        ...prev,
        inspectorData: {
          ...prev.inspectorData,
          [id]: { ...current, ordenTrabajo: value, selected: true },
        },
      };
    });
  };

  const savePlan = async () => {
    if (!editing?.plantId || !editing?.planDate || !editing?.shift) {
      showToast?.("Completa planta, fecha y turno.", "error");
      return;
    }

    const selected = Object.entries(editing.inspectorData || {})
      .filter(([, v]) => v.selected)
      .map(([id, v]) => ({
        inspector_id: id,
        orden_trabajo: (v.ordenTrabajo || "").trim(),
      }));

    if (selected.length === 0) {
      showToast?.("Agrega al menos un inspector.", "error");
      return;
    }

    setLoading(true);
    try {
      let planId = editing.id;

      if (planId) {
        const { error } = await supabase
          .from("planeacion")
          .update({
            shift: editing.shift,
            notes: editing.notes,
          })
          .eq("id", planId);
        if (error) throw error;
        await supabase
          .from("planeacion_inspectores")
          .delete()
          .eq("planeacion_id", planId);
      } else {
        const { data, error } = await supabase
          .from("planeacion")
          .insert({
            supervisor_id: currentUser.id,
            plant_id: editing.plantId,
            plan_date: editing.planDate,
            shift: editing.shift,
            notes: editing.notes,
          })
          .select()
          .single();
        if (error) throw error;
        planId = data.id;
      }

      const rows = selected.map((s) => ({
        planeacion_id: planId,
        inspector_id: s.inspector_id,
        orden_trabajo: s.orden_trabajo || null,
      }));
      const { error: e2 } = await supabase
        .from("planeacion_inspectores")
        .insert(rows);
      if (e2) throw e2;

      showToast?.("Planeación guardada.");
      setEditing(null);
      await loadPlans();
    } catch (err) {
      console.error(err);
      showToast?.(err.message || "Error al guardar", "error");
    } finally {
      setLoading(false);
    }
  };

  const availableInspectors = editing ? inspectorsOfPlant(editing.plantId) : [];

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-emerald-600" />
          Planeación de Turnos
        </h2>
        {!editing && (
          <button
            onClick={startNew}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> Nueva planeación
          </button>
        )}
      </div>

      {editing && (
        <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-2 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <label className="text-[11px] font-semibold text-slate-600 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5" /> Planta
              </label>
              <select
                value={editing.plantId}
                onChange={(e) => {
                  if (editing.id) return;
                  const newPlantId = e.target.value;
                  const pl = plants.find(
                    (p) => p.id === newPlantId || p.code === newPlantId,
                  );
                  const firstShift =
                    (Array.isArray(pl?.shifts) && pl.shifts[0]) ||
                    "Turno 1 (06:00 - 14:30)";
                  setEditing({
                    ...editing,
                    plantId: newPlantId,
                    shift: firstShift,
                    inspectorData: {},
                  });
                }}
                disabled={Boolean(editing.id)}
                className="mt-0.5 w-full border border-slate-300 rounded-md px-2 py-1 text-xs bg-white disabled:bg-slate-100 disabled:text-slate-500"
              >
                {myPlants.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} — {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-600 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> Fecha
              </label>
              <input
                type="date"
                value={editing.planDate}
                onChange={(e) => {
                  if (editing.id) return;
                  setEditing({ ...editing, planDate: e.target.value });
                }}
                disabled={Boolean(editing.id)}
                className="mt-0.5 w-full border border-slate-300 rounded-md px-2 py-1 text-xs disabled:bg-slate-100 disabled:text-slate-500"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-600 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Turno
              </label>
              <select
                value={editing.shift}
                onChange={(e) =>
                  setEditing({ ...editing, shift: e.target.value })
                }
                className="mt-0.5 w-full border border-slate-300 rounded-md px-2 py-1 text-xs bg-white"
              >
                {(() => {
                  const pl = plants.find(
                    (p) =>
                      p.id === editing.plantId || p.code === editing.plantId,
                  );
                  let shifts = pl?.shifts;
                  if (!Array.isArray(shifts) || shifts.length === 0) {
                    shifts = [
                      "Turno 1 (06:00 - 14:30)",
                      "Turno 2 (14:00 - 22:30)",
                      "Turno 3 (22:00 - 06:30)",
                    ];
                  }
                  return shifts.map((sh, i) => (
                    <option key={i} value={sh}>
                      {sh}
                    </option>
                  ));
                })()}
              </select>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-600">
              Notas (opcional)
            </label>
            <input
              type="text"
              value={editing.notes}
              onChange={(e) =>
                setEditing({ ...editing, notes: e.target.value })
              }
              className="mt-0.5 w-full border border-slate-300 rounded-md px-2 py-1 text-xs"
              placeholder="Observaciones..."
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-600 flex items-center gap-1 mb-0.5">
              <Users className="w-3.5 h-3.5" /> Inspectores y Orden de Trabajo
            </label>
            {availableInspectors.length === 0 ? (
              <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-1.5">
                No hay inspectores activos asignados a esta planta.
              </p>
            ) : (
              <div className="space-y-1 max-h-52 overflow-y-auto border border-slate-200 rounded-md p-1.5">
                {availableInspectors.map((insp) => {
                  const data = editing.inspectorData?.[insp.id] || {
                    selected: false,
                    ordenTrabajo: "",
                  };
                  return (
                    <div
                      key={insp.id}
                      className={`flex items-center gap-2 px-1.5 py-1 rounded-md text-xs ${data.selected ? "bg-emerald-50 border border-emerald-200" : "hover:bg-slate-50"}`}
                    >
                      <input
                        type="checkbox"
                        checked={data.selected}
                        onChange={() => toggleInspector(insp.id)}
                        className="rounded shrink-0"
                      />
                      <span className="font-medium w-16 shrink-0">
                        {insp.empNo}
                      </span>
                      <span className="text-slate-600 truncate flex-1">
                        {insp.name}
                      </span>
                      <input
                        type="text"
                        placeholder="OT-BWA-01"
                        value={data.ordenTrabajo}
                        onChange={(e) =>
                          setOrdenTrabajo(insp.id, e.target.value)
                        }
                        disabled={!data.selected}
                        className="w-24 border border-slate-300 rounded px-1.5 py-0.5 text-[11px] font-mono disabled:bg-slate-100 disabled:text-slate-400"
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={() => setEditing(null)}
              className="px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-md"
            >
              Cancelar
            </button>
            <button
              onClick={savePlan}
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1 rounded-md flex items-center gap-1.5 disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" /> Guardar planeación
            </button>
          </div>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-3 py-2 border-b border-slate-100 text-xs font-bold text-slate-700">
          Mis planeaciones
        </div>
        {loading && !editing ? (
          <div className="p-3 text-xs text-slate-500">Cargando...</div>
        ) : plans.length === 0 ? (
          <div className="p-3 text-xs text-slate-500">
            No tienes planeaciones aún.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {plans.map((plan) => {
              const plant = plants.find((p) => p.id === plan.plant_id);
              const inspCount = plan.planeacion_inspectores?.length || 0;
              return (
                <div
                  key={plan.id}
                  className="px-3 py-2 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-900">
                        {plant?.code || plan.plant_id} — {plan.plan_date}
                      </span>
                      {plan.locked && (
                        <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                          <Lock className="w-3 h-3" /> Bloqueada
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {plan.shift} · {inspCount} inspector
                      {inspCount !== 1 ? "es" : ""}
                      {plan.notes ? ` · ${plan.notes}` : ""}
                    </div>
                  </div>
                  {!plan.locked && (
                    <button
                      onClick={() => startEdit(plan)}
                      className="text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50 px-2 py-0.5 rounded-md"
                    >
                      Editar
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
