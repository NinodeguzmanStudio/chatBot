// ═══════════════════════════════════════
// AIdark — Age Gate Component
// ═══════════════════════════════════════

import React from 'react';
import { useAuthStore } from '@/lib/store';

export const AgeGate: React.FC = () => {
  const { setAgeVerified } = useAuthStore();

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'var(--bg-primary)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'IBM Plex Mono', monospace",
      }}
    >
      <div
        style={{
          maxWidth: 400, width: '90%',
          padding: '48px 40px',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          borderRadius: 12,
          textAlign: 'center',
        }}
      >
        {/* Logo */}
        <div style={{ marginBottom: 28 }}>
          <span style={{ fontSize: 28, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
            AI<span style={{ color: 'var(--text-secondary)' }}>dark</span>
          </span>
        </div>

        <div style={{
          width: 40, height: 1, margin: '0 auto 24px',
          background: 'linear-gradient(90deg, transparent, var(--border-strong), transparent)',
        }} />

        <p style={{
          fontSize: 12, fontWeight: 500, color: 'var(--danger)',
          letterSpacing: 3, textTransform: 'uppercase', marginBottom: 20,
        }}>
          Acceso restringido · 18+
        </p>

        <p style={{
          fontSize: 14, color: 'var(--text-secondary)',
          lineHeight: 1.7, marginBottom: 10,
        }}>
          Contenido exclusivo para adultos. Novelas, investigación y temas sin filtro.
        </p>

        <p style={{
          fontSize: 12, color: 'var(--text-muted)', marginBottom: 32,
        }}>
          Todo el contenido se genera bajo tu responsabilidad.
        </p>

        <button
          onClick={() => setAgeVerified(true)}
          className="transition-default"
          style={{
            width: '100%', padding: '13px 0',
            background: 'var(--bg-hover)',
            border: '1px solid var(--border-strong)',
            borderRadius: 8,
            color: 'var(--text-primary)',
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 14, fontWeight: 500,
            cursor: 'pointer',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--border-default)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
        >
          Confirmo que tengo 18+ años
        </button>

        <a
          href="https://google.com"
          style={{
            display: 'block', marginTop: 16,
            fontSize: 12, color: 'var(--text-muted)',
            textDecoration: 'none',
          }}
        >
          Salir
        </a>
      </div>
    </div>
  );
};
