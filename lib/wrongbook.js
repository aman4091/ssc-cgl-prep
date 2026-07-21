// Wrong Questions book — its OWN store, deliberately separate from the Mistake
// Notebook (cgl.qreview).
//
// The notebook is automatic: it fills up with whatever the quiz runners catch.
// This one is hand-kept — questions you got wrong in class, in a book, in an
// offline mock — shelved by subject. Nothing writes here except this page, and
// nothing here leaks into the notebook's buckets or counts.

const KEY = "cgl.wrongbook";

export const SUBJECTS = [
  { key: "reasoning", label: "Reasoning", icon: "🧠" },
  { key: "gs", label: "GS", icon: "🌍" },
  { key: "math", label: "Maths", icon: "🧮" },
  { key: "english", label: "English", icon: "📘" },
];

export const subjectLabel = (k) =>
  (SUBJECTS.find((s) => s.key === k) || {}).label || k;

function read() {
  if (typeof window === "undefined") return [];
  try { const r = localStorage.getItem(KEY); return r ? JSON.parse(r) : []; }
  catch { return []; }
}
function write(v) { localStorage.setItem(KEY, JSON.stringify(v)); }

export function getWrongBook(subject) {
  const all = read();
  return subject ? all.filter((r) => r.subject === subject) : all;
}

export function countsBySubject() {
  const counts = Object.fromEntries(SUBJECTS.map((s) => [s.key, 0]));
  for (const r of read()) if (counts[r.subject] != null) counts[r.subject] += 1;
  return counts;
}

// Newest first, so a question you just added is at the top of its shelf.
export function addWrong(q, subject, note = "") {
  const rec = {
    id: `wb_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    subject,
    q,
    note: String(note || "").trim(),
    at: new Date().toISOString(),
  };
  write([rec, ...read()]);
  return rec;
}

export function updateWrong(id, q, note) {
  const all = read();
  const i = all.findIndex((r) => r.id === id);
  if (i < 0) return;
  all[i] = { ...all[i], q, note: note === undefined ? all[i].note : String(note || "").trim() };
  write(all);
}

export function removeWrong(id) { write(read().filter((r) => r.id !== id)); }

export function clearWrong(subject) {
  write(subject ? read().filter((r) => r.subject !== subject) : []);
}
