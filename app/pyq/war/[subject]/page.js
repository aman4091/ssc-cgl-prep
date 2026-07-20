"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { loadWarSubject, warSubjectMeta } from "@/lib/warbank";
import PyqQuestionCard from "@/components/PyqQuestionCard";
import FullscreenTestButton from "@/components/FullscreenTestButton";

const PAGE = 50; // render in slices — 562 cards at once janks a phone

export default function WarSubjectPage() {
  const { subject } = useParams();
  const [meta, setMeta] = useState(null);
  const [qs, setQs] = useState([]);
  const [ready, setReady] = useState(false);
  const [chapter, setChapter] = useState(""); // "" = all
  const [shown, setShown] = useState(PAGE);

  useEffect(() => {
    let alive = true;
    setMeta(null); setQs([]); setReady(false); setChapter("");
    (async () => {
      const [m, list] = await Promise.all([warSubjectMeta(subject), loadWarSubject(subject)]);
      if (!alive) return;
      setMeta(m); setQs(list); setReady(true);
    })();
    return () => { alive = false; };
  }, [subject]);

  useEffect(() => { setShown(PAGE); }, [chapter, subject]);

  const filtered = chapter === "" ? qs : qs.filter((q) => q.chapter === chapter);

  if (ready && !meta) {
    return (
      <section className="hero">
        <h1 className="hero__title">Not found</h1>
        <p className="hero__sub">WAR mein aisa koi subject nahi hai.</p>
        <Link href="/pyq/war" className="btn btn--ghost btn--sm mt-16">← WAR</Link>
      </section>
    );
  }

  return (
    <>
      <section className="hero" style={{ paddingBottom: 8 }}>
        <div className="row between">
          <span className="hero__eyebrow">🎯 WAR · {meta?.label || "…"}</span>
          <Link href="/pyq/war" className="btn btn--ghost btn--sm">← Subjects</Link>
        </div>
        <h1 className="hero__title" style={{ fontSize: "clamp(1.6rem, 4vw, 2.4rem)" }}>
          {meta?.icon} {meta?.label}{" "}
          <span className="grad">· {filtered.length} PYQs</span>
        </h1>
        {filtered.length > 0 && (
          <div className="row mt-16">
            <FullscreenTestButton
              questions={filtered}
              title={`WAR · ${meta?.label || ""}${chapter ? ` · ${chapter}` : ""}`}
              subject="gs"
              label={`⛶ Full-screen test (${filtered.length})`}
              className="btn btn--primary"
            />
          </div>
        )}
      </section>

      {/* Chapter filter — the book's own chapters, from its page footers */}
      {meta && meta.chapters.length > 1 && (
        <section className="section" style={{ marginTop: 4 }}>
          {/* A dropdown, not a wall of chips: current-affairs alone has ten
              chapters and the row wrapped to three lines above the questions. */}
          <select
            className="input"
            style={{ maxWidth: 420 }}
            value={chapter}
            onChange={(e) => setChapter(e.target.value)}
          >
            <option value="">All chapters ({meta.count})</option>
            {meta.chapters.map((c) => (
              <option key={c.name} value={c.name}>
                {c.name} ({c.count})
              </option>
            ))}
          </select>
        </section>
      )}

      <section className="section">
        {!ready ? (
          <div className="placeholder">Loading questions… 📚</div>
        ) : filtered.length === 0 ? (
          <div className="placeholder">Is chapter mein koi question nahi. 🤔</div>
        ) : (
          <>
            <div className="grid" style={{ gap: 14 }}>
              {filtered.slice(0, shown).map((q, i) => (
                // Read-only: these live in a static file, so no edit/delete
                // (both write localStorage). Answering still archives to the
                // Mistake Notebook, and "save to a chapter" still works.
                <PyqQuestionCard
                  key={q.id}
                  q={q}
                  index={i}
                  subject="gs"
                  chapterName={`WAR · ${meta.label}`}
                  archiveOnAnswer
                  fileToChapter
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
