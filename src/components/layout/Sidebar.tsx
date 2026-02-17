import React, { useEffect, useRef, useState } from 'react';
import { Plus, Trash2, MessageSquare, PanelLeftClose, Shield, FileText, Settings, MoreHorizontal, Pencil } from 'lucide-react';
import { useChatStore } from '@/lib/store';
import { useIsMobile } from '@/hooks/useIsMobile';
import { t } from '@/lib/i18n';

interface SidebarProps {
  onOpenPricing?: () => void;
  onOpenSettings?: () => void;
  onOpenPrivacy?: () => void;
  onOpenTerms?: () => void;
  isMobile?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ onOpenPricing, onOpenSettings, onOpenPrivacy, onOpenTerms }) => {
  const { sessions, activeSessionId, sidebarOpen, setSidebarOpen, createSession, setActiveSession, deleteSession, renameSession } = useChatStore();
  const isMobile = useIsMobile();
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isMobile || !sidebarOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) setSidebarOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobile, sidebarOpen, setSidebarOpen]);

  // Close menu when clicking outside
  useEffect(() => {
    if (!menuOpen) return;
    const handle = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(null);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [menuOpen]);

  if (!sidebarOpen) return null;

  const sortedSessions = [...sessions].sort((a, b) => b.updated_at - a.updated_at);

  const handleRenameStart = (sessionId: string, currentTitle: string) => {
    setRenaming(sessionId);
    setRenameValue(currentTitle);
    setMenuOpen(null);
  };

  const handleRenameConfirm = () => {
    if (renaming && renameValue.trim()) {
      renameSession(renaming, renameValue.trim());
    }
    setRenaming(null);
    setRenameValue('');
  };

  const handleDelete = (sessionId: string) => {
    setMenuOpen(null);
    deleteSession(sessionId);
  };

  return (
    <>
      {isMobile && <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99 }} />}
      <div ref={sidebarRef} style={{
        width: isMobile ? 280 : 260, height: '100%', background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border-sub)', display: 'flex', flexDirection: 'column',
        flexShrink: 0, position: isMobile ? 'fixed' : 'relative', left: 0, top: 0,
        zIndex: isMobile ? 100 : 1, transition: 'transform 0.2s ease',
      }}>
        {/* Header */}
        <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-sub)' }}>
          <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--txt-ter)', letterSpacing: 0.5 }}>{t('sidebar.chats') || 'Chats'}</span>
          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={() => createSession()} title={t('sidebar.new_chat') || 'Nuevo chat'} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, background: 'none', border: 'none', color: 'var(--txt-ter)', cursor: 'pointer', borderRadius: 6 }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-el)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            ><Plus size={15} /></button>
            <button onClick={() => setSidebarOpen(false)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, background: 'none', border: 'none', color: 'var(--txt-ter)', cursor: 'pointer', borderRadius: 6 }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-el)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            ><PanelLeftClose size={15} /></button>
          </div>
        </div>

        {/* Sessions list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 8px' }}>
          {sortedSessions.length === 0 && (
            <div style={{ padding: '20px 10px', textAlign: 'center' }}>
              <span style={{ fontSize: 11, color: 'var(--txt-ghost)' }}>{t('sidebar.no_chats')}</span>
            </div>
          )}
          {sortedSessions.map(session => {
            const isActive = session.id === activeSessionId;
            const isRenaming = renaming === session.id;
            return (
              <div key={session.id} onClick={() => { if (!isRenaming) { setActiveSession(session.id); if (isMobile) setSidebarOpen(false); } }}
                style={{
                  padding: '10px 10px', borderRadius: 8, cursor: isRenaming ? 'default' : 'pointer', marginBottom: 2,
                  background: isActive ? 'var(--bg-el)' : 'transparent',
                  display: 'flex', alignItems: 'center', gap: 10,
                  transition: 'background 0.15s', position: 'relative',
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--bg-el)'; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
              >
                <MessageSquare size={13} style={{ color: 'var(--txt-ghost)', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  {isRenaming ? (
                    <input
                      autoFocus
                      value={renameValue}
                      onChange={e => setRenameValue(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleRenameConfirm(); if (e.key === 'Escape') setRenaming(null); }}
                      onBlur={handleRenameConfirm}
                      onClick={e => e.stopPropagation()}
                      style={{
                        width: '100%', fontSize: 12, color: 'var(--txt-pri)', background: 'var(--bg-primary)',
                        border: '1px solid var(--accent)', borderRadius: 4, padding: '2px 6px',
                        fontFamily: 'inherit', outline: 'none',
                      }}
                    />
                  ) : (
                    <>
                      <div style={{ fontSize: 12, color: isActive ? 'var(--txt-pri)' : 'var(--txt-sec)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {session.title || 'Nuevo chat'}
                      </div>
                      <div style={{ fontSize: 9, color: 'var(--txt-ghost)', marginTop: 2 }}>
                        {new Date(session.updated_at).toLocaleDateString()}
                      </div>
                    </>
                  )}
                </div>

                {/* Three dots menu */}
                {!isRenaming && (
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <button
                      onClick={e => { e.stopPropagation(); setMenuOpen(menuOpen === session.id ? null : session.id); }}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: 24, height: 24, background: 'none', border: 'none',
                        color: 'var(--txt-ghost)', cursor: 'pointer', borderRadius: 4,
                        opacity: isActive || menuOpen === session.id ? 0.8 : 0.4,
                      }}
                      onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.background = 'var(--bg-hover)'; }}
                      onMouseLeave={e => { e.currentTarget.style.opacity = isActive ? '0.8' : '0.4'; e.currentTarget.style.background = 'none'; }}
                    >
                      <MoreHorizontal size={14} />
                    </button>

                    {/* Dropdown menu */}
                    {menuOpen === session.id && (
                      <div ref={menuRef} onClick={e => e.stopPropagation()} style={{
                        position: 'absolute', right: 0, top: 28, zIndex: 50,
                        background: 'var(--bg-surface)', border: '1px solid var(--border-def)',
                        borderRadius: 8, padding: 4, minWidth: 140,
                        boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                        animation: 'fadeIn 0.1s ease',
                      }}>
                        <button
                          onClick={() => handleRenameStart(session.id, session.title || 'Nuevo chat')}
                          style={{
                            width: '100%', padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 8,
                            background: 'none', border: 'none', borderRadius: 6,
                            color: 'var(--txt-sec)', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-el)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'none'}
                        >
                          <Pencil size={12} /> {t('sidebar.rename')}
                        </button>
                        <button
                          onClick={() => handleDelete(session.id)}
                          style={{
                            width: '100%', padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 8,
                            background: 'none', border: 'none', borderRadius: 6,
                            color: 'var(--danger)', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
                          }}
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
          })}
        </div>

        {/* Footer — Settings + Privacy */}
        <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border-sub)', display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          {onOpenSettings && (
            <button onClick={onOpenSettings} style={{ background: 'none', border: 'none', color: 'var(--txt-ghost)', fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'inherit' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--txt-sec)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--txt-ghost)'}
            >
              <Settings size={10} /> {t('sidebar.settings')}
            </button>
          )}
          {onOpenPrivacy && (
            <button onClick={onOpenPrivacy} style={{ background: 'none', border: 'none', color: 'var(--txt-ghost)', fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'inherit' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--txt-sec)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--txt-ghost)'}
            >
              <Shield size={10} /> {t('sidebar.privacy')}
            </button>
          )}
          {onOpenTerms && (
            <button onClick={onOpenTerms} style={{ background: 'none', border: 'none', color: 'var(--txt-ghost)', fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'inherit' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--txt-sec)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--txt-ghost)'}
            >
              <FileText size={10} /> {t('sidebar.terms') || 'Términos'}
            </button>
          )}
        </div>
      </div>
    </>
  );
};
