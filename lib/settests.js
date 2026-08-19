// 🧾 Set test ka natija — "Set 3 ho chuka hai, 18/25, 9 min lage".
//
// Kyun sambhaal kar rakhte hain: chapter page par har set ek card hai. Jo set
// ho chuka hai uspar natija dikhna chahiye aur dobara khologe to poochha jaana
// chahiye — "phir se test doge ya solutions dekhoge". Bina record ke ye dono
// baatein pata hi nahi chalti.
//
// `picks` mein set ke andar ka number (0-24) aur uspar chuna gaya option hai.
// Number se isliye ki wo sthir hai — set hamesha list ke asli kram se kata
// jata hai (Set 1 = Q 1-25, hamesha wahi). Question ka text-key rakhte to wo
// lamba bhi hota aur banks ke beech takra bhi sakta tha.
//
// Ek chapter ke 31 set × 25 number ≈ 6 KB, isliye ye bigstore (IndexedDB) ki
// list mein hai — localStorage bhar jata.

import { storeGet, storeSet } from "./bigstore";

const KEY = "cgl.settests";

function read() {
  if (typeof window === "undefined") return {};
  try { const r = storeGet(KEY); return r ? JSON.parse(r) : {}; }
  catch { return {}; }
}
function write(v) {
  storeSet(KEY, JSON.stringify(v));
  try { window.dispatchEvent(new CustomEvent("cgl:settest-changed")); } catch { /* SSR */ }
}

const idFor = (chapterKey, setIdx) => `${chapterKey}#${setIdx}`;

// Ek chapter ke saare natije — { [setIdx]: result }
export function getChapterResults(chapterKey) {
  if (!chapterKey) return {};
  const all = read();
  const out = {};
  const pre = `${chapterKey}#`;
  for (const k of Object.keys(all)) {
    if (k.startsWith(pre)) out[k.slice(pre.length)] = all[k];
  }
  return out;
}

export function getSetResult(chapterKey, setIdx) {
  if (!chapterKey) return null;
  return read()[idFor(chapterKey, setIdx)] || null;
}

// { right, wrong, skipped, total, sec, at, picks }
export function saveSetResult(chapterKey, setIdx, result) {
  if (!chapterKey) return;
  const all = read();
  all[idFor(chapterKey, setIdx)] = { ...result, at: new Date().toISOString() };
  write(all);
}

// SSC ka hisaab: sahi par +2, galat par -0.5, chhode hue par kuch nahi.
export const MARK_RIGHT = 2;
export const MARK_WRONG = 0.5;

export function marksOf(r) {
  if (!r) return 0;
  return (r.right || 0) * MARK_RIGHT - (r.wrong || 0) * MARK_WRONG;
}
export function maxMarks(total) { return (total || 0) * MARK_RIGHT; }
// -0.5 aata hai, isliye "1.5" chahiye par "2.0" nahi.
export const fmtMarks = (m) => (Number.isInteger(m) ? String(m) : m.toFixed(1));

export function accuracyOf(r) {
  if (!r) return 0;
  const tried = (r.right || 0) + (r.wrong || 0);
  return tried ? Math.round((r.right / tried) * 100) : 0;
}
