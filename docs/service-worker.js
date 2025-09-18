// Version bitte bei jeder Änderung hochzählen
const CACHE_NAME = "pwa-cache-v3";

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

// Fetch-Strategie (Cache First für statische Assets, sonst Netzwerk)
self.addEventListener("fetch", (event) => {
  const request = event.request;

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(request).catch(() => {
        // Fallback: Avatar, falls Bild angefragt wird
        if (request.destination === "image") {
          return caches.match("./assets/avatar-default.png");
        }
      });
    })
  );
});
