const CACHE_NAME = "pwa-cache-v25";   // <--- hochzählen, wenn du SW neu veröffentlichst

const URLS_TO_CACHE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./assets/iuk-192.png",
  "./assets/iuk-512.png",
  "./assets/iuk-lernwelt-512.png"
];

// Installation: wichtige App-Dateien vorab cachen
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(URLS_TO_CACHE))
  );
});

// Alte Caches löschen
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    )
  );
});

// Fetch-Handler: Hybrid-Strategie
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // 👉 Nur GET-Anfragen cachen
  if (event.request.method !== "GET") {
    event.respondWith(fetch(event.request));
    return;
  }

  // 👉 Externe Ressourcen (CDNs, Firebase, APIs) NIE cachen
  if (url.origin !== self.location.origin) {
    event.respondWith(fetch(event.request));
    return;
  }

  // 👉 Eigene App-Dateien: Cache-First
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        return caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        });
      });
    })
  );
});
