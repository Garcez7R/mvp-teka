const CACHE_NAME = "teka-static-v2";
const PRECACHE_URLS = ["/manifest.json"];

function isTrpcRequest(requestUrl) {
  return requestUrl.pathname.startsWith("/trpc");
}

function isNavigationRequest(request) {
  return request.mode === "navigate";
}

function isStaticAsset(requestUrl) {
  return requestUrl.pathname.startsWith("/assets/") || requestUrl.pathname.startsWith("/covers/");
}

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((cacheNames) =>
        Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              return caches.delete(cacheName);
            }
            return Promise.resolve();
          })
        )
      ),
    ])
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") {
    return;
  }

  const requestUrl = new URL(request.url);
  if (requestUrl.origin !== self.location.origin) {
    return;
  }

  if (isTrpcRequest(requestUrl)) {
    event.respondWith(fetch(request, { cache: "no-store" }));
    return;
  }

  if (isNavigationRequest(request)) {
    event.respondWith(
      fetch(request, { cache: "no-store" }).catch(() => caches.match("/index.html"))
    );
    return;
  }

  if (!isStaticAsset(requestUrl)) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        return cached;
      }

      return fetch(request).then((response) => {
        if (!response || response.status !== 200 || response.type !== "basic") {
          return response;
        }

        const responseToCache = response.clone();
        void caches.open(CACHE_NAME).then((cache) => cache.put(request, responseToCache));
        return response;
      });
    })
  );
});
