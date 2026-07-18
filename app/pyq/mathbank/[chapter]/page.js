"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { loadMathChapter, mathChapterMeta } from "@/lib/mathbank";
import MathQuestionCard from "@/components/MathQuestionCard";
import FullscreenTestButton from "@/components/FullscreenTestButton";

const PAGE = 20; // each question is several images — page in small slices

export default function MathbankChapterPage() {
  const { chapter } = useParams();
  const [meta, setMeta] = useState(null);
  const [qs, setQs] = useState([]);
  const [ready, setReady] = useState(false);
  const [shown, setShown] = useState(PAGE);

  useEffect(() => {
    let alive = true;
    setMeta(null); setQs([]); setReady(false); setShown(PAGE);
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
            <FullscreenTestButton questions={qs} title={`Pinnacle Maths · ${meta?.label || ""}`} subject="math" label={`⛶ Full-screen test (${qs.length})`} className="btn btn--primary" />
          </div>
        )}
      </section>

      <section className="section">
        {!ready ? (
          <div className="placeholder">Loading questions… 📚</div>
        ) : qs.length === 0 ? (
          <div className="placeholder">Is chapter mein koi question nahi. 🤔</div>
        ) : (
          <>
            {/* minmax(0,1fr): the base .grid is a single auto column that grows
                to its widest child, and a wide maths crop would drag the whole
                page sideways. This bounds the column to the container so the
                crops scroll inside their own boxes instead. */}
            <div className="grid" style={{ gap: 14, gridTemplateColumns: "minmax(0, 1fr)" }}>
              {qs.slice(0, shown).map((q, i) => (
                <MathQuestionCard key={q.id} q={q} index={i} chapterName={`Pinnacle Maths · ${meta.label}`} allQuestions={qs} />
              ))}
            </div>
            {shown < qs.length && (
              <button className="btn btn--ghost btn--block mt-16" onClick={() => setShown((n) => n + PAGE)}>
                ▼ Show {Math.min(PAGE, qs.length - shown)} more ({shown} / {qs.length})
              </button>
            )}
          </>
        )}
      </section>
    </>
  );
}
