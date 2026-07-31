"use client";

// The homepage study feed. A big dropdown switches between the items the user
// curates (➕ Add items): the Vocab singleton (auto-advances to the next
// un-quizzed day via nextUp) and any notes topics (their Hindi/Hinglish notes).
// Replaces the old always-on full-page vocab widget — vocab is now one item.

import Link from "next/link";
import { useEffect, useState } from "react";
import { nextUp } from "@/lib/vocab";
import { getItems, getActiveId, setActiveId, removeItem, subscribeHome } from "@/lib/homefeed";
import HomeVocab from "@/components/HomeVocab";
import NotesChapterView from "@/components/NotesChapterView";
import AddItemsModal from "@/components/AddItemsModal";

export default function HomeFeed() {
  const [ready, setReady] = useState(false); // localStorage → only after mount
  const [items, setItems] = useState([]);
  const [activeId, setActive] = useState(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    const sync = () => { setItems(getItems()); setActive(getActiveId()); };
    sync();
    setReady(true);
    return subscribeHome(sync);
  }, []);

  if (!ready) return <section className="section"><div className="placeholder">…</div></section>;

  const active = items.find((it) => it.id === activeId) || items[0];

  const bar = (
    <section className="section" style={{ paddingBottom: 0 }}>
      <div className="row between" style={{ gap: 8 }}>
        <select
          className="input"
          value={active?.id || ""}
          onChange={(e) => setActiveId(e.target.value)}
          style={{ maxWidth: 320, fontSize: "1.05rem", fontWeight: 600 }}
        >
          {items.map((it) => (
            <option key={it.id} value={it.id}>{it.label}</option>
          ))}
        </select>
        <span className="row" style={{ gap: 6 }}>
          {active && active.kind === "notes" && (
            <button className="btn btn--ghost btn--sm" onClick={() => removeItem(active.id)} title="Is chapter ko list se hatao">🗑️</button>
          )}
          <button className="btn btn--primary btn--sm" onClick={() => setAdding(true)}>➕ Add items</button>
        </span>
      </div>
    </section>
  );

  let body;
  if (!active || active.kind === "vocab") {
    const n = nextUp();
    body = n ? (
      <HomeVocab day={n.day} type={n.type} />
    ) : (
      <section className="section">
        <div className="home-head"><h1>Aage kya</h1></div>
        <p className="muted">Sab ho gaya — ya abhi koi word add nahi kiya.</p>
        <Link href="/vocab" className="btn btn--primary mt-16">🔤 Vocab kholo</Link>
      </section>
    );
  } else {
    body = <NotesChapterView slug={active.slug} topic={active.topic} />;
  }

  return (
    <>
      {bar}
      {body}
      {adding && <AddItemsModal onClose={() => setAdding(false)} />}
    </>
  );
}
