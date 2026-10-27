// 🎯 CGL Tier 2 — 90 din ka plan (owner: Tier 1 27 Oct 2026 ko ho gaya,
// "ab mains clear karna hai, haal bura hai"). lib/mission (Tier 1, 32 din)
// se alag, chhota: roz ke 4–6 kaam, mock ke din, teen phase. Tick isi
// device par (localStorage t2.done) — cgl.* nahi.
//
// Tier 2 Paper 1: Maths 30 Q (90) + Reasoning 30 (90) | English 45 (135) +
// GA 25 (75) | Computer 20 (60) | DEST. Har Q 3 marks, −1 (Computer −0.5).
// Isliye kram: English (sabse bhaari) + Maths (advance block) roz; Computer
// pehle 2 hafte mein pakka; GA aakhri mahine; Reasoning sirf speed.
//
// PHASE 1  D1–D30   "MATHS REPAIR"  — sectional topic-wise + 1 mock : 1 repair,
//                   English roz, Computer khatam, DEST roz 10 min
// PHASE 2  D31–D60  "ENGLISH + BAAKI MATHS" — RC/cloze/jumble bhaari, algebra,
//                   DI, arithmetic ke kamzor topic, reasoning speed
// PHASE 3  D61–exam "MOCK + GA" — full mock 3/hafta, GA roz, wrong book revision
//
// Tier 2 ki tareekh abhi CONFIRM NAHI (SSC calendar) — default 20 Jan 2027,
// page par badal sakte ho.

const KEY_EXAM = "t2.exam";
const KEY_START = "t2.start";
const KEY_DONE = "t2.done";
export const DEFAULT_START = "2026-10-28";
export const DEFAULT_EXAM = "2027-01-20";

const g = (k, d) => { try { return localStorage.getItem(k) || d; } catch { return d; } };
export const getExam = () => g(KEY_EXAM, DEFAULT_EXAM);
export const getStart = () => g(KEY_START, DEFAULT_START);
export const setExam = (v) => { try { localStorage.setItem(KEY_EXAM, v); } catch { /* ignore */ } };
export const setStart = (v) => { try { localStorage.setItem(KEY_START, v); } catch { /* ignore */ } };
export const getDone = () => { try { return JSON.parse(localStorage.getItem(KEY_DONE) || "{}") || {}; } catch { return {}; } };
export const toggleDone = (day, i) => {
  const d = getDone(); const a = new Set(d[day] || []);
  if (a.has(i)) a.delete(i); else a.add(i);
  d[day] = [...a];
  try { localStorage.setItem(KEY_DONE, JSON.stringify(d)); } catch { /* ignore */ }
  return d;
};

const MS = 86400000;
const iso = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
export const dateOfDay = (n) => { const d = new Date(getStart() + "T00:00:00"); d.setDate(d.getDate() + n - 1); return d; };
export const totalDays = () => Math.max(1, Math.round((new Date(getExam() + "T00:00:00") - new Date(getStart() + "T00:00:00")) / MS));
export const todayNum = () => Math.floor((new Date(iso(new Date()) + "T00:00:00") - new Date(getStart() + "T00:00:00")) / MS) + 1;
export const daysLeft = () => Math.round((new Date(getExam() + "T00:00:00") - new Date(iso(new Date()) + "T00:00:00")) / MS);
export const fmt = (d) => d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });

export const PHASES = [
  { k: 1, name: "Maths repair", from: 1, to: 30, color: "#8f9bff", note: "Sectional topic-wise, 1 mock : 1 repair din. English roz. Computer 2 hafte mein khatam." },
  { k: 2, name: "English + baaki Maths", from: 31, to: 60, color: "#5fd0c0", note: "RC / cloze / jumble roz. Algebra, DI, arithmetic ke kamzor topic. Reasoning speed." },
  { k: 3, name: "Mock + GA", from: 61, to: 999, color: "#ff8fb0", note: "Full mock 3/hafta, har mock ke baad repair. GA roz. Wrong book revision." },
];
export const phaseOf = (n) => PHASES.find((p) => n >= p.from && n <= p.to) || PHASES[2];

// Phase 1 ke 30 din ka Maths topic (sabse bada block pehle: geometry →
// mensuration → trig; har 3 din ke baad ek sectional/full mock + repair).
const P1 = [
  "📏 Baseline: Tier 2 PYQ paper (2023/24) time ke saath — score likho", "📐 Geometry 1: triangles (centres, similar, area)", "📐 Geometry 2: circles (chord, tangent, angles)",
  "📐 Geometry 3: polygons + mixed PYQ 30 Q", "🔁 Repair: geometry ke galat/chhode 20 Q dobara", "📦 Mensuration 2D 1: triangle, quadrilateral, circle", "📦 Mensuration 2D 2: sector, polygon, mixed 30 Q",
  "🧪 FULL MOCK 1 (Tier 2 pattern) + Test Recorder", "🔁 Repair: mock 1 ke galat (topic-wise)", "📦 Mensuration 3D 1: cube, cuboid, cylinder, cone", "📦 Mensuration 3D 2: sphere, hemisphere, pighla kar banana",
  "📦 Mensuration 3D 3: mixed 30 Q sectional", "📐 Trigonometry 1: ratios, identities, value maan lo", "📐 Trigonometry 2: height & distance",
  "🧪 FULL MOCK 2 + Test Recorder", "🔁 Repair: mock 2 ke galat", "📐 Trig 3 + Geometry mixed sectional 30 Q", "📊 DI 1: table, bar, pie (ek set 5 Q × 4)",
  "📊 DI 2 + Simplification sectional", "🔢 Algebra 1: identities, a+1/a, a+b+c=0", "🔢 Algebra 2: factor, quadratic, mixed PYQ",
  "🧪 FULL MOCK 3 + Test Recorder", "🔁 Repair: mock 3 ke galat", "🧮 Arithmetic 1: %, P&L, discount (Tier 2 level)", "🧮 Arithmetic 2: ratio, mixture, average",
  "🧮 Arithmetic 3: TSD, T&W, SI/CI sectional", "🔁 Repair: arithmetic ke galat + wrong book", "🧪 FULL MOCK 4 + Test Recorder",
  "🔁 Repair: mock 4 + phase 1 ke sabse kamzor 3 topic", "📏 Phase 1 check: Day 1 wala PYQ paper dobara — farq dekho",
];
const P2 = [
  "📚 English: para jumble 20 + RC 2", "🔢 Algebra 3: mixed 30 Q sectional", "📚 English: cloze 3 + error 20", "📊 DI 3 + number system sectional",
  "🧪 FULL MOCK + Test Recorder", "🔁 Repair: mock ke galat (Maths + English dono)", "🧮 Arithmetic: kamzor topic 1 (mock se)", "📚 English: sentence improvement 25 + RC 2",
  "🧮 Arithmetic: kamzor topic 2", "📐 Geometry/mensuration mixed 30 Q (bhoolo mat)", "🧪 FULL MOCK + Test Recorder", "🔁 Repair",
  "📚 English: vocab (syn/ant/idiom/OWS) 50 + RC 2", "🧠 Reasoning: puzzle + seating 30 Q timed", "🧮 Mixed Maths 30 Q, 35 min (Tier 2 time)",
];
const P3 = [
  "🧪 FULL MOCK + Test Recorder", "🔁 Repair + wrong book", "🌍 GA: ek subject (Fact log + notes Revision view)", "🧪 FULL MOCK + Test Recorder",
  "🔁 Repair + Maths mixed 30 Q", "🌍 GA: ek subject + CA 1 mahina", "🧪 FULL MOCK + Test Recorder",
];

// Har din ke kaam: Maths/phase wala main kaam + roz ke fixed block.
export function tasksOf(n) {
  const ph = phaseOf(n);
  const out = [];
  if (ph.k === 1) out.push({ t: P1[(n - 1) % P1.length], tag: "Maths", main: true });
  else if (ph.k === 2) out.push({ t: P2[(n - 31) % P2.length], tag: "Main", main: true });
  else out.push({ t: P3[(n - 61) % P3.length], tag: "Main", main: true });
  const main = out[0].t;
  const mock = /FULL MOCK/.test(main);
  if (!/English/.test(main)) out.push({ t: mock ? "📚 English: sirf 1 RC (mock ke baad)" : "📚 English: 2 RC time ke saath + 20 Q (error / cloze)", tag: "English" });
  if (ph.k === 1 && n <= 14) out.push({ t: "💻 Computer: syllabus ka 1 hissa + 20 PYQ (14 din mein poora)", tag: "Computer" });
  else out.push({ t: "💻 Computer: 15 PYQ revise", tag: "Computer" });
  out.push({ t: "⌨️ DEST typing 10 min (2000 key / 15 min ka target)", tag: "DEST" });
  if (!mock) out.push({ t: ph.k === 3 ? "🧠 Reasoning: 30 Q, 25 min" : "🧠 Reasoning: 20 Q, 15 min (speed)", tag: "Reasoning" });
  if (ph.k === 3 && !/GA/.test(main)) out.push({ t: "🌍 GA: Fact log 20 + CA 15 min", tag: "GA" });
  if (ph.k !== 3 && n % 7 === 0) out.push({ t: "🌍 GA: hafte ka 1 ghanta — Fact log + Notes Revision", tag: "GA" });
  return out;
}
export const isMockDay = (n) => /FULL MOCK/.test(tasksOf(n)[0].t);
