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

export function addFact({ sec, topic, text }) {
  const t = String(text || "").trim();
  if (!t) return null;
  const f = {
    id: `fx_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    sec: FACT_SECS.some((s) => s.k === sec) ? sec : "gs",
    topic: String(topic || "").trim().slice(0, 60),
    text: t.slice(0, 600),
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

// Aaj (ya pehle) jinka revision banta hai. Sabse purana pehle.
export function dueFacts(today = dayKey()) {
  return read()
    .filter((f) => f.step < GAPS.length && f.due && f.due <= today)
    .sort((a, b) => (a.due || "").localeCompare(b.due || ""));
}
export function dueCount() { return dueFacts().length; }

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

export function topicsInUse() {
  const cnt = {};
  for (const f of read()) if (f.topic) cnt[f.topic] = (cnt[f.topic] || 0) + 1;
  return Object.entries(cnt).sort((a, b) => b[1] - a[1]).map(([t]) => t);
}
