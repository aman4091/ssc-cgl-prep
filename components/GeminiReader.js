"use client";

import { useCallback, useEffect, useRef } from "react";
import Markdown from "@/components/Markdown";
import PyqQuestionCard from "@/components/PyqQuestionCard";
import MathQuestionCard from "@/components/MathQuestionCard";
import ReasonQuestionCard from "@/components/ReasonQuestionCard";

// 📖 Ek-ek karke padho — Gemini ke jawaabon ka popup.
//
// /gemini par sab jawab ek lambi list mein neeche-neeche pade hain. Padhne ke
// liye wo theek nahi: ek jawab 400 line ka hota hai, to doosre tak pahunchne
// mein hi scroll karte-karte mann ud jata hai, aur "kitne bache" ka koi pata
// nahi chalta.
//
// Yahan ek waqt mein ek — sawaal upar, uska jawab neeche, aur ← → se agla.
// Chhaanti wahi jo page par lagi hai (subject/khoj), isliye "sirf Maths ke
// Gemini answers padhne hain" apne aap ban jata hai.
//
// Padhne ki chaudai bandhi hui hai (.gemr__body ka max-width): 1900px ki screen
// par ek line mein 250 akshar aate hain aur aankh line ke ant se agli line ke
// shuru tak wapas hi nahi pahunch paati.

const kindCard = (r) => {
  if (r.kind === "math") return <MathQuestionCard q={r.q} index={0} subject="math" chapterName={r.category} />;
  if (r.kind === "reason") return <ReasonQuestionCard q={r.q} index={0} subject="reasoning" chapterName={r.category} />;
  return <PyqQuestionCard q={r.q} index={0} subject={r.subject} chapterName={r.category} />;
};

export default function GeminiReader({ items, at, onMove, onClose, labelOf }) {
  const bodyRef = useRef(null);
  const rec = items[at];

  const move = useCallback((d) => {
    const n = at + d;
    if (n >= 0 && n < items.length) onMove(n);
  }, [at, items.length, onMove]);

  // ← → se agla-pichhla, Esc se band. Keyboard isliye ki padhte waqt haath
  // mouse par nahi hota.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "ArrowRight") { e.preventDefault(); move(+1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); move(-1); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [move, onClose]);

  // Popup khula ho to peeche ka page na sarke — warna band karte hi kahin aur
  // pahunch jate ho.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Agla sawaal hamesha upar se — pichhle jawab ke ant par khulta to lagta hai
  // ki kuch aaya hi nahi.
  useEffect(() => { if (bodyRef.current) bodyRef.current.scrollTop = 0; }, [at]);

  if (!rec) return null;

  return (
    <div className="gemr" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="gemr__box">
        <div className="gemr__top">
          <b>✨ {at + 1} / {items.length}</b>
          <span className="gemr__where">
            {labelOf?.(rec)}
            {rec.category ? ` · ${rec.category}` : ""}
          </span>
          <button className="ansp__btn" onClick={onClose}>✕ Band</button>
        </div>

        <div className="gemr__body" ref={bodyRef}>
          {kindCard(rec)}
          <div className="ansp__answer">
            <b>✨ Gemini ka answer</b>
            <Markdown>{rec.answer}</Markdown>
          </div>
        </div>

        <div className="gemr__nav">
          <button className="ansp__btn" onClick={() => move(-1)} disabled={at === 0}>← Pichhla</button>
          <span className="gemr__dots">{at + 1} / {items.length}</span>
          <button className="ansp__btn" onClick={() => move(+1)} disabled={at === items.length - 1}>Agla →</button>
        </div>
      </div>
    </div>
  );
}
