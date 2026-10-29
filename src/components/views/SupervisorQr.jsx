import React from 'react';
import { QrCode, RefreshCw } from 'lucide-react';
import { generatePlantQrState } from '../../lib/attendanceMetrics';

export default function SupervisorQr({
    plants,
    allowedPlants,
    showToast,
    activeQrCode,
    setActiveQrCode,
    broadcastPlantQr,
}) {
    const visiblePlants = (allowedPlants && allowedPlants.length > 0) ? allowedPlants : plants;
    const currentPin4 = String(activeQrCode.code || '').match(/-(\d{4})$/)?.[1] || activeQrCode.pin4 || '0000';
    return (
        <div className="max-w-lg mx-auto bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-900 text-white font-bold text-xs flex items-center justify-between">
                <span className="flex items-center gap-2"><QrCode className="w-4 h-4 text-emerald-400" /> Terminal QR Dinámico en Planta</span>
                <span className="text-[11px] text-emerald-400 font-mono">● Realtime TOTP 60s</span>
            </div>
            <div className="p-6 text-center space-y-4">
                <p className="text-xs text-slate-500">
                    El código criptográfico se sincroniza cada 60 segundos con la terminal móvil de los inspectores de esta planta.
                </p>

                <div className="text-left">
                    <label className="text-xs font-bold text-slate-700">Planta Activa de la Terminal:</label>
                    <select
                        value={activeQrCode.plantId}
                        onChange={(e) => {
                            const pCode = visiblePlants.find(p => p.id === e.target.value)?.code || 'PLANTA';
                            const nextState = generatePlantQrState(e.target.value, pCode);
                            setActiveQrCode(nextState);
                            if (typeof broadcastPlantQr === 'function') broadcastPlantQr(nextState);
                        }}
                        className="w-full mt-1.5 bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-900"
                    >
                        {visiblePlants.map(p => (
                            <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
                        ))}
                    </select>
                </div>

                <div className="bg-slate-50 p-5 w-60 mx-auto rounded-2xl flex flex-col items-center justify-center border-2 border-dashed border-slate-300 shadow-inner space-y-2">
                    <QrCode className="w-32 h-32 text-slate-900" />
                    <div className="bg-emerald-600 text-white px-3.5 py-1 rounded-xl font-mono text-lg font-extrabold tracking-widest shadow-sm">
                        {currentPin4}
                    </div>
                    <span className="text-[11px] font-mono font-bold text-blue-600">{activeQrCode.code}</span>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1.5">
                    <div className="flex justify-between">
                        <span className="text-slate-500">Token Criptográfico Activo:</span>
                        <span className="font-mono text-emerald-600 font-bold">{activeQrCode.code}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500">PIN de Verificación en Planta:</span>
                        <span className="font-mono text-indigo-700 font-extrabold">{currentPin4}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500">Próxima Rotación Automática:</span>
                        <span className="font-mono text-amber-600 font-bold">{activeQrCode.secondsLeft} segundos</span>
                    </div>
                </div>

                <button
                    onClick={() => {
                        const pCode = visiblePlants.find(p => p.id === activeQrCode.plantId)?.code || 'PLANTA';
                        const stepSalt = Math.floor(1 + Math.random() * 12);
                        const nextState = generatePlantQrState(activeQrCode.plantId, pCode, Date.now(), stepSalt);
                        setActiveQrCode(nextState);
                        if (typeof broadcastPlantQr === 'function') broadcastPlantQr(nextState);
                        showToast('Nuevo token QR generado y transmitido en vivo.');
                    }}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl shadow-sm flex items-center justify-center gap-2 text-xs transition-colors cursor-pointer"
                >
                    <RefreshCw className="w-4 h-4" /> Regenerar Token QR Ahora
                </button>
            </div>
        </div>
    );
}
