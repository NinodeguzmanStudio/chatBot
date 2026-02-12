// ═══════════════════════════════════════
// AIdark — Header Component
// ═══════════════════════════════════════

import React from 'react';
import { PanelLeft, Plus, Star } from 'lucide-react';
import { useChatStore, useAuthStore } from '@/lib/store';
import { APP_CONFIG } from '@/lib/constants';

interface HeaderProps {
  onOpenPricing: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenPricing }) => {
  const { sidebarOpen, setSidebarOpen, createSession } = useChatStore();
  const { messagesUsed, user } = useAuthStore();

  const isPremium = user?.plan && user.plan !== 'free';
  const remaining = APP_CONFIG.freeMessageLimit - messagesUsed;

  return (
    <header
      className="flex items-center justify-between flex-shrink-0"
      style={{
        height: 50,
        padding: '0 16px',
        borderBottom: '1px solid var(--border-subtle)',
      }}
    >
      {/* Left */}
      <div className="flex items-center gap-2.5">
        {!sidebarOpen && (
          <>
            <button
              onClick={() => setSidebarOpen(true)}
              className="flex items-center justify-center rounded-md transition-default"
              style={{ width: 32, height: 32, color: 'var(--text-tertiary)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <PanelLeft size={18} />
            </button>
            <button
              onClick={() => createSession()}
              className="flex items-center justify-center rounded-md transition-default"
              style={{ width: 32, height: 32, color: 'var(--text-tertiary)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              title="Nuevo chat"
            >
              <Plus size={16} />
            </button>
          </>
        )}
        <span style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>
          AI<span style={{ color: 'var(--text-tertiary)' }}>dark</span>
        </span>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        {!isPremium && (
          <span style={{ fontSize: 11, color: 'var(--text-muted)', marginRight: 8 }}>
            {remaining > 0 ? `${remaining} / ${APP_CONFIG.freeMessageLimit} free` : 'Límite alcanzado'}
          </span>
        )}
        <button
          onClick={onOpenPricing}
          className="flex items-center gap-1.5 rounded-md transition-default"
          style={{
            padding: '6px 14px',
            background: 'var(--bg-hover)',
            border: '1px solid var(--border-default)',
            color: 'var(--text-primary)',
            fontSize: 12, fontWeight: 500,
          }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-strong)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-default)')}
        >
          <Star size={13} /> Premium
        </button>
      </div>
    </header>
  );
};
