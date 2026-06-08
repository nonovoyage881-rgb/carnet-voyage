// js/lib/geo.js — géocodage gratuit (OpenStreetMap / Nominatim) + cache
//  • Convertit une adresse / un nom de lieu en coordonnées GPS.
//  • Lit aussi des coordonnées présentes dans un lien Google Maps.
//  • Met en cache les résultats (localStorage) pour ne jamais refaire
//    deux fois la même recherche, et limite le débit (politesse OSM).

const CACHE_KEY = 'cvs_geocache';
const SPACING = 1100; // ms minimum entre deux requêtes Nominatim
let _chain = Promise.resolve();

function readCache() { try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}'); } catch (e) { return {}; } }
function writeCache(c) {
  // BUG-11 : purger les entrées de plus de 90 jours pour éviter la saturation du localStorage
  const limit = Date.now() - 90 * 86400000;
  for (const k of Object.keys(c)) { if (c[k] && c[k].cachedAt && c[k].cachedAt < limit) delete c[k]; }
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(c)); } catch (e) {}
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function hasCoords(x) {
  return x && typeof x.lat === 'number' && typeof x.lng === 'number' && !isNaN(x.lat) && !isNaN(x.lng);
}

// Extrait des coordonnées d'un texte ou d'un lien Google Maps, si présentes.
export function parseLatLng(text) {
  if (!text) return null;
  const s = String(text);
  let m = s.match(/@(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/);               // .../@45.1,7.4,15z
  if (m) return { lat: +m[1], lng: +m[2] };
  m = s.match(/!3d(-?\d{1,3}\.\d+)!4d(-?\d{1,3}\.\d+)/);               // !3d45.1!4d7.4
  if (m) return { lat: +m[1], lng: +m[2] };
  m = s.match(/[?&](?:q|query|ll|destination|center)=(-?\d{1,3}\.\d+),\s*(-?\d{1,3}\.\d+)/); // ?q=45.1,7.4
  if (m) return { lat: +m[1], lng: +m[2] };
  m = s.match(/^\s*(-?\d{1,3}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)\s*$/);      // "45.1, 7.4"
  if (m) return { lat: +m[1], lng: +m[2] };
  return null;
}

// Géocode une requête texte via Nominatim (cache + débit poli).
export async function geocode(query) {
  query = (query || '').trim();
  if (!query) return null;
  const key = query.toLowerCase();
  const c = readCache();
  if (c[key]) return c[key].fail ? null : { lat: c[key].lat, lng: c[key].lng };   // déjà connu (succès ou échec)

  const result = await (_chain = _chain.then(async () => {
    await sleep(SPACING);
    try {
      const url = 'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=' + encodeURIComponent(query);
      const r = await fetch(url, { headers: { Accept: 'application/json' } });
      const j = await r.json();
      if (Array.isArray(j) && j[0]) return { lat: +j[0].lat, lng: +j[0].lon };
    } catch (e) {}
    return null;
  }));

  const c2 = readCache();
  c2[key] = result ? { ...result, cachedAt: Date.now() } : { fail: true, cachedAt: Date.now() };
  writeCache(c2);
  return result;
}

// Résout les coordonnées d'un élément :
//  1) coordonnées déjà présentes  2) lien contenant des coordonnées
//  3) adresse  4) nom + zone du voyage.
export async function resolveOne(item, linkFields, name, area) {
  if (hasCoords(item)) return { lat: item.lat, lng: item.lng, source: 'coords' };
  for (const f of (linkFields || [])) { const ll = parseLatLng(item[f]); if (ll) return { ...ll, source: 'lien' }; }
  if (item.address && item.address.trim()) { const ll = await geocode(item.address); if (ll) return { ...ll, source: 'adresse' }; }
  if (name && name.trim()) { const ll = await geocode(area ? `${name}, ${area}` : name); if (ll) return { ...ll, source: 'nom' }; }
  return null;
}

// Modèle unique : appelée après l'enregistrement d'un élément (création ou
// modification). Géocode en arrière-plan et écrit lat/lng sur l'enregistrement.
//  • force = true : recalcule même si des coordonnées existaient (adresse modifiée).
export async function geocodeAndStore(store, coll, id, { links, name, area, force } = {}) {
  const rec = store.doc(coll, id);
  if (!rec) return;
  const item = force ? { ...rec, lat: undefined, lng: undefined } : rec;
  const ll = await resolveOne(item, links, name, area);
  if (ll) store.update(coll, id, { lat: ll.lat, lng: ll.lng, geoFail: false });
  else store.update(coll, id, { geoFail: true });
}
