// 40-Day Mission 150 — the fixed plan + its progress store.
//
// The plan is AUTHORED, not generated: 40 days of blocks calibrated on the
// owner's real mock baseline (Maths 15-20 · Reasoning 35-44 · English 19-25 ·
// GS 9-10 · Full 80-95, told on 25 Jul 2026). Every block deep-links into this
// site's own banks and notes — nothing external, no AI at runtime.
//
// Hour split per day (~11h): QA 3.5 · GA 3 · EN 2.5 · GI 1.5 · review 0.5.
// Reasoning is already near target so it only gets maintenance; the marks have
// to come from Maths (method + speed), GS (volume revision) and English (rules).
import { dayKey } from "./daytime";

const KEY = "cgl.planner";

function read() {
  if (typeof window === "undefined") return { startDate: null, done: {}, qaRating: {} };
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "{}");
    return { startDate: v.startDate || null, done: v.done || {}, qaRating: v.qaRating || {} };
  } catch {
    return { startDate: null, done: {}, qaRating: {} };
  }
}
function write(v) {
  try { localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* quota */ }
}

export function getPlanner() { return read(); }
export function setStartDate(date) { const v = read(); v.startDate = date; write(v); return v; }
export function toggleBlock(day, idx) {
  const v = read();
  const d = v.done[day] || (v.done[day] = {});
  if (d[idx]) delete d[idx]; else d[idx] = true;
  write(v);
  return v;
}
// Day 1 inventory: self-rating per Maths type — "a" aata, "r" rusty, "n" nahi aata.
export function setQaRating(key, val) {
  const v = read();
  if (v.qaRating[key] === val) delete v.qaRating[key]; else v.qaRating[key] = val;
  write(v);
  return v;
}

// Day number runs on dayKey() (rolls over at the configured day-end, not
// midnight) so a 1am session still counts as the same study day.
export function currentDayNum(state = read()) {
  if (!state.startDate) return 0;
  const [y1, m1, d1] = state.startDate.split("-").map(Number);
  const [y2, m2, d2] = dayKey().split("-").map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 864e5) + 1;
}
export function dayCompletion(state, n) {
  const p = PLAN[n];
  if (!p) return 0;
  const done = state.done[n] || {};
  const c = p.blocks.reduce((a, _, i) => a + (done[i] ? 1 : 0), 0);
  return p.blocks.length ? c / p.blocks.length : 0;
}
export function planStreak(state) {
  const cur = Math.min(currentDayNum(state), 40);
  let s = 0;
  if (cur >= 1 && dayCompletion(state, cur) >= 0.7) s++;
  for (let i = cur - 1; i >= 1; i--) {
    if (dayCompletion(state, i) >= 0.7) s++; else break;
  }
  return s;
}

export const BASELINE = { QA: "15-20", GI: "35-44", EN: "19-25", GA: "9-10", full: "80-95" };
export const TARGETS = { QA: 34, GI: 42, EN: 32, GA: 22 };
export const MOCK_DAYS = [7, 11, 14, 18, 21, 24, 27, 30, 33, 36, 38];
export const SEC_META = {
  QA: { name: "Maths", color: "#f59e0b" },
  GI: { name: "Reasoning", color: "#6bd39a" },
  EN: { name: "English", color: "#8ab4f8" },
  GA: { name: "GS", color: "#ff8a7a" },
  MOCK: { name: "Mock", color: "#c084fc" },
  REV: { name: "Review", color: "#2dd4bf" },
};

// ---- deep-link helpers into the site's own content ----
const m = (slug, label) => ({ href: `/pyq/mathbank/${slug}`, label: label || "Pinnacle" });
const m25 = (slug, label) => ({ href: `/pyq/maths2025/${slug}`, label: label || "PYQ 2025" });
const brah = (topic) => ({ href: `/notes/brahmastra?topic=${encodeURIComponent(topic)}`, label: "Formulas" });
const rs = (slug, label) => ({ href: `/pyq/reasonbank/${slug}`, label: label || "Practice" });
const pin = (slug, label) => ({ href: `/pyq/pinnacle/${slug}`, label: label || "Pinnacle" });
const ep = (slug, label) => ({ href: `/pyq/errorpro/${slug}`, label: label || "Error Pro" });
const war = (slug, label) => ({ href: `/pyq/war/${slug}`, label: label || "WAR PYQ" });
const nt = (book, topic, label) => ({ href: `/notes/${book}?topic=${encodeURIComponent(topic)}`, label: label || "Notes" });
const L = (href, label) => ({ href, label });

// ---- Maths: 19 type-units. Study = formula sheet, prac = the actual chapters ----
const QA_UNITS = {
  pct:  { name: "Percentage", tip: "Fraction-multiplier table ratta (1/8 = 12.5% … 1/20 = 5%). Successive % = a+b+ab/100. Long division KABHI nahi.",
          links: [brah("Percentage"), m("percentage"), m25("percentage")] },
  simp: { name: "Simplification", tip: "Squares 1-30, cubes 1-15 yaad. Options pehle dekho — approx se 10 sec mein answer.",
          links: [brah("Simplification"), m25("simplification-and-approximation"), L("/calculation", "Calc drill")] },
  ratio:{ name: "Ratio & Proportion", tip: "k-method: sab ko k units maano. Ages ke sawal bhi isi mein — options se back-solve karo.",
          links: [brah("Ratio & Proportion"), m("ratio-proportion"), m25("ratio-and-proportion")] },
  avg:  { name: "Average", tip: "Deviation method — assumed mean se +/- karo. Poora sum dobara jodna = time waste.",
          links: [brah("Average"), m("average"), m25("average")] },
  pl:   { name: "Profit & Loss", tip: "Sab multiplier se: 20% profit = ×1.2. Successive bhi seedha multiply.",
          links: [brah("Profit & Loss"), m("profit-and-loss"), m25("profit-and-loss")] },
  disc: { name: "Discount", tip: "25% discount = ×0.75. MP→SP→CP ki multiplier chain likho, khatam.",
          links: [brah("Discount"), m("discount"), m25("discount")] },
  si:   { name: "Simple Interest", tip: "SI = ek hi formula hai — asli speed ratio se aati hai (time/rate ka ratio).",
          links: [brah("Simple Interest"), m("simple-interest"), m25("simple-interest-si")] },
  ci:   { name: "Compound Interest", tip: "2-3 saal ka CI successive % se (a+b+ab/100 do baar). Ratta: 2yr CI−SI = PR²/10000.",
          links: [brah("Compound Interest"), m("compound-interest"), m25("compound-interest-ci")] },
  mix:  { name: "Mixture & Alligation", tip: "Alligation cross har jagah lagta hai — price, %, average, speed. Cross banao, ratio padho.",
          links: [brah("Alligation"), m("mixture-and-alligation"), m25("mixture-and-alligation")] },
  tw:   { name: "Time & Work", tip: "LCM ko total work maano, units/day nikalo. Fraction method bhool jao.",
          links: [brah("Time & Work"), m("work-and-time"), m25("time-and-work")] },
  pipes:{ name: "Pipe & Cistern", tip: "Time-Work jaisa hi — LCM method. Nikaalne wala pipe = negative units.",
          links: [brah("Pipe & Cistern"), m("pipe-and-cistern"), m25("pipe-and-cistern")] },
  tsd:  { name: "Time, Speed & Distance", tip: "Ratio se khelo: speed ka ratio ulta time ka ratio. Avg speed 2ab/(a+b) SIRF equal distance pe.",
          links: [brah("Time & Distance"), m("time-speed-and-distance"), m25("time-speed-and-distance")] },
  bt:   { name: "Trains + Boats", tip: "Train: lengths ka jodna hi asli sawal hai, relative speed ratta. Boat: (b+s) down, (b−s) up.",
          links: [brah("Train"), m25("problems-on-trains", "Trains"), m("boat-and-stream", "Boats")] },
  alg:  { name: "Algebra", tip: "a+1/a wale patterns — 6 identities se 90% sawal. Dekhte hi pattern match, derive nahi.",
          links: [brah("Algebra"), m("algebra"), m25("algebra")] },
  num:  { name: "Number System", tip: "Divisibility + unit digit cycles + remainder basics. LCM/HCF bhi isi din.",
          links: [brah("Number System"), m("number-system"), m25("number-system")] },
  mens: { name: "Mensuration (L1)", tip: "Sirf direct formula plug-in level. Deep 3D visualization wale EXAM MEIN SKIP — yeh strategy hai.",
          links: [brah("Mensuration 2D"), m("mensuration"), m25("mensuration-2d")] },
  geo:  { name: "Geometry basics", tip: "Direct results ratta: circle theorems, triangle centers, angle sums. Proof wale skip.",
          links: [brah("Geometry"), m("geometry"), m25("geometry")] },
  trig: { name: "Trigonometry", tip: "Values table + top identities. θ=45° daal ke options check karna LEGAL shortcut hai.",
          links: [brah("Trigonometry"), m("trigonometry"), m25("trigonometry")] },
  di:   { name: "Data Interpretation", tip: "QA ka SABSE zyada ROI: 1 set = 3-4 sawal, sab %/ratio ke. Roz ka non-negotiable.",
          links: [m("data-interpretation", "Pinnacle DI"), m25("data-interpretation-di", "DI 2025")] },
};
const QA_ORDER = Object.keys(QA_UNITS); // 19 units

// Auto-practice pools — [bank, slug] pairs each unit's "▶ N Q shuru" pulls from
// (PlanPractice merges them round-robin, no-repeat across sessions).
const QA_AUTO = {
  pct:   [["mathbank", "percentage"], ["sscmaths", "percentage"]],
  simp:  [["sscmaths", "simplification-and-approximation"], ["mathbank", "simplification"]],
  ratio: [["mathbank", "ratio-proportion"], ["sscmaths", "ratio-and-proportion"]],
  avg:   [["mathbank", "average"], ["sscmaths", "average"]],
  pl:    [["mathbank", "profit-and-loss"], ["sscmaths", "profit-and-loss"]],
  disc:  [["mathbank", "discount"], ["sscmaths", "discount"]],
  si:    [["mathbank", "simple-interest"], ["sscmaths", "simple-interest-si"]],
  ci:    [["mathbank", "compound-interest"], ["sscmaths", "compound-interest-ci"]],
  mix:   [["mathbank", "mixture-and-alligation"], ["sscmaths", "mixture-and-alligation"]],
  tw:    [["mathbank", "work-and-time"], ["sscmaths", "time-and-work"]],
  pipes: [["mathbank", "pipe-and-cistern"], ["sscmaths", "pipe-and-cistern"]],
  tsd:   [["mathbank", "time-speed-and-distance"], ["sscmaths", "time-speed-and-distance"]],
  bt:    [["sscmaths", "problems-on-trains"], ["mathbank", "boat-and-stream"], ["sscmaths", "boat-and-stream"]],
  alg:   [["mathbank", "algebra"], ["sscmaths", "algebra"]],
  num:   [["mathbank", "number-system"], ["sscmaths", "number-system"], ["sscmaths", "lcm-and-hcf"]],
  mens:  [["mathbank", "mensuration"], ["sscmaths", "mensuration-2d"]],
  geo:   [["mathbank", "geometry"], ["sscmaths", "geometry"]],
  trig:  [["mathbank", "trigonometry"], ["sscmaths", "trigonometry"]],
  di:    [["mathbank", "data-interpretation"], ["sscmaths", "data-interpretation-di"]],
};
for (const k in QA_AUTO) QA_UNITS[k].auto = QA_AUTO[k];

// The inventory list the /today page shows (Day 1 asks for a self-rating on these).
export const QA_TYPE_LIST = QA_ORDER.map((k) => ({ key: k, ...QA_UNITS[k] }));

// Block-level auto helpers: A = fixed pools, AM = mixed-QA (rusty types first).
const A = (specs, n) => ({ n, specs });
const AM = (n) => ({ n, mixedQA: true });
const QA_SCHED = {
  2: ["pct", "simp"], 3: ["ratio", "avg"], 4: ["pl", "disc"], 5: ["si", "ci"],
  6: ["tw", "pipes"], 7: ["di"], 8: ["tsd", "bt"], 9: ["alg", "num"],
  10: ["mens", "geo"], 11: ["trig"], 12: ["mix", "di"],
};
function qaPair(n) {
  if (QA_SCHED[n]) return QA_SCHED[n];
  const i = (n - 13) * 2;
  return [QA_ORDER[i % 19], QA_ORDER[(i + 1) % 19]];
}

// ---- Reasoning: 12 maintenance units over Pinnacle Reasoning ----
const GI_ROT = [
  { name: "Series (number + non-verbal)", links: [rs("series"), rs("series-non-verbal", "Non-verbal")] },
  { name: "Mathematical Operation", links: [rs("mathematical-operation")] },
  { name: "Analogy + Odd One Out", links: [rs("analogy"), rs("odd-one-out", "Odd one out")] },
  { name: "Coding-Decoding", links: [rs("coding-decoding")] },
  { name: "Blood Relation + Age", links: [rs("blood-relation"), rs("age", "Ages")] },
  { name: "Direction + Order & Ranking", links: [rs("direction"), rs("order-and-ranking", "Ranking")] },
  { name: "Syllogism + Statement-Conclusion", links: [rs("syllogism"), rs("statement-and-conclusion", "Statements")] },
  { name: "Venn Diagram", links: [rs("venn-diagram")] },
  { name: "Non-verbal set (figures)", links: [rs("embedded-figure", "Embedded"), rs("counting-of-figure", "Counting"), rs("mirror-water-image", "Mirror")] },
  { name: "Cube-Dice + Calendar", links: [rs("cube-and-dice"), rs("calendar", "Calendar")] },
  { name: "Word Arrangement + Formation", links: [rs("word-arrangement"), rs("word-formation", "Formation")] },
  { name: "Arithmetic Reasoning + Inequality", links: [rs("arithmetic-reasoning"), rs("inequality", "Inequality")] },
];
const GI_AUTO = [
  [["reasonbank", "series"], ["reasonbank", "series-non-verbal"]],
  [["reasonbank", "mathematical-operation"]],
  [["reasonbank", "analogy"], ["reasonbank", "odd-one-out"]],
  [["reasonbank", "coding-decoding"]],
  [["reasonbank", "blood-relation"], ["reasonbank", "age"]],
  [["reasonbank", "direction"], ["reasonbank", "order-and-ranking"]],
  [["reasonbank", "syllogism"], ["reasonbank", "statement-and-conclusion"]],
  [["reasonbank", "venn-diagram"]],
  [["reasonbank", "embedded-figure"], ["reasonbank", "counting-of-figure"], ["reasonbank", "mirror-water-image"]],
  [["reasonbank", "cube-and-dice"], ["reasonbank", "calendar"]],
  [["reasonbank", "word-arrangement"], ["reasonbank", "word-formation"]],
  [["reasonbank", "arithmetic-reasoning"], ["reasonbank", "inequality"]],
];
const giUnit = (n) => ({ ...GI_ROT[(n - 1) % 12], auto: GI_AUTO[(n - 1) % 12] });

// ---- English: 8 grammar units (rules + uski practice), + daily vocab/RC/cloze ----
const EN_ROT = [
  { name: "Subject-Verb Agreement", links: [nt("english", "Subject-Verb Agreement & Modals", "Aman Sir notes"), nt("eng-formula", "Subject-Verb Agreement", "Rules"), pin("spot-the-error", "Error PYQ")] },
  { name: "Tense", links: [nt("eng-formula", "Tense", "Rules"), pin("fill-in-the-blanks", "Fill blanks")] },
  { name: "Preposition", links: [nt("eng-formula", "Preposition", "Rules"), pin("spot-the-error", "Error PYQ")] },
  { name: "Noun + Pronoun", links: [ep("noun", "Noun drill"), ep("pronoun", "Pronoun drill")] },
  { name: "Article + Question Tag", links: [ep("article", "Article drill"), ep("question-tag", "Q-tag drill")] },
  { name: "Voice (Active-Passive)", links: [nt("eng-formula", "Voice", "Rules"), pin("active-passive", "Practice")] },
  { name: "Narration", links: [nt("eng-formula", "Narration", "Rules"), pin("narration", "Practice")] },
  { name: "Improvement + Parajumble", links: [L("/english/pocket", "Pocket Rules"), pin("sentence-improvement", "Improvement"), pin("parajumble", "Parajumble")] },
];
// Passage-based chapters (comprehension/cloze) are links-only — their questions
// need the passage view, so auto-practice skips them.
const EN_AUTO = [
  [["engbank", "spot-the-error"]],
  [["engbank", "fill-in-the-blanks"]],
  [["engbank", "spot-the-error"]],
  [["errorpro", "noun"], ["errorpro", "pronoun"]],
  [["errorpro", "article"], ["errorpro", "question-tag"]],
  [["engbank", "active-passive"]],
  [["engbank", "narration"]],
  [["engbank", "sentence-improvement"], ["engbank", "parajumble"]],
];
const enUnit = (n) => ({ ...EN_ROT[(n - 1) % 8], auto: EN_AUTO[(n - 1) % 8] });
const VOCAB_ROT = ["synonyms", "antonyms", "one-word-substitution", "idioms", "spelling-check", "homonyms"];
const vocabLinks = (n) => [L("/vocab", "Vocab · OWS"), pin(VOCAB_ROT[(n - 1) % 6], "PYQ words")];
const vocabAuto = (n) => A([["engbank", VOCAB_ROT[(n - 1) % 6]]], 15);

// ---- GS: 14 volume-revision units — notes book + uska PYQ bank ----
// Each GS unit is an AREA, not a chapter. Its links ADVANCE every 7-day pass:
// pass 1 shows the highest-yield chapters, later passes walk the rest of the
// book in order — so by pass 4-5 the whole book has been covered, ROI-first.
const GA_ROT = [
  { name: "Polity — Constitution basics", pyq: L("/pyq/gk/polity", "1077 PYQ"), passes: [
    [nt("polity", "Fundamental Rights", "FR — SIMPLICRACK"), nt("parmar-polity", "Salient Features of the Constitution", "Salient Features")],
    [nt("parmar-polity", "Preamble", "Preamble"), nt("parmar-polity", "Making of the Constitution", "Making of Const.")],
    [nt("parmar-polity", "DPSP and Fundamental Duties", "DPSP + Duties"), nt("parmar-polity", "Part 1 and Part 2 of the Constitution", "Parts 1-2")],
    [nt("parmar-polity", "Important Acts", "Important Acts"), nt("parmar-polity", "Sources of the Indian Constitution", "Sources")],
    [nt("polity", "Fundamental Rights", "FR — dobara"), nt("parmar-polity", "Noteworthy Points", "Noteworthy Points")],
  ] },
  { name: "Polity — Parliament, President, Courts", pyq: war("polity"), passes: [
    [nt("polity", "The Parliament", "Parliament"), nt("parmar-polity", "Supreme Court and High Court", "Courts")],
    [nt("parmar-polity", "President and Vice President of India", "President + VP"), nt("parmar-polity", "Prime Minister and Council of Ministers", "PM + Ministers")],
    [nt("parmar-polity", "State Legislature", "State Legislature"), nt("parmar-polity", "Local Government", "Local Govt")],
    [nt("parmar-polity", "Emergency and Constitutional Amendment", "Emergency + Amendments"), nt("parmar-polity", "Constitutional and Non-Constitutional Bodies", "Bodies")],
    [nt("parmar-polity", "Centre-State Relations", "Centre-State"), nt("parmar-polity", "New Criminal Laws 2023", "New Laws 2023")],
  ] },
  { name: "History — Ancient", pyq: L("/pyq/gk/ancient-history", "600 PYQ"), passes: [
    [nt("parmar-history", "Jainism and Buddhism", "Jainism + Buddhism"), nt("parmar-history", "Indus Valley Civilization", "IVC")],
    [nt("parmar-history", "Vedic Age", "Vedic Age"), nt("parmar-history", "Mahajanapadas", "Mahajanapadas")],
    [nt("parmar-history", "Maurya Dynasty", "Maurya"), nt("parmar-history", "Gupta Dynasty", "Gupta")],
    [nt("parmar-history", "Post-Maurya Dynasties", "Post-Maurya"), nt("parmar-history", "Sangam Age", "Sangam Age")],
    [nt("parmar-history", "Post-Gupta Dynasties", "Post-Gupta"), nt("parmar-history", "Tripartite Struggle and Cholas", "Cholas")],
  ] },
  { name: "History — Medieval", pyq: war("mediaeval-history"), passes: [
    [nt("parmar-history", "Delhi Sultanate", "Delhi Sultanate"), nt("parmar-history", "The Mughal Empire", "Mughal Empire")],
    [nt("parmar-history", "Vijayanagara and Bahmani Kingdom", "Vijayanagara + Bahmani"), nt("parmar-history", "Marathas", "Marathas")],
    [nt("parmar-history", "Bhakti and Sufi Movements", "Bhakti + Sufi"), nt("history", "Mughal Sultanate", "Mughal — handwritten")],
    [nt("history", "Medieval History", "Medieval — handwritten"), nt("history", "Early Medieval History", "Early Medieval")],
    [nt("parmar-history", "Delhi Sultanate", "Sultanate — dobara"), nt("history", "Vijayanagar Empire", "Vijayanagar")],
  ] },
  { name: "History — Modern", pyq: war("modern-history"), passes: [
    [nt("parmar-history", "Gandhian Era", "Gandhian Era"), nt("parmar-history", "Revolt of 1857", "1857")],
    [nt("parmar-history", "Advent of Europeans", "Europeans"), nt("parmar-history", "Indian National Congress", "INC")],
    [nt("parmar-history", "Socio Religious Reforms", "Reforms"), nt("parmar-history", "Bengal Partition", "Bengal Partition")],
    [nt("parmar-history", "Quit India Movement", "Quit India"), nt("parmar-history", "CDM and Simon Commission", "CDM + Simon")],
    [nt("parmar-history", "Governor-General and Viceroy", "Viceroys"), nt("history", "Gandhian Era (1917-1947)", "Gandhian — handwritten")],
  ] },
  { name: "Geography — India", pyq: war("geography"), passes: [
    [nt("parmar-geography", "Himalayan River System", "Rivers — Himalayan"), nt("parmar-geography", "Agriculture", "Agriculture")],
    [nt("parmar-geography", "Himalayas", "Himalayas"), nt("parmar-geography", "Peninsular Rivers", "Rivers — Peninsular")],
    [nt("parmar-geography", "Soil", "Soil"), nt("parmar-geography", "Minerals", "Minerals")],
    [nt("parmar-geography", "Monsoon", "Monsoon"), nt("parmar-geography", "Peninsular Plateau", "Plateau")],
    [nt("parmar-geography", "Northern Plains and Islands", "Plains + Islands"), nt("parmar-geography", "Dams, Lakes and Waterfall", "Dams + Lakes")],
  ] },
  { name: "Geography — World + Environment", pyq: war("environment"), passes: [
    [nt("parmar-geography", "World Map", "World Map"), nt("parmar-environment", "Ecosystem", "Ecosystem")],
    [nt("parmar-geography", "Solar System", "Solar System"), nt("parmar-environment", "Basics of Environmental Sciences", "Env basics")],
    [nt("parmar-geography", "Atmosphere", "Atmosphere"), nt("parmar-environment", "National Parks", "National Parks")],
    [nt("parmar-geography", "Rocks, Continents and Oceans", "Rocks + Oceans"), nt("parmar-environment", "Biogeochemical Cycles", "Cycles")],
    [nt("parmar-geography", "Wind, Ocean Current and Cyclone", "Winds + Cyclones"), nt("parmar-environment", "Environmental Conventions", "Conventions")],
  ] },
  { name: "Economy — Basics, Banking", pyq: war("economics"), passes: [
    [nt("parmar-economy", "Basics of Economy", "Basics"), nt("parmar-economy", "Banking: Part 1", "Banking 1")],
    [nt("parmar-economy", "National Income", "National Income"), nt("parmar-economy", "Monetary Policy", "Monetary Policy")],
    [nt("parmar-economy", "Banking: Part 2", "Banking 2"), nt("parmar-economy", "Microeconomics", "Microeconomics")],
    [nt("parmar-economy", "Basics of Economy", "Basics — dobara"), nt("parmar-economy", "Monetary Policy", "Monetary — dobara")],
    [nt("parmar-economy", "Banking: Part 1", "Banking 1"), nt("parmar-economy", "National Income", "National Income")],
  ] },
  { name: "Economy — Budget, Plans, Reports", pyq: war("economics"), passes: [
    [nt("parmar-economy", "Budget and Taxation", "Budget + Tax"), nt("parmar-economy", "Five Year Plan and Industrial Policy", "5-yr Plans")],
    [nt("parmar-economy", "Inflation and Unemployment", "Inflation"), nt("parmar-economy", "Poverty and Balance of Payment", "Poverty + BOP")],
    [nt("parmar-economy", "Indices, Reports & International Institutions", "Indices + Reports"), nt("parmar-economy", "Budget and Taxation", "Budget — dobara")],
    [nt("parmar-economy", "Five Year Plan and Industrial Policy", "5-yr Plans"), nt("parmar-economy", "Inflation and Unemployment", "Inflation")],
    [nt("parmar-economy", "Poverty and Balance of Payment", "Poverty + BOP"), nt("parmar-economy", "Indices, Reports & International Institutions", "Indices")],
  ] },
  { name: "Physics", pyq: war("physics", "113 PYQ"), passes: [
    [nt("parmar-physics", "Motion", "Motion"), nt("parmar-physics", "Electricity", "Electricity")],
    [nt("parmar-physics", "Force and Laws of Motion", "Force + Laws"), nt("parmar-physics", "Human Eye and Vision", "Eye + Vision")],
    [nt("parmar-physics", "Gravitation and Work Done", "Gravitation + Work"), nt("parmar-physics", "Sound", "Sound")],
    [nt("parmar-physics", "Reflection and Refraction", "Light"), nt("parmar-physics", "Magnetic Effect of Electric Current", "Magnetism")],
    [nt("parmar-physics", "Motion", "Motion — dobara"), nt("parmar-physics", "Electricity", "Electricity — dobara")],
  ] },
  { name: "Chemistry", pyq: war("chemistry", "PYQ"), passes: [
    [nt("parmar-chemistry", "Periodic Table", "Periodic Table"), nt("parmar-chemistry", "Acid, Base and Salt", "Acids + Bases")],
    [nt("parmar-chemistry", "Matter", "Matter"), nt("parmar-chemistry", "Metals and Non-Metals", "Metals")],
    [nt("parmar-chemistry", "Atom and its Structure", "Atom"), nt("parmar-chemistry", "Chemical Reactions", "Reactions")],
    [nt("parmar-chemistry", "Carbon and its Compounds", "Carbon"), nt("parmar-chemistry", "Periodic Table", "Periodic — dobara")],
    [nt("parmar-chemistry", "Acid, Base and Salt", "Acids — dobara"), nt("parmar-chemistry", "Metals and Non-Metals", "Metals — dobara")],
  ] },
  { name: "Biology", pyq: war("biology", "114 PYQ"), passes: [
    [nt("parmar-biology", "Cell", "Cell"), nt("parmar-biology", "Diseases", "Diseases")],
    [nt("parmar-biology", "Nutrients", "Nutrients"), nt("parmar-biology", "Digestion and Respiration", "Digestion")],
    [nt("parmar-biology", "Circulatory System and Excretory System", "Circulation"), nt("parmar-biology", "Nervous System", "Nervous System")],
    [nt("parmar-biology", "Plant and Animal Kingdom", "Kingdoms"), nt("parmar-biology", "Reproduction", "Reproduction")],
    [nt("parmar-biology", "Hormones and Plant Movements", "Hormones"), nt("parmar-biology", "Plant Tissue and Animal Tissue", "Tissues")],
  ] },
  { name: "Static GK — Culture, Sports, Books", pyq: war("static-gk"), passes: [
    [nt("parmar-static", "Sports", "Sports"), nt("parmar-static", "Books and Authors", "Books")],
    [nt("parmar-static", "Classical Dance", "Classical Dance"), nt("parmar-static", "Folk Dances of India", "Folk Dances")],
    [nt("parmar-static", "Festivals of India", "Festivals"), nt("parmar-static", "Music and Paintings", "Music + Paintings")],
    [nt("parmar-static", "Census", "Census"), nt("parmar-static", "Important Days", "Important Days")],
    [nt("parmar-static", "Sports", "Sports — dobara"), nt("parmar-static", "Books and Authors", "Books — dobara")],
  ] },
  { name: "Static GK — Awards, Orgs, Days", pyq: war("static-gk"), passes: [
    [nt("parmar-static", "Awards and Honours", "Awards"), nt("parmar-static", "International Organisations", "Int. Orgs")],
    [nt("parmar-static", "National Organisations", "National Orgs"), nt("static-gk", "Important Days / Weeks / Themes 2024-25", "Days — Rojgar")],
    [nt("parmar-static", "Awards and Honours", "Awards — dobara"), nt("static-gk", "First & Longest / Largest in India & The World", "Firsts — Rojgar")],
    [nt("parmar-static", "International Organisations", "Int. Orgs"), nt("static-gk", "Famous International Organisations and their Headquarters", "HQ — Rojgar")],
    [nt("parmar-static", "National Organisations", "National Orgs"), nt("static-gk", "Important National & International Awards", "Awards — Rojgar")],
  ] },
];
const GA_AUTO = [
  [["gk", "polity"]],
  [["war", "polity"], ["gk", "polity"]],
  [["war", "ancient-history"], ["gk", "ancient-history"]],
  [["war", "mediaeval-history"]],
  [["war", "modern-history"]],
  [["war", "geography"]],
  [["war", "environment"], ["war", "geography"]],
  [["war", "economics"]],
  [["war", "economics"]],
  [["war", "physics"]],
  [["war", "chemistry"], ["war", "physics"]],
  [["war", "biology"]],
  [["war", "static-gk"]],
  [["war", "static-gk"]],
];
function gaUnit(i) {
  const u = GA_ROT[i % 14];
  const p = Math.floor(i / 14) % u.passes.length; // 7-din ka pass — har pass agle chapters
  return { name: u.name, links: [...u.passes[p], u.pyq], auto: GA_AUTO[i % 14] };
}
function gaPair(n) { const i = (n - 1) * 2; return [gaUnit(i), gaUnit(i + 1)]; }
const CA_LINKS = [L("/current-affairs", "Daily CA"), war("current-affairs", "CA PYQ")];
const CA_AUTO = A([["war", "current-affairs"]], 15);

const DRILL = {
  QA: [L("/quiz-bank", "Sectional sets"), L("/mock-marks?cat=maths", "Marks likho")],
  GI: [L("/quiz-bank", "Sectional sets"), L("/mock-marks?cat=reasoning", "Marks likho")],
  EN: [L("/quiz-bank", "Sectional sets"), L("/mock-marks?cat=english", "Marks likho")],
  GA: [L("/quiz-bank", "Sectional sets"), L("/mock-marks?cat=gk", "Marks likho")],
};
const MISTAKES = [L("/mistakes", "Mistake Notebook"), L("/wrong", "Wrong Book")];
const MOCK_LINKS = [L("/mock-tests", "Mock sets"), L("/mock-marks?cat=full", "Marks entry")];

// Cross-topic mixed pools for sectional-style auto practice.
const RS_MIX = [["reasonbank", "mathematical-operation"], ["reasonbank", "series"], ["reasonbank", "order-and-ranking"], ["reasonbank", "venn-diagram"]];
const GS_MIX = [["war", "static-gk"], ["gk", "polity"], ["war", "geography"], ["war", "economics"]];
const EN_MIX = [["engbank", "spot-the-error"], ["engbank", "fill-in-the-blanks"], ["engbank", "sentence-improvement"], ["engbank", "synonyms"]];

function B(sec, t, task, min, links, auto) { return { sec, t, task, min, links: links || [], auto: auto || null }; }

function planFor(n) {
  const isMock = MOCK_DAYS.includes(n);
  const [qa1k, qa2k] = qaPair(n);
  const Q1 = QA_UNITS[qa1k], Q2 = QA_UNITS[qa2k || qa1k];
  const [ga1, ga2] = gaPair(n);
  const gi = giUnit(n), en = enUnit(n);
  const blocks = [];
  let phase, why;

  if (n === 1) {
    phase = "Setup";
    why = "Aaj naapna hai kya aata hai, kya nahi — kal se full speed. Yeh din skip mat karna, poora plan isi pe khada hai.";
    blocks.push(
      B("REV", "Mistake system samjho", "Aaj se HAR galat sawal Mistake Notebook mein apne aap jayega (quiz runner se). Screenshot wale sawal Wrong Book mein. Roz ka aakhri kaam inhi ko dekhna hoga.", 15, MISTAKES),
      B("QA", "Maths type-inventory", "Is page pe sabse neeche 'Maths ke 19 types' wali list kholo — har type pe imaandari se tap karke mark karo: Aata / Rusty / Nahi aata. Save apne aap hota hai. Yehi 19 types Day 2-12 mein ek-ek karke aayenge.", 30),
      B("QA", "2 rusty types — formulas", "Jo 2 sabse zyada rusty lage, unki Brahmastra formula sheet 15-15 min dekho. Pehle METHOD, phir sawal.", 30, [brah("Percentage"), brah("Algebra")]),
      B("QA", "2 rusty types — 15-15 Q", "Unhi dono ke 15-15 questions. '▶ Q shuru' dabao — rusty marked types ke questions apne aap aayenge. Har sawal pe socho: iska chhota tareeka kya tha?", 90, [m("percentage"), m("algebra")], AM(30)),
      B("QA", "Baseline sectional", "'▶ 25 Q shuru' — mixed Maths, 15-min jaisa pressure. Jo score aaye — baseline hai, judgement nahi. Marks entry karo.", 45, DRILL.QA, AM(25)),
      B("GA", "GS inventory + pehla topic", "Polity se shuru: Fundamental Rights ka recall-first revision — pehle khud yaad karo, phir notes se milao. Phir 15 Q.", 60, [nt("polity", "Fundamental Rights", "Polity notes"), L("/pyq/gk/polity", "Polity PYQ")], A([["gk", "polity"]], 15)),
      B("GA", "Current Affairs", "Aaj se roz 30 min CA — Daily CA + WAR ke CA PYQ. Bina naagha.", 30, CA_LINKS, CA_AUTO),
      B("EN", "Vocab Day shuru", "Vocab system mein aaj ka day kholo — 50 words. Roz ka fix slot hai yeh.", 30, vocabLinks(n), vocabAuto(n)),
      B("EN", "Error-spotting diagnostic", "25 sawal — '▶ Q shuru' dabao. Note karo kaunse RULES pakad mein nahi — wahi aage ka focus.", 45, [pin("spot-the-error")], A([["engbank", "spot-the-error"]], 25)),
      B("EN", "1 RC + 1 Cloze", "Comprehension ka 1 passage (8 min) + 1 cloze set. Questions pehle, passage baad mein.", 45, [pin("comprehension", "RC"), pin("cloze-test", "Cloze")]),
      B("GI", "Reasoning baseline", "'▶ 25 Q shuru' — mixed reasoning. Tum yahan already strong ho (35-44) — bas confirm karo.", 45, DRILL.GI, A(RS_MIX, 25)),
      B("REV", "Aaj ki galtiyan", "Mistake Notebook kholo — aaj jo galat hua sab wahan hai. Har ek pe: type kya tha, wajah kya thi.", 30, MISTAKES)
    );
  } else if (n <= 10 && !isMock) {
    phase = "Foundation";
    why = "Har section ab 15 min ka locked hai — pehle METHOD sahi karo, speed apne aap aayegi. Maths mein long method hi tumhara asli dushman hai.";
    blocks.push(
      B("QA", "Formulas: " + Q1.name + " + " + Q2.name, Q1.name + ": " + Q1.tip + " || " + Q2.name + ": " + Q2.tip, 30, [Q1.links[0], Q2.links[0]]),
      B("QA", Q1.name + " — 25 Q", "25 questions, SHORT method se — long method se sahi hua to bhi galat aadat hai. Jo 90 sec mein na bane, chhodo aur solution ka method dekho.", 60, Q1.links.slice(1), A(Q1.auto, 25)),
      B("QA", Q2.name + " — 25 Q", "25 questions, short method only. Target 60 sec/Q.", 60, Q2.links.slice(1), A(Q2.auto, 25))
    );
    if (n >= 5) blocks.push(
      B("QA", "Speed sectional", "'▶ 25 Q shuru' — time pressure ke saath. Baad mein 10 min: har slow sawal ka short method.", 45, DRILL.QA, AM(25)),
      B("QA", "Mixed 15 Q", "Ab tak ke covered types mila ke 15 questions — type pehchanna bhi skill hai.", 15, [m25("simplification-and-approximation", "Mixed")], AM(15))
    );
    else blocks.push(
      B("QA", "Calculation speed", "Calculation drill — 10 min tables/squares/percentages + aaj ke types ke 20 aur sawal.", 60, [L("/calculation", "Calc drill"), Q1.links[1]], A([...Q1.auto, ...Q2.auto], 20))
    );
    blocks.push(
      B("GA", ga1.name, "Recall-first revision: pehle khud se points likho, phir notes se milao. Phir 15 Q — jo galat hue wahi asli reading list hai.", 60, ga1.links, A(ga1.auto, 15)),
      B("GA", ga2.name, "Doosra topic, same tareeka. GS mein padhna nahi — YAAD karna hai.", 60, ga2.links, A(ga2.auto, 15)),
      B("GA", "Current Affairs", "Roz ka 30 min — Daily CA + WAR CA PYQ.", 30, CA_LINKS, CA_AUTO),
      B("GA", "Kal ka recall test", "Kal ke dono GS topics ke 20 sawal — 15+ sahi target.", 30, [war("static-gk", "WAR"), L("/pyq/gktricks", "GKTricks")], A([...gaPair(n - 1)[0].auto, ...gaPair(n - 1)[1].auto], 20)),
      B("EN", "Vocab — aaj ka day", "50 words + kal ke words ka revision. Phir 15 PYQ words.", 30, vocabLinks(n), vocabAuto(n)),
      B("EN", "Grammar: " + en.name, "Rules padho, phir practice. Rules ki chhoti sheet banate jao — Notebook mein.", 45, en.links, A(en.auto, 20)),
      B("EN", "2 RC passages", "Timed: 8-8 min. Questions pehle, passage baad mein.", 30, [pin("comprehension", "RC")]),
      B("EN", "Cloze + mixed PYQ", "1 cloze set + 20 mixed English PYQ.", 45, [pin("cloze-test", "Cloze"), pin("fill-in-the-blanks", "Fill blanks")], A([["engbank", "fill-in-the-blanks"]], 15)),
      B("GI", gi.name, "20-25 questions — 36 sec/Q target. Reasoning maintenance hai, naya seekhna nahi.", 45, gi.links, A(gi.auto, 20)),
      B("GI", n % 2 === 0 ? "Sectional drill" : "Mixed practice", n % 2 === 0 ? "'▶ 25 Q shuru' — mixed set + review. Puzzle/seating pe atakna mana — 10 sec mein skip ka faisla." : "Mixed reasoning — 20 Q speed se.", 45, n % 2 === 0 ? DRILL.GI : [rs("mathematical-operation", "Mixed")], n % 2 === 0 ? A(RS_MIX, 25) : A(RS_MIX, 20)),
      B("REV", "Mistake Notebook — 30 min", "Aaj ke wrong dekho + kal ke 5 dobara solve karo bina dekhe. Yehi compounding hai.", 30, MISTAKES)
    );
  } else if (isMock && n <= 34) {
    phase = n <= 10 ? "Foundation" : n <= 24 ? "Build" : "Integrate";
    why = "Aaj mock day hai. Mock dena aadha kaam hai — ANALYSIS asli kaam hai. Bina analysis ka mock sirf thakan hai.";
    blocks.push(
      B("MOCK", "FULL MOCK", "Mock Tests se ek SSC CGL PRE mock do" + (n >= 24 ? " — ASLI EXAM ke time pe" : "") + ". Har section 15 min. Aakhri 30 sec mein bache sab fill karo — blind guess bhi halka +EV hai.", 75, MOCK_LINKS),
      B("MOCK", "Mock ANALYSIS — 90 min", "Har galat + har skip Mistake Notebook mein dekho: type, wajah. 5 sabse mehenge sawal (jo aane chahiye the) dobara solve karo. Phir Mock Marks mein entry — graph sach bata dega.", 90, [L("/mock-marks?cat=full", "Marks entry"), ...MISTAKES]),
      B("QA", "Weak type — 25 Q", "Mock mein Maths ka jo type sabse zyada khaya, usi ke 25 questions — ya '▶ Q shuru' (rusty types apne aap).", 60, [Q1.links[1] || Q1.links[0]], AM(25)),
      B("QA", "Speed sectional", "'▶ 25 Q shuru' + 10 min review.", 45, DRILL.QA, AM(25)),
      B("QA", "DI — 2 sets", "Roz ka DI. 1 set = 3-4 pakke marks.", 30, QA_UNITS.di.links, A(QA_UNITS.di.auto, 12)),
      B("GA", ga1.name, "Recall-first revision — mock ke GS mein jo areas blank gaye, wahi pehle. Phir 15 Q.", 60, ga1.links, A(ga1.auto, 15)),
      B("GA", "Current Affairs", "Roz ka 30 min.", 30, CA_LINKS, CA_AUTO),
      B("EN", "Vocab — aaj ka day", "Roz ka fix slot.", 30, vocabLinks(n), vocabAuto(n)),
      B("EN", "RC + cloze", "2 RC + 1 cloze, timed.", 45, [pin("comprehension", "RC"), pin("cloze-test", "Cloze")]),
      B("GI", "Light drill", "'▶ 20 Q shuru' — bas haath garam.", 30, DRILL.GI, A(RS_MIX, 20)),
      B("REV", "Warning list update", "Notebook mein apni 'repeat galtiyon ki list' update karo — mock ne jo naya sikhaya.", 30, [L("/notebook", "Notebook")])
    );
  } else if (n <= 24) {
    phase = "Build";
    why = "Ab speed hi syllabus hai — 36-39 sec/sawal. Method aa gaya to speed drills se hi 15-20 wala Maths 30+ banega.";
    blocks.push(
      B("QA", "Speed sectional", "'▶ 25 Q shuru' — 15-min pressure. Target: 16+ attempts, 75%+ accuracy. 10 min review.", 45, DRILL.QA, AM(25)),
      B("QA", "DI — 2 sets", "Roz ka DI block. 3.5 min/set target.", 30, QA_UNITS.di.links, A(QA_UNITS.di.auto, 12)),
      B("QA", Q1.name + " — round 2", "25 Q time pressure ke saath: 45 sec/Q. " + Q1.tip, 60, Q1.links.slice(1), A(Q1.auto, 25)),
      B("QA", Q2.name + " — round 2", "25 Q, 45 sec/Q. " + Q2.tip, 60, Q2.links.slice(1), A(Q2.auto, 25)),
      B("QA", "Calculation — 15 min", "Roz ka calc drill — yeh QA ki speed ka engine hai.", 15, [L("/calculation", "Calc drill")]),
      B("GA", ga1.name, "Round 2 — is baar speed se: 45 min content, phir 15 Q self-test.", 60, ga1.links, A(ga1.auto, 15)),
      B("GA", ga2.name, "Doosra topic, same style.", 60, ga2.links, A(ga2.auto, 15)),
      B("GA", "Current Affairs", "30 min + purane CA notes ka 10 min revision.", 30, CA_LINKS, CA_AUTO),
      B("GA", "Sectional GK", "'▶ 25 Q shuru' — mixed GS. Jo aata hai turant, jo nahi aata guess+move.", 30, DRILL.GA, A(GS_MIX, 25)),
      B("EN", "Vocab — aaj ka day", "Naye 50 + purane ka revision.", 30, vocabLinks(n), vocabAuto(n)),
      B("EN", "Grammar revision: " + en.name, "Rules sheet dekho + 20 questions. Ab naya nahi — pakka karna hai.", 30, en.links, A(en.auto, 20)),
      B("EN", "2 RC + 1 cloze", "RC ab 7 min/passage target.", 45, [pin("comprehension", "RC"), pin("cloze-test", "Cloze")]),
      B("EN", "Sectional English", "'▶ 25 Q shuru' — mixed English. 15 min mein poore 25 yahin sabse pehle honge — pehli jeet.", 45, DRILL.EN, A(EN_MIX, 25)),
      B("GI", gi.name, "20 Q + 10 mixed. 36 sec/Q.", 45, gi.links, A(gi.auto, 20)),
      B("REV", "Mistake Notebook — 30 min", "Aaj ke wrong + parso ke 5 dobara. Repeat galti = us type ka method phir kholo.", 30, MISTAKES)
    );
  } else if (n <= 34) {
    phase = "Integrate";
    why = "Ab naya kuch nahi seekhna — jo galat ho raha hai wahi repair karna hai. Mistake Notebook ab tumhara syllabus hai.";
    blocks.push(
      B("QA", "Speed sectional", "'▶ 25 Q shuru' + review. Target: 16+ attempts, 75%+ accuracy.", 45, DRILL.QA, AM(25)),
      B("QA", "Error-repair — 90 min", "Mistake Notebook kholo. Maths ke 3 sabse repeat-hone-wale types — '▶ Q shuru' rusty types se apne aap uthata hai. Galti wahi hai jo dohraayi jaye.", 90, MISTAKES, AM(25)),
      B("QA", "DI — 2 sets", "Roz ka DI.", 30, QA_UNITS.di.links, A(QA_UNITS.di.auto, 12)),
      B("QA", "Mixed timed", "20 mixed Q, 13 min. Skip ka faisla 10 sec mein — yeh bhi drill se aata hai.", 45, [m25("simplification-and-approximation", "Mixed"), L("/calculation", "Calc")], AM(20)),
      B("GA", "Weak topic 1", "Recall-test ke hisaab se GS ka sabse kamzor topic — full revision + 15 Q.", 60, [L("/notes/static-gk", "Static notes"), L("/pyq/gktricks", "GK PYQ")], A(GS_MIX, 15)),
      B("GA", "Weak topic 2", "Doosra kamzor topic.", 60, [nt("parmar-polity", "Noteworthy Points", "Parmar"), war("static-gk")], A(GS_MIX, 15)),
      B("GA", "Sectional GK + CA", "'▶ 25 Q shuru' — mixed GS + roz ka CA.", 60, [...DRILL.GA.slice(0, 1), ...CA_LINKS.slice(0, 1)], A(GS_MIX, 25)),
      B("EN", "Sectional English", "'▶ 25 Q shuru' + review.", 30, DRILL.EN, A(EN_MIX, 25)),
      B("EN", "Vocab + weak grammar", "30 min vocab + jo rule mocks mein sabse zyada kaat raha hai.", 45, [L("/vocab", "Vocab"), L("/english/pocket", "Pocket Rules")], A(EN_MIX, 15)),
      B("EN", "RC + cloze", "2 RC + 1 cloze timed.", 45, [pin("comprehension", "RC"), pin("cloze-test", "Cloze")]),
      B("GI", "Sectional + weak topic", "'▶ 20 Q shuru' + jo type mocks mein galat ja raha uske aur 20.", 60, [...DRILL.GI.slice(0, 1), rs("puzzle", "Puzzle"), rs("sitting-arrangement", "Seating")], A([["reasonbank", "puzzle"], ["reasonbank", "sitting-arrangement"], ["reasonbank", "mathematical-operation"]], 20)),
      B("REV", "Mistake Notebook — 30 min", "Ab PATTERN dhundo: kaunsi galti baar-baar? Wahi kal ka repair hai.", 30, MISTAKES)
    );
  } else if (n === 36 || n === 38) {
    phase = "Taper";
    why = "Ab marks revision se aayenge, naye questions se nahi. Mock halka analysis, zyada revision.";
    blocks.push(
      B("MOCK", "FULL MOCK — exam time pe", "Asli exam ke time-of-day pe. Ab score se zyada RHYTHM: skip discipline, last-30-sec fill, section transitions.", 75, MOCK_LINKS),
      B("MOCK", "Analysis — 60 min", "Sirf bade patterns: kahan time doobha, kaunsa skip galat tha. Naye topics ki khudai NAHI.", 60, MISTAKES),
      B("GA", "Revision marathon", "Static GK notes + apne Notebook sheets ka revision. Recall-first. Beech mein 20 Q self-test.", 120, [L("/notes/static-gk", "Static GK"), L("/notebook", "Notebook")], A(GS_MIX, 20)),
      B("QA", "Formula sheets + 30 Q", "Brahmastra ka full pass + 30 easy-medium Q sirf confidence ke liye.", 60, [L("/notes/brahmastra", "Brahmastra"), m25("simplification-and-approximation", "Easy Q")], A([["sscmaths", "simplification-and-approximation"]], 20)),
      B("EN", "Vocab + rules sheets", "Apni sheets + Pocket Rules ka revision. Naya kuch NAHI.", 60, [L("/vocab", "Vocab"), L("/english/pocket", "Pocket Rules")]),
      B("GI", "Light drill", "'▶ 15 Q shuru' — haath garam.", 30, DRILL.GI, A(RS_MIX, 15))
    );
  } else if (n >= 35) {
    phase = "Taper";
    why = n >= 39
      ? "Ab sirf sheets, neend aur shanti. Naya sawal chhoona mana hai — jo 38 din mein banaya, ab deliver karna hai."
      : "Revision > practice. Jo banaya hai usko pakka karna hai.";
    if (n === 35 || n === 37) {
      blocks.push(
        B("GA", "GS marathon — 150 min", "Structured revision: Polity → History → Geo → Science → Economy → Static. Notes books se, recall-first.", 150, [L("/notes/polity", "Polity"), L("/notes/parmar-geography", "Geography"), L("/notes/parmar-physics", "Physics"), L("/notes/parmar-biology", "Biology"), L("/notes/parmar-static", "Static"), L("/notes/static-gk", "Rojgar Static")]),
        B("QA", "Formulas + 50 mixed Q", "Brahmastra full pass + 50 mixed questions timed sets mein — '▶ Q shuru' se 25-25 ke do set.", 150, [L("/notes/brahmastra", "Brahmastra"), m25("simplification-and-approximation", "Mixed"), L("/calculation", "Calc")], AM(25)),
        B("EN", "Vocab + rules revision", "Poori vocab list + Pocket Rules + apni sheets.", 90, [L("/vocab/bookmarks", "Saved words"), L("/english/pocket", "Pocket Rules")], A(EN_MIX, 20)),
        B("GI", "Light drill", "'▶ 15 Q shuru' + review.", 60, DRILL.GI, A(RS_MIX, 15)),
        B("REV", "Warning list — final", "Mistake Notebook ka final pass: REPEAT galtiyon ki 'exam-day warning list' banao Notebook mein (max 10 points).", 60, [...MISTAKES, L("/notebook", "Notebook")])
      );
    } else if (n === 39) {
      blocks.push(
        B("GA", "GS sheets — 120 min", "Sirf apni sheets aur notes ke highlighted hisse. Naya kuch nahi.", 120, [L("/notes/static-gk", "Static GK"), L("/notebook", "Notebook")]),
        B("QA", "Formula sheet", "Brahmastra + warning list padho.", 60, [L("/notes/brahmastra", "Brahmastra")]),
        B("EN", "Vocab final pass", "Saved words + apni sheets.", 60, [L("/vocab/bookmarks", "Saved words")]),
        B("GI", "1 halka set", "'▶ 10 Q shuru' — bas rhythm ke liye. Aaj jaldi sona — neend bhi tayari hai.", 30, DRILL.GI, A(RS_MIX, 10))
      );
    } else {
      blocks.push(
        B("REV", "Sheets — halke mann se", "GS sheets 60 min + Brahmastra 30 + vocab 30. Bas.", 120, [L("/notes/static-gk", "Static GK"), L("/notes/brahmastra", "Brahmastra"), L("/vocab/bookmarks", "Words")]),
        B("REV", "Exam logistics", "Admit card, ID, center ka raasta, nikalne ka time — sab aaj set. Kal sirf exam.", 30)
      );
    }
  }
  return { phase, why, blocks, isMock };
}

export const PLAN = {};
for (let i = 1; i <= 40; i++) PLAN[i] = planFor(i);
