// Where you are in a chapter, and how long each question took.
//
// Both survive a refresh, which is the whole point: qstats counts attempts and
// qreview keeps the wrong ones, but neither remembers that you were on question
// 89 or that it took you 47 seconds.
//
// Questions have no stable id across banks, so time is keyed the way qstats
// keys everything — normalized (question text :: correct answer) — which means a
// question keeps its time even if the list around it is rebuilt or re-sliced.

import { keyFor } from "./qstats";

const TIME_KEY = "cgl.qtime";     // { [questionKey]: seconds }
const RESUME_KEY = "cgl.qresume"; // { [chapterKey]: lastAnsweredIndex }

function read(k) {
  if (typeof window === "undefined") return {};
  try {
    const r = localStorage.getItem(k);
    const v = r ? JSON.parse(r) : {};
    return v && typeof v === "object" ? v : {};
  } catch {
    return {};
  }
}
function write(k, v) {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* quota */ }
}

// ---- per-question time ----

export function getQTime(q) {
  const k = keyFor(q);
  if (!k || k === "::") return 0;
  const v = read(TIME_KEY)[k];
  return typeof v === "number" && v >= 0 ? v : 0;
}

export function setQTime(q, seconds) {
  const k = keyFor(q);
  if (!k || k === "::") return;
  const all = read(TIME_KEY);
  all[k] = Math.max(0, Math.round(seconds));
  write(TIME_KEY, all);
}

// Re-attempting throws the old time away — the number on screen should be how
// long THIS go took, not a total across tries.
export function clearQTime(q) {
  const k = keyFor(q);
  if (!k) return;
  const all = read(TIME_KEY);
  delete all[k];
  write(TIME_KEY, all);
}

// ---- where you got to in a chapter ----

export function getResume(chapterKey) {
  if (!chapterKey) return -1;
  const v = read(RESUME_KEY)[chapterKey];
  return typeof v === "number" ? v : -1;
}

// Only ever moves forward. Answering question 12 after reaching 89 means you
// went back to check something, not that you lost 77 questions of progress.
export function setResume(chapterKey, index) {
  if (!chapterKey || typeof index !== "number" || index < 0) return;
  const all = read(RESUME_KEY);
  if (typeof all[chapterKey] === "number" && all[chapterKey] >= index) return;
  all[chapterKey] = index;
  write(RESUME_KEY, all);
}
