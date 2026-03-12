// ═══════════════════════════════════════
// AIdark — Image Generator
// · Banner FOMO premium con agua animada
// · Galería de sesión en memoria (máx 10)
// · Advertencia al cerrar imagen sin descargar
// · Realista (venice-sd35) / Anime-Hentai (lustify-sdxl)
// · Anime solo en plan quarterly/annual
// ═══════════════════════════════════════

import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Download, RotateCcw, X, ChevronDown, AlertTriangle } from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { useIsMobile } from '@/hooks/useIsMobile';

// ── Planes ──
const ANIME_PLANS = new Set(['premium_quarterly', 'premium_annual']);
const DAILY_LIMITS: Record<string, number> = {
  premium_monthly: 10, premium_quarterly: 25, premium_annual: 50,
};

// ── Estilos anime ──
const ANIME_STYLES = [
  { id: 'hentai',  label: '🔥 Hentai clásico',    desc: 'Ilustración 2D explícita' },
  { id: 'manhwa',  label: '🎌 Manhwa coreano',      desc: 'Webtoon adulto estilo coreano' },
  { id: 'manga',   label: '🖤 Manga oscuro',         desc: 'Tinta noir, estilo seinen' },
  { id: 'ecchi',   label: '🌸 Ecchi / Fanservice',  desc: 'Anime sugestivo y detallado' },
];

// ── Proporciones ──
const RATIOS = [
  { label: '1:1',  w: 1024, h: 1024 },
  { label: '9:16', w: 720,  h: 1280 },
  { label: '16:9', w: 1280, h: 720  },
  { label: '4:3',  w: 1024, h: 768  },
];

// ── Colores del pricing modal ──
const PLAN_COLORS = {
  monthly:   { main: '#e67e22', light: '#f39c12', dark: '#d35400' },
  quarterly: { main: '#2eaadc', light: '#5dccf4', dark: '#1a8ab5' },
  annual:    { main: '#9b59b6', light: '#c39bd3', dark: '#7d3c98' },
};

// ══════════════════════════════════════
// Wave SVG (igual al PricingModal)
// ══════════════════════════════════════
const Wave: React.FC<{ color: string; speed: number; amp: number; offset: number }> = ({ color, speed, amp, offset }) => (
  <svg viewBox="0 0 400 30" preserveAspectRatio="none"
    style={{ width: '110%', height: 22, position: 'absolute', top: -10, left: '-5%', overflow: 'visible' }}>
    <path d="" fill={color}>
      <animate attributeName="d" dur={`${speed}s`} repeatCount="indefinite"
        values={`
          M0,15 C50,${15-amp+offset} 100,${15+amp+offset} 150,15 C200,${15-amp-offset} 250,${15+amp-offset} 300,15 C350,${15-amp+offset} 400,${15+amp+offset} 400,30 L0,30 Z;
          M0,15 C50,${15+amp-offset} 100,${15-amp-offset} 150,15 C200,${15+amp+offset} 250,${15-amp+offset} 300,15 C350,${15+amp-offset} 400,${15-amp-offset} 400,30 L0,30 Z;
          M0,15 C50,${15-amp+offset} 100,${15+amp+offset} 150,15 C200,${15-amp-offset} 250,${15+amp-offset} 300,15 C350,${15-amp+offset} 400,${15+amp+offset} 400,30 L0,30 Z
        `} />
    </path>
  </svg>
);

// ══════════════════════════════════════
// Banner Premium (free users)
// ══════════════════════════════════════
const PremiumBanner: React.FC<{ onOpenPricing: () => void }> = ({ onOpenPricing }) => {
  const [fill, setFill] = useState(78);
  const [tick, setTick] = useState(0);
  const [plusOne, setPlusOne] = useState(false);

  // Simular llenado gradual (igual que PricingModal)
  useEffect(() => {
    const LAUNCH = new Date('2026-02-17T00:00:00').getTime();
    const hours = Math.max(0, (Date.now() - LAUNCH) / 3_600_000);
    const base = 7800 + Math.floor(hours / 6) * 30;
    const noise = (new Date().getHours() % 5) + Math.floor(new Date().getMinutes() / 20);
    const ocupados = Math.min(base + noise, 9950);
    setFill(Math.min(95, (ocupados / 10000) * 100));

    // Tick cada 30s para simular +1
    const interval = setInterval(() => {
      setTick(t => t + 1);
      setPlusOne(true);
      setTimeout(() => setPlusOne(false), 2000);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const ocupados = Math.round(fill * 100);
  const quedan = 10000 - ocupados;
  const isAlmostFull = fill >= 85;
  const color = isAlmostFull ? '#e67e22' : '#2eaadc';
  const colorLight = isAlmostFull ? '#f39c12' : '#5dccf4';
  const colorDark  = isAlmostFull ? '#d35400' : '#1a8ab5';

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ maxWidth: 480, width: '100%' }}>

        {/* Generador difuminado de fondo */}
        <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', border: `1px solid ${color}44` }}>

          {/* Fondo de agua */}
          <div style={{ position: 'relative', minHeight: 500, background: '#0d0d1a', overflow: 'hidden' }}>

            {/* Agua animada */}
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              height: `${fill}%`, transition: 'height 3s ease', zIndex: 1,
            }}>
              <div style={{ position: 'relative' }}>
                <Wave color={`${colorLight}55`} speed={2.2} amp={10} offset={2} />
                <div style={{ position: 'absolute', top: 6, left: '-5%', width: '110%' }}>
                  <Wave color={`${colorLight}33`} speed={3.1} amp={6} offset={-1} />
                </div>
              </div>
              <div style={{
                position: 'absolute', top: 12, left: 0, right: 0, bottom: 0,
                background: `linear-gradient(180deg, ${colorLight}44 0%, ${color}33 50%, ${colorDark}55 100%)`,
              }} />
              {/* Burbujas */}
              {[...Array(8)].map((_, i) => (
                <div key={i} style={{
                  position: 'absolute', bottom: `${5 + i * 10}%`, left: `${8 + i * 11}%`,
                  width: 3 + i, height: 3 + i, borderRadius: '50%', background: `${colorLight}55`,
                  animation: `bubbleRise ${2 + i * 0.5}s ease-in-out infinite`,
                  animationDelay: `${i * 0.4}s`,
                }} />
              ))}
            </div>

            {/* Contenido del banner */}
            <div style={{ position: 'relative', zIndex: 10, padding: '32px 24px', textAlign: 'center' }}>

              {/* Icono lock */}
              <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>

              {/* Título */}
              <h2 style={{ fontSize: 22, fontWeight: 800, color: '#fff', margin: '0 0 6px', letterSpacing: -0.5 }}>
                Generación de Imágenes
              </h2>
              <p style={{ fontSize: 12, color: colorLight, margin: '0 0 24px', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>
                Sin censura · HD · Fotorrealista
              </p>

              {/* Lista de contenido */}
              <div style={{
                background: 'rgba(0,0,0,0.4)', borderRadius: 12, padding: '16px 20px',
                marginBottom: 24, textAlign: 'left', backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}>
                <p style={{ fontSize: 11, color: '#ffffff88', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: 1 }}>
                  Desbloqueá con Premium:
                </p>
                {[
                  { icon: '📸', text: 'Desnudos fotorrealistas HD', plan: 'Mensual+' },
                  { icon: '💋', text: 'Escenas íntimas explícitas', plan: 'Mensual+' },
                  { icon: '🔥', text: 'Hentai clásico sin censura', plan: 'Trimestral+' },
                  { icon: '🎌', text: 'Manhwa coreano adulto', plan: 'Trimestral+' },
                  { icon: '🖤', text: 'Manga oscuro y fanservice', plan: 'Trimestral+' },
                  { icon: '✨', text: 'Calidad 8K · Venice SD35 · Lustify SDXL', plan: 'Todos' },
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 16 }}>{item.icon}</span>
                      <span style={{ fontSize: 12, color: '#ffffffcc' }}>{item.text}</span>
                    </div>
                    <span style={{
                      fontSize: 9, padding: '2px 7px', borderRadius: 10,
                      background: `${color}22`, color, border: `1px solid ${color}44`,
                      fontWeight: 700, letterSpacing: 0.5, whiteSpace: 'nowrap',
                    }}>{item.plan}</span>
                  </div>
                ))}
              </div>

              {/* Contador cupos */}
              <div style={{ marginBottom: 20, position: 'relative' }}>
                <div style={{ fontSize: 11, color: '#ffffff55', marginBottom: 6 }}>
                  {isAlmostFull ? '⚠️ Cupos casi agotados' : '🔴 Cupos en tiempo real'}
                </div>
                <div style={{ fontSize: 13, color: '#ffffffaa', position: 'relative', display: 'inline-block' }}>
                  <span style={{ color, fontWeight: 800, fontSize: 20 }}>{ocupados.toLocaleString()}</span>
                  <span style={{ color: '#ffffff55' }}> / 10,000 cupos ocupados</span>
                  {plusOne && (
                    <span style={{
                      position: 'absolute', top: -16, right: -10, fontSize: 11,
                      color, fontWeight: 700, animation: 'tickUp 2s ease forwards',
                    }}>+1</span>
                  )}
                </div>
                {/* Barra de llenado */}
                <div style={{
                  height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.08)',
                  marginTop: 10, overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%', borderRadius: 3, width: `${fill}%`,
                    background: `linear-gradient(90deg, ${colorDark}, ${color}, ${colorLight})`,
                    transition: 'width 3s ease', boxShadow: `0 0 8px ${color}88`,
                  }} />
                </div>
                <div style={{ fontSize: 10, color: isAlmostFull ? '#e67e22' : '#ffffff44', marginTop: 6, fontWeight: isAlmostFull ? 700 : 400 }}>
                  {isAlmostFull ? `⚡ Solo quedan ${quedan.toLocaleString()} cupos disponibles` : `${quedan.toLocaleString()} cupos restantes`}
                </div>
              </div>

              {/* CTA */}
              <button
                onClick={onOpenPricing}
                style={{
                  width: '100%', padding: '14px 0', borderRadius: 12, border: 'none',
                  background: `linear-gradient(135deg, ${color}, ${colorDark})`,
                  color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer',
                  fontFamily: 'inherit', letterSpacing: 0.5,
                  boxShadow: `0 4px 24px ${color}55`,
                  animation: 'glowPulse 2s ease-in-out infinite',
                }}
              >
                🔓 HAZTE PREMIUM · Quedan {quedan.toLocaleString()}
              </button>

              <p style={{ fontSize: 10, color: '#ffffff28', marginTop: 10 }}>
                Pago seguro · Cancela cuando quieras
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ══════════════════════════════════════
// Modal advertencia al cerrar imagen
// ══════════════════════════════════════
const LoseImageWarning: React.FC<{ onConfirm: () => void; onCancel: () => void }> = ({ onConfirm, onCancel }) => (
  <div style={{
    position: 'fixed', inset: 0, zIndex: 500,
    background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 20,
  }}>
    <div style={{
      background: '#121212', border: '1px solid rgba(255,100,100,0.3)',
      borderRadius: 16, padding: '28px 24px', maxWidth: 360, width: '100%', textAlign: 'center',
    }}>
      <AlertTriangle size={36} color="#e67e22" style={{ marginBottom: 14 }} />
      <h3 style={{ color: '#fff', fontSize: 16, fontWeight: 700, margin: '0 0 8px' }}>
        ¿Perdés la imagen?
      </h3>
      <p style={{ color: '#ffffff77', fontSize: 12, lineHeight: 1.6, margin: '0 0 20px' }}>
        No almacenamos imágenes por privacidad. Si salís sin descargar, <strong style={{ color: '#e67e22' }}>se perderá para siempre</strong>.
      </p>
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onCancel} style={{
          flex: 1, padding: '10px 0', borderRadius: 10, border: '1px solid rgba(255,255,255,0.15)',
          background: 'transparent', color: '#ffffffaa', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
        }}>
          ← Volver
        </button>
        <button onClick={onConfirm} style={{
          flex: 1, padding: '10px 0', borderRadius: 10, border: 'none',
          background: 'rgba(180,60,60,0.3)', color: '#ff8888', fontSize: 13,
          cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600,
        }}>
          Sí, borrar
        </button>
      </div>
    </div>
  </div>
);

// ══════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════
interface ImageGeneratorProps { onOpenPricing: () => void; }

interface GeneratedImage { src: string; prompt: string; category: string; style: string; id: string; }

export const ImageGenerator: React.FC<ImageGeneratorProps> = ({ onOpenPricing }) => {
  const { user } = useAuthStore();
  const isMobile = useIsMobile();

  const plan = user?.plan || 'free';
  const isPremium = plan !== 'free';
  const canAnime = ANIME_PLANS.has(plan);
  const dailyLimit = DAILY_LIMITS[plan] || 0;

  const [category, setCategory] = useState<'realistic' | 'anime'>('realistic');
  const [animeStyle, setAnimeStyle] = useState('hentai');
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [ratio, setRatio] = useState(RATIOS[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [gallery, setGallery] = useState<GeneratedImage[]>([]);
  const [usedToday, setUsedToday] = useState(0);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [warnClose, setWarnClose] = useState<string | null>(null); // id de imagen a borrar

  // Helpers
  const handleGenerate = async () => {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Inicia sesión para generar imágenes.');

      const res = await fetch('/api/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ prompt: prompt.trim(), negative_prompt: negativePrompt.trim() || undefined, category, style: animeStyle, width: ratio.w, height: ratio.h }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.code === 'PREMIUM_REQUIRED' || data.code === 'ANIME_PLAN_REQUIRED') {
          onOpenPricing();
          return;
        }
        throw new Error(data.error || 'Error generando imagen');
      }

      if (data.images?.length) {
        setUsedToday(data.used);
        const newImgs: GeneratedImage[] = data.images.map((b64: string, i: number) => ({
          src: `data:image/webp;base64,${b64}`,
          prompt: prompt.trim(),
          category, style: animeStyle,
          id: `${Date.now()}-${i}`,
        }));
        setGallery(prev => [...newImgs, ...prev].slice(0, 10));
      }
    } catch (err: any) {
      setError(err.message || 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (img: GeneratedImage) => {
    const a = document.createElement('a');
    a.href = img.src;
    a.download = `aidark-${img.category}-${Date.now()}.webp`;
    a.click();
  };

  const handleRemoveImage = (id: string) => setWarnClose(id);

  const confirmRemove = () => {
    if (warnClose) setGallery(prev => prev.filter(img => img.id !== warnClose));
    setWarnClose(null);
  };

  if (!isPremium) return <PremiumBanner onOpenPricing={onOpenPricing} />;

  const remaining = dailyLimit - usedToday;

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '16px 14px' : '24px 20px' }}>
      {warnClose && <LoseImageWarning onConfirm={confirmRemove} onCancel={() => setWarnClose(null)} />}

      <div style={{ maxWidth: 720, margin: '0 auto' }}>

        {/* Header + contador */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 8 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--txt-pri)', margin: 0 }}>✨ Generador de imágenes</h2>
            <p style={{ fontSize: 11, color: 'var(--txt-mut)', margin: '4px 0 0' }}>Sin censura · HD · Privado</p>
          </div>
          <div style={{ textAlign: 'right', fontSize: 11, color: 'var(--txt-mut)' }}>
            <div style={{ fontWeight: 700, color: remaining <= 3 ? '#e67e22' : 'var(--txt-sec)', fontSize: 13 }}>
              {remaining}/{dailyLimit}
            </div>
            <div>imágenes hoy</div>
          </div>
        </div>

        {/* Selector categoría */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 11, color: 'var(--txt-ter)', marginBottom: 8, display: 'block', textTransform: 'uppercase', letterSpacing: 0.5 }}>Categoría</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {[
              { id: 'realistic', label: '📸 Realista', desc: 'venice-sd35 · Fotorrealismo HD' },
              { id: 'anime',     label: '🎌 Anime / Hentai', desc: 'lustify-sdxl' + (!canAnime ? ' · Plan Trimestral' : '') },
            ].map(c => {
              const isActive = category === c.id;
              const locked = c.id === 'anime' && !canAnime;
              return (
                <button key={c.id}
                  onClick={() => { if (locked) { onOpenPricing(); return; } setCategory(c.id as any); }}
                  style={{
                    flex: 1, padding: '12px 14px', borderRadius: 12, textAlign: 'left',
                    background: isActive ? 'var(--bg-el)' : 'transparent',
                    border: `1px solid ${isActive ? 'var(--border-str)' : 'var(--border-sub)'}`,
                    color: isActive ? 'var(--txt-pri)' : 'var(--txt-mut)',
                    cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit',
                    opacity: locked ? 0.7 : 1,
                  }}>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{c.label} {locked && '🔒'}</div>
                  <div style={{ fontSize: 10, color: 'var(--txt-ter)', marginTop: 2 }}>{c.desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Sub-estilos anime */}
        {category === 'anime' && canAnime && (
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, color: 'var(--txt-ter)', marginBottom: 8, display: 'block', textTransform: 'uppercase', letterSpacing: 0.5 }}>Estilo</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {ANIME_STYLES.map(s => (
                <button key={s.id} onClick={() => setAnimeStyle(s.id)} style={{
                  padding: '8px 14px', borderRadius: 20, fontSize: 11,
                  background: animeStyle === s.id ? 'var(--bg-el)' : 'transparent',
                  border: `1px solid ${animeStyle === s.id ? 'var(--border-str)' : 'var(--border-sub)'}`,
                  color: animeStyle === s.id ? 'var(--txt-pri)' : 'var(--txt-mut)',
                  cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.12s',
                }}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Prompt */}
        <div style={{ marginBottom: 10 }}>
          <label style={{ fontSize: 11, color: 'var(--txt-ter)', marginBottom: 6, display: 'block', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Descripción · <span style={{ color: prompt.length > 900 ? '#e67e22' : 'var(--txt-ter)' }}>{prompt.length}/1000</span>
          </label>
          <textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value.slice(0, 1000))}
            onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) handleGenerate(); }}
            placeholder={category === 'anime'
              ? 'Ej: mujer con cabello rojo, cuerpo detallado, pose sugestiva, fondo de dormitorio...'
              : 'Ej: mujer brasileña de 30 años, cuerpo atlético, iluminación suave, habitación de hotel...'}
            rows={4}
            style={{
              width: '100%', background: 'var(--bg-surface)', border: '1px solid var(--border-sub)',
              borderRadius: 10, padding: '10px 14px', color: 'var(--txt-pri)',
              fontFamily: 'inherit', fontSize: 13, lineHeight: 1.6,
              resize: 'vertical', outline: 'none', boxSizing: 'border-box',
            }}
          />
          <p style={{ fontSize: 10, color: 'var(--txt-ter)', margin: '4px 0 0' }}>
            💡 Sé específico: descripción física, ropa, pose, ambiente, iluminación. Más detalle = mejor imagen.
          </p>
        </div>

        {/* Avanzado */}
        <button onClick={() => setShowAdvanced(!showAdvanced)} style={{
          display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none',
          color: 'var(--txt-mut)', fontSize: 11, cursor: 'pointer', marginBottom: 10, padding: 0,
        }}>
          <ChevronDown size={12} style={{ transform: showAdvanced ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          Opciones avanzadas
        </button>

        {showAdvanced && (
          <div style={{ background: 'var(--bg-el)', borderRadius: 10, padding: 14, marginBottom: 12, border: '1px solid var(--border-sub)' }}>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, color: 'var(--txt-ter)', marginBottom: 5, display: 'block' }}>Prompt negativo (qué evitar)</label>
              <input value={negativePrompt} onChange={e => setNegativePrompt(e.target.value)}
                placeholder="blur, watermark, deformed, ugly..."
                style={{ width: '100%', background: 'var(--bg-surface)', border: '1px solid var(--border-sub)', borderRadius: 8, padding: '8px 12px', color: 'var(--txt-sec)', fontFamily: 'inherit', fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--txt-ter)', marginBottom: 6, display: 'block' }}>Proporción</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {RATIOS.map(r => (
                  <button key={r.label} onClick={() => setRatio(r)} style={{
                    padding: '5px 12px', borderRadius: 8, fontSize: 11,
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

        {/* Botón generar */}
        <button onClick={handleGenerate} disabled={!prompt.trim() || loading || remaining <= 0} style={{
          width: '100%', padding: '13px 20px',
          background: prompt.trim() && !loading && remaining > 0 ? 'var(--border-str)' : 'var(--bg-el)',
          border: 'none', borderRadius: 10,
          color: prompt.trim() && !loading && remaining > 0 ? 'var(--txt-pri)' : 'var(--txt-mut)',
          fontSize: 13, fontWeight: 600, cursor: prompt.trim() && !loading && remaining > 0 ? 'pointer' : 'default',
          fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          transition: 'all 0.2s',
        }}>
          {loading ? (
            <><div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'var(--txt-pri)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />Generando...</>
          ) : remaining <= 0 ? (
            '⛔ Límite diario alcanzado'
          ) : (
            <><Sparkles size={14} />Generar imagen · {remaining} restantes</>
          )}
        </button>

        {error && (
          <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 8, background: 'rgba(180,80,80,0.08)', border: '1px solid rgba(180,80,80,0.2)', color: '#c66', fontSize: 12 }}>
            ⚠️ {error}
          </div>
        )}

        {/* Galería de sesión */}
        {gallery.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: 'var(--txt-ter)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Galería de sesión · {gallery.length}/10
              </div>
              <div style={{ fontSize: 10, color: 'var(--txt-ter)' }}>⚠️ Se borra al salir</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: gallery.length === 1 ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
              {gallery.map(img => (
                <div key={img.id} style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border-sub)' }}>
                  <img src={img.src} alt="Generated" style={{ width: '100%', display: 'block' }} />
                  <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 6 }}>
                    <button onClick={() => handleDownload(img)} style={{
                      display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px',
                      background: 'rgba(0,0,0,0.7)', border: 'none', borderRadius: 6,
                      color: '#fff', fontSize: 11, cursor: 'pointer', backdropFilter: 'blur(4px)',
                    }}>
                      <Download size={11} /> Descargar
                    </button>
                    <button onClick={() => handleRemoveImage(img.id)} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      width: 28, height: 28, background: 'rgba(180,60,60,0.7)', border: 'none',
                      borderRadius: 6, color: '#fff', cursor: 'pointer', backdropFilter: 'blur(4px)',
                    }}>
                      <X size={12} />
                    </button>
                  </div>
                  <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
                    padding: '20px 10px 8px',
                  }}>
                    <div style={{ fontSize: 10, color: '#ffffffaa', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
        @keyframes bubbleRise { 0% { transform: translateY(0) scale(1); opacity: 0.6; } 50% { transform: translateY(-30px) scale(1.1); opacity: 0.3; } 100% { transform: translateY(-60px) scale(0.8); opacity: 0; } }
        @keyframes glowPulse { 0%, 100% { box-shadow: 0 4px 24px rgba(46,170,220,0.4); } 50% { box-shadow: 0 4px 40px rgba(46,170,220,0.7); } }
        @keyframes tickUp { 0% { opacity: 1; transform: translateY(0); } 100% { opacity: 0; transform: translateY(-20px); } }
      `}</style>
    </div>
  );
};
