// ═══════════════════════════════════════
// AIdark — Main App Component (FIXED)
// ═══════════════════════════════════════

import React, { useState, useEffect } from 'react';
import { Sidebar, Header, ChatArea, AgeGate, PricingModal, SettingsModal, PrivacyModal, AuthModal } from '@/components';
import { useAuthStore, useChatStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { useIsMobile } from '@/hooks/useIsMobile';

const App: React.FC = () => {
  const { isAgeVerified, isAuthenticated, setUser, setAuthenticated, setLoading } = useAuthStore();
  const { sidebarOpen } = useChatStore();
  const [pricingOpen, setPricingOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [authComplete, setAuthComplete] = useState(false);
  const isMobile = useIsMobile();

  // Listen for Supabase auth changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
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
          }
        } catch {
          // Profile may not exist yet if Supabase is not configured
          setAuthComplete(true);
        }
      } else {
        setUser(null);
        setAuthenticated(false);
      }
      setLoading(false);
    });

    // Check if there's already a session on load
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Screen 1: Auth (login/register)
  if (!authComplete && !isAuthenticated) {
    return <AuthModal onSuccess={() => setAuthComplete(true)} />;
  }

  // Screen 2: Age gate
  if (!isAgeVerified) {
    return <AgeGate />;
  }

  // Screen 3: Main app
  return (
    <div style={{
      height: '100vh', display: 'flex',
      background: 'var(--bg-primary)', overflow: 'hidden',
    }}>
      {/* Sidebar - Desktop */}
      {!isMobile && sidebarOpen && (
        <aside style={{
          width: 260, display: 'flex', flexDirection: 'column',
          background: 'var(--bg-secondary)',
          borderRight: '1px solid var(--border-sub)',
          flexShrink: 0,
        }}>
          <Sidebar
            onOpenPricing={() => setPricingOpen(true)}
            onOpenSettings={() => setSettingsOpen(true)}
            onOpenPrivacy={() => setPrivacyOpen(true)}
          />
        </aside>
      )}

      {/* Sidebar - Mobile Overlay */}
      {isMobile && sidebarOpen && (
        <>
          <div
            onClick={() => useChatStore.getState().setSidebarOpen(false)}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
              zIndex: 99, animation: 'fadeIn 0.2s ease',
            }}
          />
          <aside style={{
            position: 'fixed', left: 0, top: 0, bottom: 0,
            width: 280, display: 'flex', flexDirection: 'column',
            background: 'var(--bg-secondary)',
            borderRight: '1px solid var(--border-sub)',
            zIndex: 100, animation: 'slideRight 0.2s ease',
          }}>
            <Sidebar
              onOpenPricing={() => setPricingOpen(true)}
              onOpenSettings={() => setSettingsOpen(true)}
              onOpenPrivacy={() => setPrivacyOpen(true)}
              isMobile
            />
          </aside>
        </>
      )}

      {/* Main content */}
      <main style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        height: '100vh', minWidth: 0,
      }}>
        <Header onOpenPricing={() => setPricingOpen(true)} />
        <ChatArea onOpenPricing={() => setPricingOpen(true)} />
      </main>

      {/* Modals */}
      <PricingModal isOpen={pricingOpen} onClose={() => setPricingOpen(false)} />
      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <PrivacyModal isOpen={privacyOpen} onClose={() => setPrivacyOpen(false)} />
    </div>
  );
};

export default App;
