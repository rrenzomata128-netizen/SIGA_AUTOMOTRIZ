import React from 'react';
import { UserCheck } from 'lucide-react';

export default function SupervisorValidation({
    setLftModalData,
    selectedPlantFilter,
    setSelectedPlantFilter,
    dateFilterType,
    setDateFilterType,
    todayStr,
    yesterdayStr,
    customStartDate,
    setCustomStartDate,
    customEndDate,
    setCustomEndDate,
    plants,
    showToast,
    handleShiftAbandonment,
    handleValidateAttendance,
    filteredRecords,
}) {
    return (
        <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-sm space-y-3">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                    <div>
                        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                            <UserCheck className="w-5 h-5 text-emerald-600" /> Validación de Turno y Cierre de Asistencia en Planta (Supervisor)
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                            <strong>Regla de Seguridad Operativa:</strong> Una vez que el supervisor valida un registro, queda <strong>bloqueado en Supabase</strong>.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <label className="text-xs font-semibold text-slate-600">Planta:</label>
                        <select
                            value={selectedPlantFilter}
                            onChange={(e) => setSelectedPlantFilter(e.target.value)}
                            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800"
                        >
                            <option value="ALL">Todas las Plantas ({plants.length})</option>
                            {plants.map(p => (
                                <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
                    <span className="text-xs font-semibold text-slate-500 mr-1">Periodo:</span>

                    {[
                        { id: 'TODAY', label: `Hoy (${todayStr})` },
                        { id: 'YESTERDAY', label: `Ayer (${yesterdayStr})` },
                        { id: 'LAST_7_DAYS', label: 'Hace 7 Días (Semanal)' },
                        { id: 'CUSTOM', label: 'Rango de Fechas' }
                    ].map(btn => (
                        <button
                            key={btn.id}
                            type="button"
                            onClick={() => setDateFilterType(btn.id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${dateFilterType === btn.id
                                ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/20'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                }`}
                        >
                            {btn.label}
                        </button>
                    ))}

                    {dateFilterType === 'CUSTOM' && (
                        <div className="flex items-center gap-2 bg-slate-50 px-3 py-1 rounded-lg border border-slate-200 text-xs">
                            <span className="text-slate-500">Inicio:</span>
                            <input
                                type="date"
                                value={customStartDate}
                                onChange={(e) => setCustomStartDate(e.target.value)}
                                className="bg-white text-slate-800 px-2 py-0.5 rounded border border-slate-300 text-xs font-mono"
                            />
                            <span className="text-slate-500">Fin:</span>
                            <input
                                type="date"
                                value={customEndDate}
                                onChange={(e) => setCustomEndDate(e.target.value)}
                                className="bg-white text-slate-800 px-2 py-0.5 rounded border border-slate-300 text-xs font-mono"
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Contenedor de registros agrupados por empleado */}
            <div className="space-y-4">
                {(() => {
                    // 🛡️ DEDUPLICACIÓN INFALIBLE POR LLAVE COMPUESTA OPERATIVA
                    const uniqueMap = new Map();
                    filteredRecords.forEach(rec => {
                        const uniqueKey = `${rec.inspectorId}-${rec.date}-${rec.transportCheckIn || '00:00'}-${rec.plantQrScan || '00:00'}`;
                        if (!uniqueMap.has(uniqueKey)) {
                            uniqueMap.set(uniqueKey, rec);
                        }
                    });
                    const uniqueRecords = Array.from(uniqueMap.values());

                    const groupedMap = {};
                    uniqueRecords.forEach(rec => {
                        if (!groupedMap[rec.inspectorId]) {
                            groupedMap[rec.inspectorId] = {
                                inspectorId: rec.inspectorId,
                                empNo: rec.empNo,
                                inspectorName: rec.inspectorName,
                                plantName: rec.plantName,
                                records: []
                            };
                        }
                        groupedMap[rec.inspectorId].records.push(rec);
                    });
                    const employeeGroups = Object.values(groupedMap);

                    if (employeeGroups.length === 0) {
                        return (
                            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-xs text-slate-400">
                                No hay registros de asistencia para mostrar con los filtros actuales.
                            </div>
                        );
                    }

                    return employeeGroups.map(group => {
                        group.records.sort((a, b) => (a.transportCheckIn || '').localeCompare(b.transportCheckIn || ''));
                        const isDoubleShift = group.records.length > 1;

                        return (
                            <div
                                key={group.inspectorId}
                                className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${isDoubleShift ? 'border-amber-400 ring-2 ring-amber-400/20' : 'border-slate-200'
                                    }`}
                            >
                                {/* Encabezado del empleado */}
                                <div className={`px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b ${isDoubleShift ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'
                                    }`}>
                                    <div className="flex items-center gap-3">
                                        <span className="font-mono font-bold text-xs bg-blue-600 text-white px-2.5 py-1 rounded-md">
                                            {group.empNo}
                                        </span>
                                        <div>
                                            <h3 className="text-sm font-bold text-slate-900">{group.inspectorName}</h3>
                                            <p className="text-[11px] text-slate-500">{group.plantName}</p>
                                        </div>
                                    </div>

                                    {isDoubleShift ? (
                                        <div className="bg-amber-500 text-white text-[10px] font-bold px-3 py-1 rounded-lg flex items-center gap-1.5 shadow-sm">
                                            ⚠️ Turno Doble / Jornada Extra ({group.records.length} registros hoy) - Revisar
                                        </div>
                                    ) : (
                                        <span className="text-xs font-semibold text-slate-600">
                                            {group.records.length} turno(s) en el periodo
                                        </span>
                                    )}
                                </div>

                                {/* Líneas de turnos de este empleado */}
                                <div className="divide-y divide-slate-100 p-4 space-y-3">
                                    {group.records.map((rec, idx) => {
                                        const isLocked = Boolean(rec.validatedBySupervisor);
                                        const uniqueFolio = `${rec.id}-${idx + 1}`.replace('att-', 'Folio ');
                                        const hasLftExcess = rec.overtimeHours > 3 || rec.workedHoursDecimal > 12;

                                        return (
                                            <div
                                                key={`${group.inspectorId}-${idx}-${rec.transportCheckIn}`}
                                                className={`p-4 rounded-xl border flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 transition-all ${isLocked ? 'bg-slate-50 border-slate-200' : 'bg-white border-slate-200 hover:border-blue-300'
                                                    }`}
                                            >
                                                {/* 1. Folio, estatus y turno */}
                                                <div className="space-y-1.5 min-w-[210px] flex-shrink-0">
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                navigator.clipboard.writeText(uniqueFolio);
                                                                showToast(`Copiado al portapapeles: ${uniqueFolio}`);
                                                            }}
                                                            title="Clic para copiar folio"
                                                            className="group inline-flex items-center gap-1.5 text-[10px] font-mono font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 hover:text-indigo-900 px-2.5 py-0.5 rounded-lg border border-indigo-200 transition-all cursor-pointer shadow-xs active:scale-95"
                                                        >
                                                            <span>{uniqueFolio}</span>
                                                            <svg className="w-3 h-3 text-indigo-400 group-hover:text-indigo-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                            </svg>
                                                        </button>

                                                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${rec.status === 'A tiempo' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                            rec.status === 'Retardo' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                                'bg-red-50 text-red-700 border-red-200'
                                                            }`}>
                                                            {rec.status}
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center gap-2 text-xs pt-0.5">
                                                        <span className="font-mono font-bold text-slate-700">{rec.date}</span>
                                                        <span className="text-slate-400">•</span>
                                                        <span className="font-semibold text-slate-800">{rec.shift}</span>
                                                    </div>
                                                </div>

                                                {/* 2. Cuadrícula de horas blindada contra encogimiento */}
                                                <div className="grid grid-cols-4 gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200/80 text-xs text-center flex-1 min-w-[280px] max-w-md">
                                                    <div className="bg-white p-1.5 rounded-lg border border-slate-200">
                                                        <span className="text-slate-400 block text-[10px]">Transporte</span>
                                                        <strong className="font-mono text-blue-600">{rec.transportCheckIn || '--:--'}</strong>
                                                    </div>
                                                    <div className="bg-white p-1.5 rounded-lg border border-slate-200">
                                                        <span className="text-slate-400 block text-[10px]">QR Planta</span>
                                                        <strong className="font-mono text-emerald-600">{rec.plantQrScan || '--:--'}</strong>
                                                    </div>
                                                    <div className="bg-white p-1.5 rounded-lg border border-slate-200">
                                                        <span className="text-slate-400 block text-[10px]">Salida</span>
                                                        <strong className="font-mono text-slate-800">{rec.departureTime || '--:--'}</strong>
                                                    </div>
                                                    <div className="bg-white p-1.5 rounded-lg border border-slate-200">
                                                        <span className="text-slate-400 block text-[10px]">Total Hrs</span>
                                                        <strong className="font-mono text-indigo-600">{rec.workedHoursFormatted || '0.00h'}</strong>
                                                    </div>
                                                </div>

                                                {/* 3. Bloque derecho: Alerta LFT arriba y botones abajo */}
                                                <div className="flex flex-col items-end justify-center gap-2 flex-shrink-0">
                                                    {hasLftExcess ? (
                                                        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-md bg-red-100 text-red-800 border border-red-300 animate-pulse shadow-xs" title="Revision: Supera 3 horas extra diarias o 12h de jornada.">
                                                            ⚠️ Riesgo (+{rec.overtimeHours}h extra)
                                                        </span>
                                                    ) : rec.overtimeHours > 0 ? (
                                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 shadow-xs">
                                                            ⏱️ Extra: +{rec.overtimeHours}h
                                                        </span>
                                                    ) : null}

                                                    <div className="flex flex-wrap items-center justify-end gap-2">
                                                        {isLocked ? (
                                                            <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                                                                🔒 Bloqueado
                                                            </span>
                                                        ) : (
                                                            <span className="text-[11px] font-bold text-amber-700 flex items-center gap-1 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                                                                ⚠️ Pendiente
                                                            </span>
                                                        )}

                                                        <div className="flex items-center gap-1">
                                                            <button
                                                                type="button"
                                                                disabled={isLocked || !rec.departureTime}
                                                                onClick={() => {
                                                                    if (hasLftExcess) {
                                                                        setLftModalData({
                                                                            record: rec,
                                                                            newStatus: 'A tiempo',
                                                                            targetComments: rec.comments
                                                                        });
                                                                    } else {
                                                                        handleValidateAttendance(rec.id, 'A tiempo', 'Ninguno', rec.comments);
                                                                    }
                                                                }}
                                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${isLocked || !rec.departureTime
                                                                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                                                    : hasLftExcess
                                                                        ? 'bg-red-600 hover:bg-red-700 text-white shadow-sm ring-2 ring-red-400/40'
                                                                        : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                                                                    }`}
                                                            >
                                                                {!rec.departureTime ? 'Turno Activo' : hasLftExcess ? 'Validar Riesgo' : 'Validar OK'}
                                                            </button>

                                                            <button
                                                                type="button"
                                                                disabled={isLocked}
                                                                onClick={() => handleValidateAttendance(rec.id, 'Retardo', 'Retardo confirmado en línea', rec.comments)}
                                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${isLocked
                                                                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                                                    : 'bg-amber-500 hover:bg-amber-600 text-white shadow-sm'
                                                                    }`}
                                                            >
                                                                Retardo
                                                            </button>

                                                            {rec.plantQrScan && !rec.departureTime ? (
                                                                <button
                                                                    type="button"
                                                                    disabled={isLocked}
                                                                    onClick={() => handleShiftAbandonment(rec.id, rec.comments)}
                                                                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-orange-600 hover:bg-orange-700 text-white shadow-sm transition-all"
                                                                >
                                                                    Abandono
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    type="button"
                                                                    disabled={isLocked || Boolean(rec.plantQrScan)}
                                                                    onClick={() => handleValidateAttendance(rec.id, 'Falta', 'Inasistencia confirmada en turno', rec.comments)}
                                                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${isLocked || Boolean(rec.plantQrScan)
                                                                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                                                        : 'bg-red-600 hover:bg-red-700 text-white shadow-sm'
                                                                        }`}
                                                                >
                                                                    Falta
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    });
                })()}
            </div>
        </div>
    );
}
