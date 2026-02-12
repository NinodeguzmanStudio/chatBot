// ═══════════════════════════════════════
// AIdark — Global Store (Zustand)
// ═══════════════════════════════════════

import { create } from 'zustand';
import type { Message, ModelId, ChatSession, UserProfile } from '@/types';
import { APP_CONFIG } from '@/lib/constants';

// ── Chat Store ──
interface ChatState {
  sessions: ChatSession[];
  activeSessionId: string | null;
  selectedModel: ModelId;
  isTyping: boolean;
  sidebarOpen: boolean;

  // Actions
  setSelectedModel: (model: ModelId) => void;
  setSidebarOpen: (open: boolean) => void;
  setIsTyping: (typing: boolean) => void;
  createSession: () => string;
  deleteSession: (id: string) => void;
  setActiveSession: (id: string | null) => void;
  addMessage: (sessionId: string, message: Message) => void;
  clearSessionMessages: (sessionId: string) => void;
  updateSessionTitle: (sessionId: string, title: string) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  sessions: [],
  activeSessionId: null,
  selectedModel: 'venice',
  isTyping: false,
  sidebarOpen: true,

  setSelectedModel: (model) => set({ selectedModel: model }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setIsTyping: (typing) => set({ isTyping: typing }),

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
    return id;
  },

  deleteSession: (id) =>
    set((state) => {
      const filtered = state.sessions.filter((s) => s.id !== id);
      return {
        sessions: filtered,
        activeSessionId:
          state.activeSessionId === id
            ? filtered[0]?.id || null
            : state.activeSessionId,
      };
    }),

  setActiveSession: (id) => set({ activeSessionId: id }),

  addMessage: (sessionId, message) =>
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === sessionId
          ? {
              ...s,
              messages: [...s.messages, message],
              updated_at: Date.now(),
              // Auto-title from first user message
              title:
                s.messages.length === 0 && message.role === 'user'
                  ? message.content.slice(0, 40) + (message.content.length > 40 ? '...' : '')
                  : s.title,
            }
          : s
      ),
    })),

  clearSessionMessages: (sessionId) =>
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === sessionId ? { ...s, messages: [], updated_at: Date.now() } : s
      ),
    })),

  updateSessionTitle: (sessionId, title) =>
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === sessionId ? { ...s, title } : s
      ),
    })),
}));

// ── Auth Store ──
interface AuthState {
  user: UserProfile | null;
  isLoading: boolean;
  isAgeVerified: boolean;
  messagesUsed: number;

  setUser: (user: UserProfile | null) => void;
  setLoading: (loading: boolean) => void;
  setAgeVerified: (verified: boolean) => void;
  incrementMessages: () => void;
  canSendMessage: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  isAgeVerified: localStorage.getItem('aidark_age_verified') === 'true',
  messagesUsed: Number(localStorage.getItem('aidark_messages_used') || '0'),

  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ isLoading: loading }),

  setAgeVerified: (verified) => {
    localStorage.setItem('aidark_age_verified', String(verified));
    set({ isAgeVerified: verified });
  },

  incrementMessages: () => {
    const next = get().messagesUsed + 1;
    localStorage.setItem('aidark_messages_used', String(next));
    set({ messagesUsed: next });
  },

  canSendMessage: () => {
    const { user, messagesUsed } = get();
    // Premium users: unlimited
    if (user?.plan && user.plan !== 'free') return true;
    // Free users: limited
    return messagesUsed < APP_CONFIG.freeMessageLimit;
  },
}));
