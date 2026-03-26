// ═══════════════════════════════════════
// AIdark — Referral API
// api/referral.ts
// GET: obtener mi código (solo premium)
// POST: validar y guardar un código de referido
// ═══════════════════════════════════════

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL         = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const PREMIUM_PLANS = new Set([
  'basic_monthly', 'pro_quarterly', 'ultra_annual',
  'premium_monthly', 'premium_quarterly', 'premium_annual',
]);
const MAX_REFERRALS = 3;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'No autorizado.' });
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: 'Sesión inválida.' });

  // GET: mi código
  if (req.method === 'GET') {
    const { data: profile } = await supabase
      .from('profiles')
      .select('referral_code, referral_count, plan')
      .eq('id', user.id)
      .single();
    if (!profile) return res.status(404).json({ error: 'Perfil no encontrado.' });
    const isPremium = PREMIUM_PLANS.has(profile.plan);
    return res.status(200).json({
      code: isPremium ? profile.referral_code : null,
      count: profile.referral_count || 0,
      maxUses: MAX_REFERRALS,
      remaining: MAX_REFERRALS - (profile.referral_count || 0),
      isPremium,
    });
  }

  // POST: aplicar código
  if (req.method === 'POST') {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Código requerido.' });
    const safeCode = String(code).trim().toUpperCase();

    const { data: myProfile } = await supabase
      .from('profiles')
      .select('referral_code, referred_by')
      .eq('id', user.id)
      .single();

    if (myProfile?.referral_code === safeCode) return res.status(400).json({ error: 'No podés usar tu propio código.' });
    if (myProfile?.referred_by) return res.status(400).json({ error: 'Ya tenés un código aplicado.' });

    const { data: referrer } = await supabase
      .from('profiles')
      .select('id, plan, referral_count')
      .eq('referral_code', safeCode)
      .single();

    if (!referrer) return res.status(404).json({ error: 'Código no válido.' });
    if (!PREMIUM_PLANS.has(referrer.plan)) return res.status(400).json({ error: 'Código inactivo.' });
    if ((referrer.referral_count || 0) >= MAX_REFERRALS) return res.status(400).json({ error: 'Código agotado (máx 3 usos).' });

    await supabase.from('profiles')
      .update({ referred_by: safeCode, updated_at: new Date().toISOString() })
      .eq('id', user.id);

    await supabase.from('referrals').insert({
      referrer_id: referrer.id,
      referred_id: user.id,
      referral_code: safeCode,
      status: 'pending',
    });

    return res.status(200).json({ success: true, message: 'Código aplicado. Cuando pagues, tu referidor recibe un mes gratis.' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
