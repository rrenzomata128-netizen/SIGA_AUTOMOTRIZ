import React from 'react';
import { Building2 } from 'lucide-react';
import { logAudit } from '../lib/audit';
import { supabase } from '../lib/supabaseClient';

export default function TitleBar({
    currentUser,
    setCurrentUser,
    setLoginEmpNo,
    setLoginPin,
    showToast,
}) {
    return (
        <div className="bg-slate-900 text-slate-100 px-4 py-2 flex items-center justify-between select-none border-b border-slate-800">
            <div className="flex items-center gap-2.5">
                <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-1.5 rounded-lg shadow-sm flex items-center justify-center">
                    <Building2 className="w-4 h-4 text-white" />
                </div>
                <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs sm:text-sm tracking-tight text-white">
                        SIGA Automotriz RH
                    </span>
                    <span className="hidden sm:inline-block text-[11px] text-slate-400">
                        — Persistencia Total en Supabase ({currentUser.empNo})
                    </span>
                </div>
            </div>

            <div className="flex items-center gap-1 -mr-2">
                <button
                    type="button"
                    onClick={async () => {
                        await logAudit(currentUser, 'LOGOUT', 'Cierre de sesión');
                        await supabase.auth.signOut();
                        setCurrentUser(null);
                        setLoginEmpNo('');
                        setLoginPin('');
                    }}
                    className="text-[11px] bg-slate-700 hover:bg-red-600 text-white px-2.5 py-1 rounded-md font-semibold mr-1"
                    title="Cerrar sesión"
                >
                    Salir
                </button>
                <button
                    type="button"
                    className="w-9 h-7 rounded-md flex items-center justify-center text-slate-300 hover:bg-slate-800 hover:text-white transition-colors text-xs"
                    title="Minimizar"
                >
                    —
                </button>
                <button
                    type="button"
                    className="w-9 h-7 rounded-md flex items-center justify-center text-slate-300 hover:bg-slate-800 hover:text-white transition-colors text-xs"
                    title="Maximizar"
                >
                    □
                </button>
                <button
                    type="button"
                    onClick={() => showToast('Aplicación protegida contra cierre accidental en turno activo.')}
                    className="w-9 h-7 rounded-md flex items-center justify-center text-slate-300 hover:bg-red-600 hover:text-white transition-colors text-xs"
                    title="Cerrar"
                >
                    ✕
                </button>
            </div>
        </div>
    );
}
