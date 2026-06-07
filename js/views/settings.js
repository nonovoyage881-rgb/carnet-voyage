// js/views/settings.js
import { store } from '../store.js';
import { icon, modal, toast, confirmDialog, esc } from '../lib/ui.js';

const ROLES = ['Administrateur','Parent','Enfant'];

export function Settings(nav, applyTheme) {
  const el = document.createElement('div');
  function render() {
    const members = store.list('members');
    const me = store.setting('me') || members[0]?.name;
    const theme = store.setting('theme') || 'light';
    const family = store.setting('family') || 'Ma famille';

    el.innerHTML = `
      <div class="section-head"><h3>⚙️ Paramètres</h3></div>

      <div class="card">
        <div class="field"><label>Nom de la famille</label><input id="fam" value="${esc(family)}"></div>
        <div class="row">
          <div class="field"><label>Profil actif (vous)</label>
            <select id="me">${members.map(m=>`<option ${m.name===me?'selected':''}>${esc(m.name)}</option>`).join('')}</select></div>
          <div class="field"><label>Thème</label>
            <select id="theme"><option value="light" ${theme==='light'?'selected':''}>☀️ Clair</option><option value="dark" ${theme==='dark'?'selected':''}>🌙 Sombre</option></select></div>
        </div>
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
    el.querySelector('#me').onchange = e => { store.setting('me', e.target.value); toast(`Bonjour ${e.target.value} 👋`); };
    el.querySelector('#theme').onchange = e => { store.setting('theme', e.target.value); applyTheme(e.target.value); };
    el.querySelectorAll('.role').forEach(s=>s.onchange=()=>{ store.update('members',s.dataset.id,{role:s.value}); toast('Rôle mis à jour'); });
    el.querySelectorAll('.item .del').forEach(b=>b.onclick=async()=>{ const id=b.closest('.item').dataset.id;
      if(await confirmDialog('Retirer le membre','Retirer cette personne de la famille ?')){ store.remove('members',id); render(); }});

    el.querySelector('.invite').onclick = async ()=>{ await modal({ title:'Inviter un membre', body:`<form>
      <div class="field"><label>Prénom</label><input name="name"></div>
      <div class="field"><label>E-mail</label><input name="email" type="email" placeholder="membre@famille.fr"></div>
      <div class="field"><label>Rôle</label><select name="role">${ROLES.map(r=>`<option>${r}</option>`).join('')}</select></div></form>`,
      okText:'Envoyer l\'invitation', onOk:(d)=>{ d.color=['#6e8a62','#6fa9cc','#cf8a6a','#e7b65a'][Math.floor(Math.random()*4)]; store.add('members',d); toast(`Invitation envoyée à ${d.email}`); }}); render(); };

    el.querySelector('.exp').onclick = ()=>{ const blob=new Blob([store.export()],{type:'application/json'});
      const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='carnet-voyage-sauvegarde.json'; a.click(); toast('Sauvegarde exportée'); };
    el.querySelector('.imp').onclick = ()=>el.querySelector('#imp-file').click();
    el.querySelector('#imp-file').onchange = (ev)=>{ const f=ev.target.files[0]; if(!f) return; const fr=new FileReader();
      fr.onload=()=>{ try{ store.import(fr.result); toast('Sauvegarde restaurée'); location.reload(); }catch{ toast('Fichier invalide','danger'); } }; fr.readAsText(f); };
    el.querySelector('.reset').onclick = async ()=>{ if(await confirmDialog('Réinitialiser','Toutes vos données seront effacées et remplacées par la démo.')){ store.reset(); location.reload(); }};
  }
  render();
  return el;
}
