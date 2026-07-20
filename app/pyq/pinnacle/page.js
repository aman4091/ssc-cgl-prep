"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { loadEngIndex } from "@/lib/engbank";

// The Pinnacle English book's own 15 chapters, browsed as a book.
export default function PinnaclePage() {
  const [book, setBook] = useState(null);

  useEffect(() => {
    let alive = true;
    loadEngIndex().then((b) => { if (alive) setBook(b); });
    return () => { alive = false; };
  }, []);

  const chapters = book?.chapters || [];

  return (
    <>
      <section className="hero" style={{ paddingBottom: 8 }}>
        <div className="row between">
          <span className="hero__eyebrow">📚 Pinnacle English</span>
          <Link href="/pyq" className="btn btn--ghost btn--sm">← PYQ</Link>
        </div>
        <h1 className="hero__title" style={{ fontSize: "clamp(1.7rem, 4vw, 2.6rem)" }}>
          Pinnacle <span className="grad">English{book ? ` · ${book.total}` : ""}</span>
        </h1>
        <p className="hero__sub">
          693-page SSC English question bank — question, options, answer aur solution note, sab
          book ke apne. Solutions bilingual hain (answer English mein, samjhaana Hindi mein).
        </p>
      </section>

      <section className="section">
        {!book ? (
          <div className="placeholder">Loading the book… 📚</div>
        ) : chapters.length === 0 ? (
          <div className="placeholder">Book load nahi hui. 😕</div>
        ) : (
          <div className="pyq-list">
            {chapters.map((c) => (
              <Link key={c.slug} href={`/pyq/pinnacle/${c.slug}`} className="pyq-row">
                <span className="pyq-row__ico">{c.icon}</span>
                <span className="pyq-row__name">{c.label}</span>
                <span className="pyq-row__meta">
                  {c.count} Q{c.passages ? ` · ${c.passages} passages` : ""}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {book && (
        <section className="section">
          <p className="hint">📚 {book.source} · {book.note}</p>
        </section>
      )}
    </>
  );
}
