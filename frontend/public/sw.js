// Mwana Lingala — Service Worker minimal pour PWA install + push notifications
const CACHE = "ml-v1";

self.addEventListener("install", (e) => {
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (e) => {
  // Network-first for API, cache-first for static images
  const url = new URL(e.request.url);
  if (url.pathname.startsWith("/images/words/")) {
    e.respondWith(
      caches.open(CACHE).then((cache) =>
        cache.match(e.request).then((cached) =>
          cached || fetch(e.request).then((resp) => {
            if (resp.ok) cache.put(e.request, resp.clone());
            return resp;
          }).catch(() => cached)
        )
      )
    );
  }
});

// Push notifications handler
self.addEventListener("push", (e) => {
  let data = { title: "Mwana Lingala", body: "Nouvelle activité !" };
  try { if (e.data) data = { ...data, ...e.data.json() }; } catch (_) {}
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/images/icon-192.png",
      badge: "/images/icon-192.png",
      data: { url: data.url || "/app" },
      vibrate: [100, 50, 100],
      tag: data.tag || "mwana",
    })
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = e.notification.data?.url || "/app";
  e.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      const hit = clients.find((c) => c.url.includes(url));
      if (hit) return hit.focus();
      return self.clients.openWindow(url);
    })
  );
});
