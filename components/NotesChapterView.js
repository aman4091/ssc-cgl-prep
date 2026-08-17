"use client";

// One notes TOPIC (chapter) as a single scrollable column of the user's own
// Hindi/Hinglish notes. Each page of the topic:
//   • has Hinglish saved  → render it (Markdown) with a ✏️ Edit affordance;
//   • has none            → a big paste box + ✨ Gemini button (copies the page's
//     English text + subject prompt, opens Gemini), 💾 Save writes it.
// Reuses the SAME per-page Hinglish store as the notes reader (setHinglish), so
// anything added here shows in the reader and vice-versa, and syncs/persists via
// IndexedDB. No English blocks are rendered — this view is the Hindi notes only.

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { loadNotes } from "@/lib/notesbank";
import { hinglishKey, getHinglish, setHinglish, subscribeHinglish } from "@/lib/noteshinglish";
import { pageText, promptFor, copyText } from "@/lib/notesrender";
import { startChapterQuiz } from "@/lib/notesquiz";
import Markdown from "@/components/Markdown";

function PageBlock({ book, page }) {
  const k = hinglishKey(book, page);
  const saved = getHinglish(k);
  const [edit, setEdit] = useState(!saved);      // no Hinglish yet → straight to paste box
  const [text, setText] = useState(saved);
  const [copied, setCopied] = useState(false);

  // If the durable copy hydrates in after mount, adopt it while not editing.
  useEffect(() => { if (!edit) setText(getHinglish(k)); }, [saved, edit, k]);

  const askGemini = async () => {
    const body = pageText(page);
    let copy;
    if (body) {
      // Page has transcribed text → send it with the subject's usual prompt.
      const pre = promptFor(book.subject);
      copy = pre ? `${pre}\n\n${body}` : body;
    } else {
      // Image-only / text-less page: there is NO source text to hand over, so a
      // bare "Topic — page N" is useless. Instead ask Gemini to TEACH the topic
      // in detail, so the user can paste the explanation straight back as notes.
      copy =
        `"${page.topic}" (${book.title}) — is topic ko Hinglish mein detail se samjhao.\n` +
        `• Concept clear karo — ye hota kya hai aur kyun important hai.\n` +
        `• Saare zaroori rules/points, types aur exceptions cover karo.\n` +
        `• Har point ke saath 1–2 easy example do.\n` +
        `Aise likho ki seedha study notes ban jaayein — headings + bullet points mein, short aur clear.`;
    }
    await copyText(copy);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    try { window.open("https://gemini.google.com/app", "_blank", "noopener,noreferrer"); } catch { /* ignore */ }
  };

  const save = () => {
    const t = String(text || "").trim();
    if (!t) return; // blank never overwrites — same rule as setHinglish
    setHinglish(k, t);
    setText(t);
    setEdit(false);
  };

  return (
    <div className="nt-card">
      <div className="nt-hd">
        <b>{page.topic}</b>
        <span className="nt-hd__right">
          {!edit && (
            <button className="btn btn--ghost btn--sm" onClick={() => setEdit(true)} title="Hinglish badlo">✏️ Edit</button>
          )}
          <span className="nt-meta">page {page.book_page}</span>
        </span>
      </div>

      {edit ? (
        <div className="nx-edit">
          <p className="nt-meta" style={{ marginBottom: 8 }}>
            Is page ke Hindi/Hinglish notes yahan paste karo. Gemini se banwana ho to ✨ dabao.
          </p>
          <textarea
            className="input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Hinglish yahan paste karo…"
            style={{ minHeight: 160 }}
          />
          <div className="row mt-8" style={{ gap: 8, justifyContent: "flex-end" }}>
            <button className="btn btn--ghost btn--sm" onClick={askGemini} title="Is page ka text + prompt copy karke Gemini kholo">
              {copied ? "✓ Copied" : "✨ Gemini"}
            </button>
            {saved && (
              <button className="btn btn--ghost btn--sm" onClick={() => { setText(saved); setEdit(false); }}>Cancel</button>
            )}
            <button className="btn btn--primary btn--sm" onClick={save}>💾 Save</button>
          </div>
        </div>
      ) : (
        <div className="nx-hi-text"><Markdown>{text}</Markdown></div>
      )}
    </div>
  );
}

export default function NotesChapterView({ slug, topic }) {
  const router = useRouter();
  const [book, setBook] = useState(null);
  const [, setTick] = useState(0);
  const [quizBusy, setQuizBusy] = useState(false);
  const [quizErr, setQuizErr] = useState("");

  useEffect(() => {
    let alive = true;
    loadNotes(slug).then((b) => { if (alive) setBook(b); }).catch(() => {});
    return () => { alive = false; };
  }, [slug]);

  // Re-render when the Hinglish store changes (a save here, or IndexedDB hydrate).
  useEffect(() => subscribeHinglish(() => setTick((n) => n + 1)), []);

  const pages = useMemo(() => {
    if (!book) return [];
    return (book.pages || [])
      .filter((p) => !p.is_cover && p.kind !== "practice")
      .filter((p) => p.topic === topic);
  }, [book, topic]);

  // A 50-Q quiz from the WHOLE chapter — concatenate every page's transcribed
  // text (capped so the request stays sane) and hand it to the shared engine.
  const makeQuiz = async () => {
    if (quizBusy || !book) return;
    // One text per page → the engine spreads the 50 across EVERY page (not just
    // the first). Image-only pages have no text and drop out.
    const texts = pages.map(pageText).map((t) => String(t || "").trim()).filter((t) => t.length >= 30);
    if (!texts.length) { setQuizErr("Is chapter mein quiz banane layak text nahi."); setTimeout(() => setQuizErr(""), 2500); return; }
    setQuizBusy(true); setQuizErr("");
    try {
      const pk = `${book.scanBase || ""}#chapter:${topic}`;
      const { quizId } = await startChapterQuiz({ texts, pk, title: `${book.title} · ${topic} quiz` });
      router.push(`/quizzes/${quizId}`);
    } catch (e) {
      setQuizErr(e.message === "nahi bana" ? "Quiz nahi bana — dobara try karo." : (e.message || "Error"));
      setQuizBusy(false);
      setTimeout(() => setQuizErr(""), 2500);
    }
  };

  if (!book) return <section className="section"><div className="placeholder">…</div></section>;
  if (!pages.length) return <section className="section"><div className="placeholder">Is chapter mein koi page nahi mila. 😕</div></section>;

  return (
    <section className="section">
      <div className="home-head row between" style={{ marginBottom: 12, alignItems: "flex-start" }}>
        <div>
          <h1>{topic}</h1>
          <p className="muted">{book.title} · {pages.length} pages</p>
        </div>
        <span className="row" style={{ gap: 6, alignItems: "center" }}>
          {quizErr && <span className="nt-meta" style={{ color: "var(--accent)" }}>{quizErr}</span>}
          <button className="btn btn--primary btn--sm" onClick={makeQuiz} disabled={quizBusy} title="Poore chapter se 50-question quiz banao">
            {quizBusy ? "…" : "📝 Chapter Quiz"}
          </button>
        </span>
      </div>
      <div className="notesdoc__main reader">
        {pages.map((p) => (
          <PageBlock key={p.book_page} book={book} page={p} />
        ))}
      </div>
    </section>
  );
}
