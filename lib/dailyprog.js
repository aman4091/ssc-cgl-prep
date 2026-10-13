"use client";

// 📅 Aaj kitna hua — Home ke "Aaj ka mission" ke liye (sync hota hai):
//   vocab  — Vocab slides par kitni aage badhe (50 = ek set, 3 set roz)
//   facts  — Fact log slides par kitni aage badhe (saare facts = ek round, 2 roz)
//   ladder — Calculation ki Seedhi kitni baar poori chadhi (2 roz)
//   cgl.daily.prog  { "YYYY-MM-DD": { vocab, facts, ladder } }

import { storeGet, storeSet } from "./bigstore";

const KEY = "cgl.daily.prog";
export const dayNow = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
function read() {
  if (typeof window === "undefined") return {};
  try { const v = JSON.parse(storeGet(KEY) || "{}"); return v && typeof v === "object" ? v : {}; } catch { return {}; }
}
export function todayProg() { return read()[dayNow()] || {}; }
export function bumpProg(kind, n = 1) {
  if (!n) return;
  const all = read();
  const d = dayNow();
  const e = { ...(all[d] || {}) };
  e[kind] = (e[kind] || 0) + n;
  // Sirf pichhle 14 din rakho.
  const keep = Object.keys(all).sort().slice(-13);
  const out = {};
  for (const k of keep) out[k] = all[k];
  out[d] = e;
  try { storeSet(KEY, JSON.stringify(out)); } catch { /* quota */ }
  try { window.dispatchEvent(new CustomEvent("cgl:home")); } catch { /* ignore */ }
}

// Slides par AAGE badhna ginta hai (peeche jaana nahi).
export function makeStepper(kind) {
  let last = null;
  return (at) => {
    if (last != null && at > last) bumpProg(kind, at - last);
    last = at;
  };
}
