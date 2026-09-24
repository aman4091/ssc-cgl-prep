"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { loadWarSubject, warSubjectMeta } from "@/lib/warbank";
import PyqQuestionCard from "@/components/PyqQuestionCard";
import PyqDrill from "@/components/PyqDrill";


// 🌑 Ek page Gemini ke parde jaisa — owner ne screenshot dikha kar kaha tha
// "rang, font, theme — bilkul aisa". Skin ki poori CSS app/exam.css ke
// .gemskin mein hai; class <body> par lagti hai taaki upar ki patti aur
// kinare ki patti bhi saath kaali ho jayein (screenshot mein wo bhi kaali
// hain). Page chhodte hi class hat jaati hai — baaki site jaisi thi waisi.
const GEM_SUBJECTS = new Set(["mediaeval-history"]);

export default function WarSubjectPage() {
  const { subject } = useParams();

  useEffect(() => {
    if (!GEM_SUBJECTS.has(String(subject))) return undefined;
    document.body.classList.add("gemskin");
    return () => document.body.classList.remove("gemskin");
  }, [subject]);
  const [meta, setMeta] = useState(null);
  const [qs, setQs] = useState([]);
  const [ready, setReady] = useState(false);
  const [chapter, setChapter] = useState(""); // "" = all

  useEffect(() => {
    let alive = true;
    setMeta(null); setQs([]); setReady(false); setChapter("");
    (async () => {
      const [m, list] = await Promise.all([warSubjectMeta(subject), loadWarSubject(subject)]);
      if (!alive) return;
      setMeta(m); setQs(list); setReady(true);
    })();
    return () => { alive = false; };
  }, [subject]);

  // useMemo zaroori hai: bina iske har render par nayi array banti hai, aur
  // Nayi list milte hi drill shuru se chalti hai.
  const filtered = useMemo(
    () => (chapter === "" ? qs : qs.filter((q) => q.chapter === chapter)),
    [qs, chapter]
  );

  if (ready && !meta) {
    return (
      <section className="hero">
        <h1 className="hero__title">Not found</h1>
        <p className="hero__sub">WAR mein aisa koi subject nahi hai.</p>
        <Link href="/pyq/war" className="btn btn--ghost btn--sm mt-16">← WAR</Link>
      </section>
    );
  }

  // Ek-ek sawaal (components/PyqDrill.js): answer khula, neeche "Aata hai / Nahi aata hai".
  const resumeKey = `war:${subject}`;

  return (
    <>
      <section className="hero" style={{ paddingBottom: 8 }}>
        <div className="row between">
          <span className="hero__eyebrow">🎯 WAR · {meta?.label || "…"}</span>
          <Link href="/pyq/war" className="btn btn--ghost btn--sm">← Subjects</Link>
        </div>
        <h1 className="hero__title" style={{ fontSize: "clamp(1.6rem, 4vw, 2.4rem)" }}>
          {meta?.icon} {meta?.label}{" "}
          <span className="grad">· {filtered.length} PYQs</span>
        </h1>
        {filtered.length > 0 && (
          <div className="row mt-16">

          </div>
        )}
      </section>

      {/* Chapter filter — the book's own chapters, from its page footers */}
      {meta && meta.chapters.length > 1 && (
        <section className="section" style={{ marginTop: 4 }}>
          {/* A dropdown, not a wall of chips: current-affairs alone has ten
              chapters and the row wrapped to three lines above the questions. */}
          <select
            className="input"
            style={{ maxWidth: 420 }}
            value={chapter}
            onChange={(e) => setChapter(e.target.value)}
          >
            <option value="">All chapters ({meta.count})</option>
            {meta.chapters.map((c) => (
              <option key={c.name} value={c.name}>
                {c.name} ({c.count})
              </option>
            ))}
          </select>
        </section>
      )}

      <section className="section">
        {!ready ? (
          <div className="placeholder">Loading questions… 📚</div>
        ) : filtered.length === 0 ? (
          <div className="placeholder">Is chapter mein koi question nahi. 🤔</div>
        ) : (
          <PyqDrill
            title={`WAR · ${meta?.label || ""}`}
            list={filtered}
            subject="gs"
            resumeKey={resumeKey}
            renderCard={(q, i, all) => (
              // Read-only: these live in a static file, so no edit/delete
              // (both write localStorage). Answering still archives to the
              // Mistake Notebook, and "save to a chapter" still works.
              <PyqQuestionCard
                resumeKey={resumeKey}
                key={q.id}
                q={q}
                index={i}
                subject="gs"
                chapterName={`WAR · ${meta.label}`}
                archiveOnAnswer
                fileToChapter
              />
            )}
          />
        )}
      </section>
    </>
  );
}
