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
//   cgl.wrongsets  { all: [[q…25], [q…], …] }
//
// Set ki jagah pakki (natija lib/settests mein "wrongsets:all#<set>").
// Jo set de diya gaya wo band — naye sawaal agle set mein. Jo sawaal kisi
// abhi-na-diye set mein pehle se pada hai, wo dobara nahi judta.

import { storeGet, storeSet } from "./bigstore";
import { doneKeyFor } from "./qdone";
import { getChapterResults } from "./settests";

const KEY = "cgl.wrongsets";
export const WS_SIZE = 25;
export const WRONG_KEY = "wrongsets:all";
const ping = () => { try { window.dispatchEvent(new CustomEvent("cgl:wrongsets")); } catch { /* SSR */ } };
function read() {
  if (typeof window === "undefined") return {};
  try { const v = JSON.parse(storeGet(KEY) || "{}"); return v && typeof v === "object" ? v : {}; } catch { return {}; }
}
function write(v) { try { storeSet(KEY, JSON.stringify(v)); } catch { /* quota */ } ping(); }

export function getWrongSets() {
  const v = read();
  const sets = Array.isArray(v.all) ? v.all.filter(Array.isArray) : [];
  // Pehle subject-wise alag the — ek baar jod kar ek list.
  const old = ["math", "reasoning", "english", "gs"].filter((k) => Array.isArray(v[k]) && v[k].length);
  if (!old.length) return sets;
  for (const k of old) for (const s of v[k]) if (Array.isArray(s) && s.length) sets.push(s.map((q) => ({ ...q, _sub: q._sub || k })));
  write({ all: sets });
  return sets;
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
  if (added) write({ all: sets });
}
