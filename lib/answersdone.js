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

const KEY = "cgl.answersDone";

function read() {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    const v = raw ? JSON.parse(raw) : [];
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

// localStorage bhara hua ho to setItem throw karta hai — wahi raasta jo
// wrongbook/OverlayInbox lete hain: sabse purane generate kiye hue quizzes gira
// kar dobara koshish. Ek mark save na hone se poora page toot na jaye.
function write(ids) {
  const json = JSON.stringify(ids);
  for (;;) {
    try { localStorage.setItem(KEY, json); return; }
    catch (e) { if (!shedOldQuizzes()) throw e; }
  }
}

export function getDoneSet() {
  return new Set(read());
}

export function isDone(id) {
  return read().includes(id);
}

// -> nayi haalat (true = ab mark hai)
export function toggleDone(id) {
  const ids = read();
  const i = ids.indexOf(id);
  if (i >= 0) { ids.splice(i, 1); write(ids); return false; }
  ids.push(id);
  write(ids);
  return true;
}

// Jo records ab hain hi nahi (delete ho gaye) unki ids hata do. Page load par
// chalta hai, taaki ye list waqt ke saath phoolti na rahe.
export function pruneDone(validIds) {
  const valid = validIds instanceof Set ? validIds : new Set(validIds || []);
  const ids = read();
  const kept = ids.filter((id) => valid.has(id));
  if (kept.length !== ids.length) write(kept);
  return new Set(kept);
}
