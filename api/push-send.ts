// ═══════════════════════════════════════
// AIdark — Push Send (Cron diario)
// 2 notificaciones/día · Segmentado free/premium
// ═══════════════════════════════════════
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const webpush = require('web-push');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const MSG_FREE = [
  { title: '🔥 AIdark', body: 'Otros usuarios están generando imágenes sin censura ahora mismo. ¿Tú cuándo?' },
  { title: '💋 AIdark', body: 'Hentai, manhwa, desnudos HD... todo sin filtros. Hazte Premium hoy.' },
  { title: '⚡ AIdark', body: 'Tus mensajes gratuitos te esperan. Entra a AIdark ahora.' },
  { title: '🎌 AIdark', body: 'Los usuarios premium ya generaron cientos de imágenes hoy. No te lo pierdas.' },
  { title: '🔒 AIdark', body: 'Quedan pocos cupos premium disponibles. Actúa antes de que se agoten.' },
];

const MSG_PREMIUM_AM = [
  { title: '📸 AIdark', body: 'Tu límite de imágenes se renovó. Genera lo que quieras hoy.' },
  { title: '🔥 AIdark', body: 'Buenos días. Tus imágenes del día están listas para generarse.' },
  { title: '✨ AIdark', body: 'Tu cuenta premium está activa. Genera sin límites hoy.' },
];

const MSG_PREMIUM_PM = [
  { title: '🎌 AIdark', body: '¿Ya generaste tu imagen de hoy? No desperdicies tu plan.' },
  { title: '💋 AIdark', body: 'Tu sesión de AIdark te espera. Sin filtros, sin límites.' },
  { title: '⏰ AIdark', body: 'Tu límite diario se renueva a medianoche. Úsalo ahora.' },
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const secret = req.headers['x-cron-secret'];
  if (secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  // Configurar VAPID
  webpush.setVapidDetails(
    'mailto:ninodeguzmanstudio@gmail.com',
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );

  const hour = new Date().getUTCHours();
  const isAM = hour === 13; // 10am LATAM
  const isPM = hour === 1;  // 8pm LATAM
  if (!isAM && !isPM) {
    return res.status(200).json({ ok: true, message: 'Fuera de horario' });
  }

  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth, profiles(plan)')
    .limit(5000);

  if (!subs?.length) return res.status(200).json({ ok: true, sent: 0 });

  let sent = 0;
  let failed = 0;

  for (const sub of subs) {
    const plan = (sub as any).profiles?.plan || 'free';
    const isFree = plan === 'free';

    const msg = isFree
      ? pickRandom(MSG_FREE)
      : isAM ? pickRandom(MSG_PREMIUM_AM) : pickRandom(MSG_PREMIUM_PM);

    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify({ title: msg.title, body: msg.body, url: '/' })
      );
      sent++;
    } catch (err: any) {
      failed++;
      if (err.statusCode === 410) {
        await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
      }
    }
  }

  return res.status(200).json({ ok: true, sent, failed });
}
