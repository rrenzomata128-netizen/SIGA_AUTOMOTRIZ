// Motor aritmético y de validación horaria

export const safeRound2 = (value) => {
    const num = Number(value);
    if (!Number.isFinite(num) || isNaN(num)) return 0;
    return Math.round((num + Number.EPSILON) * 100) / 100;
};

export const safePercentage = (part, total, decimals = 1) => {
    const p = Number(part);
    const t = Number(total);
    if (!Number.isFinite(p) || !Number.isFinite(t) || t <= 0) return 0;
    const factor = Math.pow(10, decimals);
    return Math.round(((p / t) * 100 + Number.EPSILON) * factor) / factor;
};

export const parseTimeToMinutes = (timeStr) => {
    if (!timeStr || typeof timeStr !== 'string' || !timeStr.includes(':')) return null;
    const parts = timeStr.trim().split(':');
    if (parts.length !== 2) return null;
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        return null;
    }
    return hours * 60 + minutes;
};

export const formatMinutesToHHMM = (totalMinutes) => {
    const mins = Math.max(0, Math.round(Number(totalMinutes) || 0));
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${String(m).padStart(2, '0')}m`;
};


export const parseShiftSchedule = (shiftName = '') => {
    const match = shiftName.match(/(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})/);
    if (!match) {
        const is12h = shiftName.toLowerCase().includes('12h');
        return {
            startMinutes: 360,
            endMinutes: is12h ? 1080 : 870,
            scheduledMinutes: is12h ? 720 : 510,
            scheduledHours: is12h ? 12 : 8.5,
            startStr: '06:00',
            endStr: is12h ? '18:00' : '14:30'
        };
    }
    const startMinutes = parseTimeToMinutes(match[1]);
    let endMinutes = parseTimeToMinutes(match[2]);
    let scheduledMinutes = endMinutes - startMinutes;
    if (scheduledMinutes <= 0) {
        scheduledMinutes += 24 * 60;
    }
    return {
        startMinutes,
        endMinutes,
        scheduledMinutes,
        scheduledHours: safeRound2(scheduledMinutes / 60),
        startStr: match[1],
        endStr: match[2]
    };
};

export const evaluateAttendanceMetrics = (record) => {
    const schedule = parseShiftSchedule(record.shift);
    const inMins = parseTimeToMinutes(record.plantQrScan);
    const outMins = parseTimeToMinutes(record.departureTime);
    const transportMins = parseTimeToMinutes(record.transportCheckIn);

    let lateMinutes = 0;
    if (inMins !== null && schedule.startMinutes !== null) {
        let diffFromStart = inMins - schedule.startMinutes;
        if (diffFromStart < -720) diffFromStart += 1440;
        if (diffFromStart > 720) diffFromStart -= 1440;
        lateMinutes = diffFromStart > 0 ? diffFromStart : 0;
    }

    if (record.status === 'Falta' || inMins === null) {
        return {
            scheduledMinutes: schedule.scheduledMinutes,
            scheduledHours: schedule.scheduledHours,
            workedMinutes: 0,
            regularMinutes: 0,
            overtimeMinutes: 0,
            regularHours: 0,
            overtimeHours: 0,
            workedHoursDecimal: 0,
            workedHoursFormatted: record.status === 'Falta' ? '0h 00m (Ausente)' : 'Sin entrada QR',
            lateMinutes: 0,
            hasTransport: transportMins !== null,
            hasQrEntry: false,
            isShiftComplete: false,
            shiftStateLabel: record.status === 'Falta' ? 'Ausencia Confirmada' : 'Pendiente Ingreso'
        };
    }

    if (outMins === null) {
        return {
            scheduledMinutes: schedule.scheduledMinutes,
            scheduledHours: schedule.scheduledHours,
            workedMinutes: 0,
            regularMinutes: 0,
            overtimeMinutes: 0,
            regularHours: 0,
            overtimeHours: 0,
            workedHoursDecimal: 0,
            workedHoursFormatted: 'En turno activo',
            lateMinutes,
            hasTransport: transportMins !== null,
            hasQrEntry: true,
            isShiftComplete: false,
            shiftStateLabel: 'En Línea (Turno Activo)'
        };
    }

    let elapsedMinutes = outMins - inMins;
    if (elapsedMinutes < 0) {
        elapsedMinutes += 24 * 60;
    }
    elapsedMinutes = Math.max(0, Math.min(elapsedMinutes, 1200));

    const regularMinutes = Math.min(elapsedMinutes, schedule.scheduledMinutes);
    const overtimeMinutes = Math.max(0, elapsedMinutes - schedule.scheduledMinutes);

    const regularHours = safeRound2(regularMinutes / 60);
    const overtimeHours = safeRound2(overtimeMinutes / 60);
    const workedHoursDecimal = safeRound2(regularHours + overtimeHours);

    return {
        scheduledMinutes: schedule.scheduledMinutes,
        scheduledHours: schedule.scheduledHours,
        workedMinutes: elapsedMinutes,
        regularMinutes,
        overtimeMinutes,
        regularHours,
        overtimeHours,
        workedHoursDecimal,
        workedHoursFormatted: formatMinutesToHHMM(elapsedMinutes),
        lateMinutes,
        hasTransport: transportMins !== null,
        hasQrEntry: true,
        isShiftComplete: true,
        shiftStateLabel: 'Jornada Concluida'
    };
};

