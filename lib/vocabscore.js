"use client";

// 🔤 Jodi milao ka hisaab — kaunsa word kitni baar sahi hua, aur agla kab aaye.
//
// Owner ka niyam:
//   • Jo GALAT hua wo 3-4 set baad phir aaye — aur tab tak aata rahe jab tak
//     sahi na ho jaye.
//   • Har word 4 BAAR sahi karna hai. Jo ek baar sahi hua wo turant nahi, kuch
//     set baad wapas aaye.
//   • 4 baar ho gaya to wo "✅ 4 ho gaye" wale khaane mein chala jata hai —
//     aur wahan bhi wahi jodi milao chalta hai (bhoolne se bachne ke liye).
//
// Waqt (ghante/din) se nahi, SET ki ginti se chalta hai: har poora set +1.
// Isliye ek hi baithak mein bhi cheezein sahi kram se lautti hain, aur roz
// khelo to bhi hisaab wahi rehta hai.
//
// Store chhota hai (har word ka ek chhota record), isliye seedha `cgl.` key —
// baaki cgl.* ki tarah apne aap sync ho jata hai.

import { storeGet, storeSet } from "./bigstore";

const KEY = "cgl.vocab.match";
export const GOAL = 4;             // itni baar sahi = pakka

// Galat hua to itne set baad wapas; sahi hua to itne set baad (taaki turant na
// aaye, par bhoolne se pehle aa jaye). 4 baar ho chuke word ko lambi chhutti.
const AFTER_MISS = 3;
const AFTER_OK = 5;
const AFTER_DONE = 12;

function read() {
  if (typeof window === "undefined") return { n: 0, m: {} };
  try {
    const v = JSON.parse(storeGet(KEY) || "{}");
    return { n: Number(v.n) || 0, m: v.m && typeof v.m === "object" ? v.m : {} };
  } catch { return { n: 0, m: {} }; }
}
function write(v) {
  try { storeSet(KEY, JSON.stringify(v)); } catch { /* quota */ }
  try { window.dispatchEvent(new CustomEvent("cgl:vocab-match")); } catch { /* SSR */ }
}

export function getScores() { return read(); }
export function statOf(s, id) { return (s.m || {})[id] || { ok: 0, miss: 0, due: 0 }; }
export const isDone = (s, id) => statOf(s, id).ok >= GOAL;

/** Poora set khatam — kis-kis mein galti hui, wo bata do. */
export function commitSet(ids, wrongIds) {
  const s = read();
  const n = s.n + 1;
  const m = { ...s.m };
  const bad = new Set(wrongIds || []);
  for (const id of ids || []) {
    const st = { ...statOf(s, id) };
    if (bad.has(id)) {
      // Galat: ginti aage nahi badhti, aur ye jaldi wapas aayega.
      st.miss = (st.miss || 0) + 1;
      st.due = n + AFTER_MISS;
    } else {
      st.ok = (st.ok || 0) + 1;
      st.due = n + (st.ok >= GOAL ? AFTER_DONE : AFTER_OK);
    }
    st.last = Date.now();
    m[id] = st;
  }
  write({ n, m });
  return n;
}

/** Ginti — chhaanti ki patti ke liye. */
export function counts(items) {
  const s = read();
  let done = 0;
  for (const it of items || []) if (isDone(s, it.id)) done += 1;
  return { done, learning: (items || []).length - done, setNo: s.n };
}

/**
 * Agla set chuno.
 *
 * Kram: pehle wo jinka waqt aa gaya (galat wale sabse upar), phir wo jo abhi
 * tak aaye hi nahi, phir jo sabse pehle aane wale hain. Jagah bache to 4-baar
 * wale purane word bhi ghus jate hain — wahi "baad mein kabhi wapas".
 */
export function pickSet(items, size = 5, { onlyDone = false } = {}) {
  const s = read();
  const n = s.n;
  const pool = (items || []).filter((x) => x && x.id);
  const rnd = () => Math.random() - 0.5;

  const learning = pool.filter((x) => !isDone(s, x.id));
  const finished = pool.filter((x) => isDone(s, x.id));

  if (onlyDone) {
    // "4 ho gaye" wala khaana — wahi word, wahi khel.
    const due = finished.filter((x) => statOf(s, x.id).due <= n).sort(rnd);
    const rest = finished.filter((x) => statOf(s, x.id).due > n)
      .sort((a, b) => statOf(s, a.id).due - statOf(s, b.id).due);
    return [...due, ...rest].slice(0, size);
  }

  const score = (x) => {
    const st = statOf(s, x.id);
    if (st.due <= n && st.miss) return 0;      // galat hua tha aur waqt aa gaya
    if (!st.ok && !st.miss) return 1;          // abhi tak aaya hi nahi
    if (st.due <= n) return 2;                 // sahi hua tha, dobara dekhne ka waqt
    return 3;                                  // abhi mohlat par hai
  };
  const sorted = [...learning].sort(rnd).sort((a, b) => score(a) - score(b));
  const out = sorted.slice(0, size);
  if (out.length < size && finished.length) {
    const extra = finished
      .filter((x) => statOf(s, x.id).due <= n)
      .sort(rnd)
      .slice(0, size - out.length);
    out.push(...extra);
  }
  return out;
}
