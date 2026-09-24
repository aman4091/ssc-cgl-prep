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

// ---------------------------------------------------------------------------
// GS prompt mein 🧩 CLUSTER section (2026-09-13) — GS baseline 10/50 aane ke
// baad plan PYQ → cluster → repeat par gaya; DeepSeek/Gemini ka answer ab poora
// group ek line mein deta hai jo seedha fact log mein jaata hai. Settings mein
// purana DEFAULT GS prompt pada ho tabhi badlo — user ne khud likha ho to nahi.
const GSC_FLAG = "cgl.reset.gscluster1";
const GS_DEFAULT_START = "Tum SSC (CGL, CHSL, MTS, CPO) ke General Studies";

export function applyGsClusterPrompt(gsPrompt) {
  if (typeof window === "undefined" || !gsPrompt) return false;
  try {
    if (localStorage.getItem(GSC_FLAG)) return false;
    const raw = storeGet("cgl.settings");
    const st = raw ? JSON.parse(raw) : {};
    const cur = String((st.shortcutPrompts || {}).gs || "");
    if (!cur || (cur.startsWith(GS_DEFAULT_START) && !cur.includes("CLUSTER"))) {
      st.shortcutPrompts = { ...(st.shortcutPrompts || {}), gs: gsPrompt };
      storeSet("cgl.settings", JSON.stringify(st));
    }
    localStorage.setItem(GSC_FLAG, new Date().toISOString());
    return true;
  } catch {
    return false;
  }
}

// GS prompt — user ka apna chhota prompt (ANSWER / CLUSTER / SSC EXTRA /
// ONE-LINER). v2 (13 Sep), v3 (13 Sep raat: CLUSTER ki Line 2 EXACT category,
// SSC EXTRA mein dohraav nahi). Settings mein koi bhi PURANA default (v0, v1
// cluster wala, v2) pada ho to naye se badlo — haath se likha hua ho to nahi.
// Agli baar prompt badle to FLAG ka number badhao aur purane ka nishaan jodo.
// v4 (13 Sep raat): SSC EXTRA — CLUSTER wala fact dobara nahi; 5 naye na hon
// to 3 hi.
// v5: CLUSTER mein sirf SSC-poochne-layak (naam/saal/sthan/sangathan/pehla),
// janm/asli naam/kahani nahi; andolan/ghatna ho to category ke saare andolan.
// v6: CLUSTER exactly 2 line, alag-alag + blank line, **Label** – facts.
const GS_PROMPT_FLAG = "cgl.reset.gsprompt6";
const GS_V1_MARK = "## 🧩 CLUSTER (fact log mein copy karne ke liye)";
const GS_V2_START = "Tum ek SSC CGL GS expert ho.";
const GS_V3_MARK = "FORMATTING (sakht)";   // sabse naye default ka nishaan

export function applyGsPromptV2(gsPrompt) {
  if (typeof window === "undefined" || !gsPrompt) return false;
  try {
    if (localStorage.getItem(GS_PROMPT_FLAG)) return false;
    const raw = storeGet("cgl.settings");
    const st = raw ? JSON.parse(raw) : {};
    const cur = String((st.shortcutPrompts || {}).gs || "");
    const oldDefault = !cur || cur.startsWith(GS_DEFAULT_START) || cur.includes(GS_V1_MARK)
      || (cur.startsWith(GS_V2_START) && !cur.includes(GS_V3_MARK));
    if (oldDefault) {
      st.shortcutPrompts = { ...(st.shortcutPrompts || {}), gs: gsPrompt };
      storeSet("cgl.settings", JSON.stringify(st));
    }
    localStorage.setItem(GS_PROMPT_FLAG, new Date().toISOString());
    return true;
  } catch {
    return false;
  }
}

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

// ---------------------------------------------------------------------------
// 📊 Galat khaane mein pada English sectional (2026-09-24)
//
// 11 Sep ko "English · 14 Sep 2025 S3" (20 sahi / 5 galat = 37.5) galti se
// GK/GS ki category mein save ho gaya tha. Uski wajah se GS ka ausat upar
// dikh raha tha (21.9) jabki asli GS ~16.7 hai — aur GS ka poora plan usi
// aankde par khada hai. Naam mein "English" ho aur category "gk" ho, to wo
// sectional English ka hi hai.
const MOCKCAT_FLAG = "cgl.reset.mockcat1";

export function fixMisfiledEnglishMocks() {
  if (typeof window === "undefined") return 0;
  try {
    if (localStorage.getItem(MOCKCAT_FLAG)) return 0;
    const raw = storeGet("cgl.mockmarks");
    const list = raw ? JSON.parse(raw) : [];
    let n = 0;
    const next = (Array.isArray(list) ? list : []).map((m) => {
      if (!m || m.cat !== "gk") return m;
      // Naam English ka hai, aur GS/GK ka koi nishaan nahi.
      if (!/english/i.test(m.name || "")) return m;
      if (/general awareness|general knowledge|gs|gk/i.test(m.name || "")) return m;
      n++;
      return { ...m, cat: "english", sections: (m.sections || []).map((x) => ({ ...x, name: /english/i.test(x.name || "") ? x.name : "English" })) };
    });
    if (n) storeSet("cgl.mockmarks", JSON.stringify(next));
    localStorage.setItem(MOCKCAT_FLAG, new Date().toISOString());
    return n;
  } catch {
    return 0;
  }
}
