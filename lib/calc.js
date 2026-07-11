// Local speed-math generator (no AI). Fast calculation drills for SSC CGL.
import { makeId } from "./storage";

function ri(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function shuffle(a) {
  const arr = [...a];
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
  return arr;
}

// numeric MCQ: one correct + 3 near distractors
function numMcq(question, answer, explanation, type, spread) {
  const sp = spread || Math.max(2, Math.round(Math.abs(answer) * 0.06) + 2);
  const set = new Set([answer]);
  let guard = 0;
  while (set.size < 4 && guard < 80) {
    const d = answer + (Math.random() < 0.5 ? -1 : 1) * ri(1, sp + 3);
    if (d !== answer && d >= 0) set.add(d);
    guard++;
  }
  let extra = 1;
  while (set.size < 4) { set.add(answer + extra); extra++; }
  const opts = shuffle([...set]);
  return { question, options: opts.map(String), answer: opts.indexOf(answer), explanation, type, diagram: "" };
}

// string MCQ (fractions / percent): correct + distractors from a pool
function strMcq(question, answerStr, pool, explanation, type) {
  const set = new Set([answerStr]);
  for (const d of shuffle(pool)) { if (set.size >= 4) break; if (d && d !== answerStr) set.add(d); }
  let i = 0;
  while (set.size < 4) { set.add(answerStr + " "); i++; if (i > 5) break; }
  const opts = shuffle([...set]);
  return { question, options: opts, answer: opts.indexOf(answerStr), explanation, type, diagram: "" };
}

function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { [a, b] = [b, a % b]; } return a || 1; }
function fr(num, den) { if (den < 0) { num = -num; den = -den; } const g = gcd(num, den) || 1; return { num: num / g, den: den / g }; }
function frStr(f) { return f.den === 1 ? String(f.num) : `${f.num}/${f.den}`; }
function digitalRoot(n) { n = Math.abs(n); return n === 0 ? 0 : (n % 9 === 0 ? 9 : n % 9); }

const P2F = [
  ["12.5%", "1/8"], ["25%", "1/4"], ["50%", "1/2"], ["75%", "3/4"], ["20%", "1/5"], ["40%", "2/5"],
  ["60%", "3/5"], ["80%", "4/5"], ["33.33%", "1/3"], ["66.67%", "2/3"], ["16.67%", "1/6"], ["10%", "1/10"],
  ["37.5%", "3/8"], ["62.5%", "5/8"], ["87.5%", "7/8"], ["6.25%", "1/16"], ["11.11%", "1/9"], ["14.28%", "1/7"], ["8.33%", "1/12"],
];

const GENERATORS = {
  add2: () => { const a = ri(10, 99), b = ri(10, 99); return numMcq(`${a} + ${b} = ?`, a + b, `${a} + ${b} = ${a + b}`, "add2"); },
  add3: () => { const a = ri(100, 999), b = ri(100, 999); return numMcq(`${a} + ${b} = ?`, a + b, `${a} + ${b} = ${a + b}`, "add3"); },
  sub: () => { const a = ri(100, 999), b = ri(10, a); return numMcq(`${a} − ${b} = ?`, a - b, `${a} − ${b} = ${a - b}`, "sub"); },
  mul2: () => { const a = ri(11, 99), b = ri(11, 99); return numMcq(`${a} × ${b} = ?`, a * b, `${a} × ${b} = ${a * b}`, "mul2"); },
  mul3: () => { const a = ri(101, 999), b = ri(11, 99); return numMcq(`${a} × ${b} = ?`, a * b, `${a} × ${b} = ${a * b}`, "mul3"); },
  square: () => { const a = ri(11, 45); return numMcq(`${a}² = ?`, a * a, `${a}² = ${a * a}`, "square"); },
  divisibility: () => {
    const d = [3, 4, 6, 7, 8, 9, 11][ri(0, 6)];
    const n = ri(100, 9999);
    const yes = n % d === 0;
    const opts = ["Haan (Yes)", "Nahi (No)"];
    return { question: `Kya ${n}, ${d} se divisible hai?`, options: opts, answer: yes ? 0 : 1, explanation: `${n} ÷ ${d} = ${(n / d).toFixed(2)} → ${yes ? "divisible" : "nahi"}`, type: "divisibility", diagram: "" };
  },
  percent2fraction: () => {
    const [p, f] = P2F[ri(0, P2F.length - 1)];
    const pool = P2F.filter(([, ff]) => ff !== f).map(([, ff]) => ff);
    return strMcq(`${p} = kaunsa fraction?`, f, pool, `${p} = ${f}`, "percent2fraction");
  },
  approx: () => {
    const a = ri(2, 9) * 100 + ri(-6, 6);
    const b = ri(11, 89);
    const actual = a * b;
    const ans = Math.round(actual / 100) * 100;
    // distractors are ALSO round hundreds so the answer isn't an obvious giveaway
    const set = new Set([ans]);
    let step = 1;
    while (set.size < 4) { set.add(ans + step * 100); if (ans - step * 100 >= 0) set.add(ans - step * 100); step++; }
    const opts = shuffle([...set].slice(0, 4).includes(ans) ? [...set].slice(0, 4) : [ans, ...[...set].filter((x) => x !== ans).slice(0, 3)]);
    return { question: `${a} × ${b} ≈ ? (nearest 100)`, options: opts.map(String), answer: opts.indexOf(ans), explanation: `${a} × ${b} = ${actual} ≈ ${ans}`, type: "approx", diagram: "" };
  },
  digitsum: () => {
    const n = ri(1000, 999999);
    const dr = digitalRoot(n);
    const opts = shuffle([dr, ((dr) % 9) + 1, ((dr + 1) % 9) + 1, ((dr + 3) % 9) + 1].filter((v, i, arr) => arr.indexOf(v) === i));
    while (opts.length < 4) { const c = ri(1, 9); if (!opts.includes(c)) opts.push(c); }
    const o = shuffle(opts.slice(0, 4).includes(dr) ? opts.slice(0, 4) : [dr, ...opts.slice(0, 3)]);
    return { question: `${n} ka digit-sum (single digit / digital root) = ?`, options: o.map(String), answer: o.indexOf(dr), explanation: `Digits jodo baar-baar → ${dr}`, type: "digitsum", diagram: "" };
  },
  fractions: () => {
    let b = ri(2, 12), d = ri(2, 12);
    let a = ri(1, b - 1), c = ri(1, d - 1);
    const ops = ["+", "−", "×", "÷"];
    const op = ops[ri(0, 3)];
    if (op === "−" && a * d < c * b) { [a, b, c, d] = [c, d, a, b]; } // keep positive
    let num, den;
    if (op === "+") { num = a * d + c * b; den = b * d; }
    else if (op === "−") { num = a * d - c * b; den = b * d; }
    else if (op === "×") { num = a * c; den = b * d; }
    else { num = a * d; den = b * c; }
    const res = fr(num, den);
    const ans = frStr(res);
    const pool = [
      frStr(fr(res.num + 1, res.den)),
      frStr(fr(Math.max(0, res.num - 1), res.den)),
      frStr(fr(res.num, res.den + 1)),
      frStr(fr(res.num + res.den, res.den)),
      frStr(fr(res.den, res.num || 1)),
    ];
    return strMcq(`${a}/${b} ${op} ${c}/${d} = ?`, ans, pool, `= ${ans}`, "fractions");
  },
};

export const CALC_TYPES = [
  { key: "add2", label: "2-digit +", icon: "➕" },
  { key: "add3", label: "3-digit +", icon: "➕" },
  { key: "sub", label: "Subtraction", icon: "➖" },
  { key: "mul2", label: "2-digit ×", icon: "✖️" },
  { key: "mul3", label: "3-digit ×", icon: "✖️" },
  { key: "square", label: "Squares", icon: "²" },
  { key: "divisibility", label: "Divisibility", icon: "➗" },
  { key: "percent2fraction", label: "% → Fraction", icon: "％" },
  { key: "approx", label: "Approximation", icon: "≈" },
  { key: "digitsum", label: "Digit sum", icon: "🔢" },
  { key: "fractions", label: "Fractions ± × ÷", icon: "½" },
];
const ALL_KEYS = CALC_TYPES.map((t) => t.key);

export function calcTypeLabel(key) { return (CALC_TYPES.find((t) => t.key === key) || {}).label || key; }

// one question from the given types (default: all)
export function randomCalcQuestion(keys) {
  const pool = (keys && keys.length ? keys : ALL_KEYS).filter((k) => GENERATORS[k]);
  const k = pool[ri(0, pool.length - 1)];
  return GENERATORS[k] ? GENERATORS[k]() : GENERATORS.add2();
}

export function buildCalcQuestions(keys, count = 20) {
  const pool = (keys && keys.length ? keys : ALL_KEYS).filter((k) => GENERATORS[k]);
  const n = Math.min(Math.max(count, 1), 100);
  const out = [];
  for (let i = 0; i < n; i++) {
    const k = pool[i % pool.length];
    out.push(GENERATORS[k]());
  }
  return shuffle(out);
}

// ---- uploaded question pool (from PDFs/images) mixed randomly into drills ----
const CALC_POOL_KEY = "cgl.calc.pool";
export function getCalcPool() {
  if (typeof window === "undefined") return [];
  try { const r = localStorage.getItem(CALC_POOL_KEY); return r ? JSON.parse(r) : []; }
  catch { return []; }
}
export function addCalcPoolQuestions(questions) {
  const clean = (questions || []).filter((q) => q && q.question && Array.isArray(q.options) && q.options.length >= 2);
  const all = getCalcPool().concat(clean);
  localStorage.setItem(CALC_POOL_KEY, JSON.stringify(all));
  return clean.length;
}
export function clearCalcPool() { localStorage.removeItem(CALC_POOL_KEY); }

export function buildCalcQuiz(keys, count = 20, secPerQ = 12) {
  const local = buildCalcQuestions(keys, count);
  // randomly blend in some of the user's uploaded questions (up to ~40%)
  const pool = getCalcPool();
  let questions = local;
  if (pool.length) {
    const take = Math.min(pool.length, Math.max(1, Math.ceil(count * 0.4)));
    const chosen = shuffle(pool).slice(0, take);
    questions = shuffle([...local, ...chosen]).slice(0, count);
  }
  return {
    id: makeId(),
    title: "Calculation Speed Drill",
    source: "calc",
    createdAt: new Date().toISOString(),
    questions,
    timeLimitSec: questions.length * secPerQ, // speed: default 12s per question
  };
}
