// Corrige la asignación de plantas de usuarios migrados.
// El script anterior solo reconocía ids exactos; en tu app las plantas se guardaban
// como códigos o ids en mayúsculas, a veces separados por comas. Aquí se resuelven bien.
// Uso:  node --env-file=.env.migracion scripts/reparar-plantas.mjs
import { createClient } from '@supabase/supabase-js';

const { SUPABASE_URL, SUPABASE_SECRET_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
    console.error('Faltan SUPABASE_URL o SUPABASE_SECRET_KEY en .env.migracion');
    process.exit(1);
}
const admin = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, { auth: { persistSession: false } });

const { data: plants } = await admin.from('plants').select('id, code');
const { data: users } = await admin.from('system_users').select('id, emp_no, system_role, plant_id').order('emp_no');
const { data: profiles } = await admin.from('profiles').select('id, legacy_id');
const byLegacy = new Map(profiles.map((p) => [p.legacy_id, p.id]));

const keysOf = (v) =>
    (Array.isArray(v) ? v : typeof v === 'string' ? v.split(',') : [])
        .map((s) => String(s).trim().toUpperCase())
        .filter((s) => s && s !== 'ALL');

let fixed = 0, empty = 0;
for (const u of users) {
    if (u.system_role !== 'SUPERVISOR' && u.system_role !== 'INSPECTOR') continue;
    const uid = byLegacy.get(u.id);
    if (!uid) { console.log(`- ${u.emp_no}: sin perfil migrado, se omite`); continue; }

    const keys = keysOf(u.plant_id);
    const ids = [];
    const unknown = [];
    for (const k of keys) {
        const hit = plants.find((p) => String(p.id).toUpperCase() === k || String(p.code).toUpperCase() === k);
        if (hit) ids.push(hit.id); else unknown.push(k);
    }
    const unique = [...new Set(ids)];

    if (unique.length) {
        const { error } = await admin.from('user_plants')
            .upsert(unique.map((plant_id) => ({ user_id: uid, plant_id })), { onConflict: 'user_id,plant_id', ignoreDuplicates: true });
        if (error) { console.error(`✗ ${u.emp_no}: ${error.message}`); continue; }
        fixed++;
        console.log(`✓ ${u.emp_no}: ${unique.length} planta(s)${unknown.length ? '  (no reconocidas: ' + unknown.join(', ') + ')' : ''}`);
    } else {
        empty++;
        console.log(`⚠ ${u.emp_no} (${u.system_role}): SIN plantas. Valor original: ${JSON.stringify(u.plant_id)}`);
    }
}
console.log(`\nConPlantas: ${fixed} | Sin plantas: ${empty}`);
if (empty) console.log('Asigna manualmente las plantas de los usuarios marcados con ⚠ desde la pantalla de usuarios.');
