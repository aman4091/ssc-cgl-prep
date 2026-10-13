"use client";

// ✅ Answers ke sawaal ka SAHI OPTION — jo tumne khud bataya (set test ke
// natije par "Sahi option kaunsa tha?"). Sawaal screenshot hain, unke option
// tasveer mein — record mein sahi option hota hi nahi. Ek baar bata diya to
// hamesha ke liye: agle set / dobara test mein apne aap sahi-galat.
//   cgl.anskeys  { "<record id>": 0..3 }   (sync hota hai)

import { storeGet, storeSet } from "./bigstore";

const KEY = "cgl.anskeys";
function read() {
  if (typeof window === "undefined") return {};
  try { const v = JSON.parse(storeGet(KEY) || "{}"); return v && typeof v === "object" ? v : {}; } catch { return {}; }
}
export function savedKey(id) { const v = read()[id]; return Number.isInteger(v) ? v : -1; }
export function setSavedKey(id, idx) {
  if (!id) return;
  const all = read();
  all[id] = idx;
  try { storeSet(KEY, JSON.stringify(all)); } catch { /* quota */ }
  try { window.dispatchEvent(new CustomEvent("cgl:anskeys")); } catch { /* ignore */ }
}
