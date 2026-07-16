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
          <div className="grid grid--3">
            {chapters.map((c) => (
              <Link
                key={c.slug}
                href={`/pyq/pinnacle/${c.slug}`}
                className="glass-card subject"
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <div className="subject__icon">{c.icon}</div>
                <h3>{c.label}</h3>
                <p className="mt-8">
                  {c.count} questions{c.passages ? ` · ${c.passages} passages` : ""}
                </p>
                <span className="badge badge--ok" style={{ marginTop: 12 }}>Solve →</span>
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
