// js/views/activities.js — Activités (vue dédiée : photos + prix)
import { store } from '../store.js';
import { icon, toast, fmtMoney, esc, sheet, confirmDialog, empty } from '../lib/ui.js';
import { media } from '../lib/media.js';
import * as geo from '../lib/geo.js';

const CATS = ['Visite', 'Marché', 'Randonnée', 'Plage', 'Sport', 'Autre'];
const CAT_EMOJI = { Visite: '🏛️', Marché: '🧺', Randonnée: '🥾', Plage: '🏖️', Sport: '🚴', Autre: '📍' };
const STATUS = [['envie', 'Envie'], ['enregistre', 'Enregistrée'], ['realise', 'Réalisée']];
const stLabel = (s) => (STATUS.find(x => x[0] === s) || [, 'Envie'])[1];

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

  function tripId() { const t = store.activeTrip(); return t ? t.id : null; }

  function render() {
    const tid = tripId();
    const items = store.list('activities')
      .filter(a => (!a.tripId || a.tripId === tid))
      .filter(a => (!q || (a.title + ' ' + (a.cat || '')).toLowerCase().includes(q.toLowerCase())))
      .filter(a => (!fStatus || a.status === fStatus) && (!fCat || a.cat === fCat));
    el.innerHTML = `
      <div class="section-head" style="margin-top:0"><h3>Activités</h3><div class="spacer"></div>
        <button class="btn primary" id="new">${icon('plus')} Nouvelle activité</button></div>
      <div class="card" style="margin-bottom:18px">
        <div class="row">
          <div class="field" style="margin:0"><label>${icon('search')} Rechercher</label><input id="q" value="${esc(q)}" placeholder="nom, catégorie…"></div>
          <div class="field" style="margin:0"><label>${icon('star')} Statut</label><select id="fs"><option value="">Tous</option>${STATUS.map(s => `<option value="${s[0]}" ${fStatus === s[0] ? 'selected' : ''}>${s[1]}</option>`).join('')}</select></div>
          <div class="field" style="margin:0"><label>Catégorie</label><select id="fc"><option value="">Toutes</option>${CATS.map(c => `<option ${fCat === c ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
        </div>
      </div>
      ${items.length ? `<div class="grid g-3">${items.map(cardHTML).join('')}</div>`
        : empty('🎒', 'Aucune activité', 'Ajoutez vos envies de visites, balades et sorties.')}`;
    el.querySelector('#q').oninput = e => { q = e.target.value; const c = e.target.selectionStart; render(); const n = el.querySelector('#q'); n.focus(); n.setSelectionRange(c, c); };
    el.querySelector('#fs').onchange = e => { fStatus = e.target.value; render(); };
    el.querySelector('#fc').onchange = e => { fCat = e.target.value; render(); };
    el.querySelector('#new').onclick = () => form();
    el.querySelectorAll('[data-id]').forEach(c => c.onclick = (ev) => { if (ev.target.closest('a,button')) return; detail(c.dataset.id); });
    media.hydrate(el);
  }

  const cardHTML = (a) => `
    <div class="card hoverable disc-card" data-id="${a.id}">
      <div class="cover" ${a.photos && a.photos[0] ? `data-media="${a.photos[0].id}"` : ''}>${a.photos && a.photos[0] ? '' : (CAT_EMOJI[a.cat] || '📍')}</div>
      <h3 style="margin:10px 0 2px">${esc(a.title)}</h3>
      <small style="color:var(--ink-faint)">${esc(a.cat || '')}${a.dist ? ' · ' + esc(a.dist) : ''}</small>
      <div class="tagrow">
        <span class="tag ${a.status === 'realise' ? 'sage' : a.status === 'enregistre' ? 'sky' : ''}">${stLabel(a.status)}</span>
        ${a.pets ? `<span class="tag sage">${icon('paw')} OK</span>` : ''}
      </div>
      <div class="card-foot">
        <b>${a.price ? fmtMoney(a.price) : 'Gratuit'}</b>
        <span style="flex:1"></span>
        ${a.link ? `<a class="btn sm ghost" href="${esc(a.link)}" target="_blank" rel="noopener">${icon('globe')} Lien</a>` : ''}
      </div>
    </div>`;

  function detail(id) {
    const a = store.doc('activities', id); if (!a) return;
    const s = sheet({ title: a.title, okText: 'Modifier', bodyHTML: `
      ${a.photos && a.photos.length ? `<div class="gallery">${a.photos.map(p => `<img data-media="${p.id}" alt="">`).join('')}</div>` : ''}
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
