"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { loadSscMathsChapter, sscMathsChapterMeta } from "@/lib/sscmaths";
import PyqQuestionCard from "@/components/PyqQuestionCard";

// One chapter's questions, full width.
//
// There is no chapter list on this page — not a dropdown, not a column of name
// blocks. The chapters live in the left MENU (open "Maths 2025" in the sidebar),
// so putting them here as well was the same list drawn three times.
const PAGE = 25; // Simplification is 571 questions; mounting them at once janks a phone

export default function SscMathsChapterPage() {
  const { chapter } = useParams();
  const [meta, setMeta] = useState(null);
  const [qs, setQs] = useState([]);
  const [ready, setReady] = useState(false);
  const [query, setQuery] = useState("");
  const [shown, setShown] = useState(PAGE);

  useEffect(() => {
    let alive = true;
    setReady(false); setShown(PAGE); setQuery("");
    Promise.all([sscMathsChapterMeta(chapter), loadSscMathsChapter(chapter)]).then(([m, list]) => {
      if (!alive) return;
      setMeta(m); setQs(list); setReady(true);
    });
    return () => { alive = false; };
  }, [chapter]);

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

  if (ready && !meta) {
    return (
      <section className="hero">
        <h1 className="hero__title">Not found</h1>
        <p className="hero__sub">Aisa koi chapter nahi hai.</p>
        <Link href="/pyq" className="btn btn--ghost btn--sm mt-16">← PYQ</Link>
      </section>
    );
  }

  return (
    <>
      <section className="hero" style={{ paddingBottom: 8 }}>
        <div className="row between">
          <span className="hero__eyebrow">🧮 Maths 2025</span>
          <Link href="/pyq" className="btn btn--ghost btn--sm">← PYQ</Link>
        </div>
        <h1 className="hero__title" style={{ fontSize: "clamp(1.5rem, 4vw, 2.2rem)" }}>
          {meta?.label || "…"} <span className="grad">· {qs.length}</span>
        </h1>
        <input
          className="input mt-16"
          style={{ maxWidth: 420 }}
          placeholder="🔍 Is chapter mein khojo…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </section>

      <section className="section">
        {!ready ? (
          <div className="placeholder">Loading questions… 📚</div>
        ) : filtered.length === 0 ? (
          <div className="placeholder">{query ? "Kuch nahi mila." : "Is chapter mein koi question nahi."}</div>
        ) : (
          <>
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
      </section>
    </>
  );
}
