// ═══════════════════════════════════════
// AIdark — Create MercadoPago Payment
// api/create-payment.ts
// ═══════════════════════════════════════

const handler = async (req: any, res: any) => {
const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN!;

const PLANS: Record<string, { title: string; price: number; period: string; months: number }> = {
  basic_monthly: {
    title: 'AIdark Premium - Mensual',
    price: 12.00,
    period: 'monthly',
    months: 1,
  },
  pro_quarterly: {
    title: 'AIdark Premium - Trimestral',
    price: 29.99,
    period: 'quarterly',
    months: 3,
  },
  ultra_annual: {
    title: 'AIdark Premium - Anual',
    price: 99.99,
    period: 'annual',
    months: 12,
  },
};


  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { planId, userEmail, userId } = req.body;

  if (!planId || !userEmail || !userId) {
    return res.status(400).json({ error: 'Missing planId, userEmail or userId' });
  }

  const plan = PLANS[planId];
  if (!plan) return res.status(400).json({ error: 'Invalid plan' });

  try {
    const origin = req.headers.origin || req.headers.referer?.replace(/\/$/, '') || 'https://aidark.vercel.app';

    const preference = {
      items: [
        {
          title: plan.title,
          quantity: 1,
          unit_price: plan.price,
          currency_id: 'USD',
        },
      ],
      payer: { email: userEmail },
      metadata: {
        user_id: userId,
        user_email: userEmail,
        plan_id: planId,
        months: plan.months,
      },
      back_urls: {
        success: `${origin}/payment/success`,
        failure: `${origin}/payment/failure`,
        pending: `${origin}/payment/pending`,
      },
      auto_return: 'approved',
      notification_url: `${origin}/api/webhook-mercadopago`,
      external_reference: `${userId}|${planId}|${Date.now()}`,
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
      console.error('[MP] Error creating preference:', err);
      return res.status(500).json({ error: 'Error creating payment' });
    }

    const data = await mpRes.json();

    return res.status(200).json({
      init_point: data.init_point,
      sandbox_init_point: data.sandbox_init_point,
    });
  } catch (err) {
    console.error('[MP] Error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
