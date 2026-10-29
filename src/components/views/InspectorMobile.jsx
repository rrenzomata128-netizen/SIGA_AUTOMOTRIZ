import React, { useState, useEffect, useMemo } from 'react';
import {
    AlertTriangle,
    Building2,
    Bus,
    CheckCircle2,
    Clock,
    KeyRound,
    Lock,
    LogOut,
    QrCode,
    RefreshCw,
    ShieldAlert,
    Smartphone,
    Users,
    X
} from 'lucide-react';
import { evaluateAttendanceMetrics, parseTimeToMinutes, formatMinutesToHHMM } from '../../lib/attendanceMetrics';

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
    const [qrPinInput, setQrPinInput] = useState('');
    const [selectedTargetPlantId, setSelectedTargetPlantId] = useState('');
    const [isEditingPlantInRoute, setIsEditingPlantInRoute] = useState(false);
    const [confirmingDeparture, setConfirmingDeparture] = useState(false);
    const [liveClock, setLiveClock] = useState(() => new Date());

    // Reloj en vivo para cronómetro de estancia en planta y hora de salida
    useEffect(() => {
        const timer = setInterval(() => setLiveClock(new Date()), 15000);
        return () => clearInterval(timer);
    }, []);

    const liveHHMM = useMemo(() => liveClock.toTimeString().slice(0, 5), [liveClock]);

    const targetId = (currentUser.systemRole === 'ADMIN') ? selectedInspectorId : currentUser.id;
    const activeInspector = useMemo(
        () => inspectors.find(i => i.id === targetId) || currentUser,
        [inspectors, targetId, currentUser]
    );

    // Plantas autorizadas para el inspector activo
    const inspectorAssignedPlants = useMemo(() => {
        const raw = activeInspector?.plantId || activeInspector?.plant_id;
        if (!raw) return plants.slice(0, 1);
        if (raw === 'ALL') return plants;

        const keys = (Array.isArray(raw) ? raw : String(raw).split(','))
            .map(k => String(k).trim().toUpperCase())
            .filter(Boolean);

        const matched = plants.filter(p =>
            keys.includes(String(p.id || '').toUpperCase()) ||
            keys.includes(String(p.code || '').toUpperCase())
        );

        return matched.length > 0 ? matched : plants.slice(0, 1);
    }, [activeInspector, plants]);

    // Registro activo sin hora de salida (priorizando hoy, o turno nocturno real de ayer que no sea Falta ni esté sellado)
    const activeOpenRec = useMemo(() => {
        const todayOpen = attendanceRecords.find(r =>
            r.inspectorId === targetId &&
            r.date === todayStr &&
            !r.departureTime &&
            !r.validatedBySupervisor &&
            r.status !== 'Falta'
        );
        if (todayOpen) return todayOpen;

        return attendanceRecords.find(r =>
            r.inspectorId === targetId &&
            r.date === yesterdayStr &&
            !r.departureTime &&
            !r.validatedBySupervisor &&
            r.status !== 'Falta' &&
            Boolean(r.transportCheckIn || r.plantQrScan)
        );
    }, [attendanceRecords, targetId, todayStr, yesterdayStr]);

    // Sincronizar estados auxiliares cuando cambia el inspector
    useEffect(() => {
        setIsEditingPlantInRoute(false);
        setConfirmingDeparture(false);
        setQrPinInput('');
    }, [targetId]);

    // Sincronizar planta seleccionada únicamente cuando cambia el inspector o cambia el registro abierto en BD
    useEffect(() => {
        if (activeOpenRec?.plantId) {
            const matchedFromRec = plants.find(p => p.id === activeOpenRec.plantId || p.code === activeOpenRec.plantId);
            setSelectedTargetPlantId(matchedFromRec ? matchedFromRec.id : activeOpenRec.plantId);
            return;
        }
        if (inspectorAssignedPlants.length > 0) {
            setSelectedTargetPlantId(prev => {
                const stillValid = inspectorAssignedPlants.some(p => p.id === prev || p.code === prev);
                return stillValid ? prev : inspectorAssignedPlants[0].id;
            });
        }
    }, [targetId, activeOpenRec?.id, activeOpenRec?.plantId, inspectorAssignedPlants, plants]);

    const currentTargetPlant = useMemo(() => {
        const effectiveId = selectedTargetPlantId || activeOpenRec?.plantId;
        return plants.find(p => p.id === effectiveId || p.code === effectiveId) || inspectorAssignedPlants[0] || plants[0];
    }, [selectedTargetPlantId, activeOpenRec?.plantId, plants, inspectorAssignedPlants]);

    // Cambiar planta destino únicamente desde Plantas Activas antes de validar el QR en planta
    const isPlantLockedByQr = Boolean(activeOpenRec?.plantQrScan);

    const handleSelectDestinationPlant = async (plant) => {
        if (!plant || isPlantLockedByQr) return;
        setSelectedTargetPlantId(plant.id);
        setIsEditingPlantInRoute(false);

        if (activeOpenRec && !activeOpenRec.departureTime && activeOpenRec.plantId !== plant.id) {
            await handleInspectorTransportCheckIn(targetId, plant.id, { onlySwitchPlant: true });
        }
    };

    // Calcular tiempo físico en vivo desde que escaneó el QR en planta
    const livePlantElapsedStr = useMemo(() => {
        if (!activeOpenRec?.plantQrScan || activeOpenRec?.departureTime) return null;
        const qrMins = parseTimeToMinutes(activeOpenRec.plantQrScan);
        const nowMins = parseTimeToMinutes(liveHHMM);
        if (qrMins === null || nowMins === null) return null;
        let diff = nowMins - qrMins;
        if (diff < 0) diff += 1440; // cruce de medianoche
        return formatMinutesToHHMM(Math.max(0, diff));
    }, [activeOpenRec, liveHHMM]);

    return (
        <div className="max-w-md mx-auto bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
            {/* Encabezado de la Terminal Móvil */}
            <div className="px-5 py-3.5 bg-indigo-600 text-white font-bold text-xs flex items-center justify-between">
                <span className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4" /> Terminal Móvil del Inspector
                </span>
                <span className="bg-white/20 px-2.5 py-0.5 rounded-full text-[10px] font-mono">
                    {liveHHMM} • En línea
                </span>
            </div>

            <div className="p-5 space-y-4">
                {/* Selector de Simulación exclusivo para Administrador (arriba del gafete) */}
                {currentUser.systemRole === 'ADMIN' && (
                    <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-xl p-2.5 space-y-1.5">
                        <div className="flex justify-between items-center">
                            <label className="text-[11px] font-bold text-indigo-900 flex items-center gap-1.5">
                                <Users className="w-3.5 h-3.5 text-indigo-600" />
                                Simulador Admin — Colaborador Activo:
                            </label>
                            <span className="text-[10px] bg-indigo-600 text-white font-bold px-2 py-0.5 rounded-md">
                                Vista Prueba
                            </span>
                        </div>
                        <select
                            value={selectedInspectorId}
                            onChange={(e) => setSelectedInspectorId(e.target.value)}
                            className="w-full bg-white border border-indigo-200 rounded-lg p-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                        >
                            {inspectors.map(insp => {
                                const rawP = Array.isArray(insp.plantId) ? insp.plantId : [insp.plantId].filter(Boolean);
                                const codes = rawP
                                    .map(pid => plants.find(p => p.id === pid || p.code === pid)?.code || pid)
                                    .join(', ');
                                return (
                                    <option key={insp.id} value={insp.id}>
                                        {insp.empNo} — {insp.name} ({codes || 'Planta'})
                                    </option>
                                );
                            })}
                        </select>
                    </div>
                )}

                {/* 1. Gafete Digital Inteligente del Colaborador Activo con Turno y Plantas */}
                <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl space-y-3">
                    <div className="flex items-center gap-3.5">
                        <div className="w-14 h-14 rounded-full bg-slate-200 border-2 border-indigo-500 overflow-hidden flex items-center justify-center flex-shrink-0 shadow-sm">
                            {activeInspector?.avatarUrl ? (
                                <img src={activeInspector.avatarUrl} alt="Foto de perfil" className="w-full h-full object-cover" />
                            ) : (
                                <Users className="w-7 h-7 text-slate-400" />
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[10px] bg-indigo-100 text-indigo-800 font-extrabold px-2 py-0.5 rounded-md font-mono">
                                    {activeInspector?.empNo || 'NOM'}
                                </span>
                                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-md">
                                    {inspectorAssignedPlants.length > 1
                                        ? `Multi-Planta (${inspectorAssignedPlants.length})`
                                        : (inspectorAssignedPlants[0]?.code || 'Planta')}
                                </span>
                            </div>
                            <h4 className="font-bold text-slate-900 text-xs sm:text-sm truncate mt-1">
                                {activeInspector?.name}
                            </h4>
                            <p className="text-[11px] text-slate-500 truncate">
                                {activeInspector?.role || 'Inspector de Calidad'}
                            </p>
                        </div>
                    </div>

                    {/* Cintillo de Horario Programado y Plantas Autorizadas */}
                    <div className="pt-2.5 border-t border-slate-200/80 flex flex-col gap-1.5 text-[11px]">
                        <div className="flex items-center justify-between">
                            <span className="text-slate-500 font-medium flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                Turno Asignado:
                            </span>
                            <strong className="text-slate-800 font-bold">
                                {activeInspector?.shift || 'Turno 1 (06:00 - 14:30)'}
                            </strong>
                        </div>
                        <div className="pt-1 space-y-1.5">
                            <span className="text-slate-500 font-medium flex items-center justify-between gap-1.5">
                                <span className="flex items-center gap-1.5">
                                    <Building2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                    {inspectorAssignedPlants.length > 1
                                        ? (isPlantLockedByQr ? 'Plantas Activas:' : 'Plantas Activas (Toca para cambiar):')
                                        : 'Planta Asignada:'}
                                </span>
                                {isPlantLockedByQr && (
                                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                                        <Lock className="w-2.5 h-2.5" /> Bloqueada por QR
                                    </span>
                                )}
                            </span>
                            <div className="flex flex-col gap-1.5">
                                {inspectorAssignedPlants.map(p => {
                                    const isSelected = currentTargetPlant?.id === p.id;
                                    const canSwitch = !isPlantLockedByQr && inspectorAssignedPlants.length > 1;
                                    return (
                                        <button
                                            key={p.id}
                                            type="button"
                                            disabled={isPlantLockedByQr}
                                            onClick={() => handleSelectDestinationPlant(p)}
                                            className={`w-full text-left px-3 py-2 rounded-lg border text-xs font-bold flex items-center justify-between gap-2 transition-all ${isSelected
                                                ? 'bg-indigo-600 text-white border-indigo-700 shadow-2xs'
                                                : isPlantLockedByQr
                                                    ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
                                                    : 'bg-white hover:bg-indigo-50 text-slate-700 border-slate-200 hover:border-indigo-300 cursor-pointer'
                                                } ${!canSwitch && isSelected ? 'cursor-default' : ''}`}
                                        >
                                            <span className="truncate">{p.code} — {p.name}</span>
                                            <span className={`text-[10px] px-2 py-0.5 rounded font-extrabold shrink-0 ${isSelected
                                                ? 'bg-white/20 text-white'
                                                : 'bg-slate-100 text-slate-500'
                                                }`}>
                                                {isSelected
                                                    ? (isPlantLockedByQr ? '🔒 En turno' : '✓ Destino')
                                                    : (isPlantLockedByQr ? 'Bloqueada' : 'Seleccionar')}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Resumen en Vivo del Turno de Hoy */}
                {(() => {
                    const todayRecs = attendanceRecords.filter(r =>
                        r.inspectorId === targetId &&
                        (r.date === todayStr || (r.date === yesterdayStr && !r.departureTime)) &&
                        r.status !== 'Falta'
                    );
                    const activeRec = activeOpenRec;
                    const displayRec = activeRec || (todayRecs.length > 0 ? todayRecs[todayRecs.length - 1] : null);
                    const activeMetrics = activeRec ? evaluateAttendanceMetrics(activeRec) : null;
                    const displayPlantObj = currentTargetPlant
                        || (displayRec ? plants.find(p => p.id === displayRec.plantId || p.code === displayRec.plantId) : null);

                    const step1Done = Boolean(activeRec?.transportCheckIn || (!activeRec && displayRec?.transportCheckIn));
                    const step2Done = Boolean(activeRec?.plantQrScan || (!activeRec && displayRec?.plantQrScan));
                    const step3Done = Boolean(activeRec?.departureTime || (!activeRec && displayRec?.departureTime));

                    return (
                        <div className="bg-slate-50 rounded-xl border border-slate-200 p-3.5 text-xs space-y-2.5">
                            <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                                <span className="text-slate-600 font-bold">
                                    {activeRec
                                        ? 'Jornada Activa Hoy:'
                                        : todayRecs.length > 0
                                            ? `Jornadas Hoy (${todayRecs.length} concluida):`
                                            : `Jornada Hoy (${todayStr}):`}
                                </span>
                                <span className="font-mono font-bold text-emerald-600">
                                    {activeRec
                                        ? (livePlantElapsedStr ? `En planta (${livePlantElapsedStr})` : (activeMetrics?.workedHoursFormatted || 'En ruta a planta'))
                                        : todayRecs.length > 0
                                            ? 'Turno concluido (Listo para extra)'
                                            : 'Sin iniciar'}
                                </span>
                            </div>

                            {displayPlantObj && (
                                <div className="flex items-center justify-between text-[11px] bg-white px-2.5 py-2 rounded-lg border border-slate-200/80 gap-2">
                                    <span className="text-slate-500 font-medium flex items-center gap-1.5 shrink-0">
                                        <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                                        Planta destino:
                                    </span>
                                    <strong className="text-slate-900 font-bold truncate">
                                        {displayPlantObj.code} — {displayPlantObj.name}
                                    </strong>
                                </div>
                            )}

                            <div className="grid grid-cols-3 gap-2 text-center pt-1">
                                <div className={`p-2 rounded-lg border ${step1Done ? 'bg-blue-50/70 border-blue-200' : 'bg-white border-slate-200'}`}>
                                    <span className="text-[10px] text-slate-500 font-medium block">1. Transporte</span>
                                    <strong className="font-mono text-blue-700">{activeRec?.transportCheckIn || displayRec?.transportCheckIn || '--:--'}</strong>
                                </div>
                                <div className={`p-2 rounded-lg border ${step2Done ? 'bg-emerald-50/70 border-emerald-200' : 'bg-white border-slate-200'}`}>
                                    <span className="text-[10px] text-slate-500 font-medium block">2. QR Planta</span>
                                    <strong className="font-mono text-emerald-700">{activeRec?.plantQrScan || displayRec?.plantQrScan || '--:--'}</strong>
                                </div>
                                <div className={`p-2 rounded-lg border ${step3Done ? 'bg-slate-100 border-slate-300' : 'bg-white border-slate-200'}`}>
                                    <span className="text-[10px] text-slate-500 font-medium block">3. Salida</span>
                                    <strong className="font-mono text-slate-900">{activeRec?.departureTime || displayRec?.departureTime || '--:--'}</strong>
                                </div>
                            </div>
                        </div>
                    );
                })()}

                {/* 3. Pasos Interactivos con Enfoque Progresivo en el Paso Actual */}
                {(() => {
                    const currentRec = activeOpenRec;
                    const completedTodayRecs = periodRecords.filter(
                        r => r.inspectorId === targetId && r.date === todayStr && Boolean(r.departureTime)
                    );
                    const isExtraShiftMode = completedTodayRecs.length > 0;

                    const isTransportDone = Boolean(currentRec?.transportCheckIn);
                    const isQrDone = Boolean(currentRec?.plantQrScan);
                    const isDepartureDone = Boolean(currentRec?.departureTime);

                    // Determinar cuál es el paso activo (1, 2 o 3)
                    const activeStepNumber = !isTransportDone ? 1 : !isQrDone ? 2 : 3;

                    return (
                        <div className="space-y-2.5">
                            {isExtraShiftMode && !currentRec && (
                                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-900 space-y-1">
                                    <strong className="block font-bold">
                                        ℹ️ Jornada Principal Concluida ({completedTodayRecs.length} turno(s) hoy)
                                    </strong>
                                    <p className="text-[11px] text-blue-800">
                                        Si fuiste asignado a cubrir un <strong>turno extra</strong> hoy mismo, elige la planta en <strong>Plantas Activas</strong> e inicia el Paso 1.
                                    </p>
                                </div>
                            )}

                            {/* =========================================================== */}
                            {/* PASO 1: CHECK-IN EN TRANSPORTE                              */}
                            {/* =========================================================== */}
                            {isTransportDone ? (
                                /* Vista compacta cuando el Paso 1 ya fue completado */
                                <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                        <div className="min-w-0">
                                            <span className="text-xs font-bold text-emerald-900 block truncate">
                                                Paso 1. Transporte confirmado ({currentRec.transportCheckIn})
                                            </span>
                                            <span className="text-[11px] text-emerald-700 block truncate">
                                                Destino: <strong>{currentTargetPlant?.code} — {currentTargetPlant?.name}</strong>
                                            </span>
                                        </div>
                                    </div>
                                    <span className="text-[10px] bg-emerald-600 text-white font-bold px-2 py-0.5 rounded-full shrink-0">
                                        En ruta ✓
                                    </span>
                                </div>
                            ) : (
                                /* Vista activa enfocada del Paso 1 */
                                <div className="border-2 border-blue-500 ring-4 ring-blue-500/10 bg-blue-50/30 rounded-xl p-3.5 space-y-2.5">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-extrabold text-blue-800 block">
                                            {isExtraShiftMode ? 'Paso 1. Check-in en Transporte (Turno Extra)' : 'Paso 1. Check-in en Transporte'}
                                        </span>
                                        <span className="text-[10px] bg-blue-600 text-white font-extrabold px-2 py-0.5 rounded-full animate-pulse">
                                            👉 PASO ACTUAL
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-slate-600">
                                        {isExtraShiftMode
                                            ? 'Confirma tu abordaje para el turno extra hacia la planta seleccionada arriba.'
                                            : 'Confirma a matriz que vas en ruta hacia tu planta destino seleccionada arriba.'}
                                    </p>

                                    <button
                                        onClick={() => handleInspectorTransportCheckIn(targetId, currentTargetPlant?.id)}
                                        className="w-full font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer bg-blue-600 hover:bg-blue-700 text-white active:scale-98"
                                    >
                                        <Bus className="w-4 h-4" />
                                        {isExtraShiftMode
                                            ? `Confirmar Abordaje a ${currentTargetPlant?.code || 'Planta'} (Turno Extra)`
                                            : `Confirmar Abordaje Transporte (${currentTargetPlant?.code || 'Planta'})`}
                                    </button>
                                </div>
                            )}

                            {/* =========================================================== */}
                            {/* PASO 2: VALIDAR QR DINÁMICO EN PLANTA                       */}
                            {/* =========================================================== */}
                            {isQrDone ? (
                                /* Vista compacta cuando el Paso 2 ya fue completado */
                                <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                        <div className="min-w-0">
                                            <span className="text-xs font-bold text-emerald-900 block truncate">
                                                Paso 2. QR validado en planta ({currentRec.plantQrScan})
                                            </span>
                                            <span className="text-[11px] text-emerald-700 block truncate">
                                                Planta verificada: <strong>{currentTargetPlant?.code} — {currentTargetPlant?.name}</strong>
                                            </span>
                                        </div>
                                    </div>
                                    <span className="text-[10px] bg-emerald-600 text-white font-bold px-2 py-0.5 rounded-full shrink-0">
                                        Validado 🔒
                                    </span>
                                </div>
                            ) : activeStepNumber === 2 ? (
                                /* 4. Vista activa enfocada del Paso 2 con entrada rápida de PIN para móvil */
                                <div className="border-2 border-emerald-500 ring-4 ring-emerald-500/10 bg-emerald-50/20 rounded-xl p-3.5 space-y-2.5">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-extrabold text-emerald-800 block">
                                            Paso 2. Validar QR en Planta ({currentTargetPlant?.code || 'Planta'})
                                        </span>
                                        <span className="text-[10px] bg-emerald-600 text-white font-extrabold px-2 py-0.5 rounded-full animate-pulse">
                                            👉 PASO ACTUAL
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-slate-600">
                                        Ingresa los <strong>4 dígitos del PIN QR</strong> que muestra el Supervisor en <strong>{currentTargetPlant?.code || 'planta'}</strong> para iniciar tu conteo físico de horas:
                                    </p>

                                    <div className="relative">
                                        <KeyRound className="w-4 h-4 text-emerald-600 absolute left-3.5 top-3" />
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            value={qrPinInput}
                                            onChange={(e) => setQrPinInput(e.target.value.toUpperCase())}
                                            onKeyDown={async (e) => {
                                                if (e.key === 'Enter' && qrPinInput.trim()) {
                                                    const ok = await handleInspectorQrScan(targetId, qrPinInput, currentTargetPlant?.id);
                                                    if (ok) setQrPinInput('');
                                                }
                                            }}
                                            placeholder="Ej. 8421"
                                            maxLength={28}
                                            className="w-full bg-white border-2 border-emerald-300 rounded-xl pl-10 pr-9 py-2 text-center text-base font-mono font-extrabold tracking-[0.2em] text-slate-900 placeholder:font-sans placeholder:text-xs placeholder:font-normal placeholder:tracking-normal focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                        />
                                        {qrPinInput && (
                                            <button
                                                type="button"
                                                onClick={() => setQrPinInput('')}
                                                className="absolute right-2.5 top-2.5 w-5 h-5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
                                                title="Limpiar código"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>

                                    <button
                                        disabled={!qrPinInput.trim()}
                                        onClick={async () => {
                                            const ok = await handleInspectorQrScan(targetId, qrPinInput, currentTargetPlant?.id);
                                            if (ok) setQrPinInput('');
                                        }}
                                        className={`w-full font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-all ${!qrPinInput.trim()
                                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                            : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer active:scale-98'
                                            }`}
                                    >
                                        <QrCode className="w-4 h-4" />
                                        Validar Token QR de {currentTargetPlant?.code || 'Planta'}
                                    </button>
                                </div>
                            ) : (
                                /* Vista futura bloqueada del Paso 2 (mientras sigue en el Paso 1) */
                                <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-2 opacity-75">
                                    <span className="text-xs font-bold text-slate-500 flex items-center gap-2">
                                        <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                        Paso 2. Validar QR Dinámico en Planta ({currentTargetPlant?.code || 'Planta'})
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-semibold shrink-0">
                                        Requiere Paso 1
                                    </span>
                                </div>
                            )}

                            {/* =========================================================== */}
                            {/* PASO 3: REGISTRAR SALIDA DE PLANTA (CON CANDADO 2 TOQUES)   */}
                            {/* =========================================================== */}
                            {activeStepNumber === 3 && !isDepartureDone ? (
                                /* 5. Vista activa enfocada del Paso 3 con cronómetro en vivo y confirmación de 2 toques */
                                <div className="border-2 border-slate-800 ring-4 ring-slate-800/10 bg-slate-50 rounded-xl p-3.5 space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-extrabold text-slate-900 block">
                                            {isExtraShiftMode ? 'Paso 3. Registrar Salida de Turno Extra' : 'Paso 3. Registrar Salida de Planta'}
                                        </span>
                                        <span className="text-[10px] bg-slate-900 text-white font-extrabold px-2 py-0.5 rounded-full">
                                            👉 PASO ACTUAL
                                        </span>
                                    </div>

                                    {/* Cronómetro en vivo de estancia en planta */}
                                    <div className="bg-emerald-950 text-emerald-200 border border-emerald-500/40 rounded-xl p-3 flex items-center justify-between gap-2 shadow-inner">
                                        <div className="flex items-center gap-2">
                                            <span className="w-2.5 h-2.5 rounded-full bg-[#00FF66] shadow-[0_0_8px_#00FF66] animate-pulse shrink-0" />
                                            <div>
                                                <span className="text-[11px] font-bold text-white block">
                                                    Turno activo en {currentTargetPlant?.code}
                                                </span>
                                                <span className="text-[10px] text-emerald-300/90 block">
                                                    Entrada QR: {currentRec?.plantQrScan} hrs
                                                </span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-[10px] uppercase tracking-wider text-emerald-400 block font-bold">
                                                Tiempo en Planta
                                            </span>
                                            <strong className="font-mono text-sm font-extrabold text-white">
                                                {livePlantElapsedStr || '0h 00m'}
                                            </strong>
                                        </div>
                                    </div>

                                    {!confirmingDeparture ? (
                                        <>
                                            <p className="text-[11px] text-slate-600">
                                                Al concluir físicamente tus actividades en <strong>{currentTargetPlant?.name || 'planta'}</strong>, registra tu salida para cerrar el conteo de horas.
                                            </p>
                                            <button
                                                type="button"
                                                onClick={() => setConfirmingDeparture(true)}
                                                className="w-full font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer bg-slate-800 hover:bg-slate-900 text-white active:scale-98"
                                            >
                                                <LogOut className="w-4 h-4 text-red-400" />
                                                {isExtraShiftMode ? 'Registrar Salida de Turno Extra' : 'Registrar Salida de Planta'}
                                            </button>
                                        </>
                                    ) : (
                                        /* Confirmación de seguridad de 2 toques para evitar cierre accidental */
                                        <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-3 space-y-2.5">
                                            <div className="flex items-start gap-2">
                                                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                                <div className="text-xs text-amber-950">
                                                    <strong className="font-extrabold block">
                                                        ¿Confirmas tu salida definitiva a las {liveHHMM}?
                                                    </strong>
                                                    <span className="text-[11px] text-amber-800 block mt-0.5">
                                                        Se cerrará tu jornada en <strong>{currentTargetPlant?.code}</strong> con <strong>{livePlantElapsedStr || '0h 00m'}</strong> acumuladas.
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setConfirmingDeparture(false)}
                                                    className="py-2 rounded-lg text-xs font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 cursor-pointer"
                                                >
                                                    Cancelar
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={async () => {
                                                        setConfirmingDeparture(false);
                                                        await handleInspectorDeparture(targetId);
                                                    }}
                                                    className="py-2 rounded-lg text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                                                >
                                                    <LogOut className="w-3.5 h-3.5" />
                                                    Sí, cerrar turno
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                /* Vista futura bloqueada del Paso 3 (mientras sigue en Paso 1 o 2) */
                                <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-2 opacity-75">
                                    <span className="text-xs font-bold text-slate-500 flex items-center gap-2">
                                        <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                        {isExtraShiftMode ? 'Paso 3. Registrar Salida de Turno Extra' : 'Paso 3. Registrar Salida de Planta'}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-semibold shrink-0">
                                        Requiere Paso 2
                                    </span>
                                </div>
                            )}
                        </div>
                    );
                })()}

                {/* =============================================================== */}
                {/* PANEL DE AVISOS DEL SISTEMA (PARTE INFERIOR)                     */}
                {/* =============================================================== */}
                <div className="mt-4 pt-3 border-t border-slate-200 space-y-2">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                        📢 Mensajes Sistema:
                    </span>

                    {!activeInspector?.avatarUrl ? (
                        <div className="bg-amber-50 border border-amber-300 rounded-xl p-3.5 space-y-2 shadow-sm">
                            <div className="flex items-start gap-2">
                                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                                <div className="text-xs">
                                    <strong className="text-amber-900 block font-bold">Falta Fotografía de Perfil ({activeInspector?.empNo})</strong>
                                    <p className="text-amber-800 text-[11px] mt-0.5">
                                        {currentUser.id === activeInspector?.id
                                            ? 'No cuentas con una fotografía registrada en el sistema. Súbela para completar tu expediente y gafete.'
                                            : 'Este colaborador aún no cuenta con fotografía de perfil registrada en su expediente.'}
                                    </p>
                                </div>
                            </div>
                            {currentUser.id === activeInspector?.id && (
                                <div className="pt-1">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleUploadMyAvatar}
                                        className="w-full text-[11px] text-slate-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-amber-600 file:text-white hover:file:bg-amber-700 cursor-pointer bg-white border border-amber-200 rounded-lg p-1"
                                    />
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs flex items-center gap-2 text-emerald-800">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                            <span>
                                <strong>Expediente Verificado:</strong> La fotografía de <strong>{activeInspector.name}</strong> está registrada correctamente.
                            </span>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
