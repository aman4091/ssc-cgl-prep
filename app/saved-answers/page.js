"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSavedAnswers, removeSavedAnswer, SUBJECTS, subjectLabel } from "@/lib/savedanswers";
import Markdown from "@/components/Markdown";

export default function SavedAnswersPage() {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState("");
  const [openId, setOpenId] = useState("");

  const refresh = () => setItems(getSavedAnswers());
  useEffect(() => { refresh(); }, []);

  const del = (id) => { if (confirm("Delete this saved answer?")) { removeSavedAnswer(id); refresh(); } };

  const counts = {};
  for (const s of SUBJECTS) counts[s.k] = 0;
  items.forEach((a) => { counts[a.subject] = (counts[a.subject] || 0) + 1; });

  const shown = filter ? items.filter((a) => a.subject === filter) : items;

  return (
    <>
      <section className="hero" style={{ paddingBottom: 8 }}>
        <span className="hero__eyebrow">💾 Saved Answers</span>
        <h1 className="hero__title" style={{ fontSize: "clamp(1.7rem, 4vw, 2.6rem)" }}>
          Saved <span className="grad">Answers</span>
        </h1>
        <p className="hero__sub">
          Your Ask questions & answers, filed subject-wise. Open the 🤖 Ask box, get an answer,
          and hit “💾 Save to notebook” to keep it here.
        </p>
      </section>

      {/* Subject filters */}
      <section className="section" style={{ marginTop: 8 }}>
        <div className="subj-row">
          <button className={`subj-chip ${filter === "" ? "is-active" : ""}`} onClick={() => setFilter("")}>
            All ({items.length})
          </button>
          {SUBJECTS.map((s) => (
            <button
              key={s.k}
              className={`subj-chip ${filter === s.k ? "is-active" : ""}`}
              onClick={() => setFilter(s.k)}
            >
              {s.label} ({counts[s.k] || 0})
            </button>
          ))}
        </div>
      </section>

      <section className="section">
        {shown.length === 0 ? (
          <div className="placeholder">
            Nothing saved yet. Ask a question with the 🤖 button and tap “💾 Save to notebook”.
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {shown.map((a) => {
              const isOpen = openId === a.id;
              const title = a.question || (a.imageText ? a.imageText.slice(0, 120) : "Saved answer");
              return (
                <article key={a.id} className="glass-card">
                  <div className="row between" style={{ alignItems: "flex-start", gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span className="type-tag">{subjectLabel(a.subject)}</span>
                      <h3 style={{ fontSize: "1rem", marginTop: 8 }}>{title}</h3>
                      <p className="muted mt-8" style={{ fontSize: "0.76rem" }}>
                        {a.savedAt ? new Date(a.savedAt).toLocaleString() : ""}
                      </p>
                    </div>
                    <button className="btn btn--ghost btn--sm" onClick={() => del(a.id)}>🗑️</button>
                  </div>

                  {a.imageText && (
                    <p className="muted mt-8" style={{ fontSize: "0.78rem", maxHeight: 56, overflow: "auto" }}>
                      <strong>From image:</strong> {a.imageText.slice(0, 240)}
                    </p>
                  )}

                  <button
                    className="btn btn--ghost btn--sm mt-12"
                    onClick={() => setOpenId(isOpen ? "" : a.id)}
                  >
                    {isOpen ? "▲ Hide answer" : "▼ Show answer"}
                  </button>

                  {isOpen && (
                    <div className="answer-box mt-12">
                      <Markdown>{a.answer}</Markdown>
                    </div>
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
