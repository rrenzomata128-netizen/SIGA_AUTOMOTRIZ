import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from './lib/supabaseClient';
import { logAudit } from './lib/audit';
import { mapPlantRow, mapUserRow, mapAttendanceRow, toAttendancePayload } from './lib/mappers';
import { safeRound2, safePercentage, parseTimeToMinutes, formatMinutesToHHMM, parseShiftSchedule, evaluateAttendanceMetrics } from './lib/attendanceMetrics';

import LoginScreen from './components/LoginScreen';
import Toast from './components/Toast';
import TitleBar from './components/TitleBar';
import AdminMenuBar from './components/AdminMenuBar';
import Toolbar from './components/Toolbar';
import Sidebar from './components/Sidebar';
import GlobalFilters from './components/GlobalFilters';
import ExecutiveDashboard from './components/views/ExecutiveDashboard';
import PlantsMonitor from './components/views/PlantsMonitor';
import PayrollView from './components/views/PayrollView';
import ZeroSlackView from './components/views/ZeroSlackView';
import AuditLogView from './components/views/AuditLogView';
import AdminSettings from './components/views/AdminSettings';
import SupervisorValidation from './components/views/SupervisorValidation';
import SupervisorQr from './components/views/SupervisorQr';
import InspectorMobile from './components/views/InspectorMobile';
import StatusFooter from './components/StatusFooter';
import LftModal from './components/modals/LftModal';
import EmployeeDetailModal from './components/modals/EmployeeDetailModal';
import RecordModal from './components/modals/RecordModal';
import UserModal from './components/modals/UserModal';
import PlantModal from './components/modals/PlantModal';

export default function App() {
    // ========== AUTENTICACIÓN Y SESIÓN ==========
    const [currentUser, setCurrentUser] = useState(null);
    const [loginEmpNo, setLoginEmpNo] = useState('');
    const [loginPin, setLoginPin] = useState('');
    const [loginError, setLoginError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const [currentRole, setCurrentRole] = useState('admin');

    useEffect(() => {
        if (currentUser?.systemRole) {
            const role = currentUser.systemRole.toLowerCase();
            setCurrentRole(role === 'rh' ? 'admin' : role);
        }
    }, [currentUser]);

    // Pantallas dedicadas por rol
    const [activeTab, setActiveTab] = useState('executive');
    // Cambiar el valor por defecto para que inicie mostrando la comparativa de plantas
    const [selectedChartType, setSelectedChartType] = useState('BY_PLANT');
    const [plantMonitorSubTab, setPlantMonitorSubTab] = useState('DETAIL');

    // Parámetros financieros de RH para cálculo de Prenómina
    const [hourlyRateMXN, setHourlyRateMXN] = useState(85);
    const [overtimeMultiplier, setOvertimeMultiplier] = useState(2);

    // Estado para el Popup de confirmación al validar en Supervisor
    const [xpPopupModal, setXpPopupModal] = useState(null);
    // 🛡️ Estados para Justificación Obligatoria LFT / Fatiga
    const [lftModalData, setLftModalData] = useState(null);
    const [lftReasonCategory, setLftReasonCategory] = useState('Contención crítica solicitada por cliente (con PO)');
    const [lftDetailText, setLftDetailText] = useState('');

    // Filtros Globales de RH y Operaciones
    const [selectedPlantFilter, setSelectedPlantFilter] = useState('ALL');
    const [selectedShiftFilter, setSelectedShiftFilter] = useState('ALL');
    const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL');
    const [dateFilterType, setDateFilterType] = useState('TODAY');

    const getRelativeDateStr = (daysAgo) => {
        const d = new Date();
        d.setDate(d.getDate() - daysAgo);
        // Usar fecha local para evitar desfasamientos de día por zona horaria UTC
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const todayStr = getRelativeDateStr(0);
    const yesterdayStr = getRelativeDateStr(1);
    const [supervisorSelectedDate, setSupervisorSelectedDate] = useState(() => getRelativeDateStr(0));

    const [customStartDate, setCustomStartDate] = useState(() => getRelativeDateStr(6));
    const [customEndDate, setCustomEndDate] = useState(() => todayStr);
    const [searchQuery, setSearchQuery] = useState('');
    const [focusedPlantId, setFocusedPlantId] = useState(null);
    const [selectedEmployeeDetail, setSelectedEmployeeDetail] = useState(null);

    // Modal de Registro / Edición Manual para RH
    const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState(null);
    const [isZipModalOpen, setIsZipModalOpen] = useState(false);

    // ==========================================================================
    // ESTADOS DEL MÓDULO 6: ADMINISTRACIÓN DE USUARIOS, ROLES Y PLANTAS
    // ==========================================================================
    const [adminSubTab, setAdminSubTab] = useState('USERS');
    const [roleFilterAdmin, setRoleFilterAdmin] = useState('ALL');
    const [plantFilterAdmin, setPlantFilterAdmin] = useState('ALL');
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [isPlantModalOpen, setIsPlantModalOpen] = useState(false);
    const [editingPlant, setEditingPlant] = useState(null);

    // ==========================================================================
    // DATOS 100% EN SUPABASE (SIN DATOS LOCALES HARCODEADOS)
    // ==========================================================================
    const [plants, setPlants] = useState([]);
    const [systemUsers, setSystemUsers] = useState([]);
    const [attendanceRecords, setAttendanceRecords] = useState([]);

    const [toast, setToast] = useState(null);

    const showToast = useCallback((message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    }, []);

    // Funciones de recarga desde Supabase
    const fetchPlants = useCallback(async () => {
        const { data, error } = await supabase.from('plants').select('*').order('code', { ascending: true });
        if (error) {
            console.error('Error cargando plantas:', error);
            return;
        }
        if (data) setPlants(data.map(mapPlantRow));
    }, []);

    const fetchUsers = useCallback(async () => {
        const { data, error } = await supabase.from('system_users').select('*').order('emp_no', { ascending: true });
        if (error) {
            console.error('Error cargando usuarios:', error);
            return;
        }
        if (data) setSystemUsers(data.map(mapUserRow));
    }, []);

    const fetchAttendance = useCallback(async () => {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const { data, error } = await supabase
            .from('attendance_records')
            .select('*')
            .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
            .order('date', { ascending: false });

        if (error) {
            console.error('Error cargando asistencias:', error);
            return;
        }
        if (data) setAttendanceRecords(data.map(mapAttendanceRow));
    }, []);

    const handleShiftAbandonment = async (recordId, currentComments) => {
        const targetRecord = attendanceRecords.find(r => r.id === recordId);
        if (!targetRecord) return;

        const now = new Date().toTimeString().slice(0, 5);
        const cleanComment = (currentComments || '').replace(' [Validado por Supervisor]', '');

        const updated = {
            departure_time: now,
            status: 'Retardo', // O puedes mantener el estatus y agregar la incidencia
            incident_reason: 'Abandono de turno en planta',
            comments: `${cleanComment} [Abandono de turno registrado a las ${now}] [Validado por Supervisor]`,
            validated_by_supervisor: true
        };

        const { error } = await supabase.from('attendance_records').update(updated).eq('id', recordId);
        if (error) {
            showToast('Error al registrar abandono de turno en Supabase', 'error');
            console.error(error);
            return;
        }

        await logAudit(currentUser, 'SHIFT_ABANDONMENT', `Abandono de turno registrado para ${targetRecord.inspectorName} a las ${now}`, targetRecord.plantId);
        await fetchAttendance();
        showToast(`Se registró el abandono de turno a las ${now} y se bloqueó el registro.`);
    };

    // Cargar todos los datos desde Supabase cuando hay sesión activa
    useEffect(() => {
        if (!currentUser) return;

        const loadAllFromDatabase = async () => {
            setIsLoading(true);
            try {
                await Promise.all([fetchPlants(), fetchUsers(), fetchAttendance()]);
            } catch (err) {
                console.error('Error general cargando datos de Supabase:', err);
                showToast('Error al sincronizar datos desde Supabase', 'error');
            } finally {
                setIsLoading(false);
            }
        };

        loadAllFromDatabase();
    }, [currentUser, fetchPlants, fetchUsers, fetchAttendance, showToast]);

    // Suscripción Realtime en Supabase para plants, system_users y attendance_records
    useEffect(() => {
        if (!currentUser) return;

        const channel = supabase
            .channel('siga-realtime-all')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance_records' }, () => {
                fetchAttendance();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'system_users' }, () => {
                fetchUsers();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'plants' }, () => {
                fetchPlants();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [currentUser, fetchAttendance, fetchUsers, fetchPlants]);

    // 🏢 Plantas permitidas: Administrador y RH siempre tienen acceso total
    const allowedPlants = useMemo(() => {
        const plantList = plants || [];
        if (!currentUser) return plantList;

        // 1. Validar el rol estrictamente desde currentUser
        const userRole = (currentUser.systemRole || currentUser.system_role || currentUser.role || '').toUpperCase();
        const isAdminOrRh = userRole === 'ADMIN' || userRole === 'RH';

        // Si es Admin, RH o tiene Matriz explícita 'ALL', ve todo el clúster
        const rawAssigned = currentUser.plantId || currentUser.plant_id;
        if (isAdminOrRh || rawAssigned === 'ALL') {
            return plantList;
        }

        if (!rawAssigned) return [];

        // 2. Normalizar las plantas asignadas (separa por comas si viene como string)
        const userPlantKeys = (Array.isArray(rawAssigned)
            ? rawAssigned
            : String(rawAssigned).split(',')
        ).map(s => String(s).trim().toUpperCase()).filter(Boolean);

        // 3. Filtrar comparando tanto contra p.id como contra p.code
        const filtered = plantList.filter(p => {
            const pId = String(p.id || '').toUpperCase();
            const pCode = String(p.code || '').toUpperCase();
            return userPlantKeys.includes(pId) || userPlantKeys.includes(pCode);
        });

        // Si por alguna razón no coincidió ninguna, retorna al menos la lista filtrada
        return filtered.length > 0 ? filtered : [];
    }, [currentUser, plants]);


    // 👷 Padrón oficial de Inspectores filtrados desde systemUsers
    const inspectors = useMemo(() => {
        return (systemUsers || []).filter(u => {
            const role = (u.systemRole || u.system_role || u.role || '').toUpperCase();
            return role === 'INSPECTOR';
        });
    }, [systemUsers]);
    // 🔄 Ajustar automáticamente el filtro a la planta asignada del usuario

    useEffect(() => {
        if (!currentUser || allowedPlants.length === 0) return;

        const role = (currentUser.systemRole || currentUser.system_role || '').toUpperCase();
        const hasFullAccess = role === 'ADMIN' || role === 'RH' || currentUser.plantId === 'ALL' || currentUser.plant_id === 'ALL';

        // Si es supervisor y tiene seleccionado "ALL" o una planta a la que no tiene acceso
        if (!hasFullAccess) {
            const isAllowed = allowedPlants.some(p => p.id === selectedPlantFilter || p.code === selectedPlantFilter);
            if (selectedPlantFilter === 'ALL' || !isAllowed) {
                setSelectedPlantFilter(allowedPlants[0].id || allowedPlants[0].code);
            }
        }
    }, [currentUser, allowedPlants, selectedPlantFilter]);


    // Estado para simulador móvil del inspector
    const [selectedInspectorId, setSelectedInspectorId] = useState('');

    // Sincronizar automáticamente con el usuario logueado si es inspector/supervisor
    useEffect(() => {
        if (currentUser) {
            if (currentUser.systemRole === 'inspector' || currentUser.systemRole === 'SUPERVISOR') {
                setSelectedInspectorId(currentUser.id);
            } else if (inspectors.length > 0 && !selectedInspectorId) {
                setSelectedInspectorId(inspectors[0].id);
            }
        }
    }, [currentUser, inspectors, selectedInspectorId]);;

    // Estado para el Generador QR Dinámico con cuenta regresiva en vivo
    const [activeQrCode, setActiveQrCode] = useState({
        code: 'QR-AUTH-PLANTA-8941',
        secondsLeft: 60,
        plantId: ''
    });

    useEffect(() => {
        if (plants.length > 0 && !activeQrCode.plantId) {
            setActiveQrCode({
                plantId: plants[0].id,
                code: `QR-AUTH-${plants[0].code}-${Math.floor(1000 + Math.random() * 9000)}`,
                secondsLeft: 60
            });
        }
    }, [plants, activeQrCode.plantId]);

    const handleRoleChange = (role) => {
        setCurrentRole(role);
        if (role === 'admin') setActiveTab('executive');
        if (role === 'supervisor') setActiveTab('sup-validation');
        if (role === 'inspector') setActiveTab('inspector-mobile');
        showToast(`Sesión cambiada a: ${role === 'admin' ? 'RH y Dirección (Matriz)' : role === 'supervisor' ? 'Supervisor de Planta' : 'Terminal Móvil Inspector'}`);
    };

    // ⏱️ Temporizador optimizado: SOLO corre cuando la pantalla del QR está activa
    useEffect(() => {
        // Si no está en modo supervisor o la pestaña activa no es la del QR, no hacer nada
        if (currentRole !== 'supervisor' || activeTab !== 'sup-qr') return;

        const timer = setInterval(() => {
            setActiveQrCode(prev => {
                if (prev.secondsLeft <= 1) {
                    const plantCode = plants.find(p => p.id === prev.plantId)?.code || 'PLANTA';
                    return {
                        ...prev,
                        code: `QR-AUTH-${plantCode}-${Math.floor(1000 + Math.random() * 9000)}`,
                        secondsLeft: 60
                    };
                }
                return { ...prev, secondsLeft: prev.secondsLeft - 1 };
            });
        }, 1000);

        // Se limpia automáticamente al salir de la pestaña
        return () => clearInterval(timer);
    }, [plants, currentRole, activeTab]);

    // ==========================================================================
    // ACCIONES DE LA APP MÓVIL DEL INSPECTOR (100% PERSISTIDAS EN SUPABASE)
    // ==========================================================================
    const handleInspectorTransportCheckIn = async (inspectorId) => {
        const insp = inspectors.find(i => i.id === inspectorId);
        if (!insp) return;
        const now = new Date().toTimeString().slice(0, 5);

        // Buscamos si hay un registro de HOY que todavía esté activo (sin hora de salida)
        const activeExisting = attendanceRecords.find(r => r.inspectorId === inspectorId && r.date === todayStr && !r.departureTime);

        const primaryPlantId = Array.isArray(insp.plantId) ? insp.plantId[0] : insp.plantId;
        const plantName = plants.find(p => p.id === primaryPlantId)?.name || 'Planta';

        if (activeExisting) {
            // Si ya hay uno abierto, actualizamos ese
            const updatedFields = {
                transport_check_in: now,
                status: activeExisting.status === 'Falta' ? 'A tiempo' : activeExisting.status,
                comments: 'Check-in en transporte actualizado desde app móvil.'
            };

            const { error } = await supabase
                .from('attendance_records')
                .update(updatedFields)
                .eq('id', activeExisting.id);

            if (error) {
                showToast('Error al actualizar transporte en Supabase', 'error');
                console.error(error);
                return;
            }

            await logAudit(currentUser, 'TRANSPORT_CHECKIN', `Abordaje confirmado a las ${now} por ${insp.empNo}`, primaryPlantId);
            await fetchAttendance();
        } else {
            // Si ya cerró su turno anterior hoy, CREAMOS UNA NUEVA LÍNEA (Jornada Extra / Turno Adicional)
            const newRec = {
                id: `att-${Date.now()}`,
                inspectorId: insp.id,
                empNo: insp.empNo,
                inspectorName: insp.name,
                plantId: primaryPlantId,
                plantName,
                shift: insp.shift,
                date: todayStr,
                transportCheckIn: now,
                plantQrScan: '',
                departureTime: '',
                status: 'A tiempo',
                incidentReason: 'Turno Adicional / Jornada Extra Mismo Día',
                comments: 'Inicio de turno extra autorizado.',
                validatedBySupervisor: false,
                replacementStatus: 'No requerido'
            };

            const { error } = await supabase
                .from('attendance_records')
                .insert(toAttendancePayload(newRec));

            if (error) {
                showToast('Error al crear nuevo turno extra en Supabase', 'error');
                console.error(error);
                return;
            }

            await logAudit(currentUser, 'EXTRA_SHIFT_START', `Nuevo turno extra iniciado a las ${now} por ${insp.empNo}`, primaryPlantId);
            await fetchAttendance();
        }

        showToast(`Transporte confirmado a las ${now} para ${insp.name}`);
    };

    const handleInspectorQrScan = async (inspectorId) => {
        const insp = inspectors.find(i => i.id === inspectorId);
        if (!insp) return;
        const now = new Date().toTimeString().slice(0, 5);
        const schedule = parseShiftSchedule(insp.shift);
        const nowMins = parseTimeToMinutes(now);
        let diff = nowMins - schedule.startMinutes;
        if (diff < -720) diff += 1440;
        const computedStatus = diff > 5 ? 'Retardo' : 'A tiempo';

        const primaryPlantId = Array.isArray(insp.plantId) ? insp.plantId[0] : insp.plantId;
        const plantName = plants.find(p => p.id === primaryPlantId)?.name || 'Planta';

        // BUSCAR ESTRICTAMENTE EL REGISTRO ACTIVO DE HOY (QUE NO TENGA SALIDA Y NO ESTÉ BLOQUEADO)
        const activeExisting = attendanceRecords.find(
            r => r.inspectorId === inspectorId && r.date === todayStr && !r.departureTime && !r.validatedBySupervisor
        );

        if (activeExisting) {
            const updatedFields = {
                plant_qr_scan: now,
                status: computedStatus,
                incident_reason: computedStatus === 'Retardo' ? 'Ingreso posterior a hora de inicio' : 'Ninguno',
                comments: `QR Dinámico (${activeQrCode.code}) validado en línea.`
            };

            const { error } = await supabase
                .from('attendance_records')
                .update(updatedFields)
                .eq('id', activeExisting.id);

            if (error) {
                showToast('Error al registrar escaneo QR en Supabase', 'error');
                console.error(error);
                return;
            }

            await logAudit(currentUser, 'QR_SCAN_ENTRY', `QR escaneado a las ${now} (${computedStatus}) por ${insp.empNo}`, primaryPlantId);
            await fetchAttendance();
        } else {
            // Si por alguna razón no hay uno activo abierto, creamos una nueva línea limpia
            const newRec = {
                id: `att-${Date.now()}`,
                inspectorId: insp.id,
                empNo: insp.empNo,
                inspectorName: insp.name,
                plantId: primaryPlantId,
                plantName,
                shift: insp.shift,
                date: todayStr,
                transportCheckIn: now,
                plantQrScan: now,
                departureTime: '',
                status: computedStatus,
                incidentReason: computedStatus === 'Retardo' ? 'Ingreso posterior a hora de inicio' : 'Ninguno',
                comments: `QR Dinámico (${activeQrCode.code}) validado en línea.`,
                validatedBySupervisor: false,
                replacementStatus: 'No requerido'
            };

            const { error } = await supabase
                .from('attendance_records')
                .insert(toAttendancePayload(newRec));

            if (error) {
                showToast('Error al insertar escaneo QR en Supabase', 'error');
                console.error(error);
                return;
            }

            await logAudit(currentUser, 'QR_SCAN_ENTRY', `Ingreso directo con QR a las ${now} (${computedStatus}) por ${insp.empNo}`, primaryPlantId);
            await fetchAttendance();
        }

        showToast(`QR escaneado y guardado a las ${now} (${computedStatus})`);
    };

    const handleInspectorDeparture = async (inspectorId) => {
        const insp = inspectors.find(i => i.id === inspectorId);
        if (!insp) return;
        const now = new Date().toTimeString().slice(0, 5);

        // 🌙 BUSCAR TURNO ACTIVO ABIERTO (Tanto de HOY como de AYER para turnos nocturnos que cruzan medianoche)
        const activeExisting = attendanceRecords.find(
            r => r.inspectorId === inspectorId &&
                (r.date === todayStr || r.date === yesterdayStr) &&
                r.plantQrScan &&
                !r.departureTime
        );

        if (activeExisting) {
            const { error } = await supabase
                .from('attendance_records')
                .update({ departure_time: now })
                .eq('id', activeExisting.id);

            if (error) {
                showToast('Error al guardar hora de salida en Supabase', 'error');
                console.error(error);
                return;
            }

            await logAudit(currentUser, 'DEPARTURE_SCAN', `Salida registrada a las ${now} por ${insp.empNo} (Turno ${activeExisting.date})`, activeExisting.plantId);
            await fetchAttendance();
            showToast(`Salida guardada exitosamente a las ${now}. Jornada nocturna concluida.`);
        } else {
            showToast('No se encontró un turno activo con QR de entrada para registrar salida.', 'error');
        }
    };

    // Función para que el usuario suba su propia foto si no la tiene
    const handleUploadMyAvatar = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64Image = reader.result;

            // Actualizar en Supabase
            const { error } = await supabase
                .from('system_users')
                .update({ avatar_url: base64Image })
                .eq('id', currentUser.id);

            if (error) {
                showToast('Error al subir la fotografía', 'error');
                console.error(error);
                return;
            }

            // Actualizar estado local del usuario actual y la lista de usuarios
            setCurrentUser(prev => ({ ...prev, avatarUrl: base64Image }));
            await fetchUsers();
            showToast('¡Fotografía guardada exitosamente! Tu perfil ha quedado bloqueado.');
        };
        reader.readAsDataURL(file);
    };

    // ==========================================================================
    // VALIDACIÓN DEL SUPERVISOR Y ACCIONES OPERATIVAS EN SUPABASE
    // ==========================================================================
    const handleValidateAttendance = async (recordId, newStatus, reason, comments) => {
        const targetRecord = attendanceRecords.find(r => r.id === recordId);
        if (!targetRecord) return;

        if (targetRecord.validatedBySupervisor) {
            setXpPopupModal({
                title: 'SIGA.exe - Operación Bloqueada por Seguridad',
                type: 'warning',
                inspectorName: targetRecord.inspectorName,
                empNo: targetRecord.empNo,
                plantName: targetRecord.plantName,
                statusApplied: targetRecord.status,
                message: 'Este registro ya fue validado previamente por el supervisor. Por políticas de control e integridad de nómina, NO es posible validar nuevamente ni aplicar Retardo o Falta.'
            });
            return;
        }

        const cleanComment = (comments || '').replace(' [Validado por Supervisor]', '');
        const updated = {
            status: newStatus,
            plant_qr_scan: newStatus === 'Falta' ? '' : targetRecord.plantQrScan,
            departure_time: newStatus === 'Falta' ? '' : targetRecord.departureTime,
            incident_reason: reason,
            comments: `${cleanComment} [Validado por Supervisor]`,
            validated_by_supervisor: true
        };

        const { error } = await supabase.from('attendance_records').update(updated).eq('id', recordId);
        if (error) {
            showToast('Error al guardar validación en Supabase', 'error');
            console.error(error);
            return;
        }

        await logAudit(currentUser, 'VALIDATE_ATTENDANCE', `${newStatus} para ${targetRecord.inspectorName}`, targetRecord.plantId);
        await fetchAttendance();

        setXpPopupModal({
            title: 'SIGA.exe - Confirmación de Validación y Bloqueo de Turno',
            type: 'info',
            inspectorName: targetRecord.inspectorName,
            empNo: targetRecord.empNo,
            plantName: targetRecord.plantName,
            statusApplied: newStatus,
            message: `Se ha registrado la validación "${newStatus === 'A tiempo' ? 'Validar OK (A tiempo)' : newStatus}" para el colaborador en la base de datos. A partir de este momento el registro queda SELLADO y BLOQUEADO.`
        });
    };

    // Asignación de Inspector Comodín en Alertas Cero Holgura (Persistido en Supabase)
    const handleAssignBackup = async (recordId) => {
        const targetRecord = attendanceRecords.find(r => r.id === recordId);
        if (!targetRecord) return;

        const updatedFields = {
            replacement_status: 'Comodín Asignado (Brigada Reacción Matriz)',
            comments: `${targetRecord.comments} • Posición cubierta por brigada comodín.`
        };

        const { error } = await supabase
            .from('attendance_records')
            .update(updatedFields)
            .eq('id', recordId);

        if (error) {
            showToast('Error al asignar comodín en Supabase', 'error');
            console.error(error);
            return;
        }

        await logAudit(currentUser, 'ASSIGN_BACKUP', `Comodín asignado para cubrir a ${targetRecord.empNo}`, targetRecord.plantId);
        await fetchAttendance();
        showToast('Inspector comodín asignado y guardado en base de datos.');
    };

    // Filtro de periodo de fechas con normalización de rango invertido
    const normalizedDateRange = useMemo(() => {
        if (customStartDate <= customEndDate) {
            return { start: customStartDate, end: customEndDate };
        }
        return { start: customEndDate, end: customStartDate };
    }, [customStartDate, customEndDate]);

    const matchesDatePeriod = useCallback((recDate) => {
        if (currentRole === 'inspector') return recDate === todayStr;
        if (dateFilterType === 'TODAY') return recDate === todayStr;
        if (dateFilterType === 'YESTERDAY') return recDate === yesterdayStr;
        if (dateFilterType === 'LAST_7_DAYS') {
            const sevenDaysAgo = getRelativeDateStr(6);
            return recDate >= sevenDaysAgo && recDate <= todayStr;
        }
        if (dateFilterType === 'CUSTOM') {
            return recDate >= normalizedDateRange.start && recDate <= normalizedDateRange.end;
        }
        return true;
    }, [currentRole, dateFilterType, todayStr, yesterdayStr, normalizedDateRange]);

    // 1. Registros del periodo enriquecidos con el motor aritmético exacto
    const periodRecords = useMemo(() => {
        return attendanceRecords
            .filter(r => matchesDatePeriod(r.date))
            .map(r => {
                const metrics = evaluateAttendanceMetrics(r);
                const empInfo = systemUsers.find(i => i.id === r.inspectorId);
                return {
                    ...r,
                    empNo: r.empNo || empInfo?.empNo || 'NOM-GEN',
                    roleName: empInfo?.role || 'Inspector de Calidad',
                    ...metrics
                };
            });
    }, [attendanceRecords, matchesDatePeriod, systemUsers]);

    // 2. Registros filtrados por Planta, Turno, Estatus y Búsqueda
    const filteredRecords = useMemo(() => {
        // 🔒 Obtener plantas autorizadas para el supervisor en sesión
        const supervisorPlantIds = (currentRole === 'supervisor' && currentUser && currentUser.plantId !== 'ALL')
            ? (Array.isArray(currentUser.plantId) ? currentUser.plantId : [currentUser.plantId].filter(Boolean))
            : null;

        return periodRecords.filter(rec => {
            // 1. Filtro de Planta con segregación por rol
            const matchesPlant = supervisorPlantIds
                ? (selectedPlantFilter === 'ALL'
                    ? supervisorPlantIds.includes(rec.plantId)
                    : (rec.plantId === selectedPlantFilter && supervisorPlantIds.includes(rec.plantId)))
                : (selectedPlantFilter === 'ALL' || rec.plantId === selectedPlantFilter);

            // 2. Filtro de Turno
            const shiftText = rec.shift || '';
            const matchesShift =
                selectedShiftFilter === 'ALL' ||
                (selectedShiftFilter === 'T1' && shiftText.includes('Turno 1') && !shiftText.includes('18:00')) ||
                (selectedShiftFilter === 'T2' && shiftText.includes('Turno 2') && !shiftText.includes('06:00')) ||
                (selectedShiftFilter === 'T3' && shiftText.includes('Turno 3')) ||
                (selectedShiftFilter === '12H' && (shiftText.includes('12h') || shiftText.includes('06:00 - 18:00') || shiftText.includes('18:00 - 06:00')));

            // 3. Filtro de Estatus
            const matchesStatus = selectedStatusFilter === 'ALL' || rec.status === selectedStatusFilter;

            // 4. Búsqueda por texto (protegida contra valores nulos)
            const q = searchQuery.trim().toLowerCase();
            const matchesSearch = !q ||
                (rec.inspectorName && rec.inspectorName.toLowerCase().includes(q)) ||
                (rec.empNo && rec.empNo.toLowerCase().includes(q)) ||
                (rec.plantName && rec.plantName.toLowerCase().includes(q)) ||
                (rec.comments && rec.comments.toLowerCase().includes(q));

            return matchesPlant && matchesShift && matchesStatus && matchesSearch;
        });
    }, [periodRecords, selectedPlantFilter, selectedShiftFilter, selectedStatusFilter, searchQuery, currentRole, currentUser]);

    // 3. Totales Aritméticos Globales
    const globalMetrics = useMemo(() => {
        const totalRecords = filteredRecords.length;
        const onTimeCount = filteredRecords.filter(r => r.status === 'A tiempo').length;
        const lateCount = filteredRecords.filter(r => r.status === 'Retardo').length;
        const absentCount = filteredRecords.filter(r => r.status === 'Falta').length;
        const presentCount = onTimeCount + lateCount;
        const qrVerifiedCount = filteredRecords.filter(r => r.hasQrEntry).length;
        const transportBoardedCount = filteredRecords.filter(r => r.hasTransport).length;
        const supervisorValidatedCount = filteredRecords.filter(r => r.validatedBySupervisor).length;
        const lftViolationCount = filteredRecords.filter(r => r.overtimeHours > 3 || r.workedHoursDecimal > 12).length;

        const totalRegularMinutes = filteredRecords.reduce((acc, r) => acc + r.regularMinutes, 0);
        const totalOvertimeMinutes = filteredRecords.reduce((acc, r) => acc + r.overtimeMinutes, 0);
        const totalWorkedMinutes = totalRegularMinutes + totalOvertimeMinutes;
        const totalLateMinutes = filteredRecords.reduce((acc, r) => acc + r.lateMinutes, 0);

        const totalRegularHours = safeRound2(totalRegularMinutes / 60);
        const totalOvertimeHours = safeRound2(totalOvertimeMinutes / 60);
        const totalPayrollHours = safeRound2(totalRegularHours + totalOvertimeHours);

        const regularCostMXN = safeRound2(totalRegularHours * hourlyRateMXN);
        const overtimeCostMXN = safeRound2(totalOvertimeHours * hourlyRateMXN * overtimeMultiplier);
        const totalEstimatedPayrollMXN = safeRound2(regularCostMXN + overtimeCostMXN);

        const attendanceRatePct = safePercentage(presentCount, totalRecords, 1);
        const punctualityRatePct = safePercentage(onTimeCount, totalRecords, 1);
        const lateRatePct = safePercentage(lateCount, totalRecords, 1);
        const absenteeismRatePct = safePercentage(absentCount, totalRecords, 1);

        return {
            totalRecords,
            onTimeCount,
            lateCount,
            absentCount,
            presentCount,
            qrVerifiedCount,
            transportBoardedCount,
            supervisorValidatedCount,
            totalRegularMinutes,
            totalOvertimeMinutes,
            totalWorkedMinutes,
            totalLateMinutes,
            totalRegularHours,
            totalOvertimeHours,
            totalPayrollHours,
            totalFormattedHHMM: formatMinutesToHHMM(totalWorkedMinutes),
            regularCostMXN,
            overtimeCostMXN,
            totalEstimatedPayrollMXN,
            attendanceRatePct,
            punctualityRatePct,
            lateRatePct,
            absenteeismRatePct,
            lftViolationCount
        };
    }, [filteredRecords, hourlyRateMXN, overtimeMultiplier]);

    // 4. Concentrado de Prenómina por Empleado
    const payrollByInspector = useMemo(() => {
        const grouped = filteredRecords.reduce((acc, rec) => {
            if (!acc[rec.inspectorId]) {
                acc[rec.inspectorId] = {
                    inspectorId: rec.inspectorId,
                    empNo: rec.empNo,
                    inspectorName: rec.inspectorName,
                    roleName: rec.roleName,
                    plantName: rec.plantName,
                    shift: rec.shift,
                    daysScheduled: 0,
                    daysWorked: 0,
                    onTimeDays: 0,
                    lateDays: 0,
                    absentDays: 0,
                    totalLateMinutes: 0,
                    regularMinutes: 0,
                    overtimeMinutes: 0,
                    workedMinutes: 0,
                    sessions: []
                };
            }
            const emp = acc[rec.inspectorId];
            emp.daysScheduled += 1;
            if (rec.status !== 'Falta') emp.daysWorked += 1;
            if (rec.status === 'A tiempo') emp.onTimeDays += 1;
            if (rec.status === 'Retardo') emp.lateDays += 1;
            if (rec.status === 'Falta') emp.absentDays += 1;
            emp.totalLateMinutes += rec.lateMinutes;
            emp.regularMinutes += rec.regularMinutes;
            emp.overtimeMinutes += rec.overtimeMinutes;
            emp.workedMinutes += rec.workedMinutes;
            emp.sessions.push(rec);
            return acc;
        }, {});

        // Ordenar las sesiones cronológicamente según el orden en que fueron guardadas
        Object.values(grouped).forEach(emp => {
            emp.sessions.sort((a, b) => a.id.localeCompare(b.id));
        });

        return Object.values(grouped).map(emp => {
            // ⚖️ Detección de jornadas que violan la LFT (>3h extra o >12h jornada)
            const lftRiskSessions = emp.sessions.filter(s => s.overtimeHours > 3 || s.workedHoursDecimal > 12);
            const hasLftRisk = lftRiskSessions.length > 0;
            const totalLftRiskCount = lftRiskSessions.length;
            const uniqueWorkedDays = new Set(emp.sessions.filter(s => s.status !== 'Falta').map(s => s.date)).size;
            const uniqueScheduledDays = new Set(emp.sessions.map(s => s.date)).size;

            const totalRegularHours = safeRound2(emp.regularMinutes / 60);
            const totalOvertimeHours = safeRound2(emp.overtimeMinutes / 60);
            const totalHours = safeRound2(totalRegularHours + totalOvertimeHours);
            const regularPay = safeRound2(totalRegularHours * hourlyRateMXN);
            const overtimePay = safeRound2(totalOvertimeHours * hourlyRateMXN * overtimeMultiplier);
            const totalPayMXN = safeRound2(regularPay + overtimePay);

            return {
                ...emp,
                hasLftRisk,
                totalLftRiskCount,
                daysScheduled: uniqueScheduledDays,
                daysWorked: uniqueWorkedDays,
                totalRegularHours,
                totalOvertimeHours,
                totalHours,
                formattedTotalHHMM: formatMinutesToHHMM(emp.workedMinutes),
                regularPay,
                overtimePay,
                totalPayMXN,
                attendancePct: safePercentage(uniqueWorkedDays, uniqueScheduledDays, 0)
            };
        });
    }, [filteredRecords, hourlyRateMXN, overtimeMultiplier]);

    // 5. Estadísticas por Modalidad de Turno
    const shiftCategories = [
        { key: 'T1', label: 'Turno 1 (Matutino 8h)', horario: '06:00 - 14:30', matcher: (s) => s.includes('Turno 1') && !s.includes('18:00') },
        { key: 'T2', label: 'Turno 2 (Vespertino 8h)', horario: '14:00 - 22:30', matcher: (s) => s.includes('Turno 2') && !s.includes('06:00') },
        { key: 'T3', label: 'Turno 3 (Nocturno 8h)', horario: '22:00 - 06:30', matcher: (s) => s.includes('Turno 3') },
        { key: '12H', label: 'Turnos Especiales 12h', horario: '06:00 - 18:00 / 18:00 - 06:00', matcher: (s) => s.includes('12h') || s.includes('06:00 - 18:00') || s.includes('18:00 - 06:00') }
    ];

    const shiftStats = useMemo(() => {
        return shiftCategories.map(cat => {
            const recs = periodRecords.filter(r => (selectedPlantFilter === 'ALL' || r.plantId === selectedPlantFilter) && cat.matcher(r.shift));
            const onTime = recs.filter(r => r.status === 'A tiempo').length;
            const late = recs.filter(r => r.status === 'Retardo').length;
            const absent = recs.filter(r => r.status === 'Falta').length;
            const total = recs.length;
            const regMins = recs.reduce((sum, r) => sum + r.regularMinutes, 0);
            const extMins = recs.reduce((sum, r) => sum + r.overtimeMinutes, 0);
            const totalHours = safeRound2(safeRound2(regMins / 60) + safeRound2(extMins / 60));
            const attendanceRate = total > 0 ? safePercentage(onTime + late, total, 0) : 100;
            return { ...cat, total, onTime, late, absent, totalHours, attendanceRate };
        });
    }, [periodRecords, selectedPlantFilter]);

    // 6. Estadísticas por Planta Cliente
    const plantMonitorStats = useMemo(() => {
        return plants
            .filter(p => selectedPlantFilter === 'ALL' || p.id === selectedPlantFilter)
            .map(plant => {
                const recs = periodRecords.filter(r => r.plantId === plant.id);
                const onTime = recs.filter(r => r.status === 'A tiempo').length;
                const late = recs.filter(r => r.status === 'Retardo').length;
                const absent = recs.filter(r => r.status === 'Falta').length;
                const presentTotal = onTime + late;
                const totalRecorded = recs.length;
                const qrScanned = recs.filter(r => r.hasQrEntry).length;
                const validated = recs.filter(r => r.validatedBySupervisor).length;

                const regMins = recs.reduce((s, r) => s + r.regularMinutes, 0);
                const extMins = recs.reduce((s, r) => s + r.overtimeMinutes, 0);
                const plantRegularHours = safeRound2(regMins / 60);
                const plantOvertimeHours = safeRound2(extMins / 60);
                const plantHours = safeRound2(plantRegularHours + plantOvertimeHours);

                const byShift = (plant.shifts || []).map(sh => {
                    const shRecs = recs.filter(r => r.shift === sh);
                    const shReg = shRecs.reduce((s, r) => s + r.regularMinutes, 0);
                    const shExt = shRecs.reduce((s, r) => s + r.overtimeMinutes, 0);
                    const shHours = safeRound2(safeRound2(shReg / 60) + safeRound2(shExt / 60));
                    return {
                        shiftName: sh,
                        total: shRecs.length,
                        onTime: shRecs.filter(r => r.status === 'A tiempo').length,
                        late: shRecs.filter(r => r.status === 'Retardo').length,
                        absent: shRecs.filter(r => r.status === 'Falta').length,
                        shHours
                    };
                });

                const healthStatus = absent > 0 ? 'critical' : late > 0 ? 'warning' : 'optimal';
                const compliancePct = totalRecorded > 0 ? safePercentage(presentTotal, totalRecorded, 0) : 100;
                const onTimeBarPct = totalRecorded > 0 ? safePercentage(onTime, totalRecorded, 2) : 100;
                const lateBarPct = totalRecorded > 0 ? safePercentage(late, totalRecorded, 2) : 0;
                const absentBarPct = totalRecorded > 0 ? Math.max(0, safeRound2(100 - onTimeBarPct - lateBarPct)) : 0;

                return {
                    ...plant,
                    records: recs,
                    onTime,
                    late,
                    absent,
                    presentTotal,
                    totalRecorded,
                    qrScanned,
                    validated,
                    plantRegularHours,
                    plantOvertimeHours,
                    plantHours,
                    byShift,
                    healthStatus,
                    compliancePct,
                    onTimeBarPct,
                    lateBarPct,
                    absentBarPct
                };
            });
    }, [plants, periodRecords, selectedPlantFilter]);

    // 7. Datasets para el Centro de Gráficas
    const chartDataByDate = useMemo(() => {
        const grouped = filteredRecords.reduce((acc, rec) => {
            if (!acc[rec.date]) {
                acc[rec.date] = {
                    date: rec.date,
                    aTiempo: 0,
                    retardos: 0,
                    faltas: 0,
                    regMins: 0,
                    extMins: 0
                };
            }
            if (rec.status === 'A tiempo') acc[rec.date].aTiempo += 1;
            if (rec.status === 'Retardo') acc[rec.date].retardos += 1;
            if (rec.status === 'Falta') acc[rec.date].faltas += 1;
            acc[rec.date].regMins += rec.regularMinutes;
            acc[rec.date].extMins += rec.overtimeMinutes;
            return acc;
        }, {});

        return Object.values(grouped)
            .map(d => {
                const horasOrdinarias = safeRound2(d.regMins / 60);
                const horasExtra = safeRound2(d.extMins / 60);
                return {
                    ...d,
                    horasOrdinarias,
                    horasExtra,
                    horasTotales: safeRound2(horasOrdinarias + horasExtra)
                };
            })
            .sort((a, b) => a.date.localeCompare(b.date));
    }, [filteredRecords]);

    const chartDataByPlant = useMemo(() => {
        return plantMonitorStats
            .filter(p => p.totalRecorded > 0)
            .map(p => ({
                code: p.code,
                name: p.name,
                aTiempo: p.onTime,
                retardos: p.late,
                faltas: p.absent,
                horasPlanta: p.plantHours
            }));
    }, [plantMonitorStats]);

    const pieDistributionData = useMemo(() => {
        return [
            { name: 'A Tiempo (Puntual)', value: globalMetrics.onTimeCount, pct: globalMetrics.punctualityRatePct, color: '#2E8B57' },
            { name: 'Retardos', value: globalMetrics.lateCount, pct: globalMetrics.lateRatePct, color: '#D97706' },
            { name: 'Faltas (Cero Holgura)', value: globalMetrics.absentCount, pct: globalMetrics.absenteeismRatePct, color: '#DC2626' }
        ].filter(d => d.value > 0);
    }, [globalMetrics]);

    // ==========================================================================
    // CAPTURA / EDICIÓN MANUAL DE ASISTENCIA DESDE RH (PERSISTIDO EN SUPABASE)
    // ==========================================================================
    const handleSaveManualRecord = async (e) => {
        e.preventDefault();
        if (!editingRecord) return;
        const insp = inspectors.find(i => i.id === editingRecord.inspectorId) || inspectors[0];
        const plantObj = plants.find(p => p.id === editingRecord.plantId) || plants[0];

        if (!insp || !plantObj) {
            showToast('Faltan catálogos de inspector o planta en la base de datos.', 'error');
            return;
        }

        const formattedRec = {
            ...editingRecord,
            empNo: insp.empNo,
            inspectorName: insp.name,
            plantName: plantObj.name,
            plantQrScan: editingRecord.status === 'Falta' ? '' : editingRecord.plantQrScan,
            departureTime: editingRecord.status === 'Falta' ? '' : editingRecord.departureTime,
            validatedBySupervisor: true
        };

        const { error } = await supabase
            .from('attendance_records')
            .upsert(toAttendancePayload(formattedRec));

        if (error) {
            showToast('Error al guardar el registro manual en Supabase', 'error');
            console.error(error);
            return;
        }

        await logAudit(currentUser, 'MANUAL_ATTENDANCE_SAVE', `Registro ${formattedRec.id} (${formattedRec.status}) para ${formattedRec.empNo}`, formattedRec.plantId);
        await fetchAttendance();

        showToast(`Registro de ${formattedRec.inspectorName} guardado en Supabase.`);
        setIsRecordModalOpen(false);
        setEditingRecord(null);
    };

    // ==========================================================================
    // FUNCIONES CRUD DE USUARIOS Y DESBLOQUEO (100% EN SUPABASE)
    // ==========================================================================
    const handleOpenNewUserModal = (defaultRole = 'INSPECTOR') => {
        const firstPlant = plants[0];
        const nextNumber = 1041 + systemUsers.length;
        const prefix = defaultRole === 'ADMIN' ? 'ADM' : defaultRole === 'RH' ? 'RH' : defaultRole === 'SUPERVISOR' ? 'SUP' : 'NOM';
        setEditingUser({
            id: `usr-${Date.now()}`,
            empNo: `${prefix}-${nextNumber}`,
            name: '',
            systemRole: defaultRole,
            role: defaultRole === 'ADMIN' ? 'Administrador de Sistema' : defaultRole === 'RH' ? 'Analista de Recursos Humanos' : defaultRole === 'SUPERVISOR' ? 'Supervisor de Turno en Planta' : 'Inspector de Calidad y Sorteo',
            plantId: (defaultRole === 'ADMIN' || defaultRole === 'RH') ? 'ALL' : [firstPlant?.id || 'p1'],
            shift: defaultRole === 'ADMIN' || defaultRole === 'RH' ? 'Horario Matriz (08:00 - 17:30)' : (firstPlant?.shifts?.[0] || 'Turno 1 (06:00 - 14:30)'),
            phone: '844-',
            pin: String(Math.floor(1000 + Math.random() * 9000)),
            active: true,
            allowTerminalSwitch: false,
            avatarUrl: '', // Campo para la foto
            createTodayAttendance: defaultRole === 'INSPECTOR',
            isNew: true
        });
        setIsUserModalOpen(true);
    };

    const handleSaveUser = async (e) => {
        if (e) e.preventDefault();
        if (!editingUser) return;

        // 1. Validaciones requeridas
        const empNoClean = (editingUser.empNo || editingUser.emp_no || '').trim();
        const nameClean = (editingUser.name || '').trim();

        if (!empNoClean || !nameClean) {
            showToast('El No. de Nómina y el Nombre son obligatorios.', 'error');
            return;
        }

        try {

            // 2. Normalización de plantas asignadas (Deduplicación automática)
            let plantAssignment = editingUser.plantId || editingUser.plant_id;
            const rawList = Array.isArray(plantAssignment)
                ? plantAssignment
                : String(plantAssignment || '').split(',');

            // Deduplicar estrictamente
            const cleanList = [...new Set(rawList.map(s => String(s).trim().toUpperCase()).filter(Boolean))];
            plantAssignment = cleanList.join(', ');

            if (!plantAssignment) {
                plantAssignment = plants.length > 0 ? (plants[0].code || plants[0].id) : 'BW-SM';
            }

            // 3. Normalizar puesto / cargo (captura position, role, puesto o cargo)
            const positionClean = (
                editingUser.position ||
                editingUser.role ||
                editingUser.puesto ||
                editingUser.cargo ||
                ''
            ).trim() || (editingUser.systemRole === 'SUPERVISOR' ? 'Supervisor de Planta' : 'Inspector de Calidad');

            // 4. Estructuración del payload para Supabase
            const payload = {
                emp_no: empNoClean,
                name: nameClean,
                position: positionClean,
                system_role: (editingUser.systemRole || editingUser.system_role || 'SUPERVISOR').toUpperCase(),
                plant_id: plantAssignment,
                shift: editingUser.shift || 'Turno 1 (06:00 - 14:30)',
                phone: editingUser.phone || '',
                pin: editingUser.pin || '2001',
                photo_url: editingUser.photoUrl || editingUser.photo_url || '',
                status: editingUser.status || 'ACTIVO'
            };

            // 5. Verificar si el usuario ya existe en Supabase
            const { data: existingUser } = await supabase
                .from('system_users')
                .select('id, emp_no')
                .eq('emp_no', empNoClean)
                .maybeSingle();

            let resultData = null;
            let newGeneratedId = null;

            if (existingUser) {
                // 🔄 ACTUALIZACIÓN (UPDATE)
                const { data, error } = await supabase
                    .from('system_users')
                    .update(payload)
                    .eq('emp_no', empNoClean)
                    .select();

                if (error) {
                    console.error('Error al actualizar en Supabase:', error);
                    showToast(`Error al actualizar: ${error.message}`, 'error');
                    return;
                }
                resultData = data;
            } else {
                // ➕ ALTA NUEVA (INSERT)
                newGeneratedId = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `usr-${Date.now()}`;
                const insertPayload = {
                    id: newGeneratedId,
                    ...payload
                };

                const { data, error } = await supabase
                    .from('system_users')
                    .insert([insertPayload])
                    .select();

                if (error) {
                    console.error('Error al insertar en Supabase:', error);
                    showToast(`Error al crear usuario: ${error.message}`, 'error');
                    return;
                }
                resultData = data;
            }

            // 6. Registro en bitácora de auditoría
            await logAudit(
                currentUser,
                existingUser ? 'USER_UPDATED' : 'USER_CREATED',
                `Colaborador ${payload.name} (${payload.emp_no}) ${existingUser ? 'actualizado' : 'registrado'} con rol ${payload.system_role}.`,
                plantAssignment
            );

            // 7. Actualización reactiva instantánea en la interfaz
            setSystemUsers(prev => {
                const list = prev || [];
                const exists = list.some(u => (u.empNo || u.emp_no) === payload.emp_no);
                if (exists) {
                    return list.map(u => (u.empNo || u.emp_no) === payload.emp_no
                        ? {
                            ...u,
                            ...payload,
                            position: positionClean,
                            role: positionClean,
                            puesto: positionClean,
                            empNo: payload.emp_no,
                            systemRole: payload.system_role,
                            plantId: payload.plant_id,
                            photoUrl: payload.photo_url
                        }
                        : u
                    );
                }
                return [...list, {
                    id: resultData?.[0]?.id || newGeneratedId || `usr-${Date.now()}`,
                    ...payload,
                    position: positionClean,
                    role: positionClean,
                    puesto: positionClean,
                    empNo: payload.emp_no,
                    systemRole: payload.system_role,
                    plantId: payload.plant_id,
                    photoUrl: payload.photo_url
                }];
            });

            // 8. Cierre de modal y confirmación
            setIsUserModalOpen(false);
            setEditingUser(null);
            showToast(`Usuario ${payload.name} guardado correctamente.`);
        } catch (err) {
            console.error('Error inesperado en handleSaveUser:', err);
            showToast('Ocurrió un error inesperado al procesar el usuario.', 'error');
        }
    };

    const handleToggleUserStatus = async (userId) => {
        // 1. Ubicar al usuario
        const targetUser = (systemUsers || []).find(u => u.id === userId || u.empNo === userId || u.emp_no === userId);
        if (!targetUser) return;

        const empNo = targetUser.empNo || targetUser.emp_no;
        const currentIsActive = targetUser.active !== undefined
            ? targetUser.active
            : (targetUser.status === 'ACTIVO');

        const nextStatus = currentIsActive ? 'BAJA' : 'ACTIVO';
        const nextActive = !currentIsActive;

        // 2. Actualizar en Supabase en la columna oficial 'status'
        const { error } = await supabase
            .from('system_users')
            .update({ status: nextStatus })
            .eq('emp_no', empNo);

        if (error) {
            showToast(`Error al actualizar estatus: ${error.message}`, 'error');
            console.error('Error en Supabase:', error);
            return;
        }

        // 3. Refrescar la pantalla de inmediato en React
        setSystemUsers(prev => (prev || []).map(u => {
            if ((u.empNo || u.emp_no) === empNo) {
                return {
                    ...u,
                    status: nextStatus,
                    active: nextActive
                };
            }
            return u;
        }));

        showToast(`Colaborador ${targetUser.name} marcado como ${nextStatus}.`);
    };

    const handleDeleteUser = async (user) => {
        const empNo = user.empNo || user.emp_no;
        const confirmDelete = window.confirm(
            `¿Estás seguro de eliminar permanentemente a ${user.name} (${empNo})?\nEsta acción no se puede deshacer.`
        );
        if (!confirmDelete) return;

        try {
            const { error } = await supabase
                .from('system_users')
                .delete()
                .eq('emp_no', empNo);

            if (error) {
                console.error('Error al eliminar en Supabase:', error);
                showToast(`Error al eliminar: ${error.message}`, 'error');
                return;
            }

            // Actualizar la vista de inmediato
            setSystemUsers(prev => (prev || []).filter(u => (u.empNo || u.emp_no) !== empNo));
            showToast(`Usuario ${user.name} eliminado definitivamente.`);
        } catch (err) {
            console.error('Error al intentar eliminar:', err);
            showToast('Ocurrió un error al intentar eliminar el registro.', 'error');
        }
    };

    // Llave Maestra del Administrador: Desbloquear validación en Supabase
    const handleAdminUnlockRecord = async (recordId) => {
        const targetRecord = attendanceRecords.find(r => r.id === recordId);
        if (!targetRecord) return;

        const newComments = `${(targetRecord.comments || '').replace(' [Validado por Supervisor]', '')} [Desbloqueado por Administrador]`;

        const { error } = await supabase
            .from('attendance_records')
            .update({
                validated_by_supervisor: false,
                comments: newComments
            })
            .eq('id', recordId);

        if (error) {
            showToast('Error al desbloquear registro en Supabase', 'error');
            console.error(error);
            return;
        }

        await logAudit(currentUser, 'UNLOCK_ATTENDANCE', `Registro ${recordId} de ${targetRecord.empNo} desbloqueado por Admin`, targetRecord.plantId);
        await fetchAttendance();
        showToast('Candado de supervisor liberado en Supabase. El registro puede volver a validarse.');
    };

    // ==========================================================================
    // FUNCIONES CRUD PARA PLANTAS CLIENTES (100% EN SUPABASE)
    // ==========================================================================
    const handleOpenNewPlantModal = () => {
        setEditingPlant({
            id: `p-${Date.now()}`,
            code: '',
            name: '',
            supervisor: '',
            requiredHeadcount: 2,
            activeLines: '',
            shiftScheme: '3X8',
            shiftsText: 'Turno 1 (06:00 - 14:30), Turno 2 (14:00 - 22:30), Turno 3 (22:00 - 06:30)',
            isNew: true
        });
        setIsPlantModalOpen(true);
    };
    const handleSavePlant = async (e) => {
        if (e && e.preventDefault) e.preventDefault();

        if (!editingPlant) return;

        const cleanCode = String(editingPlant.code || '').trim().toUpperCase();
        const cleanName = String(editingPlant.name || '').trim();

        if (!cleanCode || !cleanName) {
            showToast('Por favor ingresa el Código Corto y el Nombre de la Planta.', 'error');
            return;
        }

        try {
            const rawShiftsText = editingPlant.shiftsText || (Array.isArray(editingPlant.shifts) ? editingPlant.shifts.join(', ') : '');
            const parsedShifts = rawShiftsText
                .split(',')
                .map(s => s.trim())
                .filter(Boolean);

            const plantData = {
                id: editingPlant.id || `p-${Date.now()}`,
                code: cleanCode,
                name: cleanName,
                supervisor: String(editingPlant.supervisor || '').trim() || 'Por Asignar',
                requiredHeadcount: Math.max(1, parseInt(editingPlant.requiredHeadcount, 10) || 1),
                activeLines: String(editingPlant.activeLines || '').trim() || 'Inspección y Sorteo de Calidad',
                shifts: parsedShifts.length > 0 ? parsedShifts : ['Turno 1 (06:00 - 14:30)']
            };

            const payload = {
                id: plantData.id,
                code: plantData.code,
                name: plantData.name,
                supervisor: plantData.supervisor,
                required_headcount: plantData.requiredHeadcount,
                shifts: plantData.shifts,
                active_lines: plantData.activeLines
            };

            const { error: dbError } = await supabase
                .from('plants')
                .upsert(payload, { onConflict: 'id' });

            if (dbError) {
                // Respaldo por si la columna shifts en BD es de tipo texto simple
                const retry = await supabase
                    .from('plants')
                    .upsert({ ...payload, shifts: JSON.stringify(plantData.shifts) }, { onConflict: 'id' });

                if (retry.error) {
                    showToast(`Error Supabase (${retry.error.code}): ${retry.error.message}`, 'error');
                    console.error('Error al guardar planta:', retry.error);
                    return;
                }
            }

            await fetchPlants();
            setIsPlantModalOpen(false);
            setEditingPlant(null);
            logAudit(currentUser, 'SAVE_PLANT', `Planta ${plantData.code} guardada`, plantData.id).catch(() => { });
            showToast(`Planta ${plantData.code} guardada en Supabase correctamente.`);
        } catch (err) {
            console.error('Excepción en handleSavePlant:', err);
            showToast(`Error inesperado: ${err.message}`, 'error');
        }
    };

    // Exportación real de CSV para RH
    const handleExportPayrollCSV = async () => {
        const headers = ['No_Nomina', 'Inspector', 'Planta', 'Turno', 'Dias_Programados', 'Dias_Laborados', 'Retardos', 'Faltas', 'Minutos_Retardo', 'Horas_Ordinarias', 'Horas_Extra', 'Total_Horas_Nomina', 'Importe_Estimado_MXN'];
        const rows = payrollByInspector.map(emp => [
            emp.empNo,
            `"${emp.inspectorName}"`,
            `"${emp.plantName}"`,
            `"${emp.shift}"`,
            emp.daysScheduled,
            emp.daysWorked,
            emp.lateDays,
            emp.absentDays,
            emp.totalLateMinutes,
            emp.totalRegularHours,
            emp.totalOvertimeHours,
            emp.totalHours,
            emp.totalPayMXN
        ].join(','));
        const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `Prenomina_Automotriz_${todayStr}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        await logAudit(currentUser, 'EXPORT_PAYROLL_CSV', `Exportación de prenómina (${payrollByInspector.length} registros)`);
        showToast('Archivo CSV de Prenómina descargado correctamente.');
    };

    return (
        <div
            className="min-h-screen bg-gradient-to-br from-slate-200 via-blue-50 to-indigo-100 p-2 sm:p-4 flex flex-col select-none"
            style={{ fontFamily: '"Segoe UI Variable", "Segoe UI", system-ui, -apple-system, sans-serif' }}
        >
            {/* ========== PANTALLA DE LOGIN ========== */}
            {!currentUser && (
    <LoginScreen
        setCurrentUser={setCurrentUser}
        loginEmpNo={loginEmpNo}
        setLoginEmpNo={setLoginEmpNo}
        loginPin={loginPin}
        setLoginPin={setLoginPin}
        loginError={loginError}
        setLoginError={setLoginError}
    />
)}

            {/* ========== APLICACIÓN PRINCIPAL (solo si hay sesión) ========== */}
            {currentUser && (
                <>
                    <div className="flex-1 flex flex-col bg-[#F3F3F3] text-slate-900 border border-slate-300/90 rounded-2xl shadow-[0_20px_60px_rgba(15,23,42,0.18)] overflow-hidden max-w-[1600px] w-full mx-auto backdrop-blur-xl">

                        {/* Notificación Flotante Estilo Windows 11 Toast Notification */}
                        {toast && (
    <Toast toast={toast} />
)}

                        {/* BARRA DE TÍTULO MODERNA WINDOWS 11 */}
                        <TitleBar
    currentUser={currentUser}
    setCurrentUser={setCurrentUser}
    setLoginEmpNo={setLoginEmpNo}
    setLoginPin={setLoginPin}
    showToast={showToast}
/>

                        {/* BARRA DE MENÚS Y ESTADO CRIPTOGRÁFICO ESTILO WINUI 3 (Solo Administrador) */}
                        {currentUser.systemRole === 'ADMIN' && (
    <AdminMenuBar
        setCurrentRole={setCurrentRole}
        setActiveTab={setActiveTab}
        setAdminSubTab={setAdminSubTab}
        plants={plants}
    />
)}

                        {/* BARRA DE HERRAMIENTAS PRINCIPAL Y SELECTOR DE MODO DE TERMINAL */}
                        <Toolbar currentUser={currentUser} currentRole={currentRole} handleRoleChange={handleRoleChange} />

                        {/* CUERPO PRINCIPAL: NAVIGATIONVIEW + ÁREA DE CONTENIDO */}
                        <div className="flex-1 flex flex-col lg:flex-row bg-[#F3F3F3] overflow-hidden">

                            {/* BARRA LATERAL */}
                            <Sidebar
    currentRole={currentRole}
    activeTab={activeTab}
    setActiveTab={setActiveTab}
    todayStr={todayStr}
    setIsRecordModalOpen={setIsRecordModalOpen}
    setEditingRecord={setEditingRecord}
    plants={plants}
    systemUsers={systemUsers}
    showToast={showToast}
    inspectors={inspectors}
    globalMetrics={globalMetrics}
/>

                            {/* ÁREA DE TRABAJO CENTRAL */}
                            <main className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-5 bg-[#F3F3F3]">

                                {/* BARRA GLOBAL DE FILTROS */}
                                {currentRole === 'admin' && activeTab !== 'admin-settings' && (
    <GlobalFilters
        currentUser={currentUser}
        selectedPlantFilter={selectedPlantFilter}
        setSelectedPlantFilter={setSelectedPlantFilter}
        selectedShiftFilter={selectedShiftFilter}
        setSelectedShiftFilter={setSelectedShiftFilter}
        selectedStatusFilter={selectedStatusFilter}
        setSelectedStatusFilter={setSelectedStatusFilter}
        dateFilterType={dateFilterType}
        setDateFilterType={setDateFilterType}
        todayStr={todayStr}
        yesterdayStr={yesterdayStr}
        customStartDate={customStartDate}
        setCustomStartDate={setCustomStartDate}
        customEndDate={customEndDate}
        setCustomEndDate={setCustomEndDate}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        plants={plants}
        allowedPlants={allowedPlants}
        globalMetrics={globalMetrics}
    />
)}

                                {/* PANTALLA 1: RESUMEN EJECUTIVO Y ANALÍTICA */}
                                {currentRole === 'admin' && activeTab === 'executive' && (
    <ExecutiveDashboard
        selectedChartType={selectedChartType}
        setSelectedChartType={setSelectedChartType}
        selectedShiftFilter={selectedShiftFilter}
        setSelectedShiftFilter={setSelectedShiftFilter}
        filteredRecords={filteredRecords}
        globalMetrics={globalMetrics}
        shiftStats={shiftStats}
        chartDataByDate={chartDataByDate}
        chartDataByPlant={chartDataByPlant}
        pieDistributionData={pieDistributionData}
    />
)}

                                {/* PANTALLA 2: MONITOR DEDICADO POR PLANTA CLIENTE */}
                                {currentRole === 'admin' && activeTab === 'plants-monitor' && (
    <PlantsMonitor
        plantMonitorSubTab={plantMonitorSubTab}
        setPlantMonitorSubTab={setPlantMonitorSubTab}
        focusedPlantId={focusedPlantId}
        setFocusedPlantId={setFocusedPlantId}
        plants={plants}
        plantMonitorStats={plantMonitorStats}
    />
)}

                                {/* PANTALLA 3: PRENÓMINA Y CONTROL DE HORAS */}
                                {currentRole === 'admin' && activeTab === 'hr-payroll' && (
    <PayrollView
        hourlyRateMXN={hourlyRateMXN}
        setHourlyRateMXN={setHourlyRateMXN}
        overtimeMultiplier={overtimeMultiplier}
        setSelectedEmployeeDetail={setSelectedEmployeeDetail}
        globalMetrics={globalMetrics}
        payrollByInspector={payrollByInspector}
        handleExportPayrollCSV={handleExportPayrollCSV}
    />
)}

                                {/* PANTALLA 4: ALERTAS CERO HOLGURA Y REEMPLAZOS */}
                                {currentRole === 'admin' && activeTab === 'zero-slack' && (
    <ZeroSlackView handleAssignBackup={handleAssignBackup} filteredRecords={filteredRecords} globalMetrics={globalMetrics} />
)}

                                {/* PANTALLA 5: BITÁCORA MAESTRA DE AUDITORÍA Y TRAZABILIDAD */}
                                {currentRole === 'admin' && activeTab === 'audit-log' && (
    <AuditLogView
        todayStr={todayStr}
        setIsRecordModalOpen={setIsRecordModalOpen}
        setEditingRecord={setEditingRecord}
        plants={plants}
        showToast={showToast}
        inspectors={inspectors}
        filteredRecords={filteredRecords}
        handleAdminUnlockRecord={handleAdminUnlockRecord}
    />
)}

                                {/* PANTALLA 6: CENTRO DE ADMINISTRACIÓN DE USUARIOS, ROLES Y PLANTAS */}
                                {currentRole === 'admin' && activeTab === 'admin-settings' && (
    <AdminSettings
        adminSubTab={adminSubTab}
        setAdminSubTab={setAdminSubTab}
        roleFilterAdmin={roleFilterAdmin}
        setRoleFilterAdmin={setRoleFilterAdmin}
        plantFilterAdmin={plantFilterAdmin}
        setPlantFilterAdmin={setPlantFilterAdmin}
        setIsUserModalOpen={setIsUserModalOpen}
        setEditingUser={setEditingUser}
        setIsPlantModalOpen={setIsPlantModalOpen}
        setEditingPlant={setEditingPlant}
        plants={plants}
        systemUsers={systemUsers}
        handleOpenNewUserModal={handleOpenNewUserModal}
        handleToggleUserStatus={handleToggleUserStatus}
        handleDeleteUser={handleDeleteUser}
        handleOpenNewPlantModal={handleOpenNewPlantModal}
    />
)}

                                {/* VISTA DEL SUPERVISOR DE PLANTA (AGRUPADA POR EMPLEADO EN FORMATO DE LISTA LIMPIA) */}
                                {currentRole === 'supervisor' && activeTab === 'sup-validation' && (
    <SupervisorValidation
        setLftModalData={setLftModalData}
        selectedPlantFilter={selectedPlantFilter}
        setSelectedPlantFilter={setSelectedPlantFilter}
        dateFilterType={dateFilterType}
        setDateFilterType={setDateFilterType}
        todayStr={todayStr}
        yesterdayStr={yesterdayStr}
        customStartDate={customStartDate}
        setCustomStartDate={setCustomStartDate}
        customEndDate={customEndDate}
        setCustomEndDate={setCustomEndDate}
        plants={plants}
        showToast={showToast}
        handleShiftAbandonment={handleShiftAbandonment}
        handleValidateAttendance={handleValidateAttendance}
        filteredRecords={filteredRecords}
    />
)}

                                {currentRole === 'supervisor' && activeTab === 'sup-qr' && (
    <SupervisorQr
        plants={plants}
        showToast={showToast}
        activeQrCode={activeQrCode}
        setActiveQrCode={setActiveQrCode}
    />
)}
                                {/* =============================================================== */}
                                {/* VISTA MÓVIL DEL INSPECTOR (ESTILO WINDOWS 11 MOBILE SURFACE)    */}
                                {/* =============================================================== */}
                                {currentRole === 'inspector' && activeTab === 'inspector-mobile' && (
    <InspectorMobile
        currentUser={currentUser}
        todayStr={todayStr}
        yesterdayStr={yesterdayStr}
        plants={plants}
        attendanceRecords={attendanceRecords}
        inspectors={inspectors}
        selectedInspectorId={selectedInspectorId}
        setSelectedInspectorId={setSelectedInspectorId}
        handleInspectorTransportCheckIn={handleInspectorTransportCheckIn}
        handleInspectorQrScan={handleInspectorQrScan}
        handleInspectorDeparture={handleInspectorDeparture}
        handleUploadMyAvatar={handleUploadMyAvatar}
        periodRecords={periodRecords}
    />
)}

                            </main>
                        </div>

                        {/* BARRA DE ESTADO INFERIOR */}
                        <StatusFooter globalMetrics={globalMetrics} />
                    </div>

                    {/* MODAL OBLIGATORIO: JUSTIFICACIÓN DE TIEMPO EXTRA EXCESIVO (ART. 66 LFT) */}
                    {lftModalData && (
    <LftModal
        currentUser={currentUser}
        lftModalData={lftModalData}
        setLftModalData={setLftModalData}
        lftReasonCategory={lftReasonCategory}
        setLftReasonCategory={setLftReasonCategory}
        lftDetailText={lftDetailText}
        setLftDetailText={setLftDetailText}
        handleValidateAttendance={handleValidateAttendance}
    />
)}

                    {/* MODAL 1: FICHA DE AUDITORÍA INDIVIDUAL DE NÓMINA */}
                    {selectedEmployeeDetail && (
    <EmployeeDetailModal selectedEmployeeDetail={selectedEmployeeDetail} setSelectedEmployeeDetail={setSelectedEmployeeDetail} />
)}

                    {/* MODAL 2: CAPTURA / EDICIÓN MANUAL DE ASISTENCIA PARA RH */}
                    {isRecordModalOpen && editingRecord && (
    <RecordModal
        setIsRecordModalOpen={setIsRecordModalOpen}
        editingRecord={editingRecord}
        setEditingRecord={setEditingRecord}
        plants={plants}
        inspectors={inspectors}
        handleSaveManualRecord={handleSaveManualRecord}
    />
)}

                    {/* MODAL 4: ALTA / EDICIÓN DE USUARIOS Y ROLES */}
                    {isUserModalOpen && editingUser && (
    <UserModal
        todayStr={todayStr}
        setIsUserModalOpen={setIsUserModalOpen}
        editingUser={editingUser}
        setEditingUser={setEditingUser}
        plants={plants}
        handleSaveUser={handleSaveUser}
    />
)}

                    {/* MODAL 5: GENERAR NUEVA PLANTA CLIENTE Y CONFIGURAR TURNOS */}
                    {isPlantModalOpen && editingPlant && (
    <PlantModal
        setIsPlantModalOpen={setIsPlantModalOpen}
        editingPlant={editingPlant}
        setEditingPlant={setEditingPlant}
        handleSavePlant={handleSavePlant}
    />
)}

                </>
            )}
        </div>
    );
}
