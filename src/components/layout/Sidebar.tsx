// ═══════════════════════════════════════
// AIdark — Sidebar v3 (+ admin button)
// src/components/layout/Sidebar.tsx
// NEW: Botón admin solo visible para ADMIN_EMAILS
// ═══════════════════════════════════════

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Plus, Trash2, MessageSquare, PanelLeftClose, Settings, MoreHorizontal, Pencil, Search, X, BarChart3 } from 'lucide-react';
import { useChatStore, useAuthStore } from '@/lib/store';
import { useIsMobile } from '@/hooks/useIsMobile';
import { t } from '@/lib/i18n';

const ADMIN_EMAILS = new Set(
  ((import.meta.env.VITE_ADMIN_EMAILS as string | undefined) || 'ninodeguzmanstudio@gmail.com')
    .split(',')
    .map(email => email.trim().toLowerCase())
    .filter(Boolean)
);

interface SidebarProps {
  onOpenPricing?: () => void;
  onOpenSettings?: () => void;
  onOpenPrivacy?: () => void;
  onOpenTerms?: () => void;
  onOpenAdmin?: () => void;
  isMobile?: boolean;
}

function getGroup(ts: number): string {
  const now = Date.now();
  const diff = now - ts;
  const d = 1000 * 60 * 60 * 24;
  if (diff < d) return t('sidebar.today');
  if (diff < 2 * d) return t('sidebar.yesterday');
  if (diff < 7 * d) return t('sidebar.this_week');
  if (diff < 30 * d) return t('sidebar.this_month');
  return t('sidebar.older');
}

const GROUP_ORDER = () => [t('sidebar.today'), t('sidebar.yesterday'), t('sidebar.this_week'), t('sidebar.this_month'), t('sidebar.older')];

export const Sidebar: React.FC<SidebarProps> = ({ onOpenSettings, onOpenPrivacy, onOpenAdmin }) => {
  const { sessions, activeSessionId, sidebarOpen, setSidebarOpen, createSession, setActiveSession, deleteSession, renameSession } = useChatStore();
  const { user } = useAuthStore();
  const isMobile = useIsMobile();
  const sidebarRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const isAdmin = user?.email ? ADMIN_EMAILS.has(user.email) : false;

  useEffect(() => {
    if (!isMobile || !sidebarOpen) return;
    const handle = (e: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) setSidebarOpen(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [isMobile, sidebarOpen, setSidebarOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const handle = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(null);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [menuOpen]);

  if (!sidebarOpen) return null;

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return [...sessions]
      .filter((s) => !q || s.title.toLowerCase().includes(q) ||
        s.messages.some((m) => m.content.toLowerCase().includes(q)))
      .sort((a, b) => b.updated_at - a.updated_at);
  }, [sessions, search]);

  const grouped = useMemo(() => {
    const map: Record<string, typeof filtered> = {};
    for (const s of filtered) {
      const g = getGroup(s.updated_at);
      if (!map[g]) map[g] = [];
      map[g].push(s);
    }
    return map;
  }, [filtered]);

  const handleRenameStart = (sessionId: string, currentTitle: string) => {
    setRenaming(sessionId);
    setRenameValue(currentTitle);
    setMenuOpen(null);
  };

  const handleRenameConfirm = () => {
    if (renaming && renameValue.trim()) renameSession(renaming, renameValue.trim());
    setRenaming(null);
    setRenameValue('');
  };

  const handleDelete = (sessionId: string) => {
    setMenuOpen(null);
    deleteSession(sessionId);
  };

  const SessionItem = ({ session }: { session: typeof sessions[0] }) => {
    const isActive = session.id === activeSessionId;
    const isRenaming = renaming === session.id;
    return (
      <div
        onClick={() => { if (!isRenaming) { setActiveSession(session.id); if (isMobile) setSidebarOpen(false); } }}
        style={{
          padding: '9px 10px', borderRadius: 8, cursor: isRenaming ? 'default' : 'pointer',
          marginBottom: 2, background: isActive ? 'var(--bg-el)' : 'transparent',
          display: 'flex', alignItems: 'center', gap: 10, position: 'relative',
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--bg-el)'; }}
        onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
      >
        <MessageSquare size={13} style={{ color: 'var(--txt-ghost)', flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          {isRenaming ? (
            <input autoFocus value={renameValue}
              onChange={e => setRenameValue(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleRenameConfirm(); if (e.key === 'Escape') setRenaming(null); }}
              onBlur={handleRenameConfirm}
              onClick={e => e.stopPropagation()}
              style={{ width: '100%', fontSize: 12, color: 'var(--txt-pri)', background: 'var(--bg-primary)', border: '1px solid var(--accent)', borderRadius: 4, padding: '2px 6px', fontFamily: 'inherit', outline: 'none' }}
            />
          ) : (
            <>
              <div style={{ fontSize: 12, color: isActive ? 'var(--txt-pri)' : 'var(--txt-sec)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {search ? highlightMatch(session.title || 'Nuevo chat', search) : (session.title || 'Nuevo chat')}
              </div>
              <div style={{ fontSize: 9, color: 'var(--txt-ghost)', marginTop: 2 }}>
                {session.messages.length} msg · {new Date(session.updated_at).toLocaleDateString()}
              </div>
            </>
          )}
        </div>

        {!isRenaming && (
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <button
              onClick={e => { e.stopPropagation(); setMenuOpen(menuOpen === session.id ? null : session.id); }}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, background: 'none', border: 'none', color: 'var(--txt-ghost)', cursor: 'pointer', borderRadius: 4, opacity: isActive || menuOpen === session.id ? 0.8 : 0.4 }}
              onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.background = 'var(--bg-hover)'; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = isActive ? '0.8' : '0.4'; e.currentTarget.style.background = 'none'; }}
            >
              <MoreHorizontal size={14} />
            </button>
            {menuOpen === session.id && (
              <div ref={menuRef} onClick={e => e.stopPropagation()} style={{ position: 'absolute', right: 0, top: 28, zIndex: 50, background: 'var(--bg-surface)', border: '1px solid var(--border-def)', borderRadius: 8, padding: 4, minWidth: 140, boxShadow: '0 4px 16px rgba(0,0,0,0.3)' }}>
                <button onClick={() => handleRenameStart(session.id, session.title || 'Nuevo chat')} style={{ width: '100%', padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', borderRadius: 6, color: 'var(--txt-sec)', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-el)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  <Pencil size={12} /> {t('sidebar.rename')}
                </button>
                <button onClick={() => handleDelete(session.id)} style={{ width: '100%', padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', borderRadius: 6, color: 'var(--danger)', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(160,81,59,0.08)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  <Trash2 size={12} /> {t('sidebar.delete')}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {isMobile && <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99 }} />}
      <div ref={sidebarRef} style={{ width: isMobile ? 280 : 260, height: '100%', background: 'var(--bg-surface)', borderRight: '1px solid var(--border-sub)', display: 'flex', flexDirection: 'column', flexShrink: 0, position: isMobile ? 'fixed' : 'relative', left: 0, top: 0, zIndex: isMobile ? 100 : 1 }}>

        {/* Header */}
        <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-sub)' }}>
          <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--txt-ter)', letterSpacing: 0.5 }}>{t('sidebar.chats') || 'Chats'}</span>
          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={() => setShowSearch(!showSearch)} title="Buscar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, background: showSearch ? 'var(--bg-el)' : 'none', border: 'none', color: showSearch ? 'var(--txt-pri)' : 'var(--txt-ter)', cursor: 'pointer', borderRadius: 6 }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-el)'}
              onMouseLeave={e => e.currentTarget.style.background = showSearch ? 'var(--bg-el)' : 'none'}
            >
              <Search size={14} />
            </button>
            <button onClick={() => createSession()} title={t('sidebar.new_chat') || 'Nuevo chat'} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, background: 'none', border: 'none', color: 'var(--txt-ter)', cursor: 'pointer', borderRadius: 6 }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-el)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              <Plus size={15} />
            </button>
            <button onClick={() => setSidebarOpen(false)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, background: 'none', border: 'none', color: 'var(--txt-ter)', cursor: 'pointer', borderRadius: 6 }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-el)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              <PanelLeftClose size={15} />
            </button>
          </div>
        </div>

        {/* Search box */}
        {showSearch && (
          <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border-sub)' }}>
            <div style={{ position: 'relative' }}>
              <Search size={12} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--txt-mut)', pointerEvents: 'none' }} />
              <input
                autoFocus value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar chats..."
                style={{ width: '100%', background: 'var(--bg-el)', border: '1px solid var(--border-sub)', borderRadius: 7, padding: '6px 28px 6px 26px', fontSize: 11, color: 'var(--txt-pri)', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
              />
              {search && (
                <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--txt-mut)', cursor: 'pointer', padding: 0, display: 'flex' }}>
                  <X size={11} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Sessions grouped by date */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 8px' }}>
          {filtered.length === 0 && (
            <div style={{ padding: '20px 10px', textAlign: 'center' }}>
              <span style={{ fontSize: 11, color: 'var(--txt-mut)' }}>
                {search ? t('sidebar.no_results') : t('sidebar.no_chats')}
              </span>
            </div>
          )}

          {GROUP_ORDER().filter((g) => grouped[g]?.length).map((group) => (
            <div key={group}>
              <div style={{ fontSize: 9, color: 'var(--txt-ghost)', textTransform: 'uppercase', letterSpacing: 0.8, padding: '8px 10px 4px', fontWeight: 600 }}>
                {group}
              </div>
              {grouped[group].map((session) => (
                <SessionItem key={session.id} session={session} />
              ))}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 14px', borderTop: '1px solid var(--border-sub)', display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
          {/* ADMIN BUTTON — solo visible para ti */}
          {isAdmin && onOpenAdmin && (
            <button onClick={onOpenAdmin} style={{ background: 'none', border: 'none', color: '#f59e0b', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'inherit', transition: 'color 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.color = '#fbbf24'}
              onMouseLeave={e => e.currentTarget.style.color = '#f59e0b'}
            >
              <BarChart3 size={13} /> Admin
            </button>
          )}
          {onOpenSettings && (
            <button onClick={onOpenSettings} style={{ background: 'none', border: 'none', color: 'var(--txt-sec)', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'inherit', transition: 'color 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--txt-pri)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--txt-sec)'}
            >
              ⚙️ {t('sidebar.settings')}
            </button>
          )}
          {onOpenPrivacy && (
            <button onClick={onOpenPrivacy} style={{ background: 'none', border: 'none', color: 'var(--txt-sec)', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'inherit', transition: 'color 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--txt-pri)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--txt-sec)'}
            >
              🛡️ {t('sidebar.privacy')}
            </button>
          )}
        </div>
      </div>
    </>
  );
};

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark style={{ background: 'rgba(255,200,50,0.25)', color: 'inherit', borderRadius: 2 }}>
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}
