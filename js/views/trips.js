// js/views/trips.js
import { store } from '../store.js';
import { icon, modal, toast, confirmDialog, fmtDate, daysUntil, esc, sheet } from '../lib/ui.js';
import { media } from '../lib/media.js';
import { currentOwnerPatch, assignTripToCurrentUser, ownerBadgeHTML, ownerMiniLineHTML } from '../lib/tripOwners.js';

const STATUS = { futur:{l:'Futur',c:'sky'}, encours:{l:'En cours',c:'warn'}, passe:{l:'Passé',c:''} };

function photoUploader(container, photos) {
  const draw = () => {
    container.innerHTML = `
      <div class="thumbs">
        ${photos.map((p, i) => `<div class="thumb"><img data-media="${p.id}" alt="">
          <button type="button" class="thumb-x" data-i="${i}">${icon('x')}</button></div>`).join('')}
        <button type="button" class="thumb add">${icon('camera')}<span>Ajouter</span></button>
      </div><input type="file" accept="image/*" multiple hidden>`;
    const file = container.querySelector('input[type=file]');
    container.querySelector('.add').onclick = () => file.click();
    file.onchange = async () => { for (const f of file.files) { try { photos.push(await media.save(f)); } catch (e) { toast("Impossible d'enregistrer cette photo (espace insuffisant)", "warn"); } } draw(); };
    container.querySelectorAll('.thumb-x').forEach(b => b.onclick = () => { const [rm] = photos.splice(+b.dataset.i, 1); if (rm) media.remove(rm.id); draw(); });
    media.hydrate(container);
  };
  draw();
}

export function Trips(nav) {
  const el = document.createElement('div');

  function form(rec) {
    const isEdit = !!rec;
    const photos = rec && rec.photos ? [...rec.photos] : [];
    const s = sheet({ title: isEdit ? 'Modifier le voyage' : 'Nouveau voyage', bodyHTML: `
      <div class="row">
        <div class="field"><label>Titre</label><input name="title" value="${esc(rec?.title||'')}"></div>
        <div class="field" style="flex:.4"><label>Emoji</label><input name="cover" value="${esc(rec?.cover||'🏕️')}"></div>
      </div>
      <div class="row">
        <div class="field"><label>Destination</label><input name="destination" value="${esc(rec?.destination||'')}"></div>
        <div class="field"><label>Statut</label><select name="status">${Object.entries(STATUS).map(([k,v])=>`<option value="${k}" ${rec?.status===k?'selected':''}>${v.l}</option>`).join('')}</select></div>
      </div>
      <div class="row">
        <div class="field"><label>Début</label><input name="start" type="date" value="${rec?.start||''}"></div>
        <div class="field"><label>Fin</label><input name="end" type="date" value="${rec?.end||''}"></div>
      </div>
      <div class="row">
        <div class="field"><label>Budget (€)</label><input name="budget" type="number" value="${rec?.budget||0}"></div>
        <div class="field"><label>Latitude</label><input name="lat" value="${rec?.lat||46.6}"></div>
        <div class="field"><label>Longitude</label><input name="lng" value="${rec?.lng||2.4}"></div>
      </div>
      <div class="field"><label>Photos du voyage</label><div id="ph"></div></div>
      <div class="field"><label>Notes / résumé</label><textarea name="notes">${esc(rec?.notes||'')}</textarea></div>` });
    photoUploader(s.body.querySelector('#ph'), photos);
    s.onOk(() => {
      const g = (n) => s.body.querySelector(`[name="${n}"]`).value;
      const title = g('title').trim(); if (!title) { toast('Indiquez un titre', 'warn'); return false; }
      const d = { title, cover: g('cover'), destination: g('destination'), status: g('status'),
        start: g('start'), end: g('end'), budget: +g('budget')||0, lat: +g('lat')||46.6, lng: +g('lng')||2.4,
        notes: g('notes'), photos, ...(isEdit ? {} : currentOwnerPatch()) };
      if (isEdit) store.update('trips', rec.id, d);
      else { const t = store.add('trips', d); store.setting('activeTripId', t.id); }
      toast(isEdit ? 'Modifié' : 'Voyage créé'); render();
    });
  }

  function render() {
    const trips = store.list('trips');
    const active = store.activeTrip();
    const journal = store.list('journal') || [];

    const shortText = (value = '', max = 120) => {
      const txt = String(value || '').replace(/\s+/g, ' ').trim();
      return txt.length > max ? `${txt.slice(0, max - 1).trim()}…` : txt;
    };

    const stayLength = (t) => {
      const a = Date.parse(t.start || '');
      const b = Date.parse(t.end || '');
      if (!Number.isFinite(a) || !Number.isFinite(b) || b < a) return 'Dates à préciser';
      const days = Math.max(1, Math.round((b - a) / 86400000) + 1);
      const nights = Math.max(0, days - 1);
      return nights ? `${days} jours · ${nights} nuit${nights > 1 ? 's' : ''}` : `${days} jour`;
    };

    const card = (t)=>{
      const isActive = t.id === active?.id;
      const statusLabel = STATUS[t.status]?.l || t.status || 'Statut';
      const statusClass = STATUS[t.status]?.c || '';
      const note = shortText(t.notes || '', 115);
      const budget = (+t.budget || 0) > 0 ? `${(+t.budget).toLocaleString('fr-FR')} €` : 'Budget à compléter';
      const ownerLine = ownerMiniLineHTML(t).replace(/^ · 👤\s*/, '') || 'Non attribué';

      return `
      <div class="card hoverable trip-card-compact ${isActive ? 'trip-card-compact--active' : ''}" style="${isActive?'border-color:var(--sage-deep);border-width:2px':''}">
        <div class="trip-card-compact-head">
          <div class="trip-card-compact-media">
            ${t.photos&&t.photos[0]
              ? `<img data-media="${t.photos[0].id}" alt="">`
              : `<span class="trip-card-compact-emoji">${t.cover||'🧭'}</span>`}
          </div>
          <div class="trip-card-compact-main">
            <div class="trip-card-compact-title-row">
              <h4 class="trip-card-compact-title">${esc(t.title)}</h4>
              <span class="tag ${statusClass}">${esc(statusLabel)}</span>
            </div>
            <div class="trip-card-compact-meta">
              <span>${icon('pin')} ${esc(t.destination || 'Destination à préciser')}</span>
              <span>${icon('calendar')} ${fmtDate(t.start)} → ${fmtDate(t.end)}</span>
              <span>${icon('users')} ${ownerLine}</span>
            </div>
            <div class="trip-card-compact-owner">${ownerBadgeHTML(t)}</div>
          </div>
        </div>

        <div class="trip-card-compact-grid">
          <div class="trip-card-compact-box">
            <div class="trip-card-compact-box-title">${icon('flag')} Trajet</div>
            <b>${esc(t.destination || 'Destination')}</b>
            <small>${esc(stayLength(t))}</small>
          </div>
          <div class="trip-card-compact-box">
            <div class="trip-card-compact-box-title">${icon('mountain')} Ambiance</div>
            <b>${esc(note || 'À compléter')}</b>
            <small>${esc(statusLabel)}</small>
          </div>
          <div class="trip-card-compact-box">
            <div class="trip-card-compact-box-title">${icon('bulb')} À retenir</div>
            <b>${esc(budget)}</b>
            <small>${isActive ? 'Voyage actif' : 'Voyage disponible'}</small>
          </div>
        </div>

        ${note ? `<div class="trip-card-compact-brief">
          <b>${icon('folder')} Le séjour en bref</b>
          <span>${esc(note)}</span>
        </div>` : ''}

        <div class="trip-card-compact-actions">
          ${isActive?'<span class="tag sage dot">Voyage actif</span>':`<button class="btn sm ghost setact" data-id="${t.id}">Définir actif</button>`}
          <div style="flex:1"></div>
          <button class="btn sm ghost edit" data-id="${t.id}">${icon('edit')} Modifier</button>
          <button class="btn sm ghost del" data-id="${t.id}">${icon('trash')} Supprimer</button>
        </div>
      </div>`;
    };

    const group = (s)=>trips.filter(t=>t.status===s);

    el.innerHTML = `
      <div class="section-head" style="margin-top:0"><h3>Voyages</h3><div class="spacer"></div>
        <button class="btn primary add">${icon('plus')} Nouveau voyage</button></div>

      ${['encours','futur','passe'].map(s=>{ const g=group(s); if(!g.length) return ''; return `
        <div class="section-head" style="margin-top:18px"><h3 style="font-size:1.05rem">${STATUS[s].l}${s==='futur'?' · à venir':''}</h3><span class="tag">${g.length}</span></div>
        <div class="grid g-2">${g.map(card).join('')}</div>`; }).join('')}

      <div class="section-head"><h3>Chronologie</h3></div>
      <div class="timeline">
        ${[...trips].sort((a,b)=>new Date(a.start)-new Date(b.start)).map(t=>`
          <div class="tl-item ${t.status==='encours'?'now':t.status==='futur'?'future':''}">
            <b>${esc(t.title)}</b> <span class="tag">${fmtDate(t.start)}</span>
            <div><small style="color:var(--ink-faint)">${esc(t.destination)}${t.status==='futur'?` · J−${daysUntil(t.start)}`:''}${ownerMiniLineHTML(t)}</small></div>
          </div>`).join('')}
      </div>

      <div class="section-head"><h3>Journal de bord — ${esc(active?.title||'')}</h3><div class="spacer"></div>
        <button class="btn sm primary jadd">${icon('plus')} Note</button></div>
      <div class="list">
        ${journal.filter(j=>j.tripId===active?.id).length?journal.filter(j=>j.tripId===active?.id).map(j=>`
          <div class="item"><div class="ic">${icon('edit')}</div><div class="body"><b>${fmtDate(j.date)}</b><small>${esc(j.text)}</small></div>
          <div class="acts"><button class="icon-btn jdel" data-id="${j.id}">${icon('trash')}</button></div></div>`).join('')
        :'<p style="color:var(--ink-faint)">Aucune entrée. Racontez votre journée !</p>'}
      </div>`;

    el.querySelector('.add').onclick = ()=>form(null);
    el.querySelectorAll('.edit').forEach(b=>b.onclick=()=>form(store.doc('trips',b.dataset.id)));
    el.querySelectorAll('.setact').forEach(b=>b.onclick=()=>{ const owner = assignTripToCurrentUser(b.dataset.id); store.setting('activeTripId',b.dataset.id); toast(owner?.ownerName ? `Voyage attribué à ${owner.ownerName}` : 'Voyage actif mis à jour'); render(); });
    el.querySelectorAll('.del').forEach(b=>b.onclick=async()=>{ if(await confirmDialog('Supprimer le voyage','Cette action est définitive.')){ const t=store.doc('trips',b.dataset.id); (t?.photos||[]).forEach(p=>media.remove(p.id)); store.remove('trips',b.dataset.id);
          // BUG-10 : supprimer toutes les données liées au voyage (évite les orphelins)
          const tid = b.dataset.id;
          ['expenses','activities','reservations','places','hikes','itineraries','checklists','documents','journal']
            .forEach(coll => store.list(coll).filter(x=>x.tripId===tid).forEach(x=>{
              (x.photos||[]).forEach(p=>media.remove(p.id));
              (x.docs||[]).forEach(p=>media.remove(p.id));
              store.remove(coll, x.id);
            }));
          // BUG-12 : effacer linkedTripId sur les idées qui pointaient vers ce voyage
          store.list('ideas').filter(x=>x.linkedTripId===tid).forEach(x=>store.update('ideas',x.id,{linkedTripId:null}));
          toast('Supprimé','warn'); render(); }});
    el.querySelector('.jadd').onclick=async()=>{ await modal({ title:'Note de journal', body:`<form>
      <div class="field"><label>Date</label><input name="date" type="date" value="${new Date().toISOString().slice(0,10)}"></div>
      <div class="field"><label>Votre récit</label><textarea name="text" placeholder="Ce qu'on a vécu aujourd'hui…"></textarea></div></form>`,
      okText:'Ajouter', onOk:(d)=>{ d.tripId=active?.id; store.add('journal',d); toast('Note ajoutée'); }}); render(); };
    el.querySelectorAll('.jdel').forEach(b=>b.onclick=()=>{ store.remove('journal',b.dataset.id); render(); });
    media.hydrate(el);
  }
  render();
  return el;
}
