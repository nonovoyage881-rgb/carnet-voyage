// js/lib/media.js — stockage des fichiers (photos & PDF).
//  • Cache local rapide via IndexedDB (hors-ligne).
//  • En mode Firebase : copie aussi le fichier dans Firestore (collection
//    'media', en base64) pour le partager entre tous les appareils —
//    sans Firebase Storage (devenu payant). Les images sont compressées
//    pour rester sous la limite d'un document Firestore (~1 Mo).
import { store } from '../store.js';

const DB_NAME = 'cvs-media';
const STORE = 'files';
const PUSHED_KEY = 'cvs_media_pushed';
const MAX_DOC = 1000000; // ~1 Mo : au-delà, on garde le fichier en local seulement
let _db = null;
const _urls = new Map();
const _mem = new Map();

function hasIDB() { return typeof indexedDB !== 'undefined'; }
function uid() { return 'f' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

function openDB() {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => { const db = req.result; if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' }); };
    req.onsuccess = () => { _db = req.result; resolve(_db); };
    req.onerror = () => reject(req.error);
  });
}
function putEntry(entry) {
  if (!hasIDB()) { _mem.set(entry.id, entry); return Promise.resolve(); }
  return openDB().then(db => new Promise((res, rej) => {
    const tx = db.transaction(STORE, 'readwrite'); tx.objectStore(STORE).put(entry);
    tx.oncomplete = res; tx.onerror = () => rej(tx.error);
  }));
}
function getEntry(id) {
  if (!hasIDB()) return Promise.resolve(_mem.get(id) || null);
  return openDB().then(db => new Promise((res) => {
    const tx = db.transaction(STORE, 'readonly'); const r = tx.objectStore(STORE).get(id);
    r.onsuccess = () => res(r.result || null); r.onerror = () => res(null);
  }));
}
function allEntries() {
  if (!hasIDB()) return Promise.resolve([..._mem.values()]);
  return openDB().then(db => new Promise((res) => {
    const tx = db.transaction(STORE, 'readonly'); const r = tx.objectStore(STORE).getAll();
    r.onsuccess = () => res(r.result || []); r.onerror = () => res([]);
  }));
}

function blobToDataURL(blob) {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(blob); });
}
async function dataURLToBlob(dataURL) { return (await fetch(dataURL)).blob(); }

function pushedSet() { try { return new Set(JSON.parse(localStorage.getItem(PUSHED_KEY) || '[]')); } catch (e) { return new Set(); } }
function markPushed(id) { const s = pushedSet(); s.add(id); try { localStorage.setItem(PUSHED_KEY, JSON.stringify([...s])); } catch (e) {} }

function compressImage(file) {
  return new Promise((resolve) => {
    const img = new Image(); const url = URL.createObjectURL(file);
    img.onload = () => {
      const max = 1200; let { width, height } = img;
      if (width > max || height > max) { const r = Math.min(max / width, max / height); width = Math.round(width * r); height = Math.round(height * r); }
      const c = document.createElement('canvas'); c.width = width; c.height = height;
      c.getContext('2d').drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      c.toBlob((b) => resolve(b || file), 'image/jpeg', 0.75);
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

async function pushToCloud(id, meta, blob) {
  if (store.mode !== 'firebase') return;
  try {
    const data = await blobToDataURL(blob);
    if (data.length > MAX_DOC) { markPushed(id); return; } // trop volumineux -> reste local
    const ok = await store.mediaSaveCloud(id, { id, name: meta.name, type: meta.type, mime: meta.mime, data });
    if (ok) markPushed(id);
  } catch (e) {}
}

export const media = {
  async save(file) {
    const isImage = /^image\//.test(file.type);
    const blob = isImage ? await compressImage(file) : file;
    const entry = {
      id: uid(), name: file.name || (isImage ? 'photo.jpg' : 'fichier'),
      type: isImage ? 'image' : 'file', mime: blob.type || file.type || 'application/octet-stream',
      size: blob.size, blob, createdAt: Date.now(),
    };
    await putEntry(entry);
    pushToCloud(entry.id, entry, blob);     // envoi cloud en arrière-plan
    const { blob: _b, ...meta } = entry;
    return meta;
  },

  async get(id) { return id ? getEntry(id) : null; },

  async url(id) {
    if (!id) return null;
    if (_urls.has(id)) return _urls.get(id);
    let e = await getEntry(id);
    if (e && e.blob) { const u = URL.createObjectURL(e.blob); _urls.set(id, u); return u; }
    // pas en local : on tente le cloud (autre appareil qui a importé la photo)
    if (store.mode === 'firebase') {
      const c = await store.mediaLoadCloud(id);
      if (c && c.data) {
        const blob = await dataURLToBlob(c.data);
        try { await putEntry({ id, name: c.name, type: c.type, mime: c.mime, blob, createdAt: Date.now() }); } catch (e2) {}
        markPushed(id);
        const u = URL.createObjectURL(blob); _urls.set(id, u); return u;
      }
    }
    return null;
  },

  async remove(id) {
    if (_urls.has(id)) { URL.revokeObjectURL(_urls.get(id)); _urls.delete(id); }
    if (hasIDB()) { try { const db = await openDB(); await new Promise((res) => { const tx = db.transaction(STORE, 'readwrite'); tx.objectStore(STORE).delete(id); tx.oncomplete = res; tx.onerror = res; }); } catch (e) {} }
    else { _mem.delete(id); }
    store.mediaDeleteCloud(id);
  },

  // Envoie vers le cloud les fichiers présents localement mais pas encore copiés
  // (sert à partager les photos importées AVANT l'activation de la synchro).
  async syncLocalToCloud() {
    if (store.mode !== 'firebase') return;
    const pushed = pushedSet();
    const entries = await allEntries();
    for (const e of entries) {
      if (!e || !e.id || !e.blob || pushed.has(e.id)) continue;
      await pushToCloud(e.id, e, e.blob);
    }
  },

  async hydrate(root) {
    for (const node of root.querySelectorAll('[data-media]')) {
      const u = await this.url(node.getAttribute('data-media'));
      if (u) { if (node.tagName === 'IMG') node.src = u; else node.style.backgroundImage = `url(${u})`; }
    }
    for (const a of root.querySelectorAll('[data-media-file]')) {
      const u = await this.url(a.getAttribute('data-media-file'));
      if (u) a.href = u;
    }
  },
};
