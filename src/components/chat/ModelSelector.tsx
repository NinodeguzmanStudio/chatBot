// ═══════════════════════════════════════
// AIdark — Model Selector Component
// ═══════════════════════════════════════

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { useChatStore } from '@/lib/store';
import { MODELS } from '@/lib/constants';

export const ModelSelector: React.FC = () => {
  const { selectedModel, setSelectedModel } = useChatStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const model = MODELS.find((m) => m.id === selectedModel) || MODELS[0];

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 transition-default"
        style={{
          padding: '6px 12px',
          border: '1px solid var(--border-default)',
          borderRadius: 20,
          color: 'var(--text-secondary)',
          fontSize: 13, fontWeight: 500,
        }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-strong)')}
        onMouseLeave={e => { if (!open) e.currentTarget.style.borderColor = 'var(--border-default)'; }}
      >
        <span style={{ color: 'var(--text-primary)' }}>{model.name}</span>
        <ChevronDown size={14} />
      </button>

      {open && (
        <div
          className="animate-fade-in"
          style={{
            position: 'absolute',
            bottom: '100%',
            left: 0,
            marginBottom: 8,
            width: 260,
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-default)',
            borderRadius: 10,
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            overflow: 'hidden',
            zIndex: 100,
          }}
        >
          {MODELS.map((m) => (
            <button
              key={m.id}
              onClick={() => { setSelectedModel(m.id); setOpen(false); }}
              className="flex flex-col gap-0.5 w-full transition-default"
              style={{
                padding: '12px 16px',
                background: selectedModel === m.id ? 'var(--bg-hover)' : 'transparent',
                borderBottom: '1px solid var(--border-subtle)',
                textAlign: 'left',
              }}
              onMouseEnter={e => {
                if (selectedModel !== m.id) e.currentTarget.style.background = 'var(--bg-hover)';
              }}
              onMouseLeave={e => {
                if (selectedModel !== m.id) e.currentTarget.style.background = 'transparent';
              }}
            >
              <span style={{
                fontSize: 13, fontWeight: 500,
                color: selectedModel === m.id ? 'var(--text-primary)' : 'var(--text-secondary)',
              }}>
                {m.name}
                {m.primary && (
                  <span style={{
                    fontSize: 9, color: 'var(--danger)',
                    marginLeft: 8, letterSpacing: '1px',
                    textTransform: 'uppercase',
                  }}>
                    principal
                  </span>
                )}
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {m.description}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
