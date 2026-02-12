export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const apiKey = process.env.VENICE_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'Venice API key not configured' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body = await req.json();
    const { messages, model, stream } = body;

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: 'Messages array required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const veniceResponse = await fetch('https://api.venice.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model || 'llama-3.3-70b',
        messages,
        stream: stream || false,
        temperature: 0.9,
        max_tokens: 4096,
        venice_parameters: {
          include_venice_system_prompt: false,
          enable_web_search: "off",
          character_slug: "uncensored",
        },
      }),
    });

    if (!veniceResponse.ok) {
      const errorData = await veniceResponse.text();
      console.error('[AIdark API] Venice error:', errorData);
      return new Response(
        JSON.stringify({ error: 'Error al procesar', details: errorData }),
        { status: veniceResponse.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (stream) {
      return new Response(veniceResponse.body, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    const data = await veniceResponse.json();
    const content = data.choices?.[0]?.message?.content || 'Sin respuesta';

    return new Response(
      JSON.stringify({ content, usage: data.usage }),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[AIdark API] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Error interno' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}