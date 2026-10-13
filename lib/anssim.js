"use client";

// 🎯 Answers ke har galat sawaal ke APNE 5 similar — page par wahin, kahin
// jaana nahi (owner: "/similar page par jaake bhi nahi kar raha").
//
// Banne ka kaam lib/simpool hi karta hai (🐋 DeepSeek, peechhe, 5-5 ka group);
// yahan bas yaad rehta hai ki kaunsa group kis sawaal ka hai:
//   cgl.anssim   { recId: [groupId, …] }        (sync hota hai)
// Jo option lagaya wo /similar page wali hi jagah (cgl.qfeed.similar) — taaki
// wahan bhi "ho gaya" dikhe.

import { addSimilar, getPool, pendingCount, SIM_PER } from "./simpool";
import { storeGet, storeSet } from "./bigstore";
import { imagesOf, setOcrText } from "./wrongbook";
import { imageBlob } from "./imgclip";
import { ocrImage } from "./client-ai";

const KEY = "cgl.anssim";
const PICKS = "cgl.qfeed.similar";
export { SIM_PER };

const ping = () => { try { window.dispatchEvent(new CustomEvent("cgl:simpool")); } catch { /* ignore */ } };
function readMap() {
  if (typeof window === "undefined") return {};
  try { const v = JSON.parse(storeGet(KEY) || "{}"); return v && typeof v === "object" ? v : {}; } catch { return {}; }
}

export function simGroups(id) { return readMap()[id] || []; }
export function linkSim(id, g) {
  if (!id || !g) return;
  const all = readMap();
  all[id] = [...new Set([...(all[id] || []), g])];
  try { storeSet(KEY, JSON.stringify(all)); } catch { /* quota */ }
  ping();
}
export function simItems(id) {
  const gs = new Set(simGroups(id));
  return gs.size ? getPool().filter((x) => gs.has(x.g)) : [];
}

// Sawaal ka likha hua text (options samet) — screenshot wale ka OCR bhi chalega.
export function recText(r) {
  const q = r && r.q;
  if (q && q.question) {
    const opts = (q.options || []).filter(Boolean).map((o, i) => `(${String.fromCharCode(65 + i)}) ${o}`).join("\n");
    return `${q.question}\n${opts}`.trim();
  }
  return String((r && r.ocrText) || "").trim();
}
// -> group id, ya null (text hi nahi — tab Gemini wala raasta).
export function makeSim(r) {
  const t = recText(r);
  if (!t) return null;
  const g = addSimilar(t, r.subject || "math", t.slice(0, 60));
  linkSim(r.id, g);
  return g;
}
// Gemini kholne ki zaroorat nahi: text na ho to TASVEER apne aap padho — sirf
// browser ka FREE Tesseract (owner: Gemini API ka kharcha NAHI, kabhi bhi).
// Text record par save (agli baar / doosre device par dobara nahi padhna),
// phir 🐋 DeepSeek ke 5. -> group id.
export async function makeSimAuto(r, onProgress) {
  let t = recText(r);
  if (!t) {
    const imgs = imagesOf(r);
    if (!imgs.length) throw new Error("Is sawaal ka na text hai na tasveer.");
    const blob = await imageBlob(imgs[0]);
    const text = await ocrImage(blob, onProgress);
    t = String(text || "").trim();
    if (!t) throw new Error("Tasveer se text nahi padh paya.");
    setOcrText(r.id, t);
  }
  const g = addSimilar(t, r.subject || "math", t.slice(0, 60));
  linkSim(r.id, g);
  return g;
}
export const simBusy = () => pendingCount() > 0;

export function getPicks() {
  try { const v = JSON.parse(localStorage.getItem(PICKS) || "{}"); return v && typeof v === "object" ? v : {}; } catch { return {}; }
}
// Din-wise ginti (kitne similar kiye / sahi) — Answers ke hafte wale roop ke liye.
const DAYS = "cgl.anssim.days";   // { "YYYY-MM-DD": { n, ok } }
const dk = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
export function simDays() {
  try { const v = JSON.parse(storeGet(DAYS) || "{}"); return v && typeof v === "object" ? v : {}; } catch { return {}; }
}
export function setPick(id, oi, right) {
  const all = getPicks();
  const was = all[id] != null;
  if (oi == null) delete all[id]; else all[id] = oi;
  try { localStorage.setItem(PICKS, JSON.stringify(all)); } catch { /* quota */ }
  if (oi != null && !was) {
    const d = simDays();
    const k = dk();
    d[k] = { n: ((d[k] && d[k].n) || 0) + 1, ok: ((d[k] && d[k].ok) || 0) + (right ? 1 : 0) };
    try { storeSet(DAYS, JSON.stringify(d)); } catch { /* quota */ }
  }
  ping();
}
// { made, tried, right } — ek sawaal ke similar ka haal.
export function simScore(id, picks = getPicks()) {
  const items = simItems(id);
  let tried = 0, right = 0;
  for (const x of items) if (picks[x.id] != null) { tried++; if (picks[x.id] === x.answer) right++; }
  return { made: items.length, tried, right, linked: simGroups(id).length > 0 };
}
