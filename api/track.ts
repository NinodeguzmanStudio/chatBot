import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const ALLOWED_EVENTS = new Set([
  'app_open',
  'landing_view',
  'landing_cta_click',
  'auth_opened',
  'auth_success',
  'google_login_started',
  'login_submitted',
  'login_success',
  'register_success',
  'password_reset_requested',
  'password_reset_completed',
  'pricing_opened',
  'pricing_checkout_started',
  'promo_opened',
  'promo_checkout_started',
  'chat_milestone_1',
  'chat_milestone_3',
  'chat_milestone_5',
  'free_limit_blocked',
]);

function getHeader(req: VercelRequest, name: string): string {
  const value = req.headers[name];
  if (Array.isArray(value)) return value[0] || '';
  return typeof value === 'string' ? value : '';
}

function getClientIp(req: VercelRequest): string {
  const forwarded = getHeader(req, 'x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() || '';
  return getHeader(req, 'x-real-ip');
}

function sanitizeProps(input: unknown): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  if (!input || typeof input !== 'object' || Array.isArray(input)) return out;

  for (const [rawKey, rawValue] of Object.entries(input as Record<string, unknown>)) {
    const key = String(rawKey).slice(0, 48);
    if (!key) continue;
    if (typeof rawValue === 'string') out[key] = rawValue.slice(0, 300);
    else if (typeof rawValue === 'number' || typeof rawValue === 'boolean') out[key] = rawValue;
    else if (rawValue != null) out[key] = String(rawValue).slice(0, 300);
  }

  return out;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { event, deviceId, path, props } = req.body || {};
  const safeEvent = typeof event === 'string' ? event.trim() : '';
  const safeProps = sanitizeProps(props);
  const requestMeta = {
    ...safeProps,
    geo_country: getHeader(req, 'x-vercel-ip-country').slice(0, 8),
    geo_region: getHeader(req, 'x-vercel-ip-country-region').slice(0, 80),
    geo_city: getHeader(req, 'x-vercel-ip-city').slice(0, 120),
    ip: getClientIp(req).slice(0, 120),
    user_agent: getHeader(req, 'user-agent').slice(0, 300),
    referrer: getHeader(req, 'referer').slice(0, 300),
  };

  if (!ALLOWED_EVENTS.has(safeEvent)) {
    return res.status(400).json({ error: 'Evento no permitido.' });
  }

  const authHeader = req.headers.authorization;
  let userId: string | null = null;
  let email: string | null = null;
  let plan: string | null = null;

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    if (user) {
      userId = user.id;
      email = user.email || null;
      const { data: profile } = await supabase
        .from('profiles')
        .select('plan')
        .eq('id', user.id)
        .single();
      plan = profile?.plan || null;

      await supabase
        .from('profiles')
        .update({
          last_seen: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);
    }
  }

  try {
    await supabase.from('product_events').insert({
      event_name: safeEvent,
      user_id: userId,
      email,
      plan,
      device_id: typeof deviceId === 'string' ? deviceId.slice(0, 120) : null,
      path: typeof path === 'string' ? path.slice(0, 200) : '/',
      meta: requestMeta,
    });
  } catch (err) {
    console.error('[Track] Error guardando evento:', err);
  }

  return res.status(204).end();
}

