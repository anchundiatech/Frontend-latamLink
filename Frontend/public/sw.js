// Service worker mínimo a propósito. NUNCA cachea rutas de API, del backend
// ni datos de pago: solo permite instalar la app y mostrar una pantalla de
// "sin conexión" cuando falla la navegación. El código de la app (JS/CSS)
// tiene hash de build y no se precachea acá para no arriesgar servir chunks
// viejos después de un deploy.
const CACHE_NAME = "latamlink-shell-v1";
const OFFLINE_URL = "/offline.html";
const PRECACHE_URLS = [OFFLINE_URL, "/favicon.png", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Solo intercepta navegaciones (carga de páginas HTML) para el fallback
  // offline. Todo lo demás — API, JS, datos — pasa directo a la red: cachear
  // eso arriesgaría servir un monto, saldo o estado de pago desactualizado.
  if (request.mode !== "navigate") return;

  event.respondWith(
    fetch(request).catch(() => caches.match(OFFLINE_URL))
  );
});
