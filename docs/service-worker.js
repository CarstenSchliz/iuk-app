const CACHE_NAME = "pwa-cache-v32";   // hochzählen!

const URLS_TO_CACHE = [
  "./",
  "./index.html",
  "./manifest.json",
  "assets/iuk-192.png",
  "assets/iuk-512.png",
  "assets/iuk-lernwelt-512.png",
  "assets/avatar-default.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(URLS_TO_CACHE))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.filter((name) => name !== CACHE_NAME)
                  .map((name) => caches.delete(name))
      )
    )
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // 👉 Firebase Storage komplett ignorieren → immer Netz
  if (url.origin.includes("firebasestorage.googleapis.com")) {
    return;
  }

  // 👉 Nur eigene Domain behandeln
  if (url.origin !== self.location.origin) {
    return;
  }

  // 👉 Cache-First Strategie für eigene Dateien
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;
      return fetch(event.request).then((networkResponse) => {
        return caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        });
      });
    })
  );
});
