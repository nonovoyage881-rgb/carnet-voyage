// js/views/exports.js
import { store } from '../store.js';
import { icon, toast, fmtMoney, fmtDate, esc } from '../lib/ui.js';
import { ownerLabel, familyTripMessage, tripOwnerName } from '../lib/tripOwners.js';

export function Exports() {
  const el = document.createElement('div');
  const trip = store.activeTrip();

  el.innerHTML = `
    <div class="section-head"><h3>📤 Exports</h3></div>
    <p style="color:var(--ink-soft);margin:-4px 0 18px">Générez des documents à partager ou à conserver, pour le voyage actif : <b>${esc(trip?.title||'—')}</b>${trip ? ` · ${esc(ownerLabel(trip))}` : ''}.</p>
    <div class="grid g-3">
      <button class="card hoverable btn-card pdf">${icon('download')}<b>PDF du voyage</b><small>Récapitulatif complet imprimable</small></button>
      <button class="card hoverable btn-card book">${icon('star')}<b>Carnet souvenir</b><small>Journal + photos + activités</small></button>
      <button class="card hoverable btn-card xls">${icon('wallet')}<b>Budget (Excel/CSV)</b><small>Toutes les dépenses</small></button>
    </div>`;

  el.querySelector('.pdf').onclick = () => printDoc(buildTripDoc(trip), 'Récapitulatif de voyage');
  el.querySelector('.book').onclick = () => printDoc(buildSouvenir(trip), 'Carnet souvenir');
  el.querySelector('.xls').onclick = () => exportBudgetCSV(trip);

  return el;
}

function printDoc(html, title) {
  const w = window.open('', '_blank');
  if (!w) return toast('Autorisez les pop-ups pour exporter','warn');
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
    <style>
      body{font-family:'Quicksand',system-ui,sans-serif;color:#3b463a;max-width:760px;margin:30px auto;padding:0 24px;line-height:1.5}
      h1{color:#6e8a62} h2{color:#6e8a62;border-bottom:2px solid #e3dac8;padding-bottom:6px;margin-top:28px}
      .head{background:linear-gradient(120deg,#8aa67e,#6fa9cc);color:#fff;padding:26px;border-radius:16px;margin-bottom:20px}
      table{width:100%;border-collapse:collapse;margin:10px 0} td,th{text-align:left;padding:8px;border-bottom:1px solid #eee}
      .tag{background:#e9e1d2;border-radius:20px;padding:3px 10px;font-size:.8rem}
      @media print{button{display:none}}
    </style></head><body>${html}
    <p style="text-align:center;margin-top:30px;color:#97a094">Généré par « Carnet de voyage &amp; souvenirs »</p>
    <button onclick="window.print()" style="display:block;margin:20px auto;padding:12px 24px;border:none;background:#6e8a62;color:#fff;border-radius:20px;font-size:16px;cursor:pointer">🖨️ Imprimer / Enregistrer en PDF</button>
    </body></html>`);
  w.document.close();
  toast('Document prêt — utilisez « Enregistrer en PDF »');
}

function buildTripDoc(trip) {
  if (!trip) return '<p>Aucun voyage.</p>';
  const res = store.list('reservations').filter(r=>r.tripId===trip.id);
  const exp = store.list('expenses').filter(e=>e.tripId===trip.id);
  const acts = store.list('activities').filter(a=>a.tripId===trip.id);
  const spent = exp.reduce((s,e)=>s+ +e.amount,0);
  return `
    <div class="head"><h1 style="color:#fff;margin:0">${trip.cover} ${esc(trip.title)}</h1>
      <p style="margin:6px 0 0">${esc(trip.destination)} · ${fmtDate(trip.start)} → ${fmtDate(trip.end)}</p>
      <p style="margin:6px 0 0">👤 ${esc(ownerLabel(trip))} · ${esc(familyTripMessage(trip))}</p></div>
    <p>${esc(trip.notes||'')}</p>
    <h2>💰 Budget</h2><p>Prévisionnel : <b>${fmtMoney(trip.budget)}</b> · Dépensé : <b>${fmtMoney(spent)}</b> · Restant : <b>${fmtMoney(trip.budget-spent)}</b></p>
    <h2>🎟️ Réservations</h2><table><tr><th>Type</th><th>Intitulé</th><th>Date</th><th>Montant</th></tr>
      ${res.map(r=>`<tr><td><span class="tag">${esc(r.type)}</span></td><td>${esc(r.name||r.type)}</td><td>${fmtDate(r.arrDate)}</td><td>${fmtMoney(r.total)}</td></tr>`).join('')||'<tr><td colspan=4>—</td></tr>'}</table>
    <h2>🎒 Activités</h2><ul>${acts.map(a=>`<li>${esc(a.title)} — ${esc(a.cat)} ${a.pets?'🐾':''}</li>`).join('')||'<li>—</li>'}</ul>`;
}

function buildSouvenir(trip) {
  if (!trip) return '<p>Aucun voyage.</p>';
  const journal = (store.list('journal')||[]).filter(j=>j.tripId===trip.id);
  const hikes = store.list('hikes').filter(h=>h.tripId===trip.id);
  return `
    <div class="head"><h1 style="color:#fff;margin:0">📔 Carnet souvenir</h1><p style="margin:6px 0 0">${esc(trip.title)} · ${esc(trip.destination)}</p><p style="margin:6px 0 0">👤 ${esc(ownerLabel(trip))} · ${esc(familyTripMessage(trip))}</p></div>
    <h2>📝 Journal de bord</h2>
    ${journal.length?journal.map(j=>`<p><b>${fmtDate(j.date)}</b><br>${esc(j.text)}</p>`).join(''):'<p>Aucune note de journal pour l\'instant.</p>'}
    <h2>🥾 Randonnées</h2><ul>${hikes.map(h=>`<li>${esc(h.title)} — ${esc(h.dist)} km, ${esc(h.deniv)} m D+</li>`).join('')||'<li>—</li>'}</ul>
    <h2>📸 Photos</h2><p style="color:#97a094">Vos photos partagées dans la messagerie et les documents apparaîtront ici (mode Firebase Storage).</p>`;
}

function exportBudgetCSV(trip) {
  const exp = store.list('expenses').filter(e=>e.tripId===trip?.id);
  const rows = [['Voyage choisi par','Date','Catégorie','Libellé','Montant (€)'],
    ...exp.map(e=>[tripOwnerName(trip),e.date,e.cat,e.label,String(e.amount).replace('.',',')])];
  const csv = '\uFEFF' + rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(';')).join('\n');
  const blob = new Blob([csv],{type:'text/csv;charset=utf-8'});
  const a = document.createElement('a'); a.href=URL.createObjectURL(blob);
  a.download = `budget-${(trip?.title||'voyage').replace(/\s+/g,'-').toLowerCase()}.csv`; a.click();
  toast('Budget exporté (compatible Excel)');
}
