// Build a chapter practice quiz that AVOIDS repeats — within the quiz and across
// consecutive quizzes for the same chapter. Once every question has been served,
// the cycle resets and starts fresh.
import { getChapterQuestions, chapterQuestionKey } from "./grammar";
import { saveQuiz, makeId } from "./storage";

const SERVED_KEY = "cgl.quizserved"; // { [chapterId]: [questionKey, ...] }

function readServed() {
  if (typeof window === "undefined") return {};
  try { const r = localStorage.getItem(SERVED_KEY); return r ? JSON.parse(r) : {}; }
  catch { return {}; }
}
function writeServed(v) { try { localStorage.setItem(SERVED_KEY, JSON.stringify(v)); } catch { /* ignore */ } }

function shuffle(a) {
  const arr = [...a];
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
  return arr;
}

// Returns the saved quiz object (already persisted), or null if no questions.
// `pool` (optional) lets callers pass a pre-filtered list (e.g. by paper); the
// served-tracking key still uses chapterId so repeats are avoided per chapter.
export function buildChapterQuiz(chapterId, chapterName, { count = 25, minutes = 15, pool } = {}) {
  const all = (pool && pool.length ? pool : getChapterQuestions(chapterId))
    .filter((q) => q && q.question && Array.isArray(q.options) && q.options.length >= 2);
  if (!all.length) return null;

  const served = readServed();
  const usedKeys = new Set(served[chapterId] || []);
  const target = Math.min(count, all.length);

  // Prefer questions not served in earlier quizzes; if too few remain, reset.
  let fresh = all.filter((q) => !usedKeys.has(chapterQuestionKey(q)));
  let resetCycle = false;
  if (fresh.length < target) { fresh = all; resetCycle = true; }

  // Pick unique questions for THIS quiz (store keys are unique, but stay safe).
  const picked = [];
  const seen = new Set();
  for (const q of shuffle(fresh)) {
    const k = chapterQuestionKey(q);
    if (seen.has(k)) continue;
    seen.add(k);
    picked.push(q);
    if (picked.length >= target) break;
  }

  // Update the served set (reset it first if we started a new cycle).
  const merged = new Set(resetCycle ? [] : (served[chapterId] || []));
  picked.forEach((q) => merged.add(chapterQuestionKey(q)));
  served[chapterId] = [...merged];
  writeServed(served);

  const quiz = {
    id: makeId(),
    title: `${chapterName} · Practice`,
    source: `${chapterName} · questions`,
    createdAt: new Date().toISOString(),
    questions: picked,
    timeLimitSec: minutes * 60,
  };
  saveQuiz(quiz);
  return quiz;
}
