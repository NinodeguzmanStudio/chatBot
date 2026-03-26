// ═══════════════════════════════════════
// AIdark — useReferral Hook
// src/hooks/useReferral.ts
// Captura ?ref=CODE de la URL y lo guarda en localStorage.
// Provee funciones para aplicar código y obtener el código propio.
// ═══════════════════════════════════════

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const REF_KEY = 'aidark_ref_code';

// Capturar ?ref= de la URL al cargar
export function captureReferralFromURL(): void {
  try {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref && ref.length >= 4) {
      localStorage.setItem(REF_KEY, ref.trim().toUpperCase());
      // Limpiar URL sin recargar
      const url = new URL(window.location.href);
      url.searchParams.delete('ref');
      window.history.replaceState({}, '', url.pathname + url.search);
    }
  } catch { /* silencioso */ }
}

// Obtener código pendiente de aplicar
export function getPendingReferral(): string | null {
  return localStorage.getItem(REF_KEY);
}

// Limpiar después de aplicar
export function clearPendingReferral(): void {
  localStorage.removeItem(REF_KEY);
}

// Hook para usar en componentes
export function useReferral() {
  const [myCode, setMyCode]       = useState<string | null>(null);
  const [usesLeft, setUsesLeft]   = useState(3);
  const [loading, setLoading]     = useState(false);
  const [isPremium, setIsPremium] = useState(false);

  const fetchMyCode = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const res = await fetch('/api/referral', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMyCode(data.code);
        setUsesLeft(data.remaining);
        setIsPremium(data.isPremium);
      }
    } catch { /* silencioso */ }
  };

  const applyReferral = async (code: string): Promise<{ success: boolean; message: string }> => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return { success: false, message: 'Sesión expirada.' };

      const res = await fetch('/api/referral', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ code }),
      });

      const data = await res.json();
      if (res.ok) {
        clearPendingReferral();
        return { success: true, message: data.message };
      }
      return { success: false, message: data.error || 'Error aplicando código.' };
    } catch {
      return { success: false, message: 'Error de conexión.' };
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMyCode(); }, []);

  return { myCode, usesLeft, isPremium, loading, fetchMyCode, applyReferral };
}
