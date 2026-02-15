// ═══════════════════════════════════════
// AIdark — Settings Modal (FIXED)
// ═══════════════════════════════════════

import React from 'react';
import { X, Trash2 } from 'lucide-react';
import { useChatStore, useAuthStore } from '@/lib/store';
import { APP_CONFIG } from '@/lib/constants';

export const SettingsModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { sessions, setSessions } = useChatStore();
  const { user, resetMessages } = useAuthStore();

  if (!isOpen) return null;

  const handleClearChats = () => {
    if (confirm('¿Eliminar todos los chats? Esta acción no se puede deshacer.')) {
      setSessions([]);
    }
  };

  const handleResetMessages = () => {
    if (confirm('¿Resetear el contador de mensajes?')) {
      resetMessages();
    }
  };

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 200, padding: 20, animation: 'fadeIn 0.2s ease',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: 400,
        background: 'var(--bg-surface)', border: '1px solid var(--border-def)',
        borderRadius: 14, padding: 24, animation: 'fadeUp 0.3s ease',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 500, color: 'var(--txt-pri)' }}>Ajustes</h2>
          <button onClick={onClose} style={{
            width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'none', border: 'none', color: 'var(--txt-mut)', cursor: 'pointer', borderRadius: 6,
          }}><X size={16} /></button>
        </div>

        {/* Info */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--txt-sec)' }}>Versión</span>
            <span style={{ fontSize: 12, color: 'var(--txt-mut)' }}>{APP_CONFIG.version}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--txt-sec)' }}>Chats activos</span>
            <span style={{ fontSize: 12, color: 'var(--txt-mut)' }}>{sessions.length}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--txt-sec)' }}>Plan</span>
            <span style={{ fontSize: 12, color: 'var(--accent)' }}>{user?.plan || 'free'}</span>
          </div>
          {user && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--txt-sec)' }}>Email</span>
              <span style={{ fontSize: 12, color: 'var(--txt-mut)' }}>{user.email}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ borderTop: '1px solid var(--border-sub)', paddingTop: 16 }}>
          <button onClick={handleClearChats} style={{
            width: '100%', padding: '10px 14px', marginBottom: 8,
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'none', border: '1px solid var(--border-sub)', borderRadius: 8,
            color: 'var(--danger)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
            transition: 'all 0.12s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(160,81,59,0.05)'}
          onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            <Trash2 size={13} /> Eliminar todos los chats
          </button>
        </div>
      </div>
    </div>
  );
};
