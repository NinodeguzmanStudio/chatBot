// ═══════════════════════════════════════
// AIdark — Venice AI Service (FIXED)
// ═══════════════════════════════════════

import type { Message, ModelId, CharacterId } from '@/types';
import { AI_CHARACTERS } from '@/lib/constants';

// ── Venice API models mapping ──
const VENICE_MODELS: Record<ModelId, string> = {
  venice: 'venice-uncensored',
  'dark-grok': 'venice-uncensored',
  'void-x': 'qwen3-235b',
};

// ── Get system prompt for character ──
function getSystemPrompt(character: CharacterId): string {
  const char = AI_CHARACTERS.find((c) => c.id === character);
  return char?.systemPrompt || AI_CHARACTERS[0].systemPrompt;
}

// ── Send message (non-streaming) ──
export async function sendMessage(
  messages: Message[],
  model: ModelId,
  character: CharacterId = 'default'
): Promise<string> {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [
        { role: 'system', content: getSystemPrompt(character) },
        ...messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      ],
      model: VENICE_MODELS[model],
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Error al conectar con AIdark');
  }

  const data = await response.json();
  // Handle Venice API response format
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
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({
      messages: [
        { role: 'system', content: getSystemPrompt(character) },
        ...messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      ],
      model: VENICE_MODELS[model],
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
