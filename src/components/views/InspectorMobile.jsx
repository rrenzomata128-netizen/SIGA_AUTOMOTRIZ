import React from 'react';
import { AlertTriangle, Bus, CheckCircle2, LogOut, QrCode, Smartphone, Users } from 'lucide-react';

export default function InspectorMobile({
    currentUser,
    todayStr,
    yesterdayStr,
    plants,
    attendanceRecords,
    inspectors,
    selectedInspectorId,
    setSelectedInspectorId,
    handleInspectorTransportCheckIn,
    handleInspectorQrScan,
    handleInspectorDeparture,
    handleUploadMyAvatar,
    periodRecords,
}) {
    return (
        <div className="max-w-md mx-auto bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
            <div className="px-5 py-3.5 bg-indigo-600 text-white font-bold text-xs flex items-center justify-between">
                <span className="flex items-center gap-2"><Smartphone className="w-4 h-4" /> Terminal Móvil del Inspector</span>
                <span className="bg-white/20 px-2 py-0.5 rounded-full text-[10px]">Sincronizado con BD</span>
            </div>

            <div className="p-5 space-y-4">
                {/* Perfil del Usuario Logueado con su Fotografía */}
                <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl flex items-center gap-3.5">
                    <div className="w-14 h-14 rounded-full bg-slate-200 border-2 border-indigo-500 overflow-hidden flex items-center justify-center flex-shrink-0 shadow-sm">
                        {currentUser.avatarUrl ? (
                            <img src={currentUser.avatarUrl} alt="Foto de perfil" className="w-full h-full object-cover" />
                        ) : (
                            <Users className="w-7 h-7 text-slate-400" />
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded-md">
                            {currentUser.empNo}
                        </span>
                        <h4 className="font-bold text-slate-900 text-xs truncate mt-1">{currentUser.name}</h4>
                        <p className="text-[11px] text-slate-500 truncate">{currentUser.role}</p>
                    </div>
                </div>

                <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                        <label className="text-xs font-bold text-slate-700">Colaborador Activo:</label>
                        {currentUser.systemRole !== 'ADMIN' && (
                            <span className="text-[10px] text-slate-400 font-medium">Bloqueado (Sesión personal)</span>
                        )}
                    </div>
                    <select
                        value={
                            (currentUser.systemRole !== 'ADMIN' && inspectors.some(i => i.id === currentUser.id))
                                ? currentUser.id
                                : selectedInspectorId
                        }
                        disabled={currentUser.systemRole !== 'ADMIN'}
                        onChange={(e) => setSelectedInspectorId(e.target.value)}
                        className={`w-full border rounded-xl p-2.5 text-xs font-bold text-slate-900 ${currentUser.systemRole !== 'ADMIN'
                            ? 'bg-slate-100 border-slate-200 cursor-not-allowed opacity-90'
                            : 'bg-slate-50 border-slate-200'
                            }`}
                    >
                        {inspectors.map(insp => (
                            <option key={insp.id} value={insp.id}>
                                {insp.empNo} - {insp.name} ({plants.find(p => p.id === (Array.isArray(insp.plantId) ? insp.plantId[0] : insp.plantId))?.code || 'Planta'})
                            </option>
                        ))}
                    </select>
                </div>

                {/* Resumen en Vivo del Turno de Hoy (Apuntando al turno activo o al último registrado) */}
                {(() => {
                    const targetId = (currentUser.systemRole === 'ADMIN') ? selectedInspectorId : currentUser.id;
                    // Incluir turnos de hoy o turnos de ayer que sigan activos sin salida
                    const todayRecs = attendanceRecords.filter(r =>
                        r.inspectorId === targetId &&
                        (r.date === todayStr || (r.date === yesterdayStr && !r.departureTime))
                    );
                    // Tomar el activo si existe, de lo contrario el último registrado hoy
                    const activeRec = todayRecs.find(r => !r.departureTime);
                    const displayRec = activeRec || (todayRecs.length > 0 ? todayRecs[todayRecs.length - 1] : null);

                    return (
                        <div className="bg-slate-50 rounded-xl border border-slate-200 p-3.5 text-xs space-y-2.5">
                            <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                                <span className="text-slate-600 font-bold">
                                    {activeRec ? 'Jornada Activa Hoy:' : todayRecs.length > 0 ? `Jornadas Hoy (${todayRecs.length} concluidas):` : `Jornada Hoy (${todayStr}):`}
                                </span>
                                <span className="font-mono font-bold text-emerald-600">
                                    {activeRec ? activeRec.workedHoursFormatted : todayRecs.length > 0 ? 'Turno concluido (Listo para extra)' : 'Sin iniciar'}
                                </span>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-center pt-1">
                                <div className="bg-white p-2 rounded-lg border border-slate-200">
                                    <span className="text-[10px] text-slate-400 block">1. Transporte</span>
                                    <strong className="font-mono text-blue-600">{activeRec?.transportCheckIn || displayRec?.transportCheckIn || '--:--'}</strong>
                                </div>
                                <div className="bg-white p-2 rounded-lg border border-slate-200">
                                    <span className="text-[10px] text-slate-400 block">2. QR Planta</span>
                                    <strong className="font-mono text-emerald-600">{activeRec?.plantQrScan || displayRec?.plantQrScan || '--:--'}</strong>
                                </div>
                                <div className="bg-white p-2 rounded-lg border border-slate-200">
                                    <span className="text-[10px] text-slate-400 block">3. Salida</span>
                                    <strong className="font-mono text-slate-800">{activeRec?.departureTime || displayRec?.departureTime || '--:--'}</strong>
                                </div>
                            </div>
                        </div>
                    );
                })()}

                {/* Pasos Interactivos con Soporte de Jornada Extra / Turno Adicional Mismo Día */}
                {(() => {
                    const targetId = (currentUser.systemRole === 'ADMIN') ? selectedInspectorId : currentUser.id;

                    // Buscamos estrictamente si hay un registro de HOY que esté ACTIVO (sin hora de salida)
                    let activeTodayRec = attendanceRecords.find(r =>
                        r.inspectorId === targetId &&
                        (r.date === todayStr || r.date === yesterdayStr) &&
                        !r.departureTime
                    );

                    // Todos los concluidos hoy
                    const completedTodayRecs = periodRecords.filter(r => r.inspectorId === targetId && r.date === todayStr && Boolean(r.departureTime));

                    // Si hay un turno activo, usamos ese; si no, currentRec será null para habilitar un nuevo turno limpio en los pasos
                    const currentRec = activeTodayRec;
                    const isTransportDone = Boolean(currentRec?.transportCheckIn);
                    const isQrDone = Boolean(currentRec?.plantQrScan);
                    const isDepartureDone = Boolean(currentRec?.departureTime);

                    return (
                        <div className="space-y-3">
                            {completedTodayRecs.length > 0 && !activeTodayRec && (
                                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-900 space-y-1.5">
                                    <strong className="block font-bold">ℹ️ Jornada Principal Concluida ({completedTodayRecs.length} turno(s) hoy)</strong>
                                    <p className="text-[11px] text-blue-800">
                                        Puedes iniciar una <strong>jornada o turno extra</strong> para este mismo día. El sistema sumará el total de horas acumuladas.
                                    </p>
                                </div>
                            )}

                            {/* Paso 1 */}
                            <div className={`border rounded-xl p-3.5 space-y-2 ${isTransportDone ? 'bg-emerald-50/70 border-emerald-200' : 'bg-slate-50/60 border-slate-200'}`}>
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-blue-700 block">
                                        {completedTodayRecs.length > 0 ? 'Paso 1. Check-in en Transporte (Turno Extra)' : 'Paso 1. Check-in en Transporte'}
                                    </span>
                                    {isTransportDone && (
                                        <span className="text-[10px] bg-emerald-600 text-white font-bold px-2 py-0.5 rounded-full">Completado 🔒</span>
                                    )}
                                </div>
                                <p className="text-[11px] text-slate-500">
                                    {isTransportDone
                                        ? `Registrado a las ${currentRec.transportCheckIn}`
                                        : completedTodayRecs.length > 0
                                            ? 'Confirma tu abordaje para el turno extra de hoy.'
                                            : 'Confirma a matriz que vas en ruta hacia planta.'}
                                </p>
                                <button
                                    disabled={isTransportDone}
                                    onClick={() => handleInspectorTransportCheckIn(targetId)}
                                    className={`w-full font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-colors ${isTransportDone
                                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                                        }`}
                                >
                                    <Bus className="w-4 h-4" />
                                    {isTransportDone
                                        ? 'Transporte Confirmado'
                                        : completedTodayRecs.length > 0
                                            ? 'Confirmar Abordaje (Turno Extra)'
                                            : 'Confirmar Abordaje Transporte'}
                                </button>
                            </div>

                            {/* Paso 2 */}
                            <div className={`border rounded-xl p-3.5 space-y-2 ${isQrDone ? 'bg-emerald-50/70 border-emerald-200' : 'bg-slate-50/60 border-slate-200'}`}>
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-emerald-700 block">Paso 2. Escanear QR en Planta</span>
                                    {isQrDone && (
                                        <span className="text-[10px] bg-emerald-600 text-white font-bold px-2 py-0.5 rounded-full">Completado 🔒</span>
                                    )}
                                </div>
                                <p className="text-[11px] text-slate-500">
                                    {isQrDone ? `Escaneado a las ${currentRec.plantQrScan}` : 'Inicia el conteo oficial de horas para este turno extra.'}
                                </p>
                                <button
                                    disabled={isQrDone || !currentRec?.transportCheckIn}
                                    onClick={() => handleInspectorQrScan(targetId)}
                                    className={`w-full font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-colors ${isQrDone || !currentRec?.transportCheckIn
                                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                        }`}
                                >
                                    <QrCode className="w-4 h-4" /> {isQrDone ? 'QR Planta Validado' : 'Escanear QR del Supervisor'}
                                </button>
                            </div>

                            {/* Paso 3 */}
                            <div className={`border rounded-xl p-3.5 space-y-2 ${isDepartureDone ? 'bg-blue-50 border-blue-200' : 'bg-slate-50/60 border-slate-200'}`}>
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-slate-800 block">Paso 3. Registrar Salida de Turno Extra</span>
                                    {isDepartureDone && (
                                        <span className="text-[10px] bg-blue-600 text-white font-bold px-2 py-0.5 rounded-full">Concluido</span>
                                    )}
                                </div>
                                <p className="text-[11px] text-slate-500">
                                    {isDepartureDone ? `Salida registrada a las ${currentRec.departureTime}.` : 'Cierra tu turno extra para acumular las horas del día.'}
                                </p>
                                <button
                                    disabled={!currentRec?.plantQrScan || isDepartureDone}
                                    onClick={() => handleInspectorDeparture(targetId)}
                                    className={`w-full font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-colors ${!currentRec?.plantQrScan || isDepartureDone
                                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                        : 'bg-slate-800 hover:bg-slate-900 text-white'
                                        }`}
                                >
                                    <LogOut className="w-4 h-4 text-red-400" /> {isDepartureDone ? 'Salida Registrada' : 'Registrar Salida de Turno Extra'}
                                </button>
                            </div>
                        </div>
                    );
                })()}

                {/* =============================================================== */}
                {/* PANEL DE AVISOS DEL SISTEMA (PARTE INFERIOR)                     */}
                {/* =============================================================== */}
                <div className="mt-4 pt-3 border-t border-slate-200 space-y-2">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                        📢 Avisos y Notificaciones del Sistema
                    </span>

                    {!currentUser.avatarUrl ? (
                        <div className="bg-amber-50 border border-amber-300 rounded-xl p-3.5 space-y-2 shadow-sm animate-pulse">
                            <div className="flex items-start gap-2">
                                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                                <div className="text-xs">
                                    <strong className="text-amber-900 block font-bold">Falta Fotografía de Perfil</strong>
                                    <p className="text-amber-800 text-[11px] mt-0.5">
                                        No cuentas con una fotografía registrada en el sistema. Súbela para completar tu expediente y gafete. Una vez subida, quedará bloqueada.
                                    </p>
                                </div>
                            </div>
                            <div className="pt-1">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleUploadMyAvatar}
                                    className="w-full text-[11px] text-slate-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-amber-600 file:text-white hover:file:bg-amber-700 cursor-pointer bg-white border border-amber-200 rounded-lg p-1"
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs flex items-center gap-2 text-emerald-800">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                            <span><strong>Perfil Verificado:</strong> Tu fotografía se encuentra registrada correctamente en la base de datos.</span>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
