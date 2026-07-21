"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { askAI, generateSimilar } from "@/lib/client-ai";
import { saveQuiz, makeId } from "@/lib/storage";
import { recordAttempts, getStat, keyFor } from "@/lib/qstats";
import { isQBookmarked, toggleQBookmark } from "@/lib/qbookmarks";
import { getSavedShortcut, saveShortcutFor, clearSavedShortcut } from "@/lib/shortcuts";
import { addReview } from "@/lib/qreview";
import Markdown from "./Markdown";
import AskButtons from "./AskButtons";
import PasteAnswer from "./PasteAnswer";
import QTimer from "./QTimer";
import FullscreenTestButton from "./FullscreenTestButton";

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
export default function ReasonQuestionCard({ q, index, subject = "reasoning", chapterName, allQuestions }) {
  const router = useRouter();
  const [picked, setPicked] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [shortcut, setShortcut] = useState("");
  const [scShown, setScShown] = useState(false);
  const [scLoading, setScLoading] = useState(false);
  const [simLoading, setSimLoading] = useState(false);
  const [err, setErr] = useState("");
  const [recorded, setRecorded] = useState(false);
  const [bm, setBm] = useState(false);
  const [flash, setFlash] = useState("");
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

  useEffect(() => { setBm(isQBookmarked(tq)); setShortcut(getSavedShortcut(tq)); }, [q.id]);
  useEffect(() => () => { if (archiveTimer.current) clearTimeout(archiveTimer.current); }, []);

  const choose = (oi) => {
    if (picked !== null) return;
    const correct = oi === q.answer;
    setPicked(oi);
    setRevealed(true);
    if (!recorded) { recordAttempts([{ q: tq, correct }]); setRecorded(true); }
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

  const toggleBm = () => { setBm(toggleQBookmark(tq, subject)); };

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

  const st = getStat(tq);

  return (
    <article className="glass-card">
      <div className="q-head">
        <h3 style={{ fontSize: "1rem", fontWeight: 600, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <span className="rule-card__n">{index + 1}.</span>
        </h3>
        <div className="q-head__actions">
          <QTimer answered={picked !== null} />
          {st?.attempts > 0 && <span className="done-badge" title={`${st.correct}/${st.attempts}`}>🔁 {st.attempts}x</span>}
          {Array.isArray(allQuestions) && allQuestions.length > 1 && (
            <FullscreenTestButton
              questions={allQuestions}
              startIndex={allQuestions.indexOf(q)}
              title={chapterName || "Pinnacle Reasoning"}
              subject={subject}
              label="⛶"
              titleAttr="Isi question se full-screen test shuru karo"
            />
          )}
          {aiUseful && <span className="q-act--keep"><AskButtons q={tq} /></span>}
          <button className="btn btn--ghost btn--sm q-act--keep" onClick={make20} disabled={simLoading} title="Isi type ke 20 naye questions generate karo">{simLoading ? "…" : "🎯 20"}</button>
          <button className="btn btn--ghost btn--sm" onClick={toggleBm} title="Bookmark" style={bm ? { color: "var(--warning)" } : {}}>{bm ? "★" : "☆"}</button>
        </div>
      </div>

      {aiUseful && <PasteAnswer q={tq} />}

      {/* The chapter Direction — on a non-verbal question this IS the task */}
      {q.instruction && <p className="reason-direction mt-12">{q.instruction}</p>}

      {/* The stem — the figure (if any) is baked into this crop */}
      <a href={q.qImg} target="_blank" rel="noreferrer" className="math-img-wrap mt-12">
        <img src={q.qImg} alt={alt} loading="lazy" className="math-img" />
      </a>

      <div className="grid" style={{ gap: 8, marginTop: 12, gridTemplateColumns: "minmax(0, 1fr)" }}>
        {q.optImgs.map((src, oi) => {
          const s = {
            display: "flex", alignItems: "center", gap: 10, textAlign: "left",
            padding: "8px 12px", borderRadius: 10, minHeight: 46,
            borderWidth: "1px", borderStyle: "solid", borderColor: "var(--glass-border)",
            background: "var(--bg)", cursor: picked === null ? "pointer" : "default",
          };
          if (revealed) {
            if (oi === q.answer) { s.borderColor = "var(--ok)"; s.background = "var(--ok-wash)"; }
            else if (oi === picked) { s.borderColor = "var(--accent)"; s.background = "var(--accent-wash)"; }
          }
          return (
            <button key={oi} className="math-opt" style={s} onClick={() => choose(oi)}>
              <strong style={{ opacity: 0.7 }}>{String.fromCharCode(65 + oi)}</strong>
              {/* A figure option needs room; a text option is one line. */}
              <img
                src={src}
                alt={hasOptText ? q.optText[oi] : `Option ${String.fromCharCode(65 + oi)}`}
                loading="lazy"
                className={q.figOpts ? "math-opt-img math-opt-img--fig" : "math-opt-img"}
              />
              {revealed && oi === q.answer && <span style={{ color: "var(--success)", marginLeft: "auto" }}>✓</span>}
            </button>
          );
        })}
      </div>

      {flash && <p className="mt-12" style={{ color: "var(--accent-2)", fontSize: "0.85rem", fontWeight: 600 }}>{flash}</p>}

      {revealed && (
        <div className="mt-12">
          <strong style={{ color: "var(--text-2)", fontSize: "0.86rem" }}>Solution: </strong>
          {solution ? (
            <div className="mt-8" style={{ fontSize: "0.86rem" }}><Markdown>{solution}</Markdown></div>
          ) : q.solImg ? (
            <div className="math-img-wrap mt-8">
              <img src={q.solImg} alt="solution" loading="lazy" className="math-img" />
            </div>
          ) : (
            <p className="muted mt-8" style={{ fontSize: "0.85rem" }}>
              Is question ka solution book mein nahi chhapa. Correct option upar mark hai.
            </p>
          )}
        </div>
      )}

      {revealed && aiUseful && (
        <div className="row mt-12" style={{ gap: 8, flexWrap: "wrap" }}>
        </div>
      )}

      {revealed && !aiUseful && (
        <p className="muted mt-12" style={{ fontSize: "0.8rem" }}>
          🖼️ Figure question — ismein AI ko bhejne layak text hai hi nahi, isliye Gemini/shortcut
          buttons yahan nahi hain. Solution upar image mein hai.
        </p>
      )}

      {err && <p style={{ color: "var(--danger)", fontSize: "0.85rem", marginTop: 8 }}>{err}</p>}
      {scShown && shortcut && (
        <div className="answer-box mt-12">
          <Markdown>{shortcut}</Markdown>
          <button className="btn btn--ghost btn--sm mt-12" onClick={regenShortcut} disabled={scLoading}>
            {scLoading ? "Thinking…" : "🔄 New shortcut"}
          </button>
        </div>
      )}
    </article>
  );
}
