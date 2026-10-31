"use client";

import React, { useMemo, useState } from "react";
import { AlertTriangle, Search, Users } from "lucide-react";
import { employeeNumber } from "./planning-utils";

export default function InspectorPicker({
  inspectors,
  inspectorData,
  busyInspectors,
  onToggle,
  onSetOrden,
  onSetMany,
  onApplyOrden,
}) {
  const [query, setQuery] = useState("");
  const [bulkOrden, setBulkOrden] = useState("");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return inspectors;
    return inspectors.filter(
      (i) =>
        String(i.name ?? "").toLowerCase().includes(q) ||
        String(employeeNumber(i)).toLowerCase().includes(q),
    );
  }, [inspectors, query]);

  const selectedCount = inspectors.filter(
    (i) => inspectorData[i.id]?.selected,
  ).length;
  const allVisibleSelected =
    visible.length > 0 && visible.every((i) => inspectorData[i.id]?.selected);

  if (inspectors.length === 0) {
    return (
      <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-2 py-1.5">
        No hay inspectores activos asignados a esta planta.
      </p>
    );
  }

  return (
    <fieldset className="space-y-1.5">
      <legend className="text-[11px] font-semibold text-slate-600 flex items-center gap-1 mb-1">
        <Users className="w-3.5 h-3.5" aria-hidden="true" />
        Inspectores y orden de trabajo
        <span className="ml-1 font-normal text-slate-500" aria-live="polite">
          ({selectedCount} de {inspectors.length} seleccionados)
        </span>
      </legend>

      <div className="flex flex-wrap items-center gap-1.5">
        <div className="relative flex-1 min-w-40">
          <Search
            className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre o No. empleado"
            aria-label="Buscar inspector"
            className="w-full border border-slate-300 rounded-md pl-7 pr-2 py-1 text-xs bg-white"
          />
        </div>
        <button
          type="button"
          onClick={() =>
            onSetMany(
              visible.map((i) => i.id),
              !allVisibleSelected,
            )
          }
          disabled={visible.length === 0}
          className="px-2 py-1 text-[11px] font-semibold text-slate-700 border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50"
        >
          {allVisibleSelected ? "Quitar todos" : "Seleccionar todos"}
        </button>
        <div className="flex items-center gap-1">
          <input
            type="text"
            value={bulkOrden}
            onChange={(e) => setBulkOrden(e.target.value.toUpperCase())}
            placeholder="OT para todos"
            aria-label="Orden de trabajo para todos los seleccionados"
            className="w-28 border border-slate-300 rounded-md px-1.5 py-1 text-[11px] font-mono bg-white"
          />
          <button
            type="button"
            onClick={() => onApplyOrden(bulkOrden.trim())}
            disabled={!bulkOrden.trim() || selectedCount === 0}
            className="px-2 py-1 text-[11px] font-semibold text-emerald-700 border border-emerald-200 rounded-md hover:bg-emerald-50 disabled:opacity-50"
          >
            Aplicar
          </button>
        </div>
      </div>

      <ul className="space-y-1 max-h-64 overflow-y-auto border border-slate-200 rounded-md p-1.5">
        {visible.length === 0 && (
          <li className="text-[11px] text-slate-500 px-1.5 py-1">
            Sin resultados para &quot;{query}&quot;.
          </li>
        )}
        {visible.map((insp) => {
          const data = inspectorData[insp.id] || {
            selected: false,
            ordenTrabajo: "",
          };
          const busyIn = busyInspectors.get(String(insp.id));
          const checkboxId = `insp-${insp.id}`;
          return (
            <li
              key={insp.id}
              className={`flex flex-wrap sm:flex-nowrap items-center gap-x-2 gap-y-1 px-1.5 py-1 rounded-md text-xs border ${
                data.selected
                  ? "bg-emerald-50 border-emerald-200"
                  : "border-transparent hover:bg-slate-50"
              }`}
            >
              <label
                htmlFor={checkboxId}
                className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer"
              >
                <input
                  id={checkboxId}
                  type="checkbox"
                  checked={data.selected}
                  onChange={() => onToggle(insp.id)}
                  className="rounded shrink-0 accent-emerald-600"
                />
                <span className="font-medium w-16 shrink-0 tabular-nums">
                  {employeeNumber(insp)}
                </span>
                <span className="text-slate-700 truncate">{insp.name}</span>
                {busyIn && (
                  <span
                    className="shrink-0 inline-flex items-center gap-0.5 text-[10px] text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded-full"
                    title={`Ya asignado en ${busyIn} para este turno`}
                  >
                    <AlertTriangle className="w-3 h-3" aria-hidden="true" />
                    En {busyIn}
                  </span>
                )}
              </label>
              <input
                type="text"
                placeholder="OT-BWA-01"
                value={data.ordenTrabajo}
                onChange={(e) =>
                  onSetOrden(insp.id, e.target.value.toUpperCase())
                }
                disabled={!data.selected}
                aria-label={`Orden de trabajo de ${insp.name}`}
                className="w-full sm:w-28 border border-slate-300 rounded px-1.5 py-0.5 text-[11px] font-mono bg-white disabled:bg-slate-100 disabled:text-slate-400"
              />
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}
