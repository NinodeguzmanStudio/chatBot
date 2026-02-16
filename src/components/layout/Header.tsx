import React from 'react';
import { PanelLeft, Plus, Star, Menu, LogOut } from 'lucide-react';
import { useChatStore, useAuthStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { useIsMobile } from '@/hooks/useIsMobile';
import { LanguageSelector } from '@/components/chat/LanguageSelector';
import { t } from '@/lib/i18n';

interface HeaderProps { onOpenPricing: () => void; }

export const Header: React.FC<HeaderProps> = ({ onOpenPricing }) => {
  const { sidebarOpen, setSidebarOpen, createSession } = useChatStore();
  const { getRemainingMessages, user, setUser } = useAuthStore();
  const isMobile = useIsMobile();
  const remaining = getRemainingMessages();

  const handleLogout = async () => { await supabase.auth.signOut(); setUser(null); };

  return (
    <div style={{ height: 48, padding: '0 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-sub)', flexShrink: 0, background: 'var(--bg)', backdropFilter: 'blur(8px)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {(!sidebarOpen || isMobile) && (
          <button onClick={() => setSidebarOpen(true)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, background: 'none', border: 'none', color: 'var(--txt-ter)', cursor: 'pointer', borderRadius: 6 }}>
            {isMobile ? <Menu size={18} /> : <PanelLeft size={18} />}
          </button>
        )}
        {!isMobile && !sidebarOpen && (
          <button onClick={() => createSession()} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, background: 'none', border: 'none', color: 'var(--txt-ter)', cursor: 'pointer', borderRadius: 6 }}><Plus size={15} /></button>
        )}
        <span style={{ fontSize: 15, fontWeight: 500, color: 'var(--txt-pri)', letterSpacing: -0.3 }}>AI<span style={{ color: 'var(--txt-ter)' }}>dark</span></span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {!isMobile && (
          <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 10, background: remaining <= 2 ? 'rgba(160,81,59,0.1)' : 'var(--bg-el)', color: remaining <= 2 ? 'var(--danger)' : 'var(--txt-mut)' }}>
            {remaining >= 999 ? t('app.unlimited') : `${remaining}/5`} {t('app.today')}
          </span>
        )}
        <LanguageSelector />
        <button onClick={onOpenPricing} style={{ padding: isMobile ? '5px 10px' : '5px 12px', background: 'var(--bg-el)', border: '1px solid var(--border-sub)', borderRadius: 6, color: 'var(--txt-pri)', fontSize: 11, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'inherit' }}>
          <Star size={12} /> {isMobile ? t('header.pro') : t('header.premium')}
        </button>
        {user && (
          <button onClick={handleLogout} title={t('header.logout')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, background: 'none', border: 'none', color: 'var(--txt-mut)', cursor: 'pointer', borderRadius: 6 }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--danger)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--txt-mut)'}><LogOut size={14} /></button>
        )}
      </div>
    </div>
  );
};
