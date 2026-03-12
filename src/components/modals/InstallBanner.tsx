// ═══════════════════════════════════════
// AIdark — Install Banner (PWA)
// ═══════════════════════════════════════
import React, { useState } from 'react';
import { X, Smartphone } from 'lucide-react';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';

export const InstallBanner: React.FC = () => {
  const { canInstall, isIOS, isInstalled, install } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(() => !!localStorage.getItem('aidark_install_dismissed'));
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (!canInstall || isInstalled || dismissed) return null;

  const handleInstall = async () => {
    if (isIOS) { setShowIOSGuide(true); return; }
    await install();
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('aidark_install_dismissed', '1');
  };

  return (
    <>
      {/* Banner principal */}
      <div style={{
        position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)',
        zIndex: 300, maxWidth: 380, width: 'calc(100% - 32px)',
        background: '#0f0f18', border: '1px solid rgba(139,115,85,0.3)',
        borderRadius: 14, padding: '12px 14px',
        display: 'flex', alignItems: 'center', gap: 12,
        boxShadow: '0 8px 28px rgba(0,0,0,0.6)',
        animation: 'slideUpBanner 0.3s ease',
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: 'rgba(139,115,85,0.15)', border: '1px solid rgba(139,115,85,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Smartphone size={20} color="#8b7355" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 2 }}>
            Instala AIdark en tu celular
          </div>
          <div style={{ fontSize: 11, color: '#ffffff66' }}>
            Acceso rápido · Sin censura · Como app nativa
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button onClick={handleInstall} style={{
            padding: '7px 12px', borderRadius: 8, border: 'none',
            background: '#8b7355', color: '#fff', fontSize: 12,
            fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          }}>
            Instalar
          </button>
          <button onClick={handleDismiss} style={{
            width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)',
            background: 'transparent', color: '#ffffff55', cursor: 'pointer',
          }}>
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Guía iOS */}
      {showIOSGuide && (
        <div onClick={() => setShowIOSGuide(false)} style={{
          position: 'fixed', inset: 0, zIndex: 400,
          background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: 16,
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: '#111', borderRadius: 16, padding: '22px 20px', width: '100%', maxWidth: 380,
            border: '1px solid rgba(255,255,255,0.1)', textAlign: 'center',
          }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>📱</div>
            <h3 style={{ color: '#fff', fontSize: 15, fontWeight: 700, margin: '0 0 14px' }}>
              Instala AIdark en iPhone
            </h3>
            {[
              { n: 1, text: 'Toca el botón "Compartir" (cuadrado con flecha)', icon: '⬆️' },
              { n: 2, text: 'Desplázate y toca "Agregar a pantalla de inicio"', icon: '➕' },
              { n: 3, text: 'Toca "Agregar" en la esquina superior derecha', icon: '✅' },
            ].map(step => (
              <div key={step.n} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                background: 'rgba(255,255,255,0.04)', borderRadius: 10,
                padding: '10px 14px', marginBottom: 8, textAlign: 'left',
              }}>
                <span style={{ fontSize: 20 }}>{step.icon}</span>
                <span style={{ fontSize: 12, color: '#ffffffcc' }}>{step.text}</span>
              </div>
            ))}
            <button onClick={() => { setShowIOSGuide(false); handleDismiss(); }} style={{
              marginTop: 8, width: '100%', padding: '11px 0', borderRadius: 10, border: 'none',
              background: '#8b7355', color: '#fff', fontSize: 13, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit',
            }}>Entendido</button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUpBanner {
          from { opacity: 0; transform: translateX(-50%) translateY(16px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </>
  );
};
