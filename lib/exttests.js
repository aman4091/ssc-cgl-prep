// Log of tests taken on OTHER websites — link, score, time, section, website.
import { makeId } from "./storage";

const KEY = "cgl.exttests";

function read() {
  if (typeof window === "undefined") return [];
  try { const r = localStorage.getItem(KEY); return r ? JSON.parse(r) : []; }
  catch { return []; }
}
function write(v) { localStorage.setItem(KEY, JSON.stringify(v)); }

export function getTests() {
  return read().sort((a, b) => (b.date || "").localeCompare(a.date || "") || (b.createdAt || "").localeCompare(a.createdAt || ""));
}
export function addTest(t) {
  const all = read();
  const rec = { id: "xt_" + makeId(), createdAt: new Date().toISOString(), ...t };
  all.unshift(rec);
  write(all);
  return rec;
}
export function deleteTest(id) { write(read().filter((x) => x.id !== id)); }
export function updateTest(id, patch) { write(read().map((x) => (x.id === id ? { ...x, ...patch } : x))); }
