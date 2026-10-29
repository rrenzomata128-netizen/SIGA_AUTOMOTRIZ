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
            lateMinutes: record.status === 'Retardo' ? lateMinutes : 0,
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
        lateMinutes: record.status === 'Retardo' ? lateMinutes : 0,
        hasTransport: transportMins !== null,
        hasQrEntry: true,
        isShiftComplete: true,
        shiftStateLabel: 'Jornada Concluida'
    };
};

// Desglosa tiempo extra acumulado en Dobles (hasta 9h por semana ISO, 200%) y Triples (excedente >9h, 300%) conforme Arts. 66-68 LFT
export const evaluateLftOvertimeBreakdown = (sessions = []) => {
    const getIsoWeekKey = (dateStr) => {
        if (!dateStr) return 'DEFAULT-WEEK';
        const parts = String(dateStr).split('-').map(Number);
        if (parts.length !== 3 || parts.some(isNaN)) return 'DEFAULT-WEEK';
        const d = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
        return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
    };

    const byWeek = {};
    for (const s of sessions) {
        const wk = getIsoWeekKey(s.date);
        byWeek[wk] = (byWeek[wk] || 0) + (Number(s.overtimeMinutes) || 0);
    }

    let doubleOvertimeMinutes = 0;
    let tripleOvertimeMinutes = 0;
    const WEEKLY_DOUBLE_CAP_MINUTES = 9 * 60; // 9 horas semanales = 540 min (Art. 66 y 68 LFT)

    for (const totalWeekExtMins of Object.values(byWeek)) {
        const dbl = Math.min(totalWeekExtMins, WEEKLY_DOUBLE_CAP_MINUTES);
        const trp = Math.max(0, totalWeekExtMins - WEEKLY_DOUBLE_CAP_MINUTES);
        doubleOvertimeMinutes += dbl;
        tripleOvertimeMinutes += trp;
    }

    return {
        doubleOvertimeMinutes,
        tripleOvertimeMinutes,
        doubleOvertimeHours: safeRound2(doubleOvertimeMinutes / 60),
        tripleOvertimeHours: safeRound2(tripleOvertimeMinutes / 60)
    };
};

// Compresión de fotografía en cliente (Canvas -> JPEG optimizado <= ~80KB) para evitar sobrecarga en BD y Realtime
export const compressAvatarImage = (file, maxDimension = 320, quality = 0.8) =>
    new Promise((resolve, reject) => {
        if (!file) return reject(new Error('Archivo no válido'));
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('No se pudo leer el archivo de imagen'));
        reader.onload = (ev) => {
            const img = new Image();
            img.onerror = () => reject(new Error('Formato de imagen no soportado'));
            img.onload = () => {
                let { width, height } = img;
                if (width > maxDimension || height > maxDimension) {
                    if (width > height) {
                        height = Math.round((height * maxDimension) / width);
                        width = maxDimension;
                    } else {
                        width = Math.round((width * maxDimension) / height);
                        height = maxDimension;
                    }
                }
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
    });

// ============================================================================
// MOTOR TOTP DE CÓDIGO QR DINÁMICO POR PLANTA (VENTANA DE 60s + TOLERANCIA)
// ============================================================================
const computeTotpPin4 = (plantCode, windowIndex) => {
    const cleanCode = String(plantCode || 'PLANTA').trim().toUpperCase();
    const seed = `SIGA-QR-V10::${cleanCode}::${windowIndex}`;
    let hash = 2166136261;
    for (let i = 0; i < seed.length; i++) {
        hash ^= seed.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    const positive = (hash >>> 0) % 9000 + 1000;
    return String(positive);
};

export const generatePlantQrState = (plantId, plantCode, nowMs = Date.now(), manualSalt = 0) => {
    const cleanCode = String(plantCode || 'PLANTA').trim().toUpperCase();
    const windowIndex = Math.floor(nowMs / 60000) + manualSalt;
    const pin4 = computeTotpPin4(cleanCode, windowIndex);
    const secondsLeft = 60 - (Math.floor(nowMs / 1000) % 60);
    return {
        plantId: plantId || '',
        plantCode: cleanCode,
        pin4,
        code: `QR-AUTH-${cleanCode}-${pin4}`,
        secondsLeft: secondsLeft === 0 ? 60 : secondsLeft
    };
};

// Valida tanto el token completo (QR-AUTH-CODE-1234) como los 4 dígitos dinámicos (1234)
// Acepta ventana amplia (-15 a +15 min por desfase de reloj entre PC y celular o regeneración manual) y el código transmitido en vivo
export const verifyPlantQrInput = (rawInput, plantCode, liveBroadcastCode = null, nowMs = Date.now(), allPlantCodes = []) => {
    const input = String(rawInput || '').trim().toUpperCase();
    if (!input) return { valid: false, reason: 'Ingresa los 4 dígitos o escanea el código QR de la terminal en planta.' };

    const cleanCode = String(plantCode || 'PLANTA').trim().toUpperCase();
    const currentWin = Math.floor(nowMs / 60000);
    const validPins = new Set();

    // Ventana tolerante (-15 a +15) para absorber desfases de reloj entre PC y celular y saltos de regeneración manual
    const candidatePlantCodes = new Set([
        cleanCode,
        'PLANTA',
        ...(Array.isArray(allPlantCodes) ? allPlantCodes.map(c => String(c || '').trim().toUpperCase()).filter(Boolean) : [])
    ]);

    for (const codeCandidate of candidatePlantCodes) {
        for (let offset = -15; offset <= 15; offset++) {
            validPins.add(computeTotpPin4(codeCandidate, currentWin + offset));
        }
    }

    if (liveBroadcastCode) {
        if (Array.isArray(liveBroadcastCode)) {
            for (const bc of liveBroadcastCode) {
                const m = String(bc || '').toUpperCase().match(/(\d{4})$/);
                if (m) validPins.add(m[1]);
            }
        } else {
            const m = String(liveBroadcastCode).toUpperCase().match(/(\d{4})$/);
            if (m) validPins.add(m[1]);
        }
    }

    // Extraer los 4 dígitos si el usuario ingresó solo los 4 números o el token completo
    const pinMatch = input.match(/^(\d{4})$/) || input.match(new RegExp(`^QR-AUTH-${cleanCode}-(\\d{4})$`, 'i')) || input.match(/-(\d{4})$/);
    if (!pinMatch) {
        return { valid: false, reason: 'Formato de código QR inválido. Ingresa los 4 dígitos dinámicos de tu planta.' };
    }

    const enteredPin = pinMatch[1];
    if (!validPins.has(enteredPin)) {
        return { valid: false, reason: 'Código QR expirado o incorrecto. Verifica el token activo en la pantalla del supervisor.' };
    }

    return {
        valid: true,
        fullCode: `QR-AUTH-${cleanCode}-${enteredPin}`
    };
};



