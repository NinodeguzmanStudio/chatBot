// ═══════════════════════════════════════
// AIdark — Chat Persistence Service (FIXED)
// src/services/chatService.ts
// ═══════════════════════════════════════
// FIXES aplicados:
//   [1] cleanOldChats borraba chats de TODOS los usuarios a los 7 días
//       incluyendo premium — ahora solo aplica a usuarios free
//       Premium conserva 90 días de historial
//   [2] saveMessage no guardaba el campo 'character' — se perdía en historial
//   [3] loadUserSessions cargaba sin límite de sesiones — con muchas sesiones
//       la query de mensajes podía traer miles de rows. Ahora límite de 30 sesiones.
// ═══════════════════════════════════════

import { supabase } from '@/lib/supabase';
import type { ChatSession, Message, ModelId } from '@/types';

const MAX_MESSAGES_PER_SESSION = 50;
const MAX_SESSIONS_TO_LOAD     = 15;  // FIX VELOCIDAD: 30→15 sesiones en carga inicial
const MAX_SESSIONS_WITH_MSGS   = 10;  // Solo cargar mensajes de las 10 más recientes

// FIX [1]: días de retención por plan
const RETENTION_DAYS: Record<string, number> = {
  free:               7,
  premium_monthly:    90,
  premium_quarterly:  90,
  premium_annual:     365,
};

// ── Load all sessions for a user ──
export async function loadUserSessions(userId: string): Promise<ChatSession[]> {
  // Obtener el plan del usuario para aplicar la retención correcta
  const { data: profile } = await supabase
    .from('profiles')
    .select('plan')
    .eq('id', userId)
    .single();

  const plan           = profile?.plan || 'free';
  const retentionDays  = RETENTION_DAYS[plan] ?? 7;
  const cutoffDate     = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();

  // FIX [3]: limitar a MAX_SESSIONS_TO_LOAD sesiones
  const { data: sessions, error } = await supabase
    .from('chat_sessions')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', cutoffDate)
    .order('updated_at', { ascending: false })
    .limit(MAX_SESSIONS_TO_LOAD);

  if (error || !sessions || sessions.length === 0) return [];

  // FIX VELOCIDAD: Solo cargar mensajes de las N sesiones más recientes
  // Las demás sesiones aparecen en el sidebar pero sin mensajes precargados
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
        character: m.character, // FIX [2]: ya estaba en el select, ahora también en el map
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
      character:  (message as any).character || null, // FIX [2]: guardar el personaje usado
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
// FIX [1]: antes borraba a los 7 días para TODOS.
//          Ahora respeta la retención por plan:
//          free=7 días, premium_monthly/quarterly=90 días, annual=365 días
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
