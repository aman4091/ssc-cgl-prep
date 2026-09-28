"use client";

// 🏷️ Har question ka ek TAG — "ye sawaal mere liye kaisa hai".
//
// Pehle do alag nishaan the: ✅ "ho gaya" aur 🔴 "hard". Dono hata diye gaye —
// unse ye pata nahi chalta tha ki sawaal aata hai ya nahi, bas itna ki chhua
// tha. Ab ek hi tag hota hai, paanch mein se:
//
//   ⚡ t45     — 45 second ke neeche nikal gaya
//   🟢 easy90  — easy hai, 90 second ke neeche (45–90)
//   🟡 easy90p — easy to hai par 90 paar chala gaya
//   🟠 hardok  — hard hai, par ho jayega
//   ⛔ skip    — permanent skip, isme time barbaad nahi karna
//
// Tag do tarah se lagta hai:
//   • APNE AAP — solve (stylus) page par har question ki ghadi chalti hai.
//     <45s => t45, 45–90s => easy90, skip dabaya => skip. 90 se upar wale par
//     kuch nahi lagta (owner: "unko mein khud tag dunga").
//   • HAATH SE — Answers page ke har card par, aur solve page ki patti par,
//     ek chhota dropdown.
//
// Haath se lagaya tag pakka hai: ghadi use kabhi nahi badalti.

import { storeGet, storeSet } from "./bigstore";

const KEY = "cgl.qtags";

export const TAGS = [
  { k: "t45", label: "⚡ 45 sec ke neeche", short: "⚡ <45s", c: "#22c55e" },
  { k: "easy90", label: "🟢 Easy — 90 ke neeche", short: "🟢 <90s", c: "#84cc16" },
  { k: "easy90p", label: "🟡 Easy hai par 90 paar", short: "🟡 90+", c: "#eab308" },
  { k: "hardok", label: "🟠 Hard hai par ho jayega", short: "🟠 Hard", c: "#f97316" },
  { k: "skip", label: "⛔ Permanent skip", short: "⛔ Skip", c: "#ef4444" },
];

export function tagMeta(k) { return TAGS.find((t) => t.k === k) || null; }

// Kis naam se tag rakha jaye.
//
// Pehle record ki apni `id` se rakha jata tha. Wo id us device par bani hoti
// hai jahan question pehli baar aaya — sync ke baad dono jagah wahi id hoti
// hai, par agar kabhi wahi sawaal do jagah alag-alag record ban jaye (overlay
// se yahan, screenshot se wahan) to tag ek device par lagta aur doosre par
// dikhta hi nahi. `qid` (q1153) bank ka apna number hai — har device par ek
// jaisa. Isliye qid ho to wahi, warna id.
export function tagKey(rec) {
  if (!rec) return "";
  if (typeof rec === "string") return rec;
  const q = String(rec.qid || "").trim();
  return q ? "q:" + q : String(rec.id || "");
}
// Purane (id wale) tag bhi padhte rehte hain — dobara lagane ki zaroorat nahi.
function keysOf(rec) {
  if (!rec || typeof rec === "string") return [String(rec || "")];
  const out = [tagKey(rec)];
  if (rec.id && !out.includes(String(rec.id))) out.push(String(rec.id));
  return out;
}

function read() {
  if (typeof window === "undefined") return {};
  try { const v = JSON.parse(storeGet(KEY) || "{}"); return v && typeof v === "object" ? v : {}; }
  catch { return {}; }
}
function write(map) {
  try { storeSet(KEY, JSON.stringify(map)); } catch { /* quota */ }
  try { window.dispatchEvent(new CustomEvent("cgl:qtags")); } catch { /* SSR */ }
}

export function getTags() { return read(); }

export function getTag(rec) {
  const all = read();
  for (const k of keysOf(rec)) if (all[k]) return all[k].t || "";
  return "";
}

/** Pehle se bani hui map mein se — list ke har row ke liye (har baar read nahi). */
export function tagIn(map, rec) {
  for (const k of keysOf(rec)) if (map && map[k]) return map[k].t || "";
  return "";
}

/** Tag lagao ya hatao (k = "" matlab hata do). `by` = "hand" ya "auto". */
export function setTag(rec, k, extra = {}) {
  const key = tagKey(rec);
  if (!key) return "";
  const all = read();
  for (const old of keysOf(rec)) delete all[old];      // purana (id wala) bhi hata do
  if (k) all[key] = { t: k, at: Date.now(), by: extra.by || "hand", secs: extra.secs || 0 };
  write(all);
  return k;
}

/** Ghadi ka faisla — sirf tab jab is question par pehle se koi tag na ho. */
export function autoTagBySecs(rec, secs) {
  const key = tagKey(rec);
  if (!key || !Number.isFinite(secs) || secs < 3) return "";   // 3s se kam = bas jhaank kar nikal gaye
  const all = read();
  for (const k0 of keysOf(rec)) if (all[k0]) return all[k0].t; // pehle se tag hai — haath nahi lagate
  const k = secs < 45 ? "t45" : secs <= 90 ? "easy90" : "";     // 90 paar wale owner khud tag karega
  if (!k) return "";
  all[key] = { t: k, at: Date.now(), by: "auto", secs: Math.round(secs) };
  write(all);
  return k;
}

/** Kis tag ke kitne question — chhaanti ki patti ke liye. */
export function tagCounts(recs) {
  const all = read();
  const out = {};
  for (const t of TAGS) out[t.k] = 0;
  for (const r of recs || []) {
    const t = tagIn(all, r);
    if (t && out[t] !== undefined) out[t] += 1;
  }
  return out;
}
