// ═══════════════════════════════════════
// AIdark — Create MercadoPago Payment
// api/create-payment.ts
// FIXES:
//   [1] Verificación de token Bearer
//   [2] notification_url fija desde env
//   [3] Validación de UUID en userId
//   [4] Sanitización de userEmail
//   [5] LATAM: payment_methods habilitados
//   [6] CRÍTICO: eliminado currency_id:'USD' — bloqueaba el botón Pagar en LATAM
//       Las cuentas MP de LATAM solo aceptan su moneda local (ARS/PEN/MXN/COP).
//       Con 'USD' la preferencia se crea OK pero el checkout deshabilita el botón.
// ═══════════════════════════════════════

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL         = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const APP_URL = process.env.VITE_APP_URL || 'https://aidark.es';

const PLANS: Record<string, { title: string; price: number; period: string; months: number; plan_id: string }> = {
  basic_monthly: {
    title: 'AIdark Basic - Plan mensual',
    price: 12.00, period: 'monthly', months: 1, plan_id: 'premium_monthly',
  },
  pro_quarterly: {
    title: 'AIdark Pro - Plan trimestral',
    price: 29.99, period: 'quarterly', months: 3, plan_id: 'premium_quarterly',
  },
  ultra_annual: {
    title: 'AIdark Ultra - Plan anual',
    price: 99.99, period: 'annual', months: 12, plan_id: 'premium_annual',
  },
  basic_monthly_promo: {
    title: 'AIdark Basic - Plan mensual (Oferta 50%)',
    price: 6.00, period: 'monthly', months: 1, plan_id: 'premium_monthly',
  },
  pro_quarterly_promo: {
    title: 'AIdark Pro - Plan trimestral (Oferta 50%)',
    price: 15.00, period: 'quarterly', months: 3, plan_id: 'premium_quarterly',
  },
  ultra_annual_promo: {
    title: 'AIdark Ultra - Plan anual (Oferta 50%)',
    price: 50.00, period: 'annual', months: 12, plan_id: 'premium_annual',
  },
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function isValidUUID(str: string): boolean {
  return UUID_REGEX.test(str);
}

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

  if (!isValidUUID(userId)) {
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
    const preference = {
      items: [{
        title:      plan.title,
        quantity:   1,
        unit_price: plan.price,
        // FIX [6]: NO incluir currency_id aquí.
        // Con currency_id:'USD' la preferencia se crea correctamente en la API,
        // pero MercadoPago deshabilita el botón "Pagar" en el checkout porque
        // las cuentas LATAM (ARG, PER, MEX, COL, CHI, URU, BRA) solo procesan
        // su moneda local. Sin este campo, MP usa la moneda de la cuenta automáticamente.
      }],
      payer: { email: safeEmail },
      metadata: {
        user_id:    user.id,
        user_email: safeEmail,
        plan_id:    plan.plan_id,
        months:     plan.months,
      },
      back_urls: {
        success: `${APP_URL}/payment/success`,
        failure: `${APP_URL}/payment/failure`,
        pending: `${APP_URL}/payment/pending`,
      },
      auto_return: 'approved',
      notification_url: `${APP_URL}/api/webhook-mercadopago`,
      external_reference: `${user.id}|${plan.plan_id}|${Date.now()}`,
      // Métodos de pago LATAM habilitados (Pix, PSE, OXXO, débito, transferencia)
      payment_methods: {
        excluded_payment_types: [],
        installments:         3,
        default_installments: 1,
      },
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
    });

  } catch (err) {
    console.error('[MP] Error inesperado:', err);
    return res.status(500).json({ error: 'Error del servidor.' });
  }
}
