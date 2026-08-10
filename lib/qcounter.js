// 🔢 Aaj kitne question hue — subject-wise counter (site wala).
//
// Overlay (F:\over\counter.py) par bhi yahi hisaab hai; niyam wahi rakhe hain
// taaki dono jagah ek jaisa dikhe:
//   • Din raat 3 baje badalta hai — 2:59 AM tak ka kaam usi purane din mein.
//   • Din badalte hi us din ka count history mein chala jata hai, counter 0 se.
//
// Answers page par ✅ "Ho gaya" mark karte hi us subject ka count +1 ho jata
// hai. Kis record ko aaj gin liya, wo `ids` mein yaad rehta hai — isliye ek hi
// question ko baar-baar mark/unmark karne se ginti nahi bigadti, aur kal ka
// mark aaj unmark karo to aaj ka count minus nahi hota.
//
// `cgl.` prefix jaan-boojh kar: sync.js sirf cgl.* uthata hai, to tablet par
// kiya hua mark desktop par bhi ginta hai.

import { shedOldQuizzes } from "./storage";

const KEY = "cgl.counter";
const DAY_START_HOUR = 3; // raat 3 baje naya din
export const COUNTER_SUBJECTS = ["math", "reasoning", "english", "gs"];

// Overlay ka Flask server — chal raha ho to site ka mark wahan bhi ginta hai,
// jisse counter_log.txt (notepad) poora rehta hai. Band ho to chupchaap skip.
const OVERLAY_PORTS = [5000, 5001, 5002];

export function counterDayKey(d = new Date()) {
  const t = new Date(d.getTime() - DAY_START_HOUR * 3600 * 1000);
  return t.toLocaleDateString("en-CA"); // YYYY-MM-DD, local time
}

const emptyCounts = () => {
  const o = {};
  for (const s of COUNTER_SUBJECTS) o[s] = 0;
  return o;
};

function cleanCounts(raw) {
  const out = emptyCounts();
  if (!raw || typeof raw !== "object") return out;
  for (const s of COUNTER_SUBJECTS) {
    const n = Number(raw[s]);
    out[s] = Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  }
  return out;
}

function readRaw() {
  if (typeof window === "undefined") return null;
  try {
    const v = JSON.parse(localStorage.getItem(KEY));
    return v && typeof v === "object" ? v : null;
  } catch {
    return null;
  }
}

function write(state) {
  const json = JSON.stringify(state);
  for (;;) {
    try { localStorage.setItem(KEY, json); return; }
    catch (e) { if (!shedOldQuizzes()) throw e; }
  }
}

// Padhte waqt hi din badalna handle ho jata hai — koi migration/cron nahi.
function load() {
  const raw = readRaw() || {};
  const today = counterDayKey();
  const state = {
    day: String(raw.day || today),
    counts: cleanCounts(raw.counts),
    ids: raw.ids && typeof raw.ids === "object" ? { ...raw.ids } : {},
    history: raw.history && typeof raw.history === "object" ? { ...raw.history } : {},
  };
  if (state.day === today) return state;

  const old = state.counts;
  if (COUNTER_SUBJECTS.some((s) => old[s] > 0)) {
    const prev = cleanCounts(state.history[state.day]);
    const merged = emptyCounts();
    for (const s of COUNTER_SUBJECTS) merged[s] = prev[s] + old[s];
    state.history[state.day] = merged;
  }
  state.day = today;
  state.counts = emptyCounts();
  state.ids = {};
  try { write(state); } catch { /* quota — agli baar phir koshish */ }
  return state;
}

function save(state) {
  try { write(state); return true; }
  catch { return false; }
}

// Overlay ke local server tak khabar (best effort — na chale to bhi site ka
// count sahi rehta hai).
function mirrorToOverlay(subject, delta) {
  if (typeof window === "undefined" || !delta) return;
  // overlay ek hi port par hota hai (mutex) — teeno par bhej do, jo chal raha
  // hai wahi lega, baaki fetch chupchaap fail
  for (const port of OVERLAY_PORTS) {
    fetch(`http://127.0.0.1:${port}/counter/bump`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, delta, from: "site" }),
    }).catch(() => {});
  }
}

export function getCounts() {
  return load().counts;
}

export function todayTotal() {
  const c = load().counts;
  return COUNTER_SUBJECTS.reduce((n, s) => n + c[s], 0);
}

// Haath se + / − (overlay ke buttons jaisa). Naya count wapas.
export function bumpCount(subject, delta = 1) {
  if (!COUNTER_SUBJECTS.includes(subject)) return 0;
  const state = load();
  const before = state.counts[subject];
  const now = Math.max(0, before + Math.trunc(delta));
  state.counts[subject] = now;
  save(state);
  if (now !== before) mirrorToOverlay(subject, now - before);
  return now;
}

// ✅ mark/unmark se apne aap ginti. Ek record aaj ek hi baar ginta hai.
export function countMark(recId, subject, isDone) {
  if (!recId || !COUNTER_SUBJECTS.includes(subject)) return getCounts();
  const state = load();
  const already = Object.prototype.hasOwnProperty.call(state.ids, recId);
  if (isDone && !already) {
    state.ids[recId] = subject;
    state.counts[subject] += 1;
    save(state);
    mirrorToOverlay(subject, 1);
  } else if (!isDone && already) {
    const s = COUNTER_SUBJECTS.includes(state.ids[recId]) ? state.ids[recId] : subject;
    delete state.ids[recId];
    state.counts[s] = Math.max(0, state.counts[s] - 1);
    save(state);
    mirrorToOverlay(s, -1);
  }
  return state.counts;
}

// Pichle dino ka hisaab — nayi date pehle.
export function counterHistory(limit = 14) {
  const state = load();
  return Object.keys(state.history)
    .sort()
    .reverse()
    .slice(0, limit)
    .map((day) => ({ day, counts: cleanCounts(state.history[day]) }));
}
