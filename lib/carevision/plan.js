// Padhne ka kram aur roz ka plan (spec: "Daily plan view").
//
//   Din 1-7   Pass 1 — priority-1 ke naye cards, spec ki table ke kram mein
//   Din 8-13  Pass 2 — priority-2 ke naye cards + Pass 1 ka recall (SRS due)
//   Din 14+   Pass 3 — koi naya card nahi: star + Galtiyan + due SRS
//
// Roz ka naya target khud-ba-khud: pass mein jitne naye bache hain / pass ke
// jitne din bache hain. Ek din chhoot gaya to baaki din thoda badh jate hain —
// koi card pass se bahar nahi girta. Pass 1 ke bache cards Pass 2 mein sabse
// aage aate hain.
//
// Srs aur daytime ke alawa koi import nahi, taaki node test chala sake.

import { EXAM_DAY, addDays, daysUntil, isDue } from "./srs";

export const PASS1_LAST = 7;
export const PASS2_LAST = 13;
export const READ_LOCK_DAYS = 4;   // itne ya kam din baaki -> Read band

const ORDER = [
  (c) => c.part === "I",
  (c) => c.part === "D",
  (c) => c.part === "F",
  (c) => c.part === "B",
  (c) => c.section.startsWith("First in India"),
  (c) => c.part === "J" && /2026/.test(c.section),
  (c) => c.section.startsWith("Index & Rankings"),
  (c) => c.section === "Important Military Exercises" || c.section === "Operation Sindoor 2025",
  (c) => c.section.startsWith("Key Office Bearers") || c.section.startsWith("Union Budget"),
  (c) => c.part === "E",
  (c) => c.section.startsWith("International Conferences"),
  (c) => c.part === "C",
  (c) => c.part === "G",
  (c) => c.part === "A",
  (c) => c.part === "H",
  (c) => c.part === "J",
];

export function studyRank(c) {
  const i = ORDER.findIndex((f) => f(c));
  return i < 0 ? ORDER.length : i;
}

function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

// PDF kram mein GI Tags state-wise chhape hain — seedha chalao to "Assam,
// Assam, Assam…" lagaatar aata hai aur dimaag answer ka pattern yaad kar leta
// hai, fact nahi. Isliye ek hi group (priority + kram) ke andar sections baari-
// baari (GI, UNESCO, Ramsar, NP, …), aur section ke andar ek pakka par bikhra
// hua kram (id ka hash) — har device par, har din wahi.
export function sortForStudy(cards) {
  const groups = new Map();
  for (const c of cards) {
    const g = `${c.priority}:${String(studyRank(c)).padStart(2, "0")}`;
    if (!groups.has(g)) groups.set(g, new Map());
    const secs = groups.get(g);
    if (!secs.has(c.section)) secs.set(c.section, []);
    secs.get(c.section).push(c);
  }
  const out = [];
  for (const g of [...groups.keys()].sort()) {
    const queues = [...groups.get(g).values()].map((q) => q.sort((a, b) => hash(a.id) - hash(b.id)));
    while (queues.some((q) => q.length)) {
      for (const q of queues) if (q.length) out.push(q.shift());
    }
  }
  return out;
}

export function passOf(dayNo) {
  return dayNo <= PASS1_LAST ? 1 : dayNo <= PASS2_LAST ? 2 : 3;
}

// Plan ke saare din: pehle din se exam se ek din pehle tak.
export function planDays(start, exam = EXAM_DAY) {
  const n = Math.max(0, daysUntil(start, exam));
  return Array.from({ length: n }, (_, i) => ({ key: addDays(start, i), dayNo: i + 1, pass: passOf(i + 1) }));
}

/**
 * Aaj kya karna hai.
 * @param cards  jis deck par plan chal raha hai (Core ya Sab)
 * @param srs    { id: state }   @param stars { id: 1|0 }
 * @param log    { day: { r, g, nw, tg } }
 */
export function todayPlan({ cards, srs, stars, log, today, start, exam = EXAM_DAY }) {
  const daysLeft = daysUntil(today, exam);
  const dayNo = daysUntil(start, today) + 1;
  const pass = passOf(dayNo);
  const day = log[today] || { r: 0, g: 0, nw: 0 };

  const unseen = (p) => cards.filter((c) => c.priority === p && !srs[c.id]);
  let pool = [];
  let passLast = 0;
  if (pass === 1) { pool = sortForStudy(unseen(1)); passLast = PASS1_LAST; }
  else if (pass === 2) { pool = [...sortForStudy(unseen(1)), ...sortForStudy(unseen(2))]; passLast = PASS2_LAST; }

  // Aaj ke shuru mein kitne naye bache the = abhi bache + aaj dekhe.
  const passDaysLeft = Math.max(1, Math.min(passLast - dayNo + 1, daysLeft));
  const newTarget = pass === 3 || daysLeft < 1 ? 0 : Math.ceil((pool.length + day.nw) / passDaysLeft);
  const newLeft = Math.max(0, newTarget - day.nw);
  const fresh = pool.slice(0, newLeft);

  const due = cards
    .filter((c) => isDue(srs[c.id], today))
    .sort((a, b) => (srs[a.id].d < srs[b.id].d ? -1 : srs[a.id].d > srs[b.id].d ? 1 : a.priority - b.priority));
  // Pass 3: star kiye hue roz, chahe due ho ya nahi (jo aaj dekh liye wo nahi).
  const dueIds = new Set(due.map((c) => c.id));
  const starExtra = pass === 3
    ? cards.filter((c) => stars[c.id] && !dueIds.has(c.id) && srs[c.id]?.t !== today)
    : [];

  const sections = new Map();
  for (const c of fresh) sections.set(c.section, (sections.get(c.section) || 0) + 1);

  return {
    daysLeft, dayNo, pass, newTarget, newLeft, day,
    due, fresh, starExtra,
    queue: [...due, ...fresh, ...starExtra],
    freshSections: [...sections.entries()],
    passRemaining: pool.length,
    readLocked: daysLeft <= READ_LOCK_DAYS,
  };
}

// Timeline par din ka haal: "done" = kuch kiya aur naya target poora.
export function dayState(entry) {
  if (!entry || !entry.r) return "empty";
  return entry.nw >= (entry.tg || 0) ? "done" : "partial";
}
