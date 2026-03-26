// ═══════════════════════════════════════
// AIdark — Create MercadoPago Payment v2
// api/create-payment.ts
// ═══════════════════════════════════════

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL         = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const APP_URL = process.env.VITE_APP_URL || 'https://aidark.es';

const PLANS: Record<string, { title: string; priceUSD: number; period: string; months: number; plan_id: string }> = {
  basic_monthly: {
    title: 'AIdark Basic - Plan mensual',
    priceUSD: 12.00, period: 'monthly', months: 1, plan_id: 'premium_monthly',
  },
  pro_quarterly: {
    title: 'AIdark Pro - Plan trimestral',
    priceUSD: 29.99, period: 'quarterly', months: 3, plan_id: 'premium_quarterly',
  },
  ultra_annual: {
    title: 'AIdark Ultra - Plan anual',
    priceUSD: 99.99, period: 'annual', months: 12, plan_id: 'premium_annual',
  },
  basic_monthly_promo: {
    title: 'AIdark Basic - Plan mensual (Oferta 50%)',
    priceUSD: 6.00, period: 'monthly', months: 1, plan_id: 'premium_monthly',
  },
  pro_quarterly_promo: {
    title: 'AIdark Pro - Plan trimestral (Oferta 50%)',
    priceUSD: 15.00, period: 'quarterly', months: 3, plan_id: 'premium_quarterly',
  },
  ultra_annual_promo: {
    title: 'AIdark Ultra - Plan anual (Oferta 50%)',
    priceUSD: 50.00, period: 'annual', months: 12, plan_id: 'premium_annual',
  },
};

const MP_COUNTRY_CURRENCY: Record<string, string> = {
  AR: 'ARS', BR: 'BRL', CL: 'CLP', CO: 'COP',
  MX: 'MXN', PE: 'PEN', UY: 'UYU', VE: 'VES',
  EC: 'USD', US: 'USD', ES: 'EUR',
};

const FALLBACK_RATES: Record<string, number> = {
  ARS: 1200, BRL: 5.8, CLP: 980, COP: 4400,
  MXN: 17.5, PEN: 3.75, UYU: 42, VES: 40, USD: 1, EUR: 0.93,
};

let ratesCache: { rates: Record<string, number>; timestamp: number } | null = null;
const CACHE_TTL = 15 * 60 * 1000;

async function getExchangeRates(): Promise<Record<string, number>> {
  if (ratesCache && (Date.now() - ratesCache.timestamp) < CACHE_TTL) {
    return ratesCache.rates;
  }
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD', {
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const data = await res.json() as any;
      if (data.rates) {
        ratesCache = { rates: data.rates, timestamp: Date.now() };
        return data.rates;
      }
    }
  } catch (e) {
    console.warn('[Payment] er-api.com falló:', e);
  }
  try {
    const currencies = Object.keys(MP_COUNTRY_CURRENCY)
      .map(k => MP_COUNTRY_CURRENCY[k])
      .filter(c => c !== 'USD')
      .join(',');
    const res = await fetch(`https://api.frankfurter.app/latest?from=USD&to=${currencies}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const data = await res.json() as any;
      if (data.rates) {
        const rates = { ...data.rates, USD: 1 };
        ratesCache = { rates, timestamp: Date.now() };
        return rates;
      }
    }
  } catch (e) {
    console.warn('[Payment] frankfurter.app falló:', e);
  }
  console.warn('[Payment] Usando tipos de cambio FALLBACK');
  return FALLBACK_RATES;
}

async function getMPAccountCurrency(accessToken: string): Promise<{ currency: string; country: string }> {
  try {
    const res = await fetch('https://api.mercadopago.com/users/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const data = await res.json() as any;
      const countryId = data.country_id || data.site_id || '';
      const siteToCountry: Record<string, string> = {
        MLA: 'AR', MLB: 'BR', MLC: 'CL', MCO: 'CO',
        MLM: 'MX', MPE: 'PE', MLU: 'UY', MLV: 'VE',
      };
      const country = siteToCountry[countryId] || countryId || 'AR';
      const currency = MP_COUNTRY_CURRENCY[country] || 'USD';
      console.log(`[Payment] Cuenta MP: país=${country}, moneda=${currency}`);
      return { currency, country };
    }
  } catch (e) {
    console.warn('[Payment] No se pudo detectar país de cuenta MP:', e);
  }
  // FIX: Fallback a Perú (antes era Argentina, causaba rechazos de Yape)
  // Si tienes cuenta MP en otro país, cambia estos valores
  const defaultCountry = process.env.MP_DEFAULT_COUNTRY || 'PE';
  const defaultCurrency = MP_COUNTRY_CURRENCY[defaultCountry] || 'PEN';
  return { currency: defaultCurrency, country: defaultCountry };
}

function convertPrice(priceUSD: number, currency: string, rates: Record<string, number>): number {
  if (currency === 'USD') return priceUSD;
  const rate = rates[currency] || FALLBACK_RATES[currency];
  if (!rate) return priceUSD;
  const converted = priceUSD * rate;
  const highValueCurrencies = new Set(['CLP', 'COP', 'ARS', 'VES']);
  if (highValueCurrencies.has(currency)) return Math.ceil(converted);
  return Math.ceil(converted * 100) / 100;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;
  if (!MP_ACCESS_TOKEN) {
    return res.status(500).json({ error: 'MercadoPago no configurado.' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No autorizado. Inicia sesión.' });
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return res.status(401).json({ error: 'Sesión inválida. Inicia sesión de nuevo.' });
  }

  const { planId, userEmail, userId } = req.body;

  if (!planId || !userEmail || !userId) {
    return res.status(400).json({ error: 'Faltan datos requeridos.' });
  }

  if (!UUID_REGEX.test(userId)) {
    return res.status(400).json({ error: 'userId inválido.' });
  }

  if (userId !== user.id) {
    return res.status(403).json({ error: 'No podés crear pagos para otro usuario.' });
  }

  const safeEmail = String(userEmail).trim().toLowerCase().slice(0, 254);
  if (!safeEmail.includes('@') || safeEmail.length < 5) {
    return res.status(400).json({ error: 'Email inválido.' });
  }

  const plan = PLANS[planId];
  if (!plan) return res.status(400).json({ error: `Plan "${planId}" no válido.` });

  try {
    const [{ currency, country }, rates] = await Promise.all([
      getMPAccountCurrency(MP_ACCESS_TOKEN),
      getExchangeRates(),
    ]);

    const localPrice = convertPrice(plan.priceUSD, currency, rates);
    const usedRate   = rates[currency] || FALLBACK_RATES[currency] || 1;

    console.log(`[Payment] Plan: ${planId} | USD ${plan.priceUSD} → ${currency} ${localPrice} (rate: ${usedRate}) | País: ${country}`);

    const preference = {
      items: [{
        title:       plan.title,
        quantity:    1,
        unit_price:  localPrice,
        currency_id: currency,
      }],
      payer: { email: safeEmail },
      metadata: {
        user_id:       user.id,
        user_email:    safeEmail,
        plan_id:       plan.plan_id,
        months:        plan.months,
        price_usd:     plan.priceUSD,
        local_price:   localPrice,
        currency:      currency,
        exchange_rate: usedRate,
        country:       country,
      },
      back_urls: {
        success: `${APP_URL}/payment/success`,
        failure: `${APP_URL}/payment/failure`,
        pending: `${APP_URL}/payment/pending`,
      },
      auto_return: 'approved',
      notification_url: `${APP_URL}/api/webhook-mercadopago`,
      external_reference: `${user.id}|${plan.plan_id}|${Date.now()}`,
      payment_methods: {
        excluded_payment_types: [],
        // No excluir ningún método — permite Yape, tarjetas, efectivo, etc.
        excluded_payment_methods: [],
        installments:         3,
        default_installments: 1,
      },
      // FIX: Agregar statement_descriptor para que aparezca "AIDARK" en el estado de cuenta
      statement_descriptor: 'AIDARK',
    };

    const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization:  `Bearer ${MP_ACCESS_TOKEN}`,
      },
      body: JSON.stringify(preference),
    });

    if (!mpRes.ok) {
      const err = await mpRes.text();
      console.error('[MP] Error creando preferencia:', err);
      return res.status(500).json({ error: 'Error al crear el pago.' });
    }

    const data = await mpRes.json() as any;
    return res.status(200).json({
      init_point:         data.init_point,
      sandbox_init_point: data.sandbox_init_point,
      currency,
      local_price: localPrice,
      exchange_rate: usedRate,
    });

  } catch (err) {
    console.error('[MP] Error inesperado:', err);
    return res.status(500).json({ error: 'Error del servidor.' });
  }
}
