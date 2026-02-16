import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/store';
import { t } from '@/lib/i18n';

export const AgeGate: React.FC = () => {
  const { setAgeVerified } = useAuthStore();
  const [show, setShow] = useState(false);
  useEffect(() => { setTimeout(() => setShow(true), 100); }, []);

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-primary)', padding: 20,
      opacity: show ? 1 : 0, transition: 'opacity 0.6s ease',
    }}>
      <div style={{ textAlign: 'center', maxWidth: 360 }}>
        <div style={{ fontSize: 40, marginBottom: 20, opacity: 0.6 }}>🔞</div>
        <h1 style={{ fontSize: 20, fontWeight: 500, color: 'var(--txt-pri)', marginBottom: 12 }}>{t('age.title')}</h1>
        <p style={{ fontSize: 13, color: 'var(--txt-sec)', lineHeight: 1.7, marginBottom: 28 }}>{t('age.subtitle')}</p>
        <button onClick={() => setAgeVerified(true)} style={{
          padding: '12px 32px', background: 'var(--accent)', border: 'none', borderRadius: 8,
          color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
          transition: 'all 0.2s', marginBottom: 16,
        }}>
          {t('age.confirm')}
        </button>
        <p style={{ fontSize: 11, color: 'var(--txt-mut)' }}>{t('age.warning')}</p>
      </div>
    </div>
  );
};
