// ═══════════════════════════════════════
// AIdark — Admin Dashboard v4
// src/components/modals/AdminDashboard.tsx
// NUEVO v4: Watchlist + Live monitoring + Reply as AIdark
// ═══════════════════════════════════════

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, RefreshCw, Users, DollarSign, MessageSquare, Image, Wifi, TrendingUp, Clock, Search, Eye, EyeOff, Send } from 'lucide-react';
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
  const [tab, setTab]   = useState<'overview' | 'users' | 'live' | 'chat_logs' | 'messages' | 'topics' | 'payments'>('overview');
  const isMobile = useIsMobile();

  // Chat Logs state
  const [searchEmail, setSearchEmail] = useState('');
  const [chatLogs, setChatLogs] = useState<any>(null);
  const [chatLogsLoading, setChatLogsLoading] = useState(false);
  const [chatLogsError, setChatLogsError] = useState('');
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  // Reply as AIdark
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  // Live monitoring state
  const [watchlist, setWatchlist] = useState<any[]>([]);
  const [liveFeed, setLiveFeed] = useState<any[]>([]);
  const [watchEmail, setWatchEmail] = useState('');
  const [watchLoading, setWatchLoading] = useState(false);
  const liveFeedRef = useRef<any[]>([]);
  const realtimeChannelRef = useRef<any>(null);

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

  // NEW v3: Buscar chat logs por email
  const fetchChatLogs = async () => {
    if (!searchEmail.trim()) return;
    setChatLogsLoading(true); setChatLogsError(''); setChatLogs(null); setExpandedSession(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { setChatLogsError('Sesión expirada.'); setChatLogsLoading(false); return; }

      const res = await fetch(`/api/admin?action=chat_logs&email=${encodeURIComponent(searchEmail.trim())}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setChatLogsError(err.error || `Error ${res.status}`);
        setChatLogsLoading(false); return;
      }

      setChatLogs(await res.json());
    } catch {
      setChatLogsError('Error de conexión.');
    }
    setChatLogsLoading(false);
  };

  // NEW v4: Inyectar mensaje como AIdark
  const injectMessage = async (sessionId: string, userId: string) => {
    if (!replyText.trim()) return;
    setSendingReply(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { setChatLogsError('Sesión expirada.'); setSendingReply(false); return; }

      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'inject_message',
          session_id: sessionId,
          user_id: userId,
          content: replyText.trim(),
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setChatLogsError(err.error || 'Error enviando mensaje.');
        setSendingReply(false); return;
      }

      setReplyText('');
      // Recargar los logs para ver el mensaje inyectado
      fetchChatLogs();
    } catch {
      setChatLogsError('Error de conexión.');
    }
    setSendingReply(false);
  };

  // ═══════════════════════════════════════
  // Watchlist management
  // ═══════════════════════════════════════
  const fetchWatchlist = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_watchlist' }),
      });
      if (res.ok) {
        const d = await res.json();
        setWatchlist(d.watchlist || []);
      }
    } catch { /* silenciar */ }
  }, []);

  const addToWatchlist = async (email: string) => {
    setWatchLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      await fetch('/api/admin', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add_watchlist', email }),
      });
      setWatchEmail('');
      fetchWatchlist();
    } catch { /* silenciar */ }
    setWatchLoading(false);
  };

  const removeFromWatchlist = async (email: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      await fetch('/api/admin', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove_watchlist', email }),
      });
      fetchWatchlist();
    } catch { /* silenciar */ }
  };

  // ═══════════════════════════════════════
  // Supabase Realtime — escuchar nuevos mensajes en vivo
  // ═══════════════════════════════════════
  useEffect(() => {
    if (!isOpen) return;

    fetchWatchlist();

    // Suscribirse a INSERTs en message_logs
    const channel = supabase
      .channel('admin-live-feed')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'message_logs' },
        async (payload: any) => {
          const msg = payload.new;
          if (!msg) return;

          // Buscar email del usuario
          let email = '?';
          if (msg.user_id) {
            const { data: p } = await supabase
              .from('profiles')
              .select('email')
              .eq('id', msg.user_id)
              .single();
            email = p?.email || '?';
          }

          const newEntry = {
            id: msg.id,
            email,
            user_id: msg.user_id,
            role: msg.role,
            content: msg.content || '',
            character: msg.character,
            created_at: msg.created_at || new Date().toISOString(),
            is_admin_inject: msg.is_admin_inject,
          };

          // Agregar al feed (máx 50 entries)
          liveFeedRef.current = [newEntry, ...liveFeedRef.current].slice(0, 50);
          setLiveFeed([...liveFeedRef.current]);

          // Browser notification si es un user de la watchlist
          if (msg.role === 'user' && 'Notification' in window && Notification.permission === 'granted') {
            const isWatched = watchlist.some(w => w.user_id === msg.user_id);
            if (isWatched) {
              new Notification(`👁️ ${email}`, {
                body: msg.content?.slice(0, 100),
                icon: '/icon-192.png',
                tag: 'admin-watch-' + msg.user_id,
              });
            }
          }
        }
      )
      .subscribe();

    realtimeChannelRef.current = channel;

    // Pedir permiso de notificaciones
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => {
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current);
        realtimeChannelRef.current = null;
      }
    };
  }, [isOpen, fetchWatchlist]);

  if (!isOpen) return null;

  const o = data?.overview || {};
  const r = data?.revenue || {};
  const funnel = data?.funnel || {};

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
    { id: 'live',      label: '🔴 Live' },
    { id: 'chat_logs', label: 'Chat Logs' },
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

            {!!funnel.periodDays && (
              <div style={{
                background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 10, padding: 14, marginBottom: 12,
              }}>
                <div style={{ fontSize: 10, color: '#ffffff55', textTransform: 'uppercase', marginBottom: 10 }}>
                  Embudo producto · últimos {funnel.periodDays} días
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3, 1fr)', gap: 8 }}>
                  {[
                    { label: 'Landing', value: funnel.landingUsers || 0, color: '#d4c5b0' },
                    { label: 'Auth', value: funnel.authUsers || 0, color: '#60a5fa' },
                    { label: '1er mensaje', value: funnel.activatedUsers || 0, color: '#4ade80' },
                    { label: '5 mensajes', value: funnel.engagedUsers || 0, color: '#c084fc' },
                    { label: 'Vio paywall', value: funnel.paywallUsers || 0, color: '#f59e0b' },
                    { label: 'Tocó límite', value: funnel.limitUsers || 0, color: '#ef4444' },
                  ].map((item) => (
                    <div key={item.label} style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.05)',
                      borderRadius: 8,
                      padding: '10px 12px',
                    }}>
                      <div style={{ fontSize: 10, color: '#ffffff55', marginBottom: 6 }}>{item.label}</div>
                      <div style={{ fontSize: 22, fontWeight: 700, color: item.color }}>{item.value}</div>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 10, color: '#ffffff33', marginTop: 10, lineHeight: 1.6 }}>
                  Conversión landing→auth: {funnel.landingUsers ? Math.round((funnel.authUsers || 0) / funnel.landingUsers * 100) : 0}% ·
                  auth→1er mensaje: {funnel.authUsers ? Math.round((funnel.activatedUsers || 0) / funnel.authUsers * 100) : 0}% ·
                  1er→5 mensajes: {funnel.activatedUsers ? Math.round((funnel.engagedUsers || 0) / funnel.activatedUsers * 100) : 0}%
                </div>
              </div>
            )}

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
                  <div style={{ flexShrink: 0, marginLeft: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); addToWatchlist(u.email); }}
                      title="Vigilar usuario"
                      style={{
                        width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: watchlist.some(w => w.email === u.email) ? 'rgba(168,85,247,0.2)' : 'rgba(255,255,255,0.05)',
                        border: `1px solid ${watchlist.some(w => w.email === u.email) ? 'rgba(168,85,247,0.3)' : 'rgba(255,255,255,0.1)'}`,
                        borderRadius: 6, cursor: 'pointer', color: watchlist.some(w => w.email === u.email) ? '#a855f7' : '#ffffff44',
                      }}
                    >
                      <Eye size={10} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setSearchEmail(u.email); setTab('chat_logs'); fetchChatLogs(); }}
                      title="Ver chat logs"
                      style={{
                        width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 6, cursor: 'pointer', color: '#ffffff44',
                      }}
                    >
                      <MessageSquare size={10} />
                    </button>
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

        {/* ── TAB: Live Monitoring ── */}
        {tab === 'live' && (
          <div style={{
            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 10, padding: 14,
          }}>
            {/* Watchlist management */}
            <div style={{ fontSize: 10, color: '#ffffff55', textTransform: 'uppercase', marginBottom: 10 }}>
              👁️ Watchlist — Usuarios vigilados
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <input
                type="email"
                value={watchEmail}
                onChange={e => setWatchEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addToWatchlist(watchEmail)}
                placeholder="Agregar email a watchlist..."
                style={{
                  flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(168,85,247,0.2)',
                  background: 'rgba(168,85,247,0.05)', color: '#fff', fontSize: 12, fontFamily: 'inherit',
                  outline: 'none',
                }}
              />
              <button onClick={() => addToWatchlist(watchEmail)} disabled={watchLoading || !watchEmail.trim()} style={{
                padding: '8px 14px', borderRadius: 8, border: 'none',
                background: 'rgba(168,85,247,0.3)', color: '#c4b5fd', fontSize: 11, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6,
                opacity: watchLoading || !watchEmail.trim() ? 0.4 : 1,
              }}>
                <Eye size={12} /> Vigilar
              </button>
            </div>

            {/* Watchlist entries */}
            {watchlist.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                {watchlist.map((w: any, i: number) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 10px', marginBottom: 4, borderRadius: 6,
                    background: 'rgba(168,85,247,0.05)', border: '1px solid rgba(168,85,247,0.1)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                      <div style={{
                        width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                        background: w.is_online ? '#4ade80' : '#555',
                        boxShadow: w.is_online ? '0 0 8px #4ade80' : 'none',
                      }} />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: 11, color: '#ffffffcc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {w.email}
                        </div>
                        <div style={{ fontSize: 9, color: '#ffffff44' }}>
                          {w.is_online ? '🟢 Online ahora' : w.last_seen ? `Último: ${new Date(w.last_seen).toLocaleString('es')}` : 'Nunca visto'}
                          {' · '}{w.plan} · {w.messages_used} msgs
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button
                        onClick={() => { setSearchEmail(w.email); setTab('chat_logs'); }}
                        style={{
                          padding: '4px 8px', borderRadius: 4, border: 'none',
                          background: 'rgba(139,115,85,0.2)', color: '#d4c5b0', fontSize: 9, cursor: 'pointer', fontFamily: 'inherit',
                        }}
                      >
                        Chat Logs
                      </button>
                      <button
                        onClick={() => removeFromWatchlist(w.email)}
                        style={{
                          padding: '4px 8px', borderRadius: 4, border: 'none',
                          background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontSize: 9, cursor: 'pointer', fontFamily: 'inherit',
                        }}
                      >
                        <EyeOff size={10} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {watchlist.length === 0 && (
              <div style={{ fontSize: 11, color: '#ffffff33', padding: 12, textAlign: 'center', marginBottom: 12 }}>
                Sin usuarios vigilados. Agrega un email arriba o usa el botón 👁️ en la pestaña Usuarios.
              </div>
            )}

            {/* Live feed */}
            <div style={{ fontSize: 10, color: '#ffffff55', textTransform: 'uppercase', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444', animation: 'pulse 2s infinite' }} />
              Feed en tiempo real
              <span style={{ fontSize: 9, color: '#ffffff33', fontWeight: 400, textTransform: 'none' }}>({liveFeed.length} mensajes)</span>
            </div>

            <div style={{ maxHeight: 350, overflowY: 'auto' }}>
              {liveFeed.length === 0 && (
                <div style={{ fontSize: 11, color: '#ffffff33', padding: 20, textAlign: 'center' }}>
                  Esperando actividad... Los mensajes aparecerán aquí en tiempo real.
                </div>
              )}
              {liveFeed.map((entry: any) => (
                <div key={entry.id} style={{
                  padding: '8px 10px', marginBottom: 4, borderRadius: 6,
                  background: entry.role === 'user' ? 'rgba(59,130,246,0.08)' : 'rgba(139,115,85,0.08)',
                  borderLeft: `3px solid ${entry.role === 'user' ? '#3b82f6' : entry.is_admin_inject ? '#a855f7' : '#8b7355'}`,
                  animation: 'fadeUp 0.3s ease',
                }}>
                  <div style={{ fontSize: 9, marginBottom: 3, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{
                      fontWeight: 600, textTransform: 'uppercase',
                      color: entry.role === 'user' ? '#60a5fa' : entry.is_admin_inject ? '#a855f7' : '#d4c5b0',
                    }}>
                      {entry.role === 'user' ? '👤' : entry.is_admin_inject ? '👑' : '🤖'}
                    </span>
                    <span style={{ color: '#ffffffaa', fontWeight: 500 }}>{entry.email}</span>
                    <span style={{ color: '#ffffff33' }}>
                      {new Date(entry.created_at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                    {watchlist.some(w => w.user_id === entry.user_id) && (
                      <span style={{ fontSize: 8, padding: '1px 5px', borderRadius: 3, background: 'rgba(168,85,247,0.2)', color: '#a855f7' }}>
                        VIGILADO
                      </span>
                    )}
                  </div>
                  <div style={{
                    fontSize: 11,
                    color: '#ffffffbb',
                    lineHeight: 1.5,
                    wordBreak: 'break-word',
                    whiteSpace: 'pre-wrap',
                    maxHeight: 160,
                    overflowY: 'auto',
                  }}>
                    {entry.content}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── TAB: Chat Logs (v4) ── */}
        {tab === 'chat_logs' && (
          <div style={{
            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 10, padding: 14,
          }}>
            <div style={{ fontSize: 10, color: '#ffffff55', textTransform: 'uppercase', marginBottom: 10 }}>
              Buscar conversaciones por email (incluye borradas)
            </div>

            {/* Search bar */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <input
                type="email"
                value={searchEmail}
                onChange={e => setSearchEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && fetchChatLogs()}
                placeholder="correo@ejemplo.com"
                style={{
                  flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 12, fontFamily: 'inherit',
                  outline: 'none',
                }}
              />
              <button onClick={fetchChatLogs} disabled={chatLogsLoading || !searchEmail.trim()} style={{
                padding: '8px 16px', borderRadius: 8, border: 'none',
                background: 'rgba(139,115,85,0.3)', color: '#d4c5b0', fontSize: 11, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6,
                opacity: chatLogsLoading || !searchEmail.trim() ? 0.4 : 1,
              }}>
                <Search size={12} /> Buscar
              </button>
            </div>

            {chatLogsError && (
              <div style={{ padding: '8px 12px', marginBottom: 12, borderRadius: 8, background: 'rgba(200,60,60,0.15)', color: '#ff6b6b', fontSize: 11 }}>
                {chatLogsError}
              </div>
            )}

            {chatLogsLoading && (
              <div style={{ textAlign: 'center', padding: 20, color: '#ffffff44', fontSize: 11 }}>Buscando...</div>
            )}

            {/* User info */}
            {chatLogs?.user && (
              <div style={{
                padding: '10px 12px', marginBottom: 12, borderRadius: 8,
                background: 'rgba(139,115,85,0.1)', border: '1px solid rgba(139,115,85,0.2)',
              }}>
                <div style={{ fontSize: 12, color: '#d4c5b0', fontWeight: 600 }}>{chatLogs.user.email}</div>
                <div style={{ fontSize: 10, color: '#ffffff55', marginTop: 4 }}>
                  Plan: {chatLogs.user.plan} · Mensajes: {chatLogs.user.messages_used} · Registro: {new Date(chatLogs.user.registered).toLocaleDateString('es')}
                </div>
              </div>
            )}

            {/* Sessions list */}
            {chatLogs?.sessions?.length === 0 && (
              <div style={{ fontSize: 11, color: '#ffffff33', padding: 16, textAlign: 'center' }}>Este usuario no tiene conversaciones guardadas</div>
            )}

            <div style={{ maxHeight: 500, overflowY: 'auto' }}>
              {(chatLogs?.sessions || []).map((session: any) => (
                <div key={session.id} style={{
                  marginBottom: 8, borderRadius: 8,
                  border: `1px solid ${session.deleted ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.06)'}`,
                  overflow: 'hidden',
                }}>
                  {/* Session header - clickable */}
                  <div
                    onClick={() => setExpandedSession(expandedSession === session.id ? null : session.id)}
                    style={{
                      padding: '10px 12px', cursor: 'pointer',
                      background: expandedSession === session.id ? 'rgba(139,115,85,0.15)' : 'rgba(255,255,255,0.03)',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, color: '#ffffffcc', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                        {session.title}
                        {session.deleted && (
                          <span style={{ fontSize: 8, padding: '2px 6px', borderRadius: 4, background: 'rgba(239,68,68,0.2)', color: '#ef4444' }}>
                            BORRADA
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 9, color: '#ffffff44', marginTop: 2 }}>
                        {new Date(session.created_at).toLocaleString('es')} · {session.messages.length} msgs · {session.model || 'default'}
                      </div>
                    </div>
                    <span style={{ fontSize: 10, color: '#ffffff44' }}>
                      {expandedSession === session.id ? '▼' : '▶'}
                    </span>
                  </div>

                  {/* Messages - expanded */}
                  {expandedSession === session.id && (
                    <div style={{ background: 'rgba(0,0,0,0.2)' }}>
                      <div style={{ padding: '8px 12px', maxHeight: 400, overflowY: 'auto' }}>
                        {session.messages.map((msg: any, i: number) => (
                          <div key={i} style={{
                            padding: '8px 10px', marginBottom: 6, borderRadius: 6,
                            background: msg.role === 'user'
                              ? 'rgba(59,130,246,0.1)'
                              : msg.admin_inject
                                ? 'rgba(168,85,247,0.1)'
                                : 'rgba(139,115,85,0.1)',
                            borderLeft: `3px solid ${
                              msg.role === 'user' ? '#3b82f6'
                              : msg.admin_inject ? '#a855f7'
                              : '#8b7355'
                            }`,
                            opacity: msg.deleted ? 0.5 : 1,
                          }}>
                            <div style={{ fontSize: 9, fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6,
                              color: msg.role === 'user' ? '#60a5fa' : msg.admin_inject ? '#a855f7' : '#d4c5b0',
                            }}>
                              {msg.role === 'user' ? '👤 Usuario' : msg.admin_inject ? '👑 Admin' : '🤖 AIdark'}
                              {msg.character && msg.character !== 'default' ? ` (${msg.character})` : ''}
                              <span style={{ fontWeight: 400, textTransform: 'none' }}>
                                {new Date(msg.created_at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              {msg.deleted && (
                                <span style={{ fontSize: 8, padding: '1px 5px', borderRadius: 3, background: 'rgba(239,68,68,0.2)', color: '#ef4444', fontWeight: 500, textTransform: 'none' }}>
                                  borrado
                                </span>
                              )}
                              {msg.admin_inject && (
                                <span style={{ fontSize: 8, padding: '1px 5px', borderRadius: 3, background: 'rgba(168,85,247,0.2)', color: '#a855f7', fontWeight: 500, textTransform: 'none' }}>
                                  inyectado
                                </span>
                              )}
                            </div>
                            <div style={{
                              fontSize: 11, color: '#ffffffbb', lineHeight: 1.5, wordBreak: 'break-word',
                              whiteSpace: 'pre-wrap', maxHeight: 200, overflowY: 'auto',
                            }}>
                              {msg.content}
                            </div>
                          </div>
                        ))}
                        {session.messages.length === 0 && (
                          <div style={{ fontSize: 10, color: '#ffffff33', textAlign: 'center', padding: 12 }}>Sin mensajes en esta sesión</div>
                        )}
                      </div>

                      {/* Reply input — solo si la sesión NO está borrada */}
                      {!session.deleted && chatLogs?.user?.id && (
                        <div style={{
                          padding: '8px 12px', borderTop: '1px solid rgba(255,255,255,0.06)',
                          display: 'flex', gap: 8, alignItems: 'center',
                        }}>
                          <input
                            value={replyText}
                            onChange={e => setReplyText(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && !sendingReply && injectMessage(session.id, chatLogs.user.id)}
                            placeholder="Responder como AIdark..."
                            style={{
                              flex: 1, padding: '7px 10px', borderRadius: 6, border: '1px solid rgba(168,85,247,0.3)',
                              background: 'rgba(168,85,247,0.05)', color: '#fff', fontSize: 11, fontFamily: 'inherit',
                              outline: 'none',
                            }}
                          />
                          <button
                            onClick={() => injectMessage(session.id, chatLogs.user.id)}
                            disabled={sendingReply || !replyText.trim()}
                            style={{
                              padding: '7px 14px', borderRadius: 6, border: 'none',
                              background: 'rgba(168,85,247,0.3)', color: '#c4b5fd', fontSize: 10, fontWeight: 600,
                              cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
                              opacity: sendingReply || !replyText.trim() ? 0.4 : 1,
                            }}
                          >
                            {sendingReply ? 'Enviando...' : '👑 Enviar como AIdark'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
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
                padding: '10px 0', borderBottom: i < data.recentMessages.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
              }}>
                <div style={{ fontSize: 10, color: '#ffffff55', marginBottom: 5, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ color: '#60a5fa', fontWeight: 600 }}>{msg.email || 'Sin email'}</span>
                  {msg.user_id && (
                    <span style={{ color: '#ffffff33' }}>ID: {msg.user_id}</span>
                  )}
                  <span style={{ color: '#d4c5b0' }}>Plan: {msg.plan || 'free'}</span>
                  {msg.character && msg.character !== 'default' && (
                    <span style={{ color: '#a78bfa' }}>Char: {msg.character}</span>
                  )}
                  {msg.deleted && (
                    <span style={{ fontSize: 8, padding: '1px 5px', borderRadius: 3, background: 'rgba(239,68,68,0.2)', color: '#ef4444' }}>
                      borrado del chat
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: '#ffffffcc', lineHeight: 1.6, wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
                  {msg.content}
                </div>
                <div style={{ fontSize: 9, color: '#ffffff33', marginTop: 6, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span>{new Date(msg.created_at).toLocaleString('es')}</span>
                  {msg.session_id && <span>Sesión: {msg.session_id}</span>}
                  {msg.email && msg.email !== 'Sin email' && (
                    <button
                      onClick={() => {
                        setSearchEmail(msg.email);
                        setTab('chat_logs');
                      }}
                      style={{
                        padding: '2px 8px', borderRadius: 4, border: 'none',
                        background: 'rgba(139,115,85,0.2)', color: '#d4c5b0', fontSize: 9,
                        cursor: 'pointer', fontFamily: 'inherit',
                      }}
                    >
                      Ver historial
                    </button>
                  )}
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
