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
        {it.tag ? <span className="mns-tag">{plain(it.tag)}</span> : null}
      </div>
      <h3 className="mns-head"><Markdown inline>{String(it.head || "").replace(/^\s*\*\*([^*]*)$/, "$1")}</Markdown></h3>
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

export default function MnemonicScroll({ items, storeKey, startId = "", onAt }) {
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

  // REEL: ek waqt mein ek card poori unchai par; scroll / swipe = agla
  // (scroll-snap). Dabba page ki bachi hui unchai jitna — upar se naap kar.
  const box = useRef(null);
  useEffect(() => { setBase(start); setCount(STEP); setCur(start); if (box.current) box.current.scrollTop = 0; }, [start, KEY]);
  const [h, setH] = useState(0);
  useEffect(() => {
    const fit = () => {
      const el = box.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top + window.scrollY;
      setH(Math.max(320, window.innerHeight - Math.max(0, top - window.scrollY) - 12));
    };
    fit();
    window.addEventListener("resize", fit);
    const t = setTimeout(fit, 300);
    return () => { window.removeEventListener("resize", fit); clearTimeout(t); };
  }, [n]);   // data baad mein aaye (Notesliner) to tab naapo

  const save = useCallback((i) => {
    setCur(i);
    if (onAt) onAt(i);   // saamne kaunsa card (GKTricks Medieval: uska DeepSeek fact)
    try { localStorage.setItem(KEY, JSON.stringify({ i, id: items[i] && items[i].id, at: Date.now() })); } catch { /* quota */ }
  }, [KEY, items, onAt]);
  // Kaunsi reel saamne — wahi "yahan tak padha".
  const onScroll = () => {
    const el = box.current;
    if (!el || !el.clientHeight) return;
    const k = Math.round(el.scrollTop / el.clientHeight);
    const i = (base + k) % n;
    if (i !== cur) save(i);
    if (k >= count - 4) setCount((c) => c + STEP);
  };
  // Mouse ka pahiya: ek ghumaav = ek reel (thoda scroll karke wapas na
  // aaye). Card ke andar lamba text ho to pehle wahi scroll hota hai.
  useEffect(() => {
    const el = box.current;
    if (!el) return undefined;
    let lock = 0;
    const wheel = (e) => {
      if (Math.abs(e.deltaY) < 4) return;
      const inner = e.target.closest && e.target.closest(".mns-card");
      if (inner && inner.scrollHeight > inner.clientHeight + 2) {
        const atTop = inner.scrollTop <= 0, atEnd = inner.scrollTop + inner.clientHeight >= inner.scrollHeight - 2;
        if ((e.deltaY > 0 && !atEnd) || (e.deltaY < 0 && !atTop)) return;
      }
      e.preventDefault();
      const now = Date.now();
      if (now < lock) return;
      lock = now + 550;
      const k = Math.round(el.scrollTop / el.clientHeight) + (e.deltaY > 0 ? 1 : -1);
      el.scrollTo({ top: Math.max(0, k) * el.clientHeight, behavior: "smooth" });
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, [h, n]);

  // ↑ ↓ / PageUp PageDown se bhi.
  useEffect(() => {
    const key = (e) => {
      if (e.target && /input|textarea|select/i.test(e.target.tagName)) return;
      const el = box.current;
      if (!el) return;
      if (e.key === "ArrowDown" || e.key === "PageDown" || e.key === " ") { e.preventDefault(); el.scrollBy({ top: el.clientHeight, behavior: "smooth" }); }
      else if (e.key === "ArrowUp" || e.key === "PageUp") { e.preventDefault(); el.scrollBy({ top: -el.clientHeight, behavior: "smooth" }); }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);

  if (!n) return <div className="placeholder">Abhi kuch nahi.</div>;

  const seq = [];
  for (let k = 0; k < count; k++) seq.push(k);
  return (
    <div className="mns-reel" style={h ? { height: h } : undefined}>
      <div className="mns-bar">
        <span>📍 <b>{cur + 1}</b> / {n}</span>
        <span className="mns-bar__hint">Scroll / swipe = agla · jahan chhodoge wahi se · {n} ke baad phir 1</span>
        {cur !== 0 ? (
          <button type="button" onClick={() => { save(0); setBase(0); setCount(STEP); if (box.current) box.current.scrollTop = 0; }}>↺ 1 se</button>
        ) : null}
      </div>
      <div className="mns" ref={box} onScroll={onScroll}>
        {seq.map((k) => {
          const i = (base + k) % n;
          const wrap = k > 0 && i === 0;
          return (
            <section key={k} className="mns-slide" data-mi={i}>
              {wrap && <div className="mns-wrap">🔁 Saare {n} ho gaye — phir 1 se</div>}
              <Card it={items[i]} no={i + 1} total={n} />
            </section>
          );
        })}
      </div>
    </div>
  );
}
