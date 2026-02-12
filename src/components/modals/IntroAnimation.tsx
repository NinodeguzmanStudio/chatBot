// ═══════════════════════════════════════
// AIdark — Intro Animation
// ═══════════════════════════════════════

import React, { useState, useEffect } from 'react';

interface IntroAnimationProps {
  onDone: () => void;
}

export const IntroAnimation: React.FC<IntroAnimationProps> = ({ onDone }) => {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 300);
    const t2 = setTimeout(() => setPhase(2), 1200);
    const t3 = setTimeout(() => setPhase(3), 2200);
    const t4 = setTimeout(() => onDone(), 3000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [onDone]);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2000, background: '#0c0b0a',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'IBM Plex Mono', monospace",
      opacity: phase >= 3 ? 0 : 1, transition: 'opacity 0.8s ease',
    }}>
      {/* Logo */}
      <div style={{
        opacity: phase >= 1 ? 1 : 0,
        transform: phase >= 1 ? 'scale(1) translateY(0)' : 'scale(0.85) translateY(20px)',
        transition: 'all 0.7s cubic-bezier(0.16, 1, 0.3, 1)',
        marginBottom: 16,
      }}>
        <span style={{ fontSize: 52, fontWeight: 600, color: '#d4c5b0', letterSpacing: -1 }}>
          AI<span style={{ color: '#6b5b4a' }}>dark</span>
        </span>
      </div>

      {/* Tagline */}
      <div style={{
        opacity: phase >= 2 ? 1 : 0,
        transform: phase >= 2 ? 'translateY(0)' : 'translateY(10px)',
        transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
      }}>
        <span style={{ fontSize: 13, color: '#5a4a3a', letterSpacing: 5, textTransform: 'uppercase' }}>
          sin censura
        </span>
      </div>

      {/* Loading bar */}
      <div style={{
        width: 100, height: 2, marginTop: 32, borderRadius: 2,
        overflow: 'hidden', backgroundColor: '#1e1b18',
        opacity: phase >= 1 ? 1 : 0, transition: 'opacity 0.4s',
      }}>
        <div style={{
          width: phase >= 2 ? '100%' : '0%', height: '100%',
          background: 'linear-gradient(90deg, #3d3328, #8b7355, #3d3328)',
          transition: 'width 1.2s cubic-bezier(0.4, 0, 0.2, 1)',
          borderRadius: 2,
        }} />
      </div>
    </div>
  );
};
