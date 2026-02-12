// ═══════════════════════════════════════
// AIdark — Sidebar Component
// ═══════════════════════════════════════

import React, { useState } from 'react';
import {
  PanelLeft, Plus, MessageSquare, FolderOpen,
  ChevronDown, Trash2, Crown, Settings, Lock,
  BookOpen, FlaskConical, Skull
} from 'lucide-react';
import { useChatStore, useAuthStore } from '@/lib/store';
import { DEFAULT_PROJECTS } from '@/lib/constants';
import { formatRelativeTime } from '@/lib/utils';

const PROJECT_ICONS: Record<string, React.ReactNode> = {
  book: <BookOpen size={15} />,
  flask: <FlaskConical size={15} />,
  skull: <Skull size={15} />,
};

interface SidebarProps {
  onOpenPricing: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onOpenPricing }) => {
  const {
    sessions, activeSessionId, sidebarOpen,
    setSidebarOpen, createSession, deleteSession, setActiveSession,
  } = useChatStore();
  const { messagesUsed } = useAuthStore();
  const [projectsExpanded, setProjectsExpanded] = useState(true);

  const handleNewChat = () => {
    createSession();
  };

  if (!sidebarOpen) return null;

  return (
    <aside
      className="flex flex-col flex-shrink-0 h-screen"
      style={{
        width: 260, minWidth: 260,
        background: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border-subtle)',
      }}
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between" style={{ padding: '14px 14px 10px' }}>
        <button
          onClick={() => setSidebarOpen(false)}
          className="flex items-center justify-center rounded-md transition-default"
          style={{ width: 32, height: 32, color: 'var(--text-tertiary)' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <PanelLeft size={18} />
        </button>
        <button
          onClick={handleNewChat}
          className="flex items-center justify-center rounded-md transition-default"
          style={{ width: 32, height: 32, color: 'var(--text-tertiary)' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          title="Nuevo chat"
        >
          <Plus size={16} />
        </button>
      </div>

      {/* ── Scrollable content ── */}
      <div className="flex-1 overflow-y-auto" style={{ padding: '4px 8px' }}>

        {/* Recientes */}
        <div style={{ marginBottom: 8 }}>
          <p
            className="font-mono"
            style={{
              fontSize: 11, fontWeight: 600,
              color: 'var(--text-tertiary)',
              padding: '8px 10px 6px',
              letterSpacing: '0.5px',
            }}
          >
            Recientes
          </p>

          {sessions.length === 0 && (
            <p
              style={{
                fontSize: 12, color: 'var(--text-muted)',
                padding: '8px 10px',
              }}
            >
              Sin chats recientes
            </p>
          )}

          {sessions.map((session) => (
            <div
              key={session.id}
              onClick={() => setActiveSession(session.id)}
              className="flex items-center justify-between rounded-md cursor-pointer transition-default group"
              style={{
                padding: '9px 10px',
                background: activeSessionId === session.id ? 'var(--bg-hover)' : 'transparent',
              }}
              onMouseEnter={e => {
                if (activeSessionId !== session.id)
                  e.currentTarget.style.background = 'var(--bg-elevated)';
              }}
              onMouseLeave={e => {
                if (activeSessionId !== session.id)
                  e.currentTarget.style.background = 'transparent';
              }}
            >
              <span
                className="truncate"
                style={{
                  fontSize: 13,
                  color: activeSessionId === session.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                  maxWidth: 170,
                }}
              >
                {session.title}
              </span>

              <div className="flex items-center gap-1">
                <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>
                  {formatRelativeTime(session.updated_at)}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteSession(session.id); }}
                  className="opacity-0 group-hover:opacity-100 transition-default"
                  style={{ color: 'var(--text-muted)', padding: 2 }}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Proyectos */}
        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 4 }}>
          <button
            onClick={() => setProjectsExpanded(!projectsExpanded)}
            className="flex items-center justify-between w-full"
            style={{ padding: '8px 10px' }}
          >
            <span
              style={{
                fontSize: 11, fontWeight: 600,
                color: 'var(--text-tertiary)',
                letterSpacing: '0.5px',
              }}
            >
              Proyectos
            </span>
            <span
              className="transition-default"
              style={{
                color: 'var(--text-muted)',
                transform: projectsExpanded ? 'rotate(0deg)' : 'rotate(-90deg)',
                display: 'flex',
              }}
            >
              <ChevronDown size={14} />
            </span>
          </button>

          {projectsExpanded && DEFAULT_PROJECTS.map((project) => (
            <button
              key={project.id}
              className="flex items-center gap-2.5 w-full rounded-md transition-default"
              style={{ padding: '9px 10px', textAlign: 'left' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-elevated)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <span style={{ color: 'var(--text-tertiary)', flexShrink: 0, display: 'flex' }}>
                {PROJECT_ICONS[project.icon] || <FolderOpen size={15} />}
              </span>
              <span
                className="truncate"
                style={{ fontSize: 13, color: 'var(--text-secondary)', flex: 1 }}
              >
                {project.name}
              </span>
              <span
                style={{
                  fontSize: 10, color: 'var(--text-muted)',
                  background: 'var(--bg-elevated)',
                  padding: '2px 6px', borderRadius: 10,
                  flexShrink: 0,
                }}
              >
                {project.chat_count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Footer ── */}
      <div style={{ padding: '12px 12px', borderTop: '1px solid var(--border-subtle)' }}>
        <div className="flex gap-1" style={{ marginBottom: 12 }}>
          <button
            className="flex-1 flex items-center justify-center gap-1.5 transition-default"
            style={{
              padding: 8, fontSize: 11, color: 'var(--text-muted)',
              letterSpacing: '0.5px', textTransform: 'uppercase',
            }}
          >
            <Settings size={13} /> Ajustes
          </button>
          <button
            className="flex-1 flex items-center justify-center gap-1.5 transition-default"
            style={{
              padding: 8, fontSize: 11, color: 'var(--text-muted)',
              letterSpacing: '0.5px', textTransform: 'uppercase',
            }}
          >
            <Lock size={13} /> Privacidad
          </button>
        </div>

        <button
          onClick={onOpenPricing}
          className="flex items-center justify-center gap-2 w-full rounded-lg transition-default"
          style={{
            padding: '10px 14px',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-default)',
            color: 'var(--text-primary)',
            fontSize: 12, fontWeight: 500,
          }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-strong)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-default)')}
        >
          <Crown size={14} /> Upgrade a Premium
        </button>
      </div>
    </aside>
  );
};
