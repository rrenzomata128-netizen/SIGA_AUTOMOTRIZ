import React from 'react';

export default function StatusFooter({
    globalMetrics,
}) {
    return (
        <footer className="bg-white border-t border-slate-200 px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600">
            <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5 font-semibold text-slate-800">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Estado: Conectado a Supabase
                </span>
                <span className="text-slate-300">|</span>
                <span>
                    Registros Filtrados: <strong className="text-slate-900">{globalMetrics.totalRecords}</strong>
                </span>
                <span className="hidden sm:inline-block text-slate-300">|</span>
                <span className="hidden sm:inline-block">
                    Validados por Supervisor: <strong className="text-emerald-600">{globalMetrics.supervisorValidatedCount}/{globalMetrics.totalRecords}</strong>
                </span>
            </div>

            <div className="flex items-center gap-3">
                <span className="text-blue-600 font-semibold">Persistencia Cloud PostgreSQL Activa</span>
                <span className="px-2.5 py-0.5 rounded-md bg-slate-100 border border-slate-200 font-mono text-slate-700">
                    Ramos Arizpe / Saltillo, Coah.
                </span>
            </div>
        </footer>
    );
}
