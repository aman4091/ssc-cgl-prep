"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Markdown from "./Markdown";
import { markSeen, toggleBookmark, isBookmarked, enroll } from "@/lib/srs";
import GeminiFlashButton from "./GeminiFlashButton";
import FlashAnswer from "./FlashAnswer";

// Flashcard runner for the Revision deck. Ek card ek baar mein — question/word
// dikho, dimaag mein recall karo, "Dikha" dabao (reveal), phir "Aage". Har weak
// card ke aage jaate hi markSeen (exposure count++). Coverage cards sirf dikhte
// hain (unka served-cycle deck bante waqt hi aage badh gaya).
//
// deck: [{ uid, kind, ref, weak, srsKey, subject }]

function fmtType(t) {
  return t === "idiom" ? "Idiom/Phrase" : t === "vocab" ? "Vocabulary" : "One Word";
}

function CardFace({ card, revealed }) {
  const { kind, ref } = card;

  if (kind === "vocab") {
    const d = ref?.details || {};
    return (
      <div className="flash-face">
        <span className="flash-kind">🔤 {fmtType(ref?.type)}</span>
        <h2 className="flash-word">{ref?.word}</h2>
        {revealed && (
          <div className="flash-reveal">
            <p className="flash-meaning">{ref?.def || d.meaning || "—"}</p>
            {d.trick && <p className="muted">💡 {d.trick}</p>}
          </div>
        )}
      </div>
    );
  }

  if (kind === "wb") {
    const imgs = Array.isArray(ref?.images) ? ref.images : [];
    return (
      <div className="flash-face">
        <span className="flash-kind">📕 Wrong Book</span>
        {imgs.map((im) => im.url && (
          <img key={im.url} src={im.url} alt="question" className="math-img" />
        ))}
        {ref?.note && <p className="muted" style={{ marginTop: 6 }}>{ref.note}</p>}
        {/* Wrong-Book image Qs ka answer neeche FlashAnswer (paste/saved) sambhalta.
            Yahan sirf chhota built-in answer, agar record mein tha. */}
        {revealed && ref?.answer && (
          <div className="flash-reveal"><strong style={{ color: "var(--success)" }}>Ans:</strong> {ref.answer}</div>
        )}
      </div>
    );
  }

  // q or ca (MCQ)
  const q = ref || {};
  const opts = q.options || [];
  const img = q.qImg || q.img;
  const solution = q.solution || q.explanation || q.detail || "";
  return (
    <div className="flash-face">
      <span className="flash-kind">{card.subject === "gs" ? "🌍 GS" : "📘 English"}</span>
      {q.passage && <div className="passage-box" style={{ marginBottom: 10 }}><Markdown>{q.passage}</Markdown></div>}
      {img ? <img src={img} alt="question" className="math-img" /> : <h2 className="flash-q"><Markdown inline>{q.question || ""}</Markdown></h2>}
      <div className="flash-opts">
        {opts.map((o, i) => (
          <div key={i} className={`flash-opt${revealed && i === q.answer ? " is-correct" : ""}`}>
            <strong>{String.fromCharCode(65 + i)}</strong>
            <span><Markdown inline>{String(o)}</Markdown></span>
            {revealed && i === q.answer && <span className="flash-tick">✓</span>}
          </div>
        ))}
      </div>
      {revealed && solution && (
        <div className="flash-reveal"><strong style={{ color: "var(--text-2)" }}>Solution: </strong><Markdown inline>{solution}</Markdown></div>
      )}
    </div>
  );
}

export default function RevisionDeck({ deck, onDone, title = "Aaj ka Revision" }) {
  const [i, setI] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [bk, setBk] = useState(false);
  const [ansVer, setAnsVer] = useState(0); // bump to re-render CardFace after a paste
  const seenRef = useRef(new Set()); // uids already counted (idempotent markSeen per view)

  const card = deck[i];
  const total = deck.length;

  useEffect(() => {
    setRevealed(false);
    setBk(card?.weak && card.srsKey ? isBookmarked(card.srsKey) : false);
  }, [i]); // eslint-disable-line

  const next = () => {
    // bank the exposure for weak cards, once per card instance
    if (card?.weak && card.srsKey && !seenRef.current.has(card.uid)) {
      seenRef.current.add(card.uid);
      markSeen(card.srsKey);
    }
    if (i + 1 >= total) { onDone && onDone(); return; }
    setI(i + 1);
  };

  const toggleBk = () => {
    if (!card) return;
    if (card.weak && card.srsKey) { setBk(toggleBookmark(card.srsKey)); }
    else { enroll({ kind: card.kind, ref: card.ref, src: "mark", category: card.subject }); setBk(true); }
  };

  if (!total || !card) {
    return <div className="placeholder">Deck khali — aaj ke liye kuch due nahi. 🎉</div>;
  }

  const pct = Math.round((i / total) * 100);

  return (
    <div className="flash-deck">
      <div className="row between mb-8">
        <span className="muted">{title}</span>
        <span className="muted">{i + 1} / {total}</span>
      </div>
      <div className="progress" style={{ marginBottom: 12 }}><div className="progress__bar" style={{ width: `${pct}%` }} /></div>

      <article className="glass-card flash-card">
        <div className="row between" style={{ marginBottom: 8 }}>
          <span className="badge">{card.weak ? "🔁 Revision" : "🆕 Naya (coverage)"}</span>
          <span className="row" style={{ gap: 6 }}>
            <GeminiFlashButton card={card} />
            <button className="btn btn--ghost btn--sm" onClick={toggleBk} title="Baad mein dekhne ke liye save" style={bk ? { color: "var(--warning)" } : {}}>🔖</button>
          </span>
        </div>
        <CardFace key={ansVer} card={card} revealed={revealed} />
        <FlashAnswer card={card} onSaved={() => setAnsVer((v) => v + 1)} />
      </article>

      <div className="row mt-16" style={{ gap: 10, justifyContent: "center" }}>
        {!revealed ? (
          <button className="btn btn--ghost btn--block" onClick={() => setRevealed(true)}>👁️ Dikha (recall karke)</button>
        ) : (
          <button className="btn btn--primary btn--block" onClick={next}>✅ Aage →</button>
        )}
      </div>
    </div>
  );
}
