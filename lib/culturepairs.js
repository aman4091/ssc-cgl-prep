// ✍️ Bharat Sanskriti ki apni jodiyan — alag chhoti file, kyunki select
// menu (components/SelectAsk) har page par hai aur Parmar ka bada JSON
// (lib/sanskriti) wahan nahi chahiye.

// ── ✍️ Apni jodiyan (select menu → 📝 One-liner → 🪔 Statics) ──
// `cgl.culture.pairs` — [{ id, l, r, note, at }]
// `cgl.culture.pending` — pehla shabd, jab tak jodi-daar select nahi hota
// `cgl.culture.edits` — Parmar wali jodi mein owner ke badlaav { id: {l,r,note} }
const PAIRS = "cgl.culture.pairs";
const PENDING = "cgl.culture.pending";
const EDITS = "cgl.culture.edits";
const rd = (k, d) => { if (typeof window === "undefined") return d; try { return JSON.parse(localStorage.getItem(k) || "null") ?? d; } catch { return d; } };
const wr = (k, v) => {
  try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch { /* quota */ }
  try { window.dispatchEvent(new CustomEvent("cgl:culture-pairs")); } catch { /* SSR */ }
};
export const readPairs = () => { const v = rd(PAIRS, []); return Array.isArray(v) ? v : []; };
export function addPair(l, r, note = "") {
  const a = String(l || "").trim(), b = String(r || "").trim();
  if (!a || !b) return null;
  const p = { id: `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`, l: a, r: b, note: String(note || "").trim(), at: new Date().toISOString() };
  wr(PAIRS, [p, ...readPairs()]);
  return p;
}
export function updatePair(id, patch) { wr(PAIRS, readPairs().map((p) => (p.id === id ? { ...p, ...patch } : p))); }
export function removePair(id) { wr(PAIRS, readPairs().filter((p) => p.id !== id)); }
export const readPending = () => rd(PENDING, "") || "";
export const setPending = (t) => wr(PENDING, t ? String(t).trim() : null);
export const readEdits = () => rd(EDITS, {}) || {};
export function saveEdit(id, patch) { const e = readEdits(); e[id] = { ...(e[id] || {}), ...patch }; wr(EDITS, e); }

// ── 📔 Notes ke page se DeepSeek ki banayi jodiyan ──
// `cgl.culture.notesets` — { [pageKey]: { title, page, pairs: [{l,r,note}], at } }
const NSETS = "cgl.culture.notesets";
export const readNoteSets = () => rd(NSETS, {}) || {};
export function saveNoteSet(key, rec) { const all = readNoteSets(); all[key] = { ...rec, at: new Date().toISOString() }; wr(NSETS, all); }
export function removeNoteSet(key) { const all = readNoteSets(); delete all[key]; wr(NSETS, all); }
