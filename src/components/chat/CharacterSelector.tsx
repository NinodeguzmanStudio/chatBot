// ═══════════════════════════════════════
// AIdark — Character Selector (FIXED)
// ═══════════════════════════════════════

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Lock } from 'lucide-react';
import { useChatStore, useAuthStore } from '@/lib/store';
import { AI_CHARACTERS } from '@/lib/constants';

export const CharacterSelector: React.FC = () => {
  const { selectedCharacter, setSelectedCharacter } = useChatStore();
  const { user } = useAuthStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const char = AI_CHARACTERS.find((c) => c.id === selectedCharacter) || AI_CHARACTERS[0];
  const isPremium = user?.plan && user.plan !== 'free';

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
        background: 'transparent', fontSize: 12,
        cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-def)'}
      onMouseLeave={e => { if (!open) e.currentTarget.style.borderColor = 'var(--border-sub)'; }}
      >
        <span style={{
          width: 18, height: 18, borderRadius: '50%',
          background: char.color + '22', border: `1px solid ${char.color}44`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 9, fontWeight: 700, color: char.color,
        }}>
          {char.avatar}
        </span>
        <span style={{ color: char.color, fontSize: 12 }}>{char.name}</span>
        <span style={{ transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0)', display: 'flex', color: 'var(--txt-mut)' }}>
          <ChevronDown size={12} />
        </span>
      </button>
      {open && (
        <div style={{
          position: 'absolute', bottom: '100%', left: 0, marginBottom: 6,
          width: 260, background: 'var(--bg-el)', border: '1px solid var(--border-def)',
          borderRadius: 10, boxShadow: '0 8px 28px rgba(0,0,0,0.5)',
          overflow: 'hidden', zIndex: 100, animation: 'slideUp 0.15s ease',
        }}>
          {AI_CHARACTERS.map((c) => {
            const locked = c.premium && !isPremium;
            return (
              <button key={c.id}
                onClick={() => { if (!locked) { setSelectedCharacter(c.id); setOpen(false); } }}
                style={{
                  width: '100%', padding: '10px 14px',
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: selectedCharacter === c.id ? 'var(--bg-hover)' : 'transparent',
                  border: 'none', borderBottom: '1px solid var(--border-sub)',
                  textAlign: 'left', cursor: locked ? 'not-allowed' : 'pointer',
                  opacity: locked ? 0.5 : 1,
                  transition: 'background 0.12s', fontFamily: 'inherit',
                }}
                onMouseEnter={e => { if (!locked && selectedCharacter !== c.id) e.currentTarget.style.background = 'var(--bg-hover)'; }}
                onMouseLeave={e => { if (selectedCharacter !== c.id) e.currentTarget.style.background = 'transparent'; }}
              >
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: c.color + '22', border: `1.5px solid ${c.color}44`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700, color: c.color, flexShrink: 0,
                }}>
                  {c.avatar}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 500, color: selectedCharacter === c.id ? 'var(--txt-pri)' : 'var(--txt-sec)' }}>
                      {c.name}
                    </span>
                    {locked && <Lock size={10} color="var(--txt-mut)" />}
                  </div>
                  <span style={{ fontSize: 10, color: 'var(--txt-mut)' }}>{c.role}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
