// Test mode ke MCQ — 4 option, jinmein 3 galat option (distractors) SIRF
// usi shakl ke sibling cards ke answer se: rank ke sawaal mein doosre ranks,
// venue mein doosre sheher, ministry mein doosre ministries. Kisi aur
// category ka random answer ("Mysore Sandal Soap") kabhi nahi.
//
// Sibling kaun: same answer-shape (tag "ans:<kind>"), aur kram se —
//   1. same section
//   2. same part + koi topic tag milta ho
//   3. kahin bhi, bas topic tag milta ho
// Jis card ke 3 saaf siblings na milein wo Test mein aata hi nahi — nakli
// option banane se behtar hai card chhod dena.
//
// Koi import nahi (node test ke liye).

const META = /^(ans:|undated$|giveaway$|ambiguous$|\d{4}$)/;

export const kindOf = (c) => (c.tags || []).find((t) => t.startsWith("ans:")) || "ans:phrase";
const topics = (c) => (c.tags || []).filter((t) => !META.test(t));

const norm = (s) => String(s || "").toLowerCase().normalize("NFKC")
  .replace(/[‘’`´]/g, "'").replace(/[“”]/g, '"').replace(/[‐-―−-]/g, "")
  .replace(/\b(shri|smt|dr|ms|mr|mrs|prof)\b\.?/g, "").replace(/[^a-z0-9₹%]+/g, " ").trim();

function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

// "Central" state-wise table ka group hai, koi state nahi — "Which state
// launched…" ke option mein bekaar (aur bina soche katne wala).
const NOT_AN_OPTION = /^(central|centre|central government|indian government|union government)$/;

// Ek hi deck par baar-baar distractors dhoondhne ke liye index.
export function buildIndex(cards) {
  const byKind = new Map();
  for (const c of cards) {
    const k = kindOf(c);
    if (!byKind.has(k)) byKind.set(k, []);
    byKind.get(k).push(c);
  }
  return { byKind };
}

// Pad aur khitaab hata kar asli naam: "Prime Minister Narendra Modi" aur
// "PM Narendra Modi" ek hi insaan hain — dono option bane to do sahi jawab.
const TITLES = /\b(prime minister|pm|president|vice president|chief minister|cm|union minister|minister|governor|lt governor|chief justice|justice|general|gen|admiral|air chief marshal|marshal|lt|col|captain|capt|hon'?ble|sri|shri|smt|dr|prof|ms|mr|mrs|of india|india's)\b/g;
const entity = (s) => norm(s).replace(TITLES, " ").replace(/\s+/g, " ").trim();
const letters = (s) => [...s.replace(/ /g, "")].sort().join("");

// Do answer "ek jaise" — ek doosre ke andar ho to bhi (Assam / Assam and
// West Bengal), ya wahi naam doosre kram / khitaab ke saath — warna do
// sahi-lagte option ban jate.
function clash(a, b) {
  const x = norm(a), y = norm(b);
  if (!x || !y) return true;
  if (x === y || (x.length > 3 && y.includes(x)) || (y.length > 3 && x.includes(y))) return true;
  const ex = entity(a), ey = entity(b);
  if (!ex || !ey) return false;
  return ex === ey || (ex.length > 5 && ey.length > 5 && letters(ex) === letters(ey))
    || (ex.length > 5 && ey.includes(ex)) || (ey.length > 5 && ex.includes(ey));
}

/** -> 3 distractor answers, ya null agar 3 saaf siblings nahi. */
export function distractors(card, index, seed = "") {
  const kind = kindOf(card);
  const same = index.byKind.get(kind) || [];
  const tags = new Set(topics(card));
  const shares = (c) => topics(c).some((t) => tags.has(t));
  const trig = norm(card.trigger);
  const tiers = [
    same.filter((c) => c.section === card.section),
    same.filter((c) => c.section !== card.section && c.part === card.part && shares(c)),
    same.filter((c) => c.part !== card.part && shares(c)),
  ];
  const picked = [];
  for (const tier of tiers) {
    const order = tier
      .filter((c) => c.id !== card.id)
      .sort((a, b) => hash(seed + card.id + a.id) - hash(seed + card.id + b.id));
    for (const c of order) {
      if (picked.length === 3) break;
      const ans = c.answer;
      if (NOT_AN_OPTION.test(norm(ans))) continue;
      if (clash(ans, card.answer)) continue;
      if (picked.some((p) => clash(p, ans))) continue;
      // cue mein hi naam aa chuka ho ("other than A, B") — wo option bekaar
      if (norm(ans).length > 3 && trig.includes(norm(ans))) continue;
      picked.push(ans);
    }
    if (picked.length === 3) return picked;
  }
  return null;
}

/** Ek MCQ: options ka kram bhi pakka (seed se), sahi ka index saath. */
export function makeQuestion(card, index, seed = "") {
  const wrong = distractors(card, index, seed);
  if (!wrong) return null;
  const options = [card.answer, ...wrong]
    .map((o) => [o, hash(seed + "|" + card.id + "|" + o)])
    .sort((a, b) => a[1] - b[1])
    .map(([o]) => o);
  return { card, options, correct: options.indexOf(card.answer) };
}

/**
 * Test banao: filter ke baad pool, usmein se n card (seed se bikhre), sirf
 * wo jinke 4 option ban sakein.
 * @param pool   test ke liye chune hue cards
 * @param all    distractor dhoondhne ke liye poora deck (pool se bada ho sakta hai)
 */
export function buildTest(pool, all, n, seed) {
  const index = buildIndex(all);
  const order = [...pool].sort((a, b) => hash(seed + a.id) - hash(seed + b.id));
  const out = [];
  for (const c of order) {
    if (out.length >= n) break;
    const q = makeQuestion(c, index, seed);
    if (q) out.push(q);
  }
  return out;
}
