"use client";

// 📝 Mere one-liner — notes ke page par ✨ dabane ke baad jo AI se banta hai,
// wo yahan paste karo.
//
// Kaam ka kram:
//   1. Notes ki kisi book ke page par ✨ dabao — prompt + us page ka text
//      copy hota hai aur AI site khul jati hai.
//   2. Jo aaya wo copy karke yahan aao. Upar wahi page ka naam pehle se
//      likha milega (📜 History · Parmar — Stone Age · page 12), neeche
//      paste karo, "Sambhalo" dabao.
//   3. Neeche book-wise list: har book ke andar page ke kram mein.
//
// Ek page ka ek hi note rehta hai — dobara paste karne par purana badal
// jata hai, do copy nahi banti.

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import "./paste.css";
import Markdown from "@/components/Markdown";
import { listNotesBooks } from "@/lib/notesbank";
import {
  getLastSource, getNote, saveNote, removeNote, notesByBook, noteKey,
} from "@/lib/pastednotes";

const srcLabel = (s) =>
  !s ? "" : [s.eyebrow || s.bookTitle, s.topic, s.page ? `page ${s.page}` : ""].filter(Boolean).join(" · ");

function NoteCard({ n, onGone }) {
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState(false);
  const [draft, setDraft] = useState(n.text);
  useEffect(() => { setDraft(n.text); }, [n.text]);

  return (
    <div className="pn-note">
      <div className="pn-note__hd">
        <button type="button" className="pn-note__t" onClick={() => setOpen((v) => !v)}>
          {open ? "⌃" : "⌄"} {n.topic || "—"} <span className="pn-dim">· page {n.page}</span>
        </button>
        <button type="button" className="pn-x" onClick={() => setEdit((v) => !v)} title="Badlo">✏️</button>
        <button
          type="button"
          className="pn-x"
          title="Ye note hatao"
          onClick={() => { if (window.confirm("Ye note hata dein?")) { removeNote(n.k); onGone(); } }}
        >🗑️</button>
      </div>
      {edit ? (
        <div className="pn-edit">
          <textarea rows={10} value={draft} onChange={(e) => setDraft(e.target.value)} />
          <div className="row" style={{ gap: 8 }}>
            <button
              type="button"
              className="btn btn--primary btn--sm"
              onClick={() => { saveNote(n, draft); setEdit(false); onGone(); }}
            >Sambhalo</button>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => { setDraft(n.text); setEdit(false); }}>
              Rehne do
            </button>
          </div>
        </div>
      ) : open ? (
        <div className="pn-body"><Markdown>{n.text}</Markdown></div>
      ) : null}
    </div>
  );
}

export default function PasteNotesPage() {
  const [src, setSrc] = useState(null);
  const [text, setText] = useState("");
  const [groups, setGroups] = useState([]);
  const [flash, setFlash] = useState("");
  // Haath se chunne ke liye (✨ dabaye bina bhi paste kar sako).
  const books = useMemo(() => listNotesBooks(), []);
  const [mBook, setMBook] = useState("");
  const [mTopic, setMTopic] = useState("");
  const [mPage, setMPage] = useState("");

  const reload = useCallback(() => setGroups(notesByBook()), []);

  useEffect(() => {
    setSrc(getLastSource());
    reload();
    const h = () => reload();
    const hs = (e) => setSrc((e && e.detail) || getLastSource());
    window.addEventListener("cgl:pastednotes", h);
    window.addEventListener("cgl:pastednotes-src", hs);
    return () => {
      window.removeEventListener("cgl:pastednotes", h);
      window.removeEventListener("cgl:pastednotes-src", hs);
    };
  }, [reload]);

  // ✨ wala page badla to purana note dikha do — dobara paste karne par wahi
  // badlega, naya nahi banega.
  useEffect(() => {
    if (!src) return;
    const had = getNote(src);
    setText(had ? had.text : "");
  }, [src && noteKey(src)]); // eslint-disable-line react-hooks/exhaustive-deps

  // Haath se bhara hua source — tabhi jab ✨ wala na ho ya user khud bhare.
  const manual = mBook
    ? {
      book: mBook,
      bookTitle: (books.find((b) => b.slug === mBook) || {}).title || mBook,
      eyebrow: (books.find((b) => b.slug === mBook) || {}).eyebrow || "",
      topic: mTopic.trim(),
      page: mPage.trim(),
    }
    : null;
  const target = manual && manual.page ? manual : src;

  const save = () => {
    if (!target || !text.trim()) return;
    saveNote(target, text);
    setText("");
    setFlash("✓ Sambhal liya");
    setTimeout(() => setFlash(""), 1800);
    reload();
  };

  const total = groups.reduce((a, g) => a + g.items.length, 0);

  return (
    <>
      <section className="hero" style={{ paddingBottom: 8 }}>
        <div className="row between">
          <span className="hero__eyebrow">📝 Mere one-liner</span>
          <Link href="/notes/parmar-history" className="btn btn--ghost btn--sm">📔 Notes</Link>
        </div>
        <h1 className="hero__title" style={{ fontSize: "clamp(1.6rem, 4vw, 2.4rem)" }}>
          Notes ke <span className="grad">one-liner</span>
        </h1>
        <p className="hero__sub">
          Notes ke kisi page par <b>✨</b> dabao — prompt copy hoke AI site khul jati hai. Jo jawab aaye
          wo yahan paste karo; wo usi book, chapter aur page ke naam se sambhal jayega.
          {total ? <> Abhi <b>{total}</b> page ke one-liner hain.</> : null}
        </p>
      </section>

      <section className="section">
        <div className="pn-box">
          <div className="pn-src">
            {target ? (
              <>Kahan ka: <b>{srcLabel(target)}</b></>
            ) : (
              <>Abhi kisi page par ✨ nahi dabaya. Neeche se khud chun lo, ya notes kholkar ✨ dabao.</>
            )}
          </div>

          <textarea
            className="pn-ta"
            rows={9}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="AI se aaye one-liner yahan paste karo…"
          />

          <div className="row" style={{ gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <button type="button" className="btn btn--primary" onClick={save} disabled={!target || !text.trim()}>
              💾 Sambhalo
            </button>
            {flash ? <span className="hint" style={{ color: "var(--success)" }}>{flash}</span> : null}
          </div>

          {/* Khud chunna — ✨ dabaye bina bhi kuch paste karna ho to. */}
          <details className="pn-manual">
            <summary className="hint">⌄ Khud chuno (✨ dabaye bina)</summary>
            <div className="sp-selects mt-8">
              <label className="sp-sel">
                <span>Book</span>
                <select value={mBook} onChange={(e) => setMBook(e.target.value)}>
                  <option value="">— chuno —</option>
                  {books.map((b) => <option key={b.slug} value={b.slug}>{b.eyebrow || b.title}</option>)}
                </select>
              </label>
              <label className="sp-sel">
                <span>Chapter</span>
                <input className="input" value={mTopic} onChange={(e) => setMTopic(e.target.value)} placeholder="jaise Stone Age" />
              </label>
              <label className="sp-sel">
                <span>Page</span>
                <input className="input" value={mPage} onChange={(e) => setMPage(e.target.value)} placeholder="jaise 12" />
              </label>
            </div>
          </details>
        </div>
      </section>

      <section className="section">
        {groups.length === 0 ? (
          <div className="placeholder">Abhi kuch paste nahi kiya. Notes kholo, ✨ dabao, aur jawab yahan le aao. 📝</div>
        ) : (
          groups.map((g) => (
            <details key={g.book} className="glass-card pn-group" open>
              <summary>
                <strong>{g.eyebrow || g.title}</strong> <span className="pn-dim">· {g.items.length} page</span>
              </summary>
              {g.items.map((n) => <NoteCard key={n.k} n={n} onGone={reload} />)}
            </details>
          ))
        )}
      </section>
    </>
  );
}
