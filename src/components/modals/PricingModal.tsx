// ═══════════════════════════════════════
// AIdark — Pricing Modal (SCARCITY + FOMO)
// ═══════════════════════════════════════

import React, { useState, useMemo } from 'react';
import { X, Loader2, Check, Zap, Crown, Gem, Lock, ImagePlus, Sparkles } from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { useIsMobile } from '@/hooks/useIsMobile';
import { t } from '@/lib/i18n';

// ══════════════════════════════════════════════════════════════════
// CONTADOR PROGRESIVO INTELIGENTE
// Calcula un número creíble basado en la fecha, que sube cada día
// y varía ligeramente por hora del día. Nunca llega al límite.
// ══════════════════════════════════════════════════════════════════
const LAUNCH_DATE = new Date('2026-02-17').getTime(); // Fecha de lanzamiento

function getOccupied(maxSlots: number, startPct: number, speedFactor: number): number {
  const now = Date.now();
  const daysSinceLaunch = Math.max(0, (now - LAUNCH_DATE) / (1000 * 60 * 60 * 24));

  // Curva logarítmica: sube rápido al inicio, se frena al acercarse al 95%
  const ceiling = maxSlots * 0.95;
  const base = maxSlots * startPct;
  const growth = (ceiling - base) * (1 - Math.exp(-daysSinceLaunch * speedFactor / 100));

  // Variación por hora del día (±0.2% del max, se siente "vivo")
  const hourSeed = Math.floor(now / (1000 * 60 * 60)); // cambia cada hora
  const hourVariation = ((Math.sin(hourSeed * 7.3) + 1) / 2) * maxSlots * 0.004;

  const result = Math.floor(base + growth + hourVariation);
  return Math.min(result, Math.floor(ceiling));
}

// ══════════════════════════════════════════════════════════════════
// PLANES
// ══════════════════════════════════════════════════════════════════
const plans = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    period: '',
    periodLabel: '',
    icon: Zap,
    color: 'var(--txt-mut)',
    features: [
      { text: '5 msgs/día', included: true },
      { text: '1 modelo', included: true },
      { text: 'Chat básico', included: true },
    ],
    scarcity: null,
  },
  {
    id: 'basic_monthly',
    name: 'Basic',
    price: 12,
    period: '/mes',
    periodLabel: 'Plan mensual',
    icon: Zap,
    color: '#6b8f71',
    features: [
      { text: 'Mensajes ilimitados', included: true },
      { text: '1 modelo', included: true },
      { text: 'Historial 7 días', included: true },
      { text: 'Velocidad normal', included: true },
      { text: 'Adjuntar archivos', included: false },
      { text: 'Tokens encriptados', included: false },
    ],
    scarcity: { max: 3000, startPct: 0.60, speed: 0.8, label: 'LIMITADO' },
    badge: 'LIMITADO',
    badgeColor: '#6b8f71',
  },
  {
    id: 'pro_quarterly',
    name: 'Pro',
    price: 29.99,
    period: '/3 meses',
    periodLabel: 'Plan por 3 meses',
    icon: Crown,
    color: '#c9944a',
    equiv: '~$10/mes',
    features: [
      { text: 'Mensajes ilimitados', included: true },
      { text: 'Todos los modelos', included: true },
      { text: 'Historial 30 días', included: true },
      { text: 'Velocidad prioritaria', included: true },
      { text: 'Adjuntar fotos y archivos', included: true },
      { text: 'Tokens encriptados', included: false },
    ],
    scarcity: { max: 5000, startPct: 0.55, speed: 0.6, label: 'POPULAR' },
    badge: 'POPULAR',
    badgeColor: '#c9944a',
  },
  {
    id: 'ultra_annual',
    name: 'Ultra',
    price: 99.99,
    period: '/año',
    periodLabel: 'Plan por 1 año',
    icon: Gem,
    color: '#8b6fc0',
    equiv: '~$8.33/mes',
    features: [
      { text: 'Mensajes ilimitados', included: true },
      { text: 'Todos los modelos', included: true },
      { text: 'Historial 90 días', included: true },
      { text: 'Velocidad máxima', included: true },
      { text: 'Adjuntar fotos y archivos', included: true },
      { text: 'Tokens encriptados', included: true, highlight: true },
      { text: 'Acceso anticipado', included: true },
    ],
    scarcity: null, // Ultra no muestra contador, es exclusivo
    badge: 'FUNDADOR',
    badgeColor: '#8b6fc0',
  },
];

// ── Scarcity Bar Component ──
const ScarcityBar: React.FC<{ max: number; startPct: number; speed: number; color: string }> = ({ max, startPct, speed, color }) => {
  const occupied = useMemo(() => getOccupied(max, startPct, speed), [max, startPct, speed]);
  const pct = Math.round((occupied / max) * 100);

  return (
    <div style={{ width: '100%', marginTop: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
        <span style={{ fontSize: 8, color: 'var(--txt-mut)' }}>🔥 {occupied.toLocaleString()} de {max.toLocaleString()}</span>
        <span style={{ fontSize: 8, color, fontWeight: 600 }}>{pct}%</span>
      </div>
      <div style={{ height: 4, background: 'var(--bg-el)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 2,
          background: `linear-gradient(90deg, ${color}, ${color}cc)`,
          width: `${pct}%`,
          transition: 'width 0.8s ease',
        }} />
      </div>
    </div>
  );
};

// ── Main Component ──
export const PricingModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const currentPlan = user?.plan || 'free';
  const isMobile = useIsMobile();

  const handleSubscribe = async (planId: string) => {
    if (planId === 'free') return;
    if (!user) { setError('Necesitas una cuenta para suscribirte.'); return; }
    setLoading(planId); setError('');
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
      if (data.init_point) { window.location.href = data.init_point; }
      else { setError(data.error || 'Error al crear pago'); }
    } catch { setError('Error de conexión. Intenta de nuevo.'); }
    setLoading(null);
  };

  if (!isOpen) return null;

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 200, padding: 12,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: 780, background: 'var(--bg-surface)',
        border: '1px solid var(--border-def)', borderRadius: 16,
        padding: isMobile ? '20px 14px' : '24px 20px',
        maxHeight: '92vh', overflowY: 'auto',
        animation: 'fadeUp 0.3s ease',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--txt-pri)', margin: 0 }}>
              {t('pricing.title') || 'Planes AIdark'}
            </h2>
            <p style={{ fontSize: 11, color: 'var(--txt-mut)', margin: '4px 0 0', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span>{t('pricing.no_limits') || 'Sin límites'}</span>·
              <span>{t('pricing.no_censorship') || 'Sin censura'}</span>·
              <span>{t('pricing.no_filters') || 'Sin filtros'}</span>·
              <span>{t('pricing.no_ads') || 'Sin anuncios'}</span>
            </p>
          </div>
          <button onClick={onClose} style={{
            width: 30, height: 30, display: 'flex', alignItems: 'center',
            justifyContent: 'center', background: 'none', border: 'none',
            color: 'var(--txt-mut)', cursor: 'pointer', flexShrink: 0,
          }}><X size={16} /></button>
        </div>

        {error && (
          <div style={{ padding: '8px 12px', marginTop: 10, borderRadius: 8, background: 'rgba(160,81,59,0.1)', color: 'var(--danger)', fontSize: 11 }}>
            {error}
          </div>
        )}

        {/* Plans Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)',
          gap: isMobile ? 8 : 10,
          marginTop: 16,
        }}>
          {plans.map(plan => {
            const isCurrent = currentPlan !== 'free' && plan.id === currentPlan;
            const Icon = plan.icon;
            const isHighlight = plan.badge === 'POPULAR';
            const isFounder = plan.badge === 'FUNDADOR';

            return (
              <div key={plan.id} style={{
                position: 'relative', padding: isMobile ? '14px 10px' : '16px 12px',
                borderRadius: 12,
                border: `1px solid ${isHighlight ? 'rgba(201,148,74,0.4)' : isFounder ? 'rgba(139,111,192,0.4)' : 'var(--border-sub)'}`,
                background: isHighlight ? 'rgba(201,148,74,0.03)' : isFounder ? 'rgba(139,111,192,0.03)' : 'var(--bg-primary)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
              }}>
                {/* Badge */}
                {plan.badge && (
                  <span style={{
                    position: 'absolute', top: -8, left: '50%', transform: 'translateX(-50%)',
                    fontSize: 7, fontWeight: 700, letterSpacing: 1, whiteSpace: 'nowrap',
                    padding: '2px 8px', borderRadius: 10,
                    background: `${plan.badgeColor}33`,
                    color: plan.badgeColor,
                  }}>{plan.badge}</span>
                )}

                <Icon size={18} style={{ color: plan.color, marginBottom: 6 }} />
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt-pri)', marginBottom: 1 }}>{plan.name}</div>
                {plan.periodLabel && (
                  <div style={{ fontSize: 8, color: 'var(--txt-ter)', marginBottom: 4 }}>{plan.periodLabel}</div>
                )}
                <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--txt-pri)', lineHeight: 1 }}>
                  {plan.price === 0 ? '$0' : `$${plan.price}`}
                </div>
                <div style={{ fontSize: 9, color: 'var(--txt-mut)', marginBottom: 1 }}>{plan.period}</div>
                {plan.equiv && (
                  <div style={{ fontSize: 9, color: plan.color, fontWeight: 500 }}>{plan.equiv}</div>
                )}

                {/* Features */}
                <div style={{ marginTop: 8, marginBottom: 8, width: '100%' }}>
                  {plan.features.map((f, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      justifyContent: 'flex-start', marginBottom: 2, paddingLeft: 2,
                    }}>
                      {f.included ? (
                        <Check size={8} style={{ color: f.highlight ? '#c9944a' : plan.color, flexShrink: 0 }} />
                      ) : (
                        <Lock size={7} style={{ color: 'var(--txt-ghost)', flexShrink: 0 }} />
                      )}
                      <span style={{
                        fontSize: 8, textAlign: 'left',
                        color: f.included
                          ? (f.highlight ? '#c9944a' : 'var(--txt-sec)')
                          : 'var(--txt-ghost)',
                        fontWeight: f.highlight ? 600 : 400,
                        textDecoration: f.included ? 'none' : 'line-through',
                      }}>
                        {f.text}
                        {f.highlight && ' 🔐'}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Scarcity Bar */}
                {plan.scarcity && (
                  <ScarcityBar
                    max={plan.scarcity.max}
                    startPct={plan.scarcity.startPct}
                    speed={plan.scarcity.speed}
                    color={plan.color}
                  />
                )}

                {/* Ultra: Founder exclusive label instead of bar */}
                {isFounder && (
                  <div style={{
                    width: '100%', marginTop: 8, padding: '5px 0',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                  }}>
                    <Sparkles size={9} style={{ color: '#8b6fc0' }} />
                    <span style={{ fontSize: 8, color: '#8b6fc0', fontWeight: 600, letterSpacing: 0.3 }}>
                      Edición limitada
                    </span>
                  </div>
                )}

                {/* CTA Button */}
                <button onClick={() => handleSubscribe(plan.id)}
                  disabled={plan.id === 'free' || !!loading || isCurrent}
                  style={{
                    width: '100%', padding: '7px 0', borderRadius: 6, border: 'none',
                    fontSize: 10, fontWeight: 600, marginTop: 6,
                    cursor: plan.id === 'free' || isCurrent ? 'default' : 'pointer',
                    fontFamily: 'inherit',
                    background: plan.id === 'free' ? 'var(--bg-el)'
                      : isCurrent ? 'var(--bg-el)'
                      : plan.color,
                    color: plan.id === 'free' || isCurrent ? 'var(--txt-mut)' : '#fff',
                    opacity: plan.id === 'free' ? 0.5 : 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                  }}
                >
                  {loading === plan.id && <Loader2 size={10} style={{ animation: 'spin 1s linear infinite' }} />}
                  {isCurrent
                    ? (t('pricing.current') || 'Plan actual')
                    : plan.id === 'free'
                      ? (t('pricing.free') || 'Gratis')
                      : (t('pricing.activate') || 'Activar')
                  }
                </button>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <p style={{ textAlign: 'center', fontSize: 9, color: 'var(--txt-ghost)', marginTop: 14 }}>
          {t('pricing.secure') || 'Pago seguro'} · {t('pricing.cancel') || 'Cancela cuando quieras'}
        </p>
      </div>
    </div>
  );
};
