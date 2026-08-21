/* Escudo Andino — Service Worker mínimo (habilita instalación PWA y uso básico offline) */
const CACHE_NAME = 'escudo-andino-cache-v5';
const ARCHIVOS_CACHE = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  './img/escudo-sf.png',
  './img/escudo-cf.png',
  './img/favicon.png',
  './img/favicon-maskable.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ARCHIVOS_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((claves) =>
      Promise.all(
        claves.filter((clave) => clave !== CACHE_NAME).map((clave) => caches.delete(clave))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // El Worker del chatbot (dominio distinto, workers.dev) NO debe pasar por
  // este caché; así el chat con Gemini siempre recibe respuestas frescas.
  if (event.request.url.includes('workers.dev')) {
    return;
  }
  event.respondWith(
    caches.match(event.request).then((respuestaCache) => {
      if (respuestaCache) return respuestaCache;
      return fetch(event.request).catch(() =>
        caches.match('./index.html')
      );
    })
  );
});
