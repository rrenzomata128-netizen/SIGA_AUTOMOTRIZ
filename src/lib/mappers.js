// Mapeo entre PostgreSQL (snake_case) y React (camelCase)

export const mapPlantRow = (p) => {
    let parsedShifts = ['Turno 1 (06:00 - 14:30)'];
    if (Array.isArray(p.shifts)) {
        parsedShifts = p.shifts;
    } else if (typeof p.shifts === 'string' && p.shifts.trim() !== '') {
        try {
            const parsed = JSON.parse(p.shifts);
            parsedShifts = Array.isArray(parsed) ? parsed : p.shifts.split(',').map(s => s.trim()).filter(Boolean);
        } catch {
            parsedShifts = p.shifts.split(',').map(s => s.trim()).filter(Boolean);
        }
    }
    return {
        id: p.id,
        code: p.code || '',
        name: p.name || '',
        supervisor: p.supervisor || 'Por Asignar',
        requiredHeadcount: Number(p.required_headcount) || 1,
        shifts: parsedShifts,
        activeLines: p.active_lines || ''
    };
};

export const mapUserRow = (u) => {
    // Normalizar puesto tomando prioritariamente la columna de la base de datos
    const userJob = u.position || u.role || 'Puesto no asignado';

    return {
        id: u.id,
        empNo: u.emp_no,
        name: u.name,
        position: userJob,      // 👈 Clave para que la tabla y Supabase se mantengan sincronizados
        role: userJob,          // 👈 Retrocompatibilidad
        puesto: userJob,
        systemRole: u.system_role,
        plantId: u.plant_id,
        shift: u.shift,
        phone: u.phone || '',
        pin: u.pin || '',
        status: u.status || (u.active !== false ? 'ACTIVO' : 'BAJA'),
        active: u.status ? u.status === 'ACTIVO' : u.active !== false,
        allowTerminalSwitch: Boolean(u.allow_terminal_switch),
        avatarUrl: u.photo_url || u.avatar_url || '',
        photoUrl: u.photo_url || u.avatar_url || ''
    };
};

export const mapAttendanceRow = (r) => ({
    id: r.id,
    inspectorId: r.inspector_id,
    empNo: r.emp_no,
    inspectorName: r.inspector_name,
    plantId: r.plant_id,
    plantName: r.plant_name,
    shift: r.shift,
    date: r.date,
    transportCheckIn: r.transport_check_in || '',
    plantQrScan: r.plant_qr_scan || '',
    departureTime: r.departure_time || '',
    status: r.status,
    incidentReason: r.incident_reason || '',
    comments: r.comments || '',
    validatedBySupervisor: Boolean(r.validated_by_supervisor),
    replacementStatus: r.replacement_status || 'No requerido'
});

export const toAttendancePayload = (rec) => ({
    id: rec.id,
    inspector_id: rec.inspectorId,
    emp_no: rec.empNo,
    inspector_name: rec.inspectorName,
    plant_id: rec.plantId,
    plant_name: rec.plantName,
    shift: rec.shift,
    date: rec.date,
    transport_check_in: rec.transportCheckIn || '',
    plant_qr_scan: rec.plantQrScan || '',
    departure_time: rec.departureTime || '',
    status: rec.status,
    incident_reason: rec.incidentReason || 'Ninguno',
    comments: rec.comments || '',
    validated_by_supervisor: Boolean(rec.validatedBySupervisor),
    replacement_status: rec.replacementStatus || 'No requerido'
});
