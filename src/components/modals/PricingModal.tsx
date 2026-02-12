// ═══════════════════════════════════════
// AIdark — Pricing Modal Component
// ═══════════════════════════════════════

import React from 'react';
import { X } from 'lucide-react';
import { PRICING_PLANS } from '@/lib/constants';
import { useAuthStore } from '@/lib/store';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PricingModal: React.FC<PricingModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuthStore();
  const currentPlan = user?.plan || 'free';

  if (!isOpen) return null;

  const handleActivate = (planId: string) => {
    // TODO: Integrar MercadoPago
    // 1. Crear preferencia de pago en /api/create-payment
    // 2. Redirigir al checkout de MercadoPago
    // 3. Webhook confirma pago → actualizar plan en Supabase
    console.log('[AIdark] Activar plan:', planId);
    alert('Integración de pagos próximamente. Plan seleccionado: ' + planId);
  };

  return (
    <div
      onClick={onClose}
      className="animate-fade-in"
      style={{
        position: 'fixed', inset: 0, zIndex: 900,
        background: 'rgba(5,4,3,0.85)',
        backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
        fontFamily: "'IBM Plex Mono', monospace",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 780, width: '100%' }}
      >
        {/* Header */}
        <div className="flex justify-between items-center" style={{ marginBottom: 24 }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
              Planes Premium
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>
              Desbloquea acceso completo sin límites
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ color: 'var(--text-tertiary)', cursor: 'pointer', padding: 4 }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Plans grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 10,
        }}>
          {PRICING_PLANS.map((plan) => {
            const isCurrent = plan.id === currentPlan;
            return (
              <div
                key={plan.id}
                style={{
                  padding: '22px 18px',
                  background: plan.highlight ? 'var(--bg-hover)' : 'var(--bg-surface)',
                  border: `1px solid ${plan.highlight ? 'var(--border-strong)' : 'var(--border-default)'}`,
                  borderRadius: 10,
                  display: 'flex', flexDirection: 'column',
                }}
              >
                <p style={{
                  fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)',
                  letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10,
                }}>
                  {plan.name}
                </p>

                <div style={{ marginBottom: 14 }}>
                  <span style={{ fontSize: 28, fontWeight: 600, color: 'var(--text-primary)' }}>
                    {plan.price}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                    {plan.period}
                  </span>
                </div>

                <div style={{ flex: 1, marginBottom: 16 }}>
                  {plan.features.map((feature, i) => (
                    <p key={i} style={{
                      fontSize: 12, color: 'var(--text-secondary)',
                      marginBottom: 6, lineHeight: 1.5,
                    }}>
                      · {feature}
                    </p>
                  ))}
                </div>

                <button
                  onClick={() => !isCurrent && handleActivate(plan.id)}
                  className="transition-default"
                  style={{
                    padding: 10,
                    background: isCurrent ? 'transparent' : plan.highlight ? 'var(--border-strong)' : 'var(--bg-hover)',
                    border: `1px solid ${isCurrent ? 'var(--border-default)' : plan.highlight ? 'var(--text-tertiary)' : 'var(--border-default)'}`,
                    borderRadius: 6,
                    color: isCurrent ? 'var(--text-tertiary)' : 'var(--text-primary)',
                    fontSize: 12, fontWeight: 500,
                    cursor: isCurrent ? 'default' : 'pointer',
                    fontFamily: "'IBM Plex Mono', monospace",
                  }}
                >
                  {isCurrent ? 'Plan actual' : 'Activar'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
