// ═══════════════════════════════════════
// AIdark — Typing Particles Effect
// ═══════════════════════════════════════
// Runas Yautja estáticas que pulsan al teclear
// Efecto decorativo ambiental, sin movimiento, sin distracción

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

// Alfabeto Yautja auténtico (Predator)
const YAUTJA_CHARS = [
  '⍙','⍫','⍬','⍭','⍮','⍯','⍰','⍱','⍲','⍳','⍴','⍵',
  '⍶','⍷','⍸','⍹','⍺','⍻','⍼','⍽','⍾','⍿','⎀','⎁',
  '⎂','⎃','◬','◭','◮','◸','◹','◺','◿','⧖','⧗','⧓',
  '⧔','⧕','⧊','⧋','⧌','⧍','⬟','⬠','⬡','⬢','⬣','⬤',
  '✕','✖','✗','✘','✠','✡','✢','✣','✤','✥','✦','✧'
];

// Colores de la app (armonía existente)
const COLORS = [
  '139,115,85',   // dorado tenue
  '160,81,59',    // terracota
  '90,74,58',     // marrón oscuro
  '160,137,106',  // arena
];

const GRID_COLS = 8;
const GRID_ROWS = 12;
const BASE_OPACITY = 0.04;  // 4% - casi invisible
const PEAK_OPACITY = 0.22;  // 22% - brillo sutil

export const TypingParticles: React.FC<{ trigger: number }> = ({ trigger }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const runesRef = useRef<Rune[]>([]);
  const animFrameRef = useRef<number>(0);
  const lastPulseRef = useRef<number>(0);

  // Inicializar grid de runas estáticas
  const initRunes = useCallback((width: number, height: number) => {
    const cellW = width / GRID_COLS;
    const cellH = height / GRID_ROWS;
    const runes: Rune[] = [];

    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        // Offset aleatorio dentro de la celda para organicidad
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
          pulseDuration: 400 + Math.random() * 200, // 400-600ms
        });
      }
    }

    runesRef.current = runes;
  }, []);

  // Disparar pulso en runa aleatoria
  const pulseRandomRune = useCallback(() => {
    const now = Date.now();
    if (now - lastPulseRef.current < 80) return; // throttle suave
    lastPulseRef.current = now;

    const dormantRunes = runesRef.current.filter(r => r.pulsePhase === 'dormant');
    if (dormantRunes.length === 0) return;

    const target = dormantRunes[Math.floor(Math.random() * dormantRunes.length)];
    target.pulsePhase = 'inhale';
    target.pulseStartTime = now;
  }, []);

  // Animación de pulso
  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const now = Date.now();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    runesRef.current.forEach((rune) => {
      let currentOpacity = rune.baseOpacity;

      // Máquina de estados del pulso
      if (rune.pulsePhase !== 'dormant') {
        const elapsed = now - rune.pulseStartTime;
        const progress = elapsed / rune.pulseDuration;

        if (progress >= 1) {
          rune.pulsePhase = 'dormant';
        } else {
          // Curva de respiración: ease-in-out suave
          const breathe = Math.sin(progress * Math.PI); // 0 → 1 → 0
          const pulseBoost = (PEAK_OPACITY - BASE_OPACITY) * breathe;
          currentOpacity = BASE_OPACITY + pulseBoost;
        }
      }

      // Dibujar runa estática
      ctx.font = `300 14px 'IBM Plex Mono', monospace`;
      ctx.fillStyle = `rgba(${rune.color},${currentOpacity.toFixed(3)})`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(rune.char, rune.x, rune.y);
    });

    animFrameRef.current = requestAnimationFrame(animate);
  }, []);

  // Setup inicial
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.offsetWidth;
        canvas.height = parent.offsetHeight;
        initRunes(canvas.width, canvas.height);
      }
    };

    resize();
    const observer = new ResizeObserver(resize);
    if (canvas.parentElement) observer.observe(canvas.parentElement);

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      observer.disconnect();
    };
  }, [initRunes, animate]);

  // Trigger de tecla
  useEffect(() => {
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
        zIndex: 0, // Detrás de todo
      }}
    />
  );
};
