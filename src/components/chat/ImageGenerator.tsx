// ═══════════════════════════════════════
// AIdark — Image Generator (Venice API, safe_mode: false)
// ═══════════════════════════════════════

import React, { useState } from 'react';
import { Sparkles, Download, RotateCcw, X, ChevronDown } from 'lucide-react';
import { useIsMobile } from '@/hooks/useIsMobile';

const IMAGE_STYLES = [
  'Photographic', 'Digital Art', 'Cinematic', 'Anime', 'Fantasy Art',
  '3D Model', 'Comic Book', 'Neon Punk', 'Origami', 'Line Art',
  'Watercolor', 'Oil Painting', 'Sketch', 'Low Poly',
];

// DESPUÉS (IDs actuales válidos)
const IMAGE_MODELS = [
  { id: 'qwen-image', label: 'Qwen Image (rápido)' },
  { id: 'lustify-sdxl', label: 'Lustify SDXL 🔞' },
  { id: 'fluently-xl-final', label: 'Fluently XL Final' },
  { id: 'z-image-turbo', label: 'Z-Image Turbo (veloz)' },
];

const ASPECT_RATIOS = [
  { label: '1:1', w: 1024, h: 1024 },
  { label: '16:9', w: 1344, h: 768 },
  { label: '9:16', w: 768, h: 1344 },
  { label: '4:3', w: 1152, h: 896 },
  { label: '3:4', w: 896, h: 1152 },
];

interface ImageGeneratorProps {
  onOpenPricing: () => void;
}

export const ImageGenerator: React.FC<ImageGeneratorProps> = ({ onOpenPricing }) => {
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [style, setStyle] = useState('Photographic');
 const [model, setModel] = useState('qwen-image');
  const [ratio, setRatio] = useState(ASPECT_RATIOS[0]);
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const isMobile = useIsMobile();

  const handleGenerate = async () => {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setError('');
    setImages([]);

    try {
      const res = await fetch('/api/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          negative_prompt: negativePrompt.trim() || undefined,
          model,
          style_preset: style,
          width: ratio.w,
          height: ratio.h,
          safe_mode: false,
          hide_watermark: true,
          steps: 20,
          cfg_scale: 7,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Error generando imagen');
      }

      const data = await res.json();
      if (data.images?.length) {
        setImages(data.images.map((b64: string) => `data:image/webp;base64,${b64}`));
      } else {
        throw new Error('No se recibieron imágenes');
      }
    } catch (err: any) {
      setError(err.message || 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (src: string, idx: number) => {
    const a = document.createElement('a');
    a.href = src;
    a.download = `aidark-image-${Date.now()}-${idx + 1}.webp`;
    a.click();
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '16px 14px' : '24px 20px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--txt-pri)', marginBottom: 4 }}>
            ✨ Generador de imágenes
          </h2>
          <p style={{ fontSize: 12, color: 'var(--txt-mut)' }}>
            Powered by AIdark · Sin censura · Privado
          </p>
        </div>

        {/* Model selector */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 11, color: 'var(--txt-ter)', marginBottom: 6, display: 'block', textTransform: 'uppercase', letterSpacing: 0.5 }}>Modelo</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {IMAGE_MODELS.map((m) => (
              <button key={m.id} onClick={() => setModel(m.id)} style={{
                padding: '6px 12px', borderRadius: 20, fontSize: 11,
                background: model === m.id ? 'var(--bg-el)' : 'transparent',
                border: `1px solid ${model === m.id ? 'var(--border-str)' : 'var(--border-sub)'}`,
                color: model === m.id ? 'var(--txt-pri)' : 'var(--txt-mut)',
                cursor: 'pointer', transition: 'all 0.12s', fontFamily: 'inherit',
              }}>
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Prompt */}
        <div style={{ marginBottom: 10 }}>
          <label style={{ fontSize: 11, color: 'var(--txt-ter)', marginBottom: 6, display: 'block', textTransform: 'uppercase', letterSpacing: 0.5 }}>Descripción</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && e.ctrlKey) handleGenerate(); }}
            placeholder="Describe la imagen que querés generar..."
            rows={3}
            style={{
              width: '100%', background: 'var(--bg-surface)', border: '1px solid var(--border-sub)',
              borderRadius: 10, padding: '10px 14px', color: 'var(--txt-pri)',
              fontFamily: 'inherit', fontSize: 13, lineHeight: 1.6,
              resize: 'vertical', outline: 'none', boxSizing: 'border-box',
              transition: 'border-color 0.2s',
            }}
            onFocus={(e) => e.currentTarget.style.borderColor = 'var(--border-def)'}
            onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border-sub)'}
          />
        </div>

        {/* Advanced toggle */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', color: 'var(--txt-mut)', fontSize: 11, cursor: 'pointer', marginBottom: 10, padding: 0 }}
        >
          <ChevronDown size={12} style={{ transform: showAdvanced ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          Opciones avanzadas
        </button>

        {showAdvanced && (
          <div style={{ background: 'var(--bg-el)', borderRadius: 10, padding: 14, marginBottom: 12, border: '1px solid var(--border-sub)' }}>
            {/* Negative prompt */}
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, color: 'var(--txt-ter)', marginBottom: 5, display: 'block' }}>Prompt negativo (qué evitar)</label>
              <input
                value={negativePrompt}
                onChange={(e) => setNegativePrompt(e.target.value)}
                placeholder="blur, watermark, low quality..."
                style={{ width: '100%', background: 'var(--bg-surface)', border: '1px solid var(--border-sub)', borderRadius: 8, padding: '8px 12px', color: 'var(--txt-sec)', fontFamily: 'inherit', fontSize: 12, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            {/* Style */}
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, color: 'var(--txt-ter)', marginBottom: 6, display: 'block' }}>Estilo artístico</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {IMAGE_STYLES.map((s) => (
                  <button key={s} onClick={() => setStyle(s)} style={{
                    padding: '4px 10px', borderRadius: 16, fontSize: 10,
                    background: style === s ? 'rgba(255,255,255,0.08)' : 'transparent',
                    border: `1px solid ${style === s ? 'var(--border-str)' : 'var(--border-sub)'}`,
                    color: style === s ? 'var(--txt-pri)' : 'var(--txt-mut)',
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Aspect ratio */}
            <div>
              <label style={{ fontSize: 11, color: 'var(--txt-ter)', marginBottom: 6, display: 'block' }}>Proporción</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {ASPECT_RATIOS.map((r) => (
                  <button key={r.label} onClick={() => setRatio(r)} style={{
                    padding: '5px 12px', borderRadius: 8, fontSize: 11,
                    background: ratio.label === r.label ? 'var(--bg-hover)' : 'transparent',
                    border: `1px solid ${ratio.label === r.label ? 'var(--border-str)' : 'var(--border-sub)'}`,
                    color: ratio.label === r.label ? 'var(--txt-pri)' : 'var(--txt-mut)',
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}>
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Generate button */}
        <button
          onClick={handleGenerate}
          disabled={!prompt.trim() || loading}
          style={{
            width: '100%', padding: '12px 20px',
            background: prompt.trim() && !loading ? 'var(--border-str)' : 'var(--bg-el)',
            border: 'none', borderRadius: 10,
            color: prompt.trim() && !loading ? 'var(--txt-pri)' : 'var(--txt-mut)',
            fontSize: 13, fontWeight: 600, cursor: prompt.trim() && !loading ? 'pointer' : 'default',
            fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'all 0.2s',
            animation: prompt.trim() && !loading ? 'glow 2s ease-in-out infinite' : 'none',
          }}
        >
          {loading ? (
            <>
              <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'var(--txt-pri)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              Generando...
            </>
          ) : (
            <>
              <Sparkles size={14} />
              Generar imagen · 
            </>
          )}
        </button>

        {/* Error */}
        {error && (
          <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 8, background: 'rgba(180,80,80,0.08)', border: '1px solid rgba(180,80,80,0.2)', color: '#c66', fontSize: 12 }}>
            ⚠️ {error}
          </div>
        )}

        {/* Generated images */}
        {images.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <div style={{ fontSize: 11, color: 'var(--txt-ter)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Resultado
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: images.length > 1 ? '1fr 1fr' : '1fr', gap: 10 }}>
              {images.map((src, idx) => (
                <div key={idx} style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border-sub)' }}>
                  <img src={src} alt={`Generated ${idx + 1}`} style={{ width: '100%', display: 'block' }} />
                  <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 6 }}>
                    <button
                      onClick={() => handleDownload(src, idx)}
                      style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: 6, color: '#fff', fontSize: 11, cursor: 'pointer', backdropFilter: 'blur(4px)' }}
                    >
                      <Download size={11} /> Descargar
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => handleGenerate()} style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: '1px solid var(--border-sub)', borderRadius: 8, padding: '7px 14px', color: 'var(--txt-sec)', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>
              <RotateCcw size={11} /> Regenerar
            </button>
          </div>
        )}

        {/* Spinner keyframe */}
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
};
