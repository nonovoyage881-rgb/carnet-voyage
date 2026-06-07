// js/views/reservations.js — Réservations détaillées (vue dédiée)
import { store } from '../store.js';
import { icon, toast, fmtMoney, fmtDateShort, esc, sheet, confirmDialog, empty } from '../lib/ui.js';
import { media } from '../lib/media.js';
import * as geo from '../lib/geo.js';

const TYPES = ['Camping', 'Hôtel', 'Ferry', 'Train', 'Restaurant', 'Activité', 'Aire de services', 'Autre'];
const TYPE_TAG = { Camping: 'sage', Hôtel: 'sage', Ferry: 'sky', Train: 'sky', Restaurant: 'warn', Activité: '', 'Aire de services': '', Autre: '' };
const mapsDir = (a) => `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(a || '')}`;
const balance = (r) => (+r.total || 0) - (+r.deposit || 0);

// Galerie de photos (camping, lieu…) opérant sur un tableau `photos`.
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

// Uploader de documents (PDF & autres) opérant sur un tableau `docs`.
function docUploader(container, docs) {
  const draw = () => {
    container.innerHTML = `
      <div class="doclist">
        ${docs.map((d, i) => `<div class="docrow">${icon(d.type === 'image' ? 'camera' : 'folder')}
          <span>${esc(d.name)}</span>
          <button type="button" class="del" data-i="${i}">${icon('trash')}</button></div>`).join('')}
      </div>
      <button type="button" class="btn sm add" style="margin-top:8px">${icon('upload')} Ajouter un document</button>
      <input type="file" accept="application/pdf,image/*" multiple hidden>`;
    const file = container.querySelector('input[type=file]');
    container.querySelector('.add').onclick = () => file.click();
    file.onchange = async () => {
      for (const f of file.files) { try { docs.push(await media.save(f)); } catch (e) {} }
      draw();
    };
    container.querySelectorAll('.del').forEach(b => b.onclick = () => { const [rm] = docs.splice(+b.dataset.i, 1); if (rm) media.remove(rm.id); draw(); });
  };
  draw();
}

export function Reservations() {
  const el = document.createElement('div');

  function tripId() { const t = store.activeTrip(); return t ? t.id : null; }

  function render() {
    const tid = tripId();
    const list = store.list('reservations')
      .filter(r => !r.tripId || r.tripId === tid)
      .sort((a, b) => (a.arrDate || '').localeCompare(b.arrDate || ''));
    el.innerHTML = `
      <div class="section-head" style="margin-top:0">
        <h3>Réservations</h3><div class="spacer"></div>
        <button class="btn primary" id="new">${icon('plus')} Nouvelle réservation</button>
      </div>
      ${list.length ? `<div class="list">${list.map(rowHTML).join('')}</div>`
        : empty('🎫', 'Aucune réservation', 'Ajoutez campings, ferries, trains, restaurants… avec tous les détails.')}`;
    el.querySelector('#new').onclick = () => form();
    el.querySelectorAll('[data-id]').forEach(it => it.onclick = (ev) => { if (ev.target.closest('a,button')) return; detail(it.dataset.id); });
    media.hydrate(el);
  }

  const rowHTML = (r) => {
    const due = balance(r);
    return `<div class="item" data-id="${r.id}">
      ${r.photos && r.photos[0]
        ? `<img class="trip-thumb" data-media="${r.photos[0].id}" alt="">`
        : `<div class="ic">${icon(r.type === 'Camping' ? 'tent' : 'ticket')}</div>`}
      <div class="body">
        <b>${esc(r.name || r.type)} <span class="tag ${TYPE_TAG[r.type] || ''}">${esc(r.type || '')}</span></b>
        <small>${r.arrDate ? fmtDateShort(r.arrDate) : ''}${r.arrTime ? ' ' + esc(r.arrTime) : ''}${r.depDate ? ' → ' + fmtDateShort(r.depDate) : ''}${r.depTime ? ' ' + esc(r.depTime) : ''}</small>
      </div>
      <div class="meta">
        ${r.total ? fmtMoney(r.total) : ''}
        ${due > 0 ? `<br><small style="color:var(--warn)">reste ${fmtMoney(due)}</small>` : (r.total ? '<br><small style="color:var(--sage-deep)">soldé</small>' : '')}
      </div>
    </div>`;
  };

  function detail(id) {
    const r = store.doc('reservations', id); if (!r) return;
    const due = balance(r);
    const line = (lbl, val) => val ? `<div class="kv"><span>${lbl}</span><b>${val}</b></div>` : '';
    const s = sheet({ title: r.name || r.type, okText: 'Modifier', bodyHTML: `
      ${r.photos && r.photos.length ? `<div class="gallery">${r.photos.map(p => `<img data-media="${p.id}" alt="">`).join('')}</div>` : ''}
      <div class="tagrow"><span class="tag ${TYPE_TAG[r.type] || ''}">${esc(r.type || '')}</span>${r.insurance ? '<span class="tag sage">Assurance annulation</span>' : ''}</div>
      <div class="quick">
        ${r.address ? `<a class="btn sm" href="${mapsDir(r.address)}" target="_blank" rel="noopener">${icon('pin')} Itinéraire</a>` : ''}
        ${r.site ? `<a class="btn sm ghost" href="${esc(r.site)}" target="_blank" rel="noopener">${icon('globe')} Site</a>` : ''}
        ${r.phone ? `<a class="btn sm ghost" href="tel:${esc(r.phone)}">${icon('phone')} Appeler</a>` : ''}
        ${r.email ? `<a class="btn sm ghost" href="mailto:${esc(r.email)}">${icon('mail')} E-mail</a>` : ''}
        ${r.resaLink ? `<a class="btn sm ghost" href="${esc(r.resaLink)}" target="_blank" rel="noopener">${icon('link')} Réservation</a>` : ''}
      </div>
      <div class="kvs">
        ${line('Adresse', esc(r.address || ''))}
        ${line('Téléphone', esc(r.phone || ''))}
        ${line('E-mail', esc(r.email || ''))}
        ${line('Arrivée', (r.arrDate ? fmtDateShort(r.arrDate) : '') + (r.arrTime ? ' à ' + esc(r.arrTime) : ''))}
        ${line('Départ', (r.depDate ? fmtDateShort(r.depDate) : '') + (r.depTime ? ' à ' + esc(r.depTime) : ''))}
        ${line('N° de réservation', esc(r.resaNumber || ''))}
        ${line('Tarif total', r.total ? fmtMoney(r.total) : '')}
        ${line('Acompte versé', r.deposit ? fmtMoney(r.deposit) : '')}
        ${line('Solde restant', r.total ? fmtMoney(due) : '')}
      </div>
      ${r.notes ? `<h4 style="margin:14px 0 6px">Notes</h4><p style="color:var(--ink-soft)">${esc(r.notes)}</p>` : ''}
      ${r.docs && r.docs.length ? `<h4 style="margin:14px 0 6px">Documents</h4><div class="doclist">${r.docs.map(d => `<a class="docrow" data-media-file="${d.id}" target="_blank" rel="noopener" download="${esc(d.name)}">${icon(d.type === 'image' ? 'camera' : 'folder')}<span>${esc(d.name)}</span>${icon('download')}</a>`).join('')}</div>` : ''}
      <button class="btn danger block" id="delb" style="margin-top:18px">${icon('trash')} Supprimer la réservation</button>` });
    media.hydrate(s.body);
    s.body.querySelector('#delb').onclick = async () => {
      if (await confirmDialog('Supprimer', `Supprimer « ${r.name || r.type} » ?`)) {
        (r.docs || []).forEach(d => media.remove(d.id)); (r.photos || []).forEach(p => media.remove(p.id)); store.remove('reservations', id); s.close(null); toast('Réservation supprimée'); render();
      }
    };
    s.onOk(() => { s.close(null); form(id); return false; });
  }

  function form(id) {
    const r = id ? store.doc('reservations', id) : null;
    const docs = r && r.docs ? [...r.docs] : [];
    const photos = r && r.photos ? [...r.photos] : [];
    const s = sheet({ title: id ? 'Modifier la réservation' : 'Nouvelle réservation', bodyHTML: `
      <div class="row">
        <div class="field"><label>Type</label><select name="type">${TYPES.map(t => `<option ${r && r.type === t ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
        <div class="field"><label>Nom de l'établissement</label><input name="name" value="${esc(r && r.name || '')}"></div>
      </div>
      <div class="field"><label>Adresse complète</label><input name="address" value="${esc(r && r.address || '')}" placeholder="Rue, code postal, ville, pays"></div>
      <div class="row">
        <div class="field"><label>Site internet</label><input name="site" value="${esc(r && r.site || '')}" placeholder="https://"></div>
        <div class="field"><label>Téléphone</label><input name="phone" value="${esc(r && r.phone || '')}"></div>
        <div class="field"><label>E-mail</label><input name="email" value="${esc(r && r.email || '')}"></div>
      </div>
      <div class="row">
        <div class="field"><label>Date d'arrivée</label><input name="arrDate" type="date" value="${esc(r && r.arrDate || '')}"></div>
        <div class="field"><label>Heure d'arrivée</label><input name="arrTime" type="time" value="${esc(r && r.arrTime || '')}"></div>
        <div class="field"><label>Date de départ</label><input name="depDate" type="date" value="${esc(r && r.depDate || '')}"></div>
        <div class="field"><label>Heure de départ</label><input name="depTime" type="time" value="${esc(r && r.depTime || '')}"></div>
      </div>
      <div class="row">
        <div class="field"><label>N° de réservation</label><input name="resaNumber" value="${esc(r && r.resaNumber || '')}"></div>
        <div class="field"><label>Lien vers la réservation</label><input name="resaLink" value="${esc(r && r.resaLink || '')}" placeholder="https://"></div>
      </div>
      <div class="row">
        <div class="field"><label>Tarif total (€)</label><input name="total" type="number" step="0.01" value="${r && r.total || ''}"></div>
        <div class="field"><label>Acompte versé (€)</label><input name="deposit" type="number" step="0.01" value="${r && r.deposit || ''}"></div>
        <div class="field"><label>Solde restant</label><input id="bal" disabled value=""></div>
      </div>
      <label class="checkrow"><input type="checkbox" name="insurance" ${r && r.insurance ? 'checked' : ''}><b>Assurance annulation souscrite</b></label>
      <div class="field" style="margin-top:14px"><label>Photos (camping, chambre, vue…)</label><div id="photos"></div></div>
      <div class="field"><label>Documents (PDF, plan du camping…)</label><div id="docs"></div></div>
      <div class="field"><label>Notes</label><textarea name="notes" placeholder="Précisions, conditions, contacts…">${esc(r && r.notes || '')}</textarea></div>` });
    docUploader(s.body.querySelector('#docs'), docs);
    photoUploader(s.body.querySelector('#photos'), photos);
    // solde calculé en direct
    const updBal = () => {
      const t = +s.body.querySelector('[name=total]').value || 0;
      const d = +s.body.querySelector('[name=deposit]').value || 0;
      s.body.querySelector('#bal').value = fmtMoney(t - d);
    };
    s.body.querySelector('[name=total]').oninput = updBal;
    s.body.querySelector('[name=deposit]').oninput = updBal;
    updBal();
    s.onOk(() => {
      const g = (n) => s.body.querySelector(`[name="${n}"]`);
      const name = g('name').value.trim();
      const type = g('type').value;
      if (!name && !type) { toast('Indiquez au moins un nom', 'warn'); return false; }
      const rec = {
        type, name, address: g('address').value, site: g('site').value, phone: g('phone').value, email: g('email').value,
        arrDate: g('arrDate').value, arrTime: g('arrTime').value, depDate: g('depDate').value, depTime: g('depTime').value,
        resaNumber: g('resaNumber').value, resaLink: g('resaLink').value,
        total: +g('total').value || 0, deposit: +g('deposit').value || 0,
        insurance: g('insurance').checked, notes: g('notes').value, docs, photos,
        tripId: r && r.tripId ? r.tripId : tripId(),
      };
      if (id) store.update('reservations', id, rec); else { const t = store.add('reservations', rec); id = t.id; }
      // géocodage automatique en arrière-plan (adresse / lien / nom + destination)
      const prevAddr = r && r.address || '';
      const area = store.activeTrip()?.destination || '';
      geo.geocodeAndStore(store, 'reservations', id, { links: ['resaLink', 'site'], name: name || type, area, force: !r || rec.address !== prevAddr });
      toast('Réservation enregistrée'); render();
    });
  }

  render();
  return el;
}
