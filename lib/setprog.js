"use client";

// ⏸ Beech mein chhoda hua set-test — wahin se RESUME (owner). Set card par
// "Resume" ka button isi se aata hai. Submit hote hi mit jata hai.
//   cgl.setprog  { "<chapterKey>#<set>": { picks, review, seen, cur, left, at } }

// v2 — 13 Oct reset (lib/settests dekho).
const KEY = "cgl.setprog2";
// storeGet/storeSet (lib/bigstore) — sirf isliye ki mitana (Submit ke baad)
// bhi sync ko pata chale; localStorage.setItem se mitaya hua doosre device se
// wapas aa jata ("Resume" phir dikhta).
import { storeGet, storeSet } from "./bigstore";
import { resultKeys } from "./settests";
// Jo set ho chuka (natija hai) uska bacha-khucha haal nahi gina jata — diya hua
// set dobara nahi khulta, to uska "Resume" bhi nahi (owner).
function read() {
  if (typeof window === "undefined") return {};
  try {
    const v = JSON.parse(storeGet(KEY) || "{}");
    if (!v || typeof v !== "object") return {};
    const done = resultKeys();
    for (const k of Object.keys(v)) if (done.has(k)) delete v[k];
    return v;
  } catch { return {}; }
}
function write(v) { try { storeSet(KEY, JSON.stringify(v)); } catch { /* quota */ } }

export function progsFor(rk) {
  const all = read();
  const out = {};
  const pre = `${rk}#`;
  for (const k of Object.keys(all)) if (k.startsWith(pre)) out[k.slice(pre.length)] = all[k];
  return out;
}
export function saveProg(rk, i, p) { const all = read(); all[`${rk}#${i}`] = { ...p, at: Date.now() }; write(all); }
export function clearProg(rk, i) { const all = read(); if (all[`${rk}#${i}`]) { delete all[`${rk}#${i}`]; write(all); } }

// Saare chhode hue test (Home ke liye) — [{ key, path, title, left, at }]
export function allProgs() {
  const all = read();
  return Object.keys(all).map((k) => ({ key: k, ...all[k] })).filter((p) => p.path).sort((a, b) => (b.at || 0) - (a.at || 0));
}
