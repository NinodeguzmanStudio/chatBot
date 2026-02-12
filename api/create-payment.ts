// ═══════════════════════════════════════
// AIdark — Create Payment (Vercel Serverless)
// ═══════════════════════════════════════
// Crea una preferencia de pago en MercadoPago
// Docs: https://www.mercadopago.com.ar/developers/es/reference/preferences/_checkout_preferences/post

export const config = {
  runtime: 'edge',
};

const PLAN_PRICES: Record<string, { title: string; price: number; months: number }> = {
  premium_monthly: { title: 'AIdark Premium — Mensual', price: 15, months: 1 },
  premium_quarterly: { title: 'AIdark Premium — Trimestral', price: 40, months: 3 },
  premium_annual: { title: 'AIdark Premium — Anual', price: 108, months: 12 },
};

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken) {
    return new Response(
      JSON.stringify({ error: 'MercadoPago not configured' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { plan_id, user_id, user_email } = await req.json();

    const plan = PLAN_PRICES[plan_id];
    if (!plan) {
      return new Response(
        JSON.stringify({ error: 'Invalid plan' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Crear preferencia de pago
    const preference = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        items: [
          {
            title: plan.title,
            quantity: 1,
            currency_id: 'USD',
            unit_price: plan.price,
          },
        ],
        payer: {
          email: user_email,
        },
        back_urls: {
          success: `${process.env.VITE_APP_URL || 'https://aidark.app'}/payment/success`,
          failure: `${process.env.VITE_APP_URL || 'https://aidark.app'}/payment/failure`,
          pending: `${process.env.VITE_APP_URL || 'https://aidark.app'}/payment/pending`,
        },
        auto_return: 'approved',
        external_reference: JSON.stringify({ user_id, plan_id }),
        notification_url: `${process.env.VITE_APP_URL || 'https://aidark.app'}/api/webhook-mercadopago`,
      }),
    });

    const data = await preference.json();

    return new Response(
      JSON.stringify({
        checkout_url: data.init_point,
        preference_id: data.id,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[AIdark Payment] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Error creating payment' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
