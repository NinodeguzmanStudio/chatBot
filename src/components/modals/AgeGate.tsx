// ═══════════════════════════════════════
// AIdark — Age Gate v3
// ═══════════════════════════════════════

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/store';

export const AgeGate: React.FC = () => {
  const { setAgeVerified } = useAuthStore();
  const [show, setShow] = useState(false);

  useEffect(() => { setTimeout(() => setShow(true), 100); }, []);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000, background: 'var(--bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'IBM Plex Mono', monospace",
    }}>
      <div style={{
        maxWidth: 400, width: '90%', padding: '48px 36px',
        background: 'var(--bg-surface)', border: '1px solid var(--border-def)', borderRadius: 12,
        textAlign: 'center',
        opacity: show ? 1 : 0, transform: show ? 'translateY(0)' : 'translateY(20px)',
        transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
      }}>
        <div style={{ marginBottom: 28 }}>
          <span style={{ fontSize: 32, fontWeight: 600, color: 'var(--txt-pri)', letterSpacing: -0.5 }}>
            AI<span style={{ color: 'var(--txt-ter)' }}>dark</span>
          </span>
        </div>
        <div style={{
          width: 50, height: 1, margin: '0 auto 24px',
          background: 'linear-gradient(90deg, transparent, var(--border-str), transparent)',
        }} />
        <p style={{
          fontSize: 12, fontWeight: 500, color: 'var(--danger)',
          letterSpacing: 3, textTransform: 'uppercase', marginBottom: 20,
        }}>
          Acceso restringido · 18+
        </p>
        <p style={{ fontSize: 14, color: 'var(--txt-sec)', lineHeight: 1.7, marginBottom: 10 }}>
          Contenido exclusivo para adultos. Novelas, investigación y temas sin filtro.
        </p>
        <p style={{ fontSize: 12, color: 'var(--txt-mut)', marginBottom: 32 }}>
          Tus conversaciones son privadas y se eliminan automáticamente.
        </p>

        <button
          onClick={() => setAgeVerified(true)}
          className="transition-default"
          style={{
            width: '100%', padding: '14px 0', background: 'var(--bg-hover)',
            border: '1px solid var(--border-str)', borderRadius: 8,
            color: 'var(--txt-pri)', fontFamily: 'inherit', fontSize: 14, fontWeight: 500, cursor: 'pointer',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'var(--border-def)';
            e.currentTarget.style.boxShadow = '0 0 20px rgba(139,115,85,0.1)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'var(--bg-hover)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          Confirmo que tengo 18+ años
        </button>
        <a href="https://google.com" style={{
          display: 'block', marginTop: 16, fontSize: 12,
          color: 'var(--txt-mut)', textDecoration: 'none',
        }}>
          Salir
        </a>
      </div>
    </div>
  );
};
