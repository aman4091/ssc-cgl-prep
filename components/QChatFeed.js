"use client";

// 💬 Questions, DeepSeek chat ki shakl mein — ek window (upar se neeche tak,
// page ke beech), andar saare questions ek ke neeche ek. Bas scroll karte
// jao. Jawab har question ka pehle chhupa (option chuno ya 👁️ dabao).
//
// Jo option laga diya wo yaad (cgl.qfeed.<key>) — 🧹 Clear tak wahi dikhta
// hai. ⏭ "Jahan chhoda" = sabse aage wale lage hue question ke baad wala.
//
// Hazaaron question ek saath banana bhaari hai — pehle 30, neeche pahunchne
// se pehle hi agle 30.

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

const STEP = 30;
const W = 440;

const idOf = (q, i) => String(q && q.id != null ? q.id : i);
function readPicks(k) {
  try { const v = JSON.parse(localStorage.getItem(k) || "{}"); return v && typeof v === "object" ? v : {}; } catch { return {}; }
}

export default function QChatFeed({ title, list, renderCard, storeKey = "default", jumpIndex = -1, belowAnchor = false, onNeedMore, noJump = false }) {
  const KEY = `cgl.qfeed.${storeKey}`;
  const [n, setN] = useState(STEP);
  const [pos, setPos] = useState({ left: null, top: 0, bottom: 0 });
  const [picks, setPicks] = useState(() => (typeof window === "undefined" ? {} : readPicks(KEY)));
  const [goTo, setGoTo] = useState(-1);
  const anchor = useRef(null);
  const body = useRef(null);

  useEffect(() => { setPicks(readPicks(KEY)); }, [KEY]);
  const savePick = useCallback((id, oi) => {
    const all = readPicks(KEY);
    if (oi == null) delete all[id]; else all[id] = oi;
    try { localStorage.setItem(KEY, JSON.stringify(all)); } catch { /* quota */ }
    setPicks(all);
  }, [KEY]);
  // 🙈 jo chhupaye — reload ke baad bhi chhupe rahein.
  const HKEY = `${KEY}.hid`;
  const [hid, setHid] = useState(() => (typeof window === "undefined" ? {} : readPicks(HKEY)));
  const saveHid = useCallback((id, on) => {
    const all = readPicks(HKEY);
    if (on) all[id] = 1; else delete all[id];
    try { localStorage.setItem(HKEY, JSON.stringify(all)); } catch { /* quota */ }
    setHid(all);
  }, [HKEY]);

  // Kahan baithe: desktop par sidebar aur chat ke beech; tablet / split
  // window mein beech mein par upar ki patti (☰) ke neeche; phone par poori
  // chaudai, wo bhi patti ke neeche — taaki menu hamesha mile.
  useLayoutEffect(() => {
    const place = () => {
      const a = anchor.current;
      if (!a) return;
      const vw = window.innerWidth;
      // Upar menu wali patti ke neeche, neeche wali line (footer) ke upar —
      // dono ke beech.
      let top = 0;
      const nb = document.querySelector(".topbar");
      const tr = nb ? nb.getBoundingClientRect() : null;
      if (tr && tr.height && tr.bottom > 0) top = Math.round(tr.bottom + 6);
      // Page ke apne button (Answers ke filter) upar dikhte rahein — window unke neeche se.
      if (belowAnchor) { const ar = a.getBoundingClientRect(); if (ar.top > top) top = Math.round(ar.top); }
      let bottom = 0;
      const ft = document.querySelector("footer");
      const fr = ft ? ft.getBoundingClientRect() : null;
      if (fr && fr.height && fr.top < window.innerHeight) bottom = Math.max(0, Math.round(window.innerHeight - fr.top));
      let left = null;
      if (vw >= 600) {
        const r = a.getBoundingClientRect();
        // DeepSeek chat khula ho (docked ho ya upar tairta) to uske baayen hi.
        const panel = document.querySelector(".sa-panel");
        const pr = panel ? panel.getBoundingClientRect() : null;
        const right = vw >= 1100 && pr && pr.width ? Math.min(r.right, pr.left) : (vw >= 1100 ? r.right : vw);
        const lo = vw >= 1100 ? Math.max(0, r.left) : 0;
        left = Math.round(Math.max(lo, Math.min(right - W, (lo + right) / 2 - W / 2)));
      }
      setPos((p) => (p.left === left && p.top === top && p.bottom === bottom ? p : { left, top, bottom }));
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    const mo = new MutationObserver(place);
    mo.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    const t = setInterval(place, 700);
    return () => { window.removeEventListener("resize", place); window.removeEventListener("scroll", place, true); mo.disconnect(); clearInterval(t); };
  }, []);

  // Neeche pahunchne se pehle hi agle 30 — scroll par naap kar.
  const more = () => {
    const b = body.current;
    if (!b || b.scrollTop + b.clientHeight <= b.scrollHeight - 1500) return;
    // Khatam na hone wali list (Home) — saare dikh gaye to aur maango.
    if (onNeedMore && n >= list.length) onNeedMore();
    setN((x) => Math.min(Math.max(list.length, STEP), x + STEP));
  };
  useEffect(() => { more(); }, [n, list.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // ⏭ Jahan chhoda — sabse aage wala laga hua question, uske baad wala.
  const jump = () => {
    let last = -1;
    list.forEach((q, i) => { if (picks[idOf(q, i)] != null) last = i; });
    const j = Math.min(list.length - 1, last + 1);
    setN((x) => Math.max(x, j + 5));
    setGoTo(j);
  };
  // Bahar se kisi khaas question par bheja (?qid=…) — seedha wahin.
  useEffect(() => {
    if (jumpIndex >= 0) { setN((x) => Math.max(x, jumpIndex + 5)); setGoTo(jumpIndex); }
  }, [jumpIndex]);
  useEffect(() => {
    if (goTo < 0) return;
    const el = body.current && body.current.querySelector(`[data-qi="${goTo}"]`);
    if (el) { body.current.scrollTop = el.offsetTop - body.current.offsetTop; setGoTo(-1); }
  }, [goTo, n]);

  const style = { top: pos.top, bottom: pos.bottom };
  if (pos.left != null) style.left = pos.left;

  return (
    <>
      <div ref={anchor} className="qfeed-anchor" />
      <div className="qfeed" style={style}>
        <div className="qfeed__head">
          <b>💬 {title}</b>
          {onNeedMore ? <span className="qfeed__n" /> : <span className="qfeed__n">{list.length} questions</span>}
          {noJump ? null : <button type="button" className="qfeed__jump" onClick={jump} title="Jahan tak lagaye, uske baad wala question">⏭</button>}
        </div>
        <div className="qfeed__body" ref={body} onScroll={more}>
          {list.slice(0, n).map((q, i) => {
            const id = idOf(q, i);
            return (
              <div key={id} className="qfeed__item" data-qi={i}>
                {renderCard(q, i, {
                  savedPick: picks[id] ?? null,
                  savedHidden: !!hid[id],
                  onPickSave: (oi) => savePick(id, oi),
                  onClearSave: () => { savePick(id, null); saveHid(id, false); },
                  onHideSave: (on) => saveHid(id, on),
                })}
              </div>
            );
          })}
          <div className="qfeed__end">{n < list.length || onNeedMore ? "…" : "— bas, saare ho gaye —"}</div>
        </div>
      </div>
    </>
  );
}
