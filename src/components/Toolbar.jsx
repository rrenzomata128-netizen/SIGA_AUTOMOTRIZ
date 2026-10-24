import React from 'react';
import { Building2, Shield, Smartphone, UserCheck } from 'lucide-react';

export default function Toolbar({
    currentUser,
    currentRole,
    handleRoleChange,
}) {
    return (
        <div className="bg-white border-b border-slate-200 px-5 py-3.5 flex flex-col lg:flex-row justify-between items-center gap-4 shadow-sm">
            <div className="flex items-center gap-3.5">
                <div className="bg-blue-50 p-2.5 rounded-xl border border-blue-100 text-blue-600 shadow-sm">
                    <Building2 className="w-6 h-6" />
                </div>
                <div>
                    <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                        Sistema Integral de Gestión de Asistencia y Prenómina Automotriz
                    </h1>
                </div>
            </div>

            {(currentUser.systemRole === 'ADMIN' || currentUser.allowTerminalSwitch) ? (
                <div className="flex flex-wrap items-center gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200/90 shadow-inner">
                    <span className="text-xs font-semibold text-slate-500 px-2.5">Modo de Terminal:</span>

                    <button
                        onClick={() => handleRoleChange('admin')}
                        className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all duration-200 ${currentRole === 'admin'
                            ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 ring-2 ring-blue-300 scale-[1.02]'
                            : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200'
                            }`}
                    >
                        <Shield className={`w-4 h-4 ${currentRole === 'admin' ? 'text-white' : 'text-blue-600'}`} />
                        <span>RH y Dirección (Matriz)</span>
                        {currentRole === 'admin' && (
                            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                        )}
                    </button>

                    <button
                        onClick={() => handleRoleChange('supervisor')}
                        className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all duration-200 ${currentRole === 'supervisor'
                            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 ring-2 ring-emerald-300 scale-[1.02]'
                            : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200'
                            }`}
                    >
                        <UserCheck className={`w-4 h-4 ${currentRole === 'supervisor' ? 'text-white' : 'text-emerald-600'}`} />
                        <span>Supervisor en Planta</span>
                        {currentRole === 'supervisor' && (
                            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                        )}
                    </button>

                    <button
                        onClick={() => handleRoleChange('inspector')}
                        className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all duration-200 ${currentRole === 'inspector'
                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 ring-2 ring-indigo-300 scale-[1.02]'
                            : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-indigo-50 hover:text-indigo-700 hover:border-blue-200'
                            }`}
                    >
                        <Smartphone className={`w-4 h-4 ${currentRole === 'inspector' ? 'text-white' : 'text-indigo-600'}`} />
                        <span>App Móvil Inspector</span>
                        {currentRole === 'inspector' && (
                            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                        )}
                    </button>
                </div>
            ) : (
                <div className="text-xs bg-slate-100 px-3.5 py-2 rounded-xl border border-slate-200 text-slate-600 font-medium">
                    Sesión activa: <strong className="text-slate-900">{currentUser.name}</strong> ({currentUser.role})
                </div>
            )}
        </div>
    );
}
