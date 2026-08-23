// Mistake Notebook ka ✅ "Ho gaya" mark.
//
// Answers page par ye pehle se hai (lib/answersdone) aur owner ko wahi aadat
// hai: question par tick lagao, wo list ke sabse NEECHE chala jata hai, aur
// agla bina-tick wala apne aap upar aa jata hai. Notebook mein bhi wahi.
//
// Site ke apne "ho gaya" (lib/qdone) se ye ALAG hai, aur jaan-boojh kar. Wahan
// "ho gaya" ka matlab hai "ye question kar chuka hoon", aur PYQ ka set submit
// karte hi uske saare 25 question ek saath waisa mark ho jate hain — usse yahan
// jodte to notebook ka har question pehle hi din neeche chala jata aur ye
// feature bemaani ho jata. Yahan mark ka matlab alag hai: "is galti ko main
// nipta chuka hoon."
//
// Record ki pehchaan wahi hai jo qreview ki hai (keyFor wali `key`), isliye ek
// hi question chahe kisi bhi bank se aaye, uska ek hi mark banta hai.
//
// `cgl.` prefix jaan-boojh kar: tablet par nipta hua question desktop par bhi
// nipta hua dikhna chahiye, aur sync.js sirf cgl.* uthata hai. Size na ke
// barabar (ek key ~40 bytes), aur delete hue record ki keys load par chhant di
// jati hain.

import { storeGet, storeSet } from "./bigstore";

const KEY = "cgl.mistakesDone";

// { key: "<aakhri baar kab nipta>" } — haalat nahi, waqt. Wajah aur purani
// array wali copy ka ilaaj dono lib/answersdone mein likhe hain; yahan wahi
// niyam hai, bas pehchaan `key` se hoti hai.
function stampLegacy(keys) {
  const base = Date.now() - keys.length * 1000;
  return Object.fromEntries(
    keys.map((k, i) => [k, new Date(base + i * 1000).toISOString()]),
  );
}

function read() {
  if (typeof window === "undefined") return {};
  try {
    const raw = storeGet(KEY);
    const v = raw ? JSON.parse(raw) : {};
    if (Array.isArray(v)) {
      const map = stampLegacy(v);
      write(map);
      return map;
    }
    return v && typeof v === "object" ? v : {};
  } catch {
    return {};
  }
}

function write(map) {
  try { storeSet(KEY, JSON.stringify(map)); } catch { /* quota — mark chhoot jayega, page nahi tootega */ }
  try { window.dispatchEvent(new CustomEvent("cgl:mistakesdone-changed")); } catch { /* SSR */ }
}

export function getDoneSet() { return new Set(Object.keys(read())); }

// "Abhi nipta diya" — waqt naya, bas. Koi toggle nahi.
export function markDone(key) {
  if (!key) return;
  const map = read();
  map[key] = new Date().toISOString();
  write(map);
}

// { key: iso } — list ka kram isi se banta hai.
export function getDoneMap() { return read(); }

// -> nayi haalat (true = ab mark hai)
export function toggleDone(key) {
  if (!key) return false;
  const map = read();
  if (Object.prototype.hasOwnProperty.call(map, key)) { delete map[key]; write(map); return false; }
  map[key] = new Date().toISOString();
  write(map);
  return true;
}

// Jo record ab notebook mein hain hi nahi (delete ho gaye, ya sahi karke nikal
// gaye) unki keys hata do — warna ye list waqt ke saath phoolti rehti.
export function pruneDone(validKeys) {
  const valid = validKeys instanceof Set ? validKeys : new Set(validKeys || []);
  const map = read();
  const kept = {};
  let dropped = false;
  for (const k of Object.keys(map)) {
    if (valid.has(k)) kept[k] = map[k];
    else dropped = true;
  }
  if (dropped) write(kept);
  return new Set(Object.keys(kept));
}
