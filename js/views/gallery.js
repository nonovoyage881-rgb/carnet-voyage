// js/views/gallery.js — Galerie photos centralisée par voyage
// ─────────────────────────────────────────────────────────────
// Collecte toutes les photos des collections suivantes pour le
// voyage actif : trips, activities, reservations, ideas.
// Lecture seule — aucune donnée n'est modifiée.
// Compatible avec toutes les données existantes.
// ─────────────────────────────────────────────────────────────
import { store } from '../store.js';
import { icon, esc } from '../lib/ui.js';
import { media }  from '../lib/media.js';

export function Gallery() {
  const el = document.createElement('div');
  const trip = store.activeTrip();

  // BUG-02 + BUG-03 : nettoyage garanti quand on navigue ailleurs sans fermer la lightbox.
  // _cleanup() réinitialise body.overflow et supprime le listener clavier.
  let _kbNav = null;
  function _cleanup() {
    document.body.style.overflow = '';
    if (_kbNav) { document.removeEventListener('keydown', _kbNav); _kbNav = null; }
  }
  // Détecte quand le nœud est retiré du DOM (navigation vers une autre vue)
  const _obs = new MutationObserver(() => {
    if (!document.body.contains(el)) { _cleanup(); _obs.disconnect(); }
  });
  _obs.observe(document.body, { childList: true, subtree: true });

  // ── Collecte toutes les photos du voyage actif ──────────────
  function collectPhotos() {
    const photos = [];

    // Photos du voyage lui-même
    const t = trip;
    if (t && t.photos) {
      t.photos.forEach(p => photos.push({ id: p.id, source: `Voyage · ${esc(t.title)}`, date: t.start || '' }));
    }

    // Photos des activités
    store.list('activities')
      .filter(a => !a.tripId || a.tripId === trip?.id)
      .forEach(a => (a.photos || []).forEach(p =>
        photos.push({ id: p.id, source: `Activité · ${esc(a.title)}`, date: a.createdAt || '' })
      ));

    // Photos des réservations
    store.list('reservations')
      .filter(r => !r.tripId || r.tripId === trip?.id)
      .forEach(r => (r.photos || []).forEach(p =>
        photos.push({ id: p.id, source: `Réservation · ${esc(r.name || r.type)}`, date: r.arrDate || '' })
      ));

    // Photos des idées de découverte (toutes, pas filtrées par voyage)
    store.list('ideas')
      .forEach(i => (i.photos || []).forEach(p =>
        photos.push({ id: p.id, source: `Découverte · ${esc(i.title)}`, date: '' })
      ));

    return photos;
  }

  function render() {
    const photos = collectPhotos();

    el.innerHTML = `
      <div class="section-head" style="margin-top:0">
        <h3>📸 Galerie photos</h3>
        <span class="tag">${photos.length} photo${photos.length > 1 ? 's' : ''}</span>
        <div class="spacer"></div>
        <span style="color:var(--ink-faint);font-size:.82rem">
          Voyage actif : ${esc(trip?.title || '—')}
        </span>
      </div>

      ${photos.length === 0 ? `
        <div class="empty">
          <div class="big">📷</div>
          <h3>Aucune photo pour l'instant</h3>
          <p>Ajoutez des photos dans vos activités, réservations ou fiches voyage.</p>
        </div>` : `

        <div class="gallery-grid" id="gallery-grid">
          ${photos.map((p, idx) => `
            <div class="gallery-item" data-idx="${idx}" title="${p.source}">
              <img data-media="${p.id}" alt="${p.source}">
              <div class="gallery-item-label">${p.source}</div>
            </div>`).join('')}
        </div>

        <!-- Lightbox -->
        <div class="gallery-lightbox" id="gallery-lightbox" hidden>
          <button class="gallery-lb-close" id="lb-close">${icon('x')}</button>
          <button class="gallery-lb-prev" id="lb-prev">‹</button>
          <div class="gallery-lb-img-wrap">
            <img id="lb-img" src="" alt="">
            <div class="gallery-lb-caption" id="lb-caption"></div>
          </div>
          <button class="gallery-lb-next" id="lb-next">›</button>
        </div>`}`;

    // Hydrater les miniatures
    media.hydrate(el);

    if (photos.length === 0) return;

    // ── Lightbox ────────────────────────────────────────────
    let current = 0;

    const lb      = el.querySelector('#gallery-lightbox');
    const lbImg   = el.querySelector('#lb-img');
    const lbCap   = el.querySelector('#lb-caption');

    async function openLightbox(idx) {
      current = idx;
      lb.hidden = false;
      document.body.style.overflow = 'hidden';
      await showSlide(idx);
    }

    async function showSlide(idx) {
      current = (idx + photos.length) % photos.length;
      const p = photos[current];
      lbImg.src = '';
      lbImg.alt = p.source;
      lbCap.textContent = p.source;
      const url = await media.url(p.id);
      if (url) lbImg.src = url;
    }

    function closeLightbox() {
      lb.hidden = true;
      document.body.style.overflow = '';
      // BUG-03 : supprimer le listener clavier dès la fermeture normale aussi
      if (_kbNav) { document.removeEventListener('keydown', _kbNav); _kbNav = null; }
    }

    el.querySelector('#lb-close').onclick = closeLightbox;
    el.querySelector('#lb-prev').onclick  = (e) => { e.stopPropagation(); showSlide(current - 1); };
    el.querySelector('#lb-next').onclick  = (e) => { e.stopPropagation(); showSlide(current + 1); };

    // Fermer en cliquant sur le fond OU sur la photo
    lb.onclick = (e) => {
      if (e.target === lb || e.target === lbImg) closeLightbox();
    };

    // BUG-03 : listener nommé stocké dans _kbNav pour pouvoir le supprimer à tout moment
    _kbNav = function kbNav(e) {
      if (lb.hidden) return;
      if (e.key === 'ArrowLeft')  showSlide(current - 1);
      if (e.key === 'ArrowRight') showSlide(current + 1);
      if (e.key === 'Escape')     closeLightbox();
    };
    document.addEventListener('keydown', _kbNav);

    // Ouvrir au clic sur une miniature
    el.querySelector('#gallery-grid').addEventListener('click', e => {
      const item = e.target.closest('[data-idx]');
      if (item) openLightbox(+item.dataset.idx);
    });
  }

  render();
  return el;
}
