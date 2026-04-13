// ═══════════════════════════════════════
// AIdark — MercadoPago Webhook v4
// api/webhook-mercadopago.ts
// v4: + Sistema de referidos con crédito pendiente
// ═══════════════════════════════════════

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const MP_ACCESS_TOKEN      = (process.env.MP_ACCESS_TOKEN || process.env.MERCADOPAGO_ACCESS_TOKEN)!;
const MP_WEBHOOK_SECRET    = process.env.MP_WEBHOOK_SECRET || '';
const SUPABASE_URL         = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// eslint-disable-next-line @typescript-eslint/no-require-imports
const webpush = require('web-push');

const VALID_PLANS = new Set(['premium_monthly', 'premium_quarterly', 'premium_annual']);
const PLAN_MONTHS: Record<string, number> = { premium_monthly: 1, premium_quarterly: 3, premium_annual: 12 };
const PLAN_PRICES_USD: Record<string, number> = { premium_monthly: 12.00, premium_quarterly: 29.99, premium_annual: 99.99 };
const PLAN_PROMO_PRICES_USD: Record<string, number> = { premium_monthly: 6.00, premium_quarterly: 15.00, premium_annual: 50.00 };
const PLAN_NAMES: Record<string, string> = { premium_monthly: 'Mensual', premium_quarterly: 'Trimestral', premium_annual: 'Anual' };

function addMonthsFromCurrentExpiry(currentExpiry: string | null | undefined, months: number): Date {
  const now = new Date();
  const base = currentExpiry && new Date(currentExpiry) > now
    ? new Date(currentExpiry)
    : now;
  base.setMonth(base.getMonth() + months);
  return base;
}

// ── Push ──
async function sendPush(userId: string, title: string, body: string): Promise<void> {
  try {
    if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return;
    webpush.setVapidDetails('mailto:soporte@aidark.app', process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
    const { data: subs } = await supabase.from('push_subscriptions').select('endpoint, p256dh, auth').eq('user_id', userId).limit(5);
    if (!subs?.length) return;
    for (const sub of subs) {
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, JSON.stringify({ title, body, url: '/' }));
      } catch (e: any) { if (e.statusCode === 410) await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint); }
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
  return crypto.createHmac('sha256', MP_WEBHOOK_SECRET).update(manifest).digest('hex') === v1;
}

// ── Anti-fraude ──
function validateAmount(amount: number, currency: string, planId: string, metadata: any): boolean {
  const metaLocal = Number(metadata?.local_price || 0);
  if (metaLocal > 0) return amount >= metaLocal * 0.75;
  if (currency === 'USD') {
    const expected = PLAN_PROMO_PRICES_USD[planId] || PLAN_PRICES_USD[planId];
    return expected ? amount >= expected * 0.75 : true;
  }
  return true;
}

// ═══════════════════════════════════════
// REFERRAL: Crédito pendiente (no inmediato)
// ═══════════════════════════════════════

// Cuando un REFERIDO paga → marcar crédito pendiente para su referidor
async function markReferralCredit(userId: string): Promise<void> {
  try {
    const { data: profile } = await supabase.from('profiles').select('referred_by, email').eq('id', userId).single();
    if (!profile?.referred_by) return;

    const { data: referrer } = await supabase.from('profiles').select('id, email, referral_count').eq('referral_code', profile.referred_by).single();
    if (!referrer || (referrer.referral_count || 0) >= 3) return;

    const { data: existing } = await supabase.from('referrals').select('id, status').eq('referred_id', userId).eq('referrer_id', referrer.id).single();
    if (existing?.status === 'credit_pending' || existing?.status === 'completed') return;

    if (existing) {
      await supabase.from('referrals').update({ status: 'credit_pending' }).eq('id', existing.id);
    } else {
      await supabase.from('referrals').insert({ referrer_id: referrer.id, referred_id: userId, referral_code: profile.referred_by, status: 'credit_pending' });
    }

    await supabase.from('profiles').update({ referral_count: (referrer.referral_count || 0) + 1, updated_at: new Date().toISOString() }).eq('id', referrer.id);
    await supabase.from('profiles').update({ referred_by: null, updated_at: new Date().toISOString() }).eq('id', userId);

    await sendPush(referrer.id, '🎉 ¡Nuevo referido!', `${profile.email} se afilió con tu código. Cuando renueves, recibirás +1 mes gratis.`);
    console.log(`[Referral] Crédito pendiente para ${referrer.email} (referido: ${profile.email})`);
  } catch (err) { console.error('[Referral] Error marcando crédito:', err); }
}

// Cuando un REFERIDOR paga/renueva → aplicar créditos pendientes
async function applyReferralCredits(userId: string, currentExpiresAt: string): Promise<string> {
  try {
    const { data: pendingCredits } = await supabase
      .from('referrals').select('id, referred_id')
      .eq('referrer_id', userId).eq('status', 'credit_pending').eq('month_granted', false);

    if (!pendingCredits?.length) return currentExpiresAt;

    let expiry = new Date(currentExpiresAt);
    for (const credit of pendingCredits) {
      expiry.setMonth(expiry.getMonth() + 1);
      await supabase.from('referrals').update({ status: 'completed', month_granted: true, completed_at: new Date().toISOString() }).eq('id', credit.id);
    }

    await supabase.from('profiles').update({ plan_expires_at: expiry.toISOString(), updated_at: new Date().toISOString() }).eq('id', userId);

    const n = pendingCredits.length;
    await sendPush(userId, `🎁 +${n} mes${n > 1 ? 'es' : ''} gratis`, `Tus referidos te dieron ${n} mes${n > 1 ? 'es' : ''} extra. Vence: ${expiry.toLocaleDateString('es')}.`);
    console.log(`[Referral] ✅ +${n} mes(es) para ${userId}. Vence: ${expiry.toISOString()}`);
    return expiry.toISOString();
  } catch (err) { console.error('[Referral] Error aplicando créditos:', err); return currentExpiresAt; }
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
    if (type === 'payment') return handlePayment(data?.id, res);
    if (type === 'subscription_preapproval') return handleSubscription(data?.id, action, res);
    if (type === 'subscription_authorized_payment') return handleSubscriptionPayment(data?.id, res);
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

  const { data: existing } = await supabase.from('payments').select('id').eq('mp_payment_id', paymentKey).single();
  if (existing) return res.status(200).json({ received: true, duplicate: true });

  const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, { headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` } });
  if (!mpRes.ok) return res.status(200).json({ received: true });
  const payment = await mpRes.json() as any;
  if (payment.status !== 'approved') return res.status(200).json({ received: true });

  let userId: string | null = null, userEmail: string | null = null, planId = 'premium_monthly';
  if (payment.metadata) { userId = payment.metadata.user_id || null; userEmail = payment.metadata.user_email || null; planId = payment.metadata.plan_id || planId; }
  if (!userId && payment.external_reference) {
    const parts = payment.external_reference.split('|');
    if (parts[0] === 'sub') { userId = parts[1]; planId = parts[2] || planId; }
    else { userId = parts[0]; planId = parts[1] || planId; }
  }
  if (!userId) return res.status(200).json({ received: true, error: 'no_user_id' });
  if (!VALID_PLANS.has(planId)) return res.status(200).json({ received: true, error: 'invalid_plan' });

  if (!validateAmount(payment.transaction_amount, payment.currency_id || 'USD', planId, payment.metadata)) {
    console.error(`[Webhook] ❌ Monto sospechoso: ${payment.transaction_amount} ${payment.currency_id}`);
    return res.status(200).json({ received: true, error: 'suspicious_amount' });
  }

  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('plan_expires_at')
    .eq('id', userId)
    .single();

  const months = PLAN_MONTHS[planId];
  const now = new Date();
  const expiresAt = addMonthsFromCurrentExpiry(currentProfile?.plan_expires_at, months);

  await supabase.from('profiles').update({
    plan: planId, plan_id: planId,
    plan_expires_at: expiresAt.toISOString(), plan_activated_at: now.toISOString(),
    mp_payment_id: paymentKey, updated_at: now.toISOString(),
  }).eq('id', userId);

  await supabase.from('payments').insert({
    user_id: userId, email: userEmail || payment.payer?.email || null,
    plan_id: planId, amount: payment.transaction_amount,
    currency: payment.currency_id || 'USD',
    amount_usd: Number(payment.metadata?.price_usd || 0) || null,
    exchange_rate: Number(payment.metadata?.exchange_rate || 0) || null,
    status: 'approved', mp_payment_id: paymentKey, expires_at: expiresAt.toISOString(),
  });

  await sendPush(userId, '🎉 ¡Plan activo!', `Plan ${PLAN_NAMES[planId] || planId} activado.`);

  // REFERRAL v4: marcar crédito si es referido, aplicar créditos si es referidor
  await markReferralCredit(userId);
  const finalExpiry = await applyReferralCredits(userId, expiresAt.toISOString());

  console.log(`[Webhook] ✅ Pago único: ${planId} para ${userId} (vence: ${finalExpiry})`);
  return res.status(200).json({ received: true, activated: true });
}

// ── SUSCRIPCIÓN: Cambio de estado ──
async function handleSubscription(subId: any, action: string, res: VercelResponse) {
  if (!subId) return res.status(200).json({ received: true });
  const mpRes = await fetch(`https://api.mercadopago.com/preapproval/${subId}`, { headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` } });
  if (!mpRes.ok) return res.status(200).json({ received: true });
  const sub = await mpRes.json() as any;

  const { data: profile } = await supabase.from('profiles').select('id, plan, plan_id').eq('mp_subscription_id', String(subId)).single();
  let userId = profile?.id;
  if (!userId && sub.external_reference) { const parts = sub.external_reference.split('|'); if (parts[0] === 'sub') userId = parts[1]; }
  if (!userId) return res.status(200).json({ received: true, error: 'no_user' });

  const status = sub.status;

  if (status === 'authorized') {
    let planId = 'premium_monthly';
    if (sub.external_reference) { const parts = sub.external_reference.split('|'); if (parts[2] && VALID_PLANS.has(parts[2])) planId = parts[2]; }
    const months = PLAN_MONTHS[planId] || 1;
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + months);

    await supabase.from('profiles').update({
      plan: planId, plan_id: planId, plan_expires_at: expiresAt.toISOString(),
      plan_activated_at: new Date().toISOString(), mp_subscription_id: String(subId), updated_at: new Date().toISOString(),
    }).eq('id', userId);

    await sendPush(userId, '🎉 ¡Suscripción activa!', `Tu suscripción ${PLAN_NAMES[planId] || ''} se renovará automáticamente.`);

  } else if (status === 'paused' || status === 'cancelled') {
    await supabase.from('profiles').update({ mp_subscription_id: null, updated_at: new Date().toISOString() }).eq('id', userId);
    const msg = status === 'cancelled' ? 'Tu suscripción fue cancelada. Tu plan sigue activo hasta la fecha de vencimiento.' : 'Tu suscripción está pausada.';
    await sendPush(userId, '📋 Suscripción actualizada', msg);
  }

  return res.status(200).json({ received: true, sub_status: status });
}

// ── PAGO DE SUSCRIPCIÓN: Cobro automático periódico ──
async function handleSubscriptionPayment(paymentId: any, res: VercelResponse) {
  if (!paymentId) return res.status(200).json({ received: true });
  const paymentKey = String(paymentId);

  const { data: existing } = await supabase.from('payments').select('id').eq('mp_payment_id', paymentKey).single();
  if (existing) return res.status(200).json({ received: true, duplicate: true });

  const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, { headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` } });
  if (!mpRes.ok) return res.status(200).json({ received: true });
  const payment = await mpRes.json() as any;
  if (payment.status !== 'approved') return res.status(200).json({ received: true });

  const subId = payment.metadata?.preapproval_id || '';
  let userId: string | null = null, planId = 'premium_monthly';
  let currentExpiry: string | null = null;

  if (subId) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, plan_id, plan_expires_at')
      .eq('mp_subscription_id', String(subId))
      .single();
    if (profile) {
      userId = profile.id;
      planId = profile.plan_id || planId;
      currentExpiry = profile.plan_expires_at || null;
    }
  }
  if (!userId && payment.payer?.email) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, plan_id, plan_expires_at')
      .eq('email', payment.payer.email)
      .single();
    if (profile) {
      userId = profile.id;
      planId = profile.plan_id || planId;
      currentExpiry = profile.plan_expires_at || null;
    }
  }
  if (!userId) return res.status(200).json({ received: true, error: 'no_user' });

  const months = PLAN_MONTHS[planId] || 1;
  const expiresAt = addMonthsFromCurrentExpiry(currentExpiry, months);
  const profileUpdate: Record<string, string> = {
    plan: planId,
    plan_id: planId,
    plan_expires_at: expiresAt.toISOString(),
    plan_activated_at: new Date().toISOString(),
    mp_payment_id: paymentKey,
    updated_at: new Date().toISOString(),
  };

  if (subId) {
    profileUpdate.mp_subscription_id = String(subId);
  }

  await supabase.from('profiles').update(profileUpdate).eq('id', userId);

  await supabase.from('payments').insert({
    user_id: userId, email: payment.payer?.email || null, plan_id: planId,
    amount: payment.transaction_amount, currency: payment.currency_id || 'USD',
    status: 'approved', mp_payment_id: paymentKey, expires_at: expiresAt.toISOString(),
  });

  await sendPush(userId, '✅ Renovación exitosa', `Tu plan ${PLAN_NAMES[planId] || ''} se renovó hasta ${expiresAt.toLocaleDateString('es')}.`);

  // REFERRAL v4: aplicar créditos pendientes al renovar
  await applyReferralCredits(userId, expiresAt.toISOString());

  console.log(`[Webhook] ✅ Renovación: ${planId} para ${userId}`);
  return res.status(200).json({ received: true, renewed: true });
}
