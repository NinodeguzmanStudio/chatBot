// ═══════════════════════════════════════
// AIdark — Admin Dashboard v2
// src/components/modals/AdminDashboard.tsx
// NUEVO v2: Tab "Usuarios" con emails, plan, estado online
// ═══════════════════════════════════════

import React, { useState, useEffect } from 'react';
import { X, RefreshCw, Users, DollarSign, MessageSquare, Image, Wifi, TrendingUp, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useIsMobile } from '@/hooks/useIsMobile';

interface AdminDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ isOpen, onClose }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab]   = useState<'overview' | 'users' | 'messages' | 'topics' | 'payments'>('overview');
  const isMobile = useIsMobile();

  const fetchData = async () => {
    setLoading(true); setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { setError('Sesión expirada.'); setLoading(false); return; }

      const res = await fetch('/api/admin', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setError(err.error || `Error ${res.status}`);
        setLoading(false); return;
      }

      setData(await res.json());
    } catch {
      setError('Error de conexión.');
    }
    setLoading(false);
  };

  useEffect(() => { if (isOpen) fetchData(); }, [isOpen]);

  if (!isOpen) return null;

  const o = data?.overview || {};
  const r = data?.revenue || {};

  const StatCard = ({ icon, label, value, color = 'var(--txt-pri)', sub }: any) => (
    <div style={{
      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: 12, padding: '14px 16px', flex: 1, minWidth: 120,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        {icon}
        <span style={{ fontSize: 10, color: '#ffffff55', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</span>
      </div>
      <div style={{ fontSize: 24, fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: '#ffffff44', marginTop: 4 }}>{sub}</div>}
    </div>
  );

  const tabs = [
    { id: 'overview',  label: 'General' },
    { id: 'users',     label: 'Usuarios' },
    { id: 'messages',  label: 'Mensajes' },
    { id: 'topics',    label: 'Tendencias' },
    { id: 'payments',  label: 'Pagos' },
  ] as const;

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 300, padding: 12,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: 700, background: '#0a0a12',
        border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16,
        padding: isMobile ? '16px 12px' : '24px 20px',
        maxHeight: '92dvh', overflowY: 'auto',
        animation: 'fadeUp 0.3s ease',
      }}>
        <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}`}</style>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: 0 }}>
              🔒 Admin Dashboard
            </h2>
            <p style={{ fontSize: 10, color: '#ffffff44', margin: '4px 0 0' }}>
              {data?.generatedAt ? `Actualizado: ${new Date(data.generatedAt).toLocaleTimeString('es')}` : 'Cargando...'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={fetchData} disabled={loading} style={{
              width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8, color: '#ffffff88', cursor: 'pointer',
            }}>
              <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            </button>
            <button onClick={onClose} style={{
              width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8, color: '#ffffff88', cursor: 'pointer',
            }}>
              <X size={14} />
            </button>
          </div>
        </div>

        {error && (
          <div style={{ padding: '8px 12px', marginBottom: 12, borderRadius: 8, background: 'rgba(200,60,60,0.15)', color: '#ff6b6b', fontSize: 11 }}>
            {error}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 16, overflowX: 'auto' }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: '6px 14px', borderRadius: 8, border: 'none',
              background: tab === t.id ? 'rgba(139,115,85,0.2)' : 'rgba(255,255,255,0.03)',
              color: tab === t.id ? '#d4c5b0' : '#ffffff55',
              fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              whiteSpace: 'nowrap',
            }}>
              {t.label}
            </button>
          ))}
        </div>

        {loading && !data && (
          <div style={{ textAlign: 'center', padding: 40, color: '#ffffff44', fontSize: 12 }}>Cargando métricas...</div>
        )}

        {/* ── TAB: Overview ── */}
        {tab === 'overview' && data && (
          <>
            {/* Online + Active */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
              <StatCard icon={<Wifi size={13} color="#4ade80" />} label="Online ahora" value={o.onlineNow} color="#4ade80" sub="Últimos 15 min" />
              <StatCard icon={<Users size={13} color="#60a5fa" />} label="Activos hoy" value={o.activeToday} color="#60a5fa" />
              <StatCard icon={<Image size={13} color="#c084fc" />} label="Imágenes hoy" value={o.imagesToday} color="#c084fc" />
            </div>

            {/* Users */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
              <StatCard icon={<Users size={13} color="#8b7355" />} label="Total usuarios" value={o.totalUsers} />
              <StatCard icon={<TrendingUp size={13} color="#4ade80" />} label="Premium" value={o.premiumUsers} color="#f59e0b" sub={`${o.totalUsers ? Math.round(o.premiumUsers / o.totalUsers * 100) : 0}% conversión`} />
              <StatCard icon={<Users size={13} color="#666" />} label="Free" value={o.freeUsers} color="#666" />
              <StatCard icon={<TrendingUp size={13} color="#4ade80" />} label="Nuevos (7d)" value={o.newUsersWeek} color="#4ade80" />
            </div>

            {/* Revenue */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
              <StatCard icon={<DollarSign size={13} color="#f59e0b" />} label="Revenue total" value={`$${r.total}`} color="#f59e0b" sub={`${r.paymentsCount} pagos`} />
              <StatCard icon={<DollarSign size={13} color="#4ade80" />} label="Este mes" value={`$${r.thisMonth}`} color="#4ade80" />
            </div>

            {/* Plan breakdown */}
            {data.plans && (
              <div style={{
                background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 10, padding: 14, marginBottom: 12,
              }}>
                <div style={{ fontSize: 10, color: '#ffffff55', textTransform: 'uppercase', marginBottom: 10 }}>Distribución de planes</div>
                {Object.entries(data.plans).map(([plan, count]: [string, any]) => {
                  const total = o.totalUsers || 1;
                  const pct   = Math.round((count / total) * 100);
                  const colors: Record<string, string> = {
                    free: '#444', premium_monthly: '#e67e22', basic_monthly: '#e67e22',
                    premium_quarterly: '#2eaadc', pro_quarterly: '#2eaadc',
                    premium_annual: '#9b59b6', ultra_annual: '#9b59b6',
                  };
                  return (
                    <div key={plan} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: colors[plan] || '#555', flexShrink: 0 }} />
                      <span style={{ fontSize: 11, color: '#ffffffaa', flex: 1 }}>{plan}</span>
                      <span style={{ fontSize: 11, color: '#ffffff66', minWidth: 30, textAlign: 'right' }}>{count}</span>
                      <div style={{ width: 80, height: 4, background: '#ffffff0a', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: colors[plan] || '#555', borderRadius: 2 }} />
                      </div>
                      <span style={{ fontSize: 10, color: '#ffffff44', minWidth: 28, textAlign: 'right' }}>{pct}%</span>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ── TAB: Users (NUEVO) ── */}
        {tab === 'users' && data && (
          <div style={{
            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 10, padding: 14,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 10, color: '#ffffff55', textTransform: 'uppercase' }}>
                Usuarios activos hoy · {(data.activeUsers || []).length} total · {(data.activeUsers || []).filter((u: any) => u.is_online).length} online
              </div>
            </div>
            {(data.activeUsers || []).length === 0 && (
              <div style={{ fontSize: 11, color: '#ffffff33', padding: 16, textAlign: 'center' }}>Sin usuarios activos hoy</div>
            )}
            <div style={{ maxHeight: 400, overflowY: 'auto' }}>
              {(data.activeUsers || []).map((u: any, i: number) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 0',
                  borderBottom: i < data.activeUsers.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                      background: u.is_online ? '#4ade80' : '#555',
                      boxShadow: u.is_online ? '0 0 6px #4ade80' : 'none',
                    }} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{
                        fontSize: 12, color: u.is_online ? '#ffffffdd' : '#ffffff88',
                        fontWeight: u.is_online ? 600 : 400,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {u.email}
                      </div>
                      <div style={{ fontSize: 9, color: '#ffffff44', marginTop: 2 }}>
                        {u.is_online ? '🟢 Online ahora' : `Último acceso: ${new Date(u.last_active).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}`}
                        {' · '}{u.messages_used} msgs
                        {u.images_today > 0 && ` · ${u.images_today} imgs`}
                      </div>
                    </div>
                  </div>
                  <div style={{ flexShrink: 0, marginLeft: 8 }}>
                    <span style={{
                      fontSize: 9, padding: '3px 8px', borderRadius: 6, fontWeight: 600,
                      background: u.plan === 'free' ? 'rgba(100,100,100,0.2)' : 'rgba(245,158,11,0.15)',
                      color: u.plan === 'free' ? '#888' : '#f59e0b',
                      border: `1px solid ${u.plan === 'free' ? 'rgba(100,100,100,0.2)' : 'rgba(245,158,11,0.2)'}`,
                    }}>
                      {u.plan === 'free' ? 'FREE' : u.plan.replace('premium_', '').replace('basic_', '').replace('pro_', '').replace('ultra_', '').toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── TAB: Messages ── */}
        {tab === 'messages' && data && (
          <div style={{
            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 10, padding: 14,
          }}>
            <div style={{ fontSize: 10, color: '#ffffff55', textTransform: 'uppercase', marginBottom: 10 }}>
              Últimos mensajes de usuarios
            </div>
            {(data.recentMessages || []).length === 0 && (
              <div style={{ fontSize: 11, color: '#ffffff33', padding: 16, textAlign: 'center' }}>Sin mensajes recientes</div>
            )}
            {(data.recentMessages || []).map((msg: any, i: number) => (
              <div key={i} style={{
                padding: '8px 0', borderBottom: i < data.recentMessages.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
              }}>
                <div style={{ fontSize: 12, color: '#ffffffcc', lineHeight: 1.5, wordBreak: 'break-word' }}>
                  {msg.content}
                </div>
                <div style={{ fontSize: 9, color: '#ffffff33', marginTop: 4 }}>
                  {new Date(msg.created_at).toLocaleString('es')}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── TAB: Topics ── */}
        {tab === 'topics' && data && (
          <div style={{
            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 10, padding: 14,
          }}>
            <div style={{ fontSize: 10, color: '#ffffff55', textTransform: 'uppercase', marginBottom: 10 }}>
              Palabras más buscadas (últimos 50 mensajes)
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {(data.topics || []).map((t: any, i: number) => {
                const maxCount = data.topics[0]?.count || 1;
                const intensity = 0.3 + (t.count / maxCount) * 0.7;
                return (
                  <span key={i} style={{
                    padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 500,
                    background: `rgba(139,115,85,${intensity * 0.3})`,
                    color: `rgba(212,197,176,${intensity})`,
                    border: `1px solid rgba(139,115,85,${intensity * 0.3})`,
                  }}>
                    {t.word} <span style={{ fontSize: 9, opacity: 0.6 }}>×{t.count}</span>
                  </span>
                );
              })}
            </div>
            {(data.topics || []).length === 0 && (
              <div style={{ fontSize: 11, color: '#ffffff33', padding: 16, textAlign: 'center' }}>Sin datos suficientes</div>
            )}
          </div>
        )}

        {/* ── TAB: Payments ── */}
        {tab === 'payments' && data && (
          <div style={{
            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 10, padding: 14,
          }}>
            <div style={{ fontSize: 10, color: '#ffffff55', textTransform: 'uppercase', marginBottom: 10 }}>
              Últimos pagos
            </div>
            {(r.recentPayments || []).length === 0 && (
              <div style={{ fontSize: 11, color: '#ffffff33', padding: 16, textAlign: 'center' }}>Sin pagos registrados</div>
            )}
            {(r.recentPayments || []).map((p: any, i: number) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '8px 0',
                borderBottom: i < r.recentPayments.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
              }}>
                <div>
                  <div style={{ fontSize: 12, color: '#ffffffcc' }}>{p.email || 'Sin email'}</div>
                  <div style={{ fontSize: 9, color: '#ffffff44' }}>
                    {p.plan} · {new Date(p.created_at).toLocaleDateString('es')}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#4ade80' }}>
                    {p.currency} {p.amount}
                  </div>
                  {p.amount_usd && (
                    <div style={{ fontSize: 9, color: '#ffffff44' }}>≈ ${p.amount_usd} USD</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <p style={{ fontSize: 9, color: '#ffffff18' }}>
            AIdark Admin · Solo visible para administradores
          </p>
        </div>
      </div>
    </div>
  );
};
