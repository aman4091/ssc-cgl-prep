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
// Target badla ja sakta hai. Default CGL Mission (lib/mission.js) ke ROI se
// hain — mock marks ne dikhaya ki Reasoning (~43) sabse strong hai aur usi par
// sabse zyada time ja raha tha, jabki GS (~15) sabse bada gap hai aur Maths mein
// SPEED ki dikkat hai. Isliye GS aur Maths sabse upar, Reasoning sirf maintain.
// Mission "Shuru karo" par yahi targets ek baar laga deta hai.

import { COUNTER_SUBJECTS, getCounts } from "./qcounter";
import { getMocks, mockTotals } from "./mockmarks";
import { taskCounts } from "./dailytask";

const KEY = "cgl.daily.targets";

export const DEFAULT_TARGETS = {
  // GS 125 — naye plan mein roz 100–125 PYQ (do bade block + CA). Yahi sabse
  // bada gap hai (21.9 → 30), isliye ginti bhi sabse badi.
  gs: 125, math: 60, english: 50, reasoning: 15,
  // Vocab: roz ~100 PYQ word (do batch). CA: 30 Q.
  vocab: 100, ca: 30,
};

// Ye do qcounter mein nahi hain (wo sirf chaar subject ginta hai) — inki apni
// ginti lib/dailytask mein hai, aur wo bhi apne aap badhti hai.
export const TASK_KEYS = ["vocab", "ca"];

// KRAM hi poora plan hai — ek ke baad ek, aur agla tabhi khulta hai jab
// pichhla poora ho jaye.
//
// Ye SUJHAYA hua kram hai, pathhar ki lakeer nahi (CGL Mission ka ROI):
//
//   1 GS        — sabse bada gap; ek fact = ek sawaal, speed ki zaroorat nahi
//   2 Maths     — concept theek, SPEED ki dikkat; roz sprint + drill
//   3 English   — accuracy; grammar rules + error spotting
//   4 Vocab     — PYQ words repeat hote hain, sabse sasta mark
//   5 CA        — latest mahine pehle, thoda roz
//   6 Reasoning — pehle se ~43; sirf maintain
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
export const DEFAULT_ORDER = ["gs", "math", "english", "vocab", "ca", "reasoning"];
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
// Pehle yahan ek TAALA tha: kram ka pehla adhoora hi khula rehta, baaki band.
// Soch ye thi ki chhe darwaze khule ho to hamesha sabse aasan wala dabaya jata
// hai. Par asli padhai mein wo ulta pad gaya — kisi din Maths pehle karni hai,
// kisi din mock ke baad seedha GS, aur site "pehle Reasoning" par adi rahti
// thi. Rokne wali cheez raasta rokne lagi, isliye taala HATA diya gaya.
//
// Kram ab bhi hai — par sirf DIKHNE ka kram (getOrder / ⚙️ Target ke ▲▼).
// Neeche wala nextSubject bas ek sujhaav deta hai: "agla ye banta hai". Sujhaav
// maano ya na maano, har ring hamesha khuli hai.

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
