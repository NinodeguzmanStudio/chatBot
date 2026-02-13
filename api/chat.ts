// ═══════════════════════════════════════
// AIdark — Venice API Proxy v4
// ═══════════════════════════════════════

export default async function handler(req: any, res: any) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.VENICE_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

  try {
    const { messages, model } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages required' });
    }

    const response = await fetch('https://api.venice.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model || 'venice-uncensored',
        messages: messages,
        max_tokens: 2048,
        temperature: 0.85,
        venice_parameters: {
          include_venice_system_prompt: false,
          enable_web_search: 'off',
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[Venice API Error]', response.status, errText);
      return res.status(response.status).json({
        error: `Venice API error: ${response.status}`,
        detail: errText,
      });
    }

    const data = await response.json();
    return res.status(200).json(data);

  } catch (error: any) {
    console.error('[Proxy Error]', error);
    return res.status(500).json({ error: 'Internal server error', detail: error.message });
  }
}
