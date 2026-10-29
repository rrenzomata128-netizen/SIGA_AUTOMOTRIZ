import React, { useState, useMemo } from 'react';
import {
    UserCheck,
    Search,
    CheckCircle2,
    AlertTriangle,
    Clock,
    Lock,
    Zap,
    ChevronDown,
    ChevronUp,
    Filter,
    X,
    ShieldAlert,
    Activity
} from 'lucide-react';

// Clasificador determinista y mutuamente excluyente de estado operativo para el Supervisor
function classifySupervisorRecord(rec) {
    const isLocked = Boolean(rec.validatedBySupervisor);
    const hasExtendedRisk = rec.overtimeHours > 3 || rec.workedHoursDecimal > 12;

    if (isLocked) return 'LOCKED';
    if (!rec.departureTime && rec.status !== 'Falta') return 'ACTIVE_SHIFT';
    if (Boolean(rec.departureTime) && hasExtendedRisk) return 'PENDING_RISK';
    if (Boolean(rec.departureTime) && rec.status === 'A tiempo' && !hasExtendedRisk) return 'PENDING_OK';
    return 'PENDING_INCIDENT';
}

export default function SupervisorValidation({
    currentUser,
    setLftModalData,
    selectedPlantFilter,
    setSelectedPlantFilter,
    dateFilterType,
    setDateFilterType,
    todayStr,
    yesterdayStr,
    customStartDate,
    setCustomStartDate,
    customEndDate,
    setCustomEndDate,
    plants,
    allowedPlants,
    showToast,
    handleShiftAbandonment,
    handleValidateAttendance,
    handleBulkValidateOk,
    selectedShiftFilter = 'ALL',
    setSelectedShiftFilter,
    searchQuery = '',
    setSearchQuery,
    filteredRecords = [],
}) {
    const [supQuickFilter, setSupQuickFilter] = useState('ALL');
    const [manualAccordionState, setManualAccordionState] = useState({});
    const [confirmBulkOpen, setConfirmBulkOpen] = useState(false);
    const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);

    const visiblePlants = (allowedPlants && allowedPlants.length > 0) ? allowedPlants : plants;
    const hasFullPlantAccess = ['ADMIN', 'RH'].includes(currentUser?.systemRole || currentUser?.system_role) || currentUser?.plantId === 'ALL';

    // 1. Partición aritmética exacta de los registros filtrados (100% consistente con los filtros activos)
    const kpiBuckets = useMemo(() => {
        const buckets = {
            ALL: filteredRecords,
            PENDING_OK: [],
            PENDING_RISK: [],
            PENDING_INCIDENT: [],
            ACTIVE_SHIFT: [],
            LOCKED: []
        };

        filteredRecords.forEach(rec => {
            const category = classifySupervisorRecord(rec);
            buckets[category].push(rec);
        });

        return buckets;
    }, [filteredRecords]);

    // 2. Registros visibles según la tarjeta KPI rápida seleccionada
    const displayedRecords = useMemo(() => {
        return kpiBuckets[supQuickFilter] || filteredRecords;
    }, [kpiBuckets, supQuickFilter, filteredRecords]);

    // 3. Agrupación por empleado e identificación real de Turno Doble (mismo día)
    const employeeGroups = useMemo(() => {
        const groupedMap = {};

        displayedRecords.forEach(rec => {
            if (!groupedMap[rec.inspectorId]) {
                groupedMap[rec.inspectorId] = {
                    inspectorId: rec.inspectorId,
                    empNo: rec.empNo,
                    inspectorName: rec.inspectorName,
                    plantName: rec.plantName,
                    records: []
                };
            }
            groupedMap[rec.inspectorId].records.push(rec);
        });

        return Object.values(groupedMap).map(group => {
            group.records.sort((a, b) =>
                (a.date || '').localeCompare(b.date || '') ||
                (a.transportCheckIn || '').localeCompare(b.transportCheckIn || '')
            );

            // Detectar Turno Doble REAL: 2 o más registros en la misma fecha calendario
            const countByDate = {};
            group.records.forEach(r => {
                if (r.date) {
                    countByDate[r.date] = (countByDate[r.date] || 0) + 1;
                }
            });
            const doubleShiftDates = Object.entries(countByDate)
                .filter(([, count]) => count > 1)
                .map(([date]) => date);

            const hasSameDayDoubleShift = doubleShiftDates.length > 0;
            const lockedInGroup = group.records.filter(r => Boolean(r.validatedBySupervisor)).length;
            const pendingRiskInGroup = group.records.filter(r => classifySupervisorRecord(r) === 'PENDING_RISK').length;
            const pendingOkInGroup = group.records.filter(r => classifySupervisorRecord(r) === 'PENDING_OK').length;
            const activeInGroup = group.records.filter(r => classifySupervisorRecord(r) === 'ACTIVE_SHIFT').length;
            const isAllLocked = group.records.length > 0 && lockedInGroup === group.records.length;

            return {
                ...group,
                hasSameDayDoubleShift,
                doubleShiftDates,
                lockedInGroup,
                pendingRiskInGroup,
                pendingOkInGroup,
                activeInGroup,
                isAllLocked
            };
        });
    }, [displayedRecords]);

    const totalPendingCount =
        kpiBuckets.PENDING_OK.length +
        kpiBuckets.PENDING_RISK.length +
        kpiBuckets.PENDING_INCIDENT.length;

    const handleToggleEmployeeCard = (inspectorId, defaultOpen) => {
        setManualAccordionState(prev => {
            const currentOpen = prev[inspectorId] !== undefined ? prev[inspectorId] : defaultOpen;
            return { ...prev, [inspectorId]: !currentOpen };
        });
    };

    const handleExpandAll = () => {
        const next = {};
        employeeGroups.forEach(g => { next[g.inspectorId] = true; });
        setManualAccordionState(next);
    };

    const handleCollapseLocked = () => {
        const next = {};
        employeeGroups.forEach(g => { next[g.inspectorId] = !g.isAllLocked; });
        setManualAccordionState(next);
    };

    const onConfirmBulkValidate = async () => {
        if (!handleBulkValidateOk || kpiBuckets.PENDING_OK.length === 0) return;
        setIsBulkSubmitting(true);
        try {
            await handleBulkValidateOk(kpiBuckets.PENDING_OK);
            setConfirmBulkOpen(false);
        } finally {
            setIsBulkSubmitting(false);
        }
    };

    return (
        <div className="space-y-4">
            {/* CABECERA OPERATIVA Y CONTROLES DEL SUPERVISOR */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-sm space-y-3.5">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3">
                    <div>
                        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                            <UserCheck className="w-5 h-5 text-emerald-600" /> Centro de Validación Rápida y Cierre de Turno (Supervisor)
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Haz clic en cualquier tarjeta de resumen para filtrar al instante. Una vez validado un turno, queda <strong>sellado en Supabase</strong>.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-end">
                        {/* Botón de Validación Masiva 1-Clic para Turnos OK */}
                        {kpiBuckets.PENDING_OK.length > 0 && handleBulkValidateOk && (
                            !confirmBulkOpen ? (
                                <button
                                    type="button"
                                    onClick={() => setConfirmBulkOpen(true)}
                                    className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-sm shadow-emerald-600/20 transition-all cursor-pointer active:scale-95"
                                >
                                    <Zap className="w-4 h-4" />
                                    Validar Todos los OK ({kpiBuckets.PENDING_OK.length})
                                </button>
                            ) : (
                                <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-300 px-3 py-1.5 rounded-xl">
                                    <span className="text-[11px] font-bold text-emerald-900">
                                        ¿Cerrar y bloquear {kpiBuckets.PENDING_OK.length} turno(s) OK?
                                    </span>
                                    <button
                                        type="button"
                                        disabled={isBulkSubmitting}
                                        onClick={onConfirmBulkValidate}
                                        className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer"
                                    >
                                        {isBulkSubmitting ? 'Validando...' : 'Sí, Confirmar'}
                                    </button>
                                    <button
                                        type="button"
                                        disabled={isBulkSubmitting}
                                        onClick={() => setConfirmBulkOpen(false)}
                                        className="bg-white hover:bg-slate-100 text-slate-600 text-[11px] font-semibold px-2 py-1 rounded-lg border border-slate-200 transition-all cursor-pointer"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            )
                        )}

                        <div className="flex items-center gap-1.5">
                            <label className="text-xs font-semibold text-slate-600">Planta:</label>
                            <select
                                value={selectedPlantFilter}
                                onChange={(e) => setSelectedPlantFilter(e.target.value)}
                                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800"
                            >
                                {(hasFullPlantAccess || visiblePlants.length > 1) && (
                                    <option value="ALL">Todas mis Plantas ({visiblePlants.length})</option>
                                )}
                                {visiblePlants.map(p => (
                                    <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* TARJETAS KPI INTERACTIVAS (FILTROS EN 1 CLIC PARA EL SUPERVISOR) */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-1">
                    {/* 1. Todos */}
                    <button
                        type="button"
                        onClick={() => setSupQuickFilter('ALL')}
                        className={`text-left p-3 rounded-xl border transition-all cursor-pointer ${supQuickFilter === 'ALL'
                            ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                            : 'bg-slate-50/80 hover:bg-slate-100 text-slate-800 border-slate-200'
                            }`}
                    >
                        <div className="flex items-center justify-between">
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${supQuickFilter === 'ALL' ? 'text-slate-300' : 'text-slate-500'}`}>
                                Total Periodo
                            </span>
                            <Filter className={`w-3.5 h-3.5 ${supQuickFilter === 'ALL' ? 'text-emerald-400' : 'text-slate-400'}`} />
                        </div>
                        <div className="text-xl font-black font-mono mt-1">{kpiBuckets.ALL.length}</div>
                        <div className={`text-[10px] mt-0.5 ${supQuickFilter === 'ALL' ? 'text-slate-300' : 'text-slate-500'}`}>
                            {totalPendingCount} por validar
                        </div>
                    </button>

                    {/* 2. Pendientes Validar OK */}
                    <button
                        type="button"
                        onClick={() => setSupQuickFilter(supQuickFilter === 'PENDING_OK' ? 'ALL' : 'PENDING_OK')}
                        className={`text-left p-3 rounded-xl border transition-all cursor-pointer ${supQuickFilter === 'PENDING_OK'
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm ring-2 ring-emerald-500/30'
                            : 'bg-emerald-50/70 hover:bg-emerald-100/70 text-emerald-950 border-emerald-200'
                            }`}
                    >
                        <div className="flex items-center justify-between">
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${supQuickFilter === 'PENDING_OK' ? 'text-emerald-100' : 'text-emerald-700'}`}>
                                Pendientes OK
                            </span>
                            <CheckCircle2 className={`w-4 h-4 ${supQuickFilter === 'PENDING_OK' ? 'text-white' : 'text-emerald-600'}`} />
                        </div>
                        <div className="text-xl font-black font-mono mt-1">{kpiBuckets.PENDING_OK.length}</div>
                        <div className={`text-[10px] mt-0.5 ${supQuickFilter === 'PENDING_OK' ? 'text-emerald-100' : 'text-emerald-700'}`}>
                            Listos para cierre
                        </div>
                    </button>

                    {/* 3. Pendientes Validar Riesgo (>3h extra o >12h jornada) */}
                    <button
                        type="button"
                        onClick={() => setSupQuickFilter(supQuickFilter === 'PENDING_RISK' ? 'ALL' : 'PENDING_RISK')}
                        className={`text-left p-3 rounded-xl border transition-all cursor-pointer ${supQuickFilter === 'PENDING_RISK'
                            ? 'bg-red-600 text-white border-red-600 shadow-sm ring-2 ring-red-500/30'
                            : kpiBuckets.PENDING_RISK.length > 0
                                ? 'bg-red-50 hover:bg-red-100/80 text-red-950 border-red-300'
                                : 'bg-slate-50/60 hover:bg-slate-100 text-slate-600 border-slate-200'
                            }`}
                    >
                        <div className="flex items-center justify-between">
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${supQuickFilter === 'PENDING_RISK' ? 'text-red-100' : kpiBuckets.PENDING_RISK.length > 0 ? 'text-red-700' : 'text-slate-500'}`}>
                                Validar Riesgo
                            </span>
                            <ShieldAlert className={`w-4 h-4 ${supQuickFilter === 'PENDING_RISK' ? 'text-white' : kpiBuckets.PENDING_RISK.length > 0 ? 'text-red-600 animate-pulse' : 'text-slate-400'}`} />
                        </div>
                        <div className="text-xl font-black font-mono mt-1">{kpiBuckets.PENDING_RISK.length}</div>
                        <div className={`text-[10px] mt-0.5 ${supQuickFilter === 'PENDING_RISK' ? 'text-red-100' : kpiBuckets.PENDING_RISK.length > 0 ? 'text-red-700 font-semibold' : 'text-slate-500'}`}>
                            Sobretiempo &gt;3h / 12h
                        </div>
                    </button>

                    {/* 4. Retardos / Faltas por Validar */}
                    <button
                        type="button"
                        onClick={() => setSupQuickFilter(supQuickFilter === 'PENDING_INCIDENT' ? 'ALL' : 'PENDING_INCIDENT')}
                        className={`text-left p-3 rounded-xl border transition-all cursor-pointer ${supQuickFilter === 'PENDING_INCIDENT'
                            ? 'bg-amber-500 text-white border-amber-500 shadow-sm ring-2 ring-amber-400/30'
                            : kpiBuckets.PENDING_INCIDENT.length > 0
                                ? 'bg-amber-50/80 hover:bg-amber-100/70 text-amber-950 border-amber-200'
                                : 'bg-slate-50/60 hover:bg-slate-100 text-slate-600 border-slate-200'
                            }`}
                    >
                        <div className="flex items-center justify-between">
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${supQuickFilter === 'PENDING_INCIDENT' ? 'text-amber-50' : kpiBuckets.PENDING_INCIDENT.length > 0 ? 'text-amber-800' : 'text-slate-500'}`}>
                                Incidencias
                            </span>
                            <AlertTriangle className={`w-4 h-4 ${supQuickFilter === 'PENDING_INCIDENT' ? 'text-white' : kpiBuckets.PENDING_INCIDENT.length > 0 ? 'text-amber-600' : 'text-slate-400'}`} />
                        </div>
                        <div className="text-xl font-black font-mono mt-1">{kpiBuckets.PENDING_INCIDENT.length}</div>
                        <div className={`text-[10px] mt-0.5 ${supQuickFilter === 'PENDING_INCIDENT' ? 'text-amber-50' : kpiBuckets.PENDING_INCIDENT.length > 0 ? 'text-amber-800' : 'text-slate-500'}`}>
                            Retardo / Falta sin cerrar
                        </div>
                    </button>

                    {/* 5. En Turno Activo */}
                    <button
                        type="button"
                        onClick={() => setSupQuickFilter(supQuickFilter === 'ACTIVE_SHIFT' ? 'ALL' : 'ACTIVE_SHIFT')}
                        className={`text-left p-3 rounded-xl border transition-all cursor-pointer ${supQuickFilter === 'ACTIVE_SHIFT'
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm ring-2 ring-blue-500/30'
                            : 'bg-blue-50/60 hover:bg-blue-100/60 text-blue-950 border-blue-200'
                            }`}
                    >
                        <div className="flex items-center justify-between">
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${supQuickFilter === 'ACTIVE_SHIFT' ? 'text-blue-100' : 'text-blue-700'}`}>
                                Turno Activo
                            </span>
                            <Activity className={`w-4 h-4 ${supQuickFilter === 'ACTIVE_SHIFT' ? 'text-white' : 'text-blue-600'}`} />
                        </div>
                        <div className="text-xl font-black font-mono mt-1">{kpiBuckets.ACTIVE_SHIFT.length}</div>
                        <div className={`text-[10px] mt-0.5 ${supQuickFilter === 'ACTIVE_SHIFT' ? 'text-blue-100' : 'text-blue-700'}`}>
                            En planta (sin salida)
                        </div>
                    </button>

                    {/* 6. Bloqueados / Validados */}
                    <button
                        type="button"
                        onClick={() => setSupQuickFilter(supQuickFilter === 'LOCKED' ? 'ALL' : 'LOCKED')}
                        className={`text-left p-3 rounded-xl border transition-all cursor-pointer ${supQuickFilter === 'LOCKED'
                            ? 'bg-slate-700 text-white border-slate-700 shadow-sm'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                    >
                        <div className="flex items-center justify-between">
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${supQuickFilter === 'LOCKED' ? 'text-slate-200' : 'text-slate-500'}`}>
                                Bloqueados
                            </span>
                            <Lock className={`w-3.5 h-3.5 ${supQuickFilter === 'LOCKED' ? 'text-emerald-400' : 'text-slate-400'}`} />
                        </div>
                        <div className="text-xl font-black font-mono mt-1">{kpiBuckets.LOCKED.length}</div>
                        <div className={`text-[10px] mt-0.5 ${supQuickFilter === 'LOCKED' ? 'text-slate-200' : 'text-slate-500'}`}>
                            Turnos ya cerrados
                        </div>
                    </button>
                </div>

                {/* BARRA DE PERIODO + BUSCADOR INSTANTÁNEO + FILTRO DE TURNO */}
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 pt-2.5 border-t border-slate-100">
                    <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-xs font-semibold text-slate-500 mr-1">Periodo:</span>

                        {[
                            { id: 'TODAY', label: `Hoy (${todayStr})` },
                            { id: 'YESTERDAY', label: `Ayer (${yesterdayStr})` },
                            { id: 'LAST_7_DAYS', label: 'Hace 7 Días' },
                            { id: 'CUSTOM', label: 'Rango de Fechas' }
                        ].map(btn => (
                            <button
                                key={btn.id}
                                type="button"
                                onClick={() => setDateFilterType(btn.id)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${dateFilterType === btn.id
                                    ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/20'
                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                    }`}
                            >
                                {btn.label}
                            </button>
                        ))}

                        {dateFilterType === 'CUSTOM' && (
                            <div className="flex items-center gap-2 bg-slate-50 px-3 py-1 rounded-lg border border-slate-200 text-xs">
                                <span className="text-slate-500">Inicio:</span>
                                <input
                                    type="date"
                                    value={customStartDate}
                                    onChange={(e) => setCustomStartDate(e.target.value)}
                                    className="bg-white text-slate-800 px-2 py-0.5 rounded border border-slate-300 text-xs font-mono"
                                />
                                <span className="text-slate-500">Fin:</span>
                                <input
                                    type="date"
                                    value={customEndDate}
                                    onChange={(e) => setCustomEndDate(e.target.value)}
                                    className="bg-white text-slate-800 px-2 py-0.5 rounded border border-slate-300 text-xs font-mono"
                                />
                            </div>
                        )}
                    </div>

                    {/* Buscador rápido por No. Empleado / Nombre y selector de Turno */}
                    <div className="flex flex-wrap items-center gap-2">
                        {setSearchQuery && (
                            <div className="relative flex-1 sm:flex-initial sm:w-64">
                                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Buscar INS-001 o nombre..."
                                    className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-xl pl-8 pr-7 py-1.5 text-xs text-slate-800 outline-none transition-all"
                                />
                                {searchQuery && (
                                    <button
                                        type="button"
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                        title="Limpiar búsqueda"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                        )}

                        {setSelectedShiftFilter && (
                            <select
                                value={selectedShiftFilter}
                                onChange={(e) => setSelectedShiftFilter(e.target.value)}
                                className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-700"
                            >
                                <option value="ALL">Todos los Turnos</option>
                                <option value="T1">Turno 1 (Matutino)</option>
                                <option value="T2">Turno 2 (Vespertino)</option>
                                <option value="T3">Turno 3 (Nocturno)</option>
                                <option value="12H">Turnos 12 Horas (2x12)</option>
                            </select>
                        )}

                        <div className="flex items-center gap-1 border-l border-slate-200 pl-2">
                            <button
                                type="button"
                                onClick={handleExpandAll}
                                className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg transition-all cursor-pointer"
                                title="Desplegar todos los empleados"
                            >
                                Expandir Todos
                            </button>
                            <button
                                type="button"
                                onClick={handleCollapseLocked}
                                className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg transition-all cursor-pointer"
                                title="Contraer empleados que ya tienen el 100% de sus turnos validados"
                            >
                                Colapsar Cerrados
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* CONTENEDOR DE REGISTROS AGRUPADOS POR EMPLEADO CON ACORDEÓN INTELIGENTE */}
            <div className="space-y-3">
                {employeeGroups.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-2">
                        <p className="text-xs font-semibold text-slate-500">
                            No hay registros que coincidan con el filtro seleccionado.
                        </p>
                        {supQuickFilter !== 'ALL' && (
                            <button
                                type="button"
                                onClick={() => setSupQuickFilter('ALL')}
                                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 underline cursor-pointer"
                            >
                                Mostrar todos los registros del periodo ({kpiBuckets.ALL.length})
                            </button>
                        )}
                    </div>
                ) : (
                    employeeGroups.map(group => {
                        // Por defecto: expandir si tiene algún turno pendiente/activo; contraer si ya está 100% bloqueado (salvo que el filtro sea LOCKED)
                        const defaultOpen = !group.isAllLocked || supQuickFilter === 'LOCKED';
                        const isExpanded = manualAccordionState[group.inspectorId] !== undefined
                            ? manualAccordionState[group.inspectorId]
                            : defaultOpen;

                        return (
                            <div
                                key={group.inspectorId}
                                className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${group.hasSameDayDoubleShift
                                    ? 'border-amber-400 ring-2 ring-amber-400/20'
                                    : group.pendingRiskInGroup > 0
                                        ? 'border-red-300'
                                        : group.isAllLocked
                                            ? 'border-slate-200/80 opacity-90'
                                            : 'border-slate-200'
                                    }`}
                            >
                                {/* Encabezado clicable del empleado (Acordeón Inteligente) */}
                                <div
                                    onClick={() => handleToggleEmployeeCard(group.inspectorId, defaultOpen)}
                                    className={`px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 cursor-pointer select-none transition-colors ${isExpanded ? 'border-b' : ''
                                        } ${group.hasSameDayDoubleShift
                                            ? 'bg-amber-50/90 hover:bg-amber-100/70 border-amber-200'
                                            : group.isAllLocked
                                                ? 'bg-slate-50/70 hover:bg-slate-100/80 border-slate-200'
                                                : 'bg-slate-50 hover:bg-slate-100/90 border-slate-200'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="font-mono font-bold text-xs bg-blue-600 text-white px-2.5 py-1 rounded-md">
                                            {group.empNo}
                                        </span>
                                        <div>
                                            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                                {group.inspectorName}
                                                {group.isAllLocked && (
                                                    <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                                                        ✓ Completado
                                                    </span>
                                                )}
                                            </h3>
                                            <p className="text-[11px] text-slate-500">{group.plantName}</p>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2">
                                        {group.hasSameDayDoubleShift && (
                                            <div className="bg-amber-500 text-white text-[10px] font-bold px-3 py-1 rounded-lg flex items-center gap-1.5 shadow-sm">
                                                ⚠️ Turno Doble en Mismo Día ({group.doubleShiftDates.join(', ')})
                                            </div>
                                        )}

                                        {group.pendingRiskInGroup > 0 && (
                                            <span className="bg-red-100 text-red-800 border border-red-300 text-[10px] font-extrabold px-2.5 py-1 rounded-lg">
                                                🚨 {group.pendingRiskInGroup} Riesgo Pendiente
                                            </span>
                                        )}

                                        {group.pendingOkInGroup > 0 && (
                                            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2.5 py-1 rounded-lg">
                                                ⏳ {group.pendingOkInGroup} OK por validar
                                            </span>
                                        )}

                                        {group.activeInGroup > 0 && (
                                            <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold px-2.5 py-1 rounded-lg">
                                                🟢 {group.activeInGroup} en turno
                                            </span>
                                        )}

                                        <span className="text-xs font-semibold text-slate-600 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                                            {group.lockedInGroup}/{group.records.length} cerrados
                                        </span>

                                        <span className="text-slate-400 p-1">
                                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                        </span>
                                    </div>
                                </div>

                                {/* Líneas de turnos de este empleado */}
                                {isExpanded && (
                                    <div className="divide-y divide-slate-100 p-4 space-y-3">
                                        {group.records.map((rec, idx) => {
                                            const isLocked = Boolean(rec.validatedBySupervisor);
                                            const uniqueFolio = `${rec.id}-${idx + 1}`.replace('att-', 'Folio ');
                                            const hasExtendedRisk = rec.overtimeHours > 3 || rec.workedHoursDecimal > 12;

                                            return (
                                                <div
                                                    key={`${group.inspectorId}-${rec.id}-${idx}`}
                                                    className={`p-4 rounded-xl border flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 transition-all ${isLocked
                                                        ? 'bg-slate-50 border-slate-200'
                                                        : hasExtendedRisk
                                                            ? 'bg-red-50/20 border-red-200 hover:border-red-300'
                                                            : 'bg-white border-slate-200 hover:border-blue-300'
                                                        }`}
                                                >
                                                    {/* 1. Folio, estatus y turno */}
                                                    <div className="space-y-1.5 min-w-[210px] flex-shrink-0">
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    navigator.clipboard.writeText(uniqueFolio);
                                                                    showToast(`Copiado al portapapeles: ${uniqueFolio}`);
                                                                }}
                                                                title="Clic para copiar folio"
                                                                className="group inline-flex items-center gap-1.5 text-[10px] font-mono font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 hover:text-indigo-900 px-2.5 py-0.5 rounded-lg border border-indigo-200 transition-all cursor-pointer shadow-xs active:scale-95"
                                                            >
                                                                <span>{uniqueFolio}</span>
                                                                <svg className="w-3 h-3 text-indigo-400 group-hover:text-indigo-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                                </svg>
                                                            </button>

                                                            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${rec.status === 'A tiempo' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                                rec.status === 'Retardo' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                                    'bg-red-50 text-red-700 border-red-200'
                                                                }`}>
                                                                {rec.status}
                                                            </span>
                                                        </div>

                                                        <div className="flex items-center gap-2 text-xs pt-0.5">
                                                            <span className="font-mono font-bold text-slate-700">{rec.date}</span>
                                                            <span className="text-slate-400">•</span>
                                                            <span className="font-semibold text-slate-800">{rec.shift}</span>
                                                        </div>
                                                    </div>

                                                    {/* 2. Cuadrícula de horas blindada contra encogimiento */}
                                                    <div className="grid grid-cols-4 gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200/80 text-xs text-center flex-1 min-w-[280px] max-w-md">
                                                        <div className="bg-white p-1.5 rounded-lg border border-slate-200">
                                                            <span className="text-slate-400 block text-[10px]">Transporte</span>
                                                            <strong className="font-mono text-blue-600">{rec.transportCheckIn || '--:--'}</strong>
                                                        </div>
                                                        <div className="bg-white p-1.5 rounded-lg border border-slate-200">
                                                            <span className="text-slate-400 block text-[10px]">QR Planta</span>
                                                            <strong className="font-mono text-emerald-600">{rec.plantQrScan || '--:--'}</strong>
                                                        </div>
                                                        <div className="bg-white p-1.5 rounded-lg border border-slate-200">
                                                            <span className="text-slate-400 block text-[10px]">Salida</span>
                                                            <strong className="font-mono text-slate-800">{rec.departureTime || '--:--'}</strong>
                                                        </div>
                                                        <div className="bg-white p-1.5 rounded-lg border border-slate-200">
                                                            <span className="text-slate-400 block text-[10px]">Total Hrs</span>
                                                            <strong className="font-mono text-indigo-600">{rec.workedHoursFormatted || '0.00h'}</strong>
                                                        </div>
                                                    </div>

                                                    {/* 3. Bloque derecho: Alerta de fatiga arriba y botones abajo */}
                                                    <div className="flex flex-col items-end justify-center gap-2 flex-shrink-0">
                                                        {hasExtendedRisk ? (
                                                            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-md bg-red-100 text-red-800 border border-red-300 animate-pulse shadow-xs" title="Revisión: Supera 3 horas extra diarias o 12h de jornada.">
                                                                ⚠️ Riesgo (+{rec.overtimeHours}h extra)
                                                            </span>
                                                        ) : rec.overtimeHours > 0 ? (
                                                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 shadow-xs">
                                                                ⏱️ Extra: +{rec.overtimeHours}h
                                                            </span>
                                                        ) : null}

                                                        <div className="flex flex-wrap items-center justify-end gap-2">
                                                            {isLocked ? (
                                                                <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                                                                    🔒 Bloqueado
                                                                </span>
                                                            ) : (
                                                                <span className="text-[11px] font-bold text-amber-700 flex items-center gap-1 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                                                                    ⚠️ Pendiente
                                                                </span>
                                                            )}

                                                            <div className="flex items-center gap-1">
                                                                <button
                                                                    type="button"
                                                                    disabled={isLocked || !rec.departureTime}
                                                                    onClick={() => {
                                                                        if (hasExtendedRisk) {
                                                                            setLftModalData({
                                                                                record: rec,
                                                                                newStatus: 'A tiempo',
                                                                                targetComments: rec.comments
                                                                            });
                                                                        } else {
                                                                            handleValidateAttendance(rec.id, 'A tiempo', 'Ninguno', rec.comments);
                                                                        }
                                                                    }}
                                                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${isLocked || !rec.departureTime
                                                                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                                                        : hasExtendedRisk
                                                                            ? 'bg-red-600 hover:bg-red-700 text-white shadow-sm ring-2 ring-red-400/40'
                                                                            : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                                                                        }`}
                                                                >
                                                                    {!rec.departureTime ? 'Turno Activo' : hasExtendedRisk ? 'Validar Riesgo' : 'Validar OK'}
                                                                </button>

                                                                <button
                                                                    type="button"
                                                                    disabled={isLocked}
                                                                    onClick={() => handleValidateAttendance(rec.id, 'Retardo', 'Retardo confirmado en línea', rec.comments)}
                                                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${isLocked
                                                                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                                                        : 'bg-amber-500 hover:bg-amber-600 text-white shadow-sm'
                                                                        }`}
                                                                >
                                                                    Retardo
                                                                </button>

                                                                {rec.plantQrScan && !rec.departureTime ? (
                                                                    <button
                                                                        type="button"
                                                                        disabled={isLocked}
                                                                        onClick={() => handleShiftAbandonment(rec.id, rec.comments)}
                                                                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-orange-600 hover:bg-orange-700 text-white shadow-sm transition-all"
                                                                    >
                                                                        Abandono
                                                                    </button>
                                                                ) : (
                                                                    <button
                                                                        type="button"
                                                                        disabled={isLocked || Boolean(rec.plantQrScan)}
                                                                        onClick={() => handleValidateAttendance(rec.id, 'Falta', 'Inasistencia confirmada en turno', rec.comments)}
                                                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${isLocked || Boolean(rec.plantQrScan)
                                                                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                                                            : 'bg-red-600 hover:bg-red-700 text-white shadow-sm'
                                                                            }`}
                                                                    >
                                                                        Falta
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
