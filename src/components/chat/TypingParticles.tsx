// ═══════════════════════════════════════
// AIdark — Typing Particles v2
// ═══════════════════════════════════════
// HUD-style ambient particles on keystrokes
// Warm predator tones matching app aesthetic

import React, { useRef, useEffect, useCallback } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  type: 'glyph' | 'dot' | 'line';
  char: string;
  color: string;
  rotation: number;
  rotSpeed: number;
}

// HUD glyphs — angular, geometric, tactical feel
const GLYPHS = ['◇', '△', '▽', '⬡', '⊕', '⊗', '⟐', '⬢', '⏣', '⏢', '⌬', '⟁'];
const DOT_CHARS = ['·', '∘', '•', '⊙'];

const COLORS = [
  'rgba(139,115,85,',    // accent gold
  'rgba(160,81,59,',     // warm ember
  'rgba(160,137,106,',   // light gold
  'rgba(120,95,65,',     // deep amber
  'rgba(180,100,50,',    // orange hint
];

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
    // Spawn 2-4 particles per keystroke
    const count = 2 + Math.floor(Math.random() * 3);

    for (let i = 0; i < count; i++) {
      const isGlyph = Math.random() > 0.4;
      const isDot = !isGlyph && Math.random() > 0.5;
      const type = isGlyph ? 'glyph' : isDot ? 'dot' : 'line';

      const particle: Particle = {
        // Spawn from random position along the bottom half
        x: 10 + Math.random() * (w - 20),
        y: h * 0.5 + Math.random() * (h * 0.4),
        vx: (Math.random() - 0.5) * 1.2,
        vy: -(0.6 + Math.random() * 1.4),
        life: 1.0,
        maxLife: 350 + Math.random() * 250, // 350-600ms
        size: type === 'glyph' ? (10 + Math.random() * 8) : (type === 'dot' ? (4 + Math.random() * 4) : 1),
        type,
        char: type === 'glyph'
          ? GLYPHS[Math.floor(Math.random() * GLYPHS.length)]
          : DOT_CHARS[Math.floor(Math.random() * DOT_CHARS.length)],
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.08,
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
      p.vy -= 0.008;
      p.rotation += p.rotSpeed;

      // Fade: quick in, slow out
      const fadeIn = p.life > 0.85 ? (1 - p.life) / 0.15 : 1;
      const fadeOut = p.life < 0.3 ? p.life / 0.3 : 1;
      const opacity = fadeIn * fadeOut * 0.30; // max 30%

      if (opacity <= 0.005) return true;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.globalAlpha = opacity;

      if (p.type === 'line') {
        // Small tactical line segment
        const len = 6 + Math.random() * 8;
        ctx.strokeStyle = `${p.color}1)`;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(-len / 2, 0);
        ctx.lineTo(len / 2, 0);
        ctx.stroke();
      } else {
        ctx.font = `${p.size}px 'IBM Plex Mono', monospace`;
        ctx.fillStyle = `${p.color}1)`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(p.char, 0, 0);
      }

      ctx.restore();
      return true;
    });

    animFrameRef.current = requestAnimationFrame(render);
  }, []);

  // Start animation loop when particles exist
  const startLoop = useCallback(() => {
    if (!isRunning.current) {
      isRunning.current = true;
      animFrameRef.current = requestAnimationFrame(render);
    }
  }, [render]);

  // Resize canvas
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

  // Spawn on every trigger change (every keystroke)
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
        borderRadius: 'inherit',
      }}
    />
  );
};
