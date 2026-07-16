"use client";

import { useState } from "react";
import Markdown from "./Markdown";

// Pick the correct option for a question whose stored answer was wrong.
// onFix(optionIndex) is called with the chosen correct option.
export default function FixAnswer({ q, onFix }) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  if (!q || !Array.isArray(q.options)) return null;

  if (done) return <span style={{ fontSize: "0.8rem", color: "var(--success)", fontWeight: 600 }}>✓ Answer corrected</span>;
  if (!open) return <button className="btn btn--ghost btn--sm" onClick={() => setOpen(true)}>✏️ Fix answer</button>;

  const pick = (oi) => { onFix(oi); setOpen(false); setDone(true); };
  return (
    <div className="glass" style={{ padding: 10, borderRadius: 10, marginTop: 6 }}>
      <p className="muted" style={{ fontSize: "0.78rem", marginBottom: 8 }}>Sahi answer kaunsa hai? Chuno — notebook aur source dono theek ho jaayenge.</p>
      <div className="grid" style={{ gap: 6 }}>
        {q.options.map((opt, oi) => (
          <button key={oi} className="btn btn--ghost btn--sm"
            style={{ textAlign: "left", ...(oi === q.answer ? { borderColor: "rgba(107,211,154,0.5)" } : {}) }}
            onClick={() => pick(oi)}>
            <strong style={{ opacity: 0.7, marginRight: 6 }}>{String.fromCharCode(65 + oi)}</strong>
            <Markdown inline>{opt}</Markdown>
            {oi === q.answer && <span className="muted" style={{ marginLeft: 6, fontSize: "0.72rem" }}>(current)</span>}
          </button>
        ))}
      </div>
      <button className="btn btn--ghost btn--sm mt-8" onClick={() => setOpen(false)}>Cancel</button>
    </div>
  );
}
