// 🚀 CGL Mission — 18 din, exam (1 Oct) tak. Poora plan ek jagah.
//
// Mock marks ki report (lib/mockreporttext) se nikla tha:
//   • Maths = SPEED ki dikkat (accuracy ~88%, par har mock mein 7-8 sawaal chhoot'te)
//   • English = ACCURACY ki dikkat (25/25 attempt, par 6-11 galat)
//   • GS = sabse bada gap (~10-20), aur 15 min kaafi hota hai
//   • Reasoning ~43 — sabse strong, aur sabse zyada practice bhi wahi (23 mock)
// Isliye time ROI ke hisaab se: GS → Maths → English → Reasoning (sirf maintain).
//
// Ye file sirf DATA + saaf logic hai. Screen components/MissionToday +
// components/MissionDay banate hain; pages app/mission/* mein hain.
//
// Din ka dhaancha user ka apna routine hai (khud bataya): 05:15 uthna, 06:00–07:30
// walk, padhai 08:00–10:00, 10–11 nahana-nashta, padhai 11:00–20:30, dinner
// 20:30–22:30, padhai 22:30–23:30, 23:30 sona. Blocks inhi teen khidkiyon mein
// bharte hain (buildTimeline). Mock hamesha EXAM SHIFT ke time par — default
// 09:00. Admit card mein 12:30 / 16:00 aaye to setup mein badlo, baaki din
// apne aap uske aas-paas bhar jata hai.
//
// Kal ka kaam chhoot gaya to PEECHE MAT JAO — koi backlog nahi banta. Pichhle do
// plan (RBE 50-din, GS30) isi se mare the.

import { storeGet, storeSet, storeRemove } from "./bigstore";
import { dayKey } from "./daytime";

// ------------------------------------------------------------------ keys ---
const KEY = "cgl.mission";
const DONE_KEY = "cgl.mission.done";
const ANALYSIS_KEY = "cgl.mission.analysis";

export const DEFAULT_START = "2026-09-13";
export const TOTAL_DAYS = 18;
export const SHIFTS = [
  { v: "09:00", label: "Subah 9:00 (Shift 1)" },
  { v: "12:30", label: "Dopahar 12:30 (Shift 2)" },
  { v: "16:00", label: "Shaam 4:00 (Shift 3)" },
];

// -------------------------------------------------------------- the days ---
// Har din: type (A = full mock, B = build/sectional, C = taper), subah 9 baje
// wala slot, aur chaar topic — Maths, English rule, GS, CA. `m`/`e`/`g` ke specs
// seedhe components/PlanPractice ke format mein hain ([bank, slug]).

const TIER_A = [
  ["sscmaths", "percentage"], ["sscmaths", "profit-and-loss"], ["sscmaths", "average"],
  ["sscmaths", "simplification-and-approximation"], ["sscmaths", "ratio-and-proportion"],
  ["sscmaths", "simple-interest-si"], ["sscmaths", "trigonometry"], ["sscmaths", "algebra"],
];
const VOCAB_ROT = [
  ["synonyms", "Synonyms"], ["antonyms", "Antonyms"], ["one-word-substitution", "One word substitution"],
  ["idioms", "Idioms & phrases"], ["spelling-check", "Spellings"],
];
const CA_MONTHS = {
  1: "Sep 2026", 2: "Aug 2026", 3: "Aug 2026", 4: "Jul 2026", 5: "Jul 2026", 6: "Jun 2026", 7: "Jun 2026",
  8: "May 2026", 9: "May 2026", 10: "Apr 2026", 11: "Apr 2026", 12: "Mar 2026", 13: "Mar 2026",
  14: "Jan–Feb 2026 (sirf sports, awards, appointments)",
};

// FM ka paper: CGL 2025 ke jo shift abhi tak nahi diye (21 Sep ke baad wale),
// warna Testbook fresh full test. Sectionals ke liye alag shifts, taaki koi
// paper do baar na aaye aur score jhootha na lage.
const FULL_PAPER = "Testbook: CGL 2025 ka koi FULL paper jo nahi diya (21 Sep 2025 ke baad wale shifts) — ya fresh Full Test";
const SECT = {
  Q: "Maths — CGL 2025 ka agla shift (19 Sep S3 → 20 Sep …), fir CGL 2024",
  GS: "GS — CGL 2024 ka shift (2025 wale full mock ke liye bache hain)",
  E: "English — CGL 2025 ka agla shift (15 Sep S1 → …)",
  R: "Reasoning — CGL 2025 ka agla shift (20 Sep S3 → …)",
};

export const DAYS = [
  { day: 1, type: "B", slot: { t: "Maths self-test + GS sectional", list: ["DIAG", "GS"] },
    m: { t: "Profit & Loss + Discount (MP : CP ratio method)", specs: [["sscmaths", "profit-and-loss"], ["sscmaths", "discount"], ["sscmaths", "percentage"]] },
    e: { t: "Subject–Verb Agreement", specs: [["errorpro", "subject-verb-agreement"]] },
    g: { t: "Polity-1: Articles, Parts, Schedules, Sources", notes: "/notes/parmar-polity", specs: [["gk", "polity"], ["war", "polity"]] } },
  { day: 2, type: "A", fm: 1, note: "Baseline — jo aaye wahi sahi. Is number se hi aage ka hisaab banega.",
    m: { t: "Simplification + Number System (1-liners)", specs: [["sscmaths", "simplification-and-approximation"], ["sscmaths", "number-system"]] },
    e: { t: "Tenses + Conditionals", specs: [["errorpro", "tense"], ["errorpro", "conditionals"]] },
    g: { t: "Polity-2: FR / DPSP / FD, Amendments, Bodies", notes: "/notes/parmar-polity", specs: [["war", "polity"], ["gk", "polity"]] } },
  { day: 3, type: "B", slot: { t: "Maths + GS + Reasoning sectional", list: ["Q", "GS", "R"] },
    m: { t: "Ratio, Partnership, Average", specs: [["sscmaths", "ratio-and-proportion"], ["sscmaths", "partnership"], ["sscmaths", "average"]] },
    e: { t: "Articles + Nouns", specs: [["errorpro", "article"], ["errorpro", "noun"]] },
    g: { t: "Biology: human body, vitamins, diseases, cell", notes: "/notes/parmar-biology", specs: [["war", "biology"]] } },
  { day: 4, type: "A", fm: 2,
    m: { t: "SI / CI + Mixture & Alligation", specs: [["sscmaths", "simple-interest-si"], ["sscmaths", "compound-interest-ci"], ["sscmaths", "mixture-and-alligation"]] },
    e: { t: "Pronoun + Degree of comparison", specs: [["errorpro", "pronoun"], ["errorpro", "adjective"]] },
    g: { t: "Chemistry: common names, pH, metals, everyday chemistry", notes: "/notes/parmar-chemistry", specs: [["war", "chemistry"]] } },
  { day: 5, type: "B", slot: { t: "Maths + GS + English sectional", list: ["Q", "GS", "E"] },
    m: { t: "Algebra identities (a+1/a, a³±b³, value-put trick)", specs: [["sscmaths", "algebra"]] },
    e: { t: "Prepositions + Conjunctions (no sooner–than, lest–should)", specs: [["errorpro", "preposition"], ["errorpro", "conjunction"]] },
    g: { t: "Physics facts: units, instruments, inventions", notes: "/notes/parmar-physics", specs: [["war", "physics"]] } },
  { day: 6, type: "A", fm: 3,
    m: { t: "Trigonometry (values, identities, θ=45° put, max/min)", specs: [["sscmaths", "trigonometry"]] },
    e: { t: "Parallelism + Redundancy + Adverbs", specs: [["errorpro", "superfluous"], ["errorpro", "adverb-inversion"]] },
    g: { t: "Modern History: 1857 → 1947, Congress sessions, GG/Viceroys", notes: "/notes/parmar-history", specs: [["war", "modern-history"]] } },
  { day: 7, type: "B", checkpoint: 1, slot: { t: "Maths + GS + Reasoning sectional → Checkpoint 1", list: ["Q", "GS", "R"] },
    m: { t: "Time & Work + TSD (+ trains)", specs: [["sscmaths", "time-and-work"], ["sscmaths", "time-speed-and-distance"], ["sscmaths", "problems-on-trains"]] },
    e: { t: "Voice + Narration (sirf basic tense change)", specs: [["errorpro", "voice"], ["errorpro", "narration"]] },
    g: { t: "Art & Culture: dance → state, instruments → artists, festivals", notes: "/notes/parmar-static", specs: [["war", "static-gk"]] } },
  { day: 8, type: "A", fm: 4,
    m: { t: "Mensuration 2D (formula sheet)", specs: [["sscmaths", "mensuration-2d"]], concept: true },
    e: { t: "Sentence improvement drill", specs: [["engbank", "sentence-improvement"]] },
    g: { t: "Indian Geography: rivers, dams, NP, passes, soils, crops", notes: "/notes/parmar-geography", specs: [["war", "geography"]] } },
  { day: 9, type: "A", fm: 5,
    m: { t: "Mensuration 3D — SIRF direct formula wale", specs: [["sscmaths", "mensuration-3d"]], concept: true },
    e: { t: "Cloze test method", specs: [["engbank", "cloze-test"]] },
    g: { t: "Ancient + Medieval (sirf PYQ wale)", notes: "/notes/parmar-history", specs: [["war", "ancient-history"], ["war", "mediaeval-history"], ["gk", "ancient-history"]] } },
  { day: 10, type: "B", slot: { t: "Maths + GS + English sectional", list: ["Q", "GS", "E"] },
    m: { t: "Geometry — sirf: triangle centres, similarity, circle theorems", specs: [["sscmaths", "geometry"]], concept: true },
    e: { t: "RC method + Para-jumble", specs: [["engbank", "comprehension"], ["engbank", "parajumble"]] },
    g: { t: "Economy + Census 2011", notes: "/notes/parmar-economy", specs: [["war", "economics"]] } },
  { day: 11, type: "A", fm: 6,
    m: { t: "DI + Mean/Median/Mode basic", specs: [["mathbank", "data-interpretation"], ["mathbank", "mean-median-mode"]], concept: true },
    e: { t: "Mixed error set", specs: [["engbank", "spot-the-error"], ["errorpro", "subject-verb-agreement"]] },
    g: { t: "Static GK: sports, awards, books, days, HQ", notes: "/notes/parmar-static", specs: [["war", "static-gk"]] } },
  { day: 12, type: "A", fm: 7,
    m: { t: "Mistake-book ke 2 sabse kamzor chapter", weak: true, specs: [] },
    e: { t: "Error log ke weak rules", specs: [["engbank", "spot-the-error"], ["engbank", "sentence-improvement"]] },
    g: { t: "Physical Geography + Environment basics", notes: "/notes/parmar-environment", specs: [["war", "geography"], ["war", "environment"]] } },
  { day: 13, type: "A", fm: 8,
    m: { t: "Mixed 1-liner sprints (Tier-A)", specs: TIER_A },
    e: { t: "Mixed (error + improvement + FIB)", specs: [["engbank", "spot-the-error"], ["engbank", "fill-in-the-blanks"]] },
    g: { t: "Sabse kamzor GS topic (fact log se) — AAKHRI naya topic", notes: "/mission/facts", specs: [["war", "polity"], ["war", "static-gk"], ["war", "biology"]] } },
  { day: 14, type: "B", checkpoint: 2, slot: { t: "Maths + GS sectional → Checkpoint 2", list: ["Q", "GS"] },
    m: { t: "Formula sheet final + Tier-A mix", specs: TIER_A },
    e: { t: "Rules one-pager final", specs: [["engbank", "sentence-improvement"], ["engbank", "spot-the-error"]] },
    g: { t: "Mixed PYQ recall", notes: "/mission/facts", specs: [["war", "static-gk"], ["war", "polity"], ["war", "geography"]] } },
  { day: 15, type: "A", fm: 9, rev: true,
    m: { t: "Revision: formula sheet + mistake-book top chapters", weak: true, specs: [] },
    e: { t: "Revision: rules one-pager", specs: [["engbank", "spot-the-error"]] },
    g: { t: "Fact log pass-1: Polity + Science", notes: "/mission/facts", specs: [["war", "polity"], ["war", "biology"], ["war", "chemistry"]] } },
  { day: 16, type: "A", fm: 10, rev: true, note: "AAKHRI full mock. Analysis sirf 45 min.",
    m: { t: "Revision: formula sheet", specs: TIER_A },
    e: { t: "Revision: rules + bookmarked vocab", specs: [["engbank", "sentence-improvement"]] },
    g: { t: "Fact log: History + Culture + Geography", notes: "/mission/facts", specs: [["war", "modern-history"], ["war", "static-gk"], ["war", "geography"]] } },
  { day: 17, type: "C", slot: { t: "GS + English sectional (halka — sirf confidence)", list: ["GS", "E"] } },
  { day: 18, type: "C", noMock: true },
];

export const planFor = (n) => DAYS.find((d) => d.day === n) || null;

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
// Mission shuru: tareekh + shift. Purana GS30 ka bacha hua data bhi yahin saaf
// (wo page hat chuka hai; storeRemove delete ko sync tak bhi pahunchata hai).
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

// -------------------------------------------------------------- analysis ---
export const ERR_TYPES = [
  { k: "W1", t: "Concept nahi aata", tip: "Chapter Tier A/B mein hai to 30 min ka slot; skip list mein hai to chhodo." },
  { k: "W2", t: "Silly / calculation", tip: "Calc drill badhao, option se cross-check." },
  { k: "W3", t: "Galat padha", tip: "Question ka aakhri line do baar padho (NOT / except / ratio ulta)." },
  { k: "W4", t: "Tukka galat", tip: "Rule: 1 option bhi nahi kata to chhodo." },
  { k: "S1", t: "Chhoda — par ≤60 sec mein ban jata", tip: "Sabse mehnga: Round-1 mein pakadna seekho." },
  { k: "S2", t: "Sahi chhoda (hard)", tip: "Theek kiya. Skip list mein daalo." },
  { k: "T1", t: "90 sec+ laga", tip: "Iska fast method likho; agli baar 60 sec pe chhodo." },
];
export const ANALYSIS_STEPS = [
  "Marks /mock-marks mein daale (section-wise C/W/total/time + rank)",
  "Har galat/chhoda Q ko type diya (W1–W4 / S1 / S2 / T1)",
  "Bina timer dobara solve: pehle S1 → W2 → W3 → W1 (maths ka FAST method likha)",
  "GS/English ka har galat fact/rule → Fact log mein 1 line",
  "Time audit: Maths mein 9 min tak kitne? kis Q pe 90 sec+?",
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
// Home par dikhne wale action items — pichhle 2 din ke analysis se.
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
// Aaj mission ka kaunsa din hai (0 = abhi shuru nahi, 19+ = khatam/exam).
// dayKey() app ka apna din hai (settings wale day-end par palatta hai).
export function currentDayNum(m = getMission()) {
  if (!m.startDate) return 0;
  const d = daysBetween(m.startDate, dayKey());
  return d == null ? 0 : d + 1;
}

// ------------------------------------------------------------- the clock ---
export const toMin = (hm) => { const [h, mm] = String(hm).split(":").map(Number); return h * 60 + (mm || 0); };
export const toHM = (min) => `${String(Math.floor(min / 60) % 24).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

// Padhai ki teen khidkiyan (user ka routine).
const WINDOWS = [[toMin("08:00"), toMin("10:00")], [toMin("11:00"), toMin("20:30")], [toMin("22:30"), toMin("23:30")]];
const LIFE = [
  { id: "wake", start: "05:15", end: "05:45", life: true, t: "Uthte hi 10–15 min: aaj ke due facts (phone par)", href: "/mission/facts", bonus: true },
  { id: "walk", start: "06:00", end: "07:30", life: true, t: "Walk 🚶 (CA ka video/audio sun sakte ho)" },
  { id: "ready", start: "07:30", end: "08:00", life: true, t: "Taiyaar ho jao — 8 baje baithna hai" },
  { id: "bath", start: "10:00", end: "11:00", life: true, t: "Nahana + nashta" },
  { id: "dinner", start: "20:30", end: "22:30", life: true, t: "Dinner / ghar" },
];

// ------------------------------------------------------------- the blocks ---
const B = (id, min, sec, t, extra = {}) => ({ id, min, sec, t, ...extra });

function weakMathSpecs(n = 2) {
  // Mistake-book ke sabse zyada galat chapter (skip list wale chhod ke). Chapter
  // tag cgl.qchapter mein hai; wahi slug sscmaths bank ke chapter ka bhi hai.
  const SKIP = new Set(["coordinate-geometry", "height-and-distance", "permutation-and-combination", "probability", "pipe-and-cistern", "boat-and-stream", "progression", "untagged"]);
  const fallback = [["sscmaths", "profit-and-loss"], ["sscmaths", "mensuration-2d"]];
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

// Ek din ke saare blocks (bina time ke) + kaunse pinned hain.
function blocksFor(day, m) {
  const p = planFor(day);
  if (!p) return { pinned: [], seq: [] };
  const adapt = m.adapt || {};
  const diag = m.diag && m.diag.verdict;
  const vocab = VOCAB_ROT[(day - 1) % VOCAB_ROT.length];
  const ca = CA_MONTHS[day] || "CA log revise (jo likha hai wahi)";
  const rev = B("rev", 45, "rev", "Spaced revision (D-1, D-3, D-7 — neeche list)", { must: true, kind: "revision", href: "/mission/facts" });
  const warm = B("warm", 15, "maths", "10 min mental calc warm-up + paani", { must: true, href: "/calculation", hrefLabel: "🧮 Calculation" });

  // ---- Maths block (topic of day) — adapt/diagnosis yahan asar karte hain.
  let mathT = p.m ? p.m.t : "";
  let mathSpecs = p.m ? (p.m.weak ? weakMathSpecs() : p.m.specs) : [];
  if (p.m && p.m.weak) mathT = `${mathT}: ${weakMathLabel()}`;
  let mathHow = "20 min formula/method (Brahmastra notes) → 30 PYQ timed (45 sec cap) → 10 min review.";
  if (adapt.mathSprint && p.m && p.m.concept) {
    mathT = `1-liner sprints ×3 (Tier-A) — "${p.m.t}" hataya (checkpoint rule)`;
    mathSpecs = TIER_A;
    mathHow = "Checkpoint 1 par Maths attempt 19 se kam tha → concept topic ki jagah speed. Har sprint 15 Q / 9 min.";
  }
  if (diag === "speed") mathHow += " Verdict SPEED: 45-sec cap sakht, option-first (value daalo / approx / unit digit).";
  if (diag === "concept") mathHow += " Verdict CONCEPT: pehle 10 Q bina timer, fir baaki timed.";
  if (adapt.mathCare) mathHow += " Accuracy <80%: har Q pe 5 sec zyada padhne mein do, option se cross-check.";

  const mathMin = p.type === "B" ? 110 : 90;
  const math = p.m && B("math", mathMin, "maths", `Maths: ${mathT}`, {
    must: true, how: mathHow + (p.type === "B" ? " Build day: aakhir mein 15-Q sprint #2." : ""),
    auto: mathSpecs.length ? { n: p.type === "B" ? 40 : 30, specs: mathSpecs } : null,
    href: "/notes/brahmastra", hrefLabel: "📐 Formulas",
  });

  // ---- GS static
  let gsT = p.g ? `GS: ${p.g.t}` : "";
  let gsHow = "45 min sirf high-yield notes → 45 min, isi topic ke 50 PYQ. Har galat/unsure → Fact log mein 1 line (cluster ke saath).";
  let gsAuto = p.g ? { n: 50, specs: p.g.specs } : null;
  if (adapt.gsPyqOnly && p.g) {
    gsT = `GS PYQ only: ${p.g.t}`;
    gsHow = "Checkpoint rule: static reading band. Sirf PYQ solve + fact log.";
    gsAuto = { n: 75, specs: [...p.g.specs, ["war", "static-gk"], ["war", "polity"]] };
  }
  const gs = p.g && B("gs", 90, "gs", gsT, { must: true, how: gsHow, auto: gsAuto, href: p.g.notes, hrefLabel: p.g.notes && p.g.notes.startsWith("/notes") ? "📔 Notes" : "🧠 Fact log" });

  const eng = p.e && B("eng", 45, "english", `English rule: ${p.e.t}`, {
    must: true,
    how: "Rule padho (10 min) → 25 Q. Checklist: SVA → tense → article → preposition → pronoun → comparison → parallelism → redundancy." +
      (adapt.engNoBlind ? " Checkpoint rule: 1 bhi option nahi kata to CHHODO." : ""),
    auto: { n: adapt.engNoBlind ? 30 : 25, specs: p.e.specs }, href: "/notes/goldenrules", hrefLabel: "🏅 Rules",
  });
  const voc = B("vocab", 45, "english", `PYQ vocab: ${vocab[1]}`, {
    must: true, how: "40 PYQ words ka quiz + /vocab ka aaj ka batch. Naya/bhoola word → bookmark.",
    auto: { n: 40, specs: [["engbank", vocab[0]]] }, href: "/vocab", hrefLabel: "🔤 Vocab",
  });
  const gsSpecs = [["war", "polity"], ["war", "static-gk"], ["war", "geography"], ["war", "biology"], ["war", "modern-history"], ["war", "economics"]];
  const gspyq = B("gspyq", adapt.gsAccept ? 30 : 60, "gs", adapt.gsAccept ? "GS PYQ: 1 shift (25 Q) + fact log" : "GS PYQ: 25 Q shift + fact log (2nd shift bonus)", {
    must: true, how: "10 min solve → 20 min review. Har galat/unsure fact → Fact log.",
    auto: { n: 25, specs: gsSpecs }, href: "/mission/facts", hrefLabel: "🧠 Fact log",
  });
  const extraMath = adapt.gsAccept && B("xmath", 30, "maths", "Maths sprint (GS ka time — checkpoint rule)", { must: true, auto: { n: 15, specs: TIER_A, secs: 36 } });
  const caB = B("ca", 30, "gs", `Current affairs: ${ca}`, {
    must: true, how: "Latest pehle. Sports, awards, appointments, schemes, summits, reports.",
    auto: { n: 20, specs: [["war", "current-affairs"]] }, href: "/current-affairs?tab=monthly", hrefLabel: "📰 CA",
  });
  const speed = B("speed", adapt.mathSprint ? 50 : 30, "maths", "Maths SPEED drill: 15 min calc + 1-liner sprint (15 Q / 9 min)", {
    must: true, how: "Squares 1–30, cubes 1–15, fraction ↔ %. Sprint mein kisi Q pe 60 sec se zyada nahi." + (adapt.mathSprint ? " (+20 min — checkpoint rule)" : ""),
    auto: { n: 15, specs: TIER_A, secs: 36 }, href: "/calculation", hrefLabel: "🧮 Calc drill",
  });
  const err = B("err", 45, "maths", "Mistake-book 15 Q → \"done\" + slow list", { bonus: true, href: "/answers?subject=math", hrefLabel: "📖 Mistakes", href2: "/slow", href2Label: "⏱️ Slow" });
  const night = B("night", 45, "rev", "Night recall: aaj ke facts + vocab + aaj ki maths galtiyan (D+0)", { must: true, late: true, href: "/mission/facts", hrefLabel: "🧠 Fact log" });
  const next = B("next", 15, "rev", "Kal ka din dekh lo (mock kaunsa, topic kya)", { bonus: true, late: true, href: `/mission/plan?day=${day + 1}`, hrefLabel: "📅 Kal" });
  const brk = (i) => B("brk" + i, 15, "break", "Break", { brk: true });

  if (p.type === "A") {
    const mock = B("mock", 60, "mock", `FULL MOCK ${p.fm}/10`, {
      must: true, kind: "mock", how: `${FULL_PAPER}. Phone bahar, koi pause nahi.${p.note ? " " + p.note : ""}`,
      href: "/mock-marks?cat=full", hrefLabel: "📊 Marks daalo",
    });
    const ana = B("ana", p.fm === 10 ? 45 : 60, "mock", "Mock analysis — 6 step", { must: true, href: "/mission/analysis", hrefLabel: "🔍 Analysis" });
    return {
      pinned: [warm, mock, ana],
      seq: [rev, math, gs, brk(1), eng, voc, brk(2), gspyq, extraMath, caB, speed, err, night, next].filter(Boolean),
    };
  }
  if (p.type === "B") {
    const list = p.slot.list.filter((x) => x !== "DIAG");
    const sect = B("mock", 60, "mock", `Sectional hour: ${p.slot.t}`, {
      must: true, kind: "sectional", sects: p.slot.list,
      how: (p.slot.list.includes("DIAG") ? "Pehle Maths self-test (45 min) — /mission/diagnose. Fir " : "") +
        list.map((x) => SECT[x]).join(" · ") + ". Har ek 15 min, lock ke saath.",
      href: p.slot.list.includes("DIAG") ? "/mission/diagnose" : "/mock-marks?cat=maths",
      hrefLabel: p.slot.list.includes("DIAG") ? "🩺 Self-test" : "📊 Marks daalo",
    });
    const ana = B("ana", 40, "mock", "Sectional analysis (har ek 10–15 min)", { must: true, href: "/mission/analysis", hrefLabel: "🔍 Analysis" });
    return {
      pinned: [warm, sect, ana],
      seq: [rev, math, gs, brk(1), eng, voc, brk(2), gspyq, extraMath, caB, speed, err, night, next].filter(Boolean),
    };
  }
  // ---- Type C: taper
  if (!p.noMock) {
    const sect = B("mock", 30, "mock", `Halka sectional: ${p.slot.t}`, { must: true, kind: "sectional", sects: p.slot.list, how: "Sirf confidence ke liye — score ki chinta nahi.", href: "/mock-marks?cat=gk", hrefLabel: "📊 Marks daalo" });
    return {
      pinned: [warm, sect],
      seq: [
        rev,
        B("formula", 60, "maths", "Formula sheet + Maths mistake-book (sirf padhna)", { must: true, href: "/notes/brahmastra", hrefLabel: "📐 Formulas" }),
        B("rules", 45, "english", "Grammar rules one-pager + bookmarked vocab", { must: true, href: "/vocab/bookmarks", hrefLabel: "🔖 Bookmarks" }),
        B("facts", 60, "gs", "Fact log pass-2 (poora)", { must: true, href: "/mission/facts", hrefLabel: "🧠 Fact log" }),
        B("calog", 45, "gs", "CA log revise", { must: true, href: "/current-affairs?tab=monthly", hrefLabel: "📰 CA" }),
        B("admit", 30, "life", "Admit card print + centre ka route / time check", { must: true, href: "/mission/exam", hrefLabel: "🎯 Exam rules" }),
        B("night", 30, "rev", "Halki night recall (sirf fact log)", { must: true, late: true, href: "/mission/facts", hrefLabel: "🧠 Fact log" }),
      ],
    };
  }
  return {
    pinned: [],
    seq: [
      B("facts", 60, "gs", "Fact log skim (GS + CA)", { must: true, href: "/mission/facts", hrefLabel: "🧠 Fact log" }),
      B("formula", 30, "maths", "Formula sheet 30 min", { must: true, href: "/notes/brahmastra", hrefLabel: "📐 Formulas" }),
      B("calc", 15, "maths", "10 min calc drill — haath garam", { must: true, href: "/calculation", hrefLabel: "🧮 Calc" }),
      B("vocabbm", 30, "english", "Bookmarked vocab skim", { must: true, href: "/vocab/bookmarks", hrefLabel: "🔖 Bookmarks" }),
      B("bag", 15, "life", "Bag: admit card + photo ID + jo admit card mein likha ho", { must: true, href: "/mission/exam", hrefLabel: "🎯 Exam rules" }),
    ],
  };
}

// Blocks ko user ki khidkiyon mein bithana. Pinned (warm-up → mock → analysis)
// shift ke time par; lunch 13:30 par (mock se takraye to mock ke baad); baaki
// kram se jo pehla khaali jagah mein samaye. `late` wale sirf raat ki khidki mein.
export function buildTimeline(day, m = getMission()) {
  const p = planFor(day);
  if (!p) return [];
  const { pinned, seq } = blocksFor(day, m);
  const shift = toMin(m.shift || "09:00");
  const busy = []; // [start, end]
  const placed = [];
  const place = (b, start) => { placed.push({ ...b, s: start, e: start + b.min }); busy.push([start, start + b.min]); };
  const free = (s, e) => busy.every(([a, b]) => e <= a || s >= b);
  const inWin = (s, e) => WINDOWS.some(([a, b]) => s >= a && e <= b);

  // Pinned: warm-up shift se theek pehle, mock shift par, analysis pehle khaali study slot mein.
  const warm = pinned.find((b) => b.id === "warm");
  const mock = pinned.find((b) => b.id === "mock");
  const ana = pinned.find((b) => b.id === "ana");
  if (mock) {
    place(mock, shift);
    if (warm) place(warm, shift - warm.min);
  }
  // Lunch — 13:30, par mock se takraye to mock ke baad.
  let lunchAt = toMin("13:30");
  if (!free(lunchAt, lunchAt + 45)) lunchAt = mock ? shift + mock.min : lunchAt;
  const lunch = { id: "lunch", min: 45, sec: "life", t: "Lunch", life: true };
  place(lunch, lunchAt);
  if (ana && mock) {
    let t = shift + mock.min;
    for (let guard = 0; guard < 200; guard++) {
      if (inWin(t, t + ana.min) && free(t, t + ana.min)) { place(ana, t); break; }
      t += 15;
    }
  }

  // Khaali jagah (khidkiyon mein, busy ke bahar), time ke kram mein.
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
  const skipped = [];
  for (let guard = 0; guard < 60 && left.length; guard++) {
    const g = gaps().find(([s, e]) => e - s >= 15 && left.some((b) => fits(b, s, e)));
    if (!g) break;
    const [s, e] = g;
    const i = left.findIndex((b) => fits(b, s, e));
    const b = left.splice(i, 1)[0];
    place(b, s);
  }
  function fits(b, s, e) {
    const isLate = s >= late[0];
    if (!!b.late !== isLate) return false;
    if (b.brk) {
      // Break sirf ek ghante+ ke kaam ke theek baad, aur tab jab uske baad bhi
      // kuch karne ki jagah bache — warna din ki shuruaat mein hi "break" aa jata.
      const prev = placed.find((x) => x.e === s && !x.life && !x.brk);
      if (!prev || prev.min < 60 || e - s - b.min < 30) return false;
    }
    return b.min <= e - s;
  }
  skipped.push(...left.filter((b) => !b.brk));

  const life = LIFE.map((b) => ({ ...b, s: toMin(b.start), e: toMin(b.end), min: toMin(b.end) - toMin(b.start) }));
  // Taper din: kaam jaldi khatam — baaki dopahar jaan-boojh kar khaali.
  if (p.type === "C") {
    const [ws, we] = WINDOWS[1];
    const lastEnd = Math.max(ws, ...busy.filter(([a, b]) => a >= ws && b <= we).map(([, b]) => b));
    if (lastEnd < we) life.push({ id: "rest", life: true, t: "Aaram — halka ghoomna. Koi naya topic NAHI, koi mock NAHI.", s: lastEnd, e: we, min: we - lastEnd });
  }
  const sleepAt = p.noMock ? toMin("22:30") : toMin("23:30");
  const sleep = { id: "sleep", life: true, t: p.noMock ? "Jaldi so jao — kal exam hai. 5:15 par fresh uthna." : "Sona 😴", s: sleepAt, e: sleepAt + 1, min: 1 };
  const all = [...life, ...placed, sleep].sort((a, b) => a.s - b.s);
  const out = all.map((b) => ({ ...b, start: toHM(b.s), end: toHM(b.e) }));
  out.skipped = skipped;
  return out;
}

// Tick hone wale blocks (life/break nahi).
export const tickable = (b) => !b.life && !b.brk;

export function dayStats(day, done = getDone(), m = getMission()) {
  const tl = buildTimeline(day, m).filter(tickable);
  const d = done[day] || {};
  const must = tl.filter((b) => b.must);
  return {
    mustTotal: must.length,
    mustDone: must.filter((b) => d[b.id]).length,
    total: tl.length,
    doneCount: tl.filter((b) => d[b.id]).length,
    mustMin: must.reduce((a, b) => a + b.min, 0),
  };
}
export function mustComplete(day, done = getDone(), m = getMission()) {
  const s = dayStats(day, done, m);
  return s.mustTotal > 0 && s.mustDone >= s.mustTotal;
}
export function streak(done = getDone(), m = getMission()) {
  const cur = Math.min(currentDayNum(m), TOTAL_DAYS);
  if (cur < 1) return 0;
  let s = mustComplete(cur, done, m) ? 1 : 0;
  for (let i = cur - 1; i >= 1; i--) { if (mustComplete(i, done, m)) s++; else break; }
  return s;
}

// Abhi kaunsa block chal raha hai, aur agla kaunsa.
export function nowBlock(timeline, now = new Date()) {
  const t = now.getHours() * 60 + now.getMinutes();
  const cur = timeline.find((b) => b.s <= t && t < b.e) || null;
  const next = timeline.find((b) => b.s > t && b.id !== "sleep") || null;
  return { cur, next, t };
}

// ------------------------------------------------------------- revision ---
// Jo Day X ko padha → X+1, X+3, X+7, X+14 ko dobara. Final 2 din: sab skim.
export const REV_GAPS = [1, 3, 7, 14];
export function topicsOf(day) {
  const p = planFor(day);
  if (!p) return [];
  const out = [];
  if (p.m) out.push({ sec: "maths", t: p.m.weak ? p.m.t : p.m.t });
  if (p.e) out.push({ sec: "english", t: p.e.t });
  if (p.g) out.push({ sec: "gs", t: p.g.t });
  if (CA_MONTHS[day]) out.push({ sec: "ca", t: "CA " + CA_MONTHS[day] });
  return out;
}
export function revisionFor(day) {
  if (day >= 17) return [{ gap: "final", day: null, items: [{ sec: "gs", t: "Poora fact log + CA log + formula sheet + rules one-pager" }] }];
  const out = [];
  for (const g of REV_GAPS) {
    const d = day - g;
    if (d >= 1) out.push({ gap: g, day: d, items: topicsOf(d) });
  }
  return out;
}

// ----------------------------------------------------------- checkpoints ---
// Hafte-wise targets (Appendix §11). "Abhi" = mission se pehle ke mocks.
export const SECTIONS = [
  { k: "R", label: "Reasoning", icon: "🧠", re: /reason|intelligence/i, cat: "reasoning" },
  { k: "GS", label: "GS", icon: "🌍", re: /general awareness|\bgs\b|\bgk\b/i, cat: "gk" },
  { k: "Q", label: "Maths", icon: "🧮", re: /quant|math/i, cat: "maths" },
  { k: "E", label: "English", icon: "📘", re: /english/i, cat: "english" },
];
export const TARGETS = {
  cp1: { label: "19 Sep (D7)", upto: 7, R: { score: 43, att: 24 }, Q: { score: 33, att: 19 }, E: { score: 37, wrongMax: 4 }, GS: { score: 20, att: 20 }, full: 130 },
  cp2: { label: "26 Sep (D14)", upto: 14, R: { score: 44, att: 24 }, Q: { score: 36, att: 21 }, E: { score: 39, wrongMax: 3 }, GS: { score: 25, att: 22 }, full: 145 },
  exam: { label: "Exam (1 Oct)", upto: 18, R: { score: 45, att: 24 }, Q: { score: 39, att: 22 }, E: { score: 41, wrongMax: 2 }, GS: { score: 30, att: 22 }, full: 155 },
};

const secScore = (s) => n0(s.correct) * 2 - n0(s.wrong) * 0.5;
function n0(v) { const n = Number(v); return Number.isFinite(n) && n >= 0 ? n : 0; }

// Ek date-range ke mocks se har section ka avg (full mock ke section + us subject ke sectionals).
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
      fulls.push({ date: m.date, score: tot });
    } else {
      // Naam pehle: ek record "English …" naam ke saath GS mein save hua pada hai
      // — bucket galat ho to bhi naam sach bolta hai.
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
  out.full = fulls.length ? { n: fulls.length, score: fulls.reduce((x, f) => x + f.score, 0) / fulls.length, list: fulls } : { n: 0, list: [] };
  return out;
  function push(a, s, m) {
    const c = n0(s.correct), w = n0(s.wrong);
    a.n++; a.score += secScore(s); a.att += c + w; a.wrong += w; a.correct += c;
    a.list.push({ date: m.date, name: m.name, c, w, total: n0(s.total), score: secScore(s) });
  }
}

export function checkpointWindows(m = getMission()) {
  const st = m.startDate || DEFAULT_START;
  return {
    before: { label: "Mission se pehle", from: null, to: addDays(st, -1) },
    w1: { label: "Hafta 1 (D1–D7)", from: st, to: addDays(st, 6), cp: "cp1" },
    w2: { label: "Hafta 2 (D8–D14)", from: addDays(st, 7), to: addDays(st, 13), cp: "cp2" },
    w3: { label: "Aakhri (D15–D18)", from: addDays(st, 14), to: addDays(st, 17), cp: "exam" },
  };
}

// Kaunse "agar nahi badha to" rule lagu ho rahe hain.
export const RULES = {
  mathSprint: { title: "Maths attempt 19 se kam → SPEED mode", detail: "D8–D11 ke concept topics (Mensuration, Geometry, DI) hatake unki jagah 1-liner sprints. Speed drill +20 min. Round-1 ka 60-sec cap sakhti se.", adapt: true },
  mathCare: { title: "Maths attempt badhe par accuracy 80% se kam", detail: "Har Q pe 5 sec zyada padhne mein do, option se cross-check. W2 (silly) galtiyan → calc drill.", adapt: true },
  gsPyqOnly: { title: "GS 20 se kam (Checkpoint 1)", detail: "Static reading band — GS block mein sirf PYQ solve + fact log.", adapt: true },
  gsAccept: { title: "GS 25 se kam (Checkpoint 2)", detail: "GS 22–25 accept. GS PYQ ka aadha time Maths sprint ko (zyada pakke marks). Tukka sirf 50-50 par.", adapt: true },
  engNoBlind: { title: "English mein har mock 5+ galat", detail: "Blind / zero-elimination marking band — 1 bhi option nahi kata to chhodo. Roz 30 error Q.", adapt: true },
  reasoningDaily: { title: "Reasoning 2 baar 40 se kam", detail: "Roz 1 reasoning sectional (15 min) — bas, isse zyada nahi.", adapt: false },
  fatigue: { title: "Full mock ka total sectionals ke jod se 10+ kam", detail: "Thakaan / order ki dikkat: exact exam time par mock, 0 break, sections ke beech 10 sec saans.", adapt: false },
};

export function evaluateCheckpoints(mocks, m = getMission()) {
  const W = checkpointWindows(m);
  const stats = {};
  for (const [k, w] of Object.entries(W)) stats[k] = sectionStatsIn(mocks, w.from, w.to);
  const day = currentDayNum(m);
  // Hafta abhi chal raha ho to bhi dikhao ("live"), par rule tabhi jab checkpoint din aa jaye.
  const cur = day <= 7 ? "w1" : day <= 14 ? "w2" : "w3";
  const triggered = [];
  const s1 = stats.w1, s2 = stats.w2, sNow = stats[cur];
  const cpReached1 = day >= 7, cpReached2 = day >= 14;
  if (cpReached1 && s1.Q.n && s1.Q.att < TARGETS.cp1.Q.att) triggered.push("mathSprint");
  if (sNow.Q.n >= 2 && sNow.Q.att >= 19 && sNow.Q.acc != null && sNow.Q.acc < 80) triggered.push("mathCare");
  if (cpReached1 && s1.GS.n && s1.GS.score < TARGETS.cp1.GS.score) triggered.push("gsPyqOnly");
  if (cpReached2 && s2.GS.n && s2.GS.score < TARGETS.cp2.GS.score) triggered.push("gsAccept");
  if (sNow.E.n >= 2 && sNow.E.wrong >= 5) triggered.push("engNoBlind");
  if (sNow.R.list.filter((x) => x.score < 40).length >= 2) triggered.push("reasoningDaily");
  if (sNow.full.n) {
    // Full mock ka total vs sirf-sectionals ke avg ka jod (isi hafte).
    const sect = sectionStatsIn((mocks || []).filter((x) => (x.cat || "full") !== "full"), W[cur].from, W[cur].to);
    if (["R", "GS", "Q", "E"].every((k) => sect[k].n)) {
      const secSum = ["R", "GS", "Q", "E"].reduce((a, k) => a + sect[k].score, 0);
      if (sNow.full.score < secSum - 10) triggered.push("fatigue");
    }
  }
  return { stats, windows: W, current: cur, day, triggered };
}

// Home ke liye: jo rule lage hain par abhi tak "lagaye" nahi gaye.
export function pendingRules(mocks, m = getMission()) {
  const ev = evaluateCheckpoints(mocks, m);
  return ev.triggered.filter((id) => RULES[id].adapt && !(m.adapt || {})[id]);
}
