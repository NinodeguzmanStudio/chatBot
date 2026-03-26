// ═══════════════════════════════════════
// AIdark — Admin API v2
// api/admin.ts
// ═══════════════════════════════════════
// CAMBIOS v2:
//   [1] Nuevo: activeUsers — lista de usuarios activos con email,
//       plan, último acceso y mensajes usados
//   [2] onlineNow muestra usuarios reales (no solo count)
// ═══════════════════════════════════════

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL         = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const ADMIN_EMAILS = new Set([
  'ninodeguzmanstudio@gmail.com',
]);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No autorizado.' });
  }
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return res.status(401).json({ error: 'Sesión inválida.' });
  }
  if (!ADMIN_EMAILS.has(user.email || '')) {
    return res.status(403).json({ error: 'Acceso denegado.' });
  }

  try {
    const now = new Date();
    const today     = now.toISOString().slice(0, 10);
    const weekAgo   = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const monthAgo  = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const fifteenMinAgo = new Date(now.getTime() - 15 * 60 * 1000).toISOString();

    // ── 1. Totales de usuarios ──
    const { count: totalUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    const { count: premiumUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .neq('plan', 'free');

    const { count: freeUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('plan', 'free');

    const { count: newUsersWeek } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', weekAgo);

    // ── 2. Revenue ──
    const { data: allPayments } = await supabase
      .from('payments')
      .select('amount, currency, amount_usd, created_at, plan_id, email')
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(100);

    const totalRevenue    = (allPayments || []).reduce((s, p) => s + (p.amount_usd || p.amount || 0), 0);
    const monthPayments   = (allPayments || []).filter(p => p.created_at >= monthAgo);
    const monthRevenue    = monthPayments.reduce((s, p) => s + (p.amount_usd || p.amount || 0), 0);
    const recentPayments  = (allPayments || []).slice(0, 10);

    // ── 3. Actividad ──
    const { count: activeToday } = await supabase
      .from('chat_sessions')
      .select('user_id', { count: 'exact', head: true })
      .gte('updated_at', today + 'T00:00:00Z');

    // ═══════════════════════════════════════
    // FIX [1]: Usuarios activos CON EMAIL
    // Obtiene los user_ids de sesiones recientes (hoy)
    // y cruza con profiles para obtener email y plan
    // ═══════════════════════════════════════
    const { data: activeSessions } = await supabase
      .from('chat_sessions')
      .select('user_id, updated_at')
      .gte('updated_at', today + 'T00:00:00Z')
      .order('updated_at', { ascending: false })
      .limit(200);

    // Deduplicar por user_id, quedarnos con el más reciente
    const uniqueActiveMap = new Map<string, string>();
    for (const s of (activeSessions || [])) {
      if (!uniqueActiveMap.has(s.user_id)) {
        uniqueActiveMap.set(s.user_id, s.updated_at);
      }
    }
    const activeUserIds = Array.from(uniqueActiveMap.keys());

    // Obtener perfiles de usuarios activos
    let activeUsersList: any[] = [];
    if (activeUserIds.length > 0) {
      const { data: activeProfiles } = await supabase
        .from('profiles')
        .select('id, email, plan, messages_used, images_today, created_at')
        .in('id', activeUserIds);

      activeUsersList = (activeProfiles || []).map(p => ({
        email: p.email,
        plan: p.plan,
        messages_used: p.messages_used || 0,
        images_today: p.images_today || 0,
        last_active: uniqueActiveMap.get(p.id) || null,
        is_online: uniqueActiveMap.get(p.id)! >= fifteenMinAgo, // activo en últimos 15 min
        registered: p.created_at,
      })).sort((a, b) => {
        // Online primero, después por última actividad
        if (a.is_online && !b.is_online) return -1;
        if (!a.is_online && b.is_online) return 1;
        return (b.last_active || '').localeCompare(a.last_active || '');
      });
    }

    const onlineCount = activeUsersList.filter(u => u.is_online).length;

    // ── 4. Mensajes recientes ──
    const { data: recentMessages } = await supabase
      .from('messages')
      .select('content, role, created_at, session_id')
      .eq('role', 'user')
      .order('created_at', { ascending: false })
      .limit(50);

    const wordCounts: Record<string, number> = {};
    const stopWords = new Set(['de', 'la', 'el', 'en', 'un', 'una', 'que', 'es', 'y', 'a', 'los', 'las', 'del', 'por', 'con', 'para', 'se', 'no', 'me', 'mi', 'lo', 'al', 'le', 'su', 'como', 'más', 'pero', 'si', 'ya', 'o', 'este', 'ser', 'también', 'fue', 'ha', 'yo', 'eso', 'todo', 'esta', 'son', 'dos', 'hay', 'bien', 'muy', 'sin', 'sobre', 'uno', 'vez', 'the', 'is', 'a', 'to', 'and', 'of', 'in', 'it', 'i', 'you', 'he', 'she', 'we', 'they', 'my', 'your', 'can', 'do', 'would', 'should', 'could', 'will', 'has', 'have', 'had', 'was', 'were', 'be', 'been', 'are', 'am', 'an', 'at', 'or', 'if', 'not', 'this', 'that', 'with', 'from', 'but', 'what', 'how', 'who', 'which', 'when', 'where', 'all', 'some', 'any', 'each']);

    for (const msg of (recentMessages || [])) {
      const words = (msg.content || '')
        .toLowerCase()
        .replace(/[^a-záéíóúñü\s]/g, '')
        .split(/\s+/)
        .filter((w: string) => w.length > 3 && !stopWords.has(w));
      for (const w of words) {
        wordCounts[w] = (wordCounts[w] || 0) + 1;
      }
    }
    const topTopics = Object.entries(wordCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([word, count]) => ({ word, count }));

    // ── 5. Planes breakdown ──
    const { data: planBreakdown } = await supabase
      .from('profiles')
      .select('plan')
      .not('plan', 'is', null);

    const planCounts: Record<string, number> = {};
    for (const p of (planBreakdown || [])) {
      planCounts[p.plan] = (planCounts[p.plan] || 0) + 1;
    }

    // ── 6. Imágenes hoy ──
    const { data: imgUsers } = await supabase
      .from('profiles')
      .select('images_today, images_date')
      .gte('images_date', today)
      .gt('images_today', 0);

    const totalImagestoday = (imgUsers || []).reduce((s, u) => s + (u.images_today || 0), 0);

    return res.status(200).json({
      overview: {
        totalUsers:     totalUsers || 0,
        premiumUsers:   premiumUsers || 0,
        freeUsers:      freeUsers || 0,
        newUsersWeek:   newUsersWeek || 0,
        onlineNow:      onlineCount,
        activeToday:    activeToday || 0,
        imagesToday:    totalImagestoday,
      },
      revenue: {
        total:          Math.round(totalRevenue * 100) / 100,
        thisMonth:      Math.round(monthRevenue * 100) / 100,
        paymentsCount:  (allPayments || []).length,
        recentPayments,
      },
      // FIX [1]: Lista de usuarios activos con email
      activeUsers: activeUsersList,
      plans: planCounts,
      topics: topTopics,
      recentMessages: (recentMessages || []).slice(0, 20).map(m => ({
        content: m.content?.slice(0, 120) + (m.content?.length > 120 ? '...' : ''),
        created_at: m.created_at,
      })),
      generatedAt: now.toISOString(),
    });

  } catch (err) {
    console.error('[Admin] Error:', err);
    return res.status(500).json({ error: 'Error obteniendo métricas.' });
  }
}
