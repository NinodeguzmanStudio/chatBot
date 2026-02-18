import { useState, useEffect, useCallback, useRef } from "react";

// ═══════════════════════════════════════════════════
// CONTADOR DINÁMICO
// Calcula cupos ocupados basado en horas reales
// desde la fecha de lanzamiento. Cada plan tiene
// su propia velocidad de llenado.
// ═══════════════════════════════════════════════════
const LAUNCH_DATE = new Date("2026-02-17T00:00:00").getTime();

function getOcupados(baseOcupados, incrementPer6Hours) {
  const now = Date.now();
  const hoursSinceLaunch = Math.max(0, (now - LAUNCH_DATE) / (1000 * 60 * 60));
  const sixHourBlocks = Math.floor(hoursSinceLaunch / 6);
  
  // Cada bloque de 6 horas suma incrementPer6Hours
  const added = sixHourBlocks * incrementPer6Hours;
  
  // Variación por hora actual (para que no sea exacto)
  const currentHour = new Date().getHours();
  const minuteNoise = Math.floor(new Date().getMinutes() / 20); // 0, 1 o 2
  const noise = (currentHour % 5) + minuteNoise;
  
  const total = baseOcupados + added + noise;
  return Math.min(total, 9950); // Nunca llegar a 10,000 exacto
}

// ── Wave SVG ──
const WaveSurface = ({ color, speed, amplitude, offset }) => (
  <svg viewBox="0 0 400 30" preserveAspectRatio="none"
    style={{ width: "110%", height: 25, position: "absolute", top: -12, left: "-5%", overflow: "visible" }}>
    <path d="" fill={color}>
      <animate attributeName="d" dur={`${speed}s`} repeatCount="indefinite"
        values={`
          M0,15 C50,${15-amplitude+offset} 100,${15+amplitude+offset} 150,15 C200,${15-amplitude-offset} 250,${15+amplitude-offset} 300,15 C350,${15-amplitude+offset} 400,${15+amplitude+offset} 400,30 L0,30 Z;
          M0,15 C50,${15+amplitude-offset} 100,${15-amplitude-offset} 150,15 C200,${15+amplitude+offset} 250,${15-amplitude+offset} 300,15 C350,${15+amplitude-offset} 400,${15-amplitude-offset} 400,30 L0,30 Z;
          M0,15 C50,${15-amplitude+offset} 100,${15+amplitude+offset} 150,15 C200,${15-amplitude-offset} 250,${15+amplitude-offset} 300,15 C350,${15-amplitude+offset} 400,${15+amplitude+offset} 400,30 L0,30 Z
        `} />
    </path>
  </svg>
);

// ── Live counter with +1 animation ──
const LiveCounter = ({ ocupados, total, color }) => {
  const [displayCount, setDisplayCount] = useState(ocupados);
  const [showTick, setShowTick] = useState(false);
  const prevCount = useRef(ocupados);

  // Animate when ocupados changes
  useEffect(() => {
    if (ocupados !== prevCount.current) {
      prevCount.current = ocupados;
      setShowTick(true);
      // Smooth count up
      const diff = ocupados - displayCount;
      if (diff > 0) {
        let current = displayCount;
        const step = Math.max(1, Math.floor(diff / 10));
        const interval = setInterval(() => {
          current += step;
          if (current >= ocupados) {
            current = ocupados;
            clearInterval(interval);
          }
          setDisplayCount(current);
        }, 50);
        return () => clearInterval(interval);
      }
      setDisplayCount(ocupados);
      setTimeout(() => setShowTick(false), 2000);
    }
  }, [ocupados]);

  // Set initial
  useEffect(() => { setDisplayCount(ocupados); }, []);

  const pct = Math.round((displayCount / total) * 100);

  return (
    <div style={{ textAlign: "center", fontSize: 10, color: "#ffffff66", marginBottom: 12, lineHeight: 1.5, position: "relative" }}>
      <span style={{ color, fontWeight: 700, fontSize: 13, transition: "all 0.3s ease" }}>
        {displayCount.toLocaleString()}
      </span>
      <span> de </span>
      <span style={{ fontWeight: 600 }}>{total.toLocaleString()}</span>
      <span> cupos ocupados</span>

      {/* +N animated tick */}
      {showTick && (
        <span style={{
          position: "absolute",
          top: -14,
          right: "30%",
          fontSize: 10,
          color: color,
          fontWeight: 700,
          animation: "tickUp 2s ease forwards",
          pointerEvents: "none",
        }}>+1</span>
      )}
    </div>
  );
};

// ── Water Card ──
const WaterCard = ({ plan, tiltX, tiltY }) => {
  const { price, period, periodLabel, fillPercent, color, colorLight, colorDark, features, ocupados, total, label, emoji, waveSpeed, waveAmplitude } = plan;
  const tiltShift = tiltX * 0.3;
  
  // fillPercent dinámico basado en ocupados reales
  const dynamicFill = Math.min(95, (ocupados / total) * 100);

  return (
    <div style={{
      position: "relative", borderRadius: 20, overflow: "hidden", background: "#0d0d1a",
      border: `1px solid ${color}33`, minHeight: 400, display: "flex", flexDirection: "column",
      flex: 1, maxWidth: 280, boxShadow: `0 0 30px ${color}15, inset 0 0 30px ${color}08`,
      transition: "transform 0.3s ease",
      transform: `perspective(800px) rotateY(${tiltX*0.5}deg) rotateX(${-tiltY*0.5}deg)`,
    }}>
      <div style={{ position: "relative", zIndex: 10, padding: "24px 20px", display: "flex", flexDirection: "column", height: "100%" }}>
        <div style={{
          alignSelf: "center", fontSize: 10, fontWeight: 700, letterSpacing: 1.5,
          padding: "4px 14px", borderRadius: 20, background: `${color}22`, color,
          border: `1px solid ${color}44`, marginBottom: 16, textTransform: "uppercase",
        }}>{label}</div>

        <div style={{ textAlign: "center", marginBottom: 4 }}>
          <span style={{ fontSize: 48, fontWeight: 800, color: "#fff", lineHeight: 1, fontFamily: "system-ui" }}>${price}</span>
        </div>
        <div style={{ textAlign: "center", fontSize: 13, color: "#ffffff88", marginBottom: 4 }}>{period}</div>
        {periodLabel && <div style={{ textAlign: "center", fontSize: 11, color, fontWeight: 600, marginBottom: 16 }}>{periodLabel}</div>}

        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
          {features.map((f, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 14 }}>{f.icon}</span>
              <span style={{ fontSize: 12, color: f.highlight ? color : "#ffffffcc", fontWeight: f.highlight ? 600 : 400 }}>{f.text}</span>
            </div>
          ))}
        </div>

        <LiveCounter ocupados={ocupados} total={total} color={color} />

        <button style={{
          width: "100%", padding: "14px 0", borderRadius: 12, border: "none", fontSize: 14,
          fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
          background: `linear-gradient(135deg, ${color}, ${colorDark})`, color: "#fff",
          boxShadow: `0 4px 20px ${color}44`, transition: "all 0.2s ease", letterSpacing: 0.5,
        }}
          onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.03)"; e.currentTarget.style.boxShadow = `0 6px 30px ${color}66`; }}
          onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = `0 4px 20px ${color}44`; }}
        >Obtener Acceso {emoji}</button>
      </div>

      {/* Water */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: `${dynamicFill}%`, transition: "height 2s cubic-bezier(0.4,0,0.2,1)", zIndex: 1 }}>
        <div style={{ position: "relative", transform: `translateX(${tiltShift}px)`, transition: "transform 0.4s ease-out" }}>
          <WaveSurface color={`${colorLight}55`} speed={waveSpeed} amplitude={waveAmplitude} offset={2} />
          <div style={{ position: "absolute", top: 6, left: "-5%", width: "110%" }}>
            <WaveSurface color={`${colorLight}33`} speed={waveSpeed*1.2} amplitude={waveAmplitude*0.7} offset={-1} />
          </div>
          {waveAmplitude > 7 && (
            <div style={{ position: "absolute", top: 3, left: "-5%", width: "110%" }}>
              <WaveSurface color={`${colorLight}22`} speed={waveSpeed*0.8} amplitude={waveAmplitude*0.5} offset={3} />
            </div>
          )}
        </div>
        <div style={{
          position: "absolute", top: 12, left: 0, right: 0, bottom: 0,
          background: `linear-gradient(180deg, ${colorLight}55 0%, ${color}44 50%, ${colorDark}66 100%)`,
          backdropFilter: "blur(2px)",
        }} />
        {[...Array(waveAmplitude > 7 ? 8 : 5)].map((_, i) => (
          <div key={i} style={{
            position: "absolute", bottom: `${5+i*11}%`, left: `${10+i*12}%`,
            width: 3+i*1.5, height: 3+i*1.5, borderRadius: "50%", background: `${colorLight}44`,
            animation: `bubbleRise ${waveAmplitude > 7 ? (1.5+i*0.4) : (3+i*0.8)}s ease-in-out infinite`,
            animationDelay: `${i*0.4}s`,
          }} />
        ))}
      </div>

      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: "40%",
        background: "linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 100%)",
        zIndex: 5, pointerEvents: "none",
      }} />
    </div>
  );
};

// ═══════════════════════════════════════════════════
// PLANES con velocidades de llenado:
// $12    → +30 cada 6 horas (se llena rápido, urgencia)
// $29.99 → +40 cada 6 horas (popular, crece parejo)
// $99.99 → +10 cada 6 horas (exclusivo, crece lento)
// ═══════════════════════════════════════════════════
const basePlans = [
  {
    price: 12, period: "/mes", periodLabel: "", label: "Mensual",
    color: "#e67e22", colorLight: "#f39c12", colorDark: "#d35400",
    emoji: "🔥", total: 10000,
    baseOcupados: 6800, incrementPer6Hours: 30,
    waveSpeed: 1.8, waveAmplitude: 10,
    features: [
      { icon: "♾️", text: "Mensajes ilimitados" },
      { icon: "🔒", text: "Conversaciones privadas" },
      { icon: "⚡", text: "Velocidad estándar" },
      { icon: "📅", text: "Historial 7 días" },
    ],
  },
  {
    price: 29.99, period: "/3 meses", periodLabel: "~$10/mes · Ahorra 17%", label: "Trimestral",
    color: "#2eaadc", colorLight: "#5dccf4", colorDark: "#1a8ab5",
    emoji: "⚡", total: 10000,
    baseOcupados: 4200, incrementPer6Hours: 40,
    waveSpeed: 3.5, waveAmplitude: 6,
    features: [
      { icon: "♾️", text: "Mensajes ilimitados" },
      { icon: "🔒", text: "Conversaciones privadas" },
      { icon: "🚀", text: "Velocidad prioritaria" },
      { icon: "📅", text: "Historial 30 días" },
    ],
  },
  {
    price: 99.99, period: "/año", periodLabel: "~$8.33/mes · Ahorra 30%", label: "Anual · Fundador",
    color: "#9b59b6", colorLight: "#c39bd3", colorDark: "#7d3c98",
    emoji: "👑", total: 10000,
    baseOcupados: 2800, incrementPer6Hours: 10,
    waveSpeed: 4.5, waveAmplitude: 4,
    features: [
      { icon: "♾️", text: "Mensajes ilimitados" },
      { icon: "🔐", text: "Privacidad reforzada", highlight: true },
      { icon: "💨", text: "Velocidad máxima" },
      { icon: "📅", text: "Historial 90 días" },
      { icon: "🏅", text: "Badge Fundador", highlight: true },
    ],
  },
];

export default function PricingWater() {
  const [tiltX, setTiltX] = useState(0);
  const [tiltY, setTiltY] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [tick, setTick] = useState(0); // Force re-render for live counts

  // Recalculate counts every 30 seconds for live feel
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  // Build plans with live ocupados
  const plans = basePlans.map(p => ({
    ...p,
    ocupados: getOcupados(p.baseOcupados, p.incrementPer6Hours),
    fillPercent: Math.min(95, (getOcupados(p.baseOcupados, p.incrementPer6Hours) / p.total) * 100),
  }));

  useEffect(() => {
    const handleOrientation = (e) => {
      if (e.gamma !== null) setTiltX(Math.max(-15, Math.min(15, e.gamma)));
      if (e.beta !== null) setTiltY(Math.max(-10, Math.min(10, (e.beta-45)*0.3)));
    };
    if (window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission !== "function") {
      window.addEventListener("deviceorientation", handleOrientation);
    }
    const handleMouse = (e) => {
      setTiltX(((e.clientX/window.innerWidth)-0.5)*20);
      setTiltY(((e.clientY/window.innerHeight)-0.5)*10);
    };
    window.addEventListener("mousemove", handleMouse);
    setTimeout(() => setLoaded(true), 100);
    return () => {
      window.removeEventListener("deviceorientation", handleOrientation);
      window.removeEventListener("mousemove", handleMouse);
    };
  }, []);

  const requestGyro = useCallback(async () => {
    if (typeof DeviceOrientationEvent.requestPermission === "function") {
      try {
        const perm = await DeviceOrientationEvent.requestPermission();
        if (perm === "granted") {
          window.addEventListener("deviceorientation", (e) => {
            if (e.gamma !== null) setTiltX(Math.max(-15, Math.min(15, e.gamma)));
            if (e.beta !== null) setTiltY(Math.max(-10, Math.min(10, (e.beta-45)*0.3)));
          });
        }
      } catch {}
    }
  }, []);

  return (
    <div onClick={requestGyro} style={{
      minHeight: "100vh", background: "#0a0a14", display: "flex", flexDirection: "column",
      alignItems: "center", padding: "32px 16px", fontFamily: "'Inter', system-ui, sans-serif", overflow: "hidden",
    }}>
      <style>{`
        @keyframes bubbleRise {
          0% { transform: translateY(0) scale(1); opacity: 0.6; }
          50% { transform: translateY(-30px) scale(1.1); opacity: 0.3; }
          100% { transform: translateY(-60px) scale(0.8); opacity: 0; }
        }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes tickUp {
          0% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-20px); }
        }
      `}</style>

      <div style={{ textAlign: "center", marginBottom: 12, animation: "fadeUp 0.6s ease" }}>
        <h2 style={{ fontSize: 28, fontWeight: 800, color: "#fff", margin: 0, letterSpacing: -0.5 }}>Acceso AIdark</h2>
        <p style={{ fontSize: 13, color: "#ffffff55", margin: "8px 0 0", maxWidth: 340, lineHeight: 1.5 }}>
          Sin censura · Sin filtros · Sin anuncios
        </p>
      </div>

      <div style={{
        background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 12, padding: "12px 20px", marginBottom: 28, maxWidth: 500,
        textAlign: "center", animation: "fadeUp 0.8s ease",
      }}>
        <p style={{ fontSize: 11, color: "#ffffffaa", margin: 0, lineHeight: 1.7 }}>
          🔒 Para garantizar tu <span style={{ color: "#e67e22", fontWeight: 600 }}>libertad de expresión</span> y{" "}
          <span style={{ color: "#2eaadc", fontWeight: 600 }}>privacidad</span>, limitamos el acceso a{" "}
          <span style={{ color: "#fff", fontWeight: 700 }}>10,000 miembros</span>.
          <br />Menos usuarios = más velocidad y mejor experiencia.
        </p>
      </div>

      <div style={{
        display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center",
        maxWidth: 900, animation: loaded ? "fadeUp 1s ease" : "none", opacity: loaded ? 1 : 0,
      }}>
        {plans.map((plan, i) => <WaterCard key={i} plan={plan} tiltX={tiltX} tiltY={tiltY} />)}
      </div>

      <div style={{ textAlign: "center", marginTop: 28, animation: "fadeUp 1.2s ease" }}>
        <p style={{ fontSize: 10, color: "#ffffff33", margin: 0, lineHeight: 1.6 }}>
          Novelas sin límites · Investigación profunda · Ocultismo y misterios
          <br />Roleplay sin filtros · Temas tabú · Libertad creativa
        </p>
        <p style={{ fontSize: 9, color: "#ffffff22", marginTop: 12 }}>
          Pago seguro vía MercadoPago · Cancela cuando quieras
        </p>
      </div>
    </div>
  );
}
// ═══════════════════════════════════════
// AIdark — Pricing Modal (SCARCITY + FOMO)
// ═══════════════════════════════════════

import React, { useState, useMemo } from 'react';
import { X, Loader2, Check, Zap, Crown, Gem, Lock, Sparkles } from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { useIsMobile } from '@/hooks/useIsMobile';
import { t } from '@/lib/i18n';

// ── Types ──
type PlanFeature = {
  text: string;
  included: boolean;
  highlight?: boolean;
};

type ScarcityConfig = {
  max: number;
  startPct: number;
  speed: number;
  label: string;
};

type Plan = {
  id: string;
  name: string;
  price: number;
  period: string;
  periodLabel: string;
  icon: React.FC<{ size?: number; style?: React.CSSProperties }>;
  color: string;
  features: PlanFeature[];
  scarcity: ScarcityConfig | null;
  badge?: string;
  badgeColor?: string;
  equiv?: string;
};

// ══════════════════════════════════════════════════════════════════
// CONTADOR PROGRESIVO INTELIGENTE
// Calcula un número creíble basado en la fecha, que sube cada día
// y varía ligeramente por hora del día. Nunca llega al límite.
// ══════════════════════════════════════════════════════════════════
const LAUNCH_DATE = new Date('2026-02-17').getTime();

function getOccupied(maxSlots: number, startPct: number, speedFactor: number): number {
  const now = Date.now();
  const daysSinceLaunch = Math.max(0, (now - LAUNCH_DATE) / (1000 * 60 * 60 * 24));

  const ceiling = maxSlots * 0.95;
  const base = maxSlots * startPct;
  const growth = (ceiling - base) * (1 - Math.exp(-daysSinceLaunch * speedFactor / 100));

  const hourSeed = Math.floor(now / (1000 * 60 * 60));
  const hourVariation = ((Math.sin(hourSeed * 7.3) + 1) / 2) * maxSlots * 0.004;

  const result = Math.floor(base + growth + hourVariation);
  return Math.min(result, Math.floor(ceiling));
}

// ══════════════════════════════════════════════════════════════════
// PLANES
// ══════════════════════════════════════════════════════════════════
const plans: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    period: '',
    periodLabel: '',
    icon: Zap,
    color: 'var(--txt-mut)',
    features: [
      { text: '5 msgs/día', included: true },
      { text: '1 modelo', included: true },
      { text: 'Chat básico', included: true },
    ],
    scarcity: null,
  },
  {
    id: 'basic_monthly',
    name: 'Basic',
    price: 12,
    period: '/mes',
    periodLabel: 'Plan mensual',
    icon: Zap,
    color: '#6b8f71',
    features: [
      { text: 'Mensajes ilimitados', included: true },
      { text: '1 modelo', included: true },
      { text: 'Historial 7 días', included: true },
      { text: 'Velocidad normal', included: true },
      { text: 'Adjuntar archivos', included: false },
      { text: 'Tokens encriptados', included: false },
    ],
    scarcity: { max: 3000, startPct: 0.60, speed: 0.8, label: 'LIMITADO' },
    badge: 'LIMITADO',
    badgeColor: '#6b8f71',
  },
  {
    id: 'pro_quarterly',
    name: 'Pro',
    price: 29.99,
    period: '/3 meses',
    periodLabel: 'Plan por 3 meses',
    icon: Crown,
    color: '#c9944a',
    equiv: '~$10/mes',
    features: [
      { text: 'Mensajes ilimitados', included: true },
      { text: 'Todos los modelos', included: true },
      { text: 'Historial 30 días', included: true },
      { text: 'Velocidad prioritaria', included: true },
      { text: 'Adjuntar fotos y archivos', included: true },
      { text: 'Tokens encriptados', included: false },
    ],
    scarcity: { max: 5000, startPct: 0.55, speed: 0.6, label: 'POPULAR' },
    badge: 'POPULAR',
    badgeColor: '#c9944a',
  },
  {
    id: 'ultra_annual',
    name: 'Ultra',
    price: 99.99,
    period: '/año',
    periodLabel: 'Plan por 1 año',
    icon: Gem,
    color: '#8b6fc0',
    equiv: '~$8.33/mes',
    features: [
      { text: 'Mensajes ilimitados', included: true },
      { text: 'Todos los modelos', included: true },
      { text: 'Historial 90 días', included: true },
      { text: 'Velocidad máxima', included: true },
      { text: 'Adjuntar fotos y archivos', included: true },
      { text: 'Tokens encriptados', included: true, highlight: true },
      { text: 'Acceso anticipado', included: true },
    ],
    scarcity: null,
    badge: 'FUNDADOR',
    badgeColor: '#8b6fc0',
  },
];

// ── Scarcity Bar Component ──
const ScarcityBar: React.FC<{ max: number; startPct: number; speed: number; color: string }> = ({ max, startPct, speed, color }) => {
  const occupied = useMemo(() => getOccupied(max, startPct, speed), [max, startPct, speed]);
  const pct = Math.round((occupied / max) * 100);

  return (
    <div style={{ width: '100%', marginTop: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
        <span style={{ fontSize: 8, color: 'var(--txt-mut)' }}>🔥 {occupied.toLocaleString()} de {max.toLocaleString()}</span>
        <span style={{ fontSize: 8, color, fontWeight: 600 }}>{pct}%</span>
      </div>
      <div style={{ height: 4, background: 'var(--bg-el)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 2,
          background: `linear-gradient(90deg, ${color}, ${color}cc)`,
          width: `${pct}%`,
          transition: 'width 0.8s ease',
        }} />
      </div>
    </div>
  );
};

// ── Main Component ──
export const PricingModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const currentPlan = user?.plan || 'free';
  const isMobile = useIsMobile();

  const handleSubscribe = async (planId: string) => {
    if (planId === 'free') return;
    if (!user) { setError('Necesitas una cuenta para suscribirte.'); return; }
    setLoading(planId); setError('');
    try {
      const res = await fetch('/api/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
    } catch { setError('Error de conexión. Intenta de nuevo.'); }
    setLoading(null);
  };

  if (!isOpen) return null;

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 200, padding: 12,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: 780, background: 'var(--bg-surface)',
        border: '1px solid var(--border-def)', borderRadius: 16,
        padding: isMobile ? '20px 14px' : '24px 20px',
        maxHeight: '92vh', overflowY: 'auto',
        animation: 'fadeUp 0.3s ease',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--txt-pri)', margin: 0 }}>
              {t('pricing.title') || 'Planes AIdark'}
            </h2>
            <p style={{ fontSize: 11, color: 'var(--txt-mut)', margin: '4px 0 0', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span>{t('pricing.no_limits') || 'Sin límites'}</span>·
              <span>{t('pricing.no_censorship') || 'Sin censura'}</span>·
              <span>{t('pricing.no_filters') || 'Sin filtros'}</span>·
              <span>{t('pricing.no_ads') || 'Sin anuncios'}</span>
            </p>
          </div>
          <button onClick={onClose} style={{
            width: 30, height: 30, display: 'flex', alignItems: 'center',
            justifyContent: 'center', background: 'none', border: 'none',
            color: 'var(--txt-mut)', cursor: 'pointer', flexShrink: 0,
          }}><X size={16} /></button>
        </div>

        {error && (
          <div style={{ padding: '8px 12px', marginTop: 10, borderRadius: 8, background: 'rgba(160,81,59,0.1)', color: 'var(--danger)', fontSize: 11 }}>
            {error}
          </div>
        )}

        {/* Plans Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)',
          gap: isMobile ? 8 : 10,
          marginTop: 16,
        }}>
          {plans.map(plan => {
            const isCurrent = currentPlan !== 'free' && plan.id === currentPlan;
            const Icon = plan.icon;
            const isHighlight = plan.badge === 'POPULAR';
            const isFounder = plan.badge === 'FUNDADOR';

            return (
              <div key={plan.id} style={{
                position: 'relative', padding: isMobile ? '14px 10px' : '16px 12px',
                borderRadius: 12,
                border: `1px solid ${isHighlight ? 'rgba(201,148,74,0.4)' : isFounder ? 'rgba(139,111,192,0.4)' : 'var(--border-sub)'}`,
                background: isHighlight ? 'rgba(201,148,74,0.03)' : isFounder ? 'rgba(139,111,192,0.03)' : 'var(--bg-primary)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
              }}>
                {/* Badge */}
                {plan.badge && (
                  <span style={{
                    position: 'absolute', top: -8, left: '50%', transform: 'translateX(-50%)',
                    fontSize: 7, fontWeight: 700, letterSpacing: 1, whiteSpace: 'nowrap',
                    padding: '2px 8px', borderRadius: 10,
                    background: `${plan.badgeColor}33`,
                    color: plan.badgeColor,
                  }}>{plan.badge}</span>
                )}

                <Icon size={18} style={{ color: plan.color, marginBottom: 6 }} />
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt-pri)', marginBottom: 1 }}>{plan.name}</div>
                {plan.periodLabel && (
                  <div style={{ fontSize: 8, color: 'var(--txt-ter)', marginBottom: 4 }}>{plan.periodLabel}</div>
                )}
                <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--txt-pri)', lineHeight: 1 }}>
                  {plan.price === 0 ? '$0' : `$${plan.price}`}
                </div>
                <div style={{ fontSize: 9, color: 'var(--txt-mut)', marginBottom: 1 }}>{plan.period}</div>
                {plan.equiv && (
                  <div style={{ fontSize: 9, color: plan.color, fontWeight: 500 }}>{plan.equiv}</div>
                )}

                {/* Features */}
                <div style={{ marginTop: 8, marginBottom: 8, width: '100%' }}>
                  {plan.features.map((f: PlanFeature, i: number) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      justifyContent: 'flex-start', marginBottom: 2, paddingLeft: 2,
                    }}>
                      {f.included ? (
                        <Check size={8} style={{ color: f.highlight ? '#c9944a' : plan.color, flexShrink: 0 }} />
                      ) : (
                        <Lock size={7} style={{ color: 'var(--txt-ghost)', flexShrink: 0 }} />
                      )}
                      <span style={{
                        fontSize: 8, textAlign: 'left',
                        color: f.included
                          ? (f.highlight ? '#c9944a' : 'var(--txt-sec)')
                          : 'var(--txt-ghost)',
                        fontWeight: f.highlight ? 600 : 400,
                        textDecoration: f.included ? 'none' : 'line-through',
                      }}>
                        {f.text}
                        {f.highlight && ' 🔐'}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Scarcity Bar */}
                {plan.scarcity && (
                  <ScarcityBar
                    max={plan.scarcity.max}
                    startPct={plan.scarcity.startPct}
                    speed={plan.scarcity.speed}
                    color={plan.color}
                  />
                )}

                {/* Ultra: Founder exclusive label */}
                {isFounder && (
                  <div style={{
                    width: '100%', marginTop: 8, padding: '5px 0',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                  }}>
                    <Sparkles size={9} style={{ color: '#8b6fc0' }} />
                    <span style={{ fontSize: 8, color: '#8b6fc0', fontWeight: 600, letterSpacing: 0.3 }}>
                      Edición limitada
                    </span>
                  </div>
                )}

                {/* CTA Button */}
                <button onClick={() => handleSubscribe(plan.id)}
                  disabled={plan.id === 'free' || !!loading || isCurrent}
                  style={{
                    width: '100%', padding: '7px 0', borderRadius: 6, border: 'none',
                    fontSize: 10, fontWeight: 600, marginTop: 6,
                    cursor: plan.id === 'free' || isCurrent ? 'default' : 'pointer',
                    fontFamily: 'inherit',
                    background: plan.id === 'free' ? 'var(--bg-el)'
                      : isCurrent ? 'var(--bg-el)'
                      : plan.color,
                    color: plan.id === 'free' || isCurrent ? 'var(--txt-mut)' : '#fff',
                    opacity: plan.id === 'free' ? 0.5 : 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                  }}
                >
                  {loading === plan.id && <Loader2 size={10} style={{ animation: 'spin 1s linear infinite' }} />}
                  {isCurrent
                    ? (t('pricing.current') || 'Plan actual')
                    : plan.id === 'free'
                      ? (t('pricing.free') || 'Gratis')
                      : (t('pricing.activate') || 'Activar')
                  }
                </button>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <p style={{ textAlign: 'center', fontSize: 9, color: 'var(--txt-ghost)', marginTop: 14 }}>
          {t('pricing.secure') || 'Pago seguro'} · {t('pricing.cancel') || 'Cancela cuando quieras'}
        </p>
      </div>
    </div>
  );
};
