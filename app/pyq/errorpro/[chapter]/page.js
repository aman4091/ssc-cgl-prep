"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { loadErrorProChapter, errorProChapterMeta } from "@/lib/errorprobank";
import PyqQuestionCard from "@/components/PyqQuestionCard";
import QBoard from "@/components/QBoard";

export default function ErrorProChapterPage() {
  const { chapter } = useParams();
  const [meta, setMeta] = useState(null);
  const [qs, setQs] = useState([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    setMeta(null); setQs([]); setReady(false);
    (async () => {
      const [m, list] = await Promise.all([errorProChapterMeta(chapter), loadErrorProChapter(chapter)]);
      if (!alive) return;
      setMeta(m); setQs(list); setReady(true);
    })();
    return () => { alive = false; };
  }, [chapter]);

  // Rail, aaj ka counter, ho-gaye-neeche aur "Show more" — sab QBoard ke paas.
  const resumeKey = `errorpro:${chapter}`;

  if (ready && !meta) {
    return (
      <section className="hero">
        <h1 className="hero__title">Not found</h1>
        <p className="hero__sub">Error Pro mein aisa koi chapter nahi hai.</p>
        <Link href="/pyq/errorpro" className="btn btn--ghost btn--sm mt-16">← Error Pro</Link>
      </section>
    );
  }

  return (
    <>
      <section className="hero" style={{ paddingBottom: 8 }}>
        <div className="row between">
          <span className="hero__eyebrow">🎯 Error Pro</span>
          <Link href="/pyq/errorpro" className="btn btn--ghost btn--sm">← Chapters</Link>
        </div>
        <h1 className="hero__title" style={{ fontSize: "clamp(1.6rem, 4vw, 2.4rem)" }}>
          {meta?.icon} {meta?.label} <span className="grad">· {qs.length}</span>
        </h1>
      </section>

      <section className="section">
        {!ready ? (
          <div className="placeholder">Loading questions… 📚</div>
        ) : qs.length === 0 ? (
          <div className="placeholder">Is chapter mein koi question nahi. 🤔</div>
        ) : (
          <QBoard
            list={qs}
            subject="english"
            resumeKey={resumeKey}
            renderCard={(q, i, all) => (
              // Read-only: a static bank has nothing to write back to, so no
              // edit/delete. Answering still archives to the Mistake Notebook.
              <PyqQuestionCard
                resumeKey={resumeKey}
                key={q.id}
                q={q}
                index={i}
                subject="english"
                chapterName={`Error Pro · ${meta.label}`}
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
