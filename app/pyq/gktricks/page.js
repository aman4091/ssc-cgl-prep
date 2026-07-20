"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { loadGkIndex } from "@/lib/gkbank";

// The crazygktrick bank, GS half — Polity and Ancient History. These used to be
// mixed into the General Awareness upload bank, where they had no shelf of their
// own; here each is its own chapter under a GS heading.
export default function GkTricksPage() {
  const [topics, setTopics] = useState(null);

  useEffect(() => {
    loadGkIndex().then((i) => setTopics((i.topics || []).filter((t) => t.subject === "gs")));
  }, []);

  const total = (topics || []).reduce((s, t) => s + (t.count || 0), 0);

  return (
    <>
      <section className="hero" style={{ paddingBottom: 8 }}>
        <div className="row between">
          <span className="hero__eyebrow">🧠 GKTricks</span>
          <Link href="/pyq" className="btn btn--ghost btn--sm">← PYQ</Link>
        </div>
        <h1 className="hero__title" style={{ fontSize: "clamp(1.6rem, 4vw, 2.4rem)" }}>
          GK<span className="grad">Tricks</span>
        </h1>
        <p className="hero__sub">
          {total ? `${total} ready-made questions` : "…"} — crazygktrick.com ke practice PDFs se, poore
          explanation ke saath.
        </p>
      </section>

      <section className="section">
        <h3 className="mt-8">🌍 GS</h3>
        {!topics ? (
          <div className="placeholder">Loading… 📚</div>
        ) : topics.length === 0 ? (
          <div className="placeholder">Koi topic nahi mila. 😕</div>
        ) : (
          <div className="pyq-list mt-8">
            {topics.map((t) => (
              <Link key={t.slug} href={`/pyq/gk/${t.slug}`} className="pyq-row">
                <span className="pyq-row__ico">{t.icon}</span>
                <span className="pyq-row__name">{t.label}</span>
                <span className="pyq-row__meta">{t.count} Q</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* The wrong options in this bank were written by a model, not printed in
          the source. Saying so where the questions are is the honest place. */}
      {topics?.some((t) => t.optionsGenerated) && (
        <section className="section">
          <p className="hint">
            ⚠️ In banks ke <b>galat options AI ne likhe hain</b> — source PDF mein sirf sahi answer chhapa tha.
            Question aur sahi answer asli hain.
          </p>
        </section>
      )}
    </>
  );
}
