// Per-question attempt tracker. Questions don't carry stable ids across quiz
// regenerations, so we key by normalized (question text :: correct answer).
// A vocab OWS MCQ (def -> word) keys the same every time -> reliable counts.

import { storeGet, storeSet, storeRemove } from "./bigstore";

const KEY = "cgl.qstats";

function read() {
  if (typeof window === "undefined") return {};
  try { const r = storeGet(KEY); return r ? JSON.parse(r) : {}; }
  catch { return {}; }
}
function write(v) { storeSet(KEY, JSON.stringify(v)); }

function norm(s) {
  return String(s || "").toLowerCase().replace(/\s+/g, " ").trim().slice(0, 240);
}

export function keyForParts(questionText, correctText) {
  return norm(questionText) + "::" + norm(correctText);
}
export function keyFor(q) {
  if (!q) return "";
  const correct = Array.isArray(q.options) && q.answer != null ? q.options[q.answer] : "";
  return keyForParts(q.question, correct);
}

export function getAllStats() { return read(); }
export function getStatByKey(k) { return read()[k] || null; }
export function getStat(q) { return getStatByKey(keyFor(q)); }
export function getStatByParts(questionText, correctText) { return getStatByKey(keyForParts(questionText, correctText)); }

// Record a batch of attempts in one write. items: [{ q, correct }]
export function recordAttempts(items) {
  const all = read();
  const nowIso = new Date().toISOString();
  let changed = false;
  for (const { q, correct } of items || []) {
    const k = keyFor(q);
    if (!k || k === "::") continue;
    const s = all[k] || { attempts: 0, correct: 0, lastAt: null };
    s.attempts += 1;
    if (correct) s.correct += 1;
    s.lastAt = nowIso;
    all[k] = s;
    changed = true;
  }
  if (changed) write(all);
  // Board ko batao ki abhi kaun sa question sahi/galat hua. Card apna
  // sahi-galat khud jaanta hai, par palette (jo card ke bahar hai) usse nahi
  // dekh sakta — isliye ye khabar. Har card pehle se yahi function bulata hai,
  // to teen card files chhedne ki zaroorat nahi padi.
  if (changed && typeof window !== "undefined") {
    try {
      const marks = (items || [])
        .filter(({ q }) => q)
        .map(({ q, correct }) => ({ key: keyFor(q), correct: !!correct }));
      window.dispatchEvent(new CustomEvent("cgl:q-attempted", { detail: { marks } }));
    } catch { /* SSR / purana browser */ }
  }
}
