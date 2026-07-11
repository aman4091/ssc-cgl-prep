"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getQBookmarks, removeQBookmark, clearQBookmarks } from "@/lib/qbookmarks";
import { saveQuiz, makeId } from "@/lib/storage";
import PyqQuestionCard from "@/components/PyqQuestionCard";

export default function BookmarksPage() {
  const router = useRouter();
  const [items, setItems] = useState([]);

  const refresh = () => setItems(getQBookmarks());
  useEffect(() => { refresh(); }, []);

  const practiceAll = () => {
    if (!items.length) return;
    const quiz = {
      id: makeId(), title: "Bookmarked questions", source: "bookmarks",
      createdAt: new Date().toISOString(), questions: items.map((b) => b.q),
    };
    saveQuiz(quiz);
    router.push(`/quizzes/${quiz.id}`);
  };
  const remove = (key) => { removeQBookmark(key); refresh(); };
  const clearAll = () => { if (confirm("Remove all bookmarked questions?")) { clearQBookmarks(); refresh(); } };

  return (
    <>
      <section className="hero" style={{ paddingBottom: 8 }}>
        <div className="row between">
          <span className="hero__eyebrow">⭐ Bookmarks</span>
          {items.length > 0 && (
            <div className="row" style={{ gap: 8 }}>
              <button className="btn btn--primary btn--sm" onClick={practiceAll}>🎯 Practice all ({items.length})</button>
              <button className="btn btn--ghost btn--sm" onClick={clearAll}>Clear</button>
            </div>
          )}
        </div>
        <h1 className="hero__title" style={{ fontSize: "clamp(1.7rem, 4vw, 2.6rem)" }}>
          Bookmarked <span className="grad">Questions</span>
        </h1>
        <p className="hero__sub">Questions you starred — revisit and practice them anytime.</p>
      </section>

      <section className="section" style={{ marginTop: 12 }}>
        {items.length === 0 ? (
          <div className="placeholder">No bookmarks yet. Tap ☆ on any question to save it here. ⭐</div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {items.map((b, i) => (
              <PyqQuestionCard
                key={b.key}
                q={b.q}
                index={i}
                subject={b.subject}
                onDelete={() => remove(b.key)}
              />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
