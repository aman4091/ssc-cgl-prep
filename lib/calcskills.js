// 🧮 Calculation ke SKILL — har ek apne sawaal khud banata hai.
//
// Do tarah ke skill:
//   • Mental maths (yahan bane): jod, ghataav, guna ki tricks, bhaag, %,
//     √ / ∛, decimal, BODMAS, approximation, unit digit … har baar naye ank.
//   • Deck (lib/calcdecks): tables, squares, cubes, fraction→%, SI/CI,
//     formula wale — unhi ke item se random sawaal.
//
// Sawaal ki shakl: { q, a, kind: "num" | "mcq", opts?, tol? }
//   a hamesha STRING (jaise decks mein) — "37.5", "1081".
//
// Har jawab ka hisaab `cgl.calc.stats` mein { k: { n, ok, ms } } — "Kamzor
// jagah" wala roop isi se batata hai kaunsa skill kaccha hai.

import { GROUPS, buildDeck, optionsFor } from "./calcdecks";

const ri = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const r2 = (x) => Math.round(x * 100) / 100;
const s = (x) => String(r2(x));
const dig = (d) => ri(10 ** (d - 1), 10 ** d - 1);
function shuffle(a) { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; }

// Ginti ke jawab ke liye 3 "asli jaise" galat option.
export function numOpts(a) {
  const x = Number(a);
  if (Number.isNaN(x)) return [a];
  const step = Number.isInteger(x) ? 1 : 0.1;
  const mag = Math.max(1, 10 ** (Math.floor(Math.log10(Math.abs(x) || 1)) - 1));
  const cand = shuffle([x + 10 * step, x - 10 * step, x + mag, x - mag, x + 2 * step, x - 2 * step, x + 100 * step, Math.round(x * 1.1), Math.round(x * 0.9)])
    .map((v) => r2(v)).filter((v) => v >= 0 && v !== x);
  const out = [x];
  for (const c of cand) { if (out.length >= 4) break; if (!out.includes(c)) out.push(c); }
  return shuffle(out).map(String);
}
// Approx ke liye "gol" ank: 1029.8 -> 1030, 48712 -> 49000
export function nice(x) {
  if (!x) return 0;
  const p = 10 ** Math.max(0, Math.floor(Math.log10(Math.abs(x))) - 1);
  return Math.round(x / p) * p;
}

const n = (q, a, extra = {}) => ({ q, a: String(a), kind: "num", ...extra });

// ── mental maths ────────────────────────────────────────────────────────
export const ARITH = [
  { k: "add2", cat: "Jod / ghataav", icon: "➕", name: "Jod · 2 ank", tip: "Pehle dahaai jodo (40+30), phir ikaai (7+5) — 70 + 12 = 82.", gen: () => { const a = dig(2), b = dig(2); return n(`${a} + ${b}`, a + b); } },
  { k: "add3", cat: "Jod / ghataav", icon: "➕", name: "Jod · 3 ank", tip: "Baayen se jodo: saikda, phir dahaai, phir ikaai. 468+357 = 700+110+15.", gen: () => { const a = dig(3), b = dig(3); return n(`${a} + ${b}`, a + b); } },
  { k: "add4", cat: "Jod / ghataav", icon: "➕", name: "Jod · 4 + 3 ank", tip: "Ek number ko gol karo: 3998 + 457 = 4000 + 457 − 2.", gen: () => { const a = dig(4), b = dig(3); return n(`${a} + ${b}`, a + b); } },
  { k: "addn", cat: "Jod / ghataav", icon: "➕", name: "4 number ka jod", tip: "Jodi banao jo 10/100 banaye: 37 + 63 = 100.", gen: () => { const v = [dig(2), dig(2), dig(2), dig(2)]; return n(v.join(" + "), v.reduce((x, y) => x + y, 0)); } },
  { k: "sub2", cat: "Jod / ghataav", icon: "➖", name: "Ghataav · 2 ank", tip: "Aage gino: 83 − 47 → 47 se 50 (3), 50 se 83 (33) = 36.", gen: () => { const a = dig(2), b = ri(10, a); return n(`${a} − ${b}`, a - b); } },
  { k: "sub3", cat: "Jod / ghataav", icon: "➖", name: "Ghataav · 3 ank", tip: "Gol karke: 742 − 298 = 742 − 300 + 2 = 444.", gen: () => { const a = ri(300, 999), b = ri(100, a); return n(`${a} − ${b}`, a - b); } },
  { k: "sub4", cat: "Jod / ghataav", icon: "➖", name: "Ghataav · 4 − 3 ank", tip: "1000 se ghataav: har ank 9 se, aakhri 10 se.", gen: () => { const a = dig(4), b = dig(3); return n(`${a} − ${b}`, a - b); } },
  { k: "mul21", cat: "Guna / bhaag", icon: "✖️", name: "Guna · 2 × 1 ank", tip: "Tod kar: 47 × 6 = 40×6 + 7×6 = 240 + 42.", gen: () => { const a = dig(2), b = ri(2, 9); return n(`${a} × ${b}`, a * b); } },
  { k: "mul22", cat: "Guna / bhaag", icon: "✖️", name: "Guna · 2 × 2 ank", tip: "Cross (vertical) method: ikaai×ikaai, cross jod, dahaai×dahaai.", gen: () => { const a = ri(11, 99), b = ri(11, 99); return n(`${a} × ${b}`, a * b); } },
  { k: "mul31", cat: "Guna / bhaag", icon: "✖️", name: "Guna · 3 × 1 ank", tip: "358 × 7 = 300×7 + 50×7 + 8×7 = 2100 + 350 + 56.", gen: () => { const a = dig(3), b = ri(3, 9); return n(`${a} × ${b}`, a * b); } },
  { k: "mul11", cat: "Guna / bhaag", icon: "✖️", name: "× 11 trick", tip: "Do ank ke beech unka jod: 63 × 11 = 6 (6+3) 3 = 693. 10 se upar ho to haasil aage.", gen: () => { const a = ri(12, 999); return n(`${a} × 11`, a * 11); } },
  { k: "mul5", cat: "Guna / bhaag", icon: "✖️", name: "× 5 / 25 / 125", tip: "×5 = ×10÷2, ×25 = ×100÷4, ×125 = ×1000÷8.", gen: () => { const m = pick([5, 25, 125]); const a = ri(12, m === 125 ? 99 : 999); return n(`${a} × ${m}`, a * m); } },
  { k: "mulnear", cat: "Guna / bhaag", icon: "✖️", name: "100 ke paas guna", tip: "97 × 94: 100 se kami 3 aur 6 → (97−6)=91 | 3×6=18 → 9118.", gen: () => { const a = ri(88, 112), b = ri(88, 112); return n(`${a} × ${b}`, a * b); } },
  { k: "sqbig", cat: "Guna / bhaag", icon: "²", name: "Square · 51 – 99", tip: "50 ke paas: 57² = (25+7)|7² = 32|49 = 3249. 100 ke paas: 96² = (96−4)|4² = 9216.", gen: () => { const a = ri(51, 99); return n(`${a}²`, a * a); } },
  { k: "div", cat: "Guna / bhaag", icon: "➗", name: "Bhaag (poora bate)", tip: "Bhaajak ka table socho: 1344 ÷ 7 → 7 × 192.", gen: () => { const b = ri(3, 19), q = ri(12, 250); return n(`${b * q} ÷ ${b}`, q); } },
  { k: "pct", cat: "% / fraction", icon: "％", name: "x% of y", tip: "10% = /10, 5% = uska aadha, 12.5% = 1/8, 25% = 1/4, 75% = 3/4.", gen: () => { const p = pick([5, 10, 12.5, 15, 20, 25, 30, 40, 50, 60, 75]); const y = ri(2, 60) * 40; return n(`${p}% of ${y}`, s((p * y) / 100), { tol: 0.01 }); } },
  { k: "pctch", cat: "% / fraction", icon: "％", name: "% badhao / ghatao", tip: "20% badha = ×1.2, 15% ghata = ×0.85.", gen: () => { const p = pick([10, 20, 25, 50, 5, 15]); const up = Math.random() < 0.5; const y = ri(2, 50) * 20; return n(`${y} ${up ? "+" : "−"} ${p}%`, s(y * (up ? 1 + p / 100 : 1 - p / 100)), { tol: 0.01 }); } },
  { k: "dec", cat: "% / fraction", icon: "•", name: "Decimal guna", tip: "Decimal hata kar guna karo, phir dono ke decimal jitni jagah wapas.", gen: () => { const a = ri(11, 99) / 10, b = ri(2, 99) / 10; return n(`${a} × ${b}`, s(a * b), { tol: 0.001 }); } },
  { k: "sqrt", cat: "Power / root", icon: "√", name: "Square root", tip: "Aakhri ank se ikaai (1→1/9, 4→2/8, 6→4/6, 9→3/7), baaki se dahaai.", gen: () => { const a = ri(11, 60); return n(`√${a * a}`, a); } },
  { k: "cbrt", cat: "Power / root", icon: "∛", name: "Cube root", tip: "Aakhri ank: 2↔8, 3↔7, baaki wahi. Pehle 3 ank chhod kar baaki se dahaai.", gen: () => { const a = ri(2, 30); return n(`∛${a ** 3}`, a); } },
  { k: "unit", cat: "Power / root", icon: "🔢", name: "Unit digit (aᵇ)", tip: "Cycle 4 ka: 2→2,4,8,6 · 3→3,9,7,1 · 7→7,9,3,1 · 8→8,4,2,6. Power ÷ 4 ka baaki.", gen: () => { const a = ri(12, 99), b = ri(11, 99); return n(`${a}^${b} ka unit digit`, Number((BigInt(a % 10) ** BigInt(b)) % 10n)); } },
  { k: "bodmas", cat: "Simplification", icon: "🧮", name: "BODMAS", tip: "Pehle ÷ aur ×, phir + aur −, baayen se daayen.", gen: () => { const b = ri(3, 12), c = ri(2, 9), d = ri(2, 9); const e = d * ri(2, 12); const a = ri(10, 99); return n(`${a} + ${b} × ${c} − ${e} ÷ ${d}`, a + b * c - e / d); } },
  { k: "approx", cat: "Simplification", icon: "≈", name: "Approximation", tip: "Har ank ko gol karo (49.8 → 50, 20.97 → 21), phir hisaab — option sabse paas wala.", gen: () => {
    const f = pick([
      () => { const a = r2(ri(20, 99) + Math.random()), b = r2(ri(11, 49) + Math.random()); return [`${a} × ${b}`, a * b]; },
      () => { const a = r2(ri(1000, 9999) + Math.random()), b = r2(ri(11, 49) + Math.random()); return [`${a} ÷ ${b}`, a / b]; },
      () => { const p = r2(ri(11, 79) + Math.random()), y = r2(ri(200, 999) + Math.random()); return [`${p}% of ${y}`, (p * y) / 100]; },
      () => { const a = r2(ri(100, 999) + Math.random()), b = r2(ri(100, 999) + Math.random()), c = r2(ri(10, 99) + Math.random()); return [`${a} + ${b} − ${c}`, a + b - c]; },
    ])();
    const good = nice(f[1]);
    const opts = [good];
    for (const m of shuffle([0.7, 0.8, 1.25, 1.4, 0.6, 1.6])) { const v = nice(f[1] * m); if (opts.length < 4 && !opts.includes(v)) opts.push(v); }
    return { q: `≈ ${f[0]}`, a: String(good), kind: "mcq", opts: shuffle(opts).map(String), exact: f[1] };
  } },
];

// ── decks ───────────────────────────────────────────────────────────────
// Har deck ka sabse chauda hissa (aakhri variant — "Saare" / "2 – 30").
const deckCache = {};
function deckOf(gk) {
  if (!deckCache[gk]) { const g = GROUPS.find((x) => x.k === gk); deckCache[gk] = buildDeck(gk, g.variants[g.variants.length - 1].k); }
  return deckCache[gk];
}
export const DECKS = GROUPS.map((g) => ({
  k: `d:${g.k}`, cat: deckOf(g.k).kind === "num" ? "Yaad wale (deck)" : "Formula (deck)", icon: g.icon, name: g.name,
  tip: `${g.sub} — pehle 📖 Dekho (purane roop mein), phir yahan practice.`,
  deck: true, num: deckOf(g.k).kind === "num",
  gen: () => {
    const d = deckOf(g.k);
    const it = pick(d.items);
    return d.kind === "num" ? { ...it, a: String(it.a), kind: "num" } : { ...it, a: String(it.a), kind: "mcq", opts: optionsFor(it, d.items) };
  },
}));

export const SKILLS = [...ARITH, ...DECKS];
export const skillOf = (k) => SKILLS.find((x) => x.k === k) || null;

// "Mix" — sirf mental maths ke skill (decks mix nahi hote — owner ka niyam).
export function genFor(k) {
  if (k === "mix") return { ...pick(ARITH).gen(), mixK: true };
  const sk = skillOf(k) || ARITH[0];
  return sk.gen();
}
export function withK(k) {
  if (k === "mix") { const sk = pick(ARITH); return { ...sk.gen(), sk: sk.k }; }
  return { ...genFor(k), sk: k };
}

// Level ke hisaab se skill (Survival / Ladder).
export const LEVELS = [
  ["add2", "sub2", "mul21"],
  ["add3", "sub3", "mul11", "pct"],
  ["mul22", "div", "sqrt", "mul5"],
  ["add4", "sub4", "mul31", "dec", "bodmas", "pctch"],
  ["mulnear", "sqbig", "cbrt", "unit"],
];
export function genLevel(L) {
  const ks = LEVELS[Math.min(LEVELS.length - 1, Math.max(0, L))];
  const k = pick(ks);
  return { ...skillOf(k).gen(), sk: k };
}

// Jawab jaancho — "37.5" == "37.50"; tol decimal ke liye.
export function check(item, typed) {
  const t = String(typed).trim().replace(/\s+/g, "").replace(/,/g, "");
  if (!t) return false;
  if (t === String(item.a).trim()) return true;
  const x = Number(t.replace(/%/g, "")), y = Number(String(item.a).replace(/%/g, ""));
  if (Number.isNaN(x) || Number.isNaN(y)) return false;
  return Math.abs(x - y) <= (item.tol || 0) + 1e-9;
}

// ── hisaab (Kamzor jagah) ──────────────────────────────────────────────
const STAT = "cgl.calc.stats";
export function readStats() {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(STAT) || "{}") || {}; } catch { return {}; }
}
export function record(k, ok, ms) {
  if (!k || k === "mix") return;
  try {
    const all = readStats();
    const o = all[k] || { n: 0, ok: 0, ms: 0 };
    all[k] = { n: o.n + 1, ok: o.ok + (ok ? 1 : 0), ms: o.ms + Math.min(60000, ms || 0) };
    localStorage.setItem(STAT, JSON.stringify(all));
  } catch { /* quota */ }
}
