// ═══════════════════════════════════════
// AIdark — MercadoPago Webhook v3
// api/webhook-mercadopago.ts
// FIXES v3:
//   [1] Maneja pagos únicos (type=payment) Y suscripciones (type=subscription_preapproval)
//   [2] subscription_preapproval: activa/pausa/cancela plan automáticamente
//   [3] Renovación automática: cuando MP cobra, extiende plan_expires_at
//   [4] Anti-fraude multi-moneda con metadata
//   [5] Push notification en activación Y en cancelación
// ═══════════════════════════════════════

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const MP_ACCESS_TOKEN      = process.env.MP_ACCESS_TOKEN!;
const MP_WEBHOOK_SECRET    = process.env.MP_WEBHOOK_SECRET || '';
const SUPABASE_URL         = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// eslint-disable-next-line @typescript-eslint/no-require-imports
const webpush = require('web-push');

const VALID_PLANS = new Set(['premium_monthly', 'premium_quarterly', 'premium_annual']);

const PLAN_MONTHS: Record<string, number> = {
  premium_monthly: 1, premium_quarterly: 3, premium_annual: 12,
};
const PLAN_PRICES_USD: Record<string, number> = {
  premium_monthly: 12.00, premium_quarterly: 29.99, premium_annual: 99.99,
};
const PLAN_PROMO_PRICES_USD: Record<string, number> = {
  premium_monthly: 6.00, premium_quarterly: 15.00, premium_annual: 50.00,
};
const PLAN_NAMES: Record<string, string> = {
  premium_monthly: 'Mensual', premium_quarterly: 'Trimestral', premium_annual: 'Anual',
};

// ── Push ──
async function sendPush(userId: string, title: string, body: string): Promise<void> {
  try {
    if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return;
    webpush.setVapidDetails('mailto:soporte@aidark.app', process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
    const { data: subs } = await supabase.from('push_subscriptions').select('endpoint, p256dh, auth').eq('user_id', userId).limit(5);
    if (!subs?.length) return;
    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify({ title, body, url: '/' })
        );
      } catch (e: any) {
        if (e.statusCode === 410) await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
      }
    }
  } catch { /* no crítico */ }
}

// ── Signature ──
function verifySignature(req: VercelRequest): boolean {
  if (!MP_WEBHOOK_SECRET) { console.error('[Webhook] MP_WEBHOOK_SECRET no configurado'); return false; }
  const xSignature = req.headers['x-signature'] as string;
  const xRequestId = req.headers['x-request-id'] as string;
  if (!xSignature || !xRequestId) return false;

  const parts: Record<string, string> = {};
  xSignature.split(',').forEach(p => { const [k, v] = p.split('='); if (k && v) parts[k.trim()] = v.trim(); });
  const ts = parts['ts'], v1 = parts['v1'];
  if (!ts || !v1) return false;
  if (Math.abs(Math.floor(Date.now() / 1000) - parseInt(ts, 10)) > 300) return false;

  const dataId = req.query?.['data.id'] || req.body?.data?.id || '';
  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
  const hmac = crypto.createHmac('sha256', MP_WEBHOOK_SECRET).update(manifest).digest('hex');
  return hmac === v1;
}

// ── Validación anti-fraude ──
function validateAmount(amount: number, currency: string, planId: string, metadata: any): boolean {
  const metaLocal = Number(metadata?.local_price || 0);
  if (metaLocal > 0) return amount >= metaLocal * 0.75;
  if (currency === 'USD') {
    const expected = PLAN_PROMO_PRICES_USD[planId] || PLAN_PRICES_USD[planId];
    return expected ? amount >= expected * 0.75 : true;
  }
  return true; // No podemos validar moneda local sin metadata
}

// ═══════════════════════════════════════
// Handler principal
// ═══════════════════════════════════════
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') return res.status(200).send('OK');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!verifySignature(req)) {
    console.error('[Webhook] ❌ Firma inválida');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  try {
    const { type, data, action } = req.body;

    // ──────────────────────────────────────
    // CASO 1: Pago único (igual que antes)
    // ──────────────────────────────────────
    if (type === 'payment') {
      return handlePayment(data?.id, res);
    }

    // ──────────────────────────────────────
    // CASO 2: Suscripción recurrente (NUEVO)
    // ──────────────────────────────────────
    if (type === 'subscription_preapproval') {
      return handleSubscription(data?.id, action, res);
    }

    // ──────────────────────────────────────
    // CASO 3: Pago de suscripción (cobro automático)
    // ──────────────────────────────────────
    if (type === 'subscription_authorized_payment') {
      return handleSubscriptionPayment(data?.id, res);
    }

    return res.status(200).json({ received: true, skipped: `type=${type}` });

  } catch (err) {
    console.error('[Webhook] Error:', err);
    return res.status(200).json({ received: true, error: 'internal_error' });
  }
}

// ── PAGO ÚNICO ──
async function handlePayment(paymentId: any, res: VercelResponse) {
  if (!paymentId) return res.status(200).json({ received: true });
  const paymentKey = String(paymentId);

  // Deduplicación
  const { data: existing } = await supabase.from('payments').select('id').eq('mp_payment_id', paymentKey).single();
  if (existing) return res.status(200).json({ received: true, duplicate: true });

  // Obtener detalles
  const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` },
  });
  if (!mpRes.ok) return res.status(200).json({ received: true });
  const payment = await mpRes.json() as any;
  if (payment.status !== 'approved') return res.status(200).json({ received: true });

  // Extraer datos
  let userId: string | null = null, userEmail: string | null = null, planId = 'premium_monthly';
  if (payment.metadata) {
    userId = payment.metadata.user_id || null;
    userEmail = payment.metadata.user_email || null;
    planId = payment.metadata.plan_id || planId;
  }
  if (!userId && payment.external_reference) {
    const parts = payment.external_reference.split('|');
    userId = parts[0] || parts[1] || null; // Soporta "userId|planId" y "sub|userId|planId"
    if (parts[0] === 'sub') { userId = parts[1]; planId = parts[2] || planId; }
    else { planId = parts[1] || planId; }
  }
  if (!userId) return res.status(200).json({ received: true, error: 'no_user_id' });
  if (!VALID_PLANS.has(planId)) return res.status(200).json({ received: true, error: 'invalid_plan' });

  if (!validateAmount(payment.transaction_amount, payment.currency_id || 'USD', planId, payment.metadata)) {
    console.error(`[Webhook] ❌ Monto sospechoso: ${payment.transaction_amount} ${payment.currency_id}`);
    return res.status(200).json({ received: true, error: 'suspicious_amount' });
  }

  // Activar plan
  const months = PLAN_MONTHS[planId];
  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setMonth(expiresAt.getMonth() + months);

  await supabase.from('profiles').update({
    plan: planId, plan_id: planId,
    plan_expires_at: expiresAt.toISOString(),
    plan_activated_at: now.toISOString(),
    mp_payment_id: paymentKey,
    updated_at: now.toISOString(),
  }).eq('id', userId);

  await supabase.from('payments').insert({
    user_id: userId, email: userEmail || payment.payer?.email || null,
    plan: planId, plan_id: planId,
    amount: payment.transaction_amount,
    currency: payment.currency_id || 'USD',
    amount_usd: Number(payment.metadata?.price_usd || 0) || null,
    exchange_rate: Number(payment.metadata?.exchange_rate || 0) || null,
    status: 'approved', mp_payment_id: paymentKey,
    expires_at: expiresAt.toISOString(),
  });

  await sendPush(userId, '🎉 ¡Plan activo!', `Plan ${PLAN_NAMES[planId] || planId} activado.`);
  console.log(`[Webhook] ✅ Pago único: ${planId} para ${userId}`);
  return res.status(200).json({ received: true, activated: true });
}

// ── SUSCRIPCIÓN: Cambio de estado ──
async function handleSubscription(subId: any, action: string, res: VercelResponse) {
  if (!subId) return res.status(200).json({ received: true });

  // Obtener detalles de la suscripción
  const mpRes = await fetch(`https://api.mercadopago.com/preapproval/${subId}`, {
    headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` },
  });
  if (!mpRes.ok) return res.status(200).json({ received: true });
  const sub = await mpRes.json() as any;

  // Buscar usuario por subscription_id
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, plan, plan_id')
    .eq('mp_subscription_id', String(subId))
    .single();

  // Alternativa: buscar por external_reference
  let userId = profile?.id;
  if (!userId && sub.external_reference) {
    const parts = sub.external_reference.split('|');
    if (parts[0] === 'sub') userId = parts[1];
  }
  if (!userId) return res.status(200).json({ received: true, error: 'no_user' });

  const status = sub.status; // 'authorized', 'paused', 'cancelled', 'pending'

  if (status === 'authorized') {
    // Suscripción activa — asegurar que el plan esté activo
    let planId = 'premium_monthly';
    if (sub.external_reference) {
      const parts = sub.external_reference.split('|');
      if (parts[2] && VALID_PLANS.has(parts[2])) planId = parts[2];
    }
    const months = PLAN_MONTHS[planId] || 1;
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + months);

    await supabase.from('profiles').update({
      plan: planId, plan_id: planId,
      plan_expires_at: expiresAt.toISOString(),
      plan_activated_at: new Date().toISOString(),
      mp_subscription_id: String(subId),
      updated_at: new Date().toISOString(),
    }).eq('id', userId);

    await sendPush(userId, '🎉 ¡Suscripción activa!', `Tu suscripción ${PLAN_NAMES[planId] || ''} se renovará automáticamente.`);
    console.log(`[Webhook] ✅ Suscripción activa: ${planId} para ${userId}`);

  } else if (status === 'paused' || status === 'cancelled') {
    // No revocar el plan inmediatamente — dejar que expire naturalmente
    // Solo actualizar el estado para que no se renueve
    await supabase.from('profiles').update({
      mp_subscription_id: null, // Limpiar para que no se confunda
      updated_at: new Date().toISOString(),
    }).eq('id', userId);

    const msg = status === 'cancelled'
      ? 'Tu suscripción fue cancelada. Tu plan sigue activo hasta la fecha de vencimiento.'
      : 'Tu suscripción está pausada.';
    await sendPush(userId, '📋 Suscripción actualizada', msg);
    console.log(`[Webhook] Suscripción ${status}: ${userId}`);
  }

  return res.status(200).json({ received: true, sub_status: status });
}

// ── PAGO DE SUSCRIPCIÓN: Cobro automático periódico ──
async function handleSubscriptionPayment(paymentId: any, res: VercelResponse) {
  if (!paymentId) return res.status(200).json({ received: true });
  const paymentKey = String(paymentId);

  // Deduplicación
  const { data: existing } = await supabase.from('payments').select('id').eq('mp_payment_id', paymentKey).single();
  if (existing) return res.status(200).json({ received: true, duplicate: true });

  // Obtener detalles del pago
  const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` },
  });
  if (!mpRes.ok) return res.status(200).json({ received: true });
  const payment = await mpRes.json() as any;
  if (payment.status !== 'approved') return res.status(200).json({ received: true });

  // Buscar usuario por subscription ID del pago
  const subId = payment.metadata?.preapproval_id || '';
  let userId: string | null = null;
  let planId = 'premium_monthly';

  if (subId) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, plan_id')
      .eq('mp_subscription_id', String(subId))
      .single();
    if (profile) {
      userId = profile.id;
      planId = profile.plan_id || planId;
    }
  }

  // Fallback: buscar por email del payer
  if (!userId && payment.payer?.email) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, plan_id')
      .eq('email', payment.payer.email)
      .single();
    if (profile) {
      userId = profile.id;
      planId = profile.plan_id || planId;
    }
  }

  if (!userId) return res.status(200).json({ received: true, error: 'no_user' });

  // Extender plan
  const months = PLAN_MONTHS[planId] || 1;
  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + months);

  await supabase.from('profiles').update({
    plan_expires_at: expiresAt.toISOString(),
    mp_payment_id: paymentKey,
    updated_at: new Date().toISOString(),
  }).eq('id', userId);

  // Registrar pago
  await supabase.from('payments').insert({
    user_id: userId, email: payment.payer?.email || null,
    plan: planId, plan_id: planId,
    amount: payment.transaction_amount,
    currency: payment.currency_id || 'USD',
    status: 'approved', mp_payment_id: paymentKey,
    expires_at: expiresAt.toISOString(),
  });

  await sendPush(userId, '✅ Renovación exitosa', `Tu plan ${PLAN_NAMES[planId] || ''} se renovó hasta ${expiresAt.toLocaleDateString('es')}.`);
  console.log(`[Webhook] ✅ Renovación automática: ${planId} para ${userId}, vence ${expiresAt.toISOString()}`);
  return res.status(200).json({ received: true, renewed: true });
}
