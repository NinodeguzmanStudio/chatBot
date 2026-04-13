import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { LanguageSelector } from '@/components/chat/LanguageSelector';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/hooks/useLanguage';
import { trackEvent } from '@/lib/analytics';

export const ResetPasswordPage: React.FC = () => {
  const { t } = useLanguage();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let active = true;

    const syncRecoverySession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!active) return;
        if (session) {
          setReady(true);
          setError('');
          return;
        }
        setError(t('auth.reset_invalid'));
      } catch {
        if (active) setError(t('auth.reset_invalid'));
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === 'PASSWORD_RECOVERY' || !!session) {
        setReady(true);
        setError('');
      }
    });

    syncRecoverySession();

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [t]);

  const handleSubmit = async () => {
    if (!ready) {
      setError(t('auth.reset_invalid'));
      return;
    }
    if (!password || !confirmPassword) {
      setError(t('auth.fill_all'));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('auth.passwords_mismatch'));
      return;
    }
    if (password.length < 6) {
      setError(t('auth.password_min'));
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message);
      } else {
        void trackEvent('password_reset_completed', { source: 'reset_password_page' });
        setSuccess(t('auth.password_updated'));
        window.setTimeout(() => {
          window.location.href = '/';
        }, 1200);
      }
    } catch (err: any) {
      setError(err?.message || t('chat.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 380, animation: 'fadeUp 0.5s ease' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
          <LanguageSelector />
        </div>

        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1 style={{ fontSize: 36, fontWeight: 500, color: 'var(--txt-ghost)', marginBottom: 4 }}>AI<span style={{ opacity: 0.6 }}>dark</span></h1>
          <span style={{ fontSize: 9, color: 'var(--txt-mut)', letterSpacing: 4, textTransform: 'uppercase' }}>{t('auth.reset_ready')}</span>
        </div>

        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-sub)', borderRadius: 12, padding: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 500, color: 'var(--txt-pri)', marginBottom: 20 }}>
            {t('auth.forgot')}
          </h2>

          {error && <div style={{ padding: '10px 12px', marginBottom: 16, borderRadius: 8, background: 'rgba(160,81,59,0.1)', border: '1px solid rgba(160,81,59,0.2)', color: 'var(--danger)', fontSize: 12 }}>{error}</div>}
          {success && <div style={{ padding: '10px 12px', marginBottom: 16, borderRadius: 8, background: 'rgba(100,180,100,0.1)', border: '1px solid rgba(100,180,100,0.2)', color: '#6b8', fontSize: 12 }}>{success}</div>}

          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, color: 'var(--txt-ter)', display: 'block', marginBottom: 6 }}>{t('auth.new_password')}</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
              placeholder={t('auth.password_placeholder')}
              style={{ width: '100%', padding: '10px 12px', background: 'var(--bg-primary)', border: '1px solid var(--border-sub)', borderRadius: 8, color: 'var(--txt-pri)', fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, color: 'var(--txt-ter)', display: 'block', marginBottom: 6 }}>{t('auth.confirm_password')}</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
              placeholder={t('auth.confirm_placeholder')}
              style={{ width: '100%', padding: '10px 12px', background: 'var(--bg-primary)', border: '1px solid var(--border-sub)', borderRadius: 8, color: 'var(--txt-pri)', fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' }}
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading || !ready}
            style={{ width: '100%', padding: '11px 16px', background: loading || !ready ? 'var(--bg-el)' : 'var(--accent)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 500, cursor: loading || !ready ? 'default' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            {loading && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
            {t('auth.update_password')}
          </button>

          <a href="/" style={{ display: 'block', textAlign: 'center', marginTop: 16, color: 'var(--accent)', fontSize: 12, textDecoration: 'none' }}>
            {t('auth.back_home')}
          </a>
        </div>
      </div>
    </div>
  );
};
