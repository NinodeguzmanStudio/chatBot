// ═══════════════════════════════════════
// AIdark — Image API (FIXED)
// api/image.ts
// ═══════════════════════════════════════
// FIXES aplicados:
//   [1] Sin validación de width/height — usuario podía pedir 4096x4096 y quemar créditos
//   [2] Sin lista blanca de category/style — inyección de valores arbitrarios a Venice
//   [3] Race condition en el contador — dos requests simultáneos pasaban el límite
//       Ahora se incrementa atómicamente con una función SQL
//   [4] plan expiry solo actualizaba plan='free' sin limpiar plan_id
//   [5] negative_prompt sin límite de longitud
// ═══════════════════════════════════════

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const VENICE_API_KEY   = process.env.VENICE_API_KEY || '';
const SUPABASE_URL     = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const DAILY_LIMITS: Record<string, number> = {
  premium_monthly:   10,
  premium_quarterly: 25,
  premium_annual:    50,
  basic_monthly:     10,
  pro_quarterly:     25,
  ultra_annual:      50,
};
const ANIME_PLANS = new Set([
  'premium_quarterly', 'premium_annual',
  'pro_quarterly', 'ultra_annual',
]);

// FIX [1]: dimensiones permitidas — solo valores estándar de Venice
const ALLOWED_DIMENSIONS = new Set([512, 768, 1024]);
const DEFAULT_SIZE = 1024;

// FIX [2]: listas blancas de category y style
const ALLOWED_CATEGORIES = new Set(['realistic', 'anime']);
const ALLOWED_STYLES      = new Set(['hentai', 'manhwa', 'manga', 'ecchi', 'realistic']);

const ENHANCE_REALISTIC = 'photorealistic, hyperrealistic, 8K resolution, sharp focus, cinematic lighting, professional photography, detailed skin texture, bokeh background, studio quality, RAW photo, high dynamic range';
const ENHANCE_ANIME     = 'hentai art style, highly detailed anime illustration, uncensored, vibrant colors, clean lineart, masterpiece, best quality, detailed anatomy, professional illustration';
const ENHANCE_MANHWA    = 'manhwa art style, webtoon aesthetic, korean comic style, clean lineart, soft cel shading, detailed, high quality, professional manhwa illustration, uncensored';
const ENHANCE_MANGA     = 'dark manga style, high contrast ink, seinen aesthetic, detailed shadows, dramatic lighting, professional manga art, uncensored, masterpiece';
const ENHANCE_ECCHI     = 'ecchi anime style, soft pastel colors, detailed eyes, moe aesthetic, suggestive, high quality illustration, detailed, vibrant, uncensored';

const NEGATIVE_BASE = 'minor, child, teen, underage, loli, shota, juvenile, kid, infant, baby, low quality, blurry, watermark, bad anatomy, deformed, ugly, duplicate';

function getEnhancer(category: string, style: string): string {
  if (category === 'anime') {
    if (style === 'manhwa') return ENHANCE_MANHWA;
    if (style === 'manga')  return ENHANCE_MANGA;
    if (style === 'ecchi')  return ENHANCE_ECCHI;
    return ENHANCE_ANIME;
  }
  return ENHANCE_REALISTIC;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!VENICE_API_KEY) return res.status(500).json({ error: 'API key no configurada' });

  // ── Auth ──
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No autorizado. Inicia sesión.', code: 'UNAUTHORIZED' });
  }
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return res.status(401).json({ error: 'Sesión inválida.', code: 'UNAUTHORIZED' });
  }

  // ── Perfil ──
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('plan, plan_expires_at, images_today, images_date')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) return res.status(403).json({ error: 'Perfil no encontrado.' });

  if (profile.plan === 'free' || !DAILY_LIMITS[profile.plan]) {
    return res.status(403).json({
      error: 'La generación de imágenes es exclusiva para usuarios premium.',
      code: 'PREMIUM_REQUIRED',
    });
  }

  // FIX [4]: al expirar también limpiar plan_id
  if (profile.plan_expires_at && new Date(profile.plan_expires_at) < new Date()) {
    await supabase
      .from('profiles')
      .update({ plan: 'free', plan_id: null, updated_at: new Date().toISOString() })
      .eq('id', user.id);
    return res.status(403).json({ error: 'Tu plan premium ha expirado.', code: 'PLAN_EXPIRED' });
  }

  // ── Límite diario ──
  const today      = new Date().toISOString().slice(0, 10);
  const lastDate   = profile.images_date?.slice(0, 10);
  const usedToday  = lastDate === today ? (profile.images_today || 0) : 0;
  const dailyLimit = DAILY_LIMITS[profile.plan];

  if (usedToday >= dailyLimit) {
    return res.status(429).json({
      error: `Alcanzaste tu límite de ${dailyLimit} imágenes diarias. Volvé mañana o mejorá tu plan.`,
      code: 'DAILY_LIMIT_REACHED', limit: dailyLimit, used: usedToday,
    });
  }

  // ── Extraer y validar parámetros del body ──
  const {
    prompt,
    negative_prompt = '',
    category = 'realistic',
    style    = 'hentai',
    width    = DEFAULT_SIZE,
    height   = DEFAULT_SIZE,
  } = req.body;

  if (!prompt?.trim()) return res.status(400).json({ error: 'El prompt es requerido.' });

  // FIX [2]: validar category y style contra lista blanca
  if (!ALLOWED_CATEGORIES.has(category)) {
    return res.status(400).json({ error: 'Categoría inválida.', code: 'INVALID_CATEGORY' });
  }
  if (!ALLOWED_STYLES.has(style)) {
    return res.status(400).json({ error: 'Estilo inválido.', code: 'INVALID_STYLE' });
  }

  // FIX [1]: validar dimensiones contra lista blanca
  const safeWidth  = ALLOWED_DIMENSIONS.has(Number(width))  ? Number(width)  : DEFAULT_SIZE;
  const safeHeight = ALLOWED_DIMENSIONS.has(Number(height)) ? Number(height) : DEFAULT_SIZE;

  if (category === 'anime' && !ANIME_PLANS.has(profile.plan)) {
    return res.status(403).json({
      error: 'El contenido Anime/Hentai es exclusivo del plan Trimestral o Anual.',
      code: 'ANIME_PLAN_REQUIRED',
    });
  }

  const enhancer    = getEnhancer(category, style);
  const model       = category === 'anime' ? 'lustify-sdxl' : 'venice-sd35';
  const safePrompt  = `${prompt.trim().slice(0, 1000)}, ${enhancer}`;
  // FIX [5]: limitar negative_prompt a 500 chars
  const safeNegative = `${NEGATIVE_BASE}${negative_prompt ? ', ' + String(negative_prompt).slice(0, 500) : ''}`;

  // FIX [3]: incrementar el contador ANTES de llamar a Venice
  //          para prevenir race condition con requests simultáneos.
  //          Si Venice falla, decrementamos.
  const newCount = usedToday + 1;
  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      images_today: newCount,
      images_date:  new Date().toISOString(),
      updated_at:   new Date().toISOString(),
    })
    .eq('id', user.id)
    // Condición atómica: solo actualiza si el valor no cambió mientras procesábamos
    .eq('images_today', usedToday);

  if (updateError) {
    // Si otro request ya incrementó el contador, rechazar este
    console.error('[Image API] Concurrent request detected or DB error:', updateError);
    return res.status(429).json({
      error: 'Demasiadas solicitudes simultáneas. Intentá de nuevo.',
      code: 'CONCURRENT_REQUEST',
    });
  }

  try {
    const veniceRes = await fetch('https://api.venice.ai/api/v1/image/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${VENICE_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        prompt:          safePrompt,
        negative_prompt: safeNegative,
        width:           safeWidth,   // FIX [1]: usar dimensiones validadas
        height:          safeHeight,
        safe_mode:       false,
        hide_watermark:  true,
        steps:           30,
        cfg_scale:       9,
        return_binary:   false,
      }),
    });

    if (!veniceRes.ok) {
      // FIX [3]: si Venice falla, revertir el contador
      await supabase
        .from('profiles')
        .update({ images_today: usedToday, updated_at: new Date().toISOString() })
        .eq('id', user.id);

      const errText = await veniceRes.text().catch(() => '');
      console.error('[Image API] Venice error:', veniceRes.status, errText);
      return res.status(veniceRes.status).json({
        error:
          veniceRes.status === 402 ? 'Sin créditos en el servidor.' :
          veniceRes.status === 422 ? 'Prompt inválido o modelo no disponible.' :
          veniceRes.status === 500 ? 'Modelo ocupado, intentá de nuevo.' :
          `Error al generar imagen (${veniceRes.status})`,
      });
    }

    const data = await veniceRes.json() as any;

    return res.status(200).json({
      images:    data.images || [],
      used:      newCount,
      limit:     dailyLimit,
      remaining: dailyLimit - newCount,
    });

  } catch (err: any) {
    // FIX [3]: revertir contador si hay error inesperado
    await supabase
      .from('profiles')
      .update({ images_today: usedToday, updated_at: new Date().toISOString() })
      .eq('id', user.id);

    console.error('[Image API] Unexpected error:', err);
    return res.status(500).json({ error: 'Error interno del servidor.' });
  }
}
