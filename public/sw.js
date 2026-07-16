// Minimal service worker: makes Tally installable and caches immutable build
// assets for a light offline/perf boost. No push notifications.
//
// IMPORTANT: page HTML is intentionally NOT cached. A cached HTML shell from a
// previous build references old hashed chunk filenames; after a redeploy those
// chunks 404, producing a fatal "client-side exception" (ChunkLoadError). Only
// content-hashed assets under /_next/static (URL == content, never stale) are
// cached. Bump CACHE to invalidate old asset caches.
const CACHE = "tally-v2";

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(["/manifest.webmanifest"]).catch(() => {})),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Cache-first ONLY for immutable, content-hashed build assets. Their URL
  // uniquely identifies their content, so a cached copy can never go stale.
  const isImmutableAsset =
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/manifest.webmanifest";

  if (isImmutableAsset) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
            return res;
          }),
      ),
    );
    return;
  }

  // Everything else (page navigations, API, etc.): straight to network, no
  // caching. Prevents serving a stale HTML shell that points at missing chunks.
});
