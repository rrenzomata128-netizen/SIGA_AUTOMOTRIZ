// Siguiente número de nómina para un prefijo (NOM, SUP, ADM, RH), a partir del mayor que ya existe.
// Antes se calculaba contando usuarios, lo que repetía números ya usados.
export const nextEmpNo = (prefix, users = []) => {
    const re = new RegExp(`^${prefix}-(\\d+)$`, 'i');
    let max = 0;
    let width = 4;
    for (const u of users) {
        const m = re.exec(String(u.empNo || '').trim());
        if (!m) continue;
        max = Math.max(max, parseInt(m[1], 10));
        width = Math.max(width, m[1].length);
    }
    const base = prefix === 'NOM' ? 1040 : 0; // la numeración de inspectores arranca en 1041
    return `${prefix}-${String(Math.max(max, base) + 1).padStart(width, '0')}`;
};
