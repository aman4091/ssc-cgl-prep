// Daily targets — actionable items shown on the Today page.
import { makeId } from "./storage";

const KEY = "cgl.targets";

function read() {
  if (typeof window === "undefined") return [];
  try { const r = localStorage.getItem(KEY); return r ? JSON.parse(r) : []; }
  catch { return []; }
}
function write(v) { localStorage.setItem(KEY, JSON.stringify(v)); }

export function getTargets() {
  // not-done first, then by createdAt (newest first)
  return read().sort((a, b) => (a.done === b.done ? (b.createdAt || "").localeCompare(a.createdAt || "") : a.done ? 1 : -1));
}
export function addTarget({ type, title, ref }) {
  const all = read();
  const t = { id: "tg_" + makeId(), type, title: title || "", ref: ref || {}, done: false, createdAt: new Date().toISOString() };
  all.unshift(t);
  write(all);
  return t;
}
export function toggleDone(id) {
  write(read().map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
}
export function deleteTarget(id) { write(read().filter((t) => t.id !== id)); }
