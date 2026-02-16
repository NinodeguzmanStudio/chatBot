// ═══════════════════════════════════════
// AIdark — Language Selector (Compact)
// ═══════════════════════════════════════

import React, { useState, useRef, useEffect } from 'react';
import { Globe } from 'lucide-react';
import { getLang, setLang, LANG_OPTIONS, type Lang } from '@/lib/i18n';

export const LanguageSelector: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<Lang>(getLang());
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  const handleSelect = (lang: Lang) => {
    setLang(lang);
    setCurrent(lang);
    setOpen(false);
    // Force re-render entire app
    window.location.reload();
  };

  const currentOpt = LANG_OPTIONS.find((o) => o.id === current) || LANG_OPTIONS[0];

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '5px 10px', border: '1px solid var(--border-sub)', borderRadius: 6,
          background: 'transparent', cursor: 'pointer', fontFamily: 'inherit',
          transition: 'all 0.12s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--border-def)')}
        onMouseLeave={(e) => {
          if (!open) e.currentTarget.style.borderColor = 'var(--border-sub)';
        }}
      >
        <span style={{ fontSize: 13 }}>{currentOpt.flag}</span>
        <span style={{ fontSize: 11, color: 'var(--txt-sec)' }}>{currentOpt.id.toUpperCase()}</span>
      </button>
      {open && (
        <div
          style={{
            position: 'absolute', right: 0, top: '100%', marginTop: 4,
            width: 150, background: 'var(--bg-el)', border: '1px solid var(--border-def)',
            borderRadius: 8, boxShadow: '0 6px 20px rgba(0,0,0,0.4)',
            overflow: 'hidden', zIndex: 200, animation: 'fadeUp 0.12s ease',
          }}
        >
          {LANG_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => handleSelect(opt.id)}
              style={{
                width: '100%', padding: '9px 12px',
                display: 'flex', alignItems: 'center', gap: 8,
                background: current === opt.id ? 'var(--bg-hover)' : 'transparent',
                border: 'none', borderBottom: '1px solid var(--border-sub)',
                cursor: 'pointer', fontFamily: 'inherit', transition: 'background 0.1s',
              }}
              onMouseEnter={(e) => {
                if (current !== opt.id) e.currentTarget.style.background = 'var(--bg-hover)';
              }}
              onMouseLeave={(e) => {
                if (current !== opt.id) e.currentTarget.style.background = 'transparent';
              }}
            >
              <span style={{ fontSize: 15 }}>{opt.flag}</span>
              <span
                style={{
                  fontSize: 12,
                  color: current === opt.id ? 'var(--txt-pri)' : 'var(--txt-sec)',
                  fontWeight: current === opt.id ? 500 : 400,
                }}
              >
                {opt.label}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
