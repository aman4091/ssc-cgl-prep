"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { loadGkIndex, loadGkTopic } from "@/lib/gkbank";
import PyqQuestionCard from "@/components/PyqQuestionCard";

// One page for ANY crazygktrick topic, whichever index sent you here — GKTricks
// (Polity, Ancient History) or Mirror of Common Errors (Noun). The slugs are
// unique across the bank, so a single route serves both rather than two
// near-identical ones.
const PAGE = 50; // render in slices — 1,077 cards at once janks a phone

export default function GkTopicPage() {
  const { slug } = useParams();
  const [topic, setTopic] = useState(null);
  const [qs, setQs] = useState([]);
  const [ready, setReady] = useState(false);
  const [shown, setShown] = useState(PAGE);

  useEffect(() => {
    let alive = true;
    setTopic(null); setQs([]); setReady(false); setShown(PAGE);
    (async () => {
      const [idx, list] = await Promise.all([loadGkIndex(), loadGkTopic(slug)]);
      if (!alive) return;
      setTopic((idx.topics || []).find((t) => t.slug === slug) || null);
      setQs(list);
      setReady(true);
    })();
    return () => { alive = false; };
  }, [slug]);

  // Where "back" goes depends on which shelf this topic sits on.
  const back = topic?.subject === "english"
    ? { href: "/pyq/mirror", label: "← Mirror of Common Errors" }
    : { href: "/pyq/gktricks", label: "← GKTricks" };

  if (ready && !topic) {
    return (
      <section className="hero">
        <h1 className="hero__title">Not found</h1>
        <p className="hero__sub">Aisa koi topic nahi hai.</p>
        <Link href="/pyq/gktricks" className="btn btn--ghost btn--sm mt-16">← GKTricks</Link>
      </section>
    );
  }

  return (
    <>
      <section className="hero" style={{ paddingBottom: 8 }}>
        <div className="row between">
          <span className="hero__eyebrow">{topic?.icon} {topic?.label || "…"}</span>
          <Link href={back.href} className="btn btn--ghost btn--sm">{back.label}</Link>
        </div>
        <h1 className="hero__title" style={{ fontSize: "clamp(1.6rem, 4vw, 2.4rem)" }}>
          {topic?.label} <span className="grad">· {qs.length} questions</span>
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
          <div className="placeholder">Is topic mein koi question nahi. 🤔</div>
        ) : (
          <>
            <div className="grid" style={{ gap: 14 }}>
              {qs.slice(0, shown).map((q, i) => (
                <PyqQuestionCard
                  key={q.id || i}
                  q={q}
                  index={i}
                  subject={topic?.subject || "gs"}
                  chapterName={topic?.chapter || topic?.label}
                  archiveOnAnswer
                  fileToChapter
                  allQuestions={qs}
                />
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

      {topic?.note && (
        <section className="section">
          <p className="hint">📚 {topic.source} · {topic.note}</p>
        </section>
      )}
    </>
  );
}
