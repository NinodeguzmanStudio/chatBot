// ═══════════════════════════════════════
// AIdark — Image API v2
// api/image.ts
// FIX: ALLOWED_DIMENSIONS ahora incluye 720 y 1280
//   Antes: solo 512, 768, 1024 → ratios 9:16 y 16:9 caían a 1024x1024
//   Ahora: 512, 720, 768, 1024, 1280 → todos los ratios funcionan
// ═══════════════════════════════════════

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const VENICE_API_KEY       = process.env.VENICE_API_KEY || '';
const SUPABASE_URL         = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL!;
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

// FIX: agregados 720 y 1280 para soportar 9:16 y 16:9
const ALLOWED_DIMENSIONS = new Set([512, 720, 768, 1024, 1280]);
const DEFAULT_SIZE = 1024;

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

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No autorizado.', code: 'UNAUTHORIZED' });
  }
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return res.status(401).json({ error: 'Sesión inválida.', code: 'UNAUTHORIZED' });
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('plan, plan_expires_at, images_today, images_date')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) return res.status(403).json({ error: 'Perfil no encontrado.' });

  if (profile.plan === 'free' || !DAILY_LIMITS[profile.plan]) {
    return res.status(403).json({ error: 'La generación de imágenes es exclusiva para usuarios premium.', code: 'PREMIUM_REQUIRED' });
  }

  if (profile.plan_expires_at && new Date(profile.plan_expires_at) < new Date()) {
    await supabase.from('profiles').update({ plan: 'free', plan_id: null, updated_at: new Date().toISOString() }).eq('id', user.id);
    return res.status(403).json({ error: 'Tu plan premium ha expirado.', code: 'PLAN_EXPIRED' });
  }

  const today      = new Date().toISOString().slice(0, 10);
  const lastDate   = profile.images_date?.slice(0, 10);
  const usedToday  = lastDate === today ? (profile.images_today || 0) : 0;
  const dailyLimit = DAILY_LIMITS[profile.plan];

  if (usedToday >= dailyLimit) {
    return res.status(429).json({
      error: `Alcanzaste tu límite de ${dailyLimit} imágenes diarias.`,
      code: 'DAILY_LIMIT_REACHED', limit: dailyLimit, used: usedToday,
    });
  }

  const { prompt, negative_prompt = '', category = 'realistic', style = 'hentai', width = DEFAULT_SIZE, height = DEFAULT_SIZE } = req.body;

  if (!prompt?.trim()) return res.status(400).json({ error: 'El prompt es requerido.' });
  if (!ALLOWED_CATEGORIES.has(category)) return res.status(400).json({ error: 'Categoría inválida.' });
  if (!ALLOWED_STYLES.has(style)) return res.status(400).json({ error: 'Estilo inválido.' });

  const safeWidth  = ALLOWED_DIMENSIONS.has(Number(width))  ? Number(width)  : DEFAULT_SIZE;
  const safeHeight = ALLOWED_DIMENSIONS.has(Number(height)) ? Number(height) : DEFAULT_SIZE;

  if (category === 'anime' && !ANIME_PLANS.has(profile.plan)) {
    return res.status(403).json({ error: 'Anime/Hentai es exclusivo del plan Trimestral o Anual.', code: 'ANIME_PLAN_REQUIRED' });
  }

  const enhancer     = getEnhancer(category, style);
  const model        = category === 'anime' ? 'lustify-sdxl' : 'venice-sd35';
  const safePrompt   = `${prompt.trim().slice(0, 1000)}, ${enhancer}`;
  const safeNegative = `${NEGATIVE_BASE}${negative_prompt ? ', ' + String(negative_prompt).slice(0, 500) : ''}`;

  const newCount = usedToday + 1;
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ images_today: newCount, images_date: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', user.id)
    .eq('images_today', usedToday);

  if (updateError) {
    return res.status(429).json({ error: 'Demasiadas solicitudes simultáneas.', code: 'CONCURRENT_REQUEST' });
  }

  try {
    const veniceRes = await fetch('https://api.venice.ai/api/v1/image/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${VENICE_API_KEY}` },
      body: JSON.stringify({
        model, prompt: safePrompt, negative_prompt: safeNegative,
        width: safeWidth, height: safeHeight,
        safe_mode: false, hide_watermark: true, steps: 30, cfg_scale: 9, return_binary: false,
      }),
    });

    if (!veniceRes.ok) {
      await supabase.from('profiles').update({ images_today: usedToday, updated_at: new Date().toISOString() }).eq('id', user.id);
      const errText = await veniceRes.text().catch(() => '');
      console.error('[Image API] Venice error:', veniceRes.status, errText);
      return res.status(veniceRes.status).json({
        error: veniceRes.status === 402 ? 'Sin créditos en el servidor.' :
               veniceRes.status === 422 ? 'Prompt inválido o modelo no disponible.' :
               veniceRes.status === 500 ? 'Modelo ocupado, intentá de nuevo.' :
               `Error al generar imagen (${veniceRes.status})`,
      });
    }

    const data = await veniceRes.json() as any;
    const images = (data.images || [])
      .map((img: any) => typeof img === 'string' ? img : (img.b64_json || img.url || ''))
      .filter(Boolean);

    return res.status(200).json({ images, used: newCount, limit: dailyLimit, remaining: dailyLimit - newCount });

  } catch (err: any) {
    await supabase.from('profiles').update({ images_today: usedToday, updated_at: new Date().toISOString() }).eq('id', user.id);
    console.error('[Image API] Unexpected error:', err);
    return res.status(500).json({ error: 'Error interno del servidor.' });
  }
}
