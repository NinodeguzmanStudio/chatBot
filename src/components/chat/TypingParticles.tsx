// ═══════════════════════════════════════
// AIdark — Typing Particles Effect
// ═══════════════════════════════════════
// Subtle ambient particles on keystrokes
// Warm tones matching app aesthetic

import React, { useRef, useEffect, useCallback } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  char: string;
  color: string;
}

const CHARS = ['⬡', '◇', '⊡', '△', '⬢', '◈', '⟐', '⊞', '⟡', '⬘', '·', '∘', '⊕'];
const COLORS = [
  'rgba(139,115,85,',   // accent gold
  'rgba(160,81,59,',    // danger warm
  'rgba(90,74,58,',     // tertiary
  'rgba(61,51,40,',     // muted
  'rgba(160,137,106,',  // accent-hover
];

export const TypingParticles: React.FC<{ active: boolean }> = ({ active }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameRef = useRef<number>(0);
  const lastSpawnRef = useRef<number>(0);

  const spawnParticle = useCallback((canvasWidth: number, canvasHeight: number) => {
    const now = Date.now();
    if (now - lastSpawnRef.current < 60) return; // throttle
    lastSpawnRef.current = now;

    const count = 1 + Math.floor(Math.random() * 2);
    for (let i = 0; i < count; i++) {
      const particle: Particle = {
        x: 20 + Math.random() * (canvasWidth - 40),
        y: canvasHeight - 8 - Math.random() * 10,
        vx: (Math.random() - 0.5) * 0.8,
        vy: -(0.4 + Math.random() * 0.8),
        life: 1,
        maxLife: 300 + Math.random() * 200, // 300-500ms
        size: 8 + Math.random() * 6,
        char: CHARS[Math.floor(Math.random() * CHARS.length)],
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      };
      particlesRef.current.push(particle);
    }
  }, []);

  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const deltaMs = 16; // ~60fps
    particlesRef.current = particlesRef.current.filter((p) => {
      p.life -= deltaMs / p.maxLife;
      if (p.life <= 0) return false;

      p.x += p.vx;
      p.y += p.vy;
      p.vy -= 0.01; // slight float up acceleration

      const opacity = Math.min(p.life, 0.3) * (p.life > 0.7 ? (1 - p.life) / 0.3 : 1);
      ctx.font = `${p.size}px 'IBM Plex Mono', monospace`;
      ctx.fillStyle = `${p.color}${opacity.toFixed(2)})`;
      ctx.textAlign = 'center';
      ctx.fillText(p.char, p.x, p.y);

      return true;
    });

    animFrameRef.current = requestAnimationFrame(animate);
  }, []);

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

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      observer.disconnect();
    };
  }, [animate]);

  // Spawn particles when active (typing)
  useEffect(() => {
    if (active && canvasRef.current) {
      spawnParticle(canvasRef.current.width, canvasRef.current.height);
    }
  }, [active, spawnParticle]);

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
