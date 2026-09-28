// 📋 SSC 2025 ke saare shift — CGL, CHSL, Steno — subject-wise mock tracker.
//
// Dates (web se, Sept 2026 mein dekhi):
//   CGL 2025 Tier 1  — 12–26 Sept 2025, roz 3 shift; 14 Oct 2025 re-exam (Shift 2)
//   CHSL 2025 Tier 1 — 12–30 Nov 2025, roz 3 shift
//   Steno 2025 (C&D) — 6–8 Aug 2025, roz 3 shift. Steno mein Maths hota hi
//                      nahi (Reasoning, GA, English) — isliye Maths tab mein nahi.
//
// Ek paper 5 baar tak — har subject ka alag hisaab:
//   cgl.shifts2025 = { [subject]: { [paperId]: [true,false,…5] } }  (sync hota hai)

export const SUBJECTS = [
  { key: "reasoning", label: "Reasoning", icon: "🧠" },
  { key: "gs", label: "GS", icon: "🌍" },
  { key: "maths", label: "Maths", icon: "🧮" },
  { key: "english", label: "English", icon: "📚" },
];
export const TRIES = 5;

const MONTH = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function range(exam, month, from, to, shifts = [1, 2, 3]) {
  const out = [];
  for (let d = from; d <= to; d++) {
    for (const s of shifts) {
      out.push({ id: `${exam.key}-${month + 1}-${d}-${s}`, exam: exam.key, label: `${exam.name} ${d} ${MONTH[month]} Shift ${s}` });
    }
  }
  return out;
}

export const EXAMS = [
  { key: "cgl", name: "SSC CGL 2025", short: "CGL", when: "12–26 Sept + 14 Oct", noMaths: false },
  { key: "chsl", name: "SSC CHSL 2025", short: "CHSL", when: "12–30 Nov", noMaths: false },
  { key: "steno", name: "SSC Steno 2025", short: "Steno", when: "6–8 Aug", noMaths: true },
];
const E = Object.fromEntries(EXAMS.map((e) => [e.key, e]));

export const PAPERS = [
  ...range(E.cgl, 8, 12, 26),
  ...range(E.cgl, 9, 14, 14, [2]).map((p) => ({ ...p, label: p.label + " (re-exam)" })),
  ...range(E.chsl, 10, 12, 30),
  ...range(E.steno, 7, 6, 8),
];

export function papersFor(subject) {
  return PAPERS.filter((p) => !(subject === "maths" && E[p.exam].noMaths));
}

const KEY = "cgl.shifts2025";
export function readTicks() {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch { return {}; }
}
export function toggleTick(subject, id, i) {
  const all = readTicks();
  const row = (all[subject] = all[subject] || {});
  const arr = Array.from({ length: TRIES }, (_, k) => !!(row[id] || [])[k]);
  arr[i] = !arr[i];
  if (arr.some(Boolean)) row[id] = arr; else delete row[id];
  try { localStorage.setItem(KEY, JSON.stringify(all)); } catch { /* quota */ }
  return all;
}
