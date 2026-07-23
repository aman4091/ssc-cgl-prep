// Mock-test marks tracker — the user records each sectional/full mock they take:
// per-section correct / wrong / total / time, plus a name and the day they added
// it. Everything derived (score, accuracy, attempted) is computed here so the UI
// just renders. Stored in localStorage (cgl.mockmarks) so it syncs like the rest.

const KEY = "cgl.mockmarks";

// SSC CGL Tier-1 marking. Kept here so a change is one place.
export const PER_CORRECT = 2;
export const PER_WRONG = 0.5;

// The default section set for a FULL mock (SSC CGL Tier-1). A sectional mock
// starts with one blank row.
export const FULL_SECTIONS = ["General Intelligence & Reasoning", "General Awareness", "Quantitative Aptitude", "English Comprehension"];

function read() {
  if (typeof window === "undefined") return [];
  try { const r = localStorage.getItem(KEY); return r ? JSON.parse(r) : []; }
  catch { return []; }
}
function write(v) { localStorage.setItem(KEY, JSON.stringify(v)); }

const num = (v) => { const n = Number(v); return Number.isFinite(n) && n >= 0 ? n : 0; };

// Per-section derived numbers.
export function sectionStats(s) {
  const correct = num(s.correct), wrong = num(s.wrong);
  const total = Math.max(num(s.total), correct + wrong);
  const attempted = correct + wrong;
  const score = correct * PER_CORRECT - wrong * PER_WRONG;
  const accuracy = attempted ? Math.round((correct / attempted) * 100) : 0;
  return { name: s.name || "Section", correct, wrong, total, attempted, unattempted: Math.max(0, total - attempted), score, accuracy, timeMin: num(s.timeMin) };
}

// Whole-mock totals across its sections.
export function mockTotals(rec) {
  const secs = (rec.sections || []).map(sectionStats);
  const t = secs.reduce((a, s) => ({
    correct: a.correct + s.correct, wrong: a.wrong + s.wrong, total: a.total + s.total,
    attempted: a.attempted + s.attempted, score: a.score + s.score, timeMin: a.timeMin + s.timeMin,
  }), { correct: 0, wrong: 0, total: 0, attempted: 0, score: 0, timeMin: 0 });
  t.accuracy = t.attempted ? Math.round((t.correct / t.attempted) * 100) : 0;
  t.sections = secs;
  return t;
}

export function getMocks() {
  // Newest attempt first (by date, then when it was added).
  return read().slice().sort((a, b) => (b.date || "").localeCompare(a.date || "") || (b.at || "").localeCompare(a.at || ""));
}

export function addMock({ name, type, date, sections }) {
  const rec = {
    id: `mk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    name: String(name || "").trim() || "Mock",
    type: type === "sectional" ? "sectional" : "full",
    date: date || new Date().toISOString().slice(0, 10),
    at: new Date().toISOString(),
    sections: (sections || [])
      .filter((s) => (s.name && s.name.trim()) || num(s.correct) || num(s.wrong) || num(s.total))
      .map((s) => ({ name: String(s.name || "").trim(), correct: num(s.correct), wrong: num(s.wrong), total: num(s.total), timeMin: num(s.timeMin) })),
  };
  write([rec, ...read()]);
  return rec;
}

export function removeMock(id) { write(read().filter((r) => r.id !== id)); }
export function clearMocks() { localStorage.removeItem(KEY); }

// Headline numbers across all recorded mocks.
export function overallSummary() {
  const all = read();
  if (!all.length) return { count: 0, avgScore: 0, avgAccuracy: 0, best: 0 };
  const totals = all.map(mockTotals);
  const avgScore = Math.round((totals.reduce((a, t) => a + t.score, 0) / all.length) * 10) / 10;
  const avgAccuracy = Math.round(totals.reduce((a, t) => a + t.accuracy, 0) / all.length);
  const best = Math.max(...totals.map((t) => t.score));
  return { count: all.length, avgScore, avgAccuracy, best };
}
