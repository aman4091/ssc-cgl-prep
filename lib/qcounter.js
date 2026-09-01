// 🔢 Aaj kitne question hue — subject-wise counter (site wala).
//
// Overlay (F:\over\counter.py) par bhi yahi hisaab hai; niyam wahi rakhe hain
// taaki dono jagah ek jaisa dikhe:
//   • Din raat 12 baje badalta hai — aam calendar wala din.
//   • Din badalte hi us din ka count history mein chala jata hai, counter 0 se.
//
// Answers page par ✅ "Ho gaya" mark karte hi us subject ka count +1 ho jata
// hai. Kis record ko aaj gin liya, wo `ids` mein yaad rehta hai — isliye ek hi
// question ko baar-baar mark/unmark karne se ginti nahi bigadti, aur kal ka
// mark aaj unmark karo to aaj ka count minus nahi hota.
//
// `cgl.` prefix jaan-boojh kar: sync.js sirf cgl.* uthata hai, to tablet par
// kiya hua mark desktop par bhi ginta hai.
//
// ── HAR DEVICE KA APNA KHAANA (v2) ──────────────────────────────────────────
//
// Pehle poora counter ek hi cheez tha: { day, counts, ids, history }. Sync use
// EK record maanta tha (M:counts), aur ek record par niyam seedha hai — jisne
// aakhir mein chhua uski chalegi. Natija ye tha:
//
//   laptop par reasoning ke 50 ho gaye  ->  cloud par counts = { reasoning: 50 }
//   phone khula, uske paas 0 tha         ->  phone ne bhi "apna" counts bheja
//   cloud par ab counts = { reasoning: 0 }   ->  laptop ka kiya hua GAYAB
//
// Ye guard lagane se theek hone wali cheez nahi thi — do device ek hi dabbe
// mein likh rahe the. Isliye ab har device ka apna khaana hai:
//
//   { v: 2, byDev: [ { id, day, counts, ids, history }, ... ] }
//
// `byDev` ek LIST hai, isliye sync ise tod kar har device ka alag record banata
// hai (M:byDev/L#<deviceId>). Har device sirf APNA khaana likhta hai, doosre ka
// chhoota bhi nahi — to mitne ka sawaal hi nahi.
//
// Aur "aaj kitne hue" ab jod kar nikalta hai: aaj ke din wale sab khaanon ka
// jod. Laptop par 30 aur phone par 20 kiye to 50 — jo sach mein hua wahi.

import { shedOldQuizzes } from "./storage";
import { storeSet } from "./bigstore";
import { deviceId } from "./deviceid";

const KEY = "cgl.counter";
// Raat 12 baje naya din. Pehle 3 baje tha (der raat tak padhne walon ke liye
// 2:59 AM ka kaam "kal" mein gina jata tha), par usse roz ka target aur
// calendar ki tarikh alag-alag chalte the aur ginti par bharosa nahi rehta tha.
const DAY_START_HOUR = 0;
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

function blankDev(id, day) {
  return { id, day, counts: emptyCounts(), ids: {}, history: {} };
}

function cleanDev(e, fallbackId) {
  return {
    id: String(e?.id || fallbackId),
    day: String(e?.day || counterDayKey()),
    counts: cleanCounts(e?.counts),
    ids: e?.ids && typeof e.ids === "object" ? { ...e.ids } : {},
    history: e?.history && typeof e.history === "object" ? { ...e.history } : {},
  };
}

// -> { byDev: [...] }. Purana ek-dabba wala roop mile to use IS device ka
// khaana maan lete hain — jo ginti pehle se thi wo bachi rehti hai.
function readState() {
  const raw = readRaw();
  if (raw && Array.isArray(raw.byDev)) {
    return { byDev: raw.byDev.map((e, i) => cleanDev(e, `d_old${i}`)) };
  }
  if (raw && (raw.counts || raw.day)) {
    return {
      byDev: [cleanDev({
        id: deviceId(), day: raw.day, counts: raw.counts,
        ids: raw.ids, history: raw.history,
      })],
    };
  }
  return { byDev: [] };
}

function write(state) {
  const json = JSON.stringify({ v: 2, byDev: state.byDev });
  for (;;) {
    try { storeSet(KEY, json); return; }
    catch (e) { if (!shedOldQuizzes()) throw e; }
  }
}

function save(state) {
  try {
    write(state);
    // Khuli hui screen ko turant khabar. ✅ "Ho gaya" do alag cheezein chhedta
    // hai — qdone (mark) aur qcounter (ginti) — aur qdone ka event ginti badhne
    // se PEHLE nikal jata hai. Isliye counter apni khabar khud bhejta hai,
    // warna "🔢 Aaj" agli baar page kholne tak wahi ka wahi dikhta tha.
    try { window.dispatchEvent(new CustomEvent("cgl:counter-changed")); }
    catch { /* SSR */ }
    return true;
  } catch { return false; }
}

// Din badal gaya — kal ka jod history mein daal kar counter 0 se.
function roll(e, today) {
  if (COUNTER_SUBJECTS.some((s) => e.counts[s] > 0)) {
    const prev = cleanCounts(e.history[e.day]);
    const merged = emptyCounts();
    for (const s of COUNTER_SUBJECTS) merged[s] = prev[s] + e.counts[s];
    e.history[e.day] = merged;
  }
  e.day = today;
  e.counts = emptyCounts();
  e.ids = {};
}

// Sirf APNA khaana chhedne ke liye. Padhne wale raaste ise nahi bulate — warna
// har baar page kholne par ek khaali record sync mein chala jata.
function editMine(fn) {
  const state = readState();
  const id = deviceId();
  const today = counterDayKey();
  let me = state.byDev.find((x) => x.id === id);
  if (!me) { me = blankDev(id, today); state.byDev.push(me); }
  if (me.day !== today) roll(me, today);
  const out = fn(me);
  save(state);
  return out;
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

// Aaj ka jod — SAB devices ka. Laptop par 30 aur phone par 20 kiye to 50.
export function getCounts() {
  const today = counterDayKey();
  const out = emptyCounts();
  for (const e of readState().byDev) {
    if (e.day !== today) continue;
    for (const s of COUNTER_SUBJECTS) out[s] += e.counts[s];
  }
  return out;
}

export function todayTotal() {
  const c = getCounts();
  return COUNTER_SUBJECTS.reduce((n, s) => n + c[s], 0);
}

// Haath se + / − (overlay ke buttons jaisa). Naya count wapas.
export function bumpCount(subject, delta = 1) {
  if (!COUNTER_SUBJECTS.includes(subject)) return 0;
  let moved = 0;
  editMine((me) => {
    const before = me.counts[subject];
    me.counts[subject] = Math.max(0, before + Math.trunc(delta));
    moved = me.counts[subject] - before;
  });
  if (moved) mirrorToOverlay(subject, moved);
  return getCounts()[subject];
}

// ✅ mark/unmark se apne aap ginti. Ek record aaj ek hi baar ginta hai.
export function countMark(recId, subject, isDone) {
  if (!recId || !COUNTER_SUBJECTS.includes(subject)) return getCounts();
  let moved = 0, moveSub = subject;
  editMine((me) => {
    const already = Object.prototype.hasOwnProperty.call(me.ids, recId);
    if (isDone && !already) {
      me.ids[recId] = subject;
      me.counts[subject] += 1;
      moved = 1;
    } else if (!isDone && already) {
      const s = COUNTER_SUBJECTS.includes(me.ids[recId]) ? me.ids[recId] : subject;
      delete me.ids[recId];
      me.counts[s] = Math.max(0, me.counts[s] - 1);
      moved = -1; moveSub = s;
    }
  });
  if (moved) mirrorToOverlay(moveSub, moved);
  return getCounts();
}

// Pichle dino ka hisaab — nayi date pehle. Sab devices ka jod.
export function counterHistory(limit = 14) {
  const today = counterDayKey();
  const days = {};
  const add = (day, c) => {
    if (!day || day === today) return;
    const m = days[day] || (days[day] = emptyCounts());
    for (const s of COUNTER_SUBJECTS) m[s] += c[s];
  };
  for (const e of readState().byDev) {
    for (const day of Object.keys(e.history)) add(day, cleanCounts(e.history[day]));
    // Jo device us din ke baad khula hi nahi, uska counter abhi tak purane din
    // par atka hai aur history mein gaya hi nahi. Use bhi us din mein gino,
    // warna wo din yahan aadha dikhta.
    if (e.day !== today) add(e.day, e.counts);
  }
  return Object.keys(days)
    .sort()
    .reverse()
    .slice(0, limit)
    .map((day) => ({ day, counts: days[day] }));
}
