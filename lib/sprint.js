"use client";

// ⚡ Sprint — 100 question, 30 second har ek, aur har question ka jawab
// DeepSeek pehle se bana kar rakhta hai.
//
// Ye PYQ bank ke apne page se ALAG chalta hai. Bank ke page jaise the waise
// hi rehte hain — wahan ki ✅ ho-gaya / stats / bookmark ko ye na padhta hai
// na chhoota hai. Sprint ka apna hisaab hai:
//
//   cgl.sprint.done   — kaun se question sprint mein aa chuke (sirf HASH,
//                       poora sawaal nahi — 30,000 sawaal ka naam sambhalna
//                       bekaar bhaari hai). Isi se "agli baar agle 100" hota.
//   cgl.sprint.marks  — ★ kiye hue question, apni copy ke saath (bank ka
//                       chapter kabhi na khule tab bhi list khulti rahe).
//   cgl.sprint.ans    — sirf TASVEER wale question (Maths/Reasoning) ka
//                       DeepSeek jawab. Text wale ka jawab cgl.dsanswers
//                       mein hi jata hai — wahi store bank ka card bhi
//                       padhta hai, isliye wahan bhi apne aap dikh jayega.
//
// Pehchaan wahi shakl hai jo qstats/dsanswers use karte hain (sawaal + sahi
// option), taaki text wale question ki key dono jagah ek rahe.

import { storeGet, storeSet } from "./bigstore";
import { hashStr } from "./syncitems";
import { keyFor } from "./qstats";
import { getDsAnswer, saveDsAnswer } from "./dsanswers";

const K_DONE = "cgl.sprint.done";
const K_MARKS = "cgl.sprint.marks";
const K_ANS = "cgl.sprint.ans";

function read(key, fallback) {
  if (typeof window === "undefined") return fallback;
  try { const r = storeGet(key); return r ? JSON.parse(r) : fallback; }
  catch { return fallback; }
}
function write(key, val) { try { storeSet(key, JSON.stringify(val)); } catch { /* quota */ } }

const norm = (s) => String(s || "").toLowerCase().replace(/\s+/g, " ").trim().slice(0, 240);

// Tasveer wale bank (Pinnacle Maths/Reasoning) mein sawaal `qText`/`optText`
// mein padha hua hai — dikhta image se hai, par AI ko yahi text jata hai.
export function qText(q) { return String((q && (q.question || q.qText)) || "").trim(); }
export function qOpts(q) {
  const o = (q && (q.options || q.optText)) || [];
  return Array.isArray(o) ? o.map((x) => String(x == null ? "" : x).trim()) : [];
}
export function qCorrect(q) {
  const o = qOpts(q);
  const i = q && q.answer;
  return (i != null && o[i]) || "";
}
export function sKey(q) { return norm(qText(q)) + "::" + norm(qCorrect(q)); }
export function sHash(q) { return hashStr(sKey(q)); }

// ── ho-gaye ──────────────────────────────────────────────────────────────
export function getDone() { return read(K_DONE, {}) || {}; }
export function doneCount() { return Object.keys(getDone()).length; }
export function isDoneQ(q) { return !!getDone()[sHash(q)]; }

// Ek saath likhte hain — har question par poora store dobara likhna 100 baar
// bhaari padta hai.
export function markDone(list) {
  const all = getDone();
  let changed = false;
  for (const q of list || []) {
    const h = sHash(q);
    if (!h || all[h]) continue;
    all[h] = 1;
    changed = true;
  }
  if (changed) write(K_DONE, all);
}
export function clearDone() { write(K_DONE, {}); }

// ── agla batch ───────────────────────────────────────────────────────────
// Bank ke apne kram mein, bas jo ho chuke wo chhod kar. Sawaal ka text na ho
// to DeepSeek ko kuch bhejne ko hi nahi — aise question sprint mein nahi aate.
export function pickNext(list, n) {
  const done = getDone();
  const seen = new Set();
  const out = [];
  for (const q of list || []) {
    if (out.length >= n) break;
    const t = qText(q);
    if (t.length < 8) continue;
    const h = sHash(q);
    if (!h || done[h] || seen.has(h)) continue;
    seen.add(h);
    out.push(q);
  }
  return out;
}

// ── ★ bookmark ───────────────────────────────────────────────────────────
export function getMarks() { const m = read(K_MARKS, []); return Array.isArray(m) ? m : []; }
export function isMarked(q) { const h = sHash(q); return getMarks().some((m) => m.h === h); }

// Bookmark apni copy ke saath bachta hai: bank ka wo chapter dobara na khule
// tab bhi ★ wali list poori dikhti hai (tasveer wale ke link bhi saath).
export function toggleMark(q, meta) {
  const h = sHash(q);
  if (!h) return false;
  const all = getMarks();
  const at = all.findIndex((m) => m.h === h);
  if (at >= 0) { all.splice(at, 1); write(K_MARKS, all); return false; }
  all.unshift({
    h,
    question: qText(q),
    options: qOpts(q),
    answer: q && q.answer != null ? q.answer : null,
    explanation: String((q && (q.explanation || q.solution)) || ""),
    qImg: (q && q.qImg) || "",
    optImgs: (q && q.optImgs) || null,
    solImg: (q && q.solImg) || "",
    src: (meta && meta.src) || (q && q._srcLabel) || "",
    chapter: (meta && meta.chapter) || (q && q._chapter) || "",
    at: Date.now(),
  });
  write(K_MARKS, all);
  return true;
}
export function removeMark(h) { write(K_MARKS, getMarks().filter((m) => m.h !== h)); }
export function clearMarks() { write(K_MARKS, []); }

// ── DeepSeek ke jawab ────────────────────────────────────────────────────
// Text wale question ka jawab cgl.dsanswers mein — wahi store bank ka card
// padhta hai. Tasveer wale ki key wahan banti hi nahi (q.question khali hai),
// isliye unka jawab sprint apne paas rakhta hai.
export function getAns(q) {
  const shared = getDsAnswer(q);
  if (shared) return shared;
  return (read(K_ANS, {}) || {})[sHash(q)] || "";
}
export function putAns(q, text) {
  const t = String(text || "").trim();
  if (!t) return;
  const k = keyFor(q);
  if (k && k !== "::") { saveDsAnswer(q, t); return; }
  const all = read(K_ANS, {}) || {};
  all[sHash(q)] = t;
  write(K_ANS, all);
}
