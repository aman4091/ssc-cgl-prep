"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getDayTypeCounts, buildDayQuiz, markDayDone, TYPES } from "@/lib/vocab";
import { saveQuiz } from "@/lib/storage";

export default function VocabDayPage() {
  const { day } = useParams();
  const router = useRouter();
  const dayNum = parseInt(day);
  const [counts, setCounts] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => { setCounts(getDayTypeCounts(dayNum)); }, [dayNum]);

  const startQuiz = () => {
    const quiz = buildDayQuiz(dayNum);
    if (quiz.questions.length < 1) { setError("No words for this day."); return; }
    saveQuiz(quiz);
    markDayDone(dayNum);
    router.push(`/quizzes/${quiz.id}`);
  };

  if (!dayNum || dayNum < 1) {
    return (
      <section className="section" style={{ marginTop: 24 }}>
        <div className="glass-card center">
          <h2>Galat day</h2>
          <Link href="/vocab" className="btn btn--primary mt-16">← Vocab</Link>
        </div>
      </section>
    );
  }

  const total = counts ? Object.values(counts).reduce((a, b) => a + b, 0) : 0;

  return (
    <>
      <section className="hero" style={{ paddingBottom: 8 }}>
        <div className="row between">
          <span className="hero__eyebrow">📚 Vocab · Day {dayNum}</span>
          <Link href="/vocab" className="btn btn--ghost btn--sm">← All days</Link>
        </div>
        <div className="row between mt-8">
          <h1 className="hero__title" style={{ fontSize: "clamp(1.5rem, 4vw, 2.2rem)" }}>Day {dayNum} · {total} words</h1>
          <button className="btn btn--primary" onClick={startQuiz}>🎯 All-types Quiz (Day 1–{dayNum})</button>
        </div>
        <p className="hero__sub">Choose a category — all words of that type will open.</p>
      </section>

      <section className="section" style={{ marginTop: 12 }}>
        {error && <p style={{ color: "var(--danger)" }}>{error}</p>}
        {total === 0 ? (
          <div className="placeholder">No words for this day.</div>
        ) : (
          <div className="cat-list">
            {TYPES.map((t) => {
              const c = counts?.[t.key] || 0;
              const disabled = c === 0;
              return (
                <Link
                  key={t.key}
                  href={disabled ? "#" : `/vocab/${dayNum}/${t.key}`}
                  className={`cat-row glass ${disabled ? "is-empty" : ""}`}
                >
                  <span className="cat-row__main">
                    <span className="cat-row__ico">{t.icon}</span>
                    <span>{t.label}</span>
                  </span>
                  <span className="cat-row__meta">
                    <span className="muted">{c} words</span>
                    {!disabled && <span className="cat-row__go">Open →</span>}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}
