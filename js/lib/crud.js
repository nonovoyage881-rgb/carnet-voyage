// js/lib/crud.js — moteur générique de collection (liste + formulaire + CRUD)
import { store } from '../store.js';
import { icon, modal, confirmDialog, toast, esc, empty } from './ui.js';

/*
  config = {
    coll, title, emoji, addLabel,
    fields: [{ name, label, type, options?, placeholder?, full? }],
    row: (rec) => ({ ic, title, sub, meta, tag }),   // rendu d'une ligne
    scopeTrip: bool,   // filtrer par voyage actif
    groupBy: field?,   // regrouper par champ
  }
*/
export function collectionView(config) {
  const el = document.createElement('div');

  function items() {
    let list = store.list(config.coll);
    if (config.scopeTrip) {
      const t = store.activeTrip();
      list = list.filter(x => !x.tripId || x.tripId === t?.id);
    }
    return list;
  }

  function formHTML(rec = {}) {
    return `<form>${config.fields.map(f => {
      const v = rec[f.name] ?? f.default ?? '';
      let input;
      if (f.type === 'select') {
        input = `<select name="${f.name}">${f.options.map(o =>
          `<option ${o===v?'selected':''}>${esc(o)}</option>`).join('')}</select>`;
      } else if (f.type === 'textarea') {
        input = `<textarea name="${f.name}" placeholder="${esc(f.placeholder||'')}">${esc(v)}</textarea>`;
      } else if (f.type === 'checkbox') {
        input = `<label class="checkrow" style="margin-top:4px"><input type="checkbox" name="${f.name}" ${v?'checked':''}><b>${esc(f.label)}</b></label>`;
        return `<div class="field">${input}</div>`;
      } else {
        input = `<input type="${f.type||'text'}" name="${f.name}" value="${esc(v)}" placeholder="${esc(f.placeholder||'')}">`;
      }
      return `<div class="field" style="${f.full?'':'flex:1'}"><label>${esc(f.label)}</label>${input}</div>`;
    }).join('')}</form>`;
  }

  async function openForm(rec) {
    const isEdit = !!rec;
    await modal({
      title: (isEdit ? 'Modifier — ' : 'Ajouter — ') + config.title,
      body: formHTML(rec || {}),
      okText: isEdit ? 'Mettre à jour' : 'Ajouter',
      wide: config.fields.length > 4,
      onOk: (data) => {
        if (config.scopeTrip) data.tripId = store.activeTrip()?.id;
        if (isEdit) { store.update(config.coll, rec.id, data); toast('Modifié'); }
        else { store.add(config.coll, data); toast('Ajouté'); }
      }
    });
    render();
  }

  async function del(rec) {
    const ok = await confirmDialog('Supprimer', 'Cet élément sera supprimé définitivement.');
    if (ok) { store.remove(config.coll, rec.id); toast('Supprimé', 'warn'); render(); }
  }

  function lineHTML(rec) {
    const r = config.row(rec);
    return `<div class="item">
      <div class="ic">${r.ic || config.emoji}</div>
      <div class="body">
        <b>${esc(r.title)}</b>
        <small>${r.sub || ''}</small>
      </div>
      ${r.meta ? `<div class="meta">${r.meta}</div>` : ''}
      <div class="acts">
        <button class="icon-btn e" title="Modifier">${icon('edit')}</button>
        <button class="icon-btn d" title="Supprimer">${icon('trash')}</button>
      </div>
    </div>`;
  }

  function render() {
    const list = items();
    let listHTML;
    if (!list.length) {
      listHTML = empty(config.emoji, 'Rien pour le moment', `Ajoutez votre premier élément « ${config.title} ».`);
    } else if (config.groupBy) {
      const groups = {};
      list.forEach(x => { const k = x[config.groupBy] || 'Autre'; (groups[k] = groups[k]||[]).push(x); });
      listHTML = Object.entries(groups).map(([g, arr]) => `
        <div class="section-head"><h3>${esc(g)}</h3><span class="tag">${arr.length}</span></div>
        <div class="list">${arr.map(lineHTML).join('')}</div>`).join('');
    } else {
      listHTML = `<div class="list">${list.map(lineHTML).join('')}</div>`;
    }

    el.innerHTML = `
      <div class="section-head">
        <h3>${config.emoji} ${esc(config.title)}</h3><span class="tag">${list.length}</span>
        <div class="spacer"></div>
        <button class="btn primary add">${icon('plus')} ${esc(config.addLabel || 'Ajouter')}</button>
      </div>
      ${config.intro ? `<p style="color:var(--ink-soft);margin:-4px 0 16px">${config.intro}</p>` : ''}
      ${listHTML}`;

    el.querySelector('.add').onclick = () => openForm(null);
    el.querySelectorAll('.item').forEach((node, i) => {
      const rec = list[/* recompute index per render */ Array.from(el.querySelectorAll('.item')).indexOf(node)] ;
    });
    // bind by data: simpler — re-map using order
    const flat = config.groupBy
      ? Array.from(el.querySelectorAll('.item'))
      : Array.from(el.querySelectorAll('.item'));
    // rebind using closure over list order
    let idxMap = [];
    if (config.groupBy) {
      const groups = {};
      list.forEach(x => { const k = x[config.groupBy]||'Autre'; (groups[k]=groups[k]||[]).push(x); });
      Object.values(groups).forEach(arr => arr.forEach(r => idxMap.push(r)));
    } else idxMap = list;
    el.querySelectorAll('.item').forEach((node, i) => {
      const rec = idxMap[i];
      node.querySelector('.e').onclick = () => openForm(rec);
      node.querySelector('.d').onclick = () => del(rec);
    });
  }

  render();
  return el;
}
