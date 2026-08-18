// Big-store: bulky app data ka ghar IndexedDB hai, localStorage nahi.
//
// KYUN: localStorage ka hard cap ~5MB hai — badhaya nahi ja sakta. Quizzes,
// questions, wrongbook, notebook, CA entries… sab wahin the, isliye storage
// bharte hi HAR write fail hone lagti thi ("Setting the value of 'cgl.settings'
// exceeded the quota" — error settings ka nahi, poore storage ke bharne ka tha).
// IndexedDB mein sau-sau MB aate hain aur wo async hai, to quota error khatam.
//
// KAISE: ye layer localStorage ka SAME string-API deti hai (get/set/remove), to
// har module ka JSON.parse/stringify code jaisa tha waisa rehta hai —
// `localStorage.getItem(K)` ki jagah bas `storeGet(K)`.
//   • BIG_KEYS   -> in-memory cache (sync read) + IndexedDB (durable, debounced)
//   • baaki keys -> seedhe localStorage (settings/flags chhote hain)
// App boot par hydrateStore() cache bharta hai (components/StoreGate.js), aur
// purani localStorage copies ko IDB mein migrate karke LS se HATA deta hai —
// yahi quota wapas khali karta hai.
//
// IDB na chale (private mode/blocked) to sab kuch localStorage par gir jata hai
// — behaviour purana, par app kabhi tootti nahi.

const DB_NAME = "cgl-big";
const STORE = "kv";
const DEBOUNCE_MS = 250;

// Sirf bhaari, badhne wale stores. Chhote (settings, flags, counters) LS mein
// hi theek hain — unhe sync/boot par turant chahiye.
export const BIG_KEYS = [
  "cgl.quizzes",
  "cgl.feed.entries",
  "cgl.userpyq.questions",
  "cgl.study.questions",
  "cgl.study.rules",
  "cgl.wrongbook",
  "cgl.wrongbook.del",
  "cgl.notebook",
  "cgl.qreview",
  "cgl.savedanswers",
  "cgl.shortcuts",
  "cgl.vocab.ows",
  "cgl.vocab.details",
  "cgl.vocab.mine",
  "cgl.tg.wrong",
  "cgl.calc.pool",
  "cgl.notesquiz.asked",
  "cgl.srs",
  "cgl.qstats",
  "cgl.qtime",
];
const BIG = new Set(BIG_KEYS);
export function isBigKey(key) { return BIG.has(key); }

const cache = new Map();      // key -> string (JSON), big keys only
const timers = new Map();     // key -> debounce timer
let db = null;
let idbOk = true;             // false = degraded, sab localStorage par
let hydrated = false;

export function storeReady() { return hydrated; }

function openDb() {
  return new Promise((resolve, reject) => {
    let req;
    try { req = indexedDB.open(DB_NAME, 1); } catch (e) { reject(e); return; }
    req.onupgradeneeded = () => { const d = req.result; if (!d.objectStoreNames.contains(STORE)) d.createObjectStore(STORE); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
function tx(mode) { return db.transaction(STORE, mode).objectStore(STORE); }
function idbPut(key, value) {
  return new Promise((resolve, reject) => {
    const r = tx("readwrite").put(value, key);
    r.onsuccess = () => resolve(); r.onerror = () => reject(r.error);
  });
}
function idbDel(key) {
  return new Promise((resolve, reject) => {
    const r = tx("readwrite").delete(key);
    r.onsuccess = () => resolve(); r.onerror = () => reject(r.error);
  });
}
function idbAll() {
  return new Promise((resolve, reject) => {
    const out = new Map();
    const r = tx("readonly").openCursor();
    r.onsuccess = () => {
      const c = r.result;
      if (!c) { resolve(out); return; }
      if (typeof c.value === "string") out.set(c.key, c.value);
      c.continue();
    };
    r.onerror = () => reject(r.error);
  });
}

function persist(key) {
  if (!idbOk || !db) return;
  const value = cache.get(key);
  const run = async () => {
    try {
      if (value == null) await idbDel(key);
      else await idbPut(key, value);
    } catch { idbOk = false; /* degrade: aage se LS */ }
  };
  clearTimeout(timers.get(key));
  timers.set(key, setTimeout(run, DEBOUNCE_MS));
}

// Sab pending writes turant likh do (tab band/hide hone par).
export async function storeFlush() {
  const keys = [...timers.keys()];
  for (const k of keys) { clearTimeout(timers.get(k)); timers.delete(k); }
  if (!idbOk || !db) return;
  for (const k of keys) {
    const v = cache.get(k);
    try { if (v == null) await idbDel(k); else await idbPut(k, v); } catch { idbOk = false; }
  }
}

// ---- localStorage ke jaisa API (drop-in) ----
export function storeGet(key) {
  if (!BIG.has(key) || !idbOk) {
    try { return localStorage.getItem(key); } catch { return null; }
  }
  if (cache.has(key)) return cache.get(key);
  // hydrate se pehle / migrate hone se pehle purani LS copy hi sach hai
  try { return localStorage.getItem(key); } catch { return null; }
}
export function storeSet(key, value) {
  if (typeof window === "undefined") return;               // SSR: kuch mat likho
  if (!BIG.has(key) || !idbOk) { localStorage.setItem(key, value); return; }
  cache.set(key, String(value));
  persist(key);
  // Ek hi jagah rahe: LS mein purani copy padi ho to hata do (quota wapas).
  try { if (localStorage.getItem(key) != null) localStorage.removeItem(key); } catch { /* ignore */ }
}
export function storeRemove(key) {
  if (BIG.has(key)) { cache.delete(key); persist(key); }
  try { localStorage.removeItem(key); } catch { /* ignore */ }
}

// Sync/backup ke liye: saare big keys ka { key: jsonString }.
export function storeSnapshot() {
  const out = {};
  for (const k of BIG_KEYS) {
    const v = storeGet(k);
    if (v != null) out[k] = v;
  }
  return out;
}

// Boot par ek baar: IDB -> cache, aur purani localStorage copies migrate.
export async function hydrateStore() {
  if (hydrated || typeof window === "undefined") return;
  try {
    db = await openDb();
    const rows = await idbAll();
    for (const [k, v] of rows) if (BIG.has(k)) cache.set(k, v);
  } catch {
    idbOk = false; hydrated = true; return; // degraded: purana localStorage flow
  }
  // Migration: jo big key abhi LS mein hai use IDB mein le jao, phir LS se hatao.
  for (const k of BIG_KEYS) {
    let ls = null;
    try { ls = localStorage.getItem(k); } catch { /* ignore */ }
    if (ls == null) continue;
    if (!cache.has(k)) {
      cache.set(k, ls);
      try { await idbPut(k, ls); } catch { idbOk = false; break; }
    }
    try { localStorage.removeItem(k); } catch { /* ignore */ }
  }
  hydrated = true;
}

// ---- Rescue snapshots ke liye kachcha IDB access (BIG_KEYS ke bahar) ----
// Sync har badlav se PEHLE is device ka snapshot yahan rakh deta hai. Ye keys
// `rescue:` se shuru hoti hain, isliye na hydrate mein aati hain, na cache mein,
// na storeSnapshot() mein — matlab ye cloud par kabhi nahi jatin. Inka ek hi
// kaam hai: kabhi kuch gadbad ho to "wapas laao" button inhe padh sake.
export const RESCUE_PREFIX = "rescue:";

export async function rawSet(key, value) {
  if (!idbOk || !db) throw new Error("IndexedDB available nahi — rescue copy nahi ban sakti.");
  await idbPut(key, value);
}
export function rawGet(key) {
  return new Promise((resolve) => {
    if (!idbOk || !db) { resolve(null); return; }
    try {
      const r = tx("readonly").get(key);
      r.onsuccess = () => resolve(r.result ?? null);
      r.onerror = () => resolve(null);
    } catch { resolve(null); }
  });
}
export function rawKeys(prefix = "") {
  return new Promise((resolve) => {
    if (!idbOk || !db) { resolve([]); return; }
    try {
      const r = tx("readonly").getAllKeys();
      r.onsuccess = () => resolve((r.result || []).filter((k) => String(k).startsWith(prefix)));
      r.onerror = () => resolve([]);
    } catch { resolve([]); }
  });
}
export async function rawDel(key) {
  if (!idbOk || !db) return;
  try { await idbDel(key); } catch { /* ignore */ }
}
