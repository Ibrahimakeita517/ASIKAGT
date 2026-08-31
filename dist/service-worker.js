importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.4.1/workbox-sw.js');

if (workbox) {
  console.log('ASIKA Service Worker : Chargé avec succès (Workbox)');

  // Force la mise à jour immédiate du SW
  workbox.core.skipWaiting();
  workbox.core.clientsClaim();

  // 1. Stratégie CacheFirst pour les Images (Logo, Produits)
  // Durée de vie : 30 jours
  workbox.routing.registerRoute(
    ({ request }) => request.destination === 'image',
    new workbox.strategies.CacheFirst({
      cacheName: 'asika-images',
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 100,
          maxAgeSeconds: 30 * 24 * 60 * 60,
        }),
        new workbox.cacheableResponse.CacheableResponsePlugin({
          statuses: [0, 200],
        }),
      ],
    })
  );

  // 2. Stratégie StaleWhileRevalidate pour les Bundles JS et CSS
  // Permet une ouverture instantanée tout en mettant à jour en arrière-plan
  workbox.routing.registerRoute(
    ({ request }) => request.destination === 'script' || request.destination === 'style',
    new workbox.strategies.StaleWhileRevalidate({
      cacheName: 'asika-static-assets',
    })
  );

  // 3. Stratégie NetworkFirst pour la Navigation (index.html)
  // Essaye le réseau, mais bascule sur le cache si hors ligne (Fallback Offline)
  workbox.routing.registerRoute(
    ({ request }) => request.mode === 'navigate',
    new workbox.strategies.NetworkFirst({
      cacheName: 'asika-navigation',
      networkTimeoutSeconds: 3,
      plugins: [
        new workbox.cacheableResponse.CacheableResponsePlugin({
          statuses: [200],
        }),
      ],
    })
  );

  // Cache par défaut pour le reste
  workbox.routing.setDefaultHandler(
    new workbox.strategies.NetworkOnly()
  );
} else {
  console.log('Workbox n\'a pas pu être chargé.');
}
