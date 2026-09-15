// CA Revision ka scheduler — SM-2, par exam ki taareekh se dabaya hua.
//
// Seedha SM-2 ek pakke card ko 15-40 din aage bhej deta hai, jo 1 Oct ke baad
// padta — yaani wo card exam se pehle dobara aata hi nahi. Isliye har interval
// par chhat: max(1, floor(daysLeft / 3)). 17 din baaki -> 5 din tak, 4 din
// baaki -> 1 din. Jaise exam paas aata hai, poora deck roz ki revision mein
// simat jata hai. Galat jawab = kal phir (interval 1).
//
// Sab kuch "YYYY-MM-DD" din ki keys par — ghante/minute nahi. Din kab badalta
// hai (raat 2 baje) wo lib/daytime.js ka dayKey tay karta hai, ye file nahi.
// Koi import nahi, taaki scripts/test-ca-srs.mjs ise seedha chala sake.

export const EXAM_DAY = "2026-10-01";

const DAY_MS = 86400000;
const toUtc = (key) => {
  const [y, m, d] = key.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
};

export function addDays(key, n) {
  const t = new Date(toUtc(key) + n * DAY_MS);
  return t.toISOString().slice(0, 10);
}

// Aaj se exam tak kitne din. Exam ke din 0, uske baad minus.
export function daysUntil(today, exam = EXAM_DAY) {
  return Math.round((toUtc(exam) - toUtc(today)) / DAY_MS);
}

export function intervalCap(today, exam = EXAM_DAY) {
  return Math.max(1, Math.floor(daysUntil(today, exam) / 3));
}

// Card ka haal (sync hota hai, isliye chhota): e = ease x100 (250 = 2.5),
// i = interval (din), d = agli baari (din key), n = lagaatar sahi, l = kitni
// baar bhoola, t = aakhri baar kab dekha.
export const NEW_STATE = null;

/**
 * Ek jawab ke baad card ka naya haal.
 * @param s      purana haal (null = naya card)
 * @param good   true = "Aata hai", false = "Nahi aata"
 * @param today  din key
 */
export function review(s, good, today, exam = EXAM_DAY) {
  const prev = s || { e: 250, i: 0, n: 0, l: 0 };
  let e = prev.e;
  let n, i, l = prev.l || 0;
  if (!good) {
    // SM-2: q < 3 -> shuru se. Ease 0.2 girti hai (q=1 par SM-2 ka apna hisaab
    // -0.54 deta hai, jo do galtiyon mein card ko 1.3 ki zameen par patak deta).
    n = 0;
    i = 1;
    l += 1;
    e = Math.max(130, e - 20);
  } else {
    // "Aata hai" = q 4 — SM-2 mein q=4 ease ko nahi hilata.
    n = (prev.n || 0) + 1;
    if (n === 1) i = 1;
    else if (n === 2) i = 6;
    else i = Math.round((prev.i || 1) * (e / 100));
  }
  i = Math.min(i, intervalCap(today, exam));
  let d = addDays(today, i);
  // Kabhi exam ke baad nahi: jab tak exam aage hai, agli baari exam ke din tak.
  if (daysUntil(today, exam) >= 1 && d > exam) d = exam;
  return { e, i, d, n, l, t: today };
}

export function isDue(s, today) {
  return !!s && s.d <= today;
}
