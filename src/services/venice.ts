// ═══════════════════════════════════════
// AIdark — Venice AI Service v4 (FIXED)
// src/services/venice.ts
// ═══════════════════════════════════════
// CAMBIOS v4:
//   [1] Envía parámetro `lang` al backend para system prompts multilingüe
//       Importa getLang() de i18n.ts para detectar el idioma actual
//   [2] Mantenidos todos los fixes de v3 (streaming, retry, timeout)
// ═══════════════════════════════════════

import type { Message, ModelId, CharacterId, VeniceContentPart } from '@/types';
import { supabase } from '@/lib/supabase';
import { getLang } from '@/lib/i18n'; // FIX [1]: importar idioma actual

const VENICE_MODELS: Record<ModelId, string> = {
  'venice':     'venice-uncensored',
  'dark-grok':  'venice-uncensored',
  'void-x':     'qwen3-235b',
  'llama-fast': 'llama-3.3-70b',
  'llama-pro':  'llama-3.1-405b',
  'mistral':    'mistral-31-24b',
};

const VISION_MODEL = 'qwen-2.5-vl-72b';
const STREAM_TIMEOUT = 45000;
const MAX_RETRIES = 1;

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

// ── Error tipado ──
export class ApiError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.code = code;
    this.name = 'ApiError';
  }
}

async function parseResponseError(response: Response): Promise<never> {
  let errorMsg  = 'Error al conectar con AIdark';
  let errorCode = 'UNKNOWN';

  try {
    const body = await response.json();
    if (body.error) errorMsg  = body.error;
    if (body.code)  errorCode = body.code;
  } catch {
    if (response.status === 403) errorCode = 'FORBIDDEN';
    if (response.status === 429) errorCode = 'RATE_LIMIT';
    if (response.status === 401) errorCode = 'UNAUTHORIZED';
    if (response.status === 503) errorCode = 'ALL_PROVIDERS_DOWN';
  }

  throw new ApiError(errorMsg, errorCode);
}

// ── Mensaje no-stream (fallback) ──
export async function sendMessage(
  messages: Message[],
  model: ModelId,
  character: CharacterId = 'default'
): Promise<string> {
  const veniceModel = needsVisionModel(messages) ? VISION_MODEL : VENICE_MODELS[model] || VENICE_MODELS['venice'];
  const token = await getAuthToken();

  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({
      messages: formatMessages(messages),
      model: veniceModel,
      character,
      lang: getLang(), // FIX [1]: enviar idioma actual
    }),
  });

  if (!response.ok) await parseResponseError(response);

  const data = await response.json();
  return data.content || data.choices?.[0]?.message?.content || '';
}

// ═══════════════════════════════════════
// STREAMING v4: Confiable con retry + lang
// ═══════════════════════════════════════

async function doStream(
  messages: Message[],
  model: ModelId,
  character: CharacterId,
  onChunk: (text: string) => void,
  onDone: () => void,
  signal?: AbortSignal,
): Promise<{ completed: boolean; fullText: string }> {
  const veniceModel = needsVisionModel(messages) ? VISION_MODEL : VENICE_MODELS[model] || VENICE_MODELS['venice'];
  const token = await getAuthToken();

  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), STREAM_TIMEOUT);

  const combinedSignal = signal
    ? anySignal([signal, timeoutController.signal])
    : timeoutController.signal;

  let fullText  = '';
  let completed = false;

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      signal: combinedSignal,
      body: JSON.stringify({
        messages: formatMessages(messages),
        model: veniceModel,
        character,
        stream: true,
        lang: getLang(), // FIX [1]: enviar idioma actual
      }),
    });

    if (!response.ok) await parseResponseError(response);

    const reader = response.body?.getReader();
    if (!reader) throw new Error('Streaming no disponible');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      clearTimeout(timeoutId);

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;

        const data = trimmed.slice(6);
        if (data === '[DONE]') {
          completed = true;
          break;
        }

        try {
          const parsed = JSON.parse(data);
          const text = parsed.choices?.[0]?.delta?.content || '';
          if (text) {
            fullText += text;
            onChunk(text);
          }
        } catch {
          // Chunk JSON malformado — ignorar
        }
      }

      if (completed) break;
    }
  } finally {
    clearTimeout(timeoutId);
  }

  return { completed, fullText };
}

// Helper: combinar AbortSignals
function anySignal(signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();
  for (const s of signals) {
    if (s.aborted) { controller.abort(s.reason); return controller.signal; }
    s.addEventListener('abort', () => controller.abort(s.reason), { once: true });
  }
  return controller.signal;
}

export async function sendMessageStream(
  messages: Message[],
  model: ModelId,
  character: CharacterId = 'default',
  onChunk: (text: string) => void,
  onDone: () => void,
  signal?: AbortSignal
): Promise<void> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (signal?.aborted) throw new Error('AbortError');

      if (attempt > 0) {
        console.warn(`[Venice] Reintentando stream (intento ${attempt + 1})...`);
        await new Promise(r => setTimeout(r, 1000));
      }

      const { completed, fullText } = await doStream(
        messages, model, character, onChunk, onDone, signal
      );

      if (completed) {
        onDone();
        return;
      }

      if (fullText.length > 0) {
        console.warn(`[Venice] Stream terminó sin [DONE] pero tiene ${fullText.length} chars — aceptando`);
        onDone();
        return;
      }

      console.warn(`[Venice] Stream vacío — reintentando...`);
      lastError = new Error('Stream vacío');
      continue;

    } catch (err: any) {
      if (err.name === 'AbortError' || signal?.aborted) {
        throw Object.assign(new Error('Cancelled'), { name: 'AbortError' });
      }

      if (err instanceof ApiError) throw err;

      console.warn(`[Venice] Error en stream (intento ${attempt + 1}):`, err.message);
      lastError = err;
      continue;
    }
  }

  if (lastError instanceof ApiError) throw lastError;
  throw new ApiError(
    'La conexión se interrumpió. Intenta de nuevo.',
    'STREAM_FAILED'
  );
}
