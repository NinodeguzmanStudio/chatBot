// ═══════════════════════════════════════
// AIdark — Create MercadoPago Payment
// ═══════════════════════════════════════
// Incluye planes promo (50% OFF) con precios reales
import type { VercelRequest, VercelResponse } from '@vercel/node';

const PLANS: Record<string, { title: string; price: number; period: string; months: number; plan_id: string }> = {
  // ── Planes normales ──
  basic_monthly: {
    title: 'AIdark Basic - Plan mensual',
    price: 12.00, period: 'monthly', months: 1, plan_id: 'premium_monthly',
  },
  pro_quarterly: {
    title: 'AIdark Pro - Plan trimestral',
    price: 29.99, period: 'quarterly', months: 3, plan_id: 'premium_quarterly',
  },
  ultra_annual: {
    title: 'AIdark Ultra - Plan anual',
    price: 99.99, period: 'annual', months: 12, plan_id: 'premium_annual',
  },
  // ── Planes promo 50% OFF ──
  basic_monthly_promo: {
    title: 'AIdark Basic - Plan mensual (Oferta 50%)',
    price: 6.00, period: 'monthly', months: 1, plan_id: 'premium_monthly',
  },
  pro_quarterly_promo: {
    title: 'AIdark Pro - Plan trimestral (Oferta 50%)',
    price: 15.00, period: 'quarterly', months: 3, plan_id: 'premium_quarterly',
  },
  ultra_annual_promo: {
    title: 'AIdark Ultra - Plan anual (Oferta 50%)',
    price: 50.00, period: 'annual', months: 12, plan_id: 'premium_annual',
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;
  if (!MP_ACCESS_TOKEN) {
    return res.status(500).json({ error: 'MercadoPago no configurado.' });
  }

  const { planId, userEmail, userId } = req.body;
  if (!planId || !userEmail || !userId) {
    return res.status(400).json({ error: 'Faltan datos requeridos.' });
  }

  const plan = PLANS[planId];
  if (!plan) return res.status(400).json({ error: `Plan "${planId}" no válido.` });

  try {
    const origin = req.headers.origin
      || req.headers.referer?.replace(/\/$/, '')
      || 'https://aidark.vercel.app';

    const preference = {
      items: [{
        title: plan.title,
        quantity: 1,
        unit_price: plan.price,
        currency_id: 'USD',
      }],
      payer: { email: userEmail },
      metadata: {
        user_id: userId,
        user_email: userEmail,
        plan_id: plan.plan_id,
        months: plan.months,
      },
      back_urls: {
        success: `${origin}/payment/success`,
        failure: `${origin}/payment/failure`,
        pending: `${origin}/payment/pending`,
      },
      auto_return: 'approved',
      notification_url: `${origin}/api/webhook-mercadopago`,
      external_reference: `${userId}|${plan.plan_id}|${Date.now()}`,
    };

    const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
      },
      body: JSON.stringify(preference),
    });

    if (!mpRes.ok) {
      const err = await mpRes.text();
      console.error('[MP] Error:', err);
      return res.status(500).json({ error: 'Error al crear el pago.' });
    }

    const data = await mpRes.json() as any;  // ✅ corregido
    return res.status(200).json({
      init_point: data.init_point,
      sandbox_init_point: data.sandbox_init_point,
    });

  } catch (err) {
    console.error('[MP] Error:', err);
    return res.status(500).json({ error: 'Error del servidor.' });
  }
}
