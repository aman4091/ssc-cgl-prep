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
//   cgl.sprint.sets   — har daud ka 100 (ya 50/120) ka set, taaki wahi set
//                       baad mein dobara chalaya ja sake. Sirf question ke
//                       hash bachte hain; question wahi bank se lautte hain.
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
const K_SETS = "cgl.sprint.sets";

function read(key, fallback) {
  if (typeof window === "undefined") return fallback;
  try { const r = storeGet(key); return r ? JSON.parse(r) : fallback; }
  catch { return fallback; }
}
function write(key, val) { try { storeSet(key, JSON.stringify(val)); } catch { /* quota */ } }

const norm = (s) => String(s || "").toLowerCase().replace(/\s+/g, " ").trim().slice(0, 240);

// Tasveer wale bank (Pinnacle Maths/Reasoning) mein sawaal `qText`/`optText`
// mein padha hua hai — dikhta image se hai, par AI ko yahi text jata hai.
// Vocab ka "sawaal" khud word hai aur "sahi jawab" uska matlab — wahan
// options hote hi nahi.
export function isVocab(q) { return !!(q && q._kind === "vocab"); }
export function qText(q) {
  if (isVocab(q)) return String(q.word || "").trim();
  return String((q && (q.question || q.qText)) || "").trim();
}
export function qOpts(q) {
  const o = (q && (q.options || q.optText)) || [];
  return Array.isArray(o) ? o.map((x) => String(x == null ? "" : x).trim()) : [];
}
export function qCorrect(q) {
  if (isVocab(q)) return String(q.meaning || q.def || q.mine || "").trim();
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
    // Sirf 1 likhne se "GS ke kitne ho gaye" kabhi nahi bata paate the — ab
    // subject ka slug bhi saath. (Purani entries mein 1 pada hai; wo kisi
    // subject mein nahi ginti, kul ginti mein aati hai.)
    all[h] = q._slug || 1;
    changed = true;
  }
  if (changed) write(K_DONE, all);
}

// Subject ke hisaab se "kitne ho gaye".
export function doneBySlug() {
  const out = {};
  for (const v of Object.values(getDone())) {
    if (typeof v !== "string") continue;
    out[v] = (out[v] || 0) + 1;
  }
  return out;
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
    // Word chhota hota hai ("apt"), question lamba — dono ke liye alag hadd.
    if (t.length < (isVocab(q) ? 2 : 8)) continue;
    const h = sHash(q);
    if (!h || done[h] || seen.has(h)) continue;
    seen.add(h);
    out.push(q);
  }
  return out;
}

// 📝 Test ke liye: jo question ho CHUKE hain unhi mein se. Kram random,
// taaki har test naya lage. (Sprint ka ulta — wahan jo ho chuke wo chhodte
// hain, yahan sirf wahi lete hain.)
export function pickDone(list, n) {
  const done = getDone();
  const seen = new Set();
  const out = [];
  for (const q of list || []) {
    const h = sHash(q);
    if (!h || !done[h] || seen.has(h)) continue;
    seen.add(h);
    out.push(q);
  }
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out.slice(0, n);
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

// ── sambhale hue set ────────────────────────────────────────
// Har daud ka set bach jata hai, taaki wahi 100 question dobara chalaye ja
// sakein. Question KHUD nahi bachte — sirf unke hash aur ye ki wo kahan se
// aaye the (subject/book/chapter). Dobara chalate waqt wahi bank khul kar
// wahi kram wapas ban jata hai, aur unke DeepSeek jawab pehle se pade hote
// hain — isliye dobara chalane mein paisa nahi lagta.
const SET_CAP = 50;

export function getSets() { const v = read(K_SETS, []); return Array.isArray(v) ? v : []; }

export function saveSet(set) {
  if (!set || !set.id || !Array.isArray(set.hashes) || !set.hashes.length) return;
  const all = getSets().filter((x) => x.id !== set.id);
  all.unshift({ ...set, at: set.at || Date.now() });
  write(K_SETS, all.slice(0, SET_CAP));
}
export function removeSet(id) { write(K_SETS, getSets().filter((x) => x.id !== id)); }
export function newSetId() { return `sp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`; }

// Sambhale hue set ko wapas question ki shakl dena. Kram wahi jo us din tha;
// jo question bank se hat chuka ho wo chhoot jata hai.
export function byHashes(list, hashes) {
  const m = new Map();
  for (const q of list || []) { const h = sHash(q); if (h && !m.has(h)) m.set(h, q); }
  return (hashes || []).map((h) => m.get(h)).filter(Boolean);
}

// Jawab ko padhne layak shakl mein.
//
// DeepSeek apni har line ke beech sirf EK newline deta hai, aur markdown
// single newline ko space maan leta hai — isliye poora jawab ek lambi line
// ban kar chipak jata tha:
//   "✅ Matlab: … 🧠 Yaad kaise rakhein: … ✍️ Example: …"
// Yahan har "**Label:**" se pehle nayi line lagti hai aur har line apna
// paragraph ban jati hai. Purane sambhale hue jawab bhi isi se sudhar jaate
// hain — dobara maangne ki zaroorat nahi.
export function answerMd(text) {
  const NL = String.fromCharCode(10);
  return String(text || "")
    .split(String.fromCharCode(13)).join("")
    // "…poem. **✍️ Example:**" → label se pehle nayi line
    .replace(/([^\n])[ \t]*(\*\*[^*\n]{1,40}:\*\*)/g, "$1" + NL + "$2")
    .split(/\n+/)
    // Synonym aur antonym ek hi line par "|" se jude aate the; alag hone par
    // pehli line ke aakhir mein akela "|" latka reh jata tha.
    .map((l) => l.trim().replace(/\s*\|\s*$/, ""))
    .filter(Boolean)
    .join(NL + NL);
}

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
