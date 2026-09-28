"use client";

// ✨ Purane Gemini answers wapas records par.
//
// Kahani: 2026-09-12 ko har subject ka mukhya answer DeepSeek ka ho gaya tha,
// aur us din se pehle ke Gemini answer sirf CHHUP gaye the (record par pade
// rahe, mite nahi). Sath hi kuch answer PC ke overlay ki apni file mein hi
// rah gaye the — site tak pahunche hi nahi.
//
// Owner ne dono wapas maange: "saare gemini wale answers le aa, ab wale
// (DeepSeek ke) hata de, aur gemini wale default kar de".
//
// Chhupe hue answer dikhane ka kaam components/AnswersBoard aur
// components/WrongAnswerBlock ne kar diya (ab `detail`/`detail2` bina kisi
// nishaan ke dikhte hain). Ye file doosra hissa karti hai: overlay ki files se
// bana hua `public/gemini-answers.json` (qid -> answer) ek baar padh kar un
// records par chipka deti hai jinke paas abhi koi Gemini answer hai hi nahi.
//
// Ek baar chalta hai (nishaan localStorage mein), aur kisi maujood answer ko
// kabhi nahi mitata.

import { getWrongBook, setDetail } from "./wrongbook";

const FLAG = "cgl.gemimport.v1";
const URL = "/gemini-answers.json";

export async function importGeminiAnswers({ force = false } = {}) {
  if (typeof window === "undefined") return 0;
  try { if (!force && localStorage.getItem(FLAG)) return 0; } catch { /* private mode */ }

  let map = null;
  try {
    const res = await fetch(URL, { cache: "force-cache" });
    if (!res.ok) return 0;
    map = await res.json();
  } catch { return 0; }
  if (!map || typeof map !== "object") return 0;

  let n = 0;
  for (const rec of getWrongBook()) {
    const qid = String(rec.qid || "").trim();
    if (!qid || !map[qid]) continue;
    // Jo pehle se hai use haath nahi lagate — na paste kiya hua, na purana.
    if (String(rec.detail || "").trim() || String(rec.detail2 || "").trim()) continue;
    setDetail(rec.id, map[qid]);
    n += 1;
  }
  try { localStorage.setItem(FLAG, new Date().toISOString()); } catch { /* ignore */ }
  return n;
}
