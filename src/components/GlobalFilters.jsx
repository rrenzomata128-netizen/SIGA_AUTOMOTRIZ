import React from 'react';
import { Filter, Search } from 'lucide-react';

export default function GlobalFilters({
    currentUser,
    selectedPlantFilter,
    setSelectedPlantFilter,
    selectedShiftFilter,
    setSelectedShiftFilter,
    selectedStatusFilter,
    setSelectedStatusFilter,
    dateFilterType,
    setDateFilterType,
    todayStr,
    yesterdayStr,
    customStartDate,
    setCustomStartDate,
    customEndDate,
    setCustomEndDate,
    searchQuery,
    setSearchQuery,
    plants,
    allowedPlants,
    globalMetrics,
}) {
    return (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-sm space-y-3.5">
            <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Filter className="w-4 h-4 text-blue-600" /> Parámetros de Filtrado y Periodo de Consulta
                </span>
                <div className="flex items-center gap-2 text-xs bg-emerald-50 text-emerald-800 px-3 py-1 rounded-full border border-emerald-200">
                    <span>Tiempo Acumulado:</span>
                    <strong className="font-mono">{globalMetrics.totalFormattedHHMM} ({globalMetrics.totalPayrollHours}h)</strong>
                </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs font-semibold text-slate-500 mr-1">Periodo:</span>

                    {[
                        { id: 'TODAY', label: `Hoy (${todayStr})` },
                        { id: 'YESTERDAY', label: `Ayer (${yesterdayStr})` },
                        { id: 'LAST_7_DAYS', label: 'Hace 7 Días (Semanal)' },
                        { id: 'CUSTOM', label: 'Rango de Fechas' }
                    ].map(btn => (
                        <button
                            key={btn.id}
                            onClick={() => setDateFilterType(btn.id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${dateFilterType === btn.id
                                ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                }`}
                        >
                            {btn.label}
                        </button>
                    ))}

                    {dateFilterType === 'CUSTOM' && (
                        <div className="flex items-center gap-2 bg-slate-50 px-3 py-1 rounded-lg border border-slate-200 text-xs">
                            <span className="text-slate-500">Inicio:</span>
                            <input
                                type="date"
                                value={customStartDate}
                                onChange={(e) => setCustomStartDate(e.target.value)}
                                className="bg-white text-slate-800 px-2 py-0.5 rounded border border-slate-300 text-xs"
                            />
                            <span className="text-slate-500">Fin:</span>
                            <input
                                type="date"
                                value={customEndDate}
                                onChange={(e) => setCustomEndDate(e.target.value)}
                                className="bg-white text-slate-800 px-2 py-0.5 rounded border border-slate-300 text-xs"
                            />
                        </div>
                    )}
                </div>
            </div>

            <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2.5">
                    <div className="flex items-center gap-1.5">
                        <label className="text-xs font-semibold text-slate-600">Planta:</label>
                        <select
                            value={selectedPlantFilter}
                            onChange={(e) => setSelectedPlantFilter(e.target.value)}
                            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                        >
                            {/* Solo Administradores y RH pueden ver "Todas las Plantas" */}
                            {(['ADMIN', 'RH'].includes(currentUser?.systemRole || currentUser?.system_role) ||
                                currentUser?.plantId === 'ALL' ||
                                currentUser?.plant_id === 'ALL') && (
                                    <option value="ALL">Todas las Plantas ({plants.length})</option>
                                )}

                            {allowedPlants.map(p => (
                                <option key={p.id} value={p.id}>
                                    {p.code ? `${p.code} - ${p.name}` : p.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center gap-1.5">
                        <label className="text-xs font-semibold text-slate-600">Turno:</label>
                        <select
                            value={selectedShiftFilter}
                            onChange={(e) => setSelectedShiftFilter(e.target.value)}
                            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                        >
                            <option value="ALL">Todos los Turnos (8h y 12h)</option>
                            <option value="T1">Turno 1 (Matutino)</option>
                            <option value="T2">Turno 2 (Vespertino)</option>
                            <option value="T3">Turno 3 (Nocturno)</option>
                            <option value="12H">Turnos Especiales 12h</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-1.5">
                        <label className="text-xs font-semibold text-slate-600">Estatus:</label>
                        <select
                            value={selectedStatusFilter}
                            onChange={(e) => setSelectedStatusFilter(e.target.value)}
                            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                        >
                            <option value="ALL">Todos los Estatus</option>
                            <option value="A tiempo">A Tiempo (Puntual)</option>
                            <option value="Retardo">Con Retardo</option>
                            <option value="Falta">Falta (Ausencia)</option>
                        </select>
                    </div>

                    {(selectedPlantFilter !== 'ALL' || selectedShiftFilter !== 'ALL' || selectedStatusFilter !== 'ALL' || searchQuery !== '' || dateFilterType !== 'TODAY') && (
                        <button
                            onClick={() => {
                                setSelectedPlantFilter('ALL');
                                setSelectedShiftFilter('ALL');
                                setSelectedStatusFilter('ALL');
                                setSearchQuery('');
                                setDateFilterType('TODAY');
                            }}
                            className="text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg font-semibold transition-colors"
                        >
                            Restablecer Filtros
                        </button>
                    )}
                </div>

                <div className="relative w-full xl:w-72">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2" />
                    <input
                        type="text"
                        placeholder="Buscar nómina, nombre o planta..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                    />
                </div>
            </div>
        </div>
    );
}
