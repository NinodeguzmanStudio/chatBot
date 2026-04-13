import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL         = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const CRON_SECRET          = process.env.CRON_SECRET || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (CRON_SECRET) {
    const authHeader = req.headers.authorization;
    const secret = authHeader?.replace('Bearer ', '') || req.query.secret;
    if (secret !== CRON_SECRET) {
      console.error('[ExpireSubscriptions] Intento no autorizado');
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  try {
    const nowIso = new Date().toISOString();

    const { data: expiredProfiles, error } = await supabase
      .from('profiles')
      .update({
        plan: 'free',
        updated_at: nowIso,
      })
      .neq('plan', 'free')
      .lt('plan_expires_at', nowIso)
      .select('id, email, plan_id, plan_expires_at, mp_subscription_id');

    if (error) {
      console.error('[ExpireSubscriptions] Error actualizando perfiles:', error);
      return res.status(500).json({ error: error.message });
    }

    const affected = expiredProfiles || [];
    console.log(`[ExpireSubscriptions] ✅ ${affected.length} perfiles vencidos bajados a free`);

    return res.status(200).json({
      success: true,
      processed_at: nowIso,
      expired_count: affected.length,
      affected: affected.slice(0, 20),
    });
  } catch (err: any) {
    console.error('[ExpireSubscriptions] Error inesperado:', err);
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
}
