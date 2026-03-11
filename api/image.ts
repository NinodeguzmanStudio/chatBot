import type { VercelRequest, VercelResponse } from '@vercel/node';

const VENICE_API_KEY = process.env.VENICE_API_KEY || '';

const SAFETY_POSITIVE = 'all characters are adults aged 25 or older, mature adults only';
const SAFETY_NEGATIVE = 'minor, child, teen, teenager, young, underage, loli, shota, juvenile, kid, infant, baby, school uniform, diaper';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!VENICE_API_KEY) return res.status(500).json({ error: 'API key no configurada' });

  const { prompt, negative_prompt = '', model = 'qwen-image', style_preset = 'Photographic', width = 1024, height = 1024, hide_watermark = true, steps = 20, cfg_scale = 7 } = req.body;

  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    return res.status(400).json({ error: 'El prompt es requerido' });
  }

  const safePrompt = `${prompt.trim().slice(0, 500)}, ${SAFETY_POSITIVE}`;
  const safeNegative = `${SAFETY_NEGATIVE}${negative_prompt ? ', ' + negative_prompt : ''}`;

  try {
    const veniceRes = await fetch('https://api.venice.ai/api/v1/image/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${VENICE_API_KEY}` },
      body: JSON.stringify({ model, prompt: safePrompt, negative_prompt: safeNegative, style_preset, width, height, safe_mode: false, hide_watermark, steps, cfg_scale, return_binary: false }),
    });

    if (!veniceRes.ok) {
      const errText = await veniceRes.text().catch(() => '');
      console.error('[Image API] Error:', veniceRes.status, errText);
      return res.status(veniceRes.status).json({
        error: veniceRes.status === 402 ? 'Sin créditos disponibles.'
          : veniceRes.status === 422 ? 'Prompt inválido o modelo no disponible'
          : veniceRes.status === 500 ? 'El modelo está ocupado, intentá de nuevo'
          : `Error al generar imagen (${veniceRes.status})`,
      });
    }

    const data = await veniceRes.json();
    return res.status(200).json({ images: data.images || [], timing: data.timing || {} });

  } catch (err: any) {
    console.error('[Image API] Unexpected error:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
