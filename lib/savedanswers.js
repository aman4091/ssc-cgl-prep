// Saved Ask answers — file a Q&A under a subject to revise later.
import { makeId } from "./storage";

const KEY = "cgl.savedanswers";

export const SUBJECTS = [
  { k: "math", label: "🧮 Math" },
  { k: "reasoning", label: "🧠 Reasoning" },
  { k: "english", label: "📚 English" },
  { k: "gs", label: "🌍 GS" },
];

export function subjectLabel(k) {
  return SUBJECTS.find((s) => s.k === k)?.label || "📝 Other";
}

function read() {
  if (typeof window === "undefined") return [];
  try { const r = localStorage.getItem(KEY); return r ? JSON.parse(r) : []; }
  catch { return []; }
}
function write(v) { localStorage.setItem(KEY, JSON.stringify(v)); }

// [{ id, subject, question, imageText, answer, savedAt }]
export function getSavedAnswers() {
  return read().sort((a, b) => (b.savedAt || "").localeCompare(a.savedAt || ""));
}

export function getSavedBySubject() {
  const groups = {};
  for (const s of SUBJECTS) groups[s.k] = [];
  for (const a of getSavedAnswers()) {
    (groups[a.subject] = groups[a.subject] || []).push(a);
  }
  return groups;
}

export function saveAnswer({ subject, question, imageText, answer }) {
  const all = read();
  const rec = {
    id: "sa_" + makeId(),
    subject: subject || "gs",
    question: (question || "").trim(),
    imageText: (imageText || "").trim(),
    answer: answer || "",
    savedAt: new Date().toISOString(),
  };
  all.unshift(rec);
  write(all);
  return rec;
}

export function removeSavedAnswer(id) { write(read().filter((x) => x.id !== id)); }
export function clearSavedAnswers() { localStorage.removeItem(KEY); }
