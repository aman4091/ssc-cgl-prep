// Log of tests taken on OTHER websites — link, score, time, section, website.
import { makeId } from "./storage";

const KEY = "cgl.exttests";

function read() {
  if (typeof window === "undefined") return [];
  try { const r = localStorage.getItem(KEY); return r ? JSON.parse(r) : []; }
  catch { return []; }
}
function write(v) { localStorage.setItem(KEY, JSON.stringify(v)); }

export function getTests() {
  return read().sort((a, b) => (b.date || "").localeCompare(a.date || "") || (b.createdAt || "").localeCompare(a.createdAt || ""));
}
export function addTest(t) {
  const all = read();
  const rec = { id: "xt_" + makeId(), createdAt: new Date().toISOString(), ...t };
  all.unshift(rec);
  write(all);
  return rec;
}
export function deleteTest(id) { write(read().filter((x) => x.id !== id)); }
export function updateTest(id, patch) { write(read().map((x) => (x.id === id ? { ...x, ...patch } : x))); }

export function getTest(id) { return read().find((x) => x.id === id) || null; }

// ---------- Mock builder: sections with their own timer + questions ----------
const normQ = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

function mutate(id, fn) {
  const all = read();
  const t = all.find((x) => x.id === id);
  if (!t) return null;
  t.sections = t.sections || [];
  fn(t);
  write(all);
  return t;
}

// Create a test record that IS a mock (has sections you fill with questions).
export function addMock(name) {
  return addTest({ name: (name || "My Mock").trim() || "My Mock", kind: "mock", sections: [] });
}

export function addSection(id, name, timeMin) {
  return mutate(id, (t) =>
    t.sections.push({ id: "sec_" + makeId(), name: (name || "Section").trim() || "Section", timeMin: timeMin || 15, questions: [] })
  );
}
export function updateSection(id, secId, patch) {
  return mutate(id, (t) => { const s = t.sections.find((x) => x.id === secId); if (s) Object.assign(s, patch); });
}
export function removeSection(id, secId) {
  return mutate(id, (t) => { t.sections = t.sections.filter((x) => x.id !== secId); });
}

// Append MCQs to a section (dedupes by question text). Returns count added.
export function addSectionQuestions(id, secId, questions) {
  let added = 0;
  mutate(id, (t) => {
    const s = t.sections.find((x) => x.id === secId);
    if (!s) return;
    s.questions = s.questions || [];
    const seen = new Set(s.questions.map((q) => normQ(q.question)));
    for (const q of Array.isArray(questions) ? questions : []) {
      if (!(q && q.question && Array.isArray(q.options) && q.options.length >= 2)) continue;
      const k = normQ(q.question);
      if (!k || seen.has(k)) continue;
      seen.add(k);
      s.questions.push(q);
      added++;
    }
  });
  return added;
}
export function clearSectionQuestions(id, secId) {
  return mutate(id, (t) => { const s = t.sections.find((x) => x.id === secId); if (s) s.questions = []; });
}
