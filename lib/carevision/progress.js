// CA Revision ki progress — phone aur PC dono par.
//
// Sab `cgl.` keys hain, isliye SyncManager inhe apne aap Supabase par le jata
// hai. Har store ek { cardId: value } object hai, aur per-record sync mein har
// key apna record ("M:<id>") banti hai — yaani ek card rate karne par sirf wahi
// ek chhota record upar-neeche jata hai, poora deck nahi. Egress isi se kam hai.
//
// Kuch bhi DELETE nahi hota: star hatana = 0 likhna. Sync ke hisaab se gayab
// record "delete" nahi maana jata (lib/syncitems.js), wo doosre device se wapas
// aa jata — isliye hamesha value badlo, key mat hatao.

import { storeGet, storeSet } from "../bigstore";
import { review } from "./srs";

export const KEYS = {
  srs: "cgl.carev.srs",     // { id: {e,i,d,n,l,t} } — lib/carevision/srs.js
  star: "cgl.carev.star",   // { id: 1 | 0 }
  log: "cgl.carev.log",     // { "YYYY-MM-DD": { r: rated, g: good, nw: naye, tg: us din ka target } }
  prefs: "cgl.carev.prefs", // { scope: "core"|"all" }
  plan: "cgl.carev.plan",   // { start: "YYYY-MM-DD" } — plan ka din 1
};

function readMap(key) {
  if (typeof window === "undefined") return {};
  try {
    const v = JSON.parse(storeGet(key) || "{}");
    return v && typeof v === "object" && !Array.isArray(v) ? v : {};
  } catch { return {}; }
}
function writeMap(key, map) { storeSet(key, JSON.stringify(map)); }

export const getSrs = () => readMap(KEYS.srs);
export const getStars = () => readMap(KEYS.star);
export const getLog = () => readMap(KEYS.log);

export const DEFAULT_PREFS = { scope: "core" };
export function getPrefs() { return { ...DEFAULT_PREFS, ...readMap(KEYS.prefs) }; }
export function setPrefs(patch) { writeMap(KEYS.prefs, { ...getPrefs(), ...patch }); }

// Plan ka din 1 = jis din pehli baar plan khula. Sync hota hai, isliye phone
// aur PC par din ki ginti ek hi rehti hai.
export function getPlanStart(today) {
  const m = readMap(KEYS.plan);
  if (typeof m.start === "string" && /^\d{4}-\d{2}-\d{2}$/.test(m.start)) return m.start;
  // Plan se pehle Recall chala liya ho to wahi pehla din hai.
  const first = Object.keys(getLog()).filter((k) => /^\d{4}-\d{2}-\d{2}$/.test(k)).sort()[0];
  const start = first && first < today ? first : today;
  writeMap(KEYS.plan, { ...m, start });
  return start;
}

// Aaj ka target din ke log mein — timeline par "din poora hua ya nahi" isi se.
export function noteDayTarget(today, tg) {
  const log = getLog();
  const day = log[today] || { r: 0, g: 0, nw: 0 };
  if (day.tg === tg) return;
  log[today] = { ...day, tg };
  writeMap(KEYS.log, log);
}

export function toggleStar(id) {
  const m = getStars();
  m[id] = m[id] ? 0 : 1;
  writeMap(KEYS.star, m);
  return !!m[id];
}

/**
 * "Aata hai" / "Nahi aata". Ek din mein ek card ki pehli rating hi schedule
 * badalti hai — usi session mein dobara aaye galat card ko sahi karne se wo
 * 6 din aage na chala jaye.
 */
export function rate(id, good, today) {
  const srs = getSrs();
  const prev = srs[id] || null;
  const log = getLog();
  const day = log[today] || { r: 0, g: 0, nw: 0 };
  if (prev && prev.t === today) return prev;
  srs[id] = review(prev, good, today);
  writeMap(KEYS.srs, srs);
  day.r += 1;
  if (good) day.g += 1;
  if (!prev) day.nw += 1;
  log[today] = day;
  writeMap(KEYS.log, log);
  return srs[id];
}
