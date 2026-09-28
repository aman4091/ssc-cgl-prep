// 🧮 Calculation ka saara maal — har topic ka apna "deck".
//
// Ek deck mein do cheezein hoti hain:
//   • show  — jo PEHLE dekhna hai (table, list, formula ka panna)
//   • items — usi cheez ka test ({ q, a } — sawaal aur uska jawab)
//
// Do tarah ke deck hain:
//   • kind "num" — jawab GINTI hai, khud type karna hai (table, square, cube,
//     fraction %, SI/CI, triplet). Calculation isi se banti hai.
//   • kind "mcq" — jawab ek FORMULA/LINE hai, isliye chaar mein se chuno
//     (algebra, mensuration, trigonometry, circle, number system, average).
//
// Har topic ALAG rehta hai — test kabhi do topic ko mix nahi karta (owner:
// "sabko mix mat kario alag alag hi rakhio").

// ── chhote auzaar ────────────────────────────────────────────────────────
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
// Ginti ko saaf likho: 37.5 -> "37.5", 33.333333 -> "33.33", 49 -> "49".
const num = (x) => {
  const r = Math.round(x * 100) / 100;
  return String(r);
};

// ── 1. Tables (2 – 30) ───────────────────────────────────────────────────
function tables(lo, hi) {
  const show = range(lo, hi).map((n) => ({
    head: `${n} ka table`,
    rows: range(1, 10).map((k) => [`${n} × ${k}`, String(n * k)]),
  }));
  const items = [];
  for (const n of range(lo, hi)) for (const k of range(1, 10)) items.push({ q: `${n} × ${k}`, a: String(n * k) });
  return { kind: "num", show, items };
}

// ── 2. Squares / 3. Cubes ────────────────────────────────────────────────
function powers(lo, hi, p) {
  const f = (n) => (p === 2 ? n * n : n * n * n);
  const sym = p === 2 ? "²" : "³";
  return {
    kind: "num",
    show: [{ head: `${lo} se ${hi} tak ke ${p === 2 ? "square" : "cube"}`, rows: range(lo, hi).map((n) => [`${n}${sym}`, String(f(n))]) }],
    items: range(lo, hi).map((n) => ({ q: `${n}${sym}`, a: String(f(n)) })),
  };
}

// ── 4. Fraction → Percentage ─────────────────────────────────────────────
const FR_UNIT = range(2, 20).map((n) => [1, n]);
const FR_COMMON = [
  [2, 3], [3, 4], [2, 5], [3, 5], [4, 5], [5, 6], [3, 8], [5, 8], [7, 8],
  [2, 7], [3, 7], [4, 7], [5, 9], [7, 9], [5, 12], [7, 12], [11, 12], [3, 16], [5, 16],
];
function fracs(list) {
  const rows = list.map(([a, b]) => [`${a}/${b}`, `${num((a / b) * 100)} %`]);
  return {
    kind: "num",
    show: [{ head: "Fraction → Percentage", rows }],
    items: list.map(([a, b]) => ({ q: `${a}/${b} = ? %`, a: num((a / b) * 100), tol: 0.06 })),
  };
}

// ── 5. SI / CI ka percentage ─────────────────────────────────────────────
// Har rate par: 1 saal (wahi R), 2 saal CI, 3 saal CI, aur CI-SI ka farak.
// Ye wahi ginti hai jo paper mein baar-baar aati hai — yaad ho to sawaal
// seedha ek line mein khatam.
const RATES = [4, 5, 6.25, 8, 10, 12.5, 15, 16.66, 20, 25];
const ci2 = (r) => 2 * r + (r * r) / 100;
const ci3 = (r) => 3 * r + (3 * r * r) / 100 + (r * r * r) / 10000;
const d2 = (r) => (r * r) / 100;                        // CI - SI, 2 saal (% of P)
const d3 = (r) => (r * r * (300 + r)) / 10000;          // CI - SI, 3 saal (% of P)
function sici(which) {
  const COL = {
    "1y": ["1 saal ka CI/SI %", (r) => num(r)],
    "2y": ["2 saal ka CI %", (r) => num(ci2(r))],
    "3y": ["3 saal ka CI %", (r) => num(ci3(r))],
    "d2": ["CI − SI, 2 saal (P ka %)", (r) => num(d2(r))],
    "d3": ["CI − SI, 3 saal (P ka %)", (r) => num(d3(r))],
  };
  const keys = which === "all" ? Object.keys(COL) : [which];
  const show = keys.map((k) => ({
    head: COL[k][0],
    rows: RATES.map((r) => [`${num(r)} %`, `${COL[k][1](r)} %`]),
  }));
  const items = [];
  for (const k of keys) for (const r of RATES) items.push({ q: `${num(r)} % — ${COL[k][0]}`, a: COL[k][1](r), tol: 0.06 });
  return { kind: "num", show, items };
}

// ── 6. Circle — har radius par asli value ────────────────────────────────
// Jawab π ke saath rakha hai (49π), decimal mein nahi — paper mein bhi wahi
// aata hai aur ginti saaf rehti hai.
function circle(which) {
  const A = (r) => `${r * r}π`;
  const C = (r) => `${2 * r}π`;
  const SP = (r) => `${r}π + ${2 * r}`;      // semicircle ka perimeter = πr + 2r
  const SA = (r) => `${num((r * r) / 2)}π`;  // aadhe circle ka area
  const COL = {
    area: ["Area (πr²)", A],
    circ: ["Circumference (2πr)", C],
    semi: ["Semicircle ka perimeter (πr + 2r)", SP],
    semiarea: ["Semicircle ka area (πr²/2)", SA],
  };
  const keys = which === "all" ? Object.keys(COL) : [which];
  const rs = range(1, 20);
  const show = keys.map((k) => ({ head: COL[k][0], rows: rs.map((r) => [`r = ${r}`, COL[k][1](r)]) }));
  const items = [];
  for (const k of keys) for (const r of rs) items.push({ q: `r = ${r} — ${COL[k][0]}`, a: COL[k][1](r) });
  return { kind: "mcq", show, items };
}

// ── 7. Triplets ──────────────────────────────────────────────────────────
const TRIP = [
  [3, 4, 5], [5, 12, 13], [6, 8, 10], [7, 24, 25], [8, 15, 17], [9, 12, 15],
  [9, 40, 41], [10, 24, 26], [11, 60, 61], [12, 16, 20], [12, 35, 37], [13, 84, 85],
  [15, 20, 25], [16, 30, 34], [16, 63, 65], [18, 24, 30], [20, 21, 29], [20, 99, 101],
  [28, 45, 53], [33, 56, 65], [36, 77, 85], [39, 80, 89], [48, 55, 73], [65, 72, 97],
];
function triplets() {
  const items = [];
  for (const [a, b, c] of TRIP) {
    items.push({ q: `${a}, ${b}, ?`, a: String(c) });
    items.push({ q: `${a}, ?, ${c}`, a: String(b) });
  }
  return {
    kind: "num",
    show: [{ head: "Pythagoras ke triplet", rows: TRIP.map(([a, b, c]) => [`${a}, ${b}`, String(c)]) }],
    items,
  };
}

// ── 8-13. Formula wale deck (jawab chaar mein se) ────────────────────────
// Har entry: [sawaal, jawab]. Test mein teen galat option isi deck se aate
// hain — isliye har deck ka apna maidan rehta hai, mix kabhi nahi.
const ALG_BASIC = [
  ["(a + b)²", "a² + 2ab + b²"],
  ["(a − b)²", "a² − 2ab + b²"],
  ["a² − b²", "(a + b)(a − b)"],
  ["a² + b²", "(a + b)² − 2ab"],
  ["(a + b)² − (a − b)²", "4ab"],
  ["(a + b)² + (a − b)²", "2(a² + b²)"],
  ["(a + b + c)²", "a² + b² + c² + 2(ab + bc + ca)"],
  ["(x + a)(x + b)", "x² + (a + b)x + ab"],
];
const ALG_ADV = [
  ["(a + b)³", "a³ + b³ + 3ab(a + b)"],
  ["(a − b)³", "a³ − b³ − 3ab(a − b)"],
  ["a³ + b³", "(a + b)(a² − ab + b²)"],
  ["a³ − b³", "(a − b)(a² + ab + b²)"],
  ["a³ + b³ + c³ − 3abc", "(a + b + c)(a² + b² + c² − ab − bc − ca)"],
  ["a + b + c = 0 ho to a³ + b³ + c³", "3abc"],
  ["x² + 1/x² (jab x + 1/x = k)", "k² − 2"],
  ["x² + 1/x² (jab x − 1/x = k)", "k² + 2"],
  ["x³ + 1/x³ (jab x + 1/x = k)", "k³ − 3k"],
  ["x³ − 1/x³ (jab x − 1/x = k)", "k³ + 3k"],
  ["x⁴ + 1/x⁴ (jab x + 1/x = k)", "(k² − 2)² − 2"],
];
const MENS_2D = [
  ["Square ka area", "a²"],
  ["Square ka diagonal", "a√2"],
  ["Rectangle ka diagonal", "√(l² + b²)"],
  ["Triangle ka area (base b, height h)", "½ × b × h"],
  ["Equilateral triangle ka area", "(√3/4) a²"],
  ["Equilateral triangle ki height", "(√3/2) a"],
  ["Heron ka formula", "√(s(s−a)(s−b)(s−c))"],
  ["Rhombus ka area", "½ × d₁ × d₂"],
  ["Trapezium ka area", "½ × (a + b) × h"],
  ["Parallelogram ka area", "base × height"],
  ["Circle ka area", "πr²"],
  ["Circle ka circumference", "2πr"],
  ["Sector ka area (angle θ)", "(θ/360) × πr²"],
  ["Arc ki lambai (angle θ)", "(θ/360) × 2πr"],
  ["Regular polygon ka interior angle", "(n − 2) × 180 / n"],
  ["Regular polygon ke diagonal", "n(n − 3)/2"],
];
const MENS_3D = [
  ["Cube ka volume", "a³"],
  ["Cube ka TSA", "6a²"],
  ["Cube ka diagonal", "a√3"],
  ["Cuboid ka volume", "l × b × h"],
  ["Cuboid ka TSA", "2(lb + bh + hl)"],
  ["Cuboid ka diagonal", "√(l² + b² + h²)"],
  ["Cylinder ka volume", "πr²h"],
  ["Cylinder ka CSA", "2πrh"],
  ["Cylinder ka TSA", "2πr(r + h)"],
  ["Cone ka volume", "⅓ πr²h"],
  ["Cone ka CSA", "πrl"],
  ["Cone ka TSA", "πr(r + l)"],
  ["Cone ki slant height (l)", "√(r² + h²)"],
  ["Sphere ka volume", "(4/3) πr³"],
  ["Sphere ka surface area", "4πr²"],
  ["Hemisphere ka volume", "(2/3) πr³"],
  ["Hemisphere ka TSA", "3πr²"],
  ["Prism ka volume", "base ka area × height"],
  ["Pyramid ka volume", "⅓ × base ka area × height"],
];
const TRIG_VAL = [
  ["sin 0°", "0"], ["sin 30°", "1/2"], ["sin 45°", "1/√2"], ["sin 60°", "√3/2"], ["sin 90°", "1"],
  ["cos 0°", "1"], ["cos 30°", "√3/2"], ["cos 45°", "1/√2"], ["cos 60°", "1/2"], ["cos 90°", "0"],
  ["tan 0°", "0"], ["tan 30°", "1/√3"], ["tan 45°", "1"], ["tan 60°", "√3"], ["tan 90°", "∞"],
  ["cot 30°", "√3"], ["cot 45°", "1"], ["cot 60°", "1/√3"],
  ["sec 0°", "1"], ["sec 30°", "2/√3"], ["sec 45°", "√2"], ["sec 60°", "2"],
  ["cosec 30°", "2"], ["cosec 45°", "√2"], ["cosec 60°", "2/√3"], ["cosec 90°", "1"],
];
const TRIG_ID = [
  ["sin²θ + cos²θ", "1"],
  ["1 + tan²θ", "sec²θ"],
  ["1 + cot²θ", "cosec²θ"],
  ["sin 2A", "2 sinA cosA"],
  ["cos 2A", "cos²A − sin²A = 1 − 2sin²A"],
  ["tan 2A", "2tanA / (1 − tan²A)"],
  ["sin 3A", "3 sinA − 4 sin³A"],
  ["cos 3A", "4 cos³A − 3 cosA"],
  ["tan 3A", "(3tanA − tan³A) / (1 − 3tan²A)"],
  ["sin(A + B)", "sinA cosB + cosA sinB"],
  ["cos(A + B)", "cosA cosB − sinA sinB"],
  ["sin²A − sin²B", "sin(A + B) · sin(A − B)"],
  ["sinθ · cosecθ", "1"],
  ["Max value of a sinθ + b cosθ", "√(a² + b²)"],
];
const TRI_VALUES = [
  ["Right triangle ka inradius (a, b, c)", "(a + b − c)/2"],
  ["Right triangle ka circumradius", "c/2 (hypotenuse ka aadha)"],
  ["3, 4, 5 → inradius", "1"],
  ["5, 12, 13 → inradius", "2"],
  ["7, 24, 25 → inradius", "3"],
  ["8, 15, 17 → inradius", "3"],
  ["9, 40, 41 → inradius", "4"],
  ["20, 21, 29 → inradius", "6"],
  ["Equilateral triangle ka inradius", "a / (2√3)"],
  ["Equilateral triangle ka circumradius", "a / √3"],
  ["Equilateral mein R : r", "2 : 1"],
  ["Kisi bhi triangle ka area (R ke saath)", "abc / 4R"],
  ["Kisi bhi triangle ka area (r ke saath)", "r × s"],
  ["Median ka centroid par batwara", "2 : 1"],
];
const NUM_SYS = [
  ["1 + 2 + 3 + … + n", "n(n + 1)/2"],
  ["1² + 2² + … + n²", "n(n + 1)(2n + 1)/6"],
  ["1³ + 2³ + … + n³", "[n(n + 1)/2]²"],
  ["Pehle n odd numbers ka jod", "n²"],
  ["Pehle n even numbers ka jod", "n(n + 1)"],
  ["HCF × LCM", "dono numbers ka guna"],
  ["Factors ki ginti (p^a · q^b)", "(a + 1)(b + 1)"],
  ["4 se divisible", "aakhri DO ank 4 se katein"],
  ["8 se divisible", "aakhri TEEN ank 8 se katein"],
  ["3 se divisible", "ankon ka jod 3 se kate"],
  ["9 se divisible", "ankon ka jod 9 se kate"],
  ["11 se divisible", "odd aur even jagah ke jod ka farak 0 ya 11 ka guna"],
  ["2 ke power ka unit digit chakkar", "2, 4, 8, 6 (4 ka chakkar)"],
  ["3 ke power ka unit digit chakkar", "3, 9, 7, 1 (4 ka chakkar)"],
  ["7 ke power ka unit digit chakkar", "7, 9, 3, 1 (4 ka chakkar)"],
  ["a^n − b^n hamesha divisible", "(a − b) se"],
];
const AVG = [
  ["Average", "kul jod / kul ginti"],
  ["Pehle n natural numbers ka average", "(n + 1)/2"],
  ["Lagatar numbers ka average", "(pehla + aakhri)/2"],
  ["Pehle n odd numbers ka average", "n"],
  ["Pehle n even numbers ka average", "n + 1"],
  ["Average speed (barabar doori, x aur y)", "2xy / (x + y)"],
  ["Ek aadmi aaya, average badha", "naya aadmi = purana average + (badha × nayi ginti)"],
  ["n numbers ka average A, ek number hata", "jod = nA − hataya hua"],
  ["Weighted average", "(n₁a₁ + n₂a₂) / (n₁ + n₂)"],
  ["Cricket wala: innings badhne par average", "runs = purana average + (badha × nayi innings)"],
];

function fromPairs(list) {
  return {
    kind: "mcq",
    show: [{ head: "", rows: list.map(([q, a]) => [q, a]) }],
    items: list.map(([q, a]) => ({ q, a })),
  };
}

// ── deck ki list — page par yahi dikhti hai ──────────────────────────────
export const GROUPS = [
  {
    k: "tables", name: "Tables", icon: "✖️", sub: "2 se 30 tak",
    variants: [
      { k: "2-10", label: "2 – 10" }, { k: "11-20", label: "11 – 20" },
      { k: "21-30", label: "21 – 30" }, { k: "2-30", label: "Saare (2 – 30)" },
    ],
  },
  {
    k: "square", name: "Squares", icon: "²", sub: "n × n",
    variants: [
      { k: "1-20", label: "1 – 20" }, { k: "20-30", label: "20 – 30" }, { k: "30-40", label: "30 – 40" },
      { k: "40-50", label: "40 – 50" }, { k: "1-50", label: "1 – 50" },
    ],
  },
  {
    k: "cube", name: "Cubes", icon: "³", sub: "n × n × n",
    variants: [{ k: "1-20", label: "1 – 20" }, { k: "20-30", label: "20 – 30" }, { k: "1-30", label: "1 – 30" }],
  },
  {
    k: "frac", name: "Fraction → %", icon: "％", sub: "1/8 = 12.5 %",
    variants: [
      { k: "unit", label: "1/2 – 1/20" }, { k: "common", label: "Common (2/3, 3/8, 5/8…)" },
      { k: "all", label: "Saare" },
    ],
  },
  {
    k: "sici", name: "SI / CI", icon: "💰", sub: "har rate ka %",
    variants: [
      { k: "1y", label: "1 saal" }, { k: "2y", label: "2 saal (CI)" }, { k: "3y", label: "3 saal (CI)" },
      { k: "d2", label: "CI − SI, 2 saal" }, { k: "d3", label: "CI − SI, 3 saal" }, { k: "all", label: "Saare" },
    ],
  },
  {
    k: "circle", name: "Circle values", icon: "⭕", sub: "r = 1 – 20",
    variants: [
      { k: "area", label: "Area" }, { k: "circ", label: "Circumference" },
      { k: "semi", label: "Semicircle perimeter" }, { k: "semiarea", label: "Semicircle area" },
      { k: "all", label: "Saare" },
    ],
  },
  {
    k: "trip", name: "Triplets", icon: "🔺", sub: "3, 4, 5 …",
    variants: [{ k: "all", label: "Saare triplet" }],
  },
  {
    k: "alg", name: "Algebra formulas", icon: "🧩", sub: "identities",
    variants: [{ k: "basic", label: "Basic" }, { k: "adv", label: "Advanced (a³, x + 1/x)" }, { k: "all", label: "Saare" }],
  },
  {
    k: "mens", name: "Mensuration", icon: "📐", sub: "2D aur 3D",
    variants: [{ k: "2d", label: "2D" }, { k: "3d", label: "3D" }, { k: "all", label: "Dono" }],
  },
  {
    k: "trig", name: "Trigonometry", icon: "📏", sub: "values aur identities",
    variants: [{ k: "val", label: "Standard values (0 – 90)" }, { k: "id", label: "Identities" }, { k: "all", label: "Saare" }],
  },
  {
    k: "tri", name: "Triangle ke values", icon: "🔻", sub: "inradius, circumradius",
    variants: [{ k: "all", label: "Saare" }],
  },
  {
    k: "nums", name: "Number system", icon: "🔢", sub: "jod, divisibility, unit digit",
    variants: [{ k: "all", label: "Saare" }],
  },
  {
    k: "avg", name: "Average", icon: "📊", sub: "formula aur trick",
    variants: [{ k: "all", label: "Saare" }],
  },
];

export function groupOf(k) { return GROUPS.find((g) => g.k === k) || null; }

// gk + variant -> { kind, show, items }
export function buildDeck(gk, vk) {
  const two = (v) => v.split("-").map(Number);
  switch (gk) {
    case "tables": { const [a, b] = two(vk); return tables(a, b); }
    case "square": { const [a, b] = two(vk); return powers(a, b, 2); }
    case "cube": { const [a, b] = two(vk); return powers(a, b, 3); }
    case "frac": return fracs(vk === "unit" ? FR_UNIT : vk === "common" ? FR_COMMON : [...FR_UNIT, ...FR_COMMON]);
    case "sici": return sici(vk);
    case "circle": return circle(vk);
    case "trip": return triplets();
    case "alg": return fromPairs(vk === "basic" ? ALG_BASIC : vk === "adv" ? ALG_ADV : [...ALG_BASIC, ...ALG_ADV]);
    case "mens": return fromPairs(vk === "2d" ? MENS_2D : vk === "3d" ? MENS_3D : [...MENS_2D, ...MENS_3D]);
    case "trig": return fromPairs(vk === "val" ? TRIG_VAL : vk === "id" ? TRIG_ID : [...TRIG_VAL, ...TRIG_ID]);
    case "tri": return fromPairs(TRI_VALUES);
    case "nums": return fromPairs(NUM_SYS);
    case "avg": return fromPairs(AVG);
    default: return { kind: "num", show: [], items: [] };
  }
}

// Test ka kram — har baar naya, par ek hi deck ke andar se.
export function shuffled(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// MCQ ke teen galat option — usi deck se, isliye dhokha asli jaisa lagta hai.
export function optionsFor(item, items) {
  const out = [item.a];
  const pool = shuffled(items.filter((x) => x.a !== item.a));
  for (const x of pool) {
    if (out.length >= 4) break;
    if (!out.includes(x.a)) out.push(x.a);
  }
  return shuffled(out);
}

// Type kiya hua jawab sahi hai? ("37.5" == "37.50" == " 37.5 ")
export function isRight(item, typed) {
  const t = String(typed).trim().replace(/\s+/g, "");
  if (!t) return false;
  if (t === String(item.a).trim().replace(/\s+/g, "")) return true;
  const x = Number(t.replace(/%/g, ""));
  const y = Number(String(item.a).replace(/%/g, ""));
  if (Number.isNaN(x) || Number.isNaN(y)) return false;
  return Math.abs(x - y) <= (item.tol || 0);
}
