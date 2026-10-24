import React from 'react';
import { UserPlus, Users, X, Loader2, AlertCircle } from 'lucide-react';

export default function UserModal({
    todayStr,
    setIsUserModalOpen,
    editingUser,
    setEditingUser,
    plants,
    handleSaveUser,
    isSaving,
    errorMessage,
    setUserModalError
}) {
    return (
        <div className="fixed inset-0 z-50 bg-slate-900/55 backdrop-blur-sm flex items-center justify-center p-4">
            <form onSubmit={handleSaveUser} className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden">
                <div className="px-5 py-3.5 bg-indigo-950 text-white font-bold text-xs flex items-center justify-between">
                    <span className="flex items-center gap-2">
                        <UserPlus className="w-4 h-4 text-indigo-300" />
                        {editingUser.isNew ? 'Dar de Alta Nuevo Usuario en Supabase' : `Editar Usuario — ${editingUser.empNo}`}
                    </span>
                    <button
                        type="button"
                        onClick={() => {
                            if (typeof setUserModalError === 'function') setUserModalError(null);
                            setIsUserModalOpen(false);
                        }}
                        className="w-6 h-6 rounded-lg hover:bg-white/10 text-white font-bold text-xs flex items-center justify-center"
                    >
                        ✕
                    </button>
                </div>

                {editingUser._error && (
                    <div role="alert" className="px-5 py-2.5 bg-red-50 border-b border-red-200 text-red-700 text-xs font-bold flex items-start gap-2">
                        <span>⚠</span>
                        <span>{editingUser._error}</span>
                    </div>
                )}

                <div className="p-6 space-y-4 text-xs text-slate-800 max-h-[82vh] overflow-y-auto">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <div>
                            <label className="text-slate-700 font-bold block mb-1">1. Rol en el Sistema:</label>
                            <select
                                value={editingUser.systemRole}
                                onChange={(e) => {
                                    const newRole = e.target.value;
                                    const firstPlant = plants[0];
                                    setEditingUser({
                                        ...editingUser,
                                        systemRole: newRole,
                                        plantId: (newRole === 'ADMIN' || newRole === 'RH') ? 'ALL' : (Array.isArray(editingUser.plantId) ? editingUser.plantId : [firstPlant?.code || firstPlant?.id || 'BW-SM']),
                                        shift: (newRole === 'ADMIN' || newRole === 'RH') ? 'Horario Matriz (08:00 - 17:30)' : (firstPlant?.shifts?.[0] || 'Turno 1 (06:00 - 14:30)'),
                                        role: newRole === 'ADMIN' ? 'Administrador General' : newRole === 'RH' ? 'Analista de Recursos Humanos' : newRole === 'SUPERVISOR' ? 'Supervisor Residente de Planta' : 'Inspector de Calidad y Sorteo'
                                    });
                                }}
                                className="w-full bg-indigo-50/60 border border-indigo-200 rounded-xl p-2.5 text-slate-900 font-bold"
                            >
                                <option value="INSPECTOR">Inspector de Calidad / Técnico Operativo</option>
                                <option value="SUPERVISOR">Supervisor / Encargado de Planta</option>
                                <option value="RH">Recursos Humanos y Nómina (Matriz)</option>
                                <option value="ADMIN">Administrador General (Control Total)</option>
                            </select>
                        </div>

                        <div className="sm:col-span-2 bg-slate-50 border border-slate-200 p-3.5 rounded-xl space-y-2">
                            <label className="text-slate-700 font-bold block">Fotografía del Colaborador (Gafete):</label>
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-full bg-slate-200 border-2 border-slate-300 overflow-hidden flex items-center justify-center flex-shrink-0 shadow-inner">
                                    {editingUser.avatarUrl ? (
                                        <img src={editingUser.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                                    ) : (
                                        <Users className="w-8 h-8 text-slate-400" />
                                    )}
                                </div>
                                <div className="flex-1 space-y-1.5">
                                    <input
                                        type="text"
                                        value={editingUser.avatarUrl || ''}
                                        onChange={(e) => setEditingUser({ ...editingUser, avatarUrl: e.target.value })}
                                        placeholder="Pega URL de imagen (https://...) o carga archivo"
                                        className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-mono text-slate-800"
                                    />
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => {
                                            const file = e.target.files[0];
                                            if (file) {
                                                const reader = new FileReader();
                                                reader.onloadend = () => {
                                                    setEditingUser({ ...editingUser, avatarUrl: reader.result });
                                                };
                                                reader.readAsDataURL(file);
                                            }
                                        }}
                                        className="text-[11px] text-slate-500 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                                    />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="text-slate-700 font-bold block mb-1">2. No. de Nómina / ID Empleado:</label>
                            <input
                                type="text"
                                value={editingUser.empNo || ''}
                                onChange={(e) => setEditingUser({ ...editingUser, empNo: e.target.value })}
                                placeholder="Ej. NOM-1060 o SUP-2005"
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono font-bold text-slate-900"
                                required
                            />
                        </div>

                        <div className="sm:col-span-2">
                            <label className="text-slate-700 font-bold block mb-1">3. Nombre Completo de la Persona:</label>
                            <input
                                type="text"
                                value={editingUser.name || ''}
                                onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                                placeholder="Ej. Ing. Juan Carlos Treviño"
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-semibold"
                                required
                            />
                        </div>

                        <div>
                            <label className="text-slate-700 font-bold block mb-1">4. Puesto / Cargo Operativo:</label>
                            <input
                                type="text"
                                value={editingUser.position || editingUser.role || ''}
                                onChange={(e) => setEditingUser({
                                    ...editingUser,
                                    position: e.target.value,
                                    role: e.target.value
                                })}
                                placeholder="Ej. Inspector de Sorteo / Auditor"
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900"
                                required
                            />
                        </div>

                        <div>
                            <label className="text-slate-700 font-bold block mb-1">5. Teléfono / WhatsApp (Alertas):</label>
                            <input
                                type="text"
                                value={editingUser.phone || ''}
                                onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                                placeholder="Ej. 844-415-0000"
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono text-slate-900"
                            />
                        </div>

                        <div>
                            <label className="text-slate-700 font-bold block mb-1">6. Planta(s) Asignada(s):</label>
                            {(editingUser.systemRole === 'ADMIN' || editingUser.systemRole === 'RH') ? (
                                <select
                                    value={editingUser.plantId}
                                    onChange={(e) => {
                                        setEditingUser({
                                            ...editingUser,
                                            plantId: e.target.value,
                                            shift: 'Horario Matriz (08:00 - 17:30)'
                                        });
                                    }}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-semibold"
                                >
                                    <option value="ALL">Matriz (Acceso a Todas las Plantas)</option>
                                </select>
                            ) : (
                                <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 max-h-32 overflow-y-auto space-y-1">
                                    {plants.map(p => {
                                        const rawPlant = editingUser.plantId || editingUser.plant_id || '';
                                        const currentPlants = (Array.isArray(rawPlant)
                                            ? rawPlant
                                            : String(rawPlant).split(',')
                                        ).map(s => String(s).trim().toUpperCase()).filter(Boolean);

                                        const plantKey = (p.code || p.id).toUpperCase();
                                        const isChecked = currentPlants.includes(plantKey) || currentPlants.includes(String(p.id).toUpperCase());

                                        return (
                                            <label key={p.id} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-slate-100 p-1 rounded">
                                                <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={(e) => {
                                                        let updated = [...currentPlants];
                                                        if (e.target.checked) {
                                                            if (!updated.includes(plantKey)) updated.push(plantKey);
                                                        } else {
                                                            updated = updated.filter(key => key !== plantKey && key !== String(p.id).toUpperCase());
                                                        }

                                                        const uniquePlants = [...new Set(updated)];
                                                        setEditingUser({
                                                            ...editingUser,
                                                            plantId: uniquePlants
                                                        });
                                                    }}
                                                    className="w-3.5 h-3.5 accent-indigo-600"
                                                />
                                                <span>{p.code} - {p.name}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="text-slate-700 font-bold block mb-1">7. Turno Asignado:</label>
                            {editingUser.plantId === 'ALL' ? (
                                <input
                                    type="text"
                                    value={editingUser.shift || ''}
                                    onChange={(e) => setEditingUser({ ...editingUser, shift: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900"
                                />
                            ) : (
                                <select
                                    value={editingUser.shift}
                                    onChange={(e) => setEditingUser({ ...editingUser, shift: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900"
                                >
                                    {(() => {
                                        const primaryPlantId = Array.isArray(editingUser.plantId) ? editingUser.plantId[0] : editingUser.plantId;
                                        const pl = plants.find(p => p.id === primaryPlantId || p.code === primaryPlantId);
                                        return (pl?.shifts || ['Turno 1 (06:00 - 14:30)']).map((sh, i) => (
                                            <option key={i} value={sh}>{sh}</option>
                                        ));
                                    })()}
                                </select>
                            )}
                        </div>

                        <div>
                            <label className="text-slate-700 font-bold block mb-1">
                                {editingUser.isNew ? '8. PIN de acceso (6 dígitos):' : '8. Nuevo PIN (6 dígitos, opcional):'}
                            </label>
                            <input
                                type="text"
                                inputMode="numeric"
                                maxLength={6}
                                pattern="\d{6}"
                                required={Boolean(editingUser.isNew)}
                                placeholder={editingUser.isNew ? '' : 'Vacío = conservar el actual'}
                                value={editingUser.pin || ''}
                                onChange={(e) => setEditingUser({ ...editingUser, pin: e.target.value.replace(/\D/g, '') })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono font-bold text-slate-900"
                            />
                            <span className="text-[10px] text-slate-400">
                                {editingUser.isNew
                                    ? 'Anótalo y entrégalo al colaborador: después ya no se puede consultar.'
                                    : 'Solo escríbelo si quieres reiniciar el PIN de este colaborador.'}
                            </span>
                        </div>
                    </div>

                    <div className="space-y-2 pt-2">
                        <label className="flex items-center gap-2.5 bg-indigo-50 border border-indigo-200 p-3 rounded-xl cursor-pointer">
                            <input
                                type="checkbox"
                                checked={Boolean(editingUser.allowTerminalSwitch)}
                                onChange={(e) => setEditingUser({ ...editingUser, allowTerminalSwitch: e.target.checked })}
                                className="w-4 h-4 accent-indigo-600"
                            />
                            <div>
                                <span className="text-indigo-950 font-bold block">Habilitar modo terminal (Selector de roles en cabecera)</span>
                                <span className="text-[11px] text-slate-600 block">Permite que este usuario cambie de vista entre RH, Supervisor e Inspector. Por defecto está desactivado.</span>
                            </div>
                        </label>

                        {editingUser.isNew && editingUser.systemRole === 'INSPECTOR' && (
                            <label className="flex items-center gap-2.5 bg-blue-50 border border-blue-200 p-3 rounded-xl cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={Boolean(editingUser.createTodayAttendance)}
                                    onChange={(e) => setEditingUser({ ...editingUser, createTodayAttendance: e.target.checked })}
                                    className="w-4 h-4 accent-blue-600"
                                />
                                <span className="text-blue-900 font-semibold">
                                    Crear automáticamente registro de asistencia en Supabase para el turno de HOY ({todayStr})
                                </span>
                            </label>
                        )}
                    </div>

                    {/* Banner de error visible si la Edge Function rechaza el guardado */}
                    {errorMessage && (
                        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-start gap-2 shadow-sm my-3">
                            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <span className="block font-bold">Error al registrar usuario:</span>
                                <span>{errorMessage}</span>
                            </div>
                        </div>
                    )}

                    {/* Botonera de acción única */}
                    <div className="flex justify-end items-center gap-3 pt-4 border-t border-slate-100">
                        <button
                            type="button"
                            disabled={isSaving}
                            onClick={() => {
                                if (typeof setUserModalError === 'function') setUserModalError(null);
                                setIsUserModalOpen(false);
                            }}
                            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50 transition-colors"
                        >
                            Cancelar
                        </button>

                        <button
                            type="submit"
                            disabled={isSaving}
                            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 rounded-xl text-white font-bold text-xs shadow-sm transition-colors flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Guardando en Supabase...</span>
                                </>
                            ) : (
                                <span>Guardar Usuario en Supabase</span>
                            )}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}