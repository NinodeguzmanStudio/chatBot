// ═══════════════════════════════════════
// AIdark — Create MercadoPago Payment v2
// api/create-payment.ts
// FIXES v2:
//   [1] CRÍTICO: Conversión de moneda USD → moneda local en tiempo real
//       Antes: unit_price:12 se interpretaba como 12 PEN/MXN/ARS (una miseria)
//       Ahora: se detecta la moneda de la cuenta MP y se convierte con tipo de cambio real
//   [2] Detección automática de moneda por país del access_token de MP
//   [3] Cache de tipo de cambio (15 min) para no saturar API
//   [4] Fallback con tipos de cambio hardcodeados si la API falla
//   [5] Se envía currency_id correcto (moneda local, no USD)
//   [6] metadata incluye precio_usd original para validación en webhook
// ═══════════════════════════════════════

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL         = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const APP_URL = process.env.VITE_APP_URL || 'https://aidark.es';

// ── Planes con precios BASE en USD ──
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

// ── Monedas de MercadoPago por país ──
const MP_COUNTRY_CURRENCY: Record<string, string> = {
  AR: 'ARS', // Argentina - Peso argentino
  BR: 'BRL', // Brasil - Real
  CL: 'CLP', // Chile - Peso chileno
  CO: 'COP', // Colombia - Peso colombiano
  MX: 'MXN', // México - Peso mexicano
  PE: 'PEN', // Perú - Sol
  UY: 'UYU', // Uruguay - Peso uruguayo
  VE: 'VES', // Venezuela - Bolívar (limitado en MP)
  EC: 'USD', // Ecuador - usa USD
  US: 'USD', // USA
  ES: 'EUR', // España
};

// ── Fallback de tipos de cambio (actualizar periódicamente como respaldo) ──
// Estos solo se usan si TODAS las APIs de cambio fallan
const FALLBACK_RATES: Record<string, number> = {
  ARS: 1200,   // 1 USD ≈ 1200 ARS (actualizar regularmente)
  BRL: 5.8,    // 1 USD ≈ 5.8 BRL
  CLP: 980,    // 1 USD ≈ 980 CLP
  COP: 4400,   // 1 USD ≈ 4400 COP
  MXN: 17.5,   // 1 USD ≈ 17.5 MXN
  PEN: 3.75,   // 1 USD ≈ 3.75 PEN
  UYU: 42,     // 1 USD ≈ 42 UYU
  VES: 40,     // 1 USD ≈ 40 VES
  USD: 1,
  EUR: 0.93,
};

// ── Cache de tipos de cambio (15 minutos) ──
let ratesCache: { rates: Record<string, number>; timestamp: number } | null = null;
const CACHE_TTL = 15 * 60 * 1000; // 15 minutos

async function getExchangeRates(): Promise<Record<string, number>> {
  // Verificar cache
  if (ratesCache && (Date.now() - ratesCache.timestamp) < CACHE_TTL) {
    return ratesCache.rates;
  }

  // Intentar API 1: exchangerate-api (gratis, no requiere key)
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD', {
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const data = await res.json() as any;
      if (data.rates) {
        ratesCache = { rates: data.rates, timestamp: Date.now() };
        console.log('[Payment] Exchange rates actualizados desde er-api.com');
        return data.rates;
      }
    }
  } catch (e) {
    console.warn('[Payment] er-api.com falló:', e);
  }

  // Intentar API 2: frankfurter.app (gratis, ECB data)
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
        console.log('[Payment] Exchange rates actualizados desde frankfurter.app');
        return rates;
      }
    }
  } catch (e) {
    console.warn('[Payment] frankfurter.app falló:', e);
  }

  // Fallback: usar tipos de cambio hardcodeados
  console.warn('[Payment] ⚠️ Usando tipos de cambio FALLBACK (pueden estar desactualizados)');
  return FALLBACK_RATES;
}

// ── Detectar país/moneda de la cuenta MercadoPago ──
async function getMPAccountCurrency(accessToken: string): Promise<{ currency: string; country: string }> {
  try {
    const res = await fetch('https://api.mercadopago.com/users/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const data = await res.json() as any;
      const countryId = data.country_id || data.site_id || '';
      // site_id viene como "MLA" (Argentina), "MLM" (México), etc.
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
