// Cloud sync via Supabase REST (simple sync-code, no login). All light cgl.* data
// (localStorage) is stored as one JSON row keyed by a secret code. PDFs/images
// (IndexedDB) are NOT synced — use the file backup for those.
import { getSettings, saveSettings } from "./storage";
import { getAllHinglish, getHinglish, setHinglish } from "./noteshinglish";

const TABLE = "syncs";
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
    const v = localStorage.getItem(k);
    if (k === "cgl.settings") {
      try { const o = JSON.parse(v) || {}; for (const f of STRIP_SETTINGS) delete o[f]; ls[k] = JSON.stringify(o); }
      catch { ls[k] = v; }
    } else ls[k] = v;
  }
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
  return isSyncableOrigin() && Boolean(s.supabaseUrl && s.supabaseAnonKey && s.syncCode);
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
    const l = JSON.parse(localStorage.getItem("cgl.vocab.mine") || "{}") || {};
    let m = false;
    for (const w of Object.keys(r)) { if (r[w] && !l[w]) { l[w] = r[w]; m = true; } }
    if (m) { localStorage.setItem("cgl.vocab.mine", JSON.stringify(l)); changed = true; }
  } catch { /* ignore */ }
  // Per-page Hinglish (cgl.notesHinglish): fill only pages this device has blank.
  try {
    const r = JSON.parse(remoteLS["cgl.notesHinglish"] || "{}") || {};
    for (const k of Object.keys(r)) { if (r[k] && !getHinglish(k)) { setHinglish(k, r[k]); changed = true; } }
  } catch { /* ignore */ }
  // Wrong Questions (cgl.wrongbook): sirf handwriting ka pointer merge karo.
  //
  // Zarurat ye hai: tablet par stylus se likhi writing ka pointer (inkUrl/inkRev)
  // record par baithta hai. Desktop ka wrongbook purana ho aur wo kisi aur wajah
  // se push kar de, to poora-snapshot last-writer-wins us pointer ko mita deta —
  // strokes R2 par pade reh jate aur unhe koi point hi nahi karta. Isliye har
  // push se pehle cloud ka naya ink pointer yahan fold kar lo.
  //
  // Jo record cloud par hai par yahan NAHI, use jaan-boojh kar chhod dete hain.
  // Upar wale do stores append-only hain, ye nahi — yahan delete asli hai. Cloud
  // se missing record wapas le aate to is device par kiya hua delete agle push
  // mein undo ho jata, yaani delete kabhi kaam hi na karta.
  try {
    const r = JSON.parse(remoteLS["cgl.wrongbook"] || "[]") || [];
    const l = JSON.parse(localStorage.getItem("cgl.wrongbook") || "[]") || [];
    const byId = new Map(l.map((x) => [x.id, x]));
    let m = false;
    for (const rr of r) {
      const lr = byId.get(rr.id);
      if (!lr) continue;
      const rRev = rr.inkRev || 0;
      const lRev = lr.inkRev || 0;
      if (rRev > lRev || (rRev === lRev && rRev > 0 && (rr.inkAt || "") > (lr.inkAt || ""))) {
        const mine = lr.inkUrl || ""; // overwrite se PEHLE, warna inkPrev naya hi URL pakad leta
        lr.inkUrl = rr.inkUrl;
        lr.inkAt = rr.inkAt;
        lr.inkRev = rr.inkRev;
        lr.inkStrokes = rr.inkStrokes;
        lr.inkH = rr.inkH;
        lr.inkPrev = mine || lr.inkPrev || "";
        m = true;
      }
    }
    if (m) {
      localStorage.setItem("cgl.wrongbook", JSON.stringify(l));
      changed = true;
    }
  } catch { /* ignore */ }
  return changed;
}

export async function pushSync() {
  if (!syncReady()) throw new Error("Supabase URL, anon key aur sync code — teeno bharo.");
  // Fold the cloud's pasted meanings/Hinglish in first, so this push can't clobber
  // another device's additions (and this device gains them too).
  let absorbed = false;
  try { const remoteLS = await fetchRemoteLS(); if (remoteLS) absorbed = absorbAdditive(remoteLS); }
  catch { /* offline / transient — push what we have */ }
  const now = new Date().toISOString();
  const ls = snapshot();
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
  for (const k of Object.keys(ls)) {
    if (VOLATILE.has(k)) continue;
    try { localStorage.setItem(k, ls[k]); } catch { /* quota */ }
  }
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
