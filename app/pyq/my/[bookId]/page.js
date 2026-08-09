"use client";

// One USER book (Settings → PYQ Manager) — its topics, browsed like any shipped
// bank's shelf. Each topic opens the shared /pyq/gk/[slug] question page.

import Link from "next/link";
import { useState } from "react";
import { useParams } from "next/navigation";
import { getUserBook, getUserTopics, userTopicCount } from "@/lib/userpyq";

export default function UserBookPage() {
  const { bookId } = useParams();
  const [, setTick] = useState(0); // storage sync/edits ke baad refresh ke liye

  const book = getUserBook(bookId);
  const topics = getUserTopics(bookId);

  if (!book) {
    return (
      <section className="hero">
        <h1 className="hero__title">Not found</h1>
        <p className="hero__sub">Aisi koi book nahi. Settings → 📚 PYQ Manager se banao.</p>
        <Link href="/pyq" className="btn btn--ghost btn--sm mt-16">← PYQ</Link>
      </section>
    );
  }

  const total = topics.reduce((a, t) => a + userTopicCount(t.id), 0);

  return (
    <>
      <section className="hero" style={{ paddingBottom: 8 }}>
        <div className="row between">
          <span className="hero__eyebrow">{book.icon} Meri book</span>
          <Link href="/pyq" className="btn btn--ghost btn--sm">← PYQ</Link>
        </div>
        <h1 className="hero__title" style={{ fontSize: "clamp(1.7rem, 4vw, 2.6rem)" }}>
          {book.name} <span className="grad">· {total}</span>
        </h1>
        <p className="hero__sub">Apni PDFs se bani book — naye topics/questions Settings → 📚 PYQ Manager se.</p>
      </section>

      <section className="section">
        {topics.length === 0 ? (
          <div className="placeholder">
            Abhi koi topic nahi. Settings → 📚 PYQ Manager se topic bana ke PDF/paste se questions daalo.
          </div>
        ) : (
          <div className="pyq-list">
            {topics.map((t) => (
              <Link key={t.id} href={`/pyq/gk/${t.id}`} className="pyq-row">
                <span className="pyq-row__ico">📖</span>
                <span className="pyq-row__name">{t.name}</span>
                <span className="pyq-row__meta">{userTopicCount(t.id)} Q</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
