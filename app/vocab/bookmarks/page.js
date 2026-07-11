"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getBookmarkItems, toggleBookmark, typeIcon, typeLabel } from "@/lib/vocab";
import WordPopup from "@/components/WordPopup";

export default function BookmarksPage() {
  const [items, setItems] = useState([]);
  const [popup, setPopup] = useState(null);

  const refresh = () => setItems(getBookmarkItems());
  useEffect(() => { refresh(); }, []);

  const remove = (word) => { toggleBookmark(word); refresh(); };

  return (
    <>
      <section className="hero" style={{ paddingBottom: 8 }}>
        <div className="row between">
          <span className="hero__eyebrow">⭐ Bookmarks</span>
          <Link href="/vocab" className="btn btn--ghost btn--sm">← Vocab</Link>
        </div>
        <h1 className="hero__title" style={{ fontSize: "clamp(1.6rem, 4vw, 2.4rem)" }}>
          Saved <span className="grad">Words</span>
        </h1>
        <p className="hero__sub">{items.length ? `${items.length} bookmarked` : "No bookmarks yet."}</p>
      </section>

      <section className="section" style={{ marginTop: 12 }}>
        {items.length === 0 ? (
          <div className="placeholder">Open a word and tap ☆ Bookmark — it'll show up here. ⭐</div>
        ) : (
          <div className="grid grid--3">
            {items.map((it) => (
              <article key={it.word} className="glass-card">
                <div className="row between">
                  <span className="type-tag">{typeIcon(it.type)} {typeLabel(it.type)}</span>
                  <button className="btn btn--ghost btn--sm" onClick={() => remove(it.word)} title="Remove bookmark">★</button>
                </div>
                <h3 className="grad" style={{ marginTop: 12, fontSize: "1.2rem" }}>{it.word}</h3>
                <p className="muted mt-8" style={{ fontSize: "0.85rem" }}>{it.def}</p>
                <button className="btn btn--primary btn--block mt-16" onClick={() => setPopup(it.word)}>Detail</button>
              </article>
            ))}
          </div>
        )}
      </section>

      <WordPopup word={popup} onClose={() => setPopup(null)} />
    </>
  );
}
