"use client";

// 📝 Mere one-liner — sirf PADHNE ki jagah.
//
// Paste karna notes ke page par hi hota hai (wahan ✨ / 📥 dabane par box
// khulta hai), isliye yahan koi paste-box nahi. Yahan wo notes hain, khule
// hue, ek ke baad ek — book ke naam ki ek patli patti se chhaante ja sakte
// hain. Pehle har book ek band dropdown thi aur har note bhi band — padhne
// se pehle do-do click lagte the.
//
// Padhne ka roop: TIMELINE (components/OneLinerNotes). Pehle yahan upar ek
// "🎨 Roop" dropdown tha jisse pandrah roop compare kiye gaye; owner ne roop 8
// final kar diya, isliye ab na dropdown hai na chunaav — naya note paste karte
// hi usi shakl mein aata hai.
//
// Menu se seedha yahan aaya ja sakta hai (components/Navbar ka "Mere
// one-liner" wala khaana yahi link deta hai): ?book=<slug> se sirf us book ke
// page, aur &n=<note ki key> se SIRF wahi ek page — pehle ye sirf scroll
// karta tha aur baaki page bhi khule rehte the, jo ek page chunne ka matlab
// hi khatam kar deta tha. Poori book par wapas jaane ka daba upar patti mein.
//
// 🐋 Bold karo — us note ke zaroori shabd (Art number, saal, naam, sankhya)
// **bold** karwa deta hai. Sirf shakl badalti hai, ek bhi baat nahi.

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import "./paste.css";
import OneLinerNotes from "@/components/OneLinerNotes";
import { countOneLiner } from "@/lib/onelinerfmt";
import { formatOneLiner } from "@/lib/client-ai";
import { saveNote, removeNote, notesByBook, bookLabel } from "@/lib/pastednotes";

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
  const params = useSearchParams();
  const qBook = params.get("book") || "";
  const qNote = params.get("n") || "";
  const [groups, setGroups] = useState([]);
  const [book, setBook] = useState(qBook);   // khali = saari books
  // Ek hi page (note) dikhana hai to uski key — menu se "p.12 · President"
  // dabane par. Khali = us book ke saare page.
  const [note, setNote] = useState(qNote);
  // Menu se doosri book/page chuna to patti ki chhaanti bhi wahi ho jaye.
  useEffect(() => { setBook(qBook); setNote(qNote); }, [qBook, qNote]);

  const reload = useCallback(() => setGroups(notesByBook()), []);
  useEffect(() => {
    reload();
    const h = () => reload();
    window.addEventListener("cgl:pastednotes", h);
    return () => window.removeEventListener("cgl:pastednotes", h);
  }, [reload]);

  const shown = useMemo(() => {
    const gs = book ? groups.filter((g) => g.book === book) : groups;
    if (!note) return gs;
    // Sirf wahi ek page. (Note hat gaya ho to chup-chaap poori book dikha do,
    // khali page dikhane se behtar.)
    const one = gs
      .map((g) => ({ ...g, items: g.items.filter((n) => n.k === note) }))
      .filter((g) => g.items.length);
    return one.length ? one : gs;
  }, [groups, book, note]);
  // Kis book ka ek page khula hai — "← Poora Polity" wali line ke liye.
  const oneBook =
    note && shown.length === 1 && shown[0].items.length === 1 && shown[0].items[0].k === note
      ? shown[0]
      : null;
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
        {/* Menu se ek page khola hai to sirf wahi dikh raha hai — poori book
            par wapas jaane ka ek daba yahin. */}
        {oneBook && (
          <button type="button" className="pn-b pn-b--back" onClick={() => setNote("")}>
            ← Poora {bookLabel(oneBook)}
          </button>
        )}
        {groups.length > 1 && (
          <span className="pn-books">
            <button type="button" className={`pn-b${book ? "" : " is-on"}`} onClick={() => { setBook(""); setNote(""); }}>Sab</button>
            {groups.map((g) => (
              <button
                key={g.book}
                type="button"
                className={`pn-b${book === g.book ? " is-on" : ""}`}
                onClick={() => { setBook(g.book); setNote(""); }}
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
