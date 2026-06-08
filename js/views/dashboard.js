// js/views/dashboard.js
import { store } from '../store.js';
import { icon, fmtMoney, fmtDate, fmtDateShort, daysUntil, esc } from '../lib/ui.js';

export function Dashboard(nav) {
  const el = document.createElement('div');
  const trip = store.activeTrip();
  const d = trip ? daysUntil(trip.start) : null;

  const expenses = store.list('expenses').filter(e => e.tripId === trip?.id);
  const spent = expenses.reduce((s,e)=>s+Number(e.amount||0),0);
  const remaining = (trip?.budget||0) - spent;

  const recentActs = store.list('activities').filter(a=>a.tripId===trip?.id).slice(-3).reverse();
  const upcomingRes = store.list('reservations')
    .filter(r => (!r.tripId || r.tripId === trip?.id))
    .sort((a,b)=>(a.arrDate||'').localeCompare(b.arrDate||''))
    .filter(r => r.arrDate).slice(0,3);
  const weather = store.setting('weather') || { temp:22, label:'Ensoleillé', emoji:'☀️' };

  el.innerHTML = `
    <div class="hero">
      <div class="kicker">${esc(trip?.status==='futur'?'Prochain voyage':trip?.status==='encours'?'Voyage en cours':'Carnet de voyage')}</div>
      <h2>${esc(trip?.title||'Aucun voyage')}</h2>
      <p>${esc(trip?.notes||'Créez votre premier voyage pour démarrer.')}</p>
      <div class="chips">
        ${d!=null?`<span>${icon('clock')} J−${d} avant le départ</span>`:''}
        <span>${icon('pin')} ${esc(trip?.destination||'—')}</span>
        <span>${icon('clock')} ${fmtDateShort(trip?.start)} → ${fmtDateShort(trip?.end)}</span>
      </div>
    </div>

    <div class="grid g-4">
      <div class="card stat hoverable" data-go="trips">
        <div class="stat-ic">${icon('clock')}</div>
        <div class="value">${d!=null? (d>=0?`${d}`:'•') : '—'}<small>${d!=null&&d>=0?' jours':''}</small></div>
        <div class="label">Avant le départ</div>
        <div class="sub">${fmtDate(trip?.start)}</div>
      </div>
      <div class="card stat hoverable" data-go="map">
        <div class="stat-ic">${icon('pin')}</div>
        <div class="value sm">${esc(trip?.destination||'—')}</div>
        <div class="label">Destination</div>
        <div class="sub">${(store.list('places').filter(p=>p.tripId===trip?.id)).length} points sur la carte</div>
      </div>
      <div class="card stat hoverable" data-go="budget">
        <div class="stat-ic">${icon('wallet')}</div>
        <div class="value" style="color:${remaining<0?'var(--danger)':'var(--ink)'}">${fmtMoney(remaining)}</div>
        <div class="label">Budget restant</div>
        <div class="sub">dépensé ${fmtMoney(spent)} / ${fmtMoney(trip?.budget)}</div>
      </div>
      <div class="card stat hoverable" data-go="weather">
        <div class="stat-ic">${icon('cloud')}</div>
        <div class="value">${weather.temp}<small>°C</small></div>
        <div class="label">Météo</div>
        <div class="sub">${esc(weather.label)}</div>
      </div>
    </div>

    <div class="grid g-2" style="margin-top:18px;align-items:start">
      <div class="card">
        <div class="section-head" style="margin:0 0 14px"><h3>Dernières activités</h3><div class="spacer"></div>
          <button class="btn sm ghost" data-go="activities">Voir tout</button></div>
        <div class="list">
          ${recentActs.length?recentActs.map(a=>`
            <div class="item" style="margin-bottom:8px;background:var(--surface-2)">
              <div class="ic">${icon('star')}</div><div class="body"><b>${esc(a.title)}</b><small>${esc(a.cat)} · ${esc(a.status)}</small></div>
              ${a.pets?`<span class="tag sage">${icon('paw')}</span>`:''}
            </div>`).join('') : '<p style="color:var(--ink-faint)">Aucune activité encore.</p>'}
        </div>
      </div>

      <div class="card">
        <div class="section-head" style="margin:0 0 14px"><h3>Prochaines réservations</h3><div class="spacer"></div>
          <button class="btn sm ghost" data-go="reservations">Ouvrir</button></div>
        <div class="list">
          ${upcomingRes.length?upcomingRes.map(r=>`
            <div class="item" style="margin-bottom:8px;background:var(--surface-2)">
              <div class="ic">${icon(r.type==='Camping'?'tent':'ticket')}</div>
              <div class="body"><b>${esc(r.name||r.type)}</b><small>${esc(r.type||'')} · ${fmtDateShort(r.arrDate)}</small></div>
            </div>`).join('') : '<p style="color:var(--ink-faint)">Aucune réservation à venir.</p>'}
        </div>
      </div>
    </div>

    <div class="section-head"><h3>Carte du voyage</h3><div class="spacer"></div>
      <button class="btn sm sky" data-go="map">Ouvrir la carte</button></div>
    <div id="mini-map" class="map" style="height:300px"></div>
  `;

  el.querySelectorAll('[data-go]').forEach(b => b.onclick = () => nav(b.dataset.go));

  // mini carte Leaflet
  setTimeout(() => {
    if (!window.L) return;
    const places = store.list('places').filter(p=>p.tripId===trip?.id);
    const center = trip ? [trip.lat, trip.lng] : [46.6, 2.2];
    // BUG-13 : détruire l'instance Leaflet précédente si elle existe
    const miniMapNode = document.getElementById('mini-map');
    if (miniMapNode && miniMapNode._leaflet_id) { try { L.map(miniMapNode).remove(); } catch(e) {} }
    const map = L.map('mini-map', { scrollWheelZoom:false }).setView(center, 8);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution:'© OpenStreetMap', maxZoom:18 }).addTo(map);
    places.forEach(p => L.marker([p.lat, p.lng]).addTo(map).bindPopup(`<b>${esc(p.name)}</b><br>${esc(p.cat)}`));
  }, 80);

  return el;
}
