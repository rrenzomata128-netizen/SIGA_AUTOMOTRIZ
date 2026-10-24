import React from 'react';
import { Building2, Eye, FileText } from 'lucide-react';

export default function PlantsMonitor({
    plantMonitorSubTab,
    setPlantMonitorSubTab,
    focusedPlantId,
    setFocusedPlantId,
    plants,
    plantMonitorStats,
}) {
    return (
        <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-blue-600" /> Monitor Operativo por Planta Cliente ({plants.length} Plantas en BD)
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                        Supervisión de cobertura por turno, horas acumuladas de sorteo/retrabajo y estatus de validación.
                    </p>
                </div>
                <div className="flex items-center gap-3 text-xs font-semibold">
                    <span className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                        <span className="w-2 h-2 rounded-full bg-emerald-600"></span> 100% Cubierta
                    </span>
                    <span className="flex items-center gap-1.5 text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                        <span className="w-2 h-2 rounded-full bg-amber-500"></span> Retardo
                    </span>
                    <span className="flex items-center gap-1.5 text-red-700 bg-red-50 px-2.5 py-1 rounded-full border border-red-200">
                        <span className="w-2 h-2 rounded-full bg-red-600"></span> Alerta Falta
                    </span>
                </div>
            </div>

            <div className="space-y-4">
                <div className="inline-flex items-center gap-1.5 bg-slate-200/80 p-1.5 rounded-xl border border-slate-300/80">
                    <button
                        type="button"
                        onClick={() => setPlantMonitorSubTab('DETAIL')}
                        className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${plantMonitorSubTab === 'DETAIL'
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-slate-700 hover:bg-white/70'
                            }`}
                    >
                        <Building2 className="w-4 h-4" />
                        1. Vista Detallada (Tarjetas por Planta)
                    </button>

                    <button
                        type="button"
                        onClick={() => setPlantMonitorSubTab('LIST')}
                        className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${plantMonitorSubTab === 'LIST'
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-slate-700 hover:bg-white/70'
                            }`}
                    >
                        <FileText className="w-4 h-4" />
                        2. Vista en Modo Lista (Resumen por Planta)
                    </button>
                </div>

                {plantMonitorSubTab === 'DETAIL' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {plantMonitorStats.map((plant) => {
                            const isExpanded = focusedPlantId === plant.id;
                            return (
                                <div
                                    key={plant.id}
                                    className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
                                >
                                    <div>
                                        <div className="flex justify-between items-start gap-2 border-b border-slate-100 pb-3">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold text-white bg-blue-600 px-2.5 py-0.5 rounded-md">
                                                        {plant.code}
                                                    </span>
                                                    <span className="text-xs text-slate-500">
                                                        Sup: <strong className="text-slate-800">{plant.supervisor}</strong>
                                                    </span>
                                                </div>
                                                <h3 className="text-base font-bold text-slate-900 mt-1.5">{plant.name}</h3>
                                                <p className="text-xs text-slate-500">
                                                    Línea Activa: <span className="text-slate-700 font-semibold">{plant.activeLines}</span>
                                                </p>
                                            </div>

                                            <div className="text-right flex-shrink-0">
                                                <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold border ${plant.healthStatus === 'critical' ? 'bg-red-50 text-red-700 border-red-200' :
                                                    plant.healthStatus === 'warning' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                        'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                    }`}>
                                                    {plant.healthStatus === 'critical' ? 'Falta Detectada' :
                                                        plant.healthStatus === 'warning' ? 'Retardo Activo' : '100% Cubierta'}
                                                </span>
                                                <p className="text-xs text-slate-500 mt-1.5">
                                                    Total Planta: <strong className="text-blue-600 font-mono">{plant.plantHours} hrs</strong>
                                                </p>
                                            </div>
                                        </div>

                                        <div className="mt-3.5">
                                            <div className="flex justify-between text-xs mb-1.5">
                                                <span className="text-slate-500 font-medium">Tasa de Asistencia en Planta</span>
                                                <span className="font-bold text-slate-800">{plant.compliancePct}% ({plant.presentTotal}/{plant.totalRecorded})</span>
                                            </div>
                                            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden flex">
                                                <div style={{ width: `${plant.onTimeBarPct}%` }} className="bg-emerald-500 h-full" />
                                                <div style={{ width: `${plant.lateBarPct}%` }} className="bg-amber-500 h-full" />
                                                <div style={{ width: `${plant.absentBarPct}%` }} className="bg-red-500 h-full" />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-5 gap-2 mt-4 text-center">
                                            <div className="bg-slate-50 p-2 rounded-xl border border-slate-200/70">
                                                <span className="block text-sm font-bold text-emerald-600">{plant.onTime}</span>
                                                <span className="text-[10px] text-slate-500 font-medium">A Tiempo</span>
                                            </div>
                                            <div className="bg-slate-50 p-2 rounded-xl border border-slate-200/70">
                                                <span className="block text-sm font-bold text-amber-600">{plant.late}</span>
                                                <span className="text-[10px] text-slate-500 font-medium">Retardos</span>
                                            </div>
                                            <div className="bg-slate-50 p-2 rounded-xl border border-slate-200/70">
                                                <span className="block text-sm font-bold text-red-600">{plant.absent}</span>
                                                <span className="text-[10px] text-slate-500 font-medium">Faltas</span>
                                            </div>
                                            <div className="bg-slate-50 p-2 rounded-xl border border-slate-200/70">
                                                <span className="block text-sm font-bold text-blue-600">{plant.qrScanned}</span>
                                                <span className="text-[10px] text-slate-500 font-medium">QR Planta</span>
                                            </div>
                                            <div className="bg-slate-50 p-2 rounded-xl border border-slate-200/70">
                                                <span className="block text-sm font-bold text-indigo-600">{plant.plantHours}h</span>
                                                <span className="text-[10px] text-slate-500 font-medium">Hrs Nómina</span>
                                            </div>
                                        </div>

                                        <div className="mt-4 pt-3 border-t border-slate-100">
                                            <p className="text-xs font-bold text-slate-700 mb-2">
                                                Turnos Operativos en {plant.code}:
                                            </p>
                                            <div className="space-y-1.5">
                                                {plant.byShift.map((sh, idx) => (
                                                    <div key={idx} className="flex items-center justify-between bg-slate-50/80 px-3 py-1.5 rounded-lg text-xs border border-slate-200/60">
                                                        <span className="text-slate-700 font-medium truncate pr-2">{sh.shiftName}</span>
                                                        <div className="flex items-center gap-2.5 flex-shrink-0 font-mono text-[11px]">
                                                            <span className="text-slate-500">Reg:<strong className="text-slate-800">{sh.total}</strong></span>
                                                            <span className="text-emerald-600 font-bold">OK:{sh.onTime}</span>
                                                            {sh.late > 0 && <span className="text-amber-600 font-bold">Ret:{sh.late}</span>}
                                                            {sh.absent > 0 && <span className="text-red-600 font-bold">Falta:{sh.absent}</span>}
                                                            <span className="text-blue-600 font-bold">{sh.shHours}h</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {isExpanded && (
                                            <div className="mt-4 pt-3 border-t border-slate-200 space-y-2">
                                                <p className="text-xs font-bold text-slate-800">Detalle de Personal en {plant.name}:</p>
                                                {plant.records.map(r => (
                                                    <div key={r.id} className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                                        <div>
                                                            <span className="font-mono font-bold text-blue-600 mr-1.5">{r.empNo}</span>
                                                            <span className="font-bold text-slate-900">{r.inspectorName}</span>
                                                            <span className="block text-[11px] text-slate-500">{r.shift} ({r.date})</span>
                                                        </div>
                                                        <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px]">
                                                            <span className="bg-white px-2 py-0.5 rounded-md border border-slate-200">In: {r.plantQrScan || '--'}</span>
                                                            <span className="bg-white px-2 py-0.5 rounded-md border border-slate-200">Out: {r.departureTime || '--'}</span>
                                                            <span className="bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200 font-bold text-blue-700">
                                                                {r.workedHoursFormatted} ({r.workedHoursDecimal}h)
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                                        <span className="text-slate-500">
                                            Validados por Sup: <strong className="text-emerald-600">{plant.validated}/{plant.totalRecorded}</strong>
                                        </span>
                                        <button
                                            onClick={() => setFocusedPlantId(isExpanded ? null : plant.id)}
                                            className="bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-600 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
                                        >
                                            <Eye className="w-3.5 h-3.5" />
                                            {isExpanded ? 'Ocultar Personal' : `Ver Inspectores (${plant.totalRecorded})`}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {plantMonitorSubTab === 'LIST' && (
                    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
                        <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center text-xs">
                            <strong className="text-slate-800">
                                Vista de Lista: Resumen Directo por Planta (Total de Inspectores, A Tiempo, Retardos, Faltas)
                            </strong>
                            <span className="text-slate-500 font-mono">
                                Total Plantas: {plantMonitorStats.length}
                            </span>
                        </div>

                        <div className="divide-y divide-slate-100">
                            {plantMonitorStats.map((plant, idx) => (
                                <div
                                    key={plant.id}
                                    className={`px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-colors ${plant.absent > 0
                                        ? 'bg-red-100 hover:bg-red-200 border-l-4 border-red-500'
                                        : 'hover:bg-blue-50/50'
                                        }`}
                                >
                                    <div className="flex items-center gap-2.5 font-bold text-slate-900">
                                        <span className="text-xs font-mono text-slate-400 w-5">
                                            {idx + 1}.
                                        </span>
                                        <span className="text-sm">{plant.name}</span>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 font-mono text-xs">
                                        <span className="bg-slate-100 text-slate-800 px-3 py-1 rounded-lg border border-slate-200">
                                            Total de inspectores: <strong>{plant.totalRecorded}</strong>
                                        </span>
                                        <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-lg border border-emerald-200">
                                            A tiempo: <strong>{plant.onTime}</strong>
                                        </span>
                                        <span className="bg-amber-50 text-amber-700 px-3 py-1 rounded-lg border border-amber-200">
                                            Retardos: <strong>{plant.late}</strong>
                                        </span>
                                        <span className="bg-red-50 text-red-700 px-3 py-1 rounded-lg border border-red-200">
                                            Faltas: <strong>{plant.absent}</strong>
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="bg-slate-50 border-t border-slate-200 px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-bold text-slate-900">
                            <span className="uppercase text-blue-700">
                                TOTAL ACUMULADO ({plantMonitorStats.length} PLANTAS LISTADAS)
                            </span>
                            <div className="flex flex-wrap items-center gap-2 sm:gap-3 font-mono">
                                <span className="bg-white px-3 py-1 rounded-lg border border-slate-200">
                                    Total de inspectores: <strong>{plantMonitorStats.reduce((s, p) => s + p.totalRecorded, 0)}</strong>
                                </span>
                                <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-lg border border-emerald-200">
                                    A tiempo: <strong>{plantMonitorStats.reduce((s, p) => s + p.onTime, 0)}</strong>
                                </span>
                                <span className="bg-amber-50 text-amber-700 px-3 py-1 rounded-lg border border-amber-200">
                                    Retardos: <strong>{plantMonitorStats.reduce((s, p) => s + p.late, 0)}</strong>
                                </span>
                                <span className="bg-red-50 text-red-700 px-3 py-1 rounded-lg border border-red-200">
                                    Faltas: <strong>{plantMonitorStats.reduce((s, p) => s + p.absent, 0)}</strong>
                                </span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
