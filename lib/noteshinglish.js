// Per-page Hinglish that the reader pastes in themselves, to read alongside a
// notes page. Keyed by the page's scan URL + book page (unique per book).
//
// RELIABILITY: this used to live only in the localStorage key `cgl.notesHinglish`.
// That store has a hard ~5MB quota (and Safari/mobile can evict it), so once the
// browser filled up, `setItem` threw and the paste was silently dropped — new
// saves "didn't stick" and pages showed blank. Now the DURABLE copy lives in
// IndexedDB (big quota, same place the app keeps PDFs), with:
//   • an in-memory cache for SYNCHRONOUS reads (the render path), updated the
//     instant you save — so a paste always shows immediately, quota or not;
//   • a best-effort localStorage MIRROR so it still rides the Supabase sync
//     snapshot + the file backup when there's room.
// Reads merge both stores; writes go to IndexedDB (durable) + localStorage (mirror).

const KEY = "cgl.notesHinglish";
const DB_NAME = "cgl-hinglish";
const STORE = "hx";

// ---- in-memory cache (synchronous source of truth for the UI) ----
let cache = null;
let hydrated = false;
const subs = new Set();
function notify() { for (const fn of subs) { try { fn(); } catch { /* ignore */ } } }

// Subscribe to store changes (a save, or the async IndexedDB hydration on load).
// The reader uses this to re-render so late-loaded pages appear. Returns an
// unsubscribe fn.
export function subscribeHinglish(fn) { subs.add(fn); return () => subs.delete(fn); }

function lsReadAll() {
  if (typeof window === "undefined") return {};
  try {
    const o = JSON.parse(localStorage.getItem(KEY) || "{}");
    return o && typeof o === "object" ? o : {};
  } catch {
    return {};
  }
}
function lsWriteAll(all) {
  try { localStorage.setItem(KEY, JSON.stringify(all)); return true; }
  catch { return false; } // full/blocked — IndexedDB still has the durable copy
}

// Seed the cache synchronously from localStorage (so existing/synced data shows
// at once), then merge in IndexedDB asynchronously.
function ensureCache() {
  if (cache) return cache;
  cache = lsReadAll();
  hydrateFromIdb();
  return cache;
}

// ---- IndexedDB (durable, own database so it never clashes with filestore) ----
function openDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") return reject(new Error("no idb"));
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function idbGetAll() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const out = {};
    const req = tx.objectStore(STORE).openCursor();
    req.onsuccess = () => {
      const c = req.result;
      if (c) { out[c.key] = c.value; c.continue(); }
      else resolve(out);
    };
    req.onerror = () => reject(req.error);
  });
}
async function idbPut(k, v) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(v, k);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

async function hydrateFromIdb() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const idb = await idbGetAll();
    let changed = false;
    // IndexedDB is the durable copy → fold its entries into the cache.
    for (const k of Object.keys(idb)) {
      if (cache[k] !== idb[k]) { cache[k] = idb[k]; changed = true; }
    }
    // Back-fill: any entry that exists only in the localStorage mirror (e.g.
    // arrived via sync from another device) gets copied into IndexedDB so the
    // durable store is complete.
    for (const k of Object.keys(cache)) {
      if (idb[k] !== cache[k]) idbPut(k, cache[k]).catch(() => {});
    }
    if (changed) { lsWriteAll(cache); notify(); }
  } catch {
    // IndexedDB unavailable (very old browser / private mode) — the localStorage
    // cache still works as before.
  }
}

// Stable per-page key. Parmar page numbers are unique across the whole book and
// all its subjects share one scanBase, so this is unique and stable.
export function hinglishKey(book, page) {
  return `${book?.scanBase || ""}#${page?.book_page}`;
}

export function getHinglish(k) {
  return String(ensureCache()[k] || "");
}

// Save trimmed text. An empty/blank value is NEVER written — it would only wipe
// the reader's own paste; a blank save is treated as "no change" by the caller.
// The cache is updated synchronously (so the UI shows the paste at once), the
// durable copy goes to IndexedDB, and localStorage is mirrored best-effort for
// sync/backup. Returns the saved text (the cache always accepts it, so a full
// localStorage no longer loses the paste).
export function setHinglish(k, text) {
  const t = String(text || "").trim();
  if (!t) return "";
  const all = ensureCache();
  all[k] = t;
  lsWriteAll(all);              // mirror for sync/backup (ok if this fails)
  idbPut(k, t).catch(() => {}); // durable copy
  notify();
  return t;
}
