const CACHE_NAME = 'gestor-solar-cache-v5'; // Nueva versión con estrategia simplificada
const urlsToCache = [
    '/',
    './index.html',
    './manifest.json'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('Cache abierto. Cacheando archivos locales...');
            return cache.addAll(urlsToCache);
        })
    );
});

self.addEventListener('activate', event => {
    // Este evento se dispara cuando el nuevo Service Worker se activa.
    // Es el lugar perfecto para limpiar las cachés antiguas.
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

self.addEventListener('fetch', event => {
    // Estrategia: Cache-First para las URLs locales, Network-First para todo lo demás.
    event.respondWith(
        caches.match(event.request).then(cachedResponse => {
            // Si la solicitud está en la caché (es un archivo local), la servimos desde ahí.
            if (cachedResponse) {
                return cachedResponse;
            }
            // Si no está en la caché (es un script externo o una nueva solicitud),
            // la dejamos pasar a la red.
            // Esto evita los problemas con respuestas 'opacas' y CORS.
            return fetch(event.request);
        })
    );
});