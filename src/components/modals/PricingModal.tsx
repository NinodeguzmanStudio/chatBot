// ═══════════════════════════════════════
// AIdark — Pricing Modal v2
// src/components/modals/PricingModal.tsx
// FIXES v2:
//   [1] Precios mostrados en moneda local del usuario
//   [2] Detección automática de país por timezone/navigator.language
//   [3] Fetch de tipo de cambio al abrir el modal
//   [4] Memory leak gyroscope corregido (listener removido correctamente)
//   [5] handleSubscribe envía token Bearer
//   [6] Muestra "≈ $12 USD" como referencia bajo el precio local
// ═══════════════════════════════════════

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { useIsMobile } from '@/hooks/useIsMobile';
import { supabase } from '@/lib/supabase';
import { trackEvent } from '@/lib/analytics';

type PlanConfig = {
  id:          string;
  priceUSD:    number;
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

type CurrencyInfo = {
  code:   string;
  symbol: string;
  rate:   number;
};

// ── Detectar país del usuario por timezone ──
function detectUserCountry(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    const lang = (navigator.language || '').toLowerCase();

    const tzMap: Record<string, string> = {
      'America/Argentina':     'AR', 'America/Buenos_Aires': 'AR',
      'America/Sao_Paulo':     'BR', 'America/Fortaleza':   'BR', 'America/Manaus': 'BR',
      'America/Santiago':      'CL',
      'America/Bogota':        'CO',
      'America/Mexico_City':   'MX', 'America/Monterrey':    'MX', 'America/Cancun': 'MX', 'America/Tijuana': 'MX',
      'America/Lima':          'PE',
      'America/Montevideo':    'UY',
      'America/Guayaquil':     'EC',
      'America/Caracas':       'VE',
      'Europe/Madrid':         'ES',
      'America/New_York':      'US', 'America/Chicago':      'US', 'America/Los_Angeles': 'US', 'America/Denver': 'US',
    };

    for (const [tzPrefix, country] of Object.entries(tzMap)) {
      if (tz.startsWith(tzPrefix) || tz === tzPrefix) return country;
    }

    // Fallback por idioma
    if (lang.startsWith('es-ar')) return 'AR';
    if (lang.startsWith('es-mx')) return 'MX';
    if (lang.startsWith('es-co')) return 'CO';
    if (lang.startsWith('es-pe')) return 'PE';
    if (lang.startsWith('es-cl')) return 'CL';
    if (lang.startsWith('es-uy')) return 'UY';
    if (lang.startsWith('pt-br') || lang.startsWith('pt')) return 'BR';
    if (lang.startsWith('es-es')) return 'ES';
    if (lang.startsWith('en-us') || lang.startsWith('en')) return 'US';

    return 'US'; // Default
  } catch {
    return 'US';
  }
}

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

// ── Formatear precio local ──
function formatLocalPrice(priceUSD: number, currency: CurrencyInfo): string {
  if (currency.code === 'USD') return `$${priceUSD}`;
  const converted = priceUSD * currency.rate;
  const highValue = new Set(['CLP', 'COP', 'ARS', 'VES']);
  const formatted = highValue.has(currency.code)
    ? Math.ceil(converted).toLocaleString('es')
    : converted.toFixed(2);
  return `${currency.symbol} ${formatted}`;
}

function formatMonthlyEquivalent(priceUSD: number, months: number, currency: CurrencyInfo): string {
  const monthlyUSD = priceUSD / months;
  if (currency.code === 'USD') return `~$${monthlyUSD.toFixed(2)}/mes`;
  const monthly = monthlyUSD * currency.rate;
  const highValue = new Set(['CLP', 'COP', 'ARS', 'VES']);
  const formatted = highValue.has(currency.code)
    ? Math.ceil(monthly).toLocaleString('es')
    : monthly.toFixed(2);
  return `~${currency.symbol} ${formatted}/mes`;
}

// ── Water Card ──
const WaterCard: React.FC<{
  plan:        PlanConfig;
  currency:    CurrencyInfo;
  tiltX:       number;
  tiltY:       number;
  loading:     string | null;
  currentPlan: string;
  onSubscribe: (id: string) => void;
}> = ({ plan, currency, tiltX, tiltY, loading, currentPlan, onSubscribe }) => {
  const { id, priceUSD, period, periodLabel, color, colorLight, colorDark, features, label, emoji, waveSpeed, waveAmplitude } = plan;
  const tiltShift  = tiltX * 0.3;
  const staticFill = id === 'basic_monthly' ? 72 : id === 'pro_quarterly' ? 55 : 38;
  const isCurrent  = currentPlan === id && currentPlan !== 'free';

  const localPrice   = formatLocalPrice(priceUSD, currency);
  const isLocalCurrency = currency.code !== 'USD';

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

        <div style={{ textAlign: 'center', marginBottom: 2 }}>
          <span style={{ fontSize: isLocalCurrency ? 28 : 42, fontWeight: 800, color: '#fff', lineHeight: 1, fontFamily: 'system-ui' }}>
            {localPrice}
          </span>
        </div>
        {/* Mostrar equivalencia en USD si la moneda es local */}
        {isLocalCurrency && (
          <div style={{ textAlign: 'center', fontSize: 11, color: '#ffffff55', marginBottom: 2 }}>
            ≈ ${priceUSD} USD
          </div>
        )}
        <div style={{ textAlign: 'center', fontSize: 12, color: '#ffffff88', marginBottom: 4 }}>{period}</div>
        {periodLabel && (
          <div style={{ textAlign: 'center', fontSize: 10, color, fontWeight: 600, marginBottom: 14 }}>
            {id === 'pro_quarterly'
              ? `${formatMonthlyEquivalent(priceUSD, 3, currency)} · Ahorra 17%`
              : id === 'ultra_annual'
              ? `${formatMonthlyEquivalent(priceUSD, 12, currency)} · Ahorra 30%`
              : periodLabel
            }
          </div>
        )}

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
    id: 'basic_monthly', priceUSD: 12, period: '/mes', periodLabel: '', label: 'Mensual',
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
    id: 'pro_quarterly', priceUSD: 29.99, period: '/3 meses', periodLabel: '~$10/mes · Ahorra 17%', label: 'Trimestral',
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
    id: 'ultra_annual', priceUSD: 99.99, period: '/año', periodLabel: '~$8.33/mes · Ahorra 30%', label: 'Anual · Fundador',
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

  // ── FIX v2 [1]: Currency state ──
  const [currency, setCurrency] = useState<CurrencyInfo>({ code: 'USD', symbol: '$', rate: 1 });
  const [loadingCurrency, setLoadingCurrency] = useState(false);

  // FIX v2 [4]: refs para cleanup de gyroscope
  const gyroListenerRef = useRef<((e: DeviceOrientationEvent) => void) | null>(null);

  // Fetch exchange rate on open
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    void trackEvent('pricing_opened', { source: 'pricing_modal', current_plan: currentPlan });

    const fetchCurrency = async () => {
      setLoadingCurrency(true);
      try {
        const country = detectUserCountry();
        const res = await fetch(`/api/exchange-rate?country=${country}`);
        if (res.ok && !cancelled) {
          const data = await res.json();
          if (data.currency && data.rate) {
            setCurrency({ code: data.currency, symbol: data.symbol || data.currency, rate: data.rate });
          }
        }
      } catch {
        // Silently fallback to USD
      }
      if (!cancelled) setLoadingCurrency(false);
    };

    fetchCurrency();
    return () => { cancelled = true; };
  }, [isOpen]);

  // Gyroscope + mouse tilt — FIX v2 [4]: proper cleanup
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
      // FIX v2 [4]: also remove gyro listener if it was added
      if (gyroListenerRef.current) {
        window.removeEventListener('deviceorientation', gyroListenerRef.current);
        gyroListenerRef.current = null;
      }
    };
  }, [isOpen]);

  const requestGyro = useCallback(async () => {
    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      try {
        const perm = await (DeviceOrientationEvent as any).requestPermission();
        if (perm === 'granted') {
          // FIX v2 [4]: remove previous listener if any
          if (gyroListenerRef.current) {
            window.removeEventListener('deviceorientation', gyroListenerRef.current);
          }
          const handler = (e: DeviceOrientationEvent) => {
            if (e.gamma !== null) setTiltX(Math.max(-15, Math.min(15, e.gamma)));
            if (e.beta  !== null) setTiltY(Math.max(-10, Math.min(10, ((e.beta ?? 45) - 45) * 0.3)));
          };
          gyroListenerRef.current = handler;
          window.addEventListener('deviceorientation', handler);
        }
      } catch {}
    }
  }, []);

  const handleSubscribe = async (planId: string) => {
    if (!user) { setError('Necesitas una cuenta para suscribirte.'); return; }
    setLoading(planId); setError('');
    void trackEvent('pricing_checkout_started', { plan_id: planId, source: 'pricing_modal' });
    try {
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
          'Authorization': `Bearer ${session.access_token}`,
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

        {/* Propuesta de valor */}
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

        {/* Currency indicator */}
        {currency.code !== 'USD' && (
          <div style={{
            textAlign: 'center', fontSize: 10, color: '#ffffff44', marginBottom: 12,
          }}>
            💱 Precios en {currency.code} · Tipo de cambio actualizado en tiempo real
          </div>
        )}

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
              currency={currency}
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
            {currency.code !== 'USD' && ` · Precios en ${currency.code}`}
          </p>
        </div>
      </div>
    </div>
  );
};
