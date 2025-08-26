// Version bitte bei jeder Änderung hochzählen
const CACHE_NAME = "pwa-cache-v24";

const URLS_TO_CACHE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./assets/iuk-192.png",
  "./assets/iuk-512.png",
  "./assets/iuk-lernwelt-512.png",
  "./assets/avatar-default.png"  // Standard-Avatar immer verfügbar
];

// Installieren → Grundgerüst cachen
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(URLS_TO_CACHE))
  );
});

// Aktivieren → alte Caches löschen
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

// Fetch-Strategie
self.addEventListener("fetch", (event) => {
  const url = event.request.url;

  // Firebase Storage oder andere externe URLs nie cachen
  if (url.includes("firebasestorage.googleapis.com")) {
    return event.respondWith(fetch(event.request));
  }

  // Standard: Cache First, dann Netzwerk
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        // nur gleiche-Origin Dateien cachen
        if (event.request.url.startsWith(self.location.origin)) {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        } else {
          return networkResponse;
        }
      });
    })
  );
});
