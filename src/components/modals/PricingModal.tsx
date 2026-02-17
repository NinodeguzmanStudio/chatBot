import React, { useState } from 'react';
import { X, Zap, Crown, Rocket, Check, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { getLang } from '@/lib/i18n';

const labels = {
  es: {
    title: 'Desbloquea AIdark',
    subtitle: 'Sin límites. Sin censura. Sin filtros.',
    monthly: 'Mensual',
    quarterly: 'Trimestral',
    annual: 'Anual',
    month: '/mes',
    quarter: '/3 meses',
    year: '/año',
    save: 'Ahorra',
    popular: 'MÁS POPULAR',
    best: 'MEJOR PRECIO',
    btn_activate: 'Activar',
    btn_current: 'Plan actual',
    btn_free: 'Plan actual',
    features_free: ['5 mensajes por día', 'Modelo base', 'Historial 7 días'],
    features_paid: ['Mensajes ilimitados', 'Modelos avanzados', 'Historial 7 días', 'Sin publicidad', 'Soporte prioritario'],
    free_title: 'Free',
    free_price: 'Gratis',
    login_first: 'Inicia sesión para suscribirte',
    error_generic: 'Error al procesar. Intenta de nuevo.',
    secure: 'Pago seguro · Cancela cuando quieras',
    equiv: 'equiv.',
  },
  pt: {
    title: 'Desbloqueie AIdark',
    subtitle: 'Sem limites. Sem censura. Sem filtros.',
    monthly: 'Mensal',
    quarterly: 'Trimestral',
    annual: 'Anual',
    month: '/mês',
    quarter: '/3 meses',
    year: '/ano',
    save: 'Economize',
    popular: 'MAIS POPULAR',
    best: 'MELHOR PREÇO',
    btn_activate: 'Ativar',
    btn_current: 'Plano atual',
    btn_free: 'Plano atual',
    features_free: ['5 mensagens por dia', 'Modelo base', 'Histórico 7 dias'],
    features_paid: ['Mensagens ilimitadas', 'Modelos avançados', 'Histórico 7 dias', 'Sem publicidade', 'Suporte prioritário'],
    free_title: 'Free',
    free_price: 'Grátis',
    login_first: 'Faça login para assinar',
    error_generic: 'Erro ao processar. Tente novamente.',
    secure: 'Pagamento seguro · Cancele quando quiser',
    equiv: 'equiv.',
  },
  en: {
    title: 'Unlock AIdark',
    subtitle: 'No limits. No censorship. No filters.',
    monthly: 'Monthly',
    quarterly: 'Quarterly',
    annual: 'Annual',
    month: '/mo',
    quarter: '/3 mo',
    year: '/yr',
    save: 'Save',
    popular: 'MOST POPULAR',
    best: 'BEST VALUE',
    btn_activate: 'Activate',
    btn_current: 'Current plan',
    btn_free: 'Current plan',
    features_free: ['5 messages per day', 'Base model', '7-day history'],
    features_paid: ['Unlimited messages', 'Advanced models', '7-day history', 'No ads', 'Priority support'],
    free_title: 'Free',
    free_price: 'Free',
    login_first: 'Log in to subscribe',
    error_generic: 'Error processing. Try again.',
    secure: 'Secure payment · Cancel anytime',
    equiv: 'equiv.',
  },
};

const plans = [
  { id: 'basic_monthly', price: 12, period: 'month' as const, icon: Zap, badge: null, equivMonth: 12 },
  { id: 'pro_quarterly', price: 29.99, period: 'quarter' as const, icon: Crown, badge: 'popular', equivMonth: 10, save: 17 },
  { id: 'ultra_annual', price: 99.99, period: 'year' as const, icon: Rocket, badge: 'best', equivMonth: 8.33, save: 30 },
];

export const PricingModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const { user } = useAuthStore();
  const lang = getLang();
  const t = labels[lang];
  const isPremium = user?.plan && user.plan !== 'free';

  const handleSubscribe = async (planId: string) => {
    if (!user) { setError(t.login_first); return; }
    setLoading(planId); setError('');

    try {
      const res = await fetch('/api/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, userEmail: user.email, userId: user.id }),
      });
      const data = await res.json();
      if (data.init_point) {
        window.location.href = data.init_point;
      } else {
        setError(data.error || t.error_generic);
      }
    } catch {
      setError(t.error_generic);
    } finally {
      setLoading(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 720, maxHeight: '90vh', overflow: 'auto', background: 'var(--bg-surface)', border: '1px solid var(--border-def)', borderRadius: 16, padding: '28px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--txt-pri)', marginBottom: 4 }}>{t.title}</h2>
            <p style={{ fontSize: 12, color: 'var(--txt-mut)' }}>{t.subtitle}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--txt-mut)', cursor: 'pointer', padding: 4 }}><X size={18} /></button>
        </div>

        {error && (
          <div style={{ padding: '10px 14px', marginBottom: 16, borderRadius: 8, background: 'rgba(160,81,59,0.1)', border: '1px solid rgba(160,81,59,0.2)', color: 'var(--danger)', fontSize: 12 }}>{error}</div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
          {/* Free Plan */}
          <div style={{
            padding: '20px 18px', borderRadius: 14,
            border: '1px solid var(--border-sub)', background: 'var(--bg-primary)',
            display: 'flex', flexDirection: 'column', gap: 14,
            opacity: isPremium ? 0.5 : 1,
          }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt-sec)', marginBottom: 8 }}>{t.free_title}</p>
              <p style={{ fontSize: 28, fontWeight: 700, color: 'var(--txt-pri)' }}>{t.free_price}</p>
            </div>
            <div style={{ flex: 1 }}>
              {t.features_free.map((f, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <Check size={13} color="var(--txt-mut)" />
                  <span style={{ fontSize: 12, color: 'var(--txt-mut)' }}>{f}</span>
                </div>
              ))}
            </div>
            <button disabled style={{
              width: '100%', padding: '10px', borderRadius: 8,
              background: 'var(--bg-el)', border: '1px solid var(--border-sub)',
              color: 'var(--txt-mut)', fontSize: 12, fontWeight: 500, cursor: 'default', fontFamily: 'inherit',
            }}>{t.btn_free}</button>
          </div>

          {/* Paid Plans */}
          {plans.map((plan) => {
            const Icon = plan.icon;
            const isPopular = plan.badge === 'popular';
            const isBest = plan.badge === 'best';
            const periodLabel = plan.period === 'month' ? t.month : plan.period === 'quarter' ? t.quarter : t.year;
            const badgeLabel = isPopular ? t.popular : isBest ? t.best : null;

            return (
              <div key={plan.id} style={{
                padding: '20px 18px', borderRadius: 14, position: 'relative',
                border: isPopular ? '2px solid var(--accent)' : '1px solid var(--border-sub)',
                background: isPopular ? 'rgba(160,120,80,0.05)' : 'var(--bg-primary)',
                display: 'flex', flexDirection: 'column', gap: 14,
                transform: isPopular ? 'scale(1.02)' : 'none',
              }}>
                {badgeLabel && (
                  <div style={{
                    position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)',
                    padding: '3px 12px', borderRadius: 20, fontSize: 9, fontWeight: 700,
                    background: isPopular ? 'var(--accent)' : 'var(--txt-ghost)',
                    color: '#fff', letterSpacing: 1,
                  }}>{badgeLabel}</div>
                )}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <Icon size={15} color="var(--accent)" />
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt-sec)' }}>
                      {plan.period === 'month' ? t.monthly : plan.period === 'quarter' ? t.quarterly : t.annual}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                    <span style={{ fontSize: 28, fontWeight: 700, color: 'var(--txt-pri)' }}>${plan.price}</span>
                    <span style={{ fontSize: 12, color: 'var(--txt-mut)' }}>{periodLabel}</span>
                  </div>
                  {plan.save && (
                    <p style={{ fontSize: 10, color: 'var(--accent)', marginTop: 4, fontWeight: 600 }}>
                      {t.save} {plan.save}% — {t.equiv} ${plan.equivMonth.toFixed(2)}{t.month}
                    </p>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  {t.features_paid.map((f, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <Check size={13} color="var(--accent)" />
                      <span style={{ fontSize: 12, color: 'var(--txt-sec)' }}>{f}</span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={loading !== null || isPremium}
                  style={{
                    width: '100%', padding: '11px', borderRadius: 8,
                    background: isPremium ? 'var(--bg-el)' : isPopular ? 'var(--accent)' : 'var(--bg-el)',
                    border: isPremium ? '1px solid var(--border-sub)' : isPopular ? 'none' : '1px solid var(--border-def)',
                    color: isPremium ? 'var(--txt-mut)' : isPopular ? '#fff' : 'var(--txt-pri)',
                    fontSize: 13, fontWeight: 600, cursor: isPremium ? 'default' : 'pointer',
                    fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    transition: 'all 0.15s',
                  }}
                >
                  {loading === plan.id && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
                  {isPremium ? t.btn_current : t.btn_activate}
                </button>
              </div>
            );
          })}
        </div>

        <p style={{ fontSize: 10, color: 'var(--txt-ghost)', textAlign: 'center', marginTop: 20 }}>
          🔒 {t.secure}
        </p>
      </div>
    </div>
  );
};
