import React from 'react';

export default function EmployeeDetailModal({
    selectedEmployeeDetail,
    setSelectedEmployeeDetail,
}) {
    return (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden">
                <div className="px-5 py-3.5 bg-slate-900 text-white font-bold text-xs flex items-center justify-between">
                    <span>Ficha de Auditoría Individual — {selectedEmployeeDetail.empNo} ({selectedEmployeeDetail.inspectorName})</span>
                    <button
                        onClick={() => setSelectedEmployeeDetail(null)}
                        className="w-6 h-6 rounded-lg hover:bg-white/10 text-white font-bold text-xs"
                    >
                        ✕
                    </button>
                </div>

                <div className="p-6 space-y-4 text-xs text-slate-800">
                    <div className="grid grid-cols-3 gap-3 text-center">
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                            <span className="text-[11px] text-slate-500 block">Horas Ordinarias</span>
                            <strong className="font-mono text-base text-slate-900">{selectedEmployeeDetail.totalRegularHours.toFixed(2)} h</strong>
                        </div>
                        <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-200">
                            <span className="text-[11px] text-amber-800 block">Horas Extra</span>
                            <strong className="font-mono text-base text-amber-600">+{selectedEmployeeDetail.totalOvertimeHours.toFixed(2)} h</strong>
                        </div>
                        <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                            <span className="text-[11px] text-emerald-800 font-bold block">Total Nómina</span>
                            <strong className="font-mono text-base text-emerald-700">
                                {selectedEmployeeDetail.totalHours.toFixed(2)} h ({selectedEmployeeDetail.formattedTotalHHMM})
                            </strong>
                        </div>
                    </div>

                    <div className="space-y-2 max-h-64 overflow-y-auto bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                        <p className="text-xs font-bold text-slate-800 mb-2">Desglose de Jornadas en el Periodo:</p>
                        {selectedEmployeeDetail.sessions.map(s => (
                            <div key={s.id} className="bg-white p-3 rounded-xl border border-slate-200 text-xs flex justify-between items-center">
                                <div>
                                    <span className="font-mono font-bold text-blue-600">{s.date}</span>
                                    <span className="text-slate-600 ml-2">Entrada QR: {s.plantQrScan || '--'} | Salida: {s.departureTime || '--'}</span>
                                    <p className="text-[11px] text-slate-500 mt-0.5">{s.comments}</p>
                                </div>
                                <div className="text-right font-mono">
                                    <span className="font-bold text-slate-900 block">{s.workedHoursFormatted} ({s.workedHoursDecimal}h)</span>
                                    <span className="text-[10px] text-slate-500">Ord: {s.regularHours}h | Ext: +{s.overtimeHours}h</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-end">
                        <button
                            onClick={() => setSelectedEmployeeDetail(null)}
                            className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2 rounded-xl text-xs font-bold transition-colors"
                        >
                            Cerrar Ventana
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
