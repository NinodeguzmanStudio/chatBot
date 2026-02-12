export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.VENICE_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Venice API key not configured' });
  }

  try {
    const { messages, model } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages required' });
    }

    const veniceResponse = await fetch('https://api.venice.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model || 'venice-uncensored',
        messages,
        temperature: 0.9,
        max_tokens: 4096,
        venice_parameters: {
          include_venice_system_prompt: false,
        },
      }),
    });

    if (!veniceResponse.ok) {
      const errorData = await veniceResponse.text();
      return res.status(veniceResponse.status).json({ error: errorData });
    }

    const data = await veniceResponse.json();
    const content = data.choices?.[0]?.message?.content || 'Sin respuesta';

    return res.status(200).json({ content, usage: data.usage });
  } catch (error) {
    console.error('[AIdark]', error);
    return res.status(500).json({ error: 'Error interno' });
  }
}
