// ═══════════════════════════════════════
// AIdark — Image API v4 (FIXED)
// api/image.ts
// ═══════════════════════════════════════
// CAMBIOS v4:
//   [1] TRADUCCIÓN AUTOMÁTICA: El prompt del usuario se traduce a inglés
//       antes de enviarse al modelo. Diccionario extenso ES→EN + PT→EN
//   [2] PROMPT REESTRUCTURADO: El prompt del usuario va PRIMERO con peso
//       dominante. Enhancement reducido a lo esencial.
//   [3] cfg_scale bajado de 9 → 7 para que el modelo interprete mejor
//   [4] steps subido de 30 → 35 para mayor calidad
//   [5] Se mantiene todo lo de v3 (free limits, anime plans, etc.)
// ═══════════════════════════════════════

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const VENICE_API_KEY       = process.env.VENICE_API_KEY || '';
const SUPABASE_URL         = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

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
// FIX v4 [1]: DICCIONARIO DE TRADUCCIÓN ES/PT → EN
// Cubre los términos más usados en prompts de imagen
// ═══════════════════════════════════════

const TRANSLATION_MAP: Record<string, string> = {
  // --- Personas y cuerpo ---
  'mujer': 'woman', 'hombre': 'man', 'chica': 'girl', 'chico': 'boy',
  'persona': 'person', 'joven': 'young', 'adulta': 'adult', 'adulto': 'adult',
  'anciana': 'elderly woman', 'anciano': 'elderly man',
  'pareja': 'couple', 'grupo': 'group',
  'cabello': 'hair', 'pelo': 'hair', 'ojos': 'eyes', 'rostro': 'face',
  'cara': 'face', 'cuerpo': 'body', 'piel': 'skin', 'labios': 'lips',
  'manos': 'hands', 'piernas': 'legs', 'brazos': 'arms', 'espalda': 'back',
  'cintura': 'waist', 'caderas': 'hips', 'pecho': 'chest', 'pechos': 'breasts',
  'trasero': 'butt', 'cuello': 'neck', 'hombros': 'shoulders',
  'muslos': 'thighs', 'abdomen': 'abdomen', 'vientre': 'belly',
  // Pelo colores
  'rubio': 'blonde', 'rubia': 'blonde', 'moreno': 'brunette', 'morena': 'brunette',
  'pelirrojo': 'redhead', 'pelirroja': 'redhead', 'negro': 'black', 'castaño': 'brown',
  'blanco': 'white', 'gris': 'gray', 'platino': 'platinum',
  'largo': 'long', 'corto': 'short', 'rizado': 'curly', 'lacio': 'straight',
  'ondulado': 'wavy', 'recogido': 'updo', 'suelto': 'loose', 'trenza': 'braid',
  'coleta': 'ponytail',
  // Ojos
  'azules': 'blue', 'verdes': 'green', 'marrones': 'brown', 'negros': 'black',
  'claros': 'light', 'oscuros': 'dark',
  // Cuerpo
  'delgada': 'slim', 'delgado': 'slim', 'atletica': 'athletic', 'atletico': 'athletic',
  'atlética': 'athletic', 'atlético': 'athletic',
  'curvilínea': 'curvy', 'curvilinea': 'curvy', 'voluptuosa': 'voluptuous',
  'musculoso': 'muscular', 'musculosa': 'muscular',
  'alta': 'tall', 'alto': 'tall', 'baja': 'short', 'bajo': 'short',
  'sexy': 'sexy', 'sensual': 'sensual', 'hermosa': 'beautiful', 'hermoso': 'handsome',
  'guapa': 'beautiful', 'guapo': 'handsome', 'atractiva': 'attractive', 'atractivo': 'attractive',
  'linda': 'pretty', 'lindo': 'pretty',
  // Etnias
  'latina': 'latina', 'latino': 'latino', 'asiática': 'asian', 'asiático': 'asian',
  'europea': 'european', 'europeo': 'european', 'africana': 'african', 'africano': 'african',
  'árabe': 'arab',
  // Edades
  'años': 'years old',

  // --- Ropa ---
  'vestido': 'dress', 'vestida': 'wearing', 'vestido de': 'dress',
  'falda': 'skirt', 'pantalones': 'pants', 'jeans': 'jeans',
  'camisa': 'shirt', 'blusa': 'blouse', 'camiseta': 't-shirt',
  'bikini': 'bikini', 'traje de baño': 'swimsuit', 'lencería': 'lingerie',
  'lenceria': 'lingerie', 'ropa interior': 'underwear',
  'medias': 'stockings', 'tacones': 'high heels', 'zapatos': 'shoes',
  'botas': 'boots', 'sombrero': 'hat', 'gafas': 'glasses',
  'collar': 'necklace', 'aretes': 'earrings', 'anillo': 'ring',
  'desnuda': 'nude', 'desnudo': 'nude', 'semidesnuda': 'semi-nude',
  'transparente': 'sheer', 'ajustado': 'tight', 'ajustada': 'tight',
  'escotado': 'low-cut', 'escotada': 'low-cut', 'corta': 'short', 'minifalda': 'miniskirt',
  'corsé': 'corset', 'corse': 'corset', 'tanga': 'thong', 'sujetador': 'bra',
  'traje': 'suit', 'uniforme': 'uniform', 'cosplay': 'cosplay',
  'enfermera': 'nurse', 'secretaria': 'secretary', 'policía': 'police',
  'policia': 'police', 'colegiala': 'schoolgirl',

  // --- Poses ---
  'sentada': 'sitting', 'sentado': 'sitting',
  'acostada': 'lying down', 'acostado': 'lying down',
  'de pie': 'standing', 'parada': 'standing', 'parado': 'standing',
  'de rodillas': 'kneeling', 'agachada': 'bending over', 'agachado': 'bending over',
  'recostada': 'reclining', 'recostado': 'reclining',
  'caminando': 'walking', 'corriendo': 'running',
  'mirando': 'looking at', 'mirando a la cámara': 'looking at camera',
  'mirando a la camara': 'looking at camera',
  'de espaldas': 'from behind', 'de frente': 'front view',
  'de lado': 'side view', 'de perfil': 'profile view',
  'pose': 'pose', 'posando': 'posing', 'provocativa': 'provocative',
  'seductora': 'seductive', 'sugestiva': 'suggestive',
  'sonriendo': 'smiling', 'seria': 'serious', 'serio': 'serious',

  // --- Lugares y ambiente ---
  'playa': 'beach', 'mar': 'sea', 'océano': 'ocean', 'oceano': 'ocean',
  'piscina': 'pool', 'alberca': 'pool',
  'habitación': 'bedroom', 'habitacion': 'bedroom', 'dormitorio': 'bedroom',
  'cama': 'bed', 'sofá': 'couch', 'sofa': 'couch', 'silla': 'chair',
  'baño': 'bathroom', 'bano': 'bathroom', 'ducha': 'shower', 'bañera': 'bathtub',
  'cocina': 'kitchen', 'sala': 'living room', 'salón': 'living room', 'salon': 'living room',
  'oficina': 'office', 'escritorio': 'desk',
  'hotel': 'hotel', 'suite': 'suite', 'mansión': 'mansion', 'mansion': 'mansion',
  'jardín': 'garden', 'jardin': 'garden', 'parque': 'park', 'bosque': 'forest',
  'montaña': 'mountain', 'montana': 'mountain', 'campo': 'field', 'pradera': 'meadow',
  'ciudad': 'city', 'calle': 'street', 'callejón': 'alley', 'callejon': 'alley',
  'balcón': 'balcony', 'balcon': 'balcony', 'terraza': 'terrace', 'azotea': 'rooftop',
  'iglesia': 'church', 'castillo': 'castle', 'templo': 'temple',
  'bar': 'bar', 'restaurante': 'restaurant', 'club': 'nightclub',
  'gimnasio': 'gym', 'estudio': 'studio',
  'noche': 'night', 'día': 'day', 'dia': 'day',
  'atardecer': 'sunset', 'amanecer': 'sunrise', 'anochecer': 'dusk',
  'lluvia': 'rain', 'nieve': 'snow', 'niebla': 'fog', 'tormenta': 'storm',
  'exterior': 'outdoor', 'interior': 'indoor',

  // --- Iluminación ---
  'iluminación': 'lighting', 'iluminacion': 'lighting',
  'luz': 'light', 'sombra': 'shadow', 'sombras': 'shadows',
  'suave': 'soft', 'fuerte': 'strong', 'natural': 'natural',
  'neón': 'neon', 'neon': 'neon', 'cálida': 'warm', 'calida': 'warm',
  'fría': 'cold', 'fria': 'cold', 'dorada': 'golden', 'dorado': 'golden',
  'velas': 'candlelight', 'contraluz': 'backlit',
  'dramática': 'dramatic', 'dramatica': 'dramatic', 'tenue': 'dim',

  // --- Estilo y calidad ---
  'fotorrealista': 'photorealistic', 'realista': 'realistic', 'artístico': 'artistic',
  'artistico': 'artistic', 'cinematográfico': 'cinematic', 'cinematografico': 'cinematic',
  'retrato': 'portrait', 'primer plano': 'close-up', 'plano medio': 'medium shot',
  'cuerpo completo': 'full body', 'medio cuerpo': 'half body',
  'detallado': 'detailed', 'detallada': 'detailed',
  'profesional': 'professional', 'elegante': 'elegant',

  // --- Colores ---
  'rojo': 'red', 'roja': 'red', 'azul': 'blue', 'verde': 'green',
  'amarillo': 'yellow', 'amarilla': 'yellow', 'rosa': 'pink', 'rosado': 'pink',
  'morado': 'purple', 'naranja': 'orange', 'plateado': 'silver',

  // --- Português comuns ---
  'mulher': 'woman', 'homem': 'man', 'garota': 'girl', 'menina': 'girl',
  'cabelo': 'hair', 'olhos': 'eyes', 'rosto': 'face', 'corpo': 'body',
  'pele': 'skin', 'loira': 'blonde', 'loiro': 'blonde',
  'ruiva': 'redhead', 'bonita': 'beautiful', 'bonito': 'handsome',
  'saia': 'skirt', 'calça': 'pants', 'calca': 'pants',
  'deitada': 'lying down', 'em pé': 'standing',
  'praia': 'beach', 'quarto': 'bedroom', 'cozinha': 'kitchen',
  'noite': 'night', 'pôr do sol': 'sunset', 'iluminação': 'lighting',
  'iluminacao': 'lighting',
  'nua': 'nude', 'nu': 'nude', 'seminua': 'semi-nude',
  'anos': 'years old', 'magra': 'slim', 'gorda': 'chubby',

  // --- Conectores (se eliminan o traducen) ---
  'con': 'with', 'en': 'in', 'de': 'of', 'una': 'a', 'un': 'a',
  'el': 'the', 'la': 'the', 'los': 'the', 'las': 'the',
  'sobre': 'on', 'debajo': 'under', 'junto': 'next to',
  'al': 'at the', 'del': 'of the', 'por': 'by',
  'muy': 'very', 'más': 'more', 'mas': 'more',
  'y': 'and', 'o': 'or', 'pero': 'but', 'sin': 'without',
  'como': 'like', 'estilo': 'style',
};

// Frases multi-palabra (se procesan ANTES que palabras sueltas)
const PHRASE_MAP: [RegExp, string][] = [
  [/mirando a la c[aá]mara/gi, 'looking at camera'],
  [/de espaldas/gi, 'from behind'],
  [/de frente/gi, 'front view'],
  [/de lado/gi, 'side view'],
  [/de perfil/gi, 'profile view'],
  [/de pie/gi, 'standing'],
  [/de rodillas/gi, 'kneeling'],
  [/primer plano/gi, 'close-up'],
  [/plano medio/gi, 'medium shot'],
  [/cuerpo completo/gi, 'full body'],
  [/medio cuerpo/gi, 'half body'],
  [/cuerpo entero/gi, 'full body'],
  [/ropa interior/gi, 'underwear'],
  [/traje de ba[nñ]o/gi, 'swimsuit'],
  [/cabello largo/gi, 'long hair'],
  [/cabello corto/gi, 'short hair'],
  [/pelo largo/gi, 'long hair'],
  [/pelo corto/gi, 'short hair'],
  [/ojos azules/gi, 'blue eyes'],
  [/ojos verdes/gi, 'green eyes'],
  [/ojos marrones/gi, 'brown eyes'],
  [/ojos negros/gi, 'dark eyes'],
  [/piel morena/gi, 'tan skin'],
  [/piel clara/gi, 'fair skin'],
  [/piel oscura/gi, 'dark skin'],
  [/luz natural/gi, 'natural lighting'],
  [/luz suave/gi, 'soft lighting'],
  [/hora dorada/gi, 'golden hour'],
  [/en la/gi, 'in the'],
  [/en el/gi, 'in the'],
  [/en un/gi, 'in a'],
  [/en una/gi, 'in a'],
  [/p[oô]r do sol/gi, 'sunset'],
  [/em p[eé]/gi, 'standing'],
];

function translatePrompt(userPrompt: string): string {
  // Si ya parece estar en inglés (más del 60% palabras inglesas comunes), no traducir
  const englishIndicators = /\b(the|with|in|on|at|woman|man|girl|boy|wearing|sitting|standing|looking|beautiful|sexy|nude|bedroom|beach|lighting|hair|eyes|body|skin)\b/gi;
  const matches = userPrompt.match(englishIndicators);
  const words = userPrompt.split(/\s+/).length;
  if (matches && matches.length / words > 0.3) {
    return userPrompt; // Ya está mayormente en inglés
  }

  let translated = userPrompt;

  // Paso 1: Traducir frases multi-palabra primero
  for (const [regex, replacement] of PHRASE_MAP) {
    translated = translated.replace(regex, replacement);
  }

  // Paso 2: Traducir palabras individuales
  // Usar regex de palabras completas para no romper palabras parciales
  for (const [es, en] of Object.entries(TRANSLATION_MAP)) {
    // Escapar caracteres especiales de regex
    const escaped = es.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
    translated = translated.replace(regex, en);
  }

  // Paso 3: Limpiar artículos duplicados y espacios extra
  translated = translated
    .replace(/\b(the the|a a|in in|of of)\b/gi, (m) => m.split(' ')[0])
    .replace(/\s+/g, ' ')
    .trim();

  return translated;
}

// ═══════════════════════════════════════
// FIX v4 [2]: ENHANCEMENT MÍNIMO Y RELEVANTE
// El prompt del usuario es la PRIORIDAD.
// Solo se agrega calidad base, NO se ahoga con keywords.
// ═══════════════════════════════════════

function enhanceRealisticPrompt(userPrompt: string): string {
  // Traducir primero
  const translated = translatePrompt(userPrompt);

  // Prompt del usuario va PRIMERO (máxima prioridad para SD)
  const parts = [translated];

  // Solo agregar calidad base mínima
  parts.push('masterpiece, best quality, highly detailed, sharp focus');

  // Solo agregar iluminación si el usuario no mencionó nada de luz
  const lower = translated.toLowerCase();
  if (!/(light|shadow|backlit|golden hour|neon|sunset|sunrise|candle|dim|dramatic)/.test(lower)) {
    parts.push('cinematic lighting');
  }

  // Solo agregar foto si no se mencionó cámara
  if (!/(photo|camera|lens|bokeh|dslr|raw|canon|nikon|sony|shot on)/.test(lower)) {
    parts.push('photorealistic');
  }

  return parts.join(', ');
}

function enhanceAnimePrompt(userPrompt: string, style: string): string {
  const translated = translatePrompt(userPrompt);

  const parts = [translated];

  const STYLE_ENHANCERS: Record<string, string> = {
    hentai: 'hentai art style, detailed anime illustration, uncensored, vibrant colors, clean lineart, masterpiece',
    manhwa: 'manhwa art style, webtoon aesthetic, korean comic style, clean lineart, soft cel shading, high quality, uncensored',
    manga: 'dark manga style, high contrast ink, seinen aesthetic, detailed shadows, dramatic lighting, uncensored, masterpiece',
    ecchi: 'ecchi anime style, soft pastel colors, detailed eyes, moe aesthetic, high quality illustration, uncensored',
  };

  parts.push(STYLE_ENHANCERS[style] || STYLE_ENHANCERS['hentai']);

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

  const dailyLimit = DAILY_LIMITS[plan] || 2;

  if (isPremium && profile.plan_expires_at && new Date(profile.plan_expires_at) < new Date()) {
    await supabase.from('profiles').update({ plan: 'free', plan_id: null, updated_at: new Date().toISOString() }).eq('id', user.id);
    return res.status(403).json({ error: 'Tu plan premium ha expirado.', code: 'PLAN_EXPIRED' });
  }

  const today      = new Date().toISOString().slice(0, 10);
  const lastDate   = profile.images_date?.slice(0, 10);
  const usedToday  = lastDate === today ? (profile.images_today || 0) : 0;

  if (usedToday >= dailyLimit) {
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

  if (category === 'anime' && !ANIME_PLANS.has(plan)) {
    return res.status(403).json({ error: 'Anime/Hentai es exclusivo del plan Trimestral o Anual.', code: 'ANIME_PLAN_REQUIRED' });
  }

  // FIX v4 [1]+[2]: Traducción + enhancement mínimo
  const safePrompt = category === 'anime'
    ? enhanceAnimePrompt(prompt.trim().slice(0, 1000), style)
    : enhanceRealisticPrompt(prompt.trim().slice(0, 1000));

  const safeNegative = `${NEGATIVE_BASE}${negative_prompt ? ', ' + String(negative_prompt).slice(0, 500) : ''}`;

  const model = category === 'anime' ? 'lustify-sdxl' : 'venice-sd35';

  // Log para debug (puedes quitar en producción)
  console.log(`[Image API] Original: "${prompt.trim().slice(0, 100)}"`);
  console.log(`[Image API] Enhanced: "${safePrompt.slice(0, 200)}"`);

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
        // FIX v5: cfg_scale 7, steps 30 (Venice max = 30)
        safe_mode: false, hide_watermark: true, steps: 30, cfg_scale: 7, return_binary: false,
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
