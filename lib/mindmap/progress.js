// Mind Map ki progress — CA se alag keys, wahi tareeka.
//
// `cgl.mm.*` keys: har store ek { cardId: value } object, isliye per-record
// sync mein ek card rate karne par sirf wahi ek chhota record jata hai.
// Kuch delete nahi hota (star hatana = 0 likhna) — lib/syncitems.js gayab
// record ko delete nahi maanta.

import { storeGet, storeSet } from "../bigstore";
import { review } from "../carevision/srs";
import { galtiAnswer, GALTI_CLEAR } from "../carevision/galti";

export { GALTI_CLEAR };

export const KEYS = {
  srs: "cgl.mm.srs",
  star: "cgl.mm.star",
  galti: "cgl.mm.galti",
  log: "cgl.mm.log",
  prefs: "cgl.mm.prefs",
};

function readMap(key) {
  if (typeof window === "undefined") return {};
  try {
    const v = JSON.parse(storeGet(key) || "{}");
    return v && typeof v === "object" && !Array.isArray(v) ? v : {};
  } catch { return {}; }
}
const writeMap = (key, map) => storeSet(key, JSON.stringify(map));

export const getSrs = () => readMap(KEYS.srs);
export const getStars = () => readMap(KEYS.star);
export const getGalti = () => readMap(KEYS.galti);
export const getLog = () => readMap(KEYS.log);

export const DEFAULT_PREFS = { newPerDay: 40, subject: "all", tier: "all" };
export const getPrefs = () => ({ ...DEFAULT_PREFS, ...readMap(KEYS.prefs) });
export const setPrefs = (patch) => writeMap(KEYS.prefs, { ...getPrefs(), ...patch });

export function toggleStar(id) {
  const m = getStars();
  m[id] = m[id] ? 0 : 1;
  writeMap(KEYS.star, m);
  return !!m[id];
}

/** Recall ka jawab. Pehli baar dekha card bhi seedha SRS mein (interval 1). */
export function rate(id, good, today, exam) {
  const g = getGalti();
  if (g[id] && g[id].on) {
    galtiAnswer(g, id, good, today);
    writeMap(KEYS.galti, g);
  }
  const srs = getSrs();
  const prev = srs[id] || null;
  if (prev && prev.t === today) return prev;
  srs[id] = review(prev, good, today, exam);
  writeMap(KEYS.srs, srs);
  const log = getLog();
  const day = log[today] || { r: 0, g: 0, nw: 0 };
  day.r += 1;
  if (good) day.g += 1;
  if (!prev) day.nw += 1;
  log[today] = day;
  writeMap(KEYS.log, log);
  return srs[id];
}

/** Test ke jawab: galat -> Galtiyan + SRS mein "kal phir"; sahi -> sirf streak. */
export function recordTest(results, today, exam) {
  const g = getGalti();
  for (const { id, good } of results) galtiAnswer(g, id, good, today);
  writeMap(KEYS.galti, g);
  for (const { id, good } of results) if (!good) rate(id, false, today, exam);
}

export function exportProgress() {
  const data = {};
  for (const [name, key] of Object.entries(KEYS)) data[name] = readMap(key);
  return { app: "mindmap", v: 1, at: new Date().toISOString(), data };
}

export function importProgress(obj) {
  if (!obj || obj.app !== "mindmap" || !obj.data) throw new Error("Ye Mind Map ka backup nahi lagta");
  let n = 0;
  for (const [name, key] of Object.entries(KEYS)) {
    const incoming = obj.data[name];
    if (!incoming || typeof incoming !== "object") continue;
    const local = readMap(key);
    for (const [id, v] of Object.entries(incoming)) {
      if (name === "srs" && local[id] && (local[id].t || "") > (v?.t || "")) continue;
      local[id] = v;
      n += 1;
    }
    writeMap(key, local);
  }
  return n;
}
