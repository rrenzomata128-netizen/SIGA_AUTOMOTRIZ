import React from 'react';
import { CheckCircle2, ShieldAlert, UserPlus } from 'lucide-react';

export default function ZeroSlackView({
    handleAssignBackup,
    filteredRecords,
    globalMetrics,
}) {
    return (
        <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                <div>
                    <h2 className="text-sm font-bold text-red-600 flex items-center gap-2">
                        <ShieldAlert className="w-5 h-5" /> Centro de Reacción (Faltas y Retardos Críticos)
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                        Monitoreo de inspectores que no abordaron el transporte o registraron retardo para envío inmediato de comodín.
                    </p>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold">
                    <span className="bg-red-50 text-red-700 border border-red-200 px-3 py-1 rounded-full">
                        {globalMetrics.absentCount} Faltas en Periodo
                    </span>
                    <span className="bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1 rounded-full">
                        {globalMetrics.lateCount} Retardos en Periodo
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredRecords
                    .filter(r => r.status === 'Falta' || r.status === 'Retardo')
                    .map(rec => (
                        <div key={rec.id} className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-sm flex flex-col justify-between space-y-3.5">
                            <div className="space-y-2.5">
                                <div className="flex justify-between items-start border-b border-slate-100 pb-2">
                                    <span className="text-xs font-mono font-bold bg-slate-100 px-2.5 py-0.5 rounded-md text-slate-700">
                                        {rec.date} • {rec.empNo}
                                    </span>
                                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${rec.status === 'Retardo' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-red-50 text-red-700 border-red-200'
                                        }`}>
                                        {rec.status === 'Retardo' ? `Retardo (+${rec.lateMinutes}m)` : 'FALTA CRÍTICA'}
                                    </span>
                                </div>

                                <div>
                                    <h4 className="font-bold text-slate-900 text-sm">{rec.inspectorName}</h4>
                                    <p className="text-xs text-blue-600 font-bold">{rec.plantName}</p>
                                    <p className="text-xs text-slate-500">{rec.shift}</p>
                                </div>

                                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 text-xs space-y-1.5">
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Check-in Transporte:</span>
                                        <span className="font-mono font-bold text-blue-600">{rec.transportCheckIn || 'No abordó'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Entrada QR Planta:</span>
                                        <span className="font-mono font-bold text-emerald-600">{rec.plantQrScan || 'Sin registro'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Causa:</span>
                                        <span className="text-red-600 font-semibold text-right">{rec.incidentReason}</span>
                                    </div>
                                    {rec.status === 'Falta' && (
                                        <div className="flex justify-between pt-1.5 border-t border-slate-200">
                                            <span className="text-slate-500">Cobertura:</span>
                                            <span className={`font-bold ${rec.replacementStatus?.includes('Asignado') ? 'text-emerald-600' : 'text-amber-600'}`}>
                                                {rec.replacementStatus || 'Pendiente Comodín'}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="pt-2 border-t border-slate-100">
                                {rec.status === 'Falta' && !rec.replacementStatus?.includes('Asignado') ? (
                                    <button
                                        onClick={() => handleAssignBackup(rec.id)}
                                        className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-colors"
                                    >
                                        <UserPlus className="w-4 h-4" /> Enviar Inspector Comodín
                                    </button>
                                ) : (
                                    <span className="text-xs text-emerald-600 font-bold flex items-center gap-1.5">
                                        <CheckCircle2 className="w-4 h-4" /> Incidencia atendida y documentada en BD
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
            </div>
        </div>
    );
}
