// Cloud sync via Supabase REST (simple sync-code, no login).
//
// ===== YEH FILE EK BAAR POORI TARAH BADLI GAYI — kyun, ye padh lo =====
//
// Purana model: "whole-snapshot last-writer-wins". Jo device push karta, cloud
// ki row uske apne snapshot se REPLACE ho jati. Do device ke saath iska matlab
// ek hi tha — jo device thoda purana hai, wo doosre ka naya data uda dega. Aur
// SyncManager ka niyam "local changes always win first" isko aur pakka kar deta
// tha: koi bhi background write (CA rush ka cycle, vocab prefetch, counter) device
// ko "badla hua" bana deti, aur wo PEHLE push karta — pull baad mein. Isi tarah
// homepage ki `cgl.home.items` baar-baar udi.
//
// Uske upar patti lagti rahi: chuninda stores ka union (absorbAdditive), shrink
// guard. Dono nakaafi the — union sirf un 4 keys ka hota tha jinke naam yahan
// likhe the, aur shrink guard poore snapshot ka size dekhta hai (2KB ki home list
// 8MB ke snapshot mein se udti to ratio hilta bhi nahi).
//
// Naya model: EK hi operation — `syncOnce()` — jo git jaisa 3-way merge karta hai
// (lib/syncmerge.js). Har device apna "base" (pichhli sync ka per-key hash) rakhta
// hai, isliye har key ke liye pata hota hai kisne badla. Ab:
//   • push/pull ka jhagda hi khatam — dono taraf ka data ek saath jud jata hai
//   • kisi key ka naam yahan likhne ki zaroorat nahi — naye stores apne aap safe
//   • cloud par likhne se pehle CAS (compare-and-swap) hota hai, isliye do device
//     ek saath sync karein to bhi koi update chupke se nahi udta
//   • har badlav se pehle is device ka local snapshot rescue mein chala jata hai
//
// PDFs/images (IndexedDB files) ab bhi sync nahi hote — unke liye file backup.
import { getSettings, saveSettings } from "./storage";
import { getAllHinglish, getHinglish, setHinglish } from "./noteshinglish";
import { mergeBooks } from "./wrongbook";
import { storeGet, storeSet, storeRemove, storeSnapshot, storeReady, rawSet, rawGet, rawKeys, rawDel, RESCUE_PREFIX } from "./bigstore";
import { LOCAL_ONLY, hashStr, hashMap, threeWayMerge, diffLocal, mergeArrays } from "./syncmerge";

const TABLE = "syncs";
const BASE_KEY = "cgl.sync.base";
const TOMB_KEY = "cgl.wrongbook.del";
const FEED_KEY = "cgl.feed.entries";
const FEED_DEL = "cgl.feed.deleted";
const HINGLISH_KEY = "cgl.notesHinglish";
const RESCUE_KEEP = 3;   // har copy poora snapshot hai — 3 se zyada rakhna IDB bhar dega

// Device-specific / churning settings fields that must NOT be synced or hashed
// (they change on every sync and would cause an endless loop).
const STRIP_SETTINGS = ["supabaseUrl", "supabaseAnonKey", "syncCode", "syncAuto", "syncLastAt", "syncRemoteAt", "syncPushedHash"];

// ---------------------------------------------------------------- snapshot ---

// Is device ka poora syncable data: { key: jsonString }.
function snapshot() {
  const ls = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k || !k.startsWith("cgl.") || LOCAL_ONLY.has(k)) continue;
    const v = storeGet(k);
    if (v == null) continue;
    if (k === "cgl.settings") {
      try { const o = JSON.parse(v) || {}; for (const f of STRIP_SETTINGS) delete o[f]; ls[k] = JSON.stringify(o); }
      catch { ls[k] = v; }
    } else ls[k] = v;
  }
  // Bulky stores (quizzes, questions, wrongbook…) IndexedDB mein hain, upar wala
  // localStorage scan unhe dekh hi nahi sakta — yahan se jodo.
  try { Object.assign(ls, storeSnapshot()); } catch { /* ignore */ }
  // Hinglish ki durable copy IndexedDB hai; upar wala scan sirf best-effort
  // mirror dekhta hai (storage bhara ho to gayab). Poori in-memory copy daalo.
  try {
    const hx = getAllHinglish();
    if (hx && Object.keys(hx).length) ls[HINGLISH_KEY] = JSON.stringify(hx);
  } catch { /* ignore */ }
  for (const k of LOCAL_ONLY) delete ls[k];
  return ls;
}

// Hash of the syncable data — only changes when real user data changes.
export function localHash() { return hashStr(JSON.stringify(snapshot())); }

// ------------------------------------------------------------------- base ----

// "Pichhli sync ke waqt har key kaisi thi" — sirf hash. Yahi merge ko bata deta
// hai ki is baar kisne kya badla. Device ka apna hai, kabhi sync nahi hota.
function getBase() {
  try { const r = localStorage.getItem(BASE_KEY); return r ? JSON.parse(r) : null; }
  catch { return null; }
}
function setBase(ls) {
  try { localStorage.setItem(BASE_KEY, JSON.stringify(hashMap(ls))); } catch { /* quota */ }
}

// --------------------------------------------------------------- readiness ---

// A local dev instance (start website.bat → localhost, ya LAN IP par phone se
// khola hua dev server) ke paas asli data nahi hota. Use cloud chhoone hi nahi
// dena — warna dev copy live data ke saath mil jati hai.
function isSyncableOrigin() {
  if (typeof window === "undefined") return false;
  const h = window.location.hostname || "";
  const privateIp = /^(10\.|127\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/;
  return !(h === "localhost" || h === "0.0.0.0" || h === "::1" || h.endsWith(".local") || privateIp.test(h));
}

// Likhte waqt sync ko rok dete hain: snapshot()+hash poore data par ghoomta hai
// (main thread, sync). Pen/solve view khula ho to wo stroke ke beech chal kar nib
// rok deta hai. Rokne se kuch khota nahi — view band hote hi sync chal jata hai.
let paused = false;
export function setSyncPaused(v) { paused = !!v; }
export function isSyncPaused() { return paused; }

export function syncReady() {
  const s = getSettings();
  // Bade stores IndexedDB se hydrate hone se PEHLE snapshot khaali dikhta hai —
  // us waqt sync karne ka matlab hota "sab delete ho gaya". Isliye hydrate hone
  // tak koi raasta nahi khulta.
  return storeReady() && isSyncableOrigin() && Boolean(s.supabaseUrl && s.supabaseAnonKey && s.syncCode);
}
export function syncStatus() { return { ready: syncReady(), lastAt: getSettings().syncLastAt || "" }; }

function base() { return String(getSettings().supabaseUrl || "").replace(/\/+$/, ""); }
function headers() {
  const key = getSettings().supabaseAnonKey;
  return { "Content-Type": "application/json", apikey: key, Authorization: `Bearer ${key}` };
}
const enc = encodeURIComponent;

// ------------------------------------------------------------------ remote ---

// Sasti jaanch: sirf row ka updated_at (data transfer nahi). null = row hi nahi.
export async function remoteInfo() {
  if (!syncReady()) return null;
  const url = `${base()}/rest/v1/${TABLE}?code=eq.${enc(getSettings().syncCode)}&select=updated_at`;
  const res = await fetch(url, { headers: headers() });
  if (!res.ok) throw new Error(`Check fail (${res.status})`);
  const rows = await res.json();
  return Array.isArray(rows) && rows[0] ? (rows[0].updated_at || null) : null;
}

// Poori row: { ls, at } — at = row ka updated_at, CAS ke liye zaroori.
async function fetchRemote() {
  const url = `${base()}/rest/v1/${TABLE}?code=eq.${enc(getSettings().syncCode)}&select=data,updated_at`;
  const res = await fetch(url, { headers: headers() });
  if (!res.ok) throw new Error(`Pull fail (${res.status}): ${(await res.text()).slice(0, 180)}`);
  const rows = await res.json();
  const row = Array.isArray(rows) ? rows[0] : null;
  if (!row) return { ls: null, at: null };
  return { ls: (row.data && row.data.localStorage) || {}, at: row.updated_at || null };
}

// Cloud par likhna — LEKIN sirf tab jab row abhi bhi wahi ho jo humne padhi thi
// (compare-and-swap). Beech mein doosre device ne likh diya to `null` lautta hai
// aur hum poora merge dobara karte hain.
//
// Ye bina CAS ke tootta hai: A aur B dono ek saath padhte hain, A likhta hai, B
// apna (purana) merged likh deta hai — A ka naya data cloud se gayab, aur A ke
// base mein wo key hai, to A use "remote ne delete kiya" samajh kar apne se bhi
// hata deta. Isliye CAS optional nahi hai.
async function writeRemote(merged, prevAt) {
  const now = new Date().toISOString();
  const code = getSettings().syncCode;
  const payload = { data: { localStorage: merged }, updated_at: now };

  if (prevAt) {
    const url = `${base()}/rest/v1/${TABLE}?code=eq.${enc(code)}&updated_at=eq.${enc(prevAt)}`;
    const res = await fetch(url, {
      method: "PATCH",
      headers: { ...headers(), Prefer: "return=representation" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`Push fail (${res.status}): ${(await res.text()).slice(0, 180)}`);
    const rows = await res.json();
    if (!Array.isArray(rows) || rows.length === 0) return null; // race — dobara merge
    return rows[0].updated_at || now;
  }

  // Row hai hi nahi — pehli baar. resolution=merge-duplicates isliye ki do device
  // ek saath pehli baar chalein to POST 409 se na mare.
  const res = await fetch(`${base()}/rest/v1/${TABLE}`, {
    method: "POST",
    headers: { ...headers(), Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ code, ...payload }),
  });
  if (!res.ok) throw new Error(`Push fail (${res.status}): ${(await res.text()).slice(0, 180)}`);
  return now;
}

// ---------------------------------------------------------------- specials ---

// Teen store aise hain jinke apne niyam hain — inhe generic union par nahi chhod
// sakte, warna haath se delete kiya hua record wapas aa jayega.
function applySpecials(merged, local, remote) {
  const L = local || {}, R = remote || {};
  const p = (s, d) => { try { return JSON.parse(s ?? "") ?? d; } catch { return d; } };

  // Wrong Questions: tombstone-aware union. Dono taraf ke tombstones jodo, phir
  // dono books ko merge karo — jo waqai delete hua wo wapas nahi aata.
  try {
    const tomb = { ...p(R[TOMB_KEY], {}), ...p(L[TOMB_KEY], {}) };
    if (Object.keys(tomb).length) merged[TOMB_KEY] = JSON.stringify(tomb);
    const book = mergeBooks(p(L["cgl.wrongbook"], []), p(R["cgl.wrongbook"], []), tomb);
    if (book.length || merged["cgl.wrongbook"]) merged["cgl.wrongbook"] = JSON.stringify(book);
  } catch { /* ignore */ }

  // Feed (Current Affairs / Static GK): entries ka union, phir tombstoned entries
  // gira do — warna jis device ne delete nahi dekha wo use zinda kar deta hai.
  try {
    const del = mergeArrays(p(L[FEED_DEL], []), p(R[FEED_DEL], []));
    if (del.length) merged[FEED_DEL] = JSON.stringify(del);
    const dead = new Set(del);
    const ent = mergeArrays(p(L[FEED_KEY], []), p(R[FEED_KEY], [])).filter((e) => e && !dead.has(e.id));
    if (ent.length || merged[FEED_KEY]) merged[FEED_KEY] = JSON.stringify(ent);
  } catch { /* ignore */ }

  // Hinglish: hamesha union (ye append-only hai — pasted text kabhi apne aap
  // delete nahi hota).
  try {
    const hx = { ...p(R[HINGLISH_KEY], {}), ...p(L[HINGLISH_KEY], {}) };
    for (const k of Object.keys(hx)) if (!hx[k]) delete hx[k];
    if (Object.keys(hx).length) merged[HINGLISH_KEY] = JSON.stringify(hx);
  } catch { /* ignore */ }

  return merged;
}

// ------------------------------------------------------------------ rescue ---

// Har badlav se PEHLE is device ka snapshot IndexedDB mein rakh do. Cloud par ye
// kabhi nahi jata. Agar kabhi kuch galat ho jaye to Settings se wapas laaya ja
// sakta hai — yahi "gadbad hui to?" ka jawab hai.
async function saveRescue(ls, why) {
  try {
    const at = new Date().toISOString();
    await rawSet(`${RESCUE_PREFIX}${at}`, JSON.stringify({ at, why, localStorage: ls }));
    const keys = (await rawKeys(RESCUE_PREFIX)).sort();
    for (const k of keys.slice(0, Math.max(0, keys.length - RESCUE_KEEP))) await rawDel(k);
  } catch { /* rescue best-effort hai — sync iske bina bhi chalega */ }
}

export async function listRescue() {
  const keys = (await rawKeys(RESCUE_PREFIX)).sort().reverse();
  const out = [];
  for (const k of keys) {
    try {
      const raw = await rawGet(k);
      const o = JSON.parse(raw);
      out.push({ key: k, at: o.at, why: o.why, keys: Object.keys(o.localStorage || {}).length, bytes: raw.length });
    } catch { /* ignore */ }
  }
  return out;
}

// Rescue copy wapas laao — MERGE karke, overwrite karke nahi. Jo aaj ka data hai
// wo bhi bachta hai aur jo uda tha wo bhi wapas aata hai.
export async function restoreRescue(key) {
  const raw = await rawGet(key);
  if (!raw) throw new Error("Ye rescue copy mil nahi rahi.");
  const old = JSON.parse(raw).localStorage || {};
  const now = snapshot();
  await saveRescue(now, "restore se pehle");
  const { merged } = threeWayMerge(now, old, null, "auto");
  applySpecials(merged, now, old);
  const { writes, deletes } = diffLocal(now, merged);
  applyLocal(writes, deletes);
  setBase({});                       // agli sync poora merge kare
  return Object.keys(writes).length;
}

// ------------------------------------------------------------------- apply ---

function applyLocal(writes, deletes) {
  for (const k of Object.keys(writes)) {
    if (LOCAL_ONLY.has(k)) continue;
    try {
      if (k === HINGLISH_KEY) {
        // Hinglish ka ghar IndexedDB hai — seedha likhne se sirf mirror badalta
        // hai aur asli copy purani reh jati hai.
        const o = JSON.parse(writes[k]) || {};
        for (const page of Object.keys(o)) if (o[page] && o[page] !== getHinglish(page)) setHinglish(page, o[page]);
        continue;
      }
      storeSet(k, writes[k]);
    } catch { /* quota */ }
  }
  for (const k of deletes) {
    if (LOCAL_ONLY.has(k)) continue;
    try { storeRemove(k); } catch { /* ignore */ }
  }
  // Is device ki sync credentials pull ke baad bhi apni hi rehni chahiye.
  const local = getSettings();
  try {
    saveSettings({
      ...getSettings(),
      supabaseUrl: local.supabaseUrl,
      supabaseAnonKey: local.supabaseAnonKey,
      syncCode: local.syncCode,
      syncAuto: local.syncAuto,
    });
  } catch { /* ignore */ }
}

// -------------------------------------------------------------- the sync -----

// Bacha-khucha safety net: agar merge ke baad bhi cloud aadhe se chhota ho raha
// hai to ruk jao. Merge ke saath aisa sirf tab hoga jab sach much bahut kuch
// delete hua ho — tab bhi ek baar ruk jana behtar hai.
const SHRINK_MIN_BYTES = 50 * 1024;
const SHRINK_RATIO = 0.5;

/**
 * Ek hi sync operation — push aur pull ka farak khatam.
 * @param {"auto"|"local"|"remote"} prefer  manual buttons ke liye jhukav
 * @param {boolean} force  shrink-guard hata do (Settings ka manual button)
 * @returns {{at, applied, sent, conflicts, wiped}}
 */
export async function syncOnce({ prefer = "auto", force = false } = {}) {
  if (!syncReady()) throw new Error("Supabase URL, anon key aur sync code — teeno bharo.");

  let prevSeenAt;
  for (let attempt = 0; attempt < 3; attempt++) {
    const { ls: remote, at: remoteAt } = await fetchRemote();
    const local = snapshot();

    // CAS ke bharose baithe rehna khatarnak hai: agar `updated_at` ka format
    // filter se match hi na kare to PATCH hamesha 0 rows lautayega aur data
    // KABHI upload nahi hoga — bina kisi error ke. Isliye ye jaanch: dobara
    // koshish ho rahi hai par row ka waqt wahi ka wahi hai, matlab koi doosra
    // device nahi likh raha — CAS khud toota hai. Tab bina shart likho.
    const casBroken = attempt > 0 && remoteAt != null && remoteAt === prevSeenAt;
    prevSeenAt = remoteAt;

    // Cloud khaali hai — pehli baar. Bas apna data upar rakh do.
    if (!remote) {
      const at = await writeRemote(local, null);
      setBase(local);
      saveSettings({ ...getSettings(), syncLastAt: at, syncRemoteAt: at, syncPushedHash: hashStr(JSON.stringify(local)) });
      return { at, applied: false, sent: true, conflicts: [], wiped: false };
    }

    const res = threeWayMerge(local, remote, getBase(), prefer);
    const merged = applySpecials(res.merged, local, remote);
    const { writes, deletes, changedLocally } = diffLocal(local, merged);

    const mergedStr = JSON.stringify(merged);
    const remoteStr = JSON.stringify(remote);
    const sendNeeded = mergedStr !== remoteStr;

    if (sendNeeded && !force && remoteStr.length > SHRINK_MIN_BYTES && mergedStr.length < remoteStr.length * SHRINK_RATIO) {
      const e = new Error(
        `Sync roka gaya: merge ke baad bhi data (${Math.round(mergedStr.length / 1024)}KB) cloud ` +
        `(${Math.round(remoteStr.length / 1024)}KB) se aadhe se kam hai. Settings kholo aur dekho.`
      );
      e.code = "shrink-guard";
      throw e;
    }

    // Local badalne se PEHLE rescue copy.
    if (changedLocally) await saveRescue(local, deletes.length ? `sync: ${deletes.length} keys hat rahi hain` : "sync");

    let at = remoteAt;
    if (sendNeeded) {
      at = await writeRemote(merged, casBroken ? null : remoteAt);
      if (at === null) continue; // doosre device ne beech mein likh diya — dobara
    }

    if (changedLocally) applyLocal(writes, deletes);
    // Base = jo is device par SACH MEIN pada hai, na ki jo humne likhna chaha
    // tha. Quota ki wajah se koi write fail ho gayi ho to agli sync use "local
    // badla" nahi samjhegi (warna wo doosre device ka change wapas palat deti).
    setBase(changedLocally ? snapshot() : merged);
    saveSettings({
      ...getSettings(),
      syncLastAt: new Date().toISOString(),
      syncRemoteAt: at || "",
      syncPushedHash: localHash(),
    });
    return { at, applied: changedLocally, sent: sendNeeded, conflicts: res.conflicts, wiped: res.wiped };
  }

  throw new Error("Sync race — doosra device bhi abhi likh raha hai. Thodi der mein apne aap ho jayega.");
}

// Purane naam, taaki Settings ke buttons aur baaki code waise hi chalein.
// Dono ab merge hi karte hain — bas jhukav alag hai, aur koi bhi kuch delete
// nahi karta.
export async function pushSync({ force = false } = {}) {
  const r = await syncOnce({ prefer: "local", force });
  return { at: r.at, absorbed: r.applied };
}
export async function pullSync() {
  const r = await syncOnce({ prefer: "remote", force: true });
  return r.at;
}
