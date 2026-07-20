"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { loadMathIndex } from "@/lib/mathbank";

// Pinnacle Maths — the book's 27 chapters, browsed as a book.
export default function MathbankPage() {
  const [book, setBook] = useState(null);

  useEffect(() => {
    let alive = true;
    loadMathIndex().then((b) => { if (alive) setBook(b); });
    return () => { alive = false; };
  }, []);

  const chapters = book?.chapters || [];

  return (
    <>
      <section className="hero" style={{ paddingBottom: 8 }}>
        <div className="row between">
          <span className="hero__eyebrow">🧮 Pinnacle Maths</span>
          <Link href="/pyq" className="btn btn--ghost btn--sm">← PYQ</Link>
        </div>
        <h1 className="hero__title" style={{ fontSize: "clamp(1.7rem, 4vw, 2.6rem)" }}>
          Pinnacle <span className="grad">Maths{book ? ` · ${book.total}` : ""}</span>
        </h1>
        <p className="hero__sub">
          643-page SSC maths bank — question, options aur poora solution, sab image mein (maths text
          mein toot jaata hai), asli exam ke saath. Chapter chuno aur solve karo.
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
              <Link key={c.slug} href={`/pyq/mathbank/${c.slug}`} className="pyq-row">
                <span className="pyq-row__ico">{c.icon}</span>
                <span className="pyq-row__name">{c.label}</span>
                <span className="pyq-row__meta">{c.count} Q</span>
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
