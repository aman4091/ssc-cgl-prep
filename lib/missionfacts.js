// 🧠 Fact log — GS / CA / English rule / Maths trick, ek-ek line.
//
// GS ka asli hathiyar: har galat ya "pakka nahi tha" wala sawaal ek line bankar
// yahan aata hai, CLUSTER ke saath (Kerala ka dance pucha → Kerala ke saare dance
// ek line mein), kyunki SSC agli baar usi cluster ka doosra fact poochta hai.
//
// Har fact apne aap wapas aata hai: likhne ke 1, 3, 7 aur 14 din baad (spaced
// repetition). "Yaad tha" → agla padaav. "Bhool gaya" → kal phir se.
//
// Store: cgl.mission.facts — [{id, …}] ki list, isliye sync har fact ko alag
// record maanta hai (do device par alag-alag likha to dono bachte hain).

import { storeGet, storeSet } from "./bigstore";
import { dayKey } from "./daytime";
import { addDays, daysBetween } from "./mission";

const KEY = "cgl.mission.facts";
export const GAPS = [1, 3, 7, 14];

// 📥 Roz ki hadd: 120 cluster. Isse zyada due ho to sab ek din mein karne ki
// koshish mein aadha-adhura hota hai aur dher dekh ke man bhi ud jaata hai.
// Jo aaj nahi aaye wo kal apne aap aa jaate hain (due date peeche hi rehti
// hai) — isliye "backlog" ka koi alert nahi hai, sirf aaj ke 120.
export const DAILY_CAP = 120;

// Kaun pehle: D+3 aur D+7 wo padaav hain jahan yaad-daasht sabse zyada
// pakki hoti hai — wahi kabhi nahi chhootne chahiye. D+1 (kal ka likha) aur
// D+14 (purana, pehle se teen baar dohraya) intezaar kar sakte hain.
export const REV_PRIORITY = [3, 7, 1, 14];
export const REV_NOTE = "D+3 aur D+7 kabhi mat chhodo. Time kam ho to D+14 pehle kaato.";
export const FACT_SECS = [
  { k: "gs", label: "GS", icon: "🌍" },
  { k: "ca", label: "Current Affairs", icon: "📰" },
  { k: "english", label: "English", icon: "📘" },
  { k: "maths", label: "Maths trick", icon: "🧮" },
];

function read() {
  if (typeof window === "undefined") return [];
  try {
    const v = JSON.parse(storeGet(KEY) || "[]");
    // Kuch der ke liye "Aata tha" fact ko hamesha ke liye hata deta tha
    // (`learned`). Owner ne wo niyam waapas liya — aise facts phir schedule
    // mein, jis din hate the uske agle din se.
    return Array.isArray(v)
      ? v.map((f) => {
        if (!f || !f.learned) return f;
        const { learned, ...rest } = f;
        return { ...rest, step: 0, due: addDays(learned, GAPS[0]) };
      })
      : [];
  } catch { return []; }
}
function write(list) {
  try { storeSet(KEY, JSON.stringify(list)); } catch { /* quota */ }
  try { window.dispatchEvent(new CustomEvent("cgl:mission-changed")); } catch { /* SSR */ }
}

export function getFacts() { return read(); }

// zap = "⚡" wali compact line (naye GS cluster ka doosra hissa). text prose
// hai — D+1 par wahi padha jata hai; D+3 se aage sirf zap (revision tez).
export function addFact({ sec, topic, text, zap }) {
  const t = String(text || "").trim();
  const z = String(zap || "").trim();
  if (!t && !z) return null;
  const f = {
    id: `fx_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    sec: FACT_SECS.some((s) => s.k === sec) ? sec : "gs",
    topic: String(topic || "").trim().slice(0, 60),
    // Ek card = ek jagah ki SAARI baatein (notes page ke facts, ek answer ke
    // points). 600 mein wo beech se kat jati thi.
    text: (t || z).slice(0, 2000),
    ...(z ? { zap: z.slice(0, 600) } : {}),
    day: dayKey(),
    step: 0,          // kitne padaav paar kiye (0 = abhi pehla revision baaki)
    due: addDays(dayKey(), GAPS[0]),
  };
  write([f, ...read()]);
  return f;
}

export function removeFact(id) { write(read().filter((f) => f.id !== id)); }

// Sab kuch hatao — owner ne saaf karke dobara likhne ko kaha. bigstore
// delete ko darj karta hai, isliye doosre device par bhi hat jata hai
// (gayab record apne aap wapas nahi aata).
export function clearFacts() { write([]); }

// Aaj (ya pehle) jinka revision banta hai — priority ke kram mein
// (D+3 → D+7 → D+1 → D+14), aur roz ki hadd 120. cap = 0 do to poori list.
export function dueFacts(today = dayKey(), cap = DAILY_CAP) {
  const rank = (f) => {
    const i = REV_PRIORITY.indexOf(GAPS[f.step]);
    return i < 0 ? REV_PRIORITY.length : i;
  };
  const list = read()
    .filter((f) => f.step < GAPS.length && f.due && f.due <= today)
    .sort((a, b) => rank(a) - rank(b) || (a.due || "").localeCompare(b.due || ""));
  return cap > 0 ? list.slice(0, cap) : list;
}
/** Aaj kitne dikhenge (hadd ke andar). */
export function dueCount() { return dueFacts().length; }
/** Kul kitne due hain — sirf batane ke liye, ghabrane ke liye nahi. */
export function dueTotal(today = dayKey()) { return dueFacts(today, 0).length; }
/** Kis padaav ke kitne due — D+3/D+7 alag se dikhane ke liye. */
export function dueByGap(today = dayKey()) {
  const out = {};
  for (const f of dueFacts(today, 0)) {
    const g = GAPS[f.step];
    out[g] = (out[g] || 0) + 1;
  }
  return out;
}

// Yaad tha → agla padaav (likhne ke din se 1/3/7/14). Bhool gaya → kal phir.
export function reviewFact(id, remembered) {
  const today = dayKey();
  const list = read().map((f) => {
    if (f.id !== id) return f;
    if (!remembered) return { ...f, step: 0, day: today, due: addDays(today, GAPS[0]) };
    const step = f.step + 1;
    if (step >= GAPS.length) return { ...f, step, due: null };
    // Agla padaav likhne ke din se ginte hain; agar wo din nikal chuka ho to kal.
    let due = addDays(f.day, GAPS[step]);
    if (daysBetween(today, due) < 1) due = addDays(today, 1);
    return { ...f, step, due };
  });
  write(list);
}

/** Is padaav par kya padhna hai: D+1 par prose, aage sirf ⚡ line.
 *
 *  Wajah: 120 cluster ka revision block 15 minute ka hai. Pehli baar poora
 *  padhna zaroori hai (tabhi baithta hai), par teesre/saatve/chaudahve din
 *  ek nazar kaafi hai — aur poora chahiye to "⌄ poora padho" hai hi. */
export function factView(f) {
  const prose = String((f && f.text) || "").trim();
  const zap = String((f && f.zap) || "").trim();
  const short = (f && Number(f.step) > 0) && zap;
  return {
    main: short ? zap : (prose || zap),
    more: short && prose && prose !== zap ? prose : "",
    zap,
    prose,
  };
}

export function topicsInUse() {
  const cnt = {};
  for (const f of read()) if (f.topic) cnt[f.topic] = (cnt[f.topic] || 0) + 1;
  return Object.entries(cnt).sort((a, b) => b[1] - a[1]).map(([t]) => t);
}
