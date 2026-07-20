// What you actually did, by day.
//
// Nothing in the app recorded this. qstats counts attempts per QUESTION and
// qreview keeps the wrong ones, but neither can answer "what did I work on
// yesterday" — the topic is exactly what they throw away.
//
// So: one row per (day, topic). Answering 30 WAR questions in one chapter is one
// row with a count, not 30 rows. Three separate paths feed it — the saved-quiz
// runner, the full-screen runner, and inline answering on a PYQ card — because
// those are the three ways a question can be attempted.

const KEY = "cgl.activity";
const MAX = 2000; // rows; roughly years of use, and keeps localStorage sane

function read() {
  if (typeof window === "undefined") return [];
  try {
    const r = localStorage.getItem(KEY);
    const v = r ? JSON.parse(r) : [];
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function write(v) {
  try { localStorage.setItem(KEY, JSON.stringify(v.slice(0, MAX))); } catch { /* quota */ }
}

// Local date, not UTC — "what did I do today" means the day you are living in.
export function dayKey(d = new Date()) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// kind groups the row on the page: vocab | ca | pyq | quiz
export function logActivity({ label, kind = "quiz", count = 1, correct = 0 }) {
  const name = String(label || "").trim();
  if (!name) return;
  const day = dayKey();
  const k = `${day}::${kind}::${name}`;
  const all = read();
  const at = new Date().toISOString();
  const i = all.findIndex((r) => r.key === k);
  if (i >= 0) {
    // Same topic, same day — add to it rather than making a second row.
    all[i] = { ...all[i], count: (all[i].count || 0) + count, correct: (all[i].correct || 0) + correct, at };
  } else {
    all.unshift({ key: k, day, kind, label: name, count, correct, at });
  }
  write(all);
}

// Newest day first, and within a day newest first.
export function getActivityDays() {
  const byDay = new Map();
  for (const r of read()) {
    if (!byDay.has(r.day)) byDay.set(r.day, []);
    byDay.get(r.day).push(r);
  }
  return [...byDay.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([day, items]) => ({
      day,
      items: items.sort((a, b) => (a.at < b.at ? 1 : -1)),
      total: items.reduce((s, r) => s + (r.count || 0), 0),
      correct: items.reduce((s, r) => s + (r.correct || 0), 0),
    }));
}

export function clearActivity() {
  localStorage.removeItem(KEY);
}

const LABELS = { vocab: "🔤 Vocab", ca: "📰 Current Affairs", pyq: "🎯 PYQ", quiz: "🗂️ Quiz" };
export function kindLabel(k) { return LABELS[k] || LABELS.quiz; }

// A saved quiz carries enough to name itself; this works out what sort it is so
// the page can group it.
export function kindForQuiz(quiz) {
  const s = String(quiz?.source || "");
  if (s.startsWith("vocab")) return "vocab";
  if (s === "feed" || String(quiz?.id || "").startsWith("cabank_")) return "ca";
  return "quiz";
}
