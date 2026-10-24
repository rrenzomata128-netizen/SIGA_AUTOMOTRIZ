import React from 'react';
import { QrCode, RefreshCw } from 'lucide-react';

export default function SupervisorQr({
    plants,
    showToast,
    activeQrCode,
    setActiveQrCode,
}) {
    return (
        <div className="max-w-lg mx-auto bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-900 text-white font-bold text-xs flex items-center justify-between">
                <span className="flex items-center gap-2"><QrCode className="w-4 h-4 text-emerald-400" /> Terminal QR Dinámico en Planta</span>
                <span className="text-[11px] text-slate-400">Rotación 60s</span>
            </div>
            <div className="p-6 text-center space-y-4">
                <p className="text-xs text-slate-500">
                    El código rota automáticamente cada 60 segundos para impedir registros remotos o fotografías alteradas.
                </p>

                <div className="text-left">
                    <label className="text-xs font-bold text-slate-700">Planta Activa de la Terminal:</label>
                    <select
                        value={activeQrCode.plantId}
                        onChange={(e) => {
                            const pCode = plants.find(p => p.id === e.target.value)?.code || 'PLANTA';
                            setActiveQrCode({
                                plantId: e.target.value,
                                code: `QR-AUTH-${pCode}-${Math.floor(1000 + Math.random() * 9000)}`,
                                secondsLeft: 60
                            });
                        }}
                        className="w-full mt-1.5 bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-900"
                    >
                        {plants.map(p => (
                            <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
                        ))}
                    </select>
                </div>

                <div className="bg-slate-50 p-6 w-56 h-56 mx-auto rounded-2xl flex flex-col items-center justify-center border-2 border-dashed border-slate-300 shadow-inner">
                    <QrCode className="w-36 h-36 text-slate-900" />
                    <span className="text-[11px] font-mono font-bold text-blue-600 mt-2">{activeQrCode.code}</span>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1.5">
                    <div className="flex justify-between">
                        <span className="text-slate-500">Token Criptográfico Activo:</span>
                        <span className="font-mono text-emerald-600 font-bold">{activeQrCode.code}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500">Próxima Rotación Automática:</span>
                        <span className="font-mono text-amber-600 font-bold">{activeQrCode.secondsLeft} segundos</span>
                    </div>
                </div>

                <button
                    onClick={() => {
                        const pCode = plants.find(p => p.id === activeQrCode.plantId)?.code || 'PLANTA';
                        setActiveQrCode(prev => ({
                            ...prev,
                            code: `QR-AUTH-${pCode}-${Math.floor(1000 + Math.random() * 9000)}`,
                            secondsLeft: 60
                        }));
                        showToast('Nuevo token QR generado.');
                    }}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl shadow-sm flex items-center justify-center gap-2 text-xs transition-colors"
                >
                    <RefreshCw className="w-4 h-4" /> Regenerar Token QR Ahora
                </button>
            </div>
        </div>
    );
}
