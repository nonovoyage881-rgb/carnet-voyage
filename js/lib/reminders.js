// js/lib/reminders.js — Rappels intelligents à l'ouverture
// ──────────────────────────────────────────────────────────────
// À chaque ouverture de l'app, vérifie les dates de voyages et
// réservations et affiche un bandeau si un événement approche.
//
// FENÊTRE DE TOLÉRANCE :
//   J-7  → affiché si l'app est ouverte entre J-9 et J-5
//   J-1  → affiché si l'app est ouverte entre J-2 et J+0
//   Jour J → affiché le jour même
//
// Un rappel déjà vu ne réapparaît pas avant 20h (évite spam si
// l'app est rouverte plusieurs fois dans la journée).
//
// Données lues : trips, reservations (lecture seule)
// Données écrites : settings.remindersEnabled, settings.remindersSnooze
// ──────────────────────────────────────────────────────────────
import { store } from '../store.js';

const SNOOZE_KEY  = 'cvs_reminder_snooze'; // { "key": timestamp }
const SNOOZE_MS   = 20 * 60 * 60 * 1000;   // 20 heures

function today() {
  const d = new Date(); d.setHours(0,0,0,0); return d;
}

function parseDate(str) {
  if (!str) return null;
  const d = new Date(str); return isNaN(d) ? null : d;
}

function daysUntil(dateStr) {
  const d = parseDate(dateStr); if (!d) return null;
  d.setHours(0,0,0,0);
  return Math.round((d - today()) / 86400000);
}

function readSnooze() {
  try { return JSON.parse(localStorage.getItem(SNOOZE_KEY) || '{}'); } catch { return {}; }
}

function isSnoozed(key) {
  const s = readSnooze();
  return s[key] && (Date.now() - s[key]) < SNOOZE_MS;
}

function snooze(key) {
  const s = readSnooze();
  s[key] = Date.now();
  // Nettoyage des vieilles entrées (> 30 jours)
  Object.keys(s).forEach(k => { if (Date.now() - s[k] > 30 * 86400000) delete s[k]; });
  try { localStorage.setItem(SNOOZE_KEY, JSON.stringify(s)); } catch {}
}

// ── Collecte tous les rappels dus ──────────────────────────────
function collectReminders() {
  const reminders = [];

  // ── Voyages ──────────────────────────────────────────────────
  store.list('trips').filter(t => t.status === 'futur').forEach(t => {
    const d = daysUntil(t.start);
    if (d === null) return;

    // J-7 avec tolérance ±2 jours (affiché entre J-9 et J-5)
    if (d >= 5 && d <= 9) {
      const key = `trip-7-${t.id}`;
      if (!isSnoozed(key)) reminders.push({
        key, type: 'trip', level: 'info',
        title: `Départ dans ${d} jour${d > 1 ? 's' : ''} 🧳`,
        body:  `${t.title} — ${t.destination || ''}. Votre checklist est-elle prête ?`,
        action: 'checklists',
      });
    }

    // J-1 avec tolérance (affiché entre J-2 et J+0)
    if (d >= 0 && d <= 2) {
      const key = `trip-1-${t.id}`;
      if (!isSnoozed(key)) reminders.push({
        key, type: 'trip', level: 'warn',
        title: d === 0 ? `Départ aujourd'hui ! 🚐` : `Départ ${d === 1 ? 'demain' : 'dans 2 jours'} 🚐`,
        body:  `${t.title} — ${t.destination || ''}`,
        action: 'trips',
      });
    }
  });

  // ── Réservations ─────────────────────────────────────────────
  store.list('reservations').forEach(r => {
    const d = daysUntil(r.arrDate);
    if (d === null) return;

    // Jour J de la réservation (tolérance J+0 uniquement — événement précis)
    if (d === 0) {
      const key = `resa-0-${r.id}`;
      if (!isSnoozed(key)) reminders.push({
        key, type: 'resa', level: 'ok',
        title: `Aujourd'hui : ${esc(r.name || r.type)} 📍`,
        body:  `${r.arrTime ? `À ${r.arrTime} · ` : ''}${r.address || ''}`,
        action: 'reservations',
      });
    }

    // J-3 avec tolérance (affiché entre J-4 et J-2)
    if (d >= 2 && d <= 4) {
      const key = `resa-3-${r.id}`;
      if (!isSnoozed(key)) reminders.push({
        key, type: 'resa', level: 'info',
        title: `Réservation dans ${d} jour${d > 1 ? 's' : ''} 🎫`,
        body:  `${r.name || r.type}${r.arrTime ? ` à ${r.arrTime}` : ''}`,
        action: 'reservations',
      });
    }
  });

  return reminders;
}

function esc(s) { return String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

// ── Affichage du bandeau ────────────────────────────────────────
function showBanner(reminder, nav, onDismiss) {
  const colors = {
    ok:   'var(--ok)',
    warn: 'var(--warn)',
    info: 'var(--sage-deep)',
  };

  const banner = document.createElement('div');
  banner.className = 'reminder-banner';
  banner.style.cssText = `
    position:fixed; top:0; left:0; right:0; z-index:500;
    background:${colors[reminder.level] || colors.info};
    color:#fff; padding:12px 18px;
    display:flex; align-items:center; gap:14px;
    box-shadow:0 2px 12px rgba(0,0,0,.2);
    animation: slideDown .3s ease;
  `;
  banner.innerHTML = `
    <div style="flex:1;min-width:0">
      <b style="display:block;font-size:.95rem">${reminder.title}</b>
      <span style="font-size:.82rem;opacity:.88">${reminder.body}</span>
    </div>
    ${reminder.action ? `<button class="rb-go" style="background:rgba(255,255,255,.2);border:1px solid rgba(255,255,255,.35);
      color:#fff;border-radius:6px;padding:6px 13px;font-size:.82rem;font-weight:700;cursor:pointer;white-space:nowrap">
      Ouvrir →
    </button>` : ''}
    <button class="rb-close" style="background:transparent;border:none;color:#fff;font-size:1.3rem;
      cursor:pointer;opacity:.8;padding:0 4px;line-height:1" title="Fermer">×</button>`;

  document.body.prepend(banner);

  const close = () => {
    snooze(reminder.key);
    banner.style.opacity = '0';
    banner.style.transform = 'translateY(-100%)';
    banner.style.transition = 'all .25s';
    setTimeout(() => { banner.remove(); onDismiss(); }, 260);
  };

  banner.querySelector('.rb-close').onclick = close;
  if (reminder.action) {
    banner.querySelector('.rb-go').onclick = () => { close(); nav(reminder.action); };
  }

  // Auto-fermeture après 8 secondes
  setTimeout(close, 8000);
}

// ── Point d'entrée principal ────────────────────────────────────
// Appelé une fois après authentification dans app.js
export function checkReminders(nav) {
  if (!store.setting('remindersEnabled')) return;

  const reminders = collectReminders();
  if (!reminders.length) return;

  // Affiche les rappels l'un après l'autre avec 600ms d'intervalle
  let idx = 0;
  function showNext() {
    if (idx >= reminders.length) return;
    showBanner(reminders[idx], nav, () => {
      idx++;
      setTimeout(showNext, 600);
    });
  }
  // Petit délai pour laisser l'app se charger
  setTimeout(showNext, 1200);
}
