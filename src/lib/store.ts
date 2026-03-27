// ═══════════════════════════════════════
// AIdark — Global Store v3
// src/lib/store.ts
// FIXES v3:
//   [1] canSendMessage BLOQUEA si perfil es temporal (_temporary)
//   [2] getRemainingMessages retorna 0 si perfil temporal
//   [3] incrementMessages NO incrementa si perfil temporal
//   [4] Nuevo método: refreshProfile() para recargar perfil real desde BD
//   [5] isPremiumPlan helper robusto
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
import { supabase } from '@/lib/supabase';

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
  refreshProfile: () => Promise<void>;
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

  // ═══════════════════════════════════════
  // FIX v3 [4]: refreshProfile — recarga perfil real desde BD
  // Se llama cuando el perfil es temporal para intentar obtener el real
  // ═══════════════════════════════════════
  refreshProfile: async () => {
    const { user } = get();
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      if (!error && data) {
        console.log('[Auth] Perfil real recargado desde BD, messages_used:', data.messages_used);
        set({ user: data as any });
      }
    } catch (err) {
      console.warn('[Auth] No se pudo recargar perfil:', err);
    }
  },

  // ═══════════════════════════════════════
  // FIX v3 [3]: NO incrementar si perfil temporal
  // ═══════════════════════════════════════
  incrementMessages: () => {
    const { user } = get();
    if (user) {
      // FIX: Si el perfil es temporal, NO incrementar localmente
      // El backend ya maneja el incremento real en la BD
      if ((user as any)._temporary) return;
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

  // ═══════════════════════════════════════
  // FIX v3 [1]: BLOQUEAR si perfil es temporal
  // Si no se pudo cargar el perfil real, NO dejar enviar
  // El usuario debe refrescar o esperar a que cargue
  // ═══════════════════════════════════════
  canSendMessage: () => {
    const { user } = get();
    if (isPremiumPlan(user?.plan)) return true;

    if (user) {
      // FIX CRÍTICO: Si el perfil es temporal, BLOQUEAR envío
      // No sabemos cuántos mensajes realmente ha usado
      if ((user as any)._temporary) {
        console.warn('[Auth] Perfil temporal — bloqueando envío hasta cargar perfil real');
        // Intentar recargar el perfil en background
        get().refreshProfile();
        return false;
      }
      return (user.messages_used || 0) < FREE_LIMIT;
    }
    // Fallback localStorage
    const bonusActive = wasBonusGiven();
    if (bonusActive) return getBonusMessagesUsed() < FREE_LIMIT;
    return getDeviceMessagesUsed() < FREE_LIMIT;
  },

  // ═══════════════════════════════════════
  // FIX v3 [2]: Retornar 0 si perfil temporal
  // ═══════════════════════════════════════
  getRemainingMessages: () => {
    const { user } = get();
    if (isPremiumPlan(user?.plan)) return 999;

    if (user) {
      // FIX: Si el perfil es temporal, mostrar 0 restantes
      if ((user as any)._temporary) return 0;
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
    if (user) {
      if ((user as any)._temporary) return false;
      return (user.messages_used || 0) >= FREE_LIMIT && !wasBonusGiven();
    }
    return getDeviceMessagesUsed() >= FREE_LIMIT && !wasBonusGiven();
  },

  activateBonus: () => { giveBonusMessages(); },
}));
