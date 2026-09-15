"use client";

// Read (Pass 1) — section-wise, PDF ke kram mein, trigger aur answer saath.
// Ek tap = "Pata hai" (coverage), ek tap = star (kamzor). Upar chipki patti:
// "Part D — 34/58". Bas padhne ka pass hai — koi scheduling nahi.

import { useMemo, useState } from "react";
import { getKnown, getStars, toggleKnown, toggleStar } from "@/lib/carevision/progress";

export default function ReadMode({ cards, parts, partTitles, onExit }) {
  const [part, setPart] = useState(parts[0]);
  const [known, setKnown] = useState(() => getKnown());
  const [stars, setStars] = useState(() => getStars());
  const [hideKnown, setHideKnown] = useState(false);

  const inPart = useMemo(
    () => cards.filter((c) => c.part === part).sort((a, b) => a.pdfPage - b.pdfPage),
    [cards, part],
  );
  const sections = useMemo(() => {
    const m = new Map();
    for (const c of inPart) {
      if (!m.has(c.section)) m.set(c.section, []);
      m.get(c.section).push(c);
    }
    return [...m.entries()];
  }, [inPart]);
  const doneN = inPart.filter((c) => known[c.id]).length;

  const flipKnown = (id) => { const on = toggleKnown(id); setKnown((k) => ({ ...k, [id]: on ? 1 : 0 })); };
  const flipStar = (id) => { const on = toggleStar(id); setStars((s) => ({ ...s, [id]: on ? 1 : 0 })); };

  return (
    <div className="carev carev-read">
      <div className="carev-sticky">
        <div className="carev-bar">
          <button className="carev-link" onClick={onExit}>← Wapas</button>
          <span className="carev-count">Part {part} — {doneN}/{inPart.length} done</span>
        </div>
        <div className="carev-progress" aria-hidden="true">
          <div style={{ width: `${inPart.length ? (doneN / inPart.length) * 100 : 0}%` }} />
        </div>
        <div className="carev-chips carev-chips-tight" role="group" aria-label="Part">
          {parts.map((p) => (
            <button key={p} className={`carev-chip${p === part ? " on" : ""}`} onClick={() => { setPart(p); window.scrollTo(0, 0); }}>{p}</button>
          ))}
        </div>
      </div>

      <h1 className="carev-title carev-h2">{partTitles[part] || `Part ${part}`}</h1>
      <label className="carev-check">
        <input type="checkbox" checked={hideKnown} onChange={(e) => setHideKnown(e.target.checked)} />
        Jo pata hai unhe chhupao
      </label>

      {sections.map(([sec, list]) => {
        const shown = hideKnown ? list.filter((c) => !known[c.id]) : list;
        if (!shown.length) return null;
        return (
          <section key={sec} className="carev-read-sec">
            <h2 className="carev-read-h">{sec} <span className="carev-dim">· {list.filter((c) => known[c.id]).length}/{list.length}</span></h2>
            {shown.map((c) => (
              <div key={c.id} className={`carev-read-card${known[c.id] ? " known" : ""}`}>
                <div className="carev-read-t">{c.trigger}</div>
                <div className="carev-read-a">{c.answer}</div>
                {c.extra ? <div className="carev-extra">{c.extra}</div> : null}
                <div className="carev-read-foot">
                  <span className="carev-dim carev-small">p.{c.pdfPage}</span>
                  <button
                    className={`carev-mini${known[c.id] ? " on" : ""}`}
                    aria-pressed={!!known[c.id]}
                    onClick={() => flipKnown(c.id)}
                  >{known[c.id] ? "✓ Pata hai" : "Pata hai"}</button>
                  <button
                    className={`carev-star carev-star-sm${stars[c.id] ? " on" : ""}`}
                    aria-pressed={!!stars[c.id]}
                    aria-label={stars[c.id] ? "Star hatao" : "Star karo"}
                    onClick={() => flipStar(c.id)}
                  >{stars[c.id] ? "★" : "☆"}</button>
                </div>
              </div>
            ))}
          </section>
        );
      })}
    </div>
  );
}
