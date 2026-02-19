// ═══════════════════════════════════════
// AIdark — Yautja Particles v6 (OPTIMIZED)
// ═══════════════════════════════════════
// FIX: Throttle spawns to max 1 every 120ms (was: every keystroke/chunk)
// FIX: Cap particles at 30 (was: 45 with no real enforcement)
// FIX: Animation loop stops when no particles remain (was: could keep running)

import React, { useRef, useEffect, useCallback } from 'react';

interface Particle {
  x: number;
  y: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  glyphIndex: number;
  color: number[];
  rotation: number;
}

const COLORS: number[][] = [
  [139, 115, 85],
  [160, 81, 59],
  [160, 137, 106],
  [120, 95, 65],
  [180, 110, 55],
];

const MAX_PARTICLES = 30;
const SPAWN_THROTTLE_MS = 120;

function drawGlyph(ctx: CanvasRenderingContext2D, idx: number, s: number) {
  const h = s * 0.45;
  ctx.lineWidth = Math.max(1.3, s * 0.07);
  ctx.lineCap = 'square';
  ctx.lineJoin = 'miter';

  ctx.beginPath();
  switch (idx % 24) {
    case 0:
      ctx.moveTo(-h * 0.4, -h); ctx.lineTo(-h * 0.4, h);
      ctx.moveTo(0, -h * 0.7); ctx.lineTo(0, h * 0.7);
      ctx.moveTo(h * 0.4, -h); ctx.lineTo(h * 0.4, h);
      break;
    case 1:
      ctx.moveTo(-h, 0); ctx.lineTo(h, 0);
      ctx.moveTo(-h * 0.6, -h * 0.5); ctx.lineTo(h * 0.6, -h * 0.5);
      ctx.moveTo(0, -h); ctx.lineTo(0, h);
      break;
    case 2:
      ctx.moveTo(-h * 0.5, -h * 0.8); ctx.lineTo(-h * 0.5, h * 0.8);
      ctx.moveTo(-h * 0.15, -h * 0.8); ctx.lineTo(-h * 0.15, h * 0.8);
      ctx.moveTo(h * 0.15, -h * 0.8); ctx.lineTo(h * 0.15, h * 0.8);
      ctx.moveTo(h * 0.5, -h * 0.8); ctx.lineTo(h * 0.5, h * 0.8);
      ctx.moveTo(-h * 0.6, h * 0.5); ctx.lineTo(h * 0.6, -h * 0.5);
      break;
    case 3:
      ctx.moveTo(-h * 0.3, -h); ctx.lineTo(-h * 0.3, h);
      ctx.moveTo(h * 0.3, -h); ctx.lineTo(h * 0.3, h);
      ctx.moveTo(-h, -h * 0.3); ctx.lineTo(h, -h * 0.3);
      ctx.moveTo(-h, h * 0.3); ctx.lineTo(h, h * 0.3);
      break;
    case 4:
      ctx.moveTo(h * 0.4, -h); ctx.lineTo(-h * 0.4, 0); ctx.lineTo(h * 0.4, h);
      break;
    case 5:
      ctx.moveTo(-h * 0.4, -h); ctx.lineTo(h * 0.4, 0); ctx.lineTo(-h * 0.4, h);
      break;
    case 6:
      ctx.moveTo(-h * 0.6, h * 0.2); ctx.lineTo(0, -h * 0.4); ctx.lineTo(h * 0.6, h * 0.2);
      ctx.moveTo(-h * 0.6, h * 0.7); ctx.lineTo(0, h * 0.1); ctx.lineTo(h * 0.6, h * 0.7);
      break;
    case 7:
      ctx.moveTo(-h, 0); ctx.lineTo(h * 0.5, 0);
      ctx.moveTo(h * 0.2, -h * 0.4); ctx.lineTo(h * 0.7, 0); ctx.lineTo(h * 0.2, h * 0.4);
      break;
    case 8:
      ctx.moveTo(-h * 0.7, -h * 0.7); ctx.lineTo(h * 0.7, h * 0.7);
      ctx.moveTo(h * 0.7, -h * 0.7); ctx.lineTo(-h * 0.7, h * 0.7);
      break;
    case 9:
      ctx.moveTo(0, -h * 0.8); ctx.lineTo(0, h * 0.8);
      ctx.moveTo(-h * 0.8, 0); ctx.lineTo(h * 0.8, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(-h * 0.5, -h * 0.5, s * 0.04, 0, Math.PI * 2);
      ctx.arc(h * 0.5, -h * 0.5, s * 0.04, 0, Math.PI * 2);
      ctx.arc(-h * 0.5, h * 0.5, s * 0.04, 0, Math.PI * 2);
      ctx.arc(h * 0.5, h * 0.5, s * 0.04, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 10:
      for (let a = 0; a < 3; a++) {
        const angle = (a * Math.PI) / 3;
        ctx.moveTo(Math.cos(angle) * h * 0.8, Math.sin(angle) * h * 0.8);
        ctx.lineTo(-Math.cos(angle) * h * 0.8, -Math.sin(angle) * h * 0.8);
      }
      break;
    case 11:
      ctx.rect(-h * 0.5, -h * 0.5, h, h);
      break;
    case 12:
      ctx.moveTo(0, -h * 0.8); ctx.lineTo(h * 0.5, 0);
      ctx.lineTo(0, h * 0.8); ctx.lineTo(-h * 0.5, 0); ctx.closePath();
      break;
    case 13:
      ctx.moveTo(0, -h * 0.8); ctx.lineTo(h * 0.7, h * 0.6);
      ctx.lineTo(-h * 0.7, h * 0.6); ctx.closePath();
      break;
    case 14:
      ctx.moveTo(-h * 0.2, -h * 0.8); ctx.lineTo(-h * 0.5, -h * 0.8);
      ctx.lineTo(-h * 0.5, h * 0.8); ctx.lineTo(-h * 0.2, h * 0.8);
      ctx.moveTo(h * 0.2, -h * 0.8); ctx.lineTo(h * 0.5, -h * 0.8);
      ctx.lineTo(h * 0.5, h * 0.8); ctx.lineTo(h * 0.2, h * 0.8);
      break;
    case 15:
      ctx.moveTo(0, -h); ctx.lineTo(0, h * 0.3); ctx.lineTo(h * 0.7, h * 0.3);
      ctx.moveTo(0, -h * 0.3); ctx.lineTo(-h * 0.4, -h * 0.3);
      break;
    case 16:
      ctx.moveTo(-h, 0); ctx.lineTo(-h * 0.4, -h * 0.5);
      ctx.lineTo(h * 0.1, h * 0.3); ctx.lineTo(h * 0.6, -h * 0.5); ctx.lineTo(h, 0);
      break;
    case 17:
      ctx.moveTo(-h * 0.7, -h); ctx.lineTo(-h * 0.2, h);
      ctx.moveTo(h * 0.2, -h); ctx.lineTo(h * 0.7, h);
      break;
    case 18:
      ctx.moveTo(-h * 0.6, -h * 0.6); ctx.lineTo(h * 0.6, -h * 0.6);
      ctx.moveTo(0, -h * 0.6); ctx.lineTo(0, h * 0.8);
      ctx.moveTo(-h * 0.3, h * 0.8); ctx.lineTo(h * 0.3, h * 0.8);
      break;
    case 19:
      ctx.moveTo(-h * 0.7, h * 0.5); ctx.lineTo(-h * 0.7, 0);
      ctx.lineTo(-h * 0.2, 0); ctx.lineTo(-h * 0.2, -h * 0.5);
      ctx.lineTo(h * 0.3, -h * 0.5); ctx.lineTo(h * 0.3, -h);
      ctx.lineTo(h * 0.7, -h);
      break;
    case 20:
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, -h * 0.6, s * 0.06, 0, Math.PI * 2);
      ctx.arc(0, 0, s * 0.06, 0, Math.PI * 2);
      ctx.arc(0, h * 0.6, s * 0.06, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 21:
      ctx.moveTo(-h * 0.7, 0); ctx.lineTo(h * 0.7, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, -h * 0.55, s * 0.055, 0, Math.PI * 2);
      ctx.arc(0, h * 0.55, s * 0.055, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 22:
      ctx.moveTo(0, h); ctx.lineTo(0, 0);
      ctx.moveTo(0, 0); ctx.lineTo(-h * 0.6, -h);
      ctx.moveTo(0, 0); ctx.lineTo(h * 0.6, -h);
      break;
    case 23:
      ctx.moveTo(0, h); ctx.lineTo(0, -h);
      ctx.moveTo(0, -h * 0.2); ctx.lineTo(-h * 0.6, -h);
      ctx.moveTo(0, -h * 0.2); ctx.lineTo(h * 0.6, -h);
      ctx.moveTo(-h * 0.4, -h * 0.6); ctx.lineTo(h * 0.4, -h * 0.6);
      break;
  }
  ctx.stroke();
}

const NUM_COLUMNS = 7;

export const TypingParticles: React.FC<{ trigger: number }> = ({ trigger }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameRef = useRef<number>(0);
  const isRunning = useRef(false);
  const colIndexRef = useRef(0);
  const lastSpawnRef = useRef(0);

  const spawnBurst = useCallback(() => {
    // Throttle: no más de 1 spawn cada SPAWN_THROTTLE_MS
    const now = Date.now();
    if (now - lastSpawnRef.current < SPAWN_THROTTLE_MS) return;
    lastSpawnRef.current = now;

    const canvas = canvasRef.current;
    if (!canvas || canvas.width === 0) return;

    const w = canvas.width;
    const h = canvas.height;
    const colWidth = w / NUM_COLUMNS;

    // Solo 1 partícula por burst (era 1-2)
    const col = colIndexRef.current % NUM_COLUMNS;
    colIndexRef.current++;

    const colorArr = COLORS[Math.floor(Math.random() * COLORS.length)];
    const p: Particle = {
      x: colWidth * col + colWidth * 0.5 + (Math.random() - 0.5) * colWidth * 0.35,
      y: h * 0.1 + Math.random() * h * 0.75,
      vy: -(0.12 + Math.random() * 0.3),
      life: 1.0,
      maxLife: 500 + Math.random() * 500,
      size: 14 + Math.random() * 14,
      glyphIndex: Math.floor(Math.random() * 24),
      color: colorArr,
      rotation: (Math.floor(Math.random() * 8) * Math.PI) / 4,
    };
    particlesRef.current.push(p);

    // Hard cap
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
      // STOP the loop — no particles, no CPU usage
      isRunning.current = false;
      return;
    }

    const dt = 16;
    particlesRef.current = particlesRef.current.filter((p) => {
      p.life -= dt / p.maxLife;
      if (p.life <= 0) return false;

      p.y += p.vy;

      const fadeIn = p.life > 0.88 ? (1 - p.life) / 0.12 : 1;
      const fadeOut = p.life < 0.35 ? p.life / 0.35 : 1;
      const opacity = fadeIn * fadeOut * 0.22;

      if (opacity <= 0.003) return true;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.globalAlpha = opacity;
      ctx.strokeStyle = `rgba(${p.color[0]},${p.color[1]},${p.color[2]},1)`;
      ctx.fillStyle = `rgba(${p.color[0]},${p.color[1]},${p.color[2]},1)`;

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
      if (parent) {
        canvas.width = parent.offsetWidth;
        canvas.height = parent.offsetHeight;
      }
    };

    resize();
    const observer = new ResizeObserver(resize);
    if (canvas.parentElement) observer.observe(canvas.parentElement);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      isRunning.current = false;
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (trigger > 0) {
      spawnBurst();
      startLoop();
    }
  }, [trigger, spawnBurst, startLoop]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 1,
      }}
    />
  );
};
