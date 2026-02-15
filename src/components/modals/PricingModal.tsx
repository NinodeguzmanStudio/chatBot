// ═══════════════════════════════════════
// AIdark — Pricing Modal (FIXED + MercadoPago)
// ═══════════════════════════════════════

import React, { useState } from 'react';
import { X, Check, Loader2, Crown } from 'lucide-react';
import { PRICING_PLANS } from '@/lib/constants';
import { useAuthStore } from '@/lib/store';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PricingModal: React.FC<PricingModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubscribe = async (planId: string) => {
    if (planId === 'free') return;

    if (!user) {
      setError('Necesitas una cuenta para suscribirte. Regístrate primero.');
      return;
    }

    setLoading(planId);
    setError('');

    try {
      const res = await fetch('/api/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan_id: planId,
          user_id: user.id,
          user_email: user.email,
        }),
      });

      const data = await res.json();

      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        setError(data.error || 'Error al crear el pago');
      }
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setLoading(null);
    }
  };

  const currentPlan = user?.plan || 'free';

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 200, padding: 20, animation: 'fadeIn 0.2s ease',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: 720,
        background: 'var(--bg-surface)', border: '1px solid var(--border-def)',
        borderRadius: 14, padding: 28, animation: 'fadeUp 0.3s ease',
        maxHeight: '90vh', overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 500, color: 'var(--txt-pri)', marginBottom: 4 }}>
              <Crown size={18} style={{ display: 'inline', marginRight: 8, verticalAlign: 'middle' }} />
              Planes AIdark
            </h2>
            <p style={{ fontSize: 12, color: 'var(--txt-mut)' }}>Desbloquea todo el potencial sin censura</p>
          </div>
          <button onClick={onClose} style={{
            width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'none', border: 'none', color: 'var(--txt-mut)', cursor: 'pointer', borderRadius: 6,
          }}><X size={16} /></button>
        </div>

        {error && (
          <div style={{
            padding: '10px 12px', marginBottom: 16, borderRadius: 8,
            background: 'rgba(160,81,59,0.1)', border: '1px solid rgba(160,81,59,0.2)',
            color: 'var(--danger)', fontSize: 12,
          }}>
            {error}
          </div>
        )}

        {/* Plans Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: 12,
        }}>
          {PRICING_PLANS.map((plan) => {
            const isCurrent = currentPlan === plan.id;
            const isHighlight = plan.highlight;

            return (
              <div key={plan.id} style={{
                padding: 18, borderRadius: 10,
                background: isHighlight ? 'var(--bg-hover)' : 'var(--bg-primary)',
                border: `1px solid ${isHighlight ? 'var(--accent)' : 'var(--border-sub)'}`,
                display: 'flex', flexDirection: 'column',
                position: 'relative',
              }}>
                {isHighlight && (
                  <span style={{
                    position: 'absolute', top: -8, left: '50%', transform: 'translateX(-50%)',
                    padding: '2px 10px', borderRadius: 10,
                    background: 'var(--accent)', color: '#fff',
                    fontSize: 9, fontWeight: 600, letterSpacing: 0.5,
                  }}>
                    POPULAR
                  </span>
                )}

                <h3 style={{ fontSize: 14, fontWeight: 500, color: 'var(--txt-pri)', marginBottom: 8 }}>
                  {plan.name}
                </h3>
                <div style={{ marginBottom: 14 }}>
                  <span style={{ fontSize: 24, fontWeight: 600, color: 'var(--txt-pri)' }}>{plan.price}</span>
                  <span style={{ fontSize: 11, color: 'var(--txt-mut)' }}>{plan.period}</span>
                </div>

                <div style={{ flex: 1, marginBottom: 14 }}>
                  {plan.features.map((f, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <Check size={11} color="var(--accent)" />
                      <span style={{ fontSize: 11, color: 'var(--txt-sec)' }}>{f}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={isCurrent || loading === plan.id || plan.id === 'free'}
                  style={{
                    width: '100%', padding: '9px 12px',
                    background: isCurrent ? 'var(--bg-el)' : isHighlight ? 'var(--accent)' : 'var(--bg-el)',
                    border: `1px solid ${isHighlight ? 'var(--accent)' : 'var(--border-sub)'}`,
                    borderRadius: 7,
                    color: isCurrent ? 'var(--txt-mut)' : isHighlight ? '#fff' : 'var(--txt-pri)',
                    fontSize: 11, fontWeight: 500, cursor: isCurrent ? 'default' : 'pointer',
                    fontFamily: 'inherit', transition: 'all 0.15s',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}
                >
                  {loading === plan.id && <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />}
                  {isCurrent ? 'Plan actual' : plan.id === 'free' ? 'Gratis' : 'Activar'}
                </button>
              </div>
            );
          })}
        </div>

        <p style={{ fontSize: 10, color: 'var(--txt-mut)', textAlign: 'center', marginTop: 16 }}>
          Pago seguro con MercadoPago · Cancela cuando quieras
        </p>
      </div>
    </div>
  );
};
