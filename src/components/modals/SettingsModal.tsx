// ═══════════════════════════════════════
// AIdark — Settings Modal
// ═══════════════════════════════════════

import React from 'react';
import { X, Sun, Moon } from 'lucide-react';
import { useThemeStore } from '@/lib/store';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { theme, setTheme } = useThemeStore();

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 900,
        background: 'rgba(5,4,3,0.88)', backdropFilter: 'blur(12px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16, fontFamily: 'inherit', animation: 'fadeIn 0.2s ease',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 400, width: '100%',
          background: 'var(--bg-surface)', border: '1px solid var(--border-def)',
          borderRadius: 12, padding: '32px 28px',
          animation: 'slideUp 0.25s ease',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--txt-pri)' }}>Ajustes</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--txt-ter)', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        {/* Theme toggle */}
        <div style={{ marginBottom: 24 }}>
          <p style={{
            fontSize: 12, fontWeight: 600, color: 'var(--txt-ter)',
            letterSpacing: 1, textTransform: 'uppercase', marginBottom: 14,
          }}>
            Tema
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            {[
              { id: 'dark' as const, label: 'Oscuro', icon: <Moon size={16} /> },
              { id: 'light' as const, label: 'Claro', icon: <Sun size={16} /> },
            ].map((opt) => (
              <button
                key={opt.id}
                onClick={() => setTheme(opt.id)}
                style={{
                  flex: 1, padding: '12px 16px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  background: theme === opt.id ? 'var(--bg-hover)' : 'transparent',
                  border: `1px solid ${theme === opt.id ? 'var(--border-str)' : 'var(--border-def)'}`,
                  borderRadius: 8, color: theme === opt.id ? 'var(--txt-pri)' : 'var(--txt-ter)',
                  fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
                  transition: 'all 0.2s',
                }}
              >
                {opt.icon} {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Data section */}
        <div style={{ borderTop: '1px solid var(--border-sub)', paddingTop: 20 }}>
          <p style={{
            fontSize: 12, fontWeight: 600, color: 'var(--txt-ter)',
            letterSpacing: 1, textTransform: 'uppercase', marginBottom: 14,
          }}>
            Datos
          </p>
          <p style={{ fontSize: 13, color: 'var(--txt-sec)', lineHeight: 1.7, marginBottom: 12 }}>
            Tus chats se almacenan localmente y se eliminan al cerrar sesión. No guardamos historial en servidores.
          </p>
          <button
            className="transition-default"
            style={{
              width: '100%', padding: 12,
              background: 'transparent', border: '1px solid rgba(160,81,59,0.2)',
              borderRadius: 8, color: 'var(--danger)', fontSize: 12, fontWeight: 500,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(160,81,59,0.06)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            Borrar todos los chats
          </button>
        </div>
      </div>
    </div>
  );
};
