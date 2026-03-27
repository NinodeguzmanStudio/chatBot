// ═══════════════════════════════════════
// AIdark — Chat Persistence Service v2 (FIXED)
// src/services/chatService.ts
// ═══════════════════════════════════════
// FIXES v2:
//   [1] cleanOldChats solo aplica a usuarios free. Premium conserva 90+ días
//   [2] saveMessage guarda el campo 'character'
//   [3] loadUserSessions limitado a 15 sesiones
//   [4] RETENTION_DAYS incluye TODOS los plan aliases (basic_monthly, pro_quarterly, ultra_annual)
//       Antes faltaban y caían al fallback de 7 días como si fueran free
// ═══════════════════════════════════════

import { supabase } from '@/lib/supabase';
import type { ChatSession, Message, ModelId } from '@/types';

const MAX_MESSAGES_PER_SESSION = 50;
const MAX_SESSIONS_TO_LOAD     = 15;
const MAX_SESSIONS_WITH_MSGS   = 10;

// FIX v2 [4]: TODOS los plan aliases incluidos
const RETENTION_DAYS: Record<string, number> = {
  free:               7,
  // Aliases originales
  premium_monthly:    90,
  premium_quarterly:  90,
  premium_annual:     365,
  // Aliases del pricing (FALTABAN — caían a 7 días)
  basic_monthly:      90,
  pro_quarterly:      90,
  ultra_annual:       365,
};

// ── Load all sessions for a user ──
export async function loadUserSessions(userId: string): Promise<ChatSession[]> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('plan')
    .eq('id', userId)
    .single();

  const plan           = profile?.plan || 'free';
  const retentionDays  = RETENTION_DAYS[plan] ?? 7;
  const cutoffDate     = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();

  const { data: sessions, error } = await supabase
    .from('chat_sessions')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', cutoffDate)
    .order('updated_at', { ascending: false })
    .limit(MAX_SESSIONS_TO_LOAD);

  if (error || !sessions || sessions.length === 0) return [];

  const sessionsForMessages = sessions.slice(0, MAX_SESSIONS_WITH_MSGS);
  const sessionIds = sessionsForMessages.map((s) => s.id);
  
  let allMessages: any[] = [];
  if (sessionIds.length > 0) {
    const { data: msgs } = await supabase
      .from('messages')
      .select('*')
      .in('session_id', sessionIds)
      .order('created_at', { ascending: true });
    allMessages = msgs || [];
  }

  const messagesBySession = new Map<string, any[]>();
  for (const msg of allMessages) {
    const list = messagesBySession.get(msg.session_id) || [];
    list.push(msg);
    messagesBySession.set(msg.session_id, list);
  }

  return sessions.map((s) => {
    const rawMessages = messagesBySession.get(s.id) || [];
    const trimmed = rawMessages.length > MAX_MESSAGES_PER_SESSION
      ? rawMessages.slice(-MAX_MESSAGES_PER_SESSION)
      : rawMessages;

    return {
      id:         s.id,
      title:      s.title || 'Nuevo chat',
      model:      (s.model || 'venice') as ModelId,
      created_at: new Date(s.created_at).getTime(),
      updated_at: new Date(s.updated_at).getTime(),
      messages:   trimmed.map((m: any) => ({
        id:        m.id,
        role:      m.role,
        content:   m.content,
        timestamp: new Date(m.created_at).getTime(),
        model:     m.model,
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
    .insert({ id: sessionId, user_id: userId, title, model });

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
      id:         message.id,
      session_id: sessionId,
      user_id:    userId,
      role:       message.role,
      content:    message.content,
      model:      message.model     || null,
      character:  (message as any).character || null,
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

// ── Clean old chats — llamado en login ──
// FIX [4]: Usa RETENTION_DAYS con TODOS los plan aliases
export async function cleanOldChats(userId: string): Promise<void> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('plan')
    .eq('id', userId)
    .single();

  const plan          = profile?.plan || 'free';
  const retentionDays = RETENTION_DAYS[plan] ?? 7;
  const cutoffDate    = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();

  await supabase
    .from('chat_sessions')
    .delete()
    .eq('user_id', userId)
    .lt('created_at', cutoffDate);
}
