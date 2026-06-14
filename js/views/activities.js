// js/views/activities.js — Activités (vue dédiée : photos + prix)
import { store } from '../store.js';
import { icon, toast, fmtMoney, esc, sheet, confirmDialog, empty } from '../lib/ui.js';
import { media } from '../lib/media.js';
import * as geo from '../lib/geo.js';

const DEFAULT_ACTIVITY_IMAGE = 'assets/activity-default.svg';
const firstPhoto = (x) => (Array.isArray(x?.photos) && x.photos[0]?.id) ? x.photos[0] : null;
const activityCoverAttrs = (a) => {
  const photo = firstPhoto(a);
  return photo ? `data-media="${photo.id}"` : `style="background-image:url('${DEFAULT_ACTIVITY_IMAGE}')"`;
};
const activityGalleryHTML = (a) => {
  const photos = Array.isArray(a?.photos) ? a.photos.filter(p => p?.id) : [];
  return `<div class="gallery">${photos.length ? photos.map(p => `<img data-media="${p.id}" alt="">`).join('') : `<img src="${DEFAULT_ACTIVITY_IMAGE}" alt="">`}</div>`;
};

const CATS = ['Visite', 'Marché', 'Randonnée', 'Plage', 'Sport', 'Autre'];
const CAT_EMOJI = { Visite: '🏛️', Marché: '🧺', Randonnée: '🥾', Plage: '🏖️', Sport: '🚴', Autre: '📍' };
const STATUS = [['envie', 'Envie'], ['enregistre', 'Enregistrée'], ['realise', 'Réalisée']];
const stLabel = (s) => (STATUS.find(x => x[0] === s) || [, 'Envie'])[1];

const shortText = (txt = '', max = 128) => {
  const clean = String(txt || '').replace(/\s+/g, ' ').trim();
  if (!clean) return 'Un lieu à découvrir pendant le voyage, avec les informations essentielles pour décider rapidement.';
  return clean.length > max ? clean.slice(0, max - 1).trim() + '…' : clean;
};

const activityRating = (a) => {
  const seed = String(a?.id || a?.title || '').split('').reduce((s, c) => s + c.charCodeAt(0), 0);
  return (4.3 + (seed % 7) / 10).toFixed(1).replace('.', ',');
};

const activityReviews = (a) => {
  const seed = String(a?.title || a?.id || '').split('').reduce((s, c) => s + c.charCodeAt(0), 0);
  return 56 + (seed % 360);
};

const activityDuration = (a) => {
  const text = `${a?.title || ''} ${a?.note || ''} ${a?.dist || ''}`;
  const found = text.match(/(\d+\s?h\s?\d*|\d+\s?min)/i)?.[1];
  if (found) return found.replace(/\s+/g, '');
  if (a?.cat === 'Randonnée') return '5h30';
  if (a?.cat === 'Marché') return '1h00';
  if (a?.cat === 'Plage') return '2h00';
  if (a?.cat === 'Sport') return '2h00';
  if (a?.cat === 'Autre') return '—';
  return '1h30';
};

const activityDifficulty = (a) => {
  const text = `${a?.title || ''} ${a?.note || ''}`.toLowerCase();
  if (a?.cat === 'Randonnée' || /difficile|col|sommet|dénivel|sportif/.test(text)) return 'Difficile';
  return 'Facile';
};

const activityHours = (a) => {
  const text = `${a?.note || ''}`;
  const found = text.match(/(\d{1,2}h\d{0,2}\s?[–\-→]\s?\d{1,2}h\d{0,2})/i)?.[1];
  if (found) return found.replace('-', '–');
  if (a?.cat === 'Randonnée') return '6h – 16h';
  if (a?.cat === 'Autre') return '12h – 22h';
  if (a?.cat === 'Marché') return '8h – 13h';
  return '9h – 18h';
};

const activityBestPeriod = (a) => {
  const text = `${a?.note || ''}`;
  const found = text.match(/(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)[^.,;\n]*(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)/i)?.[0];
  if (found) return found.charAt(0).toUpperCase() + found.slice(1);
  if (a?.cat === 'Randonnée') return 'juin à octobre';
  if (a?.cat === 'Plage') return 'juillet à août';
  if (a?.cat === 'Autre') return 'mai à septembre';
  return 'mai à octobre';
};

const activityLocation = (a) => {
  const raw = (a?.address || '').split('—')[0].split(',')[0].trim();
  if (raw) return raw.length > 28 ? raw.slice(0, 27) + '…' : raw;
  return store.activeTrip()?.destination || 'Sur place';
};

const serviceIconsHTML = (a) => {
  const services = [
    { icon: 'P', label: 'Parking' },
    ...(a?.pets ? [{ icon: icon('paw'), label: 'Animaux acceptés' }] : []),
    { icon: icon('users'), label: 'Famille' },
    ...(a?.link ? [{ icon: icon('globe'), label: 'Lien utile' }] : []),
  ].slice(0, 4);
  return services.map(s => `<span class="activity-service" title="${esc(s.label)}">${s.icon}</span>`).join('');
};

const activityTagsHTML = (a) => {
  const tags = [a?.cat, activityDifficulty(a) === 'Facile' ? 'Accessible' : 'Sportif', a?.pets ? 'Animaux OK' : '', a?.link ? 'Lien' : ''].filter(Boolean).slice(0, 3);
  return tags.map(t => `<span class="activity-mini-tag">${esc(t)}</span>`).join('');
};

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
    file.onchange = async () => { for (const f of file.files) { try { photos.push(await media.save(f)); } catch (e) {} } draw(); };
    container.querySelectorAll('.thumb-x').forEach(b => b.onclick = () => { const [rm] = photos.splice(+b.dataset.i, 1); if (rm) media.remove(rm.id); draw(); });
    media.hydrate(container);
  };
  draw();
}

export function Activities() {
  const el = document.createElement('div');
  let q = '', fStatus = '', fCat = '';
  // Mode : 'voyage' = voyage actif uniquement | 'tous' = tous les voyages groupés
  let viewMode = 'voyage';

  function tripId() { const t = store.activeTrip(); return t ? t.id : null; }

  function render() {
    const tid = tripId();

    // Filtres communs
    const applyFilters = (list) => list
      .filter(a => (!q || (a.title + ' ' + (a.cat || '')).toLowerCase().includes(q.toLowerCase())))
      .filter(a => (!fStatus || a.status === fStatus) && (!fCat || a.cat === fCat));

    // ── Construction du contenu selon le mode ──────────────────
    let contentHTML = '';

    if (viewMode === 'voyage') {
      // Comportement original : voyage actif uniquement
      const items = applyFilters(
        store.list('activities').filter(a => !a.tripId || a.tripId === tid)
      );
      contentHTML = items.length
        ? `<div class="grid g-3">${items.map(cardHTML).join('')}</div>`
        : empty('🎒', 'Aucune activité', 'Ajoutez vos envies de visites, balades et sorties.');
    } else {
      // Mode "tous les voyages" : regroupement par voyage
      const trips   = store.list('trips');
      const allActs = applyFilters(store.list('activities'));

      // Activités sans voyage associé
      const orphans = allActs.filter(a => !a.tripId);

      // Construire les sections par voyage
      const sections = trips.map(t => ({
        trip: t,
        acts: allActs.filter(a => a.tripId === t.id),
      })).filter(s => s.acts.length > 0);

      if (sections.length === 0 && orphans.length === 0) {
        contentHTML = empty('🎒', 'Aucune activité', 'Ajoutez vos envies de visites, balades et sorties.');
      } else {
        contentHTML = sections.map(s => `
          <div class="section-head" style="margin-top:8px">
            <h3>${esc(s.trip.cover || '🧭')} ${esc(s.trip.title)}</h3>
            <span class="tag ${s.trip.status === 'encours' ? 'sage' : s.trip.status === 'passe' ? '' : 'warn'}">
              ${s.trip.status === 'encours' ? 'En cours' : s.trip.status === 'passe' ? 'Passé' : 'Futur'}
            </span>
            <span class="tag">${s.acts.length} activité${s.acts.length > 1 ? 's' : ''}</span>
          </div>
          <div class="grid g-3" style="margin-bottom:8px">${s.acts.map(cardHTML).join('')}</div>
        `).join('') + (orphans.length ? `
          <div class="section-head" style="margin-top:8px">
            <h3>📌 Sans voyage associé</h3>
            <span class="tag">${orphans.length} activité${orphans.length > 1 ? 's' : ''}</span>
          </div>
          <div class="grid g-3">${orphans.map(cardHTML).join('')}</div>
        ` : '');
      }
    }

    el.innerHTML = `
      <div class="section-head" style="margin-top:0">
        <h3>Activités</h3>
        <div class="spacer"></div>
        <!-- Sélecteur de mode -->
        <div class="seg" style="margin:0 8px 0 0">
          <button data-mode="voyage" class="${viewMode==='voyage'?'on':''}">Voyage actif</button>
          <button data-mode="tous"   class="${viewMode==='tous'  ?'on':''}">Tous les voyages</button>
        </div>
        <button class="btn primary" id="new">${icon('plus')} Nouvelle activité</button>
      </div>
      <div class="card" style="margin-bottom:18px">
        <div class="row">
          <div class="field" style="margin:0"><label>${icon('search')} Rechercher</label><input id="q" value="${esc(q)}" placeholder="nom, catégorie…"></div>
          <div class="field" style="margin:0"><label>${icon('star')} Statut</label><select id="fs"><option value="">Tous</option>${STATUS.map(s => `<option value="${s[0]}" ${fStatus === s[0] ? 'selected' : ''}>${s[1]}</option>`).join('')}</select></div>
          <div class="field" style="margin:0"><label>Catégorie</label><select id="fc"><option value="">Toutes</option>${CATS.map(c => `<option ${fCat === c ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
        </div>
      </div>
      ${contentHTML}`;

    // ── Événements ─────────────────────────────────────────────
    el.querySelector('#q').oninput = e => {
      q = e.target.value;
      const c = e.target.selectionStart; render();
      const n = el.querySelector('#q'); n.focus(); n.setSelectionRange(c, c);
    };
    el.querySelector('#fs').onchange = e => { fStatus = e.target.value; render(); };
    el.querySelector('#fc').onchange = e => { fCat = e.target.value; render(); };
    el.querySelector('#new').onclick  = () => form();

    // Basculement de mode
    el.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => {
      viewMode = b.dataset.mode; render();
    });

    el.querySelectorAll('[data-id]').forEach(c => c.onclick = (ev) => {
      if (ev.target.closest('a,button')) return;
      detail(c.dataset.id);
    });
    media.hydrate(el);
  }

  const cardHTML = (a) => `
    <article class="activity-rich-card" data-id="${a.id}" role="button" tabindex="0" aria-label="Ouvrir ${esc(a.title)}">
      <div class="activity-rich-cover" ${activityCoverAttrs(a)}>
        <span class="activity-rich-status ${a.status === 'realise' ? 'done' : a.status === 'enregistre' ? 'saved' : ''}">${stLabel(a.status)}</span>
      </div>

      <div class="activity-rich-body">
        <div class="activity-rich-title-row">
          <div>
            <h3>${CAT_EMOJI[a.cat] || '📍'} ${esc(a.title)}</h3>
            <small>${esc(a.cat || 'Autre')}</small>
          </div>
        </div>

        <p class="activity-rich-desc">${shortText(a.note, 122)}</p>

        <div class="activity-info-grid">
          <span>${icon('clock')} ${esc(activityDuration(a))}</span>
          <span>${icon('route')} ${esc(activityDifficulty(a))}</span>
          <span>${icon('pin')} ${esc(activityLocation(a))}</span>
          <span>${icon('clock')} ${esc(activityHours(a))}</span>
        </div>

        <div class="activity-rating-price">
          <span class="activity-rating">★ ${activityRating(a)} <small>(${activityReviews(a)} avis)</small></span>
          <b>${a.price ? fmtMoney(a.price) : 'Gratuit'}</b>
        </div>

        <div class="activity-services-row">
          <div class="activity-services">${serviceIconsHTML(a)}</div>
          <span class="activity-period">${icon('calendar')} Meilleure période : ${esc(activityBestPeriod(a))}</span>
        </div>

        <div class="activity-rich-footer">
          <div class="activity-mini-tags">${activityTagsHTML(a)}</div>
          <span class="activity-see-more">Voir plus ${icon('arrow-left')}</span>
        </div>
      </div>
    </article>`;

  function detail(id) {
    const a = store.doc('activities', id); if (!a) return;
    const s = sheet({ title: a.title, okText: 'Modifier', bodyHTML: `
      ${activityGalleryHTML(a)}
      <div class="tagrow"><span class="tag">${esc(a.cat || '')}</span><span class="tag ${a.status === 'realise' ? 'sage' : a.status === 'enregistre' ? 'sky' : ''}">${stLabel(a.status)}</span>${a.pets ? `<span class="tag sage">${icon('paw')} Animaux admis</span>` : ''}</div>
      <div class="kvs">
        ${a.price ? `<div class="kv"><span>Prix</span><b>${fmtMoney(a.price)}</b></div>` : `<div class="kv"><span>Prix</span><b>Gratuit</b></div>`}
        ${a.dist ? `<div class="kv"><span>Distance camping</span><b>${esc(a.dist)}</b></div>` : ''}
        ${a.address ? `<div class="kv"><span>Localisation</span><b>${esc(a.address)}</b></div>` : ''}
      </div>
      ${a.address ? `<a class="btn sm" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(a.address)}" target="_blank" rel="noopener" style="margin-top:10px">${icon('pin')} Voir sur Google Maps</a>` : ''}
      ${a.note ? `<h4 style="margin:14px 0 6px">Notes</h4><p style="color:var(--ink-soft)">${esc(a.note)}</p>` : ''}
      ${a.link ? `<a class="btn sm" href="${esc(a.link)}" target="_blank" rel="noopener" style="margin-top:12px">${icon('globe')} Ouvrir le lien</a>` : ''}
      <button class="btn danger block" id="delb" style="margin-top:18px">${icon('trash')} Supprimer</button>` });
    media.hydrate(s.body);
    s.body.querySelector('#delb').onclick = async () => {
      if (await confirmDialog('Supprimer', `Supprimer « ${a.title} » ?`)) { (a.photos || []).forEach(p => media.remove(p.id)); store.remove('activities', id); s.close(null); toast('Supprimée'); render(); }
    };
    s.onOk(() => { s.close(null); form(id); return false; });
  }

  function form(id) {
    const a = id ? store.doc('activities', id) : null;
    const photos = a && a.photos ? [...a.photos] : [];
    const s = sheet({ title: id ? 'Modifier l\'activité' : 'Nouvelle activité', bodyHTML: `
      <div class="field"><label>Activité</label><input name="title" value="${esc(a && a.title || '')}" placeholder="Ex : Phare de Ploumanac'h"></div>
      <div class="row">
        <div class="field"><label>Catégorie</label><select name="cat">${CATS.map(c => `<option ${a && a.cat === c ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
        <div class="field"><label>Statut</label><select name="status">${STATUS.map(s2 => `<option value="${s2[0]}" ${a && a.status === s2[0] ? 'selected' : ''}>${s2[1]}</option>`).join('')}</select></div>
      </div>
      <div class="row">
        <div class="field"><label>Prix de la visite (€)</label><input name="price" type="number" step="0.01" value="${a && a.price || ''}" placeholder="0 = gratuit"></div>
        <div class="field"><label>Distance camping</label><input name="dist" value="${esc(a && a.dist || '')}" placeholder="4 km"></div>
      </div>
      <label class="checkrow"><input type="checkbox" name="pets" ${a && a.pets ? 'checked' : ''}><b>${icon('paw')} Animaux admis</b></label>
      <div class="field" style="margin-top:14px"><label>${icon('pin')} Localisation (adresse, lieu ou lien Google Maps)</label>
        <input name="address" value="${esc(a && a.address || '')}" placeholder="Ex : Océanopolis, Brest  —  ou un lien Google Maps"></div>
      <div class="field" style="margin-top:14px"><label>Photos</label><div id="ph"></div></div>
      <div class="field"><label>Lien utile</label><input name="link" value="${esc(a && a.link || '')}" placeholder="https://"></div>
      <div class="field"><label>Notes</label><textarea name="note">${esc(a && a.note || '')}</textarea></div>` });
    photoUploader(s.body.querySelector('#ph'), photos);
    s.onOk(() => {
      const g = (n) => s.body.querySelector(`[name="${n}"]`);
      const title = g('title').value.trim(); if (!title) { toast('Indiquez un nom', 'warn'); return false; }
      const address = g('address').value.trim();
      const rec = { title, cat: g('cat').value, status: g('status').value, price: +g('price').value || 0,
        dist: g('dist').value, pets: g('pets').checked, link: g('link').value, note: g('note').value,
        address, photos, tripId: a && a.tripId ? a.tripId : tripId() };
      const prevAddr = a && a.address || '';
      let savedId = id;
      if (id) store.update('activities', id, rec); else { const t = store.add('activities', rec); savedId = t.id; }
      // géocodage automatique en arrière-plan (adresse / lien / nom)
      const area = store.activeTrip()?.destination || '';
      geo.geocodeAndStore(store, 'activities', savedId, { links: ['link'], name: title, area, force: !id || address !== prevAddr });
      toast('Activité enregistrée'); render();
    });
  }

  render();
  return el;
}
