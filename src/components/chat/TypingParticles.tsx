// ═══════════════════════════════════════
// AIdark — Yautja Typing Particles v4
// ═══════════════════════════════════════
// True Predator-language glyphs
// Structured column layout, not scattered

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
}

const COLORS: number[][] = [
  [139, 115, 85],
  [160, 81, 59],
  [160, 137, 106],
  [120, 95, 65],
  [180, 110, 55],
];

// ── True Yautja glyphs ──
// All share: vertical stem + forked top branches + small tick marks
// Variations: number of branches, angles, tick positions
function drawGlyph(ctx: CanvasRenderingContext2D, idx: number, s: number) {
  const h = s * 0.5;
  ctx.lineWidth = Math.max(1.2, s * 0.065);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Every glyph starts with a vertical stem
  ctx.beginPath();
  ctx.moveTo(0, h);
  ctx.lineTo(0, -h * 0.25);
  ctx.stroke();

  switch (idx % 20) {
    case 0: // Two branches up-left and up-right, wide fork
      ctx.beginPath();
      ctx.moveTo(0, -h * 0.25); ctx.lineTo(-h * 0.55, -h);
      ctx.moveTo(0, -h * 0.25); ctx.lineTo(h * 0.55, -h);
      // Tick marks on branches
      ctx.moveTo(-h * 0.35, -h * 0.7); ctx.lineTo(-h * 0.55, -h * 0.6);
      ctx.moveTo(h * 0.35, -h * 0.7); ctx.lineTo(h * 0.55, -h * 0.6);
      ctx.stroke();
      break;

    case 1: // Three prong — center tall, sides shorter
      ctx.beginPath();
      ctx.moveTo(0, -h * 0.25); ctx.lineTo(0, -h);
      ctx.moveTo(0, -h * 0.25); ctx.lineTo(-h * 0.45, -h * 0.75);
      ctx.moveTo(0, -h * 0.25); ctx.lineTo(h * 0.45, -h * 0.75);
      // Small outward ticks at tips
      ctx.moveTo(-h * 0.45, -h * 0.75); ctx.lineTo(-h * 0.6, -h * 0.65);
      ctx.moveTo(h * 0.45, -h * 0.75); ctx.lineTo(h * 0.6, -h * 0.65);
      ctx.stroke();
      break;

    case 2: // Asymmetric — left branch high, right branch mid, tick on stem
      ctx.beginPath();
      ctx.moveTo(0, -h * 0.25); ctx.lineTo(-h * 0.5, -h);
      ctx.moveTo(0, -h * 0.1); ctx.lineTo(h * 0.4, -h * 0.5);
      ctx.moveTo(-h * 0.5, -h); ctx.lineTo(-h * 0.65, -h * 0.85);
      // Tick on lower stem
      ctx.moveTo(0, h * 0.4); ctx.lineTo(h * 0.15, h * 0.3);
      ctx.stroke();
      break;

    case 3: // Wide V fork with inner marks
      ctx.beginPath();
      ctx.moveTo(0, -h * 0.25); ctx.lineTo(-h * 0.6, -h * 0.9);
      ctx.moveTo(0, -h * 0.25); ctx.lineTo(h * 0.6, -h * 0.9);
      // Inner parallel lines
      ctx.moveTo(-h * 0.15, -h * 0.45); ctx.lineTo(-h * 0.35, -h * 0.75);
      ctx.moveTo(h * 0.15, -h * 0.45); ctx.lineTo(h * 0.35, -h * 0.75);
      ctx.stroke();
      break;

    case 4: // Four prong — two pairs
      ctx.beginPath();
      ctx.moveTo(0, -h * 0.25); ctx.lineTo(-h * 0.3, -h * 0.8);
      ctx.moveTo(0, -h * 0.25); ctx.lineTo(h * 0.3, -h * 0.8);
      ctx.moveTo(-h * 0.3, -h * 0.8); ctx.lineTo(-h * 0.5, -h);
      ctx.moveTo(h * 0.3, -h * 0.8); ctx.lineTo(h * 0.5, -h);
      // Small tips
      ctx.moveTo(-h * 0.5, -h); ctx.lineTo(-h * 0.55, -h * 0.85);
      ctx.moveTo(h * 0.5, -h); ctx.lineTo(h * 0.55, -h * 0.85);
      ctx.stroke();
      break;

    case 5: // Tight fork with long outer ticks
      ctx.beginPath();
      ctx.moveTo(0, -h * 0.25); ctx.lineTo(-h * 0.25, -h * 0.85);
      ctx.moveTo(0, -h * 0.25); ctx.lineTo(h * 0.25, -h * 0.85);
      // Long outward ticks from tips
      ctx.moveTo(-h * 0.25, -h * 0.85); ctx.lineTo(-h * 0.55, -h * 0.7);
      ctx.moveTo(h * 0.25, -h * 0.85); ctx.lineTo(h * 0.55, -h * 0.7);
      // Mid stem tick
      ctx.moveTo(0, h * 0.1); ctx.lineTo(-h * 0.2, 0);
      ctx.stroke();
      break;

    case 6: // Crown — three equal branches, ticks at all tips
      ctx.beginPath();
      ctx.moveTo(0, -h * 0.25); ctx.lineTo(-h * 0.5, -h * 0.9);
      ctx.moveTo(0, -h * 0.25); ctx.lineTo(0, -h * 0.95);
      ctx.moveTo(0, -h * 0.25); ctx.lineTo(h * 0.5, -h * 0.9);
      ctx.moveTo(-h * 0.5, -h * 0.9); ctx.lineTo(-h * 0.6, -h * 0.75);
      ctx.moveTo(0, -h * 0.95); ctx.lineTo(h * 0.1, -h * 0.8);
      ctx.moveTo(h * 0.5, -h * 0.9); ctx.lineTo(h * 0.6, -h * 0.75);
      ctx.stroke();
      break;

    case 7: // Left heavy — two branches left, one right
      ctx.beginPath();
      ctx.moveTo(0, -h * 0.25); ctx.lineTo(-h * 0.35, -h * 0.7);
      ctx.moveTo(-h * 0.35, -h * 0.7); ctx.lineTo(-h * 0.6, -h);
      ctx.moveTo(-h * 0.35, -h * 0.7); ctx.lineTo(-h * 0.15, -h);
      ctx.moveTo(0, -h * 0.25); ctx.lineTo(h * 0.4, -h * 0.8);
      ctx.moveTo(h * 0.4, -h * 0.8); ctx.lineTo(h * 0.55, -h * 0.65);
      ctx.stroke();
      break;

    case 8: // Antenna — single tall with side whiskers
      ctx.beginPath();
      ctx.moveTo(0, -h * 0.25); ctx.lineTo(0, -h);
      ctx.moveTo(0, -h * 0.6); ctx.lineTo(-h * 0.4, -h * 0.75);
      ctx.moveTo(0, -h * 0.6); ctx.lineTo(h * 0.4, -h * 0.75);
      ctx.moveTo(0, -h * 0.85); ctx.lineTo(-h * 0.25, -h);
      ctx.moveTo(0, -h * 0.85); ctx.lineTo(h * 0.25, -h);
      ctx.stroke();
      break;

    case 9: // Narrow trident with dot
      ctx.beginPath();
      ctx.moveTo(0, -h * 0.3); ctx.lineTo(-h * 0.2, -h * 0.9);
      ctx.moveTo(0, -h * 0.3); ctx.lineTo(0, -h * 0.95);
      ctx.moveTo(0, -h * 0.3); ctx.lineTo(h * 0.2, -h * 0.9);
      ctx.stroke();
      // Dot at base
      ctx.beginPath();
      ctx.arc(0, h * 0.7, s * 0.04, 0, Math.PI * 2);
      ctx.fill();
      break;

    case 10: // Y-split with horizontal tick
      ctx.beginPath();
      ctx.moveTo(0, -h * 0.2); ctx.lineTo(-h * 0.5, -h);
      ctx.moveTo(0, -h * 0.2); ctx.lineTo(h * 0.5, -h);
      // Horizontal tick across branches
      ctx.moveTo(-h * 0.35, -h * 0.7); ctx.lineTo(h * 0.35, -h * 0.7);
      ctx.moveTo(-h * 0.5, -h); ctx.lineTo(-h * 0.6, -h * 0.85);
      ctx.moveTo(h * 0.5, -h); ctx.lineTo(h * 0.6, -h * 0.85);
      ctx.stroke();
      break;

    case 11: // Uneven fork — left tall, right short with double tick
      ctx.beginPath();
      ctx.moveTo(0, -h * 0.25); ctx.lineTo(-h * 0.4, -h);
      ctx.moveTo(0, -h * 0.15); ctx.lineTo(h * 0.35, -h * 0.55);
      ctx.moveTo(-h * 0.4, -h); ctx.lineTo(-h * 0.55, -h * 0.85);
      ctx.moveTo(h * 0.35, -h * 0.55); ctx.lineTo(h * 0.5, -h * 0.45);
      // Double tick on stem
      ctx.moveTo(-h * 0.1, h * 0.15); ctx.lineTo(-h * 0.25, h * 0.05);
      ctx.moveTo(-h * 0.1, h * 0.35); ctx.lineTo(-h * 0.25, h * 0.25);
      ctx.stroke();
      break;

    case 12: // Crab claw — wide split with inward hooks
      ctx.beginPath();
      ctx.moveTo(0, -h * 0.25); ctx.lineTo(-h * 0.6, -h * 0.85);
      ctx.moveTo(0, -h * 0.25); ctx.lineTo(h * 0.6, -h * 0.85);
      // Inward hooks at tips
      ctx.moveTo(-h * 0.6, -h * 0.85); ctx.lineTo(-h * 0.45, -h);
      ctx.moveTo(h * 0.6, -h * 0.85); ctx.lineTo(h * 0.45, -h);
      ctx.stroke();
      break;

    case 13: // Spine — center line with alternating small branches
      ctx.beginPath();
      ctx.moveTo(0, -h * 0.25); ctx.lineTo(0, -h);
      ctx.moveTo(0, -h * 0.45); ctx.lineTo(-h * 0.3, -h * 0.55);
      ctx.moveTo(0, -h * 0.65); ctx.lineTo(h * 0.3, -h * 0.75);
      ctx.moveTo(0, -h * 0.85); ctx.lineTo(-h * 0.25, -h * 0.95);
      ctx.stroke();
      break;

    case 14: // Double stem — parallel lines with shared top fork
      ctx.beginPath();
      ctx.moveTo(-h * 0.1, h); ctx.lineTo(-h * 0.1, -h * 0.3);
      ctx.moveTo(h * 0.1, h); ctx.lineTo(h * 0.1, -h * 0.3);
      ctx.moveTo(-h * 0.1, -h * 0.3); ctx.lineTo(-h * 0.45, -h * 0.9);
      ctx.moveTo(h * 0.1, -h * 0.3); ctx.lineTo(h * 0.45, -h * 0.9);
      ctx.moveTo(-h * 0.45, -h * 0.9); ctx.lineTo(-h * 0.55, -h * 0.75);
      ctx.moveTo(h * 0.45, -h * 0.9); ctx.lineTo(h * 0.55, -h * 0.75);
      ctx.stroke();
      break;

    case 15: // Tuning fork — narrow parallel prongs
      ctx.beginPath();
      ctx.moveTo(0, -h * 0.3); ctx.lineTo(-h * 0.15, -h);
      ctx.moveTo(0, -h * 0.3); ctx.lineTo(h * 0.15, -h);
      // Outward flicks at tips
      ctx.moveTo(-h * 0.15, -h); ctx.lineTo(-h * 0.35, -h * 0.9);
      ctx.moveTo(h * 0.15, -h); ctx.lineTo(h * 0.35, -h * 0.9);
      ctx.stroke();
      break;

    case 16: // Scorpion — fork with curled-back hooks
      ctx.beginPath();
      ctx.moveTo(0, -h * 0.2); ctx.lineTo(-h * 0.5, -h * 0.8);
      ctx.moveTo(0, -h * 0.2); ctx.lineTo(h * 0.5, -h * 0.8);
      // Hooks curving back down
      ctx.moveTo(-h * 0.5, -h * 0.8); ctx.lineTo(-h * 0.6, -h * 0.55);
      ctx.moveTo(h * 0.5, -h * 0.8); ctx.lineTo(h * 0.6, -h * 0.55);
      // Center prong
      ctx.moveTo(0, -h * 0.35); ctx.lineTo(0, -h * 0.75);
      ctx.stroke();
      break;

    case 17: // Feather — one branch with parallel tickmarks
      ctx.beginPath();
      ctx.moveTo(0, -h * 0.25); ctx.lineTo(-h * 0.15, -h);
      ctx.moveTo(0, -h * 0.25); ctx.lineTo(h * 0.4, -h * 0.85);
      ctx.moveTo(h * 0.4, -h * 0.85); ctx.lineTo(h * 0.55, -h * 0.7);
      // Parallel ticks on left branch
      ctx.moveTo(-h * 0.05, -h * 0.5); ctx.lineTo(-h * 0.2, -h * 0.45);
      ctx.moveTo(-h * 0.08, -h * 0.65); ctx.lineTo(-h * 0.23, -h * 0.6);
      ctx.moveTo(-h * 0.12, -h * 0.8); ctx.lineTo(-h * 0.27, -h * 0.75);
      ctx.stroke();
      break;

    case 18: // Shield — fork with crossbar
      ctx.beginPath();
      ctx.moveTo(0, -h * 0.25); ctx.lineTo(-h * 0.45, -h * 0.95);
      ctx.moveTo(0, -h * 0.25); ctx.lineTo(h * 0.45, -h * 0.95);
      // Crossbar connecting branches
      ctx.moveTo(-h * 0.3, -h * 0.7); ctx.lineTo(h * 0.3, -h * 0.7);
      ctx.moveTo(-h * 0.45, -h * 0.95); ctx.lineTo(-h * 0.55, -h * 0.8);
      ctx.moveTo(h * 0.45, -h * 0.95); ctx.lineTo(h * 0.55, -h * 0.8);
      ctx.stroke();
      break;

    case 19: // Rune — complex: three branches with double ticks
      ctx.beginPath();
      ctx.moveTo(0, -h * 0.25); ctx.lineTo(-h * 0.4, -h * 0.9);
      ctx.moveTo(0, -h * 0.25); ctx.lineTo(0, -h * 0.9);
      ctx.moveTo(0, -h * 0.25); ctx.lineTo(h * 0.4, -h * 0.9);
      // Double ticks
      ctx.moveTo(-h * 0.4, -h * 0.9); ctx.lineTo(-h * 0.5, -h * 0.75);
      ctx.moveTo(-h * 0.4, -h * 0.9); ctx.lineTo(-h * 0.3, -h);
      ctx.moveTo(h * 0.4, -h * 0.9); ctx.lineTo(h * 0.5, -h * 0.75);
      ctx.moveTo(h * 0.4, -h * 0.9); ctx.lineTo(h * 0.3, -h);
      ctx.stroke();
      break;
  }
}

// Column positions — glyphs spawn in fixed columns for order
const NUM_COLUMNS = 8;

export const TypingParticles: React.FC<{ trigger: number }> = ({ trigger }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameRef = useRef<number>(0);
  const isRunning = useRef(false);
  const colIndexRef = useRef(0);

  const spawnBurst = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || canvas.width === 0) return;

    const w = canvas.width;
    const h = canvas.height;
    const colWidth = w / NUM_COLUMNS;
    const count = 1 + Math.floor(Math.random() * 2); // 1-2 per keystroke

    for (let i = 0; i < count; i++) {
      // Cycle through columns in order, with slight random offset
      const col = colIndexRef.current % NUM_COLUMNS;
      colIndexRef.current++;

      const colorArr = COLORS[Math.floor(Math.random() * COLORS.length)];
      const particle: Particle = {
        x: colWidth * col + colWidth * 0.5 + (Math.random() - 0.5) * colWidth * 0.4,
        y: h * 0.15 + Math.random() * h * 0.7, // Between 15%-85% of height
        vy: -(0.15 + Math.random() * 0.35),
        life: 1.0,
        maxLife: 500 + Math.random() * 400, // 500-900ms
        size: 16 + Math.random() * 12,
        glyphIndex: Math.floor(Math.random() * 20),
        color: colorArr,
      };
      particlesRef.current.push(particle);
    }

    // Cap particles to prevent performance issues
    if (particlesRef.current.length > 40) {
      particlesRef.current = particlesRef.current.slice(-40);
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

      // Opacity: fade in quick, hold, fade out
      const fadeIn = p.life > 0.88 ? (1 - p.life) / 0.12 : 1;
      const fadeOut = p.life < 0.35 ? p.life / 0.35 : 1;
      const opacity = fadeIn * fadeOut * 0.25; // max 25%

      if (opacity <= 0.003) return true;

      ctx.save();
      ctx.translate(p.x, p.y);
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
