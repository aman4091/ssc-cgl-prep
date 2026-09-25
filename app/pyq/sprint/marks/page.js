"use client";

// ★ Sprint ke bookmark — ek hi jagah.
//
// Har bookmark apni copy ke saath bachta hai (sawaal, options, sahi jawab,
// book ka solution, aur DeepSeek ka jawab alag store se). Isliye ye list us
// bank ka chapter kabhi na khule tab bhi poori dikhti hai.

import Link from "next/link";
import { useEffect, useState } from "react";
import "../sprint.css";
import Markdown from "@/components/Markdown";
import { getMarks, removeMark, clearMarks, getAns } from "@/lib/sprint";

const LETTER = ["A", "B", "C", "D", "E"];

function MarkRow({ m, onDel }) {
  const [open, setOpen] = useState(false);
  // Jawab usi shakl se dhoondha jata hai jo sprint ne save ki thi.
  const ds = getAns({ question: m.question, options: m.options, answer: m.answer, qText: m.question, optText: m.options });
  const opts = Array.isArray(m.options) ? m.options : [];
  const imgs = Array.isArray(m.optImgs) ? m.optImgs : null;

  return (
    <div className="card" style={{ padding: 14, marginTop: 10 }}>
      <div className="sp-meta">
        {[m.src, m.chapter].filter(Boolean).join(" · ") || "Sprint"}
        {" · "}
        {new Date(m.at).toLocaleDateString("en-IN")}
      </div>

      {m.qImg ? <img src={m.qImg} alt="question" className="sp-img" /> : <Markdown>{m.question}</Markdown>}

      <div className="sp-opts">
        {(imgs || opts).map((_, i) => (
          <div key={i} className={`sp-opt${i === m.answer ? " is-right" : ""}`}>
            <span className="sp-opt__k">{LETTER[i] || i + 1}</span>
            <span style={{ flex: 1, minWidth: 0 }}>
              {imgs ? <img src={imgs[i]} alt={LETTER[i]} /> : <Markdown inline>{opts[i] || ""}</Markdown>}
            </span>
          </div>
        ))}
      </div>

      <div className="row mt-8" style={{ gap: 8, flexWrap: "wrap" }}>
        <button type="button" className="sp-ibtn" onClick={() => setOpen((v) => !v)}>
          {open ? "⌃ band karo" : "⌄ jawab dekho"}
        </button>
        <button type="button" className="sp-ibtn" onClick={onDel} title="Bookmark hatao">★ hatao</button>
      </div>

      {open ? (
        <div className="sp-ans mt-8">
          {ds ? <Markdown>{ds}</Markdown> : <div className="sp-wait">DeepSeek ka jawab is question ke liye save nahi hai.</div>}
          {m.solImg ? <img src={m.solImg} alt="solution" className="sp-img" /> : null}
          {m.explanation ? <><h4 className="mt-8">📖 Asli</h4><Markdown>{m.explanation}</Markdown></> : null}
        </div>
      ) : null}
    </div>
  );
}

export default function SprintMarksPage() {
  const [list, setList] = useState(null);
  useEffect(() => { setList(getMarks()); }, []);

  return (
    <>
      <section className="hero" style={{ paddingBottom: 8 }}>
        <div className="row between">
          <span className="hero__eyebrow">★ Sprint bookmarks</span>
          <Link href="/pyq/sprint" className="btn btn--ghost btn--sm">← Sprint</Link>
        </div>
        <h1 className="hero__title" style={{ fontSize: "clamp(1.5rem, 4vw, 2.2rem)" }}>
          Jo <span className="grad">nishaan</span> lagaye
        </h1>
        <p className="hero__sub">
          Sprint ke dauraan ★ dabaye hue question — sawaal, sahi jawab aur DeepSeek ka jawab, sab saath.
        </p>
      </section>

      <section className="section">
        {list === null ? (
          <div className="placeholder">Loading… ★</div>
        ) : list.length === 0 ? (
          <div className="placeholder">Abhi koi bookmark nahi. Sprint mein ★ (ya M) dabao. 🔖</div>
        ) : (
          <>
            <div className="row between">
              <span className="hint">{list.length} bookmark</span>
              <button
                type="button"
                className="linklike"
                onClick={() => {
                  if (!window.confirm(`Saare ${list.length} bookmark hata dein?`)) return;
                  clearMarks();
                  setList([]);
                }}
              >
                sab hatao
              </button>
            </div>
            {list.map((m) => (
              <MarkRow
                key={m.h}
                m={m}
                onDel={() => { removeMark(m.h); setList(getMarks()); }}
              />
            ))}
          </>
        )}
      </section>
    </>
  );
}
