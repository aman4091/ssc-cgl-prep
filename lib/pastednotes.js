"use client";

// 📝 Paste kiye hue notes — Parmar (ya kisi bhi) notes ke page ka ✨ dabane
// par jo AI se banta hai, wo yahan aakar baith jata hai.
//
// Kaam ka kram:
//   1. Notes ke kisi page par ✨ dabao → prompt + page ka text copy hota hai,
//      AI site khulti hai, aur "kis page par dabaya tha" yahan yaad rakha
//      jata hai (lastSource).
//   2. /notes/paste kholo → wahi naam upar dikhta hai, neeche paste karo.
//      Note usi book · chapter · page ke naam se sambhal jata hai.
//
// Ek page ke liye ek hi note rehta hai: dobara paste karne par purana badal
// jata hai, do copy nahi banti.

import { storeGet, storeSet } from "./bigstore";

const KEY = "cgl.pastednotes";
// "Aakhri baar kahan ✨ dabaya" — ye is DEVICE ki nazar hai, data nahi.
// Isliye chhoti key, aur sync se bahar (lib/syncitems LOCAL_ONLY).
const LAST = "cgl.pastednotes.last";

function read() {
  if (typeof window === "undefined") return [];
  try { const v = JSON.parse(storeGet(KEY) || "[]"); return Array.isArray(v) ? v : []; }
  catch { return []; }
}
function write(list) {
  try { storeSet(KEY, JSON.stringify(list)); } catch { /* quota */ }
  try { window.dispatchEvent(new CustomEvent("cgl:pastednotes")); } catch { /* SSR */ }
}

// Ek page ki pehchaan — book ka slug aur uske andar ka page number.
export function noteKey(src) {
  return `${String((src && src.book) || "").trim()}#${String((src && src.page) || "").trim()}`;
}

export function getNotes() { return read(); }

export function getNote(src) {
  const k = noteKey(src);
  return read().find((n) => n.k === k) || null;
}

export function saveNote(src, text) {
  const t = String(text || "").trim();
  const k = noteKey(src);
  if (!k || k === "#") return null;
  const all = read().filter((n) => n.k !== k);
  if (!t) { write(all); return null; }      // khali paste = note hata do
  const rec = {
    k,
    book: (src && src.book) || "",
    bookTitle: (src && src.bookTitle) || "",
    eyebrow: (src && src.eyebrow) || "",
    topic: (src && src.topic) || "",
    page: (src && src.page) || "",
    text: t.slice(0, 20000),
    at: Date.now(),
  };
  all.unshift(rec);
  write(all);
  return rec;
}

export function removeNote(k) { write(read().filter((n) => n.k !== k)); }
export function clearNotes() { write([]); }

// ── aakhri ✨ ────────────────────────────────────────────────────────────
export function setLastSource(src) {
  if (typeof window === "undefined") return;
  try { storeSet(LAST, JSON.stringify({ ...src, at: Date.now() })); } catch { /* ignore */ }
  try { window.dispatchEvent(new CustomEvent("cgl:pastednotes-src", { detail: src })); } catch { /* ignore */ }
}
export function getLastSource() {
  if (typeof window === "undefined") return null;
  try { const v = JSON.parse(storeGet(LAST) || "null"); return v && v.book ? v : null; }
  catch { return null; }
}

// Book ke hisaab se jatthe, aur har jatthe ke andar page ke number se kram.
export function notesByBook() {
  const map = new Map();
  for (const n of read()) {
    const key = n.book || "other";
    if (!map.has(key)) map.set(key, { book: key, title: n.bookTitle || key, eyebrow: n.eyebrow || "", items: [] });
    map.get(key).items.push(n);
  }
  for (const g of map.values()) g.items.sort((a, b) => (Number(a.page) || 0) - (Number(b.page) || 0));
  return [...map.values()];
}
