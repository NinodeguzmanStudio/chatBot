// ═══════════════════════════════════════
// AIdark — Main App (ROUTER + PERSISTENCE)
// ═══════════════════════════════════════

import React, { useState, useEffect } from 'react';
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
  const [authComplete, setAuthComplete] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (profile) {
            setUser(profile);
            setAuthenticated(true);
            setAuthComplete(true);
            await loadFromSupabase(session.user.id);
          } else {
            const newProfile = {
              id: session.user.id,
              email: session.user.email,
              plan: 'free',
              plan_id: 'free',
              created_at: new Date().toISOString(),
            };
            await supabase.from('profiles').insert(newProfile);
            setUser(newProfile);
            setAuthenticated(true);
            setAuthComplete(true);
          }
        } catch {
          setAuthComplete(true);
        }
      } else {
        setUser(null);
        setAuthenticated(false);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!authComplete) {
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

