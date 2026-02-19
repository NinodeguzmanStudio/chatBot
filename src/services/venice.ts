// ═══════════════════════════════════════
// AIdark — Venice AI Service (SECURED)
// ═══════════════════════════════════════
// FIX #10: getAuthToken() now checks token expiry and refreshes if stale
// FIX #13: System prompts removed from frontend. Only character ID is sent.
//          The server (api/chat.ts) injects the correct prompt server-side.

import type { Message, ModelId, CharacterId, VeniceContentPart } from '@/types';
import { supabase } from '@/lib/supabase';

// ── Venice API models mapping ──
const VENICE_MODELS: Record<ModelId, string> = {
  venice: 'venice-uncensored',
  'dark-grok': 'venice-uncensored',
  'void-x': 'qwen3-235b',
};

// Modelo de visión para cuando se adjuntan imágenes
const VISION_MODEL = 'qwen-2.5-vl-72b';

// ── FIX #10: Obtener token JWT con verificación de expiración ──
async function getAuthToken(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('No hay sesión activa. Inicia sesión.');
  }

  // Verificar si el token expira en menos de 60 segundos
  if (session.expires_at) {
    const expiresAt = session.expires_at * 1000; // viene en seconds, convertir a ms
    const now = Date.now();
    const bufferMs = 60_000; // 60 segundos de margen

    if (expiresAt - now < bufferMs) {
      // Token a punto de expirar → refrescar
      console.log('[Auth] Token expiring soon, refreshing...');
      const { data: refreshed, error } = await supabase.auth.refreshSession();
      if (error || !refreshed.session) {
        throw new Error('Sesión expirada. Inicia sesión de nuevo.');
      }
      return refreshed.session.access_token;
    }
  }

  return session.access_token;
}

// ══════════════════════════════════════════════════════════════
// Formatear mensajes para la API
// ══════════════════════════════════════════════════════════════
function formatMessages(messages: Message[]): { role: string; content: string | VeniceContentPart[] }[] {
  return messages.map((m) => {
    // Si tiene imagen adjunta → formato multimodal
    if (m.attachment?.type === 'image' && m.attachment.data) {
      const parts: VeniceContentPart[] = [
        {
          type: 'image_url',
          image_url: { url: `data:${m.attachment.mimeType};base64,${m.attachment.data}` },
        },
      ];
      if (m.content.trim()) {
        parts.push({ type: 'text', text: m.content });
      } else {
        parts.push({ type: 'text', text: 'Describe esta imagen en detalle.' });
      }
      return { role: m.role, content: parts };
    }

    // Si tiene PDF adjunto → prepend texto extraído
    if (m.attachment?.type === 'pdf' && m.attachment.data) {
      const pdfContext = `[Contenido del archivo "${m.attachment.name}"]\n${m.attachment.data}\n\n`;
      return { role: m.role, content: pdfContext + m.content };
    }

    // Normal → solo texto
    return { role: m.role, content: m.content };
  });
}

// Detectar si algún mensaje tiene imagen → usar modelo de visión
function needsVisionModel(messages: Message[]): boolean {
  return messages.some((m) => m.attachment?.type === 'image');
}

// ── Send message (non-streaming) ──
export async function sendMessage(
  messages: Message[],
  model: ModelId,
  character: CharacterId = 'default'
): Promise<string> {
  const useVision = needsVisionModel(messages);
  const veniceModel = useVision ? VISION_MODEL : VENICE_MODELS[model];
  const token = await getAuthToken();

  // FIX #13: NO enviar system prompt desde el frontend.
  // Solo enviamos el character ID → el server inyecta el prompt correcto.
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      messages: formatMessages(messages),
      model: veniceModel,
      character,  // ← el server usa esto para inyectar el system prompt
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || error.message || 'Error al conectar con AIdark');
  }

  const data = await response.json();
  const content = data.content || data.choices?.[0]?.message?.content || '';
  return content;
}

// ── Send message (streaming) ──
export async function sendMessageStream(
  messages: Message[],
  model: ModelId,
  character: CharacterId = 'default',
  onChunk: (text: string) => void,
  onDone: () => void,
  signal?: AbortSignal
): Promise<void> {
  const useVision = needsVisionModel(messages);
  const veniceModel = useVision ? VISION_MODEL : VENICE_MODELS[model];
  const token = await getAuthToken();

  // FIX #13: NO enviar system prompt desde el frontend.
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    signal,
    body: JSON.stringify({
      messages: formatMessages(messages),
      model: veniceModel,
      character,  // ← el server usa esto para inyectar el system prompt
      stream: true,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || error.message || 'Error al conectar con AIdark');
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('Streaming no disponible');

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') {
          onDone();
          return;
        }
        try {
          const parsed = JSON.parse(data);
          const text = parsed.choices?.[0]?.delta?.content || '';
          if (text) onChunk(text);
        } catch {
          // Skip malformed chunks
        }
      }
    }
  }

  onDone();
}
