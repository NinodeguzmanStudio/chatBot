// ═══════════════════════════════════════
// AIdark — Header v4
// ═══════════════════════════════════════

import React from 'react';
import { PanelLeft, Plus, Star, Menu } from 'lucide-react';
import { useChatStore, useAuthStore } from '@/lib/store';

interface HeaderProps {
  onOpenPricing: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenPricing }) => {
  const { sidebarOpen, setSidebarOpen, createSession } = useChatStore();
  const { getRemainingMessages } = useAuthStore();
  const isMobile = window.innerWidth < 768;
  const remaining = getRemainingMessages();

  return (
    <div style={{
      height: 48, padding: '0 14px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      borderBottom: '1px solid var(--border-sub)', flexShrink: 0,
      background: 'var(--bg)', backdropFilter: 'blur(8px)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {(!sidebarOpen || isMobile) && (
          <button onClick={() => setSidebarOpen(true)} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 34, height: 34, background: 'none', border: 'none',
            color: 'var(--txt-ter)', cursor: 'pointer', borderRadius: 6,
            transition: 'background 0.12s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
          onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            {isMobile ? <Menu size={18} /> : <PanelLeft size={18} />}
          </button>
        )}
        {!isMobile && !sidebarOpen && (
          <button onClick={() => createSession()} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 30, height: 30, background: 'none', border: 'none',
            color: 'var(--txt-ter)', cursor: 'pointer', borderRadius: 6,
          }}><Plus size={15} /></button>
        )}
        <span style={{ fontSize: 15, fontWeight: 500, color: 'var(--txt-pri)', letterSpacing: -0.3 }}>
          AI<span style={{ color: 'var(--txt-ter)' }}>dark</span>
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {!isMobile && (
          <span style={{
            fontSize: 10, padding: '3px 8px', borderRadius: 10,
            background: remaining <= 2 ? 'rgba(160,81,59,0.1)' : 'var(--bg-el)',
            color: remaining <= 2 ? 'var(--danger)' : 'var(--txt-mut)',
          }}>
            {remaining}/5 hoy
          </span>
        )}
        <button onClick={onOpenPricing} style={{
          padding: isMobile ? '5px 10px' : '5px 12px',
          background: 'var(--bg-el)', border: '1px solid var(--border-sub)', borderRadius: 6,
          color: 'var(--txt-pri)', fontSize: 11, fontWeight: 500,
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
          fontFamily: 'inherit', transition: 'all 0.12s',
        }}
        onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-def)'}
        onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-sub)'}
        >
          <Star size={12} /> {isMobile ? 'Pro' : 'Premium'}
        </button>
      </div>
    </div>
  );
};
