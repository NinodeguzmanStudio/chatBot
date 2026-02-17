// ═══════════════════════════════════════
// AIdark — Main App (v3 — MANUAL AUTH FLOW)
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

// ══════════════════════════════════════════════════════════════════
// Helper: Buscar o crear profile del usuario
// ══════════════════════════════════════════════════════════════════
async function resolveUserProfile(userId: string, email: string) {
  // Intentar leer profile (con retry por race condition del trigger)
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (data) return data;
    if (attempt < 2) await new Promise(r => setTimeout(r, 500));
  }

  // No existe → crear
  const newProfile = {
    id: userId,
    email: email,
    plan: 'free',
    created_at: new Date().toISOString(),
    messages_used: 0,
    messages_limit: 5,
    plan_expires_at: null,
  };
  await supabase.from('profiles').upsert(newProfile, { onConflict: 'id' });
  return newProfile;
}

// ── Root App ──
const App: React.FC = () => {
  const { isAgeVerified, setUser, setAuthenticated, setLoading } = useAuthStore();
  const { loadFromSupabase } = useChatStore();

  const [authComplete, setAuthComplete] = useState(false);
  const [authError, setAuthError] = useState('');
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // ══════════════════════════════════════════════════════════
    // FLUJO COMPLETO — 3 pasos secuenciales, sin ambigüedad:
    //
    // Paso 1: ¿Hay ?code= en la URL? → Exchange manual
    // Paso 2: ¿Hay sesión existente? → Cargar profile  
    // Paso 3: ¿Nada? → Mostrar AuthModal
    // ══════════════════════════════════════════════════════════
    const initAuth = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');

        // ── PASO 1: OAuth code exchange ──
        if (code) {
          console.log('[Auth] Code detectado, intercambiando...');
          // Limpiar URL inmediatamente
          window.history.replaceState({}, '', window.location.pathname);

          const { data, error } = await supabase.auth.exchangeCodeForSession(code);

          if (error) {
            console.error('[Auth] Exchange falló:', error.message);
            setAuthError('Error al iniciar sesión con Google: ' + error.message);
            setAuthComplete(true);
            setLoading(false);
            return;
          }

          if (data.session?.user) {
            console.log('[Auth] Exchange exitoso:', data.session.user.email);
            const profile = await resolveUserProfile(
              data.session.user.id,
              data.session.user.email || ''
            );
            setUser(profile as any);
            setAuthenticated(true);
            setAuthComplete(true);
            setLoading(false);
            await loadFromSupabase(data.session.user.id);
            return;
          }
        }

        // ── PASO 2: Sesión existente (refresh / ya logueado) ──
        console.log('[Auth] Buscando sesión existente...');
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('[Auth] getSession error:', sessionError.message);
          setAuthError(
            sessionError.message.includes('Invalid API key')
              ? 'Error de configuración: API key de Supabase inválida.'
              : ''
          );
          setAuthComplete(true);
          setLoading(false);
          return;
        }

        if (session?.user) {
          console.log('[Auth] Sesión encontrada:', session.user.email);
          const profile = await resolveUserProfile(
            session.user.id,
            session.user.email || ''
          );
          setUser(profile as any);
          setAuthenticated(true);
          setAuthComplete(true);
          setLoading(false);
          await loadFromSupabase(session.user.id);
          return;
        }

        // ── PASO 3: No hay sesión → mostrar login ──
        console.log('[Auth] Sin sesión, mostrando login.');
        setAuthComplete(true);
        setLoading(false);

      } catch (err: any) {
        console.error('[Auth] Error inesperado:', err);
        setAuthError('Error inesperado: ' + (err?.message || 'intenta de nuevo.'));
        setAuthComplete(true);
        setLoading(false);
      }
    };

    initAuth();

    // Listener para cambios futuros (logout, token refresh, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[Auth] StateChange:', event);
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setAuthenticated(false);
        setAuthComplete(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Suscribirse al estado reactivo de auth
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // ── Render ──

  if (!authComplete) {
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
        <span style={{ fontSize: 12, color: 'var(--txt-mut)' }}>Cargando...</span>
      </div>
    );
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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
