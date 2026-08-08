// Handwriting (ink) ka store — Wrong Notebook ke har question ke neeche stylus
// se likha hua solution.
//
// Strokes VECTOR mein rehte hain, bitmap mein nahi: chhote hain, kisi bhi DPI par
// crisp re-render hote hain, aur undo/erase possible rehta hai. Ek bhare hue
// maths page ke ~3-8 hazaar points ≈ 30-50 KB JSON, gzip ke baad ~10 KB. Wahi
// page 1200×1600 PNG banata to 300-800 KB — chalis guna bhaari.
//
// COORDINATE SPACE — "ink units": page ki chaudai HAMESHA 1000 units. Render
// karte waqt sab kuch (cssWidth / 1000) se multiply hota hai. Isliye jo tablet
// par landscape mein likha, wo phone par portrait mein aur desktop ke bade
// monitor par bhi bilkul theek baithta hai — device ya rotation se koi farak
// nahi padta. `h` bhi inhi units mein hai aur badhta rehta hai.
//
// Teen jagah, teen kaam:
//   IndexedDB  — poora doc, turant (likhte hi). Offline yahi sach hai.
//   R2         — wahi doc gzipped, taaki dusre device par khule.
//   record     — sirf { inkUrl, inkAt, inkRev, inkStrokes, inkH }, ~150 bytes.
//
// Strokes localStorage mein kyun NAHI: lib/sync.js har cgl.* key ko EK Supabase
// row mein snapshot karta hai aur har badlaav par poora row dobara POST karta
// hai. 300 questions × 20 KB ≈ 6 MB — localStorage ka ~5 MB cap phat jata aur
// teen stroke likhne par megabytes mobile data par chale jate. Yahi wajah
// lib/engbank.js ke comment mein pehle se likhi hai. Isliye ink bhi wahi raasta
// leta hai jo wrongbook ki images leti hain: blob R2 par, record par sirf URL.

import { saveFile, getFile, deleteFile } from "./filestore";
import { uploadToR2, deleteFromR2 } from "./r2client";

const V = 1;

// ── Cloud sync BAND ─────────────────────────────────────────────────────────
//
// Handwriting ab sirf usi device par rehti hai jahan likhi gayi. Wajah:
//
//  1. Kaam ka maqsad hi rough work hai — question solve karte waqt ka kacha
//     kaam, jo dusre device par khol kar dekhne ki zaroorat nahi padti.
//  2. Har 6 second ka upload record par inkUrl/inkRev/inkStrokes likhta tha,
//     yaani us localStorage mein aur bojh jo pehle se ~10 MB par, cap ke kagaar
//     par hai. Wahi jagah notes, vocab aur wrong book ko chahiye.
//  3. Aur cap par hone ki wajah se pointer likhna aksar fail hi ho jata tha —
//     writing R2 par chadh jati par usko point karne wala kuch nahi hota. Yaani
//     kharcha poora, fayda shoonya.
//
// Code jaan-boojh kar zinda rakha hai. CLOUD = true karte hi upload, pointer,
// dusre device se pull, conflict aur offline queue — sab wapas chalne lagega.
const CLOUD = false;

// Page ki logical chaudai. Isko kabhi mat badalna — purane docs isi par bane hain.
export const UNIT_W = 1000;

// Kis record par kitne stroke hain — device-local ginti, taaki Answers page
// ✍️ badge dikha sake bina har record ka doc IndexedDB se padhe.
//
// `cgl.` prefix jaan-boojh kar NAHI: ink ab device ki apni cheez hai, isliye
// uski ginti bhi sync par nahi jani chahiye. Chhoti bhi rehti hai — ek record
// ka ek number.
const COUNTS_KEY = "ink.counts";

export function localInkCounts() {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(COUNTS_KEY) || "{}") || {}; }
  catch { return {}; }
}
function setLocalCount(recId, n) {
  try {
    const all = localInkCounts();
    if (n > 0) all[recId] = n;
    else delete all[recId];
    localStorage.setItem(COUNTS_KEY, JSON.stringify(all));
  } catch { /* quota — badge ke liye itna risk nahi lena */ }
}

// Device-local queue — jaan-boojh kar `cgl.` prefix ke BINA, kyunki sync.js
// sirf cgl.* uthata hai aur ye queue is device ki apni haalat hai. Dusre device
// par jaakar wo waise bhi bekaar hai (uske IndexedDB mein wo doc hai hi nahi).
const QUEUE_KEY = "ink.queue";

const localKey = (id) => `ink:${id}`;
const conflictKey = (id) => `ink:${id}:conflict`;

export const emptyDoc = (h = 1600) => ({ v: V, w: UNIT_W, h, strokes: [] });
export const isEmptyDoc = (doc) => !doc || !doc.strokes || doc.strokes.length === 0;

// ─── serialize ───────────────────────────────────────────────────────────────
// Points integers mein jaate hain (ink units × 10), pehle ke baad delta mein,
// pressure 0-255 par quantized. Yahi teen cheezein file ko aadhe se zyada chhota
// kar deti hain, aur handwriting ke liye ye precision aankh se kahin zyada hai.
// Flat array isliye ki [[x,y,p],…] JSON mein teen guna characters khata hai.

export function encodeDoc(doc) {
  const strokes = (doc?.strokes || []).map((s) => {
    const p = [];
    let px = 0;
    let py = 0;
    const pts = s.points || [];
    for (let i = 0; i < pts.length; i++) {
      const x = Math.round((pts[i].x || 0) * 10);
      const y = Math.round((pts[i].y || 0) * 10);
      const pr = Math.max(0, Math.min(255, Math.round((pts[i].p == null ? 0.5 : pts[i].p) * 255)));
      if (i === 0) p.push(x, y, pr);
      else p.push(x - px, y - py, pr);
      px = x;
      py = y;
    }
    return { c: s.color, s: s.size, t: s.tool || "pen", p };
  });
  return JSON.stringify({
    v: V,
    w: UNIT_W,
    h: Math.round(doc?.h || 0),
    strokes,
  });
}

export function decodeDoc(json) {
  let d;
  try { d = typeof json === "string" ? JSON.parse(json) : json; }
  catch { return null; }
  if (!d || !Array.isArray(d.strokes)) return null;
  // Purane docs kisi aur chaudai par bane ho sakte hain — unhe ink units par le aao.
  const k = d.w && d.w !== UNIT_W ? UNIT_W / d.w : 1;
  const strokes = d.strokes.map((s) => {
    const points = [];
    const p = s.p || [];
    let px = 0;
    let py = 0;
    for (let i = 0; i + 2 < p.length; i += 3) {
      if (i === 0) { px = p[0]; py = p[1]; }
      else { px += p[i]; py += p[i + 1]; }
      points.push({ x: (px / 10) * k, y: (py / 10) * k, p: p[i + 2] / 255 });
    }
    // _hasPressure dobara nikalna zaroori hai.
    //
    // Ye flag likhte waqt banta hai aur stroke ki motai tay karta hai. Decode ke
    // baad wo gayab hota tha, to load hui writing CONSTANT width se banti thi
    // jabki taazi writing pressure ke saath — yaani wahi stroke reload ke baad
    // alag dikhta tha. Points mein pressure to hai hi, usi se pata kar lo.
    const hasPressure = points.some((p) => p.p > 0 && Math.abs(p.p - 0.5) > 0.02);
    return { color: s.c, size: (s.s || 4) * k, tool: s.t || "pen", points, _hasPressure: hasPressure };
  });
  return { v: d.v || V, w: UNIT_W, h: Math.round((d.h || 0) * k), strokes };
}

export const strokeCount = (doc) => (doc?.strokes || []).length;

// ─── gzip ────────────────────────────────────────────────────────────────────
// CompressionStream har modern Chrome mein hai; na ho to plain JSON chala jata
// hai — /api/r2 dono content types leta hai.
//
// ⚠️ Content-Type: application/gzip bhejo, Content-Encoding: gzip KABHI nahi.
// Agar R2 par Content-Encoding gzip lag gaya to browser fetch() par khud hi
// unzip kar dega, aur phir hamara DecompressionStream dobara unzip karne
// jayega — kachra milega. Ye is jagah ka classic bug hai.

async function gzipBlob(str) {
  if (typeof CompressionStream === "undefined") {
    return new Blob([str], { type: "application/json" });
  }
  try {
    const stream = new Blob([str]).stream().pipeThrough(new CompressionStream("gzip"));
    const buf = await new Response(stream).arrayBuffer();
    return new Blob([buf], { type: "application/gzip" });
  } catch {
    return new Blob([str], { type: "application/json" });
  }
}

// Gzip ka magic number (1f 8b) dekh kar decide karo — R2 se wapas aate waqt
// content-type par bharosa nahi kiya ja sakta.
async function textFromMaybeGzip(res) {
  const buf = await res.arrayBuffer();
  const u8 = new Uint8Array(buf);
  if (!(u8[0] === 0x1f && u8[1] === 0x8b)) return new TextDecoder().decode(u8);
  const stream = new Blob([u8]).stream().pipeThrough(new DecompressionStream("gzip"));
  return new Response(stream).text();
}

// ─── device par (IndexedDB) ──────────────────────────────────────────────────
// filestore.js ka wahi `cgl-files` DB aur wahi `files` store use ho raha hai —
// sirf nayi keys (`ink:<id>`), koi naya object store nahi. Naya store banate to
// DB version 1 se 2 karna padta, aur koi bhi purani tab khuli hoti to upgrade
// block ho jata aur har getFile() latak jata. Fayda ye bhi hai ki lib/backup.js
// ka getAllFiles() ink ko apne aap backup mein le lega.
//
// Ek entry: { rev, at, dirty, json }. `json` encoded string hai, taaki har save
// par dobara serialize na karna pade aur upload ke waqt seedha use ho jaye.

async function readEntry(key) {
  const blob = await getFile(key).catch(() => null);
  if (!blob) return null;
  try { return JSON.parse(await blob.text()); }
  catch { return null; }
}

async function writeEntry(key, entry) {
  await saveFile(key, new Blob([JSON.stringify(entry)], { type: "application/json" }));
}

// -> { doc, rev, at, dirty } | null
export async function loadLocalInk(recId) {
  const e = await readEntry(localKey(recId));
  if (!e) return null;
  const doc = decodeDoc(e.json);
  if (!doc) return null;
  return { doc, rev: e.rev || 0, at: e.at || "", dirty: !!e.dirty };
}

// Likhte hi call hota hai (debounced). Rev nahi badalta — rev sirf successful
// push par badhta hai; yahan bas `dirty` lag jata hai.
export async function saveLocalInk(recId, doc) {
  const prev = await readEntry(localKey(recId));
  await writeEntry(localKey(recId), {
    rev: prev?.rev || 0,
    at: new Date().toISOString(),
    dirty: true,
    json: encodeDoc(doc),
  });
  setLocalCount(recId, strokeCount(doc));
}

export async function dropLocalInk(recId) {
  await deleteFile(localKey(recId)).catch(() => {});
  await deleteFile(conflictKey(recId)).catch(() => {});
  setLocalCount(recId, 0);
}

// Dusre device ka wo version jo yahan ke un-pushed kaam se takra gaya. Kuch
// chupchaap delete nahi hota — solve view ise ek banner mein wapas offer karta hai.
export async function getConflictInk(recId) {
  const e = await readEntry(conflictKey(recId));
  if (!e) return null;
  const doc = decodeDoc(e.json);
  return doc ? { doc, at: e.at || "" } : null;
}

export async function clearConflictInk(recId) {
  await deleteFile(conflictKey(recId)).catch(() => {});
}

// ─── R2 ──────────────────────────────────────────────────────────────────────

// r2.dev CORS header bhejta hi nahi, isliye padhna hamesha apne proxy se.
// /api/r2/image ka naam bhale "image" ho, wo bucket ka koi bhi object deta hai.
export const inkProxyUrl = (url) => `/api/r2/image?url=${encodeURIComponent(url)}`;

export async function fetchInk(url) {
  const res = await fetch(inkProxyUrl(url));
  if (!res.ok) throw new Error(`Ink fetch fail (${res.status})`);
  return decodeDoc(await textFromMaybeGzip(res));
}

// ─── open karte waqt ka faisla ───────────────────────────────────────────────
// Cloud ka rev local se bada hai to cloud jeetega. Agar local par bina-push kiya
// kaam pada hai, wo pehle conflict slot mein chala jayega — mitega nahi.
//
// -> { doc, rev, from: "local" | "cloud" | "new", conflict: bool }
export async function openInk(rec) {
  const local = await loadLocalInk(rec.id);
  const cloudRev = rec.inkRev || 0;
  const localRev = local?.rev || 0;

  // CLOUD band hai to sirf is device ki copy. Purane records par jo pointer
  // pehle se pada hai use chhedte nahi — bas uske peeche jaate nahi.
  if (CLOUD && rec.inkUrl && cloudRev > localRev) {
    try {
      const doc = await fetchInk(rec.inkUrl);
      if (doc) {
        let conflict = false;
        if (local && local.dirty && !isEmptyDoc(local.doc)) {
          await writeEntry(conflictKey(rec.id), { at: local.at, json: encodeDoc(local.doc) });
          conflict = true;
        }
        await writeEntry(localKey(rec.id), {
          rev: cloudRev,
          at: rec.inkAt || new Date().toISOString(),
          dirty: false,
          json: encodeDoc(doc),
        });
        return { doc, rev: cloudRev, from: "cloud", conflict };
      }
    } catch {
      // offline ya R2 down — jo device par hai wahi chalao
    }
  }

  if (local) return { doc: local.doc, rev: localRev, from: "local", conflict: false };
  return { doc: null, rev: 0, from: "new", conflict: false };
}

// ─── push ────────────────────────────────────────────────────────────────────
// setInk callback ke through record likha jata hai (lib/wrongbook.js se aata
// hai) taaki ye module wrongbook par depend na kare — wrongbook pehle se
// filestore/r2client par depend karta hai aur ulta import cycle ban jata.
//
// -> { url, rev } | null
export async function pushInk(rec, doc, setInk) {
  if (!CLOUD) return null; // ink device-local hai — upar wala note dekho
  if (!rec?.id) return null;
  const json = encodeDoc(doc);
  const blob = await gzipBlob(json);

  let url;
  try {
    url = await uploadToR2(blob, "ink.json.gz");
  } catch (e) {
    queuePush(rec.id);
    throw e;
  }

  // Jo rev abhi record par hai usse hamesha aage — do device ke beech rev peeche
  // nahi ja sakta, warna purana upload naya dikhne lagta.
  const local = await readEntry(localKey(rec.id));
  const rev = Math.max(rec.inkRev || 0, local?.rev || 0) + 1;
  const at = new Date().toISOString();

  // inkStrokes/inkH record par isliye ki dusre device ka card ✍️ badge dikha
  // sake bina poora ink download kiye.
  //
  // Ye try/catch zaroori hai. Upload upar ho chuka hai; agar pointer likhna fail
  // ho gaya (localStorage bhara hua — setInk quota par throw karta hai jab
  // shedOldQuizzes ke paas girane ko kuch na bache) to writing R2 par padi reh
  // jaati hai aur usko point karne wala kuch nahi hota. Nateeja: is device par
  // sab theek dikhta hai (IndexedDB mein copy hai) par dusre device par kuch
  // nahi pahunchta — "save ho raha hai, sync nahi ho raha" wala theek yahi
  // haal tha. Pehle queuePush bhi nahi hota tha, to dobara koshish bhi kabhi
  // nahi hoti thi.
  try {
    setInk(rec.id, {
      inkUrl: url,
      inkAt: at,
      inkRev: rev,
      inkStrokes: strokeCount(doc),
      inkH: Math.round(doc?.h || 0),
      inkPrev: rec.inkUrl || "",
    });
  } catch (e) {
    queuePush(rec.id);
    throw e;
  }
  await writeEntry(localKey(rec.id), { rev, at, dirty: false, json });
  unqueuePush(rec.id);

  // Ek generation peeche wala (inkPrev) jaan-boojh kar zinda rakha jata hai —
  // dusra device abhi bhi usi ko point kar raha ho sakta hai. Usse purana
  // ab kisi kaam ka nahi.
  const stale = rec.inkPrev || "";
  if (stale && stale !== url && stale !== rec.inkUrl) deleteFromR2(stale);
  return { url, rev };
}

// ─── offline queue ───────────────────────────────────────────────────────────

function readQueue() {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]") || []; }
  catch { return []; }
}
function writeQueue(v) {
  try { localStorage.setItem(QUEUE_KEY, JSON.stringify(v)); } catch { /* quota */ }
}
function queuePush(id) {
  const q = readQueue();
  if (!q.includes(id)) writeQueue([...q, id]);
}
function unqueuePush(id) {
  const q = readQueue();
  if (q.includes(id)) writeQueue(q.filter((x) => x !== id));
}
export const queuedInkCount = () => readQueue().length;

// Online wapas aane par (aur solve view khulte hi) ruki hui uploads bhejo. Jis
// record ka local doc hi nahi bacha use queue se hata do — wo delete ho chuka hai.
export async function flushInkQueue(getRecord, setInk) {
  if (!CLOUD) return 0;
  const q = readQueue();
  if (!q.length) return 0;
  let sent = 0;
  for (const id of q) {
    const rec = getRecord(id);
    const local = await loadLocalInk(id);
    if (!rec || !local) { unqueuePush(id); continue; }
    try {
      await pushInk(rec, local.doc, setInk);
      sent += 1;
    } catch {
      break; // abhi bhi offline — baaki agli baar
    }
  }
  return sent;
}
