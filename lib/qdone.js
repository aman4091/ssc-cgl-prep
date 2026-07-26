// "Ho gaya" — mark any PYQ / chapter question as already done, so every bank
// splits into a Baaki (pending, the default) tab and a Ho gaye (done) tab. This
// is a plain per-question flag, separate from bookmarks (★) and from the Mistake
// Notebook — it only answers "isse main kar chuka hoon ya nahi". Syncs across
// devices via the cgl.* key.
import { keyFor } from "./qstats";

const KEY = "cgl.qdone";

// Prefer the question's own stable id: the image banks (maths/reasoning) have no
// usable text so keyFor() would collide there, and an id never clashes across
// chapters. Fall back to the text key for the few banks whose questions carry no
// id — the same loose identity the bookmark feature already relies on.
export function doneKeyFor(q) {
  if (q && q.id != null && q.id !== "") return "id:" + String(q.id);
  return keyFor(q);
}

function read() {
  if (typeof window === "undefined") return [];
  try { const r = localStorage.getItem(KEY); return r ? JSON.parse(r) : []; }
  catch { return []; }
}
function write(v) {
  localStorage.setItem(KEY, JSON.stringify(v));
  // Let the open page re-split its list (and any twin button on the other tab
  // stay in sync) the instant a question is marked.
  try { window.dispatchEvent(new CustomEvent("cgl:qdone-changed")); } catch { /* SSR */ }
}

export function getDoneSet() { return new Set(read()); }

export function isDone(q) {
  const k = doneKeyFor(q);
  return !!k && k !== "::" && read().includes(k);
}

// returns true if now marked done, false if un-marked
export function toggleDone(q) {
  const k = doneKeyFor(q);
  if (!k || k === "::") return false;
  const all = read();
  const i = all.indexOf(k);
  let on;
  if (i >= 0) { all.splice(i, 1); on = false; } else { all.unshift(k); on = true; }
  write(all);
  return on;
}
