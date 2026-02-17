import React, { useEffect, useRef } from 'react';
import { Plus, Trash2, MessageSquare, PanelLeftClose, Shield, FileText } from 'lucide-react';
import { useChatStore } from '@/lib/store';
import { useIsMobile } from '@/hooks/useIsMobile';
import { t } from '@/lib/i18n';

export const Sidebar: React.FC<{ onOpenPrivacy?: () => void; onOpenTerms?: () => void }> = ({ onOpenPrivacy, onOpenTerms }) => {
  const { sessions, activeSessionId, sidebarOpen, setSidebarOpen, createSession, setActiveSession, deleteSession } = useChatStore();
  const isMobile = useIsMobile();
  const sidebarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isMobile || !sidebarOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) setSidebarOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobile, sidebarOpen, setSidebarOpen]);

  if (!sidebarOpen) return null;

  const sortedSessions = [...sessions].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

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
          <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--txt-ter)', letterSpacing: 0.5 }}>{t('sidebar.chats')}</span>
          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={() => createSession()} title={t('sidebar.new_chat')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, background: 'none', border: 'none', color: 'var(--txt-ter)', cursor: 'pointer', borderRadius: 6 }}><Plus size={15} /></button>
            <button onClick={() => setSidebarOpen(false)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, background: 'none', border: 'none', color: 'var(--txt-ter)', cursor: 'pointer', borderRadius: 6 }}><PanelLeftClose size={15} /></button>
          </div>
        </div>

        {/* Sessions list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 8px' }}>
          {sortedSessions.map(session => {
            const isActive = session.id === activeSessionId;
            const preview = session.messages.length > 0
              ? session.messages[session.messages.length - 1].content.slice(0, 40) + (session.messages[session.messages.length - 1].content.length > 40 ? '...' : '')
              : t('sidebar.empty_chat');
            return (
              <div key={session.id} onClick={() => { setActiveSession(session.id); if (isMobile) setSidebarOpen(false); }}
                style={{
                  padding: '10px 10px', borderRadius: 8, cursor: 'pointer', marginBottom: 2,
                  background: isActive ? 'var(--bg-el)' : 'transparent',
                  display: 'flex', alignItems: 'center', gap: 10,
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--bg-el)'; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
              >
                <MessageSquare size={13} style={{ color: 'var(--txt-ghost)', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: isActive ? 'var(--txt-pri)' : 'var(--txt-sec)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{preview}</div>
                  <div style={{ fontSize: 9, color: 'var(--txt-ghost)', marginTop: 2 }}>
                    {new Date(session.updated_at).toLocaleDateString()}
                  </div>
                </div>
                <button onClick={e => { e.stopPropagation(); deleteSession(session.id); }}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, background: 'none', border: 'none', color: 'var(--txt-ghost)', cursor: 'pointer', borderRadius: 4, opacity: 0.5, flexShrink: 0 }}
                  onMouseEnter={e => { e.currentTarget.style.color = 'var(--danger)'; e.currentTarget.style.opacity = '1'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--txt-ghost)'; e.currentTarget.style.opacity = '0.5'; }}
                ><Trash2 size={12} /></button>
              </div>
            );
          })}
        </div>

        {/* Footer — Privacy & Terms */}
        <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border-sub)', display: 'flex', gap: 12, justifyContent: 'center' }}>
          {onOpenPrivacy && (
            <button onClick={onOpenPrivacy} style={{ background: 'none', border: 'none', color: 'var(--txt-ghost)', fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'inherit' }}>
              <Shield size={10} /> {t('sidebar.privacy')}
            </button>
          )}
          {onOpenTerms && (
            <button onClick={onOpenTerms} style={{ background: 'none', border: 'none', color: 'var(--txt-ghost)', fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'inherit' }}>
              <FileText size={10} /> {t('sidebar.terms')}
            </button>
          )}
        </div>
      </div>
    </>
  );
};
