const CACHE_NAME = "pwa-cache-v2";

// Alles, was sofort in den Cache soll:
const URLS_TO_CACHE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/styles.css",   // falls du ein CSS hast
  "./js/app.js",        // falls du ein JS hast
  "./assets/icon-192.png",
  "./assets/icon-512.png"
];

// Install: Cache initial laden
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(URLS_TO_CACHE))
  );
});

// Activate: Alte Caches löschen (Versionierung!)
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

// Fetch: Erst aus Cache, dann Netzwerk
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse; // aus Cache
      }
      return fetch(event.request).then((networkResponse) => {
        // Antwort auch in Cache legen (dynamisches Caching)
        return caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        });
      });
    })
  );
});
