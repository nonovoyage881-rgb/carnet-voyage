// js/views/gallery.js — Galerie photos centralisée par voyage
import { store } from '../store.js';
import { icon, esc } from '../lib/ui.js';
import { media }  from '../lib/media.js';

export function Gallery() {
  const el = document.createElement('div');
  const trip = store.activeTrip();

  // BUG-02 : réinitialise body.overflow si on navigue sans fermer la lightbox
  // BUG-03 : supprime le listener clavier orphelin
  let _kbNav = null;
  function _cleanup() {
    document.body.style.overflow = '';
    if (_kbNav) { document.removeEventListener('keydown', _kbNav); _kbNav = null; }
  }
  function _onHashChange() { _cleanup(); window.removeEventListener('hashchange', _onHashChange); }
  window.addEventListener('hashchange', _onHashChange);

  function collectPhotos() {
    const photos = [];
    const t = trip;
    if (t && t.photos) {
      t.photos.forEach(p => photos.push({ id: p.id, source: `Voyage · ${esc(t.title)}`, date: t.start || '' }));
    }
    store.list('activities')
      .filter(a => !a.tripId || a.tripId === trip?.id)
      .forEach(a => (a.photos || []).forEach(p =>
        photos.push({ id: p.id, source: `Activité · ${esc(a.title)}`, date: a.createdAt || '' })
      ));
    store.list('reservations')
      .filter(r => !r.tripId || r.tripId === trip?.id)
      .forEach(r => (r.photos || []).forEach(p =>
        photos.push({ id: p.id, source: `Réservation · ${esc(r.name || r.type)}`, date: r.arrDate || '' })
      ));
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
        </div>`}`;

    media.hydrate(el);

    if (photos.length === 0) return;

    // ── Lightbox créée en dehors de el, directement dans body ──
    // Évite tout conflit de z-index ou de hidden avec le conteneur parent
    let lb = document.getElementById('cvs-lightbox');
    if (!lb) {
      lb = document.createElement('div');
      lb.id = 'cvs-lightbox';
      lb.style.cssText = `
        display:none; position:fixed; inset:0; z-index:9999;
        background:rgba(10,8,5,.92);
        align-items:center; justify-content:center; gap:16px; padding:20px;
        animation:fade .2s;
      `;
      lb.innerHTML = `
        <button id="cvs-lb-close" style="
          position:fixed; top:16px; right:16px;
          background:rgba(255,255,255,.2); border:none; color:#fff;
          width:42px; height:42px; border-radius:50%;
          display:grid; place-items:center;
          cursor:pointer; font-size:1.4rem; z-index:10000;
        ">${icon('x')}</button>
        <button id="cvs-lb-prev" style="
          background:rgba(255,255,255,.12); border:none; color:#fff;
          width:44px; height:44px; border-radius:50%;
          font-size:1.6rem; line-height:1; cursor:pointer; flex-shrink:0;
        ">‹</button>
        <div style="flex:1;max-width:860px;display:flex;flex-direction:column;align-items:center;gap:12px;">
          <img id="cvs-lb-img" src="" alt="" style="max-width:100%;max-height:80dvh;border-radius:12px;object-fit:contain;box-shadow:0 8px 40px rgba(0,0,0,.5);">
          <div id="cvs-lb-cap" style="color:rgba(255,255,255,.7);font-size:.85rem;text-align:center;"></div>
        </div>
        <button id="cvs-lb-next" style="
          background:rgba(255,255,255,.12); border:none; color:#fff;
          width:44px; height:44px; border-radius:50%;
          font-size:1.6rem; line-height:1; cursor:pointer; flex-shrink:0;
        ">›</button>`;
      document.body.appendChild(lb);
    }

    const lbImg = lb.querySelector('#cvs-lb-img');
    const lbCap = lb.querySelector('#cvs-lb-cap');
    let current = 0;

    function openLightbox(idx) {
      current = (idx + photos.length) % photos.length;
      lb.style.display = 'flex';
      document.body.style.overflow = 'hidden';
      showSlide(current);
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
      lb.style.display = 'none';
      document.body.style.overflow = '';
      if (_kbNav) { document.removeEventListener('keydown', _kbNav); _kbNav = null; }
    }

    // Rebind à chaque ouverture de la galerie (au cas où lb existait déjà)
    lb.querySelector('#cvs-lb-close').onclick = closeLightbox;
    lb.querySelector('#cvs-lb-prev').onclick  = (e) => { e.stopPropagation(); showSlide(current - 1); };
    lb.querySelector('#cvs-lb-next').onclick  = (e) => { e.stopPropagation(); showSlide(current + 1); };
    lb.onclick = (e) => { if (e.target === lb) closeLightbox(); };

    _kbNav = function(e) {
      if (lb.style.display === 'none') return;
      if (e.key === 'ArrowLeft')  showSlide(current - 1);
      if (e.key === 'ArrowRight') showSlide(current + 1);
      if (e.key === 'Escape')     closeLightbox();
    };
    document.addEventListener('keydown', _kbNav);

    el.querySelector('#gallery-grid').addEventListener('click', e => {
      const item = e.target.closest('[data-idx]');
      if (item) openLightbox(+item.dataset.idx);
    });
  }

  render();
  return el;
}
