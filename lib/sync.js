// Cloud sync via Supabase REST (simple sync-code, no login). All light cgl.* data
// (localStorage) is stored as one JSON row keyed by a secret code. PDFs/images
// (IndexedDB) are NOT synced — use the file backup for those.
import { getSettings, saveSettings } from "./storage";

const TABLE = "syncs";
const VOLATILE = new Set(["cgl.pomodoro.state"]); // live timer state — never sync

function collect() {
  const ls = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith("cgl.") && !VOLATILE.has(k)) ls[k] = localStorage.getItem(k);
  }
  return ls;
}
function hashStr(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}
// Hash of the current local data — changes whenever anything syncable changes.
export function localHash() { return hashStr(JSON.stringify(collect())); }

export function syncReady() {
  const s = getSettings();
  return Boolean(s.supabaseUrl && s.supabaseAnonKey && s.syncCode);
}
export function syncStatus() {
  return { ready: syncReady(), lastAt: getSettings().syncLastAt || "" };
}

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

export async function pushSync() {
  if (!syncReady()) throw new Error("Supabase URL, anon key aur sync code — teeno bharo.");
  const now = new Date().toISOString();
  const ls = collect();
  const hash = hashStr(JSON.stringify(ls));
  const res = await fetch(`${base()}/rest/v1/${TABLE}`, {
    method: "POST",
    headers: { ...headers(), Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ code: getSettings().syncCode, data: { localStorage: ls }, updated_at: now }),
  });
  if (!res.ok) throw new Error(`Push fail (${res.status}): ${(await res.text()).slice(0, 180)}`);
  saveSettings({ ...getSettings(), syncLastAt: now, syncPushedHash: hash, syncRemoteAt: now });
  return now;
}

export async function pullSync() {
  if (!syncReady()) throw new Error("Supabase URL, anon key aur sync code — teeno bharo.");
  const url = `${base()}/rest/v1/${TABLE}?code=eq.${encodeURIComponent(getSettings().syncCode)}&select=data,updated_at`;
  const res = await fetch(url, { headers: headers() });
  if (!res.ok) throw new Error(`Pull fail (${res.status}): ${(await res.text()).slice(0, 180)}`);
  const rows = await res.json();
  if (!Array.isArray(rows) || rows.length === 0) return null; // nothing on the cloud yet
  const ls = (rows[0].data && rows[0].data.localStorage) || {};
  applyLocalStorage(ls);
  const hash = hashStr(JSON.stringify(ls));
  saveSettings({ ...getSettings(), syncLastAt: new Date().toISOString(), syncRemoteAt: rows[0].updated_at || "", syncPushedHash: hash });
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
