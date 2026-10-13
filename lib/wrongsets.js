"use client";

// 🔁 WRONG SETS — set test mein jo GALAT hua ya CHHODA, wo yahan ek ke baad
// ek set mein judta jata hai (owner): Polity ke 4 galat → Wrong Set 1 mein,
// phir History ke galat/chhode → wahi set, 25 poore hote hi naya set. Wrong
// Set ka test do — usme bhi jo galat/chhoda wo phir ANT wale naye set mein.
// Ye chakkar chalta rehta hai. Page: /wrong-sets (subject-wise).
//
//   cgl.wrongsets  { math: [[q…25], [q…]], reasoning: …, english: …, gs: … }
//
// Set ki jagah pakki (natija lib/settests mein "wrongsets:<sub>#<set>").
// Jo set de diya gaya wo band — naye sawaal agle set mein. Jo sawaal kisi
// abhi-na-diye set mein pehle se pada hai, wo dobara nahi judta.

import { storeGet, storeSet } from "./bigstore";
import { doneKeyFor } from "./qdone";
import { getChapterResults } from "./settests";

const KEY = "cgl.wrongsets";
export const WS_SIZE = 25;
export const wrongKey = (sub) => `wrongsets:${sub}`;
const ping = () => { try { window.dispatchEvent(new CustomEvent("cgl:wrongsets")); } catch { /* SSR */ } };
function read() {
  if (typeof window === "undefined") return {};
  try { const v = JSON.parse(storeGet(KEY) || "{}"); return v && typeof v === "object" ? v : {}; } catch { return {}; }
}
function write(v) { try { storeSet(KEY, JSON.stringify(v)); } catch { /* quota */ } ping(); }

export function getWrongSets(sub) { const v = read()[sub]; return Array.isArray(v) ? v.filter(Array.isArray) : []; }
export function wrongCounts() {
  const all = read();
  const out = {};
  for (const k of Object.keys(all)) out[k] = (Array.isArray(all[k]) ? all[k] : []).reduce((n, s) => n + (Array.isArray(s) ? s.length : 0), 0);
  return out;
}

export function pushWrong(sub, qs) {
  if (!sub || !qs || !qs.length) return;
  const all = read();
  const sets = getWrongSets(sub);
  const res = getChapterResults(wrongKey(sub));
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
  if (added) { all[sub] = sets; write(all); }
}
