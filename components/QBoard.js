"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { doneKeyFor, getDoneSet } from "@/lib/qdone";
import { keyFor } from "@/lib/qstats";
import { getCounts, bumpCount, COUNTER_SUBJECTS } from "@/lib/qcounter";
import FullscreenTestButton from "./FullscreenTestButton";

// 📚 Ek PYQ chapter ka board — asli online exam ki tarah.
//
// Do parde hain:
//   1. SET — chapter 25-25 ke set mein bat jata hai (Set 1, Set 2 …), har set
//      ek card. 764 question ki ek lambi list ke saamne baithne se behtar hai
//      ki ek baithak mein 25 ho — utna hi ek asli paper ka tukda hota hai.
//   2. TEST — set khulte hi 15 minute ka clock chalta hai, ek waqt par EK
//      question, daayin numbered palette, aur neeche ginti.
//
// Palette ka rang wahi hai jo exam mein hota hai:
//     neela  = abhi tak haath nahi lagaya
//     hara   = sahi
//     laal   = galat
//     peela  = Mark for Review
//     safed + neeli lakeer = abhi isi par ho
//
// Sahi/galat card ke andar ki baat hai, palette card ke bahar hai — isliye
// card `recordAttempts` (lib/qstats) se `cgl:q-attempted` bhejta hai aur board
// wahi sunta hai. Teen card files chhedne ki zaroorat nahi padi.
//
// Chuna hua option wapas aane par bhi dikhna chahiye, isliye set ke saare 25
// card mount rehte hain aur sirf ek dikhta hai (baaki display:none). Ek-ek
// karke mount/unmount karte to peeche jaate hi jawab gayab ho jata.

const SET_SIZE = 25;
const SET_MIN = 15;              // ek set = 15 minute, SSC ke section jaisa

const two = (n) => String(n).padStart(2, "0");
const clock = (s) => `${two(Math.floor(Math.max(0, s) / 60))}:${two(Math.max(0, s) % 60)}`;

export default function QBoard({
  list,                       // page ki apni list (uske filters ke BAAD)
  subject,                    // counter kis subject mein ginega
  resumeKey,                  // chapter ki pehchaan — badalte hi board reset
  title = "Test",             // full-screen test ka naam
  renderCard,                 // (q, index, orderedList) => <Card/>
  emptyText = "Yahan koi question nahi.",
}) {
  const [setIdx, setSetIdx] = useState(null);   // null = set chunne ka parda
  const [cur, setCur] = useState(0);            // set ke andar ka number
  const [marks, setMarks] = useState({});       // key -> true (sahi) / false (galat)
  const [review, setReview] = useState({});     // key -> true (Mark for Review)
  const [leftSec, setLeftSec] = useState(SET_MIN * 60);
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

  // Card ne jawab record kiya — palette ka rang wahin se aata hai.
  useEffect(() => {
    const h = (e) => {
      const list = e.detail?.marks || [];
      if (!list.length) return;
      setMarks((m) => {
        const next = { ...m };
        for (const { key, correct } of list) if (key) next[key] = correct;
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
    setSetIdx(null); setCur(0); setMarks({}); setReview({});
  }, [resumeKey, listLen]);

  // Clock — set khulte hi shuru, 0 par ruk jata hai.
  useEffect(() => {
    if (setIdx === null) return undefined;
    const t = setInterval(() => setLeftSec((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [setIdx]);

  const from = setIdx === null ? 0 : setIdx * SET_SIZE;
  const setQs = useMemo(
    () => (setIdx === null ? [] : ordered.slice(from, from + SET_SIZE)),
    [ordered, setIdx, from],
  );

  const openSet = (i) => {
    setSetIdx(i);
    setCur(0);
    setMarks({});
    setReview({});
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
    setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 40);
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
            const dn = chunk.filter((q) => doneSet.has(doneKeyFor(q))).length;
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
  const answered = setQs.filter((q) => marks[keyFor(q)] !== undefined).length;
  const reviewed = setQs.filter((q) => review[keyFor(q)]).length;
  const curKey = keyFor(setQs[at]);
  const low = leftSec <= 60;

  const toggleReview = () =>
    setReview((r) => ({ ...r, [curKey]: !r[curKey] }));

  return (
    <div className="qboard">
      <nav className="qboard__side" ref={railRef}>
        {setQs.map((q, i) => {
          const k = keyFor(q);
          const mk = marks[k];
          const cls = [
            i === at ? "is-cur" : "",
            review[k] ? "is-review" : mk === true ? "is-right" : mk === false ? "is-wrong" : "",
            mk === undefined && !review[k] && doneSet.has(doneKeyFor(q)) ? "is-done" : "",
          ].filter(Boolean).join(" ");
          return (
            <a key={q._uid ?? q.id ?? i} onClick={() => go(i)} className={cls}>
              {i + 1}
            </a>
          );
        })}
      </nav>

      <div className="qboard__main">
        {/* Test ka sar — naam, clock, full screen. */}
        <div className="qboard__top">
          <button className="btn btn--ghost btn--sm" onClick={() => setSetIdx(null)}>← Sets</button>
          <span className="qboard__title">Set {setIdx + 1} · {n} questions</span>
          <span className={`qboard__clock${low ? " is-low" : ""}`}>
            ⏱ {leftSec > 0 ? clock(leftSec) : "00:00 · samay khatam"}
          </span>
          <FullscreenTestButton
            questions={setQs}
            startIndex={at}
            title={`${title} · Set ${setIdx + 1}`}
            subject={subject || ""}
            /* Full screen mein bhi wahi ghadi chalti rahe — naya 15 min nahi,
               jitna is set mein bacha hai utna. */
            timeLimitSec={leftSec}
            label="⛶ Full screen"
            titleAttr="Poore set ka full-screen test"
            className="btn btn--sm"
          />
        </div>

        {stats}

        <div className="qboard__nav">
          <button className="btn btn--ghost" onClick={() => go(at - 1)} disabled={at === 0}>← Previous</button>
          <span className="qboard__pos">Question <b>{at + 1}</b> / {n}</span>
          <button
            className={`btn btn--review${review[curKey] ? " is-on" : ""}`}
            onClick={toggleReview}
          >
            ⚑ {review[curKey] ? "Marked" : "Mark for Review"}
          </button>
          <button className="btn" onClick={() => go(at + 1)} disabled={at === n - 1}>Save &amp; Next →</button>
        </div>

        {/* Saare 25 card mount rehte hain, sirf ek dikhta hai — isliye peeche
            jaakar bhi apna chuna hua option waisa ka waisa milta hai. */}
        <div className="qboard__cards">
          {setQs.map((q, i) => (
            <div key={q._uid ?? q.id ?? i} style={i === at ? undefined : { display: "none" }}>
              {renderCard(q, from + i, ordered)}
            </div>
          ))}
        </div>

        <div className="qboard__nav qboard__nav--bottom">
          <button className="btn btn--ghost" onClick={() => go(at - 1)} disabled={at === 0}>← Previous</button>
          <span className="qboard__pos qboard__pos--hint">← → arrow key se bhi</span>
          <button className="btn" onClick={() => go(at + 1)} disabled={at === n - 1}>Save &amp; Next →</button>
        </div>

        {/* Testbook ke "PART-A Analysis" wala hisaab. */}
        <div className="qboard__tally">
          <span className="tally tally--ans">Answered <b>{answered}</b></span>
          <span className="tally tally--not">Not Answered <b>{n - answered}</b></span>
          <span className="tally tally--rev">Marked for Review <b>{reviewed}</b></span>
        </div>
      </div>
    </div>
  );
}
