// ═══════════════════════════════════════
// AIdark — Yautja Particles
// src/components/chat/TypingParticles.tsx
// FIX: colores rojo fosforescente más visibles, opacidad más alta
//      nuevo prop streamTrigger para activarse durante la respuesta de la IA
// ═══════════════════════════════════════

import React, { useRef, useEffect, useCallback } from 'react';

interface Particle {
  x: number; y: number; vy: number;
  life: number; maxLife: number;
  size: number; glyphIndex: number;
  color: number[]; rotation: number;
}

// Colores rojo depredador fosforescente — más brillantes y visibles
const COLORS_USER: number[][] = [
  [255, 35,  15],   // rojo puro fosforescente
  [220, 50,  0],    // naranja-rojo depredador
  [255, 70,  30],   // rojo cálido
  [200, 20,  5],    // rojo oscuro intenso
  [255, 110, 20],   // naranja fuego
];

// Durante streaming — mismos colores pero aún más brillantes
const COLORS_STREAM: number[][] = [
  [255, 50,  20],
  [255, 30,  0],
  [230, 60,  10],
  [255, 90,  40],
  [210, 25,  5],
];

const MAX_PARTICLES   = 35;
const SPAWN_THROTTLE  = 100; // ms entre spawns

function drawGlyph(ctx: CanvasRenderingContext2D, idx: number, s: number) {
  const h = s * 0.45;
  ctx.lineWidth = Math.max(1.3, s * 0.07);
  ctx.lineCap = 'square';
  ctx.lineJoin = 'miter';
  ctx.beginPath();
  switch (idx % 24) {
    case 0: ctx.moveTo(-h*.4,-h);ctx.lineTo(-h*.4,h);ctx.moveTo(0,-h*.7);ctx.lineTo(0,h*.7);ctx.moveTo(h*.4,-h);ctx.lineTo(h*.4,h);break;
    case 1: ctx.moveTo(-h,0);ctx.lineTo(h,0);ctx.moveTo(-h*.6,-h*.5);ctx.lineTo(h*.6,-h*.5);ctx.moveTo(0,-h);ctx.lineTo(0,h);break;
    case 2: ctx.moveTo(-h*.5,-h*.8);ctx.lineTo(-h*.5,h*.8);ctx.moveTo(-h*.15,-h*.8);ctx.lineTo(-h*.15,h*.8);ctx.moveTo(h*.15,-h*.8);ctx.lineTo(h*.15,h*.8);ctx.moveTo(h*.5,-h*.8);ctx.lineTo(h*.5,h*.8);ctx.moveTo(-h*.6,h*.5);ctx.lineTo(h*.6,-h*.5);break;
    case 3: ctx.moveTo(-h*.3,-h);ctx.lineTo(-h*.3,h);ctx.moveTo(h*.3,-h);ctx.lineTo(h*.3,h);ctx.moveTo(-h,-h*.3);ctx.lineTo(h,-h*.3);ctx.moveTo(-h,h*.3);ctx.lineTo(h,h*.3);break;
    case 4: ctx.moveTo(h*.4,-h);ctx.lineTo(-h*.4,0);ctx.lineTo(h*.4,h);break;
    case 5: ctx.moveTo(-h*.4,-h);ctx.lineTo(h*.4,0);ctx.lineTo(-h*.4,h);break;
    case 6: ctx.moveTo(-h*.6,h*.2);ctx.lineTo(0,-h*.4);ctx.lineTo(h*.6,h*.2);ctx.moveTo(-h*.6,h*.7);ctx.lineTo(0,h*.1);ctx.lineTo(h*.6,h*.7);break;
    case 7: ctx.moveTo(-h,0);ctx.lineTo(h*.5,0);ctx.moveTo(h*.2,-h*.4);ctx.lineTo(h*.7,0);ctx.lineTo(h*.2,h*.4);break;
    case 8: ctx.moveTo(-h*.7,-h*.7);ctx.lineTo(h*.7,h*.7);ctx.moveTo(h*.7,-h*.7);ctx.lineTo(-h*.7,h*.7);break;
    case 9: ctx.moveTo(0,-h*.8);ctx.lineTo(0,h*.8);ctx.moveTo(-h*.8,0);ctx.lineTo(h*.8,0);ctx.stroke();ctx.beginPath();ctx.arc(-h*.5,-h*.5,s*.04,0,Math.PI*2);ctx.arc(h*.5,-h*.5,s*.04,0,Math.PI*2);ctx.arc(-h*.5,h*.5,s*.04,0,Math.PI*2);ctx.arc(h*.5,h*.5,s*.04,0,Math.PI*2);ctx.fill();break;
    case 10: for(let a=0;a<3;a++){const ang=(a*Math.PI)/3;ctx.moveTo(Math.cos(ang)*h*.8,Math.sin(ang)*h*.8);ctx.lineTo(-Math.cos(ang)*h*.8,-Math.sin(ang)*h*.8);}break;
    case 11: ctx.rect(-h*.5,-h*.5,h,h);break;
    case 12: ctx.moveTo(0,-h*.8);ctx.lineTo(h*.5,0);ctx.lineTo(0,h*.8);ctx.lineTo(-h*.5,0);ctx.closePath();break;
    case 13: ctx.moveTo(0,-h*.8);ctx.lineTo(h*.7,h*.6);ctx.lineTo(-h*.7,h*.6);ctx.closePath();break;
    case 14: ctx.moveTo(-h*.2,-h*.8);ctx.lineTo(-h*.5,-h*.8);ctx.lineTo(-h*.5,h*.8);ctx.lineTo(-h*.2,h*.8);ctx.moveTo(h*.2,-h*.8);ctx.lineTo(h*.5,-h*.8);ctx.lineTo(h*.5,h*.8);ctx.lineTo(h*.2,h*.8);break;
    case 15: ctx.moveTo(0,-h);ctx.lineTo(0,h*.3);ctx.lineTo(h*.7,h*.3);ctx.moveTo(0,-h*.3);ctx.lineTo(-h*.4,-h*.3);break;
    case 16: ctx.moveTo(-h,0);ctx.lineTo(-h*.4,-h*.5);ctx.lineTo(h*.1,h*.3);ctx.lineTo(h*.6,-h*.5);ctx.lineTo(h,0);break;
    case 17: ctx.moveTo(-h*.7,-h);ctx.lineTo(-h*.2,h);ctx.moveTo(h*.2,-h);ctx.lineTo(h*.7,h);break;
    case 18: ctx.moveTo(-h*.6,-h*.6);ctx.lineTo(h*.6,-h*.6);ctx.moveTo(0,-h*.6);ctx.lineTo(0,h*.8);ctx.moveTo(-h*.3,h*.8);ctx.lineTo(h*.3,h*.8);break;
    case 19: ctx.moveTo(-h*.7,h*.5);ctx.lineTo(-h*.7,0);ctx.lineTo(-h*.2,0);ctx.lineTo(-h*.2,-h*.5);ctx.lineTo(h*.3,-h*.5);ctx.lineTo(h*.3,-h);ctx.lineTo(h*.7,-h);break;
    case 20: ctx.stroke();ctx.beginPath();ctx.arc(0,-h*.6,s*.06,0,Math.PI*2);ctx.arc(0,0,s*.06,0,Math.PI*2);ctx.arc(0,h*.6,s*.06,0,Math.PI*2);ctx.fill();break;
    case 21: ctx.moveTo(-h*.7,0);ctx.lineTo(h*.7,0);ctx.stroke();ctx.beginPath();ctx.arc(0,-h*.55,s*.055,0,Math.PI*2);ctx.arc(0,h*.55,s*.055,0,Math.PI*2);ctx.fill();break;
    case 22: ctx.moveTo(0,h);ctx.lineTo(0,0);ctx.moveTo(0,0);ctx.lineTo(-h*.6,-h);ctx.moveTo(0,0);ctx.lineTo(h*.6,-h);break;
    case 23: ctx.moveTo(0,h);ctx.lineTo(0,-h);ctx.moveTo(0,-h*.2);ctx.lineTo(-h*.6,-h);ctx.moveTo(0,-h*.2);ctx.lineTo(h*.6,-h);ctx.moveTo(-h*.4,-h*.6);ctx.lineTo(h*.4,-h*.6);break;
  }
  ctx.stroke();
}

const NUM_COLUMNS = 7;

interface TypingParticlesProps {
  trigger: number;       // keystroke del usuario
  streamTrigger?: number; // chunks del streaming de la IA
}

export const TypingParticles: React.FC<TypingParticlesProps> = ({ trigger, streamTrigger = 0 }) => {
  const canvasRef      = useRef<HTMLCanvasElement>(null);
  const particlesRef   = useRef<Particle[]>([]);
  const animFrameRef   = useRef<number>(0);
  const isRunning      = useRef(false);
  const colIndexRef    = useRef(0);
  const lastSpawnRef   = useRef(0);

  const spawnBurst = useCallback((isStream = false) => {
    const now = Date.now();
    if (now - lastSpawnRef.current < SPAWN_THROTTLE) return;
    lastSpawnRef.current = now;

    const canvas = canvasRef.current;
    if (!canvas || canvas.width === 0) return;

    const w = canvas.width, h = canvas.height;
    const colWidth = w / NUM_COLUMNS;
    const col = colIndexRef.current % NUM_COLUMNS;
    colIndexRef.current++;

    const palette = isStream ? COLORS_STREAM : COLORS_USER;
    const colorArr = palette[Math.floor(Math.random() * palette.length)];

    // Durante streaming spawn 2 partículas para más efecto visual
    const count = isStream ? 2 : 1;
    for (let i = 0; i < count; i++) {
      const p: Particle = {
        x:          colWidth * ((col + i) % NUM_COLUMNS) + colWidth * 0.5 + (Math.random() - 0.5) * colWidth * 0.4,
        y:          h * 0.1 + Math.random() * h * 0.75,
        vy:         -(0.15 + Math.random() * 0.35),
        life:       1.0,
        maxLife:    400 + Math.random() * 600,
        size:       16 + Math.random() * 16,
        glyphIndex: Math.floor(Math.random() * 24),
        color:      colorArr,
        rotation:   (Math.floor(Math.random() * 8) * Math.PI) / 4,
      };
      particlesRef.current.push(p);
    }

    if (particlesRef.current.length > MAX_PARTICLES) {
      particlesRef.current = particlesRef.current.slice(-MAX_PARTICLES);
    }
  }, []);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (particlesRef.current.length === 0) {
      isRunning.current = false;
      return;
    }

    const dt = 16;
    particlesRef.current = particlesRef.current.filter((p) => {
      p.life -= dt / p.maxLife;
      if (p.life <= 0) return false;
      p.y += p.vy;

      const fadeIn  = p.life > 0.88 ? (1 - p.life) / 0.12 : 1;
      const fadeOut = p.life < 0.35 ? p.life / 0.35 : 1;
      // FIX: opacidad subida de 0.22 → 0.52 para que se vean
      const opacity = fadeIn * fadeOut * 0.52;

      if (opacity <= 0.005) return true;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.globalAlpha = opacity;

      // Glow rojo fosforescente
      ctx.shadowColor  = `rgba(${p.color[0]},${p.color[1]},${p.color[2]},0.8)`;
      ctx.shadowBlur   = 8;
      ctx.strokeStyle  = `rgba(${p.color[0]},${p.color[1]},${p.color[2]},1)`;
      ctx.fillStyle    = `rgba(${p.color[0]},${p.color[1]},${p.color[2]},1)`;

      drawGlyph(ctx, p.glyphIndex, p.size);
      ctx.restore();
      return true;
    });

    animFrameRef.current = requestAnimationFrame(render);
  }, []);

  const startLoop = useCallback(() => {
    if (!isRunning.current) {
      isRunning.current = true;
      animFrameRef.current = requestAnimationFrame(render);
    }
  }, [render]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const parent = canvas.parentElement;
      if (parent) { canvas.width = parent.offsetWidth; canvas.height = parent.offsetHeight; }
    };
    resize();
    const observer = new ResizeObserver(resize);
    if (canvas.parentElement) observer.observe(canvas.parentElement);
    return () => { cancelAnimationFrame(animFrameRef.current); isRunning.current = false; observer.disconnect(); };
  }, []);

  // Trigger del usuario (teclas)
  useEffect(() => {
    if (trigger > 0) { spawnBurst(false); startLoop(); }
  }, [trigger, spawnBurst, startLoop]);

  // Trigger del streaming (respuesta de la IA)
  useEffect(() => {
    if (streamTrigger > 0) { spawnBurst(true); startLoop(); }
  }, [streamTrigger, spawnBurst, startLoop]);

  return (
    <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1 }} />
  );
};
