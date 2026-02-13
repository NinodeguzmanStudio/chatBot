import React from 'react';
import { X, Sun, Moon } from 'lucide-react';
import { useThemeStore, useChatStore } from '@/lib/store';

export const SettingsModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { theme, setTheme } = useThemeStore();
  const { clearAllSessions } = useChatStore();
  if (!isOpen) return null;

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 900, background: 'rgba(5,4,3,0.88)',
      backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16, animation: 'fadeIn 0.2s ease',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        maxWidth: 380, width: '100%', background: 'var(--bg-surface)',
        border: '1px solid var(--border-sub)', borderRadius: 12,
        padding: '28px 24px', animation: 'slideUp 0.25s ease',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ fontSize: 17, fontWeight: 600, color: 'var(--txt-pri)' }}>Ajustes</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--txt-ter)', cursor: 'pointer' }}><X size={18} /></button>
        </div>

        <div style={{ marginBottom: 22 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--txt-ter)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>Tema</p>
          <div style={{ display: 'flex', gap: 8 }}>
            {[{ id: 'dark' as const, label: 'Oscuro', icon: <Moon size={15} /> }, { id: 'light' as const, label: 'Claro', icon: <Sun size={15} /> }].map(opt => (
              <button key={opt.id} onClick={() => setTheme(opt.id)} style={{
                flex: 1, padding: '11px 14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                background: theme === opt.id ? 'var(--bg-hover)' : 'transparent',
                border: `1px solid ${theme === opt.id ? 'var(--border-str)' : 'var(--border-sub)'}`,
                borderRadius: 8, color: theme === opt.id ? 'var(--txt-pri)' : 'var(--txt-ter)',
                fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
              }}>{opt.icon} {opt.label}</button>
            ))}
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--border-sub)', paddingTop: 18 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--txt-ter)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>Datos</p>
          <p style={{ fontSize: 12, color: 'var(--txt-sec)', lineHeight: 1.7, marginBottom: 12 }}>
            Chats almacenados localmente. No guardamos historial en servidores.
          </p>
          <button onClick={() => { clearAllSessions(); onClose(); }} style={{
            width: '100%', padding: 10, background: 'transparent', border: '1px solid rgba(160,81,59,0.2)',
            borderRadius: 7, color: 'var(--danger)', fontSize: 11, fontWeight: 500,
            cursor: 'pointer', fontFamily: 'inherit', transition: 'background 0.12s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(160,81,59,0.06)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >Borrar todos los chats</button>
        </div>
      </div>
    </div>
  );
};
