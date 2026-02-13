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
    }}>
      <div style={{
        maxWidth: 380, width: '90%', padding: '44px 32px',
        background: 'var(--bg-surface)', border: '1px solid var(--border-sub)', borderRadius: 12,
        textAlign: 'center',
        opacity: show ? 1 : 0, transform: show ? 'translateY(0)' : 'translateY(20px)',
        transition: 'all 0.5s cubic-bezier(0.16,1,0.3,1)',
      }}>
        <div style={{ marginBottom: 24 }}>
          <span style={{ fontSize: 30, fontWeight: 600, color: 'var(--txt-pri)', letterSpacing: -0.5 }}>
            AI<span style={{ color: 'var(--txt-ter)' }}>dark</span>
          </span>
        </div>
        <div style={{ width: 40, height: 1, margin: '0 auto 20px', background: 'linear-gradient(90deg, transparent, var(--border-str), transparent)' }} />
        <p style={{ fontSize: 11, fontWeight: 500, color: 'var(--danger)', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 16 }}>
          Acceso restringido · 18+
        </p>
        <p style={{ fontSize: 13, color: 'var(--txt-sec)', lineHeight: 1.7, marginBottom: 8 }}>
          Contenido exclusivo para adultos sin filtro.
        </p>
        <p style={{ fontSize: 11, color: 'var(--txt-mut)', marginBottom: 28 }}>
          Tus conversaciones son privadas y se eliminan automáticamente.
        </p>
        <button onClick={() => setAgeVerified(true)} style={{
          width: '100%', padding: '13px 0', background: 'var(--bg-hover)',
          border: '1px solid var(--border-def)', borderRadius: 8,
          color: 'var(--txt-pri)', fontFamily: 'inherit', fontSize: 13, fontWeight: 500, cursor: 'pointer',
          transition: 'all 0.2s',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-str)'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-def)'; }}
        >Confirmo que tengo 18+ años</button>
        <a href="https://google.com" style={{ display: 'block', marginTop: 14, fontSize: 11, color: 'var(--txt-mut)', textDecoration: 'none' }}>Salir</a>
      </div>
    </div>
  );
};
