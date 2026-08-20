"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { askAI, generateSimilar } from "@/lib/client-ai";
import { saveQuiz, makeId } from "@/lib/storage";
import { setResume } from "@/lib/qprogress";
import { recordAttempts, keyFor } from "@/lib/qstats";
import { getSavedShortcut, saveShortcutFor, clearSavedShortcut } from "@/lib/shortcuts";
import { addReview } from "@/lib/qreview";
import Markdown from "./Markdown";
import AskButtons from "./AskButtons";
import PasteAnswer from "./PasteAnswer";
import { isDone } from "@/lib/qdone";
import { useExamMode } from "./ExamMode";

// A reasoning question is IMAGES — MathQuestionCard's twin (same answer/reveal/
// archive/bookmark machinery, same shortcut / 20-similar / ask buttons), with
// three differences the reasoning book forces:
//
//  1. `instruction` — the chapter Direction. On a non-verbal question the stem is
//     generic ("Choose the missing shape") and the real task lives only here, so
//     it renders above the stem.
//  2. The PYQ badge is conditional: only 1,698 of the 3,543 carry an exam tag,
//     the rest are the book's own practice questions.
//  3. It uses the SHARED Gemini prompt (AskButtons), not the maths bank's
//     "solve in seconds" one — that was scoped to maths on purpose.
//
// The AI buttons run on the lossy text. On a VERBAL question that text is real
// (a figure in the stem may be missing — the same honest ceiling as maths). On a
// NON-VERBAL one there is no text at all: the stem reads "Select the option in
// which the given figure is embedded" and the options are four pictures, so the
// copy would go out as "A) a  B) b  C) c  D) d" and any answer that came back
// would be invented. So the AI helpers are hidden on those 640 questions rather
// than shipped as a button that reliably lies.
export default function ReasonQuestionCard({ q, index, subject = "reasoning", resumeKey, chapterName }) {
  const router = useRouter();
  // Test chal raha ho to card apna sahi/galat chhupa leta hai (dekho
  // components/ExamMode.js). Test ke bahar `exam` null hota hai aur sab
  // kuch pehle jaisa chalta hai.
  const exam = useExamMode();
  const locked = !!exam?.locked;
  const [picked, setPicked] = useState(exam?.pick ?? null);
  const [revealed, setRevealed] = useState(false);
  const [shortcut, setShortcut] = useState("");
  const [scShown, setScShown] = useState(false);
  const [scLoading, setScLoading] = useState(false);
  const [simLoading, setSimLoading] = useState(false);
  const [err, setErr] = useState("");
  const [recorded, setRecorded] = useState(false);
  const [flash, setFlash] = useState("");
  const [peek, setPeek] = useState(false);   // 👁️ — bina attempt kiye answer
  const [done, setDone] = useState(false);   // sirf dikhawe ke liye (dhundhla card)
  const archiveTimer = useRef(null);

  // The text projection the machinery keys on. `id` in the question text keeps
  // the stats/bookmark/shortcut key unique and stable even when two questions'
  // lossy text collides or (non-verbal) is empty.
  const alt = q.qText || `Reasoning ${q.id}`;
  const hasOptText = Array.isArray(q.optText) && q.optText.filter(Boolean).length === 4;
  // No option text = the question is pictures. Nothing worth sending to an AI.
  const aiUseful = hasOptText;
  const tq = {
    ...q,
    question: `[${q.id}] ${q.instruction ? `${q.instruction} ` : ""}${q.qText || ""}`.trim(),
    options: hasOptText ? q.optText : ["a", "b", "c", "d"],
  };

  // Board ko apna notebook-wala roop de do. Tasveer wale bank mein `tq`
  // (id + text) hi wo pehchaan hai jis se galat jawab darj hota hai —
  // chhoda hua question bhi usi pehchaan se jaana chahiye, warna ek hi
  // question notebook mein do baar chadh jata.
  const examReg = exam?.register;
  const examIdx = exam?.index;
  useEffect(() => { examReg?.(examIdx, tq); }, [examReg, examIdx, tq.question]);

  useEffect(() => { setShortcut(getSavedShortcut(tq)); }, [q.id]);
  // Paste kiya hua Gemini answer sabse upar hai: save hote hi card usse utha leta
  // hai aur answer block khol deta hai — book ka apna solution/explanation
  // (ya solution image) tab dikhta hi nahi. Reload ka intezaar nahi.
  useEffect(() => {
    const h = (e) => {
      if (e.detail?.key && e.detail.key !== keyFor(tq)) return;
      const s = getSavedShortcut(tq);
      setShortcut(s);
      if (s) setPeek(true);
    };
    window.addEventListener("cgl:shortcut-saved", h);
    return () => window.removeEventListener("cgl:shortcut-saved", h);
  }, [q.id]);

  useEffect(() => {
    const h = () => setDone(isDone(q));
    h();
    window.addEventListener("cgl:qdone-changed", h);
    return () => window.removeEventListener("cgl:qdone-changed", h);
  }, [q]);
  useEffect(() => () => { if (archiveTimer.current) clearTimeout(archiveTimer.current); }, []);

  const choose = (oi) => {
    // Test ke dauraan jawab BADLA ja sakta hai — asli exam mein bhi option
    // badalte ho. Test ke bahar ek baar chuna to chuna.
    if (picked !== null && !locked) return;
    const correct = oi === q.answer;
    setPicked(oi);
    // Test ke dauraan bas nishaan; stats/notebook/ginti sab Submit par.
    if (locked) { exam?.onPick?.(oi, correct); return; }
    setRevealed(true);
    if (resumeKey) setResume(resumeKey, index);
    if (!recorded) { recordAttempts([{ q: tq, correct }]); setRecorded(true); }
    // Test chal raha ho to board ko batao — palette ka rang, ginti aur aakhri
    // natija wahin banta hai.
    exam?.onPick?.(oi, correct);
    addReview(tq, { subject, source: "chapter", category: chapterName || subject, correct });
    setFlash(correct
      ? "✓ Correct · tracked. Question list mein hi rahega."
      : "❌ Saved to Wrong (Mistakes). Solution dekho.");
  };

  const fetchShortcut = async () => {
    setScLoading(true); setErr("");
    try {
      const opts = tq.options.map((o, i) => `${String.fromCharCode(65 + i)}) ${o}`).join("   ");
      const text =
        `${q.instruction ? `${q.instruction}\n` : ""}${q.qText || ""}\nOptions: ${opts}\n` +
        `Correct answer (already verified): ${String.fromCharCode(65 + q.answer)}) ${tq.options[q.answer]}\n`;
      const { answer } = await askAI({ question: text, mode: "shortcut", subject });
      setShortcut(answer); setScShown(true); saveShortcutFor(tq, answer);
    } catch (e) { setErr(e.message); } finally { setScLoading(false); }
  };
  const toggleShortcut = () => {
    if (scShown) { setScShown(false); return; }
    if (shortcut) { setScShown(true); return; }
    fetchShortcut();
  };
  const regenShortcut = () => { clearSavedShortcut(tq); setShortcut(""); fetchShortcut(); };


  const make20 = async () => {
    setSimLoading(true); setErr("");
    try {
      const stem = `${q.instruction ? `${q.instruction}\n` : ""}${q.qText || ""}`.trim();
      const data = await generateSimilar({ question: stem, options: tq.options }, 20, subject);
      const quiz = { id: makeId(), title: data.title || "Similar (20)", source: "similar", createdAt: new Date().toISOString(), questions: data.questions };
      saveQuiz(quiz);
      router.push(`/quizzes/${quiz.id}`);
    } catch (e) { setErr(e.message); setSimLoading(false); }
  };

  // A pasted Gemini answer is the solution from then on — the book's own
  // solution image is dropped rather than shown underneath it.
  const solution = shortcut || q.solution || q.explanation || "";
  // Timer chalte waqt kuch nahi khulta; Submit ke baad sab khulta hai —
  // chhode hue question bhi.
  const shown = !locked && (!!exam?.revealAll || revealed || peek);


  return (
    <article className={`qcard${done ? " is-done" : ""}`} id={`q-${index}`}>
      <h2 className="qcard__h">
        Question {index + 1}
        <span className="qcard__qid">
          {q.id ? `(${q.id})` : ""}
        </span>
        {/* Gemini aur "20 similar" ab sar mein, sabse daayen. Neeche wali
            patti test ke dauraan chhupti hai, aur ye do cheezein wahan bhi
            kaam ki hain — sawaal ke saath hi. */}
        <span className="qcard__hacts">
          <span className="q-act--keep"><AskButtons q={tq} subject={subject} /></span>
          <button className="btn btn--sm q-act--keep" onClick={make20} disabled={simLoading} title="Isi type ke 20 naye questions generate karo">{simLoading ? "…" : "🎯 20"}</button>
        </span>
      </h2>

      {/* The chapter Direction — on a non-verbal question this IS the task */}
      {q.instruction && <p className="reason-direction">{q.instruction}</p>}

      {/* The stem — the figure (if any) is baked into this crop */}
      <a href={q.qImg} target="_blank" rel="noreferrer" className="math-img-wrap mt-12">
        <img src={q.qImg} alt={alt} loading="lazy" className="math-img" />
      </a>

      {/* Paste box HAR question par — figure (non-verbal) par bhi. ✨ Gemini ab
          tasveer copy karta hai, to answer wahan se aata hai; usse rakhne ki jagah
          na hone se wo mehnat bekaar ja rahi thi. */}
      <PasteAnswer q={tq} />

      <div className="qcard__opts" style={{ gridTemplateColumns: "minmax(0, 1fr)" }}>
        {q.optImgs.map((src, oi) => {
          const right = shown && oi === q.answer;
          const wrong = shown && oi === picked && oi !== q.answer;
          return (
            <button
              key={oi}
              className={`qcard__opt math-opt${picked === null ? " is-pick" : ""}${picked === oi ? " is-picked" : ""}${right ? " is-right" : ""}${wrong ? " is-wrong" : ""}`}
              style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 46 }}
              onClick={() => choose(oi)}
            >
              <b>{String.fromCharCode(65 + oi)}</b>
              {/* A figure option needs room; a text option is one line. */}
              <img
                src={src}
                alt={hasOptText ? q.optText[oi] : `Option ${String.fromCharCode(65 + oi)}`}
                loading="lazy"
                className={q.figOpts ? "math-opt-img math-opt-img--fig" : "math-opt-img"}
              />
              {right && <span style={{ color: "var(--ok)", marginLeft: "auto" }}>✓</span>}
              {/* Pichhli baar isi option par haath gaya tha — 🙈 mode mein
                  board yahi batata hai (ExamMode ka firstPick). Jawab khulne
                  ke BAAD hi dikhta hai, warna nishaan hi answer bata deta. */}
              {shown && exam?.firstPick === oi && (
                <span className={`qcard__first${exam.firstCorrect ? " is-ok" : " is-bad"}`}>
                  first attempt
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="qcard__acts">
        {!shown && (
          <button className="btn" onClick={() => setPeek(true)} title="Bina attempt kiye solution dekho">👁️ Answer</button>
        )}
        {/* Gemini ab HAR question par — non-verbal par bhi. Pehle ye chhupa tha
            kyunki bhejne layak text hi nahi tha; ab TASVEER jati hai, to figure
            question hi sabse zyada faayda uthata hai. */}
      </div>

      {flash && <p className="mt-12" style={{ color: "var(--accent-2)", fontSize: "0.85rem", fontWeight: 600 }}>{flash}</p>}
      {err && <p style={{ color: "var(--danger)", fontSize: "0.85rem", marginTop: 8 }}>{err}</p>}
      {!aiUseful && (
        <p className="qcard__note">
          🖼️ Figure question — ismein bhejne layak TEXT nahi hai, isliye ✨ Gemini question ki
          tasveer copy karta hai. (🎯 20 text par tika hai, wo yahan kaam nahi karega.)
        </p>
      )}

      {/* ANSWER — Answers page wala alag block, sabse neeche. */}
      {shown ? (
        <div className="qcard__answer">
          <p style={{ margin: "0 0 8px", color: "var(--ok)", fontWeight: 700 }}>
            ✓ Sahi jawab: {String.fromCharCode(65 + q.answer)}
          </p>
          {solution ? (
            <Markdown>{solution}</Markdown>
          ) : q.solImg ? (
            <div className="math-img-wrap">
              <img src={q.solImg} alt="solution" loading="lazy" className="math-img" />
            </div>
          ) : (
            <span style={{ color: "var(--text-3)", fontStyle: "italic" }}>
              Is question ka solution book mein nahi chhapa. Correct option upar mark hai.
            </span>
          )}
          {scShown && shortcut && (
            <button className="btn btn--ghost btn--sm mt-12" onClick={regenShortcut} disabled={scLoading}>
              {scLoading ? "Thinking…" : "🔄 New shortcut"}
            </button>
          )}
        </div>
      ) : (
        <div className="qcard__answer qcard__answer--empty">
          Answer neeche yahin aayega — option chuno ya 👁️ dabao.
        </div>
      )}
    </article>
  );
}
