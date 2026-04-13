// ═══════════════════════════════════════
// AIdark — Settings Modal
// src/components/modals/SettingsModal.tsx
// MEJORAS:
//   [1] Tab "Mi Plan" — ver plan actual, fecha vencimiento, upgrade CTA
//   [2] Tab "Memoria" — UI completa para gestionar memoria persistente
//   [3] Alerta de vencimiento próximo (menos de 7 días)
//   [4] Código de referido visible con botón copiar
// ═══════════════════════════════════════

import React, { useState } from 'react';
import { X, Trash2, Globe, LogOut, BookOpen, Crown, Brain, Copy, Check, AlertTriangle } from 'lucide-react';
import { useChatStore, useAuthStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { APP_CONFIG } from '@/lib/constants';
import { useLanguage } from '@/hooks/useLanguage';
import { LANG_OPTIONS } from '@/lib/i18n';
import { hasActivePremiumAccess } from '@/types';

type Tab = 'general' | 'plan' | 'memoria' | 'instructions';

const MEMORY_KEY = 'aidark_memory';

const PLAN_LABELS: Record<string, string> = {
  free:               'Plan Gratuito',
  premium_monthly:    'Basic Mensual',
  premium_quarterly:  'Pro Trimestral',
  premium_annual:     'Ultra Anual',
  basic_monthly:      'Basic Mensual',
  pro_quarterly:      'Pro Trimestral',
  ultra_annual:       'Ultra Anual',
};

const PLAN_COLORS: Record<string, string> = {
  free:              '#5a4a3a',
  premium_monthly:   '#e67e22',
  premium_quarterly: '#2eaadc',
  premium_annual:    '#9b59b6',
  basic_monthly:     '#e67e22',
  pro_quarterly:     '#2eaadc',
  ultra_annual:      '#9b59b6',
};

function getDaysRemaining(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  const diff = new Date(expiresAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('es-AR', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
}

export const SettingsModal: React.FC<{ isOpen: boolean; onClose: () => void; onOpenPricing?: () => void }> = ({
  isOpen, onClose, onOpenPricing,
}) => {
  const { sessions, customInstructions, setCustomInstructions } = useChatStore();
  const { user, setUser, setAuthenticated } = useAuthStore();
  const { t, lang, changeLang } = useLanguage();

  const [tab, setTab]               = useState<Tab>('general');
  const [instructions, setInstructions] = useState(customInstructions);
  const [memory, setMemory]         = useState(() => localStorage.getItem(MEMORY_KEY) || '');
  const [saved, setSaved]           = useState(false);
  const [memorySaved, setMemorySaved] = useState(false);
  const [copied, setCopied]         = useState(false);

  if (!isOpen) return null;

  const plan        = user?.plan || 'free';
  const freeLimit   = user?.messages_limit && user.messages_limit > 0
    ? user.messages_limit
    : APP_CONFIG.freeMessageLimit;
  const expiresAt   = (user as any)?.plan_expires_at || null;
  const isPremium   = hasActivePremiumAccess(plan, expiresAt);
  const daysLeft    = getDaysRemaining(expiresAt);
  const isExpiringSoon = daysLeft !== null && daysLeft <= 7 && daysLeft > 0;
  const isExpired      = daysLeft === 0;
  const planColor   = PLAN_COLORS[plan] || '#5a4a3a';
  const planLabel   = PLAN_LABELS[plan] || 'Gratuito';
  const referralCode = (user as any)?.referral_code || null;

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
    localStorage.removeItem('aidark_auth_intent');
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

  const handleSaveMemory = () => {
    if (memory.trim()) {
      localStorage.setItem(MEMORY_KEY, memory.trim());
    } else {
      localStorage.removeItem(MEMORY_KEY);
    }
    setMemorySaved(true);
    setTimeout(() => setMemorySaved(false), 2000);
  };

  const handleClearMemory = () => {
    setMemory('');
    localStorage.removeItem(MEMORY_KEY);
  };

  const handleCopyReferral = () => {
    if (!referralCode) return;
    const link = `${window.location.origin}?ref=${referralCode}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const tabStyle = (active: boolean): React.CSSProperties => ({
    flex: 1, padding: '8px 6px',
    background: active ? 'var(--bg-el)' : 'transparent',
    border: 'none',
    borderBottom: `2px solid ${active ? 'var(--accent)' : 'transparent'}`,
    color: active ? 'var(--txt-pri)' : 'var(--txt-mut)',
    fontSize: 11, fontWeight: active ? 600 : 400,
    cursor: 'pointer', fontFamily: 'inherit',
    transition: 'all 0.15s',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
  });

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 200, padding: 20, animation: 'fadeIn 0.2s ease',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: 460,
        background: 'var(--bg-surface)', border: '1px solid var(--border-def)',
        borderRadius: 14, overflow: 'hidden', animation: 'fadeUp 0.3s ease',
      }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 20px 0' }}>
          <h2 style={{ fontSize: 16, fontWeight: 500, color: 'var(--txt-pri)' }}>
            {t('settings.title')}
          </h2>
          <button onClick={onClose} style={{
            width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'none', border: 'none', color: 'var(--txt-mut)', cursor: 'pointer', borderRadius: 6,
          }}>
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', margin: '14px 20px 0', borderBottom: '1px solid var(--border-sub)' }}>
          <button style={tabStyle(tab === 'general')} onClick={() => setTab('general')}>
            ⚙️ General
          </button>
          <button style={tabStyle(tab === 'plan')} onClick={() => setTab('plan')}>
            <Crown size={11} /> Plan
            {(isExpiringSoon || isExpired) && (
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: isExpired ? '#e05555' : '#e67e22', marginLeft: 2 }} />
            )}
          </button>
          <button style={tabStyle(tab === 'memoria')} onClick={() => setTab('memoria')}>
            <Brain size={11} /> Memoria
          </button>
          <button style={tabStyle(tab === 'instructions')} onClick={() => setTab('instructions')}>
            <BookOpen size={11} /> Instruc.
          </button>
        </div>

        <div style={{ padding: '16px 20px 20px', maxHeight: '65vh', overflowY: 'auto' }}>

          {/* ── TAB GENERAL ── */}
          {tab === 'general' && (
            <>
              <div style={{ marginBottom: 16 }}>
                {[
                  { label: t('settings.version'),     value: APP_CONFIG.version },
                  { label: t('settings.active_chats'), value: String(sessions.length) },
                  { label: t('settings.plan'),         value: planLabel, accent: true },
                  ...(user ? [{ label: 'Email', value: user.email }] : []),
                ].map((row, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 12, color: 'var(--txt-sec)' }}>{row.label}</span>
                    <span style={{ fontSize: 12, color: (row as any).accent ? planColor : 'var(--txt-mut)' }}>
                      {row.value}
                    </span>
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
                    <button key={opt.id} onClick={() => changeLang(opt.id)} style={{
                      flex: 1, padding: '8px 10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      background: lang === opt.id ? 'var(--bg-hover)' : 'transparent',
                      border: `1px solid ${lang === opt.id ? 'var(--border-str)' : 'var(--border-sub)'}`,
                      borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.12s',
                    }}>
                      <span style={{ fontSize: 14 }}>{opt.flag}</span>
                      <span style={{ fontSize: 11, color: lang === opt.id ? 'var(--txt-pri)' : 'var(--txt-sec)' }}>{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div style={{ borderTop: '1px solid var(--border-sub)', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button onClick={handleClearChats} style={{
                  width: '100%', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8,
                  background: 'none', border: '1px solid var(--border-sub)', borderRadius: 8,
                  color: 'var(--txt-sec)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.12s',
                }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(160,81,59,0.05)'; e.currentTarget.style.color = 'var(--danger)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--txt-sec)'; }}
                >
                  <Trash2 size={13} /> {t('settings.delete_all')}
                </button>

                {user && (
                  <button onClick={handleLogout} style={{
                    width: '100%', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8,
                    background: 'none', border: '1px solid rgba(160,81,59,0.3)', borderRadius: 8,
                    color: 'var(--danger)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.12s',
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(160,81,59,0.08)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >
                    <LogOut size={13} /> {t('settings.logout') || 'Cerrar sesión'}
                  </button>
                )}
              </div>
            </>
          )}

          {/* ── TAB MI PLAN ── */}
          {tab === 'plan' && (
            <div>
              {/* Plan card */}
              <div style={{
                borderRadius: 12, padding: '16px', marginBottom: 16,
                background: `${planColor}11`,
                border: `1px solid ${planColor}33`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 11, color: planColor, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
                      Plan activo
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--txt-pri)' }}>
                      {planLabel}
                    </div>
                  </div>
                  <Crown size={24} color={planColor} />
                </div>

                {isPremium && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 11, color: 'var(--txt-sec)' }}>Vence el</span>
                      <span style={{ fontSize: 11, color: 'var(--txt-pri)', fontWeight: 500 }}>
                        {formatDate(expiresAt)}
                      </span>
                    </div>
                    {daysLeft !== null && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 11, color: 'var(--txt-sec)' }}>Días restantes</span>
                        <span style={{
                          fontSize: 11, fontWeight: 700,
                          color: isExpired ? '#e05555' : isExpiringSoon ? '#e67e22' : '#6b8a5e',
                        }}>
                          {isExpired ? 'Expirado' : `${daysLeft} días`}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {plan === 'free' && (
                  <div style={{ fontSize: 11, color: 'var(--txt-sec)', lineHeight: 1.6 }}>
                    {freeLimit} mensajes diarios · Sin imágenes · Historial 7 días
                  </div>
                )}
              </div>

              {/* Alerta vencimiento */}
              {(isExpiringSoon || isExpired) && (
                <div style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px',
                  borderRadius: 8, marginBottom: 16,
                  background: isExpired ? 'rgba(180,60,60,0.08)' : 'rgba(230,126,34,0.08)',
                  border: `1px solid ${isExpired ? 'rgba(180,60,60,0.3)' : 'rgba(230,126,34,0.3)'}`,
                }}>
                  <AlertTriangle size={14} color={isExpired ? '#e05555' : '#e67e22'} style={{ marginTop: 1, flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: isExpired ? '#e08888' : '#e67e22', lineHeight: 1.6 }}>
                    {isExpired
                      ? 'Tu plan expiró. Renovalo para seguir generando imágenes y usando todas las funciones.'
                      : `Tu plan vence en ${daysLeft} días. Renovalo para no perder acceso premium.`}
                  </span>
                </div>
              )}

              {/* Upgrade / Renovar button */}
              {onOpenPricing && (
                <button onClick={() => { onClose(); setTimeout(() => onOpenPricing(), 100); }} style={{
                  width: '100%', padding: '12px', borderRadius: 10, border: 'none',
                  background: isPremium && !isExpiringSoon && !isExpired
                    ? 'var(--bg-el)'
                    : `linear-gradient(135deg, ${planColor}, ${planColor}aa)`,
                  color: isPremium && !isExpiringSoon && !isExpired ? 'var(--txt-sec)' : '#fff',
                  fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                  marginBottom: 16,
                }}>
                  {isExpired ? '🔄 Renovar plan' : isPremium ? '⬆️ Cambiar plan' : '🔓 Hacerse Premium'}
                </button>
              )}

              {/* Beneficios por plan */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: 'var(--txt-ter)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Incluido en tu plan
                </div>
                {(plan === 'free'
                  ? [`${freeLimit} mensajes/día`, 'Historial 7 días', '3 personajes básicos']
                  : ['Mensajes ilimitados', 'Historial 90 días', 'Todos los personajes', 'Generación de imágenes sin censura']
                ).map((feature, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: planColor, flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: 'var(--txt-sec)' }}>{feature}</span>
                  </div>
                ))}
              </div>

              {/* Código de referido */}
              {referralCode && (
                <div style={{ borderTop: '1px solid var(--border-sub)', paddingTop: 14 }}>
                  <div style={{ fontSize: 11, color: 'var(--txt-ter)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Tu código de referido
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <div style={{
                      flex: 1, padding: '8px 12px', borderRadius: 8,
                      background: 'var(--bg-el)', border: '1px solid var(--border-sub)',
                      fontSize: 13, fontWeight: 700, color: 'var(--txt-pri)', letterSpacing: 2,
                      fontFamily: 'monospace',
                    }}>
                      {referralCode}
                    </div>
                    <button onClick={handleCopyReferral} style={{
                      padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-sub)',
                      background: copied ? 'rgba(100,180,100,0.1)' : 'var(--bg-el)',
                      color: copied ? '#6b8' : 'var(--txt-sec)',
                      fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
                      display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap',
                    }}>
                      {copied ? <Check size={12} /> : <Copy size={12} />}
                      {copied ? 'Copiado' : 'Copiar link'}
                    </button>
                  </div>
                  <p style={{ fontSize: 10, color: 'var(--txt-ghost)', marginTop: 6, lineHeight: 1.5 }}>
                    Compartí tu link. Cuando alguien se suscriba con tu código, ambos obtienen beneficios.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── TAB MEMORIA ── */}
          {tab === 'memoria' && (
            <div>
              <p style={{ fontSize: 12, color: 'var(--txt-sec)', marginBottom: 14, lineHeight: 1.7 }}>
                La memoria persiste entre conversaciones. AIdark la recordará en todos tus chats automáticamente.
                Podés escribir tu nombre, profesión, preferencias, contexto personal, etc.
              </p>

              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 11, color: 'var(--txt-ter)', marginBottom: 6, display: 'block', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Qué debe recordar AIdark sobre vos
                </label>
                <textarea
                  value={memory}
                  onChange={(e) => setMemory(e.target.value)}
                  placeholder={`Ej:\nMe llamo Carlos, soy diseñador gráfico de México.\nHablo español informal.\nMe gustan las respuestas cortas y directas.\nTengo 28 años y trabajo con startups de tecnología.`}
                  rows={7}
                  maxLength={2000}
                  style={{
                    width: '100%', background: 'var(--bg-el)', border: '1px solid var(--border-sub)',
                    borderRadius: 8, padding: '10px 12px', color: 'var(--txt-pri)',
                    fontFamily: 'inherit', fontSize: 12, lineHeight: 1.6, resize: 'vertical',
                    outline: 'none', boxSizing: 'border-box',
                  }}
                  onFocus={e => e.currentTarget.style.borderColor = 'var(--border-def)'}
                  onBlur={e => e.currentTarget.style.borderColor = 'var(--border-sub)'}
                />
                <div style={{ fontSize: 10, color: 'var(--txt-ghost)', textAlign: 'right', marginTop: 4 }}>
                  {memory.length}/2000
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                {memory && (
                  <button onClick={handleClearMemory} style={{
                    flex: 1, padding: '10px', background: 'none',
                    border: '1px solid var(--border-sub)', borderRadius: 8,
                    color: 'var(--txt-mut)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
                  }}>
                    🗑 Limpiar
                  </button>
                )}
                <button onClick={handleSaveMemory} style={{
                  flex: 2, padding: '10px',
                  background: memorySaved ? 'rgba(100,180,100,0.15)' : 'var(--bg-el)',
                  border: `1px solid ${memorySaved ? '#6b8' : 'var(--border-str)'}`,
                  borderRadius: 8, color: memorySaved ? '#6b8' : 'var(--txt-pri)',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s',
                }}>
                  {memorySaved ? '✓ Memoria guardada' : '💾 Guardar memoria'}
                </button>
              </div>

              {localStorage.getItem(MEMORY_KEY) && (
                <div style={{
                  padding: '8px 12px', borderRadius: 8,
                  background: 'rgba(100,180,100,0.06)', border: '1px solid rgba(100,180,100,0.2)',
                }}>
                  <span style={{ fontSize: 11, color: '#6b8' }}>
                    🧠 Memoria activa — AIdark la usa en todos tus chats
                  </span>
                </div>
              )}

              <div style={{ marginTop: 14, padding: '10px 12px', borderRadius: 8, background: 'var(--bg-el)', border: '1px solid var(--border-sub)' }}>
                <div style={{ fontSize: 11, color: 'var(--txt-ter)', marginBottom: 6, fontWeight: 500 }}>
                  💡 Sugerencias de qué escribir:
                </div>
                {[
                  'Tu nombre y origen',
                  'Tu profesión o área de trabajo',
                  'Idioma y estilo preferido (formal/informal)',
                  'Intereses o temas que explorás frecuentemente',
                  'Contexto de proyectos actuales',
                ].map((s, i) => (
                  <div key={i} style={{ fontSize: 11, color: 'var(--txt-mut)', marginBottom: 3 }}>
                    · {s}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── TAB INSTRUCCIONES ── */}
          {tab === 'instructions' && (
            <div>
              <p style={{ fontSize: 12, color: 'var(--txt-sec)', marginBottom: 12, lineHeight: 1.7 }}>
                Instrucciones que se aplican al inicio de cada conversación nueva.
                A diferencia de la memoria, esto define el <em>comportamiento</em> de la IA.
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
                  style={{
                    width: '100%', background: 'var(--bg-el)', border: '1px solid var(--border-sub)',
                    borderRadius: 8, padding: '10px 12px', color: 'var(--txt-pri)',
                    fontFamily: 'inherit', fontSize: 12, lineHeight: 1.6, resize: 'vertical',
                    outline: 'none', boxSizing: 'border-box',
                  }}
                  onFocus={e => e.currentTarget.style.borderColor = 'var(--border-def)'}
                  onBlur={e => e.currentTarget.style.borderColor = 'var(--border-sub)'}
                />
                <div style={{ fontSize: 10, color: 'var(--txt-ghost)', textAlign: 'right', marginTop: 4 }}>
                  {instructions.length}/1000
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                {instructions && (
                  <button onClick={() => { setInstructions(''); setCustomInstructions(''); }} style={{
                    flex: 1, padding: '10px', background: 'none',
                    border: '1px solid var(--border-sub)', borderRadius: 8,
                    color: 'var(--txt-mut)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
                  }}>
                    Limpiar
                  </button>
                )}
                <button onClick={handleSaveInstructions} style={{
                  flex: 2, padding: '10px',
                  background: saved ? 'rgba(100,180,100,0.15)' : 'var(--bg-el)',
                  border: `1px solid ${saved ? '#6b8' : 'var(--border-str)'}`,
                  borderRadius: 8, color: saved ? '#6b8' : 'var(--txt-pri)',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s',
                }}>
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
