// ═══════════════════════════════════════
// AIdark — Global Store v2
// src/lib/store.ts
// FIXES v2:
//   [1] isPremiumPlan helper para check robusto
//   [2] canSendMessage usa helper en vez de plan !== 'free'
// ═══════════════════════════════════════

import { create } from 'zustand';
import type { Message, ModelId, CharacterId, ChatSession, UserProfile } from '@/types';
import { isPremiumPlan } from '@/types';
import {
  getDeviceMessagesUsed, incrementDeviceMessages,
  wasBonusGiven, giveBonusMessages, getBonusMessagesUsed, incrementBonusMessages,
  _resetMessagesInternal,
} from '@/lib/fingerprint';
import {
  loadUserSessions, createDbSession, saveMessage,
  updateDbSessionTitle, deleteDbSession, deleteAllDbSessions, cleanOldChats,
} from '@/services/chatService';

const FREE_LIMIT = 12;

interface ChatState {
  sessions: ChatSession[];
  activeSessionId: string | null;
  selectedModel: ModelId;
  selectedCharacter: CharacterId;
  isTyping: boolean;
  sidebarOpen: boolean;
  writerMode: boolean;
  sessionsLoaded: boolean;
  customInstructions: string;

  setSelectedModel: (model: ModelId) => void;
  setSelectedCharacter: (char: CharacterId) => void;
  setSidebarOpen: (open: boolean) => void;
  setIsTyping: (typing: boolean) => void;
  setWriterMode: (mode: boolean) => void;
  setCustomInstructions: (instructions: string) => void;
  createSession: () => string;
  deleteSession: (id: string) => void;
  setActiveSession: (id: string | null) => void;
  addMessage: (sessionId: string, message: Message) => void;
  clearSessionMessages: (sessionId: string) => void;
  trimMessages: (sessionId: string, fromIndex: number) => void;
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
  customInstructions: localStorage.getItem('aidark_custom_instructions') || '',

  setSelectedModel:     (model)    => set({ selectedModel: model }),
  setSelectedCharacter: (char)     => set({ selectedCharacter: char }),
  setSidebarOpen:       (open)     => set({ sidebarOpen: open }),
  setIsTyping:          (typing)   => set({ isTyping: typing }),
  setWriterMode:        (mode)     => set({ writerMode: mode }),
  setSessions:          (sessions) => set({ sessions }),

  setCustomInstructions: (instructions) => {
    localStorage.setItem('aidark_custom_instructions', instructions);
    set({ customInstructions: instructions });
  },

  loadFromSupabase: async (userId: string) => {
    try {
      // FIX VELOCIDAD: cleanOldChats en background, no bloquea la carga
      cleanOldChats(userId).catch(() => {});
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
      id, title: 'Nuevo chat', messages: [],
      model: get().selectedModel, created_at: Date.now(), updated_at: Date.now(),
    };
    set((state) => ({ sessions: [session, ...state.sessions], activeSessionId: id }));
    const userId = useAuthStore.getState().user?.id;
    if (userId) createDbSession(userId, id, get().selectedModel).catch(console.error);
    return id;
  },

  deleteSession: (id) => {
    set((state) => {
      const filtered = state.sessions.filter((s) => s.id !== id);
      return {
        sessions: filtered,
        activeSessionId: state.activeSessionId === id ? filtered[0]?.id || null : state.activeSessionId,
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
              ...s, messages: [...s.messages, message], updated_at: Date.now(),
              title: s.messages.length === 0 && message.role === 'user'
                ? message.content.slice(0, 40) + (message.content.length > 40 ? '...' : '')
                : s.title,
            }
          : s
      ),
    }));
    const userId = useAuthStore.getState().user?.id;
    if (userId) {
      saveMessage(sessionId, userId, message).catch(console.error);
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

  trimMessages: (sessionId: string, fromIndex: number) =>
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === sessionId
          ? { ...s, messages: s.messages.slice(0, fromIndex), updated_at: Date.now() }
          : s
      ),
    })),

  updateSessionTitle: (sessionId, title) => {
    set((state) => ({
      sessions: state.sessions.map((s) => s.id === sessionId ? { ...s, title } : s),
    }));
    updateDbSessionTitle(sessionId, title).catch(console.error);
  },

  renameSession: (id, title) => {
    set((state) => ({
      sessions: state.sessions.map((s) => s.id === id ? { ...s, title } : s),
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
  setUser: (user: UserProfile | null) => void;
  setLoading: (loading: boolean) => void;
  setAgeVerified: (verified: boolean) => void;
  setAuthenticated: (auth: boolean) => void;
  incrementMessages: () => void;
  canSendMessage: () => boolean;
  getRemainingMessages: () => number;
  resetMessages: () => void;
  isInBonusMode: () => boolean;
  shouldShowBonus: () => boolean;
  activateBonus: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  isAgeVerified: localStorage.getItem('aidark_age_verified') === 'true',

  setUser: (user) => {
    const auth = !!user;
    localStorage.setItem('aidark_authenticated', String(auth));
    set({ user, isAuthenticated: auth });
  },
  setLoading:       (loading)  => set({ isLoading: loading }),
  setAuthenticated: (auth)     => {
    localStorage.setItem('aidark_authenticated', String(auth));
    set({ isAuthenticated: auth });
  },
  setAgeVerified: (verified) => {
    localStorage.setItem('aidark_age_verified', String(verified));
    set({ isAgeVerified: verified });
  },

  incrementMessages: () => {
    const { user } = get();
    // FIX SYNC: Para usuarios logueados, incrementar en el perfil (sincronizado entre dispositivos)
    // El API ya incrementa en la BD — aquí solo actualizamos el estado local
    if (user) {
      const updated = { ...user, messages_used: (user.messages_used || 0) + 1 };
      set({ user: updated });
      return;
    }
    // Fallback localStorage para no-logueados
    if (get().isInBonusMode()) {
      incrementBonusMessages();
    } else {
      incrementDeviceMessages();
    }
  },

  canSendMessage: () => {
    const { user } = get();
    if (isPremiumPlan(user?.plan)) return true;
    // FIX SYNC: Usar messages_used del perfil (sincronizado entre dispositivos)
    if (user) {
      return (user.messages_used || 0) < FREE_LIMIT;
    }
    // Fallback localStorage
    const bonusActive = wasBonusGiven();
    if (bonusActive) return getBonusMessagesUsed() < FREE_LIMIT;
    return getDeviceMessagesUsed() < FREE_LIMIT;
  },

  getRemainingMessages: () => {
    const { user } = get();
    if (isPremiumPlan(user?.plan)) return 999;
    // FIX SYNC: Usar messages_used del perfil
    if (user) {
      return Math.max(0, FREE_LIMIT - (user.messages_used || 0));
    }
    // Fallback localStorage
    const bonusActive = wasBonusGiven();
    if (bonusActive) return Math.max(0, FREE_LIMIT - getBonusMessagesUsed());
    return Math.max(0, FREE_LIMIT - getDeviceMessagesUsed());
  },

  resetMessages: () => { _resetMessagesInternal(); },

  isInBonusMode:  () => wasBonusGiven(),

  shouldShowBonus: () => {
    const { user } = get();
    if (isPremiumPlan(user?.plan)) return false;
    // FIX SYNC: Usar messages_used del perfil
    if (user) {
      return (user.messages_used || 0) >= FREE_LIMIT && !wasBonusGiven();
    }
    return getDeviceMessagesUsed() >= FREE_LIMIT && !wasBonusGiven();
  },

  activateBonus: () => { giveBonusMessages(); },
}));
