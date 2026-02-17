// ═══════════════════════════════════════
// AIdark — Main App (ROUTER + PERSISTENCE)
// ═══════════════════════════════════════
// FIXED: Flujo completo de autenticación Google OAuth

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
  // FIX 1 — Detectar si venimos de un redirect de Google OAuth.
  // Esto evita mostrar el AuthModal mientras el code se procesa.
  // ══════════════════════════════════════════════════════════════════
  const returningFromOAuth = useRef(() => {
    const params = new URLSearchParams(window.location.search);
    const hash = window.location.hash;
    return params.has('code') || hash.includes('access_token') || hash.includes('error');
  });

  const [authReady, setAuthReady] = useState(false);
  const [authComplete, setAuthComplete] = useState(false);

  useEffect(() => {
    // ══════════════════════════════════════════════════════════════════
    // FIX 2 — ELIMINADO: exchangeCodeForSession(code) manual.
    //
    // ❌ ANTES (BUG):
    //   const code = params.get('code');
    //   if (code) supabase.auth.exchangeCodeForSession(code)...
    //
    // ¿Por qué fallaba?
    //   - supabase.ts tiene detectSessionInUrl: true
    //   - Eso hace que Supabase AUTOMÁTICAMENTE detecte el ?code= y
    //     haga el intercambio internamente
    //   - Al llamar exchangeCodeForSession() TAMBIÉN, se creaba un
    //     DOBLE intercambio: uno fallaba porque el code ya fue usado
    //   - Resultado: onAuthStateChange nunca recibía la sesión
    //
    // ✅ AHORA: Supabase lo maneja solo via detectSessionInUrl.
    // ══════════════════════════════════════════════════════════════════

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[Auth] onAuthStateChange →', event, session?.user?.email ?? 'sin sesión');

      if (session?.user) {
        try {
          // ══════════════════════════════════════════════════════════
          // FIX 3 — Retry para el profile lookup.
          //
          // ¿Por qué? El trigger on_auth_user_created en PostgreSQL
          // crea el profile, pero hay una race condition donde
          // onAuthStateChange puede dispararse ANTES de que el
          // trigger termine. Sin retry, profile = null y el código
          // intentaba un INSERT manual que fallaba por RLS.
          // ══════════════════════════════════════════════════════════
          let profile = null;

          for (let attempt = 0; attempt < 3; attempt++) {
            const { data } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();

            if (data) {
              profile = data;
              break;
            }
            // Esperar un poco: el trigger DB puede estar corriendo
            if (attempt < 2) await new Promise(r => setTimeout(r, 600));
          }

          if (profile) {
            setUser(profile);
            setAuthenticated(true);
            setAuthComplete(true);
            await loadFromSupabase(session.user.id);
          } else {
            // ══════════════════════════════════════════════════════
            // FIX 4 — Reemplazar .insert() por .upsert().
            //
            // ❌ ANTES (BUG):
            //   await supabase.from('profiles').insert(newProfile);
            //
            // Problemas:
            //   a) No existe policy RLS de INSERT → bloqueado
            //   b) Incluía campo "plan_id" que NO existe en schema
            //   c) Si el trigger ya creó el row → constraint violation
            //
            // ✅ AHORA: .upsert() con onConflict funciona tanto si
            //   el row existe como si no, y no necesita policy INSERT
            //   separada (usa UPDATE si ya existe).
            // ══════════════════════════════════════════════════════
            console.warn('[Auth] Profile no encontrado, creando via upsert...');
            const newProfile = {
              id: session.user.id,
              email: session.user.email || '',
              plan: 'free',
              // FIX 4b: Eliminado "plan_id" que no existe en el schema
              created_at: new Date().toISOString(),
              messages_used: 0,
              messages_limit: 5,
              plan_expires_at: null,
            };
            await supabase.from('profiles').upsert(newProfile, { onConflict: 'id' });
            setUser(newProfile as any);
            setAuthenticated(true);
            setAuthComplete(true);
          }
        } catch (err) {
          console.error('[Auth] Error procesando sesión:', err);
          // ══════════════════════════════════════════════════════════
          // FIX 5 — Siempre marcar authComplete en error para no
          // dejar al usuario en un loading infinito.
          // ══════════════════════════════════════════════════════════
          setAuthComplete(true);
        }
      } else {
        // ══════════════════════════════════════════════════════════════
        // FIX 6 — Marcar authReady cuando NO hay sesión.
        //
        // ❌ ANTES (BUG): Cuando onAuthStateChange emitía sin sesión
        //   (evento INITIAL_SESSION antes del code exchange), 
        //   authComplete nunca se ponía en true, y el usuario veía
        //   un estado muerto donde el AuthModal renderizaba pero el
        //   exchange estaba pendiente en background.
        //
        // ✅ AHORA: authReady indica "ya verificamos, no hay sesión".
        //   Combinado con returningFromOAuth, decidimos si mostrar
        //   loading (esperando OAuth) o el AuthModal (login normal).
        // ══════════════════════════════════════════════════════════════
        setUser(null);
        setAuthenticated(false);
        setAuthReady(true);
      }
      setLoading(false);
    });

    // Limpiar URL después del redirect OAuth (safety net)
    if (returningFromOAuth.current()) {
      const cleanup = setTimeout(() => {
        const clean = window.location.pathname;
        window.history.replaceState({}, '', clean);
      }, 3000);
      return () => { clearTimeout(cleanup); subscription.unsubscribe(); };
    }

    return () => subscription.unsubscribe();
  }, []);

  // ══════════════════════════════════════════════════════════════════
  // FIX 7 — Loading screen durante OAuth redirect.
  //
  // ❌ ANTES (BUG PRINCIPAL): Al regresar de Google, authComplete
  //   era false → se mostraba el AuthModal inmediatamente → el
  //   usuario veía la pantalla de login pensando que falló.
  //   En realidad, el code exchange estaba procesándose en background.
  //
  // ✅ AHORA: Si detectamos que venimos de un OAuth redirect
  //   (hay ?code= en la URL), mostramos un spinner. Cuando
  //   onAuthStateChange resuelve, authComplete pasa a true
  //   y la app continúa normalmente.
  // ══════════════════════════════════════════════════════════════════
  if (!authComplete) {
    // Caso 1: Venimos de OAuth redirect → mostrar loading
    // Caso 2: Aún no se resolvió la verificación inicial → loading
    if (returningFromOAuth.current() || !authReady) {
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
    // Caso 3: No hay OAuth redirect y auth check terminó sin sesión → AuthModal
    return <AuthModal onSuccess={() => setAuthComplete(true)} />;
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
