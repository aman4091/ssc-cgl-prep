"use client";

// 🎬 PYQ bank = reels. Ek screen par ek question (bank ka apna card —
// ✨ Gemini / 🐋 DeepSeek / tasveer sab wahi), upar swipe (ya ↓ / mouse
// scroll) = agla. "Aata hai / Nahi aata" wala kram hata diya (owner).
//
// Props wahi jo PyqDrill leta tha, taaki bank ke page sirf import badlein.
// ⏱ Ghadi (40 sec) saamne wale question par chalti hai; 0 par answer khud
// khul jaata hai (card ko `forceAnswer`). Jahan tak pahunche, wahi yaad —
// agli baar wahin se.

import { cloneElement, useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./pyqreels.css";

const qKeyOf = (q) => String(q?.id ?? q?.uid ?? q?.question ?? q?.qText ?? "");
const POS_KEY = (k) => `cgl.pyqreel.pos.${k}`;

function shuffled(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

export default function PyqReels({
  title, list, resumeKey, renderCard, shuffleFirst = false, unit = "Q", keyOf, timer = 40,
}) {
  const key = resumeKey || title || "pyq";
  const keyFor = keyOf || qKeyOf;
  const items = useMemo(() => (shuffleFirst ? shuffled(list) : list), [list, shuffleFirst]);
  const box = useRef(null);
  const [at, setAt] = useState(0);

  // Pichhli baar jahan chhoda tha, wahin.
  useEffect(() => {
    let n = 0;
    try { n = Number(localStorage.getItem(POS_KEY(key))) || 0; } catch { /* ignore */ }
    n = Math.min(Math.max(0, n), Math.max(0, items.length - 1));
    setAt(n);
    requestAnimationFrame(() => { const el = box.current; if (el) el.scrollTop = n * el.clientHeight; });
  }, [key, items.length]);

  const onScroll = useCallback(() => {
    const el = box.current;
    if (!el) return;
    const i = Math.round(el.scrollTop / el.clientHeight);
    if (i !== at) {
      setAt(i);
      try { localStorage.setItem(POS_KEY(key), String(i)); } catch { /* ignore */ }
    }
  }, [at, key]);

  const go = useCallback((d) => {
    const el = box.current;
    if (el) el.scrollTo({ top: Math.max(0, at + d) * el.clientHeight, behavior: "smooth" });
  }, [at]);
  useEffect(() => {
    const k = (e) => {
      if (e.target && /input|textarea|select/i.test(e.target.tagName)) return;
      if (e.key === "ArrowDown" || e.key === "PageDown") { e.preventDefault(); go(1); }
      else if (e.key === "ArrowUp" || e.key === "PageUp") { e.preventDefault(); go(-1); }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [go]);

  // ⏱ Saamne wale question ki ghadi — question badla to phir se poori.
  const [left, setLeft] = useState(timer);
  useEffect(() => { setLeft(timer); }, [at, timer, key]);
  useEffect(() => {
    if (!timer || left <= 0) return undefined;
    const t = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [left, timer]);
  const timeUp = !!timer && left <= 0;

  if (!items.length) return <div className="placeholder">Is chapter mein koi question nahi. 🤔</div>;

  return (
    <div className="pyqr">
      <div className="pyqr-bar">
        <span className="carev-count">{unit} {Math.min(at + 1, items.length)}/{items.length}</span>
        {!!timer && (
          <span className={"pyqd-clock" + (timeUp ? " is-over" : left <= 10 ? " is-warn" : "")}>
            {timeUp ? `⏰ ${timer} sec khatam` : `0:${String(left).padStart(2, "0")}`}
          </span>
        )}
      </div>
      <div className="pyqr-box" ref={box} onScroll={onScroll}>
        {items.map((q, i) => (
          <section key={`${keyFor(q)}:${i}`} className="pyqr-reel">
            <div className="pyqr-card">
              {/* Sirf aas-paas ke card bante hain — 400 question ki list mein
                  sab ek saath banana bhaari hai. */}
              {Math.abs(i - at) <= 2
                ? cloneElement(renderCard(q, i, items), { forceAnswer: i === at && timeUp })
                : null}
            </div>
            {i < items.length - 1 && (
              <button type="button" className="pyqr-next" onClick={() => go(1)} aria-label="Agla">⌄</button>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
