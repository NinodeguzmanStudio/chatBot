// ═══════════════════════════════════════
// AIdark — Typing Particles Effect (DEBUG VERSION)
// ═══════════════════════════════════════

import React, { useRef, useEffect, useCallback } from 'react';

interface Rune {
  x: number;
  y: number;
  char: string;
  color: string;
  baseOpacity: number;
  pulsePhase: 'dormant' | 'inhale' | 'peak' | 'exhale';
  pulseStartTime: number;
  pulseDuration: number;
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

const GRID_COLS = 8;
const GRID_ROWS = 12;
const BASE_OPACITY = 0.04;
const PEAK_OPACITY = 0.22;

export const TypingParticles: React.FC<{ trigger: number }> = ({ trigger }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const runesRef = useRef<Rune[]>([]);
  const animFrameRef = useRef<number>(0);
  const lastPulseRef = useRef<number>(0);
  const pulseCountRef = useRef<number>(0);

  console.log('[TypingParticles] Component mounted, trigger:', trigger);

  const initRunes = useCallback((width: number, height: number) => {
    console.log('[TypingParticles] initRunes called with:', width, height);
    
    if (width === 0 || height === 0) {
      console.error('[TypingParticles] ERROR: Zero dimensions!');
      return;
    }

    const cellW = width / GRID_COLS;
    const cellH = height / GRID_ROWS;
    const runes: Rune[] = [];

    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const offsetX = (Math.random() - 0.5) * (cellW * 0.6);
        const offsetY = (Math.random() - 0.5) * (cellH * 0.6);
        
        runes.push({
          x: col * cellW + cellW/2 + offsetX,
          y: row * cellH + cellH/2 + offsetY,
          char: YAUTJA_CHARS[Math.floor(Math.random() * YAUTJA_CHARS.length)],
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          baseOpacity: BASE_OPACITY,
          pulsePhase: 'dormant',
          pulseStartTime: 0,
          pulseDuration: 400 + Math.random() * 200,
        });
      }
    }

    runesRef.current = runes;
    console.log('[TypingParticles] Created', runes.length, 'runes');
  }, []);

  const pulseRandomRune = useCallback(() => {
    const now = Date.now();
    if (now - lastPulseRef.current < 80) return;
    lastPulseRef.current = now;
    pulseCountRef.current++;

    const dormantRunes = runesRef.current.filter(r => r.pulsePhase === 'dormant');
    console.log('[TypingParticles] Pulse triggered! Dormant runes:', dormantRunes.length);
    
    if (dormantRunes.length === 0) {
      console.log('[TypingParticles] No dormant runes available');
      return;
    }

    const target = dormantRunes[Math.floor(Math.random() * dormantRunes.length)];
    target.pulsePhase = 'inhale';
    target.pulseStartTime = now;
    console.log('[TypingParticles] Pulsed rune at:', target.x, target.y, 'char:', target.char);
  }, []);

  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      console.error('[TypingParticles] No canvas ref!');
      return;
    }
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('[TypingParticles] No 2d context!');
      return;
    }

    // Solo loggear cada 60 frames para no saturar
    if (Math.random() < 0.016) {
      console.log('[TypingParticles] Animating, runes:', runesRef.current.length, 'active pulses:', runesRef.current.filter(r => r.pulsePhase !== 'dormant').length);
    }

    const now = Date.now();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    runesRef.current.forEach((rune) => {
      let currentOpacity = rune.baseOpacity;

      if (rune.pulsePhase !== 'dormant') {
        const elapsed = now - rune.pulseStartTime;
        const progress = elapsed / rune.pulseDuration;

        if (progress >= 1) {
          rune.pulsePhase = 'dormant';
        } else {
          const breathe = Math.sin(progress * Math.PI);
          const pulseBoost = (PEAK_OPACITY - BASE_OPACITY) * breathe;
          currentOpacity = BASE_OPACITY + pulseBoost;
        }
      }

      ctx.font = `300 14px 'IBM Plex Mono', monospace`;
      ctx.fillStyle = `rgba(${rune.color},${currentOpacity.toFixed(3)})`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(rune.char, rune.x, rune.y);
    });

    animFrameRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    console.log('[TypingParticles] Setup effect running');
    const canvas = canvasRef.current;
    if (!canvas) {
      console.error('[TypingParticles] Canvas ref is null on mount!');
      return;
    }

    const resize = () => {
      const parent = canvas.parentElement;
      console.log('[TypingParticles] Resize called, parent:', parent);
      
      if (parent) {
        const rect = parent.getBoundingClientRect();
        console.log('[TypingParticles] Parent dimensions:', rect.width, rect.height);
        
        canvas.width = rect.width;
        canvas.height = rect.height;
        initRunes(canvas.width, canvas.height);
      }
    };

    resize();
    
    let observer: ResizeObserver | null = null;
    if (canvas.parentElement) {
      observer = new ResizeObserver(resize);
      observer.observe(canvas.parentElement);
      console.log('[TypingParticles] ResizeObserver attached');
    }

    animFrameRef.current = requestAnimationFrame(animate);
    console.log('[TypingParticles] Animation started');

    return () => {
      console.log('[TypingParticles] Cleanup');
      cancelAnimationFrame(animFrameRef.current);
      if (observer) observer.disconnect();
    };
  }, [initRunes, animate]);

  useEffect(() => {
    console.log('[TypingParticles] Trigger effect:', trigger);
    if (trigger > 0) {
      pulseRandomRune();
    }
  }, [trigger, pulseRandomRune]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 0,
        border: '1px solid red', // DEBUG: Ver si el canvas existe
      }}
    />
  );
};
