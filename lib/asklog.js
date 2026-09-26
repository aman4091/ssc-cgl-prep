"use client";

// 💬 Poochho ki baatcheet — sambhali hui.
//
// Har baar naya panel kholne par ek THREAD banta hai (jo select kiya tha +
// uspar hui saari baat). Panel ke sar par ‹ › se purane thread wapas aate
// hain — jawab dobara nahi maanga jata, isliye wahan paisa nahi lagta.
//
// Tasveerein bhi saath bachti hain (sirf unke pate, file nahi).

import { storeGet, storeSet } from "./bigstore";

const KEY = "cgl.ask.threads";
const CAP = 100;          // itne se purane thread apne aap gir jaate hain

function read() {
  if (typeof window === "undefined") return [];
  try { const v = JSON.parse(storeGet(KEY) || "[]"); return Array.isArray(v) ? v : []; }
  catch { return []; }
}
function write(list) { try { storeSet(KEY, JSON.stringify(list)); } catch { /* quota */ } }

export function getThreads() { return read(); }

export function newThreadId() {
  return `ask_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

// Naya bhi yahi, purane ko badalna bhi yahi. Sabse naya hamesha sabse upar.
export function saveThread({ id, sel, subject, msgs }) {
  if (!id || !Array.isArray(msgs) || !msgs.length) return;
  const all = read().filter((t) => t.id !== id);
  all.unshift({
    id,
    sel: String(sel || "").slice(0, 600),
    subject: subject || "",
    // Jawab lambe hote hain; do-teen hazaar se aage kaat dena theek hai —
    // panel mein padhne ke liye itna bahut hai.
    msgs: msgs.map((m) => ({
      role: m.role,
      text: String(m.text || "").slice(0, 4000),
      ...(m.imgs && m.imgs.length ? { imgs: m.imgs.slice(0, 10) } : {}),
      ...(m.imgQ ? { imgQ: m.imgQ } : {}),
    })),
    at: Date.now(),
  });
  write(all.slice(0, CAP));
}

export function removeThread(id) { write(read().filter((t) => t.id !== id)); }
export function clearThreads() { write([]); }
