// ═══════════════════════════════════════
// AIdark — Privacy Modal (Typewriter Style)
// ═══════════════════════════════════════

import React from 'react';
import { X } from 'lucide-react';

interface PrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyModal: React.FC<PrivacyModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 900,
        background: 'rgba(5,4,3,0.88)', backdropFilter: 'blur(12px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16, animation: 'fadeIn 0.2s ease',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 520, width: '100%', maxHeight: '80vh', overflowY: 'auto',
          background: 'var(--bg-surface)', border: '1px solid var(--border-def)',
          borderRadius: 12, padding: '32px 28px',
          animation: 'slideUp 0.25s ease',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28,
          fontFamily: "'IBM Plex Mono', monospace",
        }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--txt-pri)' }}>Política de Privacidad</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--txt-ter)', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        {/* Typewriter content */}
        <div style={{
          fontFamily: "'Special Elite', 'Courier New', serif",
          fontSize: 15, color: 'var(--txt-sec)', lineHeight: 2, letterSpacing: 0.3,
        }}>
          <p style={{ marginBottom: 20 }}>
            <strong style={{ color: 'var(--txt-pri)' }}>Tu privacidad es nuestra prioridad.</strong>
          </p>
          <p style={{ marginBottom: 16 }}>
            AIdark no almacena, lee ni comparte tus conversaciones. Cada sesión de chat es temporal y se elimina automáticamente al cerrarla. No existe historial en nuestros servidores.
          </p>
          <p style={{ marginBottom: 16 }}>
            Las respuestas son generadas por modelos de inteligencia artificial de código abierto procesados en infraestructura descentralizada. Ningún humano tiene acceso a tus consultas.
          </p>
          <p style={{ marginBottom: 16 }}>
            Los pagos se procesan a través de MercadoPago. Solo recibimos confirmación del estado de la transacción, nunca datos bancarios.
          </p>
          <p style={{ marginBottom: 16 }}>
            AIdark está diseñado exclusivamente para mayores de 18 años. Cualquier uso indebido que involucre menores resultará en suspensión inmediata y permanente.
          </p>
          <p style={{ marginBottom: 16 }}>
            Al usar AIdark, aceptas que el contenido generado es responsabilidad del usuario. La plataforma es una herramienta de exploración creativa e intelectual.
          </p>
          <p style={{
            color: 'var(--txt-ter)', fontSize: 13, marginTop: 24,
            paddingTop: 16, borderTop: '1px solid var(--border-sub)',
          }}>
            Contacto: hola@aidark.app
          </p>
        </div>
      </div>
    </div>
  );
};
