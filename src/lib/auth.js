import { supabase } from './supabaseClient';
import { mapProfileRow } from './mappers';

// Debe coincidir con SIGA_EMAIL_DOMAIN usado al migrar y en la Edge Function
export const EMAIL_DOMAIN = import.meta.env.VITE_SIGA_EMAIL_DOMAIN || 'siga.example.com';
export const empNoToEmail = (empNo) => `${String(empNo).trim().toLowerCase()}@${EMAIL_DOMAIN}`;

export async function loadProfile(uid) {
    const { data, error } = await supabase
        .from('profiles')
        .select('*, user_plants(plant_id)')
        .eq('id', uid)
        .maybeSingle();
    if (error) throw error;
    return data ? mapProfileRow(data) : null;
}

export async function signInWithEmpNo(empNo, pin) {
    const { data, error } = await supabase.auth.signInWithPassword({
        email: empNoToEmail(empNo),
        password: String(pin).trim()
    });
    if (error) {
        console.warn('Auth:', error.status, error.code, error.message); // quitar al terminar de depurar
        if (error.status === 429) return { error: 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.' };
        if (/banned/i.test(error.message || '')) return { error: 'Este colaborador se encuentra dado de BAJA en el sistema.' };
        return { error: 'Nómina o PIN incorrectos' };
    }
    const profile = await loadProfile(data.user.id);
    if (!profile) {
        await supabase.auth.signOut();
        return { error: 'Tu cuenta no tiene perfil asignado. Contacta a RH.' };
    }
    if (profile.status !== 'ACTIVO') {
        await supabase.auth.signOut();
        return { error: 'Este colaborador se encuentra dado de BAJA en el sistema.' };
    }
    return { profile };
}

// PIN de 6 dígitos sin patrones obvios
export const generatePin = () => {
    for (;;) {
        const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1000000;
        const p = String(n).padStart(6, '0');
        if (!/^(\d)\1{5}$/.test(p) && p !== '123456' && p !== '654321') return p;
    }
};
