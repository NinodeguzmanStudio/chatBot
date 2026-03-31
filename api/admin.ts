// ═══════════════════════════════════════
// AIdark — Admin API v4
// api/admin.ts
// ═══════════════════════════════════════
// CAMBIOS v4:
//   [1] Chat logs lee de message_logs (permanentes, no se borran)
//   [2] POST: inyectar mensaje como AIdark en sesión de usuario
//   [3] Todo lo de v3 se mantiene
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
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // ── Auth (compartido GET y POST) ──
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

  // ═══════════════════════════════════════
  // POST: Inyectar mensaje como AIdark
  // Body: { session_id, user_id, content }
  // ═══════════════════════════════════════
  if (req.method === 'POST') {
    const { action } = req.body || {};

    if (action === 'inject_message') {
      const { session_id, user_id, content } = req.body;
      if (!session_id || !user_id || !content?.trim()) {
        return res.status(400).json({ error: 'Faltan campos: session_id, user_id, content.' });
      }

      try {
        const msgId = crypto.randomUUID();

        // 1. Insertar en messages (el usuario lo verá en su chat)
        const { error: msgErr } = await supabase
          .from('messages')
          .insert({
            id: msgId,
            session_id,
            user_id,
            role: 'assistant',
            content: content.trim(),
            model: 'admin',
            character: 'default',
          });

        if (msgErr) {
          console.error('[Admin] Error insertando mensaje:', msgErr);
          return res.status(500).json({ error: 'Error insertando mensaje.' });
        }

        // 2. Marcar en message_logs como admin_inject (el trigger ya copia,
        //    pero actualizamos el flag)
        await supabase
          .from('message_logs')
          .update({ is_admin_inject: true })
          .eq('original_id', msgId);

        // 3. Actualizar updated_at de la sesión para que aparezca arriba
        await supabase
          .from('chat_sessions')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', session_id);

        console.log(`[Admin] ✅ Mensaje inyectado en sesión ${session_id} por admin`);
        return res.status(200).json({ success: true, message_id: msgId });
      } catch (err) {
        console.error('[Admin] Error inject:', err);
        return res.status(500).json({ error: 'Error inyectando mensaje.' });
      }
    }

    if (action === 'add_watchlist') {
      const { email } = req.body;
      if (!email?.trim()) return res.status(400).json({ error: 'Falta email.' });

      try {
        // Buscar user_id del email
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', email.trim().toLowerCase())
          .single();

        const { error: wErr } = await supabase.from('admin_watchlist').upsert({
          email: email.trim().toLowerCase(),
          user_id: profile?.id || null,
        }, { onConflict: 'email' });

        if (wErr) return res.status(500).json({ error: wErr.message });
        return res.status(200).json({ success: true });
      } catch (err) {
        return res.status(500).json({ error: 'Error agregando a watchlist.' });
      }
    }

    if (action === 'remove_watchlist') {
      const { email } = req.body;
      if (!email?.trim()) return res.status(400).json({ error: 'Falta email.' });

      await supabase.from('admin_watchlist').delete().eq('email', email.trim().toLowerCase());
      return res.status(200).json({ success: true });
    }

    if (action === 'get_watchlist') {
      const { data: watchlist } = await supabase
        .from('admin_watchlist')
        .select('email, user_id, added_at, notes')
        .order('added_at', { ascending: false });

      // Enrich with last_seen and online status
      const enriched = [];
      for (const w of (watchlist || [])) {
        if (w.user_id) {
          const { data: p } = await supabase
            .from('profiles')
            .select('plan, last_seen, messages_used')
            .eq('id', w.user_id)
            .single();

          const lastSeen = p?.last_seen ? new Date(p.last_seen) : null;
          const isOnline = lastSeen ? (Date.now() - lastSeen.getTime()) < 3 * 60 * 1000 : false;

          enriched.push({
            ...w,
            plan: p?.plan || 'free',
            last_seen: p?.last_seen,
            is_online: isOnline,
            messages_used: p?.messages_used || 0,
          });
        } else {
          enriched.push({ ...w, plan: 'unknown', last_seen: null, is_online: false, messages_used: 0 });
        }
      }

      return res.status(200).json({ watchlist: enriched });
    }

    return res.status(400).json({ error: 'Acción POST no reconocida.' });
  }

  // ═══════════════════════════════════════
  // GET: ?action=chat_logs&email=xxx
  // Lee de message_logs (permanente, incluye borrados)
  // ═══════════════════════════════════════
  const action = req.query.action as string | undefined;
  if (action === 'chat_logs') {
    const email = (req.query.email as string || '').trim().toLowerCase();
    if (!email) return res.status(400).json({ error: 'Falta parámetro email.' });

    try {
      // 1. Buscar usuario por email
      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('id, email, plan, messages_used, created_at')
        .eq('email', email)
        .single();

      if (profileErr || !profile) {
        return res.status(404).json({ error: 'Usuario no encontrado con ese email.' });
      }

      // 2. Obtener sesiones únicas de message_logs (incluye sesiones borradas)
      const { data: logSessions } = await supabase
        .from('message_logs')
        .select('session_id')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(500);

      // Deduplicar session_ids
      const uniqueSessionIds = [...new Set((logSessions || []).map(l => l.session_id).filter(Boolean))].slice(0, 20);

      if (uniqueSessionIds.length === 0) {
        return res.status(200).json({
          found: true,
          user: { id: profile.id, email: profile.email, plan: profile.plan, messages_used: profile.messages_used, registered: profile.created_at },
          sessions: [],
        });
      }

      // 3. Intentar obtener títulos de chat_sessions (puede no existir si se borró)
      const { data: sessions } = await supabase
        .from('chat_sessions')
        .select('id, title, model, created_at, updated_at')
        .in('id', uniqueSessionIds);

      const sessionMap = new Map<string, any>();
      for (const s of (sessions || [])) {
        sessionMap.set(s.id, s);
      }

      // 4. Obtener TODOS los mensajes de message_logs
      const { data: logMessages } = await supabase
        .from('message_logs')
        .select('original_id, session_id, role, content, model, character, created_at, deleted_from_chat, is_admin_inject')
        .eq('user_id', profile.id)
        .in('session_id', uniqueSessionIds)
        .order('created_at', { ascending: true })
        .limit(1000);

      // 5. Agrupar por sesión
      const messagesBySession = new Map<string, any[]>();
      for (const msg of (logMessages || [])) {
        const list = messagesBySession.get(msg.session_id) || [];
        list.push({
          role: msg.role,
          content: msg.content,
          model: msg.model,
          character: msg.character,
          created_at: msg.created_at,
          deleted: msg.deleted_from_chat,
          admin_inject: msg.is_admin_inject,
        });
        messagesBySession.set(msg.session_id, list);
      }

      // 6. Construir respuesta
      const result = uniqueSessionIds.map(sid => {
        const session = sessionMap.get(sid);
        const msgs = messagesBySession.get(sid) || [];
        return {
          id: sid,
          title: session?.title || '🗑️ Sesión eliminada',
          model: session?.model || msgs[0]?.model || 'unknown',
          created_at: session?.created_at || msgs[0]?.created_at,
          updated_at: session?.updated_at || msgs[msgs.length - 1]?.created_at,
          deleted: !session,  // la sesión fue borrada
          messages: msgs,
        };
      });

      return res.status(200).json({
        found: true,
        user: { id: profile.id, email: profile.email, plan: profile.plan, messages_used: profile.messages_used, registered: profile.created_at },
        sessions: result,
      });
    } catch (err) {
      console.error('[Admin] Error chat_logs:', err);
      return res.status(500).json({ error: 'Error obteniendo chat logs.' });
    }
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
