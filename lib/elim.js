// ✂️ Option elimination — CGL Maths (owner, paper se 2 din pehle: "agar
// question na bhi aaye toh options se kar saku… 25 mein 25").
//
// Teen cheezein:
//   TRICKS        — kaatne ke tareeke (har ek: kab lagao, kaise, ek PYQ jaisa misaal)
//   CHAPTER_TIPS  — har chapter mein pehle kya dekhna hai
//   autoHints(q)  — options ko padh kar bata do ki is sawaal par kaunsa tareeka
//                   chalega (unit digit alag? ratio ulta pada hai? range door?)
// Har PYQ ka apna hal (kya kaatna tha, kyun) public/elimbank/<chapter>.json mein.

export const TRICKS = [
  {
    k: "unit", icon: "🔚", name: "Unit digit",
    when: "Options ke aakhri ank (unit digit) alag-alag hon, aur answer guna / jod / power se banta ho.",
    how: "Poora hisaab mat karo — sirf aakhri ank ka hisaab karo. 47 × 38 ka unit = 7 × 8 = 56 → 6. Jo option 6 par khatam nahi, kaat do.",
    ex: "Total commission 30 din ka: 3 × 500 × 2% = 30, 4 × 150 × 12% = 72 → 102 × 30 = …60. Aakhri do ank dekho: options 2850 / 3000 / 3060 / 3200 mein sirf 3060 ...60 par → seedha.",
  },
  {
    k: "div", icon: "➗", name: "Divisibility (kis se kat-ta hai)",
    when: "Ratio, parts, log, cheezein — answer ko kisi number se pura katna chahiye.",
    how: "Ratio 3 : 5 hai toh total 8 se katega, har hissa 3 ya 5 ka guna. Log / cheezein hamesha poore number. 9 ka test: ankon ka jod 9 se kate; 11 ka: alternate jod ka farq.",
    ex: "A : B = 4 : 7, total ₹ ? → total 11 ka guna hona chahiye. Options 5,500 / 5,600 / 5,800 / 6,000 → sirf 5,500 (11 × 500).",
  },
  {
    k: "range", icon: "📏", name: "Andaaza (approx)",
    when: "Options ek doosre se door hon (jaise 120, 160, 210, 250).",
    how: "Number gol kar do: 19.8% ≈ 20%, 1.12³ ≈ 1.4. 5 second ka andaaza → jo pass hai wahi. Paas-paas wale do bachen tabhi exact karo.",
    ex: "₹ 8,000 par 3 saal 10% CI → 8,000 × 1.331 ≈ 10,650 → options 10,648 / 11,200 / 9,800 / 12,000 → 10,648.",
  },
  {
    k: "bound", icon: "🚧", name: "Had (limit) se bahar wale",
    when: "Hamesha — sabse pehla 2-second check.",
    how: "Discount % 100 se kam; triangle ka kon 180° se kam; probability 0–1; average sabse chhote aur sabse bade ke beech; mix ka bhaav dono bhaav ke beech; do ka saath kaam akele se jaldi; speed upstream < downstream.",
    ex: "A akela 12 din, B akela 18 din — saath? Answer 12 se KAM hoga. 15 aur 30 wale options turant bahar.",
  },
  {
    k: "form", icon: "🧩", name: "Answer ka roop",
    when: "Options mein √, π, fraction, ya alag-alag 'shakal' ho.",
    how: "Equilateral / 60° / 30° wale mein √3 aata hai; 45° mein √2; circle mein π (ya 22/7 se kat-ne wala). Fraction ka denominator sawaal ke numbers se hi banta hai.",
    ex: "Equilateral triangle, side 6 → area mein √3 hona hi chahiye → 9√3. Jisme √3 nahi, kaat do.",
  },
  {
    k: "plug", icon: "🔌", name: "Option daal ke dekho (back-solve)",
    when: "Equation banana lamba ho, par option se check 1 line ka ho (umar, number, ratio, pipe).",
    how: "Beech wala option (2nd ya 3rd) pehle daalo — chhota padha toh bade wale, bada padha toh chhote. 2 baar mein mil jaata hai.",
    ex: "Do number ka jod 45, farq 9 → option (27, 18): jod 45 ✓ farq 9 ✓. Equation ki zaroorat nahi.",
  },
  {
    k: "value", icon: "🎲", name: "Value maan lo",
    when: "Algebra (x + 1/x), trigonometry (θ), % mein 'kitna' na diya ho.",
    how: "Trig: θ = 45° ya 30° / 60° daalo, options mein bhi daalo — jo barabar aaye. Algebra: x = 1 ya chhota number. % / profit: CP = 100 maan lo.",
    ex: "sin⁴θ − cos⁴θ = ? → θ = 45° → 0. Options: 1 − 2cos²θ (= 0 ✓), 2sin²θ (= 1 ✗) … ek mein 0 aaya, wahi.",
  },
  {
    k: "trap", icon: "🪤", name: "Trap option pehchano",
    when: "Do options mein seedha rishta ho: a : b aur b : a, x aur 100 − x, aadha / dugna, ek step pehle wala number.",
    how: "Examiner galat raaste ka answer bhi rakhta hai: ulta ratio, profit ki jagah SP, loss % ki jagah gain %, CI ki jagah SI, radius ki jagah diameter. Jodi dikhe → sawaal ka aakhri shabd dobara padho ('ratio of B to A'?).",
    ex: "Areas ka ratio, sides 3 : 5 → options 3:5, 5:3, 9:25, 25:9. 3:5 trap (square nahi kiya), 25:9 trap (ulta). Bacha 9 : 25.",
  },
  {
    k: "special", icon: "📐", name: "Khaas figure maan lo",
    when: "Geometry / mensuration mein figure 'koi bhi' ho sakta hai, ya answer har case mein same.",
    how: "Triangle ko equilateral, quadrilateral ko square, point ko beech mein maan lo. Answer har case mein same hai toh khaas case se nikal aayega.",
    ex: "Triangle ke medians se bane 6 chhote triangles ka area? Equilateral maan lo → sab barabar → har ek 1/6.",
  },
  {
    k: "direct", icon: "🎯", name: "Seedha (2 line ka)",
    when: "Sawaal hi chhota ho — kaatne se zyada time seedhe hisaab mein kam lagta hai.",
    how: "Formula yaad ho toh 2 line mein karo; phir bhi answer ko had (bound) se ek baar check kar lo.",
    ex: "2.5% of 200 → 1% = 2 → 2.5% = 5.",
  },
  {
    k: "parity", icon: "⚖️", name: "Even / odd, chhota / bada",
    when: "Options mein kuch even kuch odd; ya answer positive / negative.",
    how: "Do odd ka jod even; even × kuch bhi = even. Square ka unit 2, 3, 7, 8 nahi hota. Cube ka unit cube ke unit se tay.",
    ex: "√ 5,329 = ? → unit 9 → root ka unit 3 ya 7; 70² = 4,900 se thoda zyada → 73.",
  },
];

// 📐 Chapter-wise DISHA (owner: "basics aate hain, topic ke hisaab se tukka").
// Hisaab nahi — basics se sirf itna: answer kis se bada / chhota / beech mein.
// Jahan % likha hai, wo 2025 ke PYQ par naapa hua hai (scratch chap_pat.py);
// "basics" = niyam se pakka, naapne layak pattern nahi mila.
export const CHAPTER_TIPS = {
  percentage: ["x% of A = y% of B → jiska % CHHOTA, wo number BADA.", "Badha phir utna hi ghata (ya ulta) → hamesha KAM (x²/100 ka ghaata).", "Bachat / baaki poocha → 100 − (sab %) — answer 100 se chhota %."],
  "profit-and-loss": ["Profit hai → SP > CP: SP poocha toh diye number se BADA, CP poocha toh CHHOTA (75% — baaki mein aakhri line ulti thi, dhyan se).", "Ek hi SP par x% gain aur x% loss → hamesha LOSS, 'gain' wale kaato.", "Profit % CP par — SP par bana % (chhota) trap option hota hai."],
  discount: ["SP poocha, MP diya → SP < MP (100%). MP poocha, SP diya → MP > diya hua (80%).", "Do discount a% + b% → kul (a + b)% se KAM.", "MP > SP > CP — is kram se bahar wale kaato."],
  "ratio-and-proportion": ["Answer parts ke JOD ka guna (3 : 5 → 8 se kate).", "'A to B' ya 'B to A' — ulti jodi mein se ek trap.", "Kuch jodne par ratio badla → kul pehle wale parts se bada."],
  partnership: ["Zyada paisa × zyada mahine → BADA hissa; kam wale ka hissa aadhe se kam.", "Total profit hisson ke jod se katega."],
  average: ["'Baaki ka average' → diye averages ke BAHAR, overall ke doosri taraf (75%).", "Naya aaya aur average badha → naya wala average se BADA; ghata → CHHOTA.", "Nikaala gaya aur average badha → nikla wala average se CHHOTA tha."],
  "mixture-and-alligation": ["Mix ka bhaav dono bhaav ke BEECH (88%) — jiska hissa zyada, uske PAAS.", "Paani milaya → % GHATEGA; nikaal kar paani daala → aur ghatega.", "Mix sasti ke paas hai → sasti ZYADA (ratio mein sasti ka number bada)."],
  "time-and-work": ["'Saath mein kitne din' → sabse tez akele wale se bhi KAM.", "'Akela kitne din' (saath ka diya) → saath wale din se ZYADA.", "Zyada aadmi / zyada efficiency → KAM din (ulta rishta)."],
  "pipe-and-cistern": ["Khaali karne wala pipe khula → bharne mein ZYADA samay (sirf bharne wale se).", "Sab bharne wale saath → sabse tez pipe se bhi kam samay."],
  "time-speed-and-distance": ["Average speed → diye speeds ke BEECH (91%), aur seedhe average se KAM/barabar (74%).", "km/h → m/s: number CHHOTA hota hai (× 5/18); ulta bada.", "Jaldi pahunchna hai → speed BADI; der → doori utni hi, samay zyada."],
  "problems-on-trains": ["Platform paar → sirf pole paar se ZYADA samay / lambai.", "km/h → m/s chhota number."],
  "simple-interest-si": ["SI samay ke seedha guna: dugna samay → dugna byaaj.", "Raashi n guna → % = (n − 1) × 100 / saal.", "Kam dar par zyada paisa tabhi jab average dar us dar ke paas ho."],
  "compound-interest-ci": ["CI > SI (P × R × T / 100) — usse chhote options kaato (85%).", "Amount > P; 10% par 1.1, 1.21, 1.331 ka pattern.", "n guna hone ka samay: 2 guna 4 saal → 4 guna 8, 8 guna 12."],
  "simplification-and-approximation": ["Bade number ka cube/square baaki par bhaari → answer ka sign aur size wahi se.", "Options door hon → gol karke andaaza; paas hon → unit digit."],
  "number-system": ["9 ka test: ankon ka jod 9 se kate; 11: alternate jod ka farq.", "Perfect square 2, 3, 7, 8 par khatam nahi hota."],
  algebra: ["Chhoti value maan lo (x = 1, a = b = 1) jo shart puri kare.", "a + b + c = 0 → a³ + b³ + c³ = 3abc."],
  trigonometry: ["sin, cos hamesha 0–1 (acute) — bahar wale options kaato.", "θ = 45° daal kar sawaal aur options milao.", "sin P = cos Q → P + Q = 90°."],
  "height-and-distance": ["30° / 60° → answer mein √3; 45° → unchai = doori (√ nahi).", "Dori / seedhi (hypotenuse) unchai se LAMBI."],
  geometry: ["Chord < 2 × radius (100%); radius > aadhi chord (100%).", "Tangent < centre tak doori < tangent + radius.", "Similar → area ratio = side² (bina square wala trap); kon 180° ke andar."],
  "mensuration-2d": ["Radius x% ghata → area ~2x% ghata (square).", "π wala answer 7 / 22 ke hisaab ka (11, 22, 154, 616…).", "Diagonal lambi bhuja se BADI; equilateral → √3."],
  "mensuration-3d": ["Pighla kar bana → naya radius diye sabse bade se BADA par jod se CHHOTA (volume judta hai, radius nahi).", "Volume ratio = r³, area = r²; slant height > height.", "Do hemisphere = ek sphere, wahi radius."],
  "coordinate-geometry": ["Point option mein daal ke dekho (plug).", "Doori do bindu ke farq se BADI, jod se CHHOTI."],
  "data-interpretation-di": ["Pehle andaaza — options door hote hain."],
  "elementary-statistics": ["Median sort karke; Mode = 3 Median − 2 Mean."],
  "lcm-and-hcf": ["HCF sabse chhote number se BADA nahi; LCM sabse bade se CHHOTA nahi.", "HCF × LCM = dono ka guna."],
  progression: ["AP mein beech wala = dono kinaron ka average."],
  probability: ["0 se 1 ke beech; total cases se kate."],
  "boat-and-stream": ["Downstream > upstream; nadi = farq / 2."],
};

// Option text → number (₹, Rs, %, cm, comma hata kar). Nahi bana toh null.
export function optNum(s) {
  // Unit koi bhi ho (m, km/h, litres, °…) — bas EK number ho aur ratio /
  // bhinn / √ / π na ho. Pehle unit ki list thi, "50 m" chhoot jaata tha.
  const t = String(s || "").replace(/,/g, "").replace(/Rs\.?|₹/gi, "").trim();
  if (/[:√π]|\d\s*\/\s*\d|\d\s+\d/.test(t)) return null;
  const nums = t.match(/-?\d+(?:\.\d+)?/g);
  if (!nums || nums.length !== 1) return null;
  if (!/^-?\d+(?:\.\d+)?\s*[a-z%°²³/.\s]*$/i.test(t)) return null;
  return Number(nums[0]);
}

// Is sawaal par kaunse tareeke chalenge — sirf options ki shakal se (bina hal kiye).
export function autoHints(q, chapter) {
  const out = [];
  const opts = (q.options || []).map(String);
  const nums = opts.map(optNum);
  const allNum = nums.length === 4 && nums.every((x) => x != null);
  if (allNum) {
    const ints = nums.every((x) => Number.isInteger(x));
    const units = new Set(nums.map((x) => Math.abs(Math.round(x)) % 10));
    if (ints && units.size >= 3) out.push({ k: "unit", why: `Options ke unit digit alag hain (${[...units].join(", ")}) — sirf aakhri ank ka hisaab karo.` });
    const lo = Math.min(...nums.map(Math.abs)), hi = Math.max(...nums.map(Math.abs));
    const sorted = [...nums].sort((a, b) => a - b);
    const gaps = sorted.slice(1).map((x, i) => (x - sorted[i]) / Math.max(1, Math.abs(sorted[i])));
    if (lo > 0 && Math.min(...gaps) > 0.08) out.push({ k: "range", why: `Options kam se kam ${Math.round(Math.min(...gaps) * 100)}% door — gol karke andaaza kaafi hai.` });
    if (/%/.test(opts.join(" "))) {
      for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) if (Math.abs(nums[i] + nums[j] - 100) < 0.01) out.push({ k: "trap", why: `${opts[i]} aur ${opts[j]} ka jod 100 — ek "ulta" (profit/loss, badha/ghata) wala trap hai.` });
    }
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) if (i !== j && nums[j] && Math.abs(nums[i] / nums[j] - 2) < 1e-9) { out.push({ k: "trap", why: `${opts[i]} = 2 × ${opts[j]} — radius/diameter ya aadha-dugna wala trap ho sakta hai.` }); i = 4; break; }
    if (ints && nums.some((x) => x % 2) && nums.some((x) => !(x % 2))) out.push({ k: "parity", why: "Kuch options even, kuch odd — even/odd se bhi kaat sakte ho." });
  }
  const ratio = opts.map((o) => o.replace(/\s/g, "").match(/^(\d+):(\d+)$/));
  if (ratio.every(Boolean)) {
    for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) if (ratio[i][1] === ratio[j][2] && ratio[i][2] === ratio[j][1]) out.push({ k: "trap", why: `${opts[i]} aur ${opts[j]} ulte hain — sawaal mein "kiska kisse" dobara padho.` });
  }
  const root = opts.filter((o) => /√/.test(o)).length;
  if (root && root < 4) out.push({ k: "form", why: `${root} option mein √ hai, baaki mein nahi — sawaal mein 30°/60°/equilateral ho toh √3 wala hi.` });
  if (/π|22\/7/.test(q.question || "") || opts.some((o) => /π/.test(o))) out.push({ k: "form", why: "π / 22/7 wala sawaal — answer aksar 7 ya 22 ke hisaab se gol (11, 22, 154, 616…)." });
  if (chapter === "trigonometry" || /sin|cos|tan|sec|cosec|cot/i.test(q.question || "")) out.push({ k: "value", why: "θ = 45° (ya 30°/60°) daal kar sawaal aur options dono ki value nikaalo." });
  if (chapter === "algebra" && /x|a|b/.test(q.question || "")) out.push({ k: "value", why: "x / a / b ki chhoti value maan lo (x = 1, a = b = 1) jo shart puri kare." });
  if (chapter === "geometry" || chapter === "mensuration-2d") out.push({ k: "special", why: "Figure 'koi bhi' ho toh khaas wala (equilateral / square) maan lo." });
  // Ek tareeke ki ek hi line
  const seen = new Set();
  return out.filter((x) => (seen.has(x.k + x.why) ? false : (seen.add(x.k + x.why), true)));
}

export const trickOf = (k) => TRICKS.find((t) => t.k === k);

// 🎲 Tukka — sawaal padhe BINA, sirf options se (owner: "question na aata ho
// to bhi"). Niyam 2025 ke 4,457 Maths PYQ par naape gaye (andha tukka 25%):
//   • "None of these / Cannot" — 3% baar sahi → kaato
//   • sabse bada number — sirf 17% baar sahi → kaato
//   • sabse chhota — thoda kam baar → kaato (beech ke do: 56–61% vs 50%)
//   • bache do mein: chaaro ke average ke paas wala — 32% (doosra ~31%;
//     owner ko "sabse paas" uljha laga — ye lagbhag sikka hi hai)
// Asli faayda kaatne mein: sahi answer 56–61% baar beech ke do mein.
// Milakar ~30%. Pakka answer nahi — sirf tukke ko andhe se behtar.
const NONE = /none|cannot|can't|not possible|no real|data inadequate/i;
export const TUKKA_RULES = [
  { k: "none", t: "\"None of these / Cannot be determined\" kaato", p: "3% baar sahi" },
  { k: "max", t: "Sabse BADA number kaato", p: "17% baar sahi" },
  { k: "min", t: "Sabse CHHOTA number kaato", p: "ab sahi answer 56–61% baar inhi bache do mein" },
  { k: "mid", t: "Bache do mein: chaaro ka average mann mein lagao, jo uske PAAS ho — barabar ho toh chhota wala", p: "32% vs doosra 31% — lagbhag sikka, zyada mat socho" },
];
export function tukka(options) {
  const o = (options || []).map(String);
  const steps = [];
  let left = [0, 1, 2, 3];
  const none = left.filter((i) => NONE.test(o[i]));
  if (none.length && none.length < 4) { steps.push({ k: "none", cut: none }); left = left.filter((i) => !none.includes(i)); }
  const n = o.map(optNum);
  const numeric = left.length >= 3 && left.every((i) => n[i] != null) && new Set(left.map((i) => n[i])).size === left.length;
  if (!numeric) return { steps, pick: null, left };
  const by = [...left].sort((a, b) => n[a] - n[b]);
  steps.push({ k: "max", cut: [by[by.length - 1]] });
  if (by.length === 4) steps.push({ k: "min", cut: [by[0]] });
  const mid = by.length === 4 ? by.slice(1, 3) : by.slice(0, 2);
  const avg = left.reduce((s, j) => s + n[j], 0) / left.length;
  const pick = mid.reduce((a, b) => (Math.abs(n[b] - avg) < Math.abs(n[a] - avg) ? b : a));
  steps.push({ k: "mid", cut: mid.filter((i) => i !== pick) });
  return { steps, pick, left: [pick] };
}

// Sawaal ki aakhri line (Maths Tukka ka beech ka raasta — owner: "aakhri line
// aur diye hue number dekho, answer bada ya chhota"): poora padhe bina.
export function lastLine(q) {
  const s = String(q || "").replace(/\s+/g, " ").trim();
  const parts = s.split(/(?<=[.?!])\s+/).filter(Boolean);
  return parts.length > 1 ? parts[parts.length - 1] : s.slice(-140);
}

// 🌍 GS Tukka — 2025 ke 3,443 GS PYQ (WAR: CGL/CHSL/Steno + Steno 2026) par
// naapa. Chain milakar 39% (andha 25%). Options-only steps pehle, phir sawaal.
const NONE_T = /none of|neither|no error|no improvement|no substitution|cannot be|not possible/i;
const ALL_T = /all of (the|these)|both|all the above/i;
const YEAR_T = /^\s*(\d{1,4})\s*$/;
const STOP = new Set(["the", "a", "an", "of", "and", "in", "to", "is", "for", "by", "on", "with", "at", "or", "as", "be", "was", "are", "from", "that", "this", "it"]);
const words = (s) => new Set((String(s).toLowerCase().match(/[a-z]+/g) || []).filter((w) => !STOP.has(w)));
const inter = (A, B) => [...A].filter((w) => B.has(w)).length;
export const GS_RULES = [
  { k: "none", t: "\"None of the above / Neither\" kaato", p: "sirf 5% baar sahi" },
  { k: "all", t: "\"All of the above / Both\" ho toh WAHI", p: "52% baar sahi (vs 33%)" },
  { k: "num", t: "Saal / number ho toh sabse bada aur sabse chhota kaato", p: "answer 61% baar beech ke do mein" },
  { k: "short", t: "Sabse CHHOTA option kaato", p: "sirf 16% baar sahi" },
  { k: "qword", t: "Sawaal dekho: jis option mein sawaal ka koi shabd dohraya ho — wahi", p: "41–45% (vs 25%)" },
  { k: "long", t: "Warna sabse LAMBA option", p: "39% (vs 25%)" },
];
export function tukkaGS(options, question) {
  const o = (options || []).map(String);
  const steps = [];
  let left = [0, 1, 2, 3];
  const no = left.filter((i) => NONE_T.test(o[i]));
  if (no.length && no.length < 4) { steps.push({ k: "none", cut: no }); left = left.filter((i) => !no.includes(i)); }
  const al = left.filter((i) => ALL_T.test(o[i]));
  if (al.length) { steps.push({ k: "all", pick: al[0] }); return { steps, pick: al[0], left: [al[0]], needQ: false }; }
  const n = o.map((v) => (YEAR_T.test(v) ? Number(v.match(YEAR_T)[1]) : null));
  if (left.length === 4 && n.every((v) => v != null) && new Set(n).size === 4) {
    const by = [...left].sort((a, b) => n[a] - n[b]);
    steps.push({ k: "num", cut: [by[0], by[3]] }); left = by.slice(1, 3);
  } else if (left.length >= 3) {
    const L = left.map((i) => o[i].length), mn = Math.min(...L);
    if (L.filter((x) => x === mn).length === 1) { const s = left[L.indexOf(mn)]; steps.push({ k: "short", cut: [s] }); left = left.filter((i) => i !== s); }
  }
  if (question == null) return { steps, pick: null, left, needQ: true };
  const qw = words(question);
  const ov = left.map((i) => inter(words(o[i]), qw)), best = Math.max(...ov);
  if (best > 0 && ov.filter((x) => x === best).length === 1) { const p = left[ov.indexOf(best)]; steps.push({ k: "qword", pick: p }); return { steps, pick: p, left: [p], needQ: false }; }
  const L = left.map((i) => o[i].length);
  const p = left[L.indexOf(Math.max(...L))];
  steps.push({ k: "long", pick: p });
  return { steps, pick: p, left: [p], needQ: false };
}

// 📚 English Tukka — Steno 2026 + 2025 ke 2,315 English PYQ. Chain 37%;
// jahan options poore vaakya hain (cloze / improvement / rearrange), "jo
// baaki options se sabse zyada milta ho" 69% sahi — galat options sahi wale
// ko thoda badal kar banaye jaate hain. "No error / No improvement" 3–6%.
export const EN_RULES = [
  { k: "none", t: "\"No error / No improvement / None\" kaato", p: "sirf 3–6% baar sahi" },
  { k: "contain", t: "Ek option doosre ke andar poora aata ho (go / go on) — answer unhi do mein", p: "85% (spelling mein 100%)" },
  { k: "similar", t: "Options poore vaakya hon: jo baaki teeno se SABSE ZYADA milta-julta ho — wahi", p: "69% (vs 25%)" },
  { k: "short", t: "Sabse CHHOTA option kaato", p: "sirf 18% baar sahi" },
  { k: "long", t: "Warna sabse LAMBA option", p: "34% (idioms mein 50%, error mein 48%)" },
];
export function tukkaEN(options) {
  const o = (options || []).map(String);
  const steps = [];
  let left = [0, 1, 2, 3];
  const no = left.filter((i) => NONE_T.test(o[i]));
  if (no.length && no.length < 4) { steps.push({ k: "none", cut: no }); left = left.filter((i) => !no.includes(i)); }
  const pair = new Set();
  for (const i of left) for (const j of left) if (i !== j && o[j].length > 2 && o[i].toLowerCase().includes(o[j].toLowerCase())) { pair.add(i); pair.add(j); }
  if (pair.size && pair.size < left.length) { const keep = [...pair].sort(); steps.push({ k: "contain", cut: left.filter((i) => !pair.has(i)) }); left = keep; }
  const multi = left.every((i) => o[i].split(/\s+/).length >= 3);
  if (multi && left.length >= 3) {
    const ws = Object.fromEntries(left.map((i) => [i, words(o[i])]));
    const sim = left.map((i) => left.reduce((s, j) => (j === i ? s : s + inter(ws[i], ws[j])), 0)), m = Math.max(...sim);
    if (m > 0 && sim.filter((x) => x === m).length === 1) { const p = left[sim.indexOf(m)]; steps.push({ k: "similar", pick: p }); return { steps, pick: p, left: [p], needQ: false }; }
  }
  if (left.length >= 3) {
    const L = left.map((i) => o[i].length), mn = Math.min(...L);
    if (L.filter((x) => x === mn).length === 1) { const s = left[L.indexOf(mn)]; steps.push({ k: "short", cut: [s] }); left = left.filter((i) => i !== s); }
  }
  const L = left.map((i) => o[i].length), mx = Math.max(...L);
  const p = L.filter((x) => x === mx).length === 1 ? left[L.indexOf(mx)] : left[0];
  steps.push({ k: L.filter((x) => x === mx).length === 1 ? "long" : "first", pick: p });
  return { steps, pick: p, left: [p], needQ: false };
}
