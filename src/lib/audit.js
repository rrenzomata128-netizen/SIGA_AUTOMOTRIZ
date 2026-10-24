import { supabase } from './supabaseClient';

// Registra una acción en la bitácora de auditoría (Supabase)
export const logAudit = async (user, action, details = '', plantId = null) => {
    try {
        await supabase.from('audit_log').insert({
            user_id: user?.id || 'system',
            user_name: user?.name || 'Sistema',
            user_role: user?.systemRole || 'N/A',
            action,
            details,
            plant_id: Array.isArray(plantId) ? plantId[0] : plantId,
            created_at: new Date().toISOString()
        });
    } catch (err) {
        console.warn('Audit log failed:', err);
    }
};
