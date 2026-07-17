"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { loadNotes } from "@/lib/notesbank";
import NotesReader from "@/components/NotesReader";

// Indian Polity notes — SIMPLICRACK GS Foundation, browsed as a book.
export default function PolityNotesPage() {
  const [book, setBook] = useState(undefined); // undefined = loading, null = failed

  useEffect(() => {
    let alive = true;
    loadNotes("polity").then((b) => {
      if (alive) setBook(b);
    });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <>
      <section className="hero" style={{ paddingBottom: 8 }}>
        <div className="row between">
          <span className="hero__eyebrow">{book?.eyebrow || "📔 Polity Notes"}</span>
          <Link href="/subjects" className="btn btn--ghost btn--sm">
            ← Subjects
          </Link>
        </div>
        <h1 className="hero__title" style={{ fontSize: "clamp(1.7rem, 4vw, 2.6rem)" }}>
          <span className="grad">{book?.title || "Indian Polity"}</span>
          {book ? ` · ${book.meta.total_pages}` : ""}
        </h1>
        {book?.sub && <p className="hero__sub">{book.sub}</p>}
      </section>

      <section className="section">
        {book === undefined ? (
          <div className="placeholder">Notes load ho rahe hain… 📖</div>
        ) : book === null ? (
          <div className="placeholder">Notes load nahi hue. 😕</div>
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
