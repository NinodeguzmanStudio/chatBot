import React, { useState } from 'react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/store';
import { LanguageSelector } from '@/components/chat/LanguageSelector';
import { t } from '@/lib/i18n';

interface AuthModalProps { onSuccess: () => void; }

export const AuthModal: React.FC<AuthModalProps> = ({ onSuccess }) => {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { setUser } = useAuthStore();

  const handleLogin = async () => {
    if (!email || !password) { setError(t('auth.fill_all')); return; }
    setLoading(true); setError('');
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) { setError(authError.message === 'Invalid login credentials' ? t('auth.wrong_credentials') : authError.message); setLoading(false); return; }
    if (data.user) {
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();
      if (profile) setUser(profile);
      onSuccess();
    }
    setLoading(false);
  };

  const handleRegister = async () => {
    if (!email || !password || !confirmPassword) { setError(t('auth.fill_all')); return; }
    if (password !== confirmPassword) { setError(t('auth.passwords_mismatch')); return; }
    if (password.length < 6) { setError(t('auth.password_min')); return; }
    setLoading(true); setError('');
    const { data, error: authError } = await supabase.auth.signUp({ email, password });
    if (authError) { setError(authError.message); setLoading(false); return; }
    if (data.user) {
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();
      if (profile) { setUser(profile); onSuccess(); }
      else { setSuccess(t('auth.account_created')); setMode('login'); }
    }
    setLoading(false);
  };

  const handleForgotPassword = async () => {
    if (!email) { setError(t('auth.enter_email')); return; }
    setLoading(true); setError('');
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
    if (resetError) setError(resetError.message);
    else setSuccess(t('auth.reset_sent'));
    setLoading(false);
  };

  const handleSubmit = () => { if (mode === 'login') handleLogin(); else if (mode === 'register') handleRegister(); else handleForgotPassword(); };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 380, animation: 'fadeUp 0.5s ease' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
          <LanguageSelector />
        </div>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1 style={{ fontSize: 36, fontWeight: 500, color: 'var(--txt-ghost)', marginBottom: 4 }}>AI<span style={{ opacity: 0.6 }}>dark</span></h1>
          <span style={{ fontSize: 9, color: 'var(--txt-mut)', letterSpacing: 4, textTransform: 'uppercase' }}>{t('app.tagline')}</span>
        </div>
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-sub)', borderRadius: 12, padding: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 500, color: 'var(--txt-pri)', marginBottom: 20 }}>
            {mode === 'login' ? t('auth.login') : mode === 'register' ? t('auth.register') : t('auth.forgot')}
          </h2>
          {error && <div style={{ padding: '10px 12px', marginBottom: 16, borderRadius: 8, background: 'rgba(160,81,59,0.1)', border: '1px solid rgba(160,81,59,0.2)', color: 'var(--danger)', fontSize: 12 }}>{error}</div>}
          {success && <div style={{ padding: '10px 12px', marginBottom: 16, borderRadius: 8, background: 'rgba(100,180,100,0.1)', border: '1px solid rgba(100,180,100,0.2)', color: '#6b8', fontSize: 12 }}>{success}</div>}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, color: 'var(--txt-ter)', display: 'block', marginBottom: 6 }}>{t('auth.email')}</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }} placeholder={t('auth.email_placeholder')} style={{ width: '100%', padding: '10px 12px', background: 'var(--bg-primary)', border: '1px solid var(--border-sub)', borderRadius: 8, color: 'var(--txt-pri)', fontSize: 13, fontFamily: 'inherit' }} />
          </div>
          {mode !== 'forgot' && (
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, color: 'var(--txt-ter)', display: 'block', marginBottom: 6 }}>{t('auth.password')}</label>
              <div style={{ position: 'relative' }}>
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }} placeholder={t('auth.password_placeholder')} style={{ width: '100%', padding: '10px 40px 10px 12px', background: 'var(--bg-primary)', border: '1px solid var(--border-sub)', borderRadius: 8, color: 'var(--txt-pri)', fontSize: 13, fontFamily: 'inherit' }} />
                <button onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--txt-mut)', cursor: 'pointer', display: 'flex', padding: 4 }}>{showPassword ? <EyeOff size={14} /> : <Eye size={14} />}</button>
              </div>
            </div>
          )}
          {mode === 'register' && (
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, color: 'var(--txt-ter)', display: 'block', marginBottom: 6 }}>{t('auth.confirm_password')}</label>
              <input type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }} placeholder={t('auth.confirm_placeholder')} style={{ width: '100%', padding: '10px 12px', background: 'var(--bg-primary)', border: '1px solid var(--border-sub)', borderRadius: 8, color: 'var(--txt-pri)', fontSize: 13, fontFamily: 'inherit' }} />
            </div>
          )}
          {mode === 'login' && <button onClick={() => { setMode('forgot'); setError(''); setSuccess(''); }} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 16, display: 'block' }}>{t('auth.forgot_link')}</button>}
          <button onClick={handleSubmit} disabled={loading} style={{ width: '100%', padding: '11px 16px', background: loading ? 'var(--bg-el)' : 'var(--accent)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 500, cursor: loading ? 'default' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {loading && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
            {mode === 'login' ? t('auth.enter') : mode === 'register' ? t('auth.create') : t('auth.send_email')}
          </button>
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            {mode === 'forgot' ? (
              <button onClick={() => { setMode('login'); setError(''); setSuccess(''); }} style={{ background: 'none', border: 'none', color: 'var(--txt-sec)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>{t('auth.back_login')}</button>
            ) : (
              <span style={{ fontSize: 12, color: 'var(--txt-mut)' }}>
                {mode === 'login' ? t('auth.no_account') + ' ' : t('auth.has_account') + ' '}
                <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); setSuccess(''); }} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>{mode === 'login' ? t('auth.register_link') : t('auth.login_link')}</button>
              </span>
            )}
          </div>
        </div>
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <button onClick={() => onSuccess()} style={{ background: 'none', border: 'none', color: 'var(--txt-mut)', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>{t('auth.skip')}</button>
        </div>
      </div>
    </div>
  );
};
