// js/views/settings.js
import { store } from '../store.js';
import { icon, modal, toast, confirmDialog, esc } from '../lib/ui.js';
import { ownerMiniLineHTML } from '../lib/tripOwners.js';

const ROLES = ['Administrateur','Parent','Enfant'];

export function Settings(nav, applyTheme) {
  const el = document.createElement('div');

  function daysUntil(str) {
    if (!str) return null;
    const d = new Date(str); if (isNaN(d)) return null;
    d.setHours(0,0,0,0);
    const t = new Date(); t.setHours(0,0,0,0);
    return Math.round((d - t) / 86400000);
  }

  function buildReminderPreview() {
    const lines = [];
    store.list('trips').filter(t => t.status === 'futur').forEach(t => {
      const d = daysUntil(t.start);
      if (d !== null && d >= 0 && d <= 9)
        lines.push(`<div style="font-size:.85rem;color:var(--ink-soft)">🧳 <b>${esc(t.title)}</b>${ownerMiniLineHTML(t)} — départ dans ${d} jour${d>1?'s':''}</div>`);
    });
    store.list('reservations').forEach(r => {
      const d = daysUntil(r.arrDate);
      if (d !== null && d >= 0 && d <= 4)
        lines.push(`<div style="font-size:.85rem;color:var(--ink-soft)">🎫 <b>${esc(r.name||r.type)}</b> — dans ${d} jour${d>1?'s':''}</div>`);
    });
    return lines.length ? lines.join('') : '<div style="font-size:.85rem;color:var(--ink-faint)">Aucun événement proche pour l\'instant.</div>';
  }

  function render() {
    const members = store.list('members');
    const memberId = store.setting('memberId');
    const currentMember = (memberId && store.doc('members', memberId)) || members.find(m => m.name === store.setting('me')) || members[0];
    const me = currentMember?.name;
    const theme = store.setting('theme') || 'light';
    const family = store.setting('family') || 'Ma famille';
    const remindersOn = !!store.setting('remindersEnabled');

    el.innerHTML = `
      <div class="section-head"><h3>⚙️ Paramètres</h3></div>

      <div class="card">
        <div class="field"><label>Nom de la famille</label><input id="fam" value="${esc(family)}"></div>
        <div class="row">
          <div class="field"><label>Profil actif (vous)</label>
            <select id="me">${members.map(m=>`<option value="${esc(m.id)}" ${m.id===currentMember?.id?'selected':''}>${esc(m.name)}</option>`).join('')}</select></div>
          <div class="field"><label>Thème</label>
            <select id="theme"><option value="light" ${theme==='light'?'selected':''}>☀️ Clair</option><option value="dark" ${theme==='dark'?'selected':''}>🌙 Sombre</option></select></div>
        </div>
      </div>

      <div class="section-head"><h3>🔔 Rappels à l'ouverture</h3></div>
      <div class="card">
        <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">
          <div style="flex:1;min-width:200px">
            <b style="display:block;margin-bottom:4px">Rappels intelligents</b>
            <p style="color:var(--ink-soft);font-size:.85rem;margin:0">
              À chaque ouverture, l'app vérifie vos dates et affiche un bandeau
              si un départ ou une réservation approche (J-7, J-1, jour J).
              Les rappels s'affichent uniquement quand vous ouvrez l'application.
            </p>
          </div>
          <label style="display:flex;align-items:center;gap:10px;cursor:pointer;flex-shrink:0">
            <input type="checkbox" id="rem-toggle" ${remindersOn?'checked':''} style="width:20px;height:20px;accent-color:var(--sage-deep)">
            <b>${remindersOn ? 'Activés' : 'Désactivés'}</b>
          </label>
        </div>
        ${remindersOn ? `
        <div style="margin-top:14px;padding-top:14px;border-top:1px solid var(--border)">
          <b style="font-size:.82rem;color:var(--ink-faint);text-transform:uppercase;letter-spacing:.08em">Rappels programmés</b>
          <div style="margin-top:8px;display:flex;flex-direction:column;gap:6px">
            ${buildReminderPreview()}
          </div>
        </div>` : ''}
      </div>

      <div class="section-head"><h3>👨‍👩‍👧‍👦 Membres & rôles</h3><div class="spacer"></div>
        <button class="btn primary invite">${icon('users')} Inviter par e-mail</button></div>
      <div class="list">
        ${members.map(m=>`<div class="item" data-id="${m.id}">
          <div class="ic" style="background:${m.color};color:#fff">${esc(m.name[0])}</div>
          <div class="body"><b>${esc(m.name)}</b><small>${esc(m.email||'—')}</small></div>
          <select class="role" data-id="${m.id}" style="border:1px solid var(--border);border-radius:10px;padding:6px 10px;background:var(--surface-2)">
            ${ROLES.map(r=>`<option ${m.role===r?'selected':''}>${r}</option>`).join('')}</select>
          <div class="acts"><button class="icon-btn del">${icon('trash')}</button></div>
        </div>`).join('')}
      </div>
      <p style="color:var(--ink-faint);font-size:.82rem;margin-top:8px">Avec le compte familial partagé, « inviter » consiste à transmettre le lien de l'app et les identifiants à vos proches : ils se connectent et voient aussitôt le carnet commun. Ajouter un membre ici crée simplement son profil (nom, rôle).</p>

      <div class="section-head"><h3>💾 Données & sauvegarde</h3></div>
      <div class="grid g-3">
        <button class="card hoverable btn-card exp">${icon('download')}<b>Exporter (JSON)</b><small>Sauvegarde complète</small></button>
        <button class="card hoverable btn-card imp">${icon('upload')}<b>Importer (JSON)</b><small>Restaurer une sauvegarde</small></button>
        <button class="card hoverable btn-card reset" style="color:var(--danger)">${icon('trash')}<b>Réinitialiser</b><small>Revenir à la démo</small></button>
      </div>
      <input type="file" id="imp-file" accept=".json" hidden>

      ${store.mode === 'firebase' ? `
      <div class="card" style="margin-top:18px;border-left:5px solid var(--sage-deep)">
        <b>${icon('users')} Synchronisation famille active</b>
        <p style="color:var(--ink-soft);margin:6px 0 0">Toutes les données sont partagées en temps réel via le compte familial : ce que vous ajoutez apparaît sur les appareils de tous les membres connectés. L'app reste utilisable hors-ligne et se resynchronise au retour du réseau.</p>
      </div>` : `
      <div class="card" style="margin-top:18px;border-left:5px solid var(--sky-deep)">
        <b>🔌 Mode local actif</b>
        <p style="color:var(--ink-soft);margin:6px 0 0">Toutes les données sont stockées sur cet appareil et l'app fonctionne hors-ligne. Pour la synchronisation famille en temps réel, renseignez vos clés Firebase dans <code>js/config.js</code> (guide complet dans le <b>README</b>).</p>
      </div>`}`;

    el.querySelector('#fam').onchange = e => { store.setting('family', e.target.value); toast('Enregistré'); };
    el.querySelector('#me').onchange = e => { const m = store.doc('members', e.target.value); if (!m) return; store.setting('me', m.name); store.setting('memberId', m.id); store.setting('myRole', m.role); toast(`Bonjour ${m.name} 👋`); };
    el.querySelector('#theme').onchange = e => { store.setting('theme', e.target.value); applyTheme(e.target.value); };
    el.querySelector('#rem-toggle').onchange = e => {
      store.setting('remindersEnabled', e.target.checked);
      toast(e.target.checked ? '🔔 Rappels activés' : 'Rappels désactivés');
      render();
    };
    el.querySelectorAll('.role').forEach(s=>s.onchange=()=>{ store.update('members',s.dataset.id,{role:s.value}); toast('Rôle mis à jour'); });
    el.querySelectorAll('.item .del').forEach(b=>b.onclick=async()=>{ const id=b.closest('.item').dataset.id;
      if(await confirmDialog('Retirer le membre','Retirer cette personne de la famille ?')){
          // RISQUE-07 : lire le nom AVANT remove (après, doc() retourne null)
          const removedName = store.doc('members', id)?.name;
          store.remove('members',id);
          if (removedName && store.setting('me') === removedName) { store.setting('me', ''); store.setting('memberId', ''); store.setting('myRole', ''); }
          render(); }});

    el.querySelector('.invite').onclick = async ()=>{ await modal({ title:'Inviter un membre', body:`<form>
      <div class="field"><label>Prénom</label><input name="name"></div>
      <div class="field"><label>E-mail</label><input name="email" type="email" placeholder="membre@famille.fr"></div>
      <div class="field"><label>Rôle</label><select name="role">${ROLES.map(r=>`<option>${r}</option>`).join('')}</select></div></form>`,
      okText:'Envoyer l\'invitation', onOk:(d)=>{ d.color=['#6e8a62','#6fa9cc','#cf8a6a','#e7b65a'][Math.floor(Math.random()*4)]; store.add('members',d); toast(`Invitation envoyée à ${d.email}`); }}); render(); };

    el.querySelector('.exp').onclick = ()=>{ const blob=new Blob([store.export()],{type:'application/json'});
      const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='carnet-voyage-sauvegarde.json'; a.click(); toast('Sauvegarde exportée'); };
    el.querySelector('.imp').onclick = ()=>el.querySelector('#imp-file').click();
    el.querySelector('#imp-file').onchange = async (ev)=>{ const f=ev.target.files[0]; if(!f) return; const fr=new FileReader();
      fr.onload=async ()=>{ try{
        // BUG-09 : en mode Firebase, confirmer avant d'écraser les données cloud de toute la famille
        let syncCloud = false;
        if (store.mode === 'firebase') {
          const ok = await confirmDialog('Remplacer les données familiales',
            'Cette sauvegarde va remplacer les données de tous les membres sur tous les appareils. Continuer ?');
          if (!ok) return;
          syncCloud = true;
        }
        store.import(fr.result, { syncCloud }); toast('Sauvegarde restaurée'); location.reload();
      }catch{ toast('Fichier invalide','danger'); } }; fr.readAsText(f); };
    el.querySelector('.reset').onclick = async ()=>{ if(await confirmDialog('Réinitialiser','Toutes vos données seront effacées et remplacées par la démo.')){ store.reset(); location.reload(); }};
  }
  render();
  return el;
}
