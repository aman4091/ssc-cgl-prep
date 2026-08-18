// Cloud sync — PER-RECORD (Supabase table `sync_items`, ek secret sync code se).
//
// ===== Ye file do baar badli hai. Dono baar kyun, ye padh lena =====
//
// v1: "poora snapshot replace". Device cloud ki row apne snapshot se badal deta
// tha. Yaani har device har baar ye bayaan de raha tha: "poori duniya ye hai."
// Purana device jo naye data ke baare mein kuch jaanta hi nahi tha, wo bhi uske
// baare mein bayaan de deta — aur wo data ud jata. Homepage ki list, gktricks ke
// question, sab isi tarah gaye.
//
// v2: per-key 3-way merge. Behtar tha, par model wahi tha — poora state bhejna.
// Isliye uske saath guards lagane pade (wipe-guard, shrink-guard). Guard ki
// zaroorat hi is baat ka saboot thi ki system galat baat KEH SAKTA hai.
//
// v3 (ye): per-record. Ab device sirf UN records ke baare mein bolta hai jo uske
// paas hain — "meri poori list ye hai" wala vaakya is protocol mein maujood hi
// nahi. Jo record uske paas nahi, uske baare mein wo kuch keh nahi sakta, isliye
// uda bhi nahi sakta. Delete bhi ek record hai (tombstone row), "gayab hona"
// nahi. Guards isliye hataye ja sake — jis khatre ke liye lage the, wo protocol
// mein bacha hi nahi.
//
// Har device do cheezein yaad rakhta hai (IndexedDB mein, data ke saath hi):
//   cursor : cloud ka `rev` jahan tak ye device padh chuka hai
//   sent   : pichhli sync par har record ka hash ({store: {recordId: hash}})
// `sent` hi batata hai ki kis record ko HUMNE badla — usi par hamari chalti hai,
// baaki har record par cloud ki.
//
// Delete ANDAZE se nahi banta. Pehle banta tha — "pichhli sync par 1000 the, ab
// 999 hain, matlab ek delete hua" — aur ye andaza tab galat ho jata jab record
// user ke delete kiye BINA gayab ho (IDB row kharab, write fail, quota). Ab
// bigstore likhte waqt hi darj kar deta hai ki kaunsa record hataya gaya
// (setTombstoneCapture / getTombstones), aur sync sirf WAHI delete bhejta hai.
// Bina khabar ke gayab hua record cloud par zinda rehta hai — sync log usse
// "missing" bata deta hai, aur resyncAll() se wo wapas aa jata hai.
//
// PDFs/images (IndexedDB files) sync nahi hote — unke liye Settings ka backup.
import { getSettings, saveSettings } from "./storage";
import { getAllHinglish, setHinglish } from "./noteshinglish";
import { storeGet, storeSet, storeRemove, storeSnapshot, storeReady, rawSet, rawGet, rawKeys, rawDel, RESCUE_PREFIX, getTombstones, clearTombstones, setTombstoneCapture } from "./bigstore";
import { LOCAL_ONLY, hashStr, shred, reconcileStore } from "./syncitems";

const TABLE = "sync_items";
const OLD_TABLE = "syncs";              // v1/v2 ki ek-row wali table — sirf padhne ke liye
const HINGLISH_KEY = "cgl.notesHinglish";
const DEVICE_KEY = "cgl.sync.device";
const ST_CURSOR = "syncstate:cursor";
const ST_SENT = "syncstate:sent";
const ST_LOG = "syncstate:log";
const ST_MIGRATED = "syncstate:migrated";
const RESCUE_KEEP = 3;
const PULL_PAGE = 1000;
const PUSH_CHUNK = 300;
const LOG_KEEP = 20;

export { LOCAL_ONLY };

const STRIP_SETTINGS = ["supabaseUrl", "supabaseAnonKey", "syncCode", "syncAuto", "syncLastAt", "syncRemoteAt", "syncPushedHash"];

// ---------------------------------------------------------------- snapshot ---

// Is device ke saare syncable stores: { storeName: jsonString }.
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
  // Bade stores IndexedDB mein hain — upar wala localStorage scan unhe dekhta hi nahi.
  try { Object.assign(ls, storeSnapshot()); } catch { /* ignore */ }
  // Hinglish ki asli copy IndexedDB hai; localStorage mein sirf best-effort mirror.
  try {
    const hx = getAllHinglish();
    if (hx && Object.keys(hx).length) ls[HINGLISH_KEY] = JSON.stringify(hx);
  } catch { /* ignore */ }
  for (const k of LOCAL_ONLY) delete ls[k];
  return ls;
}

// "Is device par kuch badla kya?" ka sasta jawab — SyncManager isi se tay karta
// hai ki sync chalane layak kuch hua bhi hai ya nahi.
export function localHash() { return hashStr(JSON.stringify(snapshot())); }

// ------------------------------------------------------------------ device ---

function deviceId() {
  try {
    let d = localStorage.getItem(DEVICE_KEY);
    if (!d) {
      d = "d_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
      localStorage.setItem(DEVICE_KEY, d);
    }
    return d;
  } catch { return "d_anon"; }
}

// -------------------------------------------------------------- sync state ---
//
// cursor/sent IndexedDB mein rehte hain, localStorage mein nahi — jaan-boojh kar.
// Ye "humne kya bheja tha" ki yaad hai. Agar ye yaad data se ALAG jagah bachi
// rahe to ek din aisa aayega jab data saaf ho chuka hoga par yaad bachi hogi,
// aur device har us record ka delete bhej dega jo uske paas kabhi tha. Ek hi
// jagah rakhne se dono saath jaate hain, aur khaali device sirf pull karta hai.
async function getCursor() { return Number((await rawGet(ST_CURSOR)) || 0) || 0; }
async function setCursor(v) { await rawSet(ST_CURSOR, String(v)); }
async function getSent() { try { return JSON.parse((await rawGet(ST_SENT)) || "{}") || {}; } catch { return {}; } }
async function setSent(v) { await rawSet(ST_SENT, JSON.stringify(v)); }

export async function getSyncLog() {
  try { return JSON.parse((await rawGet(ST_LOG)) || "[]") || []; } catch { return []; }
}
async function addLog(entry) {
  try {
    const log = await getSyncLog();
    log.unshift(entry);
    await rawSet(ST_LOG, JSON.stringify(log.slice(0, LOG_KEEP)));
  } catch { /* ignore */ }
}

// --------------------------------------------------------------- readiness ---

// Dev instance (localhost / LAN IP par chalta dev server) ke paas asli data nahi
// hota — use cloud chhoone hi nahi dena.
function isSyncableOrigin() {
  if (typeof window === "undefined") return false;
  const h = window.location.hostname || "";
  const privateIp = /^(10\.|127\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/;
  return !(h === "localhost" || h === "0.0.0.0" || h === "::1" || h.endsWith(".local") || privateIp.test(h));
}

// Pen/solve view khula ho to sync ka bhaari kaam nib rok deta hai.
let paused = false;
export function setSyncPaused(v) { paused = !!v; }
export function isSyncPaused() { return paused; }

export function syncReady() {
  const s = getSettings();
  // storeReady(): IndexedDB hydrate hone se pehle stores khaali dikhte hain.
  return storeReady() && isSyncableOrigin() && Boolean(s.supabaseUrl && s.supabaseAnonKey && s.syncCode);
}
export function syncStatus() { return { ready: syncReady(), lastAt: getSettings().syncLastAt || "" }; }

function base() { return String(getSettings().supabaseUrl || "").replace(/\/+$/, ""); }
function headers(extra) {
  const key = getSettings().supabaseAnonKey;
  return { "Content-Type": "application/json", apikey: key, Authorization: `Bearer ${key}`, ...extra };
}
const enc = encodeURIComponent;

// ------------------------------------------------------------------- setup ---
//
// `rev` ek global sequence hai aur trigger use HAR insert/update par naya deta
// hai. Yahi cursor ka aadhaar hai: "mujhe rev 812 ke baad wala sab do" — isse
// device ko poora data kabhi kheenchna nahi padta.
export const SETUP_SQL = `create sequence if not exists sync_rev_seq;

create table if not exists sync_items (
  code       text    not null,
  store      text    not null,
  item_id    text    not null,
  rev        bigint  not null default nextval('sync_rev_seq'),
  device     text    not null default '',
  deleted    boolean not null default false,
  data       jsonb,
  updated_at timestamptz not null default now(),
  primary key (code, store, item_id)
);

create index if not exists sync_items_cursor on sync_items (code, rev);

create or replace function sync_bump_rev() returns trigger language plpgsql as $$
begin
  new.rev := nextval('sync_rev_seq');
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists sync_items_rev on sync_items;
create trigger sync_items_rev before insert or update on sync_items
  for each row execute function sync_bump_rev();

alter table sync_items enable row level security;
drop policy if exists "anon all" on sync_items;
create policy "anon all" on sync_items for all to anon using (true) with check (true);`;

function tableMissing(status, text) {
  return status === 404 || /sync_items.*does not exist|Could not find the table/i.test(text || "");
}
function setupError() {
  const e = new Error("Sync table abhi Supabase mein nahi hai — Settings mein 'Sync setup (ek baar SQL)' wala code SQL Editor mein chala do.");
  e.code = "no-table";
  return e;
}

// ------------------------------------------------------------------- fetch ---

// Cursor ke BAAD ke rows, apne hi device ke chhod kar (jo humne likha use wapas
// utaarne ka koi matlab nahi). Rows `rev` ke kram mein aate hain.
async function pullSince(cursor, onProgress) {
  const code = getSettings().syncCode;
  const me = deviceId();
  const out = [];
  let from = cursor;
  for (let page = 0; page < 500; page++) {
    const url =
      `${base()}/rest/v1/${TABLE}?code=eq.${enc(code)}&device=neq.${enc(me)}&rev=gt.${from}` +
      `&order=rev.asc&limit=${PULL_PAGE}&select=store,item_id,rev,deleted,data`;
    const res = await fetch(url, { headers: headers() });
    if (!res.ok) {
      const text = await res.text();
      if (tableMissing(res.status, text)) throw setupError();
      throw new Error(`Pull fail (${res.status}): ${text.slice(0, 180)}`);
    }
    const rows = await res.json();
    if (!Array.isArray(rows) || rows.length === 0) break;
    out.push(...rows);
    from = rows[rows.length - 1].rev;
    onProgress && onProgress(out.length);
    if (rows.length < PULL_PAGE) break;
  }
  return { rows: out, cursor: from };
}

// Sirf badle hue records. Upsert — (code, store, item_id) par takraav hone par
// row update ho jati hai aur trigger use naya `rev` de deta hai.
async function pushRows(rows, onProgress) {
  const code = getSettings().syncCode;
  const me = deviceId();
  for (let i = 0; i < rows.length; i += PUSH_CHUNK) {
    const chunk = rows.slice(i, i + PUSH_CHUNK).map((r) => ({
      code, device: me, store: r.store, item_id: r.item_id,
      deleted: !!r.deleted, data: r.deleted ? null : r.data,
    }));
    const res = await fetch(`${base()}/rest/v1/${TABLE}?on_conflict=code,store,item_id`, {
      method: "POST",
      headers: headers({ Prefer: "resolution=merge-duplicates,return=minimal" }),
      body: JSON.stringify(chunk),
    });
    if (!res.ok) {
      const text = await res.text();
      if (tableMissing(res.status, text)) throw setupError();
      throw new Error(`Push fail (${res.status}): ${text.slice(0, 180)}`);
    }
    onProgress && onProgress(Math.min(i + PUSH_CHUNK, rows.length), rows.length);
  }
}

// Sasti jaanch: cursor ke aage kuch hai bhi ya nahi (poora data kheenche bina).
export async function hasRemoteChanges() {
  if (!syncReady()) return false;
  const cursor = await getCursor();
  const url =
    `${base()}/rest/v1/${TABLE}?code=eq.${enc(getSettings().syncCode)}&device=neq.${enc(deviceId())}` +
    `&rev=gt.${cursor}&select=rev&limit=1`;
  const res = await fetch(url, { headers: headers() });
  if (!res.ok) {
    const text = await res.text();
    if (tableMissing(res.status, text)) throw setupError();
    return false;
  }
  const rows = await res.json();
  return Array.isArray(rows) && rows.length > 0;
}

// ------------------------------------------------------------------ rescue ---

// Local badalne se PEHLE is device ka snapshot IndexedDB mein. Cloud par kabhi
// nahi jata. Ye guard NAHI hai — ye wahi cheez hai jise Google Docs "version
// history" kehta hai: galti tumse ho ya mujhse, wapas jaane ka raasta rehna
// chahiye.
async function saveRescue(ls, why) {
  try {
    const at = new Date().toISOString();
    await rawSet(`${RESCUE_PREFIX}${at}`, JSON.stringify({ at, why, localStorage: ls }));
    const keys = (await rawKeys(RESCUE_PREFIX)).sort();
    for (const k of keys.slice(0, Math.max(0, keys.length - RESCUE_KEEP))) await rawDel(k);
  } catch { /* best-effort */ }
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

// Rescue copy wapas — JOD kar, overwrite karke nahi. Jo aaj ka hai wo bhi bachta
// hai. Wapas aaye records agli sync mein apne aap cloud par bhi chale jayenge.
export async function restoreRescue(key) {
  const raw = await rawGet(key);
  if (!raw) throw new Error("Ye rescue copy mil nahi rahi.");
  const old = JSON.parse(raw).localStorage || {};
  const now = snapshot();
  await saveRescue(now, "restore se pehle");
  let changed = 0;
  for (const store of Object.keys(old)) {
    const rows = [...shred(old[store])].map(([item_id, data]) => ({ item_id, data, deleted: false }));
    // sent={} => jo record local par pehle se hai wo "humne badla" mana jayega
    // aur bacha rahega; jo nahi hai wo wapas jud jayega. Yaani shuddh union.
    const r = reconcileStore(now[store] ?? null, {}, rows);
    if (r.changed) { writeStore(store, r.nextJson); changed++; }
  }
  return changed;
}

// ------------------------------------------------------------------- write ---

// Sync ke apne writes tombstone nahi banate: cloud se aaya delete apna hi
// tombstone bana kar wapas cloud ko bhejta, aur wo hamesha ke liye ghoomta rehta.
function writeStore(store, json) {
  if (LOCAL_ONLY.has(store)) return;
  setTombstoneCapture(false);
  try {
    if (store === HINGLISH_KEY) {
      // Hinglish ka ghar IndexedDB hai — seedha likhne se sirf mirror badalta hai.
      const o = JSON.parse(json || "{}") || {};
      for (const page of Object.keys(o)) if (o[page]) setHinglish(page, o[page]);
      return;
    }
    if (store === "cgl.settings") {
      // snapshot() settings se is device ke apne sync fields NIKAL deta hai
      // (URL, key, code, syncAuto, timestamps) — warna wo har sync par badal
      // kar endless loop bana dete. Isliye wapas likhte waqt unhe JODNA zaroori
      // hai. Ye na karne se ek pakka loop banta hai: sync stripped settings
      // likhta hai -> credentials udte hain -> env se dobara bharte hain ->
      // settings phir badal jati hai -> sync use "naya badlav" samajh kar phir
      // likhta hai -> page phir reload. (Yahi hua tha.)
      const mine = getSettings();
      const incoming = JSON.parse(json || "{}") || {};
      for (const f of STRIP_SETTINGS) if (mine[f] !== undefined) incoming[f] = mine[f];
      saveSettings(incoming);
      return;
    }
    if (json == null) storeRemove(store);
    else storeSet(store, json);
  } catch { /* quota */ }
  finally { setTombstoneCapture(true); }
}

// --------------------------------------------------------------- migration ---

// v1/v2 ki ek-row wali `syncs` table se ek baar data uthao. Sirf PADHTE hain —
// us row ko chhedte nahi, taaki jo device abhi purane code par hai uska raasta
// na toote.
async function migrateFromOldRow(stores) {
  let ls = null;
  try {
    const url = `${base()}/rest/v1/${OLD_TABLE}?code=eq.${enc(getSettings().syncCode)}&select=data`;
    const res = await fetch(url, { headers: headers() });
    if (res.ok) {
      const rows = await res.json();
      ls = (Array.isArray(rows) && rows[0] && rows[0].data && rows[0].data.localStorage) || null;
    }
  } catch { /* purani table hai hi nahi — koi baat nahi */ }
  if (!ls) return 0;
  let gained = 0;
  for (const store of Object.keys(ls)) {
    if (LOCAL_ONLY.has(store)) continue;
    const rows = [...shred(ls[store])].map(([item_id, data]) => ({ item_id, data, deleted: false }));
    const r = reconcileStore(stores[store] ?? null, {}, rows);   // sent={} => shuddh union
    if (r.changed) { writeStore(store, r.nextJson); stores[store] = r.nextJson; gained++; }
  }
  return gained;
}

// --------------------------------------------------------------- the sync ----

/**
 * Ek sync: naye records utaro, apne badle hue records chadhao.
 * @returns { at, applied, pulled, pushed, deleted, stores }
 */
export async function syncOnce({ onProgress } = {}) {
  if (!syncReady()) throw new Error("Supabase URL, anon key aur sync code — teeno bharo.");
  const say = (m) => { try { onProgress && onProgress(m); } catch { /* ignore */ } };

  let stores = snapshot();
  const sent = await getSent();
  const cursor = await getCursor();

  // Pehli baar: purani table se data utha lo, taaki kuch peeche na chhoote.
  if (!(await rawGet(ST_MIGRATED))) {
    say("Purane sync se data laa raha hoon…");
    const gained = await migrateFromOldRow(stores);
    await rawSet(ST_MIGRATED, new Date().toISOString());
    if (gained) stores = snapshot();
  }

  // ---- PULL
  say("Naye records dekh raha hoon…");
  const { rows, cursor: nextCursor } = await pullSince(cursor, (n) => say(`${n} records aa rahe hain…`));
  const byStore = new Map();
  for (const row of rows) {
    if (!byStore.has(row.store)) byStore.set(row.store, []);
    byStore.get(row.store).push(row);
  }

  // ---- RECONCILE (har store alag)
  const tombs = getTombstones();
  const touched = new Set([...Object.keys(stores), ...Object.keys(sent), ...Object.keys(tombs), ...byStore.keys()]);
  const toSend = [];
  const writes = [];
  const sentTombs = {};      // jo tombstones is sync mein bheje — push ke BAAD hatenge
  let missing = 0;
  for (const store of touched) {
    if (LOCAL_ONLY.has(store)) continue;
    const r = reconcileStore(stores[store] ?? null, sent[store], byStore.get(store) || [], tombs[store]);
    if (r.changed) writes.push([store, r.nextJson]);
    for (const rec of r.toSend) {
      toSend.push({ store, ...rec });
      if (rec.deleted) (sentTombs[store] ||= []).push(rec.item_id);
    }
    missing += r.missing.length;
    if (Object.keys(r.hashes).length) sent[store] = r.hashes;
    else delete sent[store];
  }

  // ---- APPLY (local par likhne se pehle rescue)
  if (writes.length) {
    await saveRescue(stores, `sync: ${writes.length} store badal rahe hain`);
    for (const [store, json] of writes) writeStore(store, json);
  }

  // ---- PUSH
  const delCount = toSend.filter((r) => r.deleted).length;
  if (toSend.length) {
    say(`${toSend.length} records bhej raha hoon…`);
    await pushRows(toSend, (done, total) => say(`Bheja ${done}/${total}…`));
  }

  clearTombstones(sentTombs);   // cloud par chadh chuke, ab hata sakte hain
  await setCursor(nextCursor);
  await setSent(sent);
  const at = new Date().toISOString();
  saveSettings({ ...getSettings(), syncLastAt: at, syncPushedHash: localHash() });

  const result = {
    at,
    applied: writes.length > 0,
    pulled: rows.length,
    pushed: toSend.length - delCount,
    deleted: delCount,
    missing,
    stores: writes.map(([s]) => s),
  };
  if (rows.length || toSend.length || missing) await addLog(result);
  return result;
}

// "Cloud se sab dobara laao": cursor aur `sent` mita do, taaki agli sync poori
// cloud dobara utaare aur local mein JOD de.
//
// Ye tab kaam aata hai jab koi record is device se bina khabar ke gayab ho gaya
// ho (log mein "missing" dikhta hai). Ye delete kabhi nahi karta — `sent` khaali
// ho jaane ka matlab hai "mujhe kuch yaad nahi", aur bina yaad ke device sirf
// utaarta hai, bhejta kuch nahi.
export async function resyncAll() {
  await setCursor(0);
  await setSent({});
  return syncOnce();
}
