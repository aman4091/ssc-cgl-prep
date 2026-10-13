"use client";

// ⏸ Beech mein chhoda hua set-test — wahin se RESUME (owner). Set card par
// "Resume" ka button isi se aata hai. Submit hote hi mit jata hai.
//   cgl.setprog  { "<chapterKey>#<set>": { picks, review, seen, cur, left, at } }

// v2 — 13 Oct reset (lib/settests dekho).
const KEY = "cgl.setprog2";
function read() {
  if (typeof window === "undefined") return {};
  try { const v = JSON.parse(localStorage.getItem(KEY) || "{}"); return v && typeof v === "object" ? v : {}; } catch { return {}; }
}
function write(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* quota */ } }

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
