"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { askAI, generateSimilar } from "@/lib/client-ai";
import { saveQuiz, makeId } from "@/lib/storage";
import { recordAttempts, getStat } from "@/lib/qstats";
import { isQBookmarked, toggleQBookmark } from "@/lib/qbookmarks";
import Markdown from "./Markdown";
import Diagram from "./Diagram";
import QuestionFollowup from "./QuestionFollowup";

// One PYQ / chapter question shown as an interactive quiz card:
// pick an option -> reveal correct/wrong + solution, plus shortcut / 20-similar / doubt.
export default function PyqQuestionCard({ q, index, subject, chapterName, onDelete }) {
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
  useEffect(() => { setBm(isQBookmarked(q)); }, [q]);

  const paper = q.paper || q.source;

  const choose = (oi) => {
    if (picked !== null) return;
    setPicked(oi);
    setRevealed(true);
    if (!recorded) { recordAttempts([{ q, correct: oi === q.answer }]); setRecorded(true); }
  };

  const toggleShortcut = async () => {
    if (scShown) { setScShown(false); return; }        // hide
    if (shortcut) { setScShown(true); return; }         // show cached
    setScLoading(true); setErr("");
    try {
      const opts = q.options.map((o, i) => `${String.fromCharCode(65 + i)}) ${o}`).join("   ");
      const text =
        `${q.question}\nOptions: ${opts}\n` +
        (q.answer != null ? `Correct answer (already verified): ${String.fromCharCode(65 + q.answer)}) ${q.options[q.answer]}\n` : "") +
        (q.explanation ? `Reason: ${q.explanation}\n` : "");
      const { answer } = await askAI({ question: text, mode: "shortcut", subject });
      setShortcut(answer); setScShown(true);
    } catch (e) { setErr(e.message); } finally { setScLoading(false); }
  };

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
      <div className="row between" style={{ alignItems: "flex-start", gap: 10 }}>
        <h3 style={{ fontSize: "1rem", fontWeight: 600 }}>
          <span className="rule-card__n">{index + 1}.</span> <Markdown inline>{q.question}</Markdown>
          {paper && <span className="paper-tag">📄 {paper}</span>}
        </h3>
        <div className="row" style={{ gap: 6, flexShrink: 0 }}>
          {st?.attempts > 0 && <span className="done-badge" title={`${st.correct}/${st.attempts}`}>🔁 {st.attempts}x</span>}
          <button className="btn btn--ghost btn--sm" onClick={toggleBm} title="Bookmark" style={bm ? { color: "var(--warning)" } : {}}>{bm ? "★" : "☆"}</button>
          {onDelete && <button className="btn btn--ghost btn--sm" onClick={onDelete}>✕</button>}
        </div>
      </div>

      <Diagram svg={q.diagram} />

      <div className="grid" style={{ gap: 8, marginTop: 12 }}>
        {q.options.map((opt, oi) => {
          const s = {
            textAlign: "left", padding: "10px 14px", borderRadius: 10,
            borderWidth: "1px", borderStyle: "solid", borderColor: "var(--glass-border)",
            background: "rgba(0,0,0,0.2)", color: "var(--text-1)", cursor: picked === null ? "pointer" : "default", fontSize: "0.92rem",
          };
          if (revealed) {
            if (oi === q.answer) { s.borderColor = "rgba(52,211,153,0.7)"; s.background = "rgba(52,211,153,0.14)"; }
            else if (oi === picked) { s.borderColor = "rgba(251,113,133,0.7)"; s.background = "rgba(251,113,133,0.14)"; }
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
      {scShown && shortcut && <div className="answer-box mt-12"><Markdown>{shortcut}</Markdown></div>}

      {revealed && <QuestionFollowup question={q} subject={subject} />}
    </article>
  );
}
