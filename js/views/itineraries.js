// js/views/itineraries.js
import { store } from '../store.js';
import { icon, modal, toast, confirmDialog, fmtMoney, esc } from '../lib/ui.js';

function haversine(a,b){ const R=6371,dLat=(b.lat-a.lat)*Math.PI/180,dLon=(b.lng-a.lng)*Math.PI/180;
  const s=Math.sin(dLat/2)**2+Math.cos(a.lat*Math.PI/180)*Math.cos(b.lat*Math.PI/180)*Math.sin(dLon/2)**2;
  return R*2*Math.atan2(Math.sqrt(s),Math.sqrt(1-s)); }

export function Itineraries() {
  const el = document.createElement('div');
  const trip = store.activeTrip();

  function getIt(){
    let it = store.list('itineraries').find(i=>i.tripId===trip?.id);
    if (!it) it = store.add('itineraries',{ tripId:trip?.id, stops:[] });
    return it;
  }

  function totals(stops){
    let d=0; for(let i=1;i<stops.length;i++) d+=haversine(stops[i-1],stops[i]);
    const fuel = d/100*10*1.85; // 10L/100, 1.85€/L
    return { d:Math.round(d), fuel };
  }

  function render() {
    const it = getIt();
    const t = totals(it.stops);
    el.innerHTML = `
      <div class="section-head"><h3>🧭 Itinéraire — ${esc(trip?.title||'')}</h3><div class="spacer"></div>
        <button class="btn ghost opt">${icon('route')} Optimiser</button>
        <button class="btn primary add">${icon('plus')} Étape</button></div>

      <div class="grid g-3">
        <div class="card stat"><div class="label">📏 Distance totale</div><div class="value">${t.d} km</div></div>
        <div class="card stat"><div class="label">⛽ Carburant estimé</div><div class="value">${fmtMoney(t.fuel)}</div><div class="sub">10 L/100 · 1,85 €/L</div></div>
        <div class="card stat"><div class="label">📍 Étapes</div><div class="value">${it.stops.length}</div></div>
      </div>

      <div class="section-head"><h3>Parcours</h3></div>
      <div class="timeline">
        ${it.stops.length?it.stops.map((s,i)=>`
          <div class="tl-item ${i===0?'now':'future'}">
            <div style="display:flex;align-items:center;gap:10px">
              <b>${esc(s.name)}</b>
              ${i>0?`<span class="tag">${Math.round(haversine(it.stops[i-1],s))} km</span>`:'<span class="tag sage">départ</span>'}
              <div style="flex:1"></div>
              <button class="icon-btn up" data-i="${i}" ${i===0?'disabled':''}>↑</button>
              <button class="icon-btn del" data-i="${i}">${icon('trash')}</button>
            </div>
          </div>`).join('') : '<p style="color:var(--ink-faint)">Aucune étape. Ajoutez votre point de départ.</p>'}
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

    el.querySelector('.add').onclick = async () => {
      await modal({ title:'Ajouter une étape', body:`<form>
        <div class="field"><label>Nom de l'étape</label><input name="name"></div>
        <div class="row"><div class="field"><label>Latitude</label><input name="lat" value="48.2"></div>
        <div class="field"><label>Longitude</label><input name="lng" value="-3.5"></div></div></form>`,
        okText:'Ajouter', onOk:(d)=>{ it.stops.push({name:d.name,lat:+d.lat,lng:+d.lng}); store.update('itineraries',it.id,{stops:it.stops}); toast('Étape ajoutée'); } });
      render();
    };
    el.querySelector('.opt').onclick = () => {
      if (it.stops.length<3) return toast('Au moins 3 étapes nécessaires','warn');
      // optimisation "plus proche voisin" en gardant le départ
      const start = it.stops[0]; const rest = it.stops.slice(1); const path=[start];
      while(rest.length){ let bi=0,bd=1e9; rest.forEach((s,i)=>{const dd=haversine(path[path.length-1],s); if(dd<bd){bd=dd;bi=i;}}); path.push(rest.splice(bi,1)[0]); }
      store.update('itineraries',it.id,{stops:path}); toast('Parcours optimisé 🧭'); render();
    };
    el.querySelectorAll('.up').forEach(b=>b.onclick=()=>{ const i=+b.dataset.i; [it.stops[i-1],it.stops[i]]=[it.stops[i],it.stops[i-1]]; store.update('itineraries',it.id,{stops:it.stops}); render(); });
    el.querySelectorAll('.del').forEach(b=>b.onclick=async()=>{ if(await confirmDialog('Supprimer','Retirer cette étape ?')){ it.stops.splice(+b.dataset.i,1); store.update('itineraries',it.id,{stops:it.stops}); render(); } });
    el.querySelectorAll('.sug').forEach(b=>b.onclick=()=>{ it.stops.push({name:b.dataset.n,lat:+b.dataset.lat,lng:+b.dataset.lng}); store.update('itineraries',it.id,{stops:it.stops}); toast('Ajouté au parcours'); render(); });
  }
  render();
  return el;
}
