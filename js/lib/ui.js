// js/lib/ui.js — icônes + helpers d'interface

const P = {
  home:'M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10',
  compass:'M12 2a10 10 0 100 20 10 10 0 000-20zM16 8l-2 6-6 2 2-6 6-2z',
  map:'M9 3L3 6v15l6-3 6 3 6-3V3l-6 3-6-3zM9 3v15M15 6v15',
  suitcase:'M6 7V5a2 2 0 012-2h8a2 2 0 012 2v2M3 7h18v13H3zM9 11v5M15 11v5',
  ticket:'M3 8a2 2 0 012-2h14a2 2 0 012 2v2a2 2 0 000 4v2a2 2 0 01-2 2H5a2 2 0 01-2-2v-2a2 2 0 000-4z',
  wallet:'M3 7h15a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2zM3 7l2-3h11l1 3M17 13h.01',
  star:'M12 3l2.9 5.9 6.5.9-4.7 4.6 1.1 6.4L12 18.8 6.2 21.8l1.1-6.4L2.6 9.8l6.5-.9z',
  cloud:'M17 18a4 4 0 000-8 6 6 0 00-11.5 2A3.5 3.5 0 006 18z',
  mountain:'M8 3l4 8 3-4 6 13H3z',
  paw:'M5 14a2 2 0 100-4 2 2 0 000 4zM19 14a2 2 0 100-4 2 2 0 000 4zM9 9a2 2 0 100-4 2 2 0 000 4zM15 9a2 2 0 100-4 2 2 0 000 4zM7.5 19c0-3 2-4 4.5-4s4.5 1 4.5 4a2 2 0 01-2 2c-1 0-1.5-.5-2.5-.5s-1.5.5-2.5.5a2 2 0 01-2-2z',
  wrench:'M14.7 6.3a4 4 0 00-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 005.4-5.4l-2.5 2.5-2.4-.6-.6-2.4 2.5-2.5z',
  box:'M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8M12 13v8',
  check:'M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11',
  folder:'M3 7a2 2 0 012-2h4l2 3h8a2 2 0 012 2v7a2 2 0 01-2 2H5a2 2 0 01-2-2z',
  chat:'M21 12a8 8 0 01-11.5 7.2L3 21l1.8-6.5A8 8 0 1121 12z',
  route:'M6 19a3 3 0 100-6 3 3 0 000 6zM18 11a3 3 0 100-6 3 3 0 000 6zM6 13V9a4 4 0 014-4h4',
  bulb:'M9 18h6M10 21h4M12 3a6 6 0 00-4 10.5c.7.7 1 1.3 1 2.5h6c0-1.2.3-1.8 1-2.5A6 6 0 0012 3z',
  download:'M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2',
  plus:'M12 5v14M5 12h14',
  search:'M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.3-4.3',
  bell:'M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0',
  moon:'M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z',
  sun:'M12 17a5 5 0 100-10 5 5 0 000 10zM12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4',
  menu:'M3 6h18M3 12h18M3 18h18',
  edit:'M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.1 2.1 0 013 3L12 15l-4 1 1-4z',
  trash:'M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6',
  x:'M18 6L6 18M6 6l12 12',
  logout:'M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9',
  pin:'M12 21s-7-6.3-7-11a7 7 0 1114 0c0 4.7-7 11-7 11zM12 12a2 2 0 100-4 2 2 0 000 4z',
  clock:'M12 22a10 10 0 100-20 10 10 0 000 20zM12 6v6l4 2',
  users:'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.9M16 3.1a4 4 0 010 7.8',
  upload:'M12 21V9m0 0l-4 4m4-4l4 4M4 7V5a2 2 0 012-2h12a2 2 0 012 2v2',
  fuel:'M3 22V4a2 2 0 012-2h6a2 2 0 012 2v18M3 11h10M16 7l3 3v8a2 2 0 11-4 0V5',
  send:'M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z',
  phone:'M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3 19.5 19.5 0 01-6-6 19.8 19.8 0 01-3-8.6A2 2 0 014.1 2h3a2 2 0 012 1.7c.1.9.3 1.8.6 2.6a2 2 0 01-.5 2.1L8 9.5a16 16 0 006 6l1.1-1.1a2 2 0 012.1-.5c.8.3 1.7.5 2.6.6a2 2 0 011.7 2z',
  mail:'M4 4h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2zM22 6l-10 7L2 6',
  globe:'M12 22a10 10 0 100-20 10 10 0 000 20zM2 12h20M12 2a15 15 0 010 20 15 15 0 010-20z',
  heart:'M20.8 6.6a5 5 0 00-7.1 0L12 8.3l-1.7-1.7a5 5 0 00-7.1 7.1L12 21l8.8-8.8a5 5 0 000-7.1z',
  tent:'M12 4l9 16H3zM12 4v16M12 11l5 9M12 11l-5 9',
  camera:'M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2zM12 17a4 4 0 100-8 4 4 0 000 8z',
  euro:'M18 7a6 6 0 100 10M4 11h8M4 14h7',
  link:'M10 13a5 5 0 007 0l3-3a5 5 0 00-7-7l-1.5 1.5M14 11a5 5 0 00-7 0l-3 3a5 5 0 007 7l1.5-1.5',
  calendar:'M3 8h18M7 3v3M17 3v3M5 5h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z',

  // --- Icônes ajoutées pour les modules v2 ---
  // Galerie photos
  image:'M3 3h18a1 1 0 011 1v16a1 1 0 01-1 1H3a1 1 0 01-1-1V4a1 1 0 011-1zM8.5 10a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM21 15l-5-5L5 21',
  // Rappels désactivés
  'bell-off':'M8.56 2.9A7 7 0 0119 9v4m0 0l2 4H3l2-4m7 4v1a3 3 0 006 0v-1M1 1l22 22',
  // Hors-ligne
  'wifi-off':'M1 1l22 22M16.72 11.06A10.94 10.94 0 0119 12.55M5 12.55a10.94 10.94 0 015.17-2.39M10.71 5.05A16 16 0 0122.54 9M1.42 9a15.91 15.91 0 014.7-2.88M8.53 16.11a6 6 0 016.95 0M12 20h.01',
  // --- Icônes ajoutées pour le module Découverte v2 ---
  // Flèche retour (navigation détail → liste)
  'arrow-left':'M19 12H5M12 5l-7 7 7 7',
  // Chevron accordéon
  'chevron-down':'M6 9l6 6 6-6',
  // Animal (chien) — politique animaux
  dog:'M10 5.172C10 3.782 8.423 2.993 7.339 3.845L5.14 5.64a2 2 0 01-1.246.436H4a2 2 0 00-2 2v5a2 2 0 002 2h.14a2 2 0 011.246.437l2.2 1.793C8.423 18.007 10 17.218 10 15.828V5.172zM15 8a3 3 0 010 6M17.6 5.8A7 7 0 0117.6 16',
  // Marqueur carte (hero sous-titre)
  'map-pin':'M12 21s-7-6.3-7-11a7 7 0 1114 0c0 4.7-7 11-7 11zM12 12a2 2 0 100-4 2 2 0 000 4z',
  // Avion (bannière transformer)
  plane:'M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z',
  // Route (accordéon accès)
  road:'M4 19h16M4 5h16M6 5v14M18 5v14M10 9h4M10 13h4',
  // Baguette magique (bouton transformer)
  wand:'M15 4l5 5L8 21H3v-5L15 4zM14 7l3 3',
  // Crayon (bouton modifier)
  pencil:'M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.1 2.1 0 013 3L12 15l-4 1 1-4z',
  // Cœur plein (favori actif)
  'heart-filled':'M20.8 6.6a5 5 0 00-7.1 0L12 8.3l-1.7-1.7a5 5 0 00-7.1 7.1L12 21l8.8-8.8a5 5 0 000-7.1z',
  // Drapeau (section "Pourquoi ce séjour")
  flag:'M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7',
  // Étoile filante (section "Points forts")
  sparkles:'M12 3l1.5 4.5H18l-3.75 2.7 1.5 4.5L12 12l-3.75 2.7 1.5-4.5L6 7.5h4.5z',
};

export function icon(name, cls='') {
  const d = P[name] || P.star;
  return `<svg class="${cls}" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>`;
}

// ---- Format ----
export const fmtMoney = n => (Number(n)||0).toLocaleString('fr-FR',{style:'currency',currency:'EUR',maximumFractionDigits:0});
export const fmtDate  = d => d ? new Date(d).toLocaleDateString('fr-FR',{day:'numeric',month:'short',year:'numeric'}) : '—';
export const fmtDateShort = d => d ? new Date(d).toLocaleDateString('fr-FR',{day:'numeric',month:'short'}) : '—';
export const daysUntil = d => Math.ceil((new Date(d) - new Date()) / 86400000);
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,7);
export const esc = s => String(s??'').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

// ---- Toast ----
export function toast(msg, type='ok') {
  let box = document.querySelector('.toasts');
  if (!box) { box = document.createElement('div'); box.className = 'toasts'; document.body.append(box); }
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `${icon(type==='danger'?'x':type==='warn'?'bell':'check')}<span>${esc(msg)}</span>`;
  box.append(t);
  setTimeout(() => { t.style.opacity='0'; t.style.transform='translateX(40px)'; setTimeout(()=>t.remove(),300); }, 2600);
}

// ---- Modal ----
export function modal({ title, body, okText='Enregistrer', onOk, wide }) {
  return new Promise(resolve => {
    const bd = document.createElement('div');
    bd.className = 'backdrop';
    bd.innerHTML = `<div class="modal" ${wide?'style="max-width:680px"':''}>
      <header><h3>${esc(title)}</h3><button class="icon-btn close">${icon('x')}</button></header>
      <div class="body">${body}</div>
      <footer>
        <button class="btn ghost cancel">Annuler</button>
        ${onOk ? `<button class="btn primary ok">${esc(okText)}</button>` : ''}
      </footer></div>`;
    document.body.append(bd);
    const close = (v) => { bd.remove(); resolve(v); };
    bd.querySelector('.close').onclick = () => close(null);
    bd.querySelector('.cancel').onclick = () => close(null);
    bd.onclick = e => { if (e.target === bd) close(null); };
    const okBtn = bd.querySelector('.ok');
    if (okBtn) okBtn.onclick = () => {
      const form = bd.querySelector('form') || bd.querySelector('.body');
      const data = {};
      form.querySelectorAll('[name]').forEach(el => {
        data[el.name] = el.type === 'checkbox' ? el.checked : el.value;
      });
      const r = onOk ? onOk(data, bd) : true;
      if (r !== false) close(data);
    };
    setTimeout(()=> { const f = bd.querySelector('input,select,textarea'); if(f) f.focus(); }, 50);
  });
}

export function confirmDialog(title, msg) {
  return modal({ title, body:`<p style="color:var(--ink-soft)">${esc(msg)}</p>`, okText:'Confirmer', onOk:()=>true });
}

export function empty(emoji, title, sub) {
  return `<div class="empty"><div class="big">${emoji}</div><h3>${esc(title)}</h3><p>${esc(sub||'')}</p></div>`;
}

// Fiche éditable plein contrôle : renvoie { bd, body, close, onOk(fn), done }.
// fn peut être asynchrone (ex. upload de fichiers) et retourner false pour
// garder la fiche ouverte (validation), ou la valeur à résoudre.
export function sheet({ title, bodyHTML = '', okText = 'Enregistrer', wide = true }) {
  const bd = document.createElement('div');
  bd.className = 'backdrop';
  bd.innerHTML = `<div class="modal" style="max-width:${wide ? 720 : 520}px">
    <header><h3>${esc(title)}</h3><button class="icon-btn close">${icon('x')}</button></header>
    <div class="body">${bodyHTML}</div>
    <footer><button class="btn ghost cancel">Annuler</button><button class="btn primary ok">${esc(okText)}</button></footer>
  </div>`;
  document.body.append(bd);
  const body = bd.querySelector('.body');
  let onSave = null, resolver;
  const done = new Promise(r => (resolver = r));
  const close = (v) => { bd.remove(); resolver(v); };
  bd.querySelector('.close').onclick = () => close(null);
  bd.querySelector('.cancel').onclick = () => close(null);
  bd.onclick = (e) => { if (e.target === bd) close(null); };
  bd.querySelector('.ok').onclick = async () => {
    if (!onSave) return close(true);
    const okBtn = bd.querySelector('.ok'); okBtn.disabled = true;
    try { const r = await onSave(); if (r === false) { okBtn.disabled = false; return; } close(r); }
    catch (e) { okBtn.disabled = false; toast('Erreur, réessayez', 'danger'); }
  };
  return { bd, body, close, onOk(fn) { onSave = fn; }, done };
}
