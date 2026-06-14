// js/views/programs.js — Module Programmes (MVP)
// ─────────────────────────────────────────────────────────────────────────
// PÉRIMÈTRE MVP STRICT :
//   • Écran 1 : liste des programmes (galerie de cartes)
//   • Écran 2 : détail d'un programme (fiche scrollable)
//   • Écran 3 : formulaire création / modification
//   • Écran 4 : sheet "Transformer en voyage"
//
// COLLECTION TOUCHÉE   : 'programs' (nouvelle)
// COLLECTIONS CRÉÉES   : 'trips', 'activities', 'expenses' (via transformation)
// MODULES NON TOUCHÉS  : tous les autres modules existants
//
// MODÈLE DE DONNÉES (MVP) :
//   id, createdAt, title*, destination, emoji, duree, budgetTotal,
//   chienOk, description, programme[], budgetDetail[], hebergements[], notes,
//   linkedTripId
// ─────────────────────────────────────────────────────────────────────────

import { store } from '../store.js';
import { icon, toast, fmtMoney, esc, sheet, confirmDialog, empty } from '../lib/ui.js';
import { media } from '../lib/media.js';
import { currentOwnerPatch, ownerBadgeHTML } from '../lib/tripOwners.js';

// ── Constantes ────────────────────────────────────────────────────────────
const DEFAULT_EMOJI = '🗺️';

// ── Photo uploader (même pattern que activities.js) ───────────────────────
function photoUploader(container, photos) {
  const draw = () => {
    container.innerHTML = `
      <div class="thumbs">
        ${photos.map((p, i) => `
          <div class="thumb">
            <img data-media="${p.id}" alt="">
            <button type="button" class="thumb-x" data-i="${i}">${icon('x')}</button>
          </div>`).join('')}
        <button type="button" class="thumb add">${icon('camera')}<span>Ajouter</span></button>
      </div>
      <input type="file" accept="image/*" multiple hidden>`;
    const fileInput = container.querySelector('input[type=file]');
    container.querySelector('.add').onclick = () => fileInput.click();
    fileInput.onchange = async () => {
      for (const f of fileInput.files) {
        try { photos.push(await media.save(f)); } catch (e) {}
      }
      draw();
    };
    container.querySelectorAll('.thumb-x').forEach(b =>
      b.onclick = () => {
        const [rm] = photos.splice(+b.dataset.i, 1);
        if (rm) media.remove(rm.id);
        draw();
      });
    media.hydrate(container);
  };
  draw();
}

// ── Helpers ───────────────────────────────────────────────────────────────

// Calcule le total budget depuis les lignes détail
function calcTotal(prog) {
  if (prog.budgetDetail && prog.budgetDetail.length) {
    return prog.budgetDetail.reduce((s, l) => s + (Number(l.montant) || 0), 0);
  }
  return prog.budgetTotal || 0;
}

// Compte le nombre total d'items dans le programme jour par jour
function countItems(prog) {
  if (!prog.programme || !prog.programme.length) return 0;
  return prog.programme.reduce((s, d) => s + (d.items ? d.items.length : 0), 0);
}

// Vérifie si le linkedTripId pointe vers un voyage qui existe encore
function linkedTripExists(prog) {
  if (!prog.linkedTripId) return false;
  return !!store.doc('trips', prog.linkedTripId);
}

// Transforme les URL présentes dans les notes en liens cliquables,
// tout en conservant l'échappement HTML pour éviter l'injection.
function linkifyNotes(text = '') {
  const raw = String(text || '');
  const urlRe = /https?:\/\/[^\s<>"']+/g;
  let html = '';
  let last = 0;
  let match;

  while ((match = urlRe.exec(raw)) !== null) {
    const url = match[0];
    const trailing = (url.match(/[.,;:!?)]*$/) || [''])[0];
    const cleanUrl = url.slice(0, url.length - trailing.length);

    html += esc(raw.slice(last, match.index));
    html += `<a class="prog-note-link" href="${esc(cleanUrl)}" target="_blank" rel="noopener noreferrer">${esc(cleanUrl)}</a>${esc(trailing)}`;
    last = match.index + url.length;
  }

  html += esc(raw.slice(last));
  return html.replace(/\n/g, '<br>');
}

function activityByProgramItem(item) {
  if (!item) return null;
  if (item.activityId) return store.doc('activities', item.activityId) || null;
  const label = String(item.label || '').trim().toLowerCase();
  if (!label) return null;
  return store.list('activities').find(a => String(a.title || '').trim().toLowerCase() === label) || null;
}

function listValue(v) {
  return Array.isArray(v) ? v.filter(Boolean).join(' · ') : String(v || '');
}

function actField(a, keys, fallback = '') {
  for (const k of keys) {
    const v = a?.[k];
    if (v !== undefined && v !== null && String(v).trim() !== '') return v;
  }
  return fallback;
}

function programActivityTitle(item, act) {
  return act?.title || item?.label || 'Activité';
}

function programActivityMeta(item, act) {
  const duration = item?.plannedDuration || actField(act, ['visitDuration', 'duration']) || '';
  const diff = actField(act, ['difficulty']) || '';
  const price = act?.priceLabel || (act?.price ? fmtMoney(act.price) : '');
  return [
    duration ? `${icon('clock')} ${esc(duration)}` : '',
    diff ? `${icon('route')} ${esc(diff)}` : '',
    price ? `${icon('euro')} ${esc(price)}` : '',
  ].filter(Boolean).map(x => `<span>${x}</span>`).join('');
}

function programActivityHTML(item, index = 0) {
  const act = activityByProgramItem(item);
  const title = programActivityTitle(item, act);
  const desc = actField(act, ['shortDescription', 'description', 'note'], item?.notes || '');
  const when = item?.plannedTime || item?.time || '';
  const route = [item?.driveTimeFromPrevious, item?.distanceFromPrevious].filter(Boolean).join(' · ');
  const address = actField(act, ['city', 'address'], '');
  return `
    <div class="prog-activity-merge-card">
      <div class="prog-activity-merge-time">${when ? esc(when) : String(index + 1).padStart(2, '0')}</div>
      <div class="prog-activity-merge-body">
        <div class="prog-activity-merge-head">
          <b>${esc(title)}</b>
          ${item?.priority ? `<span class="tag">${esc(item.priority)}</span>` : ''}
          ${item?.optional ? `<span class="tag warn">Optionnel</span>` : ''}
        </div>
        ${desc ? `<p>${esc(desc)}</p>` : ''}
        <div class="prog-activity-merge-meta">
          ${programActivityMeta(item, act)}
          ${address ? `<span>${icon('pin')} ${esc(address)}</span>` : ''}
          ${route ? `<span>${icon('route')} Depuis l'étape précédente : ${esc(route)}</span>` : ''}
        </div>
        ${item?.notes ? `<div class="prog-activity-day-note">${icon('edit')} ${linkifyNotes(item.notes)}</div>` : ''}
      </div>
    </div>`;
}


// ══════════════════════════════════════════════════════════════════════════
//  VUE PRINCIPALE
// ══════════════════════════════════════════════════════════════════════════
export function Programs(nav) {
  const el = document.createElement('div');
  let detailId = null;

  // ── Rendu racine ─────────────────────────────────────────────────────
  function render() {
    el.innerHTML = `
      <div class="prog-root">
        <div id="prog-panel-list"  class="prog-panel prog-panel--active"></div>
        <div id="prog-panel-detail" class="prog-panel"></div>
      </div>`;
    paintList();
  }

  // ── Navigation entre panneaux ────────────────────────────────────────
  function showDetail(id) {
    detailId = id;
    el.querySelector('#prog-panel-list').classList.remove('prog-panel--active');
    el.querySelector('#prog-panel-detail').classList.add('prog-panel--active');
    paintDetail(id);
    el.querySelector('#prog-panel-detail').scrollTop = 0;
  }

  function showList() {
    detailId = null;
    el.querySelector('#prog-panel-detail').classList.remove('prog-panel--active');
    el.querySelector('#prog-panel-list').classList.add('prog-panel--active');
    paintList();
  }

  // ══════════════════════════════════════════════════════════════════════
  //  ÉCRAN 1 — LISTE
  // ══════════════════════════════════════════════════════════════════════
  function paintList() {
    const panel = el.querySelector('#prog-panel-list');
    if (!panel) return;
    const programs = store.list('programs');

    panel.innerHTML = `
      <div class="prog-showcase">
        ${programs.length
          ? `<div class="prog-showcase-grid" id="prog-grid">${programs.map((p, i) => progCardHTML(p, i)).join('')}</div>`
          : `<div id="prog-grid" class="prog-empty-shell">${empty('🗺️', 'Aucun programme pour l\'instant', 'Créez votre premier modèle de voyage.')}</div>`
        }

        <div class="prog-benefits" aria-label="Avantages des programmes">
          <div class="prog-benefit">
            <div class="prog-benefit-icon">${icon('star')}</div>
            <h4>Engagement Éco</h4>
            <p>100% de nos programmes favorisent le tourisme local et durable.</p>
          </div>
          <div class="prog-benefit">
            <div class="prog-benefit-icon">${icon('map')}</div>
            <h4>Parcours sur mesure</h4>
            <p>Personnalisez chaque étape selon vos envies et votre rythme.</p>
          </div>
          <div class="prog-benefit">
            <div class="prog-benefit-icon">${icon('camera')}</div>
            <h4>Points de vue</h4>
            <p>Plus de 45 spots photos iconiques répertoriés dans vos itinéraires.</p>
          </div>
        </div>

        <button class="prog-fab" id="prog-new" aria-label="Nouveau programme" title="Nouveau programme">${icon('plus')}</button>
      </div>`;

    panel.querySelector('#prog-new').onclick = () => progForm(null, showList, showDetail);
    panel.querySelectorAll('[data-id]').forEach(c => {
      c.onclick = (ev) => {
        if (ev.target.closest('button')) return;
        showDetail(c.dataset.id);
      };
    });
    media.hydrate(panel);
  }

  // Helpers purement visuels pour la carte : aucune donnée n'est modifiée.
  function progDurationLabel(p) {
    const raw = (p.duree || '').toString().trim();
    return raw ? raw.toUpperCase() : 'PROGRAMME';
  }

  function progTags(p, total, items, linked) {
    const custom = Array.isArray(p.tags) ? p.tags
      : Array.isArray(p.themes) ? p.themes
      : Array.isArray(p.categories) ? p.categories
      : [];
    const tags = custom.map(t => String(t).trim()).filter(Boolean);

    if (!tags.length) {
      if (items > 0) tags.push('Itinéraire');
      if (p.chienOk) tags.push('Animaux');
      if (total > 0) tags.push('Budget');
      if (linked) tags.push('Utilisé');
      if (!tags.length) tags.push('Voyage');
    }
    return tags.slice(0, 3);
  }

  // HTML d'une carte programme
  function progCardHTML(p, index = 0) {
    const total = calcTotal(p);
    const items = countItems(p);
    const linked = linkedTripExists(p);
    const linkedTrip = linked ? store.doc('trips', p.linkedTripId) : null;
    const tags = progTags(p, total, items, linked);
    const description = (p.description || '').trim()
      || (items > 0
        ? `${items} activité${items>1?'s':''} planifiée${items>1?'s':''} pour composer votre itinéraire.`
        : 'Un itinéraire authentique à personnaliser selon vos envies, votre budget et votre rythme.');

    return `
      <article class="prog-travel-card" data-id="${p.id}">
        <div class="prog-card-cover prog-card-cover--${index % 2 ? 'mountain' : 'valley'}" ${p.photos && p.photos[0] ? `data-media="${p.photos[0].id}"` : ''}>
          <div class="prog-card-shine"></div>
          <span class="prog-duration-badge">${icon('calendar')} ${esc(progDurationLabel(p))}</span>
        </div>
        <div class="prog-card-body">
          <span class="prog-card-open" aria-hidden="true">↗</span>
          <h3 class="prog-card-title">${esc(p.title)}</h3>
          <div class="prog-card-place">${icon('map-pin')} ${esc((p.destination || 'Destination libre').toUpperCase())}</div>
          <p class="prog-card-desc">${esc(description)}</p>
          <div class="prog-card-tags">
            ${tags.map(t => `<span>${esc(String(t).toUpperCase())}</span>`).join('')}
          </div>
        </div>
      </article>`;
  }

  // ══════════════════════════════════════════════════════════════════════
  //  ÉCRAN 2 — DÉTAIL
  // ══════════════════════════════════════════════════════════════════════
  function paintDetail(id) {
    const p = store.doc('programs', id);
    const panel = el.querySelector('#prog-panel-detail');
    if (!p || !panel) return;

    const total = calcTotal(p);
    const linked = linkedTripExists(p);
    const linkedTrip = linked ? store.doc('trips', p.linkedTripId) : null;

    panel.innerHTML = `
      <!-- Barre nav sticky -->
      <div class="idea-detail-nav">
        <button class="idea-back" id="prog-back">${icon('arrow-left')} Programmes</button>
        <span class="idea-detail-crumb">Programmes · ${esc(p.title)}</span>
      </div>

      <!-- Hero -->
      <div class="idea-hero">
        ${p.photos && p.photos.length
          ? `<img data-media="${p.photos[0].id}" alt="${esc(p.title)}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.7">`
          : `<div class="idea-hero-emoji-bg">${esc(p.emoji || DEFAULT_EMOJI)}</div>`
        }
        <div class="idea-hero-overlay"></div>
        <div class="idea-hero-content">
          <h1 class="idea-hero-title">${esc(p.title)}</h1>
          <p class="idea-hero-sub">${icon('map-pin')} ${esc(p.destination || 'Destination libre')}</p>
          <div class="idea-hero-badges">
            ${p.duree   ? `<span class="idea-hero-badge">${icon('clock')} ${esc(p.duree)}</span>` : ''}
            ${total > 0 ? `<span class="idea-hero-badge">${icon('euro')} ${fmtMoney(total)}</span>` : ''}
            ${p.chienOk ? `<span class="idea-hero-badge idea-hero-badge--dog">${icon('paw')} Chien OK</span>` : ''}
          </div>
        </div>
      </div>

      <!-- Corps -->
      <div class="idea-detail-body">

        <!-- CTA principal -->
        <div class="idea-cta-row">
          <button class="idea-btn-plan" id="prog-transform">
            ${icon('wand')} Transformer en voyage
          </button>
        </div>

        ${linked ? `<p style="font-size:.82rem;color:var(--ink-faint);margin:-10px 0 10px">Un voyage a déjà été créé depuis ce programme.</p>${linkedTrip ? ownerBadgeHTML(linkedTrip) : ''}` : ''}

        <!-- Description -->
        ${p.description ? `
        <div class="idea-section">
          <p style="color:var(--ink-soft);line-height:1.7">${esc(p.description)}</p>
        </div>` : ''}

        <!-- Programme jour par jour -->
        ${p.programme && p.programme.length ? `
        <div class="idea-section">
          <div class="idea-section-head">${icon('calendar')} Programme jour par jour</div>
          <div class="timeline">
            ${p.programme.map(day => `
              <div class="tl-item future">
                <div class="idea-tl-day-label">${esc(day.day)}${day.date ? ` · ${esc(day.date)}` : ''}</div>
                ${day.dayNotes ? `<div class="prog-day-note">${icon('edit')} ${esc(day.dayNotes)}</div>` : ''}
                ${(day.items || []).map((it, ii) => programActivityHTML(it, ii)).join('')}
              </div>`).join('')}
          </div>
        </div>` : ''}

        <!-- Budget -->
        ${p.budgetDetail && p.budgetDetail.length ? `
        <div class="idea-section">
          <div class="idea-section-head">${icon('wallet')} Budget estimatif</div>
          <div style="display:flex;flex-direction:column;gap:6px">
            ${p.budgetDetail.map(l => `
              <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:var(--surface-2);border-radius:var(--r-sm)">
                <span style="font-size:.88rem;color:var(--ink-soft)">${esc(l.label)}</span>
                <b style="font-size:.9rem">${fmtMoney(l.montant)}</b>
              </div>`).join('')}
            <div style="display:flex;justify-content:space-between;align-items:center;padding:11px 14px;background:var(--sage-soft);border-radius:var(--r-sm);border:1px solid var(--beige-deep)">
              <span style="font-size:.82rem;font-weight:700;color:var(--sage-deep)">Total estimé</span>
              <b style="color:var(--sage-deep)">${fmtMoney(total)}</b>
            </div>
          </div>
        </div>` : ''}

        <!-- Hébergements suggérés -->
        ${p.hebergements && p.hebergements.length ? `
        <div class="idea-section">
          <div class="idea-section-head">${icon('tent')} Hébergements suggérés</div>
          <div style="display:flex;flex-direction:column;gap:6px">
            ${p.hebergements.map(h => `
              <div class="idea-tl-item-row">${icon('tent')} ${esc(h.nom)}</div>`).join('')}
          </div>
        </div>` : ''}

        <!-- Notes -->
        ${p.notes ? `
        <div class="idea-section">
          <div class="idea-section-head">${icon('edit')} Notes pratiques</div>
          <p style="color:var(--ink-soft);line-height:1.7;background:var(--surface-2);border:1px solid var(--border);border-radius:var(--r);padding:14px 16px">${linkifyNotes(p.notes)}</p>
        </div>` : ''}

        <!-- Actions bas de page -->
        <div style="display:flex;gap:10px;padding-top:10px;border-top:1px solid var(--border);margin-top:10px">
          <button class="btn ghost" id="prog-edit">${icon('edit')} Modifier</button>
          <button class="btn ghost danger" id="prog-del">${icon('trash')} Supprimer</button>
        </div>

      </div>`;

    // Événements
    panel.querySelector('#prog-back').onclick = () => showList();

    panel.querySelector('#prog-transform').onclick = () =>
      progTransform(id, () => { showList(); nav('trips'); });

    panel.querySelector('#prog-edit').onclick = () =>
      progForm(id, showList, showDetail);

    panel.querySelector('#prog-del').onclick = async () => {
      if (await confirmDialog('Supprimer ce programme', `Supprimer « ${p.title} » ? Cette action est définitive.`)) {
        store.remove('programs', id);
        toast('Programme supprimé');
        showList();
      }
    };

    // Charger les photos du hero
    media.hydrate(panel);
  }

  // ══════════════════════════════════════════════════════════════════════
  //  ÉCRAN 3 — FORMULAIRE CRÉATION / MODIFICATION
  // ══════════════════════════════════════════════════════════════════════
  function progForm(id, onCancel, onSaved) {
    const p = id ? store.doc('programs', id) : null;
    const isEdit = !!p;

    // Copies locales des listes dynamiques
    let programme  = p && p.programme    ? p.programme.map(d => ({ ...d, items: (d.items || []).map(it => ({ ...it })) })) : [];
    let budget     = p && p.budgetDetail ? p.budgetDetail.map(l => ({ ...l })) : [];
    let hebergs    = p && p.hebergements ? p.hebergements.map(h => ({ ...h })) : [];
    let photos     = p && p.photos       ? [...p.photos] : [];

    // Conteneur principal (plein écran dans le panel liste)
    const panel = el.querySelector('#prog-panel-list');
    panel.classList.add('prog-panel--active');
    el.querySelector('#prog-panel-detail').classList.remove('prog-panel--active');

    // On remplace le contenu du panel liste par le formulaire
    panel.innerHTML = `
      <div style="max-width:720px;margin:0 auto;padding-bottom:80px">

        <div class="section-head" style="margin-top:0">
          <button class="btn ghost" id="pf-cancel">${icon('arrow-left')} Annuler</button>
          <h3 style="margin:0">${isEdit ? 'Modifier le programme' : 'Nouveau programme'}</h3>
          <div class="spacer"></div>
          <button class="btn primary" id="pf-save">${icon('check')} Enregistrer</button>
        </div>

        <!-- Identité -->
        <div class="card" style="margin-bottom:18px">
          <h4 style="margin:0 0 14px;font-size:1rem">Informations générales</h4>
          <div class="row">
            <div class="field" style="flex:3">
              <label>Titre *</label>
              <input id="pf-title" value="${esc(p?.title||'')}" placeholder="Ex : Ardèche en caravane">
            </div>
            <div class="field" style="flex:.6">
              <label>Emoji</label>
              <input id="pf-emoji" value="${esc(p?.emoji||DEFAULT_EMOJI)}" maxlength="4" style="text-align:center;font-size:1.4rem">
            </div>
          </div>
          <div class="row">
            <div class="field">
              <label>Destination</label>
              <input id="pf-dest" value="${esc(p?.destination||'')}" placeholder="Ex : Bretagne Nord">
            </div>
            <div class="field">
              <label>Durée</label>
              <input id="pf-duree" value="${esc(p?.duree||'')}" placeholder="Ex : 7 jours">
            </div>
          </div>
          <div class="row">
            <div class="field">
              <label>Budget total estimé (€)</label>
              <input id="pf-budget" type="number" min="0" value="${p?.budgetTotal||0}">
            </div>
            <div class="field" style="justify-content:flex-end">
              <label class="checkrow" style="margin-top:22px">
                <input type="checkbox" id="pf-chien" ${p?.chienOk?'checked':''}> ${icon('paw')} Chien accepté
              </label>
            </div>
          </div>
          <div class="field">
            <label>Description</label>
            <textarea id="pf-desc" rows="3" placeholder="Résumé du programme…">${esc(p?.description||'')}</textarea>
          </div>
        </div>

        <!-- Photos -->
        <div class="card" style="margin-bottom:18px">
          <h4 style="margin:0 0 14px;font-size:1rem">${icon('camera')} Photos</h4>
          <div id="pf-photos"></div>
        </div>

        <!-- Programme jour par jour -->
        <div class="card" style="margin-bottom:18px">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
            <h4 style="margin:0;font-size:1rem;flex:1">Programme jour par jour</h4>
            <button class="btn sm ghost" id="pf-add-day">${icon('plus')} Ajouter un jour</button>
          </div>
          <div id="pf-days"></div>
        </div>

        <!-- Budget détaillé -->
        <div class="card" style="margin-bottom:18px">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
            <h4 style="margin:0;font-size:1rem;flex:1">Détail du budget</h4>
            <button class="btn sm ghost" id="pf-add-bud">${icon('plus')} Ajouter une ligne</button>
          </div>
          <div id="pf-budget-lines"></div>
          <div id="pf-budget-total" style="text-align:right;font-size:.88rem;color:var(--ink-faint);margin-top:8px"></div>
        </div>

        <!-- Hébergements -->
        <div class="card" style="margin-bottom:18px">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
            <h4 style="margin:0;font-size:1rem;flex:1">Hébergements suggérés</h4>
            <button class="btn sm ghost" id="pf-add-heb">${icon('plus')} Ajouter</button>
          </div>
          <div id="pf-hebergs"></div>
        </div>

        <!-- Notes -->
        <div class="card" style="margin-bottom:18px">
          <div class="field" style="margin:0">
            <label>Notes pratiques</label>
            <textarea id="pf-notes" rows="4" placeholder="Meilleure période, conseils d'accès, infos chien…">${esc(p?.notes||'')}</textarea>
          </div>
        </div>

      </div>

      <!-- Bouton fixe en bas pour tablette / mobile -->
      <div class="prog-save-bar">
        <button class="btn primary prog-save-bar-btn" id="pf-save-bottom">${icon('check')} Enregistrer le programme</button>
      </div>`;

    // ── Render dynamique des jours ──
    function renderDays() {
      const host = panel.querySelector('#pf-days');
      const activities = store.list('activities');
      const activityOptions = (selected) => `<option value="">Saisie libre / aucune fiche liée</option>${activities.map(a => `<option value="${esc(a.id)}" ${selected === a.id ? 'selected' : ''}>${esc(a.title)}${a.cat ? ` · ${esc(a.cat)}` : ''}</option>`).join('')}`;

      if (!programme.length) {
        host.innerHTML = `<p style="color:var(--ink-faint);font-size:.88rem">Aucun jour ajouté.</p>`;
        return;
      }
      host.innerHTML = programme.map((day, di) => `
        <div class="pf-day" style="border:1px solid var(--border);border-radius:var(--r);padding:14px;margin-bottom:10px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;flex-wrap:wrap">
            <input class="pf-day-label" data-di="${di}" value="${esc(day.day || '')}"
              style="flex:1;min-width:160px;border:1px solid var(--border);background:var(--surface-2);border-radius:var(--r-sm);padding:7px 10px;font-weight:700;font-size:.88rem"
              placeholder="Jour ${di+1}">
            <input class="pf-day-date" data-di="${di}" type="date" value="${esc(day.date || '')}"
              style="width:150px;border:1px solid var(--border);background:var(--surface);border-radius:var(--r-sm);padding:7px 10px;font-size:.84rem">
            <button class="btn sm ghost pf-del-day" data-di="${di}">${icon('trash')}</button>
          </div>
          <textarea class="pf-day-notes" data-di="${di}" rows="2"
            style="width:100%;border:1px solid var(--border);background:var(--surface-2);border-radius:var(--r-sm);padding:7px 10px;font-size:.82rem;resize:vertical;font-family:inherit;color:var(--ink-soft);margin-bottom:10px"
            placeholder="Notes du jour, météo, organisation globale…">${esc(day.dayNotes || '')}</textarea>
          <div class="pf-items-host" data-di="${di}">
            ${(day.items||[]).map((it, ii) => `
              <div class="pf-program-item" style="border:1px solid var(--border);border-radius:var(--r-sm);padding:10px;margin-bottom:10px;background:var(--surface)">
                <div style="display:flex;align-items:center;gap:7px;margin-bottom:7px">
                  <select class="pf-item-activity" data-di="${di}" data-ii="${ii}"
                    style="flex:1;border:1px solid var(--border);background:var(--surface-2);border-radius:var(--r-sm);padding:7px 10px;font-size:.84rem">
                    ${activityOptions(it.activityId || '')}
                  </select>
                  <button class="btn sm ghost pf-del-item" data-di="${di}" data-ii="${ii}">${icon('x')}</button>
                </div>
                <input class="pf-item-label" data-di="${di}" data-ii="${ii}" value="${esc(it.label || '')}"
                  style="width:100%;border:1px solid var(--border);background:var(--surface);border-radius:var(--r-sm);padding:6px 10px;font-size:.85rem;margin-bottom:7px"
                  placeholder="Nom affiché si aucune fiche activité n'est liée…">
                <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;margin-bottom:7px">
                  <input class="pf-item-time" data-di="${di}" data-ii="${ii}" type="time" value="${esc(it.plannedTime || it.time || '')}"
                    style="border:1px solid var(--border);background:var(--surface-2);border-radius:var(--r-sm);padding:6px 10px;font-size:.82rem" title="Heure prévue">
                  <input class="pf-item-drive" data-di="${di}" data-ii="${ii}" value="${esc(it.driveTimeFromPrevious || '')}"
                    style="border:1px solid var(--border);background:var(--surface-2);border-radius:var(--r-sm);padding:6px 10px;font-size:.82rem" placeholder="Route depuis avant">
                  <input class="pf-item-distance" data-di="${di}" data-ii="${ii}" value="${esc(it.distanceFromPrevious || '')}"
                    style="border:1px solid var(--border);background:var(--surface-2);border-radius:var(--r-sm);padding:6px 10px;font-size:.82rem" placeholder="Distance depuis avant">
                </div>
                <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;margin-bottom:7px">
                  <select class="pf-item-priority" data-di="${di}" data-ii="${ii}" style="border:1px solid var(--border);background:var(--surface-2);border-radius:var(--r-sm);padding:6px 10px;font-size:.82rem">
                    ${['','Incontournable','Important','Optionnel'].map(v => `<option value="${esc(v)}" ${String(it.priority || '') === v ? 'selected' : ''}>${v || 'Priorité'}</option>`).join('')}
                  </select>
                  <select class="pf-item-reservation" data-di="${di}" data-ii="${ii}" style="border:1px solid var(--border);background:var(--surface-2);border-radius:var(--r-sm);padding:6px 10px;font-size:.82rem">
                    ${['','À faire','Réservé','Non nécessaire','À vérifier'].map(v => `<option value="${esc(v)}" ${String(it.reservationStatus || '') === v ? 'selected' : ''}>${v || 'Réservation'}</option>`).join('')}
                  </select>
                  <label class="checkrow" style="margin:0;min-height:0;padding:6px 10px;font-size:.82rem"><input type="checkbox" class="pf-item-optional" data-di="${di}" data-ii="${ii}" ${it.optional ? 'checked' : ''}> Optionnel</label>
                </div>
                <textarea class="pf-item-notes" data-di="${di}" data-ii="${ii}" rows="2"
                  style="width:100%;border:1px solid var(--border);background:var(--surface-2);border-radius:var(--r-sm);padding:5px 10px;font-size:.8rem;resize:vertical;font-family:inherit;color:var(--ink-soft)"
                  placeholder="Notes spécifiques à ce jour uniquement…">${esc(it.notes||'')}</textarea>
              </div>`).join('')}
          </div>
          <button class="btn sm ghost pf-add-item" data-di="${di}" style="margin-top:4px">${icon('plus')} Activité</button>
        </div>`).join('');

      host.querySelectorAll('.pf-day-label').forEach(inp =>
        inp.oninput = e => { programme[+e.target.dataset.di].day = e.target.value; });
      host.querySelectorAll('.pf-day-date').forEach(inp =>
        inp.oninput = e => { programme[+e.target.dataset.di].date = e.target.value; });
      host.querySelectorAll('.pf-day-notes').forEach(inp =>
        inp.oninput = e => { programme[+e.target.dataset.di].dayNotes = e.target.value; });

      host.querySelectorAll('.pf-item-activity').forEach(sel =>
        sel.onchange = e => {
          const { di, ii } = e.target.dataset;
          const item = programme[+di].items[+ii];
          item.activityId = e.target.value;
          const act = item.activityId ? store.doc('activities', item.activityId) : null;
          if (act && !(item.label || '').trim()) item.label = act.title;
          renderDays();
        });
      host.querySelectorAll('.pf-item-label').forEach(inp =>
        inp.oninput = e => { const { di, ii } = e.target.dataset; programme[+di].items[+ii].label = e.target.value; });
      host.querySelectorAll('.pf-item-time').forEach(inp =>
        inp.oninput = e => { const { di, ii } = e.target.dataset; programme[+di].items[+ii].plannedTime = e.target.value; });
      host.querySelectorAll('.pf-item-drive').forEach(inp =>
        inp.oninput = e => { const { di, ii } = e.target.dataset; programme[+di].items[+ii].driveTimeFromPrevious = e.target.value; });
      host.querySelectorAll('.pf-item-distance').forEach(inp =>
        inp.oninput = e => { const { di, ii } = e.target.dataset; programme[+di].items[+ii].distanceFromPrevious = e.target.value; });
      host.querySelectorAll('.pf-item-priority').forEach(inp =>
        inp.oninput = e => { const { di, ii } = e.target.dataset; programme[+di].items[+ii].priority = e.target.value; });
      host.querySelectorAll('.pf-item-reservation').forEach(inp =>
        inp.oninput = e => { const { di, ii } = e.target.dataset; programme[+di].items[+ii].reservationStatus = e.target.value; });
      host.querySelectorAll('.pf-item-optional').forEach(inp =>
        inp.onchange = e => { const { di, ii } = e.target.dataset; programme[+di].items[+ii].optional = e.target.checked; });
      host.querySelectorAll('.pf-item-notes').forEach(inp =>
        inp.oninput = e => { const { di, ii } = e.target.dataset; programme[+di].items[+ii].notes = e.target.value; });

      host.querySelectorAll('.pf-del-day').forEach(b =>
        b.onclick = () => { programme.splice(+b.dataset.di, 1); renderDays(); });
      host.querySelectorAll('.pf-add-item').forEach(b =>
        b.onclick = () => { programme[+b.dataset.di].items.push({ label: '' }); renderDays(); });
      host.querySelectorAll('.pf-del-item').forEach(b =>
        b.onclick = () => { programme[+b.dataset.di].items.splice(+b.dataset.ii, 1); renderDays(); });
    }

    // ── Render dynamique du budget ──
    function renderBudget() {
      const host  = panel.querySelector('#pf-budget-lines');
      const total = budget.reduce((s, l) => s + (Number(l.montant)||0), 0);
      if (!budget.length) {
        host.innerHTML = `<p style="color:var(--ink-faint);font-size:.88rem">Aucune ligne de budget.</p>`;
      } else {
        host.innerHTML = budget.map((l, li) => `
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
            <input class="pf-bud-label" data-li="${li}" value="${esc(l.label)}"
              style="flex:2;border:1px solid var(--border);background:var(--surface);border-radius:var(--r-sm);padding:7px 10px;font-size:.85rem"
              placeholder="Ex : Camping 7 nuits">
            <input class="pf-bud-montant" data-li="${li}" type="number" min="0" value="${l.montant||0}"
              style="flex:1;border:1px solid var(--border);background:var(--surface);border-radius:var(--r-sm);padding:7px 10px;font-size:.85rem;text-align:right"
              placeholder="€">
            <button class="btn sm ghost pf-del-bud" data-li="${li}">${icon('x')}</button>
          </div>`).join('');

        host.querySelectorAll('.pf-bud-label').forEach(inp =>
          inp.oninput = e => { budget[+e.target.dataset.li].label = e.target.value; });
        host.querySelectorAll('.pf-bud-montant').forEach(inp =>
          inp.oninput = e => { budget[+e.target.dataset.li].montant = Number(e.target.value)||0; renderBudgetTotal(); });
        host.querySelectorAll('.pf-del-bud').forEach(b =>
          b.onclick = () => { budget.splice(+b.dataset.li, 1); renderBudget(); });
      }
      renderBudgetTotal();
    }

    function renderBudgetTotal() {
      const total = budget.reduce((s, l) => s + (Number(l.montant)||0), 0);
      const host = panel.querySelector('#pf-budget-total');
      if (host) host.textContent = total > 0 ? `Total : ${fmtMoney(total)}` : '';
    }

    // ── Render dynamique des hébergements ──
    function renderHebergs() {
      const host = panel.querySelector('#pf-hebergs');
      if (!hebergs.length) {
        host.innerHTML = `<p style="color:var(--ink-faint);font-size:.88rem">Aucun hébergement suggéré.</p>`;
        return;
      }
      host.innerHTML = hebergs.map((h, hi) => `
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
          <input class="pf-heb-nom" data-hi="${hi}" value="${esc(h.nom)}"
            style="flex:1;border:1px solid var(--border);background:var(--surface);border-radius:var(--r-sm);padding:7px 10px;font-size:.85rem"
            placeholder="Ex : Camping des Abers, Landéda">
          <button class="btn sm ghost pf-del-heb" data-hi="${hi}">${icon('x')}</button>
        </div>`).join('');

      host.querySelectorAll('.pf-heb-nom').forEach(inp =>
        inp.oninput = e => { hebergs[+e.target.dataset.hi].nom = e.target.value; });
      host.querySelectorAll('.pf-del-heb').forEach(b =>
        b.onclick = () => { hebergs.splice(+b.dataset.hi, 1); renderHebergs(); });
    }

    // Rendu initial des listes
    renderDays();
    renderBudget();
    renderHebergs();

    // Initialiser le gestionnaire de photos
    photoUploader(panel.querySelector('#pf-photos'), photos);

    // ── Événements fixes ──
    panel.querySelector('#pf-cancel').onclick = () => {
      if (isEdit) { showDetail(id); } else { showList(); }
    };

    panel.querySelector('#pf-add-day').onclick = () => {
      programme.push({ day: `Jour ${programme.length + 1}`, items: [] });
      renderDays();
    };

    panel.querySelector('#pf-add-bud').onclick = () => {
      budget.push({ label: '', montant: 0 });
      renderBudget();
    };

    panel.querySelector('#pf-add-heb').onclick = () => {
      hebergs.push({ nom: '' });
      renderHebergs();
    };

    panel.querySelector('#pf-save').onclick = () => {
      const title = panel.querySelector('#pf-title').value.trim();
      if (!title) { toast('Le titre est obligatoire', 'warn'); panel.querySelector('#pf-title').focus(); return; }

      // Nettoyage : retirer les items/lignes vides
      const cleanProgramme = programme
        .filter(d => (d.day || '').trim())
        .map(d => ({
          ...d,
          day: (d.day || '').trim(),
          ...(d.date ? { date: d.date } : {}),
          ...((d.dayNotes || '').trim() ? { dayNotes: d.dayNotes.trim() } : {}),
          items: (d.items || [])
            .filter(it => (it.label || '').trim() || it.activityId)
            .map(it => {
              const act = it.activityId ? store.doc('activities', it.activityId) : null;
              const item = { ...it, label: (it.label || act?.title || '').trim() };
              if (it.activityId) item.activityId = it.activityId;
              const fields = ['notes', 'plannedTime', 'driveTimeFromPrevious', 'distanceFromPrevious', 'priority', 'reservationStatus'];
              fields.forEach(k => { const v = (it[k] || '').trim ? it[k].trim() : it[k]; if (v) item[k] = v; else delete item[k]; });
              if (it.optional) item.optional = true; else delete item.optional;
              return item;
            })
        }));
      const cleanBudget = budget.filter(l => l.label.trim() || l.montant > 0);
      const cleanHebergs = hebergs.filter(h => h.nom.trim());
      const budgetTotal = cleanBudget.reduce((s, l) => s + (Number(l.montant)||0), 0)
        || Number(panel.querySelector('#pf-budget').value) || 0;

      const data = {
        title,
        destination : panel.querySelector('#pf-dest').value.trim(),
        emoji       : panel.querySelector('#pf-emoji').value.trim() || DEFAULT_EMOJI,
        duree       : panel.querySelector('#pf-duree').value.trim(),
        budgetTotal,
        chienOk     : panel.querySelector('#pf-chien').checked,
        description : panel.querySelector('#pf-desc').value.trim(),
        photos,
        programme   : cleanProgramme,
        budgetDetail: cleanBudget,
        hebergements: cleanHebergs,
        notes       : panel.querySelector('#pf-notes').value.trim(),
      };

      if (isEdit) {
        store.update('programs', id, data);
        toast('Programme mis à jour');
        showDetail(id);
      } else {
        const newProg = store.add('programs', data);
        toast('Programme créé');
        showDetail(newProg.id);
      }
    };

    // Bouton fixe en bas (tablette / mobile) — même action que pf-save
    panel.querySelector('#pf-save-bottom').onclick =
      () => panel.querySelector('#pf-save').click();
  }

  // ══════════════════════════════════════════════════════════════════════
  //  ÉCRAN 4 — SHEET "TRANSFORMER EN VOYAGE"
  // ══════════════════════════════════════════════════════════════════════
  function progTransform(id, onDone) {
    const p = store.doc('programs', id);
    if (!p) return;

    const itemsCount = countItems(p);
    const budgetCount = p.budgetDetail ? p.budgetDetail.filter(l => l.label || l.montant).length : 0;
    const total = calcTotal(p);

    const s = sheet({
      title  : 'Créer un voyage depuis ce programme',
      okText : 'Créer le voyage',
      bodyHTML: `
        <p style="color:var(--ink-soft);margin:-4px 0 16px;font-size:.9rem">
          Programme : <b>${esc(p.title)}</b>
        </p>

        <div class="field">
          <label>Titre du voyage</label>
          <input name="title" value="${esc(p.title)}" placeholder="Titre du voyage">
        </div>

        <div class="row">
          <div class="field">
            <label>Date de début</label>
            <input name="start" type="date">
          </div>
          <div class="field">
            <label>Date de fin</label>
            <input name="end" type="date">
          </div>
        </div>

        <div style="background:var(--surface-2);border:1px solid var(--border);border-radius:var(--r);padding:14px;margin-top:4px">
          <div style="font-size:.7rem;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-faint);margin-bottom:10px">Ce qui sera créé</div>
          <div style="display:flex;flex-direction:column;gap:7px;font-size:.88rem">
            <div style="display:flex;align-items:center;gap:8px"><span style="color:var(--sage-deep)">${icon('suitcase')}</span> 1 voyage</div>
            ${itemsCount > 0 ? `<div style="display:flex;align-items:center;gap:8px"><span style="color:var(--sage-deep)">${icon('star')}</span> ${itemsCount} activité${itemsCount>1?'s':''} (statut "Envie")</div>` : ''}
            ${budgetCount > 0 ? `<div style="display:flex;align-items:center;gap:8px"><span style="color:var(--sage-deep)">${icon('wallet')}</span> ${budgetCount} ligne${budgetCount>1?'s':''} de budget</div>` : ''}
            ${total > 0 ? `<div style="display:flex;align-items:center;gap:8px"><span style="color:var(--ink-faint)">${icon('euro')}</span> Budget prévisionnel : ${fmtMoney(total)}</div>` : ''}
          </div>
        </div>`
    });

    s.onOk(() => {
      const title = s.body.querySelector('[name="title"]').value.trim();
      const start = s.body.querySelector('[name="start"]').value;
      const end   = s.body.querySelector('[name="end"]').value;

      if (!title) { toast('Le titre est obligatoire', 'warn'); return false; }
      if (!start)  { toast('Choisissez une date de début', 'warn'); return false; }

      // 1. Créer le voyage
      const trip = store.add('trips', {
        title,
        destination : p.destination || '',
        status      : 'futur',
        cover       : p.emoji || DEFAULT_EMOJI,
        budget      : total,
        notes       : p.description || '',
        start,
        end         : end || start,
        lat         : 46.6,
        lng         : 2.4,
        photos      : [],
        ...currentOwnerPatch(),
      });

      // 2. Créer les activités depuis le programme jour par jour
      if (p.programme && p.programme.length) {
        p.programme.forEach(day => {
          (day.items || []).forEach(it => {
            store.add('activities', {
              tripId : trip.id,
              title  : it.label,
              cat    : 'Visite',
              status : 'envie',
              price  : 0,
              pets   : p.chienOk || false,
              note   : `Depuis le programme · ${day.day}`,
              photos : [],
            });
          });
        });
      }

      // 3. Créer les dépenses depuis le budget détaillé
      if (p.budgetDetail && p.budgetDetail.length) {
        p.budgetDetail.forEach(l => {
          if (!l.label && !l.montant) return;
          store.add('expenses', {
            tripId : trip.id,
            cat    : 'Divers',
            label  : l.label || 'Budget estimé',
            amount : Number(l.montant) || 0,
            date   : start,
          });
        });
      }

      // 4. Marquer le programme comme utilisé
      store.update('programs', id, { linkedTripId: trip.id });

      // 5. Activer le voyage
      store.setting('activeTripId', trip.id);

      toast(`Voyage « ${title} » créé depuis le programme ✨`);
      onDone();
    });
  }

  // ── Lancement ──────────────────────────────────────────────────────────
  render();
  return el;
}
