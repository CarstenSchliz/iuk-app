const CACHE_NAME = "pwa-cache-v30";   // bei jedem Update hochzählen!

const URLS_TO_CACHE = [
  "./",
  "./index.html",
  "./manifest.json",
  "/iuk-app/assets/iuk-192.png",
  "/iuk-app/assets/iuk-512.png",
  "/iuk-app/assets/iuk-lernwelt-512.png",
  "/iuk-app/assets/avatar-default.png"   // Default-Avatar
];

// Installation: wichtige App-Dateien vorab cachen
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(URLS_TO_CACHE))
  );
});

// Aktivierung: alte Caches löschen
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

  // 👉 Nur GET-Anfragen behandeln
  if (event.request.method !== "GET") {
    event.respondWith(fetch(event.request));
    return;
  }

  // 👉 Firebase Storage (Profilbilder) → niemals cachen
  if (url.origin.includes("firebasestorage.googleapis.com")) {
    event.respondWith(fetch(event.request));
    return;
  }

  // 👉 Externe Ressourcen (CDNs, APIs) → immer aus dem Netz
  if (url.origin !== self.location.origin) {
    event.respondWith(fetch(event.request));
    return;
  }

  // 👉 Eigene Assets (/iuk-app/assets/...) → Cache mit Fallback Netz
  if (url.pathname.includes("/iuk-app/assets/")) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        return cachedResponse || fetch(event.request);
      })
    );
    return;
  }

  // 👉 Standard: Cache-First für App-Dateien
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
