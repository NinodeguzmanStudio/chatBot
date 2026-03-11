// ═══════════════════════════════════════
// AIdark — Image Generation API (Venice)
// POST /api/image
// ═══════════════════════════════════════

import type { VercelRequest, VercelResponse } from '@vercel/node';

const VENICE_API_KEY = process.env.VENICE_API_KEY || '';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!VENICE_API_KEY) {
    return res.status(500).json({ error: 'API key no configurada' });
  }

  const {
    prompt,
    negative_prompt,
    model = 'fluently-xl',
    style_preset = 'Photographic',
    width = 1024,
    height = 1024,
    safe_mode = false,
    hide_watermark = true,
    steps = 20,
    cfg_scale = 7,
  } = req.body;

  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    return res.status(400).json({ error: 'El prompt es requerido' });
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
        prompt: prompt.trim(),
        ...(negative_prompt ? { negative_prompt } : {}),
        style_preset,
        width,
        height,
        safe_mode,
        hide_watermark,
        steps,
        cfg_scale,
        return_binary: false,
      }),
    });

    if (!veniceRes.ok) {
      const errText = await veniceRes.text().catch(() => '');
      console.error('[Image API] Venice error:', veniceRes.status, errText);
      return res.status(veniceRes.status).json({
        error: veniceRes.status === 402
          ? 'Sin créditos de imagen. Actualiza tu plan de Venice.'
          : veniceRes.status === 422
          ? 'Prompt inválido o modelo no disponible'
          : `Error de Venice: ${veniceRes.status}`,
      });
    }

    const data = await veniceRes.json();

    return res.status(200).json({
      images: data.images || [],
      timing: data.timing || {},
    });
  } catch (err: any) {
    console.error('[Image API] Unexpected error:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
