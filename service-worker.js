// =====================================================================
//  Service worker — Carnet de voyage & souvenirs
//  Stratégie « réseau d'abord » : on sert toujours la dernière version
//  quand on est en ligne, et on bascule sur le cache uniquement hors-ligne.
//  -> évite de rester bloqué sur une ancienne version après une mise à jour.
//  À chaque déploiement modifiant le SW, on incrémente CACHE.
// =====================================================================
const CACHE = 'cvs-v11';

const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/styles.css',
  './js/app.js',
  './js/store.js',
  './js/seed.js',
  './js/config.js',
  './js/lib/ui.js',
  './js/lib/crud.js',
  './js/lib/media.js',
  './js/lib/geo.js',
  './js/views/dashboard.js',
  './js/views/discover.js',
  './js/views/reservations.js',
  './js/views/activities.js',
  './js/views/trips.js',
  './js/views/itineraries.js',
  './js/views/lists.js',
  './js/views/budget.js',
  './js/views/map.js',
  './js/views/weather.js',
  './js/views/inventory.js',
  './js/views/checklists.js',
  './js/views/settings.js',
  './js/views/exports.js',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(SHELL).catch(() => {}))
      .then(() => self.skipWaiting())     // active tout de suite la nouvelle version
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())   // prend la main sur les onglets ouverts
  );
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;

  // Réseau d'abord ; on met à jour le cache au passage ; repli cache hors-ligne.
  e.respondWith(
    fetch(request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {});
        return res;
      })
      .catch(() =>
        caches.match(request).then(
          (hit) => hit || (request.mode === 'navigate' ? caches.match('./index.html') : undefined)
        )
      )
  );
});
