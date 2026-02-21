// ═══════════════════════════════════════
// AIdark — Main App (v5 — ROBUST AUTH)
// ═══════════════════════════════════════
// FIX: Resuelve el bug donde la app se queda en pantalla de carga
//      cuando hay tokens expirados/corruptos en localStorage.
//      Ahora usa getSession() primero (rápido) + fallback de 1.5s.

import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar, Header, ChatArea, AgeGate, PricingModal, SettingsModal, PrivacyModal, AuthModal } from '@/components';
import { useAuthStore, useChatStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { useIsMobile } from '@/hooks/useIsMobile';
import { LegalPages } from '@/components/LegalPages';
import Landing from '@/components/Landing';

// ── Payment result pages ──
const PaymentSuccess: React.FC = () => (
  <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', flexDirection: 'column', gap: 16 }}>
    <span style={{ fontSize: 48 }}>✅</span>
    <h1 style={{ fontSize: 22, color: 'var(--txt-pri)', fontWeight: 500 }}>¡Pago exitoso!</h1>
    <p style={{ fontSize: 13, color: 'var(--txt-sec)', textAlign: 'center', maxWidth: 300 }}>Tu plan premium está activo. Disfruta AIdark sin límites.</p>
    <a href="/" style={{ marginTop: 12, padding: '10px 24px', background: 'var(--accent)', color: '#fff', borderRadius: 8, textDecoration: 'none', fontSize: 13 }}>Ir al chat</a>
  </div>
);

const PaymentFailure: React.FC = () => (
  <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', flexDirection: 'column', gap: 16 }}>
    <span style={{ fontSize: 48 }}>❌</span>
    <h1 style={{ fontSize: 22, color: 'var(--txt-pri)', fontWeight: 500 }}>Pago fallido</h1>
    <p style={{ fontSize: 13, color: 'var(--txt-sec)', textAlign: 'center', maxWidth: 300 }}>Hubo un problema con tu pago. Intenta de nuevo.</p>
    <a href="/" style={{ marginTop: 12, padding: '10px 24px', background: 'var(--bg-el)', color: 'var(--txt-pri)', borderRadius: 8, textDecoration: 'none', fontSize: 13, border: '1px solid var(--border-sub)' }}>Volver</a>
  </div>
);

const PaymentPending: React.FC = () => (
  <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', flexDirection: 'column', gap: 16 }}>
    <span style={{ fontSize: 48 }}>⏳</span>
    <h1 style={{ fontSize: 22, color: 'var(--txt-pri)', fontWeight: 500 }}>Pago pendiente</h1>
    <p style={{ fontSize: 13, color: 'var(--txt-sec)', textAlign: 'center', maxWidth: 300 }}>Tu pago está siendo procesado. Te notificaremos cuando se confirme.</p>
    <a href="/" style={{ marginTop: 12, padding: '10px 24px', background: 'var(--bg-el)', color: 'var(--txt-pri)', borderRadius: 8, textDecoration: 'none', fontSize: 13, border: '1px solid var(--border-sub)' }}>Ir al chat</a>
  </div>
);

// ── Main Chat Layout ──
const ChatLayout: React.FC = () => {
  const { sidebarOpen } = useChatStore();
  const [pricingOpen, setPricingOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const isMobile = useIsMobile();

  return (
    <div style={{ height: '100dvh', display: 'flex', background: 'var(--bg-primary)', overflow: 'hidden' }}>
      {!isMobile && sidebarOpen && (
        <aside style={{
          width: 260, display: 'flex', flexDirection: 'column',
          background: 'var(--bg-secondary)', borderRight: '1px solid var(--border-sub)', flexShrink: 0,
        }}>
          <Sidebar onOpenPricing={() => setPricingOpen(true)} onOpenSettings={() => setSettingsOpen(true)} onOpenPrivacy={() => setPrivacyOpen(true)} />
        </aside>
      )}
      {isMobile && sidebarOpen && (
        <>
          <div onClick={() => useChatStore.getState().setSidebarOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99, animation: 'fadeIn 0.2s ease' }} />
          <aside style={{ position: 'fixed', left: 0, top: 0, bottom: 0, width: 280, display: 'flex', flexDirection: 'column', background: 'var(--bg-secondary)', borderRight: '1px solid var(--border-sub)', zIndex: 100, animation: 'slideRight 0.2s ease' }}>
            <Sidebar onOpenPricing={() => setPricingOpen(true)} onOpenSettings={() => setSettingsOpen(true)} onOpenPrivacy={() => setPrivacyOpen(true)} isMobile />
          </aside>
        </>
      )}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100dvh', minWidth: 0 }}>
        <Header onOpenPricing={() => setPricingOpen(true)} />
        <ChatArea onOpenPricing={() => setPricingOpen(true)} />
      </main>
      <PricingModal isOpen={pricingOpen} onClose={() => setPricingOpen(false)} />
      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <PrivacyModal isOpen={privacyOpen} onClose={() => setPrivacyOpen(false)} />
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════
// Helper: Buscar o crear profile (max 2 intentos para no bloquear)
// ══════════════════════════════════════════════════════════════════
async function resolveUserProfile(userId: string, email: string) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (data) return data;
    if (attempt < 1) await new Promise(r => setTimeout(r, 400));
  }
  // Fallback: crear profile
  const newProfile = {
    id: userId,
    email,
    plan: 'free',
    created_at: new Date().toISOString(),
    messages_used: 0,
    messages_limit: 5,
    plan_expires_at: null,
  };
  await supabase.from('profiles').upsert(newProfile, { onConflict: 'id' });
  return newProfile;
}

// ══════════════════════════════════════════════════════════════════
// Helper: Limpiar TODO el estado de auth (tokens corruptos incluidos)
// ══════════════════════════════════════════════════════════════════
function clearAllAuthState(setUser: any, setAuthenticated: any) {
  setUser(null);
  setAuthenticated(false);
  localStorage.removeItem('aidark_authenticated');
  // Limpiar tokens de Supabase que pueden estar corruptos/expirados
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.startsWith('sb-') || key.includes('supabase'))) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(k => localStorage.removeItem(k));
  console.log('[Auth] Estado limpiado completamente');
}

// ══════════════════════════════════════════════════════════════════
// Helper: Procesar sesión válida → cargar profile → marcar auth OK
// ══════════════════════════════════════════════════════════════════
async function processSession(
  session: any,
  setUser: any,
  setAuthenticated: any,
  loadFromSupabase: any,
) {
  const profile = await resolveUserProfile(
    session.user.id,
    session.user.email || '',
  );
  setUser(profile as any);
  setAuthenticated(true);
  // Cargar chats en background — NO bloquea la UI
  loadFromSupabase(session.user.id).catch(console.error);
}

// ── Root App ──
const App: React.FC = () => {
  const { isAgeVerified, setUser, setAuthenticated, setLoading } = useAuthStore();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { loadFromSupabase } = useChatStore();

  const [authComplete, setAuthComplete] = useState(false);
  const [authError, setAuthError] = useState('');
  const [showAuth, setShowAuth] = useState(false);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    let resolved = false;

    // ═══════════════════════════════════════════════════════════
    // v5: Auth robusta contra cache/tokens corruptos
    //
    // ANTES: Dependía solo de onAuthStateChange que puede no
    //        disparar si el token está corrupto → colgado 3+ seg
    //
    // AHORA:
    // 1. getSession() PRIMERO → respuesta inmediata
    // 2. Token expirado → refresh → si falla → limpia TODO
    // 3. Sin sesión → limpia y muestra landing (instantáneo)
    // 4. onAuthStateChange solo para eventos posteriores
    // 5. Fallback agresivo 1.5s
    // ═══════════════════════════════════════════════════════════

    const initAuth = async () => {
      try {
        // Si viene de OAuth redirect, dar un momento para procesar el hash
        if (window.location.hash.includes('access_token')) {
          await new Promise(r => setTimeout(r, 300));
          window.history.replaceState({}, '', window.location.pathname);
        }

        // ── Paso 1: Obtener sesión existente ──
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('[Auth] getSession error:', error.message);
          clearAllAuthState(setUser, setAuthenticated);
          resolved = true;
          setAuthComplete(true);
          setLoading(false);
          return;
        }

        // ── Paso 2: Si hay sesión, verificar validez ──
        if (session?.user) {
          const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
          const now = Date.now();

          // Token expirado → intentar refresh
          if (expiresAt > 0 && expiresAt < now) {
            console.log('[Auth] Token expirado, refrescando...');
            const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();

            if (refreshError || !refreshed.session) {
              console.warn('[Auth] Refresh falló:', refreshError?.message);
              clearAllAuthState(setUser, setAuthenticated);
              resolved = true;
              setAuthComplete(true);
              setLoading(false);
              return;
            }

            // Refresh OK → procesar
            resolved = true;
            await processSession(refreshed.session, setUser, setAuthenticated, loadFromSupabase);
            setAuthComplete(true);
            setLoading(false);
            return;
          }

          // Token válido → procesar directamente
          resolved = true;
          await processSession(session, setUser, setAuthenticated, loadFromSupabase);
          setAuthComplete(true);
          setLoading(false);
          return;
        }

        // ── Paso 3: No hay sesión → mostrar landing ──
        console.log('[Auth] Sin sesión activa');
        clearAllAuthState(setUser, setAuthenticated);
        resolved = true;
        setAuthComplete(true);
        setLoading(false);

      } catch (err: any) {
        console.error('[Auth] Error inesperado:', err);
        clearAllAuthState(setUser, setAuthenticated);
        resolved = true;
        setAuthComplete(true);
        setLoading(false);
      }
    };

    // Ejecutar inmediatamente
    initAuth();

    // ── Listener para cambios POSTERIORES (login, logout, refresh) ──
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[Auth] onAuthStateChange →', event);

      // Login exitoso (después de OAuth o email confirm)
      if (event === 'SIGNED_IN' && session?.user && !resolved) {
        resolved = true;
        try {
          if (window.location.hash.includes('access_token')) {
            window.history.replaceState({}, '', window.location.pathname);
          }
          await processSession(session, setUser, setAuthenticated, loadFromSupabase);
        } catch (err: any) {
          console.error('[Auth] Error procesando sesión:', err);
          setAuthError('Error al cargar tu perfil. Intenta de nuevo.');
        }
        setAuthComplete(true);
        setLoading(false);
      }

      // Token refrescado silenciosamente
      if (event === 'TOKEN_REFRESHED' && session?.user) {
        try {
          const profile = await resolveUserProfile(session.user.id, session.user.email || '');
          setUser(profile as any);
        } catch {
          // No es crítico
        }
      }

      // Logout
      if (event === 'SIGNED_OUT') {
        clearAllAuthState(setUser, setAuthenticated);
        setAuthComplete(true);
      }
    });

    // ── Safety fallback: 1.5s (reducido de 3s) ──
    const fallback = setTimeout(() => {
      if (!resolved) {
        console.warn('[Auth] Fallback 1.5s activado — forzando resolución');
        clearAllAuthState(setUser, setAuthenticated);
        resolved = true;
        setAuthComplete(true);
        setLoading(false);
      }
    }, 1500);

    return () => {
      clearTimeout(fallback);
      subscription.unsubscribe();
    };
  }, []);

  // ── Render ──

  if (!authComplete) {
    return (
      <div style={{
        minHeight: '100dvh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: '#000',
        flexDirection: 'column', gap: 20,
      }}>
        <img
          src="/icon-512.png"
          alt="AIdark"
          style={{
            width: 120, height: 120, borderRadius: 24,
            animation: 'fadeIn 0.6s ease, pulse 2s ease-in-out infinite',
          }}
        />
        <span style={{ fontSize: 13, color: '#8b7355', fontWeight: 600, letterSpacing: 1 }}>
          AIdark
        </span>
        <div style={{
          width: 32, height: 2, borderRadius: 2,
          background: '#8b735544', overflow: 'hidden', marginTop: 4,
        }}>
          <div style={{
            width: '50%', height: '100%', background: '#8b7355',
            animation: 'slideLoad 1.2s ease-in-out infinite',
          }} />
        </div>
      </div>
    );
  }

  if (!isAuthenticated && !showAuth) {
    return <Landing onStart={() => setShowAuth(true)} />;
  }

  if (!isAuthenticated) {
    return <AuthModal onSuccess={() => setAuthComplete(true)} initialError={authError} />;
  }

  if (!isAgeVerified) {
    return <AgeGate />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ChatLayout />} />
        <Route path="/payment/success" element={<PaymentSuccess />} />
        <Route path="/payment/failure" element={<PaymentFailure />} />
        <Route path="/payment/pending" element={<PaymentPending />} />
        <Route path="/legal" element={<LegalPages />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
