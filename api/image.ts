// ═══════════════════════════════════════
// AIdark — Image API v3 (FIXED)
// api/image.ts
// ═══════════════════════════════════════
// CAMBIOS v3:
//   [1] FREE_DAILY_LIMIT: 2 imágenes gratis/día para usuarios free
//       Antes: bloqueaba a free completamente
//       Ahora: 2 imágenes gratis, después banner premium
//   [2] PROMPT ENHANCEMENT INTELIGENTE:
//       Se analiza el prompt del usuario y se enriquece automáticamente
//       con detalles de iluminación, composición, calidad y estilo
//       para que las imágenes salgan más profesionales y lógicas
//   [3] Free users solo pueden generar "realistic" (no anime)
// ═══════════════════════════════════════

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const VENICE_API_KEY       = process.env.VENICE_API_KEY || '';
const SUPABASE_URL         = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// FIX [1]: Ahora incluye 'free' con 2 imágenes
const DAILY_LIMITS: Record<string, number> = {
  free:              2,
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
const PREMIUM_PLANS = new Set([
  'basic_monthly', 'pro_quarterly', 'ultra_annual',
  'premium_monthly', 'premium_quarterly', 'premium_annual',
]);

const ALLOWED_DIMENSIONS = new Set([512, 720, 768, 1024, 1280]);
const DEFAULT_SIZE = 1024;

const ALLOWED_CATEGORIES = new Set(['realistic', 'anime']);
const ALLOWED_STYLES      = new Set(['hentai', 'manhwa', 'manga', 'ecchi', 'realistic']);

// ═══════════════════════════════════════
// FIX [2]: PROMPT ENHANCEMENT INTELIGENTE
// En vez de solo concatenar keywords genéricos,
// analizamos qué pide el usuario y añadimos
// lo que falta para una imagen profesional
// ═══════════════════════════════════════

const QUALITY_BASE = '8K UHD, masterpiece, best quality, highly detailed, sharp focus, professional';

// Detecta si el prompt ya menciona ciertos aspectos
function hasAspect(prompt: string, keywords: string[]): boolean {
  const lower = prompt.toLowerCase();
  return keywords.some(k => lower.includes(k));
}

function enhanceRealisticPrompt(userPrompt: string): string {
  const parts = [userPrompt.trim()];

  // Calidad base siempre
  parts.push(QUALITY_BASE);

  // Si no menciona iluminación, agregar
  if (!hasAspect(userPrompt, ['lighting', 'light', 'iluminación', 'iluminacion', 'luz', 'shadow', 'sombra', 'backlit', 'golden hour', 'neon'])) {
    parts.push('cinematic lighting, soft shadows, volumetric light');
  }

  // Si no menciona cámara/foto
  if (!hasAspect(userPrompt, ['photo', 'foto', 'camera', 'cámara', 'lens', 'lente', 'bokeh', 'dslr', 'raw', 'canon', 'nikon', 'sony'])) {
    parts.push('photorealistic, RAW photo, shot on Canon EOS R5, 85mm lens, shallow depth of field');
  }

  // Si no menciona textura de piel (para retratos)
  if (hasAspect(userPrompt, ['mujer', 'woman', 'girl', 'chica', 'hombre', 'man', 'persona', 'person', 'retrato', 'portrait', 'face', 'rostro', 'cuerpo', 'body'])) {
    if (!hasAspect(userPrompt, ['skin', 'piel', 'texture', 'textura', 'pores', 'poros'])) {
      parts.push('detailed skin texture, natural skin pores, subsurface scattering');
    }
  }

  // Si no menciona ambiente/fondo
  if (!hasAspect(userPrompt, ['background', 'fondo', 'room', 'habitación', 'habitacion', 'outdoor', 'exterior', 'interior', 'city', 'ciudad', 'beach', 'playa', 'forest', 'bosque', 'studio'])) {
    parts.push('detailed background, atmospheric perspective');
  }

  // Si no menciona composición
  if (!hasAspect(userPrompt, ['composition', 'composición', 'composicion', 'rule of thirds', 'centered', 'close-up', 'full body', 'cuerpo completo', 'half body', 'medio cuerpo'])) {
    parts.push('professional composition');
  }

  return parts.join(', ');
}

function enhanceAnimePrompt(userPrompt: string, style: string): string {
  const parts = [userPrompt.trim()];

  const STYLE_ENHANCERS: Record<string, string> = {
    hentai: 'hentai art style, highly detailed anime illustration, uncensored, vibrant colors, clean lineart, masterpiece, best quality, detailed anatomy, professional illustration, expressive eyes',
    manhwa: 'manhwa art style, webtoon aesthetic, korean comic style, clean lineart, soft cel shading, detailed, high quality, professional manhwa illustration, uncensored, beautiful coloring',
    manga: 'dark manga style, high contrast ink, seinen aesthetic, detailed shadows, dramatic lighting, professional manga art, uncensored, masterpiece, intricate linework',
    ecchi: 'ecchi anime style, soft pastel colors, detailed eyes, moe aesthetic, suggestive, high quality illustration, detailed, vibrant, uncensored, beautiful shading',
  };

  parts.push(STYLE_ENHANCERS[style] || STYLE_ENHANCERS['hentai']);

  // Agregar detalles anatómicos si no se especifican
  if (!hasAspect(userPrompt, ['eyes', 'ojos', 'hair', 'cabello', 'pelo'])) {
    parts.push('detailed eyes with reflections, flowing detailed hair');
  }

  return parts.join(', ');
}

const NEGATIVE_BASE = 'minor, child, teen, underage, loli, shota, juvenile, kid, infant, baby, low quality, blurry, watermark, bad anatomy, deformed, ugly, duplicate, extra limbs, extra fingers, mutated hands, poorly drawn face, disfigured, bad proportions, gross proportions, text, logo, signature';

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

  const plan = profile.plan || 'free';
  const isPremium = PREMIUM_PLANS.has(plan);

  // FIX [1]: Free users get 2 images, premium get their plan limit
  const dailyLimit = DAILY_LIMITS[plan] || 2;

  if (isPremium && profile.plan_expires_at && new Date(profile.plan_expires_at) < new Date()) {
    await supabase.from('profiles').update({ plan: 'free', plan_id: null, updated_at: new Date().toISOString() }).eq('id', user.id);
    return res.status(403).json({ error: 'Tu plan premium ha expirado.', code: 'PLAN_EXPIRED' });
  }

  const today      = new Date().toISOString().slice(0, 10);
  const lastDate   = profile.images_date?.slice(0, 10);
  const usedToday  = lastDate === today ? (profile.images_today || 0) : 0;

  if (usedToday >= dailyLimit) {
    // FIX [1]: Different message for free vs premium
    if (!isPremium) {
      return res.status(403).json({
        error: 'Has usado tus 2 imágenes gratuitas de hoy. Hazte Premium para generar más.',
        code: 'FREE_IMAGE_LIMIT', limit: dailyLimit, used: usedToday,
      });
    }
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

  // FIX [3]: Free users can only do realistic
  if (category === 'anime' && !ANIME_PLANS.has(plan)) {
    return res.status(403).json({ error: 'Anime/Hentai es exclusivo del plan Trimestral o Anual.', code: 'ANIME_PLAN_REQUIRED' });
  }

  // FIX [2]: Smart prompt enhancement
  const safePrompt = category === 'anime'
    ? enhanceAnimePrompt(prompt.trim().slice(0, 1000), style)
    : enhanceRealisticPrompt(prompt.trim().slice(0, 1000));

  const safeNegative = `${NEGATIVE_BASE}${negative_prompt ? ', ' + String(negative_prompt).slice(0, 500) : ''}`;

  const model = category === 'anime' ? 'lustify-sdxl' : 'venice-sd35';

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

    // Detectar formato real del base64
    const detectMime = (b64: string): string => {
      if (b64.startsWith('/9j/')) return 'image/jpeg';
      if (b64.startsWith('iVBOR')) return 'image/png';
      if (b64.startsWith('UklGR')) return 'image/webp';
      return 'image/png';
    };
    const mime_type = images.length > 0 ? detectMime(images[0]) : 'image/png';

    return res.status(200).json({
      images, used: newCount, limit: dailyLimit,
      remaining: dailyLimit - newCount,
      is_free: !isPremium,
      mime_type,
    });

  } catch (err: any) {
    await supabase.from('profiles').update({ images_today: usedToday, updated_at: new Date().toISOString() }).eq('id', user.id);
    console.error('[Image API] Unexpected error:', err);
    return res.status(500).json({ error: 'Error interno del servidor.' });
  }
}
