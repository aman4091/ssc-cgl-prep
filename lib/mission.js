// 🚀 CGL Mission — aaj se exam tak. Poora plan ek jagah.
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
// LAMBAI EXAM DATE SE: exam window 30 Sep – 30 Oct hai aur pakki tareekh admit
// card se aayegi. Isliye din ek fixed list nahi:
//   CORE (D1–D14, jaisa bana)  +  EXTENSION (exam der se ho to beech mein)
//   +  FINAL 4 (2 full mock + 2 taper, hamesha exam se theek pehle).
// Taper tabhi lagta hai jab date CONFIRM ho — bina confirm ke wo build din
// rehta hai (plan ke beech taper = momentum khatam).
//
// TARGET do level par: FLOOR (plan ka base, exam hall mein yahi le ke jaana)
// aur STRETCH (paper aasan ho to apne aap). Checkpoint floor ki taraf naapte hain.
//
// Din ka dhaancha user ka apna routine hai (khud bataya): 05:15 uthna, 06:00–07:30
// walk, padhai 08:00–10:00, 10–11 nahana-nashta, padhai 11:00–20:30, dinner
// 20:30–22:30, padhai 22:30–23:30. Blocks inhi teen khidkiyon mein bharte hain
// (buildTimeline). Mock hamesha EXAM SHIFT ke time par — default 09:00.
//
// Kal ka kaam chhoot gaya to PEECHE MAT JAO — koi backlog nahi banta. Pichhle do
// plan (RBE 50-din, GS30) isi se mare the.

import { storeGet, storeSet, storeRemove } from "./bigstore";
import { dayKey } from "./daytime";

// ------------------------------------------------------------------ keys ---
const KEY = "cgl.mission";
const DONE_KEY = "cgl.mission.done";
const ANALYSIS_KEY = "cgl.mission.analysis";
const METRIC_KEY = "cgl.mission.metric";
const EXAM_KEY = "cgl.examDate"; // lib/daily ka hi key — ek hi exam date poori site mein

export const DEFAULT_START = "2026-09-13";
export const DEFAULT_EXAM = "2026-10-01";
export const SHIFTS = [
  { v: "09:00", label: "Subah 9:00 (Shift 1)" },
  { v: "12:30", label: "Dopahar 12:30 (Shift 2)" },
  { v: "16:00", label: "Shaam 4:00 (Shift 3)" },
];

// ---------------------------------------------------------------- targets ---
// FLOOR = plan ka base (current accuracy par realistic). STRETCH = ceiling.
export const FLOOR = { R: 41, GS: 28, Q: 34, E: 38, total: 141 };
export const STRETCH = { R: 45, GS: 32, Q: 39, E: 41, total: 157 };
export const FLOOR_NOTE = {
  R: "23 attempt, ~91% (full mock mein 31.5 aaya tha — 45 best-ever hai, target nahi)",
  GS: "22 attempt, ~73%",
  Q: "20–21 attempt, ~86% (attempt badhne par accuracy pehle girti hai)",
  E: "23 attempt, ≤3 galat",
};

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

// D1–D14. Full mock: D2, D4, D6, D8, D11, D13 (+ FINAL ke 2 = 8). D9 aur D12
// pehle mock the — GS bharna hai, naapna nahi, isliye ab build din.
const CORE = [
  { type: "B", slot: { t: "Maths self-test + GS BASELINE sectional (pehla asli GS)", list: ["DIAG", "GS"] }, ca: "Sep 2026",
    m: { t: "Profit & Loss + Discount (MP : CP ratio method)", specs: [["sscmaths", "profit-and-loss"], ["sscmaths", "discount"], ["sscmaths", "percentage"]] },
    e: { t: "Subject–Verb Agreement", specs: [["errorpro", "subject-verb-agreement"]] },
    g: { t: "Polity-1: Articles, Parts, Schedules, Sources", notes: "/notes/parmar-polity", specs: [["gk", "polity"], ["war", "polity"]] } },
  { type: "A", note: "Baseline — jo aaye wahi sahi. Is number se hi aage ka hisaab banega.", ca: "Aug 2026",
    m: { t: "Simplification + Number System (1-liners)", specs: [["sscmaths", "simplification-and-approximation"], ["sscmaths", "number-system"]] },
    e: { t: "Tenses + Conditionals", specs: [["errorpro", "tense"], ["errorpro", "conditionals"]] },
    g: { t: "Polity-2: FR / DPSP / FD, Amendments, Bodies", notes: "/notes/parmar-polity", specs: [["war", "polity"], ["gk", "polity"]] } },
  { type: "B", slot: { t: "Maths + GS + Reasoning sectional", list: ["Q", "GS", "R"] }, ca: "Aug 2026",
    m: { t: "Ratio, Partnership, Average", specs: [["sscmaths", "ratio-and-proportion"], ["sscmaths", "partnership"], ["sscmaths", "average"]] },
    e: { t: "Articles + Nouns", specs: [["errorpro", "article"], ["errorpro", "noun"]] },
    g: { t: "Biology: human body, vitamins, diseases, cell", notes: "/notes/parmar-biology", specs: [["war", "biology"]] } },
  { type: "A", ca: "Jul 2026",
    m: { t: "SI / CI + Mixture & Alligation", specs: [["sscmaths", "simple-interest-si"], ["sscmaths", "compound-interest-ci"], ["sscmaths", "mixture-and-alligation"]] },
    e: { t: "Pronoun + Degree of comparison", specs: [["errorpro", "pronoun"], ["errorpro", "adjective"]] },
    g: { t: "Chemistry: common names, pH, metals, everyday chemistry", notes: "/notes/parmar-chemistry", specs: [["war", "chemistry"]] } },
  { type: "B", slot: { t: "Maths + GS + English sectional", list: ["Q", "GS", "E"] }, ca: "Jul 2026",
    m: { t: "Algebra identities (a+1/a, a³±b³, value-put trick)", specs: [["sscmaths", "algebra"]] },
    e: { t: "Prepositions + Conjunctions (no sooner–than, lest–should)", specs: [["errorpro", "preposition"], ["errorpro", "conjunction"]] },
    g: { t: "Physics facts: units, instruments, inventions", notes: "/notes/parmar-physics", specs: [["war", "physics"]] } },
  { type: "A", ca: "Jun 2026",
    m: { t: "Trigonometry (values, identities, θ=45° put, max/min)", specs: [["sscmaths", "trigonometry"]] },
    e: { t: "Parallelism + Redundancy + Adverbs", specs: [["errorpro", "superfluous"], ["errorpro", "adverb-inversion"]] },
    g: { t: "Modern History: 1857 → 1947, Congress sessions, GG/Viceroys", notes: "/notes/parmar-history", specs: [["war", "modern-history"]] } },
  { type: "B", checkpoint: 1, slot: { t: "Maths + GS + Reasoning sectional → Checkpoint 1", list: ["Q", "GS", "R"] }, ca: "Jun 2026",
    m: { t: "Time & Work + TSD (+ trains)", specs: [["sscmaths", "time-and-work"], ["sscmaths", "time-speed-and-distance"], ["sscmaths", "problems-on-trains"]] },
    e: { t: "Voice + Narration (sirf basic tense change)", specs: [["errorpro", "voice"], ["errorpro", "narration"]] },
    g: { t: "Art & Culture: dance → state, instruments → artists, festivals", notes: "/notes/parmar-static", specs: [["war", "static-gk"]] } },
  { type: "A", ca: "May 2026",
    m: { t: "Mensuration 2D (formula sheet)", specs: [["sscmaths", "mensuration-2d"]], concept: true },
    e: { t: "Sentence improvement drill", specs: [["engbank", "sentence-improvement"]] },
    g: { t: "Indian Geography: rivers, dams, NP, passes, soils, crops", notes: "/notes/parmar-geography", specs: [["war", "geography"]] } },
  { type: "B", slot: { t: "Maths + GS sectional", list: ["Q", "GS"] }, ca: "May 2026",
    m: { t: "Mixed 1-liner sprints ×3 + Mensuration-3D ke 6 formula (sirf 40 min)", specs: [...TIER_A, ["sscmaths", "mensuration-3d"]],
      howX: "3D: cube, cuboid, cylinder, cone, sphere, hemisphere — V + CSA/TSA. 40 min, 20 direct-substitution Q, aage badho. Baaki time sprints." },
    e: { t: "Cloze test method", specs: [["engbank", "cloze-test"]] },
    g: { t: "Ancient + Medieval (sirf PYQ wale)", notes: "/notes/parmar-history", specs: [["war", "ancient-history"], ["war", "mediaeval-history"], ["gk", "ancient-history"]] } },
  { type: "B", slot: { t: "Maths + GS + English sectional", list: ["Q", "GS", "E"] }, ca: "Apr 2026",
    m: { t: "Geometry sirf 70 min (4 circle theorem + centres + BPT) → DI + sprint", specs: [["sscmaths", "geometry"], ["sscmaths", "data-interpretation-di"]], concept: true,
      howX: "Geometry: circle ke 4 theorem, triangle centres ke angle/ratio, BPT/similarity. Bas — formula sheet mein daalo, 20 direct Q. Bacha time DI + 1-liner sprint." },
    e: { t: "RC method + Para-jumble", specs: [["engbank", "comprehension"], ["engbank", "parajumble"]] },
    g: { t: "Economy + Census 2011", notes: "/notes/parmar-economy", specs: [["war", "economics"]] } },
  { type: "A", ca: "Apr 2026",
    m: { t: "DI sets + Mean/Median/Mode basic", specs: [["mathbank", "data-interpretation"], ["mathbank", "mean-median-mode"]], concept: true },
    e: { t: "Mixed error set", specs: [["engbank", "spot-the-error"], ["errorpro", "subject-verb-agreement"]] },
    g: { t: "Static GK: sports, awards, books, days, HQ", notes: "/notes/parmar-static", specs: [["war", "static-gk"]] } },
  { type: "B", slot: { t: "Maths + GS sectional", list: ["Q", "GS"] }, ca: "Mar 2026",
    m: { t: "Mistake-book ke 2 sabse kamzor chapter", weak: true, specs: [] },
    e: { t: "Error log ke weak rules", specs: [["engbank", "spot-the-error"], ["engbank", "sentence-improvement"]] },
    g: { t: "Polity + Science PYQ revision (polity mein 21 galtiyan — sabse zyada wahi aata hai)", notes: "/notes/parmar-polity", specs: [["war", "polity"], ["gk", "polity"], ["war", "biology"], ["war", "chemistry"], ["war", "physics"]] } },
  { type: "B", slot: { t: "Maths + GS sectional", list: ["Q", "GS"] }, ca: "Mar 2026",
    m: { t: "Mixed 1-liner sprints (Tier-A)", specs: TIER_A },
    e: { t: "Mixed (error + improvement + FIB)", specs: [["engbank", "spot-the-error"], ["engbank", "fill-in-the-blanks"]] },
    g: { t: "Sabse kamzor GS topic (fact log se) — AAKHRI naya topic", notes: "/mission/facts", specs: [["war", "polity"], ["war", "static-gk"], ["war", "biology"]] } },
  // Checkpoint 2 full mock ke saath — taaki aakhri do full mock lagatar na aayein
  // (lagatar 2 mock = doosre ka analysis aadha-adhoora).
  { type: "A", checkpoint: 2, note: "Checkpoint 2 — isi mock ke saath.", ca: "Jan–Feb 2026 (sirf sports, awards, appointments)",
    m: { t: "Formula sheet final + Tier-A mix", specs: TIER_A },
    e: { t: "Rules one-pager final", specs: [["engbank", "sentence-improvement"], ["engbank", "spot-the-error"]] },
    g: { t: "Mixed PYQ recall", notes: "/mission/facts", specs: [["war", "static-gk"], ["war", "polity"], ["war", "geography"]] } },
];

// Exam se theek pehle ke 4 din — exam jab bhi ho.
const FINAL = [
  { type: "B", rev: true, slot: { t: "Maths + GS sectional (revision)", list: ["Q", "GS"] }, ca: "CA log revise (jo likha hai wahi)",
    m: { t: "Revision: formula sheet + mistake-book top chapters", weak: true, specs: [] },
    e: { t: "Revision: rules one-pager", specs: [["engbank", "spot-the-error"]] },
    g: { t: "Fact log pass-1: Polity + Science", notes: "/mission/facts", specs: [["war", "polity"], ["war", "biology"], ["war", "chemistry"]] } },
  { type: "A", rev: true, last: true, note: "AAKHRI full mock. Analysis sirf 45 min.", ca: "CA log revise",
    m: { t: "Revision: formula sheet", specs: TIER_A },
    e: { t: "Revision: rules + bookmarked vocab", specs: [["engbank", "sentence-improvement"]] },
    g: { t: "Fact log: History + Culture + Geography", notes: "/mission/facts", specs: [["war", "modern-history"], ["war", "static-gk"], ["war", "geography"]] } },
  { type: "C", taper: 1, slot: { t: "GS + English sectional (halka — sirf confidence)", list: ["GS", "E"] } },
  { type: "C", taper: 2, noMock: true },
];

// Date confirm nahi → taper ki jagah ye build din.
const UNCONF_BUILD = {
  type: "B", unconfTaper: true, slot: { t: "Maths + GS sectional", list: ["Q", "GS"] }, ca: "CA: latest 2 hafte + log",
  m: { t: "Mixed 1-liner sprints (Tier-A)", specs: TIER_A },
  e: { t: "Mixed error + vocab", specs: [["engbank", "spot-the-error"], ["engbank", "sentence-improvement"]] },
  g: { t: "Fact log + GS PYQ mix", notes: "/mission/facts", specs: [["war", "polity"], ["war", "static-gk"], ["war", "geography"], ["war", "biology"]] },
};

// Exam der se ho to D14 ke baad ye din. Pehle PARTIAL wale chapter FULL
// (Mensuration-3D + Geometry mein 106 galtiyan — extra time mein ye +6-8 marks),
// GS ka doosra pass. Har 3rd din full mock.
const EXT_MATHS = [
  { t: "Mensuration 3D — FULL (combined solids, melting / recasting)", specs: [["sscmaths", "mensuration-3d"]] },
  { t: "Geometry — FULL (circles, tangents, polygons)", specs: [["sscmaths", "geometry"]] },
  { t: "Compound Interest — FULL (+ installments)", specs: [["sscmaths", "compound-interest-ci"], ["mathbank", "installment"]] },
  { t: "TSD — boats & streams + races", specs: [["sscmaths", "boat-and-stream"], ["mathbank", "linear-circular-race"], ["sscmaths", "time-speed-and-distance"]] },
  { t: "Algebra — FULL", specs: [["sscmaths", "algebra"]] },
  { t: "Height & Distance + Trigonometry", specs: [["sscmaths", "height-and-distance"], ["sscmaths", "trigonometry"]] },
  { t: "Pipes, LCM/HCF, Coordinate geometry basics", specs: [["sscmaths", "pipe-and-cistern"], ["sscmaths", "lcm-and-hcf"], ["sscmaths", "coordinate-geometry"]] },
  { t: "Mixed 1-liner sprints (Tier-A)", specs: TIER_A },
];
const EXT_GS = [
  { t: "Polity — PYQ pass-2", notes: "/notes/parmar-polity", specs: [["war", "polity"], ["gk", "polity"]] },
  { t: "Biology + Chemistry — PYQ pass-2", notes: "/notes/parmar-biology", specs: [["war", "biology"], ["war", "chemistry"]] },
  { t: "Modern + Ancient History — PYQ pass-2", notes: "/notes/parmar-history", specs: [["war", "modern-history"], ["war", "ancient-history"]] },
  { t: "Art & Culture + Static GK — pass-2", notes: "/notes/parmar-static", specs: [["war", "static-gk"]] },
  { t: "Geography + Economy — pass-2", notes: "/notes/parmar-geography", specs: [["war", "geography"], ["war", "economics"]] },
  { t: "Physics + Medieval — pass-2", notes: "/notes/parmar-physics", specs: [["war", "physics"], ["war", "mediaeval-history"]] },
];
const EXT_ENG = [
  { t: "Error spotting — mixed rules", specs: [["engbank", "spot-the-error"]] },
  { t: "Sentence improvement + FIB", specs: [["engbank", "sentence-improvement"], ["engbank", "fill-in-the-blanks"]] },
  { t: "Cloze + RC", specs: [["engbank", "cloze-test"], ["engbank", "comprehension"]] },
  { t: "Voice + Narration + Para-jumble", specs: [["errorpro", "voice"], ["errorpro", "narration"], ["engbank", "parajumble"]] },
];

function extDays(n, branch) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const tier2 = branch === "long" && i >= 10;
    out.push({
      type: i % 3 === 2 ? "A" : "B", ext: i + 1, tier2,
      slot: i % 3 === 2 ? null : { t: i % 2 ? "Maths + GS + English sectional" : "Maths + GS + Reasoning sectional", list: i % 2 ? ["Q", "GS", "E"] : ["Q", "GS", "R"] },
      ca: "CA: latest 2 hafte + log revise",
      m: EXT_MATHS[i % EXT_MATHS.length],
      e: EXT_ENG[i % EXT_ENG.length],
      g: EXT_GS[i % EXT_GS.length],
    });
  }
  return out;
}

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
    examConfirmed: !!v.examConfirmed,
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

// Exam date — lib/daily wala hi key (Home ka countdown bhi wahi padhta hai).
export function getExam() {
  if (typeof window === "undefined") return DEFAULT_EXAM;
  try { return localStorage.getItem(EXAM_KEY) || DEFAULT_EXAM; } catch { return DEFAULT_EXAM; }
}
export function setExam(iso, confirmed) {
  try { localStorage.setItem(EXAM_KEY, String(iso || DEFAULT_EXAM)); } catch { /* ignore */ }
  try { window.dispatchEvent(new CustomEvent("cgl:daily-changed")); } catch { /* SSR */ }
  return saveMission({ examConfirmed: !!confirmed });
}

// Exam kab hai uske hisaab se kaunsa raasta.
export function examBranch(exam = getExam()) {
  if (exam <= "2026-10-05") return { key: "ontime", t: "30 Sep – 5 Oct: plan jaisa hai waisa. Aakhri 4 din exam se theek pehle." };
  if (exam <= "2026-10-18") return { key: "ext", t: "6 – 18 Oct: D14 ke baad EXTENSION — PARTIAL chapter FULL (Mensuration-3D, Geometry, CI, boats, algebra), har 3rd din full mock. Taper sirf exam se 2 din pehle." };
  return { key: "long", t: "19 – 30 Oct: extension ke pehle 10 din saare PARTIAL chapter FULL, uske baad Tier-2 shuru (Tier-1 qualifying hai, rank Tier-2 se). Stretch 155 → 165. Har 3rd din full mock." };
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

// 🌙 Roz raat ka ek hi metric: Maths ka attempt count + GS ko chhua ya nahi.
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
// Aaj mission ka kaunsa din hai (0 = abhi shuru nahi, N+1 = exam ka din).
export function currentDayNum(m = getMission()) {
  if (!m.startDate) return 0;
  const d = daysBetween(m.startDate, dayKey());
  return d == null ? 0 : d + 1;
}

// ------------------------------------------------------------- day list ---
// Mission ke kitne din: start se exam ke ek din pehle tak.
export function missionLength(m = getMission()) {
  const n = daysBetween(m.startDate || DEFAULT_START, getExam());
  return Math.max(4, Number.isFinite(n) ? n : 18);
}
// Din kam pade (der se shuru / exam jaldi) to CORE ke ye din pehle hatte hain —
// sabse kam nuksaan wale pehle: D13 (mixed sprints), D10, D5, D3. Checkpoint
// wale din (D7, D14) aur baseline (D1, D2) kabhi nahi.
const DROP_ORDER = [12, 9, 4, 2];

export function getDays(m = getMission()) {
  const N = missionLength(m);
  let core = CORE.map((d, i) => ({ ...d, coreIdx: i }));
  let need = CORE.length - Math.max(0, N - FINAL.length);
  for (const idx of DROP_ORDER) { if (need <= 0) break; core = core.filter((d) => d.coreIdx !== idx); need--; }
  if (need > 0) core = core.slice(0, Math.max(0, core.length - need));
  const extN = Math.max(0, N - FINAL.length - CORE.length);
  const branch = examBranch().key;
  const list = [...core, ...extDays(extN, branch), ...FINAL]
    .map((d) => (d.taper && !m.examConfirmed ? { ...UNCONF_BUILD, taperWas: d.taper } : d))
    // Maths self-test ho chuka ho (verdict saved) to D1 ka slot seedha Maths sectional.
    .map((d) => (d.slot && d.slot.list.includes("DIAG") && m.diag && m.diag.verdict
      ? { ...d, slot: { t: "GS BASELINE sectional (pehla asli GS) + Maths sectional", list: ["GS", "Q"] } }
      : d));
  let fm = 0;
  return list.map((d, i) => {
    const x = { ...d, day: i + 1 };
    if (x.type === "A") x.fm = ++fm;
    return x;
  });
}
export function totalDays(m = getMission()) { return missionLength(m); }
export function totalMocks(m = getMission()) { return getDays(m).filter((d) => d.type === "A").length; }
export function planFor(n, m = getMission()) { return getDays(m).find((d) => d.day === n) || null; }

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

// Mistake-book 3–4 MB ki hai; plan grid har din ki timeline banata hai, to
// har baar parse na ho — ek minute ka cache.
let weakCache = { at: 0, v: null };
function weakMathSpecs(n = 2) {
  if (weakCache.v && Date.now() - weakCache.at < 60000) return weakCache.v;
  weakCache = { at: Date.now(), v: weakMathSpecsRaw(n) };
  return weakCache.v;
}
function weakMathSpecsRaw(n) {
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
  const p = planFor(day, m);
  if (!p) return { pinned: [], seq: [] };
  const adapt = m.adapt || {};
  const diag = m.diag && m.diag.verdict;
  const vocab = VOCAB_ROT[(day - 1) % VOCAB_ROT.length];
  const ca = p.ca || "CA log revise (jo likha hai wahi)";
  const rev = B("rev", 45, "rev", "Spaced revision (D-1, D-3, D-7 — neeche list)", { must: true, kind: "revision", href: "/mission/facts" });
  const warm = B("warm", 15, "maths", "10 min mental calc warm-up + paani", { must: true, href: "/calculation", hrefLabel: "🧮 Calculation" });

  // ---- Maths block (topic of day) — adapt/diagnosis yahan asar karte hain.
  let mathT = p.m ? p.m.t : "";
  let mathSpecs = p.m ? (p.m.weak ? weakMathSpecs() : p.m.specs) : [];
  if (p.m && p.m.weak) mathT = `${mathT}: ${weakMathLabel()}`;
  let mathHow = p.m && p.m.howX ? p.m.howX : "20 min formula/method (Brahmastra notes) → 30 PYQ timed (45 sec cap) → 10 min review.";
  if (adapt.mathSprint && p.m && p.m.concept) {
    mathT = `1-liner sprints ×3 (Tier-A) — "${p.m.t}" hataya (checkpoint rule)`;
    mathSpecs = TIER_A;
    mathHow = "Checkpoint 1 par Maths attempt 19 se kam tha → concept topic ki jagah speed. Har sprint 15 Q / 9 min.";
  }
  if (diag === "speed") mathHow += " Verdict SPEED: 45-sec cap sakht, option-first (value daalo / approx / unit digit).";
  if (diag === "concept") mathHow += " Verdict CONCEPT: pehle 10 Q bina timer, fir baaki timed.";
  if (adapt.mathCare) mathHow += " Accuracy <80%: har Q pe 5 sec zyada padhne mein do, option se cross-check.";
  mathHow += " YE BLOCK KABHI MAT KAATO — asli build yahi hai.";

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

  // English: pehle 6 din grammar-heavy (12 rules finite hain aur 60% galtiyan
  // wahin — ek baar seekhe to pakke), D7 se vocab-heavy (volume ka kaam).
  const grammarPhase = day <= 6 && !p.ext;
  const engMin = grammarPhase ? 60 : 30, vocMin = grammarPhase ? 30 : 60;
  const eng = p.e && B("eng", engMin, "english", `English rule: ${p.e.t}`, {
    must: true,
    how: (grammarPhase
      ? "Grammar phase (D1–D6): rule padho (15 min) → 35 Q. "
      : "Rules ho gaye — ab sirf weak rules + mixed set, 20 Q. ") +
      "Checklist: SVA → tense → article → preposition → pronoun → comparison → parallelism → redundancy." +
      (adapt.engNoBlind ? " Checkpoint rule: 1 bhi option nahi kata to CHHODO." : ""),
    auto: { n: grammarPhase ? 35 : 20, specs: p.e.specs }, href: "/notes/goldenrules", hrefLabel: "🏅 Rules",
  });
  const voc = B("vocab", vocMin, "english", `PYQ vocab: ${vocab[1]}`, {
    must: true, how: (grammarPhase ? "30 PYQ words" : "60 PYQ words (D7 se vocab volume)") + " + /vocab ka aaj ka batch. Naya/bhoola word → bookmark.",
    auto: { n: grammarPhase ? 30 : 60, specs: [["engbank", vocab[0]]] }, href: "/vocab", hrefLabel: "🔤 Vocab",
  });
  // Reasoning maintenance: series mein sabse zyada galtiyan (7) — roz 10 Q.
  const reas = B("reas", 10, "reasoning", "Reasoning maintain: 10 series Q (5–10 min)", {
    must: true, how: "Series mein tumhari sabse zyada reasoning galtiyan hain. Home ka Reasoning 15 Q/din target bhi mat chhodo.",
    auto: { n: 10, specs: [["reasonbank", "series"]] }, href: "/pyq/reasonbank", hrefLabel: "🧠 Reasoning bank",
  });
  const gsSpecs = [["war", "polity"], ["war", "static-gk"], ["war", "geography"], ["war", "biology"], ["war", "modern-history"], ["war", "economics"]];
  const gspyq = B("gspyq", adapt.gsAccept ? 30 : 60, "gs", adapt.gsAccept ? "GS PYQ: 1 shift (25 Q) + fact log" : "GS PYQ: 25 Q shift + fact log (2nd shift bonus)", {
    must: true, how: "10 min solve → 20 min review. Har galat/unsure fact → Fact log.",
    auto: { n: 25, specs: gsSpecs }, href: "/mission/facts", hrefLabel: "🧠 Fact log",
  });
  const extraMath = adapt.gsAccept && B("xmath", 30, "maths", "Maths sprint (GS ka time — checkpoint rule)", { must: true, auto: { n: 15, specs: TIER_A, secs: 36 } });
  const tier2 = p.tier2 && B("tier2", 60, "maths", "Tier-2 shuru: Maths/English Tier-2 level PYQ (Tier-1 qualifying hai, rank Tier-2 se)", {
    must: true, how: "Tier-1 ka kaam chalta rahe; ye ek ghanta aage ke liye.", href: "/pyq/mathbank", hrefLabel: "🧮 Maths bank",
  });
  const caB = B("ca", 30, "gs", `Current affairs: ${ca}`, {
    must: true, how: "Latest pehle. Sports, awards, appointments, schemes, summits, reports.",
    auto: { n: 20, specs: [["war", "current-affairs"]] }, href: "/current-affairs?tab=monthly", hrefLabel: "📰 CA",
  });
  const calcHow = day <= 3
    ? "Pehle 3 din TOP PRIORITY: tables 12–25. Fir squares 1–30, cubes 1–12, fraction ↔ %."
    : "Tables 12–25 revise, squares 1–30, cubes 1–12, fraction ↔ %.";
  const speed = B("speed", adapt.mathSprint ? 50 : 30, "maths", "Maths SPEED drill: 15 min calc + 1-liner sprint (15 Q / 9 min)", {
    must: true, how: calcHow + " Sprint mein kisi Q pe 60 sec se zyada nahi." + (adapt.mathSprint ? " (+20 min — checkpoint rule)" : ""),
    auto: { n: 15, specs: TIER_A, secs: 36 }, href: "/calculation", hrefLabel: "🧮 Calc drill",
  });
  const err = B("err", 35, "maths", "Mistake-book 10–15 Q → \"done\" + slow list", { bonus: true, href: "/answers?subject=math", hrefLabel: "📖 Mistakes", href2: "/slow", href2Label: "⏱️ Slow" });
  const nightMin = p.type === "A" ? 30 : 45;
  const night = B("night", nightMin, "rev", "Night recall: aaj ke facts + vocab + maths galtiyan (D+0) + 🌙 aaj ka metric", { must: true, late: true, href: "/mission/facts", hrefLabel: "🧠 Fact log" });
  const next = B("next", 15, "rev", "Kal ka din dekh lo (mock kaunsa, topic kya)", { bonus: true, late: true, href: `/mission/plan?day=${day + 1}`, hrefLabel: "📅 Kal" });
  const brk = (i) => B("brk" + i, 15, "break", "Break", { brk: true });
  const unconfNote = p.unconfTaper ? " (Taper ki jagah build din — exam date abhi confirm nahi. Admit card aate hi ⚙️ mein date + ✓ confirm.)" : "";

  if (p.type === "A") {
    const mock = B("mock", 60, "mock", `FULL MOCK ${p.fm}/${totalMocks(m)}`, {
      must: true, kind: "mock", how: `${FULL_PAPER}. Phone bahar, koi pause nahi. Maths: pehle 40 sec SCAN (GREEN/YELLOW/RED). English: error/SI 2nd number par. Har section ke aakhri 40 sec: bache blank ek hi letter se.${p.fm === 1 ? " Is mock mein ek section mein jaan-boojh ke 6 blank chhodo aur time karo ki bharne mein kitne sec lage." : ""}${p.note ? " " + p.note : ""}`,
      href: "/mock-marks?cat=full", hrefLabel: "📊 Marks daalo",
    });
    const ana = B("ana", p.last ? 45 : 60, "mock", "Mock analysis — 6 step", {
      must: true, href: "/mission/analysis", hrefLabel: "🔍 Analysis",
      how: "Maths ke saare solvable Q stopwatch ke saath: 🟢 <40 sec · 🟡 40–75 (short method likho — 3 din baad timed) · 🔴 >75 (skip). 16 → 20 attempt ka raasta = yellow ko green banana.",
    });
    return {
      pinned: [warm, mock, ana],
      seq: [rev, math, gs, brk(1), eng, tier2, voc, brk(2), gspyq, extraMath, caB, speed, reas, err, night, next].filter(Boolean),
    };
  }
  if (p.type === "B") {
    const list = p.slot.list.filter((x) => x !== "DIAG");
    const sect = B("mock", 60, "mock", `Sectional hour: ${p.slot.t}`, {
      must: true, kind: "sectional", sects: p.slot.list,
      how: (p.slot.list.includes("DIAG") ? "Pehle Maths self-test (45 min) — /mission/diagnose. Fir " : "") +
        list.map((x) => SECT[x]).join(" · ") + ". Har ek 15 min, lock ke saath." + unconfNote,
      href: p.slot.list.includes("DIAG") ? "/mission/diagnose" : "/mock-marks?cat=maths",
      hrefLabel: p.slot.list.includes("DIAG") ? "🩺 Self-test" : "📊 Marks daalo",
    });
    const ana = B("ana", 40, "mock", "Sectional analysis (har ek 10–15 min)", {
      must: true, href: "/mission/analysis", hrefLabel: "🔍 Analysis",
      how: "Maths: stopwatch ke saath 🟢 <40 · 🟡 40–75 (short method likho) · 🔴 >75 (skip).",
    });
    return {
      pinned: [warm, sect, ana],
      seq: [rev, math, gs, brk(1), eng, tier2, voc, brk(2), gspyq, extraMath, caB, speed, reas, err, night, next].filter(Boolean),
    };
  }
  // ---- Type C: taper (sirf tab jab exam date confirm ho)
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
  const p = planFor(day, m);
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
  // Lunch — 13:30, par mock se takraye to mock ke baad. Lunch ke andar 20 min
  // ka nap (alarm ke saath): 5h 45m neend mein 36 sec/Q wali working memory
  // sabse pehle girti hai.
  let lunchAt = toMin("13:30");
  if (!free(lunchAt, lunchAt + 45)) lunchAt = mock ? shift + mock.min : lunchAt;
  const lunch = { id: "lunch", min: 45, sec: "life", t: "Lunch + 20 min nap (alarm lagao)", life: true };
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
  for (let guard = 0; guard < 60 && left.length; guard++) {
    const g = gaps().find(([s, e]) => e - s >= 15 && left.some((b) => fits(b, s, e)));
    if (!g) break;
    const [s, e] = g;
    const i = left.findIndex((b) => fits(b, s, e));
    place(left.splice(i, 1)[0], s);
  }
  const skipped = left.filter((b) => !b.brk);

  const life = LIFE.map((b) => ({ ...b, s: toMin(b.start), e: toMin(b.end), min: toMin(b.end) - toMin(b.start) }));
  // Taper din: kaam jaldi khatam — baaki dopahar jaan-boojh kar khaali.
  if (p.type === "C") {
    const [ws, we] = WINDOWS[1];
    const lastEnd = Math.max(ws, ...busy.filter(([a, b]) => a >= ws && b <= we).map(([, b]) => b));
    if (lastEnd < we) life.push({ id: "rest", life: true, t: "Aaram — halka ghoomna. Koi naya topic NAHI, koi mock NAHI.", s: lastEnd, e: we, min: we - lastEnd });
  }
  // Sona: raat ka aakhri block khatam hote hi (mock din par 23:15 — thodi zyada neend).
  const lateEnds = placed.filter((b) => b.late).map((b) => b.e);
  const sleepAt = p.noMock ? toMin("22:30") : lateEnds.length ? Math.max(...lateEnds) : toMin("23:30");
  const sleep = { id: "sleep", life: true, t: p.noMock ? "Jaldi so jao — kal exam hai. 5:15 par fresh uthna." : "Sona 😴", s: sleepAt, e: sleepAt + 1, min: 1 };
  const out = [...life, ...placed, sleep].sort((a, b) => a.s - b.s).map((b) => ({ ...b, start: toHM(b.s), end: toHM(b.e) }));
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
  const cur = Math.min(currentDayNum(m), totalDays(m));
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

// -------------------------------------------------------------- analysis ---
export const ERR_TYPES = [
  { k: "W1", t: "Concept nahi aata", tip: "Chapter Tier A/B mein hai to 30 min ka slot; skip list mein hai to chhodo." },
  { k: "W2", t: "Silly / calculation", tip: "Calc drill (tables!) badhao, option se cross-check." },
  { k: "W3", t: "Galat padha", tip: "Question ka aakhri line do baar padho (NOT / except / ratio ulta)." },
  { k: "W4", t: "Tukka galat", tip: "Rule: soch ke tukka tabhi jab 1+ option kata ho." },
  { k: "S1", t: "Chhoda — par ≤60 sec mein ban jata", tip: "Sabse mehnga: 40-sec scan mein GREEN pakadna seekho." },
  { k: "S2", t: "Sahi chhoda (hard)", tip: "Theek kiya. Skip list mein daalo." },
  { k: "T1", t: "90 sec+ laga", tip: "Iska fast method likho; agli baar 60 sec pe chhodo." },
];
export const ANALYSIS_STEPS = [
  "Marks /mock-marks mein daale (section-wise C/W/total/time + rank)",
  "Har galat/chhoda Q ko type diya (W1–W4 / S1 / S2 / T1)",
  "Dobara solve STOPWATCH ke saath (S1 → W2 → W3 → W1): <40 sec 🟢 GREEN · 40–75 🟡 YELLOW (short method likho) · >75 🔴 RED (exam mein skip)",
  "GS/English ka har galat fact/rule → Fact log mein 1 line",
  "Time audit: Maths mein 9 min tak kitne? kis Q pe 90 sec+? scan kiya tha?",
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
// 🟡 Yellow Q (40–75 sec) jinka short method likha — likhne ke 3 din baad
// dobara TIMED karne hain (target <40 sec). `onDate` = jis din ki timeline hai.
export function yellowDue(onDate) {
  const out = [];
  for (const a of getAnalyses()) {
    if (daysBetween(a.day, onDate) !== 3) continue;
    for (const t of a.yellow || []) if (String(t || "").trim()) out.push({ t: String(t).trim(), from: a.name || "mock" });
  }
  return out;
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

// ------------------------------------------------------------- revision ---
// Jo Day X ko padha → X+1, X+3, X+7, X+14 ko dobara. Aakhri 2 din: sab skim.
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
// Hafte-wise targets — FLOOR ki taraf. "Abhi" = mission se pehle ke mocks.
export const SECTIONS = [
  { k: "R", label: "Reasoning", icon: "🧠", re: /reason|intelligence/i, cat: "reasoning" },
  { k: "GS", label: "GS", icon: "🌍", re: /general awareness|\bgs\b|\bgk\b/i, cat: "gk" },
  { k: "Q", label: "Maths", icon: "🧮", re: /quant|math/i, cat: "maths" },
  { k: "E", label: "English", icon: "📘", re: /english/i, cat: "english" },
];
export const TARGETS = {
  cp1: { label: "D7", upto: 7, R: { score: 41, att: 23 }, Q: { score: 31, att: 19 }, E: { score: 36, wrongMax: 5 }, GS: { score: 18, att: 20 }, full: 125 },
  cp2: { label: "D14", upto: 14, R: { score: 41, att: 23 }, Q: { score: 33, att: 20 }, E: { score: 37, wrongMax: 4 }, GS: { score: 23, att: 22 }, full: 135 },
  exam: { label: "Exam floor", upto: null, R: { score: FLOOR.R, att: 23 }, Q: { score: FLOOR.Q, att: 20 }, E: { score: FLOOR.E, wrongMax: 3 }, GS: { score: FLOOR.GS, att: 22 }, full: FLOOR.total },
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

// GS ka asli (sectional) baseline hai ya nahi — full mock ka GS section alag.
export function hasGsSectional(mocks) {
  return (mocks || []).some((m) => (m.cat || "full") !== "full" &&
    (SECTIONS[1].re.test(m.name || "") || (m.cat === "gk" && !SECTIONS.some((S) => S.k !== "GS" && S.re.test(m.name || "")))));
}

// Checkpoint ke din — plan chhota/lamba ho to bhi jis din par 🚩 hai wahi.
export function checkpointDays(m = getMission()) {
  const days = getDays(m);
  const c1 = (days.find((d) => d.checkpoint === 1) || {}).day || 7;
  const c2 = (days.find((d) => d.checkpoint === 2) || {}).day || 14;
  return { c1, c2, N: days.length };
}
export function checkpointWindows(m = getMission()) {
  const st = m.startDate || DEFAULT_START;
  const { c1, c2, N } = checkpointDays(m);
  return {
    before: { label: "Mission se pehle", from: null, to: addDays(st, -1) },
    w1: { label: `Hafta 1 (D1–D${c1})`, from: st, to: addDays(st, c1 - 1), cp: "cp1", date: addDays(st, c1 - 1) },
    w2: { label: `Hafta 2 (D${c1 + 1}–D${c2})`, from: addDays(st, c1), to: addDays(st, c2 - 1), cp: "cp2", date: addDays(st, c2 - 1) },
    w3: { label: `Aakhri (D${c2 + 1}–D${N})`, from: addDays(st, c2), to: addDays(st, N - 1), cp: "exam", date: getExam() },
  };
}

// Kaunse "agar nahi badha to" rule lagu ho rahe hain.
export const RULES = {
  mathSprint: { title: "Maths attempt 19 se kam (Checkpoint 1) → SPEED mode", detail: "Aage ke concept topics (Mensuration, Geometry, DI) hatake unki jagah 1-liner sprints. Speed drill +20 min. Round-1 ka 60-sec cap sakhti se.", adapt: true },
  mathCare: { title: "Maths attempt badhe par accuracy 80% se kam (pichhle 3 mein se 2)", detail: "Har Q pe 5 sec zyada padhne mein do, option se cross-check. W2 (silly) galtiyan → calc drill.", adapt: true },
  gsPyqOnly: { title: "GS 18 se kam — Checkpoint 1 tak pichhle 3 mein se 2", detail: "Static reading band — GS block mein sirf PYQ solve + fact log.", adapt: true },
  gsAccept: { title: "GS 23 se kam — Checkpoint 2 tak pichhle 3 mein se 2", detail: "GS ka floor 22–25 maan lo. GS PYQ ka aadha time Maths sprint ko (zyada pakke marks). Tukka sirf 50-50 par.", adapt: true },
  engNoBlind: { title: "English 5+ galat — pichhle 3 mein se 2", detail: "Soch ke tukka band — 1 bhi option nahi kata to chhodo. Roz 30 error Q.", adapt: true },
  reasoningDaily: { title: "Reasoning 40 se kam — pichhle 3 mein se 2", detail: "Roz 1 reasoning sectional (15 min) — bas, isse zyada nahi.", adapt: false },
  fatigue: { title: "Full mock ka total sectionals ke jod se 10+ kam", detail: "Thakaan / order ki dikkat: exact exam time par mock, 0 break, sections ke beech 10 sec saans.", adapt: false },
};

export function evaluateCheckpoints(mocks, m = getMission()) {
  const W = checkpointWindows(m);
  const stats = {};
  for (const [k, w] of Object.entries(W)) stats[k] = sectionStatsIn(mocks, w.from, w.to);
  const day = currentDayNum(m);
  const { c1, c2 } = checkpointDays(m);
  const cur = day <= c1 ? "w1" : day <= c2 ? "w2" : "w3";
  const triggered = [];
  const s1 = stats.w1, sNow = stats[cur];
  // SCORE = skill + paper ki mushkil + luck (tumhare Maths mein ±9 ka jhool) →
  // koi bhi plan-change tabhi jab PICHHLE 3 MEIN SE 2 mock target se neeche hon.
  // Ek mock kabhi plan nahi badalta. ATTEMPT count sirf tumhara behaviour hai
  // (paper ke haath mein nahi) — uspe ek reading bhi kaafi.
  const st = W.w1.from;
  const last3 = (k, upto) => sectionStatsIn(mocks, st, upto)[k].list
    .slice().sort((a, b) => (a.date || "").localeCompare(b.date || "")).slice(-3);
  const twoOf3 = (arr, bad) => arr.length >= 2 && arr.filter(bad).length >= 2;
  if (day >= c1 && s1.Q.n && s1.Q.att < TARGETS.cp1.Q.att) triggered.push("mathSprint");
  if (twoOf3(last3("Q", null), (x) => x.c + x.w >= 19 && (x.c / (x.c + x.w)) * 100 < 80)) triggered.push("mathCare");
  if (day >= c1 && twoOf3(last3("GS", W.w1.to), (x) => x.score < TARGETS.cp1.GS.score)) triggered.push("gsPyqOnly");
  if (day >= c2 && twoOf3(last3("GS", W.w2.to), (x) => x.score < TARGETS.cp2.GS.score)) triggered.push("gsAccept");
  if (twoOf3(last3("E", null), (x) => x.w >= 5)) triggered.push("engNoBlind");
  if (twoOf3(last3("R", null), (x) => x.score < 40)) triggered.push("reasoningDaily");
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
