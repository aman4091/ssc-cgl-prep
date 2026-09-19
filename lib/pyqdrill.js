// PYQ drill ka hisaab — har chapter ke liye: kis question par "aata hai"
// kitni baar laga, aur "nahi aata" kitni baar.
//
// Kyun sambhaalna: "nahi aata" ka gap har baar badhta hai (3, 4, 5 … sawaal
// baad), aur agli baar chapter kholne par wahi ginti aage chalti hai — warna
// har baar gap 3 se shuru ho jata.
//
// `cgl.pyqdrill` — baaki cgl. keys ki tarah sync hoti hai; har chapter apna
// record (M:<chapter>), isliye ek chapter chalane se sirf wahi record jata
// hai.

import { storeGet, storeSet } from "./bigstore";

const KEY = "cgl.pyqdrill";

function read() {
  if (typeof window === "undefined") return {};
  try {
    const v = JSON.parse(storeGet(KEY) || "{}");
    return v && typeof v === "object" && !Array.isArray(v) ? v : {};
  } catch { return {}; }
}
function write(map) { storeSet(KEY, JSON.stringify(map)); }

// Question ki pehchaan: bank ka id, warna question ka text (tasveer wale
// bank mein id hi hota hai).
export const qKeyOf = (q) => String(q?.id || q?.qid || (q?.question || "").slice(0, 80));

export function getDrill(chapter) {
  return read()[chapter] || {};
}

/** good = "Aata hai". -> us question ka naya haal. */
export function markDrill(chapter, q, good) {
  const all = read();
  const ch = { ...(all[chapter] || {}) };
  const k = qKeyOf(q);
  const cur = ch[k] || { k: 0, m: 0 };
  // "Aata hai" par galtiyon ki ginti 0 — gap ka badhna wahin tak tha
  // ("jab tak aata hai na laga du"). Agli baar galat hua to phir 3 se.
  ch[k] = good
    ? { k: (cur.k || 0) + 1, m: 0 }
    : { ...cur, m: (cur.m || 0) + 1 };
  all[chapter] = ch;
  write(all);
  return ch[k];
}

export function clearDrill(chapter) {
  const all = read();
  if (!all[chapter]) return;
  all[chapter] = {};
  write(all);
}

// Aata hai -> itne sawaal baad phir (owner: "101 par aayega").
export const KNOWN_GAP = 100;
// Nahi aata -> 3rd sawaal baad, phir 4th, 5th, 6th … har galti par gap +1
// (Fact log jaisa). "Aata hai" lagte hi ginti 0.
export const missGap = (miss) => 2 + Math.max(1, miss);
