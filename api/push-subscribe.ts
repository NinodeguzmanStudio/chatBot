// ═══════════════════════════════════════
// AIdark — Push Subscribe API
// ═══════════════════════════════════════
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer '))
    return res.status(401).json({ error: 'No autorizado' });

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return res.status(401).json({ error: 'Sesión inválida' });

  const { subscription } = req.body;
  if (!subscription?.endpoint) return res.status(400).json({ error: 'Suscripción inválida' });

  // Guardar o actualizar suscripción por endpoint.
  // La tabla tiene UNIQUE(endpoint), no UNIQUE(user_id).
  const { error: subError } = await supabase.from('push_subscriptions').upsert({
    user_id: user.id,
    endpoint: subscription.endpoint,
    p256dh: subscription.keys?.p256dh || '',
    auth: subscription.keys?.auth || '',
    updated_at: new Date().toISOString(),
  }, { onConflict: 'endpoint' });

  if (subError) {
    console.error('[PushSubscribe] Error guardando suscripción:', subError);
    return res.status(500).json({ error: 'No se pudo guardar la suscripción push.' });
  }

  return res.status(200).json({ ok: true });
}
