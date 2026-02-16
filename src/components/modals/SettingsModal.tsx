// ═══════════════════════════════════════
// AIdark — Settings Modal (i18n + language)
// ═══════════════════════════════════════

import React from 'react';
import { X, Trash2, Globe } from 'lucide-react';
import { useChatStore, useAuthStore } from '@/lib/store';
import { APP_CONFIG } from '@/lib/constants';
import { useLanguage } from '@/hooks/useLanguage';
import { LANG_OPTIONS } from '@/lib/i18n';

export const SettingsModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { sessions } = useChatStore();
  const { user } = useAuthStore();
  const { t, lang, changeLang } = useLanguage();

  if (!isOpen) return null;

  const handleClearChats = () => {
    if (confirm(t('settings.delete_confirm'))) {
      const userId = user?.id;
      if (userId) {
        useChatStore.getState().deleteAllSessions(userId);
      } else {
        useChatStore.getState().setSessions([]);
      }
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
          <h2 style={{ fontSize: 16, fontWeight: 500, color: 'var(--txt-pri)' }}>{t('settings.title')}</h2>
          <button onClick={onClose} style={{ width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', color: 'var(--txt-mut)', cursor: 'pointer', borderRadius: 6 }}>
            <X size={16} />
          </button>
        </div>

        {/* Info */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--txt-sec)' }}>{t('settings.version')}</span>
            <span style={{ fontSize: 12, color: 'var(--txt-mut)' }}>{APP_CONFIG.version}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--txt-sec)' }}>{t('settings.active_chats')}</span>
            <span style={{ fontSize: 12, color: 'var(--txt-mut)' }}>{sessions.length}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--txt-sec)' }}>{t('settings.plan')}</span>
            <span style={{ fontSize: 12, color: 'var(--accent)' }}>{user?.plan || 'free'}</span>
          </div>
          {user && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--txt-sec)' }}>Email</span>
              <span style={{ fontSize: 12, color: 'var(--txt-mut)' }}>{user.email}</span>
            </div>
          )}
        </div>

        {/* Language selector */}
        <div style={{ borderTop: '1px solid var(--border-sub)', paddingTop: 16, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <Globe size={13} color="var(--txt-ter)" />
            <span style={{ fontSize: 12, color: 'var(--txt-sec)', fontWeight: 500 }}>{t('settings.language')}</span>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {LANG_OPTIONS.map((opt) => (
              <button key={opt.id} onClick={() => changeLang(opt.id)} style={{
                flex: 1, padding: '8px 10px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                background: lang === opt.id ? 'var(--bg-hover)' : 'transparent',
                border: `1px solid ${lang === opt.id ? 'var(--border-str)' : 'var(--border-sub)'}`,
                borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit',
                transition: 'all 0.12s',
              }}>
                <span style={{ fontSize: 14 }}>{opt.flag}</span>
                <span style={{ fontSize: 11, color: lang === opt.id ? 'var(--txt-pri)' : 'var(--txt-sec)' }}>
                  {opt.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div style={{ borderTop: '1px solid var(--border-sub)', paddingTop: 16 }}>
          <button onClick={handleClearChats} style={{
            width: '100%', padding: '10px 14px',
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'none', border: '1px solid var(--border-sub)', borderRadius: 8,
            color: 'var(--danger)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
            transition: 'all 0.12s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(160,81,59,0.05)'}
          onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            <Trash2 size={13} /> {t('settings.delete_all')}
          </button>
        </div>
      </div>
    </div>
  );
};
