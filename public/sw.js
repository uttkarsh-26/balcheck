// balcheck.in service worker for Monetag push ad verification
self.addEventListener('install', function (event) {
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', function (event) {
  if (!event.data) return;
  try {
    const data = event.data.json();
    event.waitUntil(
      self.registration.showNotification(data.title || 'BalCheck.in', {
        body: data.body || '',
        icon: data.icon || '/favicon.svg',
        image: data.image,
        badge: data.badge,
        data: data.url || data.data || '/',
        requireInteraction: data.requireInteraction !== false,
      })
    );
  } catch (e) {
    event.waitUntil(
      self.registration.showNotification('BalCheck.in', {
        body: event.data.text(),
        icon: '/favicon.svg',
        data: '/',
      })
    );
  }
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  const url = event.notification.data || '/';
  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then(function (clientList) {
        for (const client of clientList) {
          if (client.url === url && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});
