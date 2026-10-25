"use client";

// ✂️ Option elimination — CGL Maths (owner: paper parso, "25 mein 25";
// "agar question na bhi aaye toh options se kar saku… page jispe test karu, aur
// wo bataye ki yahan ye karna tha, ye nahi").
//
// 2025 ke CGL PYQ (public/sscmaths2025, sirf text wale — photo wale nahi).
// Har sawaal par: ✂️ se option kaato → phir chuno → turant batao:
//   • tumne jo kaata wo sahi kaata ya sahi answer hi kaat diya
//   • is sawaal par kaunsa tareeka (lib/elim TRICKS) aur har galat option kyun bahar
//     (public/elimbank/<chapter>.json — har PYQ ka apna hal), warna options ki
//     shakal se auto hint + chapter ki checklist.
// Hisaab isi device par (localStorage "elim.v1" — cgl.* nahi, sync mein nahi jaata).

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TRICKS, CHAPTER_TIPS, autoHints, trickOf } from "@/lib/elim";
import "./elim.css";

const KEY = "elim.v1";
const loadSt = () => { try { return JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch { return {}; } };
const saveSt = (v) => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* quota */ } };
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const L = "ABCD";

function ElimInner() {
  const [tab, setTab] = useState("play");
  const [chaps, setChaps] = useState([]);
  const [chap, setChap] = useState("");
  const [bank, setBank] = useState({}); // slug → { qs, ex }
  const [order, setOrder] = useState([]);
  const [at, setAt] = useState(0);
  const [cut, setCut] = useState([]);
  const [pick, setPick] = useState(null);
  const [hint, setHint] = useState(false);
  const [sec, setSec] = useState(0);
  const [st, setSt] = useState({});
  const t0 = useRef(0);

  useEffect(() => {
    setSt(loadSt());
    fetch("/sscmaths2025/index.json").then((r) => r.json()).then((j) => {
      const list = (j.chapters || []).filter((c) => c.count > 0);
      setChaps(list);
      const s = loadSt();
      setChap(s.chap || "__mix");
    }).catch(() => {});
  }, []);

  const loadChap = useCallback(async (slug) => {
    if (bank[slug]) return bank[slug];
    const [qs, ex] = await Promise.all([
      fetch(`/sscmaths2025/${slug}.json`).then((r) => (r.ok ? r.json() : [])).catch(() => []),
      fetch(`/elimbank/${slug}.json`).then((r) => (r.ok ? r.json() : {})).catch(() => ({})),
    ]);
    const v = { qs: qs.filter((q) => /CGL/.test(q.source || "") && !q.img && (q.options || []).length === 4).map((q) => ({ ...q, chap: slug })), ex };
    setBank((b) => ({ ...b, [slug]: v }));
    return v;
  }, [bank]);

  // Chapter (ya Mixed) badla → nayi line-up; jinka hal bana hai wo pehle.
  useEffect(() => {
    if (!chap || !chaps.length) return;
    let alive = true;
    (async () => {
      const slugs = chap === "__mix" ? chaps.map((c) => c.slug) : [chap];
      const all = [];
      for (const s of slugs) { const v = await loadChap(s); all.push(...v.qs.map((q) => ({ q, has: !!v.ex[q.id] }))); }
      if (!alive) return;
      const done = loadSt().done || {};
      const fresh = shuffle(all.filter((x) => !done[x.q.id]));
      const old = shuffle(all.filter((x) => done[x.q.id]));
      const by = (a, b) => (b.has ? 1 : 0) - (a.has ? 1 : 0);
      setOrder([...fresh.sort(by), ...old.sort(by)].map((x) => x.q));
      setAt(0);
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chap, chaps.length]);

  const q = order[at];
  const ex = q ? bank[q.chap]?.ex?.[q.id] : null;
  useEffect(() => { setCut([]); setPick(null); setHint(false); setSec(0); t0.current = Date.now(); }, [q?.id]);
  useEffect(() => {
    if (!q || pick != null) return undefined;
    const t = setInterval(() => setSec(Math.round((Date.now() - t0.current) / 1000)), 500);
    return () => clearInterval(t);
  }, [q, pick]);

  const hints = useMemo(() => (q ? autoHints(q, q.chap) : []), [q]);
  const toggleCut = (i) => { if (pick != null) return; setCut((c) => (c.includes(i) ? c.filter((x) => x !== i) : [...c, i])); };
  const choose = (i) => {
    if (pick != null || cut.includes(i)) return;
    setPick(i);
    const ok = i === q.answer;
    const badCut = cut.includes(q.answer);
    const s = loadSt();
    s.done = s.done || {}; s.done[q.id] = ok ? 1 : 0;
    const c = (s.by = s.by || {})[q.chap] = s.by[q.chap] || { n: 0, ok: 0, cuts: 0, goodCuts: 0, t: 0 };
    c.n++; if (ok) c.ok++; c.cuts += cut.length; c.goodCuts += cut.filter((x) => x !== q.answer).length; c.t += Math.round((Date.now() - t0.current) / 1000);
    if (badCut) c.badCut = (c.badCut || 0) + 1;
    saveSt(s); setSt(s);
  };
  const next = () => setAt((a) => Math.min(a + 1, order.length - 1));
  const pickChap = (v) => { setChap(v); const s = loadSt(); s.chap = v; saveSt(s); };

  useEffect(() => {
    const k = (e) => {
      if (tab !== "play" || !q || /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName)) return;
      const n = "1234".indexOf(e.key);
      if (n >= 0 && pick == null) { if (e.shiftKey) toggleCut(n); else choose(n); }
      if ((e.key === "Enter" || e.key === "ArrowRight") && pick != null) next();
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  });

  const tot = Object.values(st.by || {}).reduce((a, c) => ({ n: a.n + c.n, ok: a.ok + c.ok, cuts: a.cuts + c.cuts, good: a.good + c.goodCuts, bad: a.bad + (c.badCut || 0) }), { n: 0, ok: 0, cuts: 0, good: 0, bad: 0 });
  const label = (slug) => chaps.find((c) => c.slug === slug)?.label || slug;
  const tips = q ? CHAPTER_TIPS[q.chap] || [] : [];
  const tagsOf = ex?.t || [];

  return (
    <section className="section elm">
      <header className="elm-head">
        <div>
          <div className="elm-eb">CGL Maths · 2025 PYQ</div>
          <h1>✂️ Option Elimination</h1>
          <p className="elm-sub">Sawaal na aaye tab bhi: had, unit digit, divisibility, andaaza, trap — options kaat kar sahi tak. Pehle ✂️ se kaato, phir chuno.</p>
        </div>
        <div className="elm-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={tab === "play"} onClick={() => setTab("play")}>🎯 Practice</button>
          <button type="button" role="tab" aria-selected={tab === "learn"} onClick={() => setTab("learn")}>📚 Tareeke</button>
        </div>
      </header>

      {tab === "learn" ? (
        <div className="elm-learn">
          <h2>10 tareeke — har sawaal par 3 second mein</h2>
          <ol className="elm-order">
            <li><b>Had (bound)</b> — jo option ho hi nahi sakta (180° se bada kon, saath ka kaam akele se dhima) turant kaato.</li>
            <li><b>Trap jodi</b> — ulta ratio, 100 − x, aadha / dugna: ek trap hai, sawaal ka aakhri shabd padho.</li>
            <li><b>Unit digit / divisibility</b> — options ke aakhri ank ya ratio ke parts se.</li>
            <li><b>Andaaza</b> — options door hon toh gol karke.</li>
            <li><b>Value maan lo / option daalo</b> — algebra, trig, umar, number.</li>
          </ol>
          <div className="elm-tricks">
            {TRICKS.map((t) => (
              <article key={t.k} className="elm-trick">
                <h3>{t.icon} {t.name}</h3>
                <p><b>Kab:</b> {t.when}</p>
                <p><b>Kaise:</b> {t.how}</p>
                <p className="elm-ex"><b>Misaal:</b> {t.ex}</p>
              </article>
            ))}
          </div>
          <h2>Chapter-wise: pehle kya dekhna</h2>
          <div className="elm-chtips">
            {chaps.filter((c) => CHAPTER_TIPS[c.slug]).map((c) => (
              <details key={c.slug}>
                <summary>{c.label}</summary>
                <ul>{CHAPTER_TIPS[c.slug].map((x, i) => <li key={i}>{x}</li>)}</ul>
              </details>
            ))}
          </div>
        </div>
      ) : (
        <div className="elm-play">
          <div className="elm-bar">
            <label>Chapter
              <select value={chap} onChange={(e) => pickChap(e.target.value)}>
                <option value="__mix">🔀 Mixed — saare chapter</option>
                {chaps.map((c) => <option key={c.slug} value={c.slug}>{c.label}</option>)}
              </select>
            </label>
            <div className="elm-stats">
              <span>Kiye <b>{tot.n}</b></span>
              <span>Sahi <b>{tot.n ? Math.round((tot.ok / tot.n) * 100) : 0}%</b></span>
              <span>Sahi kaate <b>{tot.good}</b></span>
              <span className={tot.bad ? "bad" : ""}>Sahi answer kaata <b>{tot.bad}</b></span>
            </div>
          </div>

          {!q ? <p className="hint">Sawaal aa rahe hain…</p> : (
            <article className="elm-card">
              <div className="elm-top">
                <span className="elm-src">{label(q.chap)} · {q.source}</span>
                <span className={`elm-clock${pick == null && sec > 36 ? " late" : ""}`}>⏱ {pick == null ? sec : Math.round((Date.now() - t0.current) / 1000)}s</span>
                <span className="elm-pos">{at + 1} / {order.length}</span>
              </div>
              <p className="elm-q">{q.question}</p>
              <ol className="elm-opts">
                {q.options.map((o, i) => {
                  const cl = ["elm-opt"];
                  if (cut.includes(i)) cl.push("cut");
                  if (pick != null && i === q.answer) cl.push("right");
                  if (pick === i && i !== q.answer) cl.push("wrong");
                  if (pick != null && cut.includes(i) && i === q.answer) cl.push("badcut");
                  return (
                    <li key={i} className={cl.join(" ")}>
                      <button type="button" className="elm-pick" onClick={() => choose(i)} disabled={pick != null || cut.includes(i)}>
                        <span className="l">{L[i]}</span><span className="t">{o}</span>
                      </button>
                      <button type="button" className="elm-x" onClick={() => toggleCut(i)} disabled={pick != null} aria-pressed={cut.includes(i)} title={cut.includes(i) ? "Wapas lao" : "Ye option kaato"}>{cut.includes(i) ? "↩" : "✂️"}</button>
                      {pick != null && ex?.cut?.[i] ? <div className="elm-why">{i === q.answer ? "✓ " : "✂️ "}{ex.cut[i]}</div> : null}
                    </li>
                  );
                })}
              </ol>

              {pick == null ? (
                <div className="elm-acts">
                  <button type="button" className="btn btn--ghost btn--sm" onClick={() => setHint((h) => !h)}>{hint ? "Hint chhupao" : "🤔 Kaatne ka hint"}</button>
                  <span className="elm-keys">✂️ = kaato · option par tap = jawaab · keys: 1–4 chuno, Shift+1–4 kaato</span>
                </div>
              ) : null}
              {pick == null && hint ? (
                <div className="elm-hint">
                  {(ex?.t?.length ? ex.t.map((k) => ({ k, why: trickOf(k)?.when })) : hints).slice(0, 3).map((h, i) => <p key={i}><b>{trickOf(h.k)?.icon} {trickOf(h.k)?.name}:</b> {h.why}</p>)}
                  {!hints.length && !ex?.t?.length ? <p>{tips[0] || "Pehle had (bound) dekho: kaunsa option ho hi nahi sakta?"}</p> : null}
                </div>
              ) : null}

              {pick != null ? (
                <div className={`elm-res ${pick === q.answer ? "ok" : "no"}`}>
                  <h3>{pick === q.answer ? "✓ Sahi" : `✗ Galat — sahi: ${L[q.answer]}) ${q.options[q.answer]}`}</h3>
                  {cut.length ? (
                    <p className="elm-cutres">
                      Tumne kaate: {cut.map((i) => `${L[i]}`).join(", ")} —{" "}
                      {cut.includes(q.answer) ? <b className="bad">sahi answer ({L[q.answer]}) hi kaat diya! Kaatne se pehle had / shart dobara dekho.</b>
                        : <b className="good">sab sahi kaate ✓ {cut.length === 3 ? "(teen kaate, bacha wahi answer)" : ""}</b>}
                    </p>
                  ) : <p className="elm-cutres">Kuch nahi kaata — agli baar pehle ✂️ se 1–2 option hatao, phir chuno.</p>}
                  {ex?.doubt ? <p className="elm-doubt">⚠️ {ex.doubt}</p> : null}
                  <div className="elm-do">
                    <h4>Yahan kya karna tha</h4>
                    {tagsOf.length ? <div className="elm-tags">{tagsOf.map((k) => <span key={k}>{trickOf(k)?.icon} {trickOf(k)?.name}</span>)}</div> : null}
                    {ex?.elim ? <p><b>Kaatna:</b> {ex.elim}</p> : null}
                    {ex?.fast ? <p><b>Exact tak (36 sec):</b> {ex.fast}</p> : null}
                    {!ex ? (
                      <>
                        {hints.map((h, i) => <p key={i}><b>{trickOf(h.k)?.icon} {trickOf(h.k)?.name}:</b> {h.why}</p>)}
                        <ul className="elm-tips">{tips.map((x, i) => <li key={i}>{x}</li>)}</ul>
                      </>
                    ) : null}
                  </div>
                  <button type="button" className="btn elm-next" onClick={next} disabled={at >= order.length - 1}>Agla sawaal ›</button>
                </div>
              ) : null}
            </article>
          )}

          {Object.keys(st.by || {}).length ? (
            <details className="elm-chstat">
              <summary>Chapter-wise hisaab</summary>
              <table>
                <thead><tr><th>Chapter</th><th>Kiye</th><th>Sahi</th><th>Avg time</th><th>Sahi answer kaata</th></tr></thead>
                <tbody>
                  {Object.entries(st.by).map(([k, c]) => (
                    <tr key={k}><td>{label(k)}</td><td>{c.n}</td><td>{Math.round((c.ok / c.n) * 100)}%</td><td>{Math.round(c.t / c.n)}s</td><td>{c.badCut || 0}</td></tr>
                  ))}
                </tbody>
              </table>
            </details>
          ) : null}
        </div>
      )}
    </section>
  );
}

export default function ElimPage() {
  return <Suspense fallback={<div className="placeholder">Loading…</div>}><ElimInner /></Suspense>;
}
