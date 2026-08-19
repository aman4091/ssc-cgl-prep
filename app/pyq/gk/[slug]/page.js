"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { loadGkIndex, loadGkTopic } from "@/lib/gkbank";
import { isUserTopicId, getUserTopic, getUserBook, getUserTopicQuestions } from "@/lib/userpyq";
import PyqQuestionCard from "@/components/PyqQuestionCard";
import QBoard from "@/components/QBoard";

// One page for ANY crazygktrick topic, whichever index sent you here — GKTricks
// (Polity, Ancient History) or Mirror of Common Errors (Noun). The slugs are
// unique across the bank, so a single route serves both rather than two
// near-identical ones.

export default function GkTopicPage() {
  const { slug } = useParams();
  const [topic, setTopic] = useState(null);
  const [qs, setQs] = useState([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    setTopic(null); setQs([]); setReady(false);
    // "u_" slugs are the user's OWN topics (Settings → PYQ Manager) — same UI,
    // data from localStorage instead of the static bank.
    if (isUserTopicId(slug)) {
      const t = getUserTopic(slug);
      const book = t ? getUserBook(t.bookId) : null;
      if (t) {
        setTopic({
          slug, label: t.name, icon: book?.icon || "📘",
          subject: book?.subject || "gs", chapter: t.name,
          userBookId: t.bookId, userBookName: book?.name || "Meri book",
          // Shelf-books (existing banks) go back to the bank's own shelf page.
          userBackHref: book?.href || `/pyq/my/${t.bookId}`,
        });
        setQs(getUserTopicQuestions(slug));
      }
      setReady(true);
      return () => { alive = false; };
    }
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
  const back = topic?.userBookId
    ? { href: topic.userBackHref, label: `← ${topic.userBookName}` }
    : topic?.subject === "english"
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

  // Rail, aaj ka counter, ho-gaye-neeche aur "Show more" — sab QBoard ke paas.
  const resumeKey = `gk:${slug}`;

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
          <QBoard
            title={topic?.chapter || topic?.label || "Test"}
            list={qs}
            subject={topic?.subject || "gs"}
            resumeKey={resumeKey}
            renderCard={(q, i, all) => (
              <PyqQuestionCard
                resumeKey={resumeKey}
                key={q.id || i}
                q={q}
                index={i}
                subject={topic?.subject || "gs"}
                chapterName={topic?.chapter || topic?.label}
                archiveOnAnswer
                fileToChapter
              />
            )}
          />
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
