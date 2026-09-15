"use client";

// Recall (Pass 2) — trigger dikhao, socho, tap karke answer, khud ko rate karo.
// Ek angoothe se, khade-khade: saare button neeche, bade, aur answer aane par
// kuch bhi apni jagah se nahi hilta (answer ki jagah pehle se khali rakhi hai).
// Desktop par: Space = answer, 1 = Nahi aata, 2 = Aata hai, S = star.

import { useCallback, useEffect, useRef, useState } from "react";
import { rate, toggleStar, getStars } from "@/lib/carevision/progress";

const AGAIN_AFTER = 5;   // galat card itne card baad isi session mein phir

export default function Recall({ queue: initial, today, onExit }) {
  const [queue, setQueue] = useState(initial);
  const [pos, setPos] = useState(0);
  const [shown, setShown] = useState(false);
  const [stars, setStars] = useState(() => getStars());
  const [tally, setTally] = useState({ good: 0, bad: 0 });
  const again = useRef(new Set());       // jo card pehle se dobara lagaya ja chuka

  const card = queue[pos];
  const done = pos >= queue.length;

  const answer = useCallback((good) => {
    if (!card || !shown) return;
    const retry = again.current.has(card.id) && card.__retry;
    if (!retry) {
      rate(card.id, good, today);
      setTally((t) => (good ? { ...t, good: t.good + 1 } : { ...t, bad: t.bad + 1 }));
    }
    if (!good && !again.current.has(card.id)) {
      again.current.add(card.id);
      setQueue((q) => {
        const next = [...q];
        next.splice(Math.min(pos + 1 + AGAIN_AFTER, next.length), 0, { ...card, __retry: true });
        return next;
      });
    }
    setShown(false);
    setPos((p) => p + 1);
  }, [card, shown, today, pos]);

  const star = useCallback(() => {
    if (!card) return;
    const on = toggleStar(card.id);
    setStars((s) => ({ ...s, [card.id]: on ? 1 : 0 }));
  }, [card]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.target && /input|textarea|select/i.test(e.target.tagName)) return;
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        if (!shown) setShown(true);
      } else if (e.key === "1") answer(false);
      else if (e.key === "2") answer(true);
      else if (e.key === "s" || e.key === "S") star();
      else if (e.key === "Escape") onExit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shown, answer, star, onExit]);

  if (done) {
    const total = tally.good + tally.bad;
    return (
      <div className="carev-recall">
        <div className="carev-done">
          <div className="carev-done-big">Ho gaya ✓</div>
          <p>{total} card · <b>{tally.good}</b> aata hai · <b>{tally.bad}</b> nahi aata</p>
          <p className="carev-dim">Jo nahi aaye wo kal phir aayenge.</p>
          <button className="carev-btn carev-btn-primary" onClick={onExit}>Wapas</button>
        </div>
      </div>
    );
  }

  const starred = !!stars[card.id];
  return (
    <div className="carev-recall">
      <div className="carev-bar">
        <button className="carev-link" onClick={onExit} aria-label="Wapas">← Wapas</button>
        <span className="carev-count">{pos + 1} / {queue.length}</span>
        <button
          className={`carev-star${starred ? " on" : ""}`}
          onClick={star}
          aria-pressed={starred}
          aria-label={starred ? "Star hatao" : "Star karo"}
        >{starred ? "★" : "☆"}</button>
      </div>
      <div className="carev-progress" aria-hidden="true">
        <div style={{ width: `${(pos / queue.length) * 100}%` }} />
      </div>

      <div className="carev-card" onClick={() => !shown && setShown(true)}>
        <div className="carev-meta">
          <span>Part {card.part}</span> · <span>{card.section}</span>
          {card.__retry ? <span className="carev-again"> · phir se</span> : null}
        </div>
        <div className="carev-trigger">{card.trigger}</div>
        <div className={`carev-answer${shown ? " shown" : ""}`} aria-live="polite">
          {shown ? (
            <>
              <div className="carev-answer-text">{card.answer}</div>
              {card.extra ? <div className="carev-extra">{card.extra}</div> : null}
              <div className="carev-src">PDF p.{card.pdfPage}</div>
            </>
          ) : (
            <div className="carev-hint">Socho… phir tap karo</div>
          )}
        </div>
      </div>

      <div className="carev-actions">
        {shown ? (
          <>
            <button className="carev-btn carev-btn-bad" onClick={() => answer(false)}>
              Nahi aata <kbd>1</kbd>
            </button>
            <button className="carev-btn carev-btn-good" onClick={() => answer(true)}>
              Aata hai <kbd>2</kbd>
            </button>
          </>
        ) : (
          <button className="carev-btn carev-btn-primary carev-wide" onClick={() => setShown(true)}>
            Answer dikhao <kbd>Space</kbd>
          </button>
        )}
      </div>
    </div>
  );
}
