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
import { Sidebar, Header, ChatArea, AgeGate, PricingModal, PromoModal, SettingsModal, PrivacyModal, AuthModal, AdminDashboard, ResetPasswordPage } from '@/components';
import { useAuthStore, useChatStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { useIsMobile } from '@/hooks/useIsMobile';
import { LegalPages } from '@/components/LegalPages';
import Landing from '@/components/Landing';
import { InstallBanner } from '@/components/modals/InstallBanner';
import { APP_CONFIG } from '@/lib/constants';
import { trackEvent, trackOnce } from '@/lib/analytics';

const AUTH_INTENT_KEY = 'aidark_auth_intent';
const ENTRY_PROMO_SESSION_KEY = 'aidark_entry_promo_seen';

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
    <p style={{ fontSize: 13, color: 'var(--txt-sec)', textAlign: 'center', maxWidth: 340, lineHeight: 1.6 }}>
      Hubo un problema con tu pago. Intenta con otra tarjeta, Yape u otro método. Si el cargo aparece en tu banco o necesitas soporte, escribe a ninodeguzmanstudio@gmail.com.
    </p>
    <a href="/" style={{ marginTop: 12, padding: '10px 24px', background: 'var(--bg-el)', color: 'var(--txt-pri)', borderRadius: 8, textDecoration: 'none', fontSize: 13, border: '1px solid var(--border-sub)' }}>Volver</a>
  </div>
);

const PaymentPending: React.FC = () => (
  <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', flexDirection: 'column', gap: 16 }}>
    <span style={{ fontSize: 48 }}>⏳</span>
    <h1 style={{ fontSize: 22, color: 'var(--txt-pri)', fontWeight: 500 }}>Pago pendiente</h1>
    <p style={{ fontSize: 13, color: 'var(--txt-sec)', textAlign: 'center', maxWidth: 340, lineHeight: 1.6 }}>
      Tu pago está siendo procesado. Te notificaremos cuando se confirme. Si no se activa después de unos minutos, contacta a ninodeguzmanstudio@gmail.com.
    </p>
    <a href="/" style={{ marginTop: 12, padding: '10px 24px', background: 'var(--bg-el)', color: 'var(--txt-pri)', borderRadius: 8, textDecoration: 'none', fontSize: 13, border: '1px solid var(--border-sub)' }}>Ir al chat</a>
  </div>
);

// ═══════════════════════════════════════
// Splash Message — mensajes progresivos durante carga
// ═══════════════════════════════════════
const SplashMessage: React.FC<{ wasAuth: boolean }> = ({ wasAuth }) => {
  const [msgIndex, setMsgIndex] = useState(0);
  const messages = wasAuth
    ? [
        'Verificando tu sesión...',
        'Cargando tu perfil...',
        'Ya casi...',
        'Sincronizando tus chats...',
      ]
    : ['Preparando AIdark...', 'Conectando...', 'Ya casi...'];

  useEffect(() => {
    const timer = setInterval(() => {
      setMsgIndex(i => Math.min(i + 1, messages.length - 1));
    }, 2500);
    return () => clearInterval(timer);
  }, []);

  return (
    <p style={{
      fontSize: 11, color: '#ffffff44', marginTop: 4,
      animation: 'fadeIn 0.5s ease',
      textAlign: 'center',
      maxWidth: 280,
      lineHeight: 1.5,
    }}>
      {messages[msgIndex]}
    </p>
  );
};

const ChatLayout: React.FC = () => {
  const { sidebarOpen } = useChatStore();
  const user = useAuthStore((s) => s.user);
  const [pricingOpen, setPricingOpen]   = useState(false);
  const [promoOpen, setPromoOpen]       = useState(false);
  const [promoVariant, setPromoVariant] = useState<'entry' | 'limit'>('limit');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen]   = useState(false);
  const [adminOpen, setAdminOpen]       = useState(false);
  const isMobile = useIsMobile();

  const openLimitPromo = () => {
    setPromoVariant('limit');
    setPromoOpen(true);
  };

  useEffect(() => {
    if (!user || (user as any)._temporary) return;
    const plan = user.plan || 'free';
    const expiresAt = (user as any).plan_expires_at || null;
    const hasActivePremium = plan !== 'free' && expiresAt && new Date(expiresAt) > new Date();
    if (hasActivePremium) return;
    if (sessionStorage.getItem(ENTRY_PROMO_SESSION_KEY) === 'true') return;

    const timer = window.setTimeout(() => {
      sessionStorage.setItem(ENTRY_PROMO_SESSION_KEY, 'true');
      setPromoVariant('entry');
      setPromoOpen(true);
    }, 1400);

    return () => window.clearTimeout(timer);
  }, [user?.id, user?.plan, (user as any)?.plan_expires_at]);

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
        <ChatArea onOpenPricing={openLimitPromo} />
      </main>
      <PricingModal isOpen={pricingOpen} onClose={() => setPricingOpen(false)} />
      <PromoModal
        isOpen={promoOpen}
        onClose={() => setPromoOpen(false)}
        onOpenPricing={() => { setPromoOpen(false); setPricingOpen(true); }}
        variant={promoVariant}
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

function buildTemporaryProfile(userId: string, email: string) {
  return {
    id: userId,
    email,
    plan: 'free',
    created_at: new Date().toISOString(),
    messages_used: 0,
    messages_limit: APP_CONFIG.freeMessageLimit,
    plan_expires_at: null,
    _temporary: true,
  };
}

async function resolveUserProfile(userId: string, email: string) {
  try {
    const result = await Promise.race([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 2500)),
    ]) as any;
    if (result?.data) {
      console.log('[Auth] Perfil cargado OK, messages_used:', result.data.messages_used);
      return result.data;
    }
  } catch { /* degradar a perfil temporal */ }

  console.warn('[Auth] Perfil aún no disponible — usando temporal en memoria');
  return buildTemporaryProfile(userId, email);
}

function retryProfileInBackground(userId: string, setUser: any) {
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
  }, 3000);

  setTimeout(() => clearInterval(retryInterval), 45000);
}

function clearAllAuthState(setUser: any, setAuthenticated: any) {
  setUser(null);
  setAuthenticated(false);
  localStorage.removeItem('aidark_authenticated');
}

let lastProcessedUserId: string | null = null;

async function processSession(
  session: any,
  setUser: any,
  setAuthenticated: any,
  setShowAuth: (open: boolean) => void,
  loadFromSupabase: any
) {
  const userId = session.user.id;
  const hadAuthIntent = localStorage.getItem(AUTH_INTENT_KEY) === 'true';

  if (lastProcessedUserId === userId) return;
  lastProcessedUserId = userId;

  const temporaryProfile = buildTemporaryProfile(userId, session.user.email || '');

  // Entramos al chat apenas Supabase confirma la sesión.
  setShowAuth(false);
  setUser(temporaryProfile as any);
  setAuthenticated(true);
  localStorage.removeItem(AUTH_INTENT_KEY);
  localStorage.setItem('aidark_was_authenticated', 'true');
  loadFromSupabase(userId).catch(console.error);
  if (session.access_token) void registerPush(session.access_token);

  try {
    const profile = await resolveUserProfile(userId, session.user.email || '');
    setUser(profile as any);
    if (hadAuthIntent) {
      void trackEvent('auth_success', {
        provider: session.user?.app_metadata?.provider || 'email',
        temporary_profile: Boolean((profile as any)._temporary),
      });
    }

    if ((profile as any)._temporary) {
      retryProfileInBackground(userId, setUser);
    }
  } catch (err) {
    console.error('[Auth] Error en processSession:', err);
    retryProfileInBackground(userId, setUser);
  }
}

const App: React.FC = () => {
  const { isAgeVerified, setUser, setAuthenticated, setLoading } = useAuthStore();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const cachedUserId = useAuthStore((s) => s.user?.id || null);
  const { loadFromSupabase } = useChatStore();
  const isPreviewChat = import.meta.env.DEV && window.location.search.includes('previewChat=1');

  // Fix: si el usuario ya se autenticó antes, mostrar app inmediatamente
  // mientras el perfil carga en background (evita spinner en usuarios recurrentes)
  const wasAuth = localStorage.getItem('aidark_was_authenticated') === 'true';
  const hasStoredAuthIntent = localStorage.getItem(AUTH_INTENT_KEY) === 'true';
  const hasCachedUser = Boolean(cachedUserId);
  const wasAuthRef = useRef(wasAuth); // preservar valor original aunque se borre de localStorage
  const [authComplete, setAuthComplete]   = useState(wasAuth || hasCachedUser);
  const [authError, setAuthError]         = useState('');
  const [showAuth, setShowAuth]           = useState(wasAuth || hasStoredAuthIntent || window.location.search.includes('code='));

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
  const [sessionChecked, setSessionChecked] = useState(hasCachedUser);

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
    localStorage.removeItem(AUTH_INTENT_KEY);
    localStorage.removeItem('aidark_was_authenticated');
    wasAuthRef.current = false; // reset para que al volver vea Landing
    lastProcessedUserId = null;
    clearAllAuthState(setUser, setAuthenticated);
    doneRef.current = false;
    setShowAuth(false);
    setSessionChecked(true);
    setAuthComplete(true);
    setLoading(false);
  };

  const openAuth = (source: string = 'app') => {
    localStorage.setItem(AUTH_INTENT_KEY, 'true');
    setShowAuth(true);
    void trackEvent('auth_opened', { source });
  };

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    trackOnce('app_open', 'app_open', { was_authenticated: wasAuth });

    // Si venimos de OAuth redirect con ?code= y NO tenemos sesión previa,
    // forzar authComplete = false para mostrar spinner mientras se procesa PKCE
    if (hasPKCECode && !wasAuth) {
      setAuthComplete(false);
    }

    // FIX v6: onAuthStateChange es la fuente PRINCIPAL
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[Auth] onAuthStateChange →', event);

      if ((event === 'INITIAL_SESSION' || event === 'SIGNED_IN') && session?.user) {
        if (window.location.search.includes('code=') || window.location.hash.includes('access_token')) {
          window.history.replaceState({}, '', window.location.pathname);
        }
        setShowAuth(false);
        processSession(session, setUser, setAuthenticated, setShowAuth, loadFromSupabase)
          .catch(() => setAuthError('Error al cargar tu perfil. Intenta de nuevo.'));
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
              setShowAuth(false);
              processSession(session, setUser, setAuthenticated, setShowAuth, loadFromSupabase)
                .catch(() => setAuthError('Error al cargar tu perfil. Intenta de nuevo.'));
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
  if (!isPreviewChat && (!authComplete || (wasAuth && !sessionChecked))) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000', flexDirection: 'column', gap: 20 }}>
        <img src="/icon-192.png" alt="AIdark" style={{ width: 80, height: 80, borderRadius: 20, animation: 'fadeIn 0.6s ease, pulse 2s ease-in-out infinite' }} />
        <span style={{ fontSize: 13, color: '#8b7355', fontWeight: 600, letterSpacing: 1 }}>AIdark</span>
        <div style={{ width: 32, height: 2, borderRadius: 2, background: '#8b735544', overflow: 'hidden', marginTop: 4 }}>
          <div style={{ width: '50%', height: '100%', background: '#8b7355', animation: 'slideLoad 1.2s ease-in-out infinite' }} />
        </div>
        <SplashMessage wasAuth={wasAuthRef.current} />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/payment/success" element={<PaymentSuccess />} />
        <Route path="/payment/failure" element={<PaymentFailure />} />
        <Route path="/payment/pending" element={<PaymentPending />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/legal" element={<LegalPages />} />

        <Route path="*" element={
          isPreviewChat
            ? <ChatLayout />
            : !isAuthenticated && !showAuth
            ? <Landing onStart={openAuth} />
            : !isAuthenticated
              ? <AuthModal onSuccess={() => {
                  localStorage.removeItem(AUTH_INTENT_KEY);
                  setShowAuth(false);
                  doneRef.current = true;
                  setSessionChecked(true);
                  setAuthComplete(true);
                }} initialError={authError} />
              : !isAgeVerified
                ? <AgeGate />
                : <ChatLayout />
        } />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
