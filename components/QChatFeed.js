"use client";

// 💬 Questions, DeepSeek chat ki shakl mein — ek window (upar se neeche tak,
// page ke beech), andar saare questions ek ke neeche ek. Bas scroll karte
// jao. Jawab har question ka pehle chhupa (option chuno ya 👁️ dabao).
//
// Hazaaron question ek saath banana bhaari hai — pehle 30, neeche pahunchne
// se pehle hi agle 30.

import { useEffect, useLayoutEffect, useRef, useState } from "react";

const STEP = 30;

export default function QChatFeed({ title, list, renderCard }) {
  const [n, setN] = useState(STEP);
  const [left, setLeft] = useState(null);
  const anchor = useRef(null);
  const body = useRef(null);

  // Window page ke beech — jitni jagah sidebar aur chat ke beech hai, uske beech.
  useLayoutEffect(() => {
    const place = () => {
      const a = anchor.current;
      if (!a || window.innerWidth < 1100) { setLeft(null); return; }
      const r = a.getBoundingClientRect();
      setLeft(Math.max(0, r.left + r.width / 2 - 220));
    };
    place();
    window.addEventListener("resize", place);
    const mo = new MutationObserver(place);
    mo.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    return () => { window.removeEventListener("resize", place); mo.disconnect(); };
  }, []);

  // Neeche pahunchne se pehle hi agle 30 — scroll par naap kar.
  const more = () => {
    const b = body.current;
    if (b && b.scrollTop + b.clientHeight > b.scrollHeight - 1500) setN((x) => Math.min(list.length, x + STEP));
  };
  useEffect(() => { more(); }, [n]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <div ref={anchor} className="qfeed-anchor" />
      <div className="qfeed" style={left != null ? { left } : undefined}>
        <div className="qfeed__head">
          <b>💬 {title}</b>
          <span className="qfeed__n">{list.length} questions</span>
        </div>
        <div className="qfeed__body" ref={body} onScroll={more}>
          {list.slice(0, n).map((q, i) => renderCard(q, i))}
          <div className="qfeed__end">{n < list.length ? "…" : "— bas, saare ho gaye —"}</div>
        </div>
      </div>
    </>
  );
}
