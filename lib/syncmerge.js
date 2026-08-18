// Sync ka dimaag: DO snapshot ko jodne wala 3-way merge.
//
// KYUN ye file bani: pehla model "poora snapshot replace" tha — jo device push
// karta, cloud ki row uske snapshot se BADAL jati. Uska matlab ye tha ki koi bhi
// thoda purana device (tablet jo kal khula tha) apne aap ko push karke doosre
// device ka naya data uda deta. Patch lagate rahe (chuninda stores ka union,
// shrink-guard), par har naye store ke liye haath se entry daalni padti thi —
// aur jo bhoola, wo ud gaya. `cgl.home.items` isi tarah gaya.
//
// Ilaaj wahi hai jo git karta hai: PURVAJ (base) yaad rakho. Har device apne
// paas rakhta hai "pichhli baar sync ke waqt har key kaisi thi" (sirf HASH, is-
// liye chand KB). Ab har key ke liye SAAF pata chal jata hai ki kisne badla:
//
//   local badla,  remote nahi  -> local jeeta
//   remote badla, local nahi   -> remote jeeta   <- yahi purana haadsa rokta hai
//   dono badle                 -> value-level merge (neeche), kuch khota nahi
//   dono barabar               -> kuch karna hi nahi
//
// Isme key ka naam kahin likhna nahi padta, isliye kal jo naya store banega wo
// apne aap surakshit hai. Yahi "permanent" wala hissa hai.

// Device-ka-apna data — kabhi sync/backup mein nahi jata.
export const LOCAL_ONLY = new Set([
  "cgl.pomodoro.state", // live timer
  "cgl.sync.base",      // is device ka purvaj-hash (doosre device par bekaar)
]);

export function hashStr(s) {
  let h = 5381;
  const str = String(s);
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

// { key: jsonString } -> { key: hash }
export function hashMap(ls) {
  const out = {};
  for (const k of Object.keys(ls || {})) if (ls[k] != null) out[k] = hashStr(ls[k]);
  return out;
}

function parse(s) { try { return JSON.parse(s); } catch { return undefined; } }
function isObj(v) { return v && typeof v === "object" && !Array.isArray(v); }
function idOf(o) { return isObj(o) ? (o.id ?? o.key ?? o.slug ?? null) : null; }
function stampOf(o) {
  return (isObj(o) && (o.updatedAt || o.savedAt || o.createdAt || o.at || o.date)) || "";
}

// Dono taraf badle hue EK key ko jodna. Niyam ek hi hai: KUCH GIRNA NAHI CHAHIYE.
// Isliye list/map ka union hota hai, aur sirf wahan jahan sach much do alag
// values takrati hain (ek hi jagah do alag number/string) local jeetta hai.
export function mergeValues(lv, rv) {
  const a = parse(lv), b = parse(rv);
  if (a === undefined || b === undefined) return lv; // JSON hai hi nahi -> local
  if (Array.isArray(a) && Array.isArray(b)) return JSON.stringify(mergeArrays(a, b));
  if (isObj(a) && isObj(b)) return JSON.stringify(mergeObjects(a, b));
  return lv;
}

// id wali list (questions, feed entries, home items...) -> id se union.
// Bina id wali (tombstone ids, seen-lists) -> value se union.
export function mergeArrays(a, b) {
  const aId = a.length === 0 || a.every((x) => idOf(x) != null);
  const bId = b.length === 0 || b.every((x) => idOf(x) != null);
  if (aId && bId) {
    const byId = new Map();
    for (const x of b) byId.set(idOf(x), x);           // remote pehle
    for (const x of a) {                               // phir local (jeetne wala)
      const id = idOf(x), prev = byId.get(id);
      byId.set(id, prev ? newerOf(x, prev) : x);
    }
    // Kram: local ka apna kram pehle, remote-only cheezein aakhir mein.
    const out = [], seen = new Set();
    for (const x of a) { const id = idOf(x); if (!seen.has(id)) { seen.add(id); out.push(byId.get(id)); } }
    for (const x of b) { const id = idOf(x); if (!seen.has(id)) { seen.add(id); out.push(byId.get(id)); } }
    return out;
  }
  const out = [], seen = new Set();
  for (const x of [...a, ...b]) {
    const k = typeof x === "object" ? JSON.stringify(x) : `${typeof x}:${x}`;
    if (!seen.has(k)) { seen.add(k); out.push(x); }
  }
  return out;
}

// Dono taraf ek hi id ka record badla — jiska timestamp naya wo. Timestamp na ho
// to local (jis device par baitha hai wahi abhi ka sach hai).
function newerOf(local, remote) {
  const ls = stampOf(local), rs = stampOf(remote);
  if (ls && rs && rs > ls) return remote;
  if (!ls && !rs && isObj(local) && isObj(remote)) return mergeObjects(local, remote);
  return local;
}

export function mergeObjects(a, b) {
  const out = { ...b };
  for (const k of Object.keys(a)) {
    const av = a[k], bv = b[k];
    if (bv === undefined) { out[k] = av; continue; }
    if (isObj(av) && isObj(bv)) { out[k] = mergeObjects(av, bv); continue; }
    if (Array.isArray(av) && Array.isArray(bv)) { out[k] = mergeArrays(av, bv); continue; }
    out[k] = av; // asli takraav -> local
  }
  return out;
}

// Browser ne apne aap storage saaf kar diya (Safari ka 7-din wala niyam, "clear
// site data", private window) to base bhara hoga par local khaali. Bina is jaanch
// ke device use "user ne delete kiya" samajh kar cloud se bhi uda deta. Itni saari
// cheezein ek saath koi haath se delete nahi karta — isliye shak par delete nahi,
// wapas bharo.
function looksWiped(missingCount, baseCount) {
  return missingCount > Math.max(5, Math.floor(baseCount * 0.2));
}

// local/remote: { key: jsonString }   base: { key: hash } (pehli baar null)
// prefer: "auto" | "local" | "remote"  — manual buttons ke liye. Ye dono kabhi
// delete nahi karte, sirf jhukav badalte hain.
export function threeWayMerge(local, remote, base, prefer = "auto") {
  const L = local || {}, R = remote || {}, B = base || null;
  const keys = new Set([...Object.keys(L), ...Object.keys(R)]);
  const baseKeys = B ? Object.keys(B).length : 0;

  // Pehle sirf ginti: kitni keys base mein thin par ab kis taraf gayab hain.
  //
  // Dono taraf ki jaanch zaroori hai. Local wali: browser ne storage saaf kar
  // diya. REMOTE wali usse bhi zyada zaroori: agar cloud ki row kisi wajah se
  // khaali/adhoori ho gayi (purana bug, galat write, table reset), to bina is
  // jaanch ke HAR device use "sab delete ho gaya" samajh kar khud ko mita leta —
  // ek hi galti se saara data khatam. Ab ulta hota hai: local se cloud dobara
  // bhar jata hai.
  // Ginti base ke muqable hoti hai, ek doosre ke muqable NAHI — warna jab dono
  // taraf se ek saath cheezein gayab ho jayen (sabse bura case) to koi bhi taraf
  // "wiped" nahi dikhti aur jo aakhri key bachi hai wo bhi delete ho jati hai.
  let missing = 0, rMissing = 0;
  if (B) for (const k of Object.keys(B)) {
    if (L[k] == null) missing++;
    if (R[k] == null) rMissing++;
  }
  const wiped = B ? looksWiped(missing, baseKeys) : false;
  const remoteWiped = B ? looksWiped(rMissing, baseKeys) : false;

  const merged = {};
  const writes = {};   // is device par likhni hain
  const deletes = [];  // is device se hatani hain
  const conflicts = [];
  let remoteDiffers = false;

  for (const k of keys) {
    const lv = L[k] ?? null, rv = R[k] ?? null;
    const lh = lv == null ? null : hashStr(lv);
    const rh = rv == null ? null : hashStr(rv);
    const bh = B ? (B[k] ?? null) : null;
    let out;

    if (lh === rh) out = lv;
    else if (prefer === "local") out = lv != null ? lv : rv;   // manual: kuch delete nahi
    else if (prefer === "remote") out = rv != null ? rv : lv;
    else if (bh === null) {
      // Koi purvaj nahi — dono naye. Kuch mat khona.
      out = lv == null ? rv : rv == null ? lv : mergeValues(lv, rv);
      if (lv != null && rv != null) conflicts.push(k);
    } else {
      const lChanged = lh !== bh;
      const rChanged = rh !== bh;
      if (lv == null && wiped) out = rv;                       // local storage ud gaya -> wapas bharo
      else if (rv == null && remoteWiped) out = lv;            // cloud ud gaya -> local se bharo
      else if (lChanged && !rChanged) out = lv;                // sirf local badla (delete bhi)
      else if (!lChanged && rChanged) out = rv;                // sirf remote badla
      else {
        out = lv == null ? rv : rv == null ? lv : mergeValues(lv, rv);
        if (lv != null && rv != null) conflicts.push(k);
      }
    }

    if (out != null) merged[k] = out;
    if (out == null) { if (lv != null) deletes.push(k); }
    else if (out !== lv) writes[k] = out;
    if (out !== rv) remoteDiffers = true;
  }

  return {
    merged,
    writes,
    deletes,
    remoteDiffers,
    conflicts,
    wiped,
    remoteWiped,
    changedLocally: Object.keys(writes).length > 0 || deletes.length > 0,
  };
}

// merged bana lene ke baad: is device par kya likhna/hatana hai.
// (Special-case merges ke BAAD chalta hai, isliye threeWayMerge ke apne
// writes/deletes ki jagah yahi sach hai.)
export function diffLocal(local, merged) {
  const L = local || {}, M = merged || {};
  const writes = {}, deletes = [];
  for (const k of Object.keys(M)) if (M[k] !== (L[k] ?? null)) writes[k] = M[k];
  for (const k of Object.keys(L)) if (M[k] == null) deletes.push(k);
  return { writes, deletes, changedLocally: Object.keys(writes).length > 0 || deletes.length > 0 };
}
