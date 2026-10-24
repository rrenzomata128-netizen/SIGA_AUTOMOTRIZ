import React from 'react';
import { Lock, UserPlus } from 'lucide-react';

export default function AdminMenuBar({
    setCurrentRole,
    setActiveTab,
    setAdminSubTab,
    plants,
}) {
    return (
        <div className="bg-white/80 backdrop-blur-sm border-b border-slate-200 px-4 py-1.5 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1 text-slate-600 font-medium">
                <button
                    type="button"
                    onClick={() => { setCurrentRole('admin'); setActiveTab('admin-settings'); setAdminSubTab('USERS'); }}
                    className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold px-2.5 py-1 rounded-md cursor-pointer transition-colors flex items-center gap-1 border border-indigo-200"
                >
                    <UserPlus className="w-3.5 h-3.5" /> + Alta Usuarios / Plantas
                </button>
                <span
                    onClick={() => { setCurrentRole('admin'); setActiveTab('plants-monitor'); }}
                    className="hover:bg-slate-100 hover:text-slate-900 px-2.5 py-1 rounded-md cursor-pointer transition-colors"
                >
                    Plantas ({plants.length})
                </span>
                <span
                    onClick={() => { setCurrentRole('admin'); setActiveTab('hr-payroll'); }}
                    className="hover:bg-slate-100 hover:text-slate-900 px-2.5 py-1 rounded-md cursor-pointer transition-colors"
                >
                    Nómina RH
                </span>
            </div>

            <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 text-[11px] bg-emerald-50 text-emerald-700 font-semibold px-2.5 py-1 rounded-full border border-emerald-200">
                    <Lock className="w-3 h-3 text-emerald-600" /> Trazabilidad QR Auditada en Tiempo Real
                </span>
            </div>
        </div>
    );
}
