// ═══════════════════════════════════════
// AIdark — Reset mensual de mensajes free
// api/reset-messages.ts
// ═══════════════════════════════════════
// Llamado por el cron de vercel.json: "0 0 1 * *" (1ro de cada mes, 00:00 UTC)
// Resetea messages_used a 0 para todos los usuarios free.
// Protegido con CRON_SECRET para que nadie lo llame manualmente.
// ═══════════════════════════════════════

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL        = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const CRON_SECRET          = process.env.CRON_SECRET || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Solo GET (Vercel crons usan GET) o POST con secret
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verificar secret si está configurado
  if (CRON_SECRET) {
    const authHeader = req.headers.authorization;
    const secret     = authHeader?.replace('Bearer ', '') || req.query.secret;
    if (secret !== CRON_SECRET) {
      console.error('[Reset] Intento no autorizado');
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  try {
    const { error, count } = await supabase
      .rpc('reset_free_message_counts');

    if (error) {
      console.error('[Reset] Error al resetear mensajes:', error);
      return res.status(500).json({ error: error.message });
    }

    const now = new Date().toISOString();
    console.log(`[Reset] ✅ Mensajes reseteados — ${now}`);
    return res.status(200).json({ success: true, reset_at: now });

  } catch (err: any) {
    console.error('[Reset] Error inesperado:', err);
    return res.status(500).json({ error: err.message });
  }
}
