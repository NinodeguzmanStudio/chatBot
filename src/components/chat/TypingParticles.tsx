// ═══════════════════════════════════════
// AIdark — Typing Particles Effect
// ═══════════════════════════════════════

import React, { useRef, useEffect, useCallback } from 'react';

interface Rune {
  x: number;
  y: number;
  char: string;
  color: string;
  pulseStartTime: number;
  pulseDuration: number;
  isPulsing: boolean;
}

const YAUTJA_CHARS = [
  '⍙','⍫','⍬','⍭','⍮','⍯','⍰','⍱','⍲','⍳','⍴','⍵',
  '⍶','⍷','⍸','⍹','⍺','⍻','⍼','⍽','⍾','⍿','⎀','⎁',
  '⎂','⎃','◬','◭','◮','◸','◹','◺','◿','⧖','⧗','⧓',
  '⧔','⧕','⧊','⧋','⧌','⧍','⬟','⬠','⬡','⬢','⬣','⬤',
  '✕','✖','✗','✘','✠','✡','✢','✣','✤','✥','✦','✧'
];

const COLORS = [
  '139,115,85',
  '160,81,59', 
  '90,74,58',
  '160,137,106',
];

const BASE_OPACITY = 0.04;
const PEAK_OPACITY = 0.25;

export const TypingParticles: React.FC<{ trigger: number }> = ({ trigger }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const runesRef = useRef<Rune[]>([]);
  const frameRef = useRef<number>(0);
  const lastPulseRef = useRef<number>(0);
  const dimsRef = useRef<{ w: number; h: number }>({ w: 0, h: 0 });

  const initRunes = useCallback((w: number, h: number) => {
    if (!w || !h) return;
    dimsRef.current = { w, h };
    
    const cols = Math.floor(w / 80);
    const rows = Math.floor(h / 60);
    const runes: Rune[] = [];

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        runes.push({
          x: (c + 0.5) * (w / cols) + (Math.random() - 0.5) * 20,
          y: (r + 0.5) * (h / rows) + (Math.random() - 0.5) * 20,
          char: YAUTJA_CHARS[Math.floor(Math.random() * YAUTJA_CHARS.length)],
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          pulseStartTime: 0,
          pulseDuration: 500,
          isPulsing: false,
        });
      }
    }
    runesRef.current = runes;
  }, []);

  const pulse = useCallback(() => {
    const now = Date.now();
    if (now - lastPulseRef.current < 60) return;
    lastPulseRef.current = now;

    const available = runesRef.current.filter(r => !r.isPulsing);
    if (!available.length) return;
    
    const rune = available[Math.floor(Math.random() * available.length)];
    rune.isPulsing = true;
    rune.pulseStartTime = now;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      
      const rect = parent.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      
      ctx.scale(dpr, dpr);
      initRunes(rect.width, rect.height);
    };

    resize();
    window.addEventListener('resize', resize);

    const animate = () => {
      const { w, h } = dimsRef.current;
      if (!w || !h) {
        frameRef.current = requestAnimationFrame(animate);
        return;
      }

      ctx.clearRect(0, 0, w, h);
      const now = Date.now();

      runesRef.current.forEach(r => {
        if (r.isPulsing) {
          const elapsed = now - r.pulseStartTime;
          if (elapsed >= r.pulseDuration) {
            r.isPulsing = false;
          }
        }

        const progress = r.isPulsing 
          ? (now - r.pulseStartTime) / r.pulseDuration 
          : 0;
        
        const breathe = r.isPulsing ? Math.sin(progress * Math.PI) : 0;
        const opacity = BASE_OPACITY + (PEAK_OPACITY - BASE_OPACITY) * breathe;

        ctx.font = '300 16px monospace';
        ctx.fillStyle = `rgba(${r.color},${opacity.toFixed(3)})`;
        ctx.textAlign = 'center';
        ctx.fillText(r.char, r.x, r.y);
      });

      frameRef.current = requestAnimationFrame(animate);
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [initRunes]);

  useEffect(() => {
    if (trigger > 0) pulse();
  }, [trigger, pulse]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  );
};
