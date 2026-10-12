"use client";

// 🔠 Pehla akshar — SCROLL wala (Fact log ka roop 4, Notesliner).
//
// Har card: upar sar, phir har point ka pehla akshar (mnemonic), neeche
// points dhake hue — akshar / point dabao to khule. Agla-pichhla nahi:
// card ek ke neeche ek, bas scroll karte jao.
//
//  • Jahan tak padha (sabse upar dikh raha card) yaad — cgl.mnscroll.<key>.
//    Agli baar wahi se shuru.
//  • Khatam nahi hota: aakhri ke baad phir 1 se (🔁 patti ke saath).
//
// items: [{ id, head, tag?, color?, pts: [{ t, h? }] }]   (h = sar wali line,
// uska akshar nahi banta)

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Markdown from "./Markdown";
import "./mnscroll.css";

const STEP = 12;

const plain = (s) => String(s || "")
  .replace(/\*\*|__|`|\$/g, "")
  .replace(/^\s*(?:#+|[-*•]|\d+[.)])\s*/, "")
  .trim();
export const firstLetter = (s) => {
  const w = plain(s).match(/[A-Za-zऀ-ॿ0-9]/);
  return w ? w[0].toUpperCase() : "•";
};

function Card({ it, no, total }) {
  const [open, setOpen] = useState({});
  const pts = it.pts.filter((p) => p && p.t);
  const flip = (k) => setOpen((o) => ({ ...o, [k]: !o[k] }));
  const all = pts.every((p, k) => p.h || open[k]);
  return (
    <article className="mns-card" style={it.color ? { "--c": it.color } : undefined}>
      <div className="mns-top">
        <span className="mns-no">{no} / {total}</span>
        {it.tag ? <span className="mns-tag">{it.tag}</span> : null}
      </div>
      <h3 className="mns-head">{it.head}</h3>
      <div className="mns-code">
        {pts.map((p, k) => (p.h ? null : (
          <span key={k} className={open[k] ? "is-open" : ""} onClick={() => flip(k)}>{firstLetter(p.t)}</span>
        )))}
      </div>
      <ul className="mns-list">
        {pts.map((p, k) => (p.h ? (
          <li key={k} className="mns-sub">{plain(p.t)}</li>
        ) : (
          <li key={k} className={open[k] ? "is-open" : ""} onClick={() => flip(k)}>
            <b>{firstLetter(p.t)}</b>
            <span>{open[k] ? <Markdown inline>{p.t.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "")}</Markdown> : "…"}</span>
          </li>
        )))}
      </ul>
      <button type="button" className="mns-all" onClick={() => setOpen(all ? {} : Object.fromEntries(pts.map((_, k) => [k, true])))}>
        {all ? "🙈 Sab dhako" : "👁️ Sab kholo"}
      </button>
    </article>
  );
}

export default function MnemonicScroll({ items, storeKey, startId = "" }) {
  const KEY = `cgl.mnscroll.${storeKey}`;
  const n = items.length;
  // Kahan se shuru: bahar se diya hua card, warna jahan tak pichhli baar padha.
  const start = useMemo(() => {
    if (!n) return 0;
    if (startId) { const i = items.findIndex((x) => x.id === startId); if (i >= 0) return i; }
    try {
      const v = JSON.parse(localStorage.getItem(KEY) || "null");
      if (v && v.id) { const i = items.findIndex((x) => x.id === v.id); if (i >= 0) return i; }
      if (v && Number.isFinite(v.i)) return Math.min(Math.max(0, v.i), n - 1);
    } catch { /* ignore */ }
    return 0;
  }, [KEY, n, startId]); // eslint-disable-line react-hooks/exhaustive-deps

  const [base, setBase] = useState(start);
  const [count, setCount] = useState(STEP);
  const [cur, setCur] = useState(start);
  useEffect(() => { setBase(start); setCount(STEP); setCur(start); window.scrollTo({ top: 0 }); }, [start, KEY]);

  // Sabse upar dikh raha card = "yahan tak padha" — yaad rakho.
  const box = useRef(null);
  const save = useCallback((i) => {
    setCur(i);
    try { localStorage.setItem(KEY, JSON.stringify({ i, id: items[i] && items[i].id, at: Date.now() })); } catch { /* quota */ }
  }, [KEY, items]);
  useEffect(() => {
    let raf = 0;
    const on = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = box.current;
        if (!el) return;
        const cards = el.querySelectorAll("[data-mi]");
        const topLine = 120;
        let pick = null;
        for (const c of cards) {
          const r = c.getBoundingClientRect();
          if (r.bottom > topLine) { pick = c; break; }
        }
        if (pick) {
          const i = Number(pick.getAttribute("data-mi"));
          if (i !== cur) save(i);
        }
        // Neeche pahunchne se pehle aur card.
        const last = cards[cards.length - 1];
        if (last && last.getBoundingClientRect().top < window.innerHeight * 2.5) setCount((c) => c + STEP);
      });
    };
    on();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("scroll", on); window.removeEventListener("resize", on); };
  }, [cur, save, count]);

  if (!n) return <div className="placeholder">Abhi kuch nahi.</div>;

  const seq = [];
  for (let k = 0; k < count; k++) seq.push(k);
  return (
    <div className="mns" ref={box}>
      <div className="mns-bar">
        <span>📍 <b>{cur + 1}</b> / {n}</span>
        <span className="mns-bar__hint">Jahan tak padhoge, agli baar wahi se · {n} ke baad phir 1</span>
        {cur !== 0 ? (
          <button type="button" onClick={() => { save(0); setBase(0); setCount(STEP); window.scrollTo({ top: 0 }); }}>↺ 1 se</button>
        ) : null}
      </div>
      {seq.map((k) => {
        const i = (base + k) % n;
        const it = items[i];
        const wrap = k > 0 && i === 0;
        return (
          <div key={k} data-mi={i}>
            {wrap && <div className="mns-wrap">🔁 Saare {n} ho gaye — phir 1 se</div>}
            <Card it={it} no={i + 1} total={n} />
          </div>
        );
      })}
    </div>
  );
}
