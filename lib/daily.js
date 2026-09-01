// 🎯 Aaj ka kaam — roz ka target, aur kitna hua.
//
// Exam September ke aakhir / October ke shuru mein hai. Itne kam waqt mein
// sabse badi dushman "aaj kya karun" wali soch hai: 20 minute usi mein nikal
// jaate hain, aur jo subject sabse kamzor hai wahi sabse zyada tala jata hai.
//
// Isliye roz ka kaam ek hi jagah, ginti ke saath, aur homepage par SABSE UPAR.
// Ginti kahin nayi nahi banti — lib/qcounter pehle se har quiz submit par
// subject ka count badhata hai (raat 12 baje naya din). Yahan bas target ke
// saamne rakh kar dikha dete hain.
//
// Target badla ja sakta hai. Default wo hain jo Tier-1 ke hisaab se bante
// hain: Reasoning sabse zyada (wahan sabse sasta faayda hai), Maths sabse kam
// ginti par sabse lambi review, English rozana vocab+grammar, GS PYQ se.

import { COUNTER_SUBJECTS, getCounts } from "./qcounter";
import { getMocks, mockTotals } from "./mockmarks";
import { taskCounts } from "./dailytask";

const KEY = "cgl.daily.targets";

export const DEFAULT_TARGETS = {
  reasoning: 50, english: 40, gs: 50, math: 25,
  // Vocab ka ek din = 50 word (PER_DAY), aur uska quiz poora hote hi 50 gin
  // jaate hain — isliye target bhi theek 50. Ek quiz, ek ring poora.
  vocab: 50, ca: 20,
};

// Ye do qcounter mein nahi hain (wo sirf chaar subject ginta hai) — inki apni
// ginti lib/dailytask mein hai, aur wo bhi apne aap badhti hai.
export const TASK_KEYS = ["vocab", "ca"];

// KRAM hi poora plan hai — ek ke baad ek, aur agla tabhi khulta hai jab
// pichhla poora ho jaye.
//
// Ye SUJHAYA hua kram hai, pathhar ki lakeer nahi:
//
//   1 Reasoning — sabse sasta faayda, isliye sabse pehle aur roz
//   2 Vocab     — chhota kaam, par roz na ho to sab bhool jata hai
//   3 English   — PYQ; grammar ke rule wahin se aate hain
//   4 CA        — bees question, bees minute; roz thoda hi kaafi hai
//   5 Maths     — attempt chhota, review lamba; isliye dopahar mein
//   6 GS        — sabse aakhir, kyunki ye wahi jagah hai jahan waqt sabse
//                 zyada bahta hai
//
// Lamba aur chhota kaam ek ke baad ek rakhe hain — do lambe lagatar ho to
// doosra aksar chhoot jata hai.
//
// Par kram khud badla ja sakta hai (⚙️ Target ke andar ▲▼ se). Kyun: taala
// tabhi kaam karta hai jab wo APNA chuna hua ho. Kisi din Maths pehle karni
// hai — dimaag taaza hai, ya kal ke mock mein Maths hi doobi thi — aur site
// kehti rahe "pehle Reasoning", to do mein se ek hi hoga: ya to Reasoning
// bemann se nipta di jayegi, ya taala hi band kar diya jayega. Dono mein plan
// gaya. Kram apna ho to taala saath deta hai, raasta nahi rokta.
export const SUBJECT_META = {
  reasoning: { label: "Reasoning", icon: "🧠", href: "/pyq/reasonbank" },
  english: { label: "English", icon: "📘", href: "/pyq/all/english" },
  gs: { label: "GS", icon: "🌍", href: "/pyq/gktricks" },
  math: { label: "Maths", icon: "🧮", href: "/pyq/mathbank" },
  vocab: { label: "Vocab", icon: "🔤", href: "/vocab" },
  ca: { label: "Current Affairs", icon: "📰", href: "/current-affairs" },
};
export const DEFAULT_ORDER = ["reasoning", "vocab", "english", "ca", "math", "gs"];
const ORDER_KEY = "cgl.daily.order";

// Saaf kiya hua kram: sirf asli subject, koi dohraav nahi, aur jo chhoot gaya
// wo default ke kram se peechhe jud jata hai. Isse aadhi-adhoori list (naya
// subject add hua, purani list mein wo hai hi nahi) kabhi kuch gayab nahi
// karti.
function cleanOrder(list) {
  const out = [];
  for (const k of Array.isArray(list) ? list : []) {
    if (DEFAULT_ORDER.includes(k) && !out.includes(k)) out.push(k);
  }
  for (const k of DEFAULT_ORDER) if (!out.includes(k)) out.push(k);
  return out;
}

export function getOrder() {
  if (typeof window === "undefined") return [...DEFAULT_ORDER];
  try { return cleanOrder(JSON.parse(localStorage.getItem(ORDER_KEY) || "null")); }
  catch { return [...DEFAULT_ORDER]; }
}

export function setOrder(list) {
  const clean = cleanOrder(list);
  try { localStorage.setItem(ORDER_KEY, JSON.stringify(clean)); } catch { /* ignore */ }
  try { window.dispatchEvent(new CustomEvent("cgl:daily-changed")); } catch { /* SSR */ }
  return clean;
}

// Ek subject ko upar/neeche khiskao. -> naya kram
export function moveSubject(key, dir) {
  const list = getOrder();
  const i = list.indexOf(key);
  const j = i + (dir < 0 ? -1 : 1);
  if (i < 0 || j < 0 || j >= list.length) return list;
  [list[i], list[j]] = [list[j], list[i]];
  return setOrder(list);
}

export function getTargets() {
  const out = { ...DEFAULT_TARGETS };
  if (typeof window === "undefined") return out;
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "{}");
    for (const s of [...COUNTER_SUBJECTS, ...TASK_KEYS]) {
      const n = Number(v?.[s]);
      if (Number.isFinite(n) && n >= 0) out[s] = Math.floor(n);
    }
  } catch { /* default */ }
  return out;
}

export function setTargets(next) {
  const clean = {};
  for (const s of [...COUNTER_SUBJECTS, ...TASK_KEYS]) {
    const n = Number(next?.[s]);
    clean[s] = Number.isFinite(n) && n >= 0 ? Math.floor(n) : DEFAULT_TARGETS[s];
  }
  try { localStorage.setItem(KEY, JSON.stringify(clean)); } catch { /* ignore */ }
  try { window.dispatchEvent(new CustomEvent("cgl:daily-changed")); } catch { /* SSR */ }
  return clean;
}

// -> [{ key, label, icon, href, target, done, left, pct }]
export function todayPlan() {
  const counts = { ...getCounts(), ...taskCounts() };
  const targets = getTargets();
  return getOrder().map((key) => {
    const target = targets[key] || 0;
    const done = counts[key] || 0;
    return {
      key,
      task: TASK_KEYS.includes(key),
      ...SUBJECT_META[key],
      target,
      done,
      left: Math.max(0, target - done),
      pct: target ? Math.min(100, Math.round((done / target) * 100)) : 100,
    };
  });
}

export const planDone = (plan) => (plan || []).every((r) => r.left === 0);

// 🔒 Ek ke baad ek — jo abhi karna hai sirf wahi khula, baaki sab band.
//
// Chhe cheezein ek saath saamne rakhne ka matlab hai chhe faisle, aur har
// faisle par wahi chunna jo aasan lage. Isliye ek waqt mein ek hi darwaza
// khula rehta hai: jo poora ho gaya wo bhi khula (dobara karna ho to), jo
// aage hai wo band.
//
// Taala hataya ja sakta hai — ⚙️ Target ke andar — kyunki zabardasti sirf tab
// chalti hai jab wo apni chuni hui ho.
const LOCK_KEY = "cgl.daily.lock";

export function lockOn() {
  if (typeof window === "undefined") return true;
  try { return localStorage.getItem(LOCK_KEY) !== "0"; } catch { return true; }
}
export function setLockOn(v) {
  try { localStorage.setItem(LOCK_KEY, v ? "1" : "0"); } catch { /* ignore */ }
  try { window.dispatchEvent(new CustomEvent("cgl:daily-changed")); } catch { /* SSR */ }
}

// Kaunse abhi band hain: kram mein jo pehla adhoora hai, uske BAAD wale sab.
// Poore ho chuke kabhi band nahi hote.
export function lockedSubjects(plan) {
  if (!lockOn()) return new Set();
  const rows = getOrder().map((k) => (plan || []).find((r) => r.key === k)).filter(Boolean);
  const i = rows.findIndex((r) => r.left > 0);
  if (i < 0) return new Set();
  return new Set(rows.slice(i + 1).map((r) => r.key));
}

// "Abhi ye karo" — kram ka pehla adhoora. Sabse peechhe wala nahi: kram hi
// plan hai, aur usme se chunne ka matlab wahi purani uljhan wapas laana.
export function nextSubject(plan) {
  for (const k of getOrder()) {
    const r = (plan || []).find((x) => x.key === k);
    if (r && r.left > 0) return r;
  }
  return null;
}

// Exam tak kitne din. Tareekh Settings se badli ja sakti hai; default wo hai
// jo abhi maana ja raha hai (SSC CGL 2026 Tier 1, ~1 October).
const EXAM_KEY = "cgl.examDate";
export const DEFAULT_EXAM = "2026-10-01";

export function getExamDate() {
  if (typeof window === "undefined") return DEFAULT_EXAM;
  try { return localStorage.getItem(EXAM_KEY) || DEFAULT_EXAM; } catch { return DEFAULT_EXAM; }
}
export function setExamDate(iso) {
  try { localStorage.setItem(EXAM_KEY, String(iso || "")); } catch { /* ignore */ }
  try { window.dispatchEvent(new CustomEvent("cgl:daily-changed")); } catch { /* SSR */ }
}
export function daysLeft() {
  const d = new Date(getExamDate() + "T00:00:00");
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((d - today) / 86400000));
}

// 📊 Aakhri full mock kitne din pehle.
//
// Mock hi wo cheez hai jo batati hai ki padhai marks mein badal rahi hai ya
// nahi — aur wahi sabse zyada taala jata hai, kyunki usme number saamne aa
// jata hai. Isliye gate par ginti dikhti hai: do din se zyada ho gaye to laal.
export function lastMock() {
  try {
    const rows = getMocks("full");
    if (!rows.length) return { days: null, score: null, n: 0 };
    const r = rows[0];
    const d = new Date((r.date || "") + "T00:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days = Number.isNaN(d.getTime()) ? null : Math.max(0, Math.round((today - d) / 86400000));
    return { days, score: mockTotals(r).score, n: rows.length };
  } catch {
    return { days: null, score: null, n: 0 };
  }
}
