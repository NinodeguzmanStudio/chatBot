// ═══════════════════════════════════════
// AIdark — Exchange Rate API
// api/exchange-rate.ts
// Devuelve el tipo de cambio para que el frontend
// muestre precios en moneda local antes de pagar
// ═══════════════════════════════════════

import type { VercelRequest, VercelResponse } from '@vercel/node';

const COUNTRY_CURRENCY: Record<string, { code: string; symbol: string; name: string }> = {
  AR: { code: 'ARS', symbol: 'ARS', name: 'Peso argentino' },
  BR: { code: 'BRL', symbol: 'R$',  name: 'Real brasileño' },
  CL: { code: 'CLP', symbol: 'CLP', name: 'Peso chileno' },
  CO: { code: 'COP', symbol: 'COP', name: 'Peso colombiano' },
  MX: { code: 'MXN', symbol: 'MXN', name: 'Peso mexicano' },
  PE: { code: 'PEN', symbol: 'S/',   name: 'Sol peruano' },
  UY: { code: 'UYU', symbol: 'UYU', name: 'Peso uruguayo' },
  EC: { code: 'USD', symbol: '$',    name: 'Dólar' },
  US: { code: 'USD', symbol: '$',    name: 'Dólar' },
  ES: { code: 'EUR', symbol: '€',    name: 'Euro' },
};

const FALLBACK_RATES: Record<string, number> = {
  ARS: 1200, BRL: 5.8, CLP: 980, COP: 4400,
  MXN: 17.5, PEN: 3.75, UYU: 42, VES: 40, USD: 1, EUR: 0.93,
};

let cache: { rates: Record<string, number>; ts: number } | null = null;
const CACHE_TTL = 15 * 60 * 1000;

async function getRates(): Promise<Record<string, number>> {
  if (cache && Date.now() - cache.ts < CACHE_TTL) return cache.rates;
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD', {
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const data = await res.json() as any;
      if (data.rates) {
        cache = { rates: data.rates, ts: Date.now() };
        return data.rates;
      }
    }
  } catch { /* fallback */ }
  return FALLBACK_RATES;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Permitir GET y POST
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const country = String(req.query.country || req.body?.country || '').toUpperCase().slice(0, 2);
    const rates   = await getRates();

    if (country && COUNTRY_CURRENCY[country]) {
      const info     = COUNTRY_CURRENCY[country];
      const rate     = rates[info.code] || FALLBACK_RATES[info.code] || 1;
      return res.status(200).json({
        currency: info.code,
        symbol:   info.symbol,
        name:     info.name,
        rate,
        country,
      });
    }

    // Sin país: devolver todas las monedas LATAM con sus rates
    const currencies: Record<string, any> = {};
    for (const [cc, info] of Object.entries(COUNTRY_CURRENCY)) {
      currencies[cc] = {
        ...info,
        rate: rates[info.code] || FALLBACK_RATES[info.code] || 1,
      };
    }

    return res.status(200).json({ currencies });
  } catch (err) {
    console.error('[ExchangeRate] Error:', err);
    return res.status(500).json({ error: 'Error obteniendo tipo de cambio' });
  }
}
