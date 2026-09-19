// Recall ka adhoora round — band karo to wahi se chalu ho.
//
// Fact log aur Zaroori baatein ka round "sab card, har baar" hota hai:
// "Aata tha" card ko us round se hatata hai, "Nahi aata tha" use 3, 4, 5 …
// card baad phir le aata hai. Ab tak ye sab sirf khuli hui khidki mein
// tha — page band hua ya tab badla, to round shuru se aur gap phir 3 se.
//
// Yahan wahi round bachta hai: qataar ka kram (dobara-aane wali copy samet),
// kahan tak pahunche, aur har card ki is round ki galtiyon ki ginti (jis se
// agla gap banta hai). Round poora hote hi ye mit jata hai — agli baar sab
// card phir se aate hain, jaisa owner ne kaha.
//
// ID rakhte hain, number nahi: queue har baar naye kram mein shuffle hoti
// hai, isliye "list ka konsa number" bemaani hai.
//
// `cgl.recall.session` — har page apni key (M:<key> record), to fact log ka
// round Zaroori baatein ke round ko nahi chhedta.

import { storeGet, storeSet } from "./bigstore";

const KEY = "cgl.recall.session";

function read() {
  if (typeof window === "undefined") return {};
  try {
    const v = JSON.parse(storeGet(KEY) || "{}");
    return v && typeof v === "object" && !Array.isArray(v) ? v : {};
  } catch { return {}; }
}
function write(map) { try { storeSet(KEY, JSON.stringify(map)); } catch { /* quota */ } }

/** -> { ids: [{ id, r, c }], pos, miss: { id: n }, tally } ya null */
export function getSession(key) {
  const s = read()[key];
  return s && Array.isArray(s.ids) && s.ids.length ? s : null;
}

export function saveSession(key, data) {
  const all = read();
  all[key] = data;
  write(all);
}

export function clearSession(key) {
  const all = read();
  if (!(key in all)) return;
  // Mitane ki jagah KHAALI likhte hain: bigstore mein gayab record delete
  // nahi mana jata, isliye khali record hi doosre device tak "round khatam"
  // ki khabar le jata hai.
  all[key] = { ids: [], pos: 0, miss: {}, tally: { good: 0, bad: 0 } };
  write(all);
}
