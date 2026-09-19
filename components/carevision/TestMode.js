"use client";

// Test (MCQ) — 10 / 25 / 50 sawaal, part / priority / sirf star ke filter.
// Har sawaal ke 3 galat option usi shakl ke sibling cards se (lib/carevision/
// mcq.js); jiske 3 saaf siblings nahi, wo card test mein aata hi nahi.
// Submit ke baad: score, part-wise hisaab, aur har galat jawab apne aap
// Galtiyan deck mein. Desktop: 1-4 = option, Enter = agla.
//
// Board apne store se bandha nahi hai: record, stars, expand (distractor ke
// liye aur cards) aur groupKey/groupLabel props se aate hain — abhi sirf CA
// deck ise use karta hai ("part" wale group ke saath).

import { useEffect, useMemo, useState } from "react";
import { buildTest } from "@/lib/carevision/mcq";
import { loadAll } from "@/lib/carevision/deck";
import { recordTest, getStars } from "@/lib/carevision/progress";

const COUNTS = [10, 25, 50];
const PRIORITIES = [["all", "Sab"], ["1", "P1"], ["2", "P2"], ["3", "P3"]];

export default function TestMode({
  cards, parts, today, onExit, onGaltiyan,
  record = recordTest, stars: starsIn = null, expand = null, groupKey = "part", groupLabel = "Part",
}) {
  const [count, setCount] = useState(10);
  const [part, setPart] = useState("all");
  const [pri, setPri] = useState("all");
  const [onlyStar, setOnlyStar] = useState(false);
  const [test, setTest] = useState(null);       // [{ card, options, correct }]
  const [picks, setPicks] = useState([]);
  const [pos, setPos] = useState(0);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const stars = useMemo(() => starsIn || getStars(), [starsIn]);
  const pool = useMemo(() => cards.filter((c) =>
    (part === "all" || c[groupKey] === part)
    && (pri === "all" || String(c.priority) === pri)
    && (!onlyStar || stars[c.id])), [cards, part, pri, onlyStar, stars]);

  const start = async () => {
    setBusy(true);
    // Distractor ke liye poora part (extended bhi) — offline ho to jo hai usi se.
    let all = cards;
    try {
      const want = [...new Set(pool.map((c) => c[groupKey]))];
      const load = expand ? expand(want) : loadAll(want);
      const more = await Promise.race([load, new Promise((_, no) => setTimeout(() => no(new Error("slow")), 8000))]);
      const seen = new Set(cards.map((c) => c.id));
      all = [...cards, ...more.filter((c) => !seen.has(c.id))];
    } catch { /* offline — core se hi */ }
    const seed = `${today}:${Date.now()}`;
    const qs = buildTest(pool, all, count, seed);
    setTest(qs);
    setPicks(Array(qs.length).fill(null));
    setPos(0);
    setDone(false);
    setBusy(false);
  };

  const submit = () => {
    const results = test.map((q, i) => ({ id: q.card.id, good: picks[i] === q.correct }));
    record(results, today);
    setDone(true);
    window.scrollTo(0, 0);
  };

  useEffect(() => {
    if (!test || done) return undefined;
    const onKey = (e) => {
      if (e.target && /input|textarea|select/i.test(e.target.tagName)) return;
      const n = Number(e.key);
      if (n >= 1 && n <= 4) setPicks((p) => p.map((v, i) => (i === pos ? n - 1 : v)));
      else if (e.key === "Enter" && picks[pos] != null) {
        if (pos < test.length - 1) setPos(pos + 1);
      } else if (e.key === "Escape") onExit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [test, done, pos, picks, onExit]);

  // ------------------------------------------------------------ setup
  if (!test) {
    return (
      <div className="carev">
        <div className="carev-bar"><button className="carev-link" onClick={onExit}>← Wapas</button><span /></div>
        <h1 className="carev-title carev-h2">Test</h1>
        <section className="carev-box">
          <div className="carev-label">Kitne sawaal</div>
          <div className="carev-chips">
            {COUNTS.map((n) => (
              <button key={n} className={`carev-chip${count === n ? " on" : ""}`} onClick={() => setCount(n)}>{n}</button>
            ))}
          </div>
          <div className="carev-label">{groupLabel}</div>
          <div className="carev-chips">
            <button className={`carev-chip${part === "all" ? " on" : ""}`} onClick={() => setPart("all")}>Sab</button>
            {parts.map((p) => (
              <button key={p} className={`carev-chip${part === p ? " on" : ""}`} onClick={() => setPart(p)}>{p}</button>
            ))}
          </div>
          {cards.some((c) => c.priority) ? (
            <>
              <div className="carev-label">Priority</div>
              <div className="carev-chips">
                {PRIORITIES.map(([v, l]) => (
                  <button key={v} className={`carev-chip${pri === v ? " on" : ""}`} onClick={() => setPri(v)}>{l}</button>
                ))}
              </div>
            </>
          ) : null}
          <label className="carev-check">
            <input type="checkbox" checked={onlyStar} onChange={(e) => setOnlyStar(e.target.checked)} />
            Sirf star kiye hue
          </label>
          <div className="carev-dim carev-small">Is filter mein {pool.length} card</div>
        </section>
        <button className="carev-btn carev-btn-primary carev-wide carev-go" disabled={busy || pool.length === 0} onClick={start}>
          {busy ? "Sawaal ban rahe hain…" : "Test shuru karo"}
        </button>
      </div>
    );
  }

  if (test.length === 0) {
    return (
      <div className="carev">
        <p>Is filter ke kisi card ke 4 saaf option nahi ban paaye. Filter badlo.</p>
        <button className="carev-btn" onClick={() => setTest(null)}>Filter badlo</button>
      </div>
    );
  }

  // ---------------------------------------------------------- results
  if (done) {
    const right = test.filter((q, i) => picks[i] === q.correct).length;
    const byPart = {};
    test.forEach((q, i) => {
      const p = q.card[groupKey];
      byPart[p] = byPart[p] || { right: 0, total: 0, title: q.card.partTitle || "" };
      byPart[p].total += 1;
      if (picks[i] === q.correct) byPart[p].right += 1;
    });
    const wrong = test.map((q, i) => ({ q, pick: picks[i] })).filter(({ q, pick }) => pick !== q.correct);
    return (
      <div className="carev">
        <div className="carev-bar"><button className="carev-link" onClick={onExit}>← Wapas</button><span /></div>
        <div className="carev-score">
          <div className="carev-score-big">{right} / {test.length}</div>
          <div className="carev-dim">{Math.round((right / test.length) * 100)}% sahi</div>
        </div>
        <section className="carev-box">
          <div className="carev-label">{groupLabel}-wise</div>
          <table className="carev-table">
            <thead><tr><th>{groupLabel}</th><th>Sahi</th><th>Kul</th></tr></thead>
            <tbody>
              {Object.entries(byPart).sort().map(([p, v]) => (
                <tr key={p}><td><b>{p}</b> <span className="carev-dim">{v.title || ""}</span></td><td>{v.right}</td><td>{v.total}</td></tr>
              ))}
            </tbody>
          </table>
        </section>
        {wrong.length ? (
          <section className="carev-box">
            <div className="carev-label">Galat · {wrong.length} (Galtiyan mein jud gaye)</div>
            <ol className="carev-wrong">
              {wrong.map(({ q, pick }) => (
                <li key={q.card.id}>
                  <div className="carev-wrong-q">{q.card.trigger}</div>
                  <div className="carev-wrong-a">✓ {q.card.answer}</div>
                  {pick != null ? <div className="carev-wrong-p">✗ {q.options[pick]}</div> : <div className="carev-dim">chhoda</div>}
                </li>
              ))}
            </ol>
            <button className="carev-btn carev-wide" onClick={onGaltiyan}>Galtiyan dekho</button>
          </section>
        ) : null}
        <button className="carev-btn carev-btn-primary carev-wide" onClick={() => setTest(null)}>Naya test</button>
      </div>
    );
  }

  // --------------------------------------------------------- question
  const q = test[pos];
  const answered = picks.filter((p) => p != null).length;
  return (
    <div className="carev-recall">
      <div className="carev-bar">
        <button className="carev-link" onClick={onExit}>← Chhodo</button>
        <span className="carev-count">{pos + 1} / {test.length}</span>
        <span className="carev-dim carev-small">{answered} jawab</span>
      </div>
      <div className="carev-progress" aria-hidden="true"><div style={{ width: `${(answered / test.length) * 100}%` }} /></div>
      <div className="carev-card carev-card-test">
        <div className="carev-meta"><span>{groupLabel} {q.card[groupKey]}</span> · <span>{q.card.section || q.card.mapTitle}</span></div>
        <div className="carev-trigger">{q.card.trigger}</div>
        <div className="carev-options" role="radiogroup">
          {q.options.map((o, i) => (
            <button
              key={i}
              role="radio"
              aria-checked={picks[pos] === i}
              className={`carev-option${picks[pos] === i ? " on" : ""}`}
              onClick={() => setPicks((p) => p.map((v, j) => (j === pos ? i : v)))}
            >
              <span className="carev-option-n">{i + 1}</span>{o}
            </button>
          ))}
        </div>
      </div>
      <div className="carev-actions">
        <button className="carev-btn" disabled={pos === 0} onClick={() => setPos(pos - 1)}>← Pichla</button>
        {pos < test.length - 1 ? (
          <button className="carev-btn carev-btn-primary" onClick={() => setPos(pos + 1)}>Agla →</button>
        ) : (
          <button className="carev-btn carev-btn-primary" onClick={submit}>Submit · {answered}/{test.length}</button>
        )}
      </div>
    </div>
  );
}
