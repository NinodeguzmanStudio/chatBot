// ═══════════════════════════════════════
// AIdark — Pricing Modal (FIXED)
// src/components/modals/PricingModal.tsx
// FIXES:
//   [1] Eliminado contador falso getOcupados() — riesgo legal
//   [2] LiveCounter reemplazado por badge de features reales
//   [3] handleSubscribe ahora envía el token de auth (requerido por create-payment.ts fijado)
//   [4] Eliminado tick/interval de live counter que ya no existe
// ═══════════════════════════════════════

import React, { useState, useEffect, useCallback } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { useIsMobile } from '@/hooks/useIsMobile';
import { supabase } from '@/lib/supabase';

type PlanConfig = {
  id:          string;
  price:       number;
  period:      string;
  periodLabel: string;
  label:       string;
  color:       string;
  colorLight:  string;
  colorDark:   string;
  emoji:       string;
  waveSpeed:   number;
  waveAmplitude: number;
  features:    { icon: string; text: string; highlight?: boolean }[];
};

// ── Wave SVG ──
const WaveSurface: React.FC<{ color: string; speed: number; amplitude: number; offset: number }> = ({ color, speed, amplitude, offset }) => (
  <svg viewBox="0 0 400 30" preserveAspectRatio="none"
    style={{ width: '110%', height: 25, position: 'absolute', top: -12, left: '-5%', overflow: 'visible' }}>
    <path d="" fill={color}>
      <animate attributeName="d" dur={`${speed}s`} repeatCount="indefinite"
        values={`
          M0,15 C50,${15 - amplitude + offset} 100,${15 + amplitude + offset} 150,15 C200,${15 - amplitude - offset} 250,${15 + amplitude - offset} 300,15 C350,${15 - amplitude + offset} 400,${15 + amplitude + offset} 400,30 L0,30 Z;
          M0,15 C50,${15 + amplitude - offset} 100,${15 - amplitude - offset} 150,15 C200,${15 + amplitude + offset} 250,${15 - amplitude + offset} 300,15 C350,${15 + amplitude - offset} 400,${15 - amplitude - offset} 400,30 L0,30 Z;
          M0,15 C50,${15 - amplitude + offset} 100,${15 + amplitude + offset} 150,15 C200,${15 - amplitude - offset} 250,${15 + amplitude - offset} 300,15 C350,${15 - amplitude + offset} 400,${15 + amplitude + offset} 400,30 L0,30 Z
        `} />
    </path>
  </svg>
);

// ── Water Card ──
const WaterCard: React.FC<{
  plan:        PlanConfig;
  tiltX:       number;
  tiltY:       number;
  loading:     string | null;
  currentPlan: string;
  onSubscribe: (id: string) => void;
}> = ({ plan, tiltX, tiltY, loading, currentPlan, onSubscribe }) => {
  const { id, price, period, periodLabel, color, colorLight, colorDark, features, label, emoji, waveSpeed, waveAmplitude } = plan;
  const tiltShift  = tiltX * 0.3;
  // FIX [1]: fill fijo y realista basado en precio (visual, no engañoso)
  const staticFill = id === 'basic_monthly' ? 72 : id === 'pro_quarterly' ? 55 : 38;
  const isCurrent  = currentPlan === id && currentPlan !== 'free';

  return (
    <div style={{
      position: 'relative', borderRadius: 20, overflow: 'hidden', background: '#0d0d1a',
      border: `1px solid ${color}33`, minHeight: 380, display: 'flex', flexDirection: 'column',
      flex: 1, minWidth: 200, maxWidth: 260,
      boxShadow: `0 0 30px ${color}15, inset 0 0 30px ${color}08`,
      transition: 'transform 0.3s ease',
      transform: `perspective(800px) rotateY(${tiltX * 0.5}deg) rotateX(${-tiltY * 0.5}deg)`,
    }}>
      {/* Content */}
      <div style={{ position: 'relative', zIndex: 10, padding: '20px 16px', display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{
          alignSelf: 'center', fontSize: 9, fontWeight: 700, letterSpacing: 1.5,
          padding: '3px 12px', borderRadius: 20, background: `${color}22`, color,
          border: `1px solid ${color}44`, marginBottom: 14, textTransform: 'uppercase',
        }}>{label}</div>

        <div style={{ textAlign: 'center', marginBottom: 4 }}>
          <span style={{ fontSize: 42, fontWeight: 800, color: '#fff', lineHeight: 1, fontFamily: 'system-ui' }}>${price}</span>
        </div>
        <div style={{ textAlign: 'center', fontSize: 12, color: '#ffffff88', marginBottom: 4 }}>{period}</div>
        {periodLabel && <div style={{ textAlign: 'center', fontSize: 10, color, fontWeight: 600, marginBottom: 14 }}>{periodLabel}</div>}

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 16 }}>
          {features.map((f, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ fontSize: 13 }}>{f.icon}</span>
              <span style={{ fontSize: 11, color: f.highlight ? color : '#ffffffcc', fontWeight: f.highlight ? 600 : 400 }}>{f.text}</span>
            </div>
          ))}
        </div>

        <button
          onClick={() => onSubscribe(id)}
          disabled={!!loading || isCurrent}
          style={{
            width: '100%', padding: '12px 0', borderRadius: 12, border: 'none', fontSize: 13,
            fontWeight: 700, cursor: isCurrent ? 'default' : 'pointer', fontFamily: 'inherit',
            background: isCurrent ? '#ffffff15' : `linear-gradient(135deg, ${color}, ${colorDark})`,
            color: isCurrent ? '#ffffff66' : '#fff',
            boxShadow: isCurrent ? 'none' : `0 4px 20px ${color}44`,
            transition: 'all 0.2s ease', letterSpacing: 0.5,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}
        >
          {loading === id && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
          {isCurrent ? 'Plan actual' : `Obtener Acceso ${emoji}`}
        </button>
      </div>

      {/* Water fill */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: `${staticFill}%`,
        zIndex: 1,
      }}>
        <div style={{ position: 'relative', transform: `translateX(${tiltShift}px)`, transition: 'transform 0.4s ease-out' }}>
          <WaveSurface color={`${colorLight}55`} speed={waveSpeed}           amplitude={waveAmplitude}       offset={2}  />
          <div style={{ position: 'absolute', top: 6, left: '-5%', width: '110%' }}>
            <WaveSurface color={`${colorLight}33`} speed={waveSpeed * 1.2}   amplitude={waveAmplitude * 0.7} offset={-1} />
          </div>
          {waveAmplitude > 7 && (
            <div style={{ position: 'absolute', top: 3, left: '-5%', width: '110%' }}>
              <WaveSurface color={`${colorLight}22`} speed={waveSpeed * 0.8} amplitude={waveAmplitude * 0.5} offset={3}  />
            </div>
          )}
        </div>
        <div style={{
          position: 'absolute', top: 12, left: 0, right: 0, bottom: 0,
          background: `linear-gradient(180deg, ${colorLight}55 0%, ${color}44 50%, ${colorDark}66 100%)`,
          backdropFilter: 'blur(2px)',
        }} />
        {[...Array(waveAmplitude > 7 ? 8 : 5)].map((_, i) => (
          <div key={i} style={{
            position: 'absolute', bottom: `${5 + i * 11}%`, left: `${10 + i * 12}%`,
            width: 3 + i * 1.5, height: 3 + i * 1.5, borderRadius: '50%', background: `${colorLight}44`,
            animation: `bubbleRise ${waveAmplitude > 7 ? (1.5 + i * 0.4) : (3 + i * 0.8)}s ease-in-out infinite`,
            animationDelay: `${i * 0.4}s`,
          }} />
        ))}
      </div>

      {/* Glass reflection */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '40%',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 100%)',
        zIndex: 5, pointerEvents: 'none',
      }} />
    </div>
  );
};

// ── Plan configs ──
const basePlans: PlanConfig[] = [
  {
    id: 'basic_monthly', price: 12, period: '/mes', periodLabel: '', label: 'Mensual',
    color: '#e67e22', colorLight: '#f39c12', colorDark: '#d35400',
    emoji: '🔥', waveSpeed: 1.8, waveAmplitude: 10,
    features: [
      { icon: '♾️', text: 'Mensajes ilimitados' },
      { icon: '🔒', text: 'Conversaciones privadas' },
      { icon: '⚡', text: 'Velocidad estándar' },
      { icon: '📅', text: 'Historial 90 días' },
      { icon: '📸', text: '10 imágenes HD/día · Realista', highlight: true },
      { icon: '🔞', text: 'Desnudos fotorrealistas', highlight: true },
    ],
  },
  {
    id: 'pro_quarterly', price: 29.99, period: '/3 meses', periodLabel: '~$10/mes · Ahorra 17%', label: 'Trimestral',
    color: '#2eaadc', colorLight: '#5dccf4', colorDark: '#1a8ab5',
    emoji: '⚡', waveSpeed: 3.5, waveAmplitude: 6,
    features: [
      { icon: '♾️', text: 'Mensajes ilimitados' },
      { icon: '🔒', text: 'Conversaciones privadas' },
      { icon: '🚀', text: 'Velocidad prioritaria' },
      { icon: '📅', text: 'Historial 90 días' },
      { icon: '📸', text: '25 imágenes HD/día · Realista + Anime', highlight: true },
      { icon: '🎌', text: 'Hentai · Manhwa · Manga · Ecchi', highlight: true },
    ],
  },
  {
    id: 'ultra_annual', price: 99.99, period: '/año', periodLabel: '~$8.33/mes · Ahorra 30%', label: 'Anual · Fundador',
    color: '#9b59b6', colorLight: '#c39bd3', colorDark: '#7d3c98',
    emoji: '👑', waveSpeed: 4.5, waveAmplitude: 4,
    features: [
      { icon: '♾️', text: 'Mensajes ilimitados' },
      { icon: '🔐', text: 'Privacidad reforzada', highlight: true },
      { icon: '💨', text: 'Velocidad máxima' },
      { icon: '📅', text: 'Historial 365 días' },
      { icon: '📸', text: '50 imágenes HD/día · Todo desbloqueado', highlight: true },
      { icon: '🎌', text: 'Hentai · Manhwa · Manga · Ecchi', highlight: true },
      { icon: '🏅', text: 'Badge Fundador', highlight: true },
    ],
  },
];

// ── Main Modal ──
export const PricingModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { user } = useAuthStore();
  const [loading, setLoading]   = useState<string | null>(null);
  const [error, setError]       = useState('');
  const [tiltX, setTiltX]       = useState(0);
  const [tiltY, setTiltY]       = useState(0);
  const currentPlan = user?.plan || 'free';
  const isMobile    = useIsMobile();

  // Gyroscope + mouse tilt
  useEffect(() => {
    if (!isOpen) return;
    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.gamma !== null) setTiltX(Math.max(-15, Math.min(15, e.gamma)));
      if (e.beta  !== null) setTiltY(Math.max(-10, Math.min(10, ((e.beta ?? 45) - 45) * 0.3)));
    };
    if (window.DeviceOrientationEvent && typeof (DeviceOrientationEvent as any).requestPermission !== 'function') {
      window.addEventListener('deviceorientation', handleOrientation);
    }
    const handleMouse = (e: MouseEvent) => {
      setTiltX(((e.clientX / window.innerWidth)  - 0.5) * 20);
      setTiltY(((e.clientY / window.innerHeight) - 0.5) * 10);
    };
    window.addEventListener('mousemove', handleMouse);
    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
      window.removeEventListener('mousemove', handleMouse);
    };
  }, [isOpen]);

  const requestGyro = useCallback(async () => {
    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      try {
        const perm = await (DeviceOrientationEvent as any).requestPermission();
        if (perm === 'granted') {
          window.addEventListener('deviceorientation', (e) => {
            if (e.gamma !== null) setTiltX(Math.max(-15, Math.min(15, e.gamma)));
            if (e.beta  !== null) setTiltY(Math.max(-10, Math.min(10, ((e.beta ?? 45) - 45) * 0.3)));
          });
        }
      } catch {}
    }
  }, []);

  // FIX [3]: handleSubscribe ahora envía token Bearer (requerido por create-payment.ts)
  const handleSubscribe = async (planId: string) => {
    if (!user) { setError('Necesitas una cuenta para suscribirte.'); return; }
    setLoading(planId); setError('');
    try {
      // Obtener token de sesión actual
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setError('Sesión expirada. Recargá la página.');
        setLoading(null);
        return;
      }

      const res = await fetch('/api/create-payment', {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${session.access_token}`, // FIX [3]
        },
        body: JSON.stringify({ planId, userEmail: user.email, userId: user.id }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Error al crear el pago.');
        setLoading(null);
        return;
      }

      const data = await res.json();
      if (data.init_point) { window.location.href = data.init_point; }
      else { setError(data.error || 'Error al crear pago'); }
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
    }
    setLoading(null);
  };

  if (!isOpen) return null;

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 200, padding: 12,
    }}>
      <div onClick={e => { e.stopPropagation(); requestGyro(); }} style={{
        width: '100%', maxWidth: 860, background: '#0a0a14',
        border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20,
        padding: isMobile ? '20px 12px' : '28px 24px',
        maxHeight: '90dvh', overflowY: 'auto',
        animation: 'fadeUp 0.3s ease',
      }}>
        <style>{`
          @keyframes bubbleRise { 0%{transform:translateY(0) scale(1);opacity:0.6} 50%{transform:translateY(-30px) scale(1.1);opacity:0.3} 100%{transform:translateY(-60px) scale(0.8);opacity:0} }
          @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
          @keyframes spin { to{transform:rotate(360deg)} }
        `}</style>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: '#fff', margin: 0, letterSpacing: -0.5 }}>
              Acceso AIdark
            </h2>
            <p style={{ fontSize: 12, color: '#ffffff55', margin: '4px 0 0' }}>
              Sin censura · Sin filtros · Sin anuncios
            </p>
          </div>
          <button onClick={onClose} style={{
            width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8, color: '#ffffff66', cursor: 'pointer', flexShrink: 0,
          }}><X size={16} /></button>
        </div>

        {/* Propuesta de valor (reemplaza al contador falso) */}
        <div style={{
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 10, padding: '10px 16px', margin: '12px 0 20px', textAlign: 'center',
        }}>
          <p style={{ fontSize: 11, color: '#ffffffaa', margin: 0, lineHeight: 1.7 }}>
            🔒 Para garantizar tu <span style={{ color: '#e67e22', fontWeight: 600 }}>libertad de expresión</span> y{' '}
            <span style={{ color: '#2eaadc', fontWeight: 600 }}>privacidad</span>, limitamos el acceso a{' '}
            <span style={{ color: '#fff', fontWeight: 700 }}>miembros activos</span>.
            <br />Menos usuarios = más velocidad y mejor experiencia.
          </p>
        </div>

        {error && (
          <div style={{ padding: '8px 12px', marginBottom: 12, borderRadius: 8, background: 'rgba(200,60,60,0.15)', color: '#ff6b6b', fontSize: 11 }}>
            {error}
          </div>
        )}

        {/* Plan cards */}
        <div style={{ display: 'flex', gap: isMobile ? 10 : 14, flexWrap: 'wrap', justifyContent: 'center' }}>
          {basePlans.map((plan) => (
            <WaterCard
              key={plan.id}
              plan={plan}
              tiltX={tiltX}
              tiltY={tiltY}
              loading={loading}
              currentPlan={currentPlan}
              onSubscribe={handleSubscribe}
            />
          ))}
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <p style={{ fontSize: 10, color: '#ffffff28', margin: 0, lineHeight: 1.6 }}>
            Novelas sin límites · Investigación profunda · Ocultismo y misterios
            <br />Roleplay sin filtros · Temas tabú · Libertad creativa
          </p>
          <p style={{ fontSize: 9, color: '#ffffff18', marginTop: 10 }}>
            Pago seguro vía MercadoPago · Cancela cuando quieras
          </p>
        </div>
      </div>
    </div>
  );
};
