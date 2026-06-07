// js/views/map.js — carte = représentation complète du voyage
import { store } from '../store.js';
import { icon, modal, toast, esc } from '../lib/ui.js';
import * as geo from '../lib/geo.js';

// Catégories de "points d'intérêt" (collection places)
const PLACE_EMOJI = {
  'Camping': '⛺', 'Activité': '🎒', 'Randonnée': '🥾', 'Restaurant': '🍽️', 'Supermarché': '🛒',
  'Marché local': '🧺', 'Station-service': '⛽', 'Point d’eau': '🚰', 'Aire de services': '🚐',
};
const RES_EMOJI = { 'Camping': '⛺', 'Hôtel': '🏨', 'Ferry': '⛴️', 'Train': '🚆', 'Restaurant': '🍽️', 'Activité': '🎟️', 'Aire de services': '🚐', 'Autre': '📍' };
const ACT_EMOJI = { 'Visite': '🏛️', 'Marché': '🧺', 'Randonnée': '🥾', 'Plage': '🏖️', 'Sport': '🚴', 'Autre': '📍' };

const LAYERS = [
  { key: 'reservations', label: 'Réservations', emoji: '🏨' },
  { key: 'activities', label: 'Activités', emoji: '🎒' },
  { key: 'places', label: 'Lieux', emoji: '📍' },
  { key: 'route', label: 'Itinéraire', emoji: '🧭' },
  { key: 'hikes', label: 'Randonnées', emoji: '🥾' },
];

const hasCoords = (x) => x && typeof x.lat === 'number' && typeof x.lng === 'number' && !isNaN(x.lat) && !isNaN(x.lng);

export function MapView() {
  const el = document.createElement('div');
  const trip = store.activeTrip();
  const onLayer = new Set(LAYERS.map((l) => l.key));

  el.innerHTML = `
    <div class="section-head" style="margin-top:0"><h3>Carte — ${esc(trip?.title || '')}</h3><div class="spacer"></div>
      <button class="btn ghost gpx">${icon('upload')} Import GPX</button>
      <button class="btn primary add">${icon('plus')} Point</button></div>
    <div class="map-layers">
      ${LAYERS.map((l) => `<button class="tag sage filter on" data-layer="${l.key}">${l.emoji} ${l.label}</button>`).join('')}
    </div>
    <div id="geo-status" class="geo-status" hidden></div>
    <div id="map"></div>
    <div id="tofix"></div>
    <input type="file" id="gpx-file" accept=".gpx" hidden>`;

  const statusEl = () => el.querySelector('#geo-status');
  function setStatus(txt) { const s = statusEl(); if (!s) return; if (txt) { s.hidden = false; s.textContent = txt; } else s.hidden = true; }

  setTimeout(() => {
    if (!window.L) { el.querySelector('#map').innerHTML = '<p style="padding:20px">Carte indisponible hors ligne.</p>'; return; }
    const center = trip && hasCoords(trip) ? [trip.lat, trip.lng] : [46.6, 2.2];
    const map = L.map('map').setView(center, 7);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap', maxZoom: 18 }).addTo(map);

    const groups = {}; LAYERS.forEach((l) => { groups[l.key] = L.layerGroup().addTo(map); });

    function marker(lat, lng, emoji, title, sub) {
      const ic = L.divIcon({ html: `<div style="font-size:26px;filter:drop-shadow(0 2px 3px rgba(0,0,0,.35))">${emoji}</div>`, className: '', iconSize: [30, 30], iconAnchor: [15, 28] });
      return L.marker([lat, lng], { icon: ic }).bindPopup(`<b>${esc(title)}</b>${sub ? `<br>${esc(sub)}` : ''}`);
    }

    function drawAll() {
      Object.values(groups).forEach((g) => g.clearLayers());
      const bounds = [];
      const push = (lat, lng) => bounds.push([lat, lng]);

      // Points d'intérêt
      store.list('places').filter((p) => p.tripId === trip?.id && hasCoords(p)).forEach((p) => {
        marker(p.lat, p.lng, PLACE_EMOJI[p.cat] || '📍', p.name, p.cat).addTo(groups.places); push(p.lat, p.lng);
      });
      // Réservations
      store.list('reservations').filter((r) => (!r.tripId || r.tripId === trip?.id) && hasCoords(r)).forEach((r) => {
        marker(r.lat, r.lng, RES_EMOJI[r.type] || '🏨', r.name || r.type, [r.type, r.address].filter(Boolean).join(' · ')).addTo(groups.reservations); push(r.lat, r.lng);
      });
      // Activités
      store.list('activities').filter((a) => (!a.tripId || a.tripId === trip?.id) && hasCoords(a)).forEach((a) => {
        marker(a.lat, a.lng, ACT_EMOJI[a.cat] || '🎒', a.title, a.cat).addTo(groups.activities); push(a.lat, a.lng);
      });
      // Itinéraire (tracé + étapes numérotées)
      const it = store.list('itineraries').find((i) => i.tripId === trip?.id);
      if (it?.stops?.length) {
        it.stops.forEach((s, i) => { if (hasCoords(s)) { const ic = L.divIcon({ html: `<div class="route-dot">${i + 1}</div>`, className: '', iconSize: [24, 24], iconAnchor: [12, 12] }); L.marker([s.lat, s.lng], { icon: ic }).bindPopup(`<b>Étape ${i + 1}</b><br>${esc(s.name || '')}`).addTo(groups.route); push(s.lat, s.lng); } });
        if (it.stops.length > 1) L.polyline(it.stops.filter(hasCoords).map((s) => [s.lat, s.lng]), { color: '#b4663f', weight: 3, dashArray: '6 8' }).addTo(groups.route);
      }
      // Randonnées (traces GPX persistées)
      store.list('hikes').filter((h) => h.tripId === trip?.id).forEach((h) => {
        if (Array.isArray(h.track) && h.track.length > 1) { const line = L.polyline(h.track, { color: '#5f8ea0', weight: 4 }).bindPopup(`<b>${esc(h.title || 'Randonnée')}</b><br>${esc(h.dist || '')} km`); line.addTo(groups.hikes); h.track.forEach((pt) => push(pt[0], pt[1])); }
        else if (hasCoords(h)) { marker(h.lat, h.lng, '🥾', h.title || 'Randonnée', h.dist ? h.dist + ' km' : '').addTo(groups.hikes); push(h.lat, h.lng); }
      });

      applyLayerVisibility();
      if (bounds.length) { try { map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 }); } catch (e) {} }
    }

    function applyLayerVisibility() {
      LAYERS.forEach((l) => { if (onLayer.has(l.key)) { if (!map.hasLayer(groups[l.key])) groups[l.key].addTo(map); } else { map.removeLayer(groups[l.key]); } });
    }

    // Liste "à localiser" (géocodage impossible)
    function renderToFix() {
      const failed = [
        ...store.list('reservations').filter((r) => r.tripId === trip?.id && r.geoFail && !hasCoords(r)).map((r) => ({ coll: 'reservations', rec: r, name: r.name || r.type, hint: r.address || '' })),
        ...store.list('activities').filter((a) => a.tripId === trip?.id && a.geoFail && !hasCoords(a)).map((a) => ({ coll: 'activities', rec: a, name: a.title, hint: a.link || '' })),
      ];
      const box = el.querySelector('#tofix');
      if (!failed.length) { box.innerHTML = ''; return; }
      box.innerHTML = `<div class="card" style="margin-top:16px;border-left:5px solid var(--warn)">
        <b>📍 ${failed.length} élément(s) à localiser</b>
        <p style="margin:6px 0 10px;color:var(--ink-soft);font-size:.88rem">L'adresse n'a pas pu être trouvée automatiquement. Renseignez-la pour les afficher sur la carte (rien n'est perdu).</p>
        <div class="list">${failed.map((f, i) => `<div class="item"><div class="ic">⚠️</div>
          <div class="body"><b>${esc(f.name || '(sans nom)')}</b><small>${esc(f.hint || 'aucune adresse')}</small></div>
          <div class="acts"><button class="btn sm primary fix" data-i="${i}">Localiser</button></div></div>`).join('')}</div></div>`;
      box.querySelectorAll('.fix').forEach((b) => b.onclick = () => fixItem(failed[+b.dataset.i]));
    }

    function fixItem(f) {
      modal({
        title: `Localiser « ${f.name || f.rec.type || ''} »`,
        body: `<form>
          <p style="color:var(--ink-soft);font-size:.86rem;margin-top:0">Collez une <b>adresse</b>, un <b>lien Google Maps</b>, ou des <b>coordonnées</b> (ex : 42.69, 9.45).</p>
          <div class="field"><label>Adresse / lien / coordonnées</label><input name="q" placeholder="12 rue des Pins, Calvi  —  ou  42.69,9.45"></div></form>`,
        okText: 'Localiser',
        onOk: (d) => {
          const q = (d.q || '').trim(); if (!q) return;
          const direct = geo.parseLatLng(q);
          if (direct) { store.update(f.coll, f.rec.id, { lat: direct.lat, lng: direct.lng, geoFail: false }); toast('Localisé !'); refresh(); return; }
          toast('Recherche en cours…');
          geo.geocode(q).then((ll) => {
            if (ll) { store.update(f.coll, f.rec.id, { lat: ll.lat, lng: ll.lng, geoFail: false }); toast('Localisé !'); refresh(); }
            else toast('Adresse introuvable, précisez-la', 'warn');
          });
        },
      });
    }

    function refresh() { drawAll(); renderToFix(); }

    // Géocodage automatique des éléments sans coordonnées
    async function resolveMissing() {
      const area = trip?.destination || '';
      const todo = [
        ...store.list('reservations').filter((r) => r.tripId === trip?.id && !hasCoords(r) && !r.geoFail).map((r) => ({ coll: 'reservations', rec: r, name: r.name || r.type, links: ['resaLink', 'site'] })),
        ...store.list('activities').filter((a) => a.tripId === trip?.id && !hasCoords(a) && !a.geoFail).map((a) => ({ coll: 'activities', rec: a, name: a.title, links: ['link'] })),
      ];
      if (!todo.length) return;
      setStatus(`Localisation automatique de ${todo.length} lieu(x)… (gardez la carte ouverte)`);
      let done = 0;
      for (const t of todo) {
        const ll = await geo.resolveOne(t.rec, t.links, t.name, area);
        if (ll) store.update(t.coll, t.rec.id, { lat: ll.lat, lng: ll.lng, geoFail: false });
        else store.update(t.coll, t.rec.id, { geoFail: true });
        done++; setStatus(`Localisation… ${done}/${todo.length}`);
        refresh();
      }
      setStatus('');
    }

    drawAll(); renderToFix();
    resolveMissing();

    // Filtres de couches
    el.querySelectorAll('.filter').forEach((b) => b.onclick = () => {
      const k = b.dataset.layer; b.classList.toggle('on');
      b.style.opacity = b.classList.contains('on') ? '1' : '.4';
      if (onLayer.has(k)) onLayer.delete(k); else onLayer.add(k);
      applyLayerVisibility();
    });

    // Ajout manuel d'un point (toujours possible)
    el.querySelector('.add').onclick = async () => {
      await modal({
        title: 'Nouveau point', body: `<form>
        <div class="field"><label>Nom</label><input name="name"></div>
        <div class="field"><label>Catégorie</label><select name="cat">${Object.keys(PLACE_EMOJI).map((c) => `<option>${c}</option>`).join('')}</select></div>
        <div class="field"><label>Adresse (sera localisée automatiquement)</label><input name="address" placeholder="Rue, ville, pays"></div>
        <div class="row"><div class="field"><label>Latitude (option.)</label><input name="lat" placeholder="auto"></div>
        <div class="field"><label>Longitude (option.)</label><input name="lng" placeholder="auto"></div></div>
        <p style="color:var(--ink-faint);font-size:.82rem">Astuce : cliquez sur la carte pour récupérer des coordonnées.</p></form>`,
        okText: 'Ajouter',
        onOk: async (d) => {
          d.tripId = trip?.id;
          if (d.lat && d.lng) { d.lat = +d.lat; d.lng = +d.lng; store.add('places', d); toast('Point ajouté'); refresh(); return; }
          delete d.lat; delete d.lng;
          const rec = store.add('places', d);
          if (d.address) { const ll = await geo.geocode(d.address); if (ll) { store.update('places', rec.id, { lat: ll.lat, lng: ll.lng }); toast('Point localisé et ajouté'); } else toast('Ajouté, mais adresse introuvable', 'warn'); }
          refresh();
        },
      });
    };

    map.on('click', (e) => toast(`Coordonnées : ${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)}`, 'ok'));

    // Import GPX (trace persistée + ajoutée aux randonnées)
    el.querySelector('.gpx').onclick = () => el.querySelector('#gpx-file').click();
    el.querySelector('#gpx-file').onchange = (ev) => {
      const file = ev.target.files[0]; if (!file) return;
      const fr = new FileReader();
      fr.onload = () => {
        const doc = new DOMParser().parseFromString(fr.result, 'text/xml');
        let pts = [...doc.querySelectorAll('trkpt,rtept')].map((p) => [+p.getAttribute('lat'), +p.getAttribute('lon')]).filter((p) => !isNaN(p[0]) && !isNaN(p[1]));
        if (!pts.length) return toast('GPX vide ou illisible', 'warn');
        let dist = 0; for (let i = 1; i < pts.length; i++) dist += haversine(pts[i - 1], pts[i]);
        if (pts.length > 250) { const step = Math.ceil(pts.length / 250); pts = pts.filter((_, i) => i % step === 0 || i === pts.length - 1); } // allège la trace
        store.add('hikes', { tripId: trip?.id, title: file.name.replace(/\.gpx$/i, ''), dist: dist.toFixed(1), deniv: '?', time: '?', date: new Date().toISOString().slice(0, 10), note: 'Importé via GPX', track: pts, lat: pts[0][0], lng: pts[0][1] });
        toast(`GPX importé · ${dist.toFixed(1)} km`);
        refresh();
      };
      fr.readAsText(file);
    };
  }, 60);

  return el;
}

function haversine(a, b) {
  const R = 6371, dLat = (b[0] - a[0]) * Math.PI / 180, dLon = (b[1] - a[1]) * Math.PI / 180;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * Math.PI / 180) * Math.cos(b[0] * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}
