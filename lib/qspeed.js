// Per-question SPEED buckets — Maths & Reasoning only.
//
// Har attempt ka LATEST time + correctness store hota hai, keyed by doneKeyFor
// (id-preferred, isliye image banks — maths/reasoning crops — safe hain jahan
// keyFor "::" pe collide karta). Bucket kabhi alag list mein "move" nahi hota —
// wo hamesha stored latest {sec, correct} se compute hota, isliye jab tum kisi
// slow question ko dobara tez (aur sahi) karte ho to wo apne-aap tez bucket mein
// aa jaata hai. Skip / galat / >2min sab "over2" mein.
//
// over2 bucket hand-kept Wrong Book (cgl.wrongbook) ke us subject ke records bhi
// dikhata hai — un par timing nahi hoti, wo "in par kaam karna hai" reference hain.
//
// cgl.* key hai to lib/sync.js apne-aap cross-device sync karta hai.

import { doneKeyFor } from "./qdone";
import { getWrongBook } from "./wrongbook";

const KEY = "cgl.qspeed";

// Thresholds strictly-less-than: <30, <50, <70, <90, <120, else over2.
export const SPEED_BUCKETS = [
  { key: "b1",    label: "Under 30 sec",   short: "<30s",       max: 30,       tone: "fast" },
  { key: "b2",    label: "30 – 50 sec",    short: "30–50s",     max: 50,       tone: "good" },
  { key: "b3",    label: "50 sec – 1:10",  short: "50s–1:10",   max: 70,       tone: "ok"   },
  { key: "b4",    label: "1:10 – 1:30",    short: "1:10–1:30",  max: 90,       tone: "slow" },
  { key: "b5",    label: "1:30 – 2:00",    short: "1:30–2:00",  max: 120,      tone: "slow" },
  { key: "over2", label: "Over 2 min · skip/galat", short: ">2min", max: Infinity, tone: "bad" },
];

export const SPEED_SUBJECTS = [
  { key: "math",      label: "Maths",     icon: "🧮" },
  { key: "reasoning", label: "Reasoning", icon: "🧠" },
];

function read() {
  if (typeof window === "undefined") return {};
  try {
    const r = localStorage.getItem(KEY);
    const v = r ? JSON.parse(r) : {};
    return v && typeof v === "object" ? v : {};
  } catch { return {}; }
}
function write(v) {
  try { localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* quota */ }
  try { window.dispatchEvent(new CustomEvent("cgl:qspeed-changed")); } catch { /* SSR */ }
}

export function speedKeyFor(q) { return doneKeyFor(q); }

// Which bucket a stored record falls in. Wrong / skipped → over2 regardless of time.
export function bucketOf(rec) {
  if (!rec || !rec.correct) return "over2";
  const s = rec.sec || 0;
  for (const b of SPEED_BUCKETS) if (s < b.max) return b.key;
  return "over2";
}

// Upsert one attempt. LATEST sec + correct win — re-attempt decides the new bucket.
export function recordSpeed(q, { sec = 0, correct = false, subject = "" } = {}) {
  const k = speedKeyFor(q);
  if (!k || k === "::") return;
  const all = read();
  const prev = all[k];
  all[k] = {
    q,                                    // render-ref (image banks carry qImg/optImgs/solImg/id)
    sec: Math.max(0, Math.round(sec)),
    correct: !!correct,
    subject: subject || prev?.subject || "",
    tries: (prev?.tries || 0) + 1,
    lastAt: new Date().toISOString(),
  };
  write(all);
}

export function getSpeed(q) {
  const k = speedKeyFor(q);
  if (!k || k === "::") return null;
  return read()[k] || null;
}

// Grouped buckets for one subject, each newest-first. over2 also folds in that
// subject's hand-kept Wrong Book records (as reference items, deduped by key).
export function getBuckets(subject) {
  const out = {};
  for (const b of SPEED_BUCKETS) out[b.key] = [];
  const all = read();
  const seen = new Set();
  for (const [k, rec] of Object.entries(all)) {
    if (subject && rec.subject !== subject) continue;
    out[bucketOf(rec)].push({ key: k, kind: "timed", rec, at: rec.lastAt || "" });
    seen.add(k);
  }
  try {
    for (const r of getWrongBook(subject) || []) {
      const k = "wb:" + r.id;
      if (seen.has(k)) continue;
      out.over2.push({ key: k, kind: "wb", wb: r, at: r.at || "" });
    }
  } catch { /* wrongbook unavailable */ }
  for (const b of SPEED_BUCKETS) {
    out[b.key].sort((a, z) => String(z.at).localeCompare(String(a.at)));
  }
  return out;
}

export function speedCounts(subject) {
  const bk = getBuckets(subject);
  const counts = {};
  let total = 0;
  for (const b of SPEED_BUCKETS) { counts[b.key] = bk[b.key].length; total += counts[b.key]; }
  counts.total = total;
  return counts;
}

// Drop a subject's timed records (Wrong Book reference stays — it has its own page).
export function clearSpeed(subject) {
  const all = read();
  for (const [k, rec] of Object.entries(all)) {
    if (!subject || rec.subject === subject) delete all[k];
  }
  write(all);
}
