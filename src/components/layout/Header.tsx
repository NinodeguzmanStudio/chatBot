// ═══════════════════════════════════════
// AIdark — Header (MOBILE OPTIMIZED)
// ═══════════════════════════════════════

import React from 'react';
import { PanelLeft, Plus, Star, Menu } from 'lucide-react';
import { useChatStore, useAuthStore } from '@/lib/store';
import { useIsMobile } from '@/hooks/useIsMobile';
import { LanguageSelector } from '@/components/chat/LanguageSelector';
import { t } from '@/lib/i18n';

interface HeaderProps { onOpenPricing: () => void; }

export const Header: React.FC<HeaderProps> = ({ onOpenPricing }) => {
  const { sidebarOpen, setSidebarOpen, createSession } = useChatStore();
  const { getRemainingMessages } = useAuthStore();
  const isMobile = useIsMobile();
  const remaining = getRemainingMessages();

  return (
    <div style={{
      height: 48, padding: '0 14px', display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', borderBottom: '1px solid var(--border-sub)',
      flexShrink: 0, background: 'var(--bg)', backdropFilter: 'blur(8px)',
    }}>
      {/* ── Left side ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {(!sidebarOpen || isMobile) && (
          <button onClick={() => setSidebarOpen(true)} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 34, height: 34, background: 'none', border: 'none',
            color: 'var(--txt-ter)', cursor: 'pointer', borderRadius: 6,
          }}>
            {isMobile ? <Menu size={18} /> : <PanelLeft size={18} />}
          </button>
        )}
        {!isMobile && !sidebarOpen && (
          <button onClick={() => createSession()} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 30, height: 30, background: 'none', border: 'none',
            color: 'var(--txt-ter)', cursor: 'pointer', borderRadius: 6,
          }}><Plus size={15} /></button>
        )}
        {/* En mobile: solo "AIdark". En desktop: "AIdark sincensura" */}
        <span style={{ fontSize: 15, fontWeight: 500, color: 'var(--txt-pri)', letterSpacing: -0.3 }}>
          AI<span style={{ color: 'var(--txt-ter)' }}>dark</span>
          {!isMobile && (
            <span style={{ fontSize: 13, color: 'var(--txt-mut)', fontWeight: 400, marginLeft: 2 }}>
              sincensura
            </span>
          )}
        </span>
      </div>

      {/* ── Right side ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* Msgs remaining — solo desktop */}
        {!isMobile && (
          <span style={{
            fontSize: 10, padding: '3px 8px', borderRadius: 10,
            background: remaining <= 2 ? 'rgba(160,81,59,0.1)' : 'var(--bg-el)',
            color: remaining <= 2 ? 'var(--danger)' : 'var(--txt-mut)',
          }}>
            {remaining >= 999 ? t('app.unlimited') : `${remaining}/5`} {t('app.today')}
          </span>
        )}
        {/* Language selector — solo desktop (en mobile va en Ajustes) */}
        {!isMobile && <LanguageSelector />}
        {/* Premium button — siempre visible */}
        <button onClick={onOpenPricing} style={{
          padding: '5px 12px', background: 'var(--bg-el)',
          border: '1px solid var(--border-sub)', borderRadius: 6,
          color: 'var(--txt-pri)', fontSize: 11, fontWeight: 500,
          cursor: 'pointer', display: 'flex', alignItems: 'center',
          gap: 5, fontFamily: 'inherit',
        }}>
          <Star size={12} /> {isMobile ? 'Pro' : t('header.premium')}
        </button>
        {/* Logout — SOLO desktop. En mobile va en Ajustes */}
        {/* ELIMINADO de aquí. Se movió a SettingsModal */}
      </div>
    </div>
  );
};
