importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.4.1/workbox-sw.js');

if (workbox) {
  console.log('ASIKA PWA Service Worker : Actif');

  workbox.core.skipWaiting();
  workbox.core.clientsClaim();

  // 1. Cache des polices d'icônes (INDISPENSABLE pour le hors-ligne)
  workbox.routing.registerRoute(
    ({ request }) => request.destination === 'font' || request.url.includes('fonts.gstatic.com') || request.url.includes('cdnjs.cloudflare.com'),
    new workbox.strategies.CacheFirst({
      cacheName: 'asika-fonts',
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 20,
          maxAgeSeconds: 365 * 24 * 60 * 60, // 1 an
        }),
        new workbox.cacheableResponse.CacheableResponsePlugin({
          statuses: [0, 200],
        }),
      ],
    })
  );

  // 2. Cache des Images (Logo, Produits)
  workbox.routing.registerRoute(
    ({ request }) => request.destination === 'image',
    new workbox.strategies.CacheFirst({
      cacheName: 'asika-images',
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 100,
          maxAgeSeconds: 30 * 24 * 60 * 60,
        }),
      ],
    })
  );

  // 3. Cache des Scripts et Styles (Ouverture instantanée)
  workbox.routing.registerRoute(
    ({ request }) => request.destination === 'script' || request.destination === 'style',
    new workbox.strategies.StaleWhileRevalidate({
      cacheName: 'asika-static',
    })
  );

  // 4. Navigation (Fallback Offline)
  workbox.routing.registerRoute(
    ({ request }) => request.mode === 'navigate',
    new workbox.strategies.NetworkFirst({
      cacheName: 'asika-navigation',
      networkTimeoutSeconds: 3,
    })
  );
}
