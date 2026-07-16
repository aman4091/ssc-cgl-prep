"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { askAI, generateSimilar } from "@/lib/client-ai";
import { saveQuiz, makeId } from "@/lib/storage";
import { recordAttempts, getStat } from "@/lib/qstats";
import { isQBookmarked, toggleQBookmark } from "@/lib/qbookmarks";
import { getSavedShortcut, saveShortcutFor, clearSavedShortcut } from "@/lib/shortcuts";
import { addReview } from "@/lib/qreview";
import Markdown from "./Markdown";
import Diagram from "./Diagram";
import QuestionFollowup from "./QuestionFollowup";
import QuestionEditor from "./QuestionEditor";
import AddToChapter from "./AddToChapter";
import AskButtons from "./AskButtons";
import PasteAnswer from "./PasteAnswer";
import QTimer from "./QTimer";

// One PYQ / chapter question shown as an interactive quiz card:
// pick an option -> reveal correct/wrong + solution, plus shortcut / 20-similar / doubt.
export default function PyqQuestionCard({ q, index, subject, chapterName, chapterId, onDelete, onEdit, archiveOnAnswer, markControl, fileToChapter }) {
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
  const [editing, setEditing] = useState(false);
  const archiveTimer = useRef(null);
  useEffect(() => { setBm(isQBookmarked(q)); setShortcut(getSavedShortcut(q)); }, [q]);
  useEffect(() => () => { if (archiveTimer.current) clearTimeout(archiveTimer.current); }, []);

  const paper = q.paper || q.source;

  const choose = (oi) => {
    if (picked !== null) return;
    const correct = oi === q.answer;
    setPicked(oi);
    setRevealed(true);
    if (!recorded) { recordAttempts([{ q, correct }]); setRecorded(true); }
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

  const toggleBm = () => { const on = toggleQBookmark(q, subject); setBm(on); };

  const make20 = async () => {
    setSimLoading(true); setErr("");
    try {
      const data = await generateSimilar({ question: q.question, options: q.options }, 20, subject);
      const quiz = { id: makeId(), title: data.title || "Similar (20)", source: "similar", createdAt: new Date().toISOString(), questions: data.questions };
      saveQuiz(quiz);
      router.push(`/quizzes/${quiz.id}`);
    } catch (e) { setErr(e.message); setSimLoading(false); }
  };

  const st = getStat(q);

  return (
    <article className="glass-card">
      <div className="q-head">
        <h3 style={{ fontSize: "1rem", fontWeight: 600 }}>
          <span className="rule-card__n">{index + 1}.</span> <Markdown inline>{q.question}</Markdown>
          {q.pyq && <span className="paper-tag paper-tag--pyq">PYQ</span>}
          {paper && <span className="paper-tag">📄 {paper}</span>}
        </h3>
        <div className="q-head__actions">
          <QTimer answered={picked !== null} />
          {st?.attempts > 0 && <span className="done-badge" title={`${st.correct}/${st.attempts}`}>🔁 {st.attempts}x</span>}
          <AskButtons q={q} />
          {onEdit && !editing && <button className="btn btn--ghost btn--sm" onClick={() => setEditing(true)} title="Edit question">✏️</button>}
          <button className="btn btn--ghost btn--sm" onClick={toggleBm} title="Bookmark" style={bm ? { color: "var(--warning)" } : {}}>{bm ? "★" : "☆"}</button>
          {onDelete && <button className="btn btn--ghost btn--sm" onClick={onDelete}>✕</button>}
        </div>
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

      <div className="grid" style={{ gap: 8, marginTop: 12 }}>
        {q.options.map((opt, oi) => {
          const s = {
            textAlign: "left", padding: "10px 14px", borderRadius: 10,
            borderWidth: "1px", borderStyle: "solid", borderColor: "var(--glass-border)",
            background: "var(--bg)", color: "var(--text-1)", cursor: picked === null ? "pointer" : "default", fontSize: "0.92rem",
          };
          if (revealed) {
            if (oi === q.answer) { s.borderColor = "rgba(107,211,154,0.7)"; s.background = "rgba(107,211,154,0.14)"; }
            else if (oi === picked) { s.borderColor = "rgba(255,138,122,0.7)"; s.background = "rgba(255,138,122,0.14)"; }
          }
          return (
            <button key={oi} style={s} onClick={() => choose(oi)}>
              <strong style={{ opacity: 0.7, marginRight: 8 }}>{String.fromCharCode(65 + oi)}</strong>
              <Markdown inline>{opt}</Markdown>
              {revealed && oi === q.answer && <span style={{ color: "var(--success)", marginLeft: 8 }}>✓</span>}
            </button>
          );
        })}
      </div>

      {flash && <p className="mt-12" style={{ color: "var(--accent-2)", fontSize: "0.85rem", fontWeight: 600 }}>{flash}</p>}

      {fileToChapter && <div className="mt-12"><AddToChapter q={q} /></div>}

      {!revealed && <button className="btn btn--ghost btn--sm mt-12" onClick={() => setRevealed(true)}>👁️ Show answer</button>}

      {revealed && (q.solution || q.explanation) && (
        <div className="muted mt-12" style={{ fontSize: "0.86rem" }}>
          <strong style={{ color: "var(--text-2)" }}>Solution: </strong>
          <Markdown inline>{q.solution || q.explanation}</Markdown>
        </div>
      )}

      {revealed && (
        <div className="row mt-12" style={{ gap: 8, flexWrap: "wrap" }}>
          <button className="btn btn--ghost btn--sm" onClick={toggleShortcut} disabled={scLoading}>{scLoading ? "Thinking…" : scShown ? "⚡ Hide shortcut" : "⚡ Shortcut trick"}</button>
          <button className="btn btn--ghost btn--sm" onClick={make20} disabled={simLoading}>{simLoading ? "Generating…" : "🎯 20 similar"}</button>
        </div>
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

      {revealed && <QuestionFollowup question={q} subject={subject} />}
      </>
      )}
    </article>
  );
}
