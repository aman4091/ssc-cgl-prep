// Cloud sync via Supabase REST (simple sync-code, no login). All light cgl.* data
// (localStorage) is stored as one JSON row keyed by a secret code. PDFs/images
// (IndexedDB) are NOT synced — use the file backup for those.
import { getSettings, saveSettings } from "./storage";
import { getAllHinglish, getHinglish, setHinglish } from "./noteshinglish";
import { mergeBooks, getTombstones } from "./wrongbook";
import { storeGet, storeSet, storeSnapshot, storeReady } from "./bigstore";

const TABLE = "syncs";
const TOMB_KEY = "cgl.wrongbook.del";
const VOLATILE = new Set(["cgl.pomodoro.state"]); // live timer state — never sync
// Device-specific / churning settings fields that must NOT be synced or hashed
// (they change on every push and would cause an endless push/pull loop).
const STRIP_SETTINGS = ["supabaseUrl", "supabaseAnonKey", "syncCode", "syncAuto", "syncLastAt", "syncRemoteAt", "syncPushedHash"];

// A stable snapshot of syncable data: cgl.* keys, with the sync-management fields
// stripped out of cgl.settings so this never churns on its own.
function snapshot() {
  const ls = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k || !k.startsWith("cgl.") || VOLATILE.has(k)) continue;
    const v = storeGet(k);
    if (k === "cgl.settings") {
      try { const o = JSON.parse(v) || {}; for (const f of STRIP_SETTINGS) delete o[f]; ls[k] = JSON.stringify(o); }
      catch { ls[k] = v; }
    } else ls[k] = v;
  }
  // Bulky stores (quizzes, questions, wrongbook…) ab IndexedDB mein hain, to
  // upar wala localStorage scan unhe dekh hi nahi sakta — yahan se jodo.
  try { Object.assign(ls, storeSnapshot()); } catch { /* ignore */ }
  // Hinglish's durable copy is IndexedDB; the localStorage scan above only sees
  // the best-effort mirror (missing when storage was full). Override with the
  // FULL in-memory Hinglish so it always rides the sync, mirror or not.
  try {
    const hx = getAllHinglish();
    if (hx && Object.keys(hx).length) ls["cgl.notesHinglish"] = JSON.stringify(hx);
  } catch { /* ignore */ }
  return ls;
}
function hashStr(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}
// Hash of the syncable data — only changes when real user data changes.
export function localHash() { return hashStr(JSON.stringify(snapshot())); }

// A local dev instance (start website.bat → localhost) has NO data. With sync
// on it would push its empty snapshot and WIPE the live cloud. So localhost is
// never syncable — the dev copy stays isolated from production data.
function isSyncableOrigin() {
  if (typeof window === "undefined") return false;
  const h = window.location.hostname || "";
  // LAN IP bhi dev hi hai. Tablet par test karne ke liye dev server
  // `next dev -H 0.0.0.0` par chalta hai aur usse http://192.168.1.x:3000
  // khola jata hai — wo localhost nahi hai, to purana guard use syncable maan
  // leta tha aur dev ka khaali snapshot live cloud row ko replace kar deta.
  // Bilkul wahi haadsa jise rokne ke liye ye guard likha gaya tha.
  // Production Vercel domain hostname hai, IP nahi — wahan koi farak nahi padta.
  const privateIp = /^(10\.|127\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/;
  return !(
    h === "localhost" || h === "0.0.0.0" || h === "::1" ||
    h.endsWith(".local") || privateIp.test(h)
  );
}

// Likhte waqt sync ko rok dete hain.
//
// snapshot() + hash poora cgl.* localStorage stringify karke har character par
// ghoomta hai — sab main thread par, sync. Ye har 45 second par chalta hai, aur
// agar theek stroke ke beech chal gaya to nib wahin ruk jati hai (pen test page
// par ye "long task" aur bade coalesced number ban kar dikhta hai).
//
// Rokne se kuch khota nahi: ink khud R2 par apne raaste jati hai, aur solve view
// band karte hi sync wapas chalu hokar pointer bhej deta hai. Ulta fayda ye hai
// ki har 6 second ki writing par poora snapshot dobara upload nahi hota.
let paused = false;
export function setSyncPaused(v) { paused = !!v; }
export function isSyncPaused() { return paused; }

export function syncReady() {
  const s = getSettings();
  // Bade stores IndexedDB se hydrate hone se PEHLE snapshot khaali dikhta hai.
  // Us waqt push karne se cloud ka poora data ud jata (whole-snapshot model).
  // Isliye hydrate hone tak sync ka koi bhi raasta nahi khulta.
  return storeReady() && isSyncableOrigin() && Boolean(s.supabaseUrl && s.supabaseAnonKey && s.syncCode);
}
export function syncStatus() { return { ready: syncReady(), lastAt: getSettings().syncLastAt || "" }; }

function base() { return String(getSettings().supabaseUrl || "").replace(/\/+$/, ""); }
function headers() {
  const key = getSettings().supabaseAnonKey;
  return { "Content-Type": "application/json", apikey: key, Authorization: `Bearer ${key}` };
}

// Cheap check: just the remote row's updated_at (no data transfer). null if none.
export async function remoteInfo() {
  if (!syncReady()) return null;
  const url = `${base()}/rest/v1/${TABLE}?code=eq.${encodeURIComponent(getSettings().syncCode)}&select=updated_at`;
  const res = await fetch(url, { headers: headers() });
  if (!res.ok) throw new Error(`Check fail (${res.status})`);
  const rows = await res.json();
  return Array.isArray(rows) && rows[0] ? (rows[0].updated_at || null) : null;
}

// Fetch the remote row's localStorage blob WITHOUT applying it (used to merge
// before a push). null if none / offline.
async function fetchRemoteLS() {
  if (!syncReady()) return null;
  const url = `${base()}/rest/v1/${TABLE}?code=eq.${encodeURIComponent(getSettings().syncCode)}&select=data`;
  const res = await fetch(url, { headers: headers() });
  if (!res.ok) return null;
  const rows = await res.json();
  const row = Array.isArray(rows) ? rows[0] : null;
  return (row && row.data && row.data.localStorage) || null;
}

// The whole-snapshot push is last-writer-wins: a device pushing its snapshot
// REPLACES the cloud row, dropping any key/entry another device added that this
// one doesn't have. For the append-only "paste" stores that stings — a meaning or
// Hinglish pasted on the desktop gets wiped by the phone's next push before it can
// ever pull it. So before EVERY push we fold the cloud's copies of these stores
// into this device (union; this device wins on a real conflict, so nothing here
// is overwritten). The device that absorbs new entries reloads to show them.
function absorbAdditive(remoteLS) {
  let changed = false;
  // Vocab pasted meanings (cgl.vocab.mine): { [word]: meaning }.
  try {
    const r = JSON.parse(remoteLS["cgl.vocab.mine"] || "{}") || {};
    const l = JSON.parse(storeGet("cgl.vocab.mine") || "{}") || {};
    let m = false;
    for (const w of Object.keys(r)) { if (r[w] && !l[w]) { l[w] = r[w]; m = true; } }
    if (m) { storeSet("cgl.vocab.mine", JSON.stringify(l)); changed = true; }
  } catch { /* ignore */ }
  // Per-page Hinglish (cgl.notesHinglish): fill only pages this device has blank.
  try {
    const r = JSON.parse(remoteLS["cgl.notesHinglish"] || "{}") || {};
    for (const k of Object.keys(r)) { if (r[k] && !getHinglish(k)) { setHinglish(k, r[k]); changed = true; } }
  } catch { /* ignore */ }
  // Wrong Questions (cgl.wrongbook): poora UNION — na push kisi record ko udaye,
  // na pull.
  //
  // Ye pehle sirf ink pointer merge karta tha, aur records ka union jaan-boojh
  // kar nahi kiya tha (ki kahin delete kiya hua question wapas na aa jaye). Wo
  // faisla galat tha: computer par naya question add hua, phir tablet — jiske
  // paas purani list thi — ne push kiya, aur poora-snapshot last-writer-wins ne
  // wo naya question cloud se hi uda diya. Question kabhi nahi udna chahiye jab
  // tak khud na hataya jaye.
  //
  // Ab delete alag se darj hota hai (cgl.wrongbook.del ke tombstones), isliye
  // union safe hai: dono taraf ke records bachte hain, aur jo waqai delete kiya
  // gaya wo wapas nahi aata.
  try {
    if (mergeWrongInto(remoteLS)) changed = true;
  } catch { /* ignore */ }
  // Deleted feed entries (cgl.feed.deleted): union the tombstones, then drop any
  // tombstoned entry this device still holds. Without this a device that never
  // saw the delete pushes its whole snapshot and resurrects the entry everywhere.
  try {
    const r = JSON.parse(remoteLS["cgl.feed.deleted"] || "[]") || [];
    const l = JSON.parse(storeGet("cgl.feed.deleted") || "[]") || [];
    const merged = [...new Set([...l, ...r])];
    if (merged.length !== l.length) { storeSet("cgl.feed.deleted", JSON.stringify(merged)); changed = true; }
    if (merged.length) {
      const tomb = new Set(merged);
      const ent = JSON.parse(storeGet("cgl.feed.entries") || "[]") || [];
      const kept = ent.filter((e) => e && !tomb.has(e.id));
      if (kept.length !== ent.length) { storeSet("cgl.feed.entries", JSON.stringify(kept)); changed = true; }
    }
  } catch { /* ignore */ }
  return changed;
}

// Cloud ka wrongbook (aur uske tombstones) is device mein fold kar do.
// -> true agar kuch badla
function mergeWrongInto(remoteLS) {
  const rBook = JSON.parse(remoteLS["cgl.wrongbook"] || "[]") || [];
  const lBook = JSON.parse(storeGet("cgl.wrongbook") || "[]") || [];
  const rTomb = JSON.parse(remoteLS[TOMB_KEY] || "{}") || {};
  const lTomb = getTombstones();

  // Tombstones dono taraf ke jodo — delete kisi bhi device par hua ho, sab par lagna chahiye.
  const tomb = { ...rTomb, ...lTomb };
  const merged = mergeBooks(lBook, rBook, tomb);

  const bookChanged = JSON.stringify(merged) !== JSON.stringify(lBook);
  const tombChanged = JSON.stringify(tomb) !== JSON.stringify(lTomb);
  if (bookChanged) storeSet("cgl.wrongbook", JSON.stringify(merged));
  if (tombChanged) storeSet(TOMB_KEY, JSON.stringify(tomb));
  return bookChanged || tombChanged;
}

// Push jo cloud ka bada data chhote snapshot se replace kare — wahi haadsa jo
// baar-baar hota hai (purana/adha-bhara device khol liya, aur naya data ud gaya).
// Whole-snapshot model mein iska pakka ilaaj per-record sync hai; tab tak ye
// guard: agar mera snapshot cloud se BAHUT chhota hai to push rok do.
// Settings ka "Push now" force=true bhejta hai (wahan user jaan-boojh kar
// apne device ko sach maan raha hai).
const SHRINK_MIN_BYTES = 50 * 1024; // itne chhote cloud par guard bekar hai
const SHRINK_RATIO = 0.5;           // aadhe se kam reh gaya = shak

export async function pushSync({ force = false } = {}) {
  if (!syncReady()) throw new Error("Supabase URL, anon key aur sync code — teeno bharo.");
  // Fold the cloud's pasted meanings/Hinglish in first, so this push can't clobber
  // another device's additions (and this device gains them too).
  let absorbed = false;
  let remoteSize = 0;
  try {
    const remoteLS = await fetchRemoteLS();
    if (remoteLS) { absorbed = absorbAdditive(remoteLS); remoteSize = JSON.stringify(remoteLS).length; }
  } catch { /* offline / transient — push what we have */ }
  const now = new Date().toISOString();
  const ls = snapshot();
  const localSize = JSON.stringify(ls).length;
  if (!force && remoteSize > SHRINK_MIN_BYTES && localSize < remoteSize * SHRINK_RATIO) {
    const e = new Error(
      `Push roka gaya: is device ka data (${Math.round(localSize / 1024)}KB) cloud ` +
      `(${Math.round(remoteSize / 1024)}KB) se bahut chhota hai. Pehle Settings → Pull karo. ` +
      `Sach mein yahi sahi copy hai to Settings → Push now dabao.`
    );
    e.code = "shrink-guard";
    throw e;
  }
  const hash = hashStr(JSON.stringify(ls));
  const res = await fetch(`${base()}/rest/v1/${TABLE}`, {
    method: "POST",
    headers: { ...headers(), Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ code: getSettings().syncCode, data: { localStorage: ls }, updated_at: now }),
  });
  if (!res.ok) throw new Error(`Push fail (${res.status}): ${(await res.text()).slice(0, 180)}`);
  saveSettings({ ...getSettings(), syncLastAt: now, syncPushedHash: hash, syncRemoteAt: now });
  return { at: now, absorbed };
}

export async function pullSync() {
  if (!syncReady()) throw new Error("Supabase URL, anon key aur sync code — teeno bharo.");
  const url = `${base()}/rest/v1/${TABLE}?code=eq.${encodeURIComponent(getSettings().syncCode)}&select=data,updated_at`;
  const res = await fetch(url, { headers: headers() });
  if (!res.ok) throw new Error(`Pull fail (${res.status}): ${(await res.text()).slice(0, 180)}`);
  const rows = await res.json();
  if (!Array.isArray(rows) || rows.length === 0) return null; // nothing on the cloud yet
  applyLocalStorage((rows[0].data && rows[0].data.localStorage) || {});
  // mark this device as in-sync with the remote version (hash of what we now hold)
  saveSettings({ ...getSettings(), syncLastAt: new Date().toISOString(), syncRemoteAt: rows[0].updated_at || "", syncPushedHash: localHash() });
  return rows[0].updated_at || null;
}

// Write pulled keys back, but keep THIS device's own sync credentials/toggle so a
// pull never wipes the settings that make syncing work here.
function applyLocalStorage(ls) {
  const local = getSettings();

  // Wrong book PULL par bhi union hota hai, overwrite nahi.
  //
  // Push wala raasta to mergeWrongInto() se bach gaya, par pull yahan cloud ki
  // list seedha likh deta tha — yaani jo question is device par abhi bana hai
  // aur push hone se pehle pull aa gaya, wo bhi ud jata. Ek hi jagah galti
  // rehne dena kaafi hai record kho dene ke liye, isliye dono taraf union.
  try { mergeWrongInto(ls); } catch { /* ignore */ }

  for (const k of Object.keys(ls)) {
    if (VOLATILE.has(k)) continue;
    if (k === "cgl.wrongbook" || k === TOMB_KEY) continue; // upar merge ho chuka
    try { storeSet(k, ls[k]); } catch { /* quota */ }
  }

  // Feed tombstones: pull par bhi union karo aur tombstoned entries gira do —
  // warna purane cloud snapshot se deleted entry agle push tak wapas dikhti hai.
  try {
    const r = JSON.parse(ls["cgl.feed.deleted"] || "[]") || [];
    const l = JSON.parse(storeGet("cgl.feed.deleted") || "[]") || [];
    const merged = [...new Set([...l, ...r])];
    storeSet("cgl.feed.deleted", JSON.stringify(merged));
    if (merged.length) {
      const tomb = new Set(merged);
      const ent = JSON.parse(storeGet("cgl.feed.entries") || "[]") || [];
      const kept = ent.filter((e) => e && !tomb.has(e.id));
      if (kept.length !== ent.length) storeSet("cgl.feed.entries", JSON.stringify(kept));
    }
  } catch { /* ignore */ }
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
