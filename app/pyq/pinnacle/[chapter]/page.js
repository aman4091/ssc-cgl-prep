"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { loadEngChapter, engChapterMeta } from "@/lib/engbank";
import { getResume } from "@/lib/qprogress";
import PyqQuestionCard from "@/components/PyqQuestionCard";
import { useDoneTabs, DoneTabBar } from "@/components/DoneControls";

const PAGE = 25; // passages are long — fewer per slice than the other banks

export default function PinnacleChapterPage() {
  const { chapter } = useParams();
  const [meta, setMeta] = useState(null);
  const [qs, setQs] = useState([]);
  const [ready, setReady] = useState(false);
  const [shown, setShown] = useState(PAGE);

  useEffect(() => {
    let alive = true;
    setMeta(null); setQs([]); setReady(false); setShown(PAGE);
    (async () => {
      const [m, list] = await Promise.all([engChapterMeta(chapter), loadEngChapter(chapter)]);
      if (!alive) return;
      setMeta(m); setQs(list); setReady(true);
    })();
    return () => { alive = false; };
  }, [chapter]);

  const { tab, setTab, list, pendingCount, doneCount } = useDoneTabs(qs);

  if (ready && !meta) {
    return (
      <section className="hero">
        <h1 className="hero__title">Not found</h1>
        <p className="hero__sub">Pinnacle English mein aisa koi chapter nahi hai.</p>
        <Link href="/pyq/pinnacle" className="btn btn--ghost btn--sm mt-16">← Pinnacle English</Link>
      </section>
    );
  }

  // Reload lands you back where you stopped: the slice is grown past the last
  // question you answered, and the page scrolls to it.
  const resumeKey = `pinnacle:${chapter}`;
  useEffect(() => {
    if (!ready && !qs.length) return;
    const at = getResume(resumeKey);
    if (at < 0) return;
    setShown((n) => Math.max(n, at + PAGE));
    const t = setTimeout(() => {
      document.getElementById(`q-${at}`)?.scrollIntoView({ block: "start" });
    }, 120);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeKey, ready]);

  return (
    <>
      <section className="hero" style={{ paddingBottom: 8 }}>
        <div className="row between">
          <span className="hero__eyebrow">📚 Pinnacle English</span>
          <Link href="/pyq/pinnacle" className="btn btn--ghost btn--sm">← Chapters</Link>
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
          <>
            <DoneTabBar tab={tab} setTab={setTab} pendingCount={pendingCount} doneCount={doneCount} />
            {list.length === 0 ? (
              <div className="placeholder">{tab === "done" ? "Abhi tak kuch 'ho gaya' mark nahi kiya." : "Sab ho gaye! 🎉"}</div>
            ) : (
            <>
            <div className="grid" style={{ gap: 14 }}>
              {list.slice(0, shown).map((q, i) => (
                // Read-only: a static bank has nothing to write back to, so no
                // edit/delete. Answering still archives to the Mistake Notebook.
                <PyqQuestionCard
                  resumeKey={resumeKey}
                  key={q.id}
                  q={q}
                  index={i}
                  subject="english"
                  chapterName={`Pinnacle · ${meta.label}`}
                  archiveOnAnswer
                  fileToChapter
                  allQuestions={list}
                />
              ))}
            </div>
            {shown < list.length && (
              <button className="btn btn--ghost btn--block mt-16" onClick={() => setShown((n) => n + PAGE)}>
                ▼ Show {Math.min(PAGE, list.length - shown)} more ({shown} / {list.length})
              </button>
            )}
            </>
            )}
          </>
        )}
      </section>
    </>
  );
}
