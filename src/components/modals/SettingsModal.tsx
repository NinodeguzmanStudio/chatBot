// ═══════════════════════════════════════
// AIdark — Settings Modal v2 (+ instrucciones personalizadas)
// ═══════════════════════════════════════

import React, { useState } from 'react';
import { X, Trash2, Globe, LogOut, BookOpen } from 'lucide-react';
import { useChatStore, useAuthStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { APP_CONFIG } from '@/lib/constants';
import { useLanguage } from '@/hooks/useLanguage';
import { LANG_OPTIONS } from '@/lib/i18n';

type Tab = 'general' | 'instructions';

export const SettingsModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { sessions, customInstructions, setCustomInstructions } = useChatStore();
  const { user, setUser, setAuthenticated } = useAuthStore();
  const { t, lang, changeLang } = useLanguage();
  const [tab, setTab] = useState<Tab>('general');
  const [instructions, setInstructions] = useState(customInstructions);
  const [saved, setSaved] = useState(false);

  if (!isOpen) return null;

  const handleClearChats = () => {
    if (confirm(t('settings.delete_confirm'))) {
      const userId = user?.id;
      if (userId) useChatStore.getState().deleteAllSessions(userId);
      else useChatStore.getState().setSessions([]);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setAuthenticated(false);
    localStorage.removeItem('aidark_authenticated');
    localStorage.removeItem('aidark_age_verified');
    localStorage.removeItem('aidark_fp_msgs');
    localStorage.removeItem('aidark_fp_date');
    onClose();
    window.location.reload();
  };

  const handleSaveInstructions = () => {
    setCustomInstructions(instructions);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const tabStyle = (active: boolean): React.CSSProperties => ({
    flex: 1, padding: '8px 12px',
    background: active ? 'var(--bg-el)' : 'transparent',
    border: 'none',
    borderBottom: `2px solid ${active ? 'var(--accent)' : 'transparent'}`,
    color: active ? 'var(--txt-pri)' : 'var(--txt-mut)',
    fontSize: 12, fontWeight: active ? 600 : 400,
    cursor: 'pointer', fontFamily: 'inherit',
    transition: 'all 0.15s',
  });

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20, animation: 'fadeIn 0.2s ease' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 440, background: 'var(--bg-surface)', border: '1px solid var(--border-def)', borderRadius: 14, overflow: 'hidden', animation: 'fadeUp 0.3s ease' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 20px 0' }}>
          <h2 style={{ fontSize: 16, fontWeight: 500, color: 'var(--txt-pri)' }}>{t('settings.title')}</h2>
          <button onClick={onClose} style={{ width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', color: 'var(--txt-mut)', cursor: 'pointer', borderRadius: 6 }}>
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', margin: '14px 20px 0', borderBottom: '1px solid var(--border-sub)' }}>
          <button style={tabStyle(tab === 'general')} onClick={() => setTab('general')}>
            ⚙️ General
          </button>
          <button style={tabStyle(tab === 'instructions')} onClick={() => setTab('instructions')}>
            <BookOpen size={12} style={{ marginRight: 4 }} />
            Instrucciones
          </button>
        </div>

        <div style={{ padding: '16px 20px 20px' }}>

          {/* ── TAB GENERAL ── */}
          {tab === 'general' && (
            <>
              {/* Info */}
              <div style={{ marginBottom: 16 }}>
                {[
                  { label: t('settings.version'), value: APP_CONFIG.version },
                  { label: t('settings.active_chats'), value: String(sessions.length) },
                  { label: t('settings.plan'), value: user?.plan || 'free', accent: true },
                  ...(user ? [{ label: 'Email', value: user.email }] : []),
                ].map((row, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 12, color: 'var(--txt-sec)' }}>{row.label}</span>
                    <span style={{ fontSize: 12, color: (row as any).accent ? 'var(--accent)' : 'var(--txt-mut)' }}>{row.value}</span>
                  </div>
                ))}
              </div>

              {/* Language */}
              <div style={{ borderTop: '1px solid var(--border-sub)', paddingTop: 16, marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                  <Globe size={13} color="var(--txt-ter)" />
                  <span style={{ fontSize: 12, color: 'var(--txt-sec)', fontWeight: 500 }}>{t('settings.language')}</span>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {LANG_OPTIONS.map((opt) => (
                    <button key={opt.id} onClick={() => changeLang(opt.id)} style={{ flex: 1, padding: '8px 10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: lang === opt.id ? 'var(--bg-hover)' : 'transparent', border: `1px solid ${lang === opt.id ? 'var(--border-str)' : 'var(--border-sub)'}`, borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.12s' }}>
                      <span style={{ fontSize: 14 }}>{opt.flag}</span>
                      <span style={{ fontSize: 11, color: lang === opt.id ? 'var(--txt-pri)' : 'var(--txt-sec)' }}>{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div style={{ borderTop: '1px solid var(--border-sub)', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button onClick={handleClearChats} style={{ width: '100%', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: '1px solid var(--border-sub)', borderRadius: 8, color: 'var(--txt-sec)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.12s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(160,81,59,0.05)'; e.currentTarget.style.color = 'var(--danger)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--txt-sec)'; }}
                >
                  <Trash2 size={13} /> {t('settings.delete_all')}
                </button>
                {user && (
                  <button onClick={handleLogout} style={{ width: '100%', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: '1px solid rgba(160,81,59,0.3)', borderRadius: 8, color: 'var(--danger)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.12s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(160,81,59,0.08)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >
                    <LogOut size={13} /> {t('settings.logout') || 'Cerrar sesión'}
                  </button>
                )}
              </div>
            </>
          )}

          {/* ── TAB INSTRUCCIONES ── */}
          {tab === 'instructions' && (
            <div>
              <p style={{ fontSize: 12, color: 'var(--txt-sec)', marginBottom: 12, lineHeight: 1.7 }}>
                Escribí cómo querés que responda la IA en todos tus chats. Por ejemplo: tu nombre, profesión, estilo de respuesta, idioma preferido, etc.
              </p>

              <div style={{ marginBottom: 8 }}>
                <label style={{ fontSize: 11, color: 'var(--txt-ter)', marginBottom: 6, display: 'block', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Instrucciones para la IA
                </label>
                <textarea
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="Ej: Respondeme siempre en español informal. Soy desarrollador web. Prefiero respuestas cortas y directas."
                  rows={6}
                  maxLength={1000}
                  style={{ width: '100%', background: 'var(--bg-el)', border: '1px solid var(--border-sub)', borderRadius: 8, padding: '10px 12px', color: 'var(--txt-pri)', fontFamily: 'inherit', fontSize: 12, lineHeight: 1.6, resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
                  onFocus={e => e.currentTarget.style.borderColor = 'var(--border-def)'}
                  onBlur={e => e.currentTarget.style.borderColor = 'var(--border-sub)'}
                />
                <div style={{ fontSize: 10, color: 'var(--txt-ghost)', textAlign: 'right', marginTop: 4 }}>
                  {instructions.length}/1000
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                {instructions && (
                  <button onClick={() => { setInstructions(''); setCustomInstructions(''); }} style={{ flex: 1, padding: '10px', background: 'none', border: '1px solid var(--border-sub)', borderRadius: 8, color: 'var(--txt-mut)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                    Limpiar
                  </button>
                )}
                <button onClick={handleSaveInstructions} style={{ flex: 2, padding: '10px', background: saved ? 'rgba(100,180,100,0.15)' : 'var(--bg-el)', border: `1px solid ${saved ? '#6b8' : 'var(--border-str)'}`, borderRadius: 8, color: saved ? '#6b8' : 'var(--txt-pri)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s' }}>
                  {saved ? '✓ Guardado' : 'Guardar'}
                </button>
              </div>

              {customInstructions && (
                <div style={{ marginTop: 12, padding: '8px 12px', borderRadius: 8, background: 'rgba(100,180,100,0.06)', border: '1px solid rgba(100,180,100,0.15)' }}>
                  <span style={{ fontSize: 11, color: '#6b8' }}>📌 Instrucciones activas en todos tus chats</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
