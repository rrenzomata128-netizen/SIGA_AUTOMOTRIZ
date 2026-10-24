import React from 'react';
import { Building2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { signInWithEmpNo } from '../lib/auth';
import { logAudit } from '../lib/audit';

export default function LoginScreen({
    setCurrentUser,
    loginEmpNo,
    setLoginEmpNo,
    loginPin,
    setLoginPin,
    loginError,
    setLoginError,
}) {
    return (
        <div className="flex-1 flex items-center justify-center">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-8 max-w-md w-full">
                <div className="flex items-center gap-3 mb-6">
                    <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-2.5 rounded-xl">
                        <Building2 className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-slate-900">Sistema Integral de Gestion de Asistencia V10.23</h1>

                    </div>
                </div>

                <form onSubmit={async (e) => {
                    e.preventDefault();
                    setLoginError('');

                    const cleanEmpNo = loginEmpNo.trim().toUpperCase();
                    const cleanPin = String(loginPin).trim();

                    try {
                        const { profile, error } = await signInWithEmpNo(cleanEmpNo, cleanPin);
                        if (error) {
                            setLoginError(error);
                            return;
                        }
                        setCurrentUser(profile);
                        logAudit(profile, 'LOGIN', 'Inicio de sesión exitoso').catch(() => { });
                    } catch (err) {
                        console.error('Error durante el login:', err);
                        setLoginError('Ocurrió un error al verificar credenciales.');
                    }
                }} className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">No. de Nómina</label>
                        <input
                            type="text"
                            value={loginEmpNo}
                            onChange={(e) => setLoginEmpNo(e.target.value)}
                            placeholder="Ej. ADM-0001 o NOM-1041"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-mono"
                            required
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">PIN</label>
                        <input
                            type="password"
                            inputMode="numeric"
                            autoComplete="current-password"
                            value={loginPin}
                            onChange={(e) => setLoginPin(e.target.value)}
                            placeholder="6 dígitos"
                            maxLength={6}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-mono"
                            required
                        />
                    </div>
                    {loginError && (
                        <div className="bg-red-50 text-red-700 text-xs p-3 rounded-xl border border-red-200">
                            {loginError}
                        </div>
                    )}
                    <button
                        type="submit"
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors"
                    >
                        Ingresar
                    </button>
                </form>

                <p className="text-[11px] text-slate-400 mt-6 text-center">
                    {/* ==========  comentario bandera ========== */}

                </p>
            </div>
        </div>
    );
}
