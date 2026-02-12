// ═══════════════════════════════════════
// AIdark — Supabase Client
// ═══════════════════════════════════════
// Docs: https://supabase.com/docs/reference/javascript

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[AIdark] Supabase no configurado. Agrega VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY a .env.local'
  );
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
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
