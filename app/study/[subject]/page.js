"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  getChapters, addChapter, deleteChapter, chapterRuleCount, getChapterQuestions,
  subjectMeta, suggestedFor, SUBJECTS,
} from "@/lib/grammar";
import { gkTopicsForSubject, findGkTopic } from "@/lib/gkbank";
import { loadWarIndex } from "@/lib/warbank";
import { loadEngIndex } from "@/lib/engbank";
import { loadPocket } from "@/lib/pocketbank";

// Ready-made books that ship with the app. They are not chapters — each is
// browsed as a book on its own route — but this is where someone looks for a
// subject's material, so a subject's books sit at the top of its grid. `load`
// returns null when the book is missing, and that card simply doesn't render.
const BOOKS = {
  gs: [
    {
      key: "war", icon: "🎯", name: "WAR", href: "/pyq/war",
      load: async () => { const b = await loadWarIndex(); return b.subjects.length ? { ...b, parts: b.subjects.length, unit: "subjects" } : null; },
      blurb: (b) => `${b.total} real SSC PYQs — har question ke saath uska exam.`,
    },
  ],
  english: [
    {
      key: "pocket", icon: "📕", name: "Pocket Rocket", href: "/english/pocket",
      load: async () => { const b = await loadPocket(); return b.rules.length ? { ...b, parts: b.total, unit: "rules" } : null; },
      blurb: () => "Poora English grammar — rules, explanation aur examples, Hinglish mein.",
    },
    {
      key: "pinnacle", icon: "📚", name: "Pinnacle English", href: "/pyq/pinnacle",
      load: async () => { const b = await loadEngIndex(); return b.chapters.length ? { ...b, parts: b.chapters.length, unit: "chapters" } : null; },
      blurb: (b) => `${b.total} SSC English questions — solutions ke saath.`,
    },
  ],
};

export default function SubjectChaptersPage() {
  const { subject } = useParams();
  const meta = subjectMeta(subject);
  const [chapters, setChapters] = useState([]);
  const [name, setName] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [gkTopics, setGkTopics] = useState([]);
  const [books, setBooks] = useState([]); // ready-made books for this subject

  const refresh = () => setChapters(getChapters(subject));
  useEffect(() => { refresh(); }, [subject]);
  useEffect(() => {
    let alive = true;
    gkTopicsForSubject(subject).then((t) => { if (alive) setGkTopics(t); });
    return () => { alive = false; };
  }, [subject]);
  useEffect(() => {
    let alive = true;
    setBooks([]);
    const defs = BOOKS[subject];
    if (!defs) return undefined;
    Promise.all(defs.map(async (d) => ({ ...d, data: await d.load() })))
      .then((rs) => { if (alive) setBooks(rs.filter((r) => r.data)); });
    return () => { alive = false; };
  }, [subject]);

  const add = (nm) => {
    const c = addChapter(subject, nm);
    if (c) { setName(""); refresh(); }
  };
  const onSubmit = (e) => { e.preventDefault(); add(name); };

  const remove = async (id, nm) => {
    if (!confirm(`Delete chapter "${nm}" and all its rules/PDFs?`)) return;
    await deleteChapter(id);
    refresh();
  };

  const existing = new Set(chapters.map((c) => c.name.toLowerCase()));
  const allSuggested = suggestedFor(subject);
  const suggestions = allSuggested.filter((s) => !existing.has(s.toLowerCase()));
  const isPyq = subject.startsWith("pyq-");
  const backHref = isPyq ? "/pyq" : subject === "english" ? "/english" : "/subjects";
  const knownSubject = !!SUBJECTS[subject] || isPyq;

  return (
    <>
      <section className="hero" style={{ paddingBottom: 8 }}>
        <div className="row between">
          <span className="hero__eyebrow">{meta.icon} {meta.short} · Chapters</span>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn btn--primary btn--sm" onClick={() => setShowAdd((v) => !v)}>{showAdd ? "✕ Close" : "➕ New chapter"}</button>
            <Link href={backHref} className="btn btn--ghost btn--sm">← Back</Link>
          </div>
        </div>
        <h1 className="hero__title" style={{ fontSize: "clamp(1.7rem, 4vw, 2.6rem)" }}>
          {meta.label} <span className="grad">Chapters</span>
        </h1>
        <p className="hero__sub">
          Create a chapter per topic — then add rules from a PDF / image / text, read the detail, and take a quiz.
        </p>
      </section>

      {/* Add chapter — hidden until the button is pressed */}
      {showAdd && (
      <section className="section" style={{ marginTop: 12 }}>
        <div className="glass-card">
          <h3>➕ New chapter</h3>
          <form className="row mt-16" style={{ gap: 10 }} onSubmit={onSubmit}>
            <input
              className="input"
              placeholder={allSuggested.length ? `e.g. ${allSuggested[0]}` : "Chapter name"}
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ flex: 1 }}
            />
            <button className="btn btn--primary" type="submit" disabled={!name.trim()}>Add</button>
          </form>

          {suggestions.length > 0 && (
            <div className="mt-16">
              <p className="muted" style={{ fontSize: "0.82rem", marginBottom: 8 }}>Or pick from suggested chapters:</p>
              <div className="chips">
                {suggestions.map((s) => (
                  <button key={s} className="chip chip--btn chip--lg" onClick={() => add(s)}>+ {s}</button>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
      )}

      {/* Chapters grid */}
      <section className="section">
        <div className="section__head">
          <h2>Your Chapters</h2>
          <p>{chapters.length ? `${chapters.length} chapters` : "No chapters yet — create one above."}</p>
        </div>
        {chapters.length === 0 && books.length === 0 ? (
          <div className="placeholder">No chapters yet. Add a topic to get started. 🚀</div>
        ) : (
          <div className="grid grid--3">
            {books.map((b) => (
              <article key={b.key} className="glass-card">
                <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
                  <span className="badge badge--ok">📖 Ready-made book</span>
                  <span className="badge">{b.data.parts} {b.data.unit}</span>
                </div>
                <h3 style={{ marginTop: 14 }}>{b.icon} {b.name}</h3>
                <p className="muted mt-8" style={{ fontSize: "0.8rem" }}>{b.blurb(b.data)}</p>
                <Link href={b.href} className="btn btn--primary btn--block mt-16">
                  Open the book →
                </Link>
              </article>
            ))}
            {chapters.map((c) => {
              const qCount = getChapterQuestions(c.id).length;
              const gk = findGkTopic(gkTopics, subject, c.name);
              return (
              <article key={c.id} className="glass-card">
                <div className="row between" style={{ alignItems: "flex-start" }}>
                  <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
                    <span className="badge badge--ok">{chapterRuleCount(c.id)} rules</span>
                    {qCount > 0 && <span className="badge">{qCount} Q</span>}
                    {gk && <span className="badge">🧠 {gk.count} GK Tricks</span>}
                  </div>
                  <button className="btn btn--ghost btn--sm" onClick={() => remove(c.id, c.name)} title="Delete">✕</button>
                </div>
                <h3 style={{ marginTop: 14 }}>{c.name}</h3>
                {c.videos?.length > 0 && (
                  <p className="muted mt-8" style={{ fontSize: "0.8rem" }}>▶ {c.videos.length} video{c.videos.length > 1 ? "s" : ""}</p>
                )}
                <Link href={`/study/${subject}/${c.id}`} className="btn btn--primary btn--block mt-16">
                  Open
                </Link>
                <Link href={`/study/${subject}/${c.id}?view=questions`} className="btn btn--ghost btn--block mt-8">
                  📝 Questions{qCount > 0 ? ` (${qCount})` : ""}
                </Link>
                {gk && (
                  <Link href={`/study/${subject}/${c.id}?view=gk`} className="btn btn--ghost btn--block mt-8">
                    🧠 GK Tricks ({gk.count})
                  </Link>
                )}
              </article>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}
