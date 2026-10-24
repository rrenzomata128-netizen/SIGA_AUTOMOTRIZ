import { supabase } from './supabaseClient';

// Llama a la Edge Function admin-users. Lanza Error con el mensaje del servidor.
export async function adminUsers(action, payload = {}) {
    const { data, error } = await supabase.functions.invoke('admin-users', { body: { action, ...payload } });
    if (error) {
        let msg = error.message;
        try {
            const body = await error.context?.json?.();
            if (body?.error) msg = body.error;
        } catch { /* sin cuerpo */ }
        throw new Error(msg);
    }
    if (data?.error) throw new Error(data.error);
    return data;
}
