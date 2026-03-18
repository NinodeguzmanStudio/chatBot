// ═══════════════════════════════════════
// AIdark — Main App
// FIXES:
//   [1] Flash del Landing al hacer F5 — si había sesión previa muestra loading, no Landing
//   [2] Sesión no persiste — clearAllAuthState ya NO borra las claves sb-* de Supabase
//       Solo borra el flag propio de la app. Supabase puede renovar el token automáticamente.
// ═══════════════════════════════════════

import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar, Header, ChatArea, AgeGate, PricingModal, PromoModal, SettingsModal, PrivacyModal, AuthModal } from '@/components';
import { useAuthStore, useChatStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { useIsMobile } from '@/hooks/useIsMobile';
import { LegalPages } from '@/components/LegalPages';
import Landing from '@/components/Landing';
import { InstallBanner } from '@/components/modals/InstallBanner';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

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
          <div onClick={() => useChatStore.getState().setSidebarOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99 }} />
          <aside style={{ position: 'fixed', left: 0, top: 0, bottom: 0, width: 280, display: 'flex', flexDirection: 'column', background: 'var(--bg-secondary)', borderRight: '1px solid var(--border-sub)', zIndex: 100 }}>
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

async function getSessionSafe() {
  try {
    const result = await Promise.race([
      supabase.auth.getSession(),
      new Promise<null>(resolve => setTimeout(() => resolve(null), 2500)),
    ]);
    return result;
  } catch {
    return null;
  }
}

async function resolveUserProfile(userId: string, email: string) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const result = await Promise.race([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000)),
      ]) as any;
      if (result?.data) return result.data;
    } catch { /* timeout o error */ }
    if (attempt < 1) await new Promise(r => setTimeout(r, 300));
  }
  const newProfile = { id: userId, email, plan: 'free', created_at: new Date().toISOString(), messages_used: 0, messages_limit: 12, plan_expires_at: null };
  void (async () => { try { await supabase.from('profiles').upsert(newProfile, { onConflict: 'id' }); } catch { /* no crítico */ } })();
  return newProfile;
}

// FIX [2]: ya NO borra las claves sb-* de Supabase
// Antes las borraba y Supabase no podía renovar el token → usuario deslogueado
// Ahora solo limpia el flag de la app
function clearAllAuthState(setUser: any, setAuthenticated: any) {
  setUser(null);
  setAuthenticated(false);
  localStorage.removeItem('aidark_authenticated');
  // NO tocar las claves sb-* — Supabase las necesita para renovar la sesión
}

async function processSession(session: any, setUser: any, setAuthenticated: any, loadFromSupabase: any) {
  const profile = await resolveUserProfile(session.user.id, session.user.email || '');
  setUser(profile as any);
  setAuthenticated(true);
  // FIX [1]: marcar que hubo sesión para evitar flash del Landing al recargar
  localStorage.setItem('aidark_was_authenticated', 'true');
  loadFromSupabase(session.user.id).catch(console.error);
}

const App: React.FC = () => {
  const { isAgeVerified, setUser, setAuthenticated, setLoading } = useAuthStore();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { loadFromSupabase } = useChatStore();

  const [authComplete, setAuthComplete] = useState(false);
  const [authError, setAuthError] = useState('');
  const [showAuth, setShowAuth] = useState(false);
  const initialized = useRef(false);
  const doneRef = useRef(false);

  // FIX [1]: si el usuario ya se había logueado antes, no mostrar Landing mientras verifica
  const hadSession = localStorage.getItem('aidark_was_authenticated') === 'true';

  const done = (clearAuth = false) => {
    if (doneRef.current) return;
    doneRef.current = true;
    if (clearAuth) {
      clearAllAuthState(setUser, setAuthenticated);
      // Si no hay sesión, limpiar el flag para mostrar el Landing correctamente
      localStorage.removeItem('aidark_was_authenticated');
    }
    setAuthComplete(true);
    setLoading(false);
  };

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const initAuth = async () => {
      try {
        if (window.location.hash.includes('access_token')) {
          await new Promise(r => setTimeout(r, 300));
          window.history.replaceState({}, '', window.location.pathname);
        }

        const sessionResult = await getSessionSafe();

        if (sessionResult === null) {
          console.warn('[Auth] getSession timeout — esperando onAuthStateChange');
          return;
        }

        const { data: { session }, error } = sessionResult as any;

        if (error) {
          console.error('[Auth] getSession error:', error.message);
          done(true);
          return;
        }

        if (session?.user) {
          const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
          const now = Date.now();

          if (expiresAt > 0 && expiresAt < now) {
            const { data: refreshed, error: refreshErr } = await supabase.auth.refreshSession();
            if (refreshErr || !refreshed.session) { done(true); return; }
            await processSession(refreshed.session, setUser, setAuthenticated, loadFromSupabase);
            done();
            return;
          }

          await processSession(session, setUser, setAuthenticated, loadFromSupabase);
          done();
          return;
        }

        done(true);

      } catch (err: any) {
        console.error('[Auth] Error inesperado:', err);
        done(true);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[Auth] onAuthStateChange →', event);

      if ((event === 'INITIAL_SESSION' || event === 'SIGNED_IN') && session?.user && !doneRef.current) {
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
        return;
      }

      if (event === 'INITIAL_SESSION' && !session && !doneRef.current) {
        done(true);
        return;
      }

      if (event === 'TOKEN_REFRESHED' && session?.user) {
        try {
          const profile = await resolveUserProfile(session.user.id, session.user.email || '');
          setUser(profile as any);
        } catch { /* no crítico */ }
      }

      if (event === 'SIGNED_OUT') {
        localStorage.removeItem('aidark_was_authenticated');
        done(true);
      }
    });

    const fallback = setTimeout(() => {
      if (!doneRef.current) {
        console.warn('[Auth] Fallback 5s — forzando resolución');
        done(true);
      }
    }, 5000);

    return () => {
      clearTimeout(fallback);
      subscription.unsubscribe();
    };
  }, []);

  // ── Render ──
  if (!authComplete) {
    // FIX [1]: siempre mostrar el loading spinner, nunca el Landing, mientras verifica
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000', flexDirection: 'column', gap: 20 }}>
        <img src="/icon-512.png" alt="AIdark" style={{ width: 120, height: 120, borderRadius: 24, animation: 'fadeIn 0.6s ease, pulse 2s ease-in-out infinite' }} />
        <span style={{ fontSize: 13, color: '#8b7355', fontWeight: 600, letterSpacing: 1 }}>AIdark</span>
        <div style={{ width: 32, height: 2, borderRadius: 2, background: '#8b735544', overflow: 'hidden', marginTop: 4 }}>
          <div style={{ width: '50%', height: '100%', background: '#8b7355', animation: 'slideLoad 1.2s ease-in-out infinite' }} />
        </div>
      </div>
    );
  }

  if (!isAuthenticated && !showAuth) return <Landing onStart={() => setShowAuth(true)} />;
  if (!isAuthenticated) return <AuthModal onSuccess={() => { doneRef.current = true; setAuthComplete(true); }} initialError={authError} />;
  if (!isAgeVerified) return <AgeGate />;

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
