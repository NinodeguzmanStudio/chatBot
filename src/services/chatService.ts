// ═══════════════════════════════════════
// AIdark — Chat Persistence Service
// ═══════════════════════════════════════
// Save/load chats from Supabase
// Auto-delete chats older than 7 days

import { supabase } from '@/lib/supabase';
import type { ChatSession, Message, ModelId } from '@/types';

// ── Load all sessions for a user (< 7 days old) ──
export async function loadUserSessions(userId: string): Promise<ChatSession[]> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: sessions, error } = await supabase
    .from('chat_sessions')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', sevenDaysAgo)
    .order('updated_at', { ascending: false });

  if (error || !sessions) return [];

  // Load messages for each session
  const fullSessions: ChatSession[] = [];

  for (const s of sessions) {
    const { data: messages } = await supabase
      .from('messages')
      .select('*')
      .eq('session_id', s.id)
      .order('created_at', { ascending: true });

    fullSessions.push({
      id: s.id,
      title: s.title || 'Nuevo chat',
      model: (s.model || 'venice') as ModelId,
      created_at: new Date(s.created_at).getTime(),
      updated_at: new Date(s.updated_at).getTime(),
      messages: (messages || []).map((m: any) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: new Date(m.created_at).getTime(),
        model: m.model,
        character: m.character,
      })),
    });
  }

  return fullSessions;
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
