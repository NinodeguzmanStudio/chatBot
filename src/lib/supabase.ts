// ═══════════════════════════════════════
// AIdark — Supabase Client (v3 — MANUAL FLOW)
// ═══════════════════════════════════════

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '[AIdark] ❌ Supabase NO configurado.\n' +
    '  VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY son requeridas.\n' +
    '  → Local: .env.local  |  → Producción: Vercel Environment Variables'
  );
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      // ══════════════════════════════════════════════════════════
      // CLAVE: detectSessionInUrl en FALSE.
      // Nosotros manejamos el ?code= manualmente en App.tsx.
      // Esto elimina el problema de timing donde el auto-detect
      // procesaba el code antes/después del listener y se perdía.
      // ══════════════════════════════════════════════════════════
      detectSessionInUrl: false,
      flowType: 'pkce',
    },
  }
);

// ── Helpers ──
export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
}

export async function getUserProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data;
}

export async function incrementMessageCount(userId: string) {
  const { error } = await supabase.rpc('increment_message_count', {
    user_id: userId,
  });
  if (error) throw error;
}
