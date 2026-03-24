// ═══════════════════════════════════════
// AIdark — MercadoPago Suscripción Recurrente
// api/create-subscription.ts
// NEW:
//   Usa la API de Preapproval de MercadoPago para cobros automáticos.
//   El usuario paga una vez y se renueva automáticamente cada mes/trimestre/año.
//   Si el pago falla, MP reintenta. Si se cancela, el webhook lo detecta.
//
// FLUJO:
//   1. Frontend llama POST /api/create-subscription con planId
//   2. Se crea un preapproval_plan (o usa uno existente)
//   3. Se devuelve init_point → usuario acepta la suscripción en MP
//   4. MP cobra automáticamente y envía webhooks de tipo "subscription_preapproval"
//   5. webhook-mercadopago.ts procesa la activación/cancelación
//
// IMPORTANTE: Si el vendedor solo tiene UNA cuenta MP (ej: Argentina),
//   los compradores de otros países NO pueden suscribirse con preapproval.
//   En ese caso, el endpoint cae en fallback a pago único (create-payment).
// ═══════════════════════════════════════

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL         = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const APP_URL = process.env.VITE_APP_URL || 'https://aidark.es';

// Planes con config de suscripción recurrente
const SUB_PLANS: Record<string, {
  title: string;
  priceUSD: number;
  frequency: number;       // cada cuántas unidades
  frequencyType: string;   // 'months' | 'days'
  plan_id: string;
  months: number;
}> = {
  basic_monthly: {
    title: 'AIdark Basic - Mensual',
    priceUSD: 12.00,
    frequency: 1,
    frequencyType: 'months',
    plan_id: 'premium_monthly',
    months: 1,
  },
  pro_quarterly: {
    title: 'AIdark Pro - Trimestral',
    priceUSD: 29.99,
    frequency: 3,
    frequencyType: 'months',
    plan_id: 'premium_quarterly',
    months: 3,
  },
  ultra_annual: {
    title: 'AIdark Ultra - Anual',
    priceUSD: 99.99,
    frequency: 12,
    frequencyType: 'months',
    plan_id: 'premium_annual',
    months: 12,
  },
};

// Tipo de cambio fallback (se usa si la API falla)
const FALLBACK_RATES: Record<string, number> = {
  ARS: 1200, BRL: 5.8, CLP: 980, COP: 4400,
  MXN: 17.5, PEN: 3.75, UYU: 42, USD: 1, EUR: 0.93,
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Cache de rates
let ratesCache: { rates: Record<string, number>; ts: number } | null = null;

async function getRate(currency: string): Promise<number> {
  if (currency === 'USD') return 1;
  if (ratesCache && Date.now() - ratesCache.ts < 15 * 60 * 1000) {
    return ratesCache.rates[currency] || FALLBACK_RATES[currency] || 1;
  }
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD', { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const data = await res.json() as any;
      if (data.rates) { ratesCache = { rates: data.rates, ts: Date.now() }; return data.rates[currency] || FALLBACK_RATES[currency] || 1; }
    }
  } catch { /* fallback */ }
  return FALLBACK_RATES[currency] || 1;
}

async function getMPCurrency(token: string): Promise<string> {
  try {
    const res = await fetch('https://api.mercadopago.com/users/me', {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const data = await res.json() as any;
      const siteMap: Record<string, string> = {
        MLA: 'ARS', MLB: 'BRL', MLC: 'CLP', MCO: 'COP',
        MLM: 'MXN', MPE: 'PEN', MLU: 'UYU',
      };
      return siteMap[data.site_id] || 'USD';
    }
  } catch { /* fallback */ }
  return 'ARS';
}

function convertPrice(usd: number, currency: string, rate: number): number {
  if (currency === 'USD') return usd;
  const converted = usd * rate;
  const high = new Set(['CLP', 'COP', 'ARS']);
  return high.has(currency) ? Math.ceil(converted) : Math.ceil(converted * 100) / 100;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;
  if (!MP_ACCESS_TOKEN) return res.status(500).json({ error: 'MercadoPago no configurado.' });

  // Auth
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No autorizado.' });
  }
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: 'Sesión inválida.' });

  const { planId, userEmail, userId } = req.body;
  if (!planId || !userEmail || !userId) return res.status(400).json({ error: 'Faltan datos.' });
  if (!UUID_REGEX.test(userId)) return res.status(400).json({ error: 'userId inválido.' });
  if (userId !== user.id) return res.status(403).json({ error: 'No autorizado.' });

  const plan = SUB_PLANS[planId];
  if (!plan) return res.status(400).json({ error: `Plan "${planId}" no válido.` });

  const safeEmail = String(userEmail).trim().toLowerCase().slice(0, 254);

  try {
    // Obtener moneda y tipo de cambio
    const currency   = await getMPCurrency(MP_ACCESS_TOKEN);
    const rate       = await getRate(currency);
    const localPrice = convertPrice(plan.priceUSD, currency, rate);

    console.log(`[Subscription] Plan: ${planId} | USD ${plan.priceUSD} → ${currency} ${localPrice}`);

    // Crear preapproval (suscripción recurrente)
    const preapproval = {
      reason:            plan.title,
      auto_recurring: {
        frequency:      plan.frequency,
        frequency_type: plan.frequencyType,
        transaction_amount: localPrice,
        currency_id:        currency,
      },
      payer_email: safeEmail,
      back_url:    `${APP_URL}/payment/success`,
      external_reference: `sub|${user.id}|${plan.plan_id}|${Date.now()}`,
      notification_url:   `${APP_URL}/api/webhook-mercadopago`,
      status: 'pending', // Se activa cuando el usuario acepta
    };

    const mpRes = await fetch('https://api.mercadopago.com/preapproval', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization:  `Bearer ${MP_ACCESS_TOKEN}`,
      },
      body: JSON.stringify(preapproval),
    });

    if (!mpRes.ok) {
      const errText = await mpRes.text();
      console.error('[Subscription] MP error:', mpRes.status, errText);

      // Si preapproval no está disponible (país no soportado), fallback a pago único
      if (mpRes.status === 400 || mpRes.status === 404) {
        console.warn('[Subscription] Preapproval no disponible, redirigiendo a pago único...');
        return res.status(200).json({
          fallback: true,
          message: 'Suscripción recurrente no disponible en tu país. Usa pago único.',
        });
      }

      return res.status(500).json({ error: 'Error al crear la suscripción.' });
    }

    const data = await mpRes.json() as any;

    // Guardar subscription_id en el perfil para poder cancelar después
    if (data.id) {
      await supabase
        .from('profiles')
        .update({
          mp_subscription_id: String(data.id),
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);
    }

    return res.status(200).json({
      init_point:    data.init_point || data.sandbox_init_point,
      subscription_id: data.id,
      currency,
      local_price: localPrice,
      recurring: true,
    });

  } catch (err) {
    console.error('[Subscription] Error:', err);
    return res.status(500).json({ error: 'Error del servidor.' });
  }
}
