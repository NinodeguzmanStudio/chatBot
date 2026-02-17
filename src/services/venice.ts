// ═══════════════════════════════════════
// AIdark — Venice AI Service (+ VISION)
// ═══════════════════════════════════════

import type { Message, ModelId, CharacterId, VeniceContentPart } from '@/types';
import { AI_CHARACTERS } from '@/lib/constants';

// ── Venice API models mapping ──
const VENICE_MODELS: Record<ModelId, string> = {
  venice: 'venice-uncensored',
  'dark-grok': 'venice-uncensored',
  'void-x': 'qwen3-235b',
};

// Modelo de visión para cuando se adjuntan imágenes
const VISION_MODEL = 'qwen-2.5-vl-72b';

// ── Get system prompt for character ──
function getSystemPrompt(character: CharacterId): string {
  const char = AI_CHARACTERS.find((c) => c.id === character);
  return char?.systemPrompt || AI_CHARACTERS[0].systemPrompt;
}

// ══════════════════════════════════════════════════════════════
// Formatear mensajes para la API
// Si hay imagen adjunta → content es un array multimodal
// Si hay PDF adjunto → el texto extraído se agrega al content
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

  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [
        { role: 'system', content: getSystemPrompt(character) },
        ...formatMessages(messages),
      ],
      model: veniceModel,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Error al conectar con AIdark');
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

  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({
      messages: [
        { role: 'system', content: getSystemPrompt(character) },
        ...formatMessages(messages),
      ],
      model: veniceModel,
      stream: true,
    }),
  });

  if (!response.ok) {
    throw new Error('Error al conectar con AIdark');
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
