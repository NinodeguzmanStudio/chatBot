// ... (tus imports existentes: next, stripe, supabase, etc.)
const webpush = require('web-push');

function setupVapid() {
  webpush.setVapidDetails(
    'mailto:soporte@aidark.app',
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
}

async function sendPushToUser(supabase: any, userId: string, title: string, body: string) {
  try {
    setupVapid();
    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', userId)
      .limit(5);

    if (!subs?.length) return;

    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify({ title, body, url: '/' })
        );
      } catch (e: any) {
        if (e.statusCode === 410) {
          await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
        }
      }
    }
  } catch (err) {
    console.error('[Webhook] Push error (no crítico):', err);
  }
}

// ... (resto de tu código: inicialización de Stripe, handler principal, verificación de firma, etc.)
// ... (lógica de negocio para obtener userId, planId, expiresAt...)

    // --- INICIO BLOQUE MODIFICADO ---

    console.log(`[Webhook] ✅ Plan ${planId} activado para ${userId}, vence: ${expiresAt.toISOString()}`);

    // Notificar al usuario por push
    await sendPushToUser(
      supabase,
      userId,
      '🎉 ¡Tu plan está activo!',
      `Tu plan ${planId} fue activado. Ya podés generar imágenes sin censura.`
    );

    return res.status(200).json({ received: true, activated: true });

    // --- FIN BLOQUE MODIFICADO ---
