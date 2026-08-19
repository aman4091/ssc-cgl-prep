"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { askAI, generateSimilar } from "@/lib/client-ai";
import { saveQuiz, makeId } from "@/lib/storage";
import { setResume } from "@/lib/qprogress";
import { recordAttempts, getStat, keyFor } from "@/lib/qstats";
import { getSavedShortcut, saveShortcutFor, clearSavedShortcut } from "@/lib/shortcuts";
import { addReview } from "@/lib/qreview";
import Markdown from "./Markdown";
import Diagram from "./Diagram";
import QuestionEditor from "./QuestionEditor";
import AskButtons from "./AskButtons";
import PasteAnswer from "./PasteAnswer";
import { isDone } from "@/lib/qdone";
import { useExamMode } from "./ExamMode";

// One PYQ / chapter question — Answers page (/answers) wali shakl mein: peela
// "Question N" sar, neeche options, phir buttons ki patti, aur ANSWER apne alag
// block mein sabse neeche.
//
// Farak sirf itna: Answers page par answer hamesha khula rehta hai (wahan koi
// quiz nahi hai), yahan question attempt karne ki cheez hai — isliye answer ka
// block hamesha maujood hai par option chunne tak (ya 👁️ dabane tak) andar
// "Answer dekho" likha rehta hai. 👁️ se koi attempt record nahi hota.
export default function PyqQuestionCard({ q, index, subject, resumeKey, chapterName, chapterId, onDelete, onEdit, archiveOnAnswer, markControl, fileToChapter }) {
  const router = useRouter();
  // Test chal raha ho to card apna sahi/galat chhupa leta hai (dekho
  // components/ExamMode.js). Test ke bahar `exam` null hota hai aur sab
  // kuch pehle jaisa chalta hai.
  const exam = useExamMode();
  const locked = !!exam?.locked;
  // Board ko apna notebook-wala roop de do. Tasveer wale bank mein `tq`
  // (id + text) hi wo pehchaan hai jis se galat jawab darj hota hai —
  // chhoda hua question bhi usi pehchaan se jaana chahiye, warna ek hi
  // question notebook mein do baar chadh jata.
  const examReg = exam?.register;
  const examIdx = exam?.index;
  useEffect(() => { examReg?.(examIdx, q); }, [examReg, examIdx, q.question]);
  const [picked, setPicked] = useState(exam?.pick ?? null);
  const [revealed, setRevealed] = useState(false);
  const [shortcut, setShortcut] = useState("");
  const [scShown, setScShown] = useState(false);
  const [scLoading, setScLoading] = useState(false);
  const [simLoading, setSimLoading] = useState(false);
  const [err, setErr] = useState("");
  const [recorded, setRecorded] = useState(false);
  const [flash, setFlash] = useState("");
  const [editing, setEditing] = useState(false);
  const [peek, setPeek] = useState(false);   // 👁️ — bina attempt kiye answer
  const [done, setDone] = useState(false);   // sirf dikhawe ke liye (dhundhla card)
  const archiveTimer = useRef(null);
  useEffect(() => { setShortcut(getSavedShortcut(q)); }, [q]);
  // Paste kiya hua Gemini answer sabse upar hai: save hote hi card usse utha leta
  // hai aur answer block khol deta hai — book ka apna solution/explanation
  // (ya solution image) tab dikhta hi nahi. Reload ka intezaar nahi.
  useEffect(() => {
    const h = (e) => {
      if (e.detail?.key && e.detail.key !== keyFor(q)) return;
      const s = getSavedShortcut(q);
      setShortcut(s);
      if (s) setPeek(true);
    };
    window.addEventListener("cgl:shortcut-saved", h);
    return () => window.removeEventListener("cgl:shortcut-saved", h);
  }, [q]);

  useEffect(() => {
    const h = () => setDone(isDone(q));
    h();
    window.addEventListener("cgl:qdone-changed", h);
    return () => window.removeEventListener("cgl:qdone-changed", h);
  }, [q]);
  useEffect(() => () => { if (archiveTimer.current) clearTimeout(archiveTimer.current); }, []);

  const paper = q.paper || q.source;

  const choose = (oi) => {
    // Test ke dauraan jawab BADLA ja sakta hai — asli exam mein bhi option
    // badalte ho. Test ke bahar (padhai wale mod mein) ek baar chuna to chuna,
    // warna sahi jawab dekh kar wahi daba dene ka lalach rehta hai.
    if (picked !== null && !locked) return;
    const correct = oi === q.answer;
    setPicked(oi);
    // Test ke dauraan bas nishaan lagta hai. Stats, Mistake Notebook aur
    // "Aaj" ki ginti sab Submit par ek saath — warna jo jawab tumne baad mein
    // badal diya wo bhi ginti mein chadh jata.
    if (locked) { exam?.onPick?.(oi, correct); return; }
    setRevealed(true);
    if (resumeKey) setResume(resumeKey, index);
    if (!recorded) {
      recordAttempts([{ q, correct }]);
      setRecorded(true);
    }
    // Test chal raha ho to board ko batao — palette ka rang, ginti aur aakhri
    // natija wahin banta hai.
    exam?.onPick?.(oi, correct);
    // In a chapter list: archive to Attempted (+Correct/Wrong), bookmark, then
    // remove from the list so the next question moves up.
    if (archiveOnAnswer) {
      addReview(q, { subject, source: "chapter", category: chapterName || subject, chapterId, correct });
      // No auto-bookmark — only the ★ button bookmarks. Wrong ones still land in
      // the Mistake Notebook (Wrong bucket), and the question stays in the list.
      setFlash(correct
        ? "✓ Correct · tracked. Question list mein hi rahega."
        : "❌ Saved to Wrong (Mistakes). Question list mein hi rahega — solution padho.");
    }
  };

  const fetchShortcut = async () => {
    setScLoading(true); setErr("");
    try {
      const opts = q.options.map((o, i) => `${String.fromCharCode(65 + i)}) ${o}`).join("   ");
      const text =
        `${q.question}\nOptions: ${opts}\n` +
        (q.answer != null ? `Correct answer (already verified): ${String.fromCharCode(65 + q.answer)}) ${q.options[q.answer]}\n` : "") +
        (q.explanation ? `Reason: ${q.explanation}\n` : "");
      const { answer } = await askAI({ question: text, mode: "shortcut", subject });
      setShortcut(answer); setScShown(true); saveShortcutFor(q, answer); // persist
    } catch (e) { setErr(e.message); } finally { setScLoading(false); }
  };
  const toggleShortcut = () => {
    if (scShown) { setScShown(false); return; }        // hide
    if (shortcut) { setScShown(true); return; }         // show saved (never regenerates)
    fetchShortcut();
  };
  // Only "New shortcut" throws away the saved one and makes a fresh trick.
  const regenShortcut = () => { clearSavedShortcut(q); setShortcut(""); fetchShortcut(); };


  const make20 = async () => {
    setSimLoading(true); setErr("");
    try {
      const data = await generateSimilar({ question: q.question, options: q.options }, 20, subject);
      const quiz = { id: makeId(), title: data.title || "Similar (20)", source: "similar", createdAt: new Date().toISOString(), questions: data.questions };
      saveQuiz(quiz);
      router.push(`/quizzes/${quiz.id}`);
    } catch (e) { setErr(e.message); setSimLoading(false); }
  };

  // A pasted Gemini answer is the solution from then on — the book's own
  // explanation is dropped rather than shown underneath it.
  const solution = shortcut || q.solution || q.explanation || "";
  // Answer block khula hai ya nahi. 👁️ (peek) sirf dikhata hai — attempt,
  // timer aur wrong-book usse nahi chhedte.
  // Timer chalte waqt kuch nahi khulta; Submit ke baad sab khulta hai —
  // chhode hue question bhi.
  const shown = !locked && (!!exam?.revealAll || revealed || peek);

  const st = getStat(q);

  return (
    <article className={`qcard${done ? " is-done" : ""}`} id={`q-${index}`}>
      {/* Sar — Answers page ka `Question N (qid · date)`. Yahan qid ki jagah
          paper/source hai, kyunki PYQ ka pata wahi hai. */}
      <h2 className="qcard__h">
        Question {index + 1}
        <span className="qcard__qid">
          {paper ? `(${paper})` : ""}
          {/* "kitni baar attempt kiya, kitni baar sahi" — apne span mein, kyunki
              test ke dauraan ye batana hi nahi chahiye: "1x (1/1)" padhte hi
              pata chal jata hai ki pichhli baar sahi hua tha. */}
          {st?.attempts > 0 && (
            <span className="qcard__tries"> · 🔁 {st.attempts}x ({st.correct}/{st.attempts})</span>
          )}
        </span>
        {/* Gemini aur "20 similar" ab sar mein, sabse daayen. Neeche wali
            patti test ke dauraan chhupti hai, aur ye do cheezein wahan bhi
            kaam ki hain — sawaal ke saath hi. */}
        <span className="qcard__hacts">
          <span className="q-act--keep"><AskButtons q={q} subject={subject} /></span>
          <button className="btn btn--sm q-act--keep" onClick={make20} disabled={simLoading} title="Isi type ke 20 naye questions generate karo">{simLoading ? "…" : "🎯 20"}</button>
        </span>
      </h2>

      {/* The stem, on its own line under the number. Some questions ARE a crop of
          the printed page — the stacked fractions never made it into the PDF's
          text layer, so the image carries the stem, the tag and the options. */}
      <div className="qcard__stem">
        {q.img ? (
          <img src={q.img} alt={`Question ${index + 1}`} loading="lazy" className="q-crop" />
        ) : (
          <Markdown inline>{q.question}</Markdown>
        )}
      </div>

      <PasteAnswer q={q} />

      {markControl && <div className="pyq-mark mt-8">{markControl}</div>}

      {editing ? (
        <QuestionEditor
          question={q}
          onSave={(nq) => { onEdit(nq); setEditing(false); setPicked(null); setRevealed(false); setFlash(""); }}
          onCancel={() => setEditing(false)}
        />
      ) : (
      <>
      {/* Cloze Test / Comprehension: the passage IS the question — a Cloze stem
          is just a numbered blank like (17)____ that means nothing without it.
          Shared by ~5 questions each and up to 3,000 characters, so it scrolls
          in its own box rather than pushing the options off the screen. */}
      {q.passage && (
        <div className="passage-box mt-12">
          <Markdown>{q.passage}</Markdown>
        </div>
      )}

      <Diagram svg={q.diagram} />

      <div className="qcard__opts">
        {q.options.map((opt, oi) => {
          const right = shown && oi === q.answer;
          const wrong = shown && oi === picked && oi !== q.answer;
          return (
            <button
              key={oi}
              className={`qcard__opt${picked === null ? " is-pick" : ""}${picked === oi ? " is-picked" : ""}${right ? " is-right" : ""}${wrong ? " is-wrong" : ""}`}
              onClick={() => choose(oi)}
            >
              <b>{String.fromCharCode(65 + oi)}</b>
              {/* The crop already shows what each option says. */}
              {!q.img && <Markdown inline>{opt}</Markdown>}
              {right && <span style={{ color: "var(--ok)", marginLeft: 8 }}>✓</span>}
            </button>
          );
        })}
      </div>

      {/* Buttons ki patti — Answers page par ye card ke beech mein hai, yahan
          options ke NEECHE, kyunki upar rakhne se pehle sawaal padho ki nahi
          wala kram toot jata hai. */}
      <div className="qcard__acts">
        {!shown && (
          <button className="btn" onClick={() => setPeek(true)} title="Bina attempt kiye answer dekho">👁️ Answer</button>
        )}
        {onEdit && !editing && <button className="btn" onClick={() => setEditing(true)} title="Edit question">✏️</button>}
        {onDelete && <button className="btn" onClick={onDelete} title="Delete">🗑️</button>}
      </div>

      {q.keyDisputed && shown && (
        <p className="qcard__note">⚠ Book ki key galat lagti hai. {q.keyDisputed}</p>
      )}
      {q.sourceDefect && <p className="qcard__note">⚠ {q.sourceDefect}</p>}

      {flash && <p className="mt-12" style={{ color: "var(--accent-2)", fontSize: "0.85rem", fontWeight: 600 }}>{flash}</p>}
      {err && <p style={{ color: "var(--danger)", fontSize: "0.85rem", marginTop: 8 }}>{err}</p>}

      {/* ANSWER — Answers page ki tarah apne block mein, sabse neeche. Block
          hamesha maujood hai; khaali ho to wahi batata hai aur khol deta hai. */}
      {shown ? (
        <div className="qcard__answer">
          {q.answer != null && q.options?.[q.answer] != null && (
            <p style={{ margin: "0 0 8px", color: "var(--ok)", fontWeight: 700 }}>
              ✓ Sahi jawab: {String.fromCharCode(65 + q.answer)}
              {!q.img && q.options[q.answer] ? ` — ${q.options[q.answer]}` : ""}
            </p>
          )}
          {solution ? <Markdown>{solution}</Markdown> : (
            <span style={{ color: "var(--text-3)", fontStyle: "italic" }}>
              Is question ka explanation abhi nahi hai — ✨ Gemini se laa kar paste kar do.
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
      </>
      )}
    </article>
  );
}
