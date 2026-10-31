"use client";

import React, { forwardRef, useId } from "react";
import { AlertTriangle, Building2, Calendar, Clock, Loader2, Save } from "lucide-react";
import InspectorPicker from "./InspectorPicker";
import { findPlant, shiftsForPlant, todayISO } from "./planning-utils";

const fieldClass =
  "mt-0.5 w-full border border-slate-300 rounded-md px-2 py-1 text-xs bg-white disabled:bg-slate-100 disabled:text-slate-500";
const labelClass =
  "text-[11px] font-semibold text-slate-600 flex items-center gap-1";

const PlanForm = forwardRef(function PlanForm(
  {
    draft,
    setDraft,
    myPlants,
    plants,
    inspectors,
    busyInspectors,
    hiddenSavedCount,
    isSaving,
    onSave,
    onCancel,
  },
  ref,
) {
  const uid = useId();
  const isEdit = Boolean(draft.id);
  const plant = findPlant(plants, draft.plantId);
  const shifts = shiftsForPlant(plant);

  const updateInspector = (id, patch) =>
    setDraft((prev) => {
      const current = prev.inspectorData[id] || {
        selected: false,
        ordenTrabajo: "",
      };
      return {
        ...prev,
        inspectorData: { ...prev.inspectorData, [id]: { ...current, ...patch } },
      };
    });

  const setMany = (ids, selected) =>
    setDraft((prev) => {
      const next = { ...prev.inspectorData };
      ids.forEach((id) => {
        next[id] = { ordenTrabajo: "", ...next[id], selected };
      });
      return { ...prev, inspectorData: next };
    });

  const applyOrden = (orden) =>
    setDraft((prev) => {
      const next = { ...prev.inspectorData };
      Object.keys(next).forEach((id) => {
        if (next[id].selected) next[id] = { ...next[id], ordenTrabajo: orden };
      });
      return { ...prev, inspectorData: next };
    });

  const handlePlantChange = (plantId) => {
    const pl = findPlant(plants, plantId);
    setDraft((prev) => ({
      ...prev,
      plantId,
      shift: shiftsForPlant(pl)[0],
      inspectorData: {},
    }));
  };

  return (
    <form
      ref={ref}
      onSubmit={(e) => {
        e.preventDefault();
        onSave();
      }}
      aria-label={isEdit ? "Editar planeación" : "Nueva planeación"}
      className="bg-white border border-slate-200 rounded-xl p-3 space-y-2.5 shadow-sm scroll-mt-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-slate-800">
          {isEdit ? "Editar planeación" : "Nueva planeación"}
        </h3>
        {isEdit && (
          <span className="text-[10px] text-slate-500">
            La planta y la fecha no se pueden cambiar
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div>
          <label htmlFor={`${uid}-plant`} className={labelClass}>
            <Building2 className="w-3.5 h-3.5" aria-hidden="true" /> Planta
          </label>
          <select
            id={`${uid}-plant`}
            value={draft.plantId}
            onChange={(e) => handlePlantChange(e.target.value)}
            disabled={isEdit}
            className={fieldClass}
          >
            {myPlants.map((p) => (
              <option key={p.id} value={p.id}>
                {p.code} — {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`${uid}-date`} className={labelClass}>
            <Calendar className="w-3.5 h-3.5" aria-hidden="true" /> Fecha
          </label>
          <input
            id={`${uid}-date`}
            type="date"
            value={draft.planDate}
            min={isEdit ? undefined : todayISO()}
            onChange={(e) =>
              setDraft((prev) => ({ ...prev, planDate: e.target.value }))
            }
            disabled={isEdit}
            required
            className={fieldClass}
          />
        </div>
        <div>
          <label htmlFor={`${uid}-shift`} className={labelClass}>
            <Clock className="w-3.5 h-3.5" aria-hidden="true" /> Turno
          </label>
          <select
            id={`${uid}-shift`}
            value={draft.shift}
            onChange={(e) =>
              setDraft((prev) => ({ ...prev, shift: e.target.value }))
            }
            className={fieldClass}
          >
            {shifts.map((sh) => (
              <option key={sh} value={sh}>
                {sh}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor={`${uid}-notes`} className={labelClass}>
          Notas (opcional)
        </label>
        <input
          id={`${uid}-notes`}
          type="text"
          value={draft.notes}
          onChange={(e) =>
            setDraft((prev) => ({ ...prev, notes: e.target.value }))
          }
          maxLength={500}
          className={fieldClass}
          placeholder="Observaciones..."
        />
      </div>

      <InspectorPicker
        inspectors={inspectors}
        inspectorData={draft.inspectorData}
        busyInspectors={busyInspectors}
        onToggle={(id) =>
          updateInspector(id, {
            selected: !draft.inspectorData[id]?.selected,
          })
        }
        onSetOrden={(id, ordenTrabajo) => updateInspector(id, { ordenTrabajo })}
        onSetMany={setMany}
        onApplyOrden={applyOrden}
      />

      {hiddenSavedCount > 0 && (
        <p className="flex items-start gap-1.5 text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-2 py-1.5">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" aria-hidden="true" />
          {hiddenSavedCount === 1
            ? "1 inspector guardado ya no está activo en esta planta y se quitará al guardar."
            : `${hiddenSavedCount} inspectores guardados ya no están activos en esta planta y se quitarán al guardar.`}
        </p>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className="px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-md disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isSaving}
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1 rounded-md flex items-center gap-1.5 disabled:opacity-60"
        >
          {isSaving ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <Save className="w-3.5 h-3.5" aria-hidden="true" />
          )}
          {isSaving ? "Guardando…" : "Guardar planeación"}
        </button>
      </div>
    </form>
  );
});

export default PlanForm;
