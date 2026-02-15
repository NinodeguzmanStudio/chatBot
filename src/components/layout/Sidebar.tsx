// ═══════════════════════════════════════
// AIdark — Sidebar (FIXED)
// ═══════════════════════════════════════

import React, { useState, useRef, useEffect } from 'react';
import {
  PanelLeft, Plus, ChevronDown, Crown, Settings, Lock,
  BookOpen, FlaskConical, Skull, MoreVertical, Pencil, Trash2, X, FolderOpen
} from 'lucide-react';
import { useChatStore } from '@/lib/store';
import { DEFAULT_PROJECTS } from '@/lib/constants';

const PROJECT_ICONS: Record<string, React.ReactNode> = {
  book: <BookOpen size={15} />, flask: <FlaskConical size={15} />, skull: <Skull size={15} />,
};

const ChatMenu: React.FC<{ chatId: string; onRename: (id: string) => void; onDelete: (id: string) => void }> = ({ chatId, onRename, onDelete }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    if (open) document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={e => { e.stopPropagation(); setOpen(!open); }}
        className="chat-menu-btn"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 24, height: 24, background: 'none', border: 'none',
          color: 'var(--txt-mut)', cursor: 'pointer', borderRadius: 4,
          opacity: 0, transition: 'all 0.12s',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
        onMouseLeave={e => e.currentTarget.style.background = 'none'}
      ><MoreVertical size={14} /></button>
      {open && (
        <div style={{
          position: 'absolute', right: 0, top: '100%', marginTop: 4,
          width: 140, background: 'var(--bg-el)', border: '1px solid var(--border-def)',
          borderRadius: 8, boxShadow: '0 6px 20px rgba(0,0,0,0.4)',
          overflow: 'hidden', zIndex: 50, animation: 'fadeIn 0.1s ease',
        }}>
          <button onClick={e => { e.stopPropagation(); onRename(chatId); setOpen(false); }} style={{
            width: '100%', padding: '9px 12px', display: 'flex', alignItems: 'center', gap: 7,
            background: 'none', border: 'none', borderBottom: '1px solid var(--border-sub)',
            color: 'var(--txt-sec)', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', transition: 'background 0.1s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
          onMouseLeave={e => e.currentTarget.style.background = 'none'}
          ><Pencil size={11} /> Renombrar</button>
          <button onClick={e => { e.stopPropagation(); onDelete(chatId); setOpen(false); }} style={{
            width: '100%', padding: '9px 12px', display: 'flex', alignItems: 'center', gap: 7,
            background: 'none', border: 'none',
            color: 'var(--danger)', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', transition: 'background 0.1s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
          onMouseLeave={e => e.currentTarget.style.background = 'none'}
          ><Trash2 size={11} /> Eliminar</button>
        </div>
      )}
    </div>
  );
};

interface SidebarProps {
  onOpenPricing: () => void;
  onOpenSettings: () => void;
  onOpenPrivacy: () => void;
  isMobile?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ onOpenPricing, onOpenSettings, onOpenPrivacy, isMobile }) => {
  const {
    sessions, activeSessionId, setSidebarOpen, createSession,
    deleteSession, renameSession, setActiveSession,
  } = useChatStore();
  const [projOpen, setProjOpen] = useState(true);

  const handleNew = () => { createSession(); if (isMobile) setSidebarOpen(false); };
  const handleRename = (id: string) => { const n = prompt('Nuevo nombre:'); if (n) renameSession(id, n); };
  const handleSelect = (id: string) => { setActiveSession(id); if (isMobile) setSidebarOpen(false); };

  return (
    <>
      <div style={{ padding: '12px 12px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={() => setSidebarOpen(false)} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 30, height: 30, background: 'none', border: 'none',
          color: 'var(--txt-ter)', cursor: 'pointer', borderRadius: 6, transition: 'background 0.12s',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
        onMouseLeave={e => e.currentTarget.style.background = 'none'}
        >{isMobile ? <X size={18} /> : <PanelLeft size={18} />}</button>
        <button onClick={handleNew} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 30, height: 30, background: 'none', border: 'none',
          color: 'var(--txt-ter)', cursor: 'pointer', borderRadius: 6,
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
        onMouseLeave={e => e.currentTarget.style.background = 'none'}
        title="Nuevo chat"><Plus size={15} /></button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '2px 6px' }}>
        <div style={{ marginBottom: 6 }}>
          {sessions.length === 0 && (
            <p style={{ fontSize: 11, color: 'var(--txt-mut)', padding: '14px 10px', textAlign: 'center' }}>
              Sin chats aún
            </p>
          )}
          {sessions.map(s => (
            <div key={s.id} onClick={() => handleSelect(s.id)} className="chat-item" style={{
              padding: '8px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: activeSessionId === s.id ? 'var(--bg-hover)' : 'transparent',
              borderRadius: 6, cursor: 'pointer', transition: 'background 0.12s',
            }}
            onMouseEnter={e => { if (activeSessionId !== s.id) e.currentTarget.style.background = 'var(--bg-el)'; }}
            onMouseLeave={e => { if (activeSessionId !== s.id) e.currentTarget.style.background = 'transparent'; }}
            >
              <span style={{
                fontSize: 12, color: activeSessionId === s.id ? 'var(--txt-pri)' : 'var(--txt-sec)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 170,
              }}>{s.title}</span>
              <ChatMenu chatId={s.id} onRename={handleRename} onDelete={deleteSession} />
            </div>
          ))}
        </div>

        <div style={{ borderTop: '1px solid var(--border-sub)', paddingTop: 4 }}>
          <button onClick={() => setProjOpen(!projOpen)} style={{
            width: '100%', padding: '7px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
          }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--txt-ter)', letterSpacing: 0.5 }}>Proyectos</span>
            <span style={{ color: 'var(--txt-mut)', transform: projOpen ? 'rotate(0)' : 'rotate(-90deg)', transition: 'transform 0.2s', display: 'flex' }}>
              <ChevronDown size={12} />
            </span>
          </button>
          {projOpen && (
            <div style={{ animation: 'fadeUp 0.2s ease' }}>
              {DEFAULT_PROJECTS.map(p => (
                <button key={p.id} style={{
                  width: '100%', padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 8,
                  background: 'transparent', border: 'none', borderRadius: 6,
                  cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', transition: 'background 0.12s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-el)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <span style={{ color: 'var(--txt-ter)', display: 'flex' }}>{PROJECT_ICONS[p.icon] || <FolderOpen size={14} />}</span>
                  <span style={{ fontSize: 12, color: 'var(--txt-sec)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                  <span style={{ fontSize: 9, color: 'var(--txt-mut)', background: 'var(--bg-el)', padding: '1px 5px', borderRadius: 8 }}>{p.chat_count}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ padding: '10px 10px', borderTop: '1px solid var(--border-sub)' }}>
        <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
          <button onClick={onOpenSettings} style={{
            flex: 1, padding: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
            background: 'none', border: 'none', color: 'var(--txt-mut)', fontSize: 10,
            cursor: 'pointer', fontFamily: 'inherit', letterSpacing: 0.5, textTransform: 'uppercase', transition: 'color 0.12s',
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--txt-sec)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--txt-mut)'}
          ><Settings size={12} /> Ajustes</button>
          <button onClick={onOpenPrivacy} style={{
            flex: 1, padding: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
            background: 'none', border: 'none', color: 'var(--txt-mut)', fontSize: 10,
            cursor: 'pointer', fontFamily: 'inherit', letterSpacing: 0.5, textTransform: 'uppercase', transition: 'color 0.12s',
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--txt-sec)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--txt-mut)'}
          ><Lock size={12} /> Privacidad</button>
        </div>
        <button onClick={onOpenPricing} style={{
          width: '100%', padding: '10px 12px',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
          background: 'var(--bg-el)', border: '1px solid var(--border-sub)', borderRadius: 7,
          color: 'var(--txt-pri)', fontSize: 11, fontWeight: 500, cursor: 'pointer',
          fontFamily: 'inherit', transition: 'all 0.12s',
        }}
        onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-def)'}
        onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-sub)'}
        ><Crown size={13} /> Upgrade a Premium</button>
      </div>
    </>
  );
};
