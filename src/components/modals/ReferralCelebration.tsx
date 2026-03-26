// ═══════════════════════════════════════
// AIdark — Referral Celebration Modal
// src/components/modals/ReferralCelebration.tsx
// Dos modos:
//   - 'welcome': confetti + logo para el nuevo usuario que pagó
//   - 'reward': notificación para el referidor que ganó un mes
// ═══════════════════════════════════════

import React, { useEffect, useState } from 'react';

interface ReferralCelebrationProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'welcome' | 'reward';
  referredBy?: string; // nombre/email de quien refirió (para welcome)
  referredUser?: string; // email del nuevo usuario (para reward)
}

// Confetti particle
const Particle: React.FC<{ delay: number; left: number; color: string }> = ({ delay, left, color }) => (
  <div style={{
    position: 'absolute', top: -10, left: `${left}%`,
    width: 8, height: 8, borderRadius: Math.random() > 0.5 ? '50%' : 2,
    background: color, opacity: 0,
    animation: `confettiFall ${1.5 + Math.random()}s ease-out ${delay}s forwards`,
  }} />
);

const COLORS = ['#e67e22', '#2eaadc', '#9b59b6', '#f39c12', '#4ade80', '#f472b6', '#8b7355', '#60a5fa'];

export const ReferralCelebration: React.FC<ReferralCelebrationProps> = ({ isOpen, onClose, mode, referredUser }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setVisible(true);
      const timer = setTimeout(() => { setVisible(false); onClose(); }, mode === 'welcome' ? 4000 : 6000);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen && !visible) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 400,
      background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      animation: 'celebFadeIn 0.3s ease',
      padding: 20,
    }}>
      <style>{`
        @keyframes celebFadeIn { from{opacity:0} to{opacity:1} }
        @keyframes celebPop { 0%{transform:scale(0.5);opacity:0} 50%{transform:scale(1.1)} 100%{transform:scale(1);opacity:1} }
        @keyframes celebShine { 0%{opacity:0.4} 50%{opacity:1} 100%{opacity:0.4} }
        @keyframes confettiFall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(400px) rotate(720deg); opacity: 0; }
        }
        @keyframes celebSlideUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      {/* Confetti */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        {Array.from({ length: 40 }).map((_, i) => (
          <Particle key={i} delay={Math.random() * 0.8} left={Math.random() * 100} color={COLORS[i % COLORS.length]} />
        ))}
      </div>

      <div onClick={onClose} style={{
        position: 'relative', textAlign: 'center', maxWidth: 340,
        animation: 'celebPop 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards',
        cursor: 'pointer',
      }}>
        {/* Logo */}
        <div style={{
          width: 80, height: 80, borderRadius: 20, margin: '0 auto 20px',
          background: 'linear-gradient(135deg, #8b7355, #d4c5b0)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 36, fontWeight: 800, color: '#0a0a12',
          boxShadow: '0 0 40px rgba(139,115,85,0.4)',
          animation: 'celebShine 2s ease-in-out infinite',
        }}>
          A
        </div>

        {mode === 'welcome' ? (
          <>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: '#fff', margin: '0 0 8px', letterSpacing: -0.5 }}>
              Bienvenido a AIdark
            </h2>
            <p style={{ fontSize: 14, color: '#d4c5b0', margin: '0 0 6px', lineHeight: 1.6 }}>
              Tu plan premium está activo
            </p>
            <p style={{ fontSize: 11, color: '#ffffff44', margin: 0 }}>
              Sin censura · Sin límites · Sin filtros
            </p>
          </>
        ) : (
          <>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: '#4ade80', margin: '0 0 10px' }}>
              +1 Mes Gratis
            </h2>
            <p style={{ fontSize: 13, color: '#ffffffcc', margin: '0 0 8px', lineHeight: 1.6 }}>
              El usuario <span style={{ color: '#d4c5b0', fontWeight: 600 }}>{referredUser || 'alguien'}</span> se afilió con tu código.
            </p>
            <div style={{
              background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)',
              borderRadius: 10, padding: '10px 16px', margin: '12px 0',
              animation: 'celebSlideUp 0.5s ease 0.3s both',
            }}>
              <p style={{ fontSize: 12, color: '#4ade80', margin: 0, fontWeight: 600 }}>
                Tu plan se extendió un mes automáticamente
              </p>
            </div>
            <p style={{ fontSize: 10, color: '#ffffff33', margin: 0 }}>
              Toca para cerrar
            </p>
          </>
        )}
      </div>
    </div>
  );
};
