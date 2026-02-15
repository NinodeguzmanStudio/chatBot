// ═══════════════════════════════════════
// AIdark — Auth Modal (LOGIN/REGISTER)
// ═══════════════════════════════════════

import React, { useState } from 'react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/store';

interface AuthModalProps {
  onSuccess: () => void;
}

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
    if (!email || !password) { setError('Completa todos los campos'); return; }
    setLoading(true);
    setError('');

    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setError(authError.message === 'Invalid login credentials'
        ? 'Email o contraseña incorrectos'
        : authError.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      // Fetch profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (profile) {
        setUser(profile);
      }
      onSuccess();
    }
    setLoading(false);
  };

  const handleRegister = async () => {
    if (!email || !password || !confirmPassword) { setError('Completa todos los campos'); return; }
    if (password !== confirmPassword) { setError('Las contraseñas no coinciden'); return; }
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return; }

    setLoading(true);
    setError('');

    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      // Profile is auto-created by the trigger
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (profile) {
        setUser(profile);
        onSuccess();
      } else {
        setSuccess('Cuenta creada. Revisa tu email para confirmar.');
        setMode('login');
      }
    }
    setLoading(false);
  };

  const handleForgotPassword = async () => {
    if (!email) { setError('Ingresa tu email'); return; }
    setLoading(true);
    setError('');

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (resetError) {
      setError(resetError.message);
    } else {
      setSuccess('Email de recuperación enviado. Revisa tu bandeja.');
    }
    setLoading(false);
  };

  const handleSubmit = () => {
    if (mode === 'login') handleLogin();
    else if (mode === 'register') handleRegister();
    else handleForgotPassword();
  };

  const handleSkip = () => {
    // Allow using without auth (limited)
    onSuccess();
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-primary)', padding: 20,
    }}>
      <div style={{
        width: '100%', maxWidth: 380, animation: 'fadeUp 0.5s ease',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1 style={{ fontSize: 36, fontWeight: 500, color: 'var(--txt-ghost)', marginBottom: 4 }}>
            AI<span style={{ opacity: 0.6 }}>dark</span>
          </h1>
          <span style={{
            fontSize: 9, color: 'var(--txt-mut)', letterSpacing: 4, textTransform: 'uppercase',
          }}>
            sin censura
          </span>
        </div>

        {/* Form */}
        <div style={{
          background: 'var(--bg-surface)', border: '1px solid var(--border-sub)',
          borderRadius: 12, padding: 24,
        }}>
          <h2 style={{ fontSize: 16, fontWeight: 500, color: 'var(--txt-pri)', marginBottom: 20 }}>
            {mode === 'login' ? 'Iniciar sesión' : mode === 'register' ? 'Crear cuenta' : 'Recuperar contraseña'}
          </h2>

          {error && (
            <div style={{
              padding: '10px 12px', marginBottom: 16, borderRadius: 8,
              background: 'rgba(160,81,59,0.1)', border: '1px solid rgba(160,81,59,0.2)',
              color: 'var(--danger)', fontSize: 12,
            }}>
              {error}
            </div>
          )}

          {success && (
            <div style={{
              padding: '10px 12px', marginBottom: 16, borderRadius: 8,
              background: 'rgba(100,180,100,0.1)', border: '1px solid rgba(100,180,100,0.2)',
              color: '#6b8', fontSize: 12,
            }}>
              {success}
            </div>
          )}

          {/* Email */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, color: 'var(--txt-ter)', display: 'block', marginBottom: 6 }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
              placeholder="tu@email.com"
              style={{
                width: '100%', padding: '10px 12px', background: 'var(--bg-primary)',
                border: '1px solid var(--border-sub)', borderRadius: 8,
                color: 'var(--txt-pri)', fontSize: 13, fontFamily: 'inherit',
                transition: 'border-color 0.2s',
              }}
              onFocus={e => e.currentTarget.style.borderColor = 'var(--border-def)'}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--border-sub)'}
            />
          </div>

          {/* Password */}
          {mode !== 'forgot' && (
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, color: 'var(--txt-ter)', display: 'block', marginBottom: 6 }}>Contraseña</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
                  placeholder="Mínimo 6 caracteres"
                  style={{
                    width: '100%', padding: '10px 40px 10px 12px', background: 'var(--bg-primary)',
                    border: '1px solid var(--border-sub)', borderRadius: 8,
                    color: 'var(--txt-pri)', fontSize: 13, fontFamily: 'inherit',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={e => e.currentTarget.style.borderColor = 'var(--border-def)'}
                  onBlur={e => e.currentTarget.style.borderColor = 'var(--border-sub)'}
                />
                <button onClick={() => setShowPassword(!showPassword)} style={{
                  position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: 'var(--txt-mut)', cursor: 'pointer',
                  display: 'flex', padding: 4,
                }}>
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
          )}

          {/* Confirm Password */}
          {mode === 'register' && (
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, color: 'var(--txt-ter)', display: 'block', marginBottom: 6 }}>Confirmar contraseña</label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
                placeholder="Repite la contraseña"
                style={{
                  width: '100%', padding: '10px 12px', background: 'var(--bg-primary)',
                  border: '1px solid var(--border-sub)', borderRadius: 8,
                  color: 'var(--txt-pri)', fontSize: 13, fontFamily: 'inherit',
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => e.currentTarget.style.borderColor = 'var(--border-def)'}
                onBlur={e => e.currentTarget.style.borderColor = 'var(--border-sub)'}
              />
            </div>
          )}

          {/* Forgot password link */}
          {mode === 'login' && (
            <button onClick={() => { setMode('forgot'); setError(''); setSuccess(''); }} style={{
              background: 'none', border: 'none', color: 'var(--accent)',
              fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 16,
              display: 'block',
            }}>
              ¿Olvidaste tu contraseña?
            </button>
          )}

          {/* Submit */}
          <button onClick={handleSubmit} disabled={loading} style={{
            width: '100%', padding: '11px 16px',
            background: loading ? 'var(--bg-el)' : 'var(--accent)',
            border: 'none', borderRadius: 8,
            color: '#fff', fontSize: 13, fontWeight: 500,
            cursor: loading ? 'default' : 'pointer',
            fontFamily: 'inherit', transition: 'all 0.2s',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            {loading && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
            {mode === 'login' ? 'Entrar' : mode === 'register' ? 'Crear cuenta' : 'Enviar email'}
          </button>

          {/* Toggle mode */}
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            {mode === 'forgot' ? (
              <button onClick={() => { setMode('login'); setError(''); setSuccess(''); }} style={{
                background: 'none', border: 'none', color: 'var(--txt-sec)',
                fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
              }}>
                Volver al login
              </button>
            ) : (
              <span style={{ fontSize: 12, color: 'var(--txt-mut)' }}>
                {mode === 'login' ? '¿No tienes cuenta? ' : '¿Ya tienes cuenta? '}
                <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); setSuccess(''); }} style={{
                  background: 'none', border: 'none', color: 'var(--accent)',
                  fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
                }}>
                  {mode === 'login' ? 'Regístrate' : 'Inicia sesión'}
                </button>
              </span>
            )}
          </div>
        </div>

        {/* Skip auth */}
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <button onClick={handleSkip} style={{
            background: 'none', border: 'none', color: 'var(--txt-mut)',
            fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
            transition: 'color 0.12s',
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--txt-sec)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--txt-mut)'}
          >
            Probar sin cuenta (5 mensajes gratis)
          </button>
        </div>
      </div>
    </div>
  );
};
