// ═══════════════════════════════════════
// AIdark — Venice API Proxy (FIXED + STREAMING)
// ═══════════════════════════════════════

export default async function handler(req: any, res: any) {
  // CORS
  const allowedOrigin = process.env.VITE_APP_URL || '*';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.VENICE_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

  try {
    const { messages, model, stream } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages required' });
    }

    // Validate message count (basic rate limiting)
    if (messages.length > 100) {
      return res.status(400).json({ error: 'Too many messages in context' });
    }

    const venicePayload = {
      model: model || 'venice-uncensored',
      messages: messages,
      max_tokens: 4096,
      temperature: 0.85,
      stream: !!stream,
      venice_parameters: {
        include_venice_system_prompt: false,
        enable_web_search: 'off',
      },
    };

    const response = await fetch('https://api.venice.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(venicePayload),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[Venice API Error]', response.status, errText);
      return res.status(response.status).json({
        error: `Venice API error: ${response.status}`,
        detail: errText,
      });
    }

    // ── Streaming mode ──
    if (stream && response.body) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      // @ts-ignore - Node.js ReadableStream from fetch
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          res.write(chunk);
        }
      } catch (streamError) {
        console.error('[Stream Error]', streamError);
      } finally {
        res.end();
      }
      return;
    }

    // ── Non-streaming mode ──
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    return res.status(200).json({
      content,
      usage: data.usage,
    });

  } catch (error: any) {
    console.error('[Proxy Error]', error);
    return res.status(500).json({ error: 'Internal server error', detail: error.message });
  }
}
