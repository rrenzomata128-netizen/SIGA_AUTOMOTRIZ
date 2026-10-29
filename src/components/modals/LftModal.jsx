import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { logAudit } from '../../lib/audit';

export default function LftModal({
    currentUser,
    lftModalData,
    setLftModalData,
    lftReasonCategory,
    setLftReasonCategory,
    lftDetailText,
    setLftDetailText,
    handleValidateAttendance,
}) {
    return (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white border-2 border-red-500 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
                <div className="px-5 py-3.5 bg-red-600 text-white font-bold text-xs flex items-center justify-between">
                    <span className="flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4 text-white" /> ALERTA DE CALIDAD Y SEGURIDAD: Riesgo por Fatiga Operativa
                    </span>
                    <button
                        type="button"
                        onClick={() => { setLftModalData(null); setLftDetailText(''); }}
                        className="w-6 h-6 rounded-lg hover:bg-white/20 text-white font-bold text-xs"
                    >
                        ✕
                    </button>
                </div>

                <div className="p-6 space-y-4 text-xs text-slate-800">
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 space-y-1.5 text-red-900">
                        <div className="flex justify-between font-bold text-sm">
                            <span>{lftModalData.record.empNo} — {lftModalData.record.inspectorName}</span>
                            <span className="font-mono text-red-700">{lftModalData.record.workedHoursFormatted}</span>
                        </div>
                        <p className="text-[11px] leading-relaxed text-red-800">
                            Esta jornada acumula <strong>+{lftModalData.record.overtimeHours} hrs de sobretiempo</strong> (superando el umbral preventivo de 3h diarias). El exceso de jornada incrementa el riesgo de fatiga visual severa, accidentes y escape de defectos en línea.
                        </p>
                    </div>

                    <div className="space-y-1.5">
                        <label className="font-bold text-slate-700 block">
                            1. Motivo Operativo del Sobretiempo (Auditable por RH y Matriz):
                        </label>
                        <select
                            value={lftReasonCategory}
                            onChange={(e) => setLftReasonCategory(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500"
                        >
                            <option value="Contención crítica solicitada por cliente (con PO)">Contención crítica solicitada por cliente (con PO)</option>
                            <option value="Falta de relevo en línea / Contingencia de personal">Falta de relevo en línea / Contingencia de personal</option>
                            <option value="Retrabajo urgente por riesgo de paro en ensamble">Retrabajo urgente por riesgo de paro en ensamble</option>
                            <option value="Sorteo extraordinario autorizado por Coordinador">Sorteo extraordinario autorizado por Coordinador</option>
                        </select>
                    </div>

                    <div className="space-y-1.5">
                        <label className="font-bold text-slate-700 block">
                            2. Detalle / Justificación del Supervisor (Obligatorio, mín. 10 caracteres):
                        </label>
                        <textarea
                            rows={3}
                            value={lftDetailText}
                            onChange={(e) => setLftDetailText(e.target.value)}
                            placeholder="Indique número de orden del cliente, causa del retraso o motivo por el cual no se envió inspector de relevo..."
                            className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500 font-mono text-[11px]"
                        />
                    </div>

                    <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={() => { setLftModalData(null); setLftDetailText(''); }}
                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            disabled={lftDetailText.trim().length < 10}
                            onClick={async () => {
                                const record = lftModalData.record;
                                const fullJustification = `[SOBRETIEMPO EXTENDIDO AUTORIZADO: ${lftReasonCategory}] Motivo: ${lftDetailText.trim()}`;
                                const updatedComments = `${record.comments || ''} • ${fullJustification}`;

                                await handleValidateAttendance(
                                    record.id,
                                    lftModalData.newStatus,
                                    `Sobretiempo Extendido Justificado: ${lftReasonCategory}`,
                                    updatedComments
                                );

                                await logAudit(
                                    currentUser,
                                    'EXTENDED_OVERTIME_AUTHORIZED',
                                    `Sobretiempo extendido (+${record.overtimeHours}h extra) autorizado para ${record.empNo}. ${fullJustification}`,
                                    record.plantId
                                );

                                setLftModalData(null);
                                setLftDetailText('');
                            }}
                            className={`px-5 py-2 rounded-xl text-white font-bold shadow-md transition-all ${lftDetailText.trim().length < 10
                                ? 'bg-slate-300 cursor-not-allowed'
                                : 'bg-red-600 hover:bg-red-700'
                                }`}
                        >
                            Autorizar y Sellar Registro
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
