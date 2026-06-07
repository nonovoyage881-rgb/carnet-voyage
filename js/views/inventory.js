// js/views/inventory.js
import { store } from '../store.js';
import { icon, modal, toast, confirmDialog, esc } from '../lib/ui.js';

const CATS = ['Tente','Mobilier','Cuisine','Électricité','Randonnée','Vélo','Personnalisé'];

export function Inventory() {
  const el = document.createElement('div');
  function render() {
    const items = store.list('inventory');
    const packed = items.filter(i=>i.packed).length;
    const pct = items.length ? Math.round(packed/items.length*100) : 0;
    const groups = {}; items.forEach(i=>{ (groups[i.cat]=groups[i.cat]||[]).push(i); });

    el.innerHTML = `
      <div class="section-head"><h3>🎒 Inventaire camping</h3><div class="spacer"></div>
        <button class="btn primary add">${icon('plus')} Matériel</button></div>
      <div class="card" style="margin-bottom:16px">
        <div style="display:flex;justify-content:space-between"><b>✅ Contrôle avant départ</b><span>${packed}/${items.length} préparés</span></div>
        <div class="progress" style="margin-top:10px"><span style="width:${pct}%"></span></div>
      </div>
      ${Object.entries(groups).map(([c,arr])=>`
        <div class="section-head" style="margin:18px 0 10px"><h3 style="font-size:1.05rem">${esc(c)}</h3><span class="tag">${arr.length}</span></div>
        <div class="list">${arr.map(i=>`
          <div class="checkrow ${i.packed?'done':''}" data-id="${i.id}">
            <input type="checkbox" ${i.packed?'checked':''}>
            <b style="flex:1">${esc(i.item)}</b>
            <span class="tag">×${i.qty||1}</span>
            <button class="icon-btn del">${icon('trash')}</button>
          </div>`).join('')}</div>`).join('')}`;

    el.querySelector('.add').onclick = async ()=>{ await modal({ title:'Ajouter du matériel', body:`<form>
      <div class="field"><label>Article</label><input name="item"></div>
      <div class="row"><div class="field"><label>Catégorie</label><select name="cat">${CATS.map(c=>`<option>${c}</option>`).join('')}</select></div>
      <div class="field" style="flex:.5"><label>Quantité</label><input name="qty" type="number" value="1"></div></div></form>`,
      okText:'Ajouter', onOk:(d)=>{ d.packed=false; d.qty=+d.qty; store.add('inventory',d); toast('Ajouté'); }}); render(); };
    el.querySelectorAll('.checkrow input').forEach(c=>c.onchange=()=>{ const id=c.closest('.checkrow').dataset.id; store.update('inventory',id,{packed:c.checked}); render(); });
    el.querySelectorAll('.del').forEach(b=>b.onclick=async()=>{ const id=b.closest('.checkrow').dataset.id; if(await confirmDialog('Supprimer','Retirer cet article ?')){ store.remove('inventory',id); render(); }});
  }
  render();
  return el;
}
