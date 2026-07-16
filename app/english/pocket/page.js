"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { loadPocket } from "@/lib/pocketbank";
import PocketRulePopup from "@/components/PocketRulePopup";
import Markdown from "@/components/Markdown";

export default function PocketPage() {
  const [book, setBook] = useState(null);
  const [open, setOpen] = useState(null); // the rule being read
  const [q, setQ] = useState("");

  useEffect(() => {
    let alive = true;
    loadPocket().then((b) => { if (alive) setBook(b); });
    return () => { alive = false; };
  }, []);

  const rules = book?.rules || [];
  const needle = q.trim().toLowerCase();
  // Search the whole rule, not just its first line — the thing you remember is
  // usually a word from the middle of it ("collective", "apostrophe").
  const shown = needle
    ? rules.filter((r) =>
        [r.title, ...r.explanation, ...r.examples].join(" ").toLowerCase().includes(needle))
    : rules;

  return (
    <>
      <section className="hero" style={{ paddingBottom: 8 }}>
        <div className="row between">
          <span className="hero__eyebrow">📕 Pocket Rocket</span>
          <Link href="/study/english" className="btn btn--ghost btn--sm">← English</Link>
        </div>
        <h1 className="hero__title" style={{ fontSize: "clamp(1.7rem, 4vw, 2.6rem)" }}>
          Pocket <span className="grad">Rocket{book ? ` · ${book.total} rules` : ""}</span>
        </h1>
        <p className="hero__sub">
          English Formula Book ke saare grammar rules — Hinglish mein, jaise book mein chhape hain.
          Kisi bhi rule pe click karo: explanation, examples, aur AI se aur gehrai mein samajhne ke buttons.
        </p>
        <input
          className="input mt-16"
          placeholder="🔍 Rule dhoondo — 'apostrophe', 'collective', 'either'…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </section>

      <section className="section">
        {!book ? (
          <div className="placeholder">Loading the book… 📚</div>
        ) : rules.length === 0 ? (
          <div className="placeholder">Book load nahi hui. 😕</div>
        ) : shown.length === 0 ? (
          <div className="placeholder">"{q}" pe koi rule nahi mila. 🤔</div>
        ) : (
          <>
            {needle && <p className="muted mb-8" style={{ fontSize: "0.85rem" }}>{shown.length} rules</p>}
            <div style={{ display: "grid", gap: 10 }}>
              {shown.map((r) => (
                <button key={r.n} className="glass-card pocket-rule" onClick={() => setOpen(r)}>
                  <span className="rule-card__n">Rule {r.n}</span>
                  <span className="pocket-rule__text"><Markdown inline>{r.title}</Markdown></span>
                </button>
              ))}
            </div>
          </>
        )}
      </section>

      {book && (
        <section className="section">
          <p className="hint">📚 {book.source} · {book.note}</p>
        </section>
      )}

      {open && <PocketRulePopup rule={open} onClose={() => setOpen(null)} />}
    </>
  );
}
