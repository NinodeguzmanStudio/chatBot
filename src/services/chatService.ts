// ═══════════════════════════════════════
// AIdark — Chat Persistence Service
// ═══════════════════════════════════════
// Save/load chats from Supabase
// Auto-delete chats older than 7 days
//
// FIX: Replaced N+1 queries (1 per session) with a single bulk query
// FIX: Limit to 50 messages per session to prevent memory bloat

import { supabase } from '@/lib/supabase';
import type { ChatSession, Message, ModelId } from '@/types';

const MAX_MESSAGES_PER_SESSION = 50;

// ── Load all sessions for a user (< 7 days old) ──
// ANTES: 1 query por sesión (N+1). Con 20 chats = 21 requests HTTP.
// AHORA: 2 queries totales siempre (sessions + ALL messages in one shot).
export async function loadUserSessions(userId: string): Promise<ChatSession[]> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // Query 1: todas las sesiones
  const { data: sessions, error } = await supabase
    .from('chat_sessions')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', sevenDaysAgo)
    .order('updated_at', { ascending: false });

  if (error || !sessions || sessions.length === 0) return [];

  // Query 2: TODOS los mensajes de TODAS las sesiones en UNA sola query
  const sessionIds = sessions.map((s) => s.id);
  const { data: allMessages } = await supabase
    .from('messages')
    .select('*')
    .in('session_id', sessionIds)
    .order('created_at', { ascending: true });

  // Agrupar mensajes por session_id en un Map
  const messagesBySession = new Map<string, any[]>();
  for (const msg of allMessages || []) {
    const list = messagesBySession.get(msg.session_id) || [];
    list.push(msg);
    messagesBySession.set(msg.session_id, list);
  }

  // Armar sesiones con sus mensajes (limitados a MAX_MESSAGES_PER_SESSION)
  return sessions.map((s) => {
    const rawMessages = messagesBySession.get(s.id) || [];
    // Si hay más de 50, tomar solo los últimos 50
    const trimmed = rawMessages.length > MAX_MESSAGES_PER_SESSION
      ? rawMessages.slice(-MAX_MESSAGES_PER_SESSION)
      : rawMessages;

    return {
      id: s.id,
      title: s.title || 'Nuevo chat',
      model: (s.model || 'venice') as ModelId,
      created_at: new Date(s.created_at).getTime(),
      updated_at: new Date(s.updated_at).getTime(),
      messages: trimmed.map((m: any) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: new Date(m.created_at).getTime(),
        model: m.model,
        character: m.character,
      })),
    };
  });
}

// ── Create a new session in DB ──
export async function createDbSession(
  userId: string,
  sessionId: string,
  model: string,
  title: string = 'Nuevo chat'
): Promise<boolean> {
  const { error } = await supabase
    .from('chat_sessions')
    .insert({
      id: sessionId,
      user_id: userId,
      title,
      model,
    });

  return !error;
}

// ── Save a message to DB ──
export async function saveMessage(
  sessionId: string,
  userId: string,
  message: Message
): Promise<boolean> {
  const { error } = await supabase
    .from('messages')
    .insert({
      id: message.id,
      session_id: sessionId,
      user_id: userId,
      role: message.role,
      content: message.content,
      model: message.model || null,
    });

  return !error;
}

// ── Update session title ──
export async function updateDbSessionTitle(
  sessionId: string,
  title: string
): Promise<boolean> {
  const { error } = await supabase
    .from('chat_sessions')
    .update({ title, updated_at: new Date().toISOString() })
    .eq('id', sessionId);

  return !error;
}

// ── Delete a session from DB ──
export async function deleteDbSession(sessionId: string): Promise<boolean> {
  const { error } = await supabase
    .from('chat_sessions')
    .delete()
    .eq('id', sessionId);

  return !error;
}

// ── Delete all sessions for a user ──
export async function deleteAllDbSessions(userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('chat_sessions')
    .delete()
    .eq('user_id', userId);

  return !error;
}

// ── Clean old chats (> 7 days) — called on login ──
export async function cleanOldChats(userId: string): Promise<void> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  await supabase
    .from('chat_sessions')
    .delete()
    .eq('user_id', userId)
    .lt('created_at', sevenDaysAgo);
}
