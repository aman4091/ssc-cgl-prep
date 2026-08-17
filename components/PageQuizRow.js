"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { loadNotes } from "@/lib/notesbank";
import { startNotesQuiz } from "@/lib/notesquiz";
import { pageText } from "@/components/NotesReader";

// One notes CHAPTER as a row of per-page 📝 quiz buttons plus a link to the
// chapter itself. Shared by /today (RBE GK items -> matching Parmar chapter) and
// /gs30 (the six-pass GS sweep), so both hit the same quiz engine and the same
// cross-click dedup key — a page quizzed from one page won't repeat its
// questions when opened from the other.
//
// The book is fetched only when the row is expanded: these pages carry a lot of
// chapters, and eagerly loading nine notes books would be a wall of JSON for
// rows the owner may never open. loadNotes() caches per book, so many rows
// pointing at the same book cost one fetch.
export default function PageQuizRow({ book, chapter, compact }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState(null); // null = unloaded, "err", or { b, pages }
  const [busy, setBusy] = useState(0);
  const [err, setErr] = useState("");

  const toggle = async () => {
    setOpen((v) => !v);
    if (state) return;
    const b = await loadNotes(book);
    if (!b) { setState("err"); return; }
    setState({
      b,
      pages: (b.pages || []).filter(
        (p) => !p.is_cover && p.kind !== "practice" && p.topic === chapter
      ),
    });
  };

  const quiz = async (p) => {
    if (busy) return;
    const text = pageText(p);
    if (text.length < 30) {
      setErr("Is page pe text kam hai — scan wala page hai.");
      setTimeout(() => setErr(""), 2500);
      return;
    }
    setBusy(p.book_page);
    setErr("");
    try {
      const { quizId } = await startNotesQuiz({
        text,
        pk: `${state.b.scanBase}#${p.book_page}`,
        title: `${state.b.title} · page ${p.book_page} quiz`,
      });
      router.push(`/quizzes/${quizId}`);
    } catch (e) {
      setErr(e.message === "nahi bana" ? "Quiz nahi bana — dobara try karo." : (e.message || "Error"));
      setBusy(0);
      setTimeout(() => setErr(""), 3000);
    }
  };

  return (
    <>
      <button className="btn btn--ghost btn--sm" onClick={toggle}>
        {compact ? "📝" : "📝 Quiz"} {open ? "▴" : "▾"}
      </button>
      {open && (
        <div style={{ width: "100%", marginTop: 4 }}>
          {state === null ? (
            <span className="hint">Pages load ho rahe hain…</span>
          ) : state === "err" ? (
            <span className="hint">Notes book load nahi hui — net check karo.</span>
          ) : (
            <div className="row" style={{ gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              {state.pages.map((p) => (
                <button
                  key={p.book_page}
                  className="btn btn--ghost btn--sm"
                  disabled={!!busy}
                  onClick={() => quiz(p)}
                  title={`Page ${p.book_page} se 50-question quiz (har baar naye questions)`}
                >
                  {busy === p.book_page ? "…" : `p.${p.book_page}`}
                </button>
              ))}
              <Link
                href={`/notes/${book}?topic=${encodeURIComponent(chapter)}`}
                className="btn btn--ghost btn--sm"
                style={{ opacity: 0.8 }}
              >
                Notes →
              </Link>
            </div>
          )}
          {err && <p className="hint" style={{ margin: "2px 0 0", color: "var(--accent)" }}>{err}</p>}
        </div>
      )}
    </>
  );
}
