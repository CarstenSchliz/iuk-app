// Version bitte bei jeder Änderung hochzählen
const CACHE_NAME = "pwa-cache-v28"; // ⬅️ hochgezählt

const URLS_TO_CACHE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./assets/iuk-192.png",
  "./assets/iuk-512.png",
  "./assets/iuk-lernwelt-512.png",
  "./assets/avatar-default.png" // Standard-Avatar immer verfügbar
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
  const request = event.request;
  const url = request.url;

  // 👉 Profilbilder aus Firebase Storage speziell behandeln
  if (url.includes("firebasestorage.googleapis.com") && request.destination === "image") {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          // Cache First
          return cachedResponse;
        }
        return fetch(request)
          .then((networkResponse) => {
            // neu laden und in Cache legen
            return caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, networkResponse.clone());
              return networkResponse;
            });
          })
          .catch(() => {
            // Fallback wenn offline → Default Avatar
            return caches.match("./assets/avatar-default.png");
          });
      })
    );
    return; // wichtig: hier beenden, sonst fällt er unten wieder rein
  }

  // 👉 Standard-Strategie für alles andere
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(request).then((networkResponse) => {
        // nur gleiche-Origin Dateien cachen
        if (request.url.startsWith(self.location.origin)) {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, networkResponse.clone());
            return networkResponse;
          });
        } else {
          return networkResponse;
        }
      });
    })
  );
});
