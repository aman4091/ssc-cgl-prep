"use client";

// 🐋 DeepSeek button ka dimaag — teen card isi ko use karte hain
// (PyqQuestionCard, MathQuestionCard, ReasonQuestionCard).
//
// Do baatein jaan-boojh kar aisi hain:
//   • Prompt wahi jo ✨ Gemini button copy karta hai (Settings ka is subject
//     wala, warna generic geminiPrompt) — taaki dono jawab ek hi shakl mein
//     aayein, 🧩 CLUSTER samet. Settings khali ho to server ka EXPLAIN_PROMPT.
//   • mode "explain" — mode "shortcut" Settings mein Gemini key pade hone par
//     Gemini API par chala jata hai, aur wo kabhi nahi chalani.
//
// Jawab lib/dsanswers.js mein save hota hai (paste kiye hue Gemini answer se
// alag store), isliye ek hi question par dono jawab bach jaate hain aur
// dobara maangne par paisa nahi lagta.

import { useCallback, useEffect, useState } from "react";
import { askAI } from "./client-ai";
import { keyFor } from "./qstats";
import { promptFor } from "./geminiask";
import { getDsAnswer, saveDsAnswer } from "./dsanswers";

// q: wahi question-roop jis se baaki store chalte hain (tasveer wale bank
// mein `tq`). buildText(): AI ko bheja jane wala sawaal.
export function useDeepSeek(q, subject, buildText) {
  const [ds, setDs] = useState("");
  const [shown, setShown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const key = keyFor(q);
  useEffect(() => { setDs(getDsAnswer(q)); setShown(false); }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const h = (e) => { if (!e.detail?.key || e.detail.key === key) setDs(getDsAnswer(q)); };
    window.addEventListener("cgl:ds-saved", h);
    return () => window.removeEventListener("cgl:ds-saved", h);
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchIt = useCallback(async () => {
    setLoading(true); setErr("");
    try {
      const { answer } = await askAI({
        question: buildText(),
        mode: "explain",
        subject,
        customPrompt: promptFor(subject, "geminiPrompt"),
      });
      saveDsAnswer(q, answer);
      setDs(answer); setShown(true);
      return true;
    } catch (e) { setErr(e.message); return false; }
    finally { setLoading(false); }
  }, [q, subject, buildText]);

  // Saved jawab pada ho to button sirf dikhata/chhupata hai — naya call nahi.
  const ask = useCallback(async () => {
    if (ds) { setShown((v) => !v); return true; }
    return fetchIt();
  }, [ds, fetchIt]);

  const regen = useCallback(async () => { setDs(""); setShown(false); return fetchIt(); }, [fetchIt]);

  return { ds, shown, loading, err, ask, regen };
}

// Header wala button — teeno card mein ek jaisa dikhe.
export function dsLabel({ ds, shown, loading }) {
  if (loading) return "…";
  if (!ds) return "🐋 DeepSeek";
  return shown ? "🐋 ✓" : "🐋";
}
export function dsTitle({ ds, shown }) {
  if (!ds) return "DeepSeek se is question ka jawab laao (wahi prompt jo ✨ wala bhejta hai)";
  return shown ? "DeepSeek ka jawab chhupao" : "DeepSeek ka saved jawab dikhao";
}
