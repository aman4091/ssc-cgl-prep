// Answers page ka ✅ "Ho gaya" mark.
//
// Overlay ke answers page par har question ke saath ek checkbox hai; mark karte
// hi wo question list ke sabse neeche chala jata hai aur agla bina-mark wala
// upar aa jata hai. Wahi yahan chahiye.
//
// Wrong book ke record par "done" jaisa koi field nahi hai, aur usme jodna theek
// nahi — wo store overlay se aane wale data ka hai, ye mark padhne ka apna
// hisaab hai. Isliye ek alag chhoti list: sirf record ids.
//
// `cgl.` prefix jaan-boojh kar hai — ye asli progress hai, tablet par mark karo
// to desktop par bhi dikhna chahiye, aur sync.js sirf cgl.* uthata hai. Size na
// ke barabar rehta hai (ek id ~20 bytes), aur delete hue records ki ids load par
// chhant di jati hain.

import { shedOldQuizzes } from "./storage";

import { storeGet, storeSet, storeRemove } from "./bigstore";
const KEY = "cgl.answersDone";

// { id: "<aakhri baar kab nipta>" } — ye ab HAALAT nahi, WAQT hai.
//
// "Ho gaya" ek on/off nishaan nahi rah gaya. Dabate hi do cheezein hoti hain:
// waqt abhi ka ho jata hai (isliye question sabse neeche chala jata hai), aur
// nishaan khud hat jata hai — taaki ghoom kar wapas upar aaye to wo dobara
// bina-nishaan ke mile. Purane tareeke mein tick laga rehta tha, aur upar aaya
// hua tick-lagaa question ek gali-band ban jata tha: use neeche bhejne ka koi
// tareeka hi nahi bachta tha.
//
// Purani array wali copy ([id, id, ...]) mein waqt hai hi nahi. Use waise
// padhna sabse badi galti thi: bina waqt ke wo apne BANNE ki purani date par
// gir jate the aur seedhe sabse UPAR aa jate the — 21 nipte hue question sabse
// upar. Isliye ek baar, hamesha ke liye, unpar waqt chipka dete hain: usi kram
// mein jis kram mein wo lage the, aur "abhi" se thoda pehle — yaani wahi jagah
// jo unki honi chahiye thi, sabse neeche.
function stampLegacy(ids) {
  const base = Date.now() - ids.length * 1000;
  return Object.fromEntries(
    ids.map((id, i) => [id, new Date(base + i * 1000).toISOString()]),
  );
}

function read() {
  if (typeof window === "undefined") return {};
  try {
    const raw = storeGet(KEY);
    const v = raw ? JSON.parse(raw) : {};
    if (Array.isArray(v)) {
      const map = stampLegacy(v);
      write(map);           // ek hi baar — warna har read par naya waqt banta
      return map;
    }
    return v && typeof v === "object" ? v : {};
  } catch {
    return {};
  }
}

// localStorage bhara hua ho to setItem throw karta hai — wahi raasta jo
// wrongbook/OverlayInbox lete hain: sabse purane generate kiye hue quizzes gira
// kar dobara koshish. Ek mark save na hone se poora page toot na jaye.
function write(map) {
  const json = JSON.stringify(map);
  for (;;) {
    try { storeSet(KEY, json); return; }
    catch (e) { if (!shedOldQuizzes()) throw e; }
  }
}

export function getDoneSet() {
  return new Set(Object.keys(read()));
}

// "Abhi nipta diya" — waqt naya, aur bas. Koi toggle nahi: dobara dabane par
// wo phir se neeche chala jayega, upar wapas nahi aayega.
export function markDone(id) {
  if (!id) return;
  const map = read();
  map[id] = new Date().toISOString();
  write(map);
}

// { id: iso } — list ka kram isi se banta hai.
export function getDoneMap() { return read(); }

export function isDone(id) {
  return Object.prototype.hasOwnProperty.call(read(), id);
}

// -> nayi haalat (true = ab mark hai)
export function toggleDone(id) {
  const map = read();
  if (Object.prototype.hasOwnProperty.call(map, id)) { delete map[id]; write(map); return false; }
  map[id] = new Date().toISOString();
  write(map);
  return true;
}

// Jo records ab hain hi nahi (delete ho gaye) unki ids hata do. Page load par
// chalta hai, taaki ye list waqt ke saath phoolti na rahe.
export function pruneDone(validIds) {
  const valid = validIds instanceof Set ? validIds : new Set(validIds || []);
  const map = read();
  const kept = {};
  let dropped = false;
  for (const id of Object.keys(map)) {
    if (valid.has(id)) kept[id] = map[id];
    else dropped = true;
  }
  if (dropped) write(kept);
  return new Set(Object.keys(kept));
}
