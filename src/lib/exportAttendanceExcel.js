// src/lib/exportAttendanceExcel.js
// Genera el reporte de asistencia en Excel (cliente)
// Soporta múltiples registros el mismo día (crea filas adicionales)

import ExcelJS from 'exceljs';
import { safeRound2 } from './attendanceMetrics';

/**
 * Genera fechas ISO locales sin desfase de zona horaria
 */
function generateDays(startDate, endDate) {
  const days = [];
  const [sy, sm, sd] = startDate.split('-').map(Number);
  const [ey, em, ed] = endDate.split('-').map(Number);
  const start = new Date(sy, sm - 1, sd);
  const end = new Date(ey, em - 1, ed);

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const iso = `${y}-${m}-${day}`;
    const weekday = d.toLocaleDateString('es-MX', { weekday: 'long' }).toUpperCase();
    const dayLabel = d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
    days.push({ iso, weekday, dayLabel });
  }
  return days;
}

/**
 * @param {Array} records - filteredRecords ya enriquecidos
 * @param {Object} options
 */
export async function exportAttendanceExcel(records = [], options = {}) {
  const {
    startDate,
    endDate,
    plantName = 'Todas',
    shiftFilter = 'ALL',
  } = options;

  if (!records.length) {
    alert('No hay registros en el periodo seleccionado.');
    return;
  }

  const days = generateDays(startDate, endDate);
  const daySet = new Set(days.map((d) => d.iso));

  // Agrupar por empNo + shift
  // Cada grupo guarda un array de registros por fecha (puede haber varios el mismo día)
  const groups = new Map();

  for (const rec of records) {
    if (!rec.date || !daySet.has(rec.date)) continue;

    const key = `${rec.empNo || ''}||${rec.shift || ''}`;
    if (!groups.has(key)) {
      groups.set(key, {
        empNo: rec.empNo || '',
        name: rec.inspectorName || '',
        shift: rec.shift || '',
        plantName: rec.plantName || '',
        byDate: {}, // date -> array of records
      });
    }
    const g = groups.get(key);
    if (!g.byDate[rec.date]) g.byDate[rec.date] = [];
    g.byDate[rec.date].push(rec);
  }

  // Determinar cuántas filas necesita cada grupo (máximo de registros en un mismo día)
  const groupList = Array.from(groups.values()).map((g) => {
    let maxPerDay = 1;
    for (const arr of Object.values(g.byDate)) {
      if (arr.length > maxPerDay) maxPerDay = arr.length;
    }
    // Ordenar registros de cada día por hora de entrada
    for (const arr of Object.values(g.byDate)) {
      arr.sort((a, b) => (a.plantQrScan || '').localeCompare(b.plantQrScan || ''));
    }
    return { ...g, maxPerDay };
  });

  // Ordenar grupos
  groupList.sort((a, b) =>
    (a.empNo || '').localeCompare(b.empNo || '') ||
    (a.shift || '').localeCompare(b.shift || '')
  );

  // Construir workbook
  const wb = new ExcelJS.Workbook();
  wb.creator = 'SIGA Asistencia';
  const ws = wb.addWorksheet('Asistencia', {
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
  });

  const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
  const subHeaderFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B82F6' } };
  const totalFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0F2FE' } };
  const shiftFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
  const whiteFont = { color: { argb: 'FFFFFFFF' }, bold: true };
  const center = { horizontal: 'center', vertical: 'middle' };
  const thinBorder = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' },
  };

  // Título
  const lastCol = 4 + days.length * 2 + 1;
  ws.mergeCells(1, 1, 1, lastCol);
  const titleCell = ws.getCell(1, 1);
  titleCell.value = `REPORTE DE ASISTENCIA  |  Planta: ${plantName}  |  Turno: ${shiftFilter === 'ALL' ? 'Todos' : shiftFilter}  |  ${startDate} al ${endDate}`;
  titleCell.font = { bold: true, size: 14, color: { argb: 'FF1E3A8A' } };
  titleCell.alignment = center;

  // Encabezados fijos
  ['NO.', 'NO. DE EMPLEADO', 'NOMBRE DEL TRABAJADOR', 'TURNO'].forEach((text, i) => {
    const cell = ws.getCell(2, i + 1);
    cell.value = text;
    cell.font = whiteFont;
    cell.fill = headerFill;
    cell.alignment = center;
    cell.border = thinBorder;
    ws.getCell(3, i + 1).fill = headerFill;
    ws.getCell(3, i + 1).border = thinBorder;
  });

  // Días
  let col = 5;
  days.forEach((day) => {
    ws.mergeCells(2, col, 2, col + 1);
    const cell = ws.getCell(2, col);
    cell.value = `${day.weekday}\n${day.dayLabel}`;
    cell.font = whiteFont;
    cell.fill = headerFill;
    cell.alignment = { ...center, wrapText: true };
    cell.border = thinBorder;
    ws.getCell(2, col + 1).border = thinBorder;

    ws.getCell(3, col).value = 'In';
    ws.getCell(3, col + 1).value = 'Out';
    [col, col + 1].forEach((c) => {
      const cCell = ws.getCell(3, c);
      cCell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cCell.fill = subHeaderFill;
      cCell.alignment = center;
      cCell.border = thinBorder;
    });
    col += 2;
  });

  const totalCol = col;
  ws.getCell(2, totalCol).value = 'Total Hrs';
  ws.getCell(2, totalCol).font = whiteFont;
  ws.getCell(2, totalCol).fill = headerFill;
  ws.getCell(2, totalCol).alignment = center;
  ws.getCell(2, totalCol).border = thinBorder;
  ws.getCell(3, totalCol).fill = headerFill;
  ws.getCell(3, totalCol).border = thinBorder;

  // Datos — una o más filas por grupo según maxPerDay
  let rowIdx = 4;
  let seq = 1;

  for (const g of groupList) {
    for (let sessionIdx = 0; sessionIdx < g.maxPerDay; sessionIdx++) {
      ws.getCell(rowIdx, 1).value = seq++;
      ws.getCell(rowIdx, 2).value = g.empNo;
      ws.getCell(rowIdx, 3).value = g.name;

      const shiftCell = ws.getCell(rowIdx, 4);
      shiftCell.value = g.shift + (g.maxPerDay > 1 ? ` (${sessionIdx + 1})` : '');
      shiftCell.fill = shiftFill;
      shiftCell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
      shiftCell.alignment = center;

      let totalHours = 0;
      col = 5;

      days.forEach((day) => {
        const dayRecs = g.byDate[day.iso] || [];
        const rec = dayRecs[sessionIdx]; // puede ser undefined si este día tiene menos registros

        const inTime = rec?.plantQrScan ? String(rec.plantQrScan).slice(0, 5) : '-';
        const outTime = rec?.departureTime ? String(rec.departureTime).slice(0, 5) : '-';

        ws.getCell(rowIdx, col).value = inTime;
        ws.getCell(rowIdx, col + 1).value = outTime;

        if (rec?.workedHoursDecimal) {
          totalHours += Number(rec.workedHoursDecimal) || 0;
        }
        col += 2;
      });

      const totalCell = ws.getCell(rowIdx, totalCol);
      totalCell.value = safeRound2(totalHours);
      totalCell.numFmt = '0.0';

      for (let c = 1; c <= totalCol; c++) {
        const cell = ws.getCell(rowIdx, c);
        cell.alignment = center;
        cell.border = thinBorder;
      }
      rowIdx++;
    }
  }

  // Fila TOTAL
  const totalRow = rowIdx;
  ws.mergeCells(totalRow, 2, totalRow, 4);
  ws.getCell(totalRow, 2).value = 'TOTAL HRS';
  ws.getCell(totalRow, 2).font = { bold: true };
  ws.getCell(totalRow, 2).alignment = { horizontal: 'right', vertical: 'middle' };

  const firstDataRow = 4;
  const lastDataRow = totalRow - 1;
  if (lastDataRow >= firstDataRow) {
    const startAddr = ws.getCell(firstDataRow, totalCol).address;
    const endAddr = ws.getCell(lastDataRow, totalCol).address;
    ws.getCell(totalRow, totalCol).value = { formula: `SUM(${startAddr}:${endAddr})` };
    ws.getCell(totalRow, totalCol).numFmt = '0.0';
  }

  for (let c = 1; c <= totalCol; c++) {
    const cell = ws.getCell(totalRow, c);
    cell.fill = totalFill;
    cell.border = thinBorder;
    cell.font = { bold: true };
  }

  // Anchos y freeze
  ws.getColumn(1).width = 6;
  ws.getColumn(2).width = 18;
  ws.getColumn(3).width = 36;
  ws.getColumn(4).width = 24;
  for (let c = 5; c < totalCol; c++) ws.getColumn(c).width = 12;
  ws.getColumn(totalCol).width = 12;
  ws.getRow(2).height = 36;
  ws.views = [{ state: 'frozen', xSplit: 4, ySplit: 3 }];

  // Descargar
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.download = `Asistencia_${startDate}_al_${endDate}.xlsx`;
  a.href = url;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}