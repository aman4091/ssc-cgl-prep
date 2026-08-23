// Kis question ka chapter kaunsa hai — aur usi se "kis chapter mein sabse
// zyada galat hue" wali report.
//
// Do tarah ke record hain (dono ab Answers board par ek saath dikhte hain):
//
//   * 📝 Notebook (lib/qreview) — inke paas `category` pehle se hoti hai,
//     kyunki question app ke andar kisi chapter ke quiz se aaya tha. Wo GROUND
//     TRUTH hai, AI se behtar. Par sirf tab jab wo asli chapter ho: Quiz Bank
//     ke imported paper mein category "SSC CGL 2023 Shift 2" jaisi hoti hai,
//     jo report ke liye kachra hai. Isliye category tabhi maani jaati hai jab
//     wo neeche wali list se milti ho.
//
//   * 🖼️ External Mock (lib/wrongbook) — ye bahar ke mock test ke screenshot
//     hain. Inka chapter kahin likha hi nahi hota. Yahi wo jagah hai jahan AI
//     kaam aata hai, aur na ho paye to owner khud bata deta hai.
//
// Chapter ki list app ke apne banks se aati hai (public/*/index.json) — wahi
// naam jo PYQ mein chapter kholte waqt dikhte hain. Isliye report ka "geometry"
// aur bank ka "geometry" ek hi cheez hai, aur report se seedha us chapter ki
// practice par jaya ja sakta hai.

import { storeGet, storeSet } from "./bigstore";

const KEY = "cgl.qchapter";
const AUTO_KEY = "cgl.qchapter.auto";

// ── chapter ki list ────────────────────────────────────────────────────────
//
// Har subject ke liye EK list. Maths ke do bank hain (mathbank aur
// sscmaths2025); dono ko jodne se "mensuration" aur "mensuration-2d" jaise
// jode ban jaate — ek hi cheez do jagah gini jaati. Isliye maths ke liye
// sscmaths2025 wali list li hai: nayi hai aur exam ke hisaab se batti hai.
const SOURCES = {
  math: "/sscmaths2025/index.json",
  reasoning: "/reasonbank/index.json",
  english: "/engbank/index.json",
  gs: "/gkbank/index.json",
};

export const slugify = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const chapterLabel = (slug) =>
  String(slug || "")
    .split("-")
    .filter(Boolean)
    .map((w) => (w.length <= 2 ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1)))
    .join(" ");

let taxCache = null;
let taxPromise = null;

async function fetchList(url) {
  try {
    const r = await fetch(url);
    if (!r.ok) return [];
    const d = await r.json();
    // mathbank/reasonbank/engbank -> chapters[], gkbank -> topics[]
    const rows = Array.isArray(d?.chapters) ? d.chapters : Array.isArray(d?.topics) ? d.topics : [];
    return rows
      .map((c) => (typeof c === "string" ? { slug: c } : c))
      .map((c) => ({ slug: slugify(c.slug || c.name), label: c.label || chapterLabel(c.slug || c.name) }))
      .filter((c) => c.slug);
  } catch {
    return [];
  }
}

// Ek baar load, phir memory se. Index files chhoti hain aur browser inhe waise
// bhi cache kar leta hai.
export function loadTaxonomy() {
  if (taxCache) return Promise.resolve(taxCache);
  if (taxPromise) return taxPromise;
  taxPromise = (async () => {
    const keys = Object.keys(SOURCES);
    const lists = await Promise.all(keys.map((k) => fetchList(SOURCES[k])));
    taxCache = Object.fromEntries(keys.map((k, i) => [k, lists[i]]));
    return taxCache;
  })();
  return taxPromise;
}

export const taxonomy = () => taxCache || {};
export const chaptersFor = (subject) => (taxCache || {})[subject] || [];
export const isKnownChapter = (subject, slug) =>
  chaptersFor(subject).some((c) => c.slug === slug);

// Record ki apni category tabhi chapter maani jaati hai jab wo list mein ho —
// warna wo paper ka naam hai, chapter nahi.
export function categoryChapter(subject, category) {
  const s = slugify(category);
  return s && isKnownChapter(subject, s) ? s : "";
}

// ── store ──────────────────────────────────────────────────────────────────
//
// { uid: { ch, by, at } } — uid wahi jo board banata hai ("mock:<id>" /
// "pyq:<key>"), `by` = "ai" ya "me". Owner ka bataya hua AI se upar rehta hai
// aur AI use kabhi overwrite nahi karta.

function read() {
  if (typeof window === "undefined") return {};
  try {
    const raw = storeGet(KEY);
    const v = raw ? JSON.parse(raw) : {};
    return v && typeof v === "object" && !Array.isArray(v) ? v : {};
  } catch {
    return {};
  }
}

function write(map) {
  try { storeSet(KEY, JSON.stringify(map)); } catch { /* quota — tag chhoot jayega, page nahi tootega */ }
  try { window.dispatchEvent(new CustomEvent("cgl:qchapter-changed")); } catch { /* SSR */ }
}

export function getTags() { return read(); }

export function setTag(uid, ch, by = "me") {
  if (!uid) return;
  setTags([{ uid, ch, by }]);
}

// Bulk — AI ek call mein kai question tag karta hai, aur har ek par alag likhna
// matlab har baar poora store dobara likhna.
export function setTags(rows) {
  const map = read();
  let n = 0;
  for (const r of rows || []) {
    if (!r?.uid) continue;
    const prev = map[r.uid];
    // Owner ka bataya hua pakka hai — AI uspar nahi chadhta.
    if (prev?.by === "me" && r.by === "ai") continue;
    if (!r.ch) { delete map[r.uid]; n += 1; continue; }
    map[r.uid] = { ch: r.ch, by: r.by || "me", at: new Date().toISOString() };
    n += 1;
  }
  if (n) write(map);
  return map;
}

export function removeTag(uid) {
  const map = read();
  if (!(uid in map)) return;
  delete map[uid];
  write(map);
}

// Jo record ab hain hi nahi (delete ho gaye, ya sahi karke nikal gaye) unke tag
// hata do — warna ye list waqt ke saath phoolti rehti.
export function pruneTags(validUids) {
  const valid = validUids instanceof Set ? validUids : new Set(validUids || []);
  const map = read();
  let n = 0;
  for (const k of Object.keys(map)) if (!valid.has(k)) { delete map[k]; n += 1; }
  if (n) write(map);
  return map;
}

// AI khud se naye question tag karta rahe ya nahi. Chhota flag hai, isliye
// seedha localStorage — aur `cgl.` prefix se dusre device par bhi wahi setting.
export function autoOn() {
  if (typeof window === "undefined") return true;
  try { return localStorage.getItem(AUTO_KEY) !== "0"; } catch { return true; }
}
export function setAutoOn(v) {
  try { localStorage.setItem(AUTO_KEY, v ? "1" : "0"); } catch { /* ignore */ }
}

// ── report ─────────────────────────────────────────────────────────────────
//
// Rows: [{ ch, label, n, pct, byMe, byAi, fromQuiz }] — sabse zyada galat wala
// sabse upar. `unknown` alag lautta hai kyunki wahi wo dher hai jispar agla
// kaam karna hai (AI se tag karao ya khud batao).
export function buildReport(records, chapterOf) {
  const by = new Map();
  const unknown = [];
  for (const r of records || []) {
    const got = chapterOf(r);
    if (!got || !got.ch) { unknown.push(r); continue; }
    const cur = by.get(got.ch) || { ch: got.ch, n: 0, byMe: 0, byAi: 0, fromQuiz: 0 };
    cur.n += 1;
    if (got.by === "me") cur.byMe += 1;
    else if (got.by === "ai") cur.byAi += 1;
    else cur.fromQuiz += 1;
    by.set(got.ch, cur);
  }
  const total = [...by.values()].reduce((s, r) => s + r.n, 0);
  const rows = [...by.values()]
    .map((r) => ({ ...r, label: chapterLabel(r.ch), pct: total ? Math.round((r.n / total) * 100) : 0 }))
    .sort((a, b) => b.n - a.n || a.label.localeCompare(b.label));
  return { rows, total, unknown };
}
