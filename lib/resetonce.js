// Ek baar ka safaya — owner ne maanga.
//
// Kyun zaroorat padi: Mistake Notebook mein purane niyam ke waqt ka kachra jama
// tha (sahi kiye hue question, aur wo bhi jo PYQ ke bahar se aaye the), aur
// jitne set diye ja chuke the unka natija bhi sanjoya hua tha. Naye niyam ab
// theek hain, par wo sirf AAGE ke liye hain — purana apne aap saaf nahi hota.
//
// Set ka natija bhi isliye mitana zaroori tha: notebook mein NAYA question tabhi
// jata hai jab set pehli baar diya ja raha ho (QBoard ka retry-guard). Purana
// natija pada rehta to har set "dobara-attempt" ginta aur galat question kabhi
// notebook mein pahunchte hi nahi.
//
// "Ho gaya" bhi saath jata hai — ab wo nishaan sirf set submit karne par lagta
// hai, to natija mitte hi uska koi matlab nahi bachta (warna set card "25/25 ho
// gaye" dikhata aur natija koi nahi).
//
// SIRF EK BAAR: nishaan localStorage mein rehta hai aur wo bhi `cgl.` se shuru
// hota hai, isliye sync ke saath doosre device par bhi chala jata hai — safaya
// wahan dobara nahi chalega.
//
// Ye file agli baar ke liye ek namuna bhi hai: aisa hi koi safaya phir chahiye
// to naya FLAG naam do (v2), purane ko mat chhedo.

import { storeSet, storeGet } from "./bigstore";

const FLAG = "cgl.reset.v1";

// Jo mitana hai. storeSet se hi mitate hain (storeRemove se nahi) taaki
// bigstore har record ka tombstone bana de — warna agla sync cloud se sab kuch
// wapas kheench lata.
const WIPE = {
  "cgl.qreview": "[]",   // Mistake Notebook
  "cgl.settests": "{}",  // har set ka natija
  "cgl.qdone": "[]",     // "ho gaya" ke nishaan
};

export function runOneTimeReset() {
  if (typeof window === "undefined") return false;
  try {
    if (localStorage.getItem(FLAG)) return false;
    for (const [k, empty] of Object.entries(WIPE)) storeSet(k, empty);
    localStorage.setItem(FLAG, new Date().toISOString());
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// v2 — Gemini ka purana default prompt settings se hataana.
//
// "Is MCQ ka correct answer batao…" code mein DEFAULT tha, aur Settings kholte
// hi wo poora object save ho jata tha — yaani wo line har device ki settings
// mein likhi ja chuki hai. Code se hata dene se wo apne aap nahi jaati, aur
// notes ke page par bhi wahi copy hoti rehti (jahan koi MCQ hota hi nahi).
// Isliye: agar aaj bhi bilkul wahi purani line padi hai to use khaali kar do.
// User ne khud kuch likha hai to haath nahi lagana.
const P_FLAG = "cgl.reset.prompt1";
const OLD_DEFAULT = "Is MCQ ka correct answer batao aur ek short Hinglish explanation do:";

export function clearOldGeminiPrompt() {
  if (typeof window === "undefined") return false;
  try {
    if (localStorage.getItem(P_FLAG)) return false;
    localStorage.setItem(P_FLAG, new Date().toISOString());
    const raw = storeGet("cgl.settings");
    if (!raw) return false;
    const st = JSON.parse(raw);
    if (String(st.geminiPrompt || "").trim() !== OLD_DEFAULT) return false;
    st.geminiPrompt = "";
    storeSet("cgl.settings", JSON.stringify(st));
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// v3 — "Quiz jahan chhoda tha" chip ka purana kachra saaf.
//
// Chip (components/ResumeQuiz.js) sabse naya saved-par-abhi-tak-anfinished
// quiz dikhata hai — testing/purani "Aaj ka set" ke dauraan bane kayi quiz
// storage mein pade the, aur chip unme se koi bhi ajnabi quiz utha kar dikha
// deta tha. Ek baar poora `cgl.quizzes` khaali kar do — koi progress isse nahi
// khota (ye sab already-abandoned quiz hi hain), bas chip AAGE se sirf
// wahi dikhayega jo AB se beech mein chhoda jaye.
const Q_FLAG = "cgl.reset.quizzes1";

export function clearStaleQuizzes() {
  if (typeof window === "undefined") return false;
  try {
    if (localStorage.getItem(Q_FLAG)) return false;
    localStorage.setItem(Q_FLAG, new Date().toISOString());
    storeSet("cgl.quizzes", "[]");
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Naye answer-prompt Settings mein — owner ne maanga (2026-09-12).
//
// Har subject ka prompt ab ek hi shakl ka hai (lib/answerprompts.js): Maths /
// Reasoning mein pehle trick, English mein rule, GS mein facts — wahi jo PC ka
// DeepSeek bhi use karta hai. Settings ke `shortcutPrompts` isi se ✨ Gemini
// aur 📋 Prompt mein jaate hain, isliye EK BAAR chaaron naye text se bhar dete
// hain. Uske baad Settings mein jo badlo wo tumhara — ye dobara nahi chalta.
const AP_FLAG = "cgl.reset.answerprompts1";

export function applyAnswerPrompts(prompts) {
  if (typeof window === "undefined" || !prompts) return false;
  try {
    if (localStorage.getItem(AP_FLAG)) return false;
    const raw = storeGet("cgl.settings");
    const st = raw ? JSON.parse(raw) : {};
    st.shortcutPrompts = { ...(st.shortcutPrompts || {}), ...prompts };
    storeSet("cgl.settings", JSON.stringify(st));
    localStorage.setItem(AP_FLAG, new Date().toISOString());
    return true;
  } catch {
    return false;
  }
}
