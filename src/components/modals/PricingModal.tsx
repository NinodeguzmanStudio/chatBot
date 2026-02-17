import React, { useState } from 'react';
import { X, Loader2, Check, Zap, Crown, Gem } from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { t } from '@/lib/i18n';

const plans = [
  {
    id: 'free', name: 'Free', price: 0, period: '',
    icon: Zap, color: 'var(--txt-mut)',
    features: ['5 msgs/day', '1 model', 'Basic chat'],
    months: 0,
  },
  {
    id: 'basic_monthly', name: 'Basic', price: 12, period: '/mo',
    icon: Zap, color: '#6b8f71',
    features: ['Unlimited msgs', '1 model', 'Chat history 7d'],
    months: 1, badge: null,
  },
  {
    id: 'pro_quarterly', name: 'Pro', price: 29.99, period: '/3mo',
    icon: Crown, color: '#c9944a',
    features: ['Unlimited msgs', 'All models', 'Priority speed', 'Chat history 30d'],
    months: 3, badge: 'POPULAR', equiv: '$10/mo',
  },
  {
    id: 'ultra_annual', name: 'Ultra', price: 99.99, period: '/yr',
    icon: Gem, color: '#8b6fc0',
    features: ['Unlimited msgs', 'All models', 'Max speed', 'Chat history 90d', 'Early access'],
    months: 12, badge: 'BEST', equiv: '$8.33/mo',
  },
];

export const PricingModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const currentPlan = user?.plan || 'free';

  const handleSubscribe = async (planId: string) => {
    if (planId === 'free') return;
    if (!user) { setError(t('pricing.need_account') || 'Necesitas cuenta para suscribirte.'); return; }
    setLoading(planId); setError('');
    try {
      const res = await fetch('/api/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, userEmail: user.email, userId: user.id }),
      });
      const data = await res.json();
      if (data.init_point) { window.location.href = data.init_point; }
      else { setError(data.error || 'Error al crear pago'); }
    } catch { setError('Error de conexión'); }
    setLoading(null);
  };

  if (!isOpen) return null;

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 720, background: 'var(--bg-surface)', border: '1px solid var(--border-def)', borderRadius: 16, padding: '24px 20px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--txt-pri)', margin: 0 }}>
              {t('pricing.title') || 'Desbloquea AIdark'}
            </h2>
            <p style={{ fontSize: 11, color: 'var(--txt-mut)', margin: '4px 0 0 0', display: 'flex', gap: 8 }}>
              <span>{t('pricing.no_limits') || 'Sin límites'}</span>
              <span>·</span>
              <span>{t('pricing.no_censorship') || 'Sin censura'}</span>
              <span>·</span>
              <span>{t('pricing.no_filters') || 'Sin filtros'}</span>
              <span>·</span>
              <span>{t('pricing.no_ads') || 'Sin anuncios'}</span>
            </p>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', color: 'var(--txt-mut)', cursor: 'pointer' }}><X size={16} /></button>
        </div>

        {error && <div style={{ padding: '8px 12px', marginBottom: 12, borderRadius: 8, background: 'rgba(160,81,59,0.1)', color: 'var(--danger)', fontSize: 11 }}>{error}</div>}

        {/* Plans grid — 4 columns */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginTop: 16 }}>
          {plans.map(plan => {
            const isCurrent = currentPlan !== 'free' && plan.id !== 'free' && currentPlan === plan.id;
            const Icon = plan.icon;
            return (
              <div key={plan.id} style={{
                position: 'relative', padding: '16px 12px', borderRadius: 12,
                border: `1px solid ${plan.badge === 'POPULAR' ? 'rgba(201,148,74,0.4)' : 'var(--border-sub)'}`,
                background: plan.badge === 'POPULAR' ? 'rgba(201,148,74,0.04)' : 'var(--bg-primary)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
              }}>
                {plan.badge && (
                  <span style={{
                    position: 'absolute', top: -8, left: '50%', transform: 'translateX(-50%)',
                    fontSize: 8, fontWeight: 700, letterSpacing: 1,
                    padding: '2px 8px', borderRadius: 10,
                    background: plan.badge === 'POPULAR' ? 'rgba(201,148,74,0.2)' : 'rgba(139,111,192,0.2)',
                    color: plan.badge === 'POPULAR' ? '#c9944a' : '#8b6fc0',
                  }}>{plan.badge}</span>
                )}
                <Icon size={18} style={{ color: plan.color, marginBottom: 8 }} />
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--txt-pri)', marginBottom: 4 }}>{plan.name}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--txt-pri)', lineHeight: 1 }}>
                  {plan.price === 0 ? '$0' : `$${plan.price}`}
                </div>
                <div style={{ fontSize: 9, color: 'var(--txt-mut)', marginBottom: 2 }}>{plan.period}</div>
                {plan.equiv && <div style={{ fontSize: 9, color: plan.color, fontWeight: 500 }}>{plan.equiv}</div>}

                <div style={{ marginTop: 10, marginBottom: 12, width: '100%' }}>
                  {plan.features.map((f, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-start', marginBottom: 3, paddingLeft: 4 }}>
                      <Check size={9} style={{ color: plan.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 9, color: 'var(--txt-sec)', textAlign: 'left' }}>{f}</span>
                    </div>
                  ))}
                </div>

                <button onClick={() => handleSubscribe(plan.id)} disabled={plan.id === 'free' || !!loading || isCurrent}
                  style={{
                    width: '100%', padding: '7px 0', borderRadius: 6, border: 'none', fontSize: 10, fontWeight: 600,
                    cursor: plan.id === 'free' || isCurrent ? 'default' : 'pointer', fontFamily: 'inherit',
                    background: plan.id === 'free' ? 'var(--bg-el)' : isCurrent ? 'var(--bg-el)' : plan.color,
                    color: plan.id === 'free' || isCurrent ? 'var(--txt-mut)' : '#fff',
                    opacity: plan.id === 'free' ? 0.5 : 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                  }}>
                  {loading === plan.id && <Loader2 size={10} style={{ animation: 'spin 1s linear infinite' }} />}
                  {isCurrent ? (t('pricing.current') || 'Actual') : plan.id === 'free' ? (t('pricing.free') || 'Gratis') : (t('pricing.activate') || 'Activar')}
                </button>
              </div>
            );
          })}
        </div>

        <p style={{ textAlign: 'center', fontSize: 9, color: 'var(--txt-ghost)', marginTop: 14 }}>
          {t('pricing.secure') || 'Pago seguro con MercadoPago'} · {t('pricing.cancel') || 'Cancela cuando quieras'}
        </p>
      </div>
    </div>
  );
};
