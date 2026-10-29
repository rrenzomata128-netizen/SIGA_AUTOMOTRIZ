import React from 'react';
import { Building2, User } from 'lucide-react';
import { logAudit } from '../lib/audit';
import { supabase } from '../lib/supabaseClient';

export default function TitleBar({
    currentUser,
    setCurrentUser,
    setLoginEmpNo,
    setLoginPin,
}) {
    return (
        <div className="bg-slate-900 text-slate-100 px-6 py-4 flex items-center justify-between select-none border-b border-slate-800">
            <div className="flex items-center gap-3.5">
                <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-2.5 rounded-xl shadow-md flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-white" />
                </div>
                <span className="font-bold text-sm sm:text-lg tracking-tight text-white">
                    Sistema Integral de Gestión de Asistencia y Prenómina
                </span>
            </div>

            <div className="flex items-center justify-end gap-3">
                <div className="inline-flex items-center gap-2 bg-slate-800/90 border border-slate-700 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm text-slate-200">
                    <User className="w-4 h-4 text-blue-400 shrink-0" />
                    <span className="font-semibold text-white">{currentUser.name || currentUser.empNo}</span>
                    <span className="font-mono text-xs text-slate-400">({currentUser.empNo})</span>
                </div>

                <button
                    type="button"
                    onClick={async () => {
                        await logAudit(currentUser, 'LOGOUT', 'Cierre de sesión');
                        await supabase.auth.signOut();
                        setCurrentUser(null);
                        setLoginEmpNo('');
                        setLoginPin('');
                    }}
                    className="text-xs sm:text-sm bg-slate-700 hover:bg-red-600 text-white px-4 py-1.5 rounded-lg font-bold transition-colors cursor-pointer"
                    title="Cerrar sesión"
                >
                    Salir
                </button>
            </div>
        </div>
    );
}
