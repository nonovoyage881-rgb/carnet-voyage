// js/lib/tripOwners.js — Attribution des voyages aux profils famille
// ---------------------------------------------------------------------
// Ce module centralise la gestion du membre qui choisit un voyage.
// Pour ajouter un membre plus tard, il suffit de l'ajouter dans la
// collection 'members' : les voyages enregistrent ownerId + ownerName.
// ---------------------------------------------------------------------
import { store } from '../store.js';
import { esc, daysUntil } from './ui.js';

export function currentMember() {
  const memberId = store.setting('memberId');
  const me = store.setting('me') || '';
  return (memberId && store.doc('members', memberId))
    || store.list('members').find(m => m.name === me)
    || null;
}

export function currentOwnerPatch() {
  const member = currentMember();
  const name = member?.name || store.setting('me') || 'Profil';

  return {
    ownerId: member?.id || store.setting('memberId') || null,
    ownerName: name,
    ownerRole: member?.role || store.setting('myRole') || '',
    ownerColor: member?.color || '',
    selectedById: member?.id || store.setting('memberId') || null,
    selectedByName: name,
    selectedAt: Date.now(),
  };
}

export function assignTripToCurrentUser(tripId) {
  if (!tripId || !store.doc('trips', tripId)) return null;
  const patch = currentOwnerPatch();
  store.update('trips', tripId, patch);
  return patch;
}

export function tripOwner(trip) {
  if (!trip) return null;

  const member = (trip.ownerId && store.doc('members', trip.ownerId))
    || (trip.selectedById && store.doc('members', trip.selectedById))
    || null;

  const name = member?.name || trip.ownerName || trip.selectedByName || '';
  if (!name) return null;

  return {
    id: member?.id || trip.ownerId || trip.selectedById || null,
    name,
    role: member?.role || trip.ownerRole || '',
    color: member?.color || trip.ownerColor || 'var(--sage-deep)',
  };
}

export function tripOwnerName(trip, fallback = 'Non attribué') {
  return tripOwner(trip)?.name || fallback;
}

export function ownerLabel(trip) {
  const owner = tripOwner(trip);
  return owner ? `${owner.name} a choisi le voyage` : 'Voyage non attribué';
}

export function familyTripMessage(trip) {
  const owner = tripOwner(trip);
  const name = owner?.name || store.setting('me') || 'vous';
  const d = trip?.start ? daysUntil(trip.start) : null;

  if (trip?.status === 'encours' || d === 0) return `Bon voyage ${name} !`;
  if (typeof d === 'number' && !Number.isNaN(d) && d > 0 && d <= 14) return 'Plus que quelques jours avant les vacances !';
  if (typeof d === 'number' && !Number.isNaN(d) && d > 14) return `${name} prépare déjà ses valises !`;
  return 'Bientôt en vacances 🌴';
}

export function ownerMiniLineHTML(trip) {
  const owner = tripOwner(trip);
  return owner ? ` · 👤 ${esc(owner.name)}` : '';
}

export function ownerBadgeHTML(trip, { showMessage = true } = {}) {
  const owner = tripOwner(trip);
  const name = owner?.name || 'Non attribué';
  const initial = name.slice(0, 1).toUpperCase() || '?';
  const color = owner?.color || 'var(--border)';

  return `
    <div style="display:flex;align-items:center;gap:8px;margin-top:8px;color:var(--ink-soft);font-size:.84rem">
      <span style="width:24px;height:24px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;background:${esc(color)};color:#fff;font-weight:800;font-size:.75rem">${esc(initial)}</span>
      <span>
        <b>${owner ? `${esc(owner.name)} a choisi ce voyage` : 'Voyage non attribué'}</b>
        ${showMessage ? `<br><small style="color:var(--ink-faint)">${esc(familyTripMessage(trip))}</small>` : ''}
      </span>
    </div>`;
}
