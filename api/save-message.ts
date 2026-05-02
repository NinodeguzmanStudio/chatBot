import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

function titleFrom(content: string): string {
  const text = content.replace(/\s+/g, ' ').trim();
  return text.slice(0, 40) + (text.length > 40 ? '...' : '') || 'Nuevo chat';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'No autorizado.' });

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: 'Sesión inválida.' });

  const { session_id, message } = req.body || {};
  if (!session_id || !message?.id || !message?.role) {
    return res.status(400).json({ error: 'Mensaje inválido.' });
  }

  const content = String(message.content || '').slice(0, 60000);
  const now = new Date().toISOString();

  const { data: chatSession, error: sessionError } = await supabase
    .from('chat_sessions')
    .select('id, user_id, title')
    .eq('id', session_id)
    .maybeSingle();

  if (sessionError) return res.status(500).json({ error: 'Error verificando sesión.' });

  if (chatSession && chatSession.user_id !== user.id) {
    return res.status(403).json({ error: 'Sesión no pertenece al usuario.' });
  }

  if (!chatSession) {
    const initialTitle = message.role === 'user' ? titleFrom(content) : 'Nuevo chat';
    const { error: createError } = await supabase
      .from('chat_sessions')
      .insert({
        id: session_id,
        user_id: user.id,
        title: initialTitle,
        model: message.model || 'venice',
        created_at: now,
        updated_at: now,
      });

    if (createError) return res.status(500).json({ error: 'Error creando sesión.' });
  } else {
    const updatePayload: Record<string, string> = { updated_at: now };
    if (message.role === 'user' && (!chatSession.title || chatSession.title === 'Nuevo chat')) {
      updatePayload.title = titleFrom(content);
    }
    await supabase.from('chat_sessions').update(updatePayload).eq('id', session_id);
  }

  const { error: messageError } = await supabase
    .from('messages')
    .upsert({
      id: message.id,
      session_id,
      user_id: user.id,
      role: message.role,
      content,
      model: message.model || null,
      character: message.character || null,
      created_at: message.timestamp ? new Date(message.timestamp).toISOString() : now,
    }, { onConflict: 'id' });

  if (messageError) return res.status(500).json({ error: 'Error guardando mensaje.' });

  return res.status(200).json({ success: true });
}
