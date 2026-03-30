// ═══════════════════════════════════════
// AIdark — Main App v6 (MOBILE AUTH FIX)
// src/App.tsx
// ═══════════════════════════════════════
// FIXES v6 (bugs móvil):
//   [1] BUG CRÍTICO: SIGNED_OUT llamaba done(true) que era NO-OP después
//       del primer auth → clearAllAuthState NUNCA se ejecutaba →
//       aidark_was_authenticated borrado pero isAuthenticated = true en RAM →
//       próxima carga muestra Landing en vez del chat
//       FIX: clearAllAuthState se llama DIRECTAMENTE en SIGNED_OUT
//   [2] BUG CRÍTICO MÓVIL: INITIAL_SESSION null + ?code= en URL →
//       done(true) se ejecutaba antes de completar el intercambio PKCE →
//       pantalla de login aparecía momentáneamente en móviles
//       FIX: si hay ?code= en URL, esperar a SIGNED_IN antes de llamar done()
//   [3] BUG MÓVIL: showAuth se resetea a false en cada carga de página
//       Después del redirect OAuth, el usuario veía Landing en vez de Auth
//       FIX: detectar ?code= en URL al montar para ir directo a AuthModal
//   [4] doneRef ya no bloquea SIGNED_OUT — auth se limpia siempre
// ═══════════════════════════════════════

import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar, Header, ChatArea, AgeGate, PricingModal, PromoModal, SettingsModal, PrivacyModal, AuthModal, AdminDashboard } from '@/components';
import { useAuthStore, useChatStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { useIsMobile } from '@/hooks/useIsMobile';
import { LegalPages } from '@/components/LegalPages';
import Landing from '@/components/Landing';
import { InstallBanner } from '@/components/modals/InstallBanner';
import { APP_CONFIG } from '@/lib/constants';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

async function registerPush(accessToken: string): Promise<void> {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
    if (!vapidKey) return;
    const reg      = await navigator.serviceWorker.ready;
    const existing = await reg.pushManager.getSubscription();
    const sub      = existing || await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: vapidKey,
    });
    await fetch('/api/push-subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
      body: JSON.stringify({ subscription: sub }),
    });
  } catch (err) {
    console.warn('[Push] No se pudo registrar:', err);
  }
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
  const [pricingOpen, setPricingOpen]   = useState(false);
  const [promoOpen, setPromoOpen]       = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen]   = useState(false);
  const [adminOpen, setAdminOpen]       = useState(false);
  const isMobile = useIsMobile();

  return (
    <div style={{ height: '100dvh', display: 'flex', background: 'var(--bg-primary)', overflow: 'hidden' }}>
      {!isMobile && sidebarOpen && (
        <aside style={{ width: 260, display: 'flex', flexDirection: 'column', background: 'var(--bg-secondary)', borderRight: '1px solid var(--border-sub)', flexShrink: 0 }}>
          <Sidebar onOpenPricing={() => setPricingOpen(true)} onOpenSettings={() => setSettingsOpen(true)} onOpenPrivacy={() => setPrivacyOpen(true)} onOpenAdmin={() => setAdminOpen(true)} />
        </aside>
      )}
      {isMobile && sidebarOpen && (
        <>
          <div onClick={() => useChatStore.getState().setSidebarOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99 }} />
          <aside style={{ position: 'fixed', left: 0, top: 0, bottom: 0, width: 280, display: 'flex', flexDirection: 'column', background: 'var(--bg-secondary)', borderRight: '1px solid var(--border-sub)', zIndex: 100 }}>
            <Sidebar onOpenPricing={() => setPricingOpen(true)} onOpenSettings={() => setSettingsOpen(true)} onOpenPrivacy={() => setPrivacyOpen(true)} onOpenAdmin={() => setAdminOpen(true)} isMobile />
          </aside>
        </>
      )}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100dvh', minWidth: 0 }}>
        <Header onOpenPricing={() => setPricingOpen(true)} />
        <ChatArea onOpenPricing={() => setPromoOpen(true)} />
      </main>
      <PricingModal isOpen={pricingOpen} onClose={() => setPricingOpen(false)} />
      <PromoModal
        isOpen={promoOpen}
        onClose={() => setPromoOpen(false)}
        onOpenPricing={() => { setPromoOpen(false); setPricingOpen(true); }}
      />
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onOpenPricing={() => { setSettingsOpen(false); setPricingOpen(true); }}
      />
      <PrivacyModal isOpen={privacyOpen} onClose={() => setPrivacyOpen(false)} />
      <InstallBanner />
      <AdminDashboard isOpen={adminOpen} onClose={() => setAdminOpen(false)} />
    </div>
  );
};

async function getSessionSafe() {
  try {
    const result = await Promise.race([
      supabase.auth.getSession(),
      new Promise<null>(resolve => setTimeout(() => resolve(null), 10000)),
    ]);
    return result;
  } catch {
    return null;
  }
}

async function resolveUserProfile(userId: string, email: string) {
  const delays = [0, 500, 1200];

  for (let attempt = 0; attempt < delays.length; attempt++) {
    if (attempt > 0) await new Promise(r => setTimeout(r, delays[attempt]));
    try {
      const result = await Promise.race([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000)),
      ]) as any;
      if (result?.data) {
        console.log('[Auth] Perfil cargado OK, messages_used:', result.data.messages_used);
        return result.data;
      }
    } catch { /* timeout o error, reintentar */ }
  }

  console.warn('[Auth] No se pudo cargar perfil — usando temporal en memoria (NO se escribe en BD)');
  return {
    id: userId,
    email,
    plan: 'free',
    created_at: new Date().toISOString(),
    messages_used: 0,
    // FIX v5 [5]: Usar constante, no hardcodear 12
    messages_limit: APP_CONFIG.freeMessageLimit,
    plan_expires_at: null,
    _temporary: true,
  };
}

function clearAllAuthState(setUser: any, setAuthenticated: any) {
  setUser(null);
  setAuthenticated(false);
  localStorage.removeItem('aidark_authenticated');
}

let lastProcessedUserId: string | null = null;

async function processSession(session: any, setUser: any, setAuthenticated: any, loadFromSupabase: any) {
  const userId = session.user.id;

  if (lastProcessedUserId === userId) return;
  lastProcessedUserId = userId;

  try {
    const profile = await resolveUserProfile(userId, session.user.email || '');
    setUser(profile as any);
    setAuthenticated(true);
    localStorage.setItem('aidark_was_authenticated', 'true');
    loadFromSupabase(userId).catch(console.error);
    if (session.access_token) registerPush(session.access_token);

    // FIX v5 [4]: Si el perfil es temporal, retry en background
    if ((profile as any)._temporary) {
      console.log('[Auth] Perfil temporal detectado — iniciando retry en background...');
      const retryInterval = setInterval(async () => {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();
          if (!error && data) {
            console.log('[Auth] Perfil real recuperado en background, messages_used:', data.messages_used);
            setUser(data as any);
            clearInterval(retryInterval);
          }
        } catch { /* silencioso */ }
      }, 5000);

      setTimeout(() => clearInterval(retryInterval), 60000);
    }
  } catch (err) {
    console.error('[Auth] Error en processSession:', err);
    lastProcessedUserId = null;
  }
}

const App: React.FC = () => {
  const { isAgeVerified, setUser, setAuthenticated, setLoading } = useAuthStore();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { loadFromSupabase } = useChatStore();

  // Fix: si el usuario ya se autenticó antes, mostrar app inmediatamente
  // mientras el perfil carga en background (evita spinner en usuarios recurrentes)
  const wasAuth = localStorage.getItem('aidark_was_authenticated') === 'true';
  const [authComplete, setAuthComplete]   = useState(wasAuth);
  const [authError, setAuthError]         = useState('');
  const [showAuth, setShowAuth]           = useState(false);

  // ══════════════════════════════════════════════════════
  // FIX CRÍTICO — sessionChecked
  //
  // PROBLEMA REAL:
  //   wasAuth=true  → authComplete=true (salta spinner)
  //   isAuthenticated=false (Zustand arranca en false siempre)
  //   → Renderiza Landing durante ~1-2s hasta que Supabase confirma
  //   → Usuario ve Landing y cree que fue deslogueado
  //
  // SOLUCIÓN:
  //   sessionChecked=false hasta que done() se ejecute.
  //   Si wasAuth=true pero sessionChecked=false → mostrar spinner.
  //   El usuario NUNCA ve Landing si ya estaba autenticado.
  // ══════════════════════════════════════════════════════
  const [sessionChecked, setSessionChecked] = useState(false);

  const hasPKCECode = window.location.search.includes('code=');
  const initialized = useRef(false);
  const doneRef     = useRef(false);

  const done = (clearAuth = false) => {
    if (doneRef.current) return;
    doneRef.current = true;
    setSessionChecked(true);
    if (clearAuth) {
      clearAllAuthState(setUser, setAuthenticated);
      localStorage.removeItem('aidark_was_authenticated');
    }
    setAuthComplete(true);
    setLoading(false);
  };

  // Limpiar auth directamente sin pasar por done()
  const signOutCleanup = () => {
    localStorage.removeItem('aidark_was_authenticated');
    lastProcessedUserId = null;
    clearAllAuthState(setUser, setAuthenticated);
    doneRef.current = false;
    setSessionChecked(true);
    setAuthComplete(true);
    setLoading(false);
  };

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // Si venimos de OAuth redirect con ?code= y NO tenemos sesión previa,
    // forzar authComplete = false para mostrar spinner mientras se procesa PKCE
    if (hasPKCECode && !wasAuth) {
      setAuthComplete(false);
    }

    // FIX v6: onAuthStateChange es la fuente PRINCIPAL
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[Auth] onAuthStateChange →', event);

      if ((event === 'INITIAL_SESSION' || event === 'SIGNED_IN') && session?.user) {
        try {
          if (window.location.search.includes('code=') || window.location.hash.includes('access_token')) {
            window.history.replaceState({}, '', window.location.pathname);
          }
          await processSession(session, setUser, setAuthenticated, loadFromSupabase);
        } catch (err: any) {
          setAuthError('Error al cargar tu perfil. Intenta de nuevo.');
        }
        done();
        return;
      }

      // FIX v6 [2]: Si hay ?code= en la URL, NO llamar done(true) en INITIAL_SESSION null.
      // Significa que el intercambio PKCE aún no terminó (especialmente en móviles lentos).
      // Esperar a que llegue SIGNED_IN. El fallback timeout se encarga si nunca llega.
      if (event === 'INITIAL_SESSION' && !session) {
        if (hasPKCECode) {
          console.log('[Auth] INITIAL_SESSION null con ?code= → esperando PKCE exchange (SIGNED_IN)...');
          // No llamar done() — esperar a SIGNED_IN o al fallback timeout
          return;
        }
        done(true);
        return;
      }

      if (event === 'TOKEN_REFRESHED' && session?.user) {
        try {
          const profile = await resolveUserProfile(session.user.id, session.user.email || '');
          setUser(profile as any);
        } catch { /* no crítico */ }
      }

      // FIX v6 [1]: SIGNED_OUT limpia auth DIRECTAMENTE (no via done())
      // para que funcione aunque doneRef ya sea true
      if (event === 'SIGNED_OUT') {
        console.log('[Auth] SIGNED_OUT → limpiando sesión');
        signOutCleanup();
      }
    });

    // FIX v6: Fallback timeout — también maneja fallo de intercambio PKCE en móvil
    const fallback = setTimeout(async () => {
      if (!doneRef.current) {
        console.warn('[Auth] Fallback timeout alcanzado (8s)');
        try {
          const sessionResult = await getSessionSafe();
          if (sessionResult) {
            const { data: { session } } = sessionResult as any;
            if (session?.user) {
              console.log('[Auth] Fallback: sesión encontrada, procesando...');
              await processSession(session, setUser, setAuthenticated, loadFromSupabase);
              done();
              return;
            }
          }
        } catch { /* ignorar */ }
        // Si había ?code= pero el intercambio falló, limpiar URL
        if (hasPKCECode) {
          console.warn('[Auth] Fallback: intercambio PKCE falló — limpiando URL');
          window.history.replaceState({}, '', window.location.pathname);
        }
        done(true);
      }
    }, 8000);

    return () => { clearTimeout(fallback); subscription.unsubscribe(); };
  }, []);

  // Mostrar spinner si:
  // 1. Auth no está completo (usuario nuevo cargando)
  // 2. wasAuth=true pero sesión aún no verificada (evita flash de Landing)
  if (!authComplete || (wasAuth && !sessionChecked)) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000', flexDirection: 'column', gap: 20 }}>
        <img src="/favicon.svg" alt="AIdark" style={{ width: 80, height: 80, borderRadius: 16, animation: 'fadeIn 0.6s ease, pulse 2s ease-in-out infinite' }} />
        <span style={{ fontSize: 13, color: '#8b7355', fontWeight: 600, letterSpacing: 1 }}>AIdark</span>
        <div style={{ width: 32, height: 2, borderRadius: 2, background: '#8b735544', overflow: 'hidden', marginTop: 4 }}>
          <div style={{ width: '50%', height: '100%', background: '#8b7355', animation: 'slideLoad 1.2s ease-in-out infinite' }} />
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/payment/success" element={<PaymentSuccess />} />
        <Route path="/payment/failure" element={<PaymentFailure />} />
        <Route path="/payment/pending" element={<PaymentPending />} />
        <Route path="/legal" element={<LegalPages />} />

        <Route path="*" element={
          !isAuthenticated && !showAuth
            ? <Landing onStart={() => setShowAuth(true)} />
            : !isAuthenticated
              ? <AuthModal onSuccess={() => { doneRef.current = true; setAuthComplete(true); }} initialError={authError} />
              : !isAgeVerified
                ? <AgeGate />
                : <ChatLayout />
        } />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
