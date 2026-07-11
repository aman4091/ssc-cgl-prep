// Per-question attempt tracker. Questions don't carry stable ids across quiz
// regenerations, so we key by normalized (question text :: correct answer).
// A vocab OWS MCQ (def -> word) keys the same every time -> reliable counts.

const KEY = "cgl.qstats";

function read() {
  if (typeof window === "undefined") return {};
  try { const r = localStorage.getItem(KEY); return r ? JSON.parse(r) : {}; }
  catch { return {}; }
}
function write(v) { localStorage.setItem(KEY, JSON.stringify(v)); }

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
}
