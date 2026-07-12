"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getReviewBucket, getWrongSince, getWeakAreas, getErrorTypeBreakdown,
  setReviewErrorType, removeReview, clearReview, ERROR_TYPES,
} from "@/lib/qreview";
import { keyFor } from "@/lib/qstats";
import { saveQuiz, makeId } from "@/lib/storage";
import PyqQuestionCard from "@/components/PyqQuestionCard";

const TABS = [
  { key: "wrong", label: "❌ Wrong", empty: "No pending mistakes — solid! Do a few quizzes and any wrong ones land here." },
  { key: "mastered", label: "✅ Mastered", empty: "Nothing mastered yet. Re-solve a wrong question correctly and it moves here." },
  { key: "attempted", label: "📝 Attempted", empty: "No attempts yet. Every quiz you take across the site shows up here." },
];

export default function MistakesPage() {
  const router = useRouter();
  const [tab, setTab] = useState("wrong");
  const [items, setItems] = useState([]);
  const [weak, setWeak] = useState([]);
  const [breakdown, setBreakdown] = useState({});
  const [weekWrong, setWeekWrong] = useState(0);
  const [counts, setCounts] = useState({ wrong: 0, mastered: 0, attempted: 0 });

  const refresh = (t = tab) => {
    setItems(getReviewBucket(t));
    setWeak(getWeakAreas());
    setBreakdown(getErrorTypeBreakdown());
    setWeekWrong(getWrongSince(7).length);
    setCounts({
      wrong: getReviewBucket("wrong").length,
      mastered: getReviewBucket("mastered").length,
      attempted: getReviewBucket("attempted").length,
    });
  };
  useEffect(() => { refresh(tab); /* eslint-disable-next-line */ }, [tab]);

  const active = TABS.find((t) => t.key === tab);

  const startQuiz = (records, title) => {
    if (!records.length) return;
    const quiz = {
      id: makeId(), title, source: "review",
      createdAt: new Date().toISOString(), questions: records.map((r) => r.q),
    };
    saveQuiz(quiz);
    router.push(`/quizzes/${quiz.id}`);
  };
  const reattemptAllWrong = () => startQuiz(getReviewBucket("wrong"), "Re-attempt · All wrong");
  const reattemptWeek = () => startQuiz(getWrongSince(7), "Re-attempt · This week's wrong");
  const practiceThisTab = () => startQuiz(items, `${active.label} questions`);

  const tagError = (key, type) => { setReviewErrorType(key, type); refresh(); };
  const remove = (key) => { removeReview(key); refresh(); };
  const clearTab = () => { if (confirm(`Clear all ${active.label} questions?`)) { clearReview(tab); refresh(); } };

  const worst = weak[0]; // weakest area (most wrong)

  return (
    <>
      <section className="hero" style={{ paddingBottom: 8 }}>
        <div className="row between">
          <span className="hero__eyebrow">🔴 Mistake Notebook</span>
          <div className="row" style={{ gap: 8 }}>
            <Link href="/bookmarks" className="btn btn--ghost btn--sm">⭐ Bookmarks</Link>
            <Link href="/quizzes" className="btn btn--ghost btn--sm">← Quizzes</Link>
          </div>
        </div>
        <h1 className="hero__title" style={{ fontSize: "clamp(1.7rem, 4vw, 2.6rem)" }}>
          Error <span className="grad">Analysis</span>
        </h1>
        <p className="hero__sub">Har galat question — chahe Vocab ho, Calculation, PYQ ya Current Affairs — yahan apne aap save hota hai. Analyse karo, tag karo, dobara solve karo.</p>
      </section>

      {/* Weekly reminder banner */}
      {weekWrong > 0 && (
        <section className="section" style={{ marginTop: 8 }}>
          <div className="glass-card" style={{ borderColor: "rgba(251,191,36,0.4)", background: "rgba(251,191,36,0.06)" }}>
            <div className="row between" style={{ flexWrap: "wrap", gap: 10, alignItems: "center" }}>
              <div>
                <strong style={{ color: "var(--warning)" }}>📅 Is hafte {weekWrong} galtiyaan</strong>
                <p className="muted mt-8" style={{ fontSize: "0.86rem" }}>Revision se hi score badhta hai — inko dobara solve karo.</p>
              </div>
              <button className="btn btn--primary" onClick={reattemptWeek}>🎯 Revise this week ({weekWrong})</button>
            </div>
          </div>
        </section>
      )}

      {/* Weak Area Tracker + error-type breakdown */}
      {counts.attempted > 0 && (
        <section className="section" style={{ marginTop: 12 }}>
          <div className="glass-card">
            <h3>📉 Weak Area Tracker</h3>
            {worst && worst.wrong > 0 && (
              <p className="muted mt-8" style={{ fontSize: "0.88rem" }}>
                Sabse kamzor: <strong style={{ color: "var(--danger)" }}>{worst.category}</strong> — {worst.wrong} galat ({worst.accuracy}% accuracy). Yahin sabse zyada dhyan do.
              </p>
            )}
            <div className="mt-16" style={{ display: "grid", gap: 10 }}>
              {weak.map((w) => (
                <div key={w.category}>
                  <div className="row between" style={{ fontSize: "0.85rem", marginBottom: 4 }}>
                    <span>{w.category}</span>
                    <span className="muted">{w.total - w.wrong}/{w.total} · {w.accuracy}%</span>
                  </div>
                  <div className="progress"><div className="progress__bar" style={{ width: `${w.accuracy}%`, background: w.accuracy < 50 ? "var(--danger)" : w.accuracy < 75 ? "var(--warning)" : "var(--success)" }} /></div>
                </div>
              ))}
            </div>

            {/* Error-type breakdown */}
            <div className="row mt-16" style={{ gap: 8, flexWrap: "wrap" }}>
              {ERROR_TYPES.map((e) => (
                <span key={e.key} className="chip" style={{ fontSize: "0.8rem" }}>{e.label}: <strong>{breakdown[e.key] || 0}</strong></span>
              ))}
              {breakdown.untagged > 0 && <span className="chip muted" style={{ fontSize: "0.8rem" }}>Untagged: {breakdown.untagged}</span>}
            </div>
          </div>
        </section>
      )}

      {/* Re-attempt buttons */}
      {counts.wrong > 0 && (
        <section className="section" style={{ marginTop: 12 }}>
          <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
            <button className="btn btn--primary" onClick={reattemptAllWrong}>🎯 Re-attempt all wrong ({counts.wrong})</button>
            {weekWrong > 0 && <button className="btn btn--ghost" onClick={reattemptWeek}>📅 This week's wrong ({weekWrong})</button>}
          </div>
        </section>
      )}

      {/* Tabs */}
      <section className="section" style={{ marginTop: 12 }}>
        <div className="chips" style={{ marginBottom: 16 }}>
          {TABS.map((t) => (
            <button key={t.key} className={`chip chip--btn chip--lg ${tab === t.key ? "is-active" : ""}`} onClick={() => setTab(t.key)}>
              {t.label} ({counts[t.key]})
            </button>
          ))}
        </div>

        {items.length > 0 && (
          <div className="row" style={{ gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
            <button className="btn btn--primary btn--sm" onClick={practiceThisTab}>🎯 Practice all ({items.length})</button>
            <button className="btn btn--ghost btn--sm" onClick={clearTab}>🗑️ Clear {active.label}</button>
          </div>
        )}

        {items.length === 0 ? (
          <div className="placeholder">{active.empty}</div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {items.map((r) => (
              <div key={r.key}>
                {/* one-tap error-type tagging */}
                <div className="row" style={{ gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: 6 }}>
                  <span className="muted" style={{ fontSize: "0.78rem" }}>{r.category} · Galti kyun?</span>
                  {ERROR_TYPES.map((e) => (
                    <button key={e.key} className={`chip chip--btn chip--sm ${r.errorType === e.key ? "is-active" : ""}`}
                      onClick={() => tagError(r.key, e.key)}>{e.label}</button>
                  ))}
                </div>
                <PyqQuestionCard
                  q={r.q}
                  index={0}
                  subject={r.subject}
                  onDelete={() => remove(r.key)}
                />
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
