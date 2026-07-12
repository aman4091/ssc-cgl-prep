"use client";

import { useState } from "react";

// Inline editor for a single MCQ — fix the question text, edit options, and TICK
// the correct answer. Used on chapter/PYQ cards and the Current Affairs page.
export default function QuestionEditor({ question, onSave, onCancel }) {
  const [text, setText] = useState(question.question || "");
  const [opts, setOpts] = useState([...(question.options || [])]);
  const [ans, setAns] = useState(Number.isInteger(question.answer) ? question.answer : 0);
  const [sol, setSol] = useState(question.solution || question.explanation || "");
  const [err, setErr] = useState("");

  const setOpt = (i, v) => setOpts((o) => o.map((x, idx) => (idx === i ? v : x)));
  const addOpt = () => setOpts((o) => [...o, ""]);
  const delOpt = (i) => {
    setOpts((o) => o.filter((_, idx) => idx !== i));
    setAns((a) => (i < a ? a - 1 : Math.min(a, opts.length - 2))); // keep the tick valid
  };

  const save = () => {
    const cleaned = opts.map((o) => o.trim());
    if (!text.trim()) { setErr("Question text khaali nahi ho sakta."); return; }
    if (cleaned.filter(Boolean).length < 2) { setErr("Kam se kam 2 options chahiye."); return; }
    if (ans < 0 || ans >= cleaned.length || !cleaned[ans]) { setErr("Ek valid correct answer tick karo."); return; }
    onSave({ ...question, question: text.trim(), options: cleaned, answer: ans, solution: sol.trim() });
  };

  return (
    <div className="mt-8" style={{ display: "grid", gap: 12 }}>
      <div>
        <label className="vd-label">Question</label>
        <textarea className="textarea" rows={3} value={text} onChange={(e) => setText(e.target.value)} />
      </div>

      <div>
        <label className="vd-label">Options — sahi wale ko tick karo ✓</label>
        <div style={{ display: "grid", gap: 8, marginTop: 6 }}>
          {opts.map((o, i) => (
            <div key={i} className="row" style={{ gap: 8, alignItems: "center" }}>
              <input type="radio" name="correct-opt" checked={ans === i} onChange={() => setAns(i)} title="Mark correct" style={{ flexShrink: 0 }} />
              <strong style={{ opacity: 0.6, flexShrink: 0 }}>{String.fromCharCode(65 + i)}</strong>
              <input className="input" style={{ flex: 1 }} value={o} onChange={(e) => setOpt(i, e.target.value)} />
              {opts.length > 2 && <button className="btn btn--ghost btn--sm" onClick={() => delOpt(i)} title="Remove option">✕</button>}
            </div>
          ))}
        </div>
        <button className="btn btn--ghost btn--sm mt-8" onClick={addOpt}>➕ Add option</button>
      </div>

      <div>
        <label className="vd-label">Solution / explanation (optional)</label>
        <textarea className="textarea" rows={2} value={sol} onChange={(e) => setSol(e.target.value)} />
      </div>

      {err && <p style={{ color: "var(--danger)", fontSize: "0.85rem" }}>{err}</p>}

      <div className="row" style={{ gap: 8 }}>
        <button className="btn btn--primary btn--sm" onClick={save}>💾 Save</button>
        <button className="btn btn--ghost btn--sm" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}
