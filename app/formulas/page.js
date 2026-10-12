"use client";

// 📐 Formula Revision — Brahmastra (Aditya Ranjan) ke chapter, har chapter ke
// zaroori formula, trick (💡) aur chhote example (🎯) one-liner shakl mein,
// taaki poora chapter fatafat dohra sako. Data lib/formulas/.

import { useEffect, useState } from "react";
import Markdown from "@/components/Markdown";
import { FORMULA_CHAPTERS } from "@/lib/formulas";
import "./formulas.css";

const KEY = "cgl.formulas.ch";

export default function FormulasPage() {
  const [id, setId] = useState(FORMULA_CHAPTERS[0].id);
  useEffect(() => {
    try { const v = localStorage.getItem(KEY); if (v && FORMULA_CHAPTERS.some((c) => c.id === v)) setId(v); } catch { /* ignore */ }
  }, []);
  const pick = (v) => { setId(v); try { localStorage.setItem(KEY, v); } catch { /* ignore */ } };
  const ch = FORMULA_CHAPTERS.find((c) => c.id === id) || FORMULA_CHAPTERS[0];
  const total = ch.sections.reduce((n, s) => n + s.items.length, 0);

  return (
    <section className="section fx">
      <header className="fx-head">
        <div>
          <span className="ca-eyebrow">📐 Brahmastra · Formula Revision</span>
          <h1>{ch.title}</h1>
          <p>{ch.pages} · {ch.sections.length} topic · {total} line</p>
        </div>
        {FORMULA_CHAPTERS.length > 1 && (
          <select className="fx-pick" value={ch.id} onChange={(e) => pick(e.target.value)} aria-label="Chapter">
            {FORMULA_CHAPTERS.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        )}
      </header>

      <div className="fx-grid">
        {ch.sections.map((s) => (
          <article key={s.t} className="fx-card">
            <h2>{s.t}</h2>
            <ol>
              {s.items.map((it, i) => (
                <li key={i} className={it.startsWith("💡") ? "is-trick" : it.startsWith("🎯") ? "is-ex" : ""}>
                  <Markdown inline>{it}</Markdown>
                </li>
              ))}
            </ol>
          </article>
        ))}
      </div>
    </section>
  );
}
