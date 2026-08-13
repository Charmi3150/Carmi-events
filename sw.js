self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data.json(); } catch (e) { data = { title: 'Carmi Events', body: event.data ? event.data.text() : '' }; }

  event.waitUntil(
    self.registration.showNotification(data.title || 'Carmi Events', {
      body: data.body || '',
      icon: data.icon || '/icon.png',
      badge: data.badge || '/icon.png',
      data: { url: data.url || '/' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(clients.openWindow(url));
});
