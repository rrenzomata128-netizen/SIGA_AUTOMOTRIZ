// Migra system_users -> Supabase Auth + profiles + user_plants.
// Genera PINs nuevos de 6 dígitos y los guarda en pines_nuevos.csv (NO subir a Git).
// Uso:  node --env-file=.env.migracion scripts/migrar-usuarios.mjs
import { createClient } from '@supabase/supabase-js';
import { randomInt } from 'node:crypto';
import { writeFileSync } from 'node:fs';

const { SUPABASE_URL, SUPABASE_SECRET_KEY } = process.env;
const DOMAIN = process.env.SIGA_EMAIL_DOMAIN || 'siga.example.com';
if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
    console.error('Faltan SUPABASE_URL o SUPABASE_SECRET_KEY en .env.migracion');
    process.exit(1);
}
const admin = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, { auth: { persistSession: false } });

const newPin = () => {
    for (;;) {
        const p = String(randomInt(0, 1000000)).padStart(6, '0');
        if (!/^(\d)\1{5}$/.test(p) && p !== '123456' && p !== '654321') return p;
    }
};
const csv = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
const plantsOf = (v) => (Array.isArray(v) ? v : typeof v === 'string' && v !== 'ALL' && v ? [v] : []);

const { data: plants, error: pe } = await admin.from('plants').select('id');
if (pe) { console.error('No pude leer plants:', pe.message); process.exit(1); }
const plantSet = new Set(plants.map((p) => p.id));

const { data: users, error: ue } = await admin.from('system_users').select('*').order('emp_no');
if (ue) { console.error('No pude leer system_users:', ue.message); process.exit(1); }

const { data: done } = await admin.from('profiles').select('legacy_id');
const already = new Set((done ?? []).map((r) => r.legacy_id));

const rows = [['emp_no', 'nombre', 'rol', 'pin_nuevo']];
let ok = 0, skipped = 0, failed = 0;

for (const u of users) {
    if (already.has(u.id)) { skipped++; continue; }
    const pin = newPin();
    const empNo = String(u.emp_no).trim().toUpperCase();
    const { data: created, error: ce } = await admin.auth.admin.createUser({
        email: `${empNo.toLowerCase()}@${DOMAIN}`,
        password: pin,
        email_confirm: true,
        user_metadata: { emp_no: empNo },
    });
    if (ce || !created?.user) {
        failed++;
        console.error(`✗ ${empNo}: ${ce?.message}`);
        if (failed === 1 && ok === 0) {
            console.error('\nSi el error habla de correo inválido, cambia SIGA_EMAIL_DOMAIN en .env.migracion por un dominio tuyo o uno con registros MX, y vuelve a correr el script.');
            process.exit(1);
        }
        continue;
    }
    const uid = created.user.id;
    const baja = u.status === 'BAJA' || u.active === false;
    const { error: pErr } = await admin.from('profiles').insert({
        id: uid, emp_no: empNo, name: u.name, system_role: u.system_role,
        position: u.position || u.role || 'Inspector de Calidad',
        shift: u.shift, phone: u.phone || null,
        photo_url: u.photo_url || u.avatar_url || null,
        allow_terminal_switch: Boolean(u.allow_terminal_switch),
        status: baja ? 'BAJA' : 'ACTIVO',
        legacy_id: u.id,
    });
    if (pErr) {
        failed++;
        console.error(`✗ ${empNo} (perfil): ${pErr.message}`);
        await admin.auth.admin.deleteUser(uid);
        continue;
    }
    if (baja) await admin.auth.admin.updateUserById(uid, { ban_duration: '876000h' });
    if (u.system_role === 'SUPERVISOR' || u.system_role === 'INSPECTOR') {
        const ids = plantsOf(u.plant_id).filter((id) => plantSet.has(id));
        if (ids.length) {
            const { error: upErr } = await admin.from('user_plants').insert(ids.map((plant_id) => ({ user_id: uid, plant_id })));
            if (upErr) console.error(`⚠ ${empNo}: plantas no asignadas (${upErr.message})`);
        }
    }
    rows.push([empNo, u.name, u.system_role, pin]);
    ok++;
    console.log(`✓ ${empNo} ${u.name}`);
}

if (rows.length > 1) writeFileSync('pines_nuevos.csv', rows.map((r) => r.map(csv).join(',')).join('\n'));
console.log(`\nMigrados: ${ok} | Ya existían: ${skipped} | Con error: ${failed}`);
if (ok) console.log('PINs nuevos guardados en pines_nuevos.csv (no lo subas a Git).');
