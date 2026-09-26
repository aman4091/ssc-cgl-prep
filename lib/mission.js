// 🚀 CGL Mission — 33 din, 27 October 2026 ko exam.
//
// Exam ki tareekh CONFIRM hai: 27 Oct 2026. Plan 25 Sep se 26 Oct — 32 din,
// teen phase:
//
//   PHASE 1  D1–D14  (25 Sep – 8 Oct)  "GS BLITZ"  — GS ko roz ~4.5 ghante
//   PHASE 2  D15–D26 (9 Oct – 20 Oct)  "GAP FILL"  — Maths ke bache chapter FULL
//   PHASE 3  D27–D32 (21 Oct – 26 Oct) "PEAK+TAPER" — sirf mock + revision
//
// MASTER METRIC = PERCENTILE, score nahi.
// Score paper ki mushkil se hilta hai (5 full mock: 93 → 138.5 → 138 → 120.5
// → 112.5, aur percentile 67 → 74 → 43 → 35). Percentile sabke saath naapta
// hai, isliye checkpoint usi se: abhi 54.9 → exam tak 85+.
//
// Data (24 Sep 2026) jis par ye plan khada hai:
//   Reasoning  44.9 (23 mock, acc 94%)   → STRONG, sirf maintain
//   Maths      33.3 (acc 92%, att 18.5)  → sudhar raha hai, method wahi
//   English    36.3 (att 25/25, acc 78%) → ACCURACY, attempt 23 par lao
//   GS         16.7 (att 25, acc ~47%)   → SABSE BADA GAP, yahi phase 1 hai
//              (21.9 dikhta tha — ek English sectional galti se GS ke khaane
//               mein pada tha; lib/resetonce ne use theek kiya)
//   Mistake book: Maths 548 · English 151 · GS 240 (210 bina tag = fact log
//   use hi nahi hua — isliye ab GS ka poora tareeka cluster par hai)
//
// Din ka dhaancha user ka apna routine hai (05:30 uthna … 23:00 sona), aur
// usme se paanch block CORE hain — wahi din ko "ginti" mein laate hain
// (CORE_5 dekho). GS ke teen block chhoote to din count hi nahi hota.
//
// Kal ka kaam chhoot gaya to PEECHE MAT JAO — koi backlog nahi banta.

import { storeGet, storeSet, storeRemove } from "./bigstore";
import { getMocks } from "./mockmarks";
import { dayKey } from "./daytime";

// ------------------------------------------------------------------ keys ---
const KEY = "cgl.mission";
const DONE_KEY = "cgl.mission.done";
const ANALYSIS_KEY = "cgl.mission.analysis";
const METRIC_KEY = "cgl.mission.metric";
const EXAM_KEY = "cgl.examDate"; // lib/daily ka hi key — ek hi exam date poori site mein

export const DEFAULT_START = "2026-09-25";
export const DEFAULT_EXAM = "2026-10-27";
export const SHIFTS = [
  { v: "09:00", label: "Subah 9:00 (Shift 1)" },
  { v: "12:30", label: "Dopahar 12:30 (Shift 2)" },
  { v: "16:00", label: "Shaam 4:00 (Shift 3)" },
];

// ---------------------------------------------------------------- targets ---
// TARGET = jahan pahunchna hai. FLOOR = isse neeche nahi girna (exam hall
// mein yahi le ke jaana). Dono 24 Sep ke asli aankdon se bane hain.
export const TARGET = { R: 44, GS: 30, Q: 38, E: 40, total: 152 };
export const FLOOR = { R: 42, GS: 27, Q: 35, E: 37, total: 142 };
export const FLOOR_NOTE = {
  R: "23–24 attempt, 93% — abhi 44.9 hai, bas girne mat do",
  GS: "25 attempt, 62% accuracy (abhi ~47%) — poora khel cluster ka hai",
  Q: "21–22 attempt (abhi 18.5), 88%",
  E: "23 attempt (25 NAHI), 3 se kam galat",
};
// 🎯 Asli metric: full mock ka percentile.
export const PCT_NOW = 54.9;
export const PCT_TARGET = 85;

// -------------------------------------------------------------- the plan ---
// Phase, aur har din ka topic — owner ka apna grid (25 Sep – 26 Oct).
export const PHASES = [
  { k: 1, name: "GS BLITZ", from: 1, to: 14, color: "#1e66f5",
    t: "GS ko roz ~4.5 ghante. Maths sirf speed. English ke 12 rule. Reasoning minimum. Full mock har 4th din." },
  { k: 2, name: "GAP FILL", from: 15, to: 26, color: "#df8e1d",
    t: "GS 3 ghante (pass-2 + CA). Maths 3 ghante — ab wo chapter FULL jo pehle chhoot gaye (geometry, 3D, CI, H&D, coordinate). English accuracy drill. Full mock har 3rd din." },
  { k: 3, name: "PEAK + TAPER", from: 27, to: 32, color: "#d20f39",
    t: "Sirf full mock + revision. Koi naya topic nahi. Aakhri 2 din taper." },
];
export const phaseOf = (day) => PHASES.find((p) => day >= p.from && day <= p.to) || PHASES[2];

const TIER_A = [
  ["sscmaths", "percentage"], ["sscmaths", "profit-and-loss"], ["sscmaths", "average"],
  ["sscmaths", "simplification-and-approximation"], ["sscmaths", "ratio-and-proportion"],
  ["sscmaths", "simple-interest-si"], ["sscmaths", "trigonometry"], ["sscmaths", "algebra"],
];
const VOCAB_ROT = [
  ["synonyms", "Synonyms"], ["antonyms", "Antonyms"], ["one-word-substitution", "One word substitution"],
  ["idioms", "Idioms & phrases"], ["spelling-check", "Spellings"],
];
const FULL_PAPER = "Full mock: ek EASY shift, ek TOUGH shift — alternate karo. Score paper ka hai, isliye PERCENTILE dekho.";
const SECT = {
  Q: "Maths sectional (15 min, lock)",
  GS: "GS sectional (15 min, lock) — Testbook GS = PYQ",
  E: "English sectional (15 min, lock)",
  R: "Reasoning sectional (15 min, lock)",
};

// Har din: type (A = full mock, B = normal, C = taper), checkpoint, aur teen
// topic — g (GS), m (Maths), e (English). specs = [bank, slug] (PlanPractice).
const G = (t, notes, specs) => ({ t, notes, specs });
const M = (t, specs, extra = {}) => ({ t, specs, ...extra });
const E = (t, specs) => ({ t, specs });

const DAYS = [
  // ---------------- PHASE 1 — GS BLITZ (D1–D14) ----------------
  { type: "B", slot: ["Q", "GS"],
    g: G("Static GK-1: 8 classical + folk dance, festivals → state, instruments → artist", "/pyq/war/static-gk", [["war", "static-gk"]]),
    m: M("Percentage + fraction↔% conversions", [["sscmaths", "percentage"]]),
    e: E("SVA + tense (since/for, perfect, If+had)", [["errorpro", "subject-verb-agreement"], ["errorpro", "tense"]]), ca: "Sep 2026" },
  { type: "B", slot: ["Q", "GS"],
    g: G("Static GK-2: awards, sports cups + terms, books → author, days, first-in-India, HQ", "/pyq/war/static-gk", [["war", "static-gk"]]),
    m: M("Profit & Loss + Discount (MP:CP ratio method)", [["sscmaths", "profit-and-loss"], ["sscmaths", "discount"]]),
    e: E("Articles + uncountable/collective nouns", [["errorpro", "article"], ["errorpro", "noun"]]), ca: "Sep 2026" },
  { type: "A",
    g: G("Polity-1: Articles, Parts, 12 Schedules", "/pyq/war/polity", [["gk", "polity"], ["war", "polity"]]),
    m: M("Ratio + Partnership", [["sscmaths", "ratio-and-proportion"], ["sscmaths", "partnership"]]),
    e: E("Pronoun case + degree of comparison", [["errorpro", "pronoun"], ["errorpro", "adjective"]]), ca: "Aug 2026" },
  { type: "B", slot: ["Q", "GS"],
    g: G("Polity-2: Amendments, FR / DPSP / FD, constitutional bodies", "/pyq/war/polity", [["war", "polity"], ["gk", "polity"]]),
    m: M("Average + Mixture & Alligation", [["sscmaths", "average"], ["sscmaths", "mixture-and-alligation"]]),
    e: E("Fixed prepositions + conjunctions", [["errorpro", "preposition"], ["errorpro", "conjunction"]]), ca: "Aug 2026" },
  { type: "B", slot: ["Q", "GS"],
    g: G("Polity-3: Parliament, President/PM/Governor, Judiciary, Panchayati Raj", "/pyq/war/polity", [["war", "polity"]]),
    m: M("SI + CI", [["sscmaths", "simple-interest-si"], ["sscmaths", "compound-interest-ci"]]),
    e: E("Parallelism + redundancy", [["errorpro", "superfluous"], ["errorpro", "adverb-inversion"]]), ca: "Jul 2026" },
  { type: "B", slot: ["Q", "GS"],
    g: G("Biology-1: vitamins, diseases + pathogen, human body", "/pyq/war/biology", [["war", "biology"]]),
    m: M("Simplification + Number System", [["sscmaths", "simplification-and-approximation"], ["sscmaths", "number-system"]]),
    e: E('"One of the + plural", inversion, question tags', [["errorpro", "adverb-inversion"], ["engbank", "spot-the-error"]]), ca: "Jul 2026" },
  { type: "A",
    g: G("Biology-2: blood, cell, plants", "/pyq/war/biology", [["war", "biology"]]),
    m: M("Time & Work + Pipes", [["sscmaths", "time-and-work"], ["sscmaths", "pipe-and-cistern"]]),
    e: E("Mixed error sets (ab se roz 40 Q)", [["engbank", "spot-the-error"], ["engbank", "sentence-improvement"]]), ca: "Jun 2026" },
  { type: "B", slot: ["Q", "GS"],
    g: G("Chemistry: formulas, common names, alloys, pH, gases, periodic table", "/pyq/war/chemistry", [["war", "chemistry"]]),
    m: M("TSD + Trains", [["sscmaths", "time-speed-and-distance"], ["sscmaths", "problems-on-trains"]]),
    e: E("Mixed error + sentence improvement", [["engbank", "spot-the-error"], ["engbank", "sentence-improvement"]]), ca: "Jun 2026" },
  { type: "B", slot: ["Q", "GS", "R"],
    g: G("Physics: SI units, instruments, inventors, laws, optics/sound", "/pyq/war/physics", [["war", "physics"]]),
    m: M("Algebra identities (a+1/a, a³±b³, value-put)", [["sscmaths", "algebra"]]),
    e: E("Mixed error + FIB", [["engbank", "spot-the-error"], ["engbank", "fill-in-the-blanks"]]), ca: "May 2026" },
  { type: "B", checkpoint: 1, slot: ["Q", "GS"],
    g: G("Geography-1: rivers, dams, passes, national parks", "/pyq/war/geography", [["war", "geography"]]),
    m: M("Trigonometry (values, identities, θ=45° put)", [["sscmaths", "trigonometry"]]),
    e: E("Mixed error + cloze", [["engbank", "spot-the-error"], ["engbank", "cloze-test"]]), ca: "May 2026" },
  { type: "A",
    g: G("Geography-2: soils, crops, minerals, Census 2011", "/pyq/war/geography", [["war", "geography"]]),
    m: M("DI intensive", [["sscmaths", "data-interpretation-di"], ["mathbank", "data-interpretation"]]),
    e: E("Mixed error + RC", [["engbank", "spot-the-error"], ["engbank", "comprehension"]]), ca: "Apr 2026" },
  { type: "B", slot: ["Q", "GS"],
    g: G("Modern History-1: 1857–1919", "/pyq/war/modern-history", [["war", "modern-history"]]),
    m: M("Mensuration 2D", [["sscmaths", "mensuration-2d"]]),
    e: E("Mixed error + para-jumble", [["engbank", "spot-the-error"], ["engbank", "parajumble"]]), ca: "Apr 2026" },
  { type: "B", slot: ["Q", "GS", "E"],
    g: G("Modern History-2: 1920–47, Congress sessions, Viceroys", "/pyq/war/modern-history", [["war", "modern-history"]]),
    m: M("Mixed sprints (Tier-A)", TIER_A),
    e: E("Mixed error + vocab", [["engbank", "spot-the-error"], ["engbank", "synonyms"]]), ca: "Mar 2026" },
  { type: "A",
    g: G("Ancient + Medieval — sirf PYQ", "/pyq/war/ancient-history", [["war", "ancient-history"], ["war", "mediaeval-history"], ["gk", "ancient-history"]]),
    m: M("Mixed sprints + mistake-book ke weak chapter", [], { weak: true }),
    e: E("Mixed error set", [["engbank", "spot-the-error"]]), ca: "Mar 2026" },

  // ---------------- PHASE 2 — GAP FILL (D15–D26) ----------------
  { type: "B", slot: ["Q", "GS"],
    g: G("Economy: budget, banking, GDP/inflation, schemes, FYP", "/pyq/war/economics", [["war", "economics"]]),
    m: M("Geometry-1: triangles, centres, similarity / BPT", [["sscmaths", "geometry"]], { concept: true }),
    e: E("Accuracy drill: error + improvement (23 attempt)", [["engbank", "spot-the-error"], ["engbank", "sentence-improvement"]]), ca: "Feb 2026" },
  { type: "B", slot: ["Q", "GS"],
    g: G("Art & Culture: paintings, temples, tribes, fairs", "/notes/parmar-static", [["war", "static-gk"]]),
    m: M("Geometry-2: 4 circle theorem, cyclic quad, tangents", [["sscmaths", "geometry"]], { concept: true }),
    e: E("Accuracy drill: FIB + cloze", [["engbank", "fill-in-the-blanks"], ["engbank", "cloze-test"]]), ca: "Feb 2026" },
  { type: "A",
    g: G("CA revision pass-1 (Apr–Sep 2026)", "/current-affairs", [["war", "current-affairs"]]),
    m: M("Mensuration 3D FULL (frustum, prism, pyramid bhi)", [["sscmaths", "mensuration-3d"]], { concept: true }),
    e: E("Accuracy drill: mixed", [["engbank", "spot-the-error"], ["engbank", "sentence-improvement"]]), ca: "CA pass-1" },
  { type: "B", slot: ["Q", "GS"],
    g: G("Polity pass-2 — sirf PYQ", "/pyq/war/polity", [["war", "polity"], ["gk", "polity"]]),
    m: M("CI advanced + installments", [["sscmaths", "compound-interest-ci"], ["mathbank", "installment"]], { concept: true }),
    e: E("Accuracy drill: error rules ka log", [["engbank", "spot-the-error"]]), ca: "CA Oct" },
  { type: "B", checkpoint: 2, slot: ["Q", "GS"],
    g: G("Science pass-2 (Bio + Chem + Physics PYQ)", "/pyq/war/biology", [["war", "biology"], ["war", "chemistry"], ["war", "physics"]]),
    m: M("TSD: boats & streams, races, trains advanced", [["sscmaths", "boat-and-stream"], ["mathbank", "linear-circular-race"]], { concept: true }),
    e: E("Accuracy drill: improvement + FIB", [["engbank", "sentence-improvement"], ["engbank", "fill-in-the-blanks"]]), ca: "CA Oct" },
  { type: "A",
    g: G("Static GK pass-2", "/pyq/war/static-gk", [["war", "static-gk"]]),
    m: M("Algebra advanced + Coordinate geometry", [["sscmaths", "algebra"], ["sscmaths", "coordinate-geometry"]], { concept: true }),
    e: E("Accuracy drill: mixed", [["engbank", "spot-the-error"], ["engbank", "cloze-test"]]), ca: "CA Oct" },
  { type: "B", slot: ["Q", "GS"],
    g: G("Geography + History pass-2", "/pyq/war/geography", [["war", "geography"], ["war", "modern-history"]]),
    m: M("Height & Distance", [["sscmaths", "height-and-distance"]], { concept: true }),
    e: E("Accuracy drill: vocab + FIB", [["engbank", "synonyms"], ["engbank", "fill-in-the-blanks"]]), ca: "CA Oct" },
  { type: "B", slot: ["Q", "GS"],
    g: G("CA Oct + CA pass-2", "/current-affairs", [["war", "current-affairs"]]),
    m: M("Trigonometry advanced (max/min)", [["sscmaths", "trigonometry"]], { concept: true }),
    e: E("Accuracy drill: error + RC", [["engbank", "spot-the-error"], ["engbank", "comprehension"]]), ca: "CA Oct" },
  { type: "A",
    g: G("Mixed PYQ recall (fact log ke weak cluster)", "/mission/facts", [["war", "polity"], ["war", "static-gk"], ["war", "biology"]]),
    m: M("Mistake-book ke top 2 weak chapter", [], { weak: true }),
    e: E("Accuracy drill: mixed", [["engbank", "spot-the-error"]]), ca: "CA log" },
  { type: "B", slot: ["Q", "GS"],
    g: G("Mixed PYQ (asli paper jaisa)", "/mission/facts", [["war", "polity"], ["war", "geography"], ["war", "chemistry"], ["war", "static-gk"]]),
    m: M("Mixed sprints (Tier-A)", TIER_A),
    e: E("Accuracy drill: mixed", [["engbank", "sentence-improvement"]]), ca: "CA log" },
  // D25 par FM8 (pehle D26 par tha). D26 aur D27 dono mock wale ban rahe the —
  // do full mock lagatar = doosre din dimaag thaka hua, aur uska analysis bhi
  // aadha-adhoora. Ab D25 mock, D26 khaali (aakhri naya material), D27 FM9+CP3.
  { type: "A",
    g: G("Mixed PYQ", "/mission/facts", [["war", "modern-history"], ["war", "physics"], ["war", "economics"], ["war", "static-gk"]]),
    m: M("Mixed sprints (Tier-A)", TIER_A),
    e: E("Accuracy drill: mixed", [["engbank", "spot-the-error"]]), ca: "CA log" },
  // D26 — koi mock nahi, koi sectional nahi. Sirf aakhri naya material.
  { type: "B", noSect: true,
    g: G("AAKHRI naya material — CA final", "/current-affairs", [["war", "current-affairs"]]),
    m: M("Formula sheet final", TIER_A),
    e: E("Rules one-pager final", [["engbank", "sentence-improvement"]]), ca: "CA final" },

  // ---------------- PHASE 3 — PEAK + TAPER (D27–D32) ----------------
  { type: "A", checkpoint: 3, rev: true,
    g: G("Revision: fact log Polity + Science", "/mission/facts", [["war", "polity"], ["war", "biology"]]),
    m: M("Revision: formula sheet", TIER_A),
    e: E("Revision: rules one-pager", [["engbank", "spot-the-error"]]), ca: "CA log revise" },
  { type: "B", rev: true, slot: ["Q", "GS"],
    g: G("Revision: fact log History / Geography / Static", "/mission/facts", [["war", "modern-history"], ["war", "geography"], ["war", "static-gk"]]),
    m: M("Revision: formula sheet + mistake-book", [], { weak: true }),
    e: E("Revision: rules one-pager", [["engbank", "sentence-improvement"]]), ca: "CA log revise" },
  { type: "A", rev: true,
    g: G("Revision: fact log poora pass", "/mission/facts", [["war", "polity"], ["war", "static-gk"]]),
    m: M("Revision: formula sheet", TIER_A),
    e: E("Revision: bookmarked vocab", [["engbank", "synonyms"]]), ca: "CA log revise" },
  { type: "B", rev: true, slot: ["GS", "Q"],
    g: G("Revision pass-2 + CA log", "/mission/facts", [["war", "current-affairs"], ["war", "polity"]]),
    m: M("Halka Maths sectional + formula sheet", TIER_A),
    e: E("Halki vocab + rules", [["engbank", "synonyms"]]), ca: "CA log revise" },
  { type: "A", rev: true, last: true,
    g: G("Revision: fact log skim", "/mission/facts", [["war", "static-gk"], ["war", "polity"]]),
    m: M("Revision: formula sheet", TIER_A),
    e: E("Revision: rules + vocab", [["engbank", "sentence-improvement"]]), ca: "CA log revise" },
  { type: "C", taper: 1, noMock: true },
];

// ------------------------------------------------------------------ state ---
function readJSON(key, fallback) {
  if (typeof window === "undefined") return fallback;
  try { const v = JSON.parse(storeGet(key) || "null"); return v ?? fallback; } catch { return fallback; }
}
function writeJSON(key, v) { try { storeSet(key, JSON.stringify(v)); } catch { /* quota */ } }
function emit() { try { window.dispatchEvent(new CustomEvent("cgl:mission-changed")); } catch { /* SSR */ } }

export function getMission() {
  const v = readJSON(KEY, {});
  return {
    startDate: v.startDate || null,
    shift: SHIFTS.some((s) => s.v === v.shift) ? v.shift : "09:00",
    // Exam ab confirm hai — jab tak koi khud "nahi" na kare.
    examConfirmed: v.examConfirmed === false ? false : true,
    diag: v.diag || null,
    adapt: v.adapt || {},
  };
}
export function saveMission(patch) {
  const v = { ...getMission(), ...patch };
  writeJSON(KEY, v);
  emit();
  return v;
}
export function startMission(startDate, shift) {
  try { storeRemove("cgl.gs30"); } catch { /* ignore */ }
  return saveMission({ startDate: startDate || DEFAULT_START, shift: shift || "09:00" });
}
export function setAdapt(id, on) {
  const m = getMission();
  const adapt = { ...m.adapt };
  if (on) adapt[id] = dayKey(); else delete adapt[id];
  return saveMission({ adapt });
}
export function setDiag(diag) { return saveMission({ diag }); }

export function getExam() {
  if (typeof window === "undefined") return DEFAULT_EXAM;
  try { return localStorage.getItem(EXAM_KEY) || DEFAULT_EXAM; } catch { return DEFAULT_EXAM; }
}
export function setExam(iso, confirmed) {
  try { localStorage.setItem(EXAM_KEY, String(iso || DEFAULT_EXAM)); } catch { /* ignore */ }
  try { window.dispatchEvent(new CustomEvent("cgl:daily-changed")); } catch { /* SSR */ }
  return saveMission({ examConfirmed: confirmed === undefined ? true : !!confirmed });
}
// Tareekh ab pakki hai — ye sirf isliye bacha hai ki purane page na toote.
export function examBranch() {
  return { key: "fixed", t: "Exam 27 Oct 2026 — 32 din ka plan (25 Sep – 26 Oct), teen phase." };
}

export function getDone() { return readJSON(DONE_KEY, {}); }
export function toggleDone(day, id) {
  const all = getDone();
  const d = { ...(all[day] || {}) };
  if (d[id]) delete d[id]; else d[id] = true;
  const next = { ...all };
  if (Object.keys(d).length) next[day] = d; else delete next[day];
  writeJSON(DONE_KEY, next);
  emit();
  return next;
}

// 🌙 Roz raat ke TEEN number: Maths attempt · naye cluster (target 28) ·
// GS ke core block hue ya nahi.
export const CLUSTER_TARGET = 28;
export function getMetrics() { return readJSON(METRIC_KEY, {}); }
export function setMetric(dk, patch) {
  const all = getMetrics();
  const next = { ...all, [dk]: { ...(all[dk] || {}), ...patch } };
  writeJSON(METRIC_KEY, next);
  emit();
  return next;
}

// ------------------------------------------------------------------ dates ---
export function daysBetween(a, b) {
  const pa = /^(\d{4})-(\d{2})-(\d{2})/.exec(a || ""), pb = /^(\d{4})-(\d{2})-(\d{2})/.exec(b || "");
  if (!pa || !pb) return null;
  return Math.round((Date.UTC(+pb[1], pb[2] - 1, +pb[3]) - Date.UTC(+pa[1], pa[2] - 1, +pa[3])) / 864e5);
}
export function addDays(iso, n) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
}
export function dateOfDay(startDate, n) { return addDays(startDate || DEFAULT_START, n - 1); }
export function fmtDay(iso) {
  try {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
  } catch { return iso; }
}
export function currentDayNum(m = getMission()) {
  if (!m.startDate) return 0;
  const d = daysBetween(m.startDate, dayKey());
  return d == null ? 0 : d + 1;
}

// ------------------------------------------------------------- day list ---
// Plan ke 32 din. Exam jaldi ho (date badli) to aakhri din kat jate hain;
// der se ho to aakhri se pehle wale din dobara nahi bante — plan wahi rehta
// hai aur baaki din revision ke.
export function missionLength(m = getMission()) {
  const n = daysBetween(m.startDate || DEFAULT_START, getExam());
  return Math.max(4, Number.isFinite(n) ? n : DAYS.length);
}
export function getDays(m = getMission()) {
  const N = missionLength(m);
  let list = DAYS.slice(0, Math.min(DAYS.length, N));
  if (N > DAYS.length) {
    // Exam aur der se — aakhri taper din se PEHLE utne hi revision din jod do.
    // Ye din mock wale nahi bante (warna "Full mock 12/43" jaisa ulta-pulta
    // hisaab ban jata hai) — sirf revision + halka sectional.
    const extra = N - DAYS.length;
    const base = { ...DAYS[DAYS.length - 2], type: "B", rev: true, slot: ["GS", "Q"] };
    const tail = list[list.length - 1];
    list = [...list.slice(0, -1), ...Array.from({ length: extra }, (_, i) => ({ ...base, ext: i + 1 })), tail];
  }
  let fm = 0;
  return list.map((d, i) => {
    const x = { ...d, day: i + 1, phase: phaseOf(i + 1).k };
    if (x.type === "A") x.fm = ++fm;
    return x;
  });
}
export function totalDays(m = getMission()) { return getDays(m).length; }
export function totalMocks(m = getMission()) { return getDays(m).filter((d) => d.type === "A").length; }
export function planFor(n, m = getMission()) { return getDays(m).find((d) => d.day === n) || null; }

// ------------------------------------------------------------- the clock ---
export const toMin = (hm) => { const [h, mm] = String(hm).split(":").map(Number); return h * 60 + (mm || 0); };
export const toHM = (min) => `${String(Math.floor(min / 60) % 24).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

// Owner ka routine: 05:30 uthna, 06:00–07:30 walk, padhai 08:00–10:00,
// 10–11 nahana-nashta, padhai 11:00–20:30, dinner 20:30–22:30 (ise kabhi mat
// chhedna), 22:30–23:00 fact log, 23:00 sona (neend 6h30m — isse mat ghatao).
const WINDOWS = [[toMin("08:00"), toMin("10:00")], [toMin("11:00"), toMin("20:30")], [toMin("22:30"), toMin("23:00")]];
const LIFE = [
  { id: "wake", start: "05:30", end: "06:00", life: true, t: "Uthna + paani", bonus: true },
  { id: "walk", start: "06:00", end: "07:30", life: true, t: "Walk 🚶 + fact log self-quiz BOL KE (30–40 cluster) — 90 min muft ke", href: "/mission/facts" },
  { id: "ready", start: "07:30", end: "08:00", life: true, t: "Taiyaar — 8 baje baithna hai" },
  { id: "bath", start: "10:00", end: "11:00", life: true, t: "Nahana + nashta" },
  { id: "dinner", start: "20:30", end: "22:30", life: true, t: "Dinner + family — YE KABHI MAT CHHEDNA" },
];

// 🔒 CORE 5 — agar kuch aur na ho to sirf ye (~4.5 ghante). Home par alag se
// highlight hote hain, aur GS wale teen (gs1, gs2, gspyq… neeche dekho) se
// hi din "count" hota hai.
export const CORE_5 = ["mock", "gs1", "math", "gs2", "night"];
// HARD GATE: ye teen GS block na hue to din ginti mein nahi — streak toot
// jaati hai. Pichhli baar GS isliye nahi hua kyunki kisi cheez ne force
// nahi kiya.
export const GS_GATE = ["gs1", "gs2", "night"];

// ------------------------------------------------------------- the blocks ---
const B = (id, min, sec, t, extra = {}) => ({ id, min, sec, t, ...extra });

let weakCache = { at: 0, v: null };
function weakMathSpecs(n = 2) {
  if (weakCache.v && Date.now() - weakCache.at < 60000) return weakCache.v;
  weakCache = { at: Date.now(), v: weakMathSpecsRaw(n) };
  return weakCache.v;
}
function weakMathSpecsRaw(n) {
  const SKIP = new Set(["untagged"]);
  const fallback = [["sscmaths", "geometry"], ["sscmaths", "mensuration-3d"]];
  try {
    const wb = JSON.parse(storeGet("cgl.wrongbook") || "[]");
    const qc = JSON.parse(storeGet("cgl.qchapter") || "{}");
    const cnt = {};
    for (const e of Array.isArray(wb) ? wb : []) {
      if (e.subject !== "math") continue;
      const t = qc["mock:" + e.id] || qc[e.qid] || qc[e.id];
      const ch = t && t.ch;
      if (!ch || SKIP.has(ch)) continue;
      cnt[ch] = (cnt[ch] || 0) + 1;
    }
    const top = Object.entries(cnt).sort((a, b) => b[1] - a[1]).slice(0, n).map(([ch]) => ["sscmaths", ch]);
    return top.length ? top : fallback;
  } catch { return fallback; }
}
export function weakMathLabel() {
  return weakMathSpecs().map(([, s]) => s.replace(/-/g, " ")).join(" + ");
}

// 🚪 D14 → D15 ka darwaza — Phase 2 ke NAYE Maths chapter.
//
// Phase 2 ka poora matlab hai "ab wo chapter FULL karo jo chhoot gaye"
// (geometry, 3D, CI, H&D, coordinate, trig advanced). Par ye tabhi kaam ka hai
// jab paper mein haath chal raha ho: attempt 20 se neeche hai to naya chapter
// seekhne se attempt nahi badhta — sirf padhne ka ehsaas badhta hai. Us haalat
// mein D15–D22 ke Maths block sprint + mistake-book ke weak chapter ban jaate
// hain, aur naye chapter band.
//
// Naap: pichhle 3 Maths section (full mock ka Maths bhi utna hi timed hota
// hai jitna sectional) ka ausat attempt.
export const MATH_GATE_DAY = 14;
export const MATH_GATE_ATT = 20;
export const MATH_GATE_DAYS = [15, 22]; // in dino ke naye chapter is gate ke peeche

let mockCache = { at: 0, v: null };
function cachedMocks() {
  if (mockCache.v && Date.now() - mockCache.at < 60000) return mockCache.v;
  let v = [];
  try { v = getMocks() || []; } catch { v = []; }
  mockCache = { at: Date.now(), v };
  return v;
}

export function mathGate(mocks) {
  const list = sectionStatsIn(mocks || cachedMocks(), null, null).Q.list
    .slice().sort((a, b) => (a.date || "").localeCompare(b.date || "")).slice(-3);
  const n = list.length;
  const att = n ? list.reduce((a, x) => a + x.c + x.w, 0) / n : null;
  return { n, att, open: att == null || att >= MATH_GATE_ATT };
}

function blocksFor(day, m) {
  const p = planFor(day, m);
  if (!p) return { pinned: [], seq: [] };
  const ph = p.phase || phaseOf(day).k;
  const adapt = m.adapt || {};
  const vocab = VOCAB_ROT[(day - 1) % VOCAB_ROT.length];

  // ---- Phase 3: sirf mock + revision, koi naya topic nahi.
  if (ph === 3) return taperBlocks(p, day, m);

  const rev = B("rev", 45, "rev", "Spaced revision — fact log ke due (D+3 → D+7 → D+1 → D+14)", {
    must: true, kind: "revision", nm: "🧠 Fact log revision", tg: "D+3 → D+7 → D+1 → D+14 · roz ki hadd 120", href: "/mission/facts", hrefLabel: "🧠 Fact log",
    how: "'Dikhao' dabane se PEHLE khud yaad karo. Roz ki hadd 120 cluster — baaki kal khud aa jayenge, "
      + "koi backlog nahi. D+3 aur D+7 KABHI mat chhodo. Time kam ho to D+14 pehle kaato.",
  });
  const calc = B("calc", 15, "maths", "Calc drill: tables 12–25, squares 1–30, fraction ↔ %", {
    must: true, nm: "🧮 Calc drill", tg: "20 random · bol ke",
  });

  // ---- GS ke do bade block (CORE) — 50 PYQ + 15–18 cluster har ek.
  // Ye line har GS block par hai — yahi is poore phase ki soch hai. "Pehle
  // padh ke aata ho, tab PYQ" wali aadat hi GS ko 32 din mein rok deti hai.
  const GS_ZERO = "Topic pehle se aana zaroori NAHI. PYQ solve karo → galat/unsure ka cluster banao → wahi padhai hai. Zero knowledge hi starting point hai.";
  const gsHow = GS_ZERO + " Notes NAHI, sirf PYQ. Har Q max 10 sec — nahi pata to agla. Har galat/unsure ka CLUSTER: poora group EK line mein (6–12 facts), jaise 'Lata ke awards – Padma Bhushan 1969 · Phalke 1989 · Bharat Ratna 2001'. Target is block mein 15–18 naye cluster.";
  const gsLabel = !p.g ? "" : p.g.notes.startsWith("/pyq") ? "🎯 PYQ bank" : p.g.notes.startsWith("/notes") ? "📔 Notes" : "🧠 Fact log";
  // Dono GS block ek hi kaam hain, sirf ginti alag — isliye naam mein "set 1 /
  // set 2" nahi likhte: din ke khaali waqt ke hisaab se koi bhi pehle lag
  // sakta hai, aur tab "set 2 pehle" padhna ajeeb lagta hai.
  const gs1 = p.g && B("gs1", 90, "gs", `GS PYQ + CLUSTER · 50 Q: ${p.g.t}`, {
    must: true, core: true, gate: true, how: gsHow, nm: "🌍 GS PYQ + CLUSTER", tg: "50 Q · 15–18 naye cluster",
    auto: { n: 50, specs: p.g.specs }, href: p.g.notes, hrefLabel: gsLabel,
    href2: "/mission/facts", href2Label: "🧠 Fact log",
  });
  const gs2 = p.g && B("gs2", ph === 1 ? 90 : 60, "gs", `GS PYQ + CLUSTER · ${ph === 1 ? 50 : 35} Q: ${p.g.t}`, {
    must: true, core: true, gate: true, how: gsHow, nm: "🌍 GS PYQ + CLUSTER",
    tg: `${ph === 1 ? 50 : 35} Q · 15–18 naye cluster`,
    auto: { n: ph === 1 ? 50 : 35, specs: p.g.specs }, href: "/mission/facts", hrefLabel: "🧠 Fact log",
  });
  // Phase 1 ka teesra GS block (untimed mixed) — phase 2 mein hat jata hai.
  const gs3 = ph === 1 && B("gs3", 60, "gs", "GS mixed sectional (untimed) + cluster (8–10)", {
    must: true, nm: "🌍 GS mixed sectional", tg: "25 Q · 8–10 cluster",
    how: GS_ZERO + " Mixed subjects, asli paper jaisa. Har galat → cluster → fact log.",
    auto: { n: 25, specs: [["war", "polity"], ["war", "static-gk"], ["war", "geography"], ["war", "biology"]] },
    href: "/mission/facts", hrefLabel: "🧠 Fact log",
  });

  // ---- Maths (CORE): phase 2 mein 90 min (bache hue chapter FULL).
  let mathT = p.m ? p.m.t : "";
  let mathSpecs = p.m ? (p.m.weak ? weakMathSpecs() : p.m.specs) : [];
  if (p.m && p.m.weak) mathT = `${mathT}: ${weakMathLabel()}`;
  let mathHow = ph === 2
    ? "Phase 2 = gap fill. 20 min method (Brahmastra notes) → 30 PYQ timed (45 sec cap) → 10 min review. Ye wahi chapter hain jo pehle chhoot gaye the — inhi se mistake book bhari hai."
    : "15 min method → 25 PYQ timed (45 sec cap) → review. Phase 1 mein Maths sirf speed maintain.";
  // 🚪 Gate band (attempt 20 se kam) — D15–D22 ke naye chapter nahi khulte.
  const gate = p.m && p.m.concept && day >= MATH_GATE_DAYS[0] && day <= MATH_GATE_DAYS[1] ? mathGate() : null;
  if (gate && !gate.open) {
    mathT = `Mixed sprints + weak chapter: ${weakMathLabel()} — naye chapter BAND (D14 gate)`;
    mathSpecs = [...TIER_A.slice(0, 4), ...weakMathSpecs()];
    mathHow = `D14 par pichhle 3 Maths section ka ausat attempt ${Math.round(gate.att * 10) / 10} tha (chahiye ${MATH_GATE_ATT}). `
      + `Naye chapter (${p.m.t.split(":")[0]}) band — attempt 20 se neeche naya chapter attempt nahi badhata. `
      + "Sprint: 15 Q / 9 min, fir mistake-book ke weak chapter. Gate D15 ke baad bhi khul sakta hai — ek achha Maths sectional dedo.";
  } else if (adapt.mathSprint) {
    mathT = `1-liner sprints ×3 (Tier-A) — "${p.m ? p.m.t : ""}" postpone (checkpoint rule)`;
    mathSpecs = TIER_A;
    mathHow = "Checkpoint rule: attempt 19 se kam tha → naye chapter postpone, sirf sprint. Har sprint 15 Q / 9 min.";
  }
  const math = p.m && B("math", ph === 2 ? 120 : 60, "maths", `Maths: ${mathT}`, {
    must: true, core: true, how: mathHow, nm: "🧮 Maths", tg: `${ph === 2 ? 35 : 25} Q timed · 45 sec cap`,
    auto: mathSpecs.length ? { n: ph === 2 ? 35 : 25, specs: mathSpecs } : null,
    href: "/notes/brahmastra", hrefLabel: "📐 Formulas", href2: "/mission/analysis", href2Label: "🟡 Yellow list",
    yellowList: true,
  });

  // ---- English: D1–D6 grammar rules (12 rule), D7 se mixed error sets.
  const rulePhase = day <= 6;
  const eng = p.e && B("eng", ph === 2 ? 75 : 60, "english", `English: ${p.e.t}`, {
    must: true, nm: "📘 English", tg: `${rulePhase ? 35 : 40} Q · ATTEMPT 23, 25 nahi`,
    how: (rulePhase
      ? "Rule phase (D1–D6): roz 2 rule padho (15 min) → 35 Q. 12 rule kul."
      : "Roz 40 mixed error / sentence-improvement Q + vocab. ")
      + "ATTEMPT 23 — 25 NAHI. Har galat Q par RULE KA NUMBER log karo, chapter ka naam nahi."
      + (adapt.engNoBlind ? " Checkpoint rule: 1 bhi option nahi kata to CHHODO (attempt 21)." : ""),
    auto: { n: rulePhase ? 35 : 40, specs: p.e.specs }, href: "/notes/goldenrules", hrefLabel: "🏅 Rules",
  });
  const voc = B("vocab", 20, "english", `PYQ vocab: ${vocab[1]}`, {
    must: true, nm: "🔤 PYQ vocab", tg: "20 word · naya mile to bookmark",
    how: "20 PYQ words + /vocab ka aaj ka batch. Naya/bhoola word → bookmark.",
    auto: { n: 20, specs: [["engbank", vocab[0]]] }, href: "/vocab", hrefLabel: "🔤 Vocab",
  });

  const ca = B("ca", 30, "gs", `Current affairs: ${p.ca || "CA log revise"}`, {
    must: true, nm: "📰 Current affairs", tg: "20 Q · galat ka cluster",
    how: "Latest pehle. Sports, awards, appointments, schemes, summits, reports.",
    auto: { n: 20, specs: [["war", "current-affairs"]] }, href: "/current-affairs", hrefLabel: "📰 CA",
  });
  const speed = B("speed", 30, "maths", "Maths speed drill: 15 Q / 9 min sprint", {
    must: true, nm: "🧮 Maths speed sprint", tg: "15 Q / 9 min · 36 sec per Q",
    how: "Kisi Q pe 60 sec se zyada nahi. Yahi attempt 18.5 → 21 le jayega.",
    auto: { n: 15, specs: TIER_A, secs: 36 },
  });
  const reas = B("reas", 15, "reasoning", "Reasoning maintain: 10 series Q", {
    must: true, nm: "🧠 Reasoning maintain", tg: "10 series Q",
    how: "Reasoning 44.9 hai — sirf girne mat do. Series mein sabse zyada galtiyan.",
    auto: { n: 10, specs: [["reasonbank", "series"]] }, href: "/pyq/reasonbank", hrefLabel: "🧠 Reasoning bank",
  });
  const reasSect = adapt.reasoningDaily && B("reassect", 15, "reasoning", "Reasoning sectional (checkpoint rule)", {
    must: true, how: "Reasoning do baar 40 se neeche — roz 1 sectional, isse zyada nahi.",
    href: "/mock-marks?cat=reasoning", hrefLabel: "📊 Marks",
  });
  const night = B("night", 30, "rev", "🌙 Fact log revision + raat ka metric (3 number)", {
    must: true, core: true, gate: true, late: true, nm: "🌙 Raat ka metric", tg: "Maths attempt · naye cluster (28) · GS core", href: "/mission/facts", hrefLabel: "🧠 Fact log",
    how: "Maths attempt · naye cluster (target 28) · GS ke core block hue? — teeno Home par bharo.",
  });
  const brk = (i) => B("brk" + i, 15, "break", "Break", { brk: true });

  // ---- Subah ka block: mock ya do sectional (timed) + analysis.
  if (p.type === "A") {
    const mock = B("mock", 60, "mock", `FULL MOCK ${p.fm}/${totalMocks(m)}`, {
      must: true, core: true, kind: "mock", nm: `📝 FULL MOCK ${p.fm}`, tg: "60 min · rank + kitne mein se bhi likhna",
      how: `${FULL_PAPER} Phone bahar, koi pause nahi. Order: Reasoning → GS → Maths → English, har section 15 min lock. Marks ke saath RANK + kitne mein se — percentile wahi se banta hai.`,
      href: "/mock-marks?cat=full", hrefLabel: "📊 Marks + percentile",
    });
    const ana = B("ana", 30, "mock", "Mock analysis — 30 min, sirf 3 bucket", {
      must: true, nm: "🔍 Mock analysis", tg: "30 min · 🟢/🟡/🔴 + GS ka cluster",
      href: "/mission/analysis", hrefLabel: "🔍 Analysis",
      how: "Maths/English: 🟢 ho gaya · 🟡 aata tha par time laga/chhoot gaya (SHORT METHOD likho — yahi sona hai) · 🔴 nahi aata tha (skip list). GS mein bucket nahi — har galat/unsure ka seedha CLUSTER.",
    });
    return {
      pinned: [calc, mock, ana],
      seq: [rev, gs1, math, brk(1), gs2, eng, voc, reas, reasSect, brk(2), ca, speed, gs3, night].filter(Boolean),
    };
  }
  if (p.noSect) {
    // Aakhri naya material wala din — koi mock, koi sectional nahi. Jo bacha
    // hai wahi likho/padho, fir kal full mock.
    const wrap = B("wrap", 45, "rev", "Formula sheet + rules one-pager FINAL — ab iske baad koi naya material nahi", {
      must: true, core: true, nm: "📐 Formula + rules FINAL", tg: "Aaj ke baad koi naya material nahi",
      href: "/notes/brahmastra", hrefLabel: "📐 Formulas", href2: "/notes/goldenrules", href2Label: "🏅 Rules",
      how: "Aaj ke baad exam tak kuch naya nahi aayega. Jo sheet aaj ban gayi, exam tak wahi revise hogi.",
    });
    return {
      pinned: [calc],
      seq: [rev, gs1, math, brk(1), gs2, eng, voc, reas, brk(2), ca, wrap, night].filter(Boolean),
    };
  }
  const sect = B("mock", 30, "mock", `Sectional (timed): ${(p.slot || ["Q", "GS"]).map((x) => SECT[x].split(" ")[0]).join(" + ")}`, {
    must: true, core: true, kind: "sectional", sects: p.slot || ["Q", "GS"],
    nm: "📝 Sectional (timed)", tg: `${(p.slot || ["Q", "GS"]).length * 15} min · marks + rank dono daalo`,
    how: (p.slot || ["Q", "GS"]).map((x) => SECT[x]).join(" · ") + ". Marks + rank dono daalo.",
    href: "/mock-marks?cat=maths", hrefLabel: "📊 Marks daalo",
  });
  const ana = B("ana", 10, "mock", "Sectional analysis — 10 min, 3 bucket", {
    must: true, nm: "🔍 Sectional analysis", tg: "10 min · 🟢/🟡/🔴",
    href: "/mission/analysis", hrefLabel: "🔍 Analysis",
    how: "🟢 / 🟡 (short method likho) / 🔴. GS ka har galat Q → cluster.",
  });
  return {
    pinned: [calc, sect, ana],
    seq: [rev, gs1, math, brk(1), gs2, eng, voc, reas, reasSect, brk(2), ca, speed, gs3, night].filter(Boolean),
  };
}

// Phase 3 — sirf mock + revision (D27–D32).
function taperBlocks(p, day, m) {
  const calc = B("calc", 15, "maths", "Calc drill (haath garam)", { must: true, nm: "🧮 Calc drill", tg: "15 min", });
  const facts = B("facts", 90, "gs", p.g ? p.g.t : "Revision: fact log", {
    must: true, core: true, gate: true, nm: "🌍 Revision", tg: "Sirf padhna — koi naya topic nahi",
    href: "/mission/facts", hrefLabel: "🧠 Fact log",
    how: "Koi naya topic NAHI. Sirf jo likha hai wahi dohrao.",
  });
  const formula = B("formula", 60, "maths", "Maths formula sheet + mistake-book (sirf padhna)", {
    must: true, core: true, nm: "🧮 Formula sheet", tg: "Sirf padhna", href: "/notes/brahmastra", hrefLabel: "📐 Formulas",
  });
  const rules = B("rules", 45, "english", "English rules one-pager + bookmarked vocab", {
    must: true, nm: "📘 Rules + vocab", tg: "Sirf padhna", href: "/vocab/bookmarks", hrefLabel: "🔖 Bookmarks",
  });
  const calog = B("calog", 45, "gs", "CA log revise", { must: true, nm: "📰 CA log", tg: "Sirf padhna", href: "/current-affairs", hrefLabel: "📰 CA" });
  const night = B("night", 30, "rev", "🌙 Fact log + raat ka metric", { must: true, core: true, gate: true, late: true, nm: "🌙 Raat ka metric", tg: "Maths attempt · cluster · GS core", href: "/mission/facts", hrefLabel: "🧠 Fact log" });
  const admit = B("admit", 20, "life", "Admit card + ID ready, centre ka route/time", { must: true, nm: "📋 Admit card + ID", tg: "Bag aaj hi laga lo", href: "/mission/exam", hrefLabel: "🎯 Exam rules" });

  if (p.noMock) {
    // D32 — taper. Raat ka block NAHI; dinner ke baad so jao.
    return {
      pinned: [],
      seq: [
        B("skim", 120, "gs", "Fact log + CA skim (halka, sirf padhna)", { must: true, core: true, gate: true, href: "/mission/facts", hrefLabel: "🧠 Fact log" }),
        B("fsheet", 45, "maths", "Formula sheet skim", { must: true, href: "/notes/brahmastra", hrefLabel: "📐 Formulas" }),
        B("rskim", 45, "english", "Rules one-pager skim", { must: true, href: "/notes/goldenrules", hrefLabel: "🏅 Rules" }),
        admit,
      ],
    };
  }
  if (p.type === "A") {
    const mock = B("mock", 60, "mock", `FULL MOCK ${p.fm}/${totalMocks(m)}${p.last ? " — AAKHRI" : ""}`, {
      must: true, core: true, kind: "mock", how: `${FULL_PAPER} Rank + outOf zaroor daalo (percentile).`,
      href: "/mock-marks?cat=full", hrefLabel: "📊 Marks + percentile",
    });
    const ana = B("ana", p.last ? 45 : 30, "mock", "Mock analysis — 3 bucket", { must: true, href: "/mission/analysis", hrefLabel: "🔍 Analysis" });
    return { pinned: [calc, mock, ana], seq: [facts, formula, rules, calog, night] };
  }
  const sect = B("mock", 30, "mock", "Halka sectional (sirf confidence)", {
    must: true, core: true, kind: "sectional", sects: p.slot || ["GS", "Q"],
    how: "Score ki chinta nahi — haath chalta rahe.", href: "/mock-marks?cat=gk", hrefLabel: "📊 Marks",
  });
  return { pinned: [calc, sect], seq: [facts, formula, rules, calog, admit, night] };
}

// Blocks ko khidkiyon mein bithana (upar WINDOWS). Pinned pehle: calc drill
// shift se theek pehle, mock/sectional shift par, analysis uske baad.
export function buildTimeline(day, m = getMission()) {
  const p = planFor(day, m);
  if (!p) return [];
  const { pinned, seq } = blocksFor(day, m);
  const shift = toMin(m.shift || "09:00");
  const busy = [];
  const placed = [];
  const place = (b, start) => { placed.push({ ...b, s: start, e: start + b.min }); busy.push([start, start + b.min]); };
  const free = (s, e) => busy.every(([a, b]) => e <= a || s >= b);
  const inWin = (s, e) => WINDOWS.some(([a, b]) => s >= a && e <= b);

  const calc = pinned.find((b) => b.id === "calc");
  const mock = pinned.find((b) => b.id === "mock");
  const ana = pinned.find((b) => b.id === "ana");
  if (mock) {
    place(mock, shift);
    if (calc) place(calc, shift - calc.min);
  } else if (calc) place(calc, shift - calc.min);

  let lunchAt = toMin("13:30");
  if (!free(lunchAt, lunchAt + 60)) lunchAt = mock ? shift + mock.min : lunchAt;
  place({ id: "lunch", min: 60, sec: "life", t: "Lunch + 20 MIN NAP (alarm lagao)", life: true }, lunchAt);
  if (ana && mock) {
    let t = shift + mock.min;
    for (let guard = 0; guard < 200; guard++) {
      if (inWin(t, t + ana.min) && free(t, t + ana.min)) { place(ana, t); break; }
      t += 15;
    }
  }

  const gaps = () => {
    const out = [];
    for (const [ws, we] of WINDOWS) {
      const inside = busy.filter(([a, b]) => b > ws && a < we).sort((x, y) => x[0] - y[0]);
      let cur = ws;
      for (const [a, b] of inside) { if (a > cur) out.push([cur, Math.min(a, we)]); cur = Math.max(cur, b); }
      if (cur < we) out.push([cur, we]);
    }
    return out;
  };
  const late = WINDOWS[2];
  const left = [...seq];
  function fits(b, s, e) {
    const isLate = s >= late[0];
    if (!!b.late !== isLate) return false;
    if (b.brk) {
      const prev = placed.find((x) => x.e === s && !x.life && !x.brk);
      if (!prev || prev.min < 60 || e - s - b.min < 30) return false;
    }
    return b.min <= e - s;
  }
  for (let guard = 0; guard < 80 && left.length; guard++) {
    const g = gaps().find(([s, e]) => e - s >= 15 && left.some((b) => fits(b, s, e)));
    if (!g) break;
    const [s, e] = g;
    const i = left.findIndex((b) => fits(b, s, e));
    place(left.splice(i, 1)[0], s);
  }
  const skipped = left.filter((b) => !b.brk);

  const life = LIFE.map((b) => ({ ...b, s: toMin(b.start), e: toMin(b.end), min: toMin(b.end) - toMin(b.start) }));
  if (p.type === "C") {
    const [ws, we] = WINDOWS[1];
    const lastEnd = Math.max(ws, ...busy.filter(([a, b]) => a >= ws && b <= we).map(([, b]) => b));
    if (lastEnd < we) life.push({ id: "rest", life: true, t: "Aaram. Koi naya topic NAHI, koi mock NAHI. Raat ka block bhi nahi — dinner ke baad so jao.", s: lastEnd, e: we, min: we - lastEnd });
  }
  const lateEnds = placed.filter((b) => b.late).map((b) => b.e);
  const sleepAt = p.noMock ? toMin("22:30") : lateEnds.length ? Math.max(...lateEnds) : toMin("23:00");
  const sleep = { id: "sleep", life: true, t: p.noMock ? "Jaldi so jao — kal EXAM hai." : "Sona 😴 (neend 6h30m — isse mat ghatao)", s: sleepAt, e: sleepAt + 1, min: 1 };
  const out = [...life, ...placed, sleep].sort((a, b) => a.s - b.s).map((b) => ({ ...b, start: toHM(b.s), end: toHM(b.e) }));
  out.skipped = skipped;
  return out;
}

export const tickable = (b) => !b.life && !b.brk;

export function dayStats(day, done = getDone(), m = getMission()) {
  const tl = buildTimeline(day, m).filter(tickable);
  const d = done[day] || {};
  const must = tl.filter((b) => b.must);
  const core = tl.filter((b) => b.core);
  const gate = tl.filter((b) => b.gate);
  return {
    mustTotal: must.length,
    mustDone: must.filter((b) => d[b.id]).length,
    coreTotal: core.length,
    coreDone: core.filter((b) => d[b.id]).length,
    gateTotal: gate.length,
    gateDone: gate.filter((b) => d[b.id]).length,
    total: tl.length,
    doneCount: tl.filter((b) => d[b.id]).length,
    mustMin: must.reduce((a, b) => a + b.min, 0),
    coreMin: core.reduce((a, b) => a + b.min, 0),
  };
}
// Din "count" tabhi hota hai jab CORE 5 ho jayein — aur usme GS ke teen
// block (HARD GATE) hone hi chahiye.
export function mustComplete(day, done = getDone(), m = getMission()) {
  const s = dayStats(day, done, m);
  return s.coreTotal > 0 && s.coreDone >= s.coreTotal && s.gateDone >= s.gateTotal;
}
export function streak(done = getDone(), m = getMission()) {
  const cur = Math.min(currentDayNum(m), totalDays(m));
  if (cur < 1) return 0;
  let s = mustComplete(cur, done, m) ? 1 : 0;
  for (let i = cur - 1; i >= 1; i--) { if (mustComplete(i, done, m)) s++; else break; }
  return s;
}

export function nowBlock(timeline, now = new Date()) {
  const t = now.getHours() * 60 + now.getMinutes();
  const cur = timeline.find((b) => b.s <= t && t < b.e) || null;
  const next = timeline.find((b) => b.s > t && b.id !== "sleep") || null;
  return { cur, next, t };
}

// -------------------------------------------------------------- analysis ---
// Purana 7-bucket (W1–W4 / S1 / S2 / T1) HATA diya — use hi nahi hota tha.
// Ab sirf teen, aur wo bhi sirf Maths/English mein. GS mein bucket nahi:
// har galat/unsure Q ka seedha CLUSTER.
export const BUCKETS = [
  { k: "green", icon: "🟢", t: "Aata tha, ho gaya", tip: "Kuch nahi karna." },
  { k: "yellow", icon: "🟡", t: "Aata tha par time laga / chhoot gaya", tip: "SHORT METHOD likho — yahi sona hai. 3 din baad stopwatch ke saath dobara." },
  { k: "red", icon: "🔴", t: "Nahi aata tha", tip: "Ignore ya skip list. Phase 2 mein chapter aaye to wahan dekhna." },
];
export const ANALYSIS_STEPS = [
  "Marks + RANK /mock-marks mein daale (percentile wahi se banta hai)",
  "SOLUTION DEKHNE SE PEHLE: Maths/English ke chhoote aur shak wale Q dobara — 🟢 / 🟡 / 🔴",
  "🟡 ka SHORT METHOD likho (3 din baad timed dobara) · GS ka har galat Q → CLUSTER → fact log",
  "Agle 2 din ke 3 action item likhe",
];
export function getAnalyses() { const v = readJSON(ANALYSIS_KEY, []); return Array.isArray(v) ? v : []; }
export function getAnalysis(mockId) { return getAnalyses().find((a) => a.id === mockId) || null; }
export function saveAnalysis(rec) {
  const list = getAnalyses().filter((a) => a.id !== rec.id);
  const next = [{ ...rec, day: rec.day || dayKey(), at: new Date().toISOString() }, ...list];
  writeJSON(ANALYSIS_KEY, next);
  emit();
  return next;
}
export function yellowDue(onDate) {
  const out = [];
  for (const a of getAnalyses()) {
    if (daysBetween(a.day, onDate) !== 3) continue;
    for (const t of a.yellow || []) if (String(t || "").trim()) out.push({ t: String(t).trim(), from: a.name || "mock" });
  }
  return out;
}
export function latestYellow() {
  const withY = getAnalyses().filter((a) => (a.yellow || []).length)
    .sort((a, b) => String(b.at || "").localeCompare(String(a.at || "")));
  if (!withY.length) return null;
  return { from: withY[0].name || "mock", day: withY[0].day, items: withY[0].yellow.map((t) => String(t).trim()).filter(Boolean) };
}
export function recentActions() {
  const today = dayKey();
  const out = [];
  for (const a of getAnalyses()) {
    const age = daysBetween(a.day, today);
    if (age == null || age < 0 || age > 2) continue;
    for (const t of a.actions || []) if (String(t || "").trim()) out.push({ t: String(t).trim(), from: a.name || "mock" });
  }
  return out.slice(0, 6);
}

// ------------------------------------------------------------- revision ---
export const REV_GAPS = [1, 3, 7, 14];
export function topicsOf(day, m = getMission()) {
  const p = planFor(day, m);
  if (!p) return [];
  const out = [];
  if (p.m) out.push({ sec: "maths", t: p.m.t });
  if (p.e) out.push({ sec: "english", t: p.e.t });
  if (p.g) out.push({ sec: "gs", t: p.g.t });
  if (p.ca && !/revise|log/i.test(p.ca)) out.push({ sec: "ca", t: "CA " + p.ca });
  return out;
}
export function revisionFor(day, m = getMission()) {
  if (day >= totalDays(m) - 1) return [{ gap: "final", day: null, items: [{ sec: "gs", t: "Poora fact log + CA log + formula sheet + rules one-pager" }] }];
  const out = [];
  for (const g of REV_GAPS) {
    const d = day - g;
    if (d >= 1) out.push({ gap: g, day: d, items: topicsOf(d, m) });
  }
  return out;
}

// ----------------------------------------------------------- checkpoints ---
export const SECTIONS = [
  { k: "R", label: "Reasoning", icon: "🧠", re: /reason|intelligence/i, cat: "reasoning" },
  { k: "GS", label: "GS", icon: "🌍", re: /general awareness|general knowledge|\bgs\b|\bgk\b/i, cat: "gk" },
  { k: "Q", label: "Maths", icon: "🧮", re: /quant|math/i, cat: "maths" },
  { k: "E", label: "English", icon: "📘", re: /english/i, cat: "english" },
];
// Checkpoint — PERCENTILE se naapo. Score saath mein, par faisla percentile ka.
export const TARGETS = {
  cp1: { label: "CP1 · D10 (4 Oct)", day: 10, pct: 62, full: 135,
    R: { score: 42, att: 23 }, GS: { score: 22, acc: 50 }, Q: { score: 34, att: 19 }, E: { score: 36, wrongMax: 5 } },
  cp2: { label: "CP2 · D19 (13 Oct)", day: 19, pct: 72, full: 145,
    R: { score: 43, att: 23 }, GS: { score: 26, acc: 57 }, Q: { score: 36, att: 20 }, E: { score: 38, wrongMax: 4 } },
  cp3: { label: "CP3 · D27 (21 Oct)", day: 27, pct: 80, full: 152,
    R: { score: 44, att: 24 }, GS: { score: 29, acc: 62 }, Q: { score: 37, att: 21 }, E: { score: 39, wrongMax: 3 } },
  exam: { label: "Exam (27 Oct)", day: null, pct: PCT_TARGET, full: TARGET.total,
    R: { score: TARGET.R, att: 24 }, GS: { score: TARGET.GS, acc: 62 }, Q: { score: TARGET.Q, att: 22 }, E: { score: TARGET.E, wrongMax: 3 } },
};
export const CP_KEYS = ["cp1", "cp2", "cp3"];

// 🌍 GS ka apna track — sabse bada gap, isliye alag se.
export const GS_TRACK = [
  { day: 5, score: 20, miss: "Cluster ban hi nahi rahe. Fact log kholo: har entry single fact hai ya poora group? Group banao." },
  { day: 10, score: 22, miss: "CP1 par acc 50% se kam → cluster ki QUALITY ki dikkat hai, ginti ki nahi." },
  { day: 19, score: 26, miss: "CP2 par acc 57% se kam → CA aur Economy ka time kaato, Polity + Science + Static pass-2 par lagao." },
  { day: 27, score: 29, miss: "Ab sirf revision — naya material band." },
];

const secScore = (s) => n0(s.correct) * 2 - n0(s.wrong) * 0.5;
function n0(v) { const n = Number(v); return Number.isFinite(n) && n >= 0 ? n : 0; }

export function sectionStatsIn(mocks, from, to) {
  const inR = (d) => (!from || d >= from) && (!to || d <= to);
  const acc = {};
  for (const S of SECTIONS) acc[S.k] = { n: 0, score: 0, att: 0, wrong: 0, correct: 0, list: [] };
  const fulls = [];
  for (const m of mocks || []) {
    if (!inR(m.date || "")) continue;
    const secs = m.sections || [];
    if ((m.cat || "full") === "full") {
      let tot = 0;
      for (const s of secs) {
        tot += secScore(s);
        const S = SECTIONS.find((x) => x.re.test(s.name || ""));
        if (S) push(acc[S.k], s, m);
      }
      const pct = m.rank && m.outOf ? (1 - Number(m.rank) / Number(m.outOf)) * 100 : null;
      fulls.push({ date: m.date, score: tot, pct: Number.isFinite(pct) ? pct : null, name: m.name });
    } else {
      const S = SECTIONS.find((x) => x.re.test(m.name || "")) || SECTIONS.find((x) => x.cat === m.cat);
      if (S) for (const s of secs) push(acc[S.k], s, m);
    }
  }
  const out = {};
  for (const S of SECTIONS) {
    const a = acc[S.k];
    out[S.k] = a.n ? {
      n: a.n, score: a.score / a.n, att: a.att / a.n, wrong: a.wrong / a.n,
      acc: a.att ? (a.correct / a.att) * 100 : null, list: a.list,
    } : { n: 0, list: [] };
  }
  const withPct = fulls.filter((f) => f.pct != null);
  out.full = fulls.length ? {
    n: fulls.length,
    score: fulls.reduce((x, f) => x + f.score, 0) / fulls.length,
    pct: withPct.length ? withPct.reduce((x, f) => x + f.pct, 0) / withPct.length : null,
    list: fulls,
  } : { n: 0, list: [], pct: null };
  return out;
  function push(a, s, m) {
    const c = n0(s.correct), w = n0(s.wrong);
    a.n++; a.score += secScore(s); a.att += c + w; a.wrong += w; a.correct += c;
    a.list.push({ date: m.date, name: m.name, c, w, total: n0(s.total), score: secScore(s) });
  }
}

export function hasGsSectional(mocks) {
  return (mocks || []).some((m) => (m.cat || "full") !== "full" &&
    (SECTIONS[1].re.test(m.name || "") || (m.cat === "gk" && !SECTIONS.some((S) => S.k !== "GS" && S.re.test(m.name || "")))));
}

export function checkpointDays(m = getMission()) {
  const days = getDays(m);
  const at = (n) => (days.find((d) => d.checkpoint === n) || {}).day || TARGETS[`cp${n}`].day;
  return { c1: at(1), c2: at(2), c3: at(3), N: days.length };
}
export function checkpointWindows(m = getMission()) {
  const st = m.startDate || DEFAULT_START;
  const { c1, c2, c3, N } = checkpointDays(m);
  return {
    before: { label: "Mission se pehle", from: null, to: addDays(st, -1) },
    w1: { label: `Phase 1a (D1–D${c1})`, from: st, to: addDays(st, c1 - 1), cp: "cp1", date: addDays(st, c1 - 1) },
    w2: { label: `D${c1 + 1}–D${c2}`, from: addDays(st, c1), to: addDays(st, c2 - 1), cp: "cp2", date: addDays(st, c2 - 1) },
    w3: { label: `D${c2 + 1}–D${c3}`, from: addDays(st, c2), to: addDays(st, c3 - 1), cp: "cp3", date: addDays(st, c3 - 1) },
    w4: { label: `Aakhri (D${c3 + 1}–D${N})`, from: addDays(st, c3), to: addDays(st, N - 1), cp: "exam", date: getExam() },
  };
}

// "Ye badlav lagao" — sirf tab jab PICHHLE 3 MEIN SE 2 target se neeche hon.
// Ek mock kabhi plan nahi badalta.
export const RULES = {
  gsCluster: { title: "GS accuracy CP1 par 50% se kam → cluster ki quality", detail: "Fact log ki entries kholo: single fact hain ya poora group? Har entry 6–12 fact ka CLUSTER honi chahiye. Ginti badhane se kuch nahi hoga.", adapt: true },
  gsPassTwo: { title: "GS accuracy CP2 par 57% se kam → CA/Economy ka time kaato", detail: "CA aur Economy ka time Polity + Science + Static ke pass-2 par lagao — wahan se zyada Q aate hain.", adapt: true },
  mathSprint: { title: "Maths attempt 19 se kam → naye chapter postpone", detail: "Phase 2 ke naye chapter (geometry / 3D / H&D) rok do, sirf sprint. Speed pehle, chapter baad mein.", adapt: true },
  engNoBlind: { title: "English 5+ galat → attempt 23 se 21", detail: "Vocab ka time grammar ko. 1 bhi option nahi kata to chhodo.", adapt: true },
  easyShift: { title: "Percentile nahi badh raha par score badh raha", detail: "Tum easy shift chun rahe ho. Agla mock TOUGH shift lagao — easy/tough alternate.", adapt: false },
  reasoningDaily: { title: "Reasoning 40 se kam — do baar", detail: "Roz 1 reasoning sectional (15 min). Abhi sirf 10 series Q hain.", adapt: true },
};

export function gsTrack(mocks, m = getMission()) {
  const st = m.startDate || DEFAULT_START;
  const list = sectionStatsIn(mocks, null, null).GS.list.slice().sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  const base = list.filter((x) => x.date <= st).slice(-1)[0] || list[0] || null;
  return {
    base,
    rows: GS_TRACK.map((t) => {
      const date = addDays(st, t.day - 1);
      const upto = list.filter((x) => x.date <= date && x.date >= st);
      const got = upto.length ? upto[upto.length - 1] : null;
      return { ...t, date, got, reached: dayKey() >= date };
    }),
  };
}

export function evaluateCheckpoints(mocks, m = getMission()) {
  const W = checkpointWindows(m);
  const stats = {};
  for (const [k, w] of Object.entries(W)) stats[k] = sectionStatsIn(mocks, w.from, w.to);
  const day = currentDayNum(m);
  const { c1, c2, c3 } = checkpointDays(m);
  const cur = day <= c1 ? "w1" : day <= c2 ? "w2" : day <= c3 ? "w3" : "w4";
  const st = W.w1.from;
  const triggered = [];
  const last3 = (k, upto) => sectionStatsIn(mocks, st, upto)[k].list
    .slice().sort((a, b) => (a.date || "").localeCompare(b.date || "")).slice(-3);
  const twoOf3 = (arr, bad) => arr.length >= 2 && arr.filter(bad).length >= 2;
  const gsAcc = (x) => (x.c + x.w ? (x.c / (x.c + x.w)) * 100 : 0);

  if (day >= c1 && twoOf3(last3("GS", W.w1.to), (x) => gsAcc(x) < TARGETS.cp1.GS.acc)) triggered.push("gsCluster");
  if (day >= c2 && twoOf3(last3("GS", W.w2.to), (x) => gsAcc(x) < TARGETS.cp2.GS.acc)) triggered.push("gsPassTwo");
  if (day >= c1 && twoOf3(last3("Q", null), (x) => x.c + x.w < TARGETS.cp1.Q.att)) triggered.push("mathSprint");
  if (twoOf3(last3("E", null), (x) => x.w >= 5)) triggered.push("engNoBlind");
  if (twoOf3(last3("R", null), (x) => x.score < 40)) triggered.push("reasoningDaily");
  // Score badh raha par percentile nahi → easy shift chun rahe ho.
  const fl = sectionStatsIn(mocks, st, null).full.list.filter((f) => f.pct != null).slice(-3);
  if (fl.length >= 3 && fl[2].score > fl[0].score && fl[2].pct <= fl[0].pct) triggered.push("easyShift");
  return { stats, windows: W, current: cur, day, triggered };
}

export function pendingRules(mocks, m = getMission()) {
  const ev = evaluateCheckpoints(mocks, m);
  return ev.triggered.filter((id) => RULES[id].adapt && !(m.adapt || {})[id]);
}
