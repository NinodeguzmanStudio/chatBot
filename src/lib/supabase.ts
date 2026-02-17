// ═══════════════════════════════════════
// AIdark — Supabase Client (FIXED)
// ═══════════════════════════════════════

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// ══════════════════════════════════════════════════════════════════
// VALIDACIÓN: Verificar que las variables de entorno estén configuradas.
// "Invalid API key" ocurre cuando estas variables están vacías o mal puestas.
// ══════════════════════════════════════════════════════════════════
if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '[AIdark] ❌ Supabase NO configurado. Agrega estas variables de entorno:\n' +
    '  VITE_SUPABASE_URL=https://TU_PROYECTO.supabase.co\n' +
    '  VITE_SUPABASE_ANON_KEY=eyJ...\n\n' +
    '  → En desarrollo: crea un archivo .env.local en la raíz del proyecto\n' +
    '  → En Vercel: Settings → Environment Variables'
  );
}

if (supabaseAnonKey && supabaseAnonKey.length < 30) {
  console.error('[AIdark] ❌ VITE_SUPABASE_ANON_KEY parece inválida (muy corta). Verifica el valor.');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      // ══════════════════════════════════════════════════════════
      // PKCE explícito: Esto es el estándar de seguridad para
      // OAuth en apps SPA. Supabase v2 lo usa por defecto, pero
      // dejarlo explícito evita ambigüedad y asegura que el
      // flujo de Google OAuth use code exchange (no implicit).
      // ══════════════════════════════════════════════════════════
      flowType: 'pkce',
    },
  }
);

// ── Helper: Get current user ──
export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
}

// ── Helper: Get user profile ──
export async function getUserProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data;
}

// ── Helper: Increment message count ──
export async function incrementMessageCount(userId: string) {
  const { error } = await supabase.rpc('increment_message_count', {
    user_id: userId,
  });
  if (error) throw error;
}
