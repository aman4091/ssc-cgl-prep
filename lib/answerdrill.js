// 🔁 Answers ka SAAJHA drill — site aur PC overlay, dono ka ek hi kram.
//
// Pehle dono jagah apna-apna hisaab chalta tha (site: cgl.pyqdrill, overlay:
// data/drill40.json), isliye "pehla question" dono jagah alag hota tha. Ab
// hisaab ek hi hai aur wo yahan rehta hai:
//
//   cgl.answersdrill — ek LIST, har faisla apni line par:
//     { id, sub, q, ok, at }
//     sub = subject (math/reasoning/gs/english), q = question ka qid,
//     ok  = 40 second/ek baar mein ho gaya ya nahi.
//
// List isliye (ek object nahi): sync har element ko apna record maanta hai,
// to do device par alag-alag jude faisle DONO bachte hain — koi kisi ko
// mitata nahi. Aur kram inhi faislon se ban jata hai, alag se "main yahan
// hoon" wala nishaan rakhne ki zaroorat hi nahi:
//
//   • nahi hua  -> MISS_GAP (15) question baad wapas
//   • ho gaya   -> OK_GAP  (100) question baad wapas
//   • jo abhi tak aaya hi nahi -> wo beech mein, list ke apne kram se
//
// Dono jagah yahi ginti, yahi niyam — isliye jo site par #1 hai wahi overlay
// par bhi #1 hai.

import { storeGet, storeSet } from "./bigstore";

const KEY = "cgl.answersdrill";
export const MISS_GAP = 15;
export const OK_GAP = 100;
const CAP = 4000;            // itne faisle kaafi hain; purane gir jate hain

function read() {
  if (typeof window === "undefined") return [];
  try {
    const v = JSON.parse(storeGet(KEY) || "[]");
    return Array.isArray(v) ? v.filter((e) => e && e.q && e.sub) : [];
  } catch { return []; }
}

function write(list) {
  try { storeSet(KEY, JSON.stringify(list.slice(-CAP))); } catch { /* quota */ }
  try { window.dispatchEvent(new CustomEvent("cgl:answerdrill")); } catch { /* SSR */ }
}

export function getMarks() { return read(); }

/** Ek faisla likho. q = qid (dono jagah wahi pehchaan). */
export function addMark(sub, q, ok) {
  if (!sub || !q) return null;
  const e = {
    id: `ad_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    sub, q: String(q), ok: !!ok, at: new Date().toISOString(),
  };
  write([...read(), e]);
  return e;
}

// Faisle purane-se-naye — waqt se, kyunki do device ke record aapas mein
// ghul-mil kar aate hain.
function marksOf(sub) {
  return read().filter((e) => e.sub === sub)
    .sort((a, b) => String(a.at).localeCompare(String(b.at)));
}

/** Us subject ka poora hisaab: kitne nipte, kis ka kab number hai. */
export function stateOf(sub) {
  const evs = marksOf(sub);
  const due = new Map();     // q -> kis ginti par wapas
  const ok = new Map();      // q -> pichhli baar ho gaya tha ya nahi
  evs.forEach((e, i) => {
    due.set(e.q, i + 1 + (e.ok ? OK_GAP : MISS_GAP));
    ok.set(e.q, !!e.ok);
  });
  return { n: evs.length, due, ok };
}

/**
 * Aage ka kram — bilkul wahi jo overlay ke page par hai (over/drill40.order).
 * `items` list ke apne kram mein hon; `keyOf` unka qid nikale.
 */
export function orderOf(sub, items, keyOf) {
  const list = items || [];
  const key = keyOf || ((x) => x && x.qid);
  const { n, due, ok } = stateOf(sub);
  const byKey = new Map(list.map((it) => [String(key(it) || ""), it]));

  const ready = [...due.keys()]
    .filter((q) => byKey.has(q) && !ok.get(q) && due.get(q) <= n)
    .sort((a, b) => due.get(a) - due.get(b));
  const fresh = list.filter((it) => !due.has(String(key(it) || "")));
  const rest = [...due.keys()]
    .filter((q) => byKey.has(q) && !ready.includes(q))
    .sort((a, b) => due.get(a) - due.get(b));

  const out = [];
  const seen = new Set();
  const push = (it) => {
    if (!it) return;
    const k = String(key(it) || "");
    if (seen.has(k)) return;
    seen.add(k);
    out.push(it);
  };
  ready.forEach((q) => push(byKey.get(q)));
  fresh.forEach(push);
  rest.forEach((q) => push(byKey.get(q)));
  list.forEach(push);                       // kuch chhoota na rahe
  return out;
}

/** Ginti: kitne ho chuke, kitne abhi baaki (is chhaanti mein). */
export function countsOf(sub, items, keyOf) {
  const key = keyOf || ((x) => x && x.qid);
  const { ok } = stateOf(sub);
  let done = 0;
  for (const it of items || []) {
    if (ok.get(String(key(it) || "")) === true) done += 1;
  }
  return { done, left: Math.max(0, (items || []).length - done) };
}
