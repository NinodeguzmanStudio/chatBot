// ═══════════════════════════════════════
// AIdark — Supabase Client (v5 — PKCE FLOW)
// src/lib/supabase.ts
// ═══════════════════════════════════════
// CAMBIOS v5:
//   [1] Migrado de implicit → PKCE flow
//       PKCE usa code exchange (más robusto que hash tokens)
//       La sesión persiste correctamente en localStorage
//       Elimina desconexiones al cerrar/reabrir pestaña
//   [2] autoRefreshToken: true mantiene sesión viva en background
//   [3] storageKey explícito para evitar conflictos
//
// ⚠️  REQUISITO EN SUPABASE DASHBOARD:
//     Authentication → URL Configuration:
//     - Site URL: https://aidark.es (tu dominio)
//     - Redirect URLs: https://aidark.es (agregar también localhost para dev)
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
      storageKey: 'aidark-auth',
      // ══════════════════════════════════════════════════════════
      // PKCE FLOW (v5): Más seguro y confiable que implicit.
      // El token se intercambia via ?code= en la URL (no hash).
      // Supabase maneja el code exchange automáticamente.
      //
      // Para que funcione correctamente:
      // 1. En Supabase Dashboard → Authentication → URL Configuration
      //    - Site URL: https://aidark.es
      //    - Redirect URLs: https://aidark.es, http://localhost:5173
      // 2. El code verifier se guarda en localStorage automáticamente
      //    por lo que la sesión sobrevive al cerrar la pestaña.
      //
      // Esto elimina las desconexiones al salir/volver porque
      // PKCE no depende del hash de la URL para persistir.
      // ══════════════════════════════════════════════════════════
      detectSessionInUrl: true,
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
    p_user_id: userId,
  });
  if (error) throw error;
}
