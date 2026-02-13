// ═══════════════════════════════════════
// AIdark — Model Selector v4
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

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    if (open) document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(!open)} style={{
        display: 'flex', alignItems: 'center', gap: 5,
        padding: '5px 10px', border: '1px solid var(--border-sub)', borderRadius: 16,
        background: 'transparent', color: 'var(--txt-sec)', fontSize: 12,
        cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-def)'}
      onMouseLeave={e => { if (!open) e.currentTarget.style.borderColor = 'var(--border-sub)'; }}
      >
        <span style={{ color: 'var(--txt-pri)', fontSize: 12 }}>{model.name}</span>
        <span style={{ transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0)', display: 'flex' }}>
          <ChevronDown size={12} />
        </span>
      </button>
      {open && (
        <div style={{
          position: 'absolute', bottom: '100%', left: 0, marginBottom: 6,
          width: 240, background: 'var(--bg-el)', border: '1px solid var(--border-def)',
          borderRadius: 10, boxShadow: '0 8px 28px rgba(0,0,0,0.5)',
          overflow: 'hidden', zIndex: 100, animation: 'slideUp 0.15s ease',
        }}>
          {MODELS.map((m) => (
            <button key={m.id} onClick={() => { setSelectedModel(m.id); setOpen(false); }} style={{
              width: '100%', padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 2,
              background: selectedModel === m.id ? 'var(--bg-hover)' : 'transparent',
              border: 'none', borderBottom: '1px solid var(--border-sub)',
              textAlign: 'left', cursor: 'pointer', transition: 'background 0.12s', fontFamily: 'inherit',
            }}
            onMouseEnter={e => { if (selectedModel !== m.id) e.currentTarget.style.background = 'var(--bg-hover)'; }}
            onMouseLeave={e => { if (selectedModel !== m.id) e.currentTarget.style.background = 'transparent'; }}
            >
              <span style={{ fontSize: 12, fontWeight: 500, color: selectedModel === m.id ? 'var(--txt-pri)' : 'var(--txt-sec)' }}>
                {m.name}
              </span>
              <span style={{ fontSize: 10, color: 'var(--txt-mut)' }}>{m.description}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
