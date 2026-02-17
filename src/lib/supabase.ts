// ═══════════════════════════════════════
// AIdark — Supabase Client (v4 — IMPLICIT FLOW)
// ═══════════════════════════════════════

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '[AIdark] ❌ Supabase NO configurado.\n' +
    '  VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY son requeridas.'
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
      // IMPLICIT FLOW: El token viene directo en el hash (#)
      // de la URL, sin necesidad de code exchange ni PKCE.
      // Esto elimina el error "code challenge does not match
      // previously saved code verifier".
      //
      // detectSessionInUrl: true → Supabase lee el #access_token
      // automáticamente al cargar la página. No hay race condition
      // porque no hay exchange asíncrono — el token ya está ahí.
      // ══════════════════════════════════════════════════════════
      detectSessionInUrl: true,
      flowType: 'implicit',
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
