// Local corrections for ready-made bank questions (public/gkbank/*).
//
// Those banks live in committed static files, so a wrong answer can't be fixed
// in place. This keeps a small per-question override in localStorage, keyed by
// the question's stable id, and merges it over the static question at render
// time. Editing an answer here corrects it for this browser without touching the
// shipped file — the honest fix for "AI-determined answers may be wrong".

const KEY = "cgl.gk.overrides";

function readAll() {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; }
}

export function getGkOverrides() {
  return readAll();
}

// Store (merge) a correction for one question id. `patch` is the edited question
// object from QuestionEditor; we keep the fields that define the question.
export function saveGkOverride(id, patch) {
  if (!id) return;
  const all = readAll();
  const { question, options, answer, solution, explanation } = patch || {};
  all[id] = { ...(all[id] || {}), ...clean({ question, options, answer, solution, explanation }) };
  try { localStorage.setItem(KEY, JSON.stringify(all)); } catch { /* quota */ }
  return all[id];
}

export function clearGkOverride(id) {
  const all = readAll();
  if (all[id]) { delete all[id]; try { localStorage.setItem(KEY, JSON.stringify(all)); } catch { /* ignore */ } }
}

// Merge stored corrections over a list of static questions.
export function applyGkOverrides(list) {
  const all = readAll();
  if (!list || !Object.keys(all).length) return list || [];
  return list.map((q) => (q && all[q.id] ? { ...q, ...all[q.id], edited: true } : q));
}

function clean(o) {
  const out = {};
  for (const k of Object.keys(o)) if (o[k] !== undefined) out[k] = o[k];
  return out;
}
