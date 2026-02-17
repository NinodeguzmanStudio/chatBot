// ═══════════════════════════════════════
// AIdark — Main App (ROUTER + PERSISTENCE)
// ═══════════════════════════════════════

import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar, Header, ChatArea, AgeGate, PricingModal, SettingsModal, PrivacyModal, AuthModal } from '@/components';
import { useAuthStore, useChatStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { useIsMobile } from '@/hooks/useIsMobile';

// ── Payment result pages ──
const PaymentSuccess: React.FC = () => (
  <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', flexDirection: 'column', gap: 16 }}>
    <span style={{ fontSize: 48 }}>✅</span>
    <h1 style={{ fontSize: 22, color: 'var(--txt-pri)', fontWeight: 500 }}>¡Pago exitoso!</h1>
    <p style={{ fontSize: 13, color: 'var(--txt-sec)', textAlign: 'center', maxWidth: 300 }}>Tu plan premium está activo. Disfruta AIdark sin límites.</p>
    <a href="/" style={{ marginTop: 12, padding: '10px 24px', background: 'var(--accent)', color: '#fff', borderRadius: 8, textDecoration: 'none', fontSize: 13 }}>Ir al chat</a>
  </div>
);

const PaymentFailure: React.FC = () => (
  <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', flexDirection: 'column', gap: 16 }}>
    <span style={{ fontSize: 48 }}>❌</span>
    <h1 style={{ fontSize: 22, color: 'var(--txt-pri)', fontWeight: 500 }}>Pago fallido</h1>
    <p style={{ fontSize: 13, color: 'var(--txt-sec)', textAlign: 'center', maxWidth: 300 }}>Hubo un problema con tu pago. Intenta de nuevo.</p>
    <a href="/" style={{ marginTop: 12, padding: '10px 24px', background: 'var(--bg-el)', color: 'var(--txt-pri)', borderRadius: 8, textDecoration: 'none', fontSize: 13, border: '1px solid var(--border-sub)' }}>Volver</a>
  </div>
);

const PaymentPending: React.FC = () => (
  <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', flexDirection: 'column', gap: 16 }}>
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
    <div style={{ height: '100vh', display: 'flex', background: 'var(--bg-primary)', overflow: 'hidden' }}>
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
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', minWidth: 0 }}>
        <Header onOpenPricing={() => setPricingOpen(true)} />
        <ChatArea onOpenPricing={() => setPricingOpen(true)} />
      </main>
      <PricingModal isOpen={pricingOpen} onClose={() => setPricingOpen(false)} />
      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <PrivacyModal isOpen={privacyOpen} onClose={() => setPrivacyOpen(false)} />
    </div>
  );
};

// ── Root App ──
const App: React.FC = () => {
  const { isAgeVerified, setUser, setAuthenticated, setLoading } = useAuthStore();
  const { loadFromSupabase } = useChatStore();

  // ══════════════════════════════════════════════════════════════════
  // CLAVE: Capturar UNA SOLA VEZ si venimos de OAuth (al montar).
  // Antes el bug era que se re-evaluaba en cada render y si la URL
  // aún tenía ?code= el spinner giraba infinitamente.
  // ══════════════════════════════════════════════════════════════════
  const [cameFromOAuth] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const hash = window.location.hash;
    return params.has('code') || hash.includes('access_token') || hash.includes('error');
  });

  const [authComplete, setAuthComplete] = useState(false);
  const [authError, setAuthError] = useState('');
  const authProcessed = useRef(false); // evitar procesar doble

  useEffect(() => {
    // ══════════════════════════════════════════════════════════════
    // TIMEOUT DE SEGURIDAD: Si después de 10 segundos no se resuelve
    // la autenticación, dejar de mostrar el spinner y mostrar el
    // AuthModal con un error. Esto previene el "gira y gira infinito".
    // ══════════════════════════════════════════════════════════════
    const timeout = setTimeout(() => {
      if (!authProcessed.current) {
        console.error('[Auth] Timeout: la autenticación no se completó en 10s');
        setAuthError('La autenticación tardó demasiado. Intenta de nuevo.');
        setAuthComplete(true);
        setLoading(false);
        // Limpiar URL por si quedó ?code=
        window.history.replaceState({}, '', window.location.pathname);
      }
    }, 10000);

    // ══════════════════════════════════════════════════════════════
    // ELIMINADO: exchangeCodeForSession() manual.
    // Supabase con detectSessionInUrl:true lo maneja automáticamente.
    // El doble exchange era la causa raíz del fallo original.
    // ══════════════════════════════════════════════════════════════

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[Auth] onAuthStateChange →', event, session?.user?.email ?? 'sin sesión');

      if (session?.user) {
        if (authProcessed.current) return; // ya procesado, ignorar duplicados
        authProcessed.current = true;

        try {
          // Limpiar URL (quitar ?code= etc.)
          window.history.replaceState({}, '', window.location.pathname);

          // Buscar profile con retry (el trigger puede tardar)
          let profile = null;
          for (let attempt = 0; attempt < 3; attempt++) {
            const { data } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();

            if (data) { profile = data; break; }
            if (attempt < 2) await new Promise(r => setTimeout(r, 600));
          }

          if (profile) {
            setUser(profile);
          } else {
            // Fallback: crear profile via upsert
            console.warn('[Auth] Profile no encontrado, creando...');
            const newProfile = {
              id: session.user.id,
              email: session.user.email || '',
              plan: 'free',
              created_at: new Date().toISOString(),
              messages_used: 0,
              messages_limit: 5,
              plan_expires_at: null,
            };
            await supabase.from('profiles').upsert(newProfile, { onConflict: 'id' });
            setUser(newProfile as any);
          }

          setAuthenticated(true);
          setAuthComplete(true);
          await loadFromSupabase(session.user.id);
        } catch (err) {
          console.error('[Auth] Error procesando sesión:', err);
          setAuthError('Error al cargar tu perfil. Intenta de nuevo.');
          setAuthComplete(true);
        }
      } else {
        // No hay sesión → mostrar AuthModal
        // Pero solo si no es el evento INITIAL_SESSION mientras esperamos OAuth
        if (event === 'INITIAL_SESSION' && cameFromOAuth) {
          // Estamos esperando que detectSessionInUrl procese el code
          // No hacer nada aún, el timeout nos cubre si falla
          console.log('[Auth] Esperando code exchange de OAuth...');
          return;
        }

        // Realmente no hay sesión
        setUser(null);
        setAuthenticated(false);
        setAuthComplete(true);
        // Limpiar URL por si quedó basura
        if (cameFromOAuth) {
          window.history.replaceState({}, '', window.location.pathname);
        }
      }
      setLoading(false);
    });

    // Verificación inicial directa de sesión existente
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('[Auth] getSession error:', error.message);
        // Si el error es de API key, mostrarlo al usuario
        if (error.message.includes('Invalid API key') || error.message.includes('apikey')) {
          setAuthError('Error de configuración: API key de Supabase inválida. Revisa tus variables de entorno.');
        }
      }
      if (!session && !cameFromOAuth) {
        // No hay sesión y no venimos de OAuth → mostrar login directo
        setAuthComplete(true);
        setLoading(false);
      }
    });

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  // ══════════════════════════════════════════════════════════════════
  // RENDER: Decidir qué mostrar
  // ══════════════════════════════════════════════════════════════════
  if (!authComplete) {
    // Mostrar spinner mientras se procesa (con timeout de seguridad)
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: 'var(--bg-primary)',
        flexDirection: 'column', gap: 16,
      }}>
        <div style={{
          width: 32, height: 32,
          border: '2px solid var(--border-sub)',
          borderTopColor: 'var(--accent)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <span style={{ fontSize: 12, color: 'var(--txt-mut)' }}>
          Autenticando...
        </span>
      </div>
    );
  }

  // Auth resuelto pero sin sesión → AuthModal
  if (!useAuthStore.getState().isAuthenticated) {
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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
