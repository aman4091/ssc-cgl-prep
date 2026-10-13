// 🪔 Statics (festival / tribe / dance …) — Gemini ke jawab (components/StaticsInfo
// ke STATICS_PROMPT ki 12 headings) se alag-alag hisse nikalna, taaki /statics
// page par yaad karne ke roop (components/StaticsLayouts) unse khel sakein.

const FIELDS = [
  ["kya", /kya\s*hai|what\s*is|parichay/i],
  ["state", /state|region|rajya/i],
  ["tribe", /tribe|community|janjati|samuday/i],
  ["kab", /^kab\b|\bwhen\b|mahina|month|season/i],
  ["god", /god|deity|devta|devi/i],
  ["meaning", /meaning|matlab|arth/i],
  ["story", /kyun|story|katha|itihaas/i],
  ["kaise", /kaise|ritual|rasm/i],
  ["special", /special|unesco|\bgi\b/i],
  ["confusion", /confusion|milte/i],
  ["ssc", /ssc|pyq|exam angle/i],
  ["trick", /trick|yaad/i],
];
export const FIELD_LABEL = {
  kya: "Kya hai", state: "State / Region", tribe: "Tribe / Community", kab: "Kab", god: "Devta",
  meaning: "Matlab", story: "Kyun / Katha", kaise: "Kaise", special: "Khaas baat", confusion: "Confusion", ssc: "SSC angle", trick: "⚡ Trick",
};

// "1. **Kya hai** — …", "### 2. State / Region", "**Kab:** …" — sab chalega.
const HEAD = /^\s*(?:#{1,4}\s*)?(?:\d{1,2}[.)]\s*)?(\*\*|__)?\s*([^*_\n]{2,48}?)\s*(\*\*|__)?\s*(?:[:：—–-]+\s*(.*))?$/;
function headOf(line) {
  const m = HEAD.exec(line);
  if (!m) return null;
  const marked = /^\s*(#|\d{1,2}[.)]|\*\*|__)/.test(line);
  if (!marked) return null;
  const name = m[2].replace(/[*_#]/g, "").trim();
  for (const [k, re] of FIELDS) if (re.test(name) && name.length <= 40) return { k, rest: (m[4] || "").trim() };
  return null;
}

export function parseStatic(text) {
  const out = {};
  let cur = null;
  for (const line of String(text || "").split("\n")) {
    const h = headOf(line);
    if (h) { cur = h.k; out[cur] = out[cur] ? `${out[cur]}\n${h.rest}` : h.rest; continue; }
    if (cur) out[cur] = `${out[cur] || ""}\n${line}`;
  }
  for (const k of Object.keys(out)) out[k] = out[k].trim();
  return out;
}

export const plain = (s) => String(s || "").replace(/\*\*|__|`|#+\s*/g, "").replace(/^\s*[-*•]\s*/gm, "").replace(/\s+/g, " ").trim();
export const firstLine = (s, n = 90) => { const t = plain(String(s || "").split("\n").find((l) => l.trim()) || ""); return t.length > n ? `${t.slice(0, n - 1)}…` : t; };

const STATES = ["Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Jammu", "Kashmir", "Ladakh", "Delhi", "Puducherry", "Lakshadweep", "Andaman", "Chandigarh", "Dadra", "Daman"];
const ALIAS = { orissa: "Odisha", "u.p": "Uttar Pradesh", " up ": "Uttar Pradesh", "m.p": "Madhya Pradesh", bengal: "West Bengal", "tamilnadu": "Tamil Nadu", "j&k": "Jammu", uttaranchal: "Uttarakhand" };
export function stateOf(f) {
  const t = ` ${plain(f.state || f.kya || "")} `;
  const lo = t.toLowerCase();
  let best = null;
  for (const s of STATES) { const i = lo.indexOf(s.toLowerCase()); if (i >= 0 && (best == null || i < best.i)) best = { s, i }; }
  if (best) return best.s === "Jammu" || best.s === "Kashmir" ? "Jammu & Kashmir" : best.s;
  for (const [a, s] of Object.entries(ALIAS)) if (lo.includes(a)) return s;
  return firstLine(f.state, 30) || "—";
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const HINDI = [["magh", 0], ["phalgun", 1], ["falgun", 1], ["chaitra", 2], ["chait", 2], ["vaishakh", 3], ["baisakh", 3], ["jyeshtha", 4], ["jeth", 4], ["ashadh", 5], ["asadh", 5], ["shravan", 6], ["sawan", 6], ["bhadrapad", 7], ["bhado", 7], ["ashwin", 8], ["kwar", 8], ["kartik", 9], ["margashirsha", 10], ["agahan", 10], ["paush", 11], ["poush", 11]];
// -> 0..11 ya -1
export function monthOf(f) {
  const lo = plain(f.kab || "").toLowerCase();
  if (!lo) return -1;
  let best = { i: Infinity, m: -1 };
  MONTHS.forEach((m, k) => { for (const n of [m.toLowerCase(), m.slice(0, 3).toLowerCase() + " "]) { const i = lo.indexOf(n); if (i >= 0 && i < best.i) best = { i, m: k }; } });
  for (const [n, k] of HINDI) { const i = lo.indexOf(n); if (i >= 0 && i < best.i) best = { i, m: k }; }
  return best.m;
}
export const MONTH_NAMES = MONTHS;

const TYPES = [["🎉 Festival", /festival|tyohar|parv|utsav|parab/i], ["💃 Dance", /dance|nritya|naach/i], ["👥 Tribe", /tribe|janjati|adivasi/i], ["🛕 Devta / Mandir", /deity|devta|devi|god|temple|mandir/i], ["🎪 Mela", /mela|fair/i], ["🎵 Geet / Sangeet", /song|geet|music|sangeet/i], ["🎨 Kala", /painting|art|craft|kala/i], ["🥁 Vadya", /instrument|vadya/i]];
export function typeOf(f, term = "") {
  const t = `${plain(f.kya || "")} ${term}`;
  for (const [l, re] of TYPES) if (re.test(t)) return l;
  return "📎 Baaki";
}
