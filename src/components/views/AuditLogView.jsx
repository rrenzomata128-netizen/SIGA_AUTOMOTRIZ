import React from 'react';
import { Edit3, FileText, Lock, Plus } from 'lucide-react';

export default function AuditLogView({
    todayStr,
    setIsRecordModalOpen,
    setEditingRecord,
    plants,
    showToast,
    inspectors,
    filteredRecords,
    handleAdminUnlockRecord,
}) {
    return (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                    <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-600" /> Bitácora Oficial de Registros y Auditoría de Tiempos
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                        Trazabilidad completa de marcajes de transporte, escaneo QR en planta, cálculo de horas y edición autorizada en Supabase.
                    </p>
                </div>
                <button
                    onClick={() => {
                        if (inspectors.length === 0 || plants.length === 0) {
                            showToast('Primero registra al menos una planta y un inspector.', 'error');
                            return;
                        }
                        setEditingRecord({
                            id: `att-${Date.now()}`,
                            inspectorId: inspectors[0].id,
                            plantId: plants[0].id,
                            shift: plants[0].shifts?.[0] || 'Turno 1 (06:00 - 14:30)',
                            date: todayStr,
                            transportCheckIn: '05:25',
                            plantQrScan: '05:55',
                            departureTime: '14:30',
                            status: 'A tiempo',
                            incidentReason: 'Ninguno',
                            comments: 'Registro ingresado por Recursos Humanos.',
                            replacementStatus: 'No requerido'
                        });
                        setIsRecordModalOpen(true);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
                >
                    <Plus className="w-4 h-4" /> Nuevo Registro Manual
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                    <thead>
                        <tr className="bg-slate-100/80 text-slate-600 border-b border-slate-200">
                            <th className="p-3.5 font-bold">Fecha / Nómina</th>
                            <th className="p-3.5 font-bold">Inspector</th>
                            <th className="p-3.5 font-bold">Planta / Turno</th>
                            <th className="p-3.5 font-bold">Transporte / QR / Salida</th>
                            <th className="p-3.5 font-bold">Desglose Horas</th>
                            <th className="p-3.5 font-bold">Estatus</th>
                            <th className="p-3.5 font-bold text-center">Acción RH</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredRecords.map((rec) => (
                            <tr key={rec.id} className="hover:bg-blue-50/40 transition-colors">
                                <td className="p-3.5 font-mono">
                                    <span className="text-blue-600 font-bold block">{rec.date}</span>
                                    <span className="text-slate-400 text-[10px]">{rec.empNo}</span>
                                </td>
                                <td className="p-3.5">
                                    <span className="font-bold text-slate-900 block">{rec.inspectorName}</span>
                                    <span className="text-[11px] text-slate-500">{rec.comments}</span>
                                </td>
                                <td className="p-3.5">
                                    <span className="font-semibold text-slate-800 block">{rec.plantName}</span>
                                    <span className="text-[11px] text-slate-500">{rec.shift}</span>
                                </td>
                                <td className="p-3.5 font-mono text-[11px] text-slate-600">
                                    <span className="block">Bus: <strong className="text-slate-800">{rec.transportCheckIn || '--'}</strong></span>
                                    <span className="block">QR In: <strong className="text-emerald-600">{rec.plantQrScan || '--'}</strong></span>
                                    <span className="block">Out: <strong className="text-blue-600">{rec.departureTime || '--'}</strong></span>
                                </td>
                                <td className="p-3.5 font-mono">
                                    <span className="font-bold text-slate-900 block">{rec.workedHoursFormatted} ({rec.workedHoursDecimal}h)</span>
                                    <span className="text-[10px] text-slate-500">
                                        Ord: {rec.regularHours}h | Ext: +{rec.overtimeHours}h
                                    </span>
                                </td>
                                <td className="p-3.5">
                                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${rec.status === 'A tiempo' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                        rec.status === 'Retardo' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                            'bg-red-50 text-red-700 border-red-200'
                                        }`}>
                                        {rec.status}
                                    </span>
                                    {rec.validatedBySupervisor && (
                                        <span className="block text-[10px] text-emerald-700 font-bold mt-1">
                                            🔒 Sellado por Sup.
                                        </span>
                                    )}
                                </td>
                                <td className="p-3.5 text-center">
                                    <div className="flex items-center justify-center gap-1.5">
                                        <button
                                            onClick={() => {
                                                setEditingRecord(rec);
                                                setIsRecordModalOpen(true);
                                            }}
                                            className="bg-slate-100 hover:bg-blue-600 text-slate-700 hover:text-white px-2.5 py-1 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-colors"
                                        >
                                            <Edit3 className="w-3 h-3" /> Editar
                                        </button>
                                        {rec.validatedBySupervisor && (
                                            <button
                                                onClick={() => handleAdminUnlockRecord(rec.id)}
                                                title="Llave Maestra Admin: Desbloquear validación del supervisor"
                                                className="bg-amber-50 hover:bg-amber-500 text-amber-700 hover:text-white border border-amber-200 px-2.5 py-1 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-colors"
                                            >
                                                <Lock className="w-3 h-3" /> Desbloquear
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
