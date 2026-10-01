"use client";

// 🎬 PYQ bank = reels. Ek screen par ek question (bank ka apna card —
// ✨ Gemini / 🐋 DeepSeek / tasveer sab wahi), upar swipe (ya ↓ / mouse
// scroll) = agla. "Aata hai / Nahi aata" wala kram hata diya (owner).
//
// Wapas kab aata hai (owner ke niyam):
//   ❌ galat, ya bina jawab diye aage badh gaye → 50–100 question baad kahin bhi
//   ✅ sahi                                     → 100–200 ke beech kahin bhi
//   Ek question zyada se zyada 5 baar dobara.
//   Jab kai wapas aane layak hon: pehle galat, phir skip, phir naye, sahi
//   wale sabse baad — aur do purane lagataar nahi (jab tak naye bache hon),
//   taaki sirf purane hi na ghoomte rahein.
// Poora kram chapter ke hisaab se bachta hai — band karke kholo to wahin se.
//
// Props wahi jo PyqDrill leta tha, taaki bank ke page sirf import badlein.

import { Children, Fragment, cloneElement, isValidElement, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { hashStr } from "@/lib/syncitems";
import { notebookQ } from "@/lib/imgq";
import "./pyqreels.css";
import QChatFeed from "./QChatFeed";

// 💬 Ab saare PYQ — Medieval jaisi DeepSeek chat wali window: saare question
// ek ke neeche ek, jawab pehle chhupa, laga hua option / 🙈 yaad, ⏭ jahan
// chhoda (components/QChatFeed). Purana reel (neeche) abhi rakha hai.
export default function PyqReels({ title, list, resumeKey, renderCard, shuffleFirst = false }) {
  const base = useMemo(() => (shuffleFirst ? shuffled(list) : list), [list, shuffleFirst]);
  return (
    <QChatFeed
      title={title || "Questions"}
      list={base}
      storeKey={resumeKey || title || "pyq"}
      renderCard={(q, i, mem) => {
        const el = renderCard(q, i, base);
        const extra = { chatLook: true, ...mem };
        if (!isValidElement(el)) return null;
        // Kuch page card ko <Fragment> mein lapet kar dete hain — andar wale card ko do.
        if (el.type === Fragment) {
          return cloneElement(el, {}, Children.map(el.props.children, (c) => (isValidElement(c) ? cloneElement(c, extra) : c)));
        }
        return cloneElement(el, extra);
      }}
    />
  );
}
export { PyqReelsOld };

const qKeyOf = (q) => String(q?.id ?? q?.uid ?? q?.question ?? q?.qText ?? "");
const MAX_REPEAT = 5;
const PRI = { w: 0, s: 1, c: 3 };                  // chhota = pehle
const GAP = { w: [50, 100], s: [50, 100], c: [100, 200] };
const rnd = ([a, b]) => a + Math.floor(Math.random() * (b - a + 1));

function shuffled(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

function PyqReelsOld({
  title, list, resumeKey, renderCard, shuffleFirst = false, unit = "Q", keyOf, timer = 40, subject = "",
}) {
  const keyFor = keyOf || qKeyOf;
  const base = useMemo(() => (shuffleFirst ? shuffled(list) : list), [list, shuffleFirst]);
  const hashOf = useCallback((q) => hashStr(keyFor(q)), [keyFor]);
  const byHash = useMemo(() => { const m = new Map(); for (const q of base) { const h = hashOf(q); if (!m.has(h)) m.set(h, q); } return m; }, [base, hashOf]);
  // Search se chhoti list aaye to uska alag (aur na bachne wala) hisaab.
  const store = `cgl.pyqreel.v2.${resumeKey || title || "pyq"}.${list.length}`;

  // st = { seq:[hash], next:<naye ka pointer>, pend:[{h,due,k}], shows:{h:n}, done:<jahan tak hisaab ho gaya>, at }
  const st = useRef(null);
  const res = useRef({});                            // position → true/false (sahi/galat)
  const box = useRef(null);
  const [seq, setSeq] = useState([]);
  const [at, setAt] = useState(0);

  const save = useCallback(() => { try { localStorage.setItem(store, JSON.stringify(st.current)); } catch { /* quota */ } }, [store]);

  // Agla question chuno (niyam upar).
  const pickNext = useCallback(() => {
    const S = st.current;
    const p = S.seq.length;
    const prevOld = p > 0 && S.fromPend && S.fromPend[p - 1];
    const due = S.pend.filter((x) => x.due <= p && byHash.has(x.h)).sort((a, b) => PRI[a.k] - PRI[b.k] || a.due - b.due);
    const hasNew = S.next < base.length;
    const take = (x) => { S.pend = S.pend.filter((y) => y !== x); S.fromPend = { ...(S.fromPend || {}), [p]: true }; return x.h; };
    // galat/skip due hain → wahi (bas lagataar do purane nahi, jab naye bache hon)
    // Sahi wala 200 ke andar pakka — hadd aa gayi to sabse pehle.
    const last = due.find((x) => x.k === "c" && x.end != null && p >= x.end - 1);
    if (last) return take(last);
    const hot = due.find((x) => x.k !== "c");
    if (hot && !(prevOld && hasNew)) return take(hot);
    // Sahi wala bhi apne 100–200 wale waqt par — galat/skip ke baad.
    const cool = due.find((x) => x.k === "c");
    if (cool && !hot && !(prevOld && hasNew)) return take(cool);
    if (hasNew) return hashOf(base[S.next++]);
    if (due.length) return take(due[0]);
    // Naye khatam, kuch due nahi — jo sabse jaldi aane wala hai use aage kheencho.
    const soon = S.pend.filter((x) => byHash.has(x.h)).sort((a, b) => PRI[a.k] - PRI[b.k] || a.due - b.due)[0];
    return soon ? take(soon) : null;
  }, [base, byHash, hashOf]);

  const fill = useCallback((upto) => {
    const S = st.current;
    let grew = false;
    while (S.seq.length <= upto) {
      const h = pickNext();
      if (!h) break;
      S.seq.push(h);
      grew = true;
    }
    if (grew) setSeq([...S.seq]);
  }, [pickNext]);

  // Shuru: bacha hua kram, warna naya.
  useEffect(() => {
    let S = null;
    try { S = JSON.parse(localStorage.getItem(store) || "null"); } catch { S = null; }
    if (!S || !Array.isArray(S.seq)) S = { seq: [], next: 0, pend: [], shows: {}, done: 0, at: 0, fromPend: {} };
    S.seq = S.seq.filter((h) => byHash.has(h));
    S.at = Math.min(S.at || 0, Math.max(0, S.seq.length - 1));
    S.done = Math.min(S.done || 0, S.seq.length);
    st.current = S;
    res.current = {};
    setSeq([...S.seq]);
    fill(S.at + 4);
    setAt(S.at);
    requestAnimationFrame(() => { const el = box.current; if (el) el.scrollTop = S.at * el.clientHeight; });
  }, [store, byHash, fill]);

  // Saamne wale question par option chuna → sahi/galat yaad.
  const atRef = useRef(0);
  atRef.current = at;
  useEffect(() => {
    const h = (e) => { const p = atRef.current; if (res.current[p] === undefined) res.current[p] = !!e.detail?.correct; };
    window.addEventListener("cgl:q-attempt", h);
    return () => window.removeEventListener("cgl:q-attempt", h);
  }, []);

  // Aage badhe → peechhe chhode question ka hisaab (ek hi baar), phir aage ki
  // reel bharo.
  const settle = useCallback((i) => {
    const S = st.current;
    if (!S) return;
    for (let p = S.done; p < i && p < S.seq.length; p++) {
      const h = S.seq[p];
      const r = res.current[p];
      const k = r === true ? "c" : r === false ? "w" : "s";
      const n = S.shows[h] || 0;
      S.pend = S.pend.filter((x) => x.h !== h);
      if (n < MAX_REPEAT) {
        S.shows[h] = n + 1;
        S.pend.push({ h, k, due: p + rnd(GAP[k]), ...(k === "c" ? { end: p + GAP.c[1] } : {}) });
      }
    }
    S.done = Math.max(S.done, i);
  }, []);

  const onScroll = useCallback(() => {
    const el = box.current;
    const S = st.current;
    if (!el || !S) return;
    const i = Math.round(el.scrollTop / el.clientHeight);
    if (i === at) return;
    setAt(i);
    settle(i);
    S.at = i;
    fill(i + 4);
    save();
  }, [at, settle, fill, save]);

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
  useEffect(() => { setLeft(timer); }, [at, timer, store]);
  useEffect(() => {
    if (!timer || left <= 0) return undefined;
    const t = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [left, timer]);
  const timeUp = !!timer && left <= 0;

  // 💬 Poochho panel ko saamne wala question batao — wahan "⭐ Is question
  // ka jawab bana do" isi par lagta hai (Sprint jaisa). Tasveer wale bank ka
  // card jis roop (tq) se jawab padhta hai, wahi roop bhejte hain.
  const curQ = seq[at] ? byHash.get(seq[at]) : null;
  useEffect(() => {
    const q = curQ ? notebookQ(curQ, curQ._card || subject) : null;
    try { window.dispatchEvent(new CustomEvent("cgl:sprint-q", { detail: { q } })); } catch { /* ignore */ }
  }, [curQ, subject]);
  useEffect(() => () => {
    try { window.dispatchEvent(new CustomEvent("cgl:sprint-q", { detail: { q: null } })); } catch { /* ignore */ }
  }, []);

  if (!base.length) return <div className="placeholder">Is chapter mein koi question nahi. 🤔</div>;
  const idxOf = (h) => { const q = byHash.get(h); return q ? base.indexOf(q) : -1; };
  const curH = seq[at];

  return (
    <div className="pyqr">
      <div className="pyqr-bar">
        <span className="carev-count">{unit} {curH ? idxOf(curH) + 1 : 1}/{base.length}</span>
        {!!timer && (
          <span className={"pyqd-clock" + (timeUp ? " is-over" : left <= 10 ? " is-warn" : "")}>
            {timeUp ? `⏰ ${timer} sec khatam` : `0:${String(left).padStart(2, "0")}`}
          </span>
        )}
      </div>
      <div className="pyqr-wrap">
      <div className="pyqr-box" ref={box} onScroll={onScroll}>
        {seq.map((h, i) => {
          const q = byHash.get(h);
          return (
            <section key={`${h}:${i}`} className="pyqr-reel">
              <div className="pyqr-card">
                {/* Sirf aas-paas ke card bante hain — lambi list mein sab ek
                    saath banana bhaari hai. */}
                {q && Math.abs(i - at) <= 2
                  ? cloneElement(renderCard(q, idxOf(h), base), { forceAnswer: i === at && timeUp })
                  : null}
              </div>
              {i < seq.length - 1 && (
                <button type="button" className="pyqr-next" onClick={() => go(1)} aria-label="Agla">⌄</button>
              )}
            </section>
          );
        })}
      </div>
      {/* ↑ ↓ — jawab lamba ho to scroll karke agle tak pahunchna mushkil. */}
      <div className="pyqr-nav">
        <button type="button" onClick={() => go(-1)} disabled={at <= 0} aria-label="Pichhla question" title="Pichhla (↑)">↑</button>
        <button type="button" onClick={() => go(1)} disabled={at >= seq.length - 1} aria-label="Agla question" title="Agla (↓)">↓</button>
      </div>
      </div>
    </div>
  );
}
