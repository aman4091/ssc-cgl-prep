"use client";

// App ka data IndexedDB (lib/bigstore) mein hai — aur IDB async hai. Pages
// synchronously padhte hain, isliye pehle store hydrate hone do, tabhi UI
// dikhao; warna pehli render par "kuch nahi hai" flash hota.
//
// Server aur pehli client render — dono par placeholder aata hai, isliye koi
// hydration mismatch nahi. Safety timeout: IDB kabhi atak jaye to bhi app
// khulti hai (bigstore khud localStorage par gir jata hai).

import { useEffect, useState } from "react";
import { hydrateStore, storeFlush } from "@/lib/bigstore";
import { importGeminiAnswers } from "@/lib/geminiimport";
import { healOnce } from "@/lib/selfheal";
import { runOneTimeReset, runResetV3, clearOldGeminiPrompt, clearStaleQuizzes, applyAnswerPrompts, applyGsClusterPrompt, applyGsPromptV2, fixMisfiledEnglishMocks, fixMissionStart, clearOldMissionDone, applyGsPromptV7 } from "@/lib/resetonce";
import { ANSWER_PROMPTS } from "@/lib/answerprompts";
import { DEFAULT_START } from "@/lib/mission";
import { dedupeUserQuestions } from "@/lib/userpyq";

export default function StoreGate({ children }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let done = false;
    const finish = () => { if (!done) { done = true; setReady(true); } };
    // Safaya sirf hydrate POORA hone par. Pehle chalate to khaali cache par
    // likhte aur IDB se purana data uske baad wapas aa jata. Safety timeout ise
    // nahi chalata — wo sirf UI kholta hai.
    hydrateStore()
      .then(() => { runOneTimeReset(); runResetV3(); clearOldGeminiPrompt(); clearStaleQuizzes(); applyAnswerPrompts(ANSWER_PROMPTS); applyGsClusterPrompt(ANSWER_PROMPTS.gs); applyGsPromptV2(ANSWER_PROMPTS.gs); fixMisfiledEnglishMocks(); fixMissionStart(DEFAULT_START); clearOldMissionDone(); applyGsPromptV7(ANSWER_PROMPTS.gs); importGeminiAnswers().catch(() => {}); try { dedupeUserQuestions(); } catch { /* ignore */ } })
      .catch(() => {})
      .finally(finish);
    // 2s bahut kam tha: PC par bada data (tasveerein) padhne mein zyada lagta,
    // UI khul jaata aur khaali store par likhai ho jaati (Answers ke sawaal
    // aise gaye). Ab lambi rukaavat — aur bigstore khud bhi tab tak likhne nahi deta.
    const t = setTimeout(finish, 12000);
    // Tab band/hide hote waqt pending writes turant likh do.
    const flush = () => { storeFlush(); };
    document.addEventListener("visibilitychange", flush);
    window.addEventListener("pagehide", flush);
    // Doosre device se sawaal ki doosri copy aayi ho to wo bhi hatao (lib/userpyq).
    const dedupe = () => { try { dedupeUserQuestions(); } catch { /* ignore */ } };
    window.addEventListener("cgl:sync-applied", dedupe);
    return () => {
      window.removeEventListener("cgl:sync-applied", dedupe);
      clearTimeout(t);
      document.removeEventListener("visibilitychange", flush);
      window.removeEventListener("pagehide", flush);
    };
  }, []);

  if (!ready) return <div className="placeholder" style={{ margin: 24 }}>…</div>;
  return <>{children}</>;
}
