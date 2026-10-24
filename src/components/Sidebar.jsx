import React from 'react';
import { BarChart3, Building2, Calculator, CheckCircle2, ChevronRight, FileText, Plus, QrCode, ShieldAlert, Smartphone, UserCheck, UserPlus } from 'lucide-react';

export default function Sidebar({
    currentRole,
    activeTab,
    setActiveTab,
    todayStr,
    setIsRecordModalOpen,
    setEditingRecord,
    plants,
    systemUsers,
    showToast,
    inspectors,
    globalMetrics,
}) {
    return (
        <aside className="w-full lg:w-64 bg-white/75 backdrop-blur-md p-3.5 flex flex-col justify-between flex-shrink-0 border-b lg:border-b-0 lg:border-r border-slate-200">
            <div className="space-y-4">
                <div>
                    <div className="px-3 py-1.5 flex items-center justify-between text-slate-400 font-bold text-[11px] uppercase tracking-wider">
                        <span>
                            {currentRole === 'admin' ? 'Módulos de Gestión' : currentRole === 'supervisor' ? 'Tareas de Supervisor' : 'Terminal Inspector'}
                        </span>
                        <ChevronRight className="w-3.5 h-3.5" />
                    </div>

                    <div className="mt-1 space-y-1">
                        {currentRole === 'admin' && (
                            <nav className="flex lg:flex-col gap-1.5 overflow-x-auto pb-1 lg:pb-0">
                                <button
                                    onClick={() => setActiveTab('executive')}
                                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${activeTab === 'executive'
                                        ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
                                        : 'text-slate-700 hover:bg-slate-100'
                                        }`}
                                >
                                    <span className="flex items-center gap-2.5">
                                        <BarChart3 className="w-4 h-4" /> 1. Resumen y Analítica
                                    </span>
                                </button>

                                <button
                                    onClick={() => setActiveTab('plants-monitor')}
                                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${activeTab === 'plants-monitor'
                                        ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
                                        : 'text-slate-700 hover:bg-slate-100'
                                        }`}
                                >
                                    <span className="flex items-center gap-2.5">
                                        <Building2 className="w-4 h-4" /> 2. Monitor por Planta
                                    </span>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${activeTab === 'plants-monitor' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                                        }`}>
                                        {plants.length}
                                    </span>
                                </button>

                                <button
                                    onClick={() => setActiveTab('hr-payroll')}
                                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${activeTab === 'hr-payroll'
                                        ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
                                        : 'text-slate-700 hover:bg-slate-100'
                                        }`}
                                >
                                    <span className="flex items-center gap-2.5">
                                        <Calculator className="w-4 h-4" /> 3. Prenómina y Horas RH
                                    </span>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${activeTab === 'hr-payroll' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                                        }`}>
                                        {globalMetrics.totalPayrollHours}h
                                    </span>
                                </button>

                                <button
                                    onClick={() => setActiveTab('zero-slack')}
                                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${activeTab === 'zero-slack'
                                        ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
                                        : 'text-slate-700 hover:bg-slate-100'
                                        }`}
                                >
                                    <span className="flex items-center gap-2.5">
                                        <ShieldAlert className="w-4 h-4" /> 4. Alertas Faltas/Retardos
                                    </span>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${globalMetrics.absentCount > 0 ? 'bg-red-600 text-white' : 'bg-slate-200 text-slate-700'
                                        }`}>
                                        {globalMetrics.absentCount}
                                    </span>
                                </button>

                                <button
                                    onClick={() => setActiveTab('audit-log')}
                                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${activeTab === 'audit-log'
                                        ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
                                        : 'text-slate-700 hover:bg-slate-100'
                                        }`}
                                >
                                    <span className="flex items-center gap-2.5">
                                        <FileText className="w-4 h-4" /> 5. Bitácora y Auditoría
                                    </span>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${activeTab === 'audit-log' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                                        }`}>
                                        {globalMetrics.totalRecords}
                                    </span>
                                </button>

                                <button
                                    onClick={() => setActiveTab('admin-settings')}
                                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${activeTab === 'admin-settings'
                                        ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
                                        : 'text-slate-700 hover:bg-slate-100'
                                        }`}
                                >
                                    <span className="flex items-center gap-2.5">
                                        <UserPlus className="w-4 h-4" /> 6. Altas Usuarios y Plantas
                                    </span>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${activeTab === 'admin-settings' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                                        }`}>
                                        {systemUsers.length}
                                    </span>
                                </button>
                            </nav>
                        )}

                        {currentRole === 'supervisor' && (
                            <nav className="flex lg:flex-col gap-1.5 overflow-x-auto">
                                <button
                                    onClick={() => setActiveTab('sup-validation')}
                                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${activeTab === 'sup-validation'
                                        ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/20'
                                        : 'text-slate-700 hover:bg-slate-100'
                                        }`}
                                >
                                    <span className="flex items-center gap-2.5"><UserCheck className="w-4 h-4" /> Pase de Lista y Cierre</span>
                                </button>
                                <button
                                    onClick={() => setActiveTab('sup-qr')}
                                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${activeTab === 'sup-qr'
                                        ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/20'
                                        : 'text-slate-700 hover:bg-slate-100'
                                        }`}
                                >
                                    <span className="flex items-center gap-2.5"><QrCode className="w-4 h-4" /> Terminal QR en Planta</span>
                                </button>
                            </nav>
                        )}

                        {currentRole === 'inspector' && (
                            <nav className="flex lg:flex-col gap-1.5">
                                <button
                                    onClick={() => setActiveTab('inspector-mobile')}
                                    className="flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 text-white shadow-sm shadow-indigo-600/20"
                                >
                                    <span className="flex items-center gap-2.5"><Smartphone className="w-4 h-4" /> Mi Check-In de Turno</span>
                                </button>
                            </nav>
                        )}
                    </div>
                </div>

                {currentRole === 'admin' && (
                    <div className="hidden lg:block bg-white rounded-xl border border-slate-200 p-3.5 shadow-sm space-y-2.5">
                        <div className="flex items-center justify-between text-slate-800 font-bold text-xs border-b border-slate-100 pb-2">
                            <span>Verificación Aritmética</span>
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        </div>
                        <div className="text-xs space-y-2 text-slate-700">
                            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/80 font-mono space-y-1.5">
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Hrs Ordinarias:</span>
                                    <span className="font-bold text-slate-800">{globalMetrics.totalRegularHours} h</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">+ Hrs Extra:</span>
                                    <span className="font-bold text-amber-600">{globalMetrics.totalOvertimeHours} h</span>
                                </div>
                                <div className="flex justify-between pt-1.5 border-t border-slate-200 font-bold text-emerald-700">
                                    <span>= Total Nómina:</span>
                                    <span>{globalMetrics.totalPayrollHours} h</span>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    if (inspectors.length === 0 || plants.length === 0) {
                                        showToast('Primero registra al menos una planta y un inspector.', 'error');
                                        return;
                                    }
                                    setEditingRecord({
                                        id: `att-${Date.now()}`,
                                        inspectorId: inspectors[0].id,
                                        plantId: plants[0].id,
                                        shift: plants[0].shifts?.[0] || 'Turno 1 (06:00 - 14:30)',
                                        date: todayStr,
                                        transportCheckIn: '05:25',
                                        plantQrScan: '05:55',
                                        departureTime: '14:30',
                                        status: 'A tiempo',
                                        incidentReason: 'Ninguno',
                                        comments: 'Registro validado por Recursos Humanos.',
                                        replacementStatus: 'No requerido'
                                    });
                                    setIsRecordModalOpen(true);
                                }}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-colors"
                            >
                                <Plus className="w-4 h-4" /> Captura Manual RH
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <div className="hidden lg:block bg-slate-100/90 rounded-xl border border-slate-200/80 p-3 text-xs text-slate-700">
                <div className="font-bold text-slate-900">Clúster Automotriz Coahuila</div>
                <div className="text-slate-500 text-[11px] mt-0.5">{plants.length} Plantas en BD • Turnos 8h y 12h</div>
            </div>
        </aside>
    );
}
