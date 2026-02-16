// ═══════════════════════════════════════
// AIdark — Global Store (PERSISTENCE + i18n)
// ═══════════════════════════════════════

import { create } from 'zustand';
import type { Message, ModelId, CharacterId, ChatSession, UserProfile } from '@/types';
import { APP_CONFIG } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import {
  loadUserSessions, createDbSession, saveMessage,
  updateDbSessionTitle, deleteDbSession, deleteAllDbSessions, cleanOldChats,
} from '@/services/chatService';

// ── Chat Store ──
interface ChatState {
  sessions: ChatSession[];
  activeSessionId: string | null;
  selectedModel: ModelId;
  selectedCharacter: CharacterId;
  isTyping: boolean;
  sidebarOpen: boolean;
  writerMode: boolean;
  sessionsLoaded: boolean;

  setSelectedModel: (model: ModelId) => void;
  setSelectedCharacter: (char: CharacterId) => void;
  setSidebarOpen: (open: boolean) => void;
  setIsTyping: (typing: boolean) => void;
  setWriterMode: (mode: boolean) => void;
  createSession: () => string;
  deleteSession: (id: string) => void;
  setActiveSession: (id: string | null) => void;
  addMessage: (sessionId: string, message: Message) => void;
  clearSessionMessages: (sessionId: string) => void;
  updateSessionTitle: (sessionId: string, title: string) => void;
  renameSession: (id: string, title: string) => void;
  setSessions: (sessions: ChatSession[]) => void;
  loadFromSupabase: (userId: string) => Promise<void>;
  deleteAllSessions: (userId: string) => Promise<void>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  sessions: [],
  activeSessionId: null,
  selectedModel: 'venice',
  selectedCharacter: 'default',
  isTyping: false,
  sidebarOpen: true,
  writerMode: false,
  sessionsLoaded: false,

  setSelectedModel: (model) => set({ selectedModel: model }),
  setSelectedCharacter: (char) => set({ selectedCharacter: char }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setIsTyping: (typing) => set({ isTyping: typing }),
  setWriterMode: (mode) => set({ writerMode: mode }),
  setSessions: (sessions) => set({ sessions }),

  loadFromSupabase: async (userId: string) => {
    try {
      await cleanOldChats(userId);
      const sessions = await loadUserSessions(userId);
      set({ sessions, sessionsLoaded: true });
    } catch (err) {
      console.error('[Store] Failed to load sessions:', err);
      set({ sessionsLoaded: true });
    }
  },

  createSession: () => {
    const id = crypto.randomUUID();
    const session: ChatSession = {
      id,
      title: 'Nuevo chat',
      messages: [],
      model: get().selectedModel,
      created_at: Date.now(),
      updated_at: Date.now(),
    };
    set((state) => ({
      sessions: [session, ...state.sessions],
      activeSessionId: id,
    }));

    // Persist to Supabase (fire and forget)
    const userId = useAuthStore.getState().user?.id;
    if (userId) {
      createDbSession(userId, id, get().selectedModel).catch(console.error);
    }

    return id;
  },

  deleteSession: (id) => {
    set((state) => {
      const filtered = state.sessions.filter((s) => s.id !== id);
      return {
        sessions: filtered,
        activeSessionId:
          state.activeSessionId === id
            ? filtered[0]?.id || null
            : state.activeSessionId,
      };
    });
    deleteDbSession(id).catch(console.error);
  },

  deleteAllSessions: async (userId: string) => {
    set({ sessions: [], activeSessionId: null });
    await deleteAllDbSessions(userId);
  },

  setActiveSession: (id) => set({ activeSessionId: id }),

  addMessage: (sessionId, message) => {
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === sessionId
          ? {
              ...s,
              messages: [...s.messages, message],
              updated_at: Date.now(),
              title:
                s.messages.length === 0 && message.role === 'user'
                  ? message.content.slice(0, 40) + (message.content.length > 40 ? '...' : '')
                  : s.title,
            }
          : s
      ),
    }));

    // Persist message + update title
    const userId = useAuthStore.getState().user?.id;
    if (userId) {
      saveMessage(sessionId, userId, message).catch(console.error);

      // Update title on first user message
      const session = get().sessions.find((s) => s.id === sessionId);
      if (session && session.messages.length === 1 && message.role === 'user') {
        const title = message.content.slice(0, 40) + (message.content.length > 40 ? '...' : '');
        updateDbSessionTitle(sessionId, title).catch(console.error);
      }
    }
  },

  clearSessionMessages: (sessionId) =>
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === sessionId ? { ...s, messages: [], updated_at: Date.now() } : s
      ),
    })),

  updateSessionTitle: (sessionId, title) => {
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === sessionId ? { ...s, title } : s
      ),
    }));
    updateDbSessionTitle(sessionId, title).catch(console.error);
  },

  renameSession: (id, title) => {
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === id ? { ...s, title } : s
      ),
    }));
    updateDbSessionTitle(id, title).catch(console.error);
  },
}));

// ── Auth Store ──
interface AuthState {
  user: UserProfile | null;
  isLoading: boolean;
  isAgeVerified: boolean;
  isAuthenticated: boolean;
  messagesUsed: number;

  setUser: (user: UserProfile | null) => void;
  setLoading: (loading: boolean) => void;
  setAgeVerified: (verified: boolean) => void;
  setAuthenticated: (auth: boolean) => void;
  incrementMessages: () => void;
  canSendMessage: () => boolean;
  getRemainingMessages: () => number;
  resetMessages: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  isAgeVerified: localStorage.getItem('aidark_age_verified') === 'true',
  messagesUsed: Number(localStorage.getItem('aidark_messages_used') || '0'),

  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setLoading: (loading) => set({ isLoading: loading }),
  setAuthenticated: (auth) => set({ isAuthenticated: auth }),

  setAgeVerified: (verified) => {
    localStorage.setItem('aidark_age_verified', String(verified));
    set({ isAgeVerified: verified });
  },

  incrementMessages: () => {
    const next = get().messagesUsed + 1;
    localStorage.setItem('aidark_messages_used', String(next));
    set({ messagesUsed: next });

    const user = get().user;
    if (user) {
      void supabase.rpc('increment_message_count', { p_user_id: user.id });
    }
  },

  canSendMessage: () => {
    if (window.location.search.includes('dev=1')) return true;
    const { user, messagesUsed } = get();
    if (user?.plan && user.plan !== 'free') return true;
    return messagesUsed < APP_CONFIG.freeMessageLimit;
  },

  getRemainingMessages: () => {
    if (window.location.search.includes('dev=1')) return 999;
    const { user, messagesUsed } = get();
    if (user?.plan && user.plan !== 'free') return 999;
    return Math.max(0, APP_CONFIG.freeMessageLimit - messagesUsed);
  },

  resetMessages: () => {
    localStorage.setItem('aidark_messages_used', '0');
    set({ messagesUsed: 0 });
  },
}));
