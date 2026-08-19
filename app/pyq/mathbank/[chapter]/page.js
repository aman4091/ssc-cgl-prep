"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { loadMathChapter, mathChapterMeta } from "@/lib/mathbank";
import MathQuestionCard from "@/components/MathQuestionCard";
import QBoard from "@/components/QBoard";


export default function MathbankChapterPage() {
  const { chapter } = useParams();
  const [meta, setMeta] = useState(null);
  const [qs, setQs] = useState([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    setMeta(null); setQs([]); setReady(false);
    (async () => {
      const [m, list] = await Promise.all([mathChapterMeta(chapter), loadMathChapter(chapter)]);
      if (!alive) return;
      setMeta(m); setQs(list); setReady(true);
    })();
    return () => { alive = false; };
  }, [chapter]);

  if (ready && !meta) {
    return (
      <section className="hero">
        <h1 className="hero__title">Not found</h1>
        <p className="hero__sub">Pinnacle Maths mein aisa koi chapter nahi hai.</p>
        <Link href="/pyq/mathbank" className="btn btn--ghost btn--sm mt-16">← Pinnacle Maths</Link>
      </section>
    );
  }

  // Rail, aaj ka counter, ho-gaye-neeche aur "Show more" — sab QBoard ke paas.
  const resumeKey = `mathbank:${chapter}`;

  return (
    <>
      <section className="hero" style={{ paddingBottom: 8 }}>
        <div className="row between">
          <span className="hero__eyebrow">🧮 Pinnacle Maths</span>
          <Link href="/pyq/mathbank" className="btn btn--ghost btn--sm">← Chapters</Link>
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
            title={`Pinnacle Maths · ${meta?.label || ""}`}
            list={qs}
            subject="math"
            resumeKey={resumeKey}
            renderCard={(q, i, all) => (
              <MathQuestionCard key={q.id} q={q} index={i} subject="math" resumeKey={resumeKey} chapterName={`Pinnacle Maths · ${meta.label}`} allQuestions={all} />
            )}
          />
        )}
      </section>
    </>
  );
}
