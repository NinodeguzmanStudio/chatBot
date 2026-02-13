import React from 'react';
import { X } from 'lucide-react';

export const PrivacyModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 900, background: 'rgba(5,4,3,0.88)',
      backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16, animation: 'fadeIn 0.2s ease',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        maxWidth: 500, width: '100%', maxHeight: '80vh', overflowY: 'auto',
        background: 'var(--bg-surface)', border: '1px solid var(--border-sub)',
        borderRadius: 12, padding: '28px 24px', animation: 'slideUp 0.25s ease',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, fontFamily: "'IBM Plex Mono', monospace" }}>
          <h2 style={{ fontSize: 17, fontWeight: 600, color: 'var(--txt-pri)' }}>Política de Privacidad</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--txt-ter)', cursor: 'pointer' }}><X size={18} /></button>
        </div>
        <div style={{ fontFamily: "'Special Elite', 'Courier New', serif", fontSize: 14, color: 'var(--txt-sec)', lineHeight: 2, letterSpacing: 0.3 }}>
          <p style={{ marginBottom: 16 }}><strong style={{ color: 'var(--txt-pri)' }}>Tu privacidad es nuestra prioridad.</strong></p>
          <p style={{ marginBottom: 14 }}>AIdark no almacena, lee ni comparte tus conversaciones. Cada sesión es temporal y se elimina automáticamente.</p>
          <p style={{ marginBottom: 14 }}>Las respuestas son generadas por modelos de IA de código abierto. Ningún humano tiene acceso a tus consultas.</p>
          <p style={{ marginBottom: 14 }}>Los pagos se procesan a través de MercadoPago. Solo recibimos confirmación del estado, nunca datos bancarios.</p>
          <p style={{ marginBottom: 14 }}>AIdark es exclusivo para mayores de 18 años. Uso indebido con menores resulta en suspensión permanente.</p>
          <p style={{ marginBottom: 14 }}>El contenido generado es responsabilidad del usuario. La plataforma es una herramienta de exploración creativa.</p>
          <p style={{ color: 'var(--txt-ter)', fontSize: 12, marginTop: 20, paddingTop: 14, borderTop: '1px solid var(--border-sub)' }}>Contacto: hola@aidark.app</p>
        </div>
      </div>
    </div>
  );
};
