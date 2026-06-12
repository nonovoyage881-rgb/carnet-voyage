// js/store.js — couche de données réactive
// Deux modes possibles, pilotés par js/config.js :
//   • mode LOCAL (défaut)  : tout est stocké dans le navigateur (localStorage).
//   • mode FIREBASE        : données communes synchronisées en temps réel
//                            (compte partagé). Voir initFirebase() + README.
import { uid } from './lib/ui.js';
import { SEED } from './seed.js';
import { firebaseConfig, USE_FIREBASE } from './config.js';

const KEY = 'cvs_data_v1';        // données (mode local)
const DEVICE_KEY = 'cvs_device_v1'; // réglages propres à l'appareil (les 2 modes)
const listeners = new Set();

// Réglages qui restent TOUJOURS propres à l'appareil, jamais partagés :
const LOCAL_SETTINGS = ['me', 'memberId', 'theme', 'myRole', 'activeTripId'];

// Collections synchronisées (déduites du jeu de démo + extras connus)
const COLLECTIONS = Array.from(new Set([
  ...Object.keys(SEED).filter(k => k !== 'settings'),
  'journal',
  'programs',
]));

let mode = 'local';
let db = null, auth = null, fb = null;   // remplis en mode Firebase
let bootstrapped = false;

let state = loadLocal();

/* ---------- Persistance locale ---------- */
function loadLocal() {
  let base;
  try {
    const raw = localStorage.getItem(KEY);
    base = raw ? JSON.parse(raw) : null;
  } catch (e) { base = null; }
  if (!base) {
    base = structuredClone(SEED);
    try { localStorage.setItem(KEY, JSON.stringify(base)); } catch (e) {}
  }
  // applique les réglages d'appareil par-dessus
  try {
    const dev = JSON.parse(localStorage.getItem(DEVICE_KEY) || '{}');
    base.settings = { ...base.settings, ...dev };
  } catch (e) {}
  return base;
}

function saveDeviceSettings() {
  const dev = {};
  for (const k of LOCAL_SETTINGS) if (state.settings?.[k] !== undefined) dev[k] = state.settings[k];
  try { localStorage.setItem(DEVICE_KEY, JSON.stringify(dev)); } catch (e) {}
}

function persistLocal() {
  if (mode === 'local') {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  }
  saveDeviceSettings();
}

function notify() { listeners.forEach(fn => fn(state)); }

function commit() { persistLocal(); notify(); }

/* ---------- API publique (identique dans les deux modes) ---------- */
export const store = {
  get mode() { return mode; },
  get all() { return state; },

  list(coll) { return state[coll] || []; },
  doc(coll, id) { return (state[coll] || []).find(x => x.id === id); },

  add(coll, obj) {
    if (!state[coll]) state[coll] = [];
    const rec = { id: uid(), createdAt: Date.now(), ...obj };
    state[coll].push(rec);
    commit();
    if (mode === 'firebase') fbWrite(coll, rec);
    return rec;
  },

  update(coll, id, patch) {
    const i = (state[coll] || []).findIndex(x => x.id === id);
    if (i > -1) {
      state[coll][i] = { ...state[coll][i], ...patch };
      commit();
      if (mode === 'firebase') fbWrite(coll, state[coll][i]);
      return state[coll][i];
    }
  },

  remove(coll, id) {
    if (!state[coll]) return;
    state[coll] = state[coll].filter(x => x.id !== id);
    commit();
    if (mode === 'firebase') fbDelete(coll, id);
  },

  setting(k, v) {
    if (v === undefined) return state.settings?.[k];
    state.settings = { ...state.settings, [k]: v };
    commit();
    if (mode === 'firebase' && !LOCAL_SETTINGS.includes(k)) fbSetting(k, v);
  },

  activeTrip() {
    const id = state.settings?.activeTripId;
    return this.doc('trips', id) || (state.trips || [])[0];
  },

  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },

  reset() {
    // Ne touche QUE l'appareil (en mode Firebase, le cloud n'est pas effacé).
    try { localStorage.removeItem(KEY); } catch (e) {}
    // BUG-07 : remettre bootstrapped à false pour permettre un re-bootstrap correct
    bootstrapped = false;
    if (mode === 'local') { state = loadLocal(); commit(); }
  },
  export() { return JSON.stringify(state, null, 2); },
  import(json, { syncCloud = false } = {}) {
    state = JSON.parse(json);
    commit();
    // BUG-09 : ne pousser vers le cloud que si explicitement demandé
    // (settings.js passe syncCloud:true uniquement après confirmation de l'utilisateur)
    if (mode === 'firebase' && syncCloud) pushAllToCloud();
  },

  /* ---------- Firebase ---------- */
  isFirebaseConfigured() {
    return !!(USE_FIREBASE && firebaseConfig && firebaseConfig.apiKey && firebaseConfig.projectId);
  },

  // Charge le SDK et initialise. À appeler au démarrage si configuré.
  async initFirebase() {
    if (!this.isFirebaseConfigured()) return false;
    const appMod  = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js');
    const authMod = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js');
    const fsMod   = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
    const app = appMod.initializeApp(firebaseConfig);
    auth = authMod.getAuth(app);
    db   = fsMod.getFirestore(app);
    fb   = { ...authMod, ...fsMod };
    mode = 'firebase';
    return true;
  },

  onAuth(cb) { if (auth && fb) return fb.onAuthStateChanged(auth, cb); },
  currentUser() { return auth?.currentUser || null; },

  // --- Médias (photos/PDF) stockés dans Firestore, à la demande --------
  //  (collection 'media' : un document par fichier, chargé seulement
  //   quand on en a besoin — pas via onSnapshot. Protégé par les mêmes
  //   règles que le reste. Évite Firebase Storage, qui est devenu payant.)
  async mediaSaveCloud(id, payload) {
    if (mode !== 'firebase' || !db || !fb) return false;
    try { await fb.setDoc(fb.doc(db, 'media', id), payload); return true; }
    catch (e) { console.warn('media cloud save', e); return false; }
  },
  async mediaLoadCloud(id) {
    if (mode !== 'firebase' || !db || !fb) return null;
    try { const s = await fb.getDoc(fb.doc(db, 'media', id)); return s.exists() ? s.data() : null; }
    catch (e) { return null; }
  },
  async mediaDeleteCloud(id) {
    if (mode !== 'firebase' || !db || !fb) return;
    try { await fb.deleteDoc(fb.doc(db, 'media', id)); } catch (e) {}
  },
  async signIn(email, pwd) { return fb.signInWithEmailAndPassword(auth, email, pwd); },
  async signUp(email, pwd) { return fb.createUserWithEmailAndPassword(auth, email, pwd); },
  async signOutFb() { try { await fb.signOut(auth); } catch (e) {} },

  // Branche l'écoute temps réel sur toutes les collections + réglages partagés.
  // (appelée par app.js une fois l'utilisateur connecté)
  async startSync() {
    if (mode !== 'firebase' || !db || !fb) return;
    // 1) si la base cloud est vide, on l'amorce avec les données de cet appareil
    await bootstrapIfEmpty();
    // 2) écoute temps réel
    for (const coll of COLLECTIONS) {
      fb.onSnapshot(fb.collection(db, coll), (snap) => {
        state[coll] = snap.docs.map(d => d.data());
        notify();
      });
    }
    fb.onSnapshot(fb.doc(db, '_meta', 'settings'), (snap) => {
      const shared = snap.exists() ? (snap.data() || {}) : {};
      // on garde les réglages d'appareil, on superpose les partagés
      const dev = {};
      for (const k of LOCAL_SETTINGS) if (state.settings?.[k] !== undefined) dev[k] = state.settings[k];
      state.settings = { ...shared, ...dev };
      notify();
    });
  },
};

/* ---------- Helpers Firebase (écritures) ---------- */
function fbWrite(coll, rec) {
  try { fb.setDoc(fb.doc(db, coll, rec.id), JSON.parse(JSON.stringify(rec))); } catch (e) { console.warn('sync write', e); }
}
function fbDelete(coll, id) {
  try { fb.deleteDoc(fb.doc(db, coll, id)); } catch (e) { console.warn('sync delete', e); }
}
function fbSetting(k, v) {
  try { fb.setDoc(fb.doc(db, '_meta', 'settings'), { [k]: v }, { merge: true }); } catch (e) { console.warn('sync setting', e); }
}

async function bootstrapIfEmpty() {
  if (bootstrapped) return;
  bootstrapped = true;
  try {
    const snap = await fb.getDocs(fb.collection(db, 'members'));
    if (!snap.empty) return;           // le cloud contient déjà des données
    await pushAllToCloud();            // sinon on envoie l'état local actuel
  } catch (e) { console.warn('bootstrap', e); }
}

async function pushAllToCloud() {
  if (mode !== 'firebase' || !db || !fb) return;
  try {
    const batch = fb.writeBatch(db);
    for (const coll of COLLECTIONS) {
      for (const rec of (state[coll] || [])) {
        if (rec && rec.id) batch.set(fb.doc(db, coll, rec.id), JSON.parse(JSON.stringify(rec)));
      }
    }
    // réglages partagés (tout sauf ceux propres à l'appareil)
    const shared = {};
    for (const [k, v] of Object.entries(state.settings || {})) {
      if (!LOCAL_SETTINGS.includes(k)) shared[k] = v;
    }
    batch.set(fb.doc(db, '_meta', 'settings'), shared, { merge: true });
    await batch.commit();
  } catch (e) { console.warn('pushAllToCloud', e); }
}
