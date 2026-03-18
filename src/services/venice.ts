// ═══════════════════════════════════════
// AIdark — Venice AI Service
// src/services/venice.ts
// FIX: errores 403 ahora incluyen el código de error para que
//      mobile pueda identificar FREE_LIMIT_REACHED correctamente
// ═══════════════════════════════════════

import type { Message, ModelId, CharacterId, VeniceContentPart } from '@/types';
import { supabase } from '@/lib/supabase';

const VENICE_MODELS: Record<ModelId, string> = {
  venice:     'venice-uncensored',
  'dark-grok': 'venice-uncensored',
  'void-x':   'qwen3-235b',
};

const VISION_MODEL = 'qwen-2.5-vl-72b';

async function getAuthToken(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('No hay sesión activa. Inicia sesión.');

  if (session.expires_at) {
    const expiresAt = session.expires_at * 1000;
    if (expiresAt - Date.now() < 60_000) {
      const { data: refreshed, error } = await supabase.auth.refreshSession();
      if (error || !refreshed.session) throw new Error('Sesión expirada. Inicia sesión de nuevo.');
      return refreshed.session.access_token;
    }
  }
  return session.access_token;
}

function formatMessages(messages: Message[]): { role: string; content: string | VeniceContentPart[] }[] {
  return messages.map((m) => {
    if (m.attachment?.type === 'image' && m.attachment.data) {
      const parts: VeniceContentPart[] = [
        { type: 'image_url', image_url: { url: `data:${m.attachment.mimeType};base64,${m.attachment.data}` } },
      ];
      parts.push({ type: 'text', text: m.content.trim() || 'Describe esta imagen en detalle.' });
      return { role: m.role, content: parts };
    }
    if (m.attachment?.type === 'pdf' && m.attachment.data) {
      return { role: m.role, content: `[Contenido del archivo "${m.attachment.name}"]\n${m.attachment.data}\n\n${m.content}` };
    }
    return { role: m.role, content: m.content };
  });
}

function needsVisionModel(messages: Message[]): boolean {
  return messages.some((m) => m.attachment?.type === 'image');
}

// ── Error tipado para poder identificar el código en el catch ──
export class ApiError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.code = code;
    this.name = 'ApiError';
  }
}

// ── Parsear error de respuesta HTTP ──
async function parseResponseError(response: Response): Promise<never> {
  let errorMsg  = 'Error al conectar con AIdark';
  let errorCode = 'UNKNOWN';

  try {
    const body = await response.json();
    if (body.error)  errorMsg  = body.error;
    if (body.code)   errorCode = body.code;
  } catch {
    // Si json() falla, usar status para determinar el código
    if (response.status === 403) errorCode = 'FORBIDDEN';
    if (response.status === 429) errorCode = 'RATE_LIMIT';
    if (response.status === 401) errorCode = 'UNAUTHORIZED';
  }

  throw new ApiError(errorMsg, errorCode);
}

export async function sendMessage(
  messages: Message[],
  model: ModelId,
  character: CharacterId = 'default'
): Promise<string> {
  const veniceModel = needsVisionModel(messages) ? VISION_MODEL : VENICE_MODELS[model];
  const token = await getAuthToken();

  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ messages: formatMessages(messages), model: veniceModel, character }),
  });

  if (!response.ok) await parseResponseError(response);

  const data = await response.json();
  return data.content || data.choices?.[0]?.message?.content || '';
}

export async function sendMessageStream(
  messages: Message[],
  model: ModelId,
  character: CharacterId = 'default',
  onChunk: (text: string) => void,
  onDone: () => void,
  signal?: AbortSignal
): Promise<void> {
  const veniceModel = needsVisionModel(messages) ? VISION_MODEL : VENICE_MODELS[model];
  const token = await getAuthToken();

  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    signal,
    body: JSON.stringify({ messages: formatMessages(messages), model: veniceModel, character, stream: true }),
  });

  if (!response.ok) await parseResponseError(response);

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
        if (data === '[DONE]') { onDone(); return; }
        try {
          const parsed = JSON.parse(data);
          const text = parsed.choices?.[0]?.delta?.content || '';
          if (text) onChunk(text);
        } catch { /* chunk malformado, ignorar */ }
      }
    }
  }
  onDone();
}
