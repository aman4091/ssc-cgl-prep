"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { loadSscMathsIndex, loadSscMathsChapter } from "@/lib/sscmaths";
import PyqQuestionCard from "@/components/PyqQuestionCard";

// SSC Maths 2025 — chapters down the left, that chapter's questions on the
// right. It reuses the notes reader's two-column shell (.notesdoc) rather than
// inventing another one; on a phone that collapses to the chapter picker above
// the questions.
//
// 5,600 questions across 29 chapters, so a chapter renders in slices — the
// biggest (Simplification, 571) would jank a phone if mounted at once.
const PAGE = 25;

export default function SscMaths2025Page() {
  const [index, setIndex] = useState(null);
  const [slug, setSlug] = useState("");
  const [qs, setQs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [shown, setShown] = useState(PAGE);

  useEffect(() => {
    loadSscMathsIndex().then((i) => {
      setIndex(i);
      if (i.chapters?.length) setSlug(i.chapters[0].slug);
    });
  }, []);

  useEffect(() => {
    if (!slug) return;
    let alive = true;
    setLoading(true); setShown(PAGE); setQuery("");
    loadSscMathsChapter(slug).then((list) => {
      if (!alive) return;
      setQs(list); setLoading(false);
    });
    return () => { alive = false; };
  }, [slug]);

  const chapters = index?.chapters || [];
  const meta = chapters.find((c) => c.slug === slug);

  const filtered = useMemo(() => {
    const t = query.trim().toLowerCase();
    if (!t) return qs;
    return qs.filter(
      (q) =>
        (q.question || "").toLowerCase().includes(t) ||
        (q.source || "").toLowerCase().includes(t) ||
        (q.options || []).some((o) => String(o).toLowerCase().includes(t))
    );
  }, [qs, query]);

  return (
    <>
      <section className="hero" style={{ paddingBottom: 8 }}>
        <div className="row between">
          <span className="hero__eyebrow">🧮 SSC Maths 2025</span>
          <Link href="/pyq" className="btn btn--ghost btn--sm">← PYQ</Link>
        </div>
        <h1 className="hero__title" style={{ fontSize: "clamp(1.5rem, 4vw, 2.2rem)" }}>
          Maths <span className="grad">2025</span>
        </h1>
        <p className="hero__sub">
          {index ? `${index.total} chapter-wise PYQs — har question pe exam, date aur shift.` : "…"}
        </p>
      </section>

      <div className="notesdoc">
        <aside className="notesdoc__nav">
          <input
            className="notesdoc__search"
            placeholder="🔍 Is chapter mein khojo…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select
            className="notesdoc__select"
            value={slug}
            onChange={(e) => { setSlug(e.target.value); window.scrollTo(0, 0); }}
          >
            {chapters.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.label} ({c.count})
              </option>
            ))}
          </select>

          {/* Wide screens get the whole list; the select above is what a phone
              uses, and the two stay in step because both write `slug`. */}
          <nav className="nt-nav ssc-chaps">
            {chapters.map((c) => (
              <a
                key={c.slug}
                href="#"
                className={slug === c.slug ? "on" : ""}
                onClick={(e) => { e.preventDefault(); setSlug(c.slug); window.scrollTo(0, 0); }}
              >
                {c.label}
                <span>{c.count}</span>
              </a>
            ))}
          </nav>
        </aside>

        <div className="notesdoc__main">
          {loading ? (
            <div className="placeholder">Loading {meta?.label || "chapter"}… 📚</div>
          ) : filtered.length === 0 ? (
            <div className="placeholder">{query ? "Kuch nahi mila." : "Is chapter mein koi question nahi."}</div>
          ) : (
            <>
              <p className="muted" style={{ fontSize: "0.82rem", marginBottom: 10 }}>
                {meta?.label} · {filtered.length} question{filtered.length > 1 ? "s" : ""}
                {query ? " (search)" : ""}
              </p>
              <div className="grid" style={{ gap: 14 }}>
                {filtered.slice(0, shown).map((q, i) => (
                  <PyqQuestionCard
                    key={q.id}
                    q={q}
                    index={i}
                    subject="math"
                    chapterName={`Maths 2025 · ${meta?.label || ""}`}
                    archiveOnAnswer
                    allQuestions={filtered}
                  />
                ))}
              </div>
              {shown < filtered.length && (
                <button className="btn btn--ghost btn--block mt-16" onClick={() => setShown((n) => n + PAGE)}>
                  ▼ Show {Math.min(PAGE, filtered.length - shown)} more ({shown} / {filtered.length})
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {index?.note && (
        <section className="section">
          <p className="hint">📚 {index.source} · {index.note}</p>
        </section>
      )}
    </>
  );
}
