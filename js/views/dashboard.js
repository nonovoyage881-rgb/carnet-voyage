// js/views/dashboard.js — Refonte visuelle "Premium Travel"
// Données, calculs, navigation et mini-carte Leaflet identiques à la version précédente.
import { store } from '../store.js';
import { icon, fmtMoney, fmtDate, fmtDateShort, daysUntil, esc } from '../lib/ui.js';
import { media } from '../lib/media.js';
import { ownerBadgeHTML, ownerMiniLineHTML } from '../lib/tripOwners.js';

const DEFAULT_ACTIVITY_IMAGE = 'assets/activity-default.svg';
const hasCoords = (x) => x && typeof x.lat === 'number' && typeof x.lng === 'number' && !isNaN(x.lat) && !isNaN(x.lng);
const firstPhoto = (x) => (Array.isArray(x?.photos) && x.photos[0]?.id) ? x.photos[0] : null;
const activityImageHTML = (a) => {
  const photo = firstPhoto(a);
  return photo ? `<img data-media="${photo.id}" alt="">` : `<img src="${DEFAULT_ACTIVITY_IMAGE}" alt="">`;
};

export function Dashboard(nav) {
  const el = document.createElement('div');
  const trip = store.activeTrip();
  const d = trip ? daysUntil(trip.start) : null;

  const expenses = store.list('expenses').filter(e => e.tripId === trip?.id);
  const spent = expenses.reduce((s,e)=>s+Number(e.amount||0),0);
  const remaining = (trip?.budget||0) - spent;
  const spentPct = trip?.budget ? Math.min(100, Math.round(spent / trip.budget * 100)) : 0;

  const recentActs = store.list('activities').filter(a=>a.tripId===trip?.id).slice(-3).reverse();
  const upcomingRes = store.list('reservations')
    .filter(r => (!r.tripId || r.tripId === trip?.id))
    .sort((a,b)=>(a.arrDate||'').localeCompare(b.arrDate||''))
    .filter(r => r.arrDate).slice(0,3);
  const weather = store.setting('weather') || { temp:22, label:'Ensoleillé', emoji:'☀️' };

  const placesCount = store.list('places').filter(p=>p.tripId===trip?.id).length;
  const coverPhoto = trip?.photos && trip.photos[0];
  const kicker = trip?.status==='futur' ? 'Prochain voyage' : trip?.status==='encours' ? 'Voyage en cours' : 'Carnet de voyage';

  el.innerHTML = `
    <div class="hero${coverPhoto ? ' has-photo' : ''}">
      ${coverPhoto ? `<img class="hero-photo" data-media="${coverPhoto.id}" alt="">` : ''}
      ${coverPhoto ? `<div class="hero-overlay"></div>` : ''}
      <div class="hero-content">
        <div>
          <div class="kicker">${esc(kicker)}</div>
          <h2>${esc(trip?.title||'Aucun voyage')}</h2>
          ${!trip ? `<p>Créez votre premier voyage pour démarrer.</p>` : ''}
          <div class="chips">
            ${d!=null?`<span>${icon('clock')} J−${d} avant le départ</span>`:''}
            <span>${icon('globe')} ${esc(trip?.destination||'—')}</span>
            <span>${icon('calendar')} ${fmtDateShort(trip?.start)} → ${fmtDateShort(trip?.end)}</span>
            ${trip ? `<span>👤 ${ownerMiniLineHTML(trip).replace(' · 👤 ', '') || 'Non attribué'}</span>` : ''}
          </div>
          ${trip ? ownerBadgeHTML(trip) : ''}
        </div>
        ${trip ? `<a class="hero-cta" data-go="trips">Voir les détails</a>` : ''}
      </div>
    </div>

    <div class="grid g-4">
      <div class="card stat hoverable" data-go="trips">
        <div class="topline">
          <div class="stat-ic">${icon('clock')}</div>
        </div>
        <div class="value">${d!=null? (d>=0?`${d}`:'•') : '—'}<small>${d!=null&&d>=0?' jours':''}</small></div>
        <div class="label">Avant le départ</div>
        <div class="sub">Début : ${fmtDate(trip?.start)}</div>
      </div>

      <div class="card stat hoverable" style="position:relative;overflow:hidden" data-go="map">
        <div class="bento-decor">${icon('map')}</div>
        <div class="stat-ic">${icon('compass')}</div>
        <div class="value sm" style="font-size:1.6rem">${esc(trip?.destination||'—')}</div>
        <div class="sub">${esc(trip?.title||'')}${trip ? ownerMiniLineHTML(trip) : ''}</div>
        <div class="map-tag">${icon('pin')} ${placesCount} point${placesCount===1?'':'s'} sur la carte</div>
      </div>

      <div class="card stat hoverable" data-go="budget">
        <div class="topline">
          <div class="stat-ic">${icon('wallet')}</div>
          <div class="right">
            <span class="lbl">Budget total</span>
            <span class="val">${fmtMoney(trip?.budget||0)}</span>
          </div>
        </div>
        <div class="value" style="color:${remaining<0?'var(--danger)':'var(--ink)'}">${fmtMoney(remaining)}<small> restants</small></div>
        <div class="progress" style="margin-top:12px"><span style="width:${spentPct}%"></span></div>
        <div class="sub" style="text-align:right">Dépensé : ${fmtMoney(spent)} / ${fmtMoney(trip?.budget||0)}</div>
      </div>

      <div class="card stat hoverable" data-go="weather">
        <div class="stat-ic">${icon('cloud')}</div>
        <div class="value">${weather.temp}<small>°C</small></div>
        <div class="label">${esc(weather.label)}</div>
        <div class="sub">Aujourd'hui${trip?.destination ? ' · '+esc(trip.destination) : ''}</div>
        <div class="weather-bars"><span class="on"></span><span class="on"></span><span></span></div>
      </div>
    </div>

    <div class="grid g-2" style="margin-top:18px;align-items:start">
      <div class="card">
        <div class="section-head" style="margin:0 0 14px"><h3>Dernières activités</h3><div class="spacer"></div>
          <button class="btn sm ghost" data-go="activities">Voir tout</button></div>
        <div class="list">
          ${recentActs.length?recentActs.map(a=>`
            <div class="act-row">
              <div class="thumb">${activityImageHTML(a)}</div>
              <div class="body"><h5>${esc(a.title)}</h5><small>${icon('star')}${esc(a.cat)} · ${esc(a.status)}</small></div>
              <div class="fav">${icon('heart')}</div>
              ${a.pets?`<span class="tag sage">${icon('paw')}</span>`:''}
            </div>`).join('') : '<p style="color:var(--ink-faint)">Aucune activité encore.</p>'}
        </div>
      </div>

      <div class="card" style="display:flex;flex-direction:column">
        <div class="section-head" style="margin:0 0 14px"><h3>Prochaines réservations</h3><div class="spacer"></div>
          <button class="btn sm ghost" data-go="reservations">Ouvrir</button></div>
        ${upcomingRes.length?`<div class="list">${upcomingRes.map(r=>`
            <div class="act-row">
              <div class="thumb">${icon(r.type==='Camping'?'tent':'ticket')}</div>
              <div class="body"><h5>${esc(r.name||r.type)}</h5><small>${esc(r.type||'')} · ${fmtDateShort(r.arrDate)}</small></div>
            </div>`).join('')}</div>` : `
          <div class="empty-card">
            <div class="circle">${icon('calendar')}</div>
            <h4>Aucune réservation à venir</h4>
            <p>Planifiez votre prochain séjour en ajoutant des hôtels, vols ou activités.</p>
            <button class="btn-pill-outline" data-go="reservations">${icon('plus')} Ajouter une réservation</button>
          </div>`}
      </div>
    </div>

    <div class="section-head"><h3>Carte du voyage</h3><div class="spacer"></div>
      <button class="btn sm sky" data-go="map">Ouvrir la carte</button></div>
    <div id="mini-map" class="map card" style="height:300px;padding:0;overflow:hidden"></div>
  `;

  el.querySelectorAll('[data-go]').forEach(b => b.onclick = () => nav(b.dataset.go));

  media.hydrate(el);

  // mini carte Leaflet
  setTimeout(() => {
    if (!window.L) return;
    const points = [];
    const addPoint = (lat, lng) => { if (typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng)) points.push([lat, lng]); };
    const center = trip && hasCoords(trip) ? [trip.lat, trip.lng] : [46.6, 2.2];
    // BUG-13 : détruire l'instance Leaflet précédente si elle existe
    const miniMapNode = document.getElementById('mini-map');
    if (miniMapNode && miniMapNode._leaflet_id) { try { L.map(miniMapNode).remove(); } catch(e) {} }
    const map = L.map('mini-map', { scrollWheelZoom:false }).setView(center, 8);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution:'© OpenStreetMap', maxZoom:18 }).addTo(map);

    if (trip && hasCoords(trip)) {
      L.marker([trip.lat, trip.lng]).addTo(map).bindPopup(`<b>${esc(trip.title || 'Voyage')}</b>${trip.destination ? `<br>${esc(trip.destination)}` : ''}`);
      addPoint(trip.lat, trip.lng);
    }

    store.list('places').filter(p => p.tripId === trip?.id && hasCoords(p)).forEach(p => {
      L.marker([p.lat, p.lng]).addTo(map).bindPopup(`<b>${esc(p.name)}</b><br>${esc(p.cat)}`);
      addPoint(p.lat, p.lng);
    });

    store.list('activities').filter(a => (!a.tripId || a.tripId === trip?.id) && hasCoords(a)).forEach(a => {
      L.marker([a.lat, a.lng]).addTo(map).bindPopup(`<b>${esc(a.title)}</b>${a.cat ? `<br>${esc(a.cat)}` : ''}`);
      addPoint(a.lat, a.lng);
    });

    const itinerary = store.list('itineraries').find(i => i.tripId === trip?.id);
    (itinerary?.stops || []).filter(hasCoords).forEach((stop, index) => {
      L.marker([stop.lat, stop.lng]).addTo(map).bindPopup(`<b>Étape ${index + 1}</b>${stop.name ? `<br>${esc(stop.name)}` : ''}`);
      addPoint(stop.lat, stop.lng);
    });

    if (points.length > 1) {
      try { map.fitBounds(points, { padding: [28, 28], maxZoom: 12 }); } catch (e) {}
    } else if (points.length === 1) {
      map.setView(points[0], 10);
    }
  }, 80);

  return el;
}
