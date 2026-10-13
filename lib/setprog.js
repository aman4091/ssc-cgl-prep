"use client";

// ⏸ Beech mein chhoda hua set-test — wahin se RESUME (owner). Set card par
// "Resume" ka button isi se aata hai. Submit hote hi mit jata hai.
//   cgl.setprog  { "<chapterKey>#<set>": { picks, review, seen, cur, left, at } }

const KEY = "cgl.setprog";
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
