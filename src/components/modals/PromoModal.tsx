// ═══════════════════════════════════════
// AIdark — Promo Modal (Paywall)
// src/components/modals/PromoModal.tsx
// MEJORAS:
//   [1] Mensaje claro de por qué se bloqueó (agotaste mensajes gratis)
//   [2] Comparación visual Free vs Premium
//   [3] Mantiene el descuento 50% del timer
//   [4] Botón "Ver todos los planes" por si quieren el anual
// ═══════════════════════════════════════

import React, { useState, useEffect } from 'react';
import { X, Loader2, Zap, Image, MessageSquare, Clock } from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { useIsMobile } from '@/hooks/useIsMobile';

const PROMO_START_KEY = 'aidark_promo_start';
const PROMO_DURATION  = 24 * 60 * 60 * 1000;

function getPromoRemaining(): { h: number; m: number; s: number; expired: boolean } {
  let start = localStorage.getItem(PROMO_START_KEY);
  if (!start) {
    start = String(Date.now());
    localStorage.setItem(PROMO_START_KEY, start);
  }
  const remaining = Math.max(0, PROMO_DURATION - (Date.now() - Number(start)));
  if (remaining <= 0) return { h: 0, m: 0, s: 0, expired: true };
  return {
    h: Math.floor(remaining / 3600000),
    m: Math.floor((remaining % 3600000) / 60000),
    s: Math.floor((remaining % 60000) / 1000),
    expired: false,
  };
}

const pad = (n: number) => String(n).padStart(2, '0');

// Solo mostramos los 2 planes más populares en el paywall
const PROMO_PLANS = [
  {
    id: 'basic_monthly_promo',
    name: 'Basic',
    before: '$12', after: '$6', period: '/mes',
    tag: 'Más accesible',
    color: '#e67e22',
    features: ['Mensajes ilimitados', 'Imágenes HD sin censura', 'Historial 90 días'],
  },
  {
    id: 'pro_quarterly_promo',
    name: 'Pro',
    before: '$29.99', after: '$15', period: '/3 meses',
    tag: '⭐ Más popular',
    color: '#2eaadc',
    popular: true,
    features: ['Todo Basic', 'Anime · Hentai · Manhwa', 'Velocidad prioritaria'],
  },
];

interface PromoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenPricing: () => void;
}

export const PromoModal: React.FC<PromoModalProps> = ({ isOpen, onClose, onOpenPricing }) => {
  const { user } = useAuthStore();
  const [countdown, setCountdown] = useState(getPromoRemaining());
  const [loading, setLoading]     = useState<string | null>(null);
  const [error, setError]         = useState('');
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!isOpen) return;
    const timer = setInterval(() => setCountdown(getPromoRemaining()), 1000);
    return () => clearInterval(timer);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && countdown.expired) { onClose(); onOpenPricing(); }
  }, [isOpen, countdown.expired]);

  const handleSubscribe = async (planId: string) => {
    if (!user) { setError('Necesitas una cuenta.'); return; }
    setLoading(planId);
    setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setError('Sesión expirada. Recargá la página.');
        setLoading(null);
        return;
      }
      const res = await fetch('/api/create-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ planId, userEmail: user.email, userId: user.id }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Error al crear el pago.'); setLoading(null); return; }
      if (data.init_point) window.location.href = data.init_point;
      else setError(data.error || 'Error al crear pago.');
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
    }
    setLoading(null);
  };

  if (!isOpen || countdown.expired) return null;

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 300,
      background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 14,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: 480,
        background: '#0c0b0a', borderRadius: 20, border: '1px solid #222',
        position: 'relative', overflow: 'hidden',
        maxHeight: '96vh', overflowY: 'auto',
        animation: 'promoIn 0.4s cubic-bezier(0.16,1,0.3,1)',
        boxShadow: '0 0 60px rgba(139,115,85,0.12)',
      }}>

        {/* Línea superior decorativa */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 2,
          background: 'linear-gradient(90deg, transparent, #8b7355, transparent)',
        }} />

        <div style={{ padding: isMobile ? '22px 16px 20px' : '26px 22px 22px', position: 'relative' }}>

          <button onClick={onClose} style={{
            position: 'absolute', top: 14, right: 14, width: 30, height: 30,
            borderRadius: 8, background: '#141414', border: '1px solid #222',
            color: '#555', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <X size={13} />
          </button>

          {/* Header — mensaje de bloqueo */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: '#8b7355', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>
              Mensajes agotados
            </div>
            <h2 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 800, color: '#fff', margin: '0 0 8px', letterSpacing: -0.5 }}>
              Continuá sin límites
            </h2>
            <p style={{ fontSize: 12, color: '#666', margin: 0, lineHeight: 1.6 }}>
              Usaste todos tus mensajes gratuitos de hoy. Con Premium, chateás sin parar y generás imágenes sin censura.
            </p>
          </div>

          {/* Comparación Free vs Premium */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20,
          }}>
            {[
              { label: 'Gratis', items: [
                { icon: <MessageSquare size={11} />, text: '12 mensajes/día', muted: true },
                { icon: <Image size={11} />, text: 'Sin imágenes', muted: true },
                { icon: <Clock size={11} />, text: 'Historial 7 días', muted: true },
              ]},
              { label: 'Premium', highlight: true, items: [
                { icon: <MessageSquare size={11} />, text: 'Mensajes ilimitados' },
                { icon: <Image size={11} />, text: 'Imágenes HD sin censura' },
                { icon: <Zap size={11} />, text: 'Todos los personajes' },
              ]},
            ].map((col, ci) => (
              <div key={ci} style={{
                borderRadius: 10, padding: '12px',
                background: col.highlight ? 'rgba(139,115,85,0.06)' : '#0e0e0e',
                border: `1px solid ${col.highlight ? '#8b735533' : '#1a1a1a'}`,
              }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: col.highlight ? '#8b7355' : '#444', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
                  {col.label}
                </div>
                {col.items.map((item, ii) => (
                  <div key={ii} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <span style={{ color: (item as any).muted ? '#333' : '#8b7355', flexShrink: 0 }}>{item.icon}</span>
                    <span style={{ fontSize: 11, color: (item as any).muted ? '#444' : '#aaa', lineHeight: 1.4 }}>{item.text}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Timer de oferta */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 14px', borderRadius: 10,
            background: '#080808', border: '1px solid #1a1a1a', marginBottom: 16,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#8b7355', animation: 'promoPulse 2s ease infinite' }} />
              <span style={{ fontSize: 11, color: '#666' }}>Oferta <strong style={{ color: '#8b7355' }}>50% OFF</strong> termina en</span>
            </div>
            <div style={{ display: 'flex', gap: 2 }}>
              {[pad(countdown.h), pad(countdown.m), pad(countdown.s)].map((val, i) => (
                <React.Fragment key={i}>
                  <span style={{ fontSize: 15, fontWeight: 800, color: '#d4c5b0', fontFamily: 'monospace' }}>{val}</span>
                  {i < 2 && <span style={{ fontSize: 14, color: '#8b735566', margin: '0 1px' }}>:</span>}
                </React.Fragment>
              ))}
            </div>
          </div>

          {error && (
            <div style={{ padding: '8px 12px', marginBottom: 12, borderRadius: 8, background: 'rgba(200,60,60,0.15)', color: '#ff6b6b', fontSize: 11 }}>
              {error}
            </div>
          )}

          {/* Planes */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
            {PROMO_PLANS.map(plan => (
              <div key={plan.id} style={{
                flex: 1, minWidth: isMobile ? '100%' : 0,
                borderRadius: 12, padding: '14px',
                background: plan.popular ? `${plan.color}08` : '#0e0e0e',
                border: `1px solid ${plan.popular ? `${plan.color}33` : '#222'}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <div style={{ fontSize: 10, color: plan.popular ? plan.color : '#555', fontWeight: 700, marginBottom: 2 }}>{plan.tag}</div>
                    <div style={{ fontSize: 11, color: '#888' }}>{plan.name}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 11, color: '#333', textDecoration: 'line-through' }}>{plan.before}</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: plan.popular ? plan.color : '#fff', letterSpacing: -0.5 }}>
                      {plan.after}<span style={{ fontSize: 11, fontWeight: 400, color: '#555' }}>{plan.period}</span>
                    </div>
                  </div>
                </div>

                {plan.features.map((f, i) => (
                  <div key={i} style={{ fontSize: 10, color: '#666', display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                    <svg width="8" height="8" viewBox="0 0 16 16" fill="none">
                      <path d="M3 8l3.5 3.5L13 5" stroke={plan.popular ? plan.color : '#444'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {f}
                  </div>
                ))}

                <button onClick={() => handleSubscribe(plan.id)} disabled={!!loading} style={{
                  width: '100%', marginTop: 12, padding: '10px 0', borderRadius: 8,
                  border: plan.popular ? 'none' : '1px solid #333',
                  background: plan.popular ? `linear-gradient(135deg, ${plan.color}, ${plan.color}bb)` : 'transparent',
                  color: plan.popular ? '#fff' : '#777',
                  fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  boxShadow: plan.popular ? `0 4px 16px ${plan.color}33` : 'none',
                  opacity: loading && loading !== plan.id ? 0.5 : 1,
                }}>
                  {loading === plan.id && <Loader2 size={12} style={{ animation: 'promoSpin 1s linear infinite' }} />}
                  Elegir {plan.name}
                </button>
              </div>
            ))}
          </div>

          {/* Link a todos los planes */}
          <button onClick={() => { onClose(); onOpenPricing(); }} style={{
            width: '100%', padding: '10px', borderRadius: 8,
            border: '1px solid #1a1a1a', background: 'transparent',
            color: '#555', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
          }}>
            Ver todos los planes →
          </button>

          <p style={{ textAlign: 'center', fontSize: 10, color: '#2a2a2a', margin: '12px 0 0' }}>
            Pago seguro vía MercadoPago · Cancela cuando quieras
          </p>
        </div>

        <style>{`
          @keyframes promoIn { from{opacity:0;transform:scale(0.94) translateY(16px)} to{opacity:1;transform:scale(1) translateY(0)} }
          @keyframes promoPulse { 0%,100%{opacity:1} 50%{opacity:.4} }
          @keyframes promoSpin { to{transform:rotate(360deg)} }
        `}</style>
      </div>
    </div>
  );
};
