// ═══════════════════════════════════════
// AIdark — Service Worker v3 (MINIMAL)
// Solo push notifications. CERO cache.
// ═══════════════════════════════════════

// Al instalar: limpiar cualquier cache viejo y activar inmediatamente
self.addEventListener('install', e => {
  e.waitUntil(
    caches.keys().then(names => Promise.all(names.map(n => caches.delete(n))))
  );
  self.skipWaiting();
});

// Al activar: tomar control inmediato de todas las páginas
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(names => Promise.all(names.map(n => caches.delete(n))))
      .then(() => clients.claim())
  );
});

// NO interceptar fetch — dejar que el navegador maneje todo normalmente

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
