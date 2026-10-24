// Edge Function: admin-users
// Altas, cambios, reinicio de PIN y bajas de usuarios. Solo ADMIN y RH.
// Corre en servidor con la llave secreta (SUPABASE_SERVICE_ROLE_KEY, inyectada por Supabase).
// verify_jwt debe quedar ACTIVADO (valor por defecto).
import { createClient } from 'npm:@supabase/supabase-js@2';

const EMAIL_DOMAIN = Deno.env.get('SIGA_EMAIL_DOMAIN') ?? 'siga.example.com';
const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') ?? '*';
const ROLES = ['ADMIN', 'RH', 'SUPERVISOR', 'INSPECTOR'];

const cors = {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

class HttpError extends Error {
    status: number;
    constructor(status: number, message: string) { super(message); this.status = status; }
}

const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const str = (v: unknown, name: string, max: number, required = false) => {
    if (v === undefined || v === null || v === '') {
        if (required) throw new HttpError(400, `Falta ${name}`);
        return null;
    }
    if (typeof v !== 'string' || v.trim().length > max) throw new HttpError(400, `${name} inválido`);
    return v.trim();
};
const photoOk = (v: unknown) => {
    if (v === undefined || v === null || v === '') return null;
    if (typeof v !== 'string' || v.length > 600000) throw new HttpError(400, 'La foto es demasiado grande');
    if (!/^(data:image\/(png|jpe?g|webp);base64,|https:\/\/)/i.test(v)) throw new HttpError(400, 'Formato de foto inválido');
    return v;
};
const pinOk = (v: unknown) => {
    if (typeof v !== 'string' || !/^\d{6}$/.test(v)) throw new HttpError(400, 'El PIN debe tener exactamente 6 dígitos');
    if (/^(\d)\1{5}$/.test(v) || v === '123456' || v === '654321') throw new HttpError(400, 'PIN demasiado obvio');
    return v;
};
const plantIdsOk = (v: unknown) => {
    if (v === undefined) return undefined;
    if (!Array.isArray(v) || v.length > 100 || v.some((x) => typeof x !== 'string' || x.length > 100)) {
        throw new HttpError(400, 'Plantas inválidas');
    }
    return [...new Set(v as string[])];
};

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
    if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);

    try {
        const url = Deno.env.get('SUPABASE_URL')!;
        const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

        // ---- 1. Quién llama
        const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
        if (!token) throw new HttpError(401, 'Sin sesión');
        const { data: auth, error: authErr } = await admin.auth.getUser(token);
        if (authErr || !auth.user) throw new HttpError(401, 'Sesión inválida');

        const { data: caller } = await admin
            
            .from('profiles').select('id, name, system_role, status, photo_url').eq('id', auth.user.id).maybeSingle();
        if (!caller || caller.status !== 'ACTIVO') throw new HttpError(403, 'Cuenta sin acceso');

        const body = await req.json().catch(() => ({}));
        const action = body.action;

        // Cualquier usuario activo puede registrar su propia foto (una sola vez); el resto es solo ADMIN/RH
        if (action !== 'set_my_photo' && !['ADMIN', 'RH'].includes(caller.system_role)) {
            throw new HttpError(403, 'No tienes permiso para administrar usuarios');
        }

        const audit = (accion: string, detalle: string) =>
            admin.from('audit_log').insert({
                user_id: caller.id, user_name: caller.name, user_role: caller.system_role,
                action: accion, details: detalle,
            });

        const setPlants = async (userId: string, plantIds: string[]) => {
            await admin.from('user_plants').delete().eq('user_id', userId);
            if (plantIds.length) {
                const { error } = await admin.from('user_plants')
                    .insert(plantIds.map((plant_id) => ({ user_id: userId, plant_id })));
                if (error) throw new HttpError(400, 'Alguna planta no existe');
            }
        };

        const loadTarget = async (id: unknown) => {
            if (typeof id !== 'string') throw new HttpError(400, 'Falta id');
            const { data } = await admin.from('profiles').select('*').eq('id', id).maybeSingle();
            if (!data) throw new HttpError(404, 'Usuario no encontrado');
            // RH no puede tocar cuentas ADMIN
            if (caller.system_role === 'RH' && data.system_role === 'ADMIN') throw new HttpError(403, 'RH no puede modificar administradores');
            return data;
        };

        // ---- 2. Acciones
        if (action === 'create') {
            const empNo = str(body.empNo, 'Nómina', 20, true)!.toUpperCase();
            if (!/^[A-Z0-9-]{3,20}$/.test(empNo)) throw new HttpError(400, 'Nómina inválida (letras, números y guion)');
            const name = str(body.name, 'Nombre', 120, true)!;
            const role = body.systemRole;
            if (!ROLES.includes(role)) throw new HttpError(400, 'Rol inválido');
            if (role === 'ADMIN' && caller.system_role !== 'ADMIN') throw new HttpError(403, 'Solo un ADMIN crea administradores');
            const pin = pinOk(body.pin);
            const plantIds = plantIdsOk(body.plantIds) ?? [];

            const { data: dup } = await admin.from('profiles').select('id').eq('emp_no', empNo).maybeSingle();
            if (dup) throw new HttpError(409, 'Ya existe esa nómina');

            const { data: created, error: cErr } = await admin.auth.admin.createUser({
                email: `${empNo.toLowerCase()}@${EMAIL_DOMAIN}`,
                password: pin,
                email_confirm: true,
                user_metadata: { emp_no: empNo },
            });
            if (cErr || !created.user) throw new HttpError(400, 'No se pudo crear la cuenta: ' + (cErr?.message ?? ''));
            const uid = created.user.id;

            try {
                const { error: pErr } = await admin.from('profiles').insert({
                    id: uid, emp_no: empNo, name, system_role: role,
                    position: str(body.position, 'Puesto', 100) ?? 'Inspector de Calidad',
                    shift: str(body.shift, 'Turno', 100),
                    phone: str(body.phone, 'Teléfono', 30),
                    photo_url: photoOk(body.photoUrl),
                    allow_terminal_switch: body.allowTerminalSwitch === true,
                });
                if (pErr) throw new HttpError(400, 'No se pudo guardar el perfil');
                if (role === 'SUPERVISOR' || role === 'INSPECTOR') await setPlants(uid, plantIds);
            } catch (e) {
                await admin.auth.admin.deleteUser(uid); // deshacer
                throw e;
            }
            await audit('USER_CREATE', `Alta de ${name} (${empNo}) con rol ${role}`);
            return json({ id: uid });
        }

        if (action === 'update') {
            const target = await loadTarget(body.id);
            const patch: Record<string, unknown> = {};
            if (body.name !== undefined) patch.name = str(body.name, 'Nombre', 120, true);
            if (body.position !== undefined) patch.position = str(body.position, 'Puesto', 100, true);
            if (body.shift !== undefined) patch.shift = str(body.shift, 'Turno', 100);
            if (body.phone !== undefined) patch.phone = str(body.phone, 'Teléfono', 30);
            if (body.photoUrl !== undefined) patch.photo_url = photoOk(body.photoUrl);
            if (body.allowTerminalSwitch !== undefined) patch.allow_terminal_switch = body.allowTerminalSwitch === true;
            if (body.systemRole !== undefined && body.systemRole !== target.system_role) {
                if (!ROLES.includes(body.systemRole)) throw new HttpError(400, 'Rol inválido');
                if (target.id === caller.id) throw new HttpError(400, 'No puedes cambiar tu propio rol');
                if (body.systemRole === 'ADMIN' && caller.system_role !== 'ADMIN') throw new HttpError(403, 'Solo un ADMIN asigna ese rol');
                patch.system_role = body.systemRole;
            }
            if (Object.keys(patch).length) {
                const { error } = await admin.from('profiles').update(patch).eq('id', target.id);
                if (error) throw new HttpError(400, 'No se pudo actualizar');
            }
            const plantIds = plantIdsOk(body.plantIds);
            if (plantIds !== undefined) await setPlants(target.id, plantIds);
            await audit('USER_UPDATE', `Cambios en ${target.name} (${target.emp_no})`);
            return json({ ok: true });
        }

        if (action === 'reset_pin') {
            const target = await loadTarget(body.id);
            const { error } = await admin.auth.admin.updateUserById(target.id, { password: pinOk(body.pin) });
            if (error) throw new HttpError(400, 'No se pudo cambiar el PIN');
            await audit('USER_PIN_RESET', `PIN reiniciado para ${target.name} (${target.emp_no})`);
            return json({ ok: true });
        }

        if (action === 'set_status') {
            const target = await loadTarget(body.id);
            const status = body.status;
            if (status !== 'ACTIVO' && status !== 'BAJA') throw new HttpError(400, 'Estatus inválido');
            if (target.id === caller.id) throw new HttpError(400, 'No puedes darte de baja a ti mismo');
            await admin.from('profiles').update({ status }).eq('id', target.id);
            await admin.auth.admin.updateUserById(target.id, { ban_duration: status === 'BAJA' ? '876000h' : 'none' });
            await audit('USER_STATUS', `${target.name} (${target.emp_no}) → ${status}`);
            return json({ ok: true });
        }

        if (action === 'set_my_photo') {
            if (caller.photo_url) throw new HttpError(403, 'Tu foto ya está registrada; solicita el cambio a RH');
            const foto = photoOk(body.photoUrl);
            if (!foto) throw new HttpError(400, 'Falta la foto');
            const { error } = await admin.from('profiles').update({ photo_url: foto }).eq('id', caller.id);
            if (error) throw new HttpError(400, 'No se pudo guardar la foto');
            await audit('USER_PHOTO', `${caller.name} registró su fotografía`);
            return json({ ok: true });
        }

        if (action === 'delete') {
            const target = await loadTarget(body.id);
            if (target.id === caller.id) throw new HttpError(400, 'No puedes eliminarte a ti mismo');
            const { count } = await admin.from('attendance_records')
                .select('id', { count: 'exact', head: true }).eq('inspector_id', target.id);
            if ((count ?? 0) > 0) throw new HttpError(409, 'Tiene registros de asistencia. Usa Baja en lugar de eliminar.');
            await audit('USER_DELETE', `Eliminado ${target.name} (${target.emp_no})`);
            const { error } = await admin.auth.admin.deleteUser(target.id); // borra también profiles y user_plants
            if (error) throw new HttpError(400, 'No se pudo eliminar la cuenta');
            return json({ ok: true });
        }

        throw new HttpError(400, 'Acción desconocida');
    } catch (e) {
        if (e instanceof HttpError) return json({ error: e.message }, e.status);
        console.error('admin-users error:', e);
        return json({ error: 'Error interno' }, 500);
    }
});
