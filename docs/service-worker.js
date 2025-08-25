const CACHE_NAME = "pwa-cache-v32";  // bei Änderungen hochzählen!

const URLS_TO_CACHE = [
  "./",
  "./index.html",
  "./manifest.json",
  "assets/avatar-default.png",
  "assets/iuk-192.png",
  "assets/iuk-512.png",
  "assets/iuk-lernwelt-512.png"
];

// Installation: App-Dateien und Standard-Assets cachen
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(URLS_TO_CACHE))
  );
});

// Aktivierung: alte Caches löschen
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
});

// Fetch-Handler
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // 👉 Firebase Storage immer Netz
  if (url.origin.includes("firebasestorage.googleapis.com")) return;

  // 👉 Externe Domains immer Netz
  if (url.origin !== self.location.origin) return;

  // 👉 Eigene Dateien: Cache-First
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
