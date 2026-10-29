import React, { useState, useMemo } from 'react';
import {
    Calculator,
    Download,
    ShieldAlert,
    ChevronDown,
    ChevronUp,
    Building2,
    Calendar,
    FileText,
    Lock,
    Clock
} from 'lucide-react';
import { formatMinutesToHHMM, safeRound2 } from '../../lib/attendanceMetrics';

export default function PayrollView({
    setSelectedEmployeeDetail,
    globalMetrics,
    payrollByInspector,
    handleExportPayrollCSV,
    handleExportAttendanceExcel,   // ← agrega esta
    plants = [],
}) {
    // Controles del Árbol de 3 Niveles (Planta -> Inspector -> Fecha)
    const [expandedPlants, setExpandedPlants] = useState({});
    const [expandedInspectors, setExpandedInspectors] = useState({});
    const [isFatigueAlertOpen, setIsFatigueAlertOpen] = useState(false);
    const [quickFilter, setQuickFilter] = useState('ALL'); // 'ALL' | 'OVERTIME' | 'FATIGUE'

    // Agrupar payrollByInspector por Planta (Nivel 1 -> Nivel 2 -> Nivel 3) — 100% Tiempo y Asistencia (Cero Moneda)
    const payrollTreeByPlant = useMemo(() => {
        const plantMap = {};

        plants.forEach((p) => {
            plantMap[p.id] = {
                plantId: p.id,
                plantCode: p.code || p.id.toUpperCase(),
                plantName: p.name,
                inspectors: [],
                daysScheduled: 0,
                daysWorked: 0,
                lateDays: 0,
                absentDays: 0,
                regularMinutes: 0,
                overtimeMinutes: 0,
                workedMinutes: 0,
                totalRegularHours: 0,
                totalOvertimeHours: 0,
                totalHours: 0,
                fatigueRiskCount: 0,
                inspectorsWithRisk: 0,
            };
        });

        const filteredInspectors = payrollByInspector.filter((emp) => {
            if (quickFilter === 'OVERTIME') return emp.totalOvertimeHours > 0;
            if (quickFilter === 'FATIGUE') return emp.hasLftRisk;
            return true;
        });

        filteredInspectors.forEach((emp) => {
            const primarySessionPlantId = emp.sessions?.[0]?.plantId;
            const matchedPlant =
                plants.find((p) => p.id === primarySessionPlantId) ||
                plants.find((p) => p.name === emp.plantName);

            const groupKey = matchedPlant ? matchedPlant.id : (emp.plantName || 'SIN_PLANTA');

            if (!plantMap[groupKey]) {
                plantMap[groupKey] = {
                    plantId: groupKey,
                    plantCode: groupKey.slice(0, 6).toUpperCase(),
                    plantName: emp.plantName || 'Planta Asignada',
                    inspectors: [],
                    daysScheduled: 0,
                    daysWorked: 0,
                    lateDays: 0,
                    absentDays: 0,
                    regularMinutes: 0,
                    overtimeMinutes: 0,
                    workedMinutes: 0,
                    totalRegularHours: 0,
                    totalOvertimeHours: 0,
                    totalHours: 0,
                    fatigueRiskCount: 0,
                    inspectorsWithRisk: 0,
                };
            }

            const pGroup = plantMap[groupKey];
            pGroup.inspectors.push(emp);
            pGroup.daysScheduled += emp.daysScheduled || 0;
            pGroup.daysWorked += emp.daysWorked || 0;
            pGroup.lateDays += emp.lateDays || 0;
            pGroup.absentDays += emp.absentDays || 0;
            pGroup.regularMinutes += emp.regularMinutes || 0;
            pGroup.overtimeMinutes += emp.overtimeMinutes || 0;
            pGroup.workedMinutes += emp.workedMinutes || 0;
            pGroup.totalRegularHours = safeRound2(pGroup.totalRegularHours + (emp.totalRegularHours || 0));
            pGroup.totalOvertimeHours = safeRound2(pGroup.totalOvertimeHours + (emp.totalOvertimeHours || 0));
            pGroup.totalHours = safeRound2(pGroup.totalHours + (emp.totalHours || 0));
            if (emp.hasLftRisk) {
                pGroup.inspectorsWithRisk += 1;
                pGroup.fatigueRiskCount += emp.totalLftRiskCount || 1;
            }
        });

        return Object.values(plantMap)
            .filter((p) => p.inspectors.length > 0)
            .map((p) => {
                const sortedInspectors = [...p.inspectors].sort((a, b) =>
                    (a.empNo || '').localeCompare(b.empNo || '')
                );
                const attendancePct = p.daysScheduled > 0
                    ? Math.round((p.daysWorked / p.daysScheduled) * 100)
                    : 0;
                const overtimeRatioPct = p.totalHours > 0
                    ? safeRound2((p.totalOvertimeHours / p.totalHours) * 100)
                    : 0;

                return {
                    ...p,
                    inspectors: sortedInspectors,
                    attendancePct,
                    overtimeRatioPct,
                    formattedTotalHHMM: formatMinutesToHHMM(p.workedMinutes),
                };
            });
    }, [payrollByInspector, plants, quickFilter]);

    // Lista de colaboradores con alerta de sobretiempo para la barra superior compacta
    const inspectorsWithFatigueAlert = useMemo(
        () => payrollByInspector.filter((emp) => emp.hasLftRisk),
        [payrollByInspector]
    );

    // Porcentaje global de tiempo extra sobre el total de horas
    const globalOvertimePct = globalMetrics.totalPayrollHours > 0
        ? safeRound2((globalMetrics.totalOvertimeHours / globalMetrics.totalPayrollHours) * 100)
        : 0;

    const togglePlant = (plantId) => {
        setExpandedPlants((prev) => ({ ...prev, [plantId]: !prev[plantId] }));
    };

    const toggleInspector = (inspectorKey) => {
        setExpandedInspectors((prev) => ({ ...prev, [inspectorKey]: !prev[inspectorKey] }));
    };

    const handleExpandAllPlants = () => {
        const allOpen = payrollTreeByPlant.every((p) => expandedPlants[p.plantId]);
        if (allOpen) {
            setExpandedPlants({});
            setExpandedInspectors({});
        } else {
            const nextPlants = {};
            payrollTreeByPlant.forEach((p) => {
                nextPlants[p.plantId] = true;
            });
            setExpandedPlants(nextPlants);
        }
    };

    const allPlantsExpanded =
        payrollTreeByPlant.length > 0 &&
        payrollTreeByPlant.every((p) => expandedPlants[p.plantId]);

    // Clase base de tamaño fijo forzado para todos los contenedores de métricas (Extra / Ord / Ext / Total)
    const UNIFORM_BOX_CLASS =
        'w-[116px] h-7 inline-flex items-center justify-center text-center rounded-lg text-[11px] font-mono border shrink-0 whitespace-nowrap';

    return (
        <div className="space-y-3.5">
            {/* BARRA COMPACTA DE 1 SOLA LÍNEA PARA ALERTA DE SOBRETIEMPO EXTENDIDO */}
            {globalMetrics.lftViolationCount > 0 && (
                <div className="bg-red-50/90 border border-red-300 rounded-2xl shadow-sm overflow-hidden transition-all">
                    <div className="px-4 py-2.5 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 flex-wrap">
                            <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-red-950">
                                <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
                                Control de Sobretiempo:
                            </span>
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-extrabold bg-red-600 text-white shadow-sm">
                                ⚠️ {globalMetrics.lftViolationCount} Jornada(s) (+3h extra)
                            </span>
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-white text-red-800 border border-red-200">
                                👤 {inspectorsWithFatigueAlert.length} Colaborador(es) con alerta de fatiga
                            </span>
                            <span className="text-[11px] text-red-800 hidden xl:inline">
                                • Verifique si se está cubriendo déficit de personal con tiempo extra en lugar de relevo.
                            </span>
                        </div>

                        <div className="flex items-center gap-2 ml-auto">
                            <button
                                type="button"
                                onClick={() => setQuickFilter(quickFilter === 'FATIGUE' ? 'ALL' : 'FATIGUE')}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors ${
                                    quickFilter === 'FATIGUE'
                                        ? 'bg-red-700 text-white border-red-800 shadow-sm'
                                        : 'bg-white hover:bg-red-100 text-red-800 border-red-300'
                                }`}
                            >
                                {quickFilter === 'FATIGUE' ? '✓ Filtrando Alerta Fatiga' : 'Filtrar afectados'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsFatigueAlertOpen((prev) => !prev)}
                                title={isFatigueAlertOpen ? 'Ocultar detalle de sobretiempo' : 'Ver colaboradores con sobretiempo'}
                                className="w-7 h-7 rounded-lg bg-white hover:bg-red-100 text-red-700 border border-red-200 flex items-center justify-center transition-colors shadow-sm"
                            >
                                {isFatigueAlertOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    {isFatigueAlertOpen && (
                        <div className="px-4 py-2.5 bg-white/90 border-t border-red-200 flex flex-wrap items-center gap-2 text-[11px]">
                            <span className="font-bold text-slate-700">Colaboradores detectados:</span>
                            {inspectorsWithFatigueAlert.map((emp) => (
                                <button
                                    key={emp.inspectorId}
                                    type="button"
                                    onClick={() => setSelectedEmployeeDetail(emp)}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-900 border border-red-200 font-semibold transition-colors"
                                >
                                    <span className="font-mono font-bold text-red-700">{emp.empNo}</span>
                                    <span>{emp.inspectorName}</span>
                                    <span className="text-[10px] bg-red-200/80 text-red-900 px-1.5 py-0.2 rounded font-mono font-bold">
                                        +{emp.totalOvertimeHours.toFixed(2)}h ext
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ENCABEZADO OPERATIVO DE HORAS E INCIDENCIAS (CERO MONEDA) */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-sm space-y-3">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2.5">
                    <div className="flex items-center gap-2.5 flex-wrap">
                        <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                            <Calculator className="w-4 h-4" />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-slate-900 leading-tight">
                                Control de Horas Ordinarias, Tiempo Extra e Incidencias (RH)
                            </h2>
                            <p className="text-[11px] text-slate-500">
                                Trazabilidad exacta de horas laboradas por Planta Cliente ➔ Inspector ➔ Jornada diaria (QR Entrada a Salida).
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
    <button
        onClick={handleExportAttendanceExcel}
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
    >
        <Download className="w-3.5 h-3.5" /> Exportar Asistencia (.xlsx)
    </button>
    <button
        onClick={handleExportPayrollCSV}
        className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
    >
        <Download className="w-3.5 h-3.5" /> Exportar Horas (.CSV)
    </button>
</div>>
                </div>
                

                {/* 4 TARJETAS KPI DE CONTROL DE TIEMPOS Y ASISTENCIA (MISMO TAMAÑO, CERO CANTIDADES DE DINERO) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2.5 border-t border-slate-100">
                    <div className="bg-slate-50 px-3.5 py-2.5 rounded-xl border border-slate-200/80 flex items-center justify-between min-h-[74px]">
                        <div>
                            <span className="text-[11px] text-slate-500 block font-semibold">1. Horas Ordinarias</span>
                            <span className="text-base font-mono font-extrabold text-slate-900">{globalMetrics.totalRegularHours.toFixed(2)} hrs</span>
                            <span className="block text-[10px] text-slate-500 font-mono">
                                {formatMinutesToHHMM(globalMetrics.totalRegularMinutes)}
                            </span>
                        </div>
                        <div className="text-right">
                            <span className="text-[10px] font-bold text-slate-400 uppercase block">Jornadas</span>
                            <span className="text-xs font-mono font-bold text-slate-800">
                                {globalMetrics.presentCount}/{globalMetrics.totalRecords} asist.
                            </span>
                        </div>
                    </div>

                    <div className="bg-amber-50/60 px-3.5 py-2.5 rounded-xl border border-amber-200/80 flex items-center justify-between min-h-[74px]">
                        <div>
                            <span className="text-[11px] text-amber-800 block font-semibold">
                                2. Horas Extra
                            </span>
                            <span className="text-base font-mono font-extrabold text-amber-600">+{globalMetrics.totalOvertimeHours.toFixed(2)} hrs</span>
                            <span className="block text-[10px] text-amber-700/90 font-mono">
                                {formatMinutesToHHMM(globalMetrics.totalOvertimeMinutes)}
                            </span>
                        </div>
                        <div className="text-right">
                            <span className="text-[10px] font-bold text-amber-700/70 uppercase block">Proporción</span>
                            <span className="text-xs font-mono font-bold text-amber-800">
                                {globalOvertimePct.toFixed(2)}% extra
                            </span>
                        </div>
                    </div>

                    <div className="bg-emerald-50/70 px-3.5 py-2.5 rounded-xl border border-emerald-200 flex items-center justify-between min-h-[74px]">
                        <div>
                            <span className="text-[11px] text-emerald-800 font-bold block">3. Total Horas (1 + 2)</span>
                            <span className="text-base font-mono font-extrabold text-emerald-700">{globalMetrics.totalPayrollHours.toFixed(2)} hrs</span>
                            <span className="block text-[10px] text-emerald-700 font-mono">
                                Exacto: {globalMetrics.totalFormattedHHMM}
                            </span>
                        </div>
                        <div className="text-right">
                            <span className="text-[10px] font-bold text-emerald-700/70 uppercase block">Plantas</span>
                            <span className="text-xs font-mono font-bold text-emerald-800">
                                {payrollTreeByPlant.length} activas
                            </span>
                        </div>
                    </div>

                    <div className="bg-blue-50/70 px-3.5 py-2.5 rounded-xl border border-blue-200 flex items-center justify-between min-h-[74px]">
                        <div>
                            <span className="text-[11px] text-blue-800 font-bold block">4. Balance de Asistencia</span>
                            <span className="text-sm font-mono font-extrabold text-blue-800">
                                {globalMetrics.onTimeCount} OK • {globalMetrics.lateCount} Ret • {globalMetrics.absentCount} Fal
                            </span>
                            <span className="block text-[10px] text-blue-600 mt-0.5">
                                {payrollByInspector.length} colaboradores activos
                            </span>
                        </div>
                        <span className="px-2 py-0.5 rounded-md bg-blue-600 text-white font-mono text-[10px] font-bold">
                            {globalMetrics.attendanceRatePct}% Asist.
                        </span>
                    </div>
                </div>
            </div>

            {/* CÉDULA DE HORAS POR PLANTA EN ÁRBOL DE 3 NIVELES (ALINEACIÓN UNIFORME FORZADA) */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
                {/* BARRA DE TÍTULO Y CONTROLES DEL ÁRBOL */}
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap justify-between items-center gap-2 text-xs">
                    <div className="flex items-center gap-2 flex-wrap">
                        <Building2 className="w-4 h-4 text-blue-600" />
                        <strong className="text-slate-800">
                            Cédula de Horas por Planta Cliente
                        </strong>
                        <span className="text-[11px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-md font-semibold">
                            {payrollTreeByPlant.length} plantas • {payrollByInspector.length} colaboradores
                        </span>
                        <span className="text-[11px] text-slate-500 hidden md:inline">
                            (Despliega Planta ➔ Inspector ➔ Desglose diario por Fecha)
                        </span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                        <div className="inline-flex items-center bg-white border border-slate-200 rounded-xl p-0.5 text-[11px]">
                            <button
                                type="button"
                                onClick={() => setQuickFilter('ALL')}
                                className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                                    quickFilter === 'ALL'
                                        ? 'bg-slate-800 text-white'
                                        : 'text-slate-600 hover:bg-slate-100'
                                }`}
                            >
                                Todos ({payrollByInspector.length})
                            </button>
                            <button
                                type="button"
                                onClick={() => setQuickFilter(quickFilter === 'OVERTIME' ? 'ALL' : 'OVERTIME')}
                                className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                                    quickFilter === 'OVERTIME'
                                        ? 'bg-amber-600 text-white'
                                        : 'text-amber-700 hover:bg-amber-50'
                                }`}
                            >
                                ⚡ Con Hrs Extra ({payrollByInspector.filter((e) => e.totalOvertimeHours > 0).length})
                            </button>
                            {inspectorsWithFatigueAlert.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => setQuickFilter(quickFilter === 'FATIGUE' ? 'ALL' : 'FATIGUE')}
                                    className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                                        quickFilter === 'FATIGUE'
                                            ? 'bg-red-600 text-white'
                                            : 'text-red-700 hover:bg-red-50'
                                    }`}
                                >
                                    ⚠️ Alerta Sobretiempo ({inspectorsWithFatigueAlert.length})
                                </button>
                            )}
                        </div>

                        <button
                            type="button"
                            onClick={handleExpandAllPlants}
                            className="px-2.5 py-1 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-[11px] transition-colors"
                        >
                            {allPlantsExpanded ? 'Colapsar plantas' : 'Expandir plantas'}
                        </button>
                    </div>
                </div>

                {/* CUERPO DEL ÁRBOL DE 3 NIVELES */}
                <div className="p-3.5 space-y-2.5 bg-slate-50/50">
                    {payrollTreeByPlant.length === 0 ? (
                        <div className="text-center py-8 text-xs text-slate-500 bg-white rounded-xl border border-slate-200">
                            No se encontraron registros con los filtros seleccionados.
                        </div>
                    ) : (
                        payrollTreeByPlant.map((plant) => {
                            const isPlantOpen = !!expandedPlants[plant.plantId];

                            const extraSemaphoreClass =
                                plant.overtimeRatioPct === 0
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold'
                                    : plant.overtimeRatioPct <= 8
                                    ? 'bg-amber-50 text-amber-800 border-amber-200 font-bold'
                                    : 'bg-red-50 text-red-700 border-red-300 font-extrabold';

                            return (
                                <div
                                    key={plant.plantId}
                                    className={`rounded-xl border transition-all overflow-hidden ${
                                        plant.inspectorsWithRisk > 0
                                            ? 'border-red-200/90 bg-white shadow-sm'
                                            : 'border-slate-200/90 bg-white shadow-sm'
                                    }`}
                                >
                                    {/* ================================================================= */}
                                    {/* NIVEL 1: LÍNEA PRINCIPAL POR PLANTA CLIENTE (SIMÉTRICA Y ALINEADA) */}
                                    {/* ================================================================= */}
                                    <div
                                        onClick={() => togglePlant(plant.plantId)}
                                        className="px-4 py-2.5 bg-white hover:bg-slate-50/90 cursor-pointer flex flex-col lg:flex-row lg:items-end justify-between gap-2.5 transition-colors"
                                    >
                                        {/* BLOQUE IZQUIERDO: Código + Nombre arriba; Leyenda de personal abajo alineada al código */}
                                        <div className="flex flex-col gap-1 min-w-0">
                                            <div className="flex items-center gap-2.5">
                                                <span className="font-mono font-extrabold text-[11px] px-2.5 py-0.5 rounded-md bg-slate-900 text-white shrink-0">
                                                    {plant.plantCode}
                                                </span>
                                                <span className="text-xs font-extrabold text-slate-900 truncate">
                                                    {plant.plantName}
                                                </span>
                                            </div>

                                            {/* Leyenda inferior alineada al borde izquierdo del código de planta */}
                                            <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
                                                <span>
                                                    {plant.inspectors.length} {plant.inspectors.length === 1 ? 'inspector' : 'inspectores'}
                                                </span>
                                                <span>•</span>
                                                <span className="font-mono">
                                                    Asist: <strong className="text-slate-700">{plant.daysWorked}/{plant.daysScheduled}</strong> ({plant.attendancePct}%)
                                                </span>
                                                {(plant.lateDays > 0 || plant.absentDays > 0) && (
                                                    <>
                                                        <span>•</span>
                                                        <span className="text-amber-700 font-semibold">
                                                            {plant.lateDays} Ret / {plant.absentDays} Fal
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        {/* BLOQUE DERECHO: 4 Contenedores del mismo tamaño forzado + Sobretiempo arriba de Total */}
                                        <div className="flex items-end gap-2 ml-auto shrink-0 flex-wrap sm:flex-nowrap">
                                            {/* 1. Contenedor % Extra (Tamaño fijo 116px) */}
                                            <span
                                                title="Proporción de horas extra respecto al total de horas de la planta"
                                                className={`${UNIFORM_BOX_CLASS} ${extraSemaphoreClass}`}
                                            >
                                                {plant.overtimeRatioPct.toFixed(2)}% Extra
                                            </span>

                                            {/* 2. Contenedor Ord (Tamaño fijo 116px) */}
                                            <span className={`${UNIFORM_BOX_CLASS} bg-slate-100 text-slate-700 border-slate-200 font-semibold`}>
                                                Ord:&nbsp;<strong>{plant.totalRegularHours.toFixed(2)}h</strong>
                                            </span>

                                            {/* 3. Contenedor Ext (Tamaño fijo 116px) */}
                                            <span
                                                className={`${UNIFORM_BOX_CLASS} ${
                                                    plant.totalOvertimeHours > 0
                                                        ? 'bg-amber-50 text-amber-800 border-amber-200 font-bold'
                                                        : 'bg-slate-50 text-slate-400 border-slate-200 font-semibold'
                                                }`}
                                            >
                                                Ext:&nbsp;<strong>+{plant.totalOvertimeHours.toFixed(2)}h</strong>
                                            </span>

                                            {/* 4. Columna Total con Advertencia de Sobretiempo colocada arriba de Total */}
                                            <div className="flex flex-col items-end gap-1 shrink-0">
                                                {plant.inspectorsWithRisk > 0 && (
                                                    <span className="w-[116px] h-5 inline-flex items-center justify-center text-center rounded-md text-[10px] font-extrabold bg-red-600 text-white shadow-sm whitespace-nowrap">
                                                        ⚠️ {plant.inspectorsWithRisk} sobretiempo
                                                    </span>
                                                )}
                                                <span className={`${UNIFORM_BOX_CLASS} bg-emerald-50 text-emerald-800 border-emerald-200 font-bold`}>
                                                    Total:&nbsp;<strong>{plant.totalHours.toFixed(2)}h</strong>
                                                </span>
                                            </div>

                                            {/* 5. Botón Colapsar / Expandir Nivel 1 */}
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    togglePlant(plant.plantId);
                                                }}
                                                title={isPlantOpen ? 'Ocultar inspectores de la planta' : 'Desplegar inspectores de la planta'}
                                                className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 transition-colors ${
                                                    isPlantOpen
                                                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                                        : 'bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-600 border-slate-200'
                                                }`}
                                            >
                                                {isPlantOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* ================================================================= */}
                                    {/* NIVEL 2: RAMA DE INSPECTORES PERTENECIENTES A LA PLANTA           */}
                                    {/* ================================================================= */}
                                    {isPlantOpen && (
                                        <div className="px-3.5 pb-3 pt-2 bg-slate-50/70 border-t border-slate-200/80">
                                            <div className="ml-2 pl-3 border-l-2 border-blue-200 space-y-1.5">
                                                {plant.inspectors.map((emp) => {
                                                    const inspectorKey = `${plant.plantId}_${emp.inspectorId}`;
                                                    const isInspectorOpen = !!expandedInspectors[inspectorKey];
                                                    const empExtraRatioPct = emp.totalHours > 0
                                                        ? safeRound2((emp.totalOvertimeHours / emp.totalHours) * 100)
                                                        : 0;

                                                    return (
                                                        <div
                                                            key={inspectorKey}
                                                            className={`rounded-xl border transition-all overflow-hidden ${
                                                                emp.hasLftRisk
                                                                    ? 'bg-red-50/40 border-red-200'
                                                                    : 'bg-white border-slate-200/90'
                                                            }`}
                                                        >
                                                            {/* Fila Colapsada del Inspector (Nivel 2) con el mismo esquema alineado */}
                                                            <div
                                                                onClick={() => toggleInspector(inspectorKey)}
                                                                className="px-3.5 py-2 hover:bg-blue-50/30 cursor-pointer flex flex-col lg:flex-row lg:items-end justify-between gap-2 transition-colors"
                                                            >
                                                                {/* Izquierda: Nómina + Nombre arriba; Turno + Asistencia abajo alineado a la nómina */}
                                                                <div className="flex flex-col gap-1 min-w-0">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-slate-300 font-mono text-xs select-none">├─</span>
                                                                        <span className="font-mono font-bold text-[10px] px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                                                                            {emp.empNo}
                                                                        </span>
                                                                        <span className="text-xs font-bold text-slate-900 truncate">
                                                                            {emp.inspectorName}
                                                                        </span>
                                                                    </div>

                                                                    <div className="pl-5 flex items-center gap-2 text-[10px] text-slate-500 font-medium flex-wrap">
                                                                        <span className="bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-semibold">
                                                                            {emp.shift?.split(' ')[0]} {emp.shift?.split(' ')[1] || ''}
                                                                        </span>
                                                                        <span>•</span>
                                                                        <span className="font-mono">
                                                                            Días: <strong className="text-slate-700">{emp.daysWorked}/{emp.daysScheduled}</strong> ({emp.attendancePct}%)
                                                                        </span>
                                                                        {(emp.lateDays > 0 || emp.absentDays > 0) && (
                                                                            <>
                                                                                <span>•</span>
                                                                                <span className="text-amber-800 font-semibold">
                                                                                    {emp.lateDays} Ret / {emp.absentDays} Fal
                                                                                    {emp.totalLateMinutes > 0 ? ` (${emp.totalLateMinutes}m)` : ''}
                                                                                </span>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {/* Derecha: 4 Contenedores del mismo tamaño + Sobretiempo arriba de Total */}
                                                                <div className="flex items-end gap-2 ml-auto shrink-0 flex-wrap sm:flex-nowrap">
                                                                    {/* Botón Ficha individual */}
                                                                    <button
                                                                        type="button"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setSelectedEmployeeDetail(emp);
                                                                        }}
                                                                        title="Abrir ficha individual de horas e incidencias"
                                                                        className={`${UNIFORM_BOX_CLASS} bg-slate-100 hover:bg-blue-600 text-slate-700 hover:text-white border-slate-200 hover:border-blue-600 font-sans font-bold gap-1 transition-colors`}
                                                                    >
                                                                        <FileText className="w-3 h-3" /> Ver Ficha ({empExtraRatioPct.toFixed(0)}%)
                                                                    </button>

                                                                    {/* Ord (116px) */}
                                                                    <span className={`${UNIFORM_BOX_CLASS} bg-slate-50 text-slate-700 border-slate-200 font-semibold`}>
                                                                        Ord:&nbsp;<strong>{emp.totalRegularHours.toFixed(2)}h</strong>
                                                                    </span>

                                                                    {/* Ext (116px) */}
                                                                    <span
                                                                        className={`${UNIFORM_BOX_CLASS} ${
                                                                            emp.hasLftRisk
                                                                                ? 'bg-red-50 text-red-700 border-red-200 font-extrabold'
                                                                                : emp.totalOvertimeHours > 0
                                                                                ? 'bg-amber-50 text-amber-800 border-amber-200 font-bold'
                                                                                : 'bg-slate-50 text-slate-400 border-slate-200 font-semibold'
                                                                        }`}
                                                                    >
                                                                        Ext:&nbsp;<strong>+{emp.totalOvertimeHours.toFixed(2)}h</strong>
                                                                    </span>

                                                                    {/* Columna Total (116px) con Sobretiempo arriba de Total */}
                                                                    <div className="flex flex-col items-end gap-1 shrink-0">
                                                                        {emp.hasLftRisk && (
                                                                            <span className="w-[116px] h-5 inline-flex items-center justify-center text-center rounded-md text-[9px] font-extrabold bg-red-600 text-white shadow-sm whitespace-nowrap">
                                                                                ⚠️ SOBRETIEMPO ({emp.totalLftRiskCount})
                                                                            </span>
                                                                        )}
                                                                        <span className={`${UNIFORM_BOX_CLASS} bg-emerald-50 text-emerald-800 border-emerald-200 font-bold`}>
                                                                            Total:&nbsp;<strong>{emp.totalHours.toFixed(2)}h</strong>
                                                                        </span>
                                                                    </div>

                                                                    <button
                                                                        type="button"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            toggleInspector(inspectorKey);
                                                                        }}
                                                                        title={isInspectorOpen ? 'Ocultar desglose por fecha' : 'Desplegar desglose diario por fecha'}
                                                                        className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 transition-colors ${
                                                                            isInspectorOpen
                                                                                ? 'bg-blue-600 text-white border-blue-600'
                                                                                : 'bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-600 border-slate-200'
                                                                        }`}
                                                                    >
                                                                        {isInspectorOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            {/* ================================================================= */}
                                                            {/* NIVEL 3: HOJAS CON DESGLOSE DIARIO POR FECHA DEL INSPECTOR        */}
                                                            {/* ================================================================= */}
                                                            {isInspectorOpen && (
                                                                <div className="px-3.5 pb-2.5 pt-1.5 bg-slate-50/90 border-t border-slate-100">
                                                                    <div className="ml-4 pl-3 border-l-2 border-slate-300 space-y-1.5">
                                                                        {emp.sessions.map((session) => {
                                                                            const regHrs = safeRound2((session.regularMinutes || 0) / 60);
                                                                            const extHrs = safeRound2((session.overtimeMinutes || 0) / 60);
                                                                            const totHrs = safeRound2(regHrs + extHrs);
                                                                            const isSessionFatigueRisk =
                                                                                (session.overtimeHours || extHrs) > 3 ||
                                                                                (session.workedHoursDecimal || totHrs) > 12;

                                                                            return (
                                                                                <div
                                                                                    key={session.id}
                                                                                    className={`px-3 py-1.5 rounded-lg border text-[11px] flex flex-col lg:flex-row lg:items-end justify-between gap-2 ${
                                                                                        isSessionFatigueRisk
                                                                                            ? 'bg-red-50/80 border-red-200'
                                                                                            : 'bg-white border-slate-200/80'
                                                                                    }`}
                                                                                >
                                                                                    {/* Fecha, Turno y Trazabilidad de Checadas */}
                                                                                    <div className="flex items-center gap-2 flex-wrap">
                                                                                        <span className="text-slate-300 font-mono select-none">├─</span>
                                                                                        <span className="font-mono font-bold text-slate-800 inline-flex items-center gap-1">
                                                                                            <Calendar className="w-3 h-3 text-blue-600" />
                                                                                            {session.date}
                                                                                        </span>
                                                                                        <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                                                                            {session.shift}
                                                                                        </span>
                                                                                        <span className="font-mono text-[10px] text-slate-600">
                                                                                            🚌 Ruta: <strong>{session.transportCheckIn || '--:--'}</strong>
                                                                                        </span>
                                                                                        <span className="font-mono text-[10px] text-slate-700">
                                                                                            📲 QR: <strong>{session.plantQrScan || '--:--'}</strong> ➔ Salida: <strong>{session.departureTime || '--:--'}</strong>
                                                                                        </span>
                                                                                        {session.validatedBySupervisor ? (
                                                                                            <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-700">
                                                                                                <Lock className="w-3 h-3" /> Validado
                                                                                            </span>
                                                                                        ) : (
                                                                                            <span className="inline-flex items-center gap-0.5 text-[10px] text-slate-400">
                                                                                                <Clock className="w-3 h-3" /> Pendiente
                                                                                            </span>
                                                                                        )}
                                                                                    </div>

                                                                                    {/* Contenedores derechos del mismo tamaño forzado (116px) */}
                                                                                    <div className="flex items-end gap-2 ml-auto shrink-0 flex-wrap sm:flex-nowrap">
                                                                                        {/* Estatus (116px) */}
                                                                                        <span
                                                                                            className={`${UNIFORM_BOX_CLASS} font-sans font-bold ${
                                                                                                session.status === 'A tiempo'
                                                                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                                                                    : session.status === 'Retardo'
                                                                                                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                                                                                                    : 'bg-red-50 text-red-700 border-red-200'
                                                                                            }`}
                                                                                        >
                                                                                            {session.status}
                                                                                        </span>

                                                                                        {/* Ord (116px) */}
                                                                                        <span className={`${UNIFORM_BOX_CLASS} bg-slate-50 text-slate-700 border-slate-200 font-semibold`}>
                                                                                            Ord:&nbsp;<strong>{regHrs.toFixed(2)}h</strong>
                                                                                        </span>

                                                                                        {/* Ext (116px) */}
                                                                                        <span
                                                                                            className={`${UNIFORM_BOX_CLASS} ${
                                                                                                isSessionFatigueRisk
                                                                                                    ? 'bg-red-50 text-red-700 border-red-200 font-extrabold'
                                                                                                    : extHrs > 0
                                                                                                    ? 'bg-amber-50 text-amber-800 border-amber-200 font-bold'
                                                                                                    : 'bg-slate-50 text-slate-400 border-slate-200 font-semibold'
                                                                                            }`}
                                                                                        >
                                                                                            Ext:&nbsp;<strong>+{extHrs.toFixed(2)}h</strong>
                                                                                        </span>

                                                                                        {/* Total (116px) con Sobretiempo arriba de Total */}
                                                                                        <div className="flex flex-col items-end gap-1 shrink-0">
                                                                                            {isSessionFatigueRisk && (
                                                                                                <span className="w-[116px] h-5 inline-flex items-center justify-center text-center rounded-md text-[9px] font-extrabold bg-red-600 text-white shadow-sm whitespace-nowrap">
                                                                                                    ⚠️ SOBRETIEMPO
                                                                                                </span>
                                                                                            )}
                                                                                            <span className={`${UNIFORM_BOX_CLASS} bg-emerald-50 text-emerald-800 border-emerald-200 font-bold`}>
                                                                                                Total:&nbsp;<strong>{totHrs.toFixed(2)}h</strong>
                                                                                            </span>
                                                                                        </div>

                                                                                        {/* Espaciador de 28px (w-7) para alinear exactamente con la columna de botones chevron */}
                                                                                        <div className="w-7 h-7 shrink-0 hidden sm:block" />
                                                                                    </div>
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>

                {/* PIE DE CÉDULA CON TOTALES CONSOLIDADOS DE TIEMPO (SIN IMPORTE TOTAL) */}
                <div className="px-4 py-3 bg-slate-900 text-white border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                        <strong className="font-sans tracking-wide uppercase text-[11px] text-slate-200">
                            Totales Consolidados del Periodo:
                        </strong>
                        <span className="text-[11px] text-slate-400 font-sans">
                            {payrollTreeByPlant.length} plantas • {payrollByInspector.length} colaboradores
                        </span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap ml-auto">
                        <span className={`${UNIFORM_BOX_CLASS} bg-slate-800 text-slate-200 border-slate-700 font-bold`}>
                            {globalOvertimePct.toFixed(2)}% Extra
                        </span>
                        <span className={`${UNIFORM_BOX_CLASS} bg-slate-800 text-slate-200 border-slate-700`}>
                            Ord:&nbsp;<strong>{globalMetrics.totalRegularHours.toFixed(2)}h</strong>
                        </span>
                        <span className={`${UNIFORM_BOX_CLASS} bg-amber-500/20 text-amber-300 border-amber-400/30 font-bold`}>
                            Ext:&nbsp;<strong>+{globalMetrics.totalOvertimeHours.toFixed(2)}h</strong>
                        </span>
                        <span className={`${UNIFORM_BOX_CLASS} bg-emerald-600 text-white border-emerald-400 font-extrabold shadow-sm`}>
                            Total:&nbsp;<strong>{globalMetrics.totalPayrollHours.toFixed(2)}h</strong>
                        </span>
                        <div className="w-7 h-7 shrink-0 hidden sm:block" />
                    </div>
                </div>
            </div>
        </div>
    );
}
