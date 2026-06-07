// js/views/discover.js — Module Découverte v2
// ─────────────────────────────────────────────────────────────────────────
// FONCTIONS MÉTIER CONSERVÉES (comportement identique à v1) :
//   • photoUploader()   — uploader de photos réutilisable
//   • chipList()        — éditeur de liste de chips (activités, campings)
//   • ideaForm()        — formulaire ajout / édition d'une idée
//   • ideaDetail()      — fiche détail (sheet) — remplacée par vue inline v2
//   • planIdea()        — conversion idée → voyage + expenses + activities
//   • renderCamps()     — onglet "Campings favoris" (inchangé)
//   • campForm()        — formulaire camping (inchangé)
//
// NOUVEAUTÉS v2 :
//   • Vue liste : galerie de cartes visuelles (.idea-card) avec filtres
//   • Vue détail : fiche pleine page avec hero, highlights, timeline,
//     budget détaillé (si renseigné), accordéons, bannière Transformer
//   • planIdea() enrichie :
//       – crée expenses si idea.budgetDetail est renseigné
//       – crée activities depuis idea.programme ou idea.activities[]
//       – pose idea.linkedTripId pour prévenir les doublons
//       – détecte un voyage déjà créé et propose Ouvrir ou Recréer
//   • Champs optionnels nouveaux sur 'ideas' (rétrocompatibles) :
//       emoji, distance, season, dogPolicy, tags[], highlights[],
//       programme[], budgetDetail{eco,mid,conf}, practical{}, favorite,
//       linkedTripId
//
// COLLECTIONS TOUCHÉES : 'ideas', 'campingsFav', 'trips', 'expenses',
//                         'activities' (création seulement dans planIdea)
// COLLECTIONS NON TOUCHÉES : itineraries (getIt() crée à la demande),
//                             réservations, budget global, carte, etc.
//
// COMPATIBILITÉ :
//   • Export 'Discover(nav)' → HTMLElement conservé
//   • Données seed id1/id2 (sans nouveaux champs) affichées normalement
//   • .disc-card / .cover non utilisées ici → Activities non affectée
// ─────────────────────────────────────────────────────────────────────────

import { store }  from '../store.js';
import { icon, toast, fmtMoney, esc, sheet, confirmDialog, empty } from '../lib/ui.js';
import { media }  from '../lib/media.js';

// ── Constantes métier (inchangées depuis v1) ──────────────────────────────
const DUR      = ['Week-end', 'Court séjour (3-5 j)', '1 semaine', '2 semaines et +'];
const BUD      = ['Petit budget', 'Budget moyen', 'Budget élevé'];
const INTEREST = ['Favori', 'À tester', 'Visité'];
const mapsDir  = (addr) => `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addr || '')}`;

// Mapping durCat → nombre de jours (pour les dates placeholder dans planIdea)
const DUR_DAYS = {
  'Week-end':             3,
  'Court séjour (3-5 j)': 5,
  '1 semaine':            7,
  '2 semaines et +':      14,
};

// Politique animaux : label affiché + classe CSS
const DOG_LABEL = { ok: '🐕 Accepté', partial: '🐕 Partiel', no: '🐕 Non' };
const DOG_CLASS = { ok: 'idea-dog-ok', partial: 'idea-dog-partial', no: 'idea-dog-no' };

// ── Helpers partagés ──────────────────────────────────────────────────────

// Calcule la date ISO J+n à partir d'aujourd'hui
function isoPlus(days) {
  return new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
}

// Retourne le label de durée court pour la carte ("3j", "1 sem"…)
function durShort(durCat) {
  if (!durCat) return null;
  const d = DUR_DAYS[durCat];
  if (!d) return null;
  if (d <= 3) return `${d} j`;
  if (d <= 5) return `${d} j`;
  if (d === 7) return '1 sem';
  return '2 sem+';
}

// ── Briques de formulaire réutilisables (CONSERVÉES depuis v1) ────────────

function photoUploader(container, photos) {
  const draw = () => {
    container.innerHTML = `
      <div class="thumbs">
        ${photos.map((p, i) => `
          <div class="thumb"><img data-media="${p.id}" alt="">
            <button type="button" class="thumb-x" data-i="${i}">${icon('x')}</button></div>`).join('')}
        <button type="button" class="thumb add">${icon('camera')}<span>Ajouter</span></button>
      </div>
      <input type="file" accept="image/*" multiple hidden>`;
    const file = container.querySelector('input[type=file]');
    container.querySelector('.add').onclick = () => file.click();
    file.onchange = async () => {
      for (const f of file.files) { try { photos.push(await media.save(f)); } catch (e) {} }
      draw();
    };
    container.querySelectorAll('.thumb-x').forEach(b => b.onclick = async () => {
      const i = +b.dataset.i; const [rm] = photos.splice(i, 1);
      if (rm) media.remove(rm.id); draw();
    });
    media.hydrate(container);
  };
  draw();
}

function chipList(container, arr, placeholder) {
  const draw = () => {
    container.innerHTML = `
      <div class="chips-edit">
        ${arr.map((t, i) => `<span class="tag">${esc(t)}<button type="button" data-i="${i}">${icon('x')}</button></span>`).join('')}
      </div>
      <div class="row" style="gap:8px;margin-top:8px">
        <input class="ci" placeholder="${esc(placeholder)}">
        <button type="button" class="btn sm add" style="flex:0 0 auto">${icon('plus')} Ajouter</button>
      </div>`;
    const inp = container.querySelector('.ci');
    const add = () => { const v = inp.value.trim(); if (v) { arr.push(v); draw(); container.querySelector('.ci').focus(); } };
    container.querySelector('.add').onclick = add;
    inp.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } };
    container.querySelectorAll('[data-i]').forEach(b => b.onclick = () => { arr.splice(+b.dataset.i, 1); draw(); });
  };
  draw();
}

// ═══════════════════════════════════════════════════════════════════════════
//  VUE PRINCIPALE
// ═══════════════════════════════════════════════════════════════════════════
export function Discover(nav) {
  const el = document.createElement('div');
  // État de navigation local : null = liste, string = id de la fiche ouverte
  let detailId    = null;
  let activeFilter = 'all';
  let activeBudgetTab = 'mid'; // onglet budget actif dans le détail

  // ── Rendu racine ─────────────────────────────────────────────────────────
  function render() {
    el.innerHTML = `
      <div class="idea-root">
        <div id="idea-panel-list"  class="idea-panel idea-panel--active"></div>
        <div id="idea-panel-detail" class="idea-panel"></div>
      </div>`;
    paintList();
  }

  // ── Utilitaires de navigation entre panneaux ──────────────────────────
  function showDetail(id) {
    detailId = id;
    el.querySelector('#idea-panel-list').classList.remove('idea-panel--active');
    el.querySelector('#idea-panel-detail').classList.add('idea-panel--active');
    paintDetail(id);
    el.querySelector('#idea-panel-detail').scrollTop = 0;
  }

  function showList() {
    detailId = null;
    el.querySelector('#idea-panel-detail').classList.remove('idea-panel--active');
    el.querySelector('#idea-panel-list').classList.add('idea-panel--active');
    paintList();
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  VUE 1 — LISTE (galerie + onglet Campings)
  // ═══════════════════════════════════════════════════════════════════════

  // Onglet actif : 'ideas' ou 'camps'
  let tab = 'ideas';

  function paintList() {
    const panel = el.querySelector('#idea-panel-list');
    if (!panel) return;
    panel.innerHTML = `
      <div class="hero">
        <div class="kicker">Inspiration</div>
        <h2>Découverte</h2>
        <p>Notez vos envies de voyage et vos campings préférés pour préparer sereinement vos prochaines aventures.</p>
      </div>
      <div class="seg" style="max-width:420px">
        <button class="${tab === 'ideas' ? 'on' : ''}" data-t="ideas">Idées de voyage</button>
        <button class="${tab === 'camps' ? 'on' : ''}" data-t="camps">Campings favoris</button>
      </div>
      <div id="disc-tab-body"></div>`;
    panel.querySelectorAll('.seg button').forEach(b => b.onclick = () => { tab = b.dataset.t; paintList(); });
    if (tab === 'ideas') paintIdeas(panel.querySelector('#disc-tab-body'));
    else                 renderCamps(panel.querySelector('#disc-tab-body'));
  }

  // ── Vue galerie des idées ────────────────────────────────────────────
  function paintIdeas(host) {
    const all   = store.list('ideas');
    const items = filterIdeas(all);

    host.innerHTML = `
      <div class="idea-list-header">
        <div>
          <div class="idea-list-title">Inspirations</div>
          <div class="idea-list-sub">${all.length} idée${all.length > 1 ? 's' : ''} de séjour</div>
        </div>
        <button class="btn primary" id="idea-new">${icon('plus')} Nouvelle idée</button>
      </div>

      <div class="idea-filter-bar" id="idea-filters">
        ${renderFilterChips()}
      </div>

      <div class="idea-grid" id="idea-grid">
        ${items.length
          ? items.map(ideaCardHTML).join('')
          : `<div class="idea-empty">
               <span class="big">🗺️</span>
               <p>Aucune idée pour ce filtre.</p>
               <button class="btn sm ghost" id="idea-reset-filter">Voir toutes</button>
             </div>`}
      </div>`;

    host.querySelector('#idea-new').onclick = () => ideaForm();

    host.querySelector('#idea-filters').addEventListener('click', e => {
      const chip = e.target.closest('[data-filter]');
      if (!chip) return;
      activeFilter = chip.dataset.filter;
      paintIdeas(host);
    });

    host.querySelector('#idea-grid').addEventListener('click', e => {
      // Clic sur le bouton favori
      const favBtn = e.target.closest('[data-fav]');
      if (favBtn) { toggleFavorite(favBtn.dataset.fav); return; }
      // Clic sur le bouton Planifier
      const planBtn = e.target.closest('[data-plan]');
      if (planBtn) { planIdea(planBtn.dataset.plan); return; }
      // Clic sur la carte → détail
      const card = e.target.closest('[data-id]');
      if (card) showDetail(card.dataset.id);
    });

    const resetBtn = host.querySelector('#idea-reset-filter');
    if (resetBtn) resetBtn.onclick = () => { activeFilter = 'all'; paintIdeas(host); };

    media.hydrate(host);
  }

  // Filtre les idées selon activeFilter
  function filterIdeas(items) {
    switch (activeFilter) {
      case 'weekend':  return items.filter(i => i.durCat === 'Week-end');
      case 'long':     return items.filter(i => ['1 semaine','2 semaines et +'].includes(i.durCat));
      case 'dog':      return items.filter(i => ['ok','partial'].includes(i.dogPolicy));
      case 'favorite': return items.filter(i => i.favorite);
      case 'planned':  return items.filter(i => !!i.linkedTripId && !!store.doc('trips', i.linkedTripId));
      default:         return items;
    }
  }

  function renderFilterChips() {
    const chips = [
      { k: 'all',      label: 'Toutes' },
      { k: 'weekend',  label: 'Week-end' },
      { k: 'long',     label: 'Long séjour' },
      { k: 'dog',      label: '🐕 Chien OK' },
      { k: 'favorite', label: '♥ Favoris' },
      { k: 'planned',  label: '✓ Planifiées' },
    ];
    return chips.map(c =>
      `<button class="idea-chip${activeFilter === c.k ? ' idea-chip--on' : ''}"
               data-filter="${c.k}">${c.label}</button>`
    ).join('');
  }

  // Template HTML d'une carte idée
  function ideaCardHTML(i) {
    const isPlanned = !!i.linkedTripId && !!store.doc('trips', i.linkedTripId);
    const hasDog    = i.dogPolicy && i.dogPolicy !== 'no';
    const ds        = durShort(i.durCat);
    const coverAttr = i.photos && i.photos[0] ? `data-media="${i.photos[0].id}"` : '';

    return `
      <article class="idea-card" data-id="${i.id}" role="button" tabindex="0"
               aria-label="Ouvrir ${esc(i.title)}">
        <div class="idea-card-cover" ${coverAttr}>
          ${!(i.photos && i.photos[0]) ? `<span class="idea-card-emoji">${esc(i.emoji || "🗺️")}</span>` : ""}
          ${i.season ? `<span class="idea-card-season">${esc(i.season)}</span>` : ''}
          ${hasDog ? `<span class="idea-card-dog ${DOG_CLASS[i.dogPolicy] || ''}">${DOG_LABEL[i.dogPolicy] || ''}</span>` : ''}
          <button class="idea-card-fav${i.favorite ? ' idea-card-fav--on' : ''}"
                  data-fav="${i.id}" aria-label="Favori">
            ${icon(i.favorite ? 'heart-filled' : 'heart')}
          </button>
          ${isPlanned ? `<div class="idea-card-planned">✓ Déjà planifié</div>` : ''}
        </div>
        <div class="idea-card-body">
          <div class="idea-card-title">${esc(i.title)}</div>
          <div class="idea-card-sub">${esc(i.destination || '')}</div>
          <div class="idea-card-stats">
            ${i.distance  ? `<span class="idea-stat">${icon('route')} ${esc(i.distance)}</span>` : ''}
            ${i.budget    ? `<span class="idea-stat">${icon('euro')} ${fmtMoney(i.budget)}</span>` : ''}
            ${ds          ? `<span class="idea-stat">${icon('clock')} ${ds}</span>` : ''}
          </div>
          <div class="idea-card-tags">
            ${i.durCat  ? `<span class="idea-tag">${esc(i.durCat)}</span>` : ''}
            ${(i.tags || []).slice(0, 2).map(t => `<span class="idea-tag">${esc(t)}</span>`).join('')}
          </div>
        </div>
      </article>`;
  }

  // Bascule le favori d'une idée
  function toggleFavorite(id) {
    const i = store.doc('ideas', id); if (!i) return;
    store.update('ideas', id, { favorite: !i.favorite });
    toast(i.favorite ? 'Retiré des favoris' : '♥ Ajouté aux favoris');
    // Rafraîchir la vue courante sans navigation
    if (detailId === id) paintDetail(id);
    else                 paintIdeas(el.querySelector('#disc-tab-body'));
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  VUE 2 — DÉTAIL D'UNE IDÉE
  // ═══════════════════════════════════════════════════════════════════════

  function paintDetail(id) {
    const i     = store.doc('ideas', id);
    const panel = el.querySelector('#idea-panel-detail');
    if (!i || !panel) return;

    const isPlanned  = !!i.linkedTripId && !!store.doc('trips', i.linkedTripId);
    const budDetail  = i.budgetDetail;                    // peut être absent
    const bud        = budDetail ? budDetail[activeBudgetTab] || budDetail.mid : null;
    const hasDog     = i.dogPolicy && i.dogPolicy !== 'no';
    const coverAttr  = i.photos && i.photos[0] ? `data-media="${i.photos[0].id}"` : '';

    panel.innerHTML = `
      <!-- ── Barre de navigation sticky ── -->
      <div class="idea-detail-nav">
        <button class="idea-back" id="idea-back-btn">
          ${icon('arrow-left')} Retour
        </button>
        <span class="idea-detail-crumb">Découverte · ${esc(i.title)}</span>
        <div class="idea-detail-acts">
          <button class="btn sm ghost" id="idea-edit-btn" title="Modifier">${icon('pencil')} Modifier</button>
          <button class="btn sm ghost danger" id="idea-del-btn" title="Supprimer">${icon('trash')}</button>
        </div>
      </div>

      <!-- ── Hero ── -->
      <div class="idea-hero">
        <div class="idea-hero-emoji-bg" ${coverAttr}>${!(i.photos && i.photos[0]) ? esc(i.emoji || '🗺️') : ''}</div>
        <div class="idea-hero-overlay"></div>
        <div class="idea-hero-content">
          <h1 class="idea-hero-title">
            ${i.durCat === 'Week-end' ? 'Week-end' : 'Séjour'} ${esc(i.title)}
          </h1>
          <p class="idea-hero-sub">${icon('map-pin')} ${esc(i.destination || '')}</p>
          <div class="idea-hero-badges">
            ${i.distance  ? `<span class="idea-hero-badge">${icon('route')} ${esc(i.distance)}</span>` : ''}
            ${i.budget    ? `<span class="idea-hero-badge">${icon('euro')} ${fmtMoney(i.budget)}</span>` : ''}
            ${i.season    ? `<span class="idea-hero-badge">${icon('sun')} ${esc(i.season)}</span>` : ''}
            ${i.durCat    ? `<span class="idea-hero-badge">${icon('clock')} ${esc(i.durCat)}</span>` : ''}
            ${hasDog ? `<span class="idea-hero-badge idea-hero-badge--dog">${DOG_LABEL[i.dogPolicy]}</span>` : ''}
          </div>
        </div>
      </div>

      <!-- ── Corps ── -->
      <div class="idea-detail-body">

        <!-- CTA principaux -->
        <div class="idea-cta-row">
          <button class="idea-btn-plan" id="idea-plan-btn">
            ${icon('wand')} ${isPlanned ? 'Rouvrir le voyage' : 'Planifier ce voyage'}
          </button>
          <button class="idea-btn-fav${i.favorite ? ' idea-btn-fav--on' : ''}" id="idea-fav-btn">
            ${icon(i.favorite ? 'heart-filled' : 'heart')}
            ${i.favorite ? 'Favori' : 'Ajouter aux favoris'}
          </button>
        </div>

        <!-- Quick tags -->
        <div class="idea-quick-tags">
          ${i.durCat    ? `<span class="idea-qtag">📅 ${esc(i.durCat)}</span>` : ''}
          ${i.budgetCat ? `<span class="idea-qtag">💰 ${esc(i.budgetCat)}</span>` : ''}
          ${(i.tags || []).map(t => `<span class="idea-qtag">${esc(t)}</span>`).join('')}
          ${isPlanned   ? `<span class="idea-qtag" style="color:var(--sage-deep)">✓ Voyage créé</span>` : ''}
        </div>

        <!-- Description (champ existant v1) -->
        ${i.description ? `
        <div class="idea-section">
          <p style="color:var(--ink-soft);line-height:1.7">${esc(i.description)}</p>
        </div>` : ''}

        <!-- Points forts / Pourquoi ce séjour (nouveau champ optionnel) -->
        ${i.highlights && i.highlights.length ? `
        <div class="idea-section">
          <div class="idea-section-head">${icon('sparkles')} Pourquoi ce séjour ?</div>
          <div class="idea-why-grid">
            ${i.highlights.map(h => `
              <div class="idea-why-card">
                <span class="idea-why-icon">${icon(h.icon || 'star')}</span>
                <span class="idea-why-name">${esc(h.name)}</span>
                <span class="idea-why-desc">${esc(h.desc || '')}</span>
              </div>`).join('')}
          </div>
        </div>` : ''}

        <!-- Activités (champ existant v1 — liste de strings) -->
        ${i.activities && i.activities.length && !(i.programme && i.programme.length) ? `
        <div class="idea-section">
          <div class="idea-section-head">${icon('star')} Activités à faire</div>
          <ul class="mini">
            ${i.activities.map(a => `<li>${esc(a)}</li>`).join('')}
          </ul>
        </div>` : ''}

        <!-- Programme / timeline (nouveau champ optionnel) -->
        ${i.programme && i.programme.length ? `
        <div class="idea-section">
          <div class="idea-section-head">${icon('calendar')} Programme</div>
          <div class="timeline">
            ${i.programme.map(p => `
              <div class="tl-item future">
                <div class="idea-tl-day-label">${esc(p.day)}</div>
                ${(p.items || []).map(it => `
                  <div class="idea-tl-item-row">
                    ${icon(it.icon || 'star')} ${esc(it.label)}
                  </div>`).join('')}
              </div>`).join('')}
          </div>
        </div>` : ''}

        <!-- Budget détaillé (nouveau champ optionnel) -->
        ${budDetail ? `
        <div class="idea-section">
          <div class="idea-section-head">${icon('wallet')} Budget prévisionnel</div>
          <div class="idea-budget-card">
            <div class="idea-budget-tabs" id="idea-btabs">
              <button class="idea-btab${activeBudgetTab==='eco' ?' idea-btab--on':''}" data-btab="eco">Économique</button>
              <button class="idea-btab${activeBudgetTab==='mid' ?' idea-btab--on':''}" data-btab="mid">Moyen</button>
              <button class="idea-btab${activeBudgetTab==='conf'?' idea-btab--on':''}" data-btab="conf">Confortable</button>
            </div>
            <div class="idea-budget-grid" id="idea-bud-grid">
              ${renderBudgetGrid(bud)}
            </div>
            <div class="idea-budget-total">
              <span>Total estimé · 2 pers.</span>
              <strong id="idea-bud-total">${fmtMoney(bud ? bud.total : 0)}</strong>
            </div>
          </div>
        </div>` : ''}

        <!-- Notes (champ existant v1) -->
        ${i.notes ? `
        <div class="idea-section">
          <div class="idea-section-head">${icon('edit')} Notes & conseils</div>
          <p style="color:var(--ink-soft);line-height:1.7;background:var(--surface-2);
                    border:1px solid var(--border);border-radius:var(--r);padding:14px 16px">
            ${esc(i.notes)}
          </p>
        </div>` : ''}

        <!-- Campings à proximité (champ existant v1) -->
        ${i.campings && i.campings.length ? `
        <div class="idea-section">
          <div class="idea-section-head">${icon('tent')} Campings à proximité</div>
          <ul class="mini">
            ${i.campings.map(c => `<li>${esc(c)}</li>`).join('')}
          </ul>
        </div>` : ''}

        <!-- Infos pratiques (nouveau champ optionnel) -->
        ${i.practical && Object.values(i.practical).some(Boolean) ? `
        <div class="idea-section">
          <div class="idea-section-head">${icon('bulb')} Informations pratiques</div>
          <div class="idea-accordion" id="idea-acc">
            ${renderAccordion('dog',    'dog',    'Animaux',           i.practical.dog)}
            ${renderAccordion('period', 'sun',    'Meilleure période', i.practical.period)}
            ${renderAccordion('access', 'road',   'Accès',             i.practical.access)}
            ${renderAccordion('tips',   'bulb',   'Conseils',          i.practical.tips)}
          </div>
        </div>` : ''}

        <!-- Bannière Transformer en voyage -->
        <div class="idea-transform-banner">
          <div>
            <div class="idea-transform-title">
              ${isPlanned ? 'Ce séjour a déjà été transformé en voyage' : 'Transformer en voyage réel'}
            </div>
            <div class="idea-transform-sub">
              ${isPlanned
                ? 'Rouvrez-le ou créez un second voyage.'
                : 'Crée automatiquement le voyage, le budget et les activités.'}
            </div>
            <div class="idea-transform-pills">
              <span class="idea-transform-pill">${icon('suitcase')} Voyage</span>
              <span class="idea-transform-pill">${icon('wallet')} Budget</span>
              <span class="idea-transform-pill">${icon('star')} Activités</span>
            </div>
          </div>
          <button class="idea-btn-transform${isPlanned ? ' idea-btn-transform--planned' : ''}"
                  id="idea-transform-btn">
            ${icon('wand')} ${isPlanned ? 'Gérer le voyage' : 'Transformer en voyage'}
          </button>
        </div>

      </div><!-- /idea-detail-body -->
    `;

    // Hydrate les photos du hero si présentes
    media.hydrate(panel);

    // ── Événements détail ──────────────────────────────────────────────
    panel.querySelector('#idea-back-btn').onclick   = () => showList();
    panel.querySelector('#idea-fav-btn').onclick    = () => toggleFavorite(id);
    panel.querySelector('#idea-edit-btn').onclick   = () => { ideaForm(id); };
    panel.querySelector('#idea-plan-btn').onclick   = () => planIdea(id);
    panel.querySelector('#idea-transform-btn').onclick = () => planIdea(id);

    panel.querySelector('#idea-del-btn').onclick = async () => {
      const ok = await confirmDialog('Supprimer', `Supprimer la fiche « ${i.title} » ?`);
      if (ok) {
        (i.photos || []).forEach(p => media.remove(p.id));
        store.remove('ideas', id);
        toast('Fiche supprimée');
        showList();
      }
    };

    // Onglets budget
    const btabs = panel.querySelector('#idea-btabs');
    if (btabs) btabs.addEventListener('click', e => {
      const btn = e.target.closest('[data-btab]'); if (!btn) return;
      activeBudgetTab = btn.dataset.btab;
      panel.querySelectorAll('.idea-btab').forEach(b => b.classList.toggle('idea-btab--on', b.dataset.btab === activeBudgetTab));
      const nb = i.budgetDetail?.[activeBudgetTab];
      if (nb) {
        panel.querySelector('#idea-bud-grid').innerHTML = renderBudgetGrid(nb);
        panel.querySelector('#idea-bud-total').textContent = fmtMoney(nb.total || 0);
      }
    });

    // Accordéons
    const acc = panel.querySelector('#idea-acc');
    if (acc) acc.addEventListener('click', e => {
      const hdr = e.target.closest('.idea-acc-header'); if (!hdr) return;
      hdr.closest('.idea-acc-item').classList.toggle('idea-acc-item--open');
    });
  }

  // Rendu HTML des lignes de budget
  function renderBudgetGrid(b) {
    if (!b) return '';
    const rows = [
      { ico: 'home',    label: 'Hébergement', key: 'heb' },
      { ico: 'ticket',  label: 'Entrées',      key: 'ent' },
      { ico: 'fuel',    label: 'Carburant',    key: 'car' },
      { ico: 'star',    label: 'Repas',        key: 'rep' },
    ];
    return rows.filter(r => b[r.key] != null).map(r => `
      <div class="idea-bitem">
        <span class="idea-bitem-icon">${icon(r.ico)}</span>
        <span class="idea-bitem-label">${r.label}</span>
        <span class="idea-bitem-val">${fmtMoney(b[r.key])}</span>
      </div>`).join('');
  }

  // Rendu HTML d'un accordéon
  function renderAccordion(key, ico, label, text) {
    if (!text) return '';
    return `
      <div class="idea-acc-item" data-key="${key}">
        <div class="idea-acc-header">
          <span class="idea-acc-left">${icon(ico)} ${label}</span>
          <span class="idea-acc-chevron">${icon('chevron-down')}</span>
        </div>
        <div class="idea-acc-body">${esc(text)}</div>
      </div>`;
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  FORMULAIRE IDÉE (CONSERVÉ depuis v1, champs nouveaux ajoutés)
  // ═══════════════════════════════════════════════════════════════════════

  function ideaForm(id) {
    const i = id ? store.doc('ideas', id) : null;
    // Copies mutables pour les briques réactives
    const photos     = i && i.photos     ? [...i.photos]     : [];
    const activities = i && i.activities ? [...i.activities] : [];
    const campings   = i && i.campings   ? [...i.campings]   : [];

    const s = sheet({
      title: id ? 'Modifier la fiche' : 'Nouvelle idée de voyage',
      bodyHTML: `
        <div class="field">
          <label>Titre du voyage</label>
          <input name="title" value="${esc(i?.title || '')}" placeholder="Ex : Visiter la Loire">
        </div>
        <div class="row">
          <div class="field">
            <label>Région / destination</label>
            <input name="destination" value="${esc(i?.destination || '')}" placeholder="Val de Loire, France">
          </div>
          <div class="field" style="flex:.35">
            <label>Emoji</label>
            <input name="emoji" value="${esc(i?.emoji || '🗺️')}" placeholder="🗺️">
          </div>
        </div>
        <div class="row">
          <div class="field">
            <label>Durée</label>
            <select name="durCat">
              <option value="">—</option>
              ${DUR.map(d => `<option ${i?.durCat === d ? 'selected' : ''}>${d}</option>`).join('')}
            </select>
          </div>
          <div class="field">
            <label>Catégorie de budget</label>
            <select name="budgetCat">
              <option value="">—</option>
              ${BUD.map(b => `<option ${i?.budgetCat === b ? 'selected' : ''}>${b}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="row">
          <div class="field">
            <label>Budget estimatif (€)</label>
            <input name="budget" type="number" value="${i?.budget || ''}" placeholder="1400">
          </div>
          <div class="field">
            <label>Distance depuis chez vous</label>
            <input name="distance" value="${esc(i?.distance || '')}" placeholder="1h36">
          </div>
        </div>
        <div class="row">
          <div class="field">
            <label>Meilleure saison</label>
            <input name="season" value="${esc(i?.season || '')}" placeholder="Septembre">
          </div>
          <div class="field">
            <label>Animaux</label>
            <select name="dogPolicy">
              <option value="">—</option>
              <option value="ok"      ${i?.dogPolicy === 'ok'      ? 'selected' : ''}>Accepté</option>
              <option value="partial" ${i?.dogPolicy === 'partial' ? 'selected' : ''}>Partiellement</option>
              <option value="no"      ${i?.dogPolicy === 'no'      ? 'selected' : ''}>Non accepté</option>
            </select>
          </div>
        </div>
        <div class="field">
          <label>Description</label>
          <textarea name="description" placeholder="Ce qui donne envie…">${esc(i?.description || '')}</textarea>
        </div>
        <div class="field"><label>Photos du lieu</label><div id="ph"></div></div>
        <div class="field"><label>Activités à faire</label><div id="act"></div></div>
        <div class="field"><label>Campings à proximité</label><div id="camp"></div></div>
        <div class="field">
          <label>Conseils &amp; notes personnelles</label>
          <textarea name="notes" placeholder="Bonnes adresses, astuces…">${esc(i?.notes || '')}</textarea>
        </div>`
    });

    photoUploader(s.body.querySelector('#ph'), photos);
    chipList(s.body.querySelector('#act'), activities, 'Ex : Châteaux à vélo');
    chipList(s.body.querySelector('#camp'), campings, 'Nom d\'un camping');

    s.onOk(() => {
      const g   = (n) => s.body.querySelector(`[name="${n}"]`).value;
      const title = g('title').trim();
      if (!title) { toast('Indiquez un titre', 'warn'); return false; }

      // Champs v1 conservés + nouveaux champs optionnels
      const rec = {
        title,
        destination: g('destination'),
        emoji:       g('emoji') || '🗺️',
        budget:      +g('budget') || 0,
        durCat:      g('durCat'),
        budgetCat:   g('budgetCat'),
        distance:    g('distance'),
        season:      g('season'),
        dogPolicy:   g('dogPolicy') || '',
        description: g('description'),
        notes:       g('notes'),
        photos,
        activities,
        campings,
      };

      if (id) store.update('ideas', id, rec);
      else    store.add('ideas', rec);

      toast('Fiche enregistrée ✨');
      // Rafraîchir la vue courante
      if (detailId === id) paintDetail(id);
      else                 paintList();
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  PLANIFIER / TRANSFORMER EN VOYAGE (enrichi selon spécification)
  // ═══════════════════════════════════════════════════════════════════════

  function planIdea(id) {
    const i = store.doc('ideas', id); if (!i) return;

    // ── Détection d'un voyage déjà créé depuis cette idée ──────────────
    const existingTrip = i.linkedTripId ? store.doc('trips', i.linkedTripId) : null;
    if (existingTrip) {
      // Voyage existant non supprimé → proposer d'ouvrir ou de recréer
      const s = sheet({
        title: `${esc(i.title)} — déjà planifié`,
        wide: false,
        okText: 'Ouvrir le voyage',
        bodyHTML: `
          <p style="color:var(--ink-soft);margin-bottom:16px">
            Cette idée a déjà été transformée en voyage
            <strong>${esc(existingTrip.title)}</strong>.
          </p>
          <p style="color:var(--ink-soft)">
            Voulez-vous ouvrir ce voyage ou en créer un nouveau ?
          </p>
          <button class="btn block" id="recreate-btn" style="margin-top:14px">
            ${icon('plus')} Créer un nouveau voyage
          </button>`,
      });
      // Ouvrir le voyage existant
      s.onOk(() => {
        store.setting('activeTripId', existingTrip.id);
        s.close(null);
        nav('trips');
      });
      // Recréer depuis zéro
      s.body.querySelector('#recreate-btn').onclick = () => {
        s.close(null);
        openPlanSheet(i, id);
      };
      return;
    }

    // ── Premier clic : ouvrir la sheet de confirmation ──────────────────
    openPlanSheet(i, id);
  }

  // Sheet de confirmation + création effective
  function openPlanSheet(i, ideaId) {
    const defaultDays = DUR_DAYS[i.durCat] || 7;
    const s = sheet({
      title: `Planifier — ${esc(i.title)}`,
      okText: 'Créer le voyage',
      wide: false,
      bodyHTML: `
        <div class="field">
          <label>Titre du voyage</label>
          <input name="title" value="${esc(i.title)}">
        </div>
        <div class="field">
          <label>Budget prévisionnel (€)</label>
          <input name="budget" type="number" value="${i.budget || 0}">
        </div>
        <p style="color:var(--ink-soft);font-size:.85rem;margin-top:4px">
          Un voyage « futur » sera créé et défini comme actif.
          Les dates (J+45 → J+${45 + defaultDays}) sont provisoires —
          précisez-les dans l'onglet Voyages.
        </p>
        ${(i.activities && i.activities.length) || (i.programme && i.programme.length) ? `
        <p style="color:var(--ink-soft);font-size:.85rem;margin-top:8px">
          ${icon('star')} ${i.programme && i.programme.length
            ? i.programme.reduce((n, p) => n + (p.items || []).length, 0)
            : i.activities.length} activité(s) seront importées.
        </p>` : ''}
        ${i.budgetDetail ? `
        <p style="color:var(--ink-soft);font-size:.85rem;margin-top:4px">
          ${icon('wallet')} 4 postes budgétaires (estimation moyenne) seront créés.
        </p>` : ''}`
    });

    s.onOk(() => {
      const title  = s.body.querySelector('[name=title]').value.trim() || i.title;
      const budget = +s.body.querySelector('[name=budget]').value || 0;

      // 1. Créer le voyage
      const t = store.add('trips', {
        title,
        destination: i.destination || '',
        status:      'futur',
        cover:       i.emoji || '🧭',
        budget,
        notes:       i.description || '',
        start:       isoPlus(45),
        end:         isoPlus(45 + defaultDays),
        lat:         46.6,
        lng:         2.4,
        photos:      [],
      });

      // 2. Créer les expenses si budgetDetail est renseigné (niveau mid)
      if (i.budgetDetail) {
        const bud = i.budgetDetail.mid || {};
        const expDefs = [
          { key: 'heb', label: 'Hébergement estimé', cat: 'Hébergement' },
          { key: 'ent', label: 'Entrées estimées',    cat: 'Activités'   },
          { key: 'car', label: 'Carburant estimé',    cat: 'Carburant'   },
          { key: 'rep', label: 'Repas estimés',       cat: 'Restaurant'  },
        ];
        expDefs.forEach(def => {
          if (bud[def.key]) {
            store.add('expenses', {
              tripId: t.id,
              label:  def.label,
              cat:    def.cat,
              amount: bud[def.key],
              date:   isoPlus(45),
            });
          }
        });
      }

      // 3. Créer les activités
      // Priorité : idea.programme (nouveau) > idea.activities[] (existant v1)
      if (i.programme && i.programme.length) {
        i.programme.forEach(p => {
          (p.items || []).forEach(it => {
            store.add('activities', {
              tripId: t.id,
              title:  it.label,
              cat:    'Visite',
              status: 'envie',
              price:  0,
              pets:   false,
              note:   `Généré depuis l'idée · ${p.day}`,
              photos: [],
            });
          });
        });
      } else if (i.activities && i.activities.length) {
        i.activities.forEach(act => {
          store.add('activities', {
            tripId: t.id,
            title:  act,
            cat:    'Visite',
            status: 'envie',
            price:  0,
            pets:   false,
            note:   "Depuis la liste d'idées",
            photos: [],
          });
        });
      }

      // 4. Poser linkedTripId sur l'idée (prévention doublon)
      store.update('ideas', ideaId, { linkedTripId: t.id });

      // 5. Activer le voyage et naviguer vers Voyages
      store.setting('activeTripId', t.id);
      toast(`Voyage « ${title} » créé ✨`);
      nav('trips');
      // Note : l'itinéraire sera créé par getIt() dans Itinéraires
      // à la première visite du module — comportement standard conservé.
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  ONGLET CAMPINGS FAVORIS (CONSERVÉ à l'identique depuis v1)
  // ═══════════════════════════════════════════════════════════════════════

  function renderCamps(host) {
    let q = '', fInt = '';
    const paint = () => {
      const items = store.list('campingsFav').filter(c =>
        (!q || (c.name + ' ' + (c.address || '')).toLowerCase().includes(q.toLowerCase())) &&
        (!fInt || c.interest === fInt));
      host.innerHTML = `
        <div class="card" style="margin-bottom:18px">
          <div class="row">
            <div class="field" style="margin:0"><label>${icon('search')} Rechercher</label><input id="q" value="${esc(q)}" placeholder="nom, ville…"></div>
            <div class="field" style="margin:0"><label>${icon('heart')} Intérêt</label><select id="fi"><option value="">Tous</option>${INTEREST.map(x => `<option ${fInt === x ? 'selected' : ''}>${x}</option>`).join('')}</select></div>
          </div>
          <button class="btn primary block" id="new" style="margin-top:12px">${icon('plus')} Nouveau camping favori</button>
        </div>
        ${items.length
          ? `<div class="grid g-3">${items.map(campHTML).join('')}</div>`
          : empty('⛺', 'Aucun camping enregistré', 'Ajoutez vos campings préférés pour les retrouver facilement.')}`;
      host.querySelector('#q').oninput = e => {
        q = e.target.value;
        const c = e.target.selectionStart; paint();
        const n = host.querySelector('#q'); n.focus(); n.setSelectionRange(c, c);
      };
      host.querySelector('#fi').onchange = e => { fInt = e.target.value; paint(); };
      host.querySelector('#new').onclick  = () => campForm();
      host.querySelectorAll('[data-id]').forEach(c => c.onclick = (ev) => {
        if (ev.target.closest('a,button')) return;
        campForm(c.dataset.id);
      });
      media.hydrate(host);
    };

    const campHTML = (c) => `
      <div class="card hoverable disc-card" data-id="${c.id}">
        <div class="cover" ${c.photos && c.photos[0] ? `data-media="${c.photos[0].id}"` : ''}>${c.photos && c.photos[0] ? '' : icon('tent')}</div>
        <h3 style="margin:10px 0 2px">${esc(c.name)}</h3>
        <small style="color:var(--ink-faint)">${esc(c.address || '')}</small>
        <div class="tagrow">${c.interest ? `<span class="tag ${c.interest === 'Favori' ? 'sage' : c.interest === 'Visité' ? '' : 'warn'}">${esc(c.interest)}</span>` : ''}</div>
        ${c.notes ? `<p class="clamp">${esc(c.notes)}</p>` : ''}
        <div class="card-foot">
          ${c.address ? `<a class="btn sm" href="${mapsDir(c.address)}" target="_blank" rel="noopener">${icon('pin')} Itinéraire</a>` : ''}
          ${c.site    ? `<a class="btn sm ghost" href="${esc(c.site)}"    target="_blank" rel="noopener">${icon('globe')} Site</a>`    : ''}
        </div>
      </div>`;

    paint();

    function campForm(id) {
      const c = id ? store.doc('campingsFav', id) : null;
      const photos = c && c.photos ? [...c.photos] : [];
      const s = sheet({
        title: id ? 'Modifier le camping' : 'Nouveau camping favori',
        bodyHTML: `
          <div class="field"><label>Nom du camping</label><input name="name" value="${esc(c?.name || '')}"></div>
          <div class="field"><label>Adresse</label><input name="address" value="${esc(c?.address || '')}" placeholder="Rue, ville, pays"></div>
          <div class="row">
            <div class="field"><label>Site internet</label><input name="site" value="${esc(c?.site || '')}" placeholder="https://"></div>
            <div class="field"><label>Niveau d'intérêt</label><select name="interest">
              ${INTEREST.map(x => `<option ${c?.interest === x ? 'selected' : ''}>${x}</option>`).join('')}
            </select></div>
          </div>
          <div class="field"><label>Photos</label><div id="ph"></div></div>
          <div class="field"><label>Notes personnelles</label><textarea name="notes">${esc(c?.notes || '')}</textarea></div>
          ${id ? `<button class="btn danger block" id="delb" style="margin-top:6px">${icon('trash')} Supprimer ce camping</button>` : ''}`
      });
      photoUploader(s.body.querySelector('#ph'), photos);
      const del = s.body.querySelector('#delb');
      if (del) del.onclick = async () => {
        if (await confirmDialog('Supprimer', `Supprimer « ${c.name} » ?`)) {
          (c.photos || []).forEach(p => media.remove(p.id));
          store.remove('campingsFav', id);
          s.close(null);
          toast('Supprimé');
          paint();
        }
      };
      s.onOk(() => {
        const g    = (n) => s.body.querySelector(`[name="${n}"]`).value;
        const name = g('name').trim();
        if (!name) { toast('Indiquez un nom', 'warn'); return false; }
        const rec  = { name, address: g('address'), site: g('site'), interest: g('interest'), notes: g('notes'), photos };
        if (id) store.update('campingsFav', id, rec);
        else    store.add('campingsFav', rec);
        toast('Camping enregistré');
        paint();
      });
    }
  }

  // ── Lancement ──────────────────────────────────────────────────────────
  render();
  return el;
}
