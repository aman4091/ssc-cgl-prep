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

// v2 — owner ne 13 Oct ko SAARE test reset karaye ("naye sire se"). Naya naam
// har device par ek saath khaali (sync purana wapas nahi la sakta). Purana
// "cgl.settests" pada hai, padha nahi jata.
const KEY = "cgl.settests2";

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

// 🔒 Set ki pehchaan uske sawaalon se ("s<hash>") — wahi 25 sawaal kisi bhi
// list / dropdown / Home ke raaste se khulein, set EK hi hai. Jo ek baar ho
// gaya wo har jagah "ho gaya" (owner: "set kuch bhi ho jaye, dobara test mein
// nahi chalega"). Number wale (Wrong Sets "0", "1") apni list tak hi.
const isSig = (x) => /^s[0-9a-z]+$/.test(String(x));
// Is set ka natija pehle se kis naam se pada hai — wahi naam, taaki natija
// do jagah na bane (Home par do baar na dikhe).
function ownerId(all, chapterKey, setIdx) {
  const id = idFor(chapterKey, setIdx);
  if (all[id] || !isSig(setIdx)) return id;
  const tail = `#${setIdx}`;
  return Object.keys(all).find((k) => k.endsWith(tail)) || id;
}

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

// Sets wale pages ke liye: is list ke natije + wahi set (pehchaan se) jo kisi
// aur list / dropdown mein diya gaya tha.
export function getSetResults(chapterKey) {
  if (!chapterKey) return {};
  const all = read();
  const out = {};
  const pre = `${chapterKey}#`;
  for (const k of Object.keys(all)) {
    if (k.startsWith(pre)) { out[k.slice(pre.length)] = all[k]; continue; }
    const set = k.slice(k.lastIndexOf("#") + 1);
    if (isSig(set) && !out[set]) out[set] = all[k];
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
  all[ownerId(all, chapterKey, setIdx)] = { ...result, at: new Date().toISOString() };
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

// Saare natije ek saath — Home ke roop (lib/homedata) ke liye.
// -> [{ key: "<chapterKey>", set: "<set>", ...result }]
// Diye hue sets ke naam ("<chapterKey>#<set>") — lib/setprog inka Resume nahi dikhata.
export function resultKeys() { return new Set(Object.keys(read())); }

export function getAllResults() {
  const all = read();
  return Object.keys(all).map((k) => {
    const at = k.lastIndexOf("#");
    return { key: k.slice(0, at), set: k.slice(at + 1), ...all[k] };
  });
}

// Purana natija (set NUMBER se, "#0") naye naam ("#s<hash>") par — waqt (at)
// wahi rehta hai, purani entry hat jati hai (Home par do baar na dikhe).
export function moveResult(chapterKey, from, to) {
  if (!chapterKey || from === to) return;
  const all = read();
  const a = idFor(chapterKey, from);
  const b = idFor(chapterKey, to);
  if (!all[a] || all[b]) return;
  all[b] = all[a];
  delete all[a];
  write(all);
}

// Natije par chhota nishaan (jaise ws: 1) — waqt (at) wahi rehta hai.
export function markResult(chapterKey, setIdx, patch) {
  if (!chapterKey) return;
  const all = read();
  const id = ownerId(all, chapterKey, setIdx);
  if (!all[id]) return;
  all[id] = { ...all[id], ...patch };
  write(all);
}
