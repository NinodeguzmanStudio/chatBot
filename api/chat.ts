// ═══════════════════════════════════════
// AIdark — Chat API Proxy (RATE LIMITED)
// ═══════════════════════════════════════

import type { VercelRequest, VercelResponse } from '@vercel/node';

const rateMap = new Map<string, { count: number; reset: number }>();
const RATE_LIMIT = 30;
const RATE_WINDOW = 60 * 1000;

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const entry = rateMap.get(key);
  if (!entry || now > entry.reset) {
    rateMap.set(key, { count: 1, reset: now + RATE_WINDOW });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.VENICE_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || 'unknown';
  if (isRateLimited(ip)) {
    return res.status(429).json({ error: 'Too many requests. Wait a moment.' });
  }

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
 
