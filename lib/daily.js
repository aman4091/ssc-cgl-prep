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

const KEY = "cgl.daily.targets";

export const DEFAULT_TARGETS = { reasoning: 50, english: 40, gs: 50, math: 25 };

// Kram jaan-boojh kar: Reasoning pehle. Roz ki list mein jo upar hota hai wahi
// hota hai — aur sabse zyada marks wahi de raha hai.
export const SUBJECT_META = {
  reasoning: { label: "Reasoning", icon: "🧠", href: "/pyq/reasonbank" },
  english: { label: "English", icon: "📘", href: "/pyq/all/english" },
  gs: { label: "GS", icon: "🌍", href: "/pyq/gktricks" },
  math: { label: "Maths", icon: "🧮", href: "/pyq/mathbank" },
};
export const SUBJECT_ORDER = ["reasoning", "english", "gs", "math"];

export function getTargets() {
  const out = { ...DEFAULT_TARGETS };
  if (typeof window === "undefined") return out;
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "{}");
    for (const s of COUNTER_SUBJECTS) {
      const n = Number(v?.[s]);
      if (Number.isFinite(n) && n >= 0) out[s] = Math.floor(n);
    }
  } catch { /* default */ }
  return out;
}

export function setTargets(next) {
  const clean = {};
  for (const s of COUNTER_SUBJECTS) {
    const n = Number(next?.[s]);
    clean[s] = Number.isFinite(n) && n >= 0 ? Math.floor(n) : DEFAULT_TARGETS[s];
  }
  try { localStorage.setItem(KEY, JSON.stringify(clean)); } catch { /* ignore */ }
  try { window.dispatchEvent(new CustomEvent("cgl:daily-changed")); } catch { /* SSR */ }
  return clean;
}

// -> [{ key, label, icon, href, target, done, left, pct }]
export function todayPlan() {
  const counts = getCounts();
  const targets = getTargets();
  return SUBJECT_ORDER.map((key) => {
    const target = targets[key] || 0;
    const done = counts[key] || 0;
    return {
      key,
      ...SUBJECT_META[key],
      target,
      done,
      left: Math.max(0, target - done),
      pct: target ? Math.min(100, Math.round((done / target) * 100)) : 100,
    };
  });
}

export const planDone = (plan) => (plan || []).every((r) => r.left === 0);

// Jo subject sabse peechhe hai — "abhi ye karo" wala. Barabar hone par
// SUBJECT_ORDER ka pehla, yaani Reasoning.
export function nextSubject(plan) {
  const left = (plan || []).filter((r) => r.left > 0);
  if (!left.length) return null;
  return left.reduce((a, b) => (b.pct < a.pct ? b : a));
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
