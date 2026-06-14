// js/views/map.js — Carte = vue cohérente du voyage
// Source principale des marqueurs : Programme -> fiches Activité.
// Les anciennes données séparées (places, itineraries, hikes) sont conservées
// et affichées comme couches complémentaires, sans devenir la source principale.
import { store } from '../store.js';
import { icon, modal, toast, esc } from '../lib/ui.js';
import * as geo from '../lib/geo.js';

const PLACE_EMOJI = {
  'Camping': '⛺', 'Activité': '🎒', 'Randonnée': '🥾', 'Restaurant': '🍽️', 'Supermarché': '🛒',
  'Marché local': '🧺', 'Station-service': '⛽', 'Point d’eau': '🚰', 'Aire de services': '🚐',
};
const RES_EMOJI = { 'Camping': '⛺', 'Hôtel': '🏨', 'Ferry': '⛴️', 'Train': '🚆', 'Restaurant': '🍽️', 'Activité': '🎟️', 'Aire de services': '🚐', 'Autre': '📍' };
const ACT_EMOJI = { 'Visite': '🏛️', 'Marché': '🧺', 'Randonnée': '🥾', 'Plage': '🏖️', 'Lac': '🌊', 'Restaurant': '🍽️', 'Point de vue': '🌄', 'Sport': '🚴', 'Autre': '📍' };

const LAYERS = [
  { key: 'program', label: 'Programme', emoji: '🗓️', on: true },
  { key: 'reservations', label: 'Réservations', emoji: '🏨', on: true },
  { key: 'route', label: 'Trajets', emoji: '🧭', on: true },
  { key: 'places', label: 'Points manuels', emoji: '📍', on: false },
  { key: 'hikes', label: 'Traces GPX', emoji: '🥾', on: false },
];

const hasCoords = (x) => {
  const lat = Number(x?.lat);
  const lng = Number(x?.lng);
  return Number.isFinite(lat) && Number.isFinite(lng);
};
const coords = (x) => ({ lat: Number(x.lat), lng: Number(x.lng) });
const norm = (v) => String(v || '').trim().toLowerCase();

function mapsLinkFor(x, fallback = '') {
  if (hasCoords(x)) {
    const c = coords(x);
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${c.lat},${c.lng}`)}`;
  }
  const q = x?.address || x?.city || x?.name || x?.title || fallback;
  return q ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}` : '';
}

function activeProgramsForTrip(trip) {
  if (!trip?.id) return [];
  return store.list('programs').filter((p) => p.linkedTripId === trip.id);
}

function findActivityForProgramItem(item, tripId) {
  if (!item) return null;
  if (item.activityId) {
    const byId = store.doc('activities', item.activityId);
    if (byId && (!byId.tripId || byId.tripId === tripId)) return byId;
  }
  const label = norm(item.label);
  if (!label) return null;
  return store.list('activities').find((a) => (!a.tripId || a.tripId === tripId) && norm(a.title) === label) || null;
}

function collectProgramActivityEntries(trip) {
  const programs = activeProgramsForTrip(trip);
  const entries = [];
  const seen = new Set();

  programs.forEach((program) => {
    (program.programme || []).forEach((day, dayIndex) => {
      (day.items || []).forEach((item, itemIndex) => {
        const act = findActivityForProgramItem(item, trip?.id);
        if (!act) return;
        const key = `${act.id}:${dayIndex}:${itemIndex}`;
        if (seen.has(key)) return;
        seen.add(key);
        entries.push({ program, day, item, act, dayIndex, itemIndex });
      });
    });
  });

  if (entries.length) return { entries, source: 'program', programs };

  // Sécurité anti-perte : si aucun programme n'est relié au voyage, on garde
  // l'ancien comportement en repli, afin que les activités déjà saisies restent visibles.
  const fallbackActs = store.list('activities').filter((a) => !a.tripId || a.tripId === trip?.id);
  return {
    entries: fallbackActs.map((act, i) => ({ program: null, day: null, item: null, act, dayIndex: 0, itemIndex: i })),
    source: 'activities-fallback',
    programs,
  };
}

function uniqueActivities(entries) {
  const map = new Map();
  entries.forEach((e) => { if (e.act?.id && !map.has(e.act.id)) map.set(e.act.id, e); });
  return [...map.values()];
}

function entrySub(entry) {
  const parts = [];
  if (entry.day?.day) parts.push(entry.day.day);
  if (entry.item?.plannedTime) parts.push(entry.item.plannedTime);
  if (entry.act?.cat) parts.push(entry.act.cat);
  if (entry.act?.address || entry.act?.city) parts.push(entry.act.address || entry.act.city);
  return parts.filter(Boolean).join(' · ');
}

function activityName(entry) {
  return entry.act?.title || entry.item?.label || 'Activité';
}

export function MapView() {
  const el = document.createElement('div');
  const trip = store.activeTrip();
  const collected = collectProgramActivityEntries(trip);
  const programCount = uniqueActivities(collected.entries).length;
  const sourceText = collected.source === 'program'
    ? `${programCount} activité${programCount > 1 ? 's' : ''} issue${programCount > 1 ? 's' : ''} du Programme.`
    : `${programCount} activité${programCount > 1 ? 's' : ''} affichée${programCount > 1 ? 's' : ''} en repli, car aucun Programme n'est encore relié à ce voyage.`;
  const onLayer = new Set(LAYERS.filter((l) => l.on).map((l) => l.key));

  el.innerHTML = `
    <div class="section-head" style="margin-top:0"><h3>Carte — ${esc(trip?.title || '')}</h3><div class="spacer"></div>
      <button class="btn ghost offline-btn">${icon('wifi-off')} Hors-ligne</button>
      <button class="btn ghost gpx">${icon('upload')} Import GPX</button>
      <button class="btn primary add">${icon('plus')} Point manuel</button></div>
    <div class="card" style="margin-bottom:14px;border-left:5px solid var(--sage-deep)">
      <b>${icon('map')} Source des points</b>
      <p style="margin:6px 0 0;color:var(--ink-soft);font-size:.9rem">
        La carte lit d'abord les activités utilisées dans le Programme. Les anciens points manuels, itinéraires et traces GPX sont conservés dans des couches séparées.
        <br><span style="color:var(--ink-faint)">${esc(sourceText)}</span>
      </p>
    </div>
    <div class="map-layers">
      ${LAYERS.map((l) => `<button class="tag sage filter ${l.on ? 'on' : ''}" style="opacity:${l.on ? '1' : '.4'}" data-layer="${l.key}">${l.emoji} ${l.label}</button>`).join('')}
    </div>
    <div id="geo-status" class="geo-status" hidden></div>
    <div id="offline-status" class="geo-status" hidden></div>
    <div id="map"></div>
    <div id="tofix"></div>
    <input type="file" id="gpx-file" accept=".gpx" hidden>`;

  const statusEl = () => el.querySelector('#geo-status');
  function setStatus(txt) { const s = statusEl(); if (!s) return; if (txt) { s.hidden = false; s.textContent = txt; } else s.hidden = true; }

  setTimeout(() => {
    if (!window.L) { el.querySelector('#map').innerHTML = '<p style="padding:20px">Carte indisponible hors ligne.</p>'; return; }
    const center = trip && hasCoords(trip) ? [Number(trip.lat), Number(trip.lng)] : [46.6, 2.2];
    const mapNode = el.querySelector('#map');
    if (mapNode._leaflet_id) { try { L.map(mapNode).remove(); } catch(e) {} }
    const map = L.map('map').setView(center, 7);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap', maxZoom: 18 }).addTo(map);

    const groups = {}; LAYERS.forEach((l) => { groups[l.key] = L.layerGroup(); if (onLayer.has(l.key)) groups[l.key].addTo(map); });
    const tripLayer = L.layerGroup().addTo(map);

    function marker(lat, lng, emoji, title, sub, link) {
      const ic = L.divIcon({ html: `<div style="font-size:26px;filter:drop-shadow(0 2px 3px rgba(0,0,0,.35))">${emoji}</div>`, className: '', iconSize: [30, 30], iconAnchor: [15, 28] });
      const action = link ? `<br><a href="${esc(link)}" target="_blank" rel="noopener" style="display:inline-block;margin-top:8px;font-weight:800;color:#8f4e30">Y aller</a>` : '';
      return L.marker([lat, lng], { icon: ic }).bindPopup(`<b>${esc(title)}</b>${sub ? `<br>${esc(sub)}` : ''}${action}`);
    }

    function drawProgramRoute(entries, boundsPush) {
      const itinerary = store.list('itineraries').find((i) => i.tripId === trip?.id);

      // Ancien itinéraire conservé : affiché dans la couche Trajets si présent.
      if (itinerary?.stops?.length) {
        itinerary.stops.forEach((s, i) => {
          if (!hasCoords(s)) return;
          const c = coords(s);
          const ic = L.divIcon({ html: `<div class="route-dot">${i + 1}</div>`, className: '', iconSize: [24, 24], iconAnchor: [12, 12] });
          L.marker([c.lat, c.lng], { icon: ic }).bindPopup(`<b>Étape ${i + 1}</b><br>${esc(s.name || '')}`).addTo(groups.route);
          boundsPush(c.lat, c.lng);
        });
        const pts = itinerary.stops.filter(hasCoords).map((s) => [Number(s.lat), Number(s.lng)]);
        if (pts.length > 1) L.polyline(pts, { color: '#b4663f', weight: 3, dashArray: '6 8' }).addTo(groups.route);
        return;
      }

      // Si aucun itinéraire séparé n'existe, on trace simplement l'ordre du Programme.
      const routeEntries = entries.filter((e) => hasCoords(e.act));
      if (routeEntries.length < 2) return;
      routeEntries.forEach((e, i) => {
        const c = coords(e.act);
        const ic = L.divIcon({ html: `<div class="route-dot">${i + 1}</div>`, className: '', iconSize: [24, 24], iconAnchor: [12, 12] });
        L.marker([c.lat, c.lng], { icon: ic }).bindPopup(`<b>${esc(e.day?.day || `Étape ${i + 1}`)}</b><br>${esc(activityName(e))}`).addTo(groups.route);
      });
      L.polyline(routeEntries.map((e) => [Number(e.act.lat), Number(e.act.lng)]), { color: '#b4663f', weight: 3, dashArray: '6 8' }).addTo(groups.route);
    }

    function drawAll() {
      Object.values(groups).forEach((g) => g.clearLayers());
      tripLayer.clearLayers();
      const bounds = [];
      const push = (lat, lng) => bounds.push([Number(lat), Number(lng)]);

      if (trip && hasCoords(trip)) {
        const c = coords(trip);
        marker(c.lat, c.lng, '📍', trip.title || 'Voyage', trip.destination || '', mapsLinkFor(trip, trip.destination)).addTo(tripLayer);
        push(c.lat, c.lng);
      }

      const current = collectProgramActivityEntries(trip);
      const scheduledEntries = uniqueActivities(current.entries);

      // Source principale : activités du Programme.
      scheduledEntries.filter((e) => hasCoords(e.act)).forEach((e) => {
        const c = coords(e.act);
        marker(c.lat, c.lng, ACT_EMOJI[e.act.cat] || '🎒', activityName(e), entrySub(e), mapsLinkFor(e.act, activityName(e))).addTo(groups.program);
        push(c.lat, c.lng);
      });

      // Réservations liées au voyage : utiles, mais distinctes du Programme.
      store.list('reservations').filter((r) => (!r.tripId || r.tripId === trip?.id) && hasCoords(r)).forEach((r) => {
        const c = coords(r);
        marker(c.lat, c.lng, RES_EMOJI[r.type] || '🏨', r.name || r.type, [r.type, r.address].filter(Boolean).join(' · '), mapsLinkFor(r, r.name || r.type)).addTo(groups.reservations);
        push(c.lat, c.lng);
      });

      // Points manuels conservés en couche complémentaire, désactivée par défaut.
      store.list('places').filter((p) => p.tripId === trip?.id && hasCoords(p)).forEach((p) => {
        const c = coords(p);
        marker(c.lat, c.lng, PLACE_EMOJI[p.cat] || '📍', p.name, p.cat, mapsLinkFor(p, p.name)).addTo(groups.places);
        if (onLayer.has('places')) push(c.lat, c.lng);
      });

      drawProgramRoute(scheduledEntries, push);

      // Anciennes randonnées / traces GPX conservées.
      store.list('hikes').filter((h) => h.tripId === trip?.id).forEach((h) => {
        if (Array.isArray(h.track) && h.track.length > 1) {
          const line = L.polyline(h.track, { color: '#5f8ea0', weight: 4 }).bindPopup(`<b>${esc(h.title || 'Randonnée')}</b><br>${esc(h.dist || '')} km`);
          line.addTo(groups.hikes); if (onLayer.has('hikes')) h.track.forEach((pt) => push(pt[0], pt[1]));
        } else if (hasCoords(h)) {
          const c = coords(h);
          marker(c.lat, c.lng, '🥾', h.title || 'Randonnée', h.dist ? h.dist + ' km' : '', mapsLinkFor(h, h.title)).addTo(groups.hikes);
          if (onLayer.has('hikes')) push(c.lat, c.lng);
        }
      });

      applyLayerVisibility();
      if (bounds.length) { try { map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 }); } catch (e) {} }
    }

    function applyLayerVisibility() {
      LAYERS.forEach((l) => {
        if (onLayer.has(l.key)) { if (!map.hasLayer(groups[l.key])) groups[l.key].addTo(map); }
        else { map.removeLayer(groups[l.key]); }
      });
    }

    function renderToFix() {
      const current = collectProgramActivityEntries(trip);
      const activityFixes = uniqueActivities(current.entries)
        .filter((e) => e.act.geoFail && !hasCoords(e.act))
        .map((e) => ({ coll: 'activities', rec: e.act, name: activityName(e), hint: e.act.address || e.act.city || e.act.link || e.day?.day || '' }));
      const reservationFixes = store.list('reservations')
        .filter((r) => r.tripId === trip?.id && r.geoFail && !hasCoords(r))
        .map((r) => ({ coll: 'reservations', rec: r, name: r.name || r.type, hint: r.address || '' }));
      const failed = [...activityFixes, ...reservationFixes];
      const box = el.querySelector('#tofix');
      if (!failed.length) { box.innerHTML = ''; return; }
      box.innerHTML = `<div class="card" style="margin-top:16px;border-left:5px solid var(--warn)">
        <b>📍 ${failed.length} élément(s) à localiser</b>
        <p style="margin:6px 0 10px;color:var(--ink-soft);font-size:.88rem">L'adresse n'a pas pu être trouvée automatiquement. Renseignez-la pour l'afficher sur la carte, sans perdre l'information existante.</p>
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
          if (direct) { store.update(f.coll, f.rec.id, { lat: direct.lat, lng: direct.lng, address: f.rec.address || q, geoFail: false }); toast('Localisé !'); refresh(); return; }
          toast('Recherche en cours…');
          geo.geocode(q).then((ll) => {
            if (ll) { store.update(f.coll, f.rec.id, { lat: ll.lat, lng: ll.lng, address: f.rec.address || q, geoFail: false }); toast('Localisé !'); refresh(); }
            else toast('Adresse introuvable, précisez-la', 'warn');
          });
        },
      });
    }

    function refresh() { drawAll(); renderToFix(); }

    async function resolveMissing() {
      const area = trip?.destination || '';
      const current = collectProgramActivityEntries(trip);
      const programActivities = uniqueActivities(current.entries).map((e) => e.act);
      const todo = [
        ...programActivities.filter((a) => !hasCoords(a) && !a.geoFail).map((a) => ({ coll: 'activities', rec: a, name: a.title, links: ['link', 'website'] })),
        ...store.list('reservations').filter((r) => r.tripId === trip?.id && !hasCoords(r) && !r.geoFail).map((r) => ({ coll: 'reservations', rec: r, name: r.name || r.type, links: ['resaLink', 'site'] })),
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

    el.querySelector('.offline-btn').onclick = async () => {
      if (!trip || !hasCoords(trip)) {
        toast('Renseignez les coordonnées du voyage dans l\'onglet Voyages', 'warn');
        return;
      }
      const offStatus = el.querySelector('#offline-status');
      offStatus.hidden = false;
      offStatus.textContent = 'Mise en cache des tuiles…';

      const lat = Number(trip.lat), lng = Number(trip.lng);
      const tiles = [];
      for (let z = 8; z <= 12; z++) {
        const n  = Math.pow(2, z);
        const xC = Math.floor((lng + 180) / 360 * n);
        const yC = Math.floor((1 - Math.log(Math.tan(lat * Math.PI/180) + 1/Math.cos(lat * Math.PI/180)) / Math.PI) / 2 * n);
        const r  = z <= 9 ? 1 : z <= 11 ? 2 : 3;
        for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) tiles.push({ z, x: xC + dx, y: yC + dy });
      }

      let done = 0, errors = 0;
      const cache = await caches.open('cvs-tiles-v1').catch(() => null);
      if (!cache) { offStatus.textContent = 'Cache non disponible dans ce navigateur'; return; }

      for (const t of tiles) {
        const url = `https://tile.openstreetmap.org/${t.z}/${t.x}/${t.y}.png`;
        try {
          const cached = await cache.match(url);
          if (!cached) {
            const res = await fetch(url, { mode: 'cors' });
            if (res.ok) await cache.put(url, res);
          }
          done++;
        } catch { errors++; }
        if ((done + errors) % 5 === 0) offStatus.textContent = `Mise en cache… ${done}/${tiles.length} tuiles`;
        await new Promise(r => setTimeout(r, 50));
      }
      offStatus.textContent = `✅ ${done} tuiles mises en cache — carte disponible hors-ligne`;
      setTimeout(() => { offStatus.hidden = true; }, 4000);
      toast(`Carte hors-ligne prête — ${done} tuiles`);
    };

    el.querySelectorAll('.filter').forEach((b) => b.onclick = () => {
      const k = b.dataset.layer; b.classList.toggle('on');
      b.style.opacity = b.classList.contains('on') ? '1' : '.4';
      if (onLayer.has(k)) onLayer.delete(k); else onLayer.add(k);
      applyLayerVisibility();
    });

    el.querySelector('.add').onclick = async () => {
      await modal({
        title: 'Nouveau point manuel', body: `<form>
        <p style="color:var(--ink-soft);font-size:.86rem;margin-top:0">Les points importants doivent idéalement être renseignés dans les fiches Activité. Ce point manuel sert seulement de complément.</p>
        <div class="field"><label>Nom</label><input name="name"></div>
        <div class="field"><label>Catégorie</label><select name="cat">${Object.keys(PLACE_EMOJI).map((c) => `<option>${c}</option>`).join('')}</select></div>
        <div class="field"><label>Adresse (sera localisée automatiquement)</label><input name="address" placeholder="Rue, ville, pays"></div>
        <div class="row"><div class="field"><label>Latitude (option.)</label><input name="lat" placeholder="auto"></div>
        <div class="field"><label>Longitude (option.)</label><input name="lng" placeholder="auto"></div></div>
        <p style="color:var(--ink-faint);font-size:.82rem">Astuce : cliquez sur la carte pour récupérer des coordonnées.</p></form>`,
        okText: 'Ajouter',
        onOk: async (d) => {
          d.tripId = trip?.id;
          if (d.lat && d.lng) { d.lat = +d.lat; d.lng = +d.lng; store.add('places', d); toast('Point manuel ajouté'); refresh(); return; }
          delete d.lat; delete d.lng;
          const rec = store.add('places', d);
          if (d.address) {
            const ll = await geo.geocode(d.address);
            if (ll) { store.update('places', rec.id, { lat: ll.lat, lng: ll.lng }); toast('Point manuel localisé et ajouté'); }
            else toast('Ajouté, mais adresse introuvable', 'warn');
          }
          refresh();
        },
      });
    };

    map.on('click', (e) => toast(`Coordonnées : ${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)}`, 'ok'));

    el.querySelector('.gpx').onclick = () => el.querySelector('#gpx-file').click();
    el.querySelector('#gpx-file').onchange = (ev) => {
      const file = ev.target.files[0]; if (!file) return;
      const fr = new FileReader();
      fr.onload = () => {
        const doc = new DOMParser().parseFromString(fr.result, 'text/xml');
        let pts = [...doc.querySelectorAll('trkpt,rtept')].map((p) => [+p.getAttribute('lat'), +p.getAttribute('lon')]).filter((p) => !isNaN(p[0]) && !isNaN(p[1]));
        if (!pts.length) return toast('GPX vide ou illisible', 'warn');
        let dist = 0; for (let i = 1; i < pts.length; i++) dist += haversine(pts[i - 1], pts[i]);
        if (pts.length > 250) { const step = Math.ceil(pts.length / 250); pts = pts.filter((_, i) => i % step === 0 || i === pts.length - 1); }
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
