// =====================================================================
//  Service worker — Carnet de voyage & souvenirs
//  Stratégie « réseau d'abord » : on sert toujours la dernière version
//  quand on est en ligne, et on bascule sur le cache uniquement hors-ligne.
//  -> évite de rester bloqué sur une ancienne version après une mise à jour.
//  À chaque déploiement modifiant le SW, on incrémente CACHE.
// =====================================================================
const CACHE = 'cvs-v14';

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
  './js/lib/reminders.js',
  './js/lib/tripOwners.js',
  './tripOwners.js',
  './js/tripOwners.js',
  './js/views/dashboard.js',
  './js/views/discover.js',
  './js/views/programs.js',
  './js/views/gallery.js',
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

// Cache dédié aux tuiles OpenStreetMap (hors-ligne carte)
const TILES_CACHE = 'cvs-tiles-v1';

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;

  // Tuiles OSM : cache d'abord (mises en cache manuellement via le bouton Hors-ligne)
  if (request.url.includes('tile.openstreetmap.org')) {
    e.respondWith(
      caches.open(TILES_CACHE).then(c =>
        c.match(request).then(hit => hit || fetch(request).then(res => {
          const copy = res.clone(); c.put(request, copy).catch(()=>{});
          return res;
        }).catch(() => new Response('', { status: 503 })))
      )
    );
    return;
  }

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
