// 📝 One-liners — overlay ke 📝 button se aayi ek-ek line, apni alag jagah.
//
// Kaam ka silsila: subject ka screenshot -> Gemini ka poora answer (wo Answers
// page par jata hai) -> usi chat mein one-liner ka prompt -> jo chhoti line
// aati hai wo YAHAN. Fact log (lib/missionfacts) aur Zaroori baatein
// (lib/sscpoints) se alag store hai — owner: "fact log mein mt bhej, alag
// page bana" — taaki unka revision is dher se na bhar jaye.
//
// `cgl.oneliners` — list of { id, subject, text, at }. Baaki cgl. keys ki
// tarah sync hoti hai, aur list hone ki wajah se har line apna record: do
// device par alag-alag judein to dono bachti hain.

import { storeGet, storeSet } from "./bigstore";

const KEY = "cgl.oneliners";

export const OL_SUBS = [
  { k: "gs", label: "GS", icon: "🌍" },
  { k: "english", label: "English", icon: "📘" },
  { k: "math", label: "Maths", icon: "🔢" },
  { k: "reasoning", label: "Reasoning", icon: "🧠" },
];

export function subOf(k) {
  return OL_SUBS.find((s) => s.k === k) || { k: k || "gs", label: k || "GS", icon: "📝" };
}

function read() {
  if (typeof window === "undefined") return [];
  try {
    const v = JSON.parse(storeGet(KEY) || "[]");
    return Array.isArray(v) ? v.filter((o) => o && o.id && o.text) : [];
  } catch { return []; }
}

function write(list) {
  try { storeSet(KEY, JSON.stringify(list)); } catch { /* quota */ }
  try { window.dispatchEvent(new CustomEvent("cgl:oneliners-changed")); } catch { /* SSR */ }
}

export function getOneLiners() { return read(); }

/** Overlay se aayi ek line. -> naya record ya null (khali/duplicate par). */
export function addOneLiner({ subject, text }) {
  const t = String(text || "").trim();
  if (!t) return null;
  const list = read();
  // Wahi line dobara (overlay ne ack se pehle phir bhej di) — ek hi rahegi.
  if (list.some((o) => o.text.trim() === t)) return null;
  const o = {
    id: `ol_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    subject: OL_SUBS.some((s) => s.k === subject) ? subject : "gs",
    text: t.slice(0, 2000),
    at: new Date().toISOString(),
  };
  write([o, ...list]);
  return o;
}

export function removeOneLiner(id) { write(read().filter((o) => o.id !== id)); }

export function clearOneLiners() { write([]); }

/** Ek record ki alag-alag lines — popup aur list dono isi se bante hain. */
export function olLines(text) {
  return String(text || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

/** List mein dikhne wali pehli line — aage lagi ginti ("1.") hata ke. */
export function olTitle(o) {
  const first = olLines(o && o.text)[0] || "";
  return first.replace(/^\d+[.)]\s*/, "");
}

/** "🧠 Yaad rakhne ki trick:" wali line — popup mein alag se dikhti hai. */
export function isTrickLine(line) {
  return /^🧠|yaad rakhne ki trick/i.test(String(line || "").trim());
}
