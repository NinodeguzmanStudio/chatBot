// ═══════════════════════════════════════
// AIdark — Promo Modal (50% OFF Overlay)
// ═══════════════════════════════════════
// Aparece cuando el usuario gasta sus mensajes gratis.
// Se superpone sobre TODO con máximo impacto visual.
// Countdown de 24h real (guardado en localStorage).

import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { useIsMobile } from '@/hooks/useIsMobile';

// ── Countdown: 24h desde la primera vez que se muestra ──
const PROMO_START_KEY = 'aidark_promo_start';
const PROMO_DURATION = 24 * 60 * 60 * 1000; // 24h en ms

function getPromoRemaining(): { h: number; m: number; s: number; expired: boolean } {
  let start = localStorage.getItem(PROMO_START_KEY);
  if (!start) {
    start = String(Date.now());
    localStorage.setItem(PROMO_START_KEY, start);
  }
  const elapsed = Date.now() - Number(start);
  const remaining = Math.max(0, PROMO_DURATION - elapsed);
  if (remaining <= 0) return { h: 0, m: 0, s: 0, expired: true };
  const h = Math.floor(remaining / 3600000);
  const m = Math.floor((remaining % 3600000) / 60000);
  const s = Math.floor((remaining % 60000) / 1000);
  return { h, m, s, expired: false };
}

const pad = (n: number) => String(n).padStart(2, '0');

// ── Plan configs para la promo ──
const PROMO_PLANS = [
  {
    id: 'basic_monthly',
    name: 'Basic',
    before: '$12',
    after: '$6',
    period: '/mes',
    equivalent: '$6/mes',
    features: ['Mensajes ilimitados', '3 personajes IA', 'Historial 30 días'],
  },
  {
    id: 'pro_monthly',
    name: 'Pro',
    before: '$29.99',
    after: '$15',
    period: '/3 meses',
    equivalent: '$5/mes',
    popular: true,
    features: ['Todo en Basic', '5 personajes IA', 'Adjuntar archivos', 'Soporte prioritario'],
  },
  {
    id: 'ultra_annual',
    name: 'Ultra',
    before: '$99.99',
    after: '$50',
    period: '/año',
    equivalent: '$4.16/mes',
    features: ['Todo en Pro', 'Acceso anticipado', 'Badge exclusivo', 'Soporte VIP'],
  },
];

// ═══════════════════════════════════════════════════
// PROMO MODAL COMPONENT
// ═══════════════════════════════════════════════════
interface PromoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenPricing: () => void; // Fallback: si la promo expiró, abrir pricing normal
}

export const PromoModal: React.FC<PromoModalProps> = ({ isOpen, onClose, onOpenPricing }) => {
  const { user } = useAuthStore();
  const [countdown, setCountdown] = useState(getPromoRemaining());
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [pulse, setPulse] = useState(false);
  const [hoveredPlan, setHoveredPlan] = useState<string | null>(null);
  const isMobile = useIsMobile();

  // Countdown timer
  useEffect(() => {
    if (!isOpen) return;
    const timer = setInterval(() => {
      setCountdown(getPromoRemaining());
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen]);

  // Pulse animation
  useEffect(() => {
    if (!isOpen) return;
    const p = setInterval(() => setPulse(v => !v), 2000);
    return () => clearInterval(p);
  }, [isOpen]);

  // Si la promo expiró, redirigir a pricing normal
  useEffect(() => {
    if (isOpen && countdown.expired) {
      onClose();
      onOpenPricing();
    }
  }, [isOpen, countdown.expired]);

  const handleSubscribe = async (planId: string) => {
    if (!user) { setError('Necesitas una cuenta.'); return; }
    setLoading(planId);
    setError('');
    try {
      const res = await fetch('/api/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, userEmail: user.email, userId: user.id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Error al crear el pago.');
        setLoading(null);
        return;
      }
      const data = await res.json();
      if (data.init_point) {
        window.location.href = data.init_point;
      } else {
        setError(data.error || 'Error al crear pago');
      }
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
    }
    setLoading(null);
  };

  if (!isOpen || countdown.expired) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'rgba(0,0,0,0.88)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 14,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 520,
          background: '#0c0b0a',
          borderRadius: 24,
          border: '1px solid #222',
          position: 'relative',
          overflow: 'hidden',
          maxHeight: '96vh',
          overflowY: 'auto',
          animation: 'promoIn 0.5s cubic-bezier(0.16,1,0.3,1)',
          boxShadow: '0 0 80px rgba(139,115,85,0.15), 0 0 200px rgba(139,115,85,0.05)',
        }}
      >
        {/* ── Top glow ── */}
        <div style={{
          position: 'absolute', top: -80, left: '50%', transform: 'translateX(-50%)',
          width: 500, height: 250,
          background: 'radial-gradient(ellipse, rgba(139,115,85,0.18) 0%, rgba(139,115,85,0.05) 40%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* ── Animated top border ── */}
        <div style={{
          position: 'absolute', top: -1, left: -1, right: -1, height: 2,
          background: 'linear-gradient(90deg, transparent, #8b7355, transparent)',
          opacity: pulse ? 0.9 : 0.3,
          transition: 'opacity 1.5s ease',
        }} />

        <div style={{ position: 'relative', padding: isMobile ? '24px 16px 18px' : '28px 22px 22px' }}>

          {/* Close */}
          <button onClick={onClose} style={{
            position: 'absolute', top: 14, right: 14, width: 32, height: 32,
            borderRadius: 8, background: '#141414', border: '1px solid #222',
            color: '#555', cursor: 'pointer', fontSize: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10,
          }}>
            <X size={14} />
          </button>

          {/* ═══ HERO ═══ */}
          <div style={{ textAlign: 'center', marginBottom: 20 }}>

            {/* Badge */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '5px 14px', borderRadius: 20,
              background: 'linear-gradient(135deg, rgba(139,115,85,0.15), rgba(139,115,85,0.05))',
              border: '1px solid #8b735533',
              marginBottom: 16,
            }}>
              <div style={{
                width: 6, height: 6, borderRadius: '50%', background: '#8b7355',
                animation: 'promoPulse 2s ease infinite',
              }} />
              <span style={{
                fontSize: 10, fontWeight: 700, color: '#8b7355',
                letterSpacing: 1.5, textTransform: 'uppercase',
              }}>
                Solo 24 horas
              </span>
            </div>

            {/* Big -50% */}
            <div style={{ position: 'relative', marginBottom: 8 }}>
              <div style={{
                fontSize: isMobile ? 60 : 76, fontWeight: 900, letterSpacing: -3, lineHeight: 0.9,
                background: 'linear-gradient(180deg, #d4c5b0 0%, #8b7355 100%)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                filter: 'drop-shadow(0 0 40px rgba(139,115,85,0.35))',
              }}>
                -50%
              </div>
            </div>

            <p style={{
              fontSize: 15, color: '#fff', margin: '0 0 4px',
              fontWeight: 600, letterSpacing: -0.3,
            }}>
              Mitad de precio en todos los planes
            </p>
            <p style={{ fontSize: 12, color: '#555', margin: 0 }}>
              Mensajes ilimitados · Todos los personajes · Sin restricciones
            </p>

            {/* ── Countdown ── */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 0,
              marginTop: 18, borderRadius: 14, overflow: 'hidden',
              border: '1px solid #1a1a1a', background: '#080808',
            }}>
              <div style={{ padding: '8px 14px', background: '#0e0e0e' }}>
                <span style={{ fontSize: 10, color: '#555', fontWeight: 500, whiteSpace: 'nowrap' }}>
                  La oferta termina en
                </span>
              </div>
              <div style={{ display: 'flex', gap: 2, padding: '8px 16px', background: '#0a0a0a' }}>
                {[
                  { val: pad(countdown.h), sep: ':' },
                  { val: pad(countdown.m), sep: ':' },
                  { val: pad(countdown.s), sep: '' },
                ].map((t, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{
                      fontSize: 20, fontWeight: 800, color: '#d4c5b0',
                      fontFamily: "monospace", minWidth: 28, textAlign: 'center',
                    }}>
                      {t.val}
                    </span>
                    {t.sep && (
                      <span style={{
                        fontSize: 18, color: '#8b735566', fontWeight: 300, margin: '0 1px',
                        animation: 'promoBlink 1s step-end infinite',
                      }}>:</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ═══ PLANS ═══ */}
          {error && (
            <div style={{
              padding: '8px 12px', marginBottom: 12, borderRadius: 8,
              background: 'rgba(200,60,60,0.15)', color: '#ff6b6b', fontSize: 11,
            }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
            {PROMO_PLANS.map((plan) => {
              const isHovered = hoveredPlan === plan.id;
              const isPop = plan.popular;
              return (
                <div
                  key={plan.id}
                  onMouseEnter={() => setHoveredPlan(plan.id)}
                  onMouseLeave={() => setHoveredPlan(null)}
                  style={{
                    flex: 1, borderRadius: 16, position: 'relative',
                    padding: isPop ? '22px 14px 16px' : '20px 14px 16px',
                    minWidth: isMobile ? '100%' : 0,
                    background: isPop ? 'linear-gradient(180deg, #14110d 0%, #0e0c0a 100%)' : '#0e0e0e',
                    border: `1px solid ${isPop ? '#8b735544' : isHovered ? '#333' : '#1a1a1a'}`,
                    cursor: 'pointer',
                    transition: 'all 0.25s ease',
                    transform: isHovered && !isMobile ? 'translateY(-2px)' : 'none',
                    boxShadow: isPop ? '0 8px 32px rgba(139,115,85,0.1)' : isHovered ? '0 4px 20px rgba(0,0,0,0.3)' : 'none',
                  }}
                >
                  {/* Popular tag */}
                  {isPop && (
                    <div style={{
                      position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)',
                      background: 'linear-gradient(135deg, #8b7355, #a08460)',
                      color: '#fff', fontSize: 8, fontWeight: 700,
                      padding: '3px 12px', borderRadius: 6, letterSpacing: 1,
                      textTransform: 'uppercase', whiteSpace: 'nowrap',
                      boxShadow: '0 2px 10px rgba(139,115,85,0.3)',
                    }}>
                      Más popular
                    </div>
                  )}

                  {/* -50% badge */}
                  <div style={{
                    position: 'absolute', top: isPop ? 12 : 10, right: 10,
                    background: '#8b735518', border: '1px solid #8b735522',
                    borderRadius: 6, padding: '2px 7px',
                  }}>
                    <span style={{ fontSize: 9, fontWeight: 700, color: '#8b7355' }}>-50%</span>
                  </div>

                  <div style={{ fontSize: 11, fontWeight: 600, color: '#888', marginBottom: 12 }}>
                    {plan.name}
                  </div>

                  {/* Price */}
                  <div style={{ marginBottom: 2 }}>
                    <span style={{ fontSize: 13, color: '#444', textDecoration: 'line-through' }}>
                      {plan.before}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, marginBottom: 3 }}>
                    <span style={{
                      fontSize: 32, fontWeight: 800, letterSpacing: -1,
                      color: isPop ? '#d4c5b0' : '#fff',
                    }}>
                      {plan.after}
                    </span>
                    <span style={{ fontSize: 11, color: '#555' }}>{plan.period}</span>
                  </div>
                  <div style={{ fontSize: 10, color: '#8b7355', fontWeight: 500, marginBottom: 14 }}>
                    {plan.equivalent}
                  </div>

                  {/* Features */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
                    {plan.features.map((f, i) => (
                      <div key={i} style={{ fontSize: 10, color: '#666', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                          <path d="M3 8l3.5 3.5L13 5" stroke={isPop ? '#8b7355' : '#555'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        {f}
                      </div>
                    ))}
                  </div>

                  {/* CTA */}
                  <button
                    onClick={() => handleSubscribe(plan.id)}
                    disabled={!!loading}
                    style={{
                      width: '100%', padding: '11px 0', borderRadius: 10,
                      border: isPop ? 'none' : '1px solid #222',
                      fontFamily: 'inherit',
                      background: isPop ? 'linear-gradient(135deg, #8b7355, #6b5a42)' : isHovered ? '#1a1a1a' : 'transparent',
                      color: isPop ? '#fff' : '#777',
                      fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      transition: 'all 0.2s',
                      boxShadow: isPop ? '0 4px 16px rgba(139,115,85,0.25)' : 'none',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}
                  >
                    {loading === plan.id && <Loader2 size={13} style={{ animation: 'promoSpin 1s linear infinite' }} />}
                    {isPop ? 'Elegir Pro' : `Elegir ${plan.name}`}
                  </button>
                </div>
              );
            })}
          </div>

          {/* ── Urgency bar ── */}
          <div style={{
            background: '#080808', borderRadius: 12, padding: '12px 16px',
            border: '1px solid #1a1a1a',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%', background: '#8b7355',
                animation: 'promoPulse 2s ease infinite',
              }} />
              <span style={{ fontSize: 11, color: '#888' }}>
                <strong style={{ color: '#d4c5b0' }}>127 personas</strong> vieron esta oferta hoy
              </span>
            </div>
            <div style={{ height: 3, width: 60, background: '#1a1a1a', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{
                width: '68%', height: '100%', borderRadius: 2,
                background: 'linear-gradient(90deg, #8b7355, #d4c5b0)',
              }} />
            </div>
          </div>

          {/* Footer */}
          <p style={{ textAlign: 'center', fontSize: 10, color: '#333', margin: '14px 0 0' }}>
            Sin permanencia · Cancela cuando quieras · Precio regular tras la oferta
          </p>
        </div>

        {/* ── Animations ── */}
        <style>{`
          @keyframes promoIn {
            from { opacity: 0; transform: scale(0.92) translateY(20px); }
            to { opacity: 1; transform: scale(1) translateY(0); }
          }
          @keyframes promoPulse {
            0%, 100% { opacity: 1; box-shadow: 0 0 4px rgba(139,115,85,0.5); }
            50% { opacity: 0.5; box-shadow: 0 0 8px rgba(139,115,85,0.2); }
          }
          @keyframes promoBlink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.3; }
          }
          @keyframes promoSpin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
};
