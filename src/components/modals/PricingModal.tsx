import React from 'react';
import { X } from 'lucide-react';
import { PRICING_PLANS } from '@/lib/constants';

export const PricingModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 900, background: 'rgba(5,4,3,0.88)',
      backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16, animation: 'fadeIn 0.2s ease',
    }}>
      <div onClick={e => e.stopPropagation()} style={{ maxWidth: 780, width: '100%', animation: 'slideUp 0.25s ease' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--txt-pri)', marginBottom: 3 }}>Planes Premium</h2>
            <p style={{ fontSize: 12, color: 'var(--txt-ter)' }}>Desbloquea acceso completo</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--txt-ter)', cursor: 'pointer' }}><X size={18} /></button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8 }}>
          {PRICING_PLANS.map(p => {
            const isCurrent = p.id === 'free';
            return (
              <div key={p.id} style={{
                padding: '20px 16px', background: p.highlight ? 'var(--bg-hover)' : 'var(--bg-surface)',
                border: `1px solid ${p.highlight ? 'var(--border-str)' : 'var(--border-sub)'}`, borderRadius: 10,
                display: 'flex', flexDirection: 'column', transition: 'transform 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--txt-ter)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>{p.name}</p>
                <div style={{ marginBottom: 12 }}>
                  <span style={{ fontSize: 26, fontWeight: 600, color: 'var(--txt-pri)' }}>{p.price}</span>
                  <span style={{ fontSize: 11, color: 'var(--txt-ter)' }}>{p.period}</span>
                </div>
                <div style={{ flex: 1, marginBottom: 14 }}>
                  {p.features.map((f, i) => <p key={i} style={{ fontSize: 11, color: 'var(--txt-sec)', marginBottom: 5, lineHeight: 1.5 }}>· {f}</p>)}
                </div>
                <button style={{
                  padding: 9, background: isCurrent ? 'transparent' : p.highlight ? 'var(--border-str)' : 'var(--bg-hover)',
                  border: `1px solid ${isCurrent ? 'var(--border-sub)' : 'var(--border-def)'}`, borderRadius: 6,
                  color: isCurrent ? 'var(--txt-ter)' : 'var(--txt-pri)',
                  fontSize: 11, fontWeight: 500, cursor: isCurrent ? 'default' : 'pointer', fontFamily: 'inherit',
                }}>{isCurrent ? 'Plan actual' : 'Activar'}</button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
