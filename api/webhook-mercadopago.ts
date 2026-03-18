// ═══════════════════════════════════════
// AIdark — MercadoPago Webhook
// api/webhook-mercadopago.ts
// FIXES:
//   [1] verifySignature() retornaba true sin secret — ahora retorna false
//   [2] PLAN_MONTHS/PRICES con claves correctas (premium_*)
//   [3] UPDATE profiles con columnas correctas del schema
//   [4] INSERT payments con columnas correctas
//   [5] Fallback planId corregido a 'premium_monthly'
//   [6] PUSH NOTIFICATION al activar plan
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

const PLAN_MONTHS: Record<string, number> = {
  premium_monthly:   1,
  premium_quarterly: 3,
  premium_annual:    12,
};

const PLAN_PRICES: Record<string, number> = {
  premium_monthly:   12.00,
  premium_quarterly: 29.99,
  premium_annual:    99.99,
};

// ── Push notification al activar plan ──
async function sendPushToUser(userId: string, title: string, body: string): Promise<void> {
  try {
    if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return;

    webpush.setVapidDetails(
      'mailto:soporte@aidark.app',
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );

    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', userId)
      .limit(5);

    if (!subs?.length) return;

    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify({ title, body, url: '/' })
        );
      } catch (e: any) {
        if (e.statusCode === 410) {
          await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
        }
      }
    }
  } catch (err) {
    console.error('[Webhook] Push error (no crítico):', err);
  }
}

function verifySignature(req: VercelRequest): boolean {
  if (!MP_WEBHOOK_SECRET) {
    console.error('[Webhook] ❌ MP_WEBHOOK_SECRET no configurado. Rechazando request.');
    return false;
  }

  const xSignature = req.headers['x-signature'] as string;
  const xRequestId = req.headers['x-request-id'] as string;

  if (!xSignature || !xRequestId) {
    console.error('[Webhook] Headers x-signature o x-request-id ausentes');
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
    console.error('[Webhook] Formato de signature inválido');
    return false;
  }

  const now    = Math.floor(Date.now() / 1000);
  const tsNum  = parseInt(ts, 10);
  if (Math.abs(now - tsNum) > 300) {
    console.error(`[Webhook] Timestamp demasiado viejo: ${ts}`);
    return false;
  }

  const dataId   = req.query?.['data.id'] || req.body?.data?.id || '';
  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;

  const hmac = crypto
    .createHmac('sha256', MP_WEBHOOK_SECRET)
    .update(manifest)
    .digest('hex');

  const isValid = hmac === v1;
  if (!isValid) console.error('[Webhook] HMAC no coincide — posible request falso');
  return isValid;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') return res.status(200).send('OK');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!verifySignature(req)) {
    console.error('[Webhook] ❌ Firma inválida — request rechazado');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  try {
    const { type, data } = req.body;

    if (type !== 'payment') {
      return res.status(200).json({ received: true, skipped: `type=${type}` });
    }

    const paymentId = data?.id;
    if (!paymentId) return res.status(200).json({ received: true });
    const paymentKey = String(paymentId);

    // ── Deduplicación ──
    const { data: existingPayment } = await supabase
      .from('payments')
      .select('id')
      .eq('mp_payment_id', paymentKey)
      .single();

    if (existingPayment) {
      console.log(`[Webhook] Pago ${paymentId} ya procesado — ignorando`);
      return res.status(200).json({ received: true, duplicate: true });
    }

    // ── Obtener detalles desde MercadoPago ──
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` },
    });

    if (!mpRes.ok) {
      console.error('[Webhook] Error consultando pago a MP:', await mpRes.text());
      return res.status(200).json({ received: true });
    }

    const payment = await mpRes.json() as any;

    if (payment.status !== 'approved') {
      console.log(`[Webhook] Pago ${paymentId} status: ${payment.status} — omitiendo`);
      return res.status(200).json({ received: true });
    }

    // ── Extraer userId, email y planId ──
    let userId: string | null   = null;
    let userEmail: string | null = null;
    let planId: string           = 'premium_monthly';

    if (payment.metadata) {
      userId    = payment.metadata.user_id    || null;
      userEmail = payment.metadata.user_email || null;
      planId    = payment.metadata.plan_id    || planId;
    }

    if (!userId && payment.external_reference) {
      const parts = payment.external_reference.split('|');
      userId = parts[0] || null;
      if (parts[1]) planId = parts[1];
    }

    if (!userId) {
      console.error('[Webhook] No se encontró userId en el pago', paymentId);
      return res.status(200).json({ received: true, error: 'no_user_id' });
    }

    if (!PLAN_MONTHS[planId]) {
      console.error(`[Webhook] planId inválido: "${planId}"`);
      return res.status(200).json({ received: true, error: 'invalid_plan_id' });
    }

    // ── Validar monto (anti-fraude, acepta hasta 15% de descuento por promos) ──
    const expectedPrice = PLAN_PRICES[planId];
    if (expectedPrice) {
      const paidAmount    = payment.transaction_amount;
      const minAcceptable = expectedPrice * 0.85;
      if (paidAmount < minAcceptable) {
        console.error(`[Webhook] ❌ Monto sospechoso: pagó ${paidAmount}, esperado ~${expectedPrice}`);
        return res.status(200).json({ received: true, error: 'suspicious_amount' });
      }
    }

    // ── Calcular expiración ──
    const months    = PLAN_MONTHS[planId];
    const now       = new Date();
    const expiresAt = new Date(now);
    expiresAt.setMonth(expiresAt.getMonth() + months);

    const profileUpdate = {
      plan:              planId,
      plan_id:           planId,
      plan_expires_at:   expiresAt.toISOString(),
      plan_activated_at: now.toISOString(),
      mp_payment_id:     paymentKey,
      updated_at:        now.toISOString(),
    };

    const { error: updateError } = await supabase
      .from('profiles')
      .update(profileUpdate)
      .eq('id', userId);

    if (updateError) {
      console.error('[Webhook] Error actualizando profile por id:', updateError);
      if (userEmail) {
        const { error: emailUpdateError } = await supabase
          .from('profiles')
          .update(profileUpdate)
          .eq('email', userEmail);

        if (emailUpdateError) {
          console.error('[Webhook] Error actualizando profile por email:', emailUpdateError);
          return res.status(200).json({ received: true, error: 'profile_update_failed' });
        }
      } else {
        return res.status(200).json({ received: true, error: 'profile_update_failed' });
      }
    }

    const { error: insertError } = await supabase.from('payments').insert({
      user_id:       userId,
      email:         userEmail || payment.payer?.email || null,
      plan:          planId,
      plan_id:       planId,
      amount:        payment.transaction_amount,
      currency:      payment.currency_id || 'USD',
      status:        'approved',
      mp_payment_id: paymentKey,
      expires_at:    expiresAt.toISOString(),
    });

    if (insertError) {
      console.error('[Webhook] Error insertando en payments (no crítico):', insertError);
    }

    console.log(`[Webhook] ✅ Plan ${planId} activado para ${userId}, vence: ${expiresAt.toISOString()}`);

    // FIX [6]: Notificar al usuario por push que su plan está activo
    const planNames: Record<string, string> = {
      premium_monthly:   'Mensual',
      premium_quarterly: 'Trimestral',
      premium_annual:    'Anual',
    };
    await sendPushToUser(
      userId,
      '🎉 ¡Tu plan AIdark está activo!',
      `Plan ${planNames[planId] || planId} activado. Ya podés generar imágenes sin censura.`
    );

    return res.status(200).json({ received: true, activated: true });

  } catch (err) {
    console.error('[Webhook] Error inesperado:', err);
    return res.status(200).json({ received: true, error: 'internal_error' });
  }
}
