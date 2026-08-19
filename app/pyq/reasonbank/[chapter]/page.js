"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { loadReasonChapter, reasonChapterMeta } from "@/lib/reasonbank";
import ReasonQuestionCard from "@/components/ReasonQuestionCard";
import QBoard from "@/components/QBoard";


export default function ReasonbankChapterPage() {
  const { chapter } = useParams();
  const [meta, setMeta] = useState(null);
  const [qs, setQs] = useState([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    setMeta(null); setQs([]); setReady(false);
    (async () => {
      const [m, list] = await Promise.all([reasonChapterMeta(chapter), loadReasonChapter(chapter)]);
      if (!alive) return;
      setMeta(m); setQs(list); setReady(true);
    })();
    return () => { alive = false; };
  }, [chapter]);

  if (ready && !meta) {
    return (
      <section className="hero">
        <h1 className="hero__title">Not found</h1>
        <p className="hero__sub">Pinnacle Reasoning mein aisa koi chapter nahi hai.</p>
        <Link href="/pyq/reasonbank" className="btn btn--ghost btn--sm mt-16">← Pinnacle Reasoning</Link>
      </section>
    );
  }

  // Rail, aaj ka counter, ho-gaye-neeche aur "Show more" — sab QBoard ke paas.
  const resumeKey = `reasonbank:${chapter}`;

  return (
    <>
      <section className="hero" style={{ paddingBottom: 8 }}>
        <div className="row between">
          <span className="hero__eyebrow">🧠 Pinnacle Reasoning</span>
          <Link href="/pyq/reasonbank" className="btn btn--ghost btn--sm">← Chapters</Link>
        </div>
        <h1 className="hero__title" style={{ fontSize: "clamp(1.6rem, 4vw, 2.4rem)" }}>
          {meta?.icon} {meta?.label} <span className="grad">· {qs.length}</span>
        </h1>
        {qs.length > 0 && (
          <div className="row mt-16">
          </div>
        )}
      </section>

      <section className="section">
        {!ready ? (
          <div className="placeholder">Loading questions… 📚</div>
        ) : qs.length === 0 ? (
          <div className="placeholder">Is chapter mein koi question nahi. 🤔</div>
        ) : (
          <QBoard
            list={qs}
            subject="reasoning"
            resumeKey={resumeKey}
            renderCard={(q, i, all) => (
              <ReasonQuestionCard key={q.id} q={q} index={i} subject="reasoning" resumeKey={resumeKey} chapterName={`Pinnacle Reasoning · ${meta.label}`} allQuestions={all} />
            )}
          />
        )}
      </section>
    </>
  );
}
