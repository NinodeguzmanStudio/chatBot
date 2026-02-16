// ═══════════════════════════════════════
// AIdark — Yautja Typing Particles v3
// ═══════════════════════════════════════
// Predator-language glyphs floating across
// entire chat area on keystrokes

import React, { useRef, useEffect, useCallback } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  glyphIndex: number;
  color: string;
  rotation: number;
  rotSpeed: number;
}

const COLORS = [
  [139, 115, 85],   // accent gold
  [160, 81, 59],    // warm ember
  [160, 137, 106],  // light gold
  [120, 95, 65],    // deep amber
  [180, 110, 55],   // orange
  [100, 80, 55],    // dark bronze
];

// Draw Yautja-style glyphs procedurally
function drawYautjaGlyph(ctx: CanvasRenderingContext2D, index: number, size: number) {
  const s = size;
  const half = s / 2;
  ctx.lineWidth = Math.max(1, s * 0.08);
  ctx.lineCap = 'round';

  switch (index % 26) {
    case 0: // A — forked top, stem down
      ctx.beginPath();
      ctx.moveTo(0, half); ctx.lineTo(0, -half * 0.3);
      ctx.moveTo(0, -half * 0.3); ctx.lineTo(-half * 0.5, -half);
      ctx.moveTo(0, -half * 0.3); ctx.lineTo(half * 0.5, -half);
      ctx.moveTo(-half * 0.5, -half); ctx.lineTo(-half * 0.7, -half * 0.7);
      ctx.moveTo(half * 0.5, -half); ctx.lineTo(half * 0.7, -half * 0.7);
      ctx.stroke();
      break;
    case 1: // B — double fork
      ctx.beginPath();
      ctx.moveTo(0, half); ctx.lineTo(0, -half);
      ctx.moveTo(0, -half * 0.2); ctx.lineTo(half * 0.6, -half * 0.5);
      ctx.moveTo(0, -half * 0.2); ctx.lineTo(-half * 0.6, -half * 0.5);
      ctx.moveTo(0, half * 0.3); ctx.lineTo(half * 0.5, half * 0.6);
      ctx.moveTo(0, half * 0.3); ctx.lineTo(-half * 0.5, half * 0.6);
      ctx.stroke();
      break;
    case 2: // C — three prongs up
      ctx.beginPath();
      ctx.moveTo(0, half); ctx.lineTo(0, 0);
      ctx.moveTo(0, 0); ctx.lineTo(-half * 0.6, -half);
      ctx.moveTo(0, 0); ctx.lineTo(0, -half);
      ctx.moveTo(0, 0); ctx.lineTo(half * 0.6, -half);
      ctx.stroke();
      break;
    case 3: // D — angled claw left
      ctx.beginPath();
      ctx.moveTo(half * 0.3, half); ctx.lineTo(0, 0);
      ctx.moveTo(0, 0); ctx.lineTo(-half * 0.7, -half * 0.8);
      ctx.moveTo(-half * 0.7, -half * 0.8); ctx.lineTo(-half * 0.4, -half);
      ctx.moveTo(-half * 0.7, -half * 0.8); ctx.lineTo(-half, -half * 0.6);
      ctx.stroke();
      break;
    case 4: // E — cross with ticks
      ctx.beginPath();
      ctx.moveTo(0, half * 0.7); ctx.lineTo(0, -half * 0.7);
      ctx.moveTo(-half * 0.5, 0); ctx.lineTo(half * 0.5, 0);
      ctx.moveTo(-half * 0.3, -half * 0.5); ctx.lineTo(-half * 0.5, -half * 0.7);
      ctx.moveTo(half * 0.3, -half * 0.5); ctx.lineTo(half * 0.5, -half * 0.7);
      ctx.stroke();
      break;
    case 5: // F — arrow fork
      ctx.beginPath();
      ctx.moveTo(0, half); ctx.lineTo(0, -half * 0.4);
      ctx.moveTo(0, -half * 0.4); ctx.lineTo(-half * 0.8, -half);
      ctx.moveTo(0, -half * 0.4); ctx.lineTo(half * 0.8, -half);
      ctx.moveTo(-half * 0.4, -half * 0.7); ctx.lineTo(-half * 0.3, -half);
      ctx.moveTo(half * 0.4, -half * 0.7); ctx.lineTo(half * 0.3, -half);
      ctx.stroke();
      break;
    case 6: // G — stem with side branches
      ctx.beginPath();
      ctx.moveTo(0, half); ctx.lineTo(0, -half);
      ctx.moveTo(0, -half * 0.6); ctx.lineTo(half * 0.7, -half);
      ctx.moveTo(0, 0); ctx.lineTo(half * 0.5, -half * 0.2);
      ctx.moveTo(0, half * 0.4); ctx.lineTo(-half * 0.5, half * 0.1);
      ctx.stroke();
      break;
    case 7: // H — trident down
      ctx.beginPath();
      ctx.moveTo(0, -half); ctx.lineTo(0, half * 0.3);
      ctx.moveTo(0, half * 0.3); ctx.lineTo(-half * 0.5, half);
      ctx.moveTo(0, half * 0.3); ctx.lineTo(0, half);
      ctx.moveTo(0, half * 0.3); ctx.lineTo(half * 0.5, half);
      ctx.stroke();
      break;
    case 8: // I — single with dots
      ctx.beginPath();
      ctx.moveTo(0, half * 0.6); ctx.lineTo(0, -half * 0.6);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, -half * 0.85, s * 0.05, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, half * 0.85, s * 0.05, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 9: // J — hook with branches
      ctx.beginPath();
      ctx.moveTo(0, -half); ctx.lineTo(0, half * 0.5);
      ctx.quadraticCurveTo(0, half, -half * 0.4, half);
      ctx.moveTo(0, -half * 0.3); ctx.lineTo(half * 0.5, -half * 0.6);
      ctx.stroke();
      break;
    case 10: // K — angular K
      ctx.beginPath();
      ctx.moveTo(-half * 0.2, half); ctx.lineTo(-half * 0.2, -half);
      ctx.moveTo(-half * 0.2, 0); ctx.lineTo(half * 0.5, -half * 0.8);
      ctx.moveTo(-half * 0.2, 0); ctx.lineTo(half * 0.5, half * 0.8);
      ctx.moveTo(half * 0.5, -half * 0.8); ctx.lineTo(half * 0.7, -half * 0.6);
      ctx.stroke();
      break;
    case 11: // L — claw open
      ctx.beginPath();
      ctx.moveTo(0, half * 0.3); ctx.lineTo(-half * 0.6, -half);
      ctx.moveTo(0, half * 0.3); ctx.lineTo(half * 0.6, -half);
      ctx.moveTo(0, half * 0.3); ctx.lineTo(0, half);
      ctx.moveTo(-half * 0.6, -half); ctx.lineTo(-half * 0.8, -half * 0.8);
      ctx.moveTo(half * 0.6, -half); ctx.lineTo(half * 0.8, -half * 0.8);
      ctx.stroke();
      break;
    case 12: // M — zigzag
      ctx.beginPath();
      ctx.moveTo(-half * 0.5, half);
      ctx.lineTo(-half * 0.3, -half * 0.5);
      ctx.lineTo(0, half * 0.2);
      ctx.lineTo(half * 0.3, -half * 0.5);
      ctx.lineTo(half * 0.5, half);
      ctx.stroke();
      break;
    case 13: // N — angular N
      ctx.beginPath();
      ctx.moveTo(-half * 0.3, half); ctx.lineTo(-half * 0.3, -half);
      ctx.lineTo(half * 0.3, half); ctx.lineTo(half * 0.3, -half);
      ctx.stroke();
      break;
    case 14: // O — diamond
      ctx.beginPath();
      ctx.moveTo(0, -half); ctx.lineTo(half * 0.5, 0);
      ctx.lineTo(0, half); ctx.lineTo(-half * 0.5, 0); ctx.closePath();
      ctx.stroke();
      break;
    case 15: // P — flag
      ctx.beginPath();
      ctx.moveTo(-half * 0.2, half); ctx.lineTo(-half * 0.2, -half);
      ctx.lineTo(half * 0.5, -half * 0.4);
      ctx.lineTo(-half * 0.2, 0);
      ctx.stroke();
      break;
    case 16: // Q — target circle
      ctx.beginPath();
      ctx.arc(0, 0, half * 0.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, -half); ctx.lineTo(0, -half * 0.5);
      ctx.moveTo(0, half); ctx.lineTo(0, half * 0.5);
      ctx.stroke();
      break;
    case 17: // R — branch right
      ctx.beginPath();
      ctx.moveTo(-half * 0.2, half); ctx.lineTo(-half * 0.2, -half);
      ctx.moveTo(-half * 0.2, -half * 0.5); ctx.lineTo(half * 0.5, -half);
      ctx.moveTo(-half * 0.2, 0); ctx.lineTo(half * 0.5, half * 0.4);
      ctx.moveTo(half * 0.5, -half); ctx.lineTo(half * 0.7, -half * 0.8);
      ctx.stroke();
      break;
    case 18: // S — serpent
      ctx.beginPath();
      ctx.moveTo(half * 0.4, -half * 0.8);
      ctx.quadraticCurveTo(-half * 0.6, -half * 0.3, half * 0.4, half * 0.2);
      ctx.quadraticCurveTo(-half * 0.2, half * 0.6, -half * 0.4, half * 0.8);
      ctx.stroke();
      break;
    case 19: // T — tau with ticks
      ctx.beginPath();
      ctx.moveTo(-half * 0.6, -half * 0.7); ctx.lineTo(half * 0.6, -half * 0.7);
      ctx.moveTo(0, -half * 0.7); ctx.lineTo(0, half);
      ctx.moveTo(-half * 0.6, -half * 0.7); ctx.lineTo(-half * 0.4, -half);
      ctx.moveTo(half * 0.6, -half * 0.7); ctx.lineTo(half * 0.4, -half);
      ctx.stroke();
      break;
    case 20: // U — cup with marks
      ctx.beginPath();
      ctx.moveTo(-half * 0.5, -half);
      ctx.lineTo(-half * 0.5, half * 0.5);
      ctx.quadraticCurveTo(0, half * 1.1, half * 0.5, half * 0.5);
      ctx.lineTo(half * 0.5, -half);
      ctx.stroke();
      break;
    case 21: // V — chevron down
      ctx.beginPath();
      ctx.moveTo(-half * 0.7, -half); ctx.lineTo(0, half * 0.6); ctx.lineTo(half * 0.7, -half);
      ctx.moveTo(0, half * 0.6); ctx.lineTo(0, half);
      ctx.stroke();
      break;
    case 22: // W — double chevron
      ctx.beginPath();
      ctx.moveTo(-half * 0.8, -half * 0.6);
      ctx.lineTo(-half * 0.3, half * 0.4);
      ctx.lineTo(0, -half * 0.2);
      ctx.lineTo(half * 0.3, half * 0.4);
      ctx.lineTo(half * 0.8, -half * 0.6);
      ctx.stroke();
      break;
    case 23: // X — crossing blades
      ctx.beginPath();
      ctx.moveTo(-half * 0.6, -half); ctx.lineTo(half * 0.6, half);
      ctx.moveTo(half * 0.6, -half); ctx.lineTo(-half * 0.6, half);
      ctx.moveTo(0, 0); ctx.lineTo(0, -half * 0.3);
      ctx.stroke();
      break;
    case 24: // Y — trident up
      ctx.beginPath();
      ctx.moveTo(0, half); ctx.lineTo(0, 0);
      ctx.moveTo(0, 0); ctx.lineTo(-half * 0.6, -half);
      ctx.moveTo(0, 0); ctx.lineTo(half * 0.6, -half);
      ctx.moveTo(-half * 0.6, -half); ctx.lineTo(-half * 0.8, -half * 0.7);
      ctx.moveTo(half * 0.6, -half); ctx.lineTo(half * 0.8, -half * 0.7);
      ctx.stroke();
      break;
    case 25: // Z — angular bolt
      ctx.beginPath();
      ctx.moveTo(-half * 0.5, -half * 0.7); ctx.lineTo(half * 0.5, -half * 0.7);
      ctx.lineTo(-half * 0.5, half * 0.7); ctx.lineTo(half * 0.5, half * 0.7);
      ctx.moveTo(-half * 0.5, -half * 0.7); ctx.lineTo(-half * 0.3, -half);
      ctx.stroke();
      break;
  }
}

export const TypingParticles: React.FC<{ trigger: number }> = ({ trigger }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameRef = useRef<number>(0);
  const isRunning = useRef(false);

  const spawnBurst = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || canvas.width === 0) return;

    const w = canvas.width;
    const h = canvas.height;
    const count = 2 + Math.floor(Math.random() * 3);

    for (let i = 0; i < count; i++) {
      const colorArr = COLORS[Math.floor(Math.random() * COLORS.length)];
      const particle: Particle = {
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.6,
        vy: -(0.3 + Math.random() * 0.8),
        life: 1.0,
        maxLife: 400 + Math.random() * 300,
        size: 14 + Math.random() * 14,
        glyphIndex: Math.floor(Math.random() * 26),
        color: `${colorArr[0]},${colorArr[1]},${colorArr[2]}`,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.03,
      };
      particlesRef.current.push(particle);
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

      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.rotSpeed;

      const fadeIn = p.life > 0.85 ? (1 - p.life) / 0.15 : 1;
      const fadeOut = p.life < 0.3 ? p.life / 0.3 : 1;
      const opacity = fadeIn * fadeOut * 0.28;

      if (opacity <= 0.005) return true;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.globalAlpha = opacity;
      ctx.strokeStyle = `rgba(${p.color},1)`;
      ctx.fillStyle = `rgba(${p.color},1)`;

      drawYautjaGlyph(ctx, p.glyphIndex, p.size);

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
