Aquí tienes el código corregido. He agregado la configuración de `payment_methods` dentro del objeto `preference` tal como solicitaste.

```typescript
// ═══════════════════════════════════════
// AIdark — Create MercadoPago Payment (FIXED)
// api/create-payment.ts
// ═══════════════════════════════════════
// FIXES aplicados:
//   [1] Sin autenticación — cualquiera podía crear preferencias con el userId de otro
//       Ahora se verifica el token Bearer y se valida que userId == user autenticado
//   [2] origin del header podía ser spoofed para redirigir el webhook a otro servidor
//       Ahora el notification_url usa VITE_APP_URL fijo desde env vars
//   [3] Sin validación de UUID en userId — se podía pasar cualquier string
//   [4] Sin sanitización de userEmail
// ═══════════════════════════════════════

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// FIX [1]: necesitamos Supabase para verificar el token del usuario
const SUPABASE_URL        = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// FIX [2]: URL base fija desde env — no confiar en el header origin del request
const APP_URL = process.env.VITE_APP_URL || 'https://aidark.vercel.app';

const PLANS: Record<string, { title: string; price: number; period: string; months: number; plan_id: string }> = {
  // ── Planes normales ──
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
  // ── Planes promo 50% OFF ──
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

// FIX [3]: validar que un string sea UUID v4
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

  // ════════════════════════════════════════════════════════
  // FIX [1]: VERIFICAR AUTENTICACIÓN
  // Antes: tomaba userId del body sin verificar nada.
  // Ahora: valida el Bearer token y confirma que userId del body
  //        coincide con el usuario autenticado.
  // ════════════════════════════════════════════════════════
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No autorizado. Inicia sesión.' });
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return res.status(401).json({ error: 'Sesión inválida. Inicia sesión de nuevo.' });
  }

  // ── Extraer y validar body ──
  const { planId, userEmail, userId } = req.body;

  if (!planId || !userEmail || !userId) {
    return res.status(400).json({ error: 'Faltan datos requeridos.' });
  }

  // FIX [3]: validar formato UUID
  if (!isValidUUID(userId)) {
    return res.status(400).json({ error: 'userId inválido.' });
  }

  // FIX [1]: el userId del body DEBE coincidir con el token autenticado
  //          Previene que un usuario cree pagos a nombre de otro
  if (userId !== user.id) {
    return res.status(403).json({ error: 'No podés crear pagos para otro usuario.' });
  }

  // FIX [4]: sanitizar email básico
  const safeEmail = String(userEmail).trim().toLowerCase().slice(0, 254);
  if (!safeEmail.includes('@') || safeEmail.length < 5) {
    return res.status(400).json({ error: 'Email inválido.' });
  }

  const plan = PLANS[planId];
  if (!plan) return res.status(400).json({ error: `Plan "${planId}" no válido.` });

  try {
    const preference = {
      items: [{
        title: plan.title,
        quantity: 1,
        unit_price: plan.price,
        currency_id: 'USD',
      }],
      payer: { email: safeEmail },
      metadata: {
        user_id:    user.id,       // usar el id del token, no del body
        user_email: safeEmail,
        plan_id:    plan.plan_id,
        months:     plan.months,
      },
      back_urls: {
        // FIX [2]: URLs fijas desde env — no del header origin
        success: `${APP_URL}/payment/success`,
        failure: `${APP_URL}/payment/failure`,
        pending: `${APP_URL}/payment/pending`,
      },
      auto_return: 'approved',
      payment_methods: {
        excluded_payment_types: [],   // no excluir nada
        installments: 3,              // hasta 3 cuotas sin interés
        default_installments: 1,
      },
      // FIX [2]: notification_url fija — no puede ser spoofed
      notification_url: `${APP_URL}/api/webhook-mercadopago`,
      external_reference: `${user.id}|${plan.plan_id}|${Date.now()}`,
    };

    const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
      },
      body: JSON.stringify(preference),
    });

    if (!mpRes.ok) {
      const err = await mpRes.text();
      console.error('[MP] Error:', err);
      return res.status(500).json({ error: 'Error al crear el pago.' });
    }

    const data = await mpRes.json() as any;
    return res.status(200).json({
      init_point:         data.init_point,
      sandbox_init_point: data.sandbox_init_point,
    });

  } catch (err) {
    console.error('[MP] Error:', err);
    return res.status(500).json({ error: 'Error del servidor.' });
  }
}
```
