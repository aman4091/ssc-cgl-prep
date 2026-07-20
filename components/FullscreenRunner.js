"use client";

import { useEffect, useRef, useState } from "react";
import Markdown from "./Markdown";
import Diagram from "./Diagram";
import { recordAttempts, keyFor } from "@/lib/qstats";
import { logActivity } from "@/lib/activity";
import { addReview, setReviewErrorType } from "@/lib/qreview";

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

  // Per-question timer: pick 30/60/90/120 s and every question gets that much
  // time; run out → auto-advance (marked "time-up"). Works for text & image banks.
  const [perQSec, setPerQSec] = useState(0);        // per-question limit (s); 0 = off
  const [qDeadline, setQDeadline] = useState(0);    // epoch ms deadline for the current question
  const [timedOutQs, setTimedOutQs] = useState({}); // index -> true: ran out before answering
  const qTimeoutRef = useRef(null);

  // Per-question time spent — so the report can show ⏱ time-per-question.
  const [times, setTimes] = useState({});    // index -> seconds accumulated
  const qStartRef = useRef(Date.now());      // when the current question was entered

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
    // bank the time spent on the question you're finishing on
    setTimes((t) => ({ ...t, [cur]: (t[cur] || 0) + (Date.now() - qStartRef.current) / 1000 }));
    if (subject !== undefined) {
      const items = [];
      questions.forEach((qq, i) => {
        const answered = answers[i] !== undefined;
        const timedOut = !!timedOutQs[i];
        if (!answered && !timedOut) return; // never reached / untouched — skip
        const p = projection(qq);
        const correct = answered ? answers[i] === qq.answer : false; // time-up = wrong
        items.push({ q: p, correct });
        addReview(p, { subject, source: "fullscreen", category: title, correct });
        // Time limit mein nahi hua → Mistake Notebook mein "Time Laga" tag ke saath.
        if (!answered && timedOut) setReviewErrorType(keyFor(p), "time");
      });
      if (items.length) {
        recordAttempts(items);
        logActivity({
          label: title,
          kind: "pyq",
          count: items.length,
          correct: items.filter((x) => x.correct).length,
        });
      }
    }
    // reveal everything for the review pass
    const all = {};
    questions.forEach((_, i) => { all[i] = true; });
    setRevealed(all);
    setSubmitted(true);
  };
  const finishRef = useRef(finish);
  finishRef.current = finish;

  // Bank the seconds spent on the current question and restart its clock. Called
  // explicitly on every navigation (not via an effect — batching/StrictMode made
  // effect-based commits misattribute the time to the wrong question).
  const commitQTime = () => {
    setTimes((t) => ({ ...t, [cur]: (t[cur] || 0) + (Date.now() - qStartRef.current) / 1000 }));
    qStartRef.current = Date.now();
  };
  // Go to another question, banking the leaving question's time while attempting.
  const goToQ = (idx) => {
    if (idx === cur || idx < 0 || idx >= total) return;
    if (submitted === false) commitQTime();
    setCur(idx);
  };

  // Per-question clock ran out: note a time-up if unanswered, then move on / finish.
  qTimeoutRef.current = () => {
    if (answers[cur] === undefined) setTimedOutQs((m) => ({ ...m, [cur]: true }));
    if (cur < total - 1) goToQ(cur + 1);
    else finishRef.current();
  };

  // Fresh per-question clock on every question while the per-question timer is on.
  useEffect(() => {
    if (perQSec && submitted === false) setQDeadline(Date.now() + perQSec * 1000);
  }, [cur, perQSec, submitted]);

  // Ticking clock; auto-submit when the whole-test countdown hits zero, and
  // auto-advance when the per-question countdown does.
  useEffect(() => {
    if (submitted) return undefined;
    const t = setInterval(() => {
      const nowMs = Date.now();
      setNow(nowMs);
      if (deadline && nowMs >= deadline) { finishRef.current(); return; }
      if (perQSec && qDeadline && nowMs >= qDeadline) qTimeoutRef.current && qTimeoutRef.current();
    }, 250);
    return () => clearInterval(t);
  }, [submitted, deadline, perQSec, qDeadline]);

  // Keyboard: ← / → navigate, A–D or 1–4 pick, Enter = Show answer.
  useEffect(() => {
    const onKey = (e) => {
      if (submitted) return;
      // Don't hijack keys while typing in the jump box (a "2" there means page 2,
      // not option B).
      const tag = e.target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || e.target?.isContentEditable) return;
      if (e.key === "ArrowLeft") goToQ(cur - 1);
      else if (e.key === "ArrowRight") goToQ(cur + 1);
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
  const perQRemain = (perQSec && qDeadline && submitted === false) ? Math.max(0, Math.ceil((qDeadline - now) / 1000)) : null;
  const perQLow = perQRemain !== null && perQRemain <= 10;
  const timedOutCount = Object.values(timedOutQs).filter(Boolean).length;

  const pick = (oi) => { if (!submitted) setAnswers((a) => ({ ...a, [cur]: oi })); };
  const showAnswer = () => setRevealed((r) => ({ ...r, [cur]: !r[cur] }));
  const exit = () => { onExit && onExit(); };
  const retry = () => {
    setAnswers({}); setRevealed({}); setSubmitted(false);
    setCur(0); startRef.current = Date.now(); setNow(Date.now());
    setTimedOutQs({}); setTimes({});
    qStartRef.current = Date.now();
    if (perQSec) setQDeadline(Date.now() + perQSec * 1000);
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
          {submitted === false && (
            <select
              className="select"
              value={perQSec}
              onChange={(e) => setPerQSec(Number(e.target.value))}
              title="Per-question timer — har question par itna time"
              style={{ width: "auto", padding: "4px 26px 4px 10px", fontSize: "0.8rem" }}
            >
              <option value={0}>⏱ No limit</option>
              <option value={30}>30s / Q</option>
              <option value={60}>60s / Q</option>
              <option value={90}>90s / Q</option>
              <option value={120}>120s / Q</option>
            </select>
          )}
          {perQRemain !== null && (
            <span className="time-pill" style={perQLow
              ? { background: "var(--accent-wash)", color: "var(--danger)", borderColor: "var(--accent)", fontWeight: 700 }
              : { background: "var(--accent-wash)", color: "var(--accent-2)", fontWeight: 700 }}>
              ⏳ {perQRemain}s
            </span>
          )}
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
              {perQSec > 0 && <span style={{ color: "var(--danger)" }}>⏳ {timedOutCount} time-up ({perQSec}s/Q)</span>}
              <span className="muted">⏱ {fmt(elapsedSec)}</span>
            </div>
            <p className="muted mt-8" style={{ fontSize: "0.85rem" }}>
              Answers Mistake Notebook mein save ho gaye. Neeche har question ka time + review.
            </p>

            {/* Per-question time breakdown — tap a row to review that question. */}
            <div style={{ textAlign: "left", maxWidth: 540, margin: "18px auto 0" }}>
              <p className="muted" style={{ fontSize: "0.8rem", marginBottom: 8 }}>⏱ Per-question time (tap to review):</p>
              <div className="grid" style={{ gap: 6 }}>
                {questions.map((qq, i) => {
                  const answered = answers[i] !== undefined;
                  const isRight = answered && answers[i] === qq.answer;
                  const to = !!timedOutQs[i];
                  const status = to ? "⏳" : !answered ? "⭕" : isRight ? "✅" : "❌";
                  const col = to || (answered && !isRight) ? "var(--danger)" : !answered ? "var(--text-3)" : "var(--success)";
                  const slow = (times[i] || 0) > (perQSec || 60);
                  return (
                    <button
                      key={i}
                      className="row between"
                      onClick={() => { setSubmitted("review"); setCur(i); }}
                      style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--glass-border)", background: "var(--bg)", cursor: "pointer" }}
                    >
                      <span style={{ color: col, fontWeight: 600, fontSize: "0.9rem" }}>{status} Q{i + 1}{to ? " · time-up" : ""}</span>
                      <span className="time-pill" style={slow ? { background: "var(--accent-wash)", color: "var(--danger)" } : {}}>⏱ {fmt(times[i] || 0)}</span>
                    </button>
                  );
                })}
              </div>
            </div>

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
                  onChange={(e) => { const n = parseInt(e.target.value, 10); if (n >= 1 && n <= total) goToQ(n - 1); }}
                  title="Question number type karo — seedhe wahin chale jaoge"
                /> of {total}{answeredCount ? ` · ${answeredCount} answered` : ""}
                {submitted === "review" && (
                  <span className="time-pill" style={{ marginLeft: 8, ...(timedOutQs[cur] ? { background: "var(--accent-wash)", color: "var(--danger)" } : {}) }}>
                    ⏱ {fmt(times[cur] || 0)}{timedOutQs[cur] ? " · ⏳ time-up" : ""}
                  </span>
                )}
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
            <button className="btn btn--ghost" onClick={() => goToQ(cur - 1)} disabled={cur === 0}>← Prev</button>
            <button className="btn btn--ghost" onClick={showAnswer}>{shown ? "🙈 Hide" : "👁️ Show answer"}</button>
            {submitted === "review" ? (
              cur < total - 1
                ? <button className="btn btn--primary" onClick={() => goToQ(cur + 1)}>Next →</button>
                : <button className="btn btn--primary" onClick={() => setSubmitted(true)}>Done</button>
            ) : (
              // Submit/report is on EVERY question now — Next just moves along.
              <div className="row" style={{ gap: 8 }}>
                {cur < total - 1 && <button className="btn btn--ghost" onClick={() => goToQ(cur + 1)}>Next →</button>}
                <button className="btn btn--primary" onClick={finish}>{perQSec ? "⏹ Stop & report" : `✅ Submit (${answeredCount}/${total})`}</button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
