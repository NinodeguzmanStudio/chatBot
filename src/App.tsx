// ═══════════════════════════════════════
// AIdark — Main App (v6 — INFINITE LOAD FIX)
// ═══════════════════════════════════════
// BUG CORREGIDO: Al refrescar en móvil la app quedaba colgada
// infinitamente mostrando el logo.
//
// CAUSA: resolved=true se seteaba ANTES del await processSession().
// Si Supabase tardaba >1.5s el fallback veía resolved=true y no hacía
// nada, pero setAuthComplete(true) nunca se ejecutaba. Loop infinito.
//
// FIX: authCompleteRef trackea si la app terminó de cargar.
// El fallback ahora verifica el ref (no resolved) y fuerza la
// resolución si a los 4s todavía no terminó.

import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar, Header, ChatArea, AgeGate, PricingModal, PromoModal, SettingsModal, PrivacyModal, AuthModal } from '@/components';
import { useAuthStore, useChatStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { useIsMobile } from '@/hooks/useIsMobile';
import { LegalPages } from '@/components/LegalPages';
import Landing from '@/components/Landing';
import { InstallBanner } from '@/components/modals/InstallBanner';

// ── Registrar Service Worker ──
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

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
  const [promoOpen, setPromoOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const isMobile = useIsMobile();

  return (
    <div style={{ height: '100dvh', display: 'flex', background: 'var(--bg-primary)', overflow: 'hidden' }}>
      {!isMobile && sidebarOpen && (
        <aside style={{ width: 260, display: 'flex', flexDirection: 'column', background: 'var(--bg-secondary)', borderRight: '1px solid var(--border-sub)', flexShrink: 0 }}>
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
        <ChatArea onOpenPricing={() => setPromoOpen(true)} />
      </main>
      <PricingModal isOpen={pricingOpen} onClose={() => setPricingOpen(false)} />
      <PromoModal isOpen={promoOpen} onClose={() => setPromoOpen(false)} onOpenPricing={() => { setPromoOpen(false); setPricingOpen(true); }} />
      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <PrivacyModal isOpen={privacyOpen} onClose={() => setPrivacyOpen(false)} />
      <InstallBanner />
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════
// Helper: Buscar o crear profile con timeout propio
// ══════════════════════════════════════════════════════════════════
async function resolveUserProfile(userId: string, email: string) {
  // Timeout de 3s por intento para no bloquear en móvil lento
  const fetchWithTimeout = () => Promise.race([
    supabase.from('profiles').select('*').eq('id', userId).single(),
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000)),
  ]) as Promise<any>;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const { data } = await fetchWithTimeout();
      if (data) return data;
    } catch {
      // timeout o error — intentar de nuevo
    }
    if (attempt < 1) await new Promise(r => setTimeout(r, 400));
  }

  // Fallback: crear profile mínimo sin esperar confirmación
  const newProfile = {
    id: userId,
    email,
    plan: 'free',
    created_at: new Date().toISOString(),
    messages_used: 0,
    messages_limit: 5,
    plan_expires_at: null,
  };
  supabase.from('profiles').upsert(newProfile, { onConflict: 'id' }).then().catch(console.error);
  return newProfile;
}

// ══════════════════════════════════════════════════════════════════
// Helper: Limpiar TODO el estado de auth
// ══════════════════════════════════════════════════════════════════
function clearAllAuthState(setUser: any, setAuthenticated: any) {
  setUser(null);
  setAuthenticated(false);
  localStorage.removeItem('aidark_authenticated');
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.startsWith('sb-') || key.includes('supabase'))) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(k => localStorage.removeItem(k));
}

// ══════════════════════════════════════════════════════════════════
// Helper: Procesar sesión válida → cargar profile → marcar auth OK
// ══════════════════════════════════════════════════════════════════
async function processSession(session: any, setUser: any, setAuthenticated: any, loadFromSupabase: any) {
  const profile = await resolveUserProfile(session.user.id, session.user.email || '');
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

  // ── FIX: ref para trackear authComplete dentro de closures/timeouts ──
  // useState no es accesible en un setTimeout, el ref sí.
  const authCompleteRef = useRef(false);
  const done = (clearAuth = false) => {
    if (authCompleteRef.current) return; // ya se resolvió, no hacer nada doble
    authCompleteRef.current = true;
    if (clearAuth) clearAllAuthState(setUser, setAuthenticated);
    setAuthComplete(true);
    setLoading(false);
  };

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    let resolved = false;

    const initAuth = async () => {
      try {
        if (window.location.hash.includes('access_token')) {
          await new Promise(r => setTimeout(r, 300));
          window.history.replaceState({}, '', window.location.pathname);
        }

        // Paso 1: obtener sesión
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('[Auth] getSession error:', error.message);
          resolved = true;
          done(true);
          return;
        }

        // Paso 2: sesión existente
        if (session?.user) {
          const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
          const now = Date.now();

          // Token expirado → intentar refresh
          if (expiresAt > 0 && expiresAt < now) {
            console.log('[Auth] Token expirado, refrescando...');
            const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
            if (refreshError || !refreshed.session) {
              console.warn('[Auth] Refresh falló:', refreshError?.message);
              resolved = true;
              done(true);
              return;
            }
            resolved = true;
            await processSession(refreshed.session, setUser, setAuthenticated, loadFromSupabase);
            done();
            return;
          }

          // Token válido → procesar
          // IMPORTANTE: marcamos resolved=true ANTES del await
          // pero done() solo se llama DESPUÉS. El fallback de 4s
          // fuerza done() si processSession se cuelga.
          resolved = true;
          await processSession(session, setUser, setAuthenticated, loadFromSupabase);
          done();
          return;
        }

        // Paso 3: sin sesión
        resolved = true;
        done(true);

      } catch (err: any) {
        console.error('[Auth] Error inesperado:', err);
        resolved = true;
        done(true);
      }
    };

    initAuth();

    // Listener para eventos posteriores
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[Auth] onAuthStateChange →', event);

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
        done();
      }

      if (event === 'TOKEN_REFRESHED' && session?.user) {
        try {
          const profile = await resolveUserProfile(session.user.id, session.user.email || '');
          setUser(profile as any);
        } catch { /* no crítico */ }
      }

      if (event === 'SIGNED_OUT') {
        done(true);
      }
    });

    // ── Fallback agresivo: 4s ──
    // Antes era 1.5s y solo chequeaba `resolved`.
    // AHORA chequea authCompleteRef — si la app no terminó de cargar
    // en 4s (por Supabase lento en móvil), fuerza la resolución.
    const fallback = setTimeout(() => {
      if (!authCompleteRef.current) {
        console.warn('[Auth] Fallback 4s activado — forzando resolución');
        // Si resolved=true significa que tenemos sesión pero processSession colgó
        // → no borrar auth, solo desbloquear la UI (el profile cargará en background)
        if (resolved) {
          authCompleteRef.current = true;
          setAuthComplete(true);
          setLoading(false);
        } else {
          done(true);
        }
      }
    }, 4000);

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
    return <AuthModal onSuccess={() => { authCompleteRef.current = true; setAuthComplete(true); }} initialError={authError} />;
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
