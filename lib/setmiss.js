"use client";

// 🔁 Set test mein jo GALAT hua ya CHHODA — subject-wise ek thaili, taaki
// wahi sawaal baad mein ek naye set mein phir se lagaye ja sakein (owner:
// "jo bhi skip karu ya galat karu usko vahi pr naya set mein copy kar diya
// kar"). Sets wale parde par ye "🔁 Galti / Skip" ke set ban kar dikhte hain.
//
//   cgl.setmiss  { math: [q, …], reasoning: [...], english: [...], gs: [...] }
//
// Sawaal ki poori copy (PYQ ke bank alag-alag chapter mein hain, wahan se
// dobara dhoondhna mehnga). Pehchaan lib/qdone ki doneKeyFor — ek hi sawaal
// do baar nahi. Galti wale set mein SAHI kar diya to thaili se bahar.

import { storeGet, storeSet } from "./bigstore";
import { doneKeyFor } from "./qdone";

const KEY = "cgl.setmiss";
const ping = () => { try { window.dispatchEvent(new CustomEvent("cgl:setmiss")); } catch { /* SSR */ } };
function read() {
  if (typeof window === "undefined") return {};
  try { const v = JSON.parse(storeGet(KEY) || "{}"); return v && typeof v === "object" ? v : {}; } catch { return {}; }
}
function write(v) { try { storeSet(KEY, JSON.stringify(v)); } catch { /* quota */ } ping(); }

export function getMiss(sub) { const v = read()[sub]; return Array.isArray(v) ? v : []; }

export function addMiss(sub, qs) {
  if (!sub || !qs || !qs.length) return;
  const all = read();
  const cur = Array.isArray(all[sub]) ? all[sub] : [];
  const have = new Set(cur.map(doneKeyFor));
  let added = 0;
  for (const q of qs) {
    const k = doneKeyFor(q);
    if (!k || have.has(k)) continue;
    have.add(k);
    // Chalte waqt ke nishaan (loading / shown …) copy mein nahi chahiye.
    const { loading, shown, err, ask, regen, ...clean } = q || {};
    cur.push(clean);
    added++;
  }
  if (added) { all[sub] = cur; write(all); }
}

export function removeMiss(sub, qs) {
  if (!sub || !qs || !qs.length) return;
  const all = read();
  const cur = Array.isArray(all[sub]) ? all[sub] : [];
  const drop = new Set(qs.map(doneKeyFor));
  const next = cur.filter((q) => !drop.has(doneKeyFor(q)));
  if (next.length !== cur.length) { all[sub] = next; write(all); }
}
