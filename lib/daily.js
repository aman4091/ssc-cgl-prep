// Daily Quiz — a per-day scratch pool. Throughout the day you drop in questions
// you meet in sectionals / mocks / anywhere; at day's end you re-attempt them.
// The attempt runs through the shared quiz runner (source:"daily"), which files
// wrong answers into the Mistake Notebook and keeps the rest — nothing to wire.
import { makeId } from "./storage";
import { keyFor } from "./qstats";

const KEY = "cgl.daily";

function read() {
  if (typeof window === "undefined") return {};
  try { const r = localStorage.getItem(KEY); return r ? JSON.parse(r) : {}; }
  catch { return {}; }
}
function write(v) { localStorage.setItem(KEY, JSON.stringify(v)); }

// Local date -> "YYYY-MM-DD" (the user's calendar day, not UTC).
export function todayKey(d) {
  const dt = d ? new Date(d) : new Date();
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isValidQ(q) {
  return q && q.question && Array.isArray(q.options) && q.options.length >= 2 && q.answer != null;
}

export function getDailyMap() { return read(); }
export function getDayQuestions(dateKey) { return read()[dateKey] || []; }

// Append questions to a day, skipping ones already there (by question+answer key).
export function addDailyQuestions(dateKey, questions) {
  const all = read();
  const list = all[dateKey] || [];
  const have = new Set(list.map((q) => keyFor(q)));
  let added = 0;
  for (const q of questions || []) {
    if (!isValidQ(q)) continue;
    const k = keyFor(q);
    if (!k || k === "::" || have.has(k)) continue;
    have.add(k);
    list.push(q);
    added++;
  }
  all[dateKey] = list;
  write(all);
  return added;
}

export function addDailyQuestion(dateKey, q) { return addDailyQuestions(dateKey, [q]); }

export function removeDailyQuestion(dateKey, index) {
  const all = read();
  const list = all[dateKey] || [];
  list.splice(index, 1);
  if (list.length) all[dateKey] = list; else delete all[dateKey];
  write(all);
  return list;
}

export function clearDay(dateKey) {
  const all = read();
  delete all[dateKey];
  write(all);
}

// Every day that has questions, newest first: [{ dateKey, count }].
export function getDailyDates() {
  const all = read();
  return Object.keys(all)
    .filter((k) => (all[k] || []).length > 0)
    .sort((a, b) => (a < b ? 1 : -1))
    .map((k) => ({ dateKey: k, count: all[k].length }));
}

// Build a quiz from a day's questions (random order). source:"daily" so the
// shared runner archives wrong answers into the Mistake Notebook automatically.
export function buildDailyQuiz(dateKey) {
  const qs = [...getDayQuestions(dateKey)];
  for (let i = qs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [qs[i], qs[j]] = [qs[j], qs[i]];
  }
  return {
    id: makeId(),
    title: `Daily Quiz · ${dateKey}`,
    source: "daily",
    createdAt: new Date().toISOString(),
    questions: qs,
  };
}
