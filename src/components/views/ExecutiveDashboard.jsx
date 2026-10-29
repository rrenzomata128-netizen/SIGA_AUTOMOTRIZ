import React, { useState, useMemo } from 'react';
import {
    AlertTriangle,
    Bus,
    Calculator,
    CheckCircle2,
    Clock,
    QrCode,
    TrendingUp,
    Users,
    ShieldAlert,
    UserCheck,
    Copy,
    Phone,
    MessageSquare,
    Filter,
    Lock,
    Activity,
    ChevronDown,
    ChevronUp
} from 'lucide-react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, LabelList, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

// Clasificador determinista idéntico al que ve el Supervisor en su pantalla
function classifySupervisorRecord(rec) {
    const isLocked = Boolean(rec.validatedBySupervisor);
    const hasExtendedRisk = rec.overtimeHours > 3 || rec.workedHoursDecimal > 12;

    if (isLocked) return 'LOCKED';
    if (!rec.departureTime && rec.status !== 'Falta') return 'ACTIVE_SHIFT';
    if (Boolean(rec.departureTime) && hasExtendedRisk) return 'PENDING_RISK';
    if (Boolean(rec.departureTime) && rec.status === 'A tiempo' && !hasExtendedRisk) return 'PENDING_OK';
    return 'PENDING_INCIDENT';
}

export default function ExecutiveDashboard({
    selectedChartType,
    setSelectedChartType,
    selectedShiftFilter,
    setSelectedShiftFilter,
    selectedPlantFilter = 'ALL',
    setSelectedPlantFilter,
    filteredRecords = [],
    globalMetrics,
    shiftStats,
    chartDataByDate,
    chartDataByPlant,
    pieDistributionData,
    plants = [],
    systemUsers = [],
    showToast,
}) {
    const [showOnlyPendingPlants, setShowOnlyPendingPlants] = useState(true);
    const [showOnlyTransitPlants, setShowOnlyTransitPlants] = useState(false);
    const [isTransitPanelExpanded, setIsTransitPanelExpanded] = useState(false);
    const [transitCategoryFilter, setTransitCategoryFilter] = useState('ALL');
    const [expandedTransitPlants, setExpandedTransitPlants] = useState({});
    const [expandedTransitInspectors, setExpandedTransitInspectors] = useState({});
    const [isSupPanelExpanded, setIsSupPanelExpanded] = useState(false);
    const [expandedSupSupervisors, setExpandedSupSupervisors] = useState({});
    const [expandedSupPlants, setExpandedSupPlants] = useState({});
    const [expandedSupInspectors, setExpandedSupInspectors] = useState({});
    const [isShiftPanelExpanded, setIsShiftPanelExpanded] = useState(false);
    const [isChartPanelExpanded, setIsChartPanelExpanded] = useState(false);
    const [supCategoryFilter, setSupCategoryFilter] = useState('ALL');
    const [showPhysicalHoursChart, setShowPhysicalHoursChart] = useState(false);
    const [physicalHoursGroupBy, setPhysicalHoursGroupBy] = useState('BY_PLANT'); // 'BY_PLANT' | 'BY_WORKER'

    const handleToggleTransitCategory = (category) => {
        if (transitCategoryFilter === category && isTransitPanelExpanded) {
            setTransitCategoryFilter('ALL');
            setIsTransitPanelExpanded(false);
        } else {
            setTransitCategoryFilter(category);
            setIsTransitPanelExpanded(true);
        }
    };

    const handleToggleSupCategory = (category) => {
        if (supCategoryFilter === category && isSupPanelExpanded) {
            setSupCategoryFilter('ALL');
            setIsSupPanelExpanded(false);
        } else {
            setSupCategoryFilter(category);
            setIsSupPanelExpanded(true);
        }
    };

    // 0. Datasets de Horas Físicas Reales en Planta (Entrada QR Planta -> Salida Física), ordenados de Mayor a Menor
    const { physicalHoursByPlant, physicalHoursByWorker } = useMemo(() => {
        const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
        const fmtHHMM = (mins) => {
            const safe = Math.max(0, Math.round(Number(mins) || 0));
            return `${Math.floor(safe / 60)}h ${String(safe % 60).padStart(2, '0')}m`;
        };

        const plantMap = {};
        const workerMap = {};

        filteredRecords.forEach(rec => {
            // Agrupación por Planta
            const pId = rec.plantId || 'SIN_PLANTA';
            if (!plantMap[pId]) {
                const plantObj = (plants || []).find(p => p.id === pId);
                plantMap[pId] = {
                    plantId: pId,
                    code: plantObj?.code || pId,
                    name: plantObj?.name || rec.plantName || 'Planta',
                    regMins: 0,
                    extMins: 0,
                    workedMins: 0,
                    physicalShifts: 0,
                    workerIds: new Set()
                };
            }
            const pItem = plantMap[pId];
            pItem.regMins += Number(rec.regularMinutes) || 0;
            pItem.extMins += Number(rec.overtimeMinutes) || 0;
            pItem.workedMins += Number(rec.workedMinutes) || 0;
            if ((Number(rec.workedMinutes) || 0) > 0) {
                pItem.physicalShifts += 1;
                if (rec.inspectorId) pItem.workerIds.add(rec.inspectorId);
            }

            // Agrupación por Trabajador / Inspector
            const wId = rec.inspectorId || rec.empNo || 'SIN_ID';
            if (!workerMap[wId]) {
                const firstName = (rec.inspectorName || 'Inspector').split(' ')[0];
                workerMap[wId] = {
                    inspectorId: wId,
                    empNo: rec.empNo || wId,
                    name: rec.inspectorName || 'Inspector',
                    shortLabel: `${rec.empNo || wId} ${firstName}`,
                    plantName: rec.plantName || '',
                    regMins: 0,
                    extMins: 0,
                    workedMins: 0,
                    physicalShifts: 0
                };
            }
            const wItem = workerMap[wId];
            wItem.regMins += Number(rec.regularMinutes) || 0;
            wItem.extMins += Number(rec.overtimeMinutes) || 0;
            wItem.workedMins += Number(rec.workedMinutes) || 0;
            if ((Number(rec.workedMinutes) || 0) > 0) {
                wItem.physicalShifts += 1;
            }
        });

        const byPlant = Object.values(plantMap)
            .map(p => {
                const horasOrdinarias = round2(p.regMins / 60);
                const horasExtra = round2(p.extMins / 60);
                const horasFisicas = round2(horasOrdinarias + horasExtra);
                return {
                    code: p.code,
                    name: p.name,
                    horasFisicas,
                    horasOrdinarias,
                    horasExtra,
                    workedMins: p.workedMins,
                    tiempoFormateado: fmtHHMM(p.workedMins),
                    turnosFisicos: p.physicalShifts,
                    trabajadoresActivos: p.workerIds.size
                };
            })
            .sort((a, b) => (b.horasFisicas - a.horasFisicas) || (b.workedMins - a.workedMins) || a.code.localeCompare(b.code));

        const byWorker = Object.values(workerMap)
            .map(w => {
                const horasOrdinarias = round2(w.regMins / 60);
                const horasExtra = round2(w.extMins / 60);
                const horasFisicas = round2(horasOrdinarias + horasExtra);
                return {
                    empNo: w.empNo,
                    name: w.name,
                    shortLabel: w.shortLabel,
                    plantName: w.plantName,
                    horasFisicas,
                    horasOrdinarias,
                    horasExtra,
                    workedMins: w.workedMins,
                    tiempoFormateado: fmtHHMM(w.workedMins),
                    turnosFisicos: w.physicalShifts
                };
            })
            .sort((a, b) => (b.horasFisicas - a.horasFisicas) || (b.workedMins - a.workedMins) || a.empNo.localeCompare(b.empNo));

        return { physicalHoursByPlant: byPlant, physicalHoursByWorker: byWorker };
    }, [filteredRecords, plants]);

    // 1. Resumen global y desglose en Árbol: Nivel 1 (Supervisor) -> Nivel 2 (Planta) -> Nivel 3 (Inspector)
    const supervisorClosureAudit = useMemo(() => {
        const totals = {
            total: filteredRecords.length,
            LOCKED: 0,
            PENDING_OK: 0,
            PENDING_RISK: 0,
            PENDING_INCIDENT: 0,
            ACTIVE_SHIFT: 0
        };

        const byPlantMap = {};

        // Pre-indexar supervisores activos por planta
        const activeSupervisors = (systemUsers || []).filter(
            u => (u.systemRole || u.system_role) === 'SUPERVISOR' && u.active !== false
        );

        filteredRecords.forEach(rec => {
            const cat = classifySupervisorRecord(rec);
            totals[cat] += 1;

            const pId = rec.plantId || 'SIN_PLANTA';
            if (!byPlantMap[pId]) {
                const plantObj = (plants || []).find(p => p.id === pId);
                const matchedSups = activeSupervisors.filter(u =>
                    (Array.isArray(u.plantIds) && u.plantIds.includes(pId)) || u.plantId === pId
                );

                byPlantMap[pId] = {
                    plantId: pId,
                    plantCode: plantObj?.code || pId,
                    plantName: plantObj?.name || rec.plantName || 'Planta',
                    fallbackSupervisorName: plantObj?.supervisor || 'Sin supervisor asignado',
                    supervisors: matchedSups,
                    total: 0,
                    LOCKED: 0,
                    PENDING_OK: 0,
                    PENDING_RISK: 0,
                    PENDING_INCIDENT: 0,
                    ACTIVE_SHIFT: 0,
                    pendingInspectorItems: [],
                    inspectorsMap: {}
                };
            }

            const group = byPlantMap[pId];
            group.total += 1;
            group[cat] += 1;

            const tagLabel =
                cat === 'LOCKED' ? '🔒 Cerrado' :
                cat === 'PENDING_RISK' ? `Riesgo +${rec.overtimeHours}h` :
                cat === 'PENDING_INCIDENT' ? rec.status :
                cat === 'PENDING_OK' ? 'OK sin cerrar' : 'En turno';

            if (cat !== 'LOCKED') {
                group.pendingInspectorItems.push({
                    id: rec.id,
                    empNo: rec.empNo,
                    name: rec.inspectorName,
                    date: rec.date,
                    category: cat,
                    tagLabel
                });
            }

            // Agrupar dentro de la planta por Inspector (Nivel 3 del árbol)
            const inspKey = rec.inspectorId || rec.empNo || 'SIN_ID';
            if (!group.inspectorsMap[inspKey]) {
                group.inspectorsMap[inspKey] = {
                    inspectorKey: inspKey,
                    empNo: rec.empNo || inspKey,
                    name: rec.inspectorName || 'Inspector',
                    total: 0,
                    LOCKED: 0,
                    PENDING_OK: 0,
                    PENDING_RISK: 0,
                    PENDING_INCIDENT: 0,
                    ACTIVE_SHIFT: 0,
                    recordsByDate: []
                };
            }

            const inspGroup = group.inspectorsMap[inspKey];
            inspGroup.total += 1;
            inspGroup[cat] += 1;
            inspGroup.recordsByDate.push({
                id: rec.id,
                date: rec.date,
                shift: rec.shift || 'Turno regular',
                plantQrScan: rec.plantQrScan || '--:--',
                departureTime: rec.departureTime || '--:--',
                status: rec.status,
                category: cat,
                tagLabel
            });
        });

        const plantRows = Object.values(byPlantMap).map(row => {
            const actionablePending = row.PENDING_OK + row.PENDING_RISK + row.PENDING_INCIDENT;
            const totalUnclosed = actionablePending + row.ACTIVE_SHIFT;
            const completionPct = row.total > 0 ? Math.round((row.LOCKED / row.total) * 100) : 100;

            const primarySup = row.supervisors[0] || null;
            const supervisorDisplayName = row.supervisors.length > 0
                ? row.supervisors.map(s => s.name).join(' / ')
                : row.fallbackSupervisorName;
            const supervisorEmpNo = primarySup?.empNo || null;
            const supervisorPhone = primarySup?.phone || '';

            const inspectorsList = Object.values(row.inspectorsMap).map(insp => {
                const inspActionable = insp.PENDING_OK + insp.PENDING_RISK + insp.PENDING_INCIDENT;
                const inspUnclosed = inspActionable + insp.ACTIVE_SHIFT;
                const sortedDates = [...insp.recordsByDate].sort((a, b) =>
                    b.date.localeCompare(a.date) || String(b.id).localeCompare(String(a.id))
                );
                return {
                    ...insp,
                    actionablePending: inspActionable,
                    totalUnclosed: inspUnclosed,
                    recordsByDate: sortedDates
                };
            });

            inspectorsList.sort((a, b) =>
                (b.PENDING_RISK - a.PENDING_RISK) ||
                (b.actionablePending - a.actionablePending) ||
                (b.ACTIVE_SHIFT - a.ACTIVE_SHIFT) ||
                a.empNo.localeCompare(b.empNo)
            );

            return {
                ...row,
                actionablePending,
                totalUnclosed,
                completionPct,
                supervisorDisplayName,
                supervisorEmpNo,
                supervisorPhone,
                inspectors: inspectorsList
            };
        });

        // Ordenar plantas por urgencia
        plantRows.sort((a, b) =>
            (b.PENDING_RISK - a.PENDING_RISK) ||
            (b.actionablePending - a.actionablePending) ||
            (b.ACTIVE_SHIFT - a.ACTIVE_SHIFT) ||
            a.plantCode.localeCompare(b.plantCode)
        );

        // Agrupar plantas por Supervisor (Nivel 1 del árbol)
        const bySupervisorMap = {};
        plantRows.forEach(pRow => {
            const supKey = pRow.supervisorEmpNo || pRow.supervisorDisplayName || 'SIN_SUPERVISOR';
            if (!bySupervisorMap[supKey]) {
                bySupervisorMap[supKey] = {
                    supervisorKey: supKey,
                    supervisorEmpNo: pRow.supervisorEmpNo || 'SUP',
                    supervisorDisplayName: pRow.supervisorDisplayName,
                    supervisorPhone: pRow.supervisorPhone,
                    total: 0,
                    LOCKED: 0,
                    PENDING_OK: 0,
                    PENDING_RISK: 0,
                    PENDING_INCIDENT: 0,
                    ACTIVE_SHIFT: 0,
                    pendingInspectorItems: [],
                    plants: []
                };
            }
            const sGroup = bySupervisorMap[supKey];
            sGroup.total += pRow.total;
            sGroup.LOCKED += pRow.LOCKED;
            sGroup.PENDING_OK += pRow.PENDING_OK;
            sGroup.PENDING_RISK += pRow.PENDING_RISK;
            sGroup.PENDING_INCIDENT += pRow.PENDING_INCIDENT;
            sGroup.ACTIVE_SHIFT += pRow.ACTIVE_SHIFT;
            sGroup.pendingInspectorItems.push(...pRow.pendingInspectorItems);
            sGroup.plants.push(pRow);
        });

        const supervisorRows = Object.values(bySupervisorMap).map(sup => {
            const actionablePending = sup.PENDING_OK + sup.PENDING_RISK + sup.PENDING_INCIDENT;
            const totalUnclosed = actionablePending + sup.ACTIVE_SHIFT;
            const completionPct = sup.total > 0 ? Math.round((sup.LOCKED / sup.total) * 100) : 100;
            const plantCodeSummary = sup.plants.map(p => p.plantCode).join(', ');
            const plantNameSummary = sup.plants.map(p => p.plantName).join(', ');
            return {
                ...sup,
                actionablePending,
                totalUnclosed,
                completionPct,
                plantCode: plantCodeSummary,
                plantName: plantNameSummary
            };
        });

        supervisorRows.sort((a, b) =>
            (b.PENDING_RISK - a.PENDING_RISK) ||
            (b.actionablePending - a.actionablePending) ||
            (b.ACTIVE_SHIFT - a.ACTIVE_SHIFT) ||
            a.supervisorDisplayName.localeCompare(b.supervisorDisplayName)
        );

        const actionableGlobalPending = totals.PENDING_OK + totals.PENDING_RISK + totals.PENDING_INCIDENT;
        const globalCompletionPct = totals.total > 0 ? Math.round((totals.LOCKED / totals.total) * 100) : 100;

        return {
            totals,
            actionableGlobalPending,
            globalCompletionPct,
            plantRows,
            supervisorRows
        };
    }, [filteredRecords, plants, systemUsers]);

    const buildSupervisorReminderText = (row) => {
        const parts = [];
        if (row.PENDING_OK > 0) parts.push(`${row.PENDING_OK} turno(s) OK listos para cierre rápido`);
        if (row.PENDING_RISK > 0) parts.push(`${row.PENDING_RISK} con alerta de sobretiempo/fatiga por justificar`);
        if (row.PENDING_INCIDENT > 0) parts.push(`${row.PENDING_INCIDENT} incidencia(s) (Retardo/Falta) sin confirmar`);
        if (row.ACTIVE_SHIFT > 0) parts.push(`${row.ACTIVE_SHIFT} en turno activo (sin salida)`);

        const sampleEmployees = row.pendingInspectorItems
            .slice(0, 4)
            .map(i => `${i.empNo} (${i.name} - ${i.tagLabel})`)
            .join(', ');
        const moreCount = row.pendingInspectorItems.length > 4 ? ` y ${row.pendingInspectorItems.length - 4} más` : '';

        return `Hola ${row.supervisorDisplayName}, te contacto de RH respecto a ${row.plantCode} - ${row.plantName}: tienes ${row.totalUnclosed} registro(s) pendientes de cierre en SIGA (${parts.join(', ')}). Detalle: ${sampleEmployees}${moreCount}. ¿Nos apoyas validándolos para liberar prenómina?`;
    };

    const handleCopyReminder = (row) => {
        const msg = buildSupervisorReminderText(row);
        navigator.clipboard.writeText(msg);
        if (showToast) {
            showToast(`📋 Recordatorio copiado para ${row.supervisorDisplayName} (${row.plantCode})`);
        }
    };

    const handleWhatsAppReminder = (row) => {
        const msg = buildSupervisorReminderText(row);
        const cleanDigits = String(row.supervisorPhone || '').replace(/\D/g, '');
        if (cleanDigits.length >= 10) {
            const phoneWithCountry = cleanDigits.length === 10 ? `52${cleanDigits}` : cleanDigits;
            window.open(`https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer');
        } else {
            navigator.clipboard.writeText(msg);
            if (showToast) {
                showToast(`El supervisor no tiene teléfono registrado; se copió el mensaje al portapapeles`, 'warning');
            }
        }
    };

    const visiblePlantAuditRows = useMemo(() => {
        if (supCategoryFilter !== 'ALL') {
            return supervisorClosureAudit.plantRows.filter(r => (r[supCategoryFilter] || 0) > 0);
        }
        return showOnlyPendingPlants
            ? supervisorClosureAudit.plantRows.filter(r => r.totalUnclosed > 0)
            : supervisorClosureAudit.plantRows;
    }, [supervisorClosureAudit.plantRows, supCategoryFilter, showOnlyPendingPlants]);

    const visibleSupervisorAuditRows = useMemo(() => {
        if (supCategoryFilter !== 'ALL') {
            return supervisorClosureAudit.supervisorRows.filter(s => (s[supCategoryFilter] || 0) > 0);
        }
        return showOnlyPendingPlants
            ? supervisorClosureAudit.supervisorRows.filter(s => s.totalUnclosed > 0)
            : supervisorClosureAudit.supervisorRows;
    }, [supervisorClosureAudit.supervisorRows, supCategoryFilter, showOnlyPendingPlants]);

    const supervisorsWithPendingCount = supervisorClosureAudit.supervisorRows.filter(s => s.totalUnclosed > 0).length;

    const toggleSupSupervisor = (supKey) => {
        setExpandedSupSupervisors(prev => ({
            ...prev,
            [supKey]: !prev[supKey]
        }));
    };

    const toggleSupPlant = (supKey, plantId) => {
        const compositeKey = `${supKey}__${plantId}`;
        setExpandedSupPlants(prev => ({
            ...prev,
            [compositeKey]: !prev[compositeKey]
        }));
    };

    const toggleSupInspector = (supKey, plantId, inspKey) => {
        const compositeKey = `${supKey}__${plantId}__${inspKey}`;
        setExpandedSupInspectors(prev => ({
            ...prev,
            [compositeKey]: !prev[compositeKey]
        }));
    };

    // 1.B Monitoreo en Vivo de Personal en Trayecto por Planta -> Inspector -> Fecha (Estructura Tipo Árbol)
    const transitAudit = useMemo(() => {
        const totals = {
            total: filteredRecords.length,
            IN_TRANSIT: 0, // En Ruta (Confirmó transporte, aún no firma QR)
            ARRIVED_QR: 0, // Firmaron QR (Llegaron a planta)
            ABSENT: 0      // Falta(s) (Falta o sin abordaje ni QR)
        };

        const byPlantMap = {};

        filteredRecords.forEach(rec => {
            const hasTransport = Boolean(rec.transportCheckIn);
            const hasQr = Boolean(rec.plantQrScan);
            const isAbsent = rec.status === 'Falta';

            let cat = 'ABSENT';
            if (isAbsent) {
                cat = 'ABSENT';
            } else if (hasQr) {
                cat = 'ARRIVED_QR';
            } else if (hasTransport) {
                cat = 'IN_TRANSIT';
            }

            totals[cat] += 1;

            const pId = rec.plantId || 'SIN_PLANTA';
            if (!byPlantMap[pId]) {
                const plantObj = (plants || []).find(p => p.id === pId || p.code === pId);
                byPlantMap[pId] = {
                    plantId: pId,
                    plantCode: plantObj?.code || pId,
                    plantName: plantObj?.name || rec.plantName || 'Planta',
                    total: 0,
                    IN_TRANSIT: 0,
                    ARRIVED_QR: 0,
                    ABSENT: 0,
                    inspectorsMap: {}
                };
            }

            const group = byPlantMap[pId];
            group.total += 1;
            group[cat] += 1;

            const inspKey = rec.inspectorId || rec.empNo || 'SIN_ID';
            if (!group.inspectorsMap[inspKey]) {
                group.inspectorsMap[inspKey] = {
                    inspectorKey: inspKey,
                    empNo: rec.empNo || inspKey,
                    name: rec.inspectorName || 'Inspector',
                    total: 0,
                    IN_TRANSIT: 0,
                    ARRIVED_QR: 0,
                    ABSENT: 0,
                    recordsByDate: []
                };
            }

            const inspGroup = group.inspectorsMap[inspKey];
            inspGroup.total += 1;
            inspGroup[cat] += 1;

            const statusBadge =
                cat === 'IN_TRANSIT' ? `🚌 En Ruta (${rec.transportCheckIn})` :
                    cat === 'ARRIVED_QR' ? `📲 Firmó QR (${rec.plantQrScan})` :
                        '⚠️ Falta';

            inspGroup.recordsByDate.push({
                id: rec.id,
                date: rec.date,
                shift: rec.shift || 'Turno regular',
                transportCheckIn: rec.transportCheckIn || '--:--',
                plantQrScan: rec.plantQrScan || '--:--',
                category: cat,
                statusBadge
            });
        });

        const plantRows = Object.values(byPlantMap).map(plantGroup => {
            const inspectorsList = Object.values(plantGroup.inspectorsMap).map(insp => {
                // Ordenar las fechas del inspector de la más reciente a la más antigua
                const sortedDates = [...insp.recordsByDate].sort((a, b) =>
                    b.date.localeCompare(a.date) || String(b.id).localeCompare(String(a.id))
                );
                return {
                    ...insp,
                    recordsByDate: sortedDates
                };
            });

            // Ordenar inspectores: 1) En Ruta, 2) Con Faltas, 3) Mayor número de QR firmados
            inspectorsList.sort((a, b) =>
                (b.IN_TRANSIT - a.IN_TRANSIT) ||
                (b.ABSENT - a.ABSENT) ||
                (b.ARRIVED_QR - a.ARRIVED_QR) ||
                a.empNo.localeCompare(b.empNo)
            );

            return {
                plantId: plantGroup.plantId,
                plantCode: plantGroup.plantCode,
                plantName: plantGroup.plantName,
                total: plantGroup.total,
                IN_TRANSIT: plantGroup.IN_TRANSIT,
                ARRIVED_QR: plantGroup.ARRIVED_QR,
                ABSENT: plantGroup.ABSENT,
                inspectors: inspectorsList
            };
        });

        // Ordenar plantas: 1) Plantas con personal en ruta, 2) Plantas con faltas, 3) Mayor cantidad que firmaron QR
        plantRows.sort((a, b) =>
            (b.IN_TRANSIT - a.IN_TRANSIT) ||
            (b.ABSENT - a.ABSENT) ||
            (b.ARRIVED_QR - a.ARRIVED_QR) ||
            a.plantCode.localeCompare(b.plantCode)
        );

        const plantsWithTransitCount = plantRows.filter(r => r.IN_TRANSIT > 0).length;

        return {
            totals,
            plantsWithTransitCount,
            plantRows
        };
    }, [filteredRecords, plants]);

    const toggleTransitPlant = (plantId) => {
        setExpandedTransitPlants(prev => ({
            ...prev,
            [plantId]: !prev[plantId]
        }));
    };

    const toggleTransitInspector = (plantId, inspectorKey) => {
        const compositeKey = `${plantId}__${inspectorKey}`;
        setExpandedTransitInspectors(prev => ({
            ...prev,
            [compositeKey]: !prev[compositeKey]
        }));
    };

    const visibleTransitPlantRows = useMemo(() => {
        if (transitCategoryFilter !== 'ALL') {
            return transitAudit.plantRows.filter(r => (r[transitCategoryFilter] || 0) > 0);
        }
        return transitAudit.plantRows;
    }, [transitAudit.plantRows, transitCategoryFilter]);

    return (
        <div className="space-y-5">
            {/* 6 TARJETAS KPI GLOBALES */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3.5">
                <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-sm">
                    <div className="flex justify-between items-start">
                        <p className="text-[11px] uppercase text-slate-500 font-bold">Asistencia Efectiva</p>
                        <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600"><Users className="w-4 h-4" /></div>
                    </div>
                    <h3 className="text-2xl font-extrabold text-slate-900 mt-2">
                        {globalMetrics.presentCount} <span className="text-xs font-normal text-slate-400">/ {globalMetrics.totalRecords}</span>
                    </h3>
                    <p className="text-[11px] text-blue-600 mt-1 font-semibold">
                        {globalMetrics.attendanceRatePct}% tasa asistencia
                    </p>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-sm">
                    <div className="flex justify-between items-start">
                        <p className="text-[11px] uppercase text-slate-500 font-bold">A Tiempo (OK)</p>
                        <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600"><CheckCircle2 className="w-4 h-4" /></div>
                    </div>
                    <h3 className="text-2xl font-extrabold text-emerald-600 mt-2">{globalMetrics.onTimeCount}</h3>
                    <p className="text-[11px] text-slate-500 mt-1">
                        {globalMetrics.punctualityRatePct}% del programado
                    </p>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-sm">
                    <div className="flex justify-between items-start">
                        <p className="text-[11px] uppercase text-slate-500 font-bold">Retardos</p>
                        <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600"><Clock className="w-4 h-4" /></div>
                    </div>
                    <h3 className="text-2xl font-extrabold text-amber-600 mt-2">{globalMetrics.lateCount}</h3>
                    <p className="text-[11px] text-amber-700 mt-1 font-medium">
                        {globalMetrics.lateRatePct}% • {globalMetrics.totalLateMinutes} min acum.
                    </p>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-sm">
                    <div className="flex justify-between items-start">
                        <p className="text-[11px] uppercase text-slate-500 font-bold">Faltas (Ausencias)</p>
                        <div className="p-1.5 rounded-lg bg-red-50 text-red-600"><AlertTriangle className="w-4 h-4" /></div>
                    </div>
                    <h3 className="text-2xl font-extrabold text-red-600 mt-2">{globalMetrics.absentCount}</h3>
                    <p className="text-[11px] text-red-600 mt-1 font-semibold">
                        {globalMetrics.absenteeismRatePct}% ausentismo
                    </p>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-sm">
                    <div className="flex justify-between items-start">
                        <p className="text-[11px] uppercase text-slate-500 font-bold">Total Hrs Nómina</p>
                        <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600"><Calculator className="w-4 h-4" /></div>
                    </div>
                    <h3 className="text-2xl font-extrabold text-slate-900 mt-2">{globalMetrics.totalPayrollHours}h</h3>
                    <p className="text-[11px] text-slate-500 mt-1">
                        Ord: {globalMetrics.totalRegularHours}h | Ext: {globalMetrics.totalOvertimeHours}h
                    </p>
                </div>

                <div
                    onClick={() => setIsSupPanelExpanded(prev => !prev)}
                    title="Clic para mostrar/ocultar el detalle de cierres por supervisor"
                    className={`rounded-2xl border p-4 shadow-sm cursor-pointer transition-all ${supervisorClosureAudit.actionableGlobalPending > 0
                        ? 'bg-amber-50/40 border-amber-300 hover:border-amber-400'
                        : 'bg-white border-slate-200/90 hover:border-blue-300'
                        }`}
                >
                    <div className="flex justify-between items-start">
                        <p className="text-[11px] uppercase text-slate-500 font-bold">QR Planta Validado</p>
                        <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600"><QrCode className="w-4 h-4" /></div>
                    </div>
                    <h3 className="text-2xl font-extrabold text-blue-600 mt-2">{globalMetrics.qrVerifiedCount}</h3>
                    <p className={`text-[11px] mt-1 font-bold ${supervisorClosureAudit.actionableGlobalPending > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                        Sup. Cerrados: {globalMetrics.supervisorValidatedCount}/{globalMetrics.totalRecords}
                    </p>
                </div>
            </div>

            {/* BARRA EJECUTIVA DE 1 LÍNEA (REVELACIÓN PROGRESIVA) — MONITOREO DE PERSONAL EN TRAYECTO POR PLANTA */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
                <div className={`px-4 py-2.5 bg-slate-50/80 flex items-center justify-between gap-2 ${isTransitPanelExpanded ? 'border-b border-slate-200/80' : ''}`}>
                    <div
                        onClick={() => setIsTransitPanelExpanded(prev => !prev)}
                        className="flex items-center gap-2 cursor-pointer select-none shrink-0"
                    >
                        <div className={`p-1.5 rounded-lg border shrink-0 ${transitAudit.totals.IN_TRANSIT > 0
                            ? 'bg-blue-50 border-blue-200 text-blue-600'
                            : 'bg-emerald-50 border-emerald-200 text-emerald-600'
                            }`}>
                            <Bus className="w-4 h-4" />
                        </div>
                        <h3 className="text-xs sm:text-sm font-bold text-slate-900 whitespace-nowrap">
                            Personal en Trayecto
                        </h3>
                    </div>

                    {/* 3 Píldoras exactas de tamaño fijo: En Ruta, Firmaron QR y Falta(s) + botón icono */}
                    <div className="flex items-center gap-1.5 shrink-0">
                        <button
                            type="button"
                            onClick={() => handleToggleTransitCategory('IN_TRANSIT')}
                            title="Filtrar personal que va En Ruta hacia planta"
                            className={`w-[118px] h-7 inline-flex items-center justify-center text-center gap-1 text-[11px] font-bold rounded-lg border transition-all cursor-pointer active:scale-95 whitespace-nowrap shrink-0 ${transitCategoryFilter === 'IN_TRANSIT' && isTransitPanelExpanded
                                ? 'bg-blue-600 text-white border-blue-700 shadow-sm ring-2 ring-blue-500/30'
                                : transitAudit.totals.IN_TRANSIT > 0
                                    ? 'bg-blue-100 hover:bg-blue-200/80 text-blue-900 border-blue-300'
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-500 border-slate-200'
                                }`}
                        >
                            🚌 {transitAudit.totals.IN_TRANSIT} En Ruta
                            {transitCategoryFilter === 'IN_TRANSIT' && isTransitPanelExpanded && <span className="ml-0.5 text-[10px] opacity-90">✕</span>}
                        </button>

                        <button
                            type="button"
                            onClick={() => handleToggleTransitCategory('ARRIVED_QR')}
                            title="Filtrar personal que ya firmó QR en planta"
                            className={`w-[118px] h-7 inline-flex items-center justify-center text-center gap-1 text-[11px] font-bold rounded-lg border transition-all cursor-pointer active:scale-95 whitespace-nowrap shrink-0 ${transitCategoryFilter === 'ARRIVED_QR' && isTransitPanelExpanded
                                ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm ring-2 ring-emerald-500/30'
                                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
                                }`}
                        >
                            📲 {transitAudit.totals.ARRIVED_QR} Firmaron QR
                            {transitCategoryFilter === 'ARRIVED_QR' && isTransitPanelExpanded && <span className="ml-0.5 text-[10px] opacity-90">✕</span>}
                        </button>

                        <button
                            type="button"
                            onClick={() => handleToggleTransitCategory('ABSENT')}
                            title="Filtrar Falta(s)"
                            className={`w-[118px] h-7 inline-flex items-center justify-center text-center gap-1 text-[11px] font-bold rounded-lg border transition-all cursor-pointer active:scale-95 whitespace-nowrap shrink-0 ${transitCategoryFilter === 'ABSENT' && isTransitPanelExpanded
                                ? 'bg-red-600 text-white border-red-700 shadow-sm ring-2 ring-red-500/30'
                                : transitAudit.totals.ABSENT > 0
                                    ? 'bg-red-50 hover:bg-red-100 text-red-800 border-red-200'
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-500 border-slate-200'
                                }`}
                        >
                            ⚠️ {transitAudit.totals.ABSENT} Falta(s)
                            {transitCategoryFilter === 'ABSENT' && isTransitPanelExpanded && <span className="ml-0.5 text-[10px] opacity-90">✕</span>}
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                if (isTransitPanelExpanded) {
                                    setIsTransitPanelExpanded(false);
                                    setTransitCategoryFilter('ALL');
                                } else {
                                    setIsTransitPanelExpanded(true);
                                }
                            }}
                            title={isTransitPanelExpanded ? 'Ocultar personal en trayecto' : 'Mostrar personal en trayecto'}
                            className="w-7 h-7 inline-flex items-center justify-center rounded-lg bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 transition-all cursor-pointer shrink-0"
                        >
                            {isTransitPanelExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                    </div>
                </div>

                {isTransitPanelExpanded && (
                    <div className="p-4 space-y-3">
                        {transitCategoryFilter !== 'ALL' && (
                            <div className="flex items-center justify-between gap-2 pb-1">
                                <button
                                    type="button"
                                    onClick={() => setTransitCategoryFilter('ALL')}
                                    className="px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition-all cursor-pointer"
                                >
                                    Mostrando filtro ({visibleTransitPlantRows.length} planta{visibleTransitPlantRows.length === 1 ? '' : 's'}) • Quitar filtro ✕
                                </button>
                            </div>
                        )}

                        {visibleTransitPlantRows.length === 0 ? (
                            <div className="bg-blue-50/50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
                                <Bus className="w-5 h-5 text-blue-600 shrink-0" />
                                <div>
                                    <p className="text-xs font-bold text-slate-900">
                                        En este momento no hay inspectores en ruta bajo el filtro seleccionado.
                                    </p>
                                    <p className="text-[11px] text-slate-600">
                                        Cuando un inspector confirme su abordaje en la App Móvil, aparecerá aquí en tiempo real rumbo a su planta destino.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            /* ESTRUCTURA TIPO ÁRBOL DE 3 NIVELES: NIVEL 1 (PLANTA) -> NIVEL 2 (INSPECTOR) -> NIVEL 3 (FECHAS) */
                            <div className="space-y-2">
                                {visibleTransitPlantRows.map(row => {
                                    const isPlantOpen = Boolean(expandedTransitPlants[row.plantId]);
                                    const filteredInspectors = transitCategoryFilter === 'ALL'
                                        ? row.inspectors
                                        : row.inspectors.filter(insp => (insp[transitCategoryFilter] || 0) > 0);

                                    return (
                                        <div
                                            key={row.plantId}
                                            className={`rounded-xl border transition-all overflow-hidden ${row.IN_TRANSIT > 0
                                                ? 'bg-blue-50/20 border-blue-300'
                                                : row.ABSENT > 0
                                                    ? 'bg-red-50/10 border-red-200/90'
                                                    : 'bg-slate-50/60 border-slate-200'
                                                }`}
                                        >
                                            {/* NIVEL 1 DEL ÁRBOL: LÍNEA COLAPSADA POR PLANTA (ALINEACIÓN UNIFORME EN COLUMNAS FIJAS) */}
                                            <div
                                                onClick={() => toggleTransitPlant(row.plantId)}
                                                className={`px-3.5 py-2.5 flex items-center justify-between gap-2 cursor-pointer select-none hover:bg-slate-100/70 transition-colors ${isPlantOpen ? 'border-b border-slate-200/80 bg-white/80' : ''}`}
                                            >
                                                {/* Izquierda: Etiqueta negra de código con ancho fijo (86px) + Nombre de Planta alineado */}
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <span className="w-[86px] h-6 inline-flex items-center justify-center text-center font-mono text-xs font-extrabold rounded bg-slate-900 text-white shrink-0">
                                                        {row.plantCode}
                                                    </span>
                                                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                                                        {row.plantName}
                                                    </h4>
                                                </div>

                                                {/* Derecha: 3 Columnas de Tamaño Fijo Forzado + Botón Ver/Ocultar Inspectores */}
                                                <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                                                    <span className={`w-[118px] h-7 inline-flex items-center justify-center text-center gap-1 text-[11px] font-bold rounded-lg border whitespace-nowrap shrink-0 ${row.IN_TRANSIT > 0
                                                        ? 'bg-blue-100 text-blue-900 border-blue-300'
                                                        : 'bg-white text-slate-400 border-slate-200'
                                                        }`}>
                                                        🚌 {row.IN_TRANSIT} En Ruta
                                                    </span>
                                                    <span className={`w-[118px] h-7 inline-flex items-center justify-center text-center gap-1 text-[11px] font-bold rounded-lg border whitespace-nowrap shrink-0 ${row.ARRIVED_QR > 0
                                                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                                        : 'bg-white text-slate-400 border-slate-200'
                                                        }`}>
                                                        📲 {row.ARRIVED_QR} Firmaron QR
                                                    </span>
                                                    <span className={`w-[118px] h-7 inline-flex items-center justify-center text-center gap-1 text-[11px] font-bold rounded-lg border whitespace-nowrap shrink-0 ${row.ABSENT > 0
                                                        ? 'bg-red-50 text-red-700 border-red-200'
                                                        : 'bg-white text-slate-400 border-slate-200'
                                                        }`}>
                                                        ⚠️ {row.ABSENT} Falta(s)
                                                    </span>

                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            toggleTransitPlant(row.plantId);
                                                        }}
                                                        title={isPlantOpen ? `Ocultar inspectores de ${row.plantCode}` : `Ver inspectores de ${row.plantCode}`}
                                                        className="w-7 h-7 inline-flex items-center justify-center rounded-lg bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 transition-all cursor-pointer shrink-0"
                                                    >
                                                        {isPlantOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                                    </button>
                                                </div>
                                            </div>

                                            {/* NIVEL 2 DEL ÁRBOL: RAMA DE INSPECTORES DE LA PLANTA */}
                                            {isPlantOpen && (
                                                <div className="p-3 bg-white/90">
                                                    <div className="ml-3 pl-3.5 border-l-2 border-slate-300 space-y-2">
                                                        {filteredInspectors.map((insp, idx) => {
                                                            const compositeKey = `${row.plantId}__${insp.inspectorKey}`;
                                                            const isInspOpen = Boolean(expandedTransitInspectors[compositeKey]);
                                                            const isLastInsp = idx === filteredInspectors.length - 1;
                                                            const visibleDates = transitCategoryFilter === 'ALL'
                                                                ? insp.recordsByDate
                                                                : insp.recordsByDate.filter(d => d.category === transitCategoryFilter);

                                                            return (
                                                                <div
                                                                    key={insp.inspectorKey}
                                                                    className="rounded-xl border border-slate-200/90 bg-slate-50/70 overflow-hidden"
                                                                >
                                                                    {/* Línea colapsada del Inspector (Columnas alineadas con Nivel 1) */}
                                                                    <div
                                                                        onClick={() => toggleTransitInspector(row.plantId, insp.inspectorKey)}
                                                                        className={`px-3 py-2 flex items-center justify-between gap-2 cursor-pointer select-none hover:bg-slate-100/80 transition-colors ${isInspOpen ? 'border-b border-slate-200/80 bg-white' : ''}`}
                                                                    >
                                                                        <div className="flex items-center gap-2 min-w-0">
                                                                            <span className="font-mono text-xs text-slate-400 font-bold shrink-0">
                                                                                {isLastInsp ? '└─' : '├─'}
                                                                            </span>
                                                                            <span className="w-[78px] h-6 inline-flex items-center justify-center text-center font-mono text-[11px] font-extrabold rounded bg-indigo-100 text-indigo-900 border border-indigo-200 shrink-0">
                                                                                {insp.empNo}
                                                                            </span>
                                                                            <span className="text-xs font-bold text-slate-900 truncate">
                                                                                {insp.name}
                                                                            </span>
                                                                        </div>

                                                                        <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                                                                            <span className={`w-[118px] h-6 inline-flex items-center justify-center text-center text-[10px] font-bold rounded-md border whitespace-nowrap shrink-0 ${insp.IN_TRANSIT > 0
                                                                                ? 'bg-blue-100 text-blue-900 border-blue-300'
                                                                                : 'bg-white text-slate-400 border-slate-200'
                                                                                }`}>
                                                                                🚌 {insp.IN_TRANSIT} En Ruta
                                                                            </span>
                                                                            <span className={`w-[118px] h-6 inline-flex items-center justify-center text-center text-[10px] font-bold rounded-md border whitespace-nowrap shrink-0 ${insp.ARRIVED_QR > 0
                                                                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                                                                : 'bg-white text-slate-400 border-slate-200'
                                                                                }`}>
                                                                                📲 {insp.ARRIVED_QR} Firmaron QR
                                                                            </span>
                                                                            <span className={`w-[118px] h-6 inline-flex items-center justify-center text-center text-[10px] font-bold rounded-md border whitespace-nowrap shrink-0 ${insp.ABSENT > 0
                                                                                ? 'bg-red-50 text-red-700 border-red-200'
                                                                                : 'bg-white text-slate-400 border-slate-200'
                                                                                }`}>
                                                                                ⚠️ {insp.ABSENT} Falta(s)
                                                                            </span>

                                                                            <button
                                                                                type="button"
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    toggleTransitInspector(row.plantId, insp.inspectorKey);
                                                                                }}
                                                                                title={isInspOpen ? `Ocultar fechas de ${insp.name}` : `Ver detalle por fecha de ${insp.name}`}
                                                                                className="w-7 h-6 inline-flex items-center justify-center rounded-md bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 transition-all cursor-pointer shrink-0"
                                                                            >
                                                                                {isInspOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                                                            </button>
                                                                        </div>
                                                                    </div>

                                                                    {/* NIVEL 3 DEL ÁRBOL: DETALLE AGRUPADO POR FECHA DEL INSPECTOR */}
                                                                    {isInspOpen && (
                                                                        <div className="px-3 py-2 bg-white">
                                                                            <div className="ml-5 pl-3.5 border-l-2 border-indigo-200 space-y-1.5">
                                                                                {visibleDates.map((dateRec, dIdx) => {
                                                                                    const isLastDate = dIdx === visibleDates.length - 1;
                                                                                    return (
                                                                                        <div
                                                                                            key={dateRec.id}
                                                                                            className="px-2.5 py-1.5 rounded-lg border border-slate-200/80 bg-slate-50/60 flex flex-wrap items-center justify-between gap-2 text-[11px]"
                                                                                        >
                                                                                            <div className="flex items-center gap-2">
                                                                                                <span className="font-mono text-slate-400 font-bold">
                                                                                                    {isLastDate ? '└─' : '├─'}
                                                                                                </span>
                                                                                                <span className="font-mono font-extrabold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                                                                                                    📅 {dateRec.date}
                                                                                                </span>
                                                                                                <span className="text-slate-500 font-medium">
                                                                                                    {dateRec.shift}
                                                                                                </span>
                                                                                            </div>

                                                                                            <div className="flex items-center gap-1.5 ml-auto shrink-0">
                                                                                                <span className="w-[152px] h-6 inline-flex items-center justify-center text-center font-mono text-[10px] text-slate-600 bg-white rounded border border-slate-200 shrink-0">
                                                                                                    🚌 Abordaje:&nbsp;<strong>{dateRec.transportCheckIn}</strong>
                                                                                                </span>
                                                                                                <span className="w-[118px] h-6 inline-flex items-center justify-center text-center font-mono text-[10px] text-slate-600 bg-white rounded border border-slate-200 shrink-0">
                                                                                                    📲 QR:&nbsp;<strong>{dateRec.plantQrScan}</strong>
                                                                                                </span>
                                                                                                <span className={`w-[118px] h-6 inline-flex items-center justify-center text-center font-bold text-[10px] rounded-md border shrink-0 ${dateRec.category === 'IN_TRANSIT'
                                                                                                    ? 'bg-blue-100 text-blue-900 border-blue-300'
                                                                                                    : dateRec.category === 'ARRIVED_QR'
                                                                                                        ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                                                                                        : 'bg-red-100 text-red-800 border-red-300'
                                                                                                    }`}>
                                                                                                    {dateRec.category === 'IN_TRANSIT'
                                                                                                        ? '🚌 En Ruta'
                                                                                                        : dateRec.category === 'ARRIVED_QR'
                                                                                                            ? '📲 Firmaron QR'
                                                                                                            : '⚠️ Falta(s)'}
                                                                                                </span>
                                                                                                <div className="w-7 h-6 shrink-0 hidden sm:block" />
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
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* BARRA EJECUTIVA DE 1 LÍNEA (REVELACIÓN PROGRESIVA) — CONTROL DE CIERRE DE SUPERVISORES */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
                <div className={`px-4 py-2.5 bg-slate-50/80 flex items-center justify-between gap-2 ${isSupPanelExpanded ? 'border-b border-slate-200/80' : ''}`}>
                    <div
                        onClick={() => setIsSupPanelExpanded(prev => !prev)}
                        className="flex flex-wrap items-center gap-2 cursor-pointer select-none min-w-0"
                    >
                        <div className={`p-1.5 rounded-lg border shrink-0 ${supervisorClosureAudit.totals.PENDING_RISK > 0
                            ? 'bg-red-50 border-red-200 text-red-600'
                            : supervisorClosureAudit.actionableGlobalPending > 0
                                ? 'bg-amber-50 border-amber-200 text-amber-600'
                                : 'bg-emerald-50 border-emerald-200 text-emerald-600'
                            }`}>
                            <UserCheck className="w-4 h-4" />
                        </div>
                        <h3 className="text-xs sm:text-sm font-bold text-slate-900 whitespace-nowrap">
                            Cierre de Supervisores:
                        </h3>
                        <span className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border whitespace-nowrap ${supervisorClosureAudit.globalCompletionPct === 100
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : 'bg-amber-100 text-amber-900 border-amber-300'
                            }`}>
                            {supervisorClosureAudit.globalCompletionPct}%
                        </span>
                    </div>

                    {/* Botones interactivos de filtro rápido por tipo de pendiente (Tamaño fijo forzado w-[112px]) + botón icono */}
                    <div className="flex items-center gap-1.5 shrink-0">
                        <button
                            type="button"
                            onClick={() => handleToggleSupCategory('PENDING_OK')}
                            title="Filtrar turnos OK pendientes"
                            className={`w-[112px] h-7 inline-flex items-center justify-center text-center gap-1 text-[11px] font-bold rounded-lg border transition-all cursor-pointer active:scale-95 whitespace-nowrap shrink-0 ${supCategoryFilter === 'PENDING_OK' && isSupPanelExpanded
                                ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm ring-2 ring-emerald-500/30'
                                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
                                }`}
                        >
                            ⏳ {supervisorClosureAudit.totals.PENDING_OK} OK
                            {supCategoryFilter === 'PENDING_OK' && isSupPanelExpanded && <span className="ml-0.5 text-[10px] opacity-90">✕</span>}
                        </button>

                        <button
                            type="button"
                            onClick={() => handleToggleSupCategory('PENDING_RISK')}
                            title="Filtrar Riesgo de Sobretiempo sin validar"
                            className={`w-[112px] h-7 inline-flex items-center justify-center text-center gap-1 text-[11px] font-bold rounded-lg border transition-all cursor-pointer active:scale-95 whitespace-nowrap shrink-0 ${supCategoryFilter === 'PENDING_RISK' && isSupPanelExpanded
                                ? 'bg-red-600 text-white border-red-700 shadow-sm ring-2 ring-red-500/30'
                                : supervisorClosureAudit.totals.PENDING_RISK > 0
                                    ? 'bg-red-100 hover:bg-red-200/80 text-red-800 border-red-300 animate-pulse'
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-500 border-slate-200'
                                }`}
                        >
                            🚨 {supervisorClosureAudit.totals.PENDING_RISK} Riesgo
                            {supCategoryFilter === 'PENDING_RISK' && isSupPanelExpanded && <span className="ml-0.5 text-[10px] opacity-90">✕</span>}
                        </button>

                        <button
                            type="button"
                            onClick={() => handleToggleSupCategory('PENDING_INCIDENT')}
                            title="Filtrar Incidencias (Retardo/Falta) sin cerrar"
                            className={`w-[112px] h-7 inline-flex items-center justify-center text-center gap-1 text-[11px] font-bold rounded-lg border transition-all cursor-pointer active:scale-95 whitespace-nowrap shrink-0 ${supCategoryFilter === 'PENDING_INCIDENT' && isSupPanelExpanded
                                ? 'bg-amber-500 text-white border-amber-600 shadow-sm ring-2 ring-amber-400/30'
                                : supervisorClosureAudit.totals.PENDING_INCIDENT > 0
                                    ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200'
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-500 border-slate-200'
                                }`}
                        >
                            ⚠️ {supervisorClosureAudit.totals.PENDING_INCIDENT} Incidencias
                            {supCategoryFilter === 'PENDING_INCIDENT' && isSupPanelExpanded && <span className="ml-0.5 text-[10px] opacity-90">✕</span>}
                        </button>

                        <button
                            type="button"
                            onClick={() => handleToggleSupCategory('ACTIVE_SHIFT')}
                            title="Filtrar inspectores en Turno Activo"
                            className={`w-[112px] h-7 inline-flex items-center justify-center text-center gap-1.5 text-[11px] font-bold rounded-lg border transition-all cursor-pointer active:scale-95 whitespace-nowrap shrink-0 ${supCategoryFilter === 'ACTIVE_SHIFT' && isSupPanelExpanded
                                ? 'bg-blue-600 text-white border-blue-700 shadow-sm ring-2 ring-blue-500/30'
                                : supervisorClosureAudit.totals.ACTIVE_SHIFT > 0
                                    ? 'bg-blue-50 hover:bg-blue-100 text-blue-800 border-blue-200'
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-500 border-slate-200'
                                }`}
                        >
                            <span className={`w-2.5 h-2.5 rounded-full inline-block shrink-0 ${supervisorClosureAudit.totals.ACTIVE_SHIFT > 0
                                ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.7)]'
                                : 'bg-slate-300 border border-slate-400/50'
                                }`} />
                            {supervisorClosureAudit.totals.ACTIVE_SHIFT} En turno
                            {supCategoryFilter === 'ACTIVE_SHIFT' && isSupPanelExpanded && <span className="ml-0.5 text-[10px] opacity-90">✕</span>}
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                if (isSupPanelExpanded) {
                                    setIsSupPanelExpanded(false);
                                    setSupCategoryFilter('ALL');
                                } else {
                                    setIsSupPanelExpanded(true);
                                }
                            }}
                            title={isSupPanelExpanded ? 'Ocultar supervisores' : 'Mostrar supervisores'}
                            className="w-7 h-7 inline-flex items-center justify-center rounded-lg bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 transition-all cursor-pointer shrink-0"
                        >
                            {isSupPanelExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                    </div>
                </div>

                {isSupPanelExpanded && (
                    <div className="p-4 space-y-3">
                        {/* Barra secundaria de filtro rápido */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSupCategoryFilter('ALL');
                                        setShowOnlyPendingPlants(true);
                                    }}
                                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${supCategoryFilter === 'ALL' && showOnlyPendingPlants
                                        ? 'bg-slate-900 text-white shadow-xs'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                        }`}
                                >
                                    Supervisores con Pendientes ({supervisorsWithPendingCount})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSupCategoryFilter('ALL');
                                        setShowOnlyPendingPlants(false);
                                    }}
                                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${supCategoryFilter === 'ALL' && !showOnlyPendingPlants
                                        ? 'bg-slate-900 text-white shadow-xs'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                        }`}
                                >
                                    Todos los Supervisores ({supervisorClosureAudit.supervisorRows.length})
                                </button>

                                {supCategoryFilter !== 'ALL' && (
                                    <button
                                        type="button"
                                        onClick={() => setSupCategoryFilter('ALL')}
                                        className="px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition-all cursor-pointer"
                                    >
                                        Mostrando filtro rápido ({visibleSupervisorAuditRows.length} supervisor{visibleSupervisorAuditRows.length === 1 ? '' : 'es'}) • Quitar filtro ✕
                                    </button>
                                )}
                            </div>

                            {selectedPlantFilter !== 'ALL' && setSelectedPlantFilter && (
                                <button
                                    type="button"
                                    onClick={() => setSelectedPlantFilter('ALL')}
                                    className="text-xs font-bold text-blue-600 hover:text-blue-800 underline cursor-pointer"
                                >
                                    Quitar filtro de planta actual (Ver todas)
                                </button>
                            )}
                        </div>

                        {visibleSupervisorAuditRows.length === 0 ? (
                            <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                                    <div>
                                        <p className="text-xs font-bold text-emerald-950">
                                            ¡Excelente! Todos los supervisores han validado y cerrado el 100% de los turnos del periodo filtrado.
                                        </p>
                                        <p className="text-[11px] text-emerald-700">
                                            La prenómina está lista y sellada sin pendientes de validación.
                                        </p>
                                    </div>
                                </div>
                                {showOnlyPendingPlants && supervisorClosureAudit.supervisorRows.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => setShowOnlyPendingPlants(false)}
                                        className="text-xs font-bold text-emerald-800 bg-white px-3 py-1.5 rounded-lg border border-emerald-300 hover:bg-emerald-100 transition-all cursor-pointer"
                                    >
                                        Ver supervisores al 100% ({supervisorClosureAudit.supervisorRows.length})
                                    </button>
                                )}
                            </div>
                        ) : (
                            /* ESTRUCTURA TIPO ÁRBOL DE 3 NIVELES: NIVEL 1 (SUPERVISOR) -> NIVEL 2 (PLANTA) -> NIVEL 3 (INSPECTOR) */
                            <div className="space-y-2">
                                {visibleSupervisorAuditRows.map(sup => {
                                    const isSupOpen = Boolean(expandedSupSupervisors[sup.supervisorKey]);
                                    const isSupAllClosed = sup.totalUnclosed === 0;
                                    const filteredPlants = supCategoryFilter === 'ALL'
                                        ? (showOnlyPendingPlants ? sup.plants.filter(p => p.totalUnclosed > 0) : sup.plants)
                                        : sup.plants.filter(p => (p[supCategoryFilter] || 0) > 0);

                                    return (
                                        <div
                                            key={sup.supervisorKey}
                                            className={`rounded-xl border transition-all overflow-hidden ${sup.PENDING_RISK > 0
                                                ? 'bg-red-50/20 border-red-300'
                                                : sup.actionablePending > 0
                                                    ? 'bg-amber-50/20 border-amber-300'
                                                    : isSupAllClosed
                                                        ? 'bg-emerald-50/20 border-emerald-200'
                                                        : 'bg-slate-50/60 border-slate-200'
                                                }`}
                                        >
                                            {/* ================================================================= */}
                                            {/* NIVEL 1 DEL ÁRBOL: LÍNEA COLAPSADA POR SUPERVISOR                 */}
                                            {/* ================================================================= */}
                                            <div
                                                onClick={() => toggleSupSupervisor(sup.supervisorKey)}
                                                className={`px-3.5 py-2.5 flex items-center justify-between gap-2 cursor-pointer select-none hover:bg-slate-100/70 transition-colors ${isSupOpen ? 'border-b border-slate-200/80 bg-white/80' : ''}`}
                                            >
                                                {/* Izquierda: Clave de Supervisor (86px) + Columna con Nombre arriba y Cerrados abajo desde la primera letra */}
                                                <div className="flex items-start gap-2.5 min-w-0">
                                                    <span className="w-[86px] h-6 mt-0.5 inline-flex items-center justify-center text-center font-mono text-xs font-extrabold rounded bg-slate-900 text-white shrink-0">
                                                        {sup.supervisorEmpNo || 'SUP'}
                                                    </span>
                                                    <div className="flex flex-col items-start min-w-0">
                                                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate leading-tight">
                                                            {sup.supervisorDisplayName}
                                                        </h4>
                                                        <span className={`text-[11px] font-mono font-semibold leading-tight mt-0.5 ${isSupAllClosed
                                                            ? 'text-emerald-700'
                                                            : 'text-slate-500'
                                                            }`}>
                                                            {sup.LOCKED}/{sup.total} cerrados ({sup.completionPct}%)
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Derecha: Acción rápida Aviso + 4 Columnas de Tamaño Fijo (112px) + Botón Desplegar */}
                                                <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                                                    {!isSupAllClosed && (
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleCopyReminder(sup);
                                                            }}
                                                            title={`Copiar aviso de pendientes para ${sup.supervisorDisplayName}`}
                                                            className="h-7 px-2.5 inline-flex items-center justify-center gap-1 text-[10px] font-bold bg-slate-800 hover:bg-slate-900 text-white rounded-lg transition-all cursor-pointer shrink-0"
                                                        >
                                                            <Copy className="w-3 h-3" /> Aviso
                                                        </button>
                                                    )}

                                                    <span className={`w-[112px] h-7 inline-flex items-center justify-center text-center gap-1 text-[11px] font-bold rounded-lg border whitespace-nowrap shrink-0 ${sup.PENDING_OK > 0
                                                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                                        : 'bg-white text-slate-400 border-slate-200'
                                                        }`}>
                                                        ⏳ {sup.PENDING_OK} OK
                                                    </span>
                                                    <span className={`w-[112px] h-7 inline-flex items-center justify-center text-center gap-1 text-[11px] font-bold rounded-lg border whitespace-nowrap shrink-0 ${sup.PENDING_RISK > 0
                                                        ? 'bg-red-100 text-red-900 border-red-300'
                                                        : 'bg-white text-slate-400 border-slate-200'
                                                        }`}>
                                                        🚨 {sup.PENDING_RISK} Riesgo
                                                    </span>
                                                    <span className={`w-[112px] h-7 inline-flex items-center justify-center text-center gap-1 text-[11px] font-bold rounded-lg border whitespace-nowrap shrink-0 ${sup.PENDING_INCIDENT > 0
                                                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                                                        : 'bg-white text-slate-400 border-slate-200'
                                                        }`}>
                                                        ⚠️ {sup.PENDING_INCIDENT} Incidencias
                                                    </span>
                                                    <span className={`w-[112px] h-7 inline-flex items-center justify-center text-center gap-1.5 text-[11px] font-bold rounded-lg border whitespace-nowrap shrink-0 ${sup.ACTIVE_SHIFT > 0
                                                        ? 'bg-blue-50 text-blue-800 border-blue-200'
                                                        : 'bg-white text-slate-400 border-slate-200'
                                                        }`}>
                                                        <span className={`w-2.5 h-2.5 rounded-full inline-block shrink-0 ${sup.ACTIVE_SHIFT > 0
                                                            ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.7)]'
                                                            : 'bg-slate-300 border border-slate-400/40'
                                                            }`} />
                                                        {sup.ACTIVE_SHIFT} En turno
                                                    </span>

                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            toggleSupSupervisor(sup.supervisorKey);
                                                        }}
                                                        title={isSupOpen ? `Ocultar plantas de ${sup.supervisorDisplayName}` : `Ver plantas de ${sup.supervisorDisplayName}`}
                                                        className="w-7 h-7 inline-flex items-center justify-center rounded-lg bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 transition-all cursor-pointer shrink-0"
                                                    >
                                                        {isSupOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                                    </button>
                                                </div>
                                            </div>

                                            {/* ================================================================= */}
                                            {/* NIVEL 2 DEL ÁRBOL: PLANTAS ASIGNADAS A ESTE SUPERVISOR            */}
                                            {/* ================================================================= */}
                                            {isSupOpen && (
                                                <div className="p-3 bg-white/90">
                                                    <div className="ml-3 pl-3.5 border-l-2 border-slate-300 space-y-2">
                                                        {filteredPlants.map((plant, pIdx) => {
                                                            const plantCompositeKey = `${sup.supervisorKey}__${plant.plantId}`;
                                                            const isPlantOpen = Boolean(expandedSupPlants[plantCompositeKey]);
                                                            const isLastPlant = pIdx === filteredPlants.length - 1;
                                                            const isPlantClosed = plant.totalUnclosed === 0;
                                                            const filteredInspectors = supCategoryFilter === 'ALL'
                                                                ? (showOnlyPendingPlants ? plant.inspectors.filter(i => i.totalUnclosed > 0) : plant.inspectors)
                                                                : plant.inspectors.filter(i => (i[supCategoryFilter] || 0) > 0);

                                                            return (
                                                                <div
                                                                    key={plant.plantId}
                                                                    className="rounded-xl border border-slate-200/90 bg-slate-50/70 overflow-hidden"
                                                                >
                                                                    {/* Línea colapsada de la Planta (Nivel 2) */}
                                                                    <div
                                                                        onClick={() => toggleSupPlant(sup.supervisorKey, plant.plantId)}
                                                                        className={`px-3 py-2 flex items-center justify-between gap-2 cursor-pointer select-none hover:bg-slate-100/80 transition-colors ${isPlantOpen ? 'border-b border-slate-200/80 bg-white' : ''}`}
                                                                    >
                                                                        <div className="flex items-start gap-2 min-w-0">
                                                                            <span className="font-mono text-xs text-slate-400 font-bold shrink-0 mt-1">
                                                                                {isLastPlant ? '└─' : '├─'}
                                                                            </span>
                                                                            <span className="w-[86px] h-6 mt-0.5 inline-flex items-center justify-center text-center font-mono text-[11px] font-extrabold rounded bg-slate-900 text-white shrink-0">
                                                                                {plant.plantCode}
                                                                            </span>
                                                                            <div className="flex flex-col items-start min-w-0">
                                                                                <span className="text-xs font-bold text-slate-900 truncate leading-tight">
                                                                                    {plant.plantName}
                                                                                </span>
                                                                                <span className={`text-[10px] font-mono font-semibold leading-tight mt-0.5 ${isPlantClosed
                                                                                    ? 'text-emerald-700'
                                                                                    : 'text-slate-500'
                                                                                    }`}>
                                                                                    {plant.LOCKED}/{plant.total} cerrados ({plant.completionPct}%)
                                                                                </span>
                                                                            </div>
                                                                        </div>

                                                                        <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                                                                            <span className={`w-[112px] h-6 inline-flex items-center justify-center text-center text-[10px] font-bold rounded-md border whitespace-nowrap shrink-0 ${plant.PENDING_OK > 0
                                                                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                                                                : 'bg-white text-slate-400 border-slate-200'
                                                                                }`}>
                                                                                ⏳ {plant.PENDING_OK} OK
                                                                            </span>
                                                                            <span className={`w-[112px] h-6 inline-flex items-center justify-center text-center text-[10px] font-bold rounded-md border whitespace-nowrap shrink-0 ${plant.PENDING_RISK > 0
                                                                                ? 'bg-red-100 text-red-900 border-red-300'
                                                                                : 'bg-white text-slate-400 border-slate-200'
                                                                                }`}>
                                                                                🚨 {plant.PENDING_RISK} Riesgo
                                                                            </span>
                                                                            <span className={`w-[112px] h-6 inline-flex items-center justify-center text-center text-[10px] font-bold rounded-md border whitespace-nowrap shrink-0 ${plant.PENDING_INCIDENT > 0
                                                                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                                                                : 'bg-white text-slate-400 border-slate-200'
                                                                                }`}>
                                                                                ⚠️ {plant.PENDING_INCIDENT} Incidencias
                                                                            </span>
                                                                            <span className={`w-[112px] h-6 inline-flex items-center justify-center text-center gap-1.5 text-[10px] font-bold rounded-md border whitespace-nowrap shrink-0 ${plant.ACTIVE_SHIFT > 0
                                                                                ? 'bg-blue-50 text-blue-800 border-blue-200'
                                                                                : 'bg-white text-slate-400 border-slate-200'
                                                                                }`}>
                                                                                <span className={`w-2 h-2 rounded-full inline-block shrink-0 ${plant.ACTIVE_SHIFT > 0
                                                                                    ? 'bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.7)]'
                                                                                    : 'bg-slate-300 border border-slate-400/40'
                                                                                    }`} />
                                                                                {plant.ACTIVE_SHIFT} En turno
                                                                            </span>

                                                                            <button
                                                                                type="button"
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    toggleSupPlant(sup.supervisorKey, plant.plantId);
                                                                                }}
                                                                                title={isPlantOpen ? `Ocultar inspectores de ${plant.plantCode}` : `Ver inspectores de ${plant.plantCode}`}
                                                                                className="w-7 h-6 inline-flex items-center justify-center rounded-md bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 transition-all cursor-pointer shrink-0"
                                                                            >
                                                                                {isPlantOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                                                            </button>
                                                                        </div>
                                                                    </div>

                                                                    {/* ================================================================= */}
                                                                    {/* NIVEL 3 DEL ÁRBOL: INSPECTORES DE ESTA PLANTA                     */}
                                                                    {/* ================================================================= */}
                                                                    {isPlantOpen && (
                                                                        <div className="px-3 py-2 bg-white">
                                                                            <div className="ml-5 pl-3.5 border-l-2 border-indigo-200 space-y-1.5">
                                                                                {filteredInspectors.map((insp, iIdx) => {
                                                                                    const inspCompositeKey = `${sup.supervisorKey}__${plant.plantId}__${insp.inspectorKey}`;
                                                                                    const isInspOpen = Boolean(expandedSupInspectors[inspCompositeKey]);
                                                                                    const isLastInsp = iIdx === filteredInspectors.length - 1;
                                                                                    const visibleDates = supCategoryFilter === 'ALL'
                                                                                        ? (showOnlyPendingPlants ? insp.recordsByDate.filter(d => d.category !== 'LOCKED') : insp.recordsByDate)
                                                                                        : insp.recordsByDate.filter(d => d.category === supCategoryFilter);

                                                                                    return (
                                                                                        <div
                                                                                            key={insp.inspectorKey}
                                                                                            className="rounded-lg border border-slate-200/80 bg-slate-50/60 overflow-hidden"
                                                                                        >
                                                                                            <div
                                                                                                onClick={() => toggleSupInspector(sup.supervisorKey, plant.plantId, insp.inspectorKey)}
                                                                                                className={`px-2.5 py-1.5 flex items-center justify-between gap-2 cursor-pointer select-none hover:bg-slate-100/80 transition-colors text-[11px] ${isInspOpen ? 'border-b border-slate-200/80 bg-white' : ''}`}
                                                                                            >
                                                                                                <div className="flex items-center gap-2 min-w-0">
                                                                                                    <span className="font-mono text-slate-400 font-bold shrink-0">
                                                                                                        {isLastInsp ? '└─' : '├─'}
                                                                                                    </span>
                                                                                                    <span className="w-[78px] h-6 inline-flex items-center justify-center text-center font-mono text-[10px] font-extrabold rounded bg-indigo-100 text-indigo-900 border border-indigo-200 shrink-0">
                                                                                                        {insp.empNo}
                                                                                                    </span>
                                                                                                    <span className="text-xs font-bold text-slate-900 truncate">
                                                                                                        {insp.name}
                                                                                                    </span>
                                                                                                </div>

                                                                                                <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                                                                                                    <span className={`w-[112px] h-6 inline-flex items-center justify-center text-center text-[10px] font-bold rounded-md border whitespace-nowrap shrink-0 ${insp.PENDING_OK > 0
                                                                                                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                                                                                        : 'bg-white text-slate-400 border-slate-200'
                                                                                                        }`}>
                                                                                                        ⏳ {insp.PENDING_OK} OK
                                                                                                    </span>
                                                                                                    <span className={`w-[112px] h-6 inline-flex items-center justify-center text-center text-[10px] font-bold rounded-md border whitespace-nowrap shrink-0 ${insp.PENDING_RISK > 0
                                                                                                        ? 'bg-red-100 text-red-900 border-red-300'
                                                                                                        : 'bg-white text-slate-400 border-slate-200'
                                                                                                        }`}>
                                                                                                        🚨 {insp.PENDING_RISK} Riesgo
                                                                                                    </span>
                                                                                                    <span className={`w-[112px] h-6 inline-flex items-center justify-center text-center text-[10px] font-bold rounded-md border whitespace-nowrap shrink-0 ${insp.PENDING_INCIDENT > 0
                                                                                                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                                                                                                        : 'bg-white text-slate-400 border-slate-200'
                                                                                                        }`}>
                                                                                                        ⚠️ {insp.PENDING_INCIDENT} Incidencias
                                                                                                    </span>
                                                                                                    <span className={`w-[112px] h-6 inline-flex items-center justify-center text-center gap-1.5 text-[10px] font-bold rounded-md border whitespace-nowrap shrink-0 ${insp.ACTIVE_SHIFT > 0
                                                                                                        ? 'bg-blue-50 text-blue-800 border-blue-200'
                                                                                                        : 'bg-white text-slate-400 border-slate-200'
                                                                                                        }`}>
                                                                                                        <span className={`w-2 h-2 rounded-full inline-block shrink-0 ${insp.ACTIVE_SHIFT > 0
                                                                                                            ? 'bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.7)]'
                                                                                                            : 'bg-slate-300 border border-slate-400/40'
                                                                                                            }`} />
                                                                                                        {insp.ACTIVE_SHIFT} En turno
                                                                                                    </span>

                                                                                                    <button
                                                                                                        type="button"
                                                                                                        onClick={(e) => {
                                                                                                            e.stopPropagation();
                                                                                                            toggleSupInspector(sup.supervisorKey, plant.plantId, insp.inspectorKey);
                                                                                                        }}
                                                                                                        title={isInspOpen ? `Ocultar fechas de ${insp.name}` : `Ver fechas de ${insp.name}`}
                                                                                                        className="w-7 h-6 inline-flex items-center justify-center rounded-md bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 transition-all cursor-pointer shrink-0"
                                                                                                    >
                                                                                                        {isInspOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                                                                                    </button>
                                                                                                </div>
                                                                                            </div>

                                                                                            {/* Detalle por Fecha del Inspector al desplegar Nivel 3 */}
                                                                                            {isInspOpen && (
                                                                                                <div className="px-3 py-2 bg-white border-t border-slate-100">
                                                                                                    <div className="ml-5 pl-3 border-l-2 border-slate-300 space-y-1">
                                                                                                        {visibleDates.map((dRec, dIdx) => {
                                                                                                            const isLastDate = dIdx === visibleDates.length - 1;
                                                                                                            return (
                                                                                                                <div
                                                                                                                    key={dRec.id}
                                                                                                                    className="px-2.5 py-1 rounded border border-slate-200/80 bg-slate-50/50 flex flex-wrap items-center justify-between gap-2 text-[10px]"
                                                                                                                >
                                                                                                                    <div className="flex items-center gap-2">
                                                                                                                        <span className="font-mono text-slate-400 font-bold">
                                                                                                                            {isLastDate ? '└─' : '├─'}
                                                                                                                        </span>
                                                                                                                        <span className="font-mono font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                                                                                                                            📅 {dRec.date}
                                                                                                                        </span>
                                                                                                                        <span className="text-slate-500">
                                                                                                                            {dRec.shift}
                                                                                                                        </span>
                                                                                                                    </div>

                                                                                                                    <div className="flex items-center gap-1.5 ml-auto shrink-0">
                                                                                                                        <span className="w-[112px] h-6 inline-flex items-center justify-center text-center font-mono text-slate-600 bg-white rounded border border-slate-200 shrink-0">
                                                                                                                            📲 QR:&nbsp;<strong>{dRec.plantQrScan}</strong>
                                                                                                                        </span>
                                                                                                                        <span className="w-[112px] h-6 inline-flex items-center justify-center text-center font-mono text-slate-600 bg-white rounded border border-slate-200 shrink-0">
                                                                                                                            Salida:&nbsp;<strong>{dRec.departureTime}</strong>
                                                                                                                        </span>
                                                                                                                        <span className={`w-[112px] h-6 inline-flex items-center justify-center text-center font-bold rounded border shrink-0 ${dRec.category === 'PENDING_RISK'
                                                                                                                            ? 'bg-red-100 text-red-900 border-red-300'
                                                                                                                            : dRec.category === 'PENDING_INCIDENT'
                                                                                                                                ? 'bg-amber-100 text-amber-900 border-amber-300'
                                                                                                                                : dRec.category === 'PENDING_OK'
                                                                                                                                    ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                                                                                                                    : dRec.category === 'ACTIVE_SHIFT'
                                                                                                                                        ? 'bg-blue-100 text-blue-900 border-blue-300'
                                                                                                                                        : 'bg-slate-100 text-slate-700 border-slate-300'
                                                                                                                            }`}>
                                                                                                                            {dRec.tagLabel}
                                                                                                                        </span>
                                                                                                                        <div className="w-7 h-6 shrink-0 hidden sm:block" />
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
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* BARRA EJECUTIVA DE 1 LÍNEA (REVELACIÓN PROGRESIVA) — MODALIDAD DE TURNO (8H Y 12H) */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
                <div className={`px-4 py-2.5 bg-slate-50/80 flex items-center justify-between gap-2 ${isShiftPanelExpanded ? 'border-b border-slate-200/80' : ''}`}>
                    <div
                        onClick={() => setIsShiftPanelExpanded(prev => !prev)}
                        className="flex items-center gap-2 cursor-pointer select-none shrink-0"
                    >
                        <div className="p-1.5 rounded-lg border bg-blue-50 border-blue-200 text-blue-600 shrink-0">
                            <Clock className="w-4 h-4" />
                        </div>
                        <h3 className="text-xs sm:text-sm font-bold text-slate-900 whitespace-nowrap">
                            Modalidad de Turno:
                        </h3>
                        <span className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border whitespace-nowrap ${selectedShiftFilter !== 'ALL'
                            ? 'bg-blue-600 text-white border-blue-700'
                            : 'bg-blue-50 text-blue-800 border-blue-200'
                            }`}>
                            {selectedShiftFilter === 'ALL'
                                ? `Todos (${globalMetrics.totalPayrollHours}h)`
                                : `Filtro: ${selectedShiftFilter} (${globalMetrics.totalPayrollHours}h)`}
                        </span>
                    </div>

                    {/* Píldoras interactivas de cada modalidad de turno + botón icono */}
                    <div className="flex items-center gap-1.5 shrink-0">
                        {shiftStats.map(sh => {
                            const isSelected = selectedShiftFilter === sh.key;
                            const shortName =
                                sh.key === 'T1' ? 'T1 Mat' :
                                    sh.key === 'T2' ? 'T2 Vesp' :
                                        sh.key === 'T3' ? 'T3 Noc' : 'Esp 12h';

                            const badgeTone = isSelected
                                ? 'bg-blue-600 text-white border-blue-700 shadow-sm ring-2 ring-blue-500/30'
                                : sh.absent > 0
                                    ? 'bg-red-50 hover:bg-red-100 text-red-800 border-red-200'
                                    : sh.late > 0
                                        ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200'
                                        : 'bg-emerald-50/80 hover:bg-emerald-100 text-emerald-800 border-emerald-200';

                            return (
                                <button
                                    key={sh.key}
                                    type="button"
                                    onClick={() => {
                                        if (isSelected) {
                                            setSelectedShiftFilter('ALL');
                                            setIsShiftPanelExpanded(false);
                                        } else {
                                            setSelectedShiftFilter(sh.key);
                                            setIsShiftPanelExpanded(true);
                                        }
                                    }}
                                    title={`${sh.label} (${sh.horario}) — ${sh.total} reg • ${sh.totalHours}h (${sh.attendanceRate}%)`}
                                    className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg border transition-all cursor-pointer active:scale-95 whitespace-nowrap ${badgeTone}`}
                                >
                                    <span>{shortName}:</span>
                                    <span className="font-mono">{sh.total}</span>
                                    <span className="opacity-60">•</span>
                                    <span className="font-mono">{sh.totalHours}h</span>
                                    <span className="opacity-75">({sh.attendanceRate}%)</span>
                                    {isSelected && <span className="ml-0.5 text-[10px] opacity-90">✕</span>}
                                </button>
                            );
                        })}

                        <button
                            type="button"
                            onClick={() => setIsShiftPanelExpanded(prev => !prev)}
                            title={isShiftPanelExpanded ? 'Ocultar turnos' : 'Mostrar turnos'}
                            className="w-7 h-7 inline-flex items-center justify-center rounded-lg bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 transition-all cursor-pointer shrink-0"
                        >
                            {isShiftPanelExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                    </div>
                </div>

                {isShiftPanelExpanded && (
                    <div className="p-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                            {shiftStats.map(sh => {
                                const isSelected = selectedShiftFilter === sh.key;
                                return (
                                    <div
                                        key={sh.key}
                                        onClick={() => setSelectedShiftFilter(isSelected ? 'ALL' : sh.key)}
                                        className={`cursor-pointer p-4 rounded-xl border transition-all ${isSelected
                                            ? 'bg-blue-50/70 border-blue-600 ring-2 ring-blue-500/20'
                                            : 'bg-slate-50/60 border-slate-200 hover:border-blue-400 hover:bg-white'
                                            }`}
                                    >
                                        <div className="flex justify-between items-start border-b border-slate-200/80 pb-2">
                                            <div>
                                                <span className="text-[10px] font-semibold text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-md">
                                                    {sh.horario}
                                                </span>
                                                <h4 className="font-bold text-slate-900 text-xs mt-1.5">{sh.label}</h4>
                                            </div>
                                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${sh.absent > 0 ? 'bg-red-50 text-red-700 border-red-200' :
                                                sh.late > 0 ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                    'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                }`}>
                                                {sh.attendanceRate}% Asist.
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-5 gap-1.5 mt-3 text-center">
                                            <div className="bg-white p-1.5 rounded-lg border border-slate-200">
                                                <span className="block text-xs font-bold text-slate-800">{sh.total}</span>
                                                <span className="text-[9px] text-slate-500">Reg.</span>
                                            </div>
                                            <div className="bg-emerald-50/80 p-1.5 rounded-lg border border-emerald-200">
                                                <span className="block text-xs font-bold text-emerald-700">{sh.onTime}</span>
                                                <span className="text-[9px] text-emerald-700">OK</span>
                                            </div>
                                            <div className="bg-amber-50/80 p-1.5 rounded-lg border border-amber-200">
                                                <span className="block text-xs font-bold text-amber-700">{sh.late}</span>
                                                <span className="text-[9px] text-amber-700">Ret.</span>
                                            </div>
                                            <div className="bg-red-50/80 p-1.5 rounded-lg border border-red-200">
                                                <span className="block text-xs font-bold text-red-700">{sh.absent}</span>
                                                <span className="text-[9px] text-red-700">Falta</span>
                                            </div>
                                            <div className="bg-blue-50/80 p-1.5 rounded-lg border border-blue-200">
                                                <span className="block text-xs font-bold text-blue-700">{sh.totalHours}h</span>
                                                <span className="text-[9px] text-blue-700">Horas</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* BARRA EJECUTIVA DE 1 LÍNEA (REVELACIÓN PROGRESIVA) — GRÁFICAS DE COMPORTAMIENTO */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
                <div className={`px-4 py-2.5 bg-slate-50/80 flex items-center justify-between gap-2 ${isChartPanelExpanded ? 'border-b border-slate-200/80' : ''}`}>
                    <div className="flex flex-wrap items-center gap-2 min-w-0">
                        <div
                            onClick={() => setIsChartPanelExpanded(prev => !prev)}
                            className="flex items-center gap-2 cursor-pointer select-none"
                        >
                            <div className="p-1.5 rounded-lg border bg-blue-50 border-blue-200 text-blue-600 shrink-0">
                                <TrendingUp className="w-4 h-4" />
                            </div>
                            <h3 className="text-xs sm:text-sm font-bold text-slate-900 whitespace-nowrap">
                                Gráficas de Comportamiento:
                            </h3>
                        </div>

                        {/* Checkbox compacto de Horas Físicas Reales en Planta */}
                        <label
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-bold cursor-pointer select-none transition-all whitespace-nowrap ${showPhysicalHoursChart
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm ring-2 ring-indigo-500/25'
                                : 'bg-white hover:bg-indigo-50 text-slate-700 hover:text-indigo-900 border-slate-200'
                                }`}
                        >
                            <input
                                type="checkbox"
                                checked={showPhysicalHoursChart}
                                onChange={(e) => {
                                    const checked = e.target.checked;
                                    setShowPhysicalHoursChart(checked);
                                    if (checked) setIsChartPanelExpanded(true);
                                }}
                                className="w-3.5 h-3.5 rounded accent-indigo-600 cursor-pointer"
                            />
                            <span>Horas Físicas (Mayor a menor)</span>
                        </label>

                        {showPhysicalHoursChart && isChartPanelExpanded && (
                            <div className="inline-flex items-center gap-1 bg-indigo-50/80 p-0.5 rounded-lg border border-indigo-200">
                                <button
                                    type="button"
                                    onClick={() => setPhysicalHoursGroupBy('BY_PLANT')}
                                    className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap ${physicalHoursGroupBy === 'BY_PLANT'
                                        ? 'bg-indigo-600 text-white shadow-xs'
                                        : 'text-indigo-900 hover:bg-white/70'
                                        }`}
                                >
                                    Por Planta ({physicalHoursByPlant.length})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPhysicalHoursGroupBy('BY_WORKER')}
                                    className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap ${physicalHoursGroupBy === 'BY_WORKER'
                                        ? 'bg-indigo-600 text-white shadow-xs'
                                        : 'text-indigo-900 hover:bg-white/70'
                                        }`}
                                >
                                    Por Trabajador ({physicalHoursByWorker.length})
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                            {[
                                { id: 'TREND_DATE', label: 'Tendencia por Día' },
                                { id: 'BY_PLANT', label: 'Comparativa por Planta' },
                                { id: 'PAYROLL_HOURS', label: 'Horas Ordinarias vs. Extra' },
                                { id: 'DISTRIBUTION', label: 'Distribución % (Pastel)' }
                            ].map(tab => {
                                const isActiveTab = !showPhysicalHoursChart && selectedChartType === tab.id && isChartPanelExpanded;
                                return (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => {
                                            if (isActiveTab) {
                                                setIsChartPanelExpanded(false);
                                            } else {
                                                setShowPhysicalHoursChart(false);
                                                setSelectedChartType(tab.id);
                                                setIsChartPanelExpanded(true);
                                            }
                                        }}
                                        className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer whitespace-nowrap ${isActiveTab
                                            ? 'bg-blue-600 text-white shadow-sm'
                                            : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                                            }`}
                                    >
                                        {tab.label}
                                    </button>
                                );
                            })}
                        </div>

                        <button
                            type="button"
                            onClick={() => setIsChartPanelExpanded(prev => !prev)}
                            title={isChartPanelExpanded ? 'Ocultar gráfica' : 'Mostrar gráfica'}
                            className="w-7 h-7 inline-flex items-center justify-center rounded-lg bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 transition-all cursor-pointer shrink-0"
                        >
                            {isChartPanelExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                    </div>
                </div>

                {isChartPanelExpanded && (
                    <div className="p-4">
                        <div className="h-72 w-full bg-slate-50/60 p-4 rounded-xl border border-slate-200/70">
                            {filteredRecords.length === 0 ? (
                                <div className="h-full flex items-center justify-center text-xs text-slate-400">
                                    No existen registros en Supabase para los criterios seleccionados.
                                </div>
                            ) : showPhysicalHoursChart ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={physicalHoursGroupBy === 'BY_PLANT' ? physicalHoursByPlant : physicalHoursByWorker}
                                        margin={{ top: 24, right: 20, left: 0, bottom: 5 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                                        <XAxis
                                            dataKey={physicalHoursGroupBy === 'BY_PLANT' ? 'code' : 'shortLabel'}
                                            stroke="#475569"
                                            fontSize={11}
                                            interval={0}
                                            angle={physicalHoursGroupBy === 'BY_WORKER' && physicalHoursByWorker.length > 8 ? -20 : 0}
                                            textAnchor={physicalHoursGroupBy === 'BY_WORKER' && physicalHoursByWorker.length > 8 ? 'end' : 'middle'}
                                            height={physicalHoursGroupBy === 'BY_WORKER' && physicalHoursByWorker.length > 8 ? 50 : 30}
                                        />
                                        <YAxis stroke="#475569" fontSize={11} unit="h" />
                                        <Tooltip
                                            content={({ active, payload }) => {
                                                if (!active || !payload || !payload.length) return null;
                                                const d = payload[0].payload;
                                                return (
                                                    <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-lg text-xs space-y-1.5">
                                                        <div className="font-extrabold text-slate-900 border-b border-slate-100 pb-1">
                                                            {physicalHoursGroupBy === 'BY_PLANT'
                                                                ? `${d.code} — ${d.name}`
                                                                : `${d.empNo} — ${d.name}`}
                                                        </div>
                                                        {physicalHoursGroupBy === 'BY_WORKER' && d.plantName && (
                                                            <div className="text-[11px] text-slate-500 font-semibold">
                                                                Planta: {d.plantName}
                                                            </div>
                                                        )}
                                                        <div className="text-indigo-700 font-extrabold text-sm">
                                                            Total Físico en Planta: {d.horasFisicas} h ({d.tiempoFormateado})
                                                        </div>
                                                        <div className="text-slate-600 space-y-0.5 pt-0.5">
                                                            <div>• Horas Ordinarias: <strong>{d.horasOrdinarias} h</strong></div>
                                                            <div>• Horas Extra: <strong>+{d.horasExtra} h</strong></div>
                                                            <div>• Turnos físicos cerrados: <strong>{d.turnosFisicos}</strong></div>
                                                            {physicalHoursGroupBy === 'BY_PLANT' && (
                                                                <div>• Trabajadores en planta: <strong>{d.trabajadoresActivos}</strong></div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            }}
                                        />
                                        <Legend wrapperStyle={{ fontSize: '12px' }} />
                                        <Bar
                                            dataKey="horasFisicas"
                                            name="Horas Físicas Reales en Planta (Mayor a menor)"
                                            fill="#4F46E5"
                                            radius={[6, 6, 0, 0]}
                                        >
                                            <LabelList
                                                dataKey="horasFisicas"
                                                position="top"
                                                formatter={(val) => `${val}h`}
                                                style={{
                                                    fill: '#1E1B4B',
                                                    fontSize: '11px',
                                                    fontWeight: 800,
                                                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace'
                                                }}
                                            />
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : selectedChartType === 'TREND_DATE' ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartDataByDate} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                                        <XAxis dataKey="date" stroke="#475569" fontSize={11} />
                                        <YAxis stroke="#475569" fontSize={11} allowDecimals={false} />
                                        <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderRadius: '12px', color: '#0F172A', fontSize: '12px' }} />
                                        <Legend wrapperStyle={{ fontSize: '12px' }} />
                                        <Bar dataKey="aTiempo" name="A Tiempo (OK)" stackId="a" fill="#10B981" radius={[0, 0, 0, 0]} />
                                        <Bar dataKey="retardos" name="Retardos" stackId="a" fill="#F59E0B" />
                                        <Bar dataKey="faltas" name="Faltas" stackId="a" fill="#EF4444" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : selectedChartType === 'BY_PLANT' ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartDataByPlant} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                                        <XAxis dataKey="code" stroke="#475569" fontSize={11} />
                                        <YAxis stroke="#475569" fontSize={11} allowDecimals={false} />
                                        <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderRadius: '12px', color: '#0F172A', fontSize: '12px' }} />
                                        <Legend wrapperStyle={{ fontSize: '12px' }} />
                                        <Bar dataKey="aTiempo" name="A Tiempo" fill="#10B981" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="retardos" name="Retardos" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="faltas" name="Faltas" fill="#EF4444" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : selectedChartType === 'PAYROLL_HOURS' ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartDataByDate} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                                        <XAxis dataKey="date" stroke="#475569" fontSize={11} />
                                        <YAxis stroke="#475569" fontSize={11} unit="h" />
                                        <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderRadius: '12px', color: '#0F172A', fontSize: '12px' }} />
                                        <Legend wrapperStyle={{ fontSize: '12px' }} />
                                        <Area type="monotone" dataKey="horasOrdinarias" name="Horas Ordinarias" stackId="1" stroke="#2563EB" fill="#3B82F6" fillOpacity={0.25} />
                                        <Area type="monotone" dataKey="horasExtra" name="Horas Extra" stackId="1" stroke="#D97706" fill="#F59E0B" fillOpacity={0.35} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex flex-col sm:flex-row items-center justify-around">
                                    <div className="w-full sm:w-1/2 h-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={pieDistributionData} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={3} dataKey="value">
                                                    {pieDistributionData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                                    ))}
                                                </Pie>
                                                <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderRadius: '12px', color: '#0F172A', fontSize: '12px' }} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="space-y-2 text-xs pr-4">
                                        <h4 className="font-bold text-slate-900 text-sm">Verificación Porcentual (Suma = 100%)</h4>
                                        {pieDistributionData.map((item, idx) => (
                                            <div key={idx} className="flex items-center justify-between gap-6 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-sm">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></span>
                                                    <span className="text-slate-700 font-semibold">{item.name}</span>
                                                </div>
                                                <span className="font-mono font-bold text-slate-900">
                                                    {item.value} ({item.pct}%)
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
