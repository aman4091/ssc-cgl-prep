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

// Har chapter: pehle 3 second mein kya dekhna hai (CGL 2025 ke sawaalon se).
export const CHAPTER_TIPS = {
  percentage: ["Base 100 maan lo — fraction mein socho (12.5% = 1/8, 16.66% = 1/6).", "Badhna phir ghatna: a + b + ab/100. Barabar % ho toh hamesha ghaata.", "Answer % mein ho toh 100 se bada/chhota check (bound)."],
  "profit-and-loss": ["CP = 100 maan lo — har sawaal 2 line ka.", "Trap: profit % CP par hota hai, SP par nahi; 'gain' ki jagah 'SP' wala option.", "Dishonest dukandaar: (asli − nakli) / nakli."],
  discount: ["Do discount: a + b − ab/100. 'Equivalent single discount' hamesha jod se kam.", "MP > SP > CP — had se bahar options kaato.", "Discount MP par, profit CP par — galti wala option zaroor hota hai."],
  "ratio-and-proportion": ["Answer ratio ke parts ka guna (divisibility).", "a : b ulta pada hoga — 'B to A' dobara padho.", "Parts method: diya ÷ uske parts × maange parts."],
  partnership: ["Profit ratio = paisa × mahine. Total profit ratio ke jod se katega.", "Bich mein paisa nikaala/daala — mahine alag-alag gino."],
  average: ["Average sabse chhote aur sabse bade ke beech (bound).", "Naya aaya: purana avg ± (farq ÷ naye log) — deviation method.", "Galat entry: farq ÷ ginti."],
  "mixture-and-alligation": ["Mix ka bhaav dono bhaav ke beech (bound).", "Alligation se ratio, phir answer ratio ka guna (divisibility).", "Replacement: bacha = shuru × (1 − x/total)ⁿ."],
  "time-and-work": ["Saath ka kaam akele se kam din (bound).", "Total kaam = LCM — din hamesha LCM ke factor se.", "Efficiency ratio ulta din ratio — trap option."],
  "pipe-and-cistern": ["Khaali karne wala pipe minus.", "Total = LCM; options back-solve karo."],
  "time-speed-and-distance": ["Average speed (barabar doori) = 2ab/(a + b), hamesha simple average se kam.", "km/h ↔ m/s: × 5/18 — unit wala trap.", "Relative speed: same direction ghatao, opposite jodo."],
  "problems-on-trains": ["Train pole paar: apni lambai; platform paar: dono lambai jodo.", "× 5/18 bhoola option zaroor hota hai."],
  "simple-interest-si": ["SI = PRT/100 — answer P ka seedha guna.", "Kisi raashi ke n guna hone ka % → (n − 1) × 100 / T."],
  "compound-interest-ci": ["CI > SI hamesha (2 saal se). 2 saal ka farq = P(R/100)².", "10%: 1.1, 1.21, 1.331 — andaaza se option.", "Half-yearly: dar aadhi, samay dugna."],
  "simplification-and-approximation": ["Unit digit aur andaaza — poora hisaab kabhi nahi.", "BODMAS trap: bracket chhod ke kiya hua option.", "Approx: nearest gol number par le jao, options door hain."],
  "number-system": ["Divisibility test (3, 4, 8, 9, 11) se option kaato.", "Remainder: chhote number par pattern dekho.", "Unit digit ke cycle: 2, 3, 7, 8 → 4 ka cycle."],
  algebra: ["Value maan lo: x = 1, ya x + 1/x = 2 → x = 1.", "a + b + c = 0 → a³ + b³ + c³ = 3abc.", "Symmetric expression mein a = b = c maan lo."],
  trigonometry: ["θ = 45° (ya 30° / 60°) daalo — sawaal aur option dono mein.", "sin²θ + cos²θ = 1 se seedha; tan × cot = 1.", "Answer 0, 1, 2 jaise chhote number aksar — complicated option kam."],
  "height-and-distance": ["30° / 60° → √3 aayega; 45° → height = doori.", "Answer mein √3 nahi toh shak karo (form)."],
  geometry: ["Khaas figure maan lo (equilateral, square).", "Kon 180° / 360° ke andar (bound); similar triangles → area ratio = side² (trap: bina square).", "Incircle / circumcircle: r = a/(2√3), R = a/√3."],
  "mensuration-2d": ["π wale answer 22/7 → 7 ka khel; option 22 ya 11 se kat-na chahiye.", "Equilateral → √3 zaroor (form).", "Radius vs diameter trap."],
  "mensuration-3d": ["Volume cube units, area square — unit trap.", "Ratio wale: volume ∝ r³, area ∝ r².", "π × r² h — 7 aur 22 se kaat kar dekho."],
  "coordinate-geometry": ["Point option mein daal ke equation check karo (plug).", "Slope ka sign: line upar ja rahi ya neeche.", "Mid-point = dono ka average."],
  "data-interpretation-di": ["Pehle andaaza — DI ke options door hote hain.", "% badhat: farq / purana."],
  "elementary-statistics": ["Mean–median–mode: Mode = 3 Median − 2 Mean.", "Median: pehle sort karo (trap: bina sort kiya)."],
  "lcm-and-hcf": ["HCF chhote number se bada nahi, LCM bade se chhota nahi (bound).", "HCF × LCM = do numbers ka guna."],
  progression: ["n-va term option daal ke check.", "AP mein beech wala = average."],
  probability: ["0 se 1 ke beech (bound).", "Total cases se kat-na chahiye."],
  "boat-and-stream": ["Downstream > upstream; nadi ki speed = farq / 2."],
};

// Option text → number (₹, Rs, %, cm, comma hata kar). Nahi bana toh null.
export function optNum(s) {
  const t = String(s || "").replace(/,/g, "").replace(/Rs\.?|₹|%|cm|m²|cm²|cm³|km\/h|km|m\/s|kg|litres?|days?|hours?|°|minutes?|sq\.?|units?/gi, "").trim();
  if (!/^-?\d+(\.\d+)?$/.test(t)) return null;
  return Number(t);
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
//   • bache do mein jo baaki teeno ke sabse paas — 33% vs 25%
// Milakar ~30%. Pakka answer nahi — sirf tukke ko andhe se behtar.
const NONE = /none|cannot|can't|not possible|no real|data inadequate/i;
export const TUKKA_RULES = [
  { k: "none", t: "\"None of these / Cannot be determined\" kaato", p: "3% baar sahi" },
  { k: "max", t: "Sabse BADA number kaato", p: "17% baar sahi" },
  { k: "min", t: "Sabse CHHOTA number kaato", p: "beech ke do: 56–61% (vs 50%)" },
  { k: "mid", t: "Bache do mein jo baaki teeno ke SABSE PAAS ho — wahi", p: "33% (vs 25%)" },
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
  const dist = (i) => left.reduce((s, j) => s + Math.abs(n[i] - n[j]), 0);
  const pick = mid.reduce((a, b) => (dist(b) < dist(a) ? b : a));
  steps.push({ k: "mid", cut: mid.filter((i) => i !== pick) });
  return { steps, pick, left: [pick] };
}
