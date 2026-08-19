"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { loadWarSubject, warSubjectMeta } from "@/lib/warbank";
import PyqQuestionCard from "@/components/PyqQuestionCard";
import QBoard from "@/components/QBoard";


export default function WarSubjectPage() {
  const { subject } = useParams();
  const [meta, setMeta] = useState(null);
  const [qs, setQs] = useState([]);
  const [ready, setReady] = useState(false);
  const [chapter, setChapter] = useState(""); // "" = all

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

  // useMemo zaroori hai: bina iske har render par nayi array banti hai, aur
  // QBoard use "nayi list" samajh kar apna slice/rail har baar reset kar deta.
  const filtered = useMemo(
    () => (chapter === "" ? qs : qs.filter((q) => q.chapter === chapter)),
    [qs, chapter]
  );

  if (ready && !meta) {
    return (
      <section className="hero">
        <h1 className="hero__title">Not found</h1>
        <p className="hero__sub">WAR mein aisa koi subject nahi hai.</p>
        <Link href="/pyq/war" className="btn btn--ghost btn--sm mt-16">← WAR</Link>
      </section>
    );
  }

  // Rail, aaj ka counter, ho-gaye-neeche aur "Show more" — sab QBoard ke paas.
  const resumeKey = `war:${subject}`;

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
          <QBoard
            title={`WAR · ${meta?.label || ""}`}
            list={filtered}
            subject="gs"
            resumeKey={resumeKey}
            renderCard={(q, i, all) => (
              // Read-only: these live in a static file, so no edit/delete
              // (both write localStorage). Answering still archives to the
              // Mistake Notebook, and "save to a chapter" still works.
              <PyqQuestionCard
                resumeKey={resumeKey}
                key={q.id}
                q={q}
                index={i}
                subject="gs"
                chapterName={`WAR · ${meta.label}`}
                archiveOnAnswer
                fileToChapter
                allQuestions={all}
              />
            )}
          />
        )}
      </section>
    </>
  );
}
