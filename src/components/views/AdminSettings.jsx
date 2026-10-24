import React from 'react';
import { Building2, Plus, Shield, UserPlus, Users } from 'lucide-react';

export default function AdminSettings({
    adminSubTab,
    setAdminSubTab,
    roleFilterAdmin,
    setRoleFilterAdmin,
    plantFilterAdmin,
    setPlantFilterAdmin,
    setIsUserModalOpen,
    setEditingUser,
    setIsPlantModalOpen,
    setEditingPlant,
    plants,
    systemUsers,
    handleOpenNewUserModal,
    handleToggleUserStatus,
    handleDeleteUser,
    handleOpenNewPlantModal,
}) {
    return (
        <div className="space-y-5">
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-sm flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="bg-indigo-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase">
                            Exclusivo Administrador General
                        </span>
                        <span className="text-xs text-slate-500">Control Maestro de Accesos y Catálogos en Supabase</span>
                    </div>
                    <h2 className="text-base font-bold text-slate-900 mt-1 flex items-center gap-2">
                        <Shield className="w-5 h-5 text-indigo-600" /> Administración de Usuarios (Admin, RH, Supervisores, Inspectores) y Plantas Clientes
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                        Toda alta o modificación actualiza directamente las tablas `profiles` y `plants` en Supabase.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                    <button
                        type="button"
                        onClick={() => handleOpenNewUserModal('INSPECTOR')}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-colors"
                    >
                        <UserPlus className="w-4 h-4" /> + Alta Usuario / Personal
                    </button>
                    <button
                        type="button"
                        onClick={handleOpenNewPlantModal}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-colors"
                    >
                        <Building2 className="w-4 h-4" /> + Generar Nueva Planta Cliente
                    </button>
                </div>
            </div>

            <div className="inline-flex flex-wrap items-center gap-1.5 bg-slate-200/80 p-1.5 rounded-xl border border-slate-300/80">
                <button
                    type="button"
                    onClick={() => setAdminSubTab('USERS')}
                    className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${adminSubTab === 'USERS' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-700 hover:bg-white/70'
                        }`}
                >
                    <Users className="w-4 h-4" /> 1. Directorio de Usuarios y Roles ({systemUsers.length})
                </button>
                <button
                    type="button"
                    onClick={() => setAdminSubTab('PLANTS')}
                    className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${adminSubTab === 'PLANTS' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-700 hover:bg-white/70'
                        }`}
                >
                    <Building2 className="w-4 h-4" /> 2. Catálogo de Plantas Clientes ({plants.length})
                </button>
                <button
                    type="button"
                    onClick={() => setAdminSubTab('ROLES_MATRIX')}
                    className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${adminSubTab === 'ROLES_MATRIX' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-700 hover:bg-white/70'
                        }`}
                >
                    <Shield className="w-4 h-4" /> 3. Matriz de Permisos por Rol
                </button>
            </div>

            {adminSubTab === 'USERS' && (
                <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-4 bg-white rounded-2xl border border-slate-200/90 p-4 shadow-sm">
                        <div className="flex items-center gap-2">
                            <label className="text-xs font-semibold text-slate-700">Filtrar por Rol:</label>
                            <select
                                value={roleFilterAdmin}
                                onChange={(e) => setRoleFilterAdmin(e.target.value)}
                                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                            >
                                <option value="ALL">Todos</option>
                                <option value="ADMIN">Administradores</option>
                                <option value="RH">Recursos Humanos</option>
                                <option value="SUPERVISOR">Supervisores de Planta</option>
                                <option value="INSPECTOR">Inspectores técnicos</option>
                            </select>
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="text-xs font-semibold text-slate-700">Filtrar por Planta:</label>
                            <select
                                value={plantFilterAdmin}
                                onChange={(e) => setPlantFilterAdmin(e.target.value)}
                                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                            >
                                <option value="ALL">Todas las Plantas</option>
                                {plants.map(p => (
                                    <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
                        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                            <div className="flex items-center gap-2">
                                <strong className="text-slate-900">Padrón Oficial de Usuarios y Roles del Sistema</strong>
                                {(roleFilterAdmin !== 'ALL' || plantFilterAdmin !== 'ALL') && (
                                    <span className="bg-indigo-100 text-indigo-800 px-2.5 py-0.5 rounded-full font-bold text-[11px]">
                                        Filtros activos
                                    </span>
                                )}
                            </div>
                            <span className="text-slate-500">
                                Sincronizado directamente con `profiles` en Supabase
                            </span>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr className="bg-slate-100/80 text-slate-600 border-b border-slate-200">
                                        <th className="p-3.5 font-bold">No. Nómina / ID</th>
                                        <th className="p-3.5 font-bold">Nombre Completo / Puesto</th>
                                        <th className="p-3.5 font-bold">Rol en Sistema</th>
                                        <th className="p-3.5 font-bold">Planta Asignada / Turno</th>
                                        <th className="p-3.5 font-bold">Teléfono / PIN</th>
                                        <th className="p-3.5 font-bold text-center">Estado</th>
                                        <th className="p-3.5 font-bold text-center">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {systemUsers
                                        .filter(u => {
                                            // 1. Filtro de Rol
                                            const userRole = (u.systemRole || u.system_role || '').toUpperCase();
                                            const matchesRole = roleFilterAdmin === 'ALL' || userRole === roleFilterAdmin.toUpperCase();

                                            // 2. Filtro de Planta con soporte para cadenas con comas
                                            const matchesPlant = (() => {
                                                if (plantFilterAdmin === 'ALL') return true;

                                                const rawUserPlants = u.plantId || u.plant_id || '';
                                                if (rawUserPlants === 'ALL') return true;

                                                const targetPlant = plants.find(p => p.id === plantFilterAdmin || p.code === plantFilterAdmin);
                                                const targetCode = (targetPlant?.code || plantFilterAdmin || '').trim().toUpperCase();
                                                const targetId = String(targetPlant?.id || plantFilterAdmin || '').trim().toUpperCase();

                                                const userPlantTokens = (Array.isArray(rawUserPlants)
                                                    ? rawUserPlants.flatMap(s => String(s).split(','))
                                                    : String(rawUserPlants).split(',')
                                                ).map(s => s.trim().toUpperCase()).filter(Boolean);

                                                return userPlantTokens.includes('ALL') ||
                                                    userPlantTokens.includes(targetCode) ||
                                                    userPlantTokens.includes(targetId);
                                            })();

                                            return matchesRole && matchesPlant;
                                        })
                                        .map(u => {
                                            const isActive = u.active !== undefined ? u.active : (u.status === 'ACTIVO');
                                            const userPosition = u.position || u.puesto || u.role || 'Puesto no asignado';

                                            return (
                                                <tr key={u.id} className={`hover:bg-blue-50/40 transition-colors ${!isActive ? 'opacity-50 bg-slate-50' : ''}`}>
                                                    <td className="p-3.5 font-mono font-bold text-blue-600">
                                                        {u.empNo || u.emp_no}
                                                    </td>
                                                    <td className="p-3.5">
                                                        <span className="font-bold text-slate-900 block">{u.name}</span>
                                                        <span className="text-[11px] text-slate-500 font-medium">{userPosition}</span>
                                                    </td>
                                                    <td className="p-3.5">
                                                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${(u.systemRole || u.system_role) === 'ADMIN' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                                                            (u.systemRole || u.system_role) === 'RH' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                                (u.systemRole || u.system_role) === 'SUPERVISOR' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                                    'bg-amber-50 text-amber-800 border-amber-200'
                                                            }`}>
                                                            {(u.systemRole || u.system_role) === 'ADMIN' ? 'Administrador General' :
                                                                (u.systemRole || u.system_role) === 'RH' ? 'Recursos Humanos (RH)' :
                                                                    (u.systemRole || u.system_role) === 'SUPERVISOR' ? 'Supervisor de Planta' :
                                                                        'Inspector / Operativo'}
                                                        </span>
                                                    </td>
                                                    <td className="p-3.5">
                                                        <span className="font-semibold text-slate-800 block">
                                                            {(() => {
                                                                const rawPlant = u.plantId || u.plant_id || '';
                                                                if (rawPlant === 'ALL') return 'Matriz (Todas las Plantas)';

                                                                const rawItems = Array.isArray(rawPlant)
                                                                    ? rawPlant.flatMap(s => String(s).split(','))
                                                                    : String(rawPlant).split(',');

                                                                const ids = [...new Set(rawItems.map(s => s.trim()).filter(Boolean))];

                                                                return ids.map(pid => {
                                                                    const pl = plants.find(p => p.id === pid || p.code === pid);
                                                                    return pl ? pl.code : pid;
                                                                }).join(', ') || 'Sin Planta';
                                                            })()}
                                                        </span>
                                                        <span className="text-[11px] text-slate-500">{u.shift}</span>
                                                    </td>
                                                    <td className="p-3.5 font-mono text-[11px]">
                                                        <span className="block text-slate-700">{u.phone || '--'}</span>
                                                    </td>
                                                    <td className="p-3.5 text-center">
                                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-700'
                                                            }`}>
                                                            {isActive ? 'ACTIVO' : 'BAJA'}
                                                        </span>
                                                    </td>
                                                    <td className="p-3.5 text-center">
                                                        <div className="flex items-center justify-center gap-1.5">
                                                            <button
    type="button"
    onClick={() => {
        // Extraer las plantas del usuario, ya sea de user_plants, plantId o plant_id
        let userPlantsList = [];
        if (Array.isArray(u.user_plants) && u.user_plants.length > 0) {
            userPlantsList = u.user_plants.map(up => up.plant_id || up.plants?.code || up.plants?.id);
        } else if (u.plantId || u.plant_id) {
            const raw = u.plantId || u.plant_id;
            userPlantsList = Array.isArray(raw) 
                ? raw 
                : String(raw).split(',').map(s => s.trim()).filter(Boolean);
        }

        // Si decía 'Sin Planta', vaciar para obligar a seleccionar
        userPlantsList = userPlantsList.filter(p => p !== 'Sin Planta');

        setEditingUser({
            ...u,
            plantId: userPlantsList,
            plant_id: userPlantsList,
            position: userPosition,
            puesto: userPosition,
            isNew: false
        });
        if (typeof setUserModalError === 'function') setUserModalError(null);
        setIsUserModalOpen(true);
    }}
                                                                className="bg-slate-100 hover:bg-blue-600 text-slate-700 hover:text-white px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors"
                                                            >
                                                                Editar
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleToggleUserStatus(u.id)}
                                                                className="bg-slate-100 hover:bg-red-600 text-slate-600 hover:text-white px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors"
                                                            >
                                                                {isActive ? 'Dar Baja' : 'Reactivar'}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDeleteUser(u)}
                                                                title="Eliminar registro definitivamente"
                                                                className="bg-slate-100 hover:bg-rose-600 text-slate-500 hover:text-white px-2 py-1 rounded-lg text-xs font-semibold transition-colors"
                                                            >
                                                                Eliminar
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {adminSubTab === 'PLANTS' && (
                <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
                    <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div>
                            <h3 className="text-sm font-bold text-slate-900">
                                Catálogo Maestro de Plantas Clientes ({plants.length} Plantas en BD)
                            </h3>
                            <p className="text-xs text-slate-500">
                                Agrega nuevas plantas automotrices, define su código QR, supervisor titular, plantilla requerida y horarios de turno.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={handleOpenNewPlantModal}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
                        >
                            <Plus className="w-4 h-4" /> + Generar Nueva Planta
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="bg-slate-100/80 text-slate-600 border-b border-slate-200">
                                    <th className="p-3.5 font-bold">Código</th>
                                    <th className="p-3.5 font-bold">Nombre de Planta Cliente / Línea</th>
                                    <th className="p-3.5 font-bold">Supervisor Responsable</th>
                                    <th className="p-3.5 font-bold text-center">Headcount Req.</th>
                                    <th className="p-3.5 font-bold">Turnos Configurados (8h / 12h)</th>
                                    <th className="p-3.5 font-bold text-center">Acción</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {plants.map(p => (
                                    <tr key={p.id} className="hover:bg-blue-50/40 transition-colors">
                                        <td className="p-3.5">
                                            <span className="font-mono font-bold bg-blue-600 text-white px-2.5 py-1 rounded-md">
                                                {p.code}
                                            </span>
                                        </td>
                                        <td className="p-3.5">
                                            <span className="font-bold text-slate-900 block">{p.name}</span>
                                            <span className="text-[11px] text-slate-500">{p.activeLines}</span>
                                        </td>
                                        <td className="p-3.5 font-semibold text-slate-800">
                                            {p.supervisor}
                                        </td>
                                        <td className="p-3.5 text-center font-mono font-bold text-slate-900">
                                            {p.requiredHeadcount} insp.
                                        </td>
                                        <td className="p-3.5">
                                            <div className="flex flex-wrap gap-1">
                                                {(p.shifts || []).map((s, idx) => (
                                                    <span key={idx} className="bg-slate-100 border border-slate-200 text-slate-700 px-2 py-0.5 rounded text-[11px]">
                                                        {s}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="p-3.5 text-center">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setEditingPlant({
                                                        ...p,
                                                        shiftScheme: 'CUSTOM',
                                                        shiftsText: (p.shifts || []).join(', '),
                                                        isNew: false
                                                    });
                                                    setIsPlantModalOpen(true);
                                                }}
                                                className="bg-slate-100 hover:bg-blue-600 text-slate-700 hover:text-white px-3 py-1 rounded-lg text-xs font-semibold transition-colors"
                                            >
                                                Editar Planta
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {adminSubTab === 'ROLES_MATRIX' && (
                <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-sm space-y-4">
                    <h3 className="text-sm font-bold text-slate-900">
                        Definición de Roles, Funciones y Nivel de Autoridad en el Sistema
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-200 space-y-2">
                            <div className="font-bold text-indigo-900 text-sm flex items-center justify-between">
                                <span>1. Administrador General</span>
                                <span className="bg-indigo-600 text-white text-[10px] px-2 py-0.5 rounded-full">Acceso Total</span>
                            </div>
                            <ul className="space-y-1 text-slate-700 list-disc pl-4">
                                <li>Alta, edición y baja de usuarios de cualquier rol en Supabase.</li>
                                <li>Creación de nuevas Plantas Clientes y configuración de turnos (8h y 12h).</li>
                                <li><strong>Llave Maestra de Desbloqueo:</strong> Único rol que puede desbloquear en la pestaña <em>5. Bitácora</em> un registro que un supervisor haya validado por error.</li>
                            </ul>
                        </div>

                        <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200 space-y-2">
                            <div className="font-bold text-blue-900 text-sm flex items-center justify-between">
                                <span>2. Recursos Humanos y Nómina (Matriz)</span>
                                <span className="bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded-full">Operación y Nómina</span>
                            </div>
                            <ul className="space-y-1 text-slate-700 list-disc pl-4">
                                <li>Consulta de Resumen Ejecutivo, gráficas y Monitor de Plantas.</li>
                                <li>Auditoría de Prenómina y descarga de Excel (`.CSV`).</li>
                                <li>Asignación de inspectores comodín en Alertas de Cero Holgura.</li>
                            </ul>
                        </div>

                        <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-2">
                            <div className="font-bold text-emerald-900 text-sm flex items-center justify-between">
                                <span>3. Supervisor / Encargado en Planta</span>
                                <span className="bg-emerald-600 text-white text-[10px] px-2 py-0.5 rounded-full">Control en Línea</span>
                            </div>
                            <ul className="space-y-1 text-slate-700 list-disc pl-4">
                                <li>Despliegue en pantalla del Código QR Dinámico de su planta (rota cada 60s).</li>
                                <li>Pase de lista y validación de asistencia en Supabase.</li>
                                <li><strong>Candado de Seguridad:</strong> Una vez validado un registro, queda bloqueado en BD.</li>
                            </ul>
                        </div>

                        <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200 space-y-2">
                            <div className="font-bold text-amber-900 text-sm flex items-center justify-between">
                                <span>4. Inspector de Calidad / Técnico</span>
                                <span className="bg-amber-600 text-white text-[10px] px-2 py-0.5 rounded-full">App Móvil</span>
                            </div>
                            <ul className="space-y-1 text-slate-700 list-disc pl-4">
                                <li>Paso 1: Confirmar abordaje de transporte en Supabase.</li>
                                <li>Paso 2: Escanear el código QR del supervisor al llegar a la planta.</li>
                                <li>Paso 3: Registrar su hora de salida al concluir el turno.</li>
                            </ul>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
