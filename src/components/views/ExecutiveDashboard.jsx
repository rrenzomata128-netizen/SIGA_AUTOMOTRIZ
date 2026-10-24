import React from 'react';
import { AlertTriangle, Calculator, CheckCircle2, Clock, QrCode, TrendingUp, Users } from 'lucide-react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export default function ExecutiveDashboard({
    selectedChartType,
    setSelectedChartType,
    selectedShiftFilter,
    setSelectedShiftFilter,
    filteredRecords,
    globalMetrics,
    shiftStats,
    chartDataByDate,
    chartDataByPlant,
    pieDistributionData,
}) {
    return (
        <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3.5">
                <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-sm">
                    <div className="flex justify-between items-start">
                        <p className="text-[11px] uppercase text-slate-500 font-bold">Asistencia Efectiva</p>
                        <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600"><Users className="w-4 h-4" /></div>
                    </div>
                    <h3 className="text-2xl font-extrabold text-slate-900 mt-2">
                        {globalMetrics.presentCount} <span className="text-xs font-normal text-slate-400">/ {globalMetrics.totalRecords}</span>
                    </h3>
                    <p className="text-[11px] text-blue-600 mt-1 font-semibold">
                        {globalMetrics.attendanceRatePct}% tasa asistencia
                    </p>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-sm">
                    <div className="flex justify-between items-start">
                        <p className="text-[11px] uppercase text-slate-500 font-bold">A Tiempo (OK)</p>
                        <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600"><CheckCircle2 className="w-4 h-4" /></div>
                    </div>
                    <h3 className="text-2xl font-extrabold text-emerald-600 mt-2">{globalMetrics.onTimeCount}</h3>
                    <p className="text-[11px] text-slate-500 mt-1">
                        {globalMetrics.punctualityRatePct}% del programado
                    </p>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-sm">
                    <div className="flex justify-between items-start">
                        <p className="text-[11px] uppercase text-slate-500 font-bold">Retardos</p>
                        <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600"><Clock className="w-4 h-4" /></div>
                    </div>
                    <h3 className="text-2xl font-extrabold text-amber-600 mt-2">{globalMetrics.lateCount}</h3>
                    <p className="text-[11px] text-amber-700 mt-1 font-medium">
                        {globalMetrics.lateRatePct}% • {globalMetrics.totalLateMinutes} min acum.
                    </p>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-sm">
                    <div className="flex justify-between items-start">
                        <p className="text-[11px] uppercase text-slate-500 font-bold">Faltas (Ausencias)</p>
                        <div className="p-1.5 rounded-lg bg-red-50 text-red-600"><AlertTriangle className="w-4 h-4" /></div>
                    </div>
                    <h3 className="text-2xl font-extrabold text-red-600 mt-2">{globalMetrics.absentCount}</h3>
                    <p className="text-[11px] text-red-600 mt-1 font-semibold">
                        {globalMetrics.absenteeismRatePct}% ausentismo
                    </p>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-sm">
                    <div className="flex justify-between items-start">
                        <p className="text-[11px] uppercase text-slate-500 font-bold">Total Hrs Nómina</p>
                        <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600"><Calculator className="w-4 h-4" /></div>
                    </div>
                    <h3 className="text-2xl font-extrabold text-slate-900 mt-2">{globalMetrics.totalPayrollHours}h</h3>
                    <p className="text-[11px] text-slate-500 mt-1">
                        Ord: {globalMetrics.totalRegularHours}h | Ext: {globalMetrics.totalOvertimeHours}h
                    </p>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-sm">
                    <div className="flex justify-between items-start">
                        <p className="text-[11px] uppercase text-slate-500 font-bold">QR Planta Validado</p>
                        <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600"><QrCode className="w-4 h-4" /></div>
                    </div>
                    <h3 className="text-2xl font-extrabold text-blue-600 mt-2">{globalMetrics.qrVerifiedCount}</h3>
                    <p className="text-[11px] text-slate-500 mt-1">
                        Sup. Cerrados: {globalMetrics.supervisorValidatedCount}/{globalMetrics.totalRecords}
                    </p>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-sm space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
                    <div>
                        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-blue-600" /> Gráficas de Comportamiento de Asistencias y Horas
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Seleccione el tipo de gráfico para analizar el comportamiento del periodo filtrado
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
                        {[
                            { id: 'TREND_DATE', label: '1. Tendencia por Día' },
                            { id: 'BY_PLANT', label: '2. Comparativa por Planta' },
                            { id: 'PAYROLL_HOURS', label: '3. Horas Ordinarias vs. Extra' },
                            { id: 'DISTRIBUTION', label: '4. Distribución % (Pastel)' }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setSelectedChartType(tab.id)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${selectedChartType === tab.id
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="h-72 w-full bg-slate-50/60 p-4 rounded-xl border border-slate-200/70">
                    {filteredRecords.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-xs text-slate-400">
                            No existen registros en Supabase para los criterios seleccionados.
                        </div>
                    ) : selectedChartType === 'TREND_DATE' ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartDataByDate} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                                <XAxis dataKey="date" stroke="#475569" fontSize={11} />
                                <YAxis stroke="#475569" fontSize={11} allowDecimals={false} />
                                <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderRadius: '12px', color: '#0F172A', fontSize: '12px' }} />
                                <Legend wrapperStyle={{ fontSize: '12px' }} />
                                <Bar dataKey="aTiempo" name="A Tiempo (OK)" stackId="a" fill="#10B981" radius={[0, 0, 0, 0]} />
                                <Bar dataKey="retardos" name="Retardos" stackId="a" fill="#F59E0B" />
                                <Bar dataKey="faltas" name="Faltas" stackId="a" fill="#EF4444" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : selectedChartType === 'BY_PLANT' ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartDataByPlant} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                                <XAxis dataKey="code" stroke="#475569" fontSize={11} />
                                <YAxis stroke="#475569" fontSize={11} allowDecimals={false} />
                                <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderRadius: '12px', color: '#0F172A', fontSize: '12px' }} />
                                <Legend wrapperStyle={{ fontSize: '12px' }} />
                                <Bar dataKey="aTiempo" name="A Tiempo" fill="#10B981" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="retardos" name="Retardos" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="faltas" name="Faltas" fill="#EF4444" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : selectedChartType === 'PAYROLL_HOURS' ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartDataByDate} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                                <XAxis dataKey="date" stroke="#475569" fontSize={11} />
                                <YAxis stroke="#475569" fontSize={11} unit="h" />
                                <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderRadius: '12px', color: '#0F172A', fontSize: '12px' }} />
                                <Legend wrapperStyle={{ fontSize: '12px' }} />
                                <Area type="monotone" dataKey="horasOrdinarias" name="Horas Ordinarias" stackId="1" stroke="#2563EB" fill="#3B82F6" fillOpacity={0.25} />
                                <Area type="monotone" dataKey="horasExtra" name="Horas Extra" stackId="1" stroke="#D97706" fill="#F59E0B" fillOpacity={0.35} />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full flex flex-col sm:flex-row items-center justify-around">
                            <div className="w-full sm:w-1/2 h-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={pieDistributionData} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={3} dataKey="value">
                                            {pieDistributionData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderRadius: '12px', color: '#0F172A', fontSize: '12px' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="space-y-2 text-xs pr-4">
                                <h4 className="font-bold text-slate-900 text-sm">Verificación Porcentual (Suma = 100%)</h4>
                                {pieDistributionData.map((item, idx) => (
                                    <div key={idx} className="flex items-center justify-between gap-6 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-sm">
                                        <div className="flex items-center gap-2">
                                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></span>
                                            <span className="text-slate-700 font-semibold">{item.name}</span>
                                        </div>
                                        <span className="font-mono font-bold text-slate-900">
                                            {item.value} ({item.pct}%)
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-sm space-y-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-600" /> Desglose Operativo por Modalidad de Turno (8h y 12h)
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                    {shiftStats.map(sh => {
                        const isSelected = selectedShiftFilter === sh.key;
                        return (
                            <div
                                key={sh.key}
                                onClick={() => setSelectedShiftFilter(isSelected ? 'ALL' : sh.key)}
                                className={`cursor-pointer p-4 rounded-xl border transition-all ${isSelected
                                    ? 'bg-blue-50/70 border-blue-600 ring-2 ring-blue-500/20'
                                    : 'bg-slate-50/60 border-slate-200 hover:border-blue-400 hover:bg-white'
                                    }`}
                            >
                                <div className="flex justify-between items-start border-b border-slate-200/80 pb-2">
                                    <div>
                                        <span className="text-[10px] font-semibold text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-md">
                                            {sh.horario}
                                        </span>
                                        <h4 className="font-bold text-slate-900 text-xs mt-1.5">{sh.label}</h4>
                                    </div>
                                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${sh.absent > 0 ? 'bg-red-50 text-red-700 border-red-200' :
                                        sh.late > 0 ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                            'bg-emerald-50 text-emerald-700 border-emerald-200'
                                        }`}>
                                        {sh.attendanceRate}% Asist.
                                    </span>
                                </div>

                                <div className="grid grid-cols-5 gap-1.5 mt-3 text-center">
                                    <div className="bg-white p-1.5 rounded-lg border border-slate-200">
                                        <span className="block text-xs font-bold text-slate-800">{sh.total}</span>
                                        <span className="text-[9px] text-slate-500">Reg.</span>
                                    </div>
                                    <div className="bg-emerald-50/80 p-1.5 rounded-lg border border-emerald-200">
                                        <span className="block text-xs font-bold text-emerald-700">{sh.onTime}</span>
                                        <span className="text-[9px] text-emerald-700">OK</span>
                                    </div>
                                    <div className="bg-amber-50/80 p-1.5 rounded-lg border border-amber-200">
                                        <span className="block text-xs font-bold text-amber-700">{sh.late}</span>
                                        <span className="text-[9px] text-amber-700">Ret.</span>
                                    </div>
                                    <div className="bg-red-50/80 p-1.5 rounded-lg border border-red-200">
                                        <span className="block text-xs font-bold text-red-700">{sh.absent}</span>
                                        <span className="text-[9px] text-red-700">Falta</span>
                                    </div>
                                    <div className="bg-blue-50/80 p-1.5 rounded-lg border border-blue-200">
                                        <span className="block text-xs font-bold text-blue-700">{sh.totalHours}h</span>
                                        <span className="text-[9px] text-blue-700">Horas</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
