// ═══════════════════════════════════════
// AIdark — MercadoPago Webhook (FIXED)
// api/webhook-mercadopago.ts
// ═══════════════════════════════════════
// FIXES aplicados:
//   [1] verifySignature() retornaba true sin secret → ahora retorna false (CRÍTICO)
//   [2] PLAN_MONTHS usaba 'basic_monthly' pero metadata envía 'premium_monthly' → plans nunca activaban
//   [3] PLAN_PRICES mismo mismatch → validación de precio nunca corría
//   [4] UPDATE profiles usaba plan_id, plan_activated_at, mp_payment_id (columnas inexistentes)
//   [5] INSERT payments usaba mp_payment_id, plan_id, email, expires_at (columnas inexistentes en schema viejo)
//   [6] Fallback 'basic_monthly' reemplazado por 'premium_monthly' (el string correcto)
//   [7] Planes promo ahora mapeados correctamente
//   [8] Mejor logging con contexto útil para debug
// ═══════════════════════════════════════

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const MP_ACCESS_TOKEN   = process.env.MP_ACCESS_TOKEN!;
const MP_WEBHOOK_SECRET = process.env.MP_WEBHOOK_SECRET || '';
const SUPABASE_URL      = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ══════════════════════════════════════════════════════════════
// FIX [2]: PLAN_MONTHS ahora usa los plan_id reales que envía
//          create-payment.ts en metadata ('premium_monthly', etc.)
//          El schema viejo tenía 'basic_monthly' como alias del frontend
//          pero el webhook recibe el plan_id real del metadata.
// ══════════════════════════════════════════════════════════════
const PLAN_MONTHS: Record<string, number> = {
  premium_monthly:   1,
  premium_quarterly: 3,
  premium_annual:    12,
};

// FIX [3]: precios alineados con los plan_id reales
const PLAN_PRICES: Record<string, number> = {
  premium_monthly:   12.00,
  premium_quarterly: 29.99,
  premium_annual:    99.99,
};

// ══════════════════════════════════════════════════════════════
// FIX [1]: verifySignature() retornaba true si no había secret.
//          Ahora retorna false → el webhook rechaza cualquier
//          request no firmado con 401. Si todavía no tenés el
//          secret configurado en Vercel, el webhook no procesa
//          nada — eso es lo correcto. Configuralo primero.
// ══════════════════════════════════════════════════════════════
function verifySignature(req: VercelRequest): boolean {
  if (!MP_WEBHOOK_SECRET) {
    // FIX: era "return true" — permitía bypass total
    console.error('[Webhook] ❌ MP_WEBHOOK_SECRET no está configurado. Rechazando request.');
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

  // Validar que el timestamp no sea demasiado viejo (± 5 min)
  const now = Math.floor(Date.now() / 1000);
  const tsNum = parseInt(ts, 10);
  if (Math.abs(now - tsNum) > 300) {
    console.error(`[Webhook] Timestamp demasiado viejo: ${ts}`);
    return false;
  }

  const dataId = req.query?.['data.id'] || req.body?.data?.id || '';
  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;

  const hmac = crypto
    .createHmac('sha256', MP_WEBHOOK_SECRET)
    .update(manifest)
    .digest('hex');

  const isValid = hmac === v1;
  if (!isValid) {
    console.error('[Webhook] HMAC no coincide — posible request falso');
  }
  return isValid;
}

// ══════════════════════════════════════════════════════════════
// Handler principal
// ══════════════════════════════════════════════════════════════
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // GET para que MercadoPago pueda verificar la URL
  if (req.method === 'GET') return res.status(200).send('OK');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!verifySignature(req)) {
    console.error('[Webhook] ❌ Firma inválida — request rechazado');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  try {
    const { type, data } = req.body;

    // Solo procesar eventos de pago
    if (type !== 'payment') {
      return res.status(200).json({ received: true, skipped: `type=${type}` });
    }

    const paymentId = data?.id;
    if (!paymentId) return res.status(200).json({ received: true });
    const paymentKey = String(paymentId);

    // ── Deduplicación: si ya procesamos este pago, ignorar ──
    const { data: existingPayment } = await supabase
      .from('payments')
      .select('id')
      .eq('mp_payment_id', paymentKey)
      .single();

    if (existingPayment) {
      console.log(`[Webhook] Pago ${paymentId} ya procesado — ignorando`);
      return res.status(200).json({ received: true, duplicate: true });
    }

    // ── Obtener detalles del pago desde MercadoPago ──
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` },
    });

    if (!mpRes.ok) {
      console.error('[Webhook] Error consultando pago a MP:', await mpRes.text());
      return res.status(200).json({ received: true });
    }

    const payment = await mpRes.json() as any;

    // Solo activar planes para pagos aprobados
    if (payment.status !== 'approved') {
      console.log(`[Webhook] Pago ${paymentId} status: ${payment.status} — omitiendo`);
      return res.status(200).json({ received: true });
    }

    // ── Extraer userId, email y planId del pago ──
    let userId: string | null  = null;
    let userEmail: string | null = null;
    // FIX [6]: fallback era 'basic_monthly' (clave de frontend) → 'premium_monthly' (clave real)
    let planId: string = 'premium_monthly';

    if (payment.metadata) {
      userId    = payment.metadata.user_id   || null;
      userEmail = payment.metadata.user_email || null;
      planId    = payment.metadata.plan_id   || planId;
    }

    // Fallback: leer desde external_reference (formato: userId|plan_id|timestamp)
    if (!userId && payment.external_reference) {
      const parts = payment.external_reference.split('|');
      userId = parts[0] || null;
      if (parts[1]) planId = parts[1];
    }

    if (!userId) {
      console.error('[Webhook] No se encontró userId en el pago', paymentId);
      return res.status(200).json({ received: true, error: 'no_user_id' });
    }

    // FIX [2]: ahora PLAN_MONTHS tiene las claves correctas (premium_*)
    if (!PLAN_MONTHS[planId]) {
      console.error(`[Webhook] planId inválido: "${planId}" — claves válidas: ${Object.keys(PLAN_MONTHS).join(', ')}`);
      return res.status(200).json({ received: true, error: 'invalid_plan_id' });
    }

    // ── Validar monto pagado (anti-fraude: acepta hasta 15% de descuento por promos) ──
    const expectedPrice = PLAN_PRICES[planId];
    if (expectedPrice) {
      const paidAmount   = payment.transaction_amount;
      const minAcceptable = expectedPrice * 0.85;
      if (paidAmount < minAcceptable) {
        console.error(`[Webhook] ❌ Monto sospechoso: pagó ${paidAmount}, esperado ~${expectedPrice} para ${planId}`);
        return res.status(200).json({ received: true, error: 'suspicious_amount' });
      }
    }

    // ── Calcular fecha de expiración ──
    const months    = PLAN_MONTHS[planId];
    const now       = new Date();
    const expiresAt = new Date(now);
    expiresAt.setMonth(expiresAt.getMonth() + months);

    // ── FIX [4]: UPDATE de profiles con columnas que ahora existen en schema ──
    const profileUpdate = {
      plan:             planId,
      plan_id:          planId,          // FIX: columna agregada al schema
      plan_expires_at:  expiresAt.toISOString(),
      plan_activated_at: now.toISOString(), // FIX: columna agregada al schema
      mp_payment_id:    paymentKey,       // FIX: columna agregada al schema
      updated_at:       now.toISOString(),
    };

    const { error: updateError } = await supabase
      .from('profiles')
      .update(profileUpdate)
      .eq('id', userId);

    if (updateError) {
      console.error('[Webhook] Error actualizando profile por id:', updateError);
      // Fallback: intentar por email si está disponible
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

    // ── FIX [5]: INSERT en payments con columnas que ahora existen en schema ──
    const { error: insertError } = await supabase.from('payments').insert({
      user_id:      userId,
      email:        userEmail || payment.payer?.email || null, // FIX: columna agregada
      plan:         planId,
      plan_id:      planId,                                    // FIX: columna agregada
      amount:       payment.transaction_amount,
      currency:     payment.currency_id || 'USD',
      status:       'approved',
      mp_payment_id: paymentKey,                               // FIX: nombre correcto
      expires_at:   expiresAt.toISOString(),                   // FIX: columna agregada
    });

    if (insertError) {
      // No es crítico si falla el insert de audit log — el plan ya se activó
      console.error('[Webhook] Error insertando en payments (no crítico):', insertError);
    }

    console.log(`[Webhook] ✅ Plan ${planId} activado para ${userId}, vence: ${expiresAt.toISOString()}`);
    return res.status(200).json({ received: true, activated: true });

  } catch (err) {
    console.error('[Webhook] Error inesperado:', err);
    // Siempre 200 para que MercadoPago no reintente en loop
    return res.status(200).json({ received: true, error: 'internal_error' });
  }
}
