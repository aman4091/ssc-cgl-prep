"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { loadGkIndex } from "@/lib/gkbank";

// "A Mirror of Common Errors" — the error-spotting half of the crazygktrick
// bank. It used to sit inside the English upload bank as an unnamed tab; here it
// has its own shelf, with Noun as its first chapter.
export default function MirrorPage() {
  const [topics, setTopics] = useState(null);

  useEffect(() => {
    loadGkIndex().then((i) => setTopics((i.topics || []).filter((t) => t.subject === "english")));
  }, []);

  const total = (topics || []).reduce((s, t) => s + (t.count || 0), 0);

  return (
    <>
      <section className="hero" style={{ paddingBottom: 8 }}>
        <div className="row between">
          <span className="hero__eyebrow">🪞 Mirror of Common Errors</span>
          <Link href="/pyq" className="btn btn--ghost btn--sm">← PYQ</Link>
        </div>
        <h1 className="hero__title" style={{ fontSize: "clamp(1.6rem, 4vw, 2.4rem)" }}>
          Mirror of <span className="grad">Common Errors</span>
        </h1>
        <p className="hero__sub">
          {total ? `${total} error-spotting questions` : "…"} — chapter-wise, poore explanation ke saath.
        </p>
      </section>

      <section className="section">
        {!topics ? (
          <div className="placeholder">Loading… 📚</div>
        ) : topics.length === 0 ? (
          <div className="placeholder">Koi chapter nahi mila. 😕</div>
        ) : (
          <div className="pyq-list">
            {topics.map((t) => (
              <Link key={t.slug} href={`/pyq/gk/${t.slug}`} className="pyq-row">
                <span className="pyq-row__ico">{t.icon}</span>
                <span className="pyq-row__name">{t.chapter || t.label}</span>
                <span className="pyq-row__meta">{t.count} Q</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
