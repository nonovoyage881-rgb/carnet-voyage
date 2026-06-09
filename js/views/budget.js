// js/views/budget.js
import { store } from '../store.js';
import { icon, modal, confirmDialog, toast, fmtMoney, fmtDate, daysUntil, esc } from '../lib/ui.js';

const COLORS = ['#8aa67e','#6fa9cc','#cf8a6a','#e7b65a','#b8cbac','#6e8a62','#9dc7e0'];

export function Budget() {
  const el = document.createElement('div');
  let activeTab = 'depenses'; // 'depenses' | 'activites'

  function render() {
    const trip    = store.activeTrip();
    const expenses = store.list('expenses').filter(e => e.tripId === trip?.id);
    const spent   = expenses.reduce((s,e)=>s+Number(e.amount||0),0);
    const budget  = Number(trip?.budget||0);
    const remaining = budget - spent;
    const nights  = trip ? Math.max(1, Math.round((new Date(trip.end)-new Date(trip.start))/86400000)) : 1;

    // par catégorie
    const byCat = {};
    expenses.forEach(e => byCat[e.cat] = (byCat[e.cat]||0) + Number(e.amount||0));
    const cats = Object.entries(byCat).sort((a,b)=>b[1]-a[1]);
    const max  = Math.max(1, ...cats.map(c=>c[1]));

    // Activités du voyage actif avec un prix
    const activities = store.list('activities')
      .filter(a => !a.tripId || a.tripId === trip?.id);
    const actsWithPrice = activities.filter(a => a.price > 0);
    const actsTotal     = actsWithPrice.reduce((s,a)=>s+Number(a.price||0),0);

    el.innerHTML = `
      <!-- Stats -->
      <div class="grid g-3">
        <div class="card stat"><div class="label">💰 Budget prévisionnel</div><div class="value">${fmtMoney(budget)}</div>
          <div class="sub">${esc(trip?.title||'')}</div></div>
        <div class="card stat"><div class="label">🧾 Dépenses réelles</div><div class="value">${fmtMoney(spent)}</div>
          <div class="progress" style="margin-top:8px"><span style="width:${Math.min(100, budget?spent/budget*100:0)}%"></span></div></div>
        <div class="card stat"><div class="label">✅ Restant</div>
          <div class="value" style="color:${remaining<0?'var(--danger)':'var(--sage-deep)'}">${fmtMoney(remaining)}</div>
          <div class="sub">${remaining<0?'Dépassement !':'dans le budget'}</div></div>
      </div>

      <div class="grid g-2" style="margin-top:16px">
        <div class="card stat"><div class="label">📅 Coût journalier moyen</div>
          <div class="value">${fmtMoney(spent/nights)}</div><div class="sub">sur ${nights} jours</div></div>
        <div class="card stat"><div class="label">🧮 Coût total estimé</div>
          <div class="value">${fmtMoney(spent)}</div><div class="sub">${expenses.length} dépenses enregistrées</div></div>
      </div>

      <!-- Graphique catégories -->
      <div class="section-head"><h3>📊 Dépenses par catégorie</h3></div>
      <div class="card">
        ${cats.length ? `<div class="bars">${cats.map(([c,v],i)=>`
          <div class="bar-line">
            <span>${esc(c)}</span>
            <div class="bar-track"><div class="bar-fill" style="width:${v/max*100}%;background:${COLORS[i%COLORS.length]}"></div></div>
            <b style="text-align:right">${fmtMoney(v)}</b>
          </div>`).join('')}</div>` : '<p style="color:var(--ink-faint)">Aucune dépense.</p>'}
      </div>

      <!-- Calculateurs -->
      <div class="grid g-2" style="margin-top:16px;align-items:start">
        <div class="card">
          <div class="section-head" style="margin:0 0 12px"><h3>⛽ Calcul carburant</h3></div>
          <div class="row"><div class="field"><label>Distance (km)</label><input id="f-km" type="number" value="900"></div>
            <div class="field"><label>Conso (L/100)</label><input id="f-conso" type="number" value="10"></div></div>
          <div class="field"><label>Prix gasoil (€/L)</label><input id="f-prix" type="number" step="0.01" value="1.85"></div>
          <div class="card" style="background:var(--surface-2);text-align:center">
            <div class="label" style="justify-content:center">Coût carburant estimé</div>
            <div class="value" id="f-res" style="font-size:1.8rem">—</div></div>
        </div>
        <div class="card">
          <div class="section-head" style="margin:0 0 12px"><h3>🛣️ Calcul péages</h3></div>
          <div class="field"><label>Nombre de portions</label><input id="t-n" type="number" value="4"></div>
          <div class="field"><label>Coût moyen par portion (€)</label><input id="t-c" type="number" step="0.5" value="12"></div>
          <div class="field"><label>Aller-retour</label>
            <select id="t-ar"><option value="2">Oui (×2)</option><option value="1">Non</option></select></div>
          <div class="card" style="background:var(--surface-2);text-align:center">
            <div class="label" style="justify-content:center">Coût péages estimé</div>
            <div class="value" id="t-res" style="font-size:1.8rem">—</div></div>
        </div>
      </div>

      <!-- Onglets Dépenses / Activités -->
      <div class="section-head" style="margin-top:24px">
        <div class="seg" style="margin:0">
          <button data-tab="depenses" class="${activeTab==='depenses'?'on':''}">🧾 Dépenses ${expenses.length ? `(${expenses.length})` : ''}</button>
          <button data-tab="activites" class="${activeTab==='activites'?'on':''}">🎒 Activités ${actsWithPrice.length ? `(${actsWithPrice.length})` : ''}</button>
        </div>
        <div class="spacer"></div>
        ${activeTab==='depenses' ? `<button class="btn primary add">${icon('plus')} Dépense</button>` : ''}
      </div>

      <!-- Contenu onglet Dépenses -->
      <div id="tab-depenses" ${activeTab!=='depenses'?'hidden':''}>
        <div class="list">
          ${expenses.length ? expenses.map(e=>`
            <div class="item" data-id="${e.id}">
              <div class="ic">💶</div>
              <div class="body"><b>${esc(e.label)}</b><small>${esc(e.cat)} · ${fmtDate(e.date)}</small></div>
              <div class="meta"><b>${fmtMoney(e.amount)}</b></div>
              <div class="acts"><button class="icon-btn d">${icon('trash')}</button></div>
            </div>`).join('') : '<p style="color:var(--ink-faint)">Aucune dépense enregistrée.</p>'}
        </div>
      </div>

      <!-- Contenu onglet Activités -->
      <div id="tab-activites" ${activeTab!=='activites'?'hidden':''}>
        ${actsWithPrice.length ? `
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:8px">
            <span style="color:var(--ink-soft);font-size:.88rem">${actsWithPrice.length} activité${actsWithPrice.length>1?'s':''} avec entrée payante — total estimé : <b>${fmtMoney(actsTotal)}</b></span>
            <button class="btn primary" id="import-all">⬇️ Tout importer en dépenses</button>
          </div>
          <div class="list">
            ${actsWithPrice.map(a=>`
              <div class="item" data-aid="${a.id}">
                <div class="ic">${a.cat==='Visite'?'🏛️':a.cat==='Randonnée'?'🥾':a.cat==='Plage'?'🏖️':a.cat==='Sport'?'🚴':a.cat==='Marché'?'🧺':'📍'}</div>
                <div class="body">
                  <b>${esc(a.title)}</b>
                  <small>${esc(a.cat||'')}${a.status==='realise'?' · ✅ Réalisée':a.status==='enregistre'?' · 📌 Enregistrée':' · 💭 Envie'}</small>
                </div>
                <div class="meta"><b>${fmtMoney(a.price)}</b></div>
                <div class="acts">
                  <button class="btn sm primary import-one" data-aid="${a.id}" title="Ajouter en dépense">
                    ${icon('plus')} Dépense
                  </button>
                </div>
              </div>`).join('')}
          </div>` : `
          <div class="empty" style="padding:40px 20px">
            <div class="big">🎒</div>
            <p style="color:var(--ink-faint);margin-top:12px">Aucune activité avec un prix renseigné pour ce voyage.<br>
            Ajoutez un prix dans le module Activités pour les voir ici.</p>
          </div>`}
      </div>`;

    // ── Calculateurs ───────────────────────────────────────────
    const calc = () => {
      const km=+el.querySelector('#f-km').value, conso=+el.querySelector('#f-conso').value, prix=+el.querySelector('#f-prix').value;
      el.querySelector('#f-res').textContent = fmtMoney(km/100*conso*prix);
      const n=+el.querySelector('#t-n').value, c=+el.querySelector('#t-c').value, ar=+el.querySelector('#t-ar').value;
      el.querySelector('#t-res').textContent = fmtMoney(n*c*ar);
    };
    el.querySelectorAll('#f-km,#f-conso,#f-prix,#t-n,#t-c,#t-ar').forEach(i=>i.oninput=calc);
    calc();

    // ── Onglets ────────────────────────────────────────────────
    el.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => {
      activeTab = b.dataset.tab; render();
    });

    // ── Nouvelle dépense ───────────────────────────────────────
    const addBtn = el.querySelector('.add'); if (addBtn) addBtn.onclick = async () => {
      await modal({ title:'Nouvelle dépense', body:`<form>
        <div class="field"><label>Libellé</label><input name="label"></div>
        <div class="row">
          <div class="field"><label>Montant (€)</label><input name="amount" type="number"></div>
          <div class="field"><label>Date</label><input name="date" type="date" value="${new Date().toISOString().slice(0,10)}"></div>
        </div>
        <div class="field"><label>Catégorie</label><select name="cat">
          ${['Hébergement','Transport','Activités','Courses','Restaurant','Carburant','Péages','Autre'].map(c=>`<option>${c}</option>`).join('')}
        </select></div></form>`,
        okText:'Ajouter', onOk:(data)=>{ data.tripId=trip?.id; store.add('expenses',data); toast('Dépense ajoutée'); } });
      render();
    };

    // ── Supprimer dépense ──────────────────────────────────────
    el.querySelectorAll('.item .d').forEach(b => b.onclick = async () => {
      const id = b.closest('.item').dataset.id;
      if (await confirmDialog('Supprimer','Supprimer cette dépense ?')) { store.remove('expenses',id); toast('Supprimé','warn'); render(); }
    });

    // ── Importer une activité en dépense ───────────────────────
    function importActivity(aid) {
      const a = store.doc('activities', aid); if (!a) return;
      // Vérifier si déjà importée (libellé identique + même tripId)
      const alreadyImported = store.list('expenses').some(
        e => e.tripId === trip?.id && e.label === a.title && e.cat === 'Activités'
      );
      if (alreadyImported) {
        toast(`« ${a.title} » est déjà dans les dépenses`, 'warn');
        return;
      }
      store.add('expenses', {
        tripId: trip?.id,
        label:  a.title,
        amount: a.price,
        date:   new Date().toISOString().slice(0,10),
        cat:    'Activités',
      });
      toast(`✅ « ${a.title} » ajouté aux dépenses`);
      render();
    }

    el.querySelectorAll('.import-one').forEach(b => b.onclick = () => importActivity(b.dataset.aid));

    // ── Tout importer ──────────────────────────────────────────
    el.querySelector('#import-all')?.onclick = async () => {
      const ok = await confirmDialog(
        'Importer toutes les activités',
        `Ajouter ${actsWithPrice.length} activité(s) aux dépenses ? Les doublons seront ignorés.`
      );
      if (!ok) return;
      let added = 0;
      actsWithPrice.forEach(a => {
        const alreadyImported = store.list('expenses').some(
          e => e.tripId === trip?.id && e.label === a.title && e.cat === 'Activités'
        );
        if (!alreadyImported) {
          store.add('expenses', {
            tripId: trip?.id,
            label:  a.title,
            amount: a.price,
            date:   new Date().toISOString().slice(0,10),
            cat:    'Activités',
          });
          added++;
        }
      });
      toast(`✅ ${added} activité(s) importée(s) en dépenses`);
      activeTab = 'depenses';
      render();
    };
  }

  render();
  return el;
}
