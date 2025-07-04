self.addEventListener("install", e => {
  e.waitUntil(
    caches.open("notifier-cache").then(cache => {
      return cache.addAll(["index.html", "style.css", "main.js", "manifest.json"]);
    })
  );
});
self.addEventListener("fetch", e => {
  e.respondWith(
    caches.match(e.request).then(response => response || fetch(e.request))
  );
});