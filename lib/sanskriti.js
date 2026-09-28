// 🪔 Bharat Sanskriti ka data — PARMAR STATIC notes se.
//
//   • Folk dances + festivals: scripts/build-sanskriti.py notes.json ke
//     rajya-wise table se lib/sanskriti.json banata hai (naam, Parmar ka
//     note, trick ka shabd; har rajya ki trick line).
//   • Classical dances: neeche CLASSICAL — Parmar ke "Classical Dance" pages
//     se (symbol, purane naam, granth, mudra, guru, trick).
//
// Owner khud bhi jod sakta hai — `cgl.culture.mine` (sync hota hai).

import RAW from "./sanskriti.json";

export const STATE_NAME = {
  AP: "Andhra Pradesh", AR: "Arunachal Pradesh", AS: "Assam", BR: "Bihar", CG: "Chhattisgarh", GA: "Goa",
  GJ: "Gujarat", HP: "Himachal Pradesh", HR: "Haryana", JK: "Jammu & Kashmir", JH: "Jharkhand", KA: "Karnataka",
  KL: "Kerala", MP: "Madhya Pradesh", MN: "Manipur", ML: "Meghalaya", MZ: "Mizoram", MH: "Maharashtra",
  OD: "Odisha", NL: "Nagaland", RJ: "Rajasthan", SK: "Sikkim", TN: "Tamil Nadu", TG: "Telangana", TR: "Tripura",
  UP: "Uttar Pradesh", UK: "Uttarakhand", WB: "West Bengal", PB: "Punjab", LA: "Ladakh", LD: "Lakshadweep",
  DL: "Delhi", PY: "Puducherry", CH: "Chandigarh", AN: "Andaman & Nicobar", DN: "Dadra NH & Daman Diu",
};
// Paas-paas ke rajya — galat option inhi mein se (asli jaisa dhokha).
export const REGION = {
  N: ["JK", "LA", "HP", "PB", "HR", "DL", "UK", "UP", "CH"],
  NE: ["AR", "AS", "NL", "MN", "MZ", "TR", "ML", "SK"],
  E: ["BR", "JH", "WB", "OD"],
  W: ["RJ", "GJ", "MH", "GA", "DN"],
  S: ["AP", "TG", "KA", "KL", "TN", "PY", "LD", "AN"],
  C: ["MP", "CG"],
};
export const regionOf = (k) => Object.keys(REGION).find((r) => REGION[r].includes(k)) || "N";

export const TLABEL = { fd: "Folk dance", fs: "Festival", cd: "Classical dance" };
export const TICON = { fd: "🥁", fs: "🪔", cd: "💃" };

// ── Classical (Parmar) ──
// q: us nritya ke baare mein chhoti-chhoti baatein — har ek alag sawaal banti hai.
export const CLASSICAL = [
  {
    n: "Bharatanatyam", st: "TN",
    facts: [
      "Sabse purana classical nritya; ek hi kalakar (Ekaharya)",
      "Purane naam: Sadirattam, Dasiattam (Devadasi), Thevarattam",
      "Symbol: Agni (Fire)",
      "Mukhya mudra: Kataka Mukha Hasta",
      "Angrezon ne 1910 mein ban kiya — E. Krishna Iyer aur Rukmini Devi Arundale ne jeevit kiya",
      "Kalakshetra style / Pandanallur, Vazhuvoor, Melattur style",
      "Tanjore ke 'Nattuvanar' parivar",
      "Alarippu (phool arpan) se shuru, Tillana par ant",
      "Cilappatikaram aur Manimegalai mein zikr",
    ],
    guru: ["Rukmini Devi Arundale", "Alarmel Valli", "Padma Subrahmanyam", "Meenakshi Sundaram Pillai", "Mrinalini Sarabhai", "Bala Saraswati", "Yamini Krishnamurthy", "Leela Samson", "Shanta Dhananjayan", "Sonal Mansingh"],
    trick: "भारत की अलार्म बाजी… माता रुक्मिणी देवी के पदम छुए… सुंदर दोस्त मीनाक्षी… सारे भाइयों… बालकृष्ण लीला… धन लाकर सो गया",
  },
  {
    n: "Kuchipudi", st: "AP",
    facts: [
      "Pehle naam: Bhagavata Mela",
      "Symbol: Prithvi (Earth)",
      "Siddhendra Yogi aur Tirtha Narayanayati — 'Bhama Kalapam' (Satyabhama ki kahani)",
      "Tarangam — pital ki thaali ke kinare par nritya",
      "Pehle sirf Brahmin ladke karte the",
    ],
    guru: ["Raja Reddy", "Radha Reddy", "Yamini Reddy", "Vempati Chinna Satyam", "Vedantam Satyanarayana", "Swapna Sundari", "Shobha Naidu", "Mallika Sarabhai"],
    trick: "सरनेम में Reddy = Kuchipudi · सत्यम और सतीश लक्ष्मी… सत्यनारायण… सुंदर लड़की शोभा… कुच्ची पूड़ी",
  },
  {
    n: "Odissi", st: "OD",
    facts: [
      "Symbol: Jal (Water)",
      "Gotipua (ladke Maharis jaisa) — Odissi ka poorvaj",
      "Kelucharan Mohapatra — 'father of Odissi' (Padma Vibhushan 2000)",
      "'Adiguru' — Pankaj Charan Das",
      "Protima Gauri ne Nrityagram (Karnataka) banaya",
      "Mangalacharan se Moksha tak",
    ],
    guru: ["Kelucharan Mohapatra", "Sujata Mohapatra", "Leela Mohanty", "Pankaj Charan Das", "Madhavi Mudgal", "Sanjukta Panigrahi", "Gangadhar Pradhan", "Protima Gauri", "Bijayini Satpathy"],
    trick: "नाम में Mohapatra / Mohanty = Odissi · भूटान के प्रधान माधवी से मिलने उड़ीसा आए… विजय ने संजू और साहू को बताया",
  },
  {
    n: "Kathak", st: "UP",
    facts: [
      "'Katha' = kahani",
      "Ekmatra classical jisme Persian (Farsi) asar — Mughalon ka sanrakshan",
      "Hindustani sangeet aur Urdu ghazal par",
      "Awadh ke aakhri Nawab Wajid Ali Shah",
      "Gharane: Lucknow (Ishwari Prasad), Jaipur (Bhanuji), Banaras (Janaki Prasad)",
      "Birju Maharaj — Kalashram (Delhi, 1998)",
    ],
    guru: ["Birju Maharaj", "Lacchu Maharaj", "Shovana Narayan", "Sitara Devi", "Kamini Asthana", "Kumudini Lakhia", "Aditi Mangaldas", "Gopi Krishna"],
    trick: "अरे महाराज नारायण और देवी में आस्था रखो, प्रसाद खाओ, विद्या मिलेगी, लखपति बनोगे, सब मंगल होगा",
  },
  {
    n: "Mohiniyattam", st: "KL",
    facts: [
      "Vishnu ka stree roop 'Mohini'",
      "'Dance of Enchanters'",
      "Symbol: Vayu (Air)",
      "'Vyavaharamala' granth mein zikr",
      "24 hast mudra, koi jhatka nahi",
      "Swathi Thirunal ne jeevit kiya; Kalyanikutty Amma, V.N. Menon",
    ],
    guru: ["Kalyanikutty Amma", "Gopika Verma", "Kanak Rele", "Sunanda Nair", "Jayaprabha Menon", "Pallavi Krishnan"],
    trick: "मोहिनी गोपी के कान में सुना जय राधा कृष्णा की अम्मा",
  },
  {
    n: "Kathakali", st: "KL",
    facts: [
      "Katha = kahani, Kali = pradarshan",
      "Sirf mard kalakar",
      "Hara chehra (Pacha) = shakti; laal = burai — 'mask dance'",
      "5 vesham: Pacha, Kathi, Thadi, Kari, Minukku",
      "Sanskritised Malayalam; Ramayana-Mahabharata",
      "Vallathol ne Kerala Kalamandalam banaya",
    ],
    guru: ["Kalamandalam Gopi", "Guru Kunchu Kurup", "Gopinath", "Kottakkal Nandakumaran Nair", "Mrinalini Sarabhai"],
    trick: "बाल मिले ना मिले, कुछ गोपी की कली मिल जाए",
  },
  {
    n: "Manipuri", st: "MN",
    facts: [
      "Vaishnav, antarmukhi nritya",
      "Jayadeva ki Gita Govinda ki Ashtapadi gaayi jaati",
      "Raas Leela — pravartak Rajarshi Bhagya Chandra",
      "Sankirtan — Jagoi aur Cholom (pung = dhol)",
      "Thang-Ta — yuddh nritya",
      "Guru Bipin Singh ko 'Hanjaba' upaadhi",
    ],
    guru: ["Guru Bipin Singh", "Jhaveri Sisters", "Kalavati Devi", "Bimbavati Devi", "Rajkumar Singhajit Singh", "Nirmala Mehta", "Charu Mathur"],
    trick: "Surname mein 'Devi' = aksar Manipuri (Kalavati, Bimbavati, Gambhini Devi)",
  },
  {
    n: "Sattriya", st: "AS",
    facts: [
      "2000 mein classical ghoshit (sabse naya)",
      "Sansthapak: Srimanta Sankardeva",
      "Krishna par; Vaishnav",
      "Ankiya Naat — Brajavali mein ek-ank natak ('Bhaona')",
      "Chali, Jhumura, Nadu Bhangi",
    ],
    guru: ["Jatin Goswami", "Ghanakanta Bora", "Indira Bora", "Maniram Dutta", "Sharodi Saikia", "Bhupen Hazarika"],
    trick: "Sankardeva ke Satra (math) se — Sattriya",
  },
];

// Sangeet Natak Akademi: 8, Sanskriti Mantralaya: 9 (+ Chhau). Natyashastra — Bharat Muni.
export const CLASSICAL_FACTS = [
  "Sangeet Natak Akademi — 8 classical; Sanskriti Mantralaya — 9 (Chhau ke saath)",
  "Natya Shastra ('Pancham Veda') — Bharat Muni",
  "Abhinaya Darpana — Nandikeshvara",
  "Nritta = shuddh nritya; Nritya = nritya + bhaav",
  "Lasya = stree (Parvati); Tandava = purush (Shiva)",
  "Kalakshetra — Rukmini Devi Arundale (1936)",
  "Darpana Academy — Mrinalini & Vikram Sarabhai (1949, Ahmedabad)",
  "Kadam School — Kumudini Lakhia (1967, Ahmedabad)",
  "Nehru Manipur Dance Academy — 1954, Imphal",
];

export const TRICKS = RAW.tricks;
export const EXTRA = RAW.extra;

// ── Sab ek list mein ──
// { id, t, st, n, note, hook, q?, a? }  — classical se do tarah ke item:
//   "kis rajya ka"  (n = naam)  aur  "ye baat / guru kis nritya ki" (q → a)
export function allItems(mine = []) {
  const out = RAW.items.map((x, i) => ({ ...x, id: `${x.t}:${x.st}:${i}` }));
  for (const c of CLASSICAL) {
    out.push({ id: `cd:${c.n}`, t: "cd", st: c.st, n: c.n, note: c.facts.slice(0, 3).join(" · "), hook: "" });
  }
  for (const x of mine) if (x && x.n && x.st && x.t) out.push({ ...x, id: `my:${x.id}`, mine: true, hook: "" });
  return out;
}
// Classical ke andar ke sawaal: baat → nritya, guru → nritya.
export function classicalQs() {
  const qs = [];
  for (const c of CLASSICAL) {
    for (const f of c.facts) qs.push({ id: `cf:${c.n}:${f}`, q: f, a: c.n, kind: "fact" });
    for (const g of c.guru) qs.push({ id: `cg:${c.n}:${g}`, q: g, a: c.n, kind: "guru" });
  }
  return qs;
}

// Ek hi naam kai rajya mein ho sakta hai (Kolattam: AP, KA, KL…) — galat
// option banate waqt un sab rajyon ko bahar rakho.
export const norm = (s) => String(s || "").toLowerCase().replace(/\(.*?\)/g, "").replace(/[^a-z]/g, "");
export function statesOfName(items, n) {
  const k = norm(n);
  return new Set(items.filter((x) => norm(x.n) === k).map((x) => x.st));
}

// ── Owner ke jode hue ──
const MINE = "cgl.culture.mine";
export function readMine() {
  if (typeof window === "undefined") return [];
  try { const v = JSON.parse(localStorage.getItem(MINE) || "[]"); return Array.isArray(v) ? v : []; } catch { return []; }
}
export function writeMine(list) {
  try { localStorage.setItem(MINE, JSON.stringify(list)); } catch { /* quota */ }
  try { window.dispatchEvent(new CustomEvent("cgl:culture-mine")); } catch { /* SSR */ }
}

// ── Galti ginti (sync) — galat wala baar-baar aata hai ──
const GKEY = "cgl.culture.galti";
export function readGalti() {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(GKEY) || "{}") || {}; } catch { return {}; }
}
// 🔁 Har jodi kitni baar aa chuki (sahi mili ho ya galat) — har jodi kam
// se kam SEEN_GOAL baar aaye, tab tak kam aayi hui pehle.
const SKEY = "cgl.culture.seen";
export const SEEN_GOAL = 50;
export function readSeen() {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(SKEY) || "{}") || {}; } catch { return {}; }
}
export function bumpSeen(id) {
  try {
    const s = readSeen();
    s[id] = (s[id] || 0) + 1;
    localStorage.setItem(SKEY, JSON.stringify(s));
  } catch { /* quota */ }
}

export function markGalti(id, ok) {
  try {
    const g = readGalti();
    if (ok) { if (g[id]) { g[id] -= 1; if (g[id] <= 0) delete g[id]; } } else g[id] = Math.min(3, (g[id] || 0) + 2);
    localStorage.setItem(GKEY, JSON.stringify(g));
  } catch { /* quota */ }
}

