// js/views/itineraries.js
// ─────────────────────────────────────────────────────────────────
// Améliorations v2 :
//   • Calcul OSRM (routes réelles) avec bouton dédié
//   • Secours 3 niveaux : cache local → haversine → lien Google Maps
//   • Affichage durée réelle (ex: "2h34") en plus des km
//   • Lien Google Maps multi-étapes
// Données existantes : compatibles — osrmData est un champ additionnel
// ─────────────────────────────────────────────────────────────────
import { store } from '../store.js';
import { icon, modal, toast, confirmDialog, fmtMoney, esc } from '../lib/ui.js';

function haversine(a,b){
  const R=6371, dLat=(b.lat-a.lat)*Math.PI/180, dLon=(b.lng-a.lng)*Math.PI/180;
  const s=Math.sin(dLat/2)**2+Math.cos(a.lat*Math.PI/180)*Math.cos(b.lat*Math.PI/180)*Math.sin(dLon/2)**2;
  return R*2*Math.atan2(Math.sqrt(s),Math.sqrt(1-s));
}

function fmtDuration(seconds) {
  if (!seconds) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  if (h === 0) return `${m} min`;
  return m > 0 ? `${h}h${String(m).padStart(2,'0')}` : `${h}h`;
}

// ── OSRM : calcul de l'itinéraire réel ────────────────────────
async function fetchOSRM(stops) {
  if (stops.length < 2) return null;
  const coords = stops.map(s => `${s.lng},${s.lat}`).join(';');
  const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=false&steps=false`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    const json = await res.json();
    if (json.code !== 'Ok' || !json.routes?.[0]) return null;
    const route = json.routes[0];
    // Découper par legs (segments entre étapes)
    return {
      totalDist:     Math.round(route.distance / 1000),  // km
      totalDuration: route.duration,                      // secondes
      legs: route.legs.map(l => ({
        dist:     Math.round(l.distance / 1000),
        duration: l.duration,
      })),
      fetchedAt: Date.now(),
    };
  } catch {
    return null;
  }
}

// Lien Google Maps multi-étapes
function googleMapsLink(stops) {
  if (stops.length < 2) return null;
  const origin = `${stops[0].lat},${stops[0].lng}`;
  const dest   = `${stops[stops.length-1].lat},${stops[stops.length-1].lng}`;
  const waypts = stops.slice(1,-1).map(s => `${s.lat},${s.lng}`).join('|');
  const base   = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}`;
  return waypts ? `${base}&waypoints=${waypts}` : base;
}

export function Itineraries() {
  const el  = document.createElement('div');
  const trip = store.activeTrip();
  let computing = false;

  function getIt() {
    let it = store.list('itineraries').find(i => i.tripId === trip?.id);
    // BUG-04 : ne créer l'itinéraire vide que si un voyage actif existe
    if (!it && trip?.id) it = store.add('itineraries', { tripId: trip.id, stops: [] });
    return it;
  }

  function totalsHaversine(stops) {
    let d = 0;
    for (let i = 1; i < stops.length; i++) d += haversine(stops[i-1], stops[i]);
    return { d: Math.round(d), fuel: d/100*10*1.85 };
  }

  function render() {
    const it = getIt();
    // BUG-04 : si aucun voyage actif, getIt() renvoie undefined — afficher message vide
    if (!it) { el.innerHTML = '<p style="color:var(--ink-faint);padding:20px">Sélectionnez un voyage pour gérer son itinéraire.</p>'; return; }
    const osrm = it.osrmData;
    const hasOSRM = osrm && osrm.legs && osrm.legs.length === it.stops.length - 1;
    const hav  = totalsHaversine(it.stops);
    const dist = hasOSRM ? osrm.totalDist : hav.d;
    const fuel = dist/100*10*1.85;
    const gmLink = googleMapsLink(it.stops);

    el.innerHTML = `
      <div class="section-head" style="margin-top:0">
        <h3>🧭 Itinéraire — ${esc(trip?.title||'')}</h3>
        <div class="spacer"></div>
        ${gmLink ? `<a class="btn ghost" href="${gmLink}" target="_blank" rel="noopener">${icon('map')} Google Maps</a>` : ''}
        <button class="btn ghost opt">${icon('route')} Optimiser</button>
        <button class="btn primary add">${icon('plus')} Étape</button>
      </div>

      <div class="grid g-3">
        <div class="card stat">
          <div class="label">📏 Distance ${hasOSRM ? '<span class="tag sage" style="font-size:.65rem;padding:2px 6px">Route réelle</span>' : '<span class="tag" style="font-size:.65rem;padding:2px 6px">À vol d\'oiseau</span>'}</div>
          <div class="value">${dist} <small>km</small></div>
        </div>
        <div class="card stat">
          <div class="label">⏱️ Durée estimée</div>
          <div class="value">${hasOSRM ? fmtDuration(osrm.totalDuration) : '—'}</div>
          ${!hasOSRM && it.stops.length >= 2 ? `<div class="sub" style="color:var(--sage-deep);cursor:pointer" id="calc-link">Calculer la durée réelle</div>` : ''}
        </div>
        <div class="card stat">
          <div class="label">⛽ Carburant estimé</div>
          <div class="value">${fmtMoney(fuel)}</div>
          <div class="sub">10 L/100 · 1,85 €/L</div>
        </div>
      </div>

      ${it.stops.length >= 2 ? `
      <div style="display:flex;align-items:center;gap:10px;margin:14px 0 4px;flex-wrap:wrap">
        <button class="btn ${computing?'ghost':'primary'} osrm-btn" ${computing?'disabled':''}>
          ${computing ? '⏳ Calcul en cours…' : icon('route')+' Calculer l\'itinéraire réel (OSRM)'}
        </button>
        ${hasOSRM ? `<span style="font-size:.82rem;color:var(--ink-faint)">Calculé · ${new Date(osrm.fetchedAt).toLocaleDateString('fr-FR')}</span>` : `<span style="font-size:.82rem;color:var(--ink-faint)">Distances à vol d'oiseau — cliquez pour les distances réelles par route</span>`}
      </div>` : ''}

      <div class="section-head"><h3>Parcours</h3></div>
      <div class="timeline">
        ${it.stops.length ? it.stops.map((s,i) => {
          const segOSRM = hasOSRM && i > 0 ? osrm.legs[i-1] : null;
          const segHav  = i > 0 ? Math.round(haversine(it.stops[i-1], s)) : 0;
          const segDist = segOSRM ? segOSRM.dist : segHav;
          const segDur  = segOSRM ? ` · ${fmtDuration(segOSRM.duration)}` : '';
          return `
          <div class="tl-item ${i===0?'now':'future'}">
            <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
              <b>${esc(s.name)}</b>
              ${i>0
                ? `<span class="tag">${segDist} km${segDur}</span>`
                : '<span class="tag sage">départ</span>'}
              <div style="flex:1"></div>
              <button class="icon-btn up" data-i="${i}" ${i===0?'disabled':''}>↑</button>
              <button class="icon-btn del" data-i="${i}">${icon('trash')}</button>
            </div>
          </div>`;
        }).join('') : '<p style="color:var(--ink-faint)">Aucune étape. Ajoutez votre point de départ.</p>'}
      </div>

      <div class="section-head"><h3>💡 Suggestions d'étapes</h3></div>
      <div class="grid g-3">
        ${store.list('places').filter(p=>p.tripId===trip?.id).slice(0,6).map(p=>`
          <div class="card hoverable" style="display:flex;align-items:center;gap:10px">
            <span style="font-size:22px">📍</span>
            <div style="flex:1"><b>${esc(p.name)}</b><br><small style="color:var(--ink-faint)">${esc(p.cat)}</small></div>
            <button class="btn sm primary sug" data-n="${esc(p.name)}" data-lat="${p.lat}" data-lng="${p.lng}">${icon('plus')}</button>
          </div>`).join('')}
      </div>`;

    // ── Events ─────────────────────────────────────────────────
    el.querySelector('.add').onclick = async () => {
      await modal({ title:'Ajouter une étape', body:`<form>
        <div class="field"><label>Nom de l'étape</label><input name="name"></div>
        <div class="row">
          <div class="field"><label>Latitude</label><input name="lat" value="48.2"></div>
          <div class="field"><label>Longitude</label><input name="lng" value="-3.5"></div>
        </div></form>`,
        okText:'Ajouter',
        onOk:(d)=>{ it.stops.push({name:d.name,lat:+d.lat,lng:+d.lng}); store.update('itineraries',it.id,{stops:it.stops,osrmData:null}); toast('Étape ajoutée'); }
      });
      render();
    };

    el.querySelector('.opt').onclick = () => {
      if (it.stops.length<3) return toast('Au moins 3 étapes nécessaires','warn');
      const start=it.stops[0]; const rest=it.stops.slice(1); const path=[start];
      while(rest.length){ let bi=0,bd=1e9; rest.forEach((s,i)=>{const dd=haversine(path[path.length-1],s); if(dd<bd){bd=dd;bi=i;}}); path.push(rest.splice(bi,1)[0]); }
      store.update('itineraries',it.id,{stops:path,osrmData:null}); toast('Parcours optimisé 🧭'); render();
    };

    // Bouton OSRM
    el.querySelector('.osrm-btn')?.addEventListener('click', async () => {
      if (computing || it.stops.length < 2) return;
      computing = true; render();
      toast('Calcul de l\'itinéraire réel…');
      const result = await fetchOSRM(it.stops);
      computing = false;
      if (result) {
        store.update('itineraries', it.id, { osrmData: result });
        toast(`✅ Itinéraire calculé — ${result.totalDist} km · ${fmtDuration(result.totalDuration)}`);
      } else {
        // Secours : lien Google Maps
        toast('OSRM indisponible — distances à vol d\'oiseau conservées', 'warn');
        if (gmLink) {
          setTimeout(() => {
            if (confirm('Ouvrir Google Maps pour la navigation réelle ?')) window.open(gmLink, '_blank');
          }, 500);
        }
      }
      render();
    });

    // Lien "Calculer la durée réelle" dans la stat card
    el.querySelector('#calc-link')?.addEventListener('click', () => {
      el.querySelector('.osrm-btn')?.click();
    });

    el.querySelectorAll('.up').forEach(b=>b.onclick=()=>{
      const i=+b.dataset.i;
      [it.stops[i-1],it.stops[i]]=[it.stops[i],it.stops[i-1]];
      store.update('itineraries',it.id,{stops:it.stops,osrmData:null}); render();
    });
    el.querySelectorAll('.del').forEach(b=>b.onclick=async()=>{
      if(await confirmDialog('Supprimer','Retirer cette étape ?')){
        it.stops.splice(+b.dataset.i,1);
        store.update('itineraries',it.id,{stops:it.stops,osrmData:null}); render();
      }
    });
    el.querySelectorAll('.sug').forEach(b=>b.onclick=()=>{
      it.stops.push({name:b.dataset.n,lat:+b.dataset.lat,lng:+b.dataset.lng});
      store.update('itineraries',it.id,{stops:it.stops,osrmData:null}); toast('Ajouté au parcours'); render();
    });
  }

  render();
  return el;
}
