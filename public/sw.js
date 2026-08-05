// Pocket Vault service worker.
//
// Caching is intentionally limited to static, non-sensitive assets (the app
// shell, icons, and built JS/CSS). Anything under /api/ is always fetched
// from the network and never cached — vault and expense data must not be
// stored in the Cache Storage API. See pocket-vault-roadmap.md section 7.2.

const CACHE_VERSION = "v1"
const STATIC_CACHE = `pocket-vault-static-${CACHE_VERSION}`

const PRECACHE_URLS = ["/", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png"]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("pocket-vault-") && key !== STATIC_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

function isNeverCache(url) {
  return url.pathname.startsWith("/api/")
}

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/favicon.ico"
  )
}

self.addEventListener("fetch", (event) => {
  const { request } = event
  if (request.method !== "GET") return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  if (isNeverCache(url)) return

  if (isStaticAsset(url)) {
    // Cache-first: static, hashed build assets never change under the same URL.
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            const copy = response.clone()
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy))
            return response
          }),
      ),
    )
    return
  }

  if (request.mode === "navigate") {
    // Network-first for page navigations, with an offline app-shell fallback.
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy))
          return response
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match("/"))),
    )
  }
})
