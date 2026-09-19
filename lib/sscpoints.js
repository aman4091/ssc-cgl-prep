// 🎯 Zaroori baatein — jawab ke andar jo SSC ke kaam ki ek-line baatein
// hoti hain ("🎯 SSC EXTRA" ke bullet, aur "📝 ONE-LINER"), wo sab ek jagah.
//
// Fact log (lib/missionfacts) cluster ke liye hai — poora group ek line
// mein. Ye uska chhota bhai hai: ek-ek alag baat, jaise answer mein aati
// hai, waise hi. Dono alag store hain taaki cluster revision aur ye ek
// doosre mein na ghul jaayein.
//
// `cgl.ssc.points` — list of { id, text, topic, src, at }. Baaki cgl.
// keys ki tarah sync hoti hai, aur har point apna record (list hai, to
// har element alag) — do device par alag-alag jude to dono bachte hain.

import { storeGet, storeSet } from "./bigstore";
import { dayKey } from "./daytime";

const KEY = "cgl.ssc.points";

function read() {
  if (typeof window === "undefined") return [];
  try {
    const v = JSON.parse(storeGet(KEY) || "[]");
    return Array.isArray(v) ? v.filter((p) => p && p.text) : [];
  } catch { return []; }
}
function write(list) {
  try { storeSet(KEY, JSON.stringify(list)); } catch { /* quota */ }
  try { window.dispatchEvent(new CustomEvent("cgl:points-changed")); } catch { /* SSR */ }
}

export function getPoints() { return read(); }

export function addPoint({ text, topic = "", src = "" }) {
  const t = String(text || "").trim();
  if (!t) return null;
  const p = {
    id: `pt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    text: t.slice(0, 400),
    topic: String(topic || "").trim().slice(0, 60),
    src: String(src || "").slice(0, 60),
    at: dayKey(),
  };
  write([p, ...read()]);
  return p;
}

export function removePoint(id) { write(read().filter((p) => p.id !== id)); }
export function clearPoints() { write([]); }

// ── Jawab se baatein nikaalna ────────────────────────────────────────────
//
// GS ka jawab is shakl mein aata hai (lib/answerprompts / overlay ai_prompts):
//   ✅ ANSWER … 🧩 CLUSTER … 🎯 SSC EXTRA … 📝 ONE-LINER
// Maths/English ke prompt mein "SSC mein isse aur kya" jaisa section hota
// hai. Dono jagah kaam ki cheez ek hi hai: SSC wale section ke bullet, aur
// one-liner ki ek line. Cluster yahan JAAN-BOOJH kar nahi liya jata — uska
// apna button aur apna page hai.
const NEXT_SECTION = /^[#*\s]*(?:🎯|📝|✅|📌|🔍|📚|🧠|🧩|⚡)/m;

function sectionAfter(md, re) {
  const h = re.exec(md);
  if (!h) return "";
  const rest = md.slice(h.index + h[0].length);
  const nx = NEXT_SECTION.exec(rest);
  return nx ? rest.slice(0, nx.index) : rest;
}

function bulletsOf(body) {
  return String(body || "")
    .split("\n")
    .map((l) => l.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, "").replace(/\*\*/g, "").trim())
    .filter((l) => l.length > 8);
}

/** -> { lines: [...], topic } ya null */
export function pointsOf(md) {
  const s = String(md || "");
  const lines = [];
  // 🎯 SSC EXTRA (ya koi bhi "SSC" wala heading)
  const extra = sectionAfter(s, /^[#*\s]*🎯\s*\**[^\n]*\n/m)
    || sectionAfter(s, /^[#*\s]*#{0,3}\s*[^\n]*SSC[^\n]*\n/m);
  lines.push(...bulletsOf(extra));
  // 📝 ONE-LINER — poora jawab ek line mein, revision ke liye sabse kaam ka
  const one = bulletsOf(sectionAfter(s, /^[#*\s]*📝\s*\**[^\n]*\n/m));
  lines.push(...one);
  const uniq = [...new Set(lines.map((l) => l.trim()))].filter(Boolean);
  if (!uniq.length) return null;
  // Topic: cluster wali pehli bold label, warna kuch nahi.
  const label = (/\*\*([^*]+?)\*\*/.exec(s) || [])[1] || "";
  return { lines: uniq.slice(0, 12), topic: label.replace(/\*\*|:$/g, "").trim().slice(0, 60) };
}
