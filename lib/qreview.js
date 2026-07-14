// Mistake Notebook / Error Analysis backbone — site-wide.
// Every quiz answer (Vocab, Calc, PYQ, Current Affairs, chapters) is archived
// here so we can build the "Wrong" notebook, an error-type log, a weak-area
// tracker, and re-attempt quizzes. Keyed like qstats so re-attempting the same
// question UPDATES its record (and can move it from Wrong -> Mastered).
import { keyFor } from "./qstats";

const KEY = "cgl.qreview";

export const ERROR_TYPES = [
  { key: "silly", label: "😅 Silly", full: "Silly Mistake" },
  { key: "concept", label: "📖 Concept", full: "Concept Weak" },
  { key: "time", label: "⏱️ Time Laga", full: "Time Laga" },
  { key: "guess", label: "🎲 Guess", full: "Guess Kiya" },
];
export function errorTypeLabel(t) {
  return (ERROR_TYPES.find((e) => e.key === t) || {}).full || "";
}

function read() {
  if (typeof window === "undefined") return [];
  try { const r = localStorage.getItem(KEY); return r ? JSON.parse(r) : []; }
  catch { return []; }
}
function write(v) { localStorage.setItem(KEY, JSON.stringify(v)); }

export function getReview() { return read(); }

// Upsert one attempted question. Preserves errorType, firstAt, and the sticky
// everWrong flag (true once it's ever been answered wrong).
export function addReview(q, opts = {}) {
  const k = keyFor(q);
  if (!k || k === "::") return;
  const { subject = "", source = "", category = "", chapterId = "", correct = false } = opts;
  const all = read();
  const nowIso = new Date().toISOString();
  const i = all.findIndex((r) => r.key === k);
  const prev = i >= 0 ? all[i] : null;
  const rec = {
    key: k,
    q,
    subject: subject || prev?.subject || "",
    source: source || prev?.source || "",
    category: category || prev?.category || "General",
    chapterId: chapterId || prev?.chapterId || "",
    correct: !!correct,
    everWrong: (prev?.everWrong || false) || !correct,
    errorType: prev?.errorType || "",
    firstAt: prev?.firstAt || nowIso,
    at: nowIso,
  };
  // Dedup by key: if this exact question is already in the notebook, UPDATE it
  // in place (same word/question repeating in Vocab Rush etc. never adds a second
  // row). Only a brand-new question goes to the top.
  if (i >= 0) all[i] = rec;
  else all.unshift(rec);
  write(all);
}

// Batch record (used by the quiz runner on submit). items: [{ q, correct, subject, source, category, chapterId }]
export function recordQuizAttempts(items) {
  for (const it of items || []) {
    if (!it || !it.q) continue;
    const { q, ...opts } = it;
    addReview(q, opts);
  }
}

export function setReviewErrorType(key, type) {
  const all = read();
  const i = all.findIndex((r) => r.key === key);
  if (i < 0) return;
  all[i] = { ...all[i], errorType: all[i].errorType === type ? "" : type }; // toggle off if same
  write(all);
}

// bucket: "wrong" (currently wrong) | "mastered" (was wrong, now correct) | "attempted" (all)
export function getReviewBucket(bucket) {
  const all = read();
  if (bucket === "wrong") return all.filter((r) => !r.correct);
  if (bucket === "mastered") return all.filter((r) => r.everWrong && r.correct);
  return all;
}

// Wrong records answered within the last `days` days.
export function getWrongSince(days) {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return read().filter((r) => !r.correct && new Date(r.at).getTime() >= cutoff);
}

// Weak-area tracker: group ALL records by category -> counts + accuracy.
// Sorted weakest first (most wrong, then lowest accuracy).
export function getWeakAreas() {
  const map = new Map();
  for (const r of read()) {
    const c = r.category || "General";
    const g = map.get(c) || { category: c, total: 0, wrong: 0 };
    g.total += 1;
    if (!r.correct) g.wrong += 1;
    map.set(c, g);
  }
  return [...map.values()]
    .map((g) => ({ ...g, accuracy: g.total ? Math.round(((g.total - g.wrong) / g.total) * 100) : 0 }))
    .sort((a, b) => b.wrong - a.wrong || a.accuracy - b.accuracy);
}

// Counts per errorType among CURRENTLY-wrong records (the pending mistakes).
export function getErrorTypeBreakdown() {
  const counts = { untagged: 0 };
  for (const e of ERROR_TYPES) counts[e.key] = 0;
  for (const r of read()) {
    if (r.correct) continue;
    if (r.errorType && counts[r.errorType] != null) counts[r.errorType] += 1;
    else counts.untagged += 1;
  }
  return counts;
}

export function removeReview(key) { write(read().filter((r) => r.key !== key)); }

export function clearReview(bucket) {
  if (!bucket || bucket === "attempted") { localStorage.removeItem(KEY); return; }
  if (bucket === "wrong") { write(read().filter((r) => r.correct)); return; }
  if (bucket === "mastered") { write(read().filter((r) => !(r.everWrong && r.correct))); return; }
}

// Friendly weak-area label for a question coming through the shared quiz runner.
export function quizCategory(quiz, q) {
  const src = String(quiz?.source || "").toLowerCase();
  const title = String(quiz?.title || "");
  if (src === "daily") return "Daily Quiz";
  if (src.startsWith("vocab")) return "Vocab";
  if (src.startsWith("current")) return "Current Affairs";
  if (src.includes("calc")) return "Calculation";
  if (src === "review" || src === "bookmarks") return (q?.paper || q?.source || "Practice");
  // chapter/PYQ practice: source is like "<Chapter> · questions" or "<Chapter> · chapter"
  const m = String(quiz?.source || "").split(" · ")[0];
  if (m && m !== quiz?.source) return m;
  if (q?.paper) return q.paper;
  return title ? title.split(" · ")[0] : "General";
}
