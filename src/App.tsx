// ═══════════════════════════════════════
// AIdark — Main App Component
// ═══════════════════════════════════════

import React, { useState } from 'react';
import { Sidebar, Header, ChatArea, AgeGate, PricingModal } from '@/components';
import { useAuthStore } from '@/lib/store';

const App: React.FC = () => {
  const { isAgeVerified } = useAuthStore();
  const [pricingOpen, setPricingOpen] = useState(false);

  // Age gate
  if (!isAgeVerified) {
    return <AgeGate />;
  }

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        background: 'var(--bg-primary)',
        overflow: 'hidden',
      }}
    >
      {/* Sidebar */}
      <Sidebar onOpenPricing={() => setPricingOpen(true)} />

      {/* Main content */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          minWidth: 0, // Prevents flex overflow
        }}
      >
        <Header onOpenPricing={() => setPricingOpen(true)} />
        <ChatArea />
      </main>

      {/* Modals */}
      <PricingModal isOpen={pricingOpen} onClose={() => setPricingOpen(false)} />
    </div>
  );
};

export default App;
