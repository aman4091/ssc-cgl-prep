"use client";

// 🔁 WRONG SETS — set test mein jo GALAT hua ya CHHODA, wo yahan ek ke baad
// ek set mein judta jata hai (owner): Polity ke 4 galat → Wrong Set 1 mein,
// phir History ke galat/chhode → wahi set, 25 poore hote hi naya set. Wrong
// Set ka test do — usme bhi jo galat/chhoda wo phir ANT wale naye set mein.
// Ye chakkar chalta rehta hai. Page: /wrong-sets (subject-wise).
//
//   cgl.wrongsets  { math: [[q…25], [q…]], reasoning: …, english: …, gs: … }
//
// Owner: "4ro subject ek sets ek hi rakh" — Maths / Reasoning / English / GS
// sab EK hi list mein (har sawaal par `_sub`, card usi se banta hai).
//
//   cgl.wrongsets2  { s0000: "[q…25]", s0001: "[q…]" } (neeche dekho)
//
// Set ki jagah pakki (natija lib/settests mein "wrongsets:all#<set>").
// Jo set de diya gaya wo band — naye sawaal agle set mein. Jo sawaal kisi
// abhi-na-diye set mein pehle se pada hai, wo dobara nahi judta.

import { storeGet, storeSet } from "./bigstore";
import { doneKeyFor } from "./qdone";
import { getChapterResults } from "./settests";

// v2 — 13 Oct reset (lib/settests dekho).
const KEY = "cgl.wrongsets2";
export const WS_SIZE = 25;
export const WRONG_KEY = "wrongsets:all";
const ping = () => { try { window.dispatchEvent(new CustomEvent("cgl:wrongsets")); } catch { /* SSR */ } };
function read() {
  if (typeof window === "undefined") return {};
  try { const v = JSON.parse(storeGet(KEY) || "{}"); return v && typeof v === "object" ? v : {}; } catch { return {}; }
}
function write(v) { try { storeSet(KEY, JSON.stringify(v)); } catch { /* quota */ } ping(); }

// Shakl: { "s0000": "<set ki JSON line>", "s0001": "…" } — har set EK record,
// aur uske andar ka kram ek line mein pakka. Pehle { all: [[…], […]] } tha:
// sync list ke tukdon ka kram nahi rakhta, to doosre device par set aur set ke
// andar ke sawaal ulat-pulat ho jaate (aur natija galat set par chipakta).
const sk = (i) => `s${String(i).padStart(4, "0")}`;
function toStore(sets) {
  const o = {};
  sets.forEach((s, i) => { o[sk(i)] = JSON.stringify(s); });
  return o;
}
export function getWrongSets() {
  const v = read();
  if (Array.isArray(v.all)) {
    // purani shakl — ek baar nayi mein
    const sets = v.all.filter(Array.isArray);
    write(toStore(sets));
    return sets;
  }
  return Object.keys(v).filter((k) => /^s\d{4}$/.test(k)).sort().map((k) => {
    try { const a = JSON.parse(v[k]); return Array.isArray(a) ? a : []; } catch { return []; }
  });
}
export function pushWrong(qs) {
  if (!qs || !qs.length) return;
  const sets = getWrongSets();
  const res = getChapterResults(WRONG_KEY);
  const pending = new Set();
  sets.forEach((s, i) => { if (!res[i]) for (const q of s) pending.add(doneKeyFor(q)); });
  let added = 0;
  for (const q of qs) {
    const k = doneKeyFor(q);
    if (!k || pending.has(k)) continue;
    pending.add(k);
    const li = sets.length - 1;
    if (li < 0 || res[li] || sets[li].length >= WS_SIZE) sets.push([]);
    // Chalte waqt ke nishaan (loading / shown …) copy mein nahi chahiye.
    const { loading, shown, err, ask, regen, ...clean } = q || {};
    sets[sets.length - 1].push(clean);
    added++;
  }
  if (added) write(toStore(sets));
}
