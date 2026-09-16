// Stage 0 placeholder. App-shell and data caching are implemented in Stage 9.
self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});
