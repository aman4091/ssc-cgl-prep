// PYQ question bank — flat, SUBJECT-WISE (no chapters). Each subject holds a
// list of MCQs. Any question can be "marked" into a real subject-chapter, which
// copies it (tagged PYQ) into the chapter's question store.
import { addChapterQuestions } from "./grammar";

const KEY = "cgl.pyq.bank";
const MIGRATED = "cgl.pyq.migrated";
export const PYQ_SUBJECTS = [
  { key: "math", label: "Maths", icon: "🧮" },
  { key: "reasoning", label: "Reasoning", icon: "🧠" },
  { key: "english", label: "English", icon: "📚" },
  { key: "gs", label: "General Awareness", icon: "🌍" },
];
export function pyqSubjectMeta(k) {
  return PYQ_SUBJECTS.find((s) => s.key === k) || { key: k, label: k, icon: "📘" };
}

export function pyqKey(q) {
  return String(q?.question || "").toLowerCase().replace(/\s+/g, " ").trim().slice(0, 200);
}

function read() {
  if (typeof window === "undefined") return {};
  try { const r = localStorage.getItem(KEY); return r ? JSON.parse(r) : {}; }
  catch { return {}; }
}
function write(v) { localStorage.setItem(KEY, JSON.stringify(v)); }

// One-time: pull questions from legacy pyq-* study chapters into the flat bank.
function ensureMigrated() {
  if (typeof window === "undefined") return;
  try { if (localStorage.getItem(MIGRATED)) return; } catch { return; }
  try {
    const chapters = JSON.parse(localStorage.getItem("cgl.study.chapters") || "[]");
    const qstore = JSON.parse(localStorage.getItem("cgl.study.questions") || "{}");
    const all = read();
    for (const ch of chapters) {
      if (!ch?.subject || !ch.subject.startsWith("pyq-")) continue;
      const base = ch.subject.slice(4);
      if (!PYQ_SUBJECTS.some((s) => s.key === base)) continue;
      const list = all[base] || (all[base] = []);
      const seen = new Set(list.map(pyqKey));
      for (const q of qstore[ch.id] || []) {
        if (!(q && q.question && Array.isArray(q.options) && q.options.length >= 2)) continue;
        const k = pyqKey(q);
        if (k && !seen.has(k)) { seen.add(k); list.push(q); }
      }
    }
    write(all);
  } catch { /* ignore */ }
  try { localStorage.setItem(MIGRATED, "1"); } catch { /* ignore */ }
}

export function getPyqQuestions(subject) {
  ensureMigrated();
  return read()[subject] || [];
}

// Append MCQs (dedupe by question text). Returns count of NEW questions added.
export function addPyqQuestions(subject, questions) {
  ensureMigrated();
  const clean = (questions || []).filter((q) => q && q.question && Array.isArray(q.options) && q.options.length >= 2);
  const all = read();
  const list = all[subject] || [];
  const seen = new Set(list.map(pyqKey));
  const toAdd = [];
  for (const q of clean) {
    const k = pyqKey(q);
    if (k && !seen.has(k)) { seen.add(k); toAdd.push(q); }
  }
  all[subject] = [...list, ...toAdd];
  write(all);
  return toAdd.length;
}

export function removePyqQuestion(subject, key) {
  const all = read();
  all[subject] = (all[subject] || []).filter((q) => pyqKey(q) !== key);
  write(all);
}
export function updatePyqQuestion(subject, key, newQ) {
  const all = read();
  all[subject] = (all[subject] || []).map((q) => (pyqKey(q) === key ? { ...q, ...newQ } : q));
  write(all);
}
export function clearPyqQuestions(subject) {
  const all = read();
  delete all[subject];
  write(all);
}

// Copy a PYQ question into a real subject-chapter (tagged PYQ) and remember it.
// Returns the number of NEW questions added to the chapter (1, or 0 if it was
// already there).
export function markPyqToChapter(subject, key, chapterId) {
  const all = read();
  const list = all[subject] || [];
  const q = list.find((x) => pyqKey(x) === key);
  if (!q || !chapterId) return 0;
  const added = addChapterQuestions(chapterId, [{ ...q, pyq: true, source: q.source || q.paper || "PYQ" }]);
  const marked = new Set(q.marked || []);
  marked.add(chapterId);
  q.marked = [...marked];
  write(all);
  return added;
}
