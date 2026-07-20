"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { loadNotes } from "@/lib/notesbank";
import NotesReader from "@/components/NotesReader";

// A transcribed/extracted study-notes book, browsed as a book. One route serves
// every notes bank (polity, static-gk, …) — the per-book config lives in
// lib/notesbank.js.
export default function NotesBookPage() {
  const { book: slug } = useParams();
  const [book, setBook] = useState(undefined); // undefined = loading, null = unknown/failed

  useEffect(() => {
    let alive = true;
    setBook(undefined);
    loadNotes(slug).then((b) => {
      if (alive) setBook(b);
    });
    return () => {
      alive = false;
    };
  }, [slug]);

  return (
    <>
      <section className="hero" style={{ paddingBottom: 8 }}>
        <div className="row between">
          <span className="hero__eyebrow">{book?.eyebrow || "📖 Notes"}</span>
          <Link href="/" className="btn btn--ghost btn--sm">
            ← Home
          </Link>
        </div>
        <h1 className="hero__title" style={{ fontSize: "clamp(1.7rem, 4vw, 2.6rem)" }}>
          <span className="grad">{book?.title || "Notes"}</span>
          {book ? ` · ${book.meta.total_pages}` : ""}
        </h1>
        {book?.sub && <p className="hero__sub">{book.sub}</p>}
      </section>

      <section className="section">
        {book === undefined ? (
          <div className="placeholder">Notes load ho rahe hain… 📖</div>
        ) : book === null ? (
          <div className="placeholder">Ye notes book nahi mili. 😕</div>
        ) : (
          <NotesReader book={book} />
        )}
      </section>

      {book?.note && (
        <section className="section">
          <p className="hint">📚 {book.note}</p>
        </section>
      )}
    </>
  );
}
