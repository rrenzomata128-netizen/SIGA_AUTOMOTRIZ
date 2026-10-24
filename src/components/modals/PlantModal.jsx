import React from 'react';
import { Building2 } from 'lucide-react';

export default function PlantModal({
    setIsPlantModalOpen,
    editingPlant,
    setEditingPlant,
    handleSavePlant,
}) {
    return (
        <div className="fixed inset-0 z-50 bg-slate-900/55 backdrop-blur-sm flex items-center justify-center p-4">
            <form onSubmit={handleSavePlant} className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden">
                <div className="px-5 py-3.5 bg-emerald-900 text-white font-bold text-xs flex items-center justify-between">
                    <span className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-emerald-300" />
                        {editingPlant.isNew ? 'Generar Nueva Planta Cliente en Supabase' : `Editar Planta — ${editingPlant.code}`}
                    </span>
                    <button
                        type="button"
                        onClick={() => setIsPlantModalOpen(false)}
                        className="w-6 h-6 rounded-lg hover:bg-white/10 text-white font-bold text-xs"
                    >
                        ✕
                    </button>
                </div>

                <div className="p-6 space-y-4 text-xs text-slate-800">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                        <div>
                            <label className="text-slate-700 font-bold block mb-1">Código Corto (QR):</label>
                            <input
                                type="text"
                                value={editingPlant.code}
                                onChange={(e) => setEditingPlant({ ...editingPlant, code: e.target.value })}
                                placeholder="Ej. BMW-SLP"
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono font-bold uppercase text-slate-900"
                                required
                            />
                        </div>

                        <div className="sm:col-span-2">
                            <label className="text-slate-700 font-bold block mb-1">Nombre de la Planta Cliente:</label>
                            <input
                                type="text"
                                value={editingPlant.name}
                                onChange={(e) => setEditingPlant({ ...editingPlant, name: e.target.value })}
                                placeholder="Ej. BorgWarner Complejo Ramos Arizpe"
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-semibold text-slate-900"
                                required
                            />
                        </div>

                        <div className="sm:col-span-2">
                            <label className="text-slate-700 font-bold block mb-1">Supervisor o Encargado Asignado:</label>
                            <input
                                type="text"
                                value={editingPlant.supervisor}
                                onChange={(e) => setEditingPlant({ ...editingPlant, supervisor: e.target.value })}
                                placeholder="Ej. Ing. Roberto Morales"
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900"
                                required
                            />
                        </div>

                        <div>
                            <label className="text-slate-700 font-bold block mb-1">Inspectores Req.:</label>
                            <input
                                type="number"
                                min="1"
                                max="100"
                                value={editingPlant.requiredHeadcount}
                                onChange={(e) => setEditingPlant({ ...editingPlant, requiredHeadcount: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono font-bold text-slate-900"
                            />
                        </div>

                        <div className="sm:col-span-3">
                            <label className="text-slate-700 font-bold block mb-1">Líneas / Área de Sorteo o Retrabajo:</label>
                            <input
                                type="text"
                                value={editingPlant.activeLines}
                                onChange={(e) => setEditingPlant({ ...editingPlant, activeLines: e.target.value })}
                                placeholder="Ej. Sorteo de Arneses / Contención de Motores"
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900"
                            />
                        </div>

                        <div className="sm:col-span-3">
                            <label className="text-slate-700 font-bold block mb-1">Esquema de Turnos de la Planta:</label>
                            <div className="flex flex-wrap gap-2 mb-2">
                                <button
                                    type="button"
                                    onClick={() => setEditingPlant({
                                        ...editingPlant,
                                        shiftScheme: '3X8',
                                        shiftsText: 'Turno 1 (06:00 - 14:30), Turno 2 (14:00 - 22:30), Turno 3 (22:00 - 06:30)'
                                    })}
                                    className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold"
                                >
                                    Usar 3 Turnos de 8 Horas
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setEditingPlant({
                                        ...editingPlant,
                                        shiftScheme: '2X12',
                                        shiftsText: 'Turno Único 12h (06:00 - 18:00), Turno Único 12h (18:00 - 06:00)'
                                    })}
                                    className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold"
                                >
                                    Usar 2 Turnos de 12 Horas
                                </button>
                            </div>
                            <textarea
                                rows={2}
                                value={editingPlant.shiftsText}
                                onChange={(e) => setEditingPlant({ ...editingPlant, shiftsText: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono text-[11px] text-slate-900"
                            />
                            <span className="text-[10px] text-slate-400">Separa cada turno con una coma e incluye el horario en formato (HH:MM - HH:MM).</span>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={() => setIsPlantModalOpen(false)}
                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700 font-bold transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-xl text-white font-bold shadow-sm transition-colors"
                        >
                            Guardar Planta en Supabase
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}
