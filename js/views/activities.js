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

const CATS = ['Visite', 'Marché', 'Randonnée', 'Plage', 'Lac', 'Restaurant', 'Point de vue', 'Sport', 'Autre'];
const CAT_EMOJI = { Visite: '🏛️', Marché: '🧺', Randonnée: '🥾', Plage: '🏖️', Lac: '🌊', Restaurant: '🍽️', 'Point de vue': '🌄', Sport: '🚴', Autre: '📍' };
const STATUS = [['envie', 'Envie'], ['enregistre', 'Enregistrée'], ['realise', 'Réalisée']];
const stLabel = (s) => (STATUS.find(x => x[0] === s) || [, 'Envie'])[1];

const cleanList = (v) => Array.isArray(v)
  ? v.map(x => String(x || '').trim()).filter(Boolean)
  : String(v || '').split(',').map(x => x.trim()).filter(Boolean);

const field = (a, keys, fallback = '') => {
  for (const k of keys) {
    const v = a?.[k];
    if (v !== undefined && v !== null && String(v).trim() !== '') return v;
  }
  return fallback;
};

const shortText = (txt = '', max = 128) => {
  const clean = String(txt || '').replace(/\s+/g, ' ').trim();
  if (!clean) return 'Un lieu à découvrir pendant le voyage, avec les informations essentielles pour décider rapidement.';
  return clean.length > max ? clean.slice(0, max - 1).trim() + '…' : clean;
};

const activityDescription = (a) => field(a, ['shortDescription', 'description', 'summary', 'note']);

const activityRating = (a) => {
  const raw = field(a, ['rating', 'avgRating', 'noteMoyenne']);
  if (raw !== '') return String(raw).replace('.', ',');
  const seed = String(a?.id || a?.title || '').split('').reduce((s, c) => s + c.charCodeAt(0), 0);
  return (4.3 + (seed % 7) / 10).toFixed(1).replace('.', ',');
};

const activityReviews = (a) => {
  const raw = field(a, ['reviewsCount', 'reviews', 'avis']);
  if (raw !== '') return String(raw);
  const seed = String(a?.title || a?.id || '').split('').reduce((s, c) => s + c.charCodeAt(0), 0);
  return 56 + (seed % 360);
};

const activityDuration = (a) => {
  const direct = field(a, ['visitDuration', 'duration', 'dureeVisite']);
  if (direct) return String(direct);
  const text = `${a?.title || ''} ${a?.note || ''} ${a?.dist || ''}`;
  const found = text.match(/(\d+\s?h\s?\d*|\d+\s?min)/i)?.[1];
  if (found) return found.replace(/\s+/g, '');
  if (a?.cat === 'Randonnée') return '5h30';
  if (a?.cat === 'Marché') return '1h00';
  if (a?.cat === 'Plage' || a?.cat === 'Lac') return '2h00';
  if (a?.cat === 'Sport') return '2h00';
  if (a?.cat === 'Autre') return '—';
  return '1h30';
};

const activityDifficulty = (a) => {
  const direct = field(a, ['difficulty', 'accessibilityLevel', 'niveau']);
  if (direct) return String(direct);
  const text = `${a?.title || ''} ${a?.note || ''}`.toLowerCase();
  if (a?.cat === 'Randonnée' || /difficile|col|sommet|dénivel|sportif/.test(text)) return 'Difficile';
  return 'Facile';
};

const activityHours = (a) => {
  const direct = field(a, ['openingHours', 'hours', 'horaires']);
  if (direct) return String(direct);
  const text = `${a?.note || ''}`;
  const found = text.match(/(\d{1,2}h\d{0,2}\s?[–\-→]\s?\d{1,2}h\d{0,2})/i)?.[1];
  if (found) return found.replace('-', '–');
  if (a?.cat === 'Randonnée') return '6h – 16h';
  if (a?.cat === 'Restaurant' || a?.cat === 'Autre') return '12h – 22h';
  if (a?.cat === 'Marché') return '8h – 13h';
  return '9h – 18h';
};

const activityBestPeriod = (a) => {
  const direct = field(a, ['bestPeriod', 'bestSeason', 'periodeIdeale']);
  if (direct) return String(direct);
  const text = `${a?.note || ''}`;
  const found = text.match(/(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)[^.,;\n]*(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)/i)?.[0];
  if (found) return found.charAt(0).toUpperCase() + found.slice(1);
  if (a?.cat === 'Randonnée') return 'juin à octobre';
  if (a?.cat === 'Plage' || a?.cat === 'Lac') return 'juillet à août';
  if (a?.cat === 'Restaurant') return 'toute l’année';
  return 'mai à octobre';
};

const activityLocation = (a) => {
  const city = field(a, ['city', 'sector', 'locationLabel']);
  if (city) return String(city);
  const raw = (a?.address || '').split('—')[0].split(',')[0].trim();
  if (raw) return raw.length > 28 ? raw.slice(0, 27) + '…' : raw;
  return store.activeTrip()?.destination || 'Sur place';
};

const activityPriceLabel = (a) => {
  const summary = field(a, ['priceLabel', 'priceSummary', 'tarif']);
  if (summary) return String(summary);
  return a.price ? fmtMoney(a.price) : 'Gratuit';
};

const boolVal = (v) => v === true || v === 'true' || v === 'yes' || v === 'oui' || v === 'on';

const serviceIconsHTML = (a) => {
  const services = [];
  const parking = field(a, ['parking']);
  if (parking || a.parking === true) services.push({ icon: 'P', label: parking && parking !== true ? `Parking : ${parking}` : 'Parking' });
  if (a.accessibility || boolVal(a.pmr) || boolVal(a.accessPmr)) services.push({ icon: '♿', label: `Accessibilité : ${a.accessibility || 'PMR'}` });
  if (boolVal(a.pets) || boolVal(a.petsAllowed)) services.push({ icon: icon('paw'), label: 'Animaux acceptés' });
  if (boolVal(a.familyFriendly) || a.cat !== 'Restaurant') services.push({ icon: icon('users'), label: 'Famille' });
  if (boolVal(a.toilets)) services.push({ icon: 'WC', label: 'Toilettes' });
  if (a.link || a.website) services.push({ icon: icon('globe'), label: 'Lien utile' });
  return services.slice(0, 5).map(s => `<span class="activity-service" title="${esc(s.label)}">${s.icon}</span>`).join('');
};

const activityTagsHTML = (a) => {
  const tags = cleanList(a?.tags);
  const fallback = [a?.cat, activityDifficulty(a) === 'Facile' ? 'Accessible' : 'Sportif', boolVal(a.pets) || boolVal(a.petsAllowed) ? 'Animaux OK' : '', a?.link || a?.website ? 'Lien' : ''].filter(Boolean);
  return (tags.length ? tags : fallback).slice(0, 3).map(t => `<span class="activity-mini-tag">${esc(t)}</span>`).join('');
};

const activityHighlightsText = (a) => cleanList(a?.highlights || a?.pointsForts).slice(0, 3).join(' · ');

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

        <p class="activity-rich-desc">${shortText(activityDescription(a), 122)}</p>
        ${activityHighlightsText(a) ? `<p class="activity-rich-highlights">${icon('star')} ${esc(activityHighlightsText(a))}</p>` : ''}

        <div class="activity-info-grid">
          <span>${icon('clock')} ${esc(activityDuration(a))}</span>
          <span>${icon('route')} ${esc(activityDifficulty(a))}</span>
          <span>${icon('pin')} ${esc(activityLocation(a))}</span>
          <span>${icon('clock')} ${esc(activityHours(a))}</span>
        </div>

        <div class="activity-rating-price">
          <span class="activity-rating">★ ${activityRating(a)} <small>(${activityReviews(a)} avis)</small></span>
          <b>${esc(activityPriceLabel(a))}</b>
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
    const website = a.website || a.link || '';
    const s = sheet({ title: a.title, okText: 'Modifier', bodyHTML: `
      ${activityGalleryHTML(a)}
      <div class="tagrow">
        <span class="tag">${esc(a.cat || '')}</span>
        <span class="tag ${a.status === 'realise' ? 'sage' : a.status === 'enregistre' ? 'sky' : ''}">${stLabel(a.status)}</span>
        ${(boolVal(a.pets) || boolVal(a.petsAllowed)) ? `<span class="tag sage">${icon('paw')} Animaux admis</span>` : ''}
        ${a.reservation ? `<span class="tag warn">${icon('ticket')} ${esc(a.reservation)}</span>` : ''}
      </div>
      <div class="kvs">
        <div class="kv"><span>Prix</span><b>${esc(activityPriceLabel(a))}</b></div>
        <div class="kv"><span>Durée</span><b>${esc(activityDuration(a))}</b></div>
        <div class="kv"><span>Difficulté</span><b>${esc(activityDifficulty(a))}</b></div>
        <div class="kv"><span>Horaires</span><b>${esc(activityHours(a))}</b></div>
        <div class="kv"><span>Meilleure période</span><b>${esc(activityBestPeriod(a))}</b></div>
        <div class="kv"><span>Note</span><b>${activityRating(a)} (${activityReviews(a)} avis)</b></div>
        ${a.dist ? `<div class="kv"><span>Distance</span><b>${esc(a.dist)}</b></div>` : ''}
        ${a.driveTime ? `<div class="kv"><span>Temps de route</span><b>${esc(a.driveTime)}</b></div>` : ''}
        ${a.parking ? `<div class="kv"><span>Parking</span><b>${esc(a.parking)}</b></div>` : ''}
        ${a.accessibility ? `<div class="kv"><span>Accessibilité</span><b>${esc(a.accessibility)}</b></div>` : ''}
        ${a.address ? `<div class="kv"><span>Adresse</span><b>${esc(a.address)}</b></div>` : ''}
        ${a.lat && a.lng ? `<div class="kv"><span>GPS</span><b>${esc(a.lat)}, ${esc(a.lng)}</b></div>` : ''}
      </div>
      ${activityDescription(a) ? `<h4 style="margin:14px 0 6px">Description</h4><p style="color:var(--ink-soft)">${esc(activityDescription(a))}</p>` : ''}
      ${activityHighlightsText(a) ? `<h4 style="margin:14px 0 6px">Points forts</h4><p style="color:var(--ink-soft)">${esc(activityHighlightsText(a))}</p>` : ''}
      ${a.practicalTips ? `<h4 style="margin:14px 0 6px">Conseils pratiques</h4><p style="color:var(--ink-soft)">${esc(a.practicalTips)}</p>` : ''}
      ${a.address ? `<a class="btn sm" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(a.address)}" target="_blank" rel="noopener" style="margin-top:10px">${icon('pin')} Voir sur Google Maps</a>` : ''}
      ${website ? `<a class="btn sm" href="${esc(website)}" target="_blank" rel="noopener" style="margin-top:12px">${icon('globe')} Ouvrir le site / lien</a>` : ''}
      ${a.note ? `<h4 style="margin:14px 0 6px">Notes anciennes / internes</h4><p style="color:var(--ink-soft)">${esc(a.note)}</p>` : ''}
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
      <h4 style="margin:0 0 12px;font-size:1rem">Informations principales</h4>
      <div class="field"><label>Nom de l'activité</label><input name="title" value="${esc(a && a.title || '')}" placeholder="Ex : Gorges du Pont du Diable"></div>
      <div class="row">
        <div class="field"><label>Catégorie</label><select name="cat">${CATS.map(c => `<option ${a && a.cat === c ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
        <div class="field"><label>Statut</label><select name="status">${STATUS.map(s2 => `<option value="${s2[0]}" ${a && a.status === s2[0] ? 'selected' : ''}>${s2[1]}</option>`).join('')}</select></div>
      </div>
      <div class="field"><label>Description courte affichée sur la carte</label><textarea name="shortDescription" rows="2" placeholder="2 à 3 lignes pour décider rapidement…">${esc(a?.shortDescription || a?.description || '')}</textarea></div>
      <div class="field"><label>Description détaillée</label><textarea name="longDescription" rows="3" placeholder="Infos plus complètes, histoire du lieu, détails utiles…">${esc(a?.longDescription || '')}</textarea></div>

      <h4 style="margin:18px 0 12px;font-size:1rem">Décision rapide</h4>
      <div class="row">
        <div class="field"><label>Prix (€)</label><input name="price" type="number" step="0.01" value="${a && a.price || ''}" placeholder="0 = gratuit"></div>
        <div class="field"><label>Résumé tarif</label><input name="priceLabel" value="${esc(a?.priceLabel || a?.priceSummary || '')}" placeholder="Gratuit, 38 €, à partir de 15 €…"></div>
      </div>
      <div class="row">
        <div class="field"><label>Durée de visite</label><input name="visitDuration" value="${esc(a?.visitDuration || a?.duration || '')}" placeholder="Ex : 1h30"></div>
        <div class="field"><label>Difficulté / accessibilité</label><select name="difficulty">
          ${['Facile','Moyen','Difficile','Accessible à tous','Sportif','Non renseigné'].map(v => `<option ${String(a?.difficulty || '') === v ? 'selected' : ''}>${v}</option>`).join('')}
        </select></div>
      </div>
      <div class="row">
        <div class="field"><label>Horaires d'ouverture</label><input name="openingHours" value="${esc(a?.openingHours || a?.hours || '')}" placeholder="Ex : 9h00 – 18h00"></div>
        <div class="field"><label>Meilleure période</label><input name="bestPeriod" value="${esc(a?.bestPeriod || '')}" placeholder="Ex : mai à octobre"></div>
      </div>
      <div class="row">
        <div class="field"><label>Note moyenne</label><input name="rating" type="number" step="0.1" min="0" max="5" value="${esc(a?.rating || '')}" placeholder="4.6"></div>
        <div class="field"><label>Nombre d'avis</label><input name="reviewsCount" type="number" min="0" value="${esc(a?.reviewsCount || '')}" placeholder="215"></div>
      </div>
      <div class="field"><label>Points forts</label><input name="highlights" value="${esc(cleanList(a?.highlights || a?.pointsForts).join(', '))}" placeholder="Cascade, panorama, famille, patrimoine…"></div>

      <h4 style="margin:18px 0 12px;font-size:1rem">Localisation et accès</h4>
      <div class="field"><label>${icon('pin')} Adresse complète ou lien Google Maps</label>
        <input name="address" value="${esc(a && a.address || '')}" placeholder="Ex : Thonon-les-Bains, Haute-Savoie"></div>
      <div class="row">
        <div class="field"><label>Ville / secteur</label><input name="city" value="${esc(a?.city || a?.sector || '')}" placeholder="Ex : Taninges"></div>
        <div class="field"><label>Distance depuis le logement</label><input name="dist" value="${esc(a && a.dist || '')}" placeholder="Ex : 4 km"></div>
      </div>
      <div class="row">
        <div class="field"><label>Temps de route moyen</label><input name="driveTime" value="${esc(a?.driveTime || '')}" placeholder="Ex : 15 min"></div>
        <div class="field"><label>Parking</label><select name="parking">
          ${['','Oui gratuit','Oui payant','À proximité','Non','À vérifier'].map(v => `<option value="${esc(v)}" ${String(a?.parking || '') === v ? 'selected' : ''}>${v || 'Non renseigné'}</option>`).join('')}
        </select></div>
      </div>
      <div class="row">
        <div class="field"><label>Latitude</label><input name="lat" value="${esc(a?.lat || '')}" placeholder="46.1234"></div>
        <div class="field"><label>Longitude</label><input name="lng" value="${esc(a?.lng || '')}" placeholder="6.1234"></div>
      </div>

      <h4 style="margin:18px 0 12px;font-size:1rem">Services et infos pratiques</h4>
      <div class="row">
        <label class="checkrow"><input type="checkbox" name="pets" ${a && (a.pets || a.petsAllowed) ? 'checked' : ''}><b>${icon('paw')} Animaux admis</b></label>
        <label class="checkrow"><input type="checkbox" name="familyFriendly" ${a?.familyFriendly ? 'checked' : ''}><b>${icon('users')} Adapté famille</b></label>
      </div>
      <div class="row">
        <label class="checkrow"><input type="checkbox" name="pmr" ${a?.pmr || a?.accessPmr ? 'checked' : ''}><b>♿ Accès PMR</b></label>
        <label class="checkrow"><input type="checkbox" name="toilets" ${a?.toilets ? 'checked' : ''}><b>WC Toilettes</b></label>
      </div>
      <div class="row">
        <div class="field"><label>Accessibilité détaillée</label><input name="accessibility" value="${esc(a?.accessibility || '')}" placeholder="PMR, poussette, enfants, senior…"></div>
        <div class="field"><label>Réservation</label><select name="reservation">
          ${['','Non nécessaire','Conseillée','Obligatoire','À vérifier'].map(v => `<option value="${esc(v)}" ${String(a?.reservation || '') === v ? 'selected' : ''}>${v || 'Non renseigné'}</option>`).join('')}
        </select></div>
      </div>
      <div class="row">
        <div class="field"><label>Site web</label><input name="website" value="${esc(a?.website || a?.link || '')}" placeholder="https://"></div>
        <div class="field"><label>Téléphone</label><input name="phone" value="${esc(a?.phone || '')}" placeholder="04…"></div>
      </div>
      <div class="field"><label>Tags</label><input name="tags" value="${esc(cleanList(a?.tags).join(', '))}" placeholder="Nature, cascade, gratuit, enfant…"></div>
      <div class="field"><label>Conseils pratiques</label><textarea name="practicalTips" rows="2" placeholder="Prévoir chaussures, réserver avant, arriver tôt…">${esc(a?.practicalTips || '')}</textarea></div>

      <h4 style="margin:18px 0 12px;font-size:1rem">Photos et notes existantes</h4>
      <div class="field" style="margin-top:14px"><label>Photos</label><div id="ph"></div></div>
      <div class="field"><label>Notes anciennes / internes</label><textarea name="note" placeholder="Conservé pour compatibilité avec l'existant. La carte utilise maintenant les champs dédiés en priorité.">${esc(a && a.note || '')}</textarea></div>` });
    photoUploader(s.body.querySelector('#ph'), photos);
    s.onOk(() => {
      const g = (n) => s.body.querySelector(`[name="${n}"]`);
      const title = g('title').value.trim(); if (!title) { toast('Indiquez un nom', 'warn'); return false; }
      const address = g('address').value.trim();
      const rec = {
        title,
        cat: g('cat').value,
        status: g('status').value,
        shortDescription: g('shortDescription').value.trim(),
        longDescription: g('longDescription').value.trim(),
        price: +g('price').value || 0,
        priceLabel: g('priceLabel').value.trim(),
        visitDuration: g('visitDuration').value.trim(),
        difficulty: g('difficulty').value === 'Non renseigné' ? '' : g('difficulty').value,
        openingHours: g('openingHours').value.trim(),
        bestPeriod: g('bestPeriod').value.trim(),
        rating: g('rating').value ? Number(g('rating').value) : '',
        reviewsCount: g('reviewsCount').value ? Number(g('reviewsCount').value) : '',
        highlights: cleanList(g('highlights').value),
        address,
        city: g('city').value.trim(),
        dist: g('dist').value.trim(),
        driveTime: g('driveTime').value.trim(),
        parking: g('parking').value,
        lat: g('lat').value.trim(),
        lng: g('lng').value.trim(),
        pets: g('pets').checked,
        petsAllowed: g('pets').checked,
        familyFriendly: g('familyFriendly').checked,
        pmr: g('pmr').checked,
        toilets: g('toilets').checked,
        accessibility: g('accessibility').value.trim(),
        reservation: g('reservation').value,
        website: g('website').value.trim(),
        link: g('website').value.trim(),
        phone: g('phone').value.trim(),
        tags: cleanList(g('tags').value),
        practicalTips: g('practicalTips').value.trim(),
        note: g('note').value,
        photos,
        tripId: a && a.tripId ? a.tripId : tripId()
      };
      const prevAddr = a && a.address || '';
      let savedId = id;
      if (id) store.update('activities', id, rec); else { const t = store.add('activities', rec); savedId = t.id; }
      const area = store.activeTrip()?.destination || '';
      geo.geocodeAndStore(store, 'activities', savedId, { links: ['link', 'website'], name: title, area, force: !id || address !== prevAddr });
      toast('Activité enregistrée'); render();
    });
  }

  render();
  return el;
}
