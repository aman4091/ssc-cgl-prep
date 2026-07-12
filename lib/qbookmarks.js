// Bookmarked questions — save any quiz/PYQ question to revisit & practice later.
import { keyFor } from "./qstats";

const KEY = "cgl.qbookmarks";

function read() {
  if (typeof window === "undefined") return [];
  try { const r = localStorage.getItem(KEY); return r ? JSON.parse(r) : []; }
  catch { return []; }
}
function write(v) { localStorage.setItem(KEY, JSON.stringify(v)); }

export function getQBookmarks() { return read(); } // [{ key, q, subject, addedAt }]

export function isQBookmarked(q) {
  const k = keyFor(q);
  return read().some((b) => b.key === k);
}

// returns true if now bookmarked, false if removed
export function toggleQBookmark(q, subject) {
  const k = keyFor(q);
  if (!k || k === "::") return false;
  const all = read();
  const i = all.findIndex((b) => b.key === k);
  if (i >= 0) { all.splice(i, 1); write(all); return false; }
  all.unshift({ key: k, q, subject: subject || "", addedAt: new Date().toISOString() });
  write(all);
  return true;
}

// Add to bookmarks only if not already there (used by auto-bookmark on answer).
export function bookmarkQuestion(q, subject) {
  if (!isQBookmarked(q)) return toggleQBookmark(q, subject);
  return true;
}

export function removeQBookmark(key) { write(read().filter((b) => b.key !== key)); }
export function clearQBookmarks() { localStorage.removeItem(KEY); }
