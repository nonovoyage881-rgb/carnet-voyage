// js/views/checklists.js
import { store } from '../store.js';
import { icon, modal, toast, esc } from '../lib/ui.js';

const LISTS = ['Départ','Retour','Courses','Documents','Matériel'];
const EMOJI = { 'Départ':'🚀','Retour':'🏡','Courses':'🛒','Documents':'📄','Matériel':'🎒' };

export function Checklists() {
  const el = document.createElement('div');
  function render() {
    const all = store.list('checklists');
    el.innerHTML = `
      <div class="section-head"><h3>✅ Checklists</h3><div class="spacer"></div>
        <button class="btn primary add">${icon('plus')} Tâche</button></div>
      <div class="grid g-2" style="align-items:start">
        ${LISTS.map(L=>{ const items=all.filter(i=>i.list===L); const done=items.filter(i=>i.done).length;
          const pct=items.length?Math.round(done/items.length*100):0;
          return `<div class="card">
            <div style="display:flex;align-items:center;gap:8px"><span style="font-size:22px">${EMOJI[L]}</span>
              <b style="flex:1">${L}</b><span class="tag">${done}/${items.length}</span></div>
            <div class="progress" style="margin:10px 0"><span style="width:${pct}%"></span></div>
            <div class="list">
              ${items.map(i=>`<div class="checkrow ${i.done?'done':''}" data-id="${i.id}">
                <input type="checkbox" ${i.done?'checked':''}><b style="flex:1">${esc(i.label)}</b>
                <button class="icon-btn del">${icon('trash')}</button></div>`).join('')||'<small style="color:var(--ink-faint)">Vide</small>'}
            </div>
            <button class="btn sm ghost block addto" data-l="${L}" style="margin-top:10px">${icon('plus')} Ajouter à « ${L} »</button>
          </div>`;}).join('')}
      </div>`;

    el.querySelectorAll('.checkrow input').forEach(c=>c.onchange=()=>{ store.update('checklists',c.closest('.checkrow').dataset.id,{done:c.checked}); render(); });
    el.querySelectorAll('.del').forEach(b=>b.onclick=()=>{ store.remove('checklists',b.closest('.checkrow').dataset.id); render(); });
    const add = async (list) => { await modal({ title:`Ajouter — ${list}`, body:`<form>
      <div class="field"><label>Tâche</label><input name="label"></div>
      <div class="field"><label>Liste</label><select name="list">${LISTS.map(l=>`<option ${l===list?'selected':''}>${l}</option>`).join('')}</select></div></form>`,
      okText:'Ajouter', onOk:(d)=>{ d.done=false; store.add('checklists',d); toast('Ajouté'); }}); render(); };
    el.querySelector('.add').onclick=()=>add('Départ');
    el.querySelectorAll('.addto').forEach(b=>b.onclick=()=>add(b.dataset.l));
  }
  render();
  return el;
}
