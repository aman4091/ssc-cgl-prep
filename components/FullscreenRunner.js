"use client";

import { useEffect, useRef, useState } from "react";
import Markdown from "./Markdown";
import Diagram from "./Diagram";
import { recordAttempts, keyFor } from "@/lib/qstats";
import { addReview } from "@/lib/qreview";

// Distraction-free, one-question-at-a-time TEST view that fills the whole screen.
// It works for EVERY bank because a question is either text (q.question/options/
// solution|explanation) or images (q.qImg/optImgs/solImg from the maths/reasoning
// crops). Picking an option only marks your choice — like a real exam nothing is
// revealed until you press "Show answer" or submit. Buttons are just Prev / Show
// answer / Next / Submit, exactly what the owner asked for.

const isImg = (q) => !!q?.qImg;

// Image banks key their stats on a text projection ([id] + lossy text), same as
// their cards do, so a question answered here and in the card share one stat row.
function projection(q) {
  if (!isImg(q)) return q;
  return {
    ...q,
    question: `[${q.id}] ${q.qText || ""}`.trim(),
    options: q.optText && q.optText.length === 4 ? q.optText : ["a", "b", "c", "d"],
  };
}

const fmtClock = (s) => `${Math.floor(s / 60)}:${String(Math.max(0, s) % 60).padStart(2, "0")}`;
const fmt = (sec) => {
  const s = Math.round(sec || 0);
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
};

export default function FullscreenRunner({
  questions = [],
  title = "Test",
  subject = "",
  timeLimitSec = 0,
  startIndex = 0,
  onExit,
}) {
  const [cur, setCur] = useState(() => Math.min(Math.max(0, startIndex), Math.max(0, questions.length - 1)));
  const [answers, setAnswers] = useState({});     // index -> chosen option index
  const [revealed, setRevealed] = useState({});   // index -> true (Show answer pressed)
  const [submitted, setSubmitted] = useState(false);
  const [now, setNow] = useState(Date.now());
  const rootRef = useRef(null);
  const startRef = useRef(Date.now());
  const deadline = timeLimitSec ? startRef.current + timeLimitSec * 1000 : 0;

  const total = questions.length;
  const q = questions[cur];
  const answeredCount = Object.keys(answers).length;

  // Enter native fullscreen (best-effort — the fixed overlay covers the screen
  // either way), lock body scroll, and restore both on exit.
  useEffect(() => {
    const el = rootRef.current;
    try { el?.requestFullscreen?.().catch(() => {}); } catch { /* unsupported */ }
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
      try { if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {}); } catch { /* ignore */ }
    };
  }, []);

  const finish = () => {
    if (submitted) return;
    if (subject !== undefined) {
      const items = [];
      questions.forEach((qq, i) => {
        if (answers[i] === undefined) return;
        const p = projection(qq);
        const correct = answers[i] === qq.answer;
        items.push({ q: p, correct });
        addReview(p, { subject, source: "fullscreen", category: title, correct });
      });
      if (items.length) recordAttempts(items);
    }
    // reveal everything for the review pass
    const all = {};
    questions.forEach((_, i) => { all[i] = true; });
    setRevealed(all);
    setSubmitted(true);
  };
  const finishRef = useRef(finish);
  finishRef.current = finish;

  // Ticking clock; auto-submit when a countdown hits zero.
  useEffect(() => {
    if (submitted) return undefined;
    const t = setInterval(() => {
      setNow(Date.now());
      if (deadline && Date.now() >= deadline) finishRef.current();
    }, 500);
    return () => clearInterval(t);
  }, [submitted, deadline]);

  // Keyboard: ← / → navigate, A–D or 1–4 pick, Enter = Show answer.
  useEffect(() => {
    const onKey = (e) => {
      if (submitted) return;
      // Don't hijack keys while typing in the jump box (a "2" there means page 2,
      // not option B).
      const tag = e.target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || e.target?.isContentEditable) return;
      if (e.key === "ArrowLeft") setCur((c) => Math.max(0, c - 1));
      else if (e.key === "ArrowRight") setCur((c) => Math.min(total - 1, c + 1));
      else if (e.key === "Enter") setRevealed((r) => ({ ...r, [cur]: true }));
      else {
        const opts = isImg(q) ? q?.optImgs : q?.options;
        const n = (opts || []).length;
        let idx = -1;
        if (/^[a-dA-D]$/.test(e.key)) idx = e.key.toLowerCase().charCodeAt(0) - 97;
        else if (/^[1-9]$/.test(e.key)) idx = Number(e.key) - 1;
        if (idx >= 0 && idx < n) setAnswers((a) => ({ ...a, [cur]: idx }));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cur, q, total, submitted]);

  if (!total) return null;

  const remainingSec = deadline ? Math.max(0, Math.ceil((deadline - now) / 1000)) : null;
  const elapsedSec = Math.floor((now - startRef.current) / 1000);
  const lowTime = remainingSec !== null && remainingSec <= 60;

  const pick = (oi) => { if (!submitted) setAnswers((a) => ({ ...a, [cur]: oi })); };
  const showAnswer = () => setRevealed((r) => ({ ...r, [cur]: !r[cur] }));
  const exit = () => { onExit && onExit(); };
  const retry = () => {
    setAnswers({}); setRevealed({}); setSubmitted(false);
    setCur(0); startRef.current = Date.now(); setNow(Date.now());
  };

  const img = isImg(q);
  const options = img ? q.optImgs : q.options;
  const shown = !!revealed[cur];
  const chosen = answers[cur];
  const solution = img ? q.solImg : (q.solution || q.explanation);

  // ---- result summary ----
  const correct = questions.reduce((a, qq, i) => (answers[i] === qq.answer ? a + 1 : a), 0);
  const wrong = questions.reduce((a, qq, i) => (answers[i] !== undefined && answers[i] !== qq.answer ? a + 1 : a), 0);
  const pct = total ? Math.round((correct / total) * 100) : 0;

  const optStyle = (oi) => {
    const s = {
      display: "flex", alignItems: "center", gap: 12, textAlign: "left",
      padding: "14px 16px", borderRadius: 12, minHeight: 52, width: "100%",
      borderWidth: "2px", borderStyle: "solid", borderColor: "var(--glass-border)",
      background: "var(--bg)", color: "var(--text-1)", fontSize: "1rem",
      cursor: submitted ? "default" : "pointer", transition: "all .12s ease",
    };
    if (shown && oi === q.answer) { s.borderColor = "var(--ok)"; s.background = "var(--ok-wash)"; }
    else if (shown && oi === chosen) { s.borderColor = "var(--danger)"; s.background = "var(--accent-wash)"; }
    else if (!shown && oi === chosen) { s.borderColor = "var(--accent)"; s.background = "var(--accent-wash)"; }
    return s;
  };

  return (
    <div className="fsr" ref={rootRef}>
      <div className="fsr__top">
        <span className="fsr__title">📝 {title}</span>
        <div className="row" style={{ gap: 8, alignItems: "center" }}>
          {remainingSec !== null ? (
            <span className="time-pill" style={lowTime
              ? { background: "var(--accent-wash)", color: "var(--danger)", borderColor: "var(--accent)" }
              : { background: "var(--accent-wash)", color: "var(--accent-2)" }}>
              ⏳ {fmtClock(remainingSec)}
            </span>
          ) : (
            <span className="time-pill">⏱ {fmtClock(elapsedSec)}</span>
          )}
          <button className="btn btn--ghost btn--sm" onClick={exit} title="Exit full screen">✕</button>
        </div>
      </div>

      {submitted === true ? (
        <div className="fsr__body">
          <div className="fsr__inner" style={{ textAlign: "center" }}>
            <div className="stat glass" style={{ display: "inline-flex", padding: "20px 28px", marginBottom: 16 }}>
              <span className="stat__num grad" style={{ fontSize: "2.2rem" }}>{correct}/{total}</span>
              <span className="stat__label">Score · {pct}%</span>
            </div>
            <div className="row" style={{ gap: 16, justifyContent: "center", flexWrap: "wrap", marginBottom: 8 }}>
              <span style={{ color: "var(--success)" }}>✅ {correct} correct</span>
              <span style={{ color: "var(--danger)" }}>❌ {wrong} wrong</span>
              <span className="muted">⭕ {total - correct - wrong} skipped</span>
              <span className="muted">⏱ {fmt(elapsedSec)}</span>
            </div>
            <p className="muted mt-8" style={{ fontSize: "0.85rem" }}>
              Answers Mistake Notebook mein save ho gaye. Neeche har question review kar sakte ho.
            </p>
            <div className="row mt-24" style={{ gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
              <button className="btn btn--primary" onClick={() => { setSubmitted("review"); setCur(0); }}>👁️ Review answers</button>
              <button className="btn btn--ghost" onClick={retry}>🔁 Retry</button>
              <button className="btn btn--ghost" onClick={exit}>← Exit</button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="fsr__body">
            <div className="fsr__inner">
              <p className="fsr__count">
                Question{" "}
                <input
                  className="fsr__jump"
                  type="number"
                  min={1}
                  max={total}
                  defaultValue={cur + 1}
                  key={cur}
                  onChange={(e) => { const n = parseInt(e.target.value, 10); if (n >= 1 && n <= total) setCur(n - 1); }}
                  title="Question number type karo — seedhe wahin chale jaoge"
                /> of {total}{answeredCount ? ` · ${answeredCount} answered` : ""}
              </p>

              {img ? (
                <a href={q.qImg} target="_blank" rel="noreferrer" className="math-img-wrap fsr__stem">
                  <img src={q.qImg} alt={q.qText || `Question ${cur + 1}`} className="math-img" />
                </a>
              ) : (
                <div className="fsr__stem">
                  {q.passage && <div className="passage-box" style={{ marginBottom: 12 }}><Markdown>{q.passage}</Markdown></div>}
                  <h2 className="fsr__q"><Markdown inline>{q.question}</Markdown></h2>
                  {(q.paper || q.source) && <span className="paper-tag">📄 {q.paper || q.source}</span>}
                  <Diagram svg={q.diagram} />
                </div>
              )}

              <div className="fsr__opts">
                {options.map((opt, oi) => (
                  <button key={oi} className="fsr__opt" style={optStyle(oi)} onClick={() => pick(oi)}>
                    <strong style={{ opacity: 0.7 }}>{String.fromCharCode(65 + oi)}</strong>
                    {img
                      ? <img src={opt} alt={`Option ${oi + 1}`} className="math-opt-img" />
                      : <span style={{ flex: 1, minWidth: 0 }}><Markdown inline>{opt}</Markdown></span>}
                    {shown && oi === q.answer && <span style={{ color: "var(--success)", marginLeft: "auto" }}>✓</span>}
                  </button>
                ))}
              </div>

              {shown && solution && (
                <div className="fsr__sol">
                  <strong style={{ color: "var(--text-2)" }}>Solution: </strong>
                  {img
                    ? <a href={q.solImg} target="_blank" rel="noreferrer" className="math-img-wrap mt-8"><img src={q.solImg} alt="solution" className="math-img" /></a>
                    : <Markdown inline>{solution}</Markdown>}
                </div>
              )}
            </div>
          </div>

          <div className="fsr__bottom">
            <button className="btn btn--ghost" onClick={() => setCur((c) => Math.max(0, c - 1))} disabled={cur === 0}>← Prev</button>
            <button className="btn btn--ghost" onClick={showAnswer}>{shown ? "🙈 Hide" : "👁️ Show answer"}</button>
            {submitted === "review" ? (
              cur < total - 1
                ? <button className="btn btn--primary" onClick={() => setCur((c) => Math.min(total - 1, c + 1))}>Next →</button>
                : <button className="btn btn--primary" onClick={() => setSubmitted(true)}>Done</button>
            ) : cur < total - 1 ? (
              <button className="btn btn--primary" onClick={() => setCur((c) => c + 1)}>Next →</button>
            ) : (
              <button className="btn btn--primary" onClick={finish}>✅ Submit ({answeredCount}/{total})</button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
