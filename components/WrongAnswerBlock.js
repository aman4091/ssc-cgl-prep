"use client";

import Markdown from "./Markdown";

// Ek Wrong-Question record ka answer / options / details / solution / note.
//
// /wrong ke card aur /wrong/solve dono yahi render karte hain. Ek hi jagah
// isliye ki solve view mein copy-paste karte to dono dhire-dhire alag ho jate
// aur ek jagah answer dikhta, dusri jagah nahi.
//
// Farak sirf itna: card par `answer` hamesha dikhta hai (wo yaad dilane ke liye
// hai), solve view par sab kuch chhupa rehta hai jab tak tu likh na le —
// isliye `hideAnswer`.
export default function WrongAnswerBlock({ rec, shown, hideAnswer = false }) {
  const q = rec.q || {};
  const opts = (q.options || []).filter(Boolean);
  const showAnswer = rec.answer && (!hideAnswer || shown);

  return (
    <>
      {q.question && <p style={{ fontWeight: 600, whiteSpace: "pre-wrap" }}>{q.question}</p>}

      {opts.length > 0 && (
        <div className="mt-8" style={{ display: "grid", gap: 6 }}>
          {opts.map((o, i) => {
            const right = shown && i === q.answer;
            return (
              <div
                key={i}
                style={{
                  padding: "8px 12px", borderRadius: 8, fontSize: "0.92rem",
                  border: `1px solid ${right ? "var(--success)" : "var(--glass-border)"}`,
                  background: right ? "rgba(34,197,94,0.10)" : "transparent",
                }}
              >
                <strong style={{ opacity: 0.6, marginRight: 8 }}>{String.fromCharCode(65 + i)}</strong>
                {o}
                {right && <span style={{ color: "var(--success)", marginLeft: 8 }}>✓</span>}
              </div>
            );
          })}
        </div>
      )}

      {showAnswer && (
        <p
          className="mt-8"
          style={{
            fontSize: "0.95rem", fontWeight: 700, color: "var(--success)",
            display: "flex", gap: 6, alignItems: "baseline", whiteSpace: "pre-wrap",
          }}
        >
          <span>✅ Answer:</span>
          <span style={{ color: "var(--text)" }}>{rec.answer}</span>
        </p>
      )}

      {shown && rec.detail && (
        <div
          className="mt-8"
          style={{ fontSize: "0.9rem", borderTop: "1px solid var(--glass-border)", paddingTop: 10 }}
        >
          <p className="muted" style={{ fontSize: "0.78rem", marginBottom: 4 }}>✨ Gemini · details</p>
          <Markdown>{rec.detail}</Markdown>
        </div>
      )}

      {shown && (q.solution || rec.note) && (
        <p className="muted mt-8" style={{ fontSize: "0.86rem", whiteSpace: "pre-wrap" }}>
          {q.solution && <>💡 {q.solution}</>}
          {q.solution && rec.note && <br />}
          {rec.note && <>📝 {rec.note}</>}
        </p>
      )}

      {rec.ocrText && (
        <details className="mt-8">
          <summary className="muted" style={{ fontSize: "0.78rem", cursor: "pointer" }}>
            📄 Image se pada hua text
          </summary>
          <p className="muted" style={{ fontSize: "0.82rem", whiteSpace: "pre-wrap", marginTop: 6 }}>
            {rec.ocrText}
          </p>
        </details>
      )}
    </>
  );
}
