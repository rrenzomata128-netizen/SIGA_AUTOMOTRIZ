import React from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';

export default function Toast({
    toast,
}) {
    return (
        <div className="fixed bottom-12 right-6 z-50 bg-white/95 backdrop-blur-md text-slate-800 px-4 py-3.5 rounded-xl border border-slate-200 shadow-2xl flex items-start gap-3 max-w-sm">
            {toast.type === 'error' ? (
                <div className="p-1.5 rounded-lg bg-red-50 text-red-600 flex-shrink-0">
                    <XCircle className="w-5 h-5" />
                </div>
            ) : (
                <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 flex-shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                </div>
            )}
            <div className="text-xs">
                <strong className="block font-semibold text-slate-900 mb-0.5">Notificación del Sistema • SIGA Cloud</strong>
                <span className="text-slate-600">{toast.message}</span>
            </div>
        </div>
    );
}
