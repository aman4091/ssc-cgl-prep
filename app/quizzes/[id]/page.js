"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getQuiz, saveQuiz, makeId } from "@/lib/storage";
import { askAI, generateSimilar } from "@/lib/client-ai";
import Markdown from "@/components/Markdown";
import Diagram from "@/components/Diagram";
import QuestionFollowup from "@/components/QuestionFollowup";
import AddToChapter from "@/components/AddToChapter";
import AskButtons from "@/components/AskButtons";
import PasteAnswer from "@/components/PasteAnswer";
import { recordAttempts, getStat, keyFor } from "@/lib/qstats";
import { isQBookmarked, toggleQBookmark } from "@/lib/qbookmarks";
import { getSavedShortcut, saveShortcutFor, clearSavedShortcut } from "@/lib/shortcuts";
import { recordQuizAttempts, quizCategory, setReviewErrorType, ERROR_TYPES } from "@/lib/qreview";

function fmt(sec) {
  const s = Math.round(sec || 0);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

export default function QuizPlayer() {
  const { id } = useParams();
  const router = useRouter();
  const [quiz, setQuiz] = useState(undefined);

  // attempt state
  const [cur, setCur] = useState(0);
  const [answers, setAnswers] = useState({});
  const [times, setTimes] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [now, setNow] = useState(0); // for live timer
  const [deadline, setDeadline] = useState(0); // epoch ms when time runs out (0 = no limit)
  const [timedOut, setTimedOut] = useState(false);
  const startRef = useRef(0);
  const submitRef = useRef(null); // latest submit fn for the timer to call

  // per-question result actions
  const [shortcuts, setShortcuts] = useState({});
  const [scLoading, setScLoading] = useState({});
  const [scShown, setScShown] = useState({});
  const [explains, setExplains] = useState({});
  const [exLoading, setExLoading] = useState({});
  const [exShown, setExShown] = useState({});
  const [simLoading, setSimLoading] = useState({});
  const [actionErr, setActionErr] = useState({});
  const [, bumpBm] = useState(0); // re-render on bookmark toggle
  const [errorTags, setErrorTags] = useState({}); // qi -> errorType (Mistake Notebook)

  const tagError = (qi, q, type) => {
    setReviewErrorType(keyFor(q), type);
    setErrorTags((m) => ({ ...m, [qi]: m[qi] === type ? "" : type }));
  };

  useEffect(() => {
    let cancelled = false;
    const apply = (qz) => {
      if (cancelled) return;
      setQuiz(qz || null);
      startRef.current = Date.now();
      if (qz?.timeLimitSec) setDeadline(Date.now() + qz.timeLimitSec * 1000);
    };
    const local = getQuiz(id);
    if (local) { apply(local); return; }
    // Imported Quiz Bank / Mock Test — served on demand from /public (keeps localStorage light).
    if (typeof id === "string" && id.startsWith("bank_")) {
      setQuiz(undefined); // stay in the loading state while fetching
      fetch(`/quizbank/${encodeURIComponent(id)}.json`)
        .then((r) => (r.ok ? r.json() : null))
        .then(apply)
        .catch(() => apply(null));
      return () => { cancelled = true; };
    }
    apply(null);
    return () => { cancelled = true; };
  }, [id]);

  // live ticking timer while attempting; auto-submit when the countdown hits 0
  useEffect(() => {
    if (submitted) return;
    const t = setInterval(() => {
      setNow(Date.now());
      if (deadline && Date.now() >= deadline) {
        setTimedOut(true);
        submitRef.current && submitRef.current();
      }
    }, 500);
    return () => clearInterval(t);
  }, [submitted, deadline]);

  if (quiz === undefined)
    return <section className="section"><p className="muted">Loading…</p></section>;

  if (quiz === null)
    return (
      <section className="section" style={{ marginTop: 24 }}>
        <div className="glass-card center">
          <h2>Quiz not found</h2>
          <p className="muted mt-8">It may have been deleted, or the link is wrong.</p>
          <Link href="/quizzes" className="btn btn--primary mt-16">← Back to Quizzes</Link>
        </div>
      </section>
    );

  const total = quiz.questions.length;
  const answeredCount = Object.keys(answers).length;

  const commitTime = () => {
    const el = (Date.now() - startRef.current) / 1000;
    setTimes((t) => ({ ...t, [cur]: (t[cur] || 0) + el }));
    startRef.current = Date.now();
  };

  const goTo = (idx) => {
    commitTime();
    setCur(idx);
  };

  const select = (oi) => setAnswers((a) => ({ ...a, [cur]: oi }));

  const submit = () => {
    if (submitted) return;
    commitTime();
    // track per-question attempts + archive into the Mistake Notebook (site-wide)
    if (quiz) {
      const items = [];
      const reviewItems = [];
      quiz.questions.forEach((q, i) => {
        if (answers[i] !== undefined) {
          const correct = answers[i] === q.answer;
          items.push({ q, correct });
          reviewItems.push({ q, correct, source: quiz.source || "", category: quizCategory(quiz, q) });
        }
      });
      recordAttempts(items);
      recordQuizAttempts(reviewItems);
    }
    setSubmitted(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  submitRef.current = submit;

  const retry = () => {
    setAnswers({}); setTimes({}); setShortcuts({}); setActionErr({});
    setExplains({}); setCur(0); setSubmitted(false); setTimedOut(false);
    startRef.current = Date.now();
    if (quiz?.timeLimitSec) setDeadline(Date.now() + quiz.timeLimitSec * 1000);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // live time for current question
  const liveCur = !submitted ? (times[cur] || 0) + (now ? (Date.now() - startRef.current) / 1000 : 0) : 0;

  // countdown remaining (only when the quiz has a time limit)
  const remainingSec = deadline ? Math.max(0, Math.ceil((deadline - (now || Date.now())) / 1000)) : null;
  const lowTime = remainingSec !== null && remainingSec <= 60;
  const fmtClock = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  const getShortcut = async (i) => {
    const q = quiz.questions[i];
    setScLoading((s) => ({ ...s, [i]: true }));
    setActionErr((e) => ({ ...e, [i]: "" }));
    try {
      const opts = q.options.map((o, oi) => `${String.fromCharCode(65 + oi)}) ${o}`).join("   ");
      const text =
        `${q.question}\nOptions: ${opts}\n` +
        (q.answer != null ? `Correct answer (already verified): ${String.fromCharCode(65 + q.answer)}) ${q.options[q.answer]}\n` : "") +
        (q.explanation ? `Reason: ${q.explanation}\n` : "");
      const { answer } = await askAI({ question: text, mode: "shortcut" });
      setShortcuts((s) => ({ ...s, [i]: answer }));
      setScShown((s) => ({ ...s, [i]: true }));
      saveShortcutFor(q, answer); // persist — comes back on next press
    } catch (err) {
      setActionErr((e) => ({ ...e, [i]: err.message }));
    } finally {
      setScLoading((s) => ({ ...s, [i]: false }));
    }
  };
  const toggleShortcut = (i) => {
    if (scShown[i]) { setScShown((s) => ({ ...s, [i]: false })); return; }
    if (shortcuts[i]) { setScShown((s) => ({ ...s, [i]: true })); return; }
    const saved = getSavedShortcut(quiz.questions[i]);   // saved from a previous time
    if (saved) { setShortcuts((s) => ({ ...s, [i]: saved })); setScShown((s) => ({ ...s, [i]: true })); return; }
    getShortcut(i);
  };
  const regenShortcut = (i) => { clearSavedShortcut(quiz.questions[i]); setShortcuts((s) => ({ ...s, [i]: "" })); getShortcut(i); };
  const toggleBm = (q) => { toggleQBookmark(q); bumpBm((v) => v + 1); };

  const getExplain = async (i) => {
    const q = quiz.questions[i];
    setExLoading((s) => ({ ...s, [i]: true }));
    setActionErr((e) => ({ ...e, [i]: "" }));
    try {
      const opts = q.options.map((o, oi) => `${String.fromCharCode(65 + oi)}) ${o}`).join("   ");
      const text =
        `${q.question}\nOptions: ${opts}\n` +
        (q.answer != null ? `Correct answer (already verified): ${String.fromCharCode(65 + q.answer)}) ${q.options[q.answer]}\n` : "") +
        (q.explanation ? `Short reason: ${q.explanation}\n` : "");
      const { answer } = await askAI({ question: text, mode: "explain" });
      setExplains((s) => ({ ...s, [i]: answer }));
      setExShown((s) => ({ ...s, [i]: true }));
    } catch (err) {
      setActionErr((e) => ({ ...e, [i]: err.message }));
    } finally {
      setExLoading((s) => ({ ...s, [i]: false }));
    }
  };
  const toggleExplain = (i) => {
    if (exShown[i]) { setExShown((s) => ({ ...s, [i]: false })); return; }
    if (explains[i]) { setExShown((s) => ({ ...s, [i]: true })); return; }
    getExplain(i);
  };

  const make20 = async (i) => {
    const q = quiz.questions[i];
    setSimLoading((s) => ({ ...s, [i]: true }));
    setActionErr((e) => ({ ...e, [i]: "" }));
    try {
      const data = await generateSimilar({ question: q.question, options: q.options }, 20);
      const newQuiz = {
        id: makeId(),
        title: data.title || "Similar (20) · " + quiz.title,
        source: "similar",
        createdAt: new Date().toISOString(),
        questions: data.questions,
      };
      saveQuiz(newQuiz);
      router.push(`/quizzes/${newQuiz.id}`);
    } catch (err) {
      setActionErr((e) => ({ ...e, [i]: err.message }));
    } finally {
      setSimLoading((s) => ({ ...s, [i]: false }));
    }
  };

  // ---------- RESULTS ----------
  if (submitted) {
    const correct = quiz.questions.reduce((a, q, i) => (answers[i] === q.answer ? a + 1 : a), 0);
    const wrong = quiz.questions.reduce(
      (a, q, i) => (answers[i] !== undefined && answers[i] !== q.answer ? a + 1 : a), 0
    );
    const unanswered = total - correct - wrong;
    const totalTime = Object.values(times).reduce((a, b) => a + b, 0);
    const pct = Math.round((correct / total) * 100);

    return (
      <>
        <section className="hero" style={{ paddingBottom: 8 }}>
          <div className="row between">
            <span className="hero__eyebrow">✅ Result</span>
            <Link href="/quizzes" className="btn btn--ghost btn--sm">← All quizzes</Link>
          </div>
          <h1 className="hero__title" style={{ fontSize: "clamp(1.5rem, 4vw, 2.2rem)" }}>{quiz.title}</h1>
          {timedOut && (
            <p className="mt-8" style={{ color: "var(--danger)", fontWeight: 600 }}>
              ⏳ Time up! The quiz was submitted automatically.
            </p>
          )}
        </section>

        {/* Score summary */}
        <section className="section" style={{ marginTop: 8 }}>
          <div className="stat-row">
            <div className="stat glass"><span className="stat__num grad">{correct}/{total}</span><span className="stat__label">Score · {pct}%</span></div>
            <div className="stat glass"><span className="stat__num" style={{ color: "var(--success)" }}>{correct}</span><span className="stat__label">Correct ✅</span></div>
            <div className="stat glass"><span className="stat__num" style={{ color: "var(--danger)" }}>{wrong}</span><span className="stat__label">Wrong ❌</span></div>
            <div className="stat glass"><span className="stat__num" style={{ color: "var(--text-2)" }}>{unanswered}</span><span className="stat__label">Skipped ⭕</span></div>
            <div className="stat glass"><span className="stat__num" style={{ color: "var(--accent-2)" }}>{fmt(totalTime)}</span><span className="stat__label">Total time · avg {fmt(totalTime / total)}</span></div>
          </div>
        </section>

        {/* Per-question review */}
        <section className="section" style={{ marginTop: 12 }}>
          <div className="grid" style={{ gap: 16 }}>
            {quiz.questions.map((q, qi) => {
              const chosen = answers[qi];
              const isRight = chosen === q.answer;
              return (
                <article key={qi} className="glass-card">
                  <div className="row between" style={{ alignItems: "flex-start" }}>
                    <div className="row" style={{ gap: 10, alignItems: "flex-start" }}>
                      <span className={`badge ${chosen === undefined ? "" : isRight ? "badge--ok" : ""}`}
                            style={chosen !== undefined && !isRight ? { background: "rgba(251,113,133,0.15)", color: "var(--danger)", border: "1px solid rgba(251,113,133,0.3)" } : {}}>
                        {qi + 1}
                      </span>
                      <h3 style={{ fontSize: "1.14rem", fontWeight: 600, lineHeight: 1.5 }}>
                        <Markdown inline>{q.question}</Markdown>
                        {(q.paper || q.source) && <span className="paper-tag">📄 {q.paper || q.source}</span>}
                      </h3>
                    </div>
                    <div className="row" style={{ gap: 8, flexShrink: 0, alignItems: "center" }}>
                      {(() => { const st = getStat(q); return st ? (
                        <span className="time-pill" title={`${st.correct} correct / ${st.attempts} attempts`} style={{ background: "rgba(124,108,255,0.16)", color: "var(--accent-2)" }}>
                          🔁 {st.attempts}x{st.attempts ? ` · ${Math.round((st.correct / st.attempts) * 100)}%` : ""}
                        </span>
                      ) : null; })()}
                      <button className="btn btn--ghost btn--sm" onClick={() => toggleBm(q)} title="Bookmark" style={isQBookmarked(q) ? { color: "var(--warning)" } : {}}>{isQBookmarked(q) ? "★" : "☆"}</button>
                      <span className="time-pill">⏱ {fmt(times[qi] || 0)}</span>
                    </div>
                  </div>

                  <Diagram svg={q.diagram} />

                  <div className="grid" style={{ gap: 8, marginTop: 14 }}>
                    {q.options.map((opt, oi) => {
                      const s = {
                        textAlign: "left", padding: "10px 14px", borderRadius: 10,
                        borderWidth: "1px", borderStyle: "solid", borderColor: "var(--glass-border)",
                        background: "rgba(0,0,0,0.2)",
                        color: "var(--text-1)", fontSize: "0.92rem",
                      };
                      if (oi === q.answer) { s.borderColor = "rgba(52,211,153,0.7)"; s.background = "rgba(52,211,153,0.14)"; }
                      if (oi === chosen && oi !== q.answer) { s.borderColor = "rgba(251,113,133,0.7)"; s.background = "rgba(251,113,133,0.14)"; }
                      return (
                        <div key={oi} style={s}>
                          <strong style={{ opacity: 0.7, marginRight: 8 }}>{String.fromCharCode(65 + oi)}</strong>
                          <Markdown inline>{opt}</Markdown>
                          {oi === q.answer && <span style={{ color: "var(--success)", marginLeft: 8 }}>✓</span>}
                        </div>
                      );
                    })}
                  </div>

                  {chosen !== undefined && !isRight && (
                    <div className="row mt-12" style={{ gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                      <span className="muted" style={{ fontSize: "0.8rem" }}>Galti kyun?</span>
                      {ERROR_TYPES.map((e) => {
                        const on = errorTags[qi] === e.key;
                        const suggest = e.key === "time" && !errorTags[qi] && (times[qi] || 0) > Math.max(90, (totalTime / total) * 2);
                        return (
                          <button key={e.key} className={`chip chip--btn chip--sm ${on ? "is-active" : ""}`}
                            style={suggest ? { borderColor: "rgba(251,191,36,0.65)", color: "var(--warning)" } : {}}
                            onClick={() => tagError(qi, q, e.key)}>
                            {e.label}{suggest ? " ?" : ""}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {q.explanation && (
                    <div className="muted mt-16" style={{ fontSize: "0.96rem", lineHeight: 1.6 }}>
                      <strong style={{ color: "var(--text-2)" }}>Reason: </strong>
                      <Markdown inline>{q.explanation}</Markdown>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="row mt-16" style={{ gap: 10, flexWrap: "wrap" }}>
                    <button className="btn btn--primary btn--sm" onClick={() => toggleExplain(qi)} disabled={exLoading[qi]}>
                      {exLoading[qi] ? "Explaining…" : exShown[qi] ? "📖 Hide detail" : "📖 Explain in detail (why? + example)"}
                    </button>
                    <button className="btn btn--ghost btn--sm" onClick={() => toggleShortcut(qi)} disabled={scLoading[qi]}>
                      {scLoading[qi] ? "Thinking…" : scShown[qi] ? "⚡ Hide shortcut" : "⚡ Shortcut trick"}
                    </button>
                    <button className="btn btn--ghost btn--sm" onClick={() => make20(qi)} disabled={simLoading[qi]}>
                      {simLoading[qi] ? "Generating…" : "🎯 20 similar"}
                    </button>
                    <AskButtons q={q} />
                    <AddToChapter q={q} />
                  </div>
                  <PasteAnswer q={q} />

                  {actionErr[qi] && <p style={{ color: "var(--danger)", fontSize: "0.85rem", marginTop: 10 }}>{actionErr[qi]}</p>}
                  {exShown[qi] && explains[qi] && (
                    <div className="answer-box mt-16">
                      <Markdown>{explains[qi]}</Markdown>
                    </div>
                  )}
                  {scShown[qi] && shortcuts[qi] && (
                    <div className="answer-box mt-16">
                      <Markdown>{shortcuts[qi]}</Markdown>
                      <button className="btn btn--ghost btn--sm mt-12" onClick={() => regenShortcut(qi)} disabled={scLoading[qi]}>
                        {scLoading[qi] ? "Thinking…" : "🔄 New shortcut"}
                      </button>
                    </div>
                  )}

                  {/* Follow-up doubts on this question */}
                  <QuestionFollowup question={q} />
                </article>
              );
            })}
          </div>

          <div className="row center mt-24" style={{ justifyContent: "center" }}>
            <button className="btn btn--ghost" onClick={retry}>🔁 Retry Quiz</button>
          </div>
        </section>
      </>
    );
  }

  // ---------- ATTEMPT (one question at a time) ----------
  const q = quiz.questions[cur];
  return (
    <>
      <section className="hero" style={{ paddingBottom: 8 }}>
        <div className="row between">
          <span className="hero__eyebrow">📝 {quiz.title}</span>
          <Link href="/quizzes" className="btn btn--ghost btn--sm">Exit</Link>
        </div>
        <div className="row between mt-8">
          <p className="muted" style={{ fontSize: "0.9rem" }}>Question {cur + 1} of {total} · {answeredCount} answered</p>
          <div className="row" style={{ gap: 8 }}>
            {remainingSec !== null && (
              <span className="time-pill" style={lowTime
                ? { background: "rgba(251,113,133,0.2)", color: "var(--danger)", borderColor: "rgba(251,113,133,0.5)" }
                : { background: "rgba(124,108,255,0.18)", color: "var(--accent-2)" }}>
                ⏳ {fmtClock(remainingSec)}
              </span>
            )}
            <span className="time-pill live">⏱ {fmt(liveCur)}</span>
          </div>
        </div>
        {remainingSec !== null && (
          <p className="muted mt-8" style={{ fontSize: "0.78rem" }}>
            ⏳ Time limit: {Math.round((quiz.timeLimitSec || 0) / 60)} min · the quiz auto-submits when time runs out.
          </p>
        )}
        <div className="progress"><div className="progress__bar" style={{ width: `${((cur + 1) / total) * 100}%` }} /></div>
      </section>

      <section className="section" style={{ marginTop: 16 }}>
        <article className="glass-card">
          {(() => { const st = getStat(q); return st && st.attempts ? (
            <p className="muted" style={{ fontSize: "0.76rem", marginBottom: 6 }}>🔁 You've attempted this question {st.attempts} times ({st.correct} correct)</p>
          ) : null; })()}
          <h3 style={{ fontSize: "1.22rem", fontWeight: 600, lineHeight: 1.5 }}>
            <Markdown inline>{q.question}</Markdown>
            {(q.paper || q.source) && <span className="paper-tag">📄 {q.paper || q.source}</span>}
          </h3>
          <Diagram svg={q.diagram} />
          <div className="grid" style={{ gap: 10, marginTop: 18 }}>
            {q.options.map((opt, oi) => {
              const isChosen = answers[cur] === oi;
              const style = {
                textAlign: "left", padding: "13px 16px", borderRadius: 12,
                borderWidth: "1px", borderStyle: "solid", borderColor: "var(--glass-border)",
                background: "rgba(0,0,0,0.2)",
                color: "var(--text-1)", cursor: "pointer", transition: "all .15s ease",
              };
              if (isChosen) { style.borderColor = "rgba(124,108,255,0.7)"; style.background = "rgba(124,108,255,0.16)"; }
              return (
                <button key={oi} style={style} onClick={() => select(oi)}>
                  <span style={{ fontWeight: 700, marginRight: 10, opacity: 0.7 }}>{String.fromCharCode(65 + oi)}</span>
                  <Markdown inline>{opt}</Markdown>
                </button>
              );
            })}
          </div>
          <div className="row mt-16" style={{ justifyContent: "flex-end", gap: 8, flexWrap: "wrap" }}>
            <AskButtons q={q} />
          </div>
          <PasteAnswer q={q} />
        </article>

        <div className="row between mt-24">
          <button className="btn btn--ghost" onClick={() => goTo(Math.max(0, cur - 1))} disabled={cur === 0}>← Prev</button>
          {cur < total - 1 ? (
            <button className="btn btn--primary" onClick={() => goTo(cur + 1)}>Next →</button>
          ) : (
            <button className="btn btn--primary" onClick={submit}>Submit ({answeredCount}/{total})</button>
          )}
        </div>
        {cur < total - 1 && (
          <div className="row center mt-16" style={{ justifyContent: "center" }}>
            <button className="btn btn--ghost btn--sm" onClick={submit}>Submit now</button>
          </div>
        )}
      </section>
    </>
  );
}
