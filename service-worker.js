const CACHE_NAME = "chakra-flow-v2026-06-20-1";

const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./vendor/react.js",
  "./vendor/react-dom.js",
  "./vendor/babel.js",
  "./vendor/fonts-inlined.css",
  "./assets/icons/icon.svg",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/icons/apple-touch-icon.png",
  "./assets/chakras/Ganesha.svg",
  "./assets/chakras/Chakra1.svg",
  "./assets/chakras/Chakra2.svg",
  "./assets/chakras/Chakra3.svg",
  "./assets/chakras/Chakra4.svg",
  "./assets/chakras/Chakra5.svg",
  "./assets/chakras/Chakra6.svg",
  "./assets/chakras/Chakra7.svg",
  "./assets/mudras/apana_palms_down.jpg",
  "./assets/mudras/apana_palms_up.jpg",
  "./assets/mudras/granthita.jpg",
  "./assets/mudras/hakini.jpg",
  "./assets/mudras/padma.jpg",
  "./assets/mudras/rudra.jpg",
  "./assets/mudras/sahasrara_side.jpg",
  "./assets/mudras/shakti.jpg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put("./index.html", copy));
        return response;
      }).catch(() => caches.match("./index.html").then((cached) => cached || caches.match("./")))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      });
    })
  );
});
