"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { doneKeyFor, getDoneSet } from "@/lib/qdone";
import { keyFor } from "@/lib/qstats";
import { getCounts, bumpCount, COUNTER_SUBJECTS } from "@/lib/qcounter";
import { ExamModeProvider } from "./ExamMode";

// 📚 Ek PYQ chapter ka board — asli online test.
//
// Do parde hain:
//   1. SET — chapter 25-25 ke tukdon mein bat jata hai (Set 1, Set 2 …), har
//      ek card. 764 ki lambi list ke saamne baithne se behtar hai ki ek
//      baithak mein 25 ho — utna hi ek asli paper ka hissa hota hai.
//   2. TEST — 15 minute ka clock, ek waqt par EK question, daayin numbered
//      palette aur uske NEECHE hisaab (Answered / Not Answered / Marked).
//
// Test QUIZ ki tarah chalta hai: option chunte hi sahi/galat NAHI batata.
// Timer ka matlab hi tab hai jab jawab aakhir mein pata chale — isliye card ko
// ExamMode context se `locked` bheja jata hai aur wo apna answer block, rang
// aur "Saved to Wrong" wali line sab band rakhta hai. Submit dabate hi
// `revealAll` chalu hota hai aur poore set ke answer ek saath khul jaate hain.
//
// Palette ka rang:
//   test ke dauraan — neela = chhoda hua, HARA = answer diya, PEELA = review
//   submit ke baad  — HARA = sahi, LAAL = galat, khaali = chhoda hua
// Abhi jis par ho uspar gehra ghera rehta hai (rang chhupaye bina).
//
// Set ke 25 card mount rehte hain aur sirf ek dikhta hai. Ek-ek karke mount
// karte to peeche jaate hi chuna hua option gayab ho jata.

const SET_SIZE = 25;
const SET_MIN = 15;              // ek set = 15 minute, SSC ke section jaisa

const two = (n) => String(n).padStart(2, "0");
const clock = (s) => `${two(Math.floor(Math.max(0, s) / 60))}:${two(Math.max(0, s) % 60)}`;

export default function QBoard({
  list,                       // page ki apni list (uske filters ke BAAD)
  subject,                    // counter kis subject mein ginega
  resumeKey,                  // chapter ki pehchaan — badalte hi board reset
  renderCard,                 // (q, index, orderedList) => <Card/>
  emptyText = "Yahan koi question nahi.",
}) {
  const [setIdx, setSetIdx] = useState(null);   // null = set chunne ka parda
  const [cur, setCur] = useState(0);            // set ke andar ka number
  const [marks, setMarks] = useState({});       // key -> true (sahi) / false (galat)
  const [review, setReview] = useState({});     // key -> true (Mark for Review)
  const [leftSec, setLeftSec] = useState(SET_MIN * 60);
  const [done, setDone] = useState(false);      // Submit ho gaya
  const [fs, setFs] = useState(false);          // full screen
  const [ver, setVer] = useState(0);            // qdone badla to dobara chhaanto
  const [counts, setCounts] = useState({});

  useEffect(() => { setCounts(getCounts()); }, []);
  useEffect(() => {
    const h = () => { setVer((v) => v + 1); setCounts(getCounts()); };
    // Dono sunte hain: qdone se list dobara chhantti hai, aur counter apna
    // event mark ke BAAD bhejta hai — usse "🔢 Aaj" wahin ka wahin badh jata
    // hai (pehle wo agli baar page kholne par hi badalta tha).
    window.addEventListener("cgl:qdone-changed", h);
    window.addEventListener("cgl:counter-changed", h);
    return () => {
      window.removeEventListener("cgl:qdone-changed", h);
      window.removeEventListener("cgl:counter-changed", h);
    };
  }, []);

  // Card ne jawab record kiya. Board yahi se jaanta hai kaun sa question
  // attempt hua — aur sahi/galat bhi, par wo Submit tak dikhata nahi.
  useEffect(() => {
    const h = (e) => {
      const got = e.detail?.marks || [];
      if (!got.length) return;
      setMarks((m) => {
        const next = { ...m };
        for (const { key, correct } of got) if (key) next[key] = correct;
        return next;
      });
    };
    window.addEventListener("cgl:q-attempted", h);
    return () => window.removeEventListener("cgl:q-attempted", h);
  }, []);

  // Kram: pehle baaki (apne asli kram mein), phir ho gaye. Dono taraf kram
  // sthir hai, isliye ek question mark karne par baaki apni jagah nahi badalte.
  const { ordered, doneSet, doneCount } = useMemo(() => {
    const set = getDoneSet();
    const pend = [];
    const dn = [];
    for (const q of list || []) (set.has(doneKeyFor(q)) ? dn : pend).push(q);
    return { ordered: [...pend, ...dn], doneSet: set, doneCount: dn.length };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list, ver]);

  const total = ordered.length;
  const setCount = Math.ceil(total / SET_SIZE);

  // Naya chapter (ya naya filter) aaya to seedha set wale parde par. Dep mein
  // list ki IDENTITY nahi li ja sakti — jo page apna filter inline karta hai
  // wahan har render par nayi array banti hai aur parda turant reset ho jata.
  const listLen = (list || []).length;
  useEffect(() => {
    setSetIdx(null); setCur(0); setMarks({}); setReview({}); setDone(false);
  }, [resumeKey, listLen]);

  // Clock. Submit ke baad ruk jata hai; 0 par khud submit ho jata hai — timer
  // ka matlab hi yahi hai.
  useEffect(() => {
    if (setIdx === null || done) return undefined;
    const t = setInterval(() => {
      setLeftSec((s) => {
        if (s <= 1) { setDone(true); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [setIdx, done]);

  // Full screen — wahi test ka page, bas poori screen par. Alag runner nahi:
  // timer, palette aur hisaab jaisa yahan hai waisa hi wahan dikhna chahiye.
  const rootRef = useRef(null);
  useEffect(() => {
    const h = () => setFs(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", h);
    return () => document.removeEventListener("fullscreenchange", h);
  }, []);
  const toggleFs = () => {
    const el = rootRef.current;
    if (!el) return;
    if (document.fullscreenElement) { document.exitFullscreen?.().catch(() => {}); setFs(false); }
    // API mana kar de (iOS Safari) to bhi CSS wala full-screen chalta hai.
    else { el.requestFullscreen?.().catch(() => {}); setFs(true); }
  };

  const from = setIdx === null ? 0 : setIdx * SET_SIZE;
  const setQs = useMemo(
    () => (setIdx === null ? [] : ordered.slice(from, from + SET_SIZE)),
    [ordered, setIdx, from],
  );

  const openSet = (i) => {
    setSetIdx(i);
    setCur(0); setMarks({}); setReview({}); setDone(false);
    setLeftSec(SET_MIN * 60);
    setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 40);
  };

  const go = useCallback((i) => {
    setCur((c) => {
      const n = setQs.length;
      if (!n) return c;
      return Math.max(0, Math.min(i, n - 1));
    });
    // Naya question upar se shuru ho — warna lamba question padhne ke baad
    // agla beech se khulta hua lagta hai.
    const box = rootRef.current;
    setTimeout(() => {
      if (document.fullscreenElement && box) box.scrollTo({ top: 0, behavior: "smooth" });
      else window.scrollTo({ top: 0, behavior: "smooth" });
    }, 40);
  }, [setQs.length]);

  // ← → se agla/pichla. Input/textarea mein type karte waqt nahi (warna
  // answer paste karte hi question badal jata).
  useEffect(() => {
    if (setIdx === null) return undefined;
    const h = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target;
      const tag = t?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || t?.isContentEditable) return;
      if (e.key === "ArrowRight") { e.preventDefault(); go(cur + 1); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); go(cur - 1); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [cur, go, setIdx]);

  // Palette apne aap abhi wale number par aa jaye (phone par wo ek horizontal
  // patti hai, wahan ye zyada zaroori hai). offsetTop kaam nahi karta — desktop
  // par rail sticky hai aur phone par static, to offsetParent badal jata hai;
  // isliye rect ka fark liya hai.
  const railRef = useRef(null);
  useEffect(() => {
    const r = railRef.current;
    const el = r?.querySelector("a.is-cur");
    if (!r || !el) return;
    const cr = r.getBoundingClientRect();
    const er = el.getBoundingClientRect();
    r.scrollTop += (er.top - cr.top) - (cr.height - er.height) / 2;
    r.scrollLeft += (er.left - cr.left) - (cr.width - er.width) / 2;
  });

  const nudge = (delta) => setCounts((c) => ({ ...c, [subject]: bumpCount(subject, delta) }));

  if (!total) return <div className="placeholder">{emptyText}</div>;

  const stats = (
    <div className="qboard__stats">
      {COUNTER_SUBJECTS.includes(subject) && (
        <span className="cnt" title="Aaj is subject ke kitne question hue (raat 3 baje reset)">
          🔢 Aaj: {counts[subject] || 0}
          <button type="button" onClick={() => nudge(-1)} aria-label="ek kam">−</button>
          <button type="button" onClick={() => nudge(1)} aria-label="ek zyada">+</button>
        </span>
      )}
      <span className="tot">📊 Total: {total}</span>
      <span className="did">✅ Ho gaye: {doneCount}</span>
      <span className="left">⏳ Baaki: {total - doneCount}</span>
    </div>
  );

  // ---------- parda 1: set chuno ----------
  if (setIdx === null) {
    return (
      <div className="qboard__main">
        {stats}
        <div className="setgrid">
          {Array.from({ length: setCount }, (_, i) => {
            const a = i * SET_SIZE;
            const chunk = ordered.slice(a, a + SET_SIZE);
            const dn = chunk.filter((x) => doneSet.has(doneKeyFor(x))).length;
            return (
              <button key={i} className="setcard" onClick={() => openSet(i)}>
                <span className="setcard__n">Set {i + 1}</span>
                <span className="setcard__meta">Q {a + 1}–{a + chunk.length} · {chunk.length} questions</span>
                <span className="setcard__bar">
                  <i style={{ width: `${Math.round((dn / chunk.length) * 100)}%` }} />
                </span>
                <span className="setcard__done">✅ {dn} / {chunk.length} ho gaye</span>
                <span className="setcard__go">▶ Test shuru karo · ⏱ {SET_MIN} min</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ---------- parda 2: test ----------
  const n = setQs.length;
  const at = Math.min(cur, n - 1);
  const answered = setQs.filter((x) => marks[keyFor(x)] !== undefined).length;
  const reviewed = setQs.filter((x) => review[keyFor(x)]).length;
  const right = setQs.filter((x) => marks[keyFor(x)] === true).length;
  const wrong = answered - right;
  const curKey = keyFor(setQs[at]);
  const low = leftSec <= 60;
  const spent = SET_MIN * 60 - leftSec;

  const submit = () => {
    setDone(true);
    if (document.fullscreenElement) { /* full screen mein hi result dikhega */ }
    setTimeout(() => {
      const box = rootRef.current;
      if (document.fullscreenElement && box) box.scrollTo({ top: 0, behavior: "smooth" });
      else window.scrollTo({ top: 0, behavior: "smooth" });
    }, 40);
  };

  return (
    <ExamModeProvider value={{ locked: !done, revealAll: done }}>
      <div className={`qboard${fs ? " is-fs" : ""}${done ? "" : " is-locked"}`} ref={rootRef}>
        <aside className="qboard__rail">
          <nav className="qboard__side" ref={railRef}>
            {setQs.map((x, i) => {
              const k = keyFor(x);
              const mk = marks[k];
              // Test ke dauraan sirf itna: haath lagaya ya nahi. Sahi/galat
              // Submit ke baad hi rang badalta hai.
              const state = done
                ? (mk === true ? "is-right" : mk === false ? "is-wrong" : "is-skip")
                : (review[k] ? "is-review" : mk !== undefined ? "is-ans" : "");
              return (
                <a
                  key={x._uid ?? x.id ?? i}
                  onClick={() => go(i)}
                  className={`${state}${i === at ? " is-cur" : ""}`}
                >
                  {i + 1}
                </a>
              );
            })}
          </nav>

          {/* Hisaab — Testbook par bhi ye palette ke NEECHE hi hota hai. */}
          <div className="qboard__tally">
            {done ? (
              <>
                <span className="tally tally--ans">Correct <b>{right}</b></span>
                <span className="tally tally--bad">Wrong <b>{wrong}</b></span>
                <span className="tally tally--not">Skipped <b>{n - answered}</b></span>
              </>
            ) : (
              <>
                <span className="tally tally--ans">Answered <b>{answered}</b></span>
                <span className="tally tally--not">Not Answered <b>{n - answered}</b></span>
                <span className="tally tally--rev">Marked for Review <b>{reviewed}</b></span>
              </>
            )}
          </div>
        </aside>

        <div className="qboard__main">
          {/* Test ka sar — naam, ghadi, full screen, Submit. */}
          <div className="qboard__top">
            <button className="btn btn--ghost btn--sm" onClick={() => setSetIdx(null)}>← Sets</button>
            <span className="qboard__title">Set {setIdx + 1} · {n} questions</span>
            <span className={`qboard__clock${low && !done ? " is-low" : ""}`}>
              ⏱ {done ? `${clock(spent)} liya` : clock(leftSec)}
            </span>
            <button className="btn btn--ghost btn--sm" onClick={toggleFs}>
              {fs ? "⤢ Exit full screen" : "⛶ Full screen"}
            </button>
            {!done && (
              <button className="btn btn--submit btn--sm" onClick={submit}>✅ Submit Test</button>
            )}
          </div>

          {done && (
            <div className="qboard__result">
              <b>{right} / {n}</b> sahi · {wrong} galat · {n - answered} chhoda ·
              ⏱ {clock(spent)} {leftSec === 0 ? "· samay khatam ho gaya tha" : ""}
              <button className="btn btn--ghost btn--sm" onClick={() => openSet(setIdx)}>🔁 Dobara</button>
            </div>
          )}

          {stats}

          <div className="qboard__nav">
            <button className="btn btn--ghost" onClick={() => go(at - 1)} disabled={at === 0}>← Previous</button>
            <span className="qboard__pos">Question <b>{at + 1}</b> / {n}</span>
            {!done && (
              <button
                className={`btn btn--review${review[curKey] ? " is-on" : ""}`}
                onClick={() => setReview((r) => ({ ...r, [curKey]: !r[curKey] }))}
              >
                ⚑ {review[curKey] ? "Marked" : "Mark for Review"}
              </button>
            )}
            <button className="btn" onClick={() => go(at + 1)} disabled={at === n - 1}>Save &amp; Next →</button>
          </div>

          <div className="qboard__cards">
            {setQs.map((x, i) => (
              <div key={x._uid ?? x.id ?? i} style={i === at ? undefined : { display: "none" }}>
                {renderCard(x, from + i, ordered)}
              </div>
            ))}
          </div>

          <div className="qboard__nav qboard__nav--bottom">
            <button className="btn btn--ghost" onClick={() => go(at - 1)} disabled={at === 0}>← Previous</button>
            <span className="qboard__pos qboard__pos--hint">← → arrow key se bhi</span>
            {at === n - 1 && !done
              ? <button className="btn btn--submit" onClick={submit}>✅ Submit Test</button>
              : <button className="btn" onClick={() => go(at + 1)} disabled={at === n - 1}>Save &amp; Next →</button>}
          </div>
        </div>
      </div>
    </ExamModeProvider>
  );
}
