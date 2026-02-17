// ═══════════════════════════════════════
// AIdark — MercadoPago Webhook
// api/webhook-mercadopago.ts
// ═══════════════════════════════════════

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN!;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const PLAN_MONTHS: Record<string, number> = {
  basic_monthly: 1,
  pro_quarterly: 3,
  ultra_annual: 12,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // MercadoPago sends GET for verification and POST for notifications
  if (req.method === 'GET') return res.status(200).send('OK');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { type, data } = req.body;

    // Only process payment notifications
    if (type !== 'payment') return res.status(200).json({ received: true });

    const paymentId = data?.id;
    if (!paymentId) return res.status(200).json({ received: true });

    // Fetch payment details from MercadoPago
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` },
    });

    if (!mpRes.ok) {
      console.error('[Webhook] Error fetching payment:', await mpRes.text());
      return res.status(200).json({ received: true });
    }

    const payment = await mpRes.json();

    // Only activate on approved payments
    if (payment.status !== 'approved') {
      console.log(`[Webhook] Payment ${paymentId} status: ${payment.status} — skipping`);
      return res.status(200).json({ received: true });
    }

    // Extract user data from metadata or external_reference
    let userId: string | null = null;
    let userEmail: string | null = null;
    let planId: string = 'basic_monthly';

    if (payment.metadata) {
      userId = payment.metadata.user_id;
      userEmail = payment.metadata.user_email;
      planId = payment.metadata.plan_id || 'basic_monthly';
    }

    // Fallback: parse external_reference "userId|planId|timestamp"
    if (!userId && payment.external_reference) {
      const parts = payment.external_reference.split('|');
      userId = parts[0];
      planId = parts[1] || 'basic_monthly';
    }

    if (!userId) {
      console.error('[Webhook] No userId found in payment', paymentId);
      return res.status(200).json({ received: true });
    }

    // Calculate expiration date
    const months = PLAN_MONTHS[planId] || 1;
    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setMonth(expiresAt.getMonth() + months);

    // Activate premium in Supabase
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        plan: 'premium',
        plan_id: planId,
        plan_expires_at: expiresAt.toISOString(),
        plan_activated_at: now.toISOString(),
        mp_payment_id: String(paymentId),
      })
      .eq('id', userId);

    if (updateError) {
      console.error('[Webhook] Error updating profile:', updateError);
      // Try by email as fallback
      if (userEmail) {
        await supabase
          .from('profiles')
          .update({
            plan: 'premium',
            plan_id: planId,
            plan_expires_at: expiresAt.toISOString(),
            plan_activated_at: now.toISOString(),
            mp_payment_id: String(paymentId),
          })
          .eq('email', userEmail);
      }
    }

    // Log the payment
    await supabase.from('payments').insert({
      user_id: userId,
      email: userEmail || payment.payer?.email,
      plan_id: planId,
      amount: payment.transaction_amount,
      currency: payment.currency_id,
      mp_payment_id: String(paymentId),
      status: payment.status,
      expires_at: expiresAt.toISOString(),
    }).catch(console.error);

    console.log(`[Webhook] ✅ Premium activated for ${userId}, plan: ${planId}, expires: ${expiresAt.toISOString()}`);
    return res.status(200).json({ received: true, activated: true });

  } catch (err) {
    console.error('[Webhook] Error:', err);
    return res.status(200).json({ received: true }); // Always 200 so MP doesn't retry forever
  }
}
