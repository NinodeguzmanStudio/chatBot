// ═══════════════════════════════════════
// AIdark — Chat API Proxy (SERVER-SIDE VALIDATION)
// ═══════════════════════════════════════
// CAMBIOS:
// - Validación de JWT del usuario
// - Límite de mensajes verificado en DB (no localStorage)
// - Rate limiting usando Supabase (funciona en serverless)
// - Incremento de messages_used en server

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// ── Supabase server client (service role para validar perfiles) ──
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Supabase anon client para verificar JWT del usuario
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY!;

const FREE_LIMIT = Number(process.env.VITE_FREE_MESSAGE_LIMIT) || 5;
const RATE_LIMIT_WINDOW = 60;   // segundos
const RATE_LIMIT_MAX = 15;      // máx mensajes por ventana

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.VENICE_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

  // ════════════════════════════════════════════════════════
  // 1. VERIFICAR AUTENTICACIÓN
  // ════════════════════════════════════════════════════════
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No autorizado. Inicia sesión.' });
  }

  const token = authHeader.replace('Bearer ', '');

  // Verificar JWT con Supabase
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return res.status(401).json({ error: 'Sesión inválida. Inicia sesión de nuevo.' });
  }

  // ════════════════════════════════════════════════════════
  // 2. VERIFICAR PERFIL Y PLAN
  // ════════════════════════════════════════════════════════
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('plan, messages_used, messages_limit, plan_expires_at')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return res.status(403).json({ error: 'Perfil no encontrado.' });
  }

  const isPremium = profile.plan !== 'free';

  // Si es premium, verificar que no haya expirado
  if (isPremium && profile.plan_expires_at) {
    const expiresAt = new Date(profile.plan_expires_at);
    if (expiresAt < new Date()) {
      // Plan expirado → downgrade a free
      await supabase
        .from('profiles')
        .update({ plan: 'free', plan_id: null })
        .eq('id', user.id);
      // Continuar como free
      return res.status(403).json({ 
        error: 'Tu plan premium ha expirado. Renueva para seguir sin límites.',
        code: 'PLAN_EXPIRED'
      });
    }
  }

  // ════════════════════════════════════════════════════════
  // 3. VERIFICAR LÍMITE DE MENSAJES (solo free)
  // ════════════════════════════════════════════════════════
  if (!isPremium) {
    if (profile.messages_used >= FREE_LIMIT) {
      return res.status(403).json({ 
        error: 'Has alcanzado el límite de mensajes gratuitos. Actualiza tu plan.',
        code: 'FREE_LIMIT_REACHED'
      });
    }
  }

  // ════════════════════════════════════════════════════════
  // 4. RATE LIMITING (usando Supabase, funciona en serverless)
  // ════════════════════════════════════════════════════════
  const { data: rateLimitOk } = await supabase
    .rpc('check_rate_limit', { 
      p_user_id: user.id, 
      p_window_seconds: RATE_LIMIT_WINDOW, 
      p_max_messages: RATE_LIMIT_MAX 
    });

  if (rateLimitOk === false) {
    return res.status(429).json({ error: 'Demasiados mensajes. Espera un momento.' });
  }

  // ════════════════════════════════════════════════════════
  // 5. INCREMENTAR CONTADOR (antes de enviar a Venice)
  // ════════════════════════════════════════════════════════
  await supabase.rpc('increment_message_count', { p_user_id: user.id });

  // ════════════════════════════════════════════════════════
  // 6. PROXY A VENICE AI
  // ════════════════════════════════════════════════════════
  const { messages, model, stream } = req.body;

  try {
    const veniceRes = await fetch('https://api.venice.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: model || 'llama-3.3-70b',
        messages: messages || [],
        max_tokens: 4096,
        stream: !!stream,
      }),
    });

    if (!veniceRes.ok) {
      const err = await veniceRes.text();
      return res.status(veniceRes.status).json({ error: err });
    }

    if (stream && veniceRes.body) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const reader = veniceRes.body as any;
      if (typeof reader[Symbol.asyncIterator] === 'function') {
        for await (const chunk of reader) {
          res.write(chunk);
        }
      } else if (reader.getReader) {
        const r = reader.getReader();
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await r.read();
          if (done) break;
          res.write(decoder.decode(value, { stream: true }));
        }
      }
      res.end();
    } else {
      const data = await veniceRes.json();
      res.status(200).json(data);
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Internal error' });
  }
}
