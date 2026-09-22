// ⚡ 40-second trick — stylus wale page (/wrong/solve) ke baayen taraf.
//
// Tablet par kaam ye hai: baayen trick padho, daayen khud solve karo. Trick
// DeepSeek banata hai aur sirf utni hi hoti hai jitni 40 second mein question
// nipatane ke liye chahiye (poora solution alag button ke peeche hai).
//
// Aage ke 5 question ki trick PEECHE se banti rehti hai: tum question 1 par
// ho to 2-6 taiyar ho jate hain; 2 par pahunchte ho to sirf 7va banta hai.
// Isliye har question par rukna nahi padta — trick pehle se padi hoti hai.
//
// `cgl.quicktrick` — { [record id]: "trick" } aur detailed ke liye
// { "<id>#full": "..." }. Baaki cgl. keys ki tarah sync hoti hai, to ek device
// par bani trick doosre par muft milti hai (aur paisa dobara nahi lagta).

import { storeGet, storeSet } from "./bigstore";
import { quickTrick as askTrick, askAI } from "./client-ai";
import { getSettings } from "./storage";

const KEY = "cgl.quicktrick";
const AHEAD = 5;           // itne aage ke question peeche se ban jate hain

function read() {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(storeGet(KEY) || "{}") || {}; }
  catch { return {}; }
}
function write(v) {
  try { storeSet(KEY, JSON.stringify(v)); } catch { /* quota */ }
  try { window.dispatchEvent(new CustomEvent("cgl:trick-ready")); } catch { /* SSR */ }
}

export function getTrick(id) { return read()[id] || ""; }
export function getFull(id) { return read()[id + "#full"] || ""; }

function save(key, text) {
  const t = String(text || "").trim();
  if (!key || !t) return;
  const all = read();
  all[key] = t;
  write(all);
}

export function clearTrick(id) {
  const all = read();
  delete all[id];
  write(all);
}

// Trick kis text se bane: question ka apna text, warna OCR ka, warna uska
// answer (usme sawaal bhi hota hai aur hal bhi). OCR yahan se NAHI chalate —
// wo Gemini wali raah par chala jata hai, aur wo band hai.
export function sourceOf(rec) {
  if (!rec) return null;
  const q = String(rec.q?.question || rec.ocrText || "").trim();
  const answer = String(rec.detail2 || rec.detail || rec.aiNotes || "").trim();
  if (!q && !answer) return null;
  return {
    question: q || answer.slice(0, 1200),
    options: (rec.q?.options || []).filter(Boolean),
    answer: q ? answer : "",
  };
}

/** Ek question ki trick. Bani hui ho to wahi (muft), warna DeepSeek se. */
export async function makeTrick(rec, force = false) {
  if (!rec) return "";
  if (!force) {
    const have = getTrick(rec.id);
    if (have) return have;
  }
  const src = sourceOf(rec);
  if (!src) throw new Error("Is question ka na text hai na answer.");
  const d = await askTrick(src);
  save(rec.id, d.text);
  return d.text;
}

/** Poora detailed answer — jo pehle se hai wahi, warna DeepSeek se naya. */
export async function makeFull(rec) {
  if (!rec) return "";
  const own = String(rec.detail2 || rec.detail || rec.aiNotes || "").trim();
  if (own) return own;                       // Gemini/DeepSeek ka jo pehle se hai
  const have = getFull(rec.id);
  if (have) return have;
  const src = sourceOf(rec);
  if (!src) throw new Error("Is question ka na text hai na answer.");
  const d = await askAI({
    question: src.question + (src.options.length ? "\nOptions: " + src.options.join(" | ") : ""),
    subject: rec.subject || "math",
  });
  save(rec.id + "#full", d.answer || "");
  return d.answer || "";
}

// ── peeche se banne wali line ────────────────────────────────────────────
//
// Ek waqt par ek hi call — paise aur rate-limit dono ke liye. Jo ban chuki
// hai use dobara nahi maangte, aur jiska na text hai na answer use chhod
// dete hain.
let running = false;
const queued = new Set();

async function drain() {
  if (running) return;
  running = true;
  try {
    while (queued.size) {
      const rec = queued.values().next().value;
      queued.delete(rec);
      try { await makeTrick(rec); }
      catch { /* ek question na bane to line rukni nahi chahiye */ }
    }
  } finally { running = false; }
}

/** Aage ke `AHEAD` question ki trick peeche se bana lo. */
export function prefetch(list, idx) {
  if (typeof window === "undefined") return;
  if (!getSettings().apiKey) return;          // DeepSeek key hi nahi
  for (const rec of (list || []).slice(idx + 1, idx + 1 + AHEAD)) {
    if (!rec || getTrick(rec.id) || !sourceOf(rec)) continue;
    queued.add(rec);
  }
  drain();
}
