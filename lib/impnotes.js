// ⭐ IMP — Fact log / Vocab ki har slide ka apna stylus page (owner). Answers
// wale IMP (lib/impink) jaisa: doc lib/ink mein ("imp:<slide key>"), aur yahan
// sirf uska PATA — cloud par kahan hai, kaunsa rev:
//   cgl.impnotes  { "<kind>:<slide key>": { impUrl, impAt, impRev, impStrokes, impH, impPrev } }
// storeSet se, taaki sync ho (har slide ek record). Likhna sirf tablet par
// (lib/inkdevice), dikhna har jagah.

import { storeGet, storeSet } from "./bigstore";

const KEY = "cgl.impnotes";
export const NOTE_PRE = "imp:";

function read() {
  if (typeof window === "undefined") return {};
  try { const v = JSON.parse(storeGet(KEY) || "{}"); return v && typeof v === "object" ? v : {}; } catch { return {}; }
}

export const noteKey = (kind, key) => `${kind}:${key}`;
export function getImpNote(k) { return read()[k] || null; }

// lib/ink ke liye "record" — inkUrl/inkRev… ki jagah is slide ke imp wale.
export function noteRec(k) {
  const p = getImpNote(k) || {};
  return { id: `${NOTE_PRE}${k}`, inkUrl: p.impUrl || "", inkRev: p.impRev || 0, inkAt: p.impAt || "", inkPrev: p.impPrev || "" };
}

export function setImpNoteInk(k, { inkUrl, inkAt, inkRev, inkStrokes, inkH, inkPrev }) {
  const all = read();
  const prev = all[k] || {};
  all[k] = {
    ...(prev.meta ? { meta: prev.meta } : {}),
    impUrl: inkUrl || "",
    impAt: inkAt || new Date().toISOString(),
    impRev: inkRev || 0,
    impStrokes: inkStrokes || 0,
    impH: inkH || 0,
    impPrev: inkPrev === undefined ? prev.impPrev || "" : inkPrev,
  };
  storeSet(KEY, JSON.stringify(all));
  try { window.dispatchEvent(new CustomEvent("cgl:impnotes")); } catch { /* SSR */ }
}

// Saare IMP wale page ke liye pehchaan (PYQ: sawaal ki tasveer / text, wapas
// ka link) — data source ke bina bhi dikh sake.
export function setImpNoteMeta(k, meta) {
  const all = read();
  const prev = all[k] || {};
  if (JSON.stringify(prev.meta || null) === JSON.stringify(meta)) return;
  all[k] = { ...prev, meta };
  storeSet(KEY, JSON.stringify(all));
}
export function allImpNotes() { return read(); }

// Pata hatao (sync mein bhi hatega — storeSet ka tombstone).
export function removeImpNote(k) {
  const all = read();
  if (!all[k]) return;
  delete all[k];
  storeSet(KEY, JSON.stringify(all));
  try { window.dispatchEvent(new CustomEvent("cgl:impnotes")); } catch { /* SSR */ }
}
export function allImpNoteKeys() { return Object.keys(read()); }

// Likhne ke parde ke liye slide ka text (title + points) — click karte waqt
// rakh dete hain, page wahi padhta hai (Trace + upar dikhane ko).
const CTX = "imp.ctx";
export function putImpCtx(k, ctx) { try { const all = JSON.parse(localStorage.getItem(CTX) || "{}"); all[k] = ctx; localStorage.setItem(CTX, JSON.stringify(all)); } catch { /* ignore */ } }
export function getImpCtx(k) { try { return (JSON.parse(localStorage.getItem(CTX) || "{}") || {})[k] || null; } catch { return null; } }
