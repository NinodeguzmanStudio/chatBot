// ═══════════════════════════════════════
// AIdark — Sidebar v3
// ═══════════════════════════════════════

import React, { useState, useRef, useEffect } from 'react';
import {
  PanelLeft, Plus, FolderOpen, ChevronDown,
  Crown, Settings, Lock, BookOpen, FlaskConical,
  Skull, MoreVertical, Pencil, Trash2, X
} from 'lucide-react';
import { useChatStore } from '@/lib/store';
import { DEFAULT_PROJECTS } from '@/lib/constants';

const PROJECT_ICONS: Record<string, React.ReactNode> = {
  book: <BookOpen size={15} />,
  flask: <FlaskConical size={15} />,
  skull: <Skull size={15} />,
};

// ── Chat Context Menu ──
const ChatMenu: React.FC<{
  chatId: string;
  onRename: (id: string) => void;
  onDelete: (id: string) => void;
}> = ({ chatId, onRename, onDelete }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="chat-menu-btn"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 24, height: 24, background: 'none', border: 'none',
          color: 'var(--txt-mut)', cursor: 'pointer', borderRadius: 4,
          opacity: 0, transition: 'all 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'none')}
      >
        <MoreVertical size={16} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', right: 0, top: '100%', marginTop: 4,
          width: 150, background: 'var(--bg-el)', border: '1px solid var(--border-def)',
          borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          overflow: 'hidden', zIndex: 50, animation: 'fadeIn 0.12s ease',
        }}>
          <button
            onClick={(e) => { e.stopPropagation(); onRename(chatId); setOpen(false); }}
            className="transition-default"
            style={{
              width: '100%', padding: '10px 14px',
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'none', border: 'none', borderBottom: '1px solid var(--border-sub)',
              color: 'var(--txt-sec)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          >
            <Pencil size={12} /> Renombrar
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(chatId); setOpen(false); }}
            className="transition-default"
            style={{
              width: '100%', padding: '10px 14px',
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'none', border: 'none',
              color: 'var(--danger)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          >
            <Trash2 size={12} /> Eliminar
          </button>
        </div>
      )}
    </div>
  );
};

// ── Main Sidebar ──
interface SidebarProps {
  onOpenPricing: () => void;
  onOpenSettings: () => void;
  onOpenPrivacy: () => void;
  isMobile?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ onOpenPricing, onOpenSettings, onOpenPrivacy, isMobile }) => {
  const {
    sessions, activeSessionId, sidebarOpen,
    setSidebarOpen, createSession, deleteSession, renameSession, setActiveSession,
  } = useChatStore();
  const [projectsExpanded, setProjectsExpanded] = useState(true);

  const handleNewChat = () => {
    createSession();
    if (isMobile) setSidebarOpen(false);
  };

  const handleRename = (id: string) => {
    const name = prompt('Nuevo nombre:');
    if (name) renameSession(id, name);
  };

  const handleDelete = (id: string) => {
    deleteSession(id);
  };

  const handleSelectChat = (id: string) => {
    setActiveSession(id);
    if (isMobile) setSidebarOpen(false);
  };

  return (
    <>
      {/* Header */}
      <div style={{ padding: '14px 14px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button
          onClick={() => setSidebarOpen(false)}
          className="transition-default"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 32, height: 32, background: 'none', border: 'none',
            color: 'var(--txt-ter)', cursor: 'pointer', borderRadius: 6,
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'none')}
        >
          {isMobile ? <X size={18} /> : <PanelLeft size={18} />}
        </button>
        <button
          onClick={handleNewChat}
          className="transition-default"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 32, height: 32, background: 'none', border: 'none',
            color: 'var(--txt-ter)', cursor: 'pointer', borderRadius: 6,
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          title="Nuevo chat"
        >
          <Plus size={16} />
        </button>
      </div>

      {/* Scrollable */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 8px' }}>
        {/* Chats — no label */}
        <div style={{ marginBottom: 8 }}>
          {sessions.length === 0 && (
            <p style={{ fontSize: 12, color: 'var(--txt-mut)', padding: '16px 10px', textAlign: 'center' }}>
              Sin chats aún
            </p>
          )}
          {sessions.map((session) => (
            <div
              key={session.id}
              onClick={() => handleSelectChat(session.id)}
              className="chat-item"
              style={{
                padding: '9px 10px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: activeSessionId === session.id ? 'var(--bg-hover)' : 'transparent',
                borderRadius: 6, cursor: 'pointer', transition: 'background 0.15s',
              }}
              onMouseEnter={e => {
                if (activeSessionId !== session.id)
                  e.currentTarget.style.background = 'var(--bg-el)';
              }}
              onMouseLeave={e => {
                if (activeSessionId !== session.id)
                  e.currentTarget.style.background = 'transparent';
              }}
            >
              <span style={{
                fontSize: 13,
                color: activeSessionId === session.id ? 'var(--txt-pri)' : 'var(--txt-sec)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180,
              }}>
                {session.title}
              </span>
              <ChatMenu chatId={session.id} onRename={handleRename} onDelete={handleDelete} />
            </div>
          ))}
        </div>

        {/* Proyectos */}
        <div style={{ borderTop: '1px solid var(--border-sub)', paddingTop: 4 }}>
          <button
            onClick={() => setProjectsExpanded(!projectsExpanded)}
            style={{
              width: '100%', padding: '8px 10px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--txt-ter)', letterSpacing: 0.5 }}>
              Proyectos
            </span>
            <span style={{
              color: 'var(--txt-mut)',
              transform: projectsExpanded ? 'rotate(0)' : 'rotate(-90deg)',
              transition: 'transform 0.2s', display: 'flex',
            }}>
              <ChevronDown size={14} />
            </span>
          </button>
          {projectsExpanded && (
            <div style={{ animation: 'fadeUp 0.2s ease' }}>
              {DEFAULT_PROJECTS.map((project) => (
                <button
                  key={project.id}
                  className="transition-default"
                  style={{
                    width: '100%', padding: '9px 10px',
                    display: 'flex', alignItems: 'center', gap: 10,
                    background: 'transparent', border: 'none', borderRadius: 6,
                    cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-el)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <span style={{ color: 'var(--txt-ter)', flexShrink: 0, display: 'flex' }}>
                    {PROJECT_ICONS[project.icon] || <FolderOpen size={15} />}
                  </span>
                  <span style={{
                    fontSize: 13, color: 'var(--txt-sec)', flex: 1,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {project.name}
                  </span>
                  <span style={{
                    fontSize: 10, color: 'var(--txt-mut)', background: 'var(--bg-el)',
                    padding: '2px 6px', borderRadius: 10, flexShrink: 0,
                  }}>
                    {project.chat_count}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: '12px 12px', borderTop: '1px solid var(--border-sub)' }}>
        <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
          <button
            onClick={onOpenSettings}
            className="transition-default"
            style={{
              flex: 1, padding: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              background: 'none', border: 'none', color: 'var(--txt-mut)', fontSize: 11,
              cursor: 'pointer', fontFamily: 'inherit', letterSpacing: 0.5, textTransform: 'uppercase',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--txt-sec)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--txt-mut)')}
          >
            <Settings size={14} /> Ajustes
          </button>
          <button
            onClick={onOpenPrivacy}
            className="transition-default"
            style={{
              flex: 1, padding: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              background: 'none', border: 'none', color: 'var(--txt-mut)', fontSize: 11,
              cursor: 'pointer', fontFamily: 'inherit', letterSpacing: 0.5, textTransform: 'uppercase',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--txt-sec)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--txt-mut)')}
          >
            <Lock size={14} /> Privacidad
          </button>
        </div>
        <button
          onClick={onOpenPricing}
          className="transition-default"
          style={{
            width: '100%', padding: '11px 14px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            background: 'var(--bg-el)', border: '1px solid var(--border-def)', borderRadius: 8,
            color: 'var(--txt-pri)', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
          }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-str)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-def)')}
        >
          <Crown size={14} /> Upgrade a Premium
        </button>
      </div>
    </>
  );
};
