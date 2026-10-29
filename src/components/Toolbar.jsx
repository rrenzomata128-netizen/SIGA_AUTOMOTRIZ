import React from 'react';
import { Shield, Smartphone, UserCheck } from 'lucide-react';

export default function Toolbar({
    currentUser,
    currentRole,
    handleRoleChange,
}) {
    const canSwitchTerminal = currentUser.systemRole === 'ADMIN' || currentUser.allowTerminalSwitch;

    // Si es un inspector o usuario sin selector de terminal, no mostrar barra intermedia redundante
    if (!canSwitchTerminal) {
        return null;
    }

    return (
        <div className="bg-white border-b border-slate-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-sm">
            {/* LADO IZQUIERDO: SELECTOR DE MODO DE TERMINAL EN 1 SOLA LÍNEA */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200/90 shadow-inner overflow-x-auto max-w-full">
                <span className="text-xs font-semibold text-slate-500 px-2 whitespace-nowrap">Modo de Terminal:</span>

                <button
                    onClick={() => handleRoleChange('admin')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all duration-200 cursor-pointer ${currentRole === 'admin'
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 ring-2 ring-blue-300'
                        : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200'
                        }`}
                >
                    <Shield className={`w-4 h-4 shrink-0 ${currentRole === 'admin' ? 'text-white' : 'text-blue-600'}`} />
                    <span>RH y Dirección (Matriz)</span>
                    {currentRole === 'admin' && (
                        <span className="w-2 h-2 rounded-full bg-white animate-pulse shrink-0" />
                    )}
                </button>

                <button
                    onClick={() => handleRoleChange('supervisor')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all duration-200 cursor-pointer ${currentRole === 'supervisor'
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 ring-2 ring-emerald-300'
                        : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200'
                        }`}
                >
                    <UserCheck className={`w-4 h-4 shrink-0 ${currentRole === 'supervisor' ? 'text-white' : 'text-emerald-600'}`} />
                    <span>Supervisor en Planta</span>
                    {currentRole === 'supervisor' && (
                        <span className="w-2 h-2 rounded-full bg-white animate-pulse shrink-0" />
                    )}
                </button>

                <button
                    onClick={() => handleRoleChange('inspector')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all duration-200 cursor-pointer ${currentRole === 'inspector'
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 ring-2 ring-indigo-300'
                        : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-indigo-50 hover:text-indigo-700 hover:border-blue-200'
                        }`}
                >
                    <Smartphone className={`w-4 h-4 shrink-0 ${currentRole === 'inspector' ? 'text-white' : 'text-indigo-600'}`} />
                    <span>App Móvil Inspector</span>
                    {currentRole === 'inspector' && (
                        <span className="w-2 h-2 rounded-full bg-white animate-pulse shrink-0" />
                    )}
                </button>
            </div>

            {/* LADO DERECHO: RADAR SONAR 360° (GESTIÓN AUDITADA EN TIEMPO REAL) */}
            <div className="inline-flex items-center gap-2.5 text-[11px] bg-slate-900 text-emerald-300 font-bold px-3.5 py-1.5 rounded-full border border-emerald-500/40 shadow-sm shrink-0">
                <span className="relative flex items-center justify-center w-4 h-4 rounded-full bg-emerald-950 border border-emerald-400/60 overflow-hidden shrink-0">
                    {/* Anillo de onda expansiva */}
                    <span className="absolute inset-0 rounded-full border border-emerald-400/50 animate-ping" />
                    {/* Haz de luz de barrido 360° tipo sonar */}
                    <span
                        className="
                            absolute inset-0 rounded-full animate-spin
                            [background:conic-gradient(from_0deg,transparent_0deg,transparent_240deg,rgba(16,185,129,0.85)_360deg)]
                        "
                        style={{ animationDuration: '2.2s' }}
                    />
                    {/* Punto central del radar */}
                    <span className="relative z-10 w-1.5 h-1.5 rounded-full bg-[#00FF66] shadow-[0_0_6px_#00FF66]" />
                </span>
                <span className="tracking-wide">Gestión Auditada en Tiempo Real</span>
            </div>
        </div>
    );
}
