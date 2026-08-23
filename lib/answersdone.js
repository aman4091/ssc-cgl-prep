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

// Shakl ab { id: "<kab mark hua>" } hai, pehle sirf [id] thi.
//
// Waqt isliye chahiye ki list ek GHOOMTA hua katar hai: jo cheez abhi hui wo
// sabse neeche jati hai, aur uske neeche naya question. Bina waqt ke sirf itna
// pata chalta hai ki mark laga hai, ye nahi ki KAB — aur phir "tick kiya hua"
// aur "kal aaya naya" ka kram tay hi nahi hota.
//
// Purani array wali copy waise hi padhi jati hai (waqt khaali reh jata hai),
// isliye kisi ka purana mark nahi tootta.
function read() {
  if (typeof window === "undefined") return {};
  try {
    const raw = storeGet(KEY);
    const v = raw ? JSON.parse(raw) : {};
    if (Array.isArray(v)) return Object.fromEntries(v.map((id) => [id, ""]));
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
