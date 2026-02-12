// ═══════════════════════════════════════
// AIdark — MercadoPago Webhook (Vercel)
// ═══════════════════════════════════════
// Recibe notificaciones de pago y actualiza Supabase

import { createClient } from '@supabase/supabase-js';

export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response('OK', { status: 200 });
  }

  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!accessToken || !supabaseUrl || !supabaseServiceKey) {
    console.error('[Webhook] Missing env vars');
    return new Response('Config error', { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body = await req.json();

    // MercadoPago sends different notification types
    if (body.type !== 'payment') {
      return new Response('OK', { status: 200 });
    }

    // Get payment details from MercadoPago
    const paymentId = body.data?.id;
    if (!paymentId) return new Response('No payment ID', { status: 400 });

    const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });

    const payment = await mpResponse.json();

    if (payment.status !== 'approved') {
      return new Response('Payment not approved', { status: 200 });
    }

    // Extract user info from external_reference
    const { user_id, plan_id } = JSON.parse(payment.external_reference || '{}');
    if (!user_id || !plan_id) {
      return new Response('Invalid reference', { status: 400 });
    }

    // Calculate plan expiration
    const monthsMap: Record<string, number> = {
      premium_monthly: 1,
      premium_quarterly: 3,
      premium_annual: 12,
    };
    const months = monthsMap[plan_id] || 1;
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + months);

    // Update user profile
    await supabase
      .from('profiles')
      .update({
        plan: plan_id,
        messages_limit: 999999, // Unlimited
        plan_expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', user_id);

    // Log payment
    await supabase
      .from('payments')
      .insert({
        user_id,
        plan: plan_id,
        amount: payment.transaction_amount,
        currency: payment.currency_id,
        status: 'approved',
        mercadopago_payment_id: String(paymentId),
      });

    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('[Webhook] Error:', error);
    return new Response('Error', { status: 500 });
  }
}
