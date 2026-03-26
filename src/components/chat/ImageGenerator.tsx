// ═══════════════════════════════════════
// AIdark — Image Generator v4 (FIXED)
// CAMBIOS v4:
//   [1] Free users get 2 images/day (before: blocked entirely)
//   [2] Premium banner shows AFTER free limit, not before
//   [3] FREE_IMAGE_LIMIT error code handled
//   [4] Button opens pricing when free limit reached
// ═══════════════════════════════════════

import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Download, X, ChevronDown, AlertTriangle, HelpCircle } from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { useIsMobile } from '@/hooks/useIsMobile';

// FIX: agregados ultra_annual y pro_quarterly
const ANIME_PLANS = new Set([
  'premium_quarterly', 'premium_annual',
  'pro_quarterly', 'ultra_annual',
]);

// FIX v4: free users get 2 images/day
const DAILY_LIMITS: Record<string, number> = {
  free:              2,
  premium_monthly:   10,
  premium_quarterly: 25,
  premium_annual:    50,
  basic_monthly:     10,
  pro_quarterly:     25,
  ultra_annual:      50,
};

const ANIME_STYLES = [
  { id: 'hentai', label: '🔥 Hentai clásico' },
  { id: 'manhwa', label: '🎌 Manhwa coreano' },
  { id: 'manga',  label: '🖤 Manga oscuro' },
  { id: 'ecchi',  label: '🌸 Ecchi / Fanservice' },
];
const RATIOS = [
  { label: '1:1',  w: 1024, h: 1024 },
  { label: '9:16', w: 720,  h: 1280 },
  { label: '16:9', w: 1280, h: 720  },
  { label: '4:3',  w: 1024, h: 768  },
];

const BASE_CUPOS = 500;
const LAUNCH = new Date('2026-02-17T00:00:00').getTime();

function getCuposRestantes(): number {
  const hours = Math.max(0, (Date.now() - LAUNCH) / 3_600_000);
  const seed = Math.floor(hours);
  const pseudoRandom = (seed * 9301 + 49297) % 233280;
  const baseDropPerHour = 1 + (pseudoRandom % 3);
  const totalDrop = Math.floor(hours) * baseDropPerHour;
  const sessionDrop = parseInt(sessionStorage.getItem('aidark_cupos_drop') || '0', 10);
  return Math.max(12, BASE_CUPOS - totalDrop - sessionDrop);
}

function decrementSessionCupos() {
  const current = parseInt(sessionStorage.getItem('aidark_cupos_drop') || '0', 10);
  const drop = Math.floor(Math.random() * 2) + 1;
  sessionStorage.setItem('aidark_cupos_drop', String(current + drop));
}

const Wave: React.FC<{ color: string; speed: number; amp: number; offset: number }> = ({ color, speed, amp, offset }) => (
  <svg viewBox="0 0 400 40" preserveAspectRatio="none"
    style={{ width: '115%', height: 35, position: 'absolute', top: -18, left: '-7%', overflow: 'visible' }}>
    <path d="" fill={color}>
      <animate attributeName="d" dur={`${speed}s`} repeatCount="indefinite"
        values={`
          M0,20 C40,${20-amp+offset} 80,${20+amp} 120,20 C160,${20-amp} 200,${20+amp+offset} 240,20 C280,${20-amp+offset} 320,${20+amp} 360,20 C380,${20-amp} 400,${20+amp} 400,40 L0,40 Z;
          M0,20 C40,${20+amp} 80,${20-amp+offset} 120,20 C160,${20+amp+offset} 200,${20-amp} 240,20 C280,${20+amp} 320,${20-amp+offset} 360,20 C380,${20+amp+offset} 400,${20-amp} 400,40 L0,40 Z;
          M0,20 C40,${20-amp+offset} 80,${20+amp} 120,20 C160,${20-amp} 200,${20+amp+offset} 240,20 C280,${20-amp+offset} 320,${20+amp} 360,20 C380,${20-amp} 400,${20+amp} 400,40 L0,40 Z
        `} />
    </path>
  </svg>
);

const SplashDrops: React.FC<{ color: string }> = ({ color }) => (
  <>
    {[...Array(12)].map((_, i) => (
      <div key={i} style={{
        position: 'absolute', top: -2, left: `${6 + i * 8}%`,
        width: i % 3 === 0 ? 5 : 3, height: i % 3 === 0 ? 5 : 3,
        borderRadius: '50%', background: color,
        animation: `splash${i % 4} ${0.8 + (i % 3) * 0.3}s ease-out infinite`,
        animationDelay: `${i * 0.12}s`, pointerEvents: 'none', zIndex: 20,
      }} />
    ))}
  </>
);

const CuposTooltip: React.FC = () => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    if (open) document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-flex' }}>
      <button onClick={() => setOpen(!open)} style={{
        background: 'none', border: 'none', padding: 0, cursor: 'pointer',
        display: 'flex', alignItems: 'center', color: '#ffffff44',
      }}>
        <HelpCircle size={13} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', bottom: '110%', left: '50%', transform: 'translateX(-50%)',
          width: 270, background: '#0f1620', border: '1px solid rgba(0,188,212,0.25)',
          borderRadius: 12, padding: '14px 15px', zIndex: 200,
          boxShadow: '0 8px 28px rgba(0,0,0,0.7)',
          animation: 'fadeInTooltip 0.15s ease',
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#45d4fa', marginBottom: 7 }}>
            ¿Por qué hay límite de cupos?
          </div>
          <div style={{ fontSize: 11, color: '#ffffffaa', lineHeight: 1.65 }}>
            AIdark admite hasta <strong style={{ color: '#fff' }}>10,000 miembros</strong> en total, pero el generador opera con acceso simultáneo limitado a <strong style={{ color: '#fff' }}>500 usuarios activos</strong>. Esto garantiza velocidad, privacidad y que cada imagen se procese a través de nuestro pipeline sin restricciones, fuera de las políticas de las plataformas convencionales.
          </div>
          <div style={{
            position: 'absolute', bottom: -6, left: '50%',
            width: 10, height: 10, background: '#0f1620',
            borderRight: '1px solid rgba(0,188,212,0.25)', borderBottom: '1px solid rgba(0,188,212,0.25)',
            transform: 'translateX(-50%) rotate(45deg)',
          }} />
        </div>
      )}
    </div>
  );
};

const PremiumBanner: React.FC<{ onOpenPricing: () => void; onClose: () => void }> = ({ onOpenPricing, onClose }) => {
  const [cupos, setCupos] = useState(getCuposRestantes());
  const [minusAnim, setMinusAnim] = useState(false);

  useEffect(() => {
    decrementSessionCupos();
    setCupos(getCuposRestantes());
    const interval = setInterval(() => {
      const drop = parseInt(sessionStorage.getItem('aidark_cupos_drop') || '0', 10);
      sessionStorage.setItem('aidark_cupos_drop', String(drop + 1));
      setCupos(getCuposRestantes());
      setMinusAnim(true);
      setTimeout(() => setMinusAnim(false), 1800);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const C = { main: '#00bcd4', light: '#45d4fa', dark: '#0097a7', mid: '#26c6da' };
  const fill = Math.min(97, ((BASE_CUPOS - cupos) / BASE_CUPOS) * 100 + 68);
  const isAlmostFull = cupos <= 80;

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ maxWidth: 440, width: '100%', position: 'relative' }}>
        <button onClick={onClose} style={{
          position: 'absolute', top: -8, right: -8, zIndex: 50,
          width: 28, height: 28, borderRadius: '50%',
          background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(255,255,255,0.15)',
          color: '#ffffff88', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <X size={13} />
        </button>

        <div style={{
          borderRadius: 14, overflow: 'hidden',
          border: `1px solid ${C.main}55`,
          boxShadow: `0 0 30px ${C.main}22, inset 0 0 30px ${C.main}08`,
          position: 'relative', minHeight: 420, background: '#080e14',
        }}>
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            height: `${fill}%`, transition: 'height 4s ease', zIndex: 1, overflow: 'visible',
          }}>
            <SplashDrops color={C.light} />
            <div style={{ position: 'relative' }}>
              <Wave color={`${C.light}77`} speed={0.9} amp={18} offset={4} />
              <div style={{ position: 'absolute', top: 5, left: '-7%', width: '115%' }}>
                <Wave color={`${C.mid}55`} speed={1.3} amp={14} offset={-3} />
              </div>
              <div style={{ position: 'absolute', top: 10, left: '-5%', width: '110%' }}>
                <Wave color={`${C.dark}44`} speed={0.7} amp={20} offset={6} />
              </div>
            </div>
            <div style={{
              position: 'absolute', top: 18, left: 0, right: 0, bottom: 0,
              background: `linear-gradient(180deg, ${C.light}55 0%, ${C.main}44 40%, ${C.dark}66 100%)`,
            }} />
            {[...Array(10)].map((_, i) => (
              <div key={i} style={{
                position: 'absolute', bottom: `${4 + i * 9}%`, left: `${5 + i * 9}%`,
                width: 2 + (i % 3) * 2, height: 2 + (i % 3) * 2, borderRadius: '50%',
                background: `${C.light}66`,
                animation: `bubbleRise ${1.2 + i * 0.4}s ease-in-out infinite`,
                animationDelay: `${i * 0.3}s`,
              }} />
            ))}
          </div>

          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: '35%',
            background: 'linear-gradient(180deg, rgba(0,188,212,0.04) 0%, transparent 100%)',
            zIndex: 5, pointerEvents: 'none',
          }} />

          <div style={{ position: 'relative', zIndex: 10, padding: '20px 18px 18px' }}>
            <div style={{ textAlign: 'center', marginBottom: 14 }}>
              <div style={{ fontSize: 26, marginBottom: 6 }}>🔒</div>
              <h2 style={{ fontSize: 17, fontWeight: 800, color: '#fff', margin: '0 0 3px', letterSpacing: -0.3 }}>
                Imágenes sin censura
              </h2>
              <p style={{ fontSize: 10, color: C.light, margin: 0, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 600 }}>
                HD · Fotorrealista · Sin filtros
              </p>
            </div>

            <div style={{
              background: 'rgba(0,0,0,0.45)', borderRadius: 10,
              padding: '12px 14px', marginBottom: 14,
              backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.06)',
            }}>
              {[
                { icon: '📸', text: 'Desnudos fotorrealistas HD',    tag: 'Mensual+' },
                { icon: '💋', text: 'Escenas íntimas explícitas',    tag: 'Mensual+' },
                { icon: '🔥', text: 'Hentai clásico sin censura',    tag: 'Trimestral+' },
                { icon: '🎌', text: 'Manhwa coreano adulto',         tag: 'Trimestral+' },
                { icon: '✨', text: 'Calidad 8K · AIdark GIX2209 · Lustify SDXL', tag: 'Todos' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: i < 4 ? 7 : 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span style={{ fontSize: 14 }}>{item.icon}</span>
                    <span style={{ fontSize: 11, color: '#ffffffcc' }}>{item.text}</span>
                  </div>
                  <span style={{
                    fontSize: 8, padding: '2px 6px', borderRadius: 8, whiteSpace: 'nowrap',
                    background: `${C.main}22`, color: C.light, border: `1px solid ${C.main}44`, fontWeight: 700,
                  }}>{item.tag}</span>
                </div>
              ))}
            </div>

            <div style={{ textAlign: 'center', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, marginBottom: 4 }}>
                <span style={{ fontSize: 10, color: '#ffffff55' }}>
                  {isAlmostFull ? '🔴 Cupos casi agotados' : '🟡 Cupos disponibles — en tiempo real'}
                </span>
                <CuposTooltip />
              </div>
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <span style={{ color: C.light, fontWeight: 900, fontSize: 28, letterSpacing: -1 }}>{cupos}</span>
                <span style={{ color: '#ffffff55', fontSize: 12 }}> cupos restantes</span>
                {minusAnim && (
                  <span style={{
                    position: 'absolute', top: -14, right: -16,
                    fontSize: 11, color: '#ff6b6b', fontWeight: 800,
                    animation: 'minusFloat 1.8s ease forwards',
                  }}>-1</span>
                )}
              </div>
              <div style={{ height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.08)', marginTop: 8, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 3,
                  width: `${Math.min(97, 100 - (cupos / BASE_CUPOS) * 100)}%`,
                  background: `linear-gradient(90deg, ${C.dark}, ${C.main}, ${C.light})`,
                  transition: 'width 1s ease', boxShadow: `0 0 8px ${C.main}`,
                }} />
              </div>
              <div style={{ fontSize: 9, color: isAlmostFull ? '#ff9800' : '#ffffff33', marginTop: 5, fontWeight: isAlmostFull ? 700 : 400 }}>
                {isAlmostFull
                  ? `⚡ Quedan solo ${cupos} lugares disponibles`
                  : `${BASE_CUPOS - cupos} de 10,000 miembros ya se suscribieron`}
              </div>
            </div>

            <button onClick={onOpenPricing} style={{
              width: '100%', padding: '13px 0', borderRadius: 11, border: 'none',
              background: `linear-gradient(135deg, ${C.main}, ${C.dark})`,
              color: '#fff', fontSize: 13, fontWeight: 800,
              cursor: 'pointer', fontFamily: 'inherit', letterSpacing: 0.3,
              boxShadow: `0 4px 20px ${C.main}55`,
              animation: 'glowCyan 2s ease-in-out infinite',
            }}>
              🔓 HAZTE PREMIUM · {cupos} cupos
            </button>
            <p style={{ fontSize: 9, color: '#ffffff22', textAlign: 'center', margin: '8px 0 0' }}>
              Pago seguro · Cancela cuando quieras
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes splash0 { 0%{transform:translateY(0) scale(1);opacity:.9} 100%{transform:translateY(-18px) translateX(4px) scale(0);opacity:0} }
        @keyframes splash1 { 0%{transform:translateY(0) scale(1);opacity:.8} 100%{transform:translateY(-24px) translateX(-6px) scale(0);opacity:0} }
        @keyframes splash2 { 0%{transform:translateY(0) scale(1);opacity:.9} 100%{transform:translateY(-14px) translateX(8px) scale(0);opacity:0} }
        @keyframes splash3 { 0%{transform:translateY(0) scale(1);opacity:.7} 100%{transform:translateY(-20px) translateX(-4px) scale(0);opacity:0} }
        @keyframes bubbleRise { 0%{transform:translateY(0) scale(1);opacity:.7} 50%{transform:translateY(-20px) scale(1.1);opacity:.3} 100%{transform:translateY(-40px) scale(.7);opacity:0} }
        @keyframes glowCyan { 0%,100%{box-shadow:0 4px 20px rgba(0,188,212,.5)} 50%{box-shadow:0 4px 35px rgba(0,188,212,.85)} }
        @keyframes minusFloat { 0%{opacity:1;transform:translateY(0)} 100%{opacity:0;transform:translateY(-22px)} }
        @keyframes fadeInTooltip { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  );
};

const CloseToast: React.FC<{ cupos: number; onOpenPricing: () => void }> = ({ cupos, onOpenPricing }) => (
  <div style={{
    position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
    zIndex: 999, background: '#111', border: '1px solid rgba(0,188,212,0.3)',
    borderRadius: 12, padding: '10px 16px',
    display: 'flex', alignItems: 'center', gap: 10,
    animation: 'slideUpToast 0.3s ease', boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
    whiteSpace: 'nowrap',
  }}>
    <span style={{ fontSize: 12, color: '#ffffffaa' }}>⚡ Quedan <strong style={{ color: '#45d4fa' }}>{cupos}</strong> cupos</span>
    <button onClick={onOpenPricing} style={{
      padding: '5px 12px', borderRadius: 8, border: 'none',
      background: '#00bcd4', color: '#fff', fontSize: 11,
      fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
    }}>Hazte Premium</button>
  </div>
);

const LoseImageWarning: React.FC<{ onConfirm: () => void; onCancel: () => void }> = ({ onConfirm, onCancel }) => (
  <div style={{
    position: 'fixed', inset: 0, zIndex: 500,
    background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
  }}>
    <div style={{
      background: '#121212', border: '1px solid rgba(255,100,100,0.3)',
      borderRadius: 16, padding: '26px 22px', maxWidth: 340, width: '100%', textAlign: 'center',
    }}>
      <AlertTriangle size={32} color="#e67e22" style={{ marginBottom: 12 }} />
      <h3 style={{ color: '#fff', fontSize: 15, fontWeight: 700, margin: '0 0 8px' }}>¿Eliminar la imagen?</h3>
      <p style={{ color: '#ffffff77', fontSize: 12, lineHeight: 1.6, margin: '0 0 18px' }}>
        No almacenamos imágenes por privacidad. Si la eliminas sin descargar, <strong style={{ color: '#e67e22' }}>se perderá para siempre</strong>.
      </p>
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onCancel} style={{
          flex: 1, padding: '10px 0', borderRadius: 10,
          border: '1px solid rgba(255,255,255,0.15)', background: 'transparent',
          color: '#ffffffaa', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
        }}>← Volver</button>
        <button onClick={onConfirm} style={{
          flex: 1, padding: '10px 0', borderRadius: 10, border: 'none',
          background: 'rgba(180,60,60,0.3)', color: '#ff8888',
          fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600,
        }}>Sí, eliminar</button>
      </div>
    </div>
  </div>
);

interface GeneratedImage { src: string; prompt: string; category: string; id: string; }

export const ImageGenerator: React.FC<{ onOpenPricing: () => void }> = ({ onOpenPricing }) => {
  const { user } = useAuthStore();
  const isMobile = useIsMobile();

  const plan       = (user as any)?.plan || 'free';
  const isPremium  = plan !== 'free';
  const canAnime   = ANIME_PLANS.has(plan);
  const dailyLimit = DAILY_LIMITS[plan] || 2;

  const [showBanner, setShowBanner] = useState(true);
  const [showToast, setShowToast]   = useState(false);
  const [category, setCategory]     = useState<'realistic' | 'anime'>('realistic');
  const [animeStyle, setAnimeStyle] = useState('hentai');
  const [prompt, setPrompt]         = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [ratio, setRatio]           = useState(RATIOS[0]);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const [gallery, setGallery]       = useState<GeneratedImage[]>([]);
  const [usedToday, setUsedToday]   = useState(0);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [warnClose, setWarnClose]   = useState<string | null>(null);

  const handleCloseBanner = () => {
    setShowBanner(false);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 4000);
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || loading) return;
    setLoading(true); setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Inicia sesión para generar imágenes.');
      const res = await fetch('/api/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({
          prompt: prompt.trim(),
          negative_prompt: negativePrompt.trim() || undefined,
          category, style: animeStyle,
          width: ratio.w, height: ratio.h,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.code === 'PREMIUM_REQUIRED' || data.code === 'ANIME_PLAN_REQUIRED' || data.code === 'FREE_IMAGE_LIMIT') { onOpenPricing(); return; }
        throw new Error(data.error || 'Error generando imagen');
      }
      if (data.images?.length) {
        const mime = data.mime_type || 'image/png';
        setUsedToday(data.used);
        setGallery(prev => [
          ...data.images.map((b64: string, i: number) => ({
            src: `data:${mime};base64,${b64}`,
            prompt: prompt.trim(), category,
            id: `${Date.now()}-${i}`,
          })),
          ...prev,
        ].slice(0, 10));
      }
    } catch (err: any) {
      setError(err.message || 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (img: GeneratedImage) => {
    const ext = img.src.includes('image/jpeg') ? 'jpg' : img.src.includes('image/webp') ? 'webp' : 'png';
    const a = document.createElement('a');
    a.href = img.src; a.download = `aidark-${img.category}-${Date.now()}.${ext}`; a.click();
  };

  // FIX v4: Free users can generate 2 images
  // Show premium banner only AFTER they used their free images
  const freeUsedUp = !isPremium && usedToday >= 2;

  if (!isPremium && showBanner && freeUsedUp) {
    return (
      <>
        <PremiumBanner onOpenPricing={onOpenPricing} onClose={handleCloseBanner} />
        {showToast && <CloseToast cupos={getCuposRestantes()} onOpenPricing={onOpenPricing} />}
      </>
    );
  }

  const remaining = dailyLimit - usedToday;

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '14px 12px' : '20px 18px' }}>
      {warnClose && <LoseImageWarning onConfirm={() => { setGallery(p => p.filter(i => i.id !== warnClose)); setWarnClose(null); }} onCancel={() => setWarnClose(null)} />}
      {showToast && <CloseToast cupos={getCuposRestantes()} onOpenPricing={onOpenPricing} />}

      <div style={{ maxWidth: 700, margin: '0 auto' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--txt-pri)', margin: 0 }}>✨ Generador de imágenes</h2>
            <p style={{ fontSize: 11, color: 'var(--txt-mut)', margin: '3px 0 0' }}>Sin censura · HD · Privado</p>
          </div>
          <div style={{ textAlign: 'right', fontSize: 11, color: 'var(--txt-mut)' }}>
            <div style={{ fontWeight: 700, color: remaining <= 1 ? '#e67e22' : 'var(--txt-sec)', fontSize: 13 }}>{remaining}/{dailyLimit}</div>
            <div>imágenes hoy</div>
            {!isPremium && remaining <= 0 && (
              <div style={{ fontSize: 9, color: '#e67e22', marginTop: 2 }}>⭐ Hazte Premium</div>
            )}
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 10, color: 'var(--txt-ter)', marginBottom: 7, display: 'block', textTransform: 'uppercase', letterSpacing: 0.5 }}>Categoría</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {[
              { id: 'realistic', label: '📸 Realista',       desc: 'AIdark GIX2209 · Foto HD' },
              { id: 'anime',     label: '🎌 Anime / Hentai', desc: 'Lustify SDXL' + (!canAnime ? ' · Plan Trimestral' : '') },
            ].map(c => {
              const locked = c.id === 'anime' && !canAnime;
              return (
                <button key={c.id} onClick={() => { if (locked) { onOpenPricing(); return; } setCategory(c.id as any); }} style={{
                  flex: 1, padding: '10px 12px', borderRadius: 10, textAlign: 'left',
                  background: category === c.id ? 'var(--bg-el)' : 'transparent',
                  border: `1px solid ${category === c.id ? 'var(--border-str)' : 'var(--border-sub)'}`,
                  color: category === c.id ? 'var(--txt-pri)' : 'var(--txt-mut)',
                  cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit', opacity: locked ? 0.7 : 1,
                }}>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{c.label} {locked && '🔒'}</div>
                  <div style={{ fontSize: 10, color: 'var(--txt-ter)', marginTop: 2 }}>{c.desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        {category === 'anime' && canAnime && (
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 10, color: 'var(--txt-ter)', marginBottom: 7, display: 'block', textTransform: 'uppercase', letterSpacing: 0.5 }}>Estilo</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {ANIME_STYLES.map(s => (
                <button key={s.id} onClick={() => setAnimeStyle(s.id)} style={{
                  padding: '6px 12px', borderRadius: 18, fontSize: 11,
                  background: animeStyle === s.id ? 'var(--bg-el)' : 'transparent',
                  border: `1px solid ${animeStyle === s.id ? 'var(--border-str)' : 'var(--border-sub)'}`,
                  color: animeStyle === s.id ? 'var(--txt-pri)' : 'var(--txt-mut)',
                  cursor: 'pointer', fontFamily: 'inherit',
                }}>{s.label}</button>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginBottom: 8 }}>
          <label style={{ fontSize: 10, color: 'var(--txt-ter)', marginBottom: 6, display: 'block', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Descripción · <span style={{ color: prompt.length > 900 ? '#e67e22' : 'var(--txt-ter)' }}>{prompt.length}/1000</span>
          </label>
          <textarea value={prompt} onChange={e => setPrompt(e.target.value.slice(0, 1000))}
            onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) handleGenerate(); }}
            placeholder={category === 'anime'
              ? 'Ej: mujer con cabello negro, cuerpo detallado, pose sugestiva, fondo de dormitorio...'
              : 'Ej: mujer latina de 28 años, cuerpo atlético, iluminación suave, habitación de hotel...'}
            rows={3} style={{
              width: '100%', background: 'var(--bg-surface)', border: '1px solid var(--border-sub)',
              borderRadius: 10, padding: '9px 12px', color: 'var(--txt-pri)',
              fontFamily: 'inherit', fontSize: 13, lineHeight: 1.6, resize: 'vertical',
              outline: 'none', boxSizing: 'border-box',
            }} />
          <p style={{ fontSize: 10, color: 'var(--txt-ter)', margin: '3px 0 0' }}>
            💡 Describe rasgos físicos, ropa, pose, ambiente e iluminación. Más detalle = mejor resultado.
          </p>
        </div>

        <button onClick={() => setShowAdvanced(!showAdvanced)} style={{
          display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none',
          color: 'var(--txt-mut)', fontSize: 11, cursor: 'pointer', marginBottom: 10, padding: 0,
        }}>
          <ChevronDown size={12} style={{ transform: showAdvanced ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          Opciones avanzadas
        </button>

        {showAdvanced && (
          <div style={{ background: 'var(--bg-el)', borderRadius: 10, padding: 12, marginBottom: 12, border: '1px solid var(--border-sub)' }}>
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 10, color: 'var(--txt-ter)', marginBottom: 5, display: 'block' }}>Prompt negativo</label>
              <input value={negativePrompt} onChange={e => setNegativePrompt(e.target.value)}
                placeholder="blur, watermark, deformed..."
                style={{ width: '100%', background: 'var(--bg-surface)', border: '1px solid var(--border-sub)', borderRadius: 8, padding: '7px 11px', color: 'var(--txt-sec)', fontFamily: 'inherit', fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: 10, color: 'var(--txt-ter)', marginBottom: 6, display: 'block' }}>Proporción</label>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {RATIOS.map(r => (
                  <button key={r.label} onClick={() => setRatio(r)} style={{
                    padding: '5px 10px', borderRadius: 7, fontSize: 11,
                    background: ratio.label === r.label ? 'var(--bg-hover)' : 'transparent',
                    border: `1px solid ${ratio.label === r.label ? 'var(--border-str)' : 'var(--border-sub)'}`,
                    color: ratio.label === r.label ? 'var(--txt-pri)' : 'var(--txt-mut)',
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}>{r.label}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        <button onClick={() => { if (!isPremium && remaining <= 0) { onOpenPricing(); return; } handleGenerate(); }} disabled={!prompt.trim() || loading || (isPremium && remaining <= 0)} style={{
          width: '100%', padding: '12px 0', borderRadius: 10, border: 'none',
          background: prompt.trim() && !loading && (remaining > 0 || !isPremium) ? 'var(--border-str)' : 'var(--bg-el)',
          color: prompt.trim() && !loading && (remaining > 0 || !isPremium) ? 'var(--txt-pri)' : 'var(--txt-mut)',
          fontSize: 13, fontWeight: 600,
          cursor: prompt.trim() && !loading && (remaining > 0 || !isPremium) ? 'pointer' : 'default',
          fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          {loading
            ? <><div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'var(--txt-pri)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />Generando...</>
            : remaining <= 0
            ? (!isPremium ? '🔒 Límite alcanzado · Hazte Premium' : '⛔ Límite diario alcanzado')
            : <><Sparkles size={14} />Generar imagen · {remaining} restantes</>
          }
        </button>

        {error && (
          <div style={{ marginTop: 10, padding: '9px 12px', borderRadius: 8, background: 'rgba(180,80,80,0.08)', border: '1px solid rgba(180,80,80,0.2)', color: '#c66', fontSize: 12 }}>
            ⚠️ {error}
          </div>
        )}

        {gallery.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontSize: 10, color: 'var(--txt-ter)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Galería de sesión · {gallery.length}/10
              </div>
              <div style={{ fontSize: 10, color: 'var(--txt-ter)' }}>⚠️ Se elimina al cerrar</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: gallery.length === 1 ? '1fr' : 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
              {gallery.map(img => (
                <div key={img.id} style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border-sub)' }}>
                  <img src={img.src} alt="Generated" style={{ width: '100%', display: 'block' }} />
                  <div style={{ position: 'absolute', top: 7, right: 7, display: 'flex', gap: 5 }}>
                    <button onClick={() => handleDownload(img)} style={{
                      display: 'flex', alignItems: 'center', gap: 3, padding: '5px 9px',
                      background: 'rgba(0,0,0,0.7)', border: 'none', borderRadius: 6,
                      color: '#fff', fontSize: 11, cursor: 'pointer', backdropFilter: 'blur(4px)',
                    }}>
                      <Download size={11} /> Descargar
                    </button>
                    <button onClick={() => setWarnClose(img.id)} style={{
                      width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'rgba(180,60,60,0.75)', border: 'none', borderRadius: 6,
                      color: '#fff', cursor: 'pointer', backdropFilter: 'blur(4px)',
                    }}>
                      <X size={11} />
                    </button>
                  </div>
                  <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    background: 'linear-gradient(transparent, rgba(0,0,0,0.65))',
                    padding: '18px 9px 7px',
                  }}>
                    <div style={{ fontSize: 9, color: '#ffffffaa', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {img.prompt}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideUpToast { from { opacity: 0; transform: translateX(-50%) translateY(16px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
      `}</style>
    </div>
  );
};
