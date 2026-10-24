import React from 'react';
import { Edit3 } from 'lucide-react';

export default function RecordModal({
    setIsRecordModalOpen,
    editingRecord,
    setEditingRecord,
    plants,
    inspectors,
    handleSaveManualRecord,
}) {
    return (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
            <form onSubmit={handleSaveManualRecord} className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden">
                <div className="px-5 py-3.5 bg-slate-900 text-white font-bold text-xs flex items-center justify-between">
                    <span className="flex items-center gap-2">
                        <Edit3 className="w-4 h-4 text-blue-400" /> Registro / Ajuste Oficial de Asistencia en Supabase (RH)
                    </span>
                    <button
                        type="button"
                        onClick={() => setIsRecordModalOpen(false)}
                        className="w-6 h-6 rounded-lg hover:bg-white/10 text-white font-bold text-xs"
                    >
                        ✕
                    </button>
                </div>

                <div className="p-6 space-y-4 text-xs text-slate-800">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <div>
                            <label className="text-slate-700 font-bold block mb-1">Inspector:</label>
                            <select
                                value={editingRecord.inspectorId}
                                onChange={(e) => setEditingRecord({ ...editingRecord, inspectorId: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-900 font-bold"
                            >
                                {inspectors.map(i => (
                                    <option key={i.id} value={i.id}>{i.empNo} - {i.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="text-slate-700 font-bold block mb-1">Fecha:</label>
                            <input
                                type="date"
                                value={editingRecord.date}
                                onChange={(e) => setEditingRecord({ ...editingRecord, date: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-900 font-mono"
                                required
                            />
                        </div>

                        <div>
                            <label className="text-slate-700 font-bold block mb-1">Planta Asignada:</label>
                            <select
                                value={editingRecord.plantId}
                                onChange={(e) => {
                                    const pl = plants.find(p => p.id === e.target.value);
                                    setEditingRecord({
                                        ...editingRecord,
                                        plantId: e.target.value,
                                        shift: pl && pl.shifts?.length ? pl.shifts[0] : editingRecord.shift
                                    });
                                }}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-900"
                            >
                                {plants.map(p => (
                                    <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="text-slate-700 font-bold block mb-1">Estatus Oficial:</label>
                            <select
                                value={editingRecord.status}
                                onChange={(e) => setEditingRecord({ ...editingRecord, status: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-900 font-bold"
                            >
                                <option value="A tiempo">A tiempo</option>
                                <option value="Retardo">Retardo</option>
                                <option value="Falta">Falta</option>
                            </select>
                        </div>

                        {editingRecord.status !== 'Falta' && (
                            <div className="sm:col-span-2 grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                                <div>
                                    <label className="text-[11px] font-bold text-blue-700 block mb-1">Hora Transporte:</label>
                                    <input
                                        type="text"
                                        value={editingRecord.transportCheckIn || ''}
                                        onChange={(e) => setEditingRecord({ ...editingRecord, transportCheckIn: e.target.value })}
                                        placeholder="07:08"
                                        className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs font-mono font-bold text-blue-600 text-center"
                                    />
                                </div>
                                <div>
                                    <label className="text-[11px] font-bold text-emerald-700 block mb-1">Hora QR Planta:</label>
                                    <input
                                        type="text"
                                        value={editingRecord.plantQrScan || ''}
                                        onChange={(e) => setEditingRecord({ ...editingRecord, plantQrScan: e.target.value })}
                                        placeholder="07:09"
                                        className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs font-mono font-bold text-emerald-600 text-center"
                                    />
                                </div>
                                <div>
                                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Hora Salida:</label>
                                    <input
                                        type="text"
                                        value={editingRecord.departureTime || ''}
                                        onChange={(e) => setEditingRecord({ ...editingRecord, departureTime: e.target.value })}
                                        placeholder="--:--"
                                        className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs font-mono font-bold text-slate-800 text-center"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="text-slate-700 font-bold block mb-1">Observaciones / Justificación de Auditoría RH:</label>
                        <input
                            type="text"
                            value={editingRecord.comments || ''}
                            onChange={(e) => setEditingRecord({ ...editingRecord, comments: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-900"
                        />
                    </div>

                    <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={() => setIsRecordModalOpen(false)}
                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700 font-bold transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 rounded-xl text-white font-bold shadow-sm transition-colors cursor-pointer"
                        >
                            Guardar Cambios en Supabase
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}
