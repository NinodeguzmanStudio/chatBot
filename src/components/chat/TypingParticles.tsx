// ═══════════════════════════════════════
// AIdark — Main App v4 (FIXED)
// src/App.tsx
// ═══════════════════════════════════════
// CAMBIOS v4:
//   [1] getSessionSafe timeout: 2.5s → 10s (evita logout en redes lentas)
//   [2] resolveUserProfile: NO hace upsert si falla (evita sobreescribir premium con free)
//   [3] resolveUserProfile timeout: 3s → 6s
//   [4] Race condition fix: lock en processSession para evitar ejecución doble
//   [5] BrowserRouter envuelve TODO — /payment/* funciona sin sesión activa
//   [6] Fallback timeout: 5s → 12s
//   [7] getSessionSafe timeout NO borra auth — deja que onAuthStateChange lo resuelva
//   [8] PKCE: detecta ?code= en URL (en vez de #access_token para implicit)
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

// ═══════════════════════════════════════
// FIX [1]: Timeout subido a 10 segundos
// En redes móviles 3G/4G lentas, 2.5s era insuficiente
// y causaba que se borre la sesión innecesariamente.
// ═══════════════════════════════════════
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

// ═══════════════════════════════════════
// FIX [2] + [3]: resolveUserProfile
// - Timeout subido a 6 segundos
// - Si falla: retorna perfil temporal en MEMORIA
//   SIN hacer upsert a la BD (antes sobreescribía
//   un perfil premium con plan:'free')
// - El perfil real se cargará en el próximo refresh
// ═══════════════════════════════════════
async function resolveUserProfile(userId: string, email: string) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const result = await Promise.race([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 6000)),
      ]) as any;
      if (result?.data) return result.data;
    } catch { /* timeout o error */ }
    if (attempt < 1) await new Promise(r => setTimeout(r, 500));
  }
  // FIX [2]: Retornar perfil temporal SIN escribir en BD
  // Esto evita sobreescribir un perfil premium existente con plan:'free'
  console.warn('[Auth] No se pudo cargar perfil — usando temporal en memoria (NO se escribe en BD)');
  return {
    id: userId,
    email,
    plan: 'free',
    created_at: new Date().toISOString(),
    messages_used: 0,
    messages_limit: 12,
    plan_expires_at: null,
    _temporary: true, // Flag para saber que es temporal
  };
}

function clearAllAuthState(setUser: any, setAuthenticated: any) {
  setUser(null);
  setAuthenticated(false);
  localStorage.removeItem('aidark_authenticated');
}

// ═══════════════════════════════════════
// FIX [4]: Lock para evitar race condition
// Antes, initAuth() y onAuthStateChange podían
// ejecutar processSession() en paralelo y duplicar
// operaciones de carga.
// ═══════════════════════════════════════
let processingSession = false;

async function processSession(session: any, setUser: any, setAuthenticated: any, loadFromSupabase: any) {
  if (processingSession) return; // FIX [4]: evitar ejecución doble
  processingSession = true;
  try {
    const profile = await resolveUserProfile(session.user.id, session.user.email || '');
    setUser(profile as any);
    setAuthenticated(true);
    localStorage.setItem('aidark_was_authenticated', 'true');
    loadFromSupabase(session.user.id).catch(console.error);
    if (session.access_token) registerPush(session.access_token);
  } finally {
    processingSession = false;
  }
}

const App: React.FC = () => {
  const { isAgeVerified, setUser, setAuthenticated, setLoading } = useAuthStore();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { loadFromSupabase } = useChatStore();

  const [authComplete, setAuthComplete] = useState(false);
  const [authError, setAuthError]       = useState('');
  const [showAuth, setShowAuth]         = useState(false);
  const initialized = useRef(false);
  const doneRef     = useRef(false);

  const done = (clearAuth = false) => {
    if (doneRef.current) return;
    doneRef.current = true;
    if (clearAuth) {
      clearAllAuthState(setUser, setAuthenticated);
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
        // FIX [8]: PKCE usa ?code= en query params (no #access_token)
        const urlParams = new URLSearchParams(window.location.search);
        const hasCode = urlParams.has('code');
        const hasHash = window.location.hash.includes('access_token');

        if (hasCode || hasHash) {
          // Dar tiempo a Supabase para procesar el code exchange
          await new Promise(r => setTimeout(r, 500));
        }

        const sessionResult = await getSessionSafe();

        // FIX [7]: Si hay timeout, NO borrar auth
        // Solo loguear warning y dejar que onAuthStateChange lo resuelva
        if (sessionResult === null) {
          console.warn('[Auth] getSession timeout — esperando onAuthStateChange...');
          // NO llamar done(true) aquí — el fallback timeout lo resolverá
          return;
        }

        const { data: { session }, error } = sessionResult as any;
        if (error) { done(true); return; }

        if (session?.user) {
          const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
          if (expiresAt > 0 && expiresAt < Date.now()) {
            const { data: refreshed, error: refreshErr } = await supabase.auth.refreshSession();
            if (refreshErr || !refreshed.session) { done(true); return; }
            await processSession(refreshed.session, setUser, setAuthenticated, loadFromSupabase);
            done(); return;
          }
          await processSession(session, setUser, setAuthenticated, loadFromSupabase);
          done(); return;
        }
        done(true);
      } catch (err: any) {
        console.error('[Auth] Error:', err);
        done(true);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[Auth] onAuthStateChange →', event);

      if ((event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user && !doneRef.current) {
        try {
          // FIX [8]: Limpiar ?code= de la URL después de PKCE exchange
          if (window.location.search.includes('code=') || window.location.hash.includes('access_token')) {
            window.history.replaceState({}, '', window.location.pathname);
          }
          await processSession(session, setUser, setAuthenticated, loadFromSupabase);
        } catch (err: any) {
          setAuthError('Error al cargar tu perfil. Intenta de nuevo.');
        }
        done(); return;
      }

      if (event === 'INITIAL_SESSION' && !session && !doneRef.current) { done(true); return; }

      if (event === 'TOKEN_REFRESHED' && session?.user && doneRef.current) {
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

    // FIX [6]: Fallback timeout subido a 12 segundos
    const fallback = setTimeout(() => {
      if (!doneRef.current) {
        console.warn('[Auth] Fallback timeout alcanzado (12s)');
        done(true);
      }
    }, 12000);

    return () => { clearTimeout(fallback); subscription.unsubscribe(); };
  }, []);

  if (!authComplete) {
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

  // ═══════════════════════════════════════
  // FIX [5]: BrowserRouter envuelve TODO.
  // Antes, las rutas de /payment/* estaban dentro
  // del check de auth, así que si el usuario volvía
  // de MercadoPago con sesión expirada, no veía la
  // página de éxito/fallo — ahora sí.
  // ═══════════════════════════════════════
  return (
    <BrowserRouter>
      <Routes>
        {/* Rutas de pago: accesibles SIN autenticación */}
        <Route path="/payment/success" element={<PaymentSuccess />} />
        <Route path="/payment/failure" element={<PaymentFailure />} />
        <Route path="/payment/pending" element={<PaymentPending />} />
        <Route path="/legal" element={<LegalPages />} />

        {/* Ruta principal: requiere auth */}
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
