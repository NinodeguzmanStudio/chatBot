// ═══════════════════════════════════════
// AIdark — MercadoPago Webhook (HARDENED)
// api/webhook-mercadopago.ts
// ═══════════════════════════════════════
// CAMBIOS:
// - Escribe el plan_id real (basic_monthly, etc.) en vez de 'premium'
// - Eliminado Set en memoria (no funciona en serverless)
// - Solo usa DB para dedup (confiable)

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN!;
const MP_WEBHOOK_SECRET = process.env.MP_WEBHOOK_SECRET || '';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// CAMBIO: IDs alineados con frontend y create-payment.ts
const PLAN_MONTHS: Record<string, number> = {
  basic_monthly: 1,
  pro_quarterly: 3,
  ultra_annual: 12,
};

const PLAN_PRICES: Record<string, number> = {
  basic_monthly: 12,
  pro_quarterly: 29.99,
  ultra_annual: 99.99,
};

// Verify MercadoPago webhook signature
function verifySignature(req: VercelRequest): boolean {
  if (!MP_WEBHOOK_SECRET) {
    console.warn('[Webhook] No MP_WEBHOOK_SECRET configured — skipping verification');
    return true;
  }

  const xSignature = req.headers['x-signature'] as string;
  const xRequestId = req.headers['x-request-id'] as string;

  if (!xSignature || !xRequestId) {
    console.error('[Webhook] Missing signature headers');
    return false;
  }

  const parts: Record<string, string> = {};
  xSignature.split(',').forEach(part => {
    const [key, value] = part.split('=');
    if (key && value) parts[key.trim()] = value.trim();
  });

  const ts = parts['ts'];
  const v1 = parts['v1'];

  if (!ts || !v1) {
    console.error('[Webhook] Invalid signature format');
    return false;
  }

  const dataId = req.query?.['data.id'] || req.body?.data?.id || '';
  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;

  const hmac = crypto
    .createHmac('sha256', MP_WEBHOOK_SECRET)
    .update(manifest)
    .digest('hex');

  return hmac === v1;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') return res.status(200).send('OK');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!verifySignature(req)) {
    console.error('[Webhook] ❌ Invalid signature — possible fake webhook');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  try {
    const { type, data } = req.body;

    if (type !== 'payment') return res.status(200).json({ received: true });

    const paymentId = data?.id;
    if (!paymentId) return res.status(200).json({ received: true });
    const paymentKey = String(paymentId);

    // ── Dedup solo via DB (confiable en serverless) ──
    const { data: existingPayment } = await supabase
      .from('payments')
      .select('id')
      .eq('mp_payment_id', paymentKey)
      .single();

    if (existingPayment) {
      console.log(`[Webhook] Payment ${paymentId} already in DB — ignoring`);
      return res.status(200).json({ received: true, duplicate: true });
    }

    // ── Fetch payment details from MercadoPago ──
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` },
    });

    if (!mpRes.ok) {
      console.error('[Webhook] Error fetching payment:', await mpRes.text());
      return res.status(200).json({ received: true });
    }

    const payment = await mpRes.json();

    if (payment.status !== 'approved') {
      console.log(`[Webhook] Payment ${paymentId} status: ${payment.status} — skipping`);
      return res.status(200).json({ received: true });
    }

    // ── Extract user data ──
    let userId: string | null = null;
    let userEmail: string | null = null;
    let planId: string = 'basic_monthly';

    if (payment.metadata) {
      userId = payment.metadata.user_id;
      userEmail = payment.metadata.user_email;
      planId = payment.metadata.plan_id || 'basic_monthly';
    }

    if (!userId && payment.external_reference) {
      const parts = payment.external_reference.split('|');
      userId = parts[0];
      planId = parts[1] || 'basic_monthly';
    }

    if (!userId) {
      console.error('[Webhook] No userId found in payment', paymentId);
      return res.status(200).json({ received: true });
    }

    if (!PLAN_MONTHS[planId]) {
      console.error(`[Webhook] Invalid planId: ${planId}`);
      return res.status(200).json({ received: true });
    }

    // ── Verify amount ──
    const expectedPrice = PLAN_PRICES[planId];
    if (expectedPrice) {
      const paidAmount = payment.transaction_amount;
      const minAcceptable = expectedPrice * 0.85;
      if (paidAmount < minAcceptable) {
        console.error(`[Webhook] ❌ Suspicious amount: paid ${paidAmount}, expected ~${expectedPrice} for ${planId}`);
        return res.status(200).json({ received: true });
      }
    }

    // ── Calculate expiration ──
    const months = PLAN_MONTHS[planId];
    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setMonth(expiresAt.getMonth() + months);

    // ── CAMBIO: Escribir el planId real, NO 'premium' genérico ──
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        plan: planId,                           // ← basic_monthly | pro_quarterly | ultra_annual
        plan_id: planId,
        plan_expires_at: expiresAt.toISOString(),
        plan_activated_at: now.toISOString(),
        mp_payment_id: paymentKey,
      })
      .eq('id', userId);

    if (updateError) {
      console.error('[Webhook] Error updating profile:', updateError);
      if (userEmail) {
        await supabase
          .from('profiles')
          .update({
            plan: planId,
            plan_id: planId,
            plan_expires_at: expiresAt.toISOString(),
            plan_activated_at: now.toISOString(),
            mp_payment_id: paymentKey,
          })
          .eq('email', userEmail);
      }
    }

    // ── Log payment ──
    await supabase.from('payments').insert({
      user_id: userId,
      email: userEmail || payment.payer?.email,
      plan: planId,
      plan_id: planId,
      amount: payment.transaction_amount,
      currency: payment.currency_id,
      mp_payment_id: paymentKey,
      status: payment.status,
      expires_at: expiresAt.toISOString(),
    });

    console.log(`[Webhook] ✅ Plan ${planId} activated for ${userId}, expires: ${expiresAt.toISOString()}`);
    return res.status(200).json({ received: true, activated: true });

  } catch (err) {
    console.error('[Webhook] Error:', err);
    return res.status(200).json({ received: true });
  }
}
