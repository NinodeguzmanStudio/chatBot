// ═══════════════════════════════════════
// AIdark — Service Worker (PWA + Push)
// ═══════════════════════════════════════
const CACHE = 'aidark-v1';

self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(clients.claim());
});

// Push notification recibida
self.addEventListener('push', e => {
  if (!e.data) return;
  const data = e.data.json();
  e.waitUntil(
    self.registration.showNotification(data.title || 'AIdark', {
      body: data.body || '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'aidark-daily',
      renotify: true,
      data: { url: data.url || '/' },
    })
  );
});

// Click en notificación → abrir app
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = e.notification.data?.url || '/';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const client of list) {
        if (client.url.includes(self.location.origin)) {
          client.focus();
          return;
        }
      }
      return clients.openWindow(url);
    })
  );
});
