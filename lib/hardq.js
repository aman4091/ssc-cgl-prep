// 🔴 Hard — External Mock ka koi question khud "hard" mark karo, taaki wo aam
// list se hat kar apni alag shelf mein chala jaye (Answers board ke "Kahan se
// aaye" dropdown mein). Ye ab is dropdown ki ekloti alag shelf hai — Under-40
// wali hata di gayi, wo question ab aam list mein hi ghoomte hain.
//
// mock record ki apni `id` se keyed hai (qid nahi — haath se paste kiya
// screenshot ka qid khaali bhi ho sakta hai).

import { storeGet, storeSet } from "./bigstore";

const KEY = "cgl.hardq";

function read() {
  if (typeof window === "undefined") return new Set();
  try { return new Set(JSON.parse(storeGet(KEY) || "[]")); }
  catch { return new Set(); }
}
function write(s) {
  try { storeSet(KEY, JSON.stringify([...s])); } catch { /* quota */ }
}
function notify() {
  try { window.dispatchEvent(new CustomEvent("cgl:hard-changed")); } catch { /* SSR */ }
}

export function getHardSet() { return read(); }
export function isHard(id) { return !!id && read().has(id); }

export function toggleHard(id) {
  if (!id) return false;
  const s = read();
  if (s.has(id)) s.delete(id); else s.add(id);
  write(s);
  notify();
  return s.has(id);
}

// Delete ho chuka record ka nishaan bhi saath hata do — warna set chupchaap
// badhta rehta hai.
export function pruneHard(existingIds) {
  const s = read();
  let changed = false;
  for (const id of [...s]) {
    if (!existingIds.has(id)) { s.delete(id); changed = true; }
  }
  if (changed) write(s);
  return s;
}
