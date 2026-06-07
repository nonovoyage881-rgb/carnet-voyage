// =====================================================================
//  app.js — Coquille applicative : auth (profil), routeur, navigation
// =====================================================================
import { store } from './store.js';
import { icon, esc } from './lib/ui.js';
import { media } from './lib/media.js';

import { Dashboard }    from './views/dashboard.js';
import { Discover }     from './views/discover.js';
import { Trips }        from './views/trips.js';
import { Budget }       from './views/budget.js';
import { MapView }      from './views/map.js';
import { Weather }      from './views/weather.js';
import { Itineraries }  from './views/itineraries.js';
import { Inventory }    from './views/inventory.js';
import { Checklists }   from './views/checklists.js';
import { Settings }     from './views/settings.js';
import { Exports }      from './views/exports.js';
import { Reservations } from './views/reservations.js';
import { Activities }   from './views/activities.js';
import {
  Hikes, Animals, Maintenance, Documents,
} from './views/lists.js';

// ---------------------------------------------------------------------
//  Table de routage : route -> { titre, icône, vue, groupe }
// ---------------------------------------------------------------------
const ROUTES = {
  dashboard:    { label: 'Tableau de bord', icon: 'home',     view: Dashboard,    group: null },
  discover:     { label: 'Découverte',      icon: 'compass',  view: Discover,     group: 'Préparer' },
  trips:        { label: 'Voyages',         icon: 'suitcase', view: Trips,        group: 'Préparer' },
  itineraries:  { label: 'Itinéraires',     icon: 'route',    view: Itineraries,  group: 'Préparer' },
  reservations: { label: 'Réservations',    icon: 'ticket',   view: Reservations, group: 'Préparer' },
  budget:       { label: 'Budget',          icon: 'wallet',   view: Budget,       group: 'Sur place' },
  activities:   { label: 'Activités',       icon: 'star',     view: Activities,   group: 'Sur place' },
  weather:      { label: 'Météo',           icon: 'cloud',    view: Weather,      group: 'Sur place' },
  map:          { label: 'Carte',           icon: 'map',      view: MapView,      group: 'Sur place' },
  hikes:        { label: 'Randonnées',      icon: 'mountain', view: Hikes,        group: 'Sur place' },
  animals:      { label: 'Animaux',         icon: 'paw',      view: Animals,      group: 'Logistique' },
  maintenance:  { label: 'Entretien',       icon: 'wrench',   view: Maintenance,  group: 'Logistique' },
  inventory:    { label: 'Inventaire',      icon: 'box',      view: Inventory,    group: 'Logistique' },
  checklists:   { label: 'Checklists',      icon: 'check',    view: Checklists,   group: 'Logistique' },
  documents:    { label: 'Documents',       icon: 'folder',   view: Documents,    group: 'Logistique' },
  exports:      { label: 'Exports',         icon: 'download', view: Exports,      group: 'Logistique' },
  settings:     { label: 'Paramètres',      icon: 'users',    view: Settings,     group: 'Logistique' },
};

// Raccourcis affichés dans la barre du bas (mobile)
const BOTTOM = ['dashboard', 'discover', 'trips', 'map', 'budget'];

const root = document.getElementById('app');
let current = 'dashboard';
let _tripDocClose = null;

// ---------------------------------------------------------------------
//  Thème clair / sombre
// ---------------------------------------------------------------------
function applyTheme(theme) {
  const t = theme || store.setting('theme') || 'light';
  document.documentElement.setAttribute('data-theme', t);
  store.setting('theme', t);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', t === 'dark' ? '#1c150f' : '#b4663f');
}

// ---------------------------------------------------------------------
//  Navigation
// ---------------------------------------------------------------------
function nav(route) {
  if (!ROUTES[route]) route = 'dashboard';
  current = route;
  document.querySelector('.app')?.classList.remove('nav-open');
  renderShell();
  window.scrollTo(0, 0);
}

function viewFor(route) {
  const def = ROUTES[route];
  // On passe nav et applyTheme aux vues qui en ont besoin (signatures tolérantes).
  return def.view(nav, applyTheme);
}

// ---------------------------------------------------------------------
//  Construction de la coquille (sidebar + topbar + contenu + mobile)
// ---------------------------------------------------------------------
function navLinksHTML() {
  let html = '';
  let lastGroup = '__';
  for (const [route, def] of Object.entries(ROUTES)) {
    const g = def.group || '';
    if (g !== lastGroup) {
      if (g) html += `<div class="nav-group">${g}</div>`;
      lastGroup = g;
    }
    html += `<a href="#${route}" data-route="${route}" class="${route === current ? 'active' : ''}">
      ${icon(def.icon)}<span>${def.label}</span></a>`;
  }
  return html;
}

// Onglets horizontaux (défilables)
function tabLinksHTML() {
  return Object.entries(ROUTES).map(([route, def]) =>
    `<a href="#${route}" data-route="${route}" class="tab ${route === current ? 'active' : ''}">
      ${icon(def.icon)}<span>${def.label}</span></a>`).join('');
}

function bottomNavHTML() {
  return BOTTOM.map(r => `<a href="#${r}" data-route="${r}" class="${r === current ? 'active' : ''}">
    ${icon(ROUTES[r].icon)}<span>${ROUTES[r].label.split(' ')[0]}</span></a>`).join('');
}

// Sélecteur de voyage global (en-tête) — change le contexte actif partout
function tripSelectorHTML() {
  const active = store.activeTrip();
  const trips = store.list('trips');
  const name = active ? active.title : 'Aucun voyage';
  return `<div class="trip-select">
    <button class="trip-select-btn" id="tripBtn" aria-haspopup="true">
      ${icon('suitcase')}<span class="tname">${esc(name)}</span><span class="caret">▾</span>
    </button>
    <div class="trip-menu" id="tripMenu" hidden>
      <div class="trip-menu-head">Voyage actif</div>
      ${trips.length ? trips.map(t => `<button class="trip-opt ${active && t.id === active.id ? 'on' : ''}" data-trip="${t.id}">
        <span class="to-cover">${esc(t.cover || '🧭')}</span>
        <span class="to-name">${esc(t.title)}<small>${esc(t.destination || '')}</small></span>
        ${active && t.id === active.id ? icon('check') : ''}</button>`).join('')
        : '<div class="trip-empty">Aucun voyage pour l\'instant</div>'}
      <button class="trip-opt new" id="tripNew">${icon('plus')} Nouveau voyage</button>
    </div>
  </div>`;
}

function renderShell() {
  const def = ROUTES[current];
  const me = store.setting('me') || 'Profil';
  const family = store.setting('family') || 'Ma famille';
  const theme = store.setting('theme') || 'light';
  const initials = me.slice(0, 1).toUpperCase();

  root.innerHTML = `
    <div class="app">
      <aside class="sidebar">
        <div class="brand">
          <span class="leaf">&amp;</span>
          <div><b>Carnet de voyage</b><span>${family}</span></div>
        </div>
        <nav class="nav">${navLinksHTML()}</nav>
        <a href="#" class="nav-foot" id="signout" style="margin-top:8px">${icon('logout')}<span>Changer de profil</span></a>
      </aside>

      <div class="main">
        <header class="topbar">
          <button class="btn ghost burger" id="burger" aria-label="Menu">${icon('menu')}</button>
          <h1>${def.label}</h1>
          ${tripSelectorHTML()}
          <div class="spacer"></div>
          <button class="icon-btn" id="themeBtn" aria-label="Thème">${icon(theme === 'dark' ? 'sun' : 'moon')}</button>
          <div class="avatar" id="who" title="${me}">${initials}</div>
        </header>
        <main class="content" id="content"></main>
      </div>

      <button class="fab" id="fab" aria-label="Aller au tableau de bord">${icon('home')}</button>
      <nav class="bottomnav">${bottomNavHTML()}</nav>
    </div>`;

  document.getElementById('content').appendChild(viewFor(current));

  root.querySelectorAll('[data-route]').forEach(a => {
    a.onclick = (e) => { e.preventDefault(); nav(a.dataset.route); };
  });
  document.getElementById('burger').onclick = () =>
    document.querySelector('.app').classList.toggle('nav-open');
  document.getElementById('fab').onclick = () => nav('dashboard');
  document.getElementById('themeBtn').onclick = () => {
    applyTheme((store.setting('theme') === 'dark') ? 'light' : 'dark');
    renderShell();
  };
  document.getElementById('who').onclick = async () => {
    store.setting('me', '');
    if (store.mode === 'firebase') { await store.signOutFb(); } else boot();
  };
  document.getElementById('signout').onclick = async (e) => {
    e.preventDefault();
    store.setting('me', '');
    if (store.mode === 'firebase') { await store.signOutFb(); } else boot();
  };

  // --- Sélecteur de voyage global ---
  if (_tripDocClose) document.removeEventListener('click', _tripDocClose);
  _tripDocClose = () => { const m = document.getElementById('tripMenu'); if (m) m.hidden = true; };
  document.addEventListener('click', _tripDocClose);
  const tripBtn = document.getElementById('tripBtn');
  if (tripBtn) {
    tripBtn.onclick = (e) => { e.stopPropagation(); const m = document.getElementById('tripMenu'); m.hidden = !m.hidden; };
    document.getElementById('tripMenu').onclick = (e) => e.stopPropagation();
    root.querySelectorAll('[data-trip]').forEach(b => b.onclick = () => {
      store.setting('activeTripId', b.dataset.trip);
      renderShell();
    });
    document.getElementById('tripNew').onclick = () => nav('trips');
  }
}

// ---------------------------------------------------------------------
//  Écran de sélection de profil (mode local : pas de mot de passe)
// ---------------------------------------------------------------------
let pickerUnsub = null;
function renderAuth() {
  if (pickerUnsub) { pickerUnsub(); pickerUnsub = null; }
  const family = store.setting('family') || 'Ma famille';
  const members = store.list('members');
  const footNote = store.mode === 'firebase'
    ? 'Compte familial partagé — synchronisation en temps réel activée.'
    : 'Mode local actif — données stockées sur cet appareil.';
  root.innerHTML = `
    <div class="auth-screen">
      <div class="auth-card">
        <div class="leaf">&amp;</div>
        <h2>Carnet de voyage &amp; souvenirs</h2>
        <p class="sub">${family} — choisissez votre profil</p>
        <div class="who-list">
          ${members.map(m => `
            <button data-id="${m.id}">
              <span class="avatar" style="background:${m.color}">${m.name.slice(0,1)}</span>
              <span>${m.name}<br><small style="color:var(--ink-faint);font-weight:500">${m.role}</small></span>
            </button>`).join('')}
        </div>
        ${store.mode === 'firebase' ? '<button class="btn ghost block" id="fb-signout" style="margin-top:14px">Se déconnecter</button>' : ''}
        <p class="sub" style="margin:18px 0 0;font-size:.75rem">${footNote}</p>
      </div>
    </div>`;
  root.querySelectorAll('[data-id]').forEach(b => {
    b.onclick = () => {
      const m = store.doc('members', b.dataset.id);
      store.setting('me', m.name);
      store.setting('myRole', m.role);
      nav('dashboard');
    };
  });
  const so = document.getElementById('fb-signout');
  if (so) so.onclick = async () => { await store.signOutFb(); };
  // en mode Firebase, la liste des profils peut arriver après coup : on rafraîchit
  if (store.mode === 'firebase') {
    pickerUnsub = store.subscribe(() => {
      if (!store.setting('me') && document.querySelector('.who-list')) {
        const cur = root.querySelector('.who-list').children.length;
        if (cur !== store.list('members').length) renderAuth();
      }
    });
  }
}

// ---------------------------------------------------------------------
//  Écran de connexion (mode Firebase : compte familial partagé)
// ---------------------------------------------------------------------
function renderLogin(errMsg) {
  root.innerHTML = `
    <div class="auth-screen">
      <div class="auth-card">
        <div class="leaf">&amp;</div>
        <h2>Carnet de voyage &amp; souvenirs</h2>
        <p class="sub">Connexion au compte familial</p>
        <div class="field"><label>Adresse e-mail</label><input id="fb-email" type="email" autocomplete="username" placeholder="famille@exemple.fr"></div>
        <div class="field"><label>Mot de passe</label><input id="fb-pwd" type="password" autocomplete="current-password" placeholder="••••••••"></div>
        ${errMsg ? `<p class="sub" style="color:var(--danger);margin:0 0 12px">${errMsg}</p>` : ''}
        <button class="btn primary block" id="fb-login">Se connecter</button>
        <button class="btn ghost block" id="fb-create" style="margin-top:8px">Créer le compte familial</button>
        <p class="sub" style="margin:16px 0 0;font-size:.72rem">Le même e-mail et mot de passe sont utilisés par toute la famille. Créez le compte une seule fois, puis partagez ces identifiants à vos proches.</p>
      </div>
    </div>`;
  const email = () => document.getElementById('fb-email').value.trim();
  const pwd = () => document.getElementById('fb-pwd').value;
  const friendly = (e) => {
    const c = (e && e.code) || '';
    if (c.includes('invalid-credential') || c.includes('wrong-password') || c.includes('user-not-found')) return 'E-mail ou mot de passe incorrect.';
    if (c.includes('email-already-in-use')) return 'Ce compte existe déjà — utilisez « Se connecter ».';
    if (c.includes('weak-password')) return 'Mot de passe trop court (6 caractères minimum).';
    if (c.includes('invalid-email')) return 'Adresse e-mail invalide.';
    if (c.includes('network')) return 'Problème de connexion internet.';
    return 'Une erreur est survenue. Réessayez.';
  };
  document.getElementById('fb-login').onclick = async () => {
    try { await store.signIn(email(), pwd()); } catch (e) { renderLogin(friendly(e)); }
  };
  document.getElementById('fb-create').onclick = async () => {
    try { await store.signUp(email(), pwd()); } catch (e) { renderLogin(friendly(e)); }
  };
}

// ---------------------------------------------------------------------
//  Démarrage
// ---------------------------------------------------------------------
function afterAuthReady() {
  if (store.setting('me')) nav(location.hash?.slice(1) || 'dashboard');
  else renderAuth();
}

let syncStarted = false;
async function boot() {
  applyTheme();

  // Mode Firebase : on initialise puis on suit l'état de connexion
  if (store.isFirebaseConfigured()) {
    root.innerHTML = '<div class="auth-screen"><div class="auth-card"><div class="leaf">&amp;</div><h2>Carnet de voyage &amp; souvenirs</h2><p class="sub">Connexion…</p></div></div>';
    try {
      await store.initFirebase();
      store.onAuth(async (user) => {
        if (!user) { syncStarted = false; renderLogin(); return; }
        if (!syncStarted) { syncStarted = true; await store.startSync(); media.syncLocalToCloud(); }
        afterAuthReady();
      });
      return;
    } catch (e) {
      // si Firebase échoue (clés/réseau), on retombe proprement en local
      console.warn('Firebase indisponible, mode local', e);
    }
  }

  // Mode local
  afterAuthReady();
}

// Navigation au clavier / via le hash
window.addEventListener('hashchange', () => {
  const r = location.hash.slice(1);
  if (store.setting('me') && r && ROUTES[r] && r !== current) nav(r);
});

boot();

// ---------------------------------------------------------------------
//  Service worker (hors-ligne / installation)
// ---------------------------------------------------------------------
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js').catch(() => {});
  });
}
