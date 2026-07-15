"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { loadWarIndex } from "@/lib/warbank";

// The WAR book's own 12 subjects. The book is browsed as a book — its subjects
// and chapters are the ones it printed, not the site's gs chapters.
export default function WarPage() {
  const [book, setBook] = useState(null);

  useEffect(() => {
    let alive = true;
    loadWarIndex().then((b) => { if (alive) setBook(b); });
    return () => { alive = false; };
  }, []);

  const subjects = book?.subjects || [];

  return (
    <>
      <section className="hero" style={{ paddingBottom: 8 }}>
        <div className="row between">
          <span className="hero__eyebrow">🎯 WAR · SSC PYQ Bank</span>
          <Link href="/pyq" className="btn btn--ghost btn--sm">← PYQ</Link>
        </div>
        <h1 className="hero__title" style={{ fontSize: "clamp(1.7rem, 4vw, 2.6rem)" }}>
          WAR <span className="grad">{book ? `· ${book.total} PYQs` : ""}</span>
        </h1>
        <p className="hero__sub">
          Real SSC previous-year questions — har question ke saath uska exam, options aur
          explanation, sab book ke apne. Subject chuno aur solve karo.
        </p>
      </section>

      <section className="section">
        {!book ? (
          <div className="placeholder">Loading the book… 📚</div>
        ) : subjects.length === 0 ? (
          <div className="placeholder">Book load nahi hui. 😕</div>
        ) : (
          <div className="grid grid--3">
            {subjects.map((s) => (
              <Link
                key={s.slug}
                href={`/pyq/war/${s.slug}`}
                className="glass-card subject"
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <div className="subject__icon">{s.icon}</div>
                <h3>{s.label}</h3>
                <p className="mt-8">
                  {s.count} questions · {s.chapters.length} chapter{s.chapters.length > 1 ? "s" : ""}
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
