// js/views/weather.js — météo réelle via Open-Meteo (gratuit, sans clé)
import { store } from '../store.js';
import { esc } from '../lib/ui.js';

const DAYS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

// Correspondance des codes météo WMO -> emoji + libellé (+ sévérité pour l'alerte)
function wmo(code) {
  const m = {
    0: ['☀️', 'Ensoleillé'], 1: ['🌤️', 'Plutôt ensoleillé'], 2: ['⛅', 'Partiellement nuageux'], 3: ['☁️', 'Couvert'],
    45: ['🌫️', 'Brouillard'], 48: ['🌫️', 'Brouillard givrant'],
    51: ['🌦️', 'Bruine légère'], 53: ['🌦️', 'Bruine'], 55: ['🌦️', 'Bruine dense'],
    56: ['🌧️', 'Bruine verglaçante'], 57: ['🌧️', 'Bruine verglaçante'],
    61: ['🌧️', 'Pluie faible'], 63: ['🌧️', 'Pluie'], 65: ['🌧️', 'Pluie forte'],
    66: ['🌧️', 'Pluie verglaçante'], 67: ['🌧️', 'Pluie verglaçante'],
    71: ['🌨️', 'Neige faible'], 73: ['🌨️', 'Neige'], 75: ['🌨️', 'Neige forte'], 77: ['🌨️', 'Grésil'],
    80: ['🌦️', 'Averses'], 81: ['🌦️', 'Averses'], 82: ['⛈️', 'Fortes averses'],
    85: ['🌨️', 'Averses de neige'], 86: ['🌨️', 'Averses de neige'],
    95: ['⛈️', 'Orages'], 96: ['⛈️', 'Orages, grêle'], 99: ['⛈️', 'Orages, grêle'],
  };
  const [e, l] = m[code] || ['🌡️', '—'];
  const severe = code >= 61 || (code >= 56 && code <= 57) || code === 95 || code === 96 || code === 99;
  return { e, l, severe };
}

// Repli déterministe hors-ligne (si Open-Meteo injoignable)
function demoForecast(seed, n = 7) {
  const E = ['☀️', '🌤️', '⛅', '🌧️', '⛈️', '🌫️']; const L = ['Ensoleillé', 'Belles éclaircies', 'Nuageux', 'Pluie', 'Orages', 'Brume'];
  const out = []; let s = seed;
  for (let i = 0; i < n; i++) { s = (s * 9301 + 49297) % 233280; const r = s / 233280; const k = Math.floor(r * E.length);
    out.push({ day: DAYS[(new Date().getDay() + i) % 7], e: E[k], t: Math.round(14 + r * 14), l: L[k], severe: k >= 3 }); }
  return out;
}

export function Weather() {
  const el = document.createElement('div');
  const trip = store.activeTrip();
  const lat = trip?.lat, lng = trip?.lng;

  el.innerHTML = `<div class="section-head" style="margin-top:0"><h3>Météo</h3></div>
    <div class="card"><p style="color:var(--ink-soft);margin:0">Chargement des prévisions…</p></div>`;

  paint();   // affichage (asynchrone)
  return el;

  async function paint() {
    let days = null, current = null, live = false;
    const stops = store.list('itineraries').find(i => i.tripId === trip?.id)?.stops || [];

    if (lat != null && lng != null) {
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}`
          + `&current=temperature_2m,weather_code`
          + `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max`
          + `&forecast_days=7&timezone=auto`;
        const r = await fetch(url);
        const j = await r.json();
        if (j && j.daily) {
          live = true;
          current = { t: Math.round(j.current.temperature_2m), ...wmo(j.current.weather_code) };
          days = j.daily.time.map((d, i) => {
            const w = wmo(j.daily.weather_code[i]);
            return { day: DAYS[new Date(d).getDay()], e: w.e, l: w.l, severe: w.severe,
              tmax: Math.round(j.daily.temperature_2m_max[i]), tmin: Math.round(j.daily.temperature_2m_min[i]),
              rain: j.daily.precipitation_probability_max?.[i] };
          });
        }
      } catch (e) { /* repli ci-dessous */ }
    }

    if (!days) {  // repli démo
      const seed = (trip?.destination || 'x').split('').reduce((a, c) => a + c.charCodeAt(0), 17);
      const d = demoForecast(seed);
      days = d.map(x => ({ day: x.day, e: x.e, l: x.l, severe: x.severe, tmax: x.t, tmin: x.t - 6, rain: null }));
      current = { t: d[0].t, e: d[0].e, l: d[0].l };
    }

    // mémorise pour le tableau de bord
    store.setting('weather', { temp: current.t, label: current.l, emoji: current.e });

    const alert = days.some(d => d.severe);

    // météo par étape (un seul appel multi-points si possible)
    let stopWeather = [];
    if (live && stops.length) {
      try {
        const la = stops.map(s => s.lat).join(','); const lo = stops.map(s => s.lng).join(',');
        const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${la}&longitude=${lo}&current=temperature_2m,weather_code&timezone=auto`);
        const j = await r.json();
        const arr = Array.isArray(j) ? j : [j];
        stopWeather = arr.map(o => ({ t: Math.round(o.current.temperature_2m), ...wmo(o.current.weather_code) }));
      } catch (e) { stopWeather = []; }
    }

    el.innerHTML = `
      <div class="section-head" style="margin-top:0"><h3>Météo</h3><div class="spacer"></div>
        ${live ? '<span class="tag sage dot">Temps réel</span>' : '<span class="tag warn dot">Hors-ligne · démo</span>'}</div>

      <div class="card weather-card">
        <div style="display:flex;align-items:center;gap:18px">
          <div style="font-size:60px">${current.e}</div>
          <div><div style="font-size:2.6rem;font-weight:700;font-family:var(--serif)">${current.t}°C</div>
            <div>${esc(current.l)}${trip?.destination ? ' · ' + esc(trip.destination) : ''}</div></div>
        </div>
      </div>

      ${alert ? `<div class="card" style="margin-top:14px;border-left:5px solid var(--warn)">
        <b>⚠️ Alerte météo</b><p style="margin:6px 0 0;color:var(--ink-soft)">Pluie, neige ou orages prévus dans les prochains jours — pensez à des activités d'intérieur.</p></div>` : ''}

      <div class="section-head"><h3>Prévisions sur 7 jours</h3></div>
      <div class="grid" style="grid-template-columns:repeat(7,1fr)">
        ${days.map(d => `<div class="weather-day"><div>${d.day}</div><div class="e">${d.e}</div>
          <div class="t">${d.tmax}°</div><small style="color:var(--ink-faint)">${d.tmin}°</small>
          ${d.rain != null ? `<small style="display:block;color:var(--sky-deep)">💧 ${d.rain}%</small>` : ''}</div>`).join('')}
      </div>

      <div class="section-head"><h3>Météo par étape</h3></div>
      <div class="list">
        ${stops.length ? stops.map((s, i) => {
          const w = stopWeather[i];
          return `<div class="item"><div class="ic">${w ? w.e : '🌡️'}</div>
            <div class="body"><b>${esc(s.name)}</b><small>${w ? esc(w.l) : 'Prévision indisponible'}</small></div>
            <div class="meta">${w ? `<b>${w.t}°C</b>` : ''}</div></div>`; }).join('')
        : '<p style="color:var(--ink-faint)">Ajoutez des étapes dans « Itinéraires » pour voir la météo de chaque lieu.</p>'}
      </div>

      <p style="color:var(--ink-faint);font-size:.82rem;margin-top:14px">
        ${live ? 'Données en temps réel fournies par Open-Meteo (gratuit). Pour une météo précise, renseignez les coordonnées du voyage dans l\'onglet Voyages.'
               : 'Prévisions de démonstration (pas de réseau pour le moment).'}</p>`;
  }
}
