"use client";

// 📝 Mere one-liner — sirf PADHNE ki jagah.
//
// Paste karna notes ke page par hi hota hai (wahan ✨ / 📥 dabane par box
// khulta hai), isliye yahan koi paste-box nahi. Yahan wo notes hain, khule
// hue, ek ke baad ek — book ke naam ki ek patli patti se chhaante ja sakte
// hain. Pehle har book ek band dropdown thi aur har note bhi band — padhne
// se pehle do-do click lagte the.
//
// 🐋 Bold karo — us note ke zaroori shabd (Art number, saal, naam, sankhya)
// **bold** karwa deta hai. Sirf shakl badalti hai, ek bhi baat nahi.

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import "./paste.css";
import OneLinerNotes from "@/components/OneLinerNotes";
import { countOneLiner } from "@/lib/onelinerfmt";
import { formatOneLiner } from "@/lib/client-ai";
import { saveNote, removeNote, notesByBook } from "@/lib/pastednotes";

function Note({ n, onGone }) {
  const [edit, setEdit] = useState(false);
  const [draft, setDraft] = useState(n.text);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  useEffect(() => { setDraft(n.text); }, [n.text]);

  const c = countOneLiner(n.text);

  const bold = async () => {
    if (busy) return;
    setBusy(true); setErr("");
    try {
      const { text } = await formatOneLiner(n.text);
      saveNote(n, text);
      onGone();
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  };

  return (
    <article className="pn-note">
      <div className="pn-note__hd">
        <h3 className="pn-note__t">
          {n.topic || "—"}
          <span className="pn-dim"> · page {n.page} · {c.n} point{c.star ? ` · ⭐ ${c.star}` : ""}</span>
        </h3>
        <button type="button" className="pn-x" onClick={bold} disabled={busy} title="Zaroori shabd bold karwao (DeepSeek)">
          {busy ? "…" : "🐋 Bold"}
        </button>
        <button type="button" className="pn-x" onClick={() => setEdit((v) => !v)} title="Khud badlo">✏️</button>
        <button
          type="button"
          className="pn-x"
          title="Ye note hatao"
          onClick={() => { if (window.confirm("Ye note hata dein?")) { removeNote(n.k); onGone(); } }}
        >🗑️</button>
      </div>

      {err ? <div className="pn-err">⚠️ {err}</div> : null}

      {edit ? (
        <div className="pn-edit">
          <textarea rows={12} value={draft} onChange={(e) => setDraft(e.target.value)} />
          <div className="row" style={{ gap: 8 }}>
            <button type="button" className="btn btn--primary btn--sm" onClick={() => { saveNote(n, draft); setEdit(false); onGone(); }}>
              Sambhalo
            </button>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => { setDraft(n.text); setEdit(false); }}>
              Rehne do
            </button>
          </div>
        </div>
      ) : (
        <OneLinerNotes text={n.text} />
      )}
    </article>
  );
}

export default function PasteNotesPage() {
  const [groups, setGroups] = useState([]);
  const [book, setBook] = useState("");   // khali = saari books

  const reload = useCallback(() => setGroups(notesByBook()), []);
  useEffect(() => {
    reload();
    const h = () => reload();
    window.addEventListener("cgl:pastednotes", h);
    return () => window.removeEventListener("cgl:pastednotes", h);
  }, [reload]);

  const shown = useMemo(() => (book ? groups.filter((g) => g.book === book) : groups), [groups, book]);
  const tally = useMemo(() => {
    let pages = 0, pts = 0, star = 0;
    for (const g of shown) for (const n of g.items) {
      pages += 1;
      const c = countOneLiner(n.text);
      pts += c.n; star += c.star;
    }
    return { pages, pts, star };
  }, [shown]);

  if (!groups.length) {
    return (
      <section className="section" style={{ marginTop: 24 }}>
        <div className="placeholder">
          Abhi kuch paste nahi kiya. Notes ke kisi page par <b>✨</b> ya <b>📥</b> dabao — wahin
          box khulta hai, aur jo paste karoge wo yahan aa jayega. 📝
        </div>
        <div className="row mt-16"><Link href="/notes/parmar-polity" className="btn btn--ghost btn--sm">📔 Notes kholo</Link></div>
      </section>
    );
  }

  return (
    <section className="section" style={{ marginTop: 16 }}>
      {/* Ek patli patti — ginti aur book ki chhaanti. Isse zyada kuch nahi:
          ye padhne ki jagah hai. */}
      <div className="pn-bar">
        <span className="pn-count">
          📝 {tally.pages} page · {tally.pts} point{tally.star ? ` · ⭐ ${tally.star}` : ""}
        </span>
        {groups.length > 1 && (
          <span className="pn-books">
            <button type="button" className={`pn-b${book ? "" : " is-on"}`} onClick={() => setBook("")}>Sab</button>
            {groups.map((g) => (
              <button
                key={g.book}
                type="button"
                className={`pn-b${book === g.book ? " is-on" : ""}`}
                onClick={() => setBook(g.book)}
              >{g.eyebrow || g.title}</button>
            ))}
          </span>
        )}
      </div>

      {shown.map((g) => (
        <div key={g.book}>
          {!book && groups.length > 1 && <h2 className="pn-bookt">{g.eyebrow || g.title}</h2>}
          {g.items.map((n) => <Note key={n.k} n={n} onGone={reload} />)}
        </div>
      ))}
    </section>
  );
}
