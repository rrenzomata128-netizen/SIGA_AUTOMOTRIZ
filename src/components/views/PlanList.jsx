"use client";

import React, { useMemo, useState } from "react";
import { ChevronDown, Copy, Lock, Pencil, Trash2 } from "lucide-react";
import {
  employeeNumber,
  findPlant,
  formatPlanDate,
  todayISO,
} from "./planning-utils";

const TABS = [
  { id: "upcoming", label: "Siguientes" },
  { id: "past", label: "Anteriores" },
];

export default function PlanList({
  plans,
  plants,
  systemUsers,
  isFetching,
  busyPlanId,
  onEdit,
  onDuplicate,
  onDelete,
}) {
  const [tab, setTab] = useState("upcoming");
  const [expandedId, setExpandedId] = useState(null);
  const today = todayISO();

  const usersById = useMemo(
    () => new Map(systemUsers.map((u) => [String(u.id), u])),
    [systemUsers],
  );

  const { upcoming, past } = useMemo(() => {
    const up = [];
    const pa = [];
    plans.forEach((p) => (p.plan_date >= today ? up : pa).push(p));
    up.sort((a, b) => a.plan_date.localeCompare(b.plan_date));
    pa.sort((a, b) => b.plan_date.localeCompare(a.plan_date));
    return { upcoming: up, past: pa };
  }, [plans, today]);

  const visible = tab === "upcoming" ? upcoming : past;
  const counts = { upcoming: upcoming.length, past: past.length };

  return (
    <section
      aria-labelledby="mis-planeaciones"
      className="bg-white border border-slate-200 rounded-xl overflow-hidden"
    >
      <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between gap-2">
        <h3 id="mis-planeaciones" className="text-xs font-bold text-slate-700">
          Mis planeaciones
        </h3>
        <div
          role="tablist"
          aria-label="Filtrar planeaciones"
          className="flex bg-slate-100 rounded-md p-0.5"
        >
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`px-2 py-0.5 text-[11px] font-semibold rounded ${
                tab === t.id
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {t.label}
              <span className="ml-1 text-slate-400 tabular-nums">
                {counts[t.id]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {isFetching && plans.length === 0 ? (
        <div
          className="p-3 space-y-2"
          aria-busy="true"
          aria-label="Cargando planeaciones"
        >
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-8 bg-slate-100 rounded animate-pulse" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="p-4 text-xs text-slate-500 text-center">
          {tab === "upcoming"
            ? "No tienes planeaciones próximas."
            : "No hay planeaciones pasadas."}
        </div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {visible.map((plan) => {
            const plant = findPlant(plants, plan.plant_id);
            const rows = plan.planeacion_inspectores || [];
            const isPast = plan.plan_date < today;
            const editable = !plan.locked && !isPast;
            const expanded = expandedId === plan.id;
            const isBusy = busyPlanId === plan.id;
            const detailsId = `plan-details-${plan.id}`;

            return (
              <li key={plan.id} className={isBusy ? "opacity-50" : undefined}>
                <div className="px-3 py-2 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setExpandedId(expanded ? null : plan.id)}
                    aria-expanded={expanded}
                    aria-controls={detailsId}
                    className="min-w-0 flex-1 text-left flex items-start gap-1.5 group"
                  >
                    <ChevronDown
                      className={`w-3.5 h-3.5 mt-0.5 shrink-0 text-slate-400 transition-transform ${
                        expanded ? "rotate-180" : ""
                      }`}
                      aria-hidden="true"
                    />
                    <span className="min-w-0">
                      <span className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-900 group-hover:text-emerald-700">
                          {formatPlanDate(plan.plan_date)}
                        </span>
                        <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                          {plant?.code || plan.plant_id}
                        </span>
                        {plan.locked && (
                          <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                            <Lock className="w-3 h-3" aria-hidden="true" />{" "}
                            Bloqueada
                          </span>
                        )}
                      </span>
                      <span className="block text-[11px] text-slate-500 truncate">
                        {plan.shift} · {rows.length}{" "}
                        {rows.length === 1 ? "inspector" : "inspectores"}
                        {plan.notes ? ` · ${plan.notes}` : ""}
                      </span>
                    </span>
                  </button>

                  <div className="flex items-center gap-0.5 shrink-0">
                    {editable && (
                      <IconButton
                        label="Editar"
                        onClick={() => onEdit(plan)}
                        disabled={isBusy}
                      >
                        <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                      </IconButton>
                    )}
                    <IconButton
                      label="Duplicar"
                      onClick={() => onDuplicate(plan)}
                      disabled={isBusy}
                    >
                      <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                    </IconButton>
                    {editable && (
                      <IconButton
                        label="Eliminar"
                        tone="danger"
                        onClick={() => onDelete(plan)}
                        disabled={isBusy}
                      >
                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                      </IconButton>
                    )}
                  </div>
                </div>

                {expanded && (
                  <ul id={detailsId} className="px-3 pb-2 pl-8 space-y-0.5">
                    {rows.map((row) => {
                      const u = usersById.get(String(row.inspector_id));
                      return (
                        <li
                          key={row.inspector_id}
                          className="flex items-center gap-2 text-[11px] text-slate-600"
                        >
                          <span className="w-14 shrink-0 tabular-nums font-medium">
                            {employeeNumber(u) || "—"}
                          </span>
                          <span className="truncate flex-1">
                            {u?.name || `ID ${row.inspector_id}`}
                          </span>
                          <span className="font-mono text-slate-500">
                            {row.orden_trabajo || "Sin OT"}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function IconButton({ label, tone, children, ...props }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      className={`p-1.5 rounded-md disabled:opacity-50 ${
        tone === "danger"
          ? "text-red-600 hover:bg-red-50"
          : "text-emerald-700 hover:bg-emerald-50"
      }`}
      {...props}
    >
      {children}
    </button>
  );
}
