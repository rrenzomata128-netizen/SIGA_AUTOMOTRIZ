import React from 'react';
import { Calculator, Download, ShieldAlert, SlidersHorizontal } from 'lucide-react';
import { formatMinutesToHHMM } from '../../lib/attendanceMetrics';

export default function PayrollView({
    hourlyRateMXN,
    setHourlyRateMXN,
    overtimeMultiplier,
    setSelectedEmployeeDetail,
    globalMetrics,
    payrollByInspector,
    handleExportPayrollCSV,
}) {
    return (
        <div className="space-y-4">
            {/* BANNER DE CONTROL DE RIESGOS LFT Y SOBRETIEMPO */}
            {globalMetrics.lftViolationCount > 0 && (
                <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-red-600 text-white rounded-xl">
                            <ShieldAlert className="w-5 h-5" />
                        </div>
                        <div>
                            <h4 className="text-xs font-bold text-red-950 uppercase tracking-wide">
                                Atención RH: {globalMetrics.lftViolationCount} Jornada(s) con Exceso de Tiempo Extra (más de 3h diarias)
                            </h4>
                            <p className="text-[11px] text-red-800 mt-0.5">
                                Se han detectado jornadas que sobrepasan los límites de tiempo extra. Verifique si el supervisor está cubriendo déficit de personal con sobretiempo en lugar de solicitar plantilla.
                            </p>
                        </div>
                    </div>
                    <span className="bg-red-600 text-white text-xs font-extrabold px-3 py-1 rounded-xl whitespace-nowrap shadow-sm">
                        Riesgo Fatiga
                    </span>
                </div>
            )}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-sm space-y-4">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3">
                    <div>
                        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                            <Calculator className="w-4 h-4 text-blue-600" /> Cálculo de Prenómina, Horas Ordinarias y Tiempo Extra (RH)
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Cálculo exacto a partir de minutos efectivos entre escaneo QR de entrada en planta y registro de salida.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                        <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
                            <SlidersHorizontal className="w-4 h-4 text-blue-600" />
                            <span className="text-slate-700 font-semibold">Tarifa Hora Base ($ MXN):</span>
                            <input
                                type="number"
                                min="1"
                                max="2000"
                                value={hourlyRateMXN}
                                onChange={(e) => setHourlyRateMXN(Math.max(1, Number(e.target.value) || 0))}
                                className="w-16 bg-white border border-slate-300 rounded-lg px-2 py-0.5 text-slate-900 font-mono font-bold text-right"
                            />
                        </div>
                        <button
                            onClick={handleExportPayrollCSV}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-colors"
                        >
                            <Download className="w-4 h-4" /> Exportar a Excel (.CSV)
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-3 border-t border-slate-100">
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                        <span className="text-[11px] text-slate-500 block font-semibold">1. Horas Ordinarias Acumuladas</span>
                        <span className="text-lg font-mono font-extrabold text-slate-900">{globalMetrics.totalRegularHours} hrs</span>
                        <span className="block text-[11px] text-slate-500 mt-0.5">
                            {formatMinutesToHHMM(globalMetrics.totalRegularMinutes)} • ${globalMetrics.regularCostMXN.toLocaleString('es-MX')} MXN
                        </span>
                    </div>

                    <div className="bg-amber-50/60 p-3.5 rounded-xl border border-amber-200/80">
                        <span className="text-[11px] text-amber-800 block font-semibold">2. Horas Extra Autorizadas (x{overtimeMultiplier})</span>
                        <span className="text-lg font-mono font-extrabold text-amber-600">+{globalMetrics.totalOvertimeHours} hrs</span>
                        <span className="block text-[11px] text-amber-700/80 mt-0.5">
                            {formatMinutesToHHMM(globalMetrics.totalOvertimeMinutes)} • ${globalMetrics.overtimeCostMXN.toLocaleString('es-MX')} MXN
                        </span>
                    </div>

                    <div className="bg-emerald-50/70 p-3.5 rounded-xl border border-emerald-200">
                        <span className="text-[11px] text-emerald-800 font-bold block">3. Total Horas Nómina (1 + 2)</span>
                        <span className="text-lg font-mono font-extrabold text-emerald-700">{globalMetrics.totalPayrollHours} hrs</span>
                        <span className="block text-[11px] text-emerald-700 mt-0.5">
                            Tiempo exacto: {globalMetrics.totalFormattedHHMM}
                        </span>
                    </div>

                    <div className="bg-blue-50/70 p-3.5 rounded-xl border border-blue-200">
                        <span className="text-[11px] text-blue-800 font-bold block">4. Importe Estimado Prenómina</span>
                        <span className="text-lg font-mono font-extrabold text-blue-700">
                            ${globalMetrics.totalEstimatedPayrollMXN.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
                        </span>
                        <span className="block text-[11px] text-blue-600 mt-0.5">
                            {payrollByInspector.length} colaboradores en lista
                        </span>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
                <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center text-xs">
                    <strong className="text-slate-800">Cédula de Prenómina Individual por Inspector</strong>
                    <span className="text-slate-500">Haz clic en "Ver Ficha" para auditar el desglose diario</span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                        <thead>
                            <tr className="bg-slate-100/80 text-slate-600 border-b border-slate-200">
                                <th className="p-3.5 font-bold">No. Nómina / Colaborador</th>
                                <th className="p-3.5 font-bold">Planta / Turno Base</th>
                                <th className="p-3.5 font-bold text-center">Días Asist.</th>
                                <th className="p-3.5 font-bold text-center">Incidencias (Ret / Fal)</th>
                                <th className="p-3.5 font-bold text-right">Hrs Ordinarias</th>
                                <th className="p-3.5 font-bold text-right">Hrs Extra</th>
                                <th className="p-3.5 font-bold text-right">Total Horas</th>
                                <th className="p-3.5 font-bold text-right">Importe Estimado</th>
                                <th className="p-3.5 font-bold text-center">Detalle</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {payrollByInspector.map((emp) => (
                                <tr
                                    key={emp.inspectorId}
                                    className={`transition-colors ${emp.hasLftRisk
                                        ? 'bg-red-50/60 hover:bg-red-100/70 border-l-4 border-l-red-500'
                                        : 'hover:bg-blue-50/40'
                                        }`}
                                >
                                    <td className="p-3.5">
                                        <div className="flex items-center gap-1.5">
                                            <span className="font-mono font-bold text-blue-600">{emp.empNo}</span>
                                            {emp.hasLftRisk && (
                                                <span
                                                    className="text-[9px] font-extrabold bg-red-600 text-white px-1.5 py-0.5 rounded shadow-sm animate-pulse"
                                                    title="Jornadas que exceden el límite legal de 3h diarias (Art. 66 LFT)"
                                                >
                                                    ⚠️ RIESGO  ({emp.totalLftRiskCount})
                                                </span>
                                            )}
                                        </div>
                                        <span className="font-bold text-slate-900 block mt-0.5">{emp.inspectorName}</span>
                                    </td>
                                    <td className="p-3.5">
                                        <span className="font-semibold text-slate-800 block">{emp.plantName}</span>
                                        <span className="text-[11px] text-slate-500">{emp.shift}</span>
                                    </td>
                                    <td className="p-3.5 text-center font-mono font-bold text-slate-800">
                                        {emp.daysWorked}/{emp.daysScheduled} ({emp.attendancePct}%)
                                    </td>
                                    <td className="p-3.5 text-center text-slate-700">
                                        <span>{emp.lateDays} Ret. / {emp.absentDays} Fal.</span>
                                        {emp.totalLateMinutes > 0 && (
                                            <span className="block text-[10px] font-mono text-amber-600">({emp.totalLateMinutes}m retardo)</span>
                                        )}
                                    </td>
                                    <td className="p-3.5 text-right font-mono text-slate-700">
                                        {emp.totalRegularHours.toFixed(2)} h
                                    </td>
                                    <td className="p-3.5 text-right font-mono font-bold">
                                        <span className={emp.hasLftRisk ? 'text-red-700 font-extrabold' : 'text-amber-600'}>
                                            +{emp.totalOvertimeHours.toFixed(2)} h
                                        </span>
                                        {emp.hasLftRisk && (
                                            <span className="block text-[9px] font-bold text-red-600 uppercase">
                                                Fatiga
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-3.5 text-right font-mono font-bold text-emerald-700">
                                        {emp.totalHours.toFixed(2)} h ({emp.formattedTotalHHMM})
                                    </td>
                                    <td className="p-3.5 text-right font-mono font-bold text-slate-900">
                                        ${emp.totalPayMXN.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="p-3.5 text-center">
                                        <button
                                            onClick={() => setSelectedEmployeeDetail(emp)}
                                            className="bg-slate-100 hover:bg-blue-600 text-slate-700 hover:text-white px-3 py-1 rounded-lg text-xs font-semibold transition-colors"
                                        >
                                            Ver Ficha
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="bg-slate-100 border-t-2 border-slate-200 font-mono text-xs font-extrabold text-slate-900">
                                <td className="p-3.5" colSpan={4}>TOTALES CONSOLIDADOS DEL PERIODO (CUADRE EXACTO)</td>
                                <td className="p-3.5 text-right">{globalMetrics.totalRegularHours.toFixed(2)} h</td>
                                <td className="p-3.5 text-right text-amber-600">+{globalMetrics.totalOvertimeHours.toFixed(2)} h</td>
                                <td className="p-3.5 text-right text-emerald-700">{globalMetrics.totalPayrollHours.toFixed(2)} h</td>
                                <td className="p-3.5 text-right text-blue-700">
                                    ${globalMetrics.totalEstimatedPayrollMXN.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="p-3.5"></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </div>
    );
}
