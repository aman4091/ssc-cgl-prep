"use client";

// 📝 Answers ke SET — 25-25 ke tukde, har set ek 15 minute ka TEST (PYQ ke
// purane set wale system jaisa — components/QBoard). Owner: "answer page mein
// bhi 25 25 ke set bana dio 15 minute timer ke sath".
//
// Answers ke zyaadatar sawaal TASVEER hain (options tasveer mein), isliye test
// mein A/B/C/D ka chunav har sawaal par hai. Submit par jawab khulta hai:
//   • sahi option pata ho (record ka q.answer, ya jawab ke text mein
//     "Answer: (c)" jaisa) → apne aap sahi / galat
//   • pata na ho → tum khud ✓ Sahi / ✗ Galat lagao
// Natija lib/settests mein ("answers:<subject>#<set>") — set card par dikhta
// hai, dobara kholne par "Attempt again" / "Result".
//
// Set list ke ASLI kram se katte hain (Set 1 = Q 1–25, hamesha wahi) — "ho
// gaya neeche" wali chhantayi yahan nahi, warna set ke sawaal badalte rehte.

import { useCallback, useEffect, useMemo, useState } from "react";
import { getChapterResults, saveSetResult, accuracyOf, marksOf, maxMarks, fmtMarks } from "@/lib/settests";

const SET_SIZE = 25;
const SET_MIN = 15;
const L = "ABCD";
const two = (n) => String(n).padStart(2, "0");
const clock = (s) => `${two(Math.floor(Math.max(0, s) / 60))}:${two(Math.max(0, s) % 60)}`;

// Sahi option ka number (0–3), ya -1 (pata nahi).
function keyOf(r) {
  const q = r && r.q;
  if (q && Array.isArray(q.options) && q.options.length >= 2) {
    if (Number.isInteger(q.answer)) return q.answer;
    if (/^\d+$/.test(String(q.answer ?? ""))) return Number(q.answer);
  }
  const t = String((r && (r.detail2 || r.detail)) || (q && q.solution) || "").replace(/\*\*/g, "");
  const re = /(?:sahi\s*(?:jawab|answer|option|uttar)|correct\s*(?:answer|option)|final\s*answer|answer|ans\.?|उत्तर)\s*(?:is|hai|:|-|–|—|=)?\s*/gi;
  let m;
  while ((m = re.exec(t))) {
    const rest = t.slice(m.index + m[0].length, m.index + m[0].length + 14);
    const x = /^(?:option\s*)?\(([a-d])\)/i.exec(rest) || /^option\s*([a-d])\b/i.exec(rest) || /^([A-D])(?![a-z])/.exec(rest);
    if (x) return x[1].toLowerCase().charCodeAt(0) - 97;
  }
  return -1;
}
const optsOf = (r) => {
  const o = r && r.q && Array.isArray(r.q.options) ? r.q.options.filter((x) => x != null && String(x).trim()) : [];
  return o.length >= 2 ? o.slice(0, 4).map(String) : ["", "", "", ""];
};

export default function AnswersSets({ ctx, tabs }) {
  const all = ctx.list;
  const subs = [...new Set(all.map((x) => ctx.bucketOf(x)))].sort();
  const rkey = `answers:${subs.join("+") || "all"}`;
  const setCount = Math.ceil(all.length / SET_SIZE);
  const [results, setResults] = useState({});
  useEffect(() => {
    const on = () => setResults(getChapterResults(rkey));
    on();
    window.addEventListener("cgl:settest-changed", on);
    window.addEventListener("cgl:sync-applied", on);
    return () => { window.removeEventListener("cgl:settest-changed", on); window.removeEventListener("cgl:sync-applied", on); };
  }, [rkey]);

  const [setIdx, setSetIdx] = useState(null);
  const [done, setDone] = useState(false);
  const [cur, setCur] = useState(0);
  const [picks, setPicks] = useState({});     // i -> 0..3
  const [review, setReview] = useState({});   // i -> true
  const [self, setSelf] = useState({});       // i -> true/false (bina key wale ka apna faisla)
  const [left, setLeft] = useState(SET_MIN * 60);
  const [sec, setSec] = useState(0);
  const [side, setSide] = useState(() => typeof window === "undefined" || window.innerWidth > 900);

  const qs = useMemo(() => (setIdx === null ? [] : all.slice(setIdx * SET_SIZE, setIdx * SET_SIZE + SET_SIZE)), [all, setIdx]);
  const keys = useMemo(() => qs.map(keyOf), [qs]);
  const n = qs.length;
  const running = setIdx !== null && !done;

  // Ghadi — 0 par apne aap submit.
  useEffect(() => {
    if (!running) return undefined;
    const t = setInterval(() => setLeft((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [running]);
  // Test ke dauraan 🚨 / 🍅 chhupe (QBoard jaisa).
  useEffect(() => {
    if (!running) return undefined;
    document.body.classList.add("exam-on");
    return () => document.body.classList.remove("exam-on");
  }, [running]);

  const verdict = useCallback((i, pk = picks, sf = self) => {
    if (pk[i] == null) return "skip";
    if (keys[i] >= 0) return pk[i] === keys[i] ? "ok" : "bad";
    return sf[i] === true ? "ok" : sf[i] === false ? "bad" : "ask";
  }, [keys, picks, self]);
  const tally = (pk, sf) => {
    let right = 0, wrong = 0, skipped = 0, ask = 0;
    for (let i = 0; i < n; i++) {
      const v = verdict(i, pk, sf);
      if (v === "ok") right++; else if (v === "bad") wrong++; else if (v === "skip") skipped++; else ask++;
    }
    return { right, wrong, skipped, ask, total: n };
  };
  const save = (pk, sf, s) => {
    const t = tally(pk, sf);
    saveSetResult(rkey, setIdx, { ...t, sec: s, picks: pk, self: sf });
  };

  const submit = useCallback(() => {
    if (!running) return;
    const s = SET_MIN * 60 - left;
    setSec(s); setDone(true); setCur(0);
    save(picks, self, s);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, left, picks, self]);
  useEffect(() => { if (running && left === 0) submit(); }, [running, left, submit]);

  const open = (i, how) => {
    const prev = how === "result" ? results[i] : null;
    setSetIdx(i); setCur(0); setReview({});
    setPicks(prev ? prev.picks || {} : {});
    setSelf(prev ? prev.self || {} : {});
    setSec(prev ? prev.sec || 0 : 0);
    setDone(how === "result");
    setLeft(SET_MIN * 60);
  };
  const back = () => { setSetIdx(null); setDone(false); };
  const setMine = (i, v) => {
    const sf = { ...self, [i]: v };
    setSelf(sf);
    save(picks, sf, sec);
  };

  // ───────── parda 1: set chuno ─────────
  if (setIdx === null) {
    const doneSets = Array.from({ length: setCount }, (_, i) => results[i]).filter(Boolean).length;
    return (
      <div className="tbx tbx-sets">
        <header className="tbx-head">
          <div className="tbx-title"><b>Answers · Sets</b><small>{all.length} sawaal — 25-25 ke {setCount} set · har set {SET_MIN} minute</small></div>
          <div className="tbx-head__r"><span className="tbx-today">✅ Set ho gaye: <b>{doneSets}</b> / {setCount}</span></div>
        </header>
        {tabs}
        <div className="tbx-setsbody">
          <div className="setgrid">
            {Array.from({ length: setCount }, (_, i) => {
              const a = i * SET_SIZE;
              const chunk = all.slice(a, a + SET_SIZE);
              const r = results[i];
              return (
                <div key={i} className={`setcard${r ? " is-done" : ""}`}>
                  <button type="button" className="setcard__open" onClick={() => open(i, r ? "result" : "test")}>
                    <span className="setcard__n">Set {i + 1}{r ? " ✓" : ""}</span>
                    <span className="setcard__meta">Q {a + 1}–{a + chunk.length} · {chunk.length} questions</span>
                    <span className="setcard__bar"><i style={{ width: `${r ? Math.round((r.right / chunk.length) * 100) : 0}%` }} /></span>
                    {r ? (
                      <span className="setcard__score">{fmtMarks(marksOf(r))}/{maxMarks(r.total)} marks · {r.right}/{r.total} sahi · {accuracyOf(r)}%{r.ask ? ` · ${r.ask} jaanchna baaki` : ""}</span>
                    ) : null}
                  </button>
                  {r ? (
                    <span className="setcard__acts">
                      <button type="button" className="btn btn--sm" onClick={() => open(i, "test")}>🔁 Attempt again</button>
                      <button type="button" className="btn btn--ghost btn--sm" onClick={() => open(i, "result")}>📖 Result</button>
                    </span>
                  ) : (
                    <span className="setcard__go">▶ Test shuru karo · ⏱ {SET_MIN} min</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ───────── parda 2: test / natija ─────────
  const at = Math.min(cur, n - 1);
  const r = qs[at];
  const num = (i) => setIdx * SET_SIZE + i + 1;
  const opts = optsOf(r);
  const t = tally(picks, self);
  const answered = Object.keys(picks).length;
  const marked = Object.keys(review).filter((k) => review[k]).length;
  const go = (i) => setCur(Math.max(0, Math.min(n - 1, i)));
  const v = done ? verdict(at) : null;
  const cellCls = (i) => {
    if (done) {
      const x = verdict(i);
      return x === "ok" ? "is-ok" : x === "bad" ? "is-bad" : x === "ask" ? "is-ask" : "";
    }
    return review[i] ? "is-mark" : picks[i] != null ? "is-ok" : "";
  };
  return (
    <div className={`tbx tbx-test${done ? " is-done" : " is-run"}${side ? " is-side" : ""}`}>
      <header className="tbx-head">
        <div className="tbx-title">
          <b>{done ? "Result" : "Test"}</b>
          <small>Answers · Set {setIdx + 1} (Q {num(0)}–{num(n - 1)})</small>
        </div>
        <div className="tbx-head__r">
          {done ? (
            <>
              <span className="tbx-today">{fmtMarks(marksOf(t))}/{maxMarks(n)} marks · <b>{t.right}</b> sahi · {t.wrong} galat · {t.skipped} chhode{t.ask ? ` · ${t.ask} jaancho` : ""}</span>
              <span className="tbx-today">⏱ {clock(sec)}</span>
              <button type="button" className="tbx-hbtn" onClick={back}>← Sets</button>
            </>
          ) : (
            <>
              <span className={`tbx-today tbx-clock${left <= 60 ? " is-low" : ""}`}>⏱ <b>{clock(left)}</b></span>
              <button type="button" className="tbx-hbtn" onClick={() => { if (window.confirm("Test chhod ke wapas? Natija save nahi hoga.")) back(); }}>✕</button>
            </>
          )}
        </div>
      </header>
      <div className="tbx-body">
        <section className="tbx-main">
          <div className="tbx-sec"><span>SECTIONS</span><b className="tbx-tab">Set {setIdx + 1}</b></div>
          <div className="tbx-scroll">
            <div className="tbx-qh">
              <b>Question No.{num(at)}</b>
              {done ? (
                <span className={`tbx-badge${v === "ok" ? " is-ok" : v === "bad" ? " is-bad" : ""}`}>{v === "ok" ? "Correct" : v === "bad" ? "Incorrect" : v === "skip" ? "Skipped" : "Jaancho"}</span>
              ) : picks[at] != null ? <span className="tbx-badge is-ok">Answered</span> : <span className="tbx-badge">Not answered</span>}
            </div>
            <div className="tbx-q">
              {ctx.renderCard(r, ctx.index.get(r.id) ?? 0, false, done ? {} : { chatLook: true, savedPick: null, savedHidden: false })}
            </div>
            <div className="tbx-opts">
              {opts.map((o, k) => {
                const cls = done
                  ? (keys[at] === k ? " is-key" : "") + (picks[at] === k ? (keys[at] >= 0 ? (keys[at] === k ? " is-ok" : " is-bad") : " is-mine") : "")
                  : picks[at] === k ? " is-pick" : "";
                return (
                  <label key={k} className={`tbx-opt${cls}`}>
                    <input type="radio" name={`o${at}`} checked={picks[at] === k} disabled={done} onChange={() => setPicks((p) => ({ ...p, [at]: k }))} />
                    <b>{L[k]}</b>{o ? <span>{o}</span> : null}
                  </label>
                );
              })}
            </div>
            {done && picks[at] != null && keys[at] < 0 ? (
              <div className="tbx-self">
                <span>Sahi option record mein nahi — jawab dekh kar khud batao: tumhara <b>{L[picks[at]]}</b></span>
                <button type="button" className={self[at] === true ? "is-on is-ok" : ""} onClick={() => setMine(at, true)}>✓ Sahi tha</button>
                <button type="button" className={self[at] === false ? "is-on is-bad" : ""} onClick={() => setMine(at, false)}>✗ Galat tha</button>
              </div>
            ) : null}
          </div>
          <footer className="tbx-foot">
            <button type="button" className="tbx-btn tbx-prev" onClick={() => go(at - 1)} disabled={at <= 0}>Previous</button>
            {!done ? (
              <span className="tbx-foot__acts">
                <button type="button" className="tbx-btn" onClick={() => { setReview((x) => ({ ...x, [at]: !x[at] })); go(at + 1); }}>Mark for Review &amp; Next</button>
                <button type="button" className="tbx-btn" onClick={() => setPicks((p) => { const c = { ...p }; delete c[at]; return c; })}>Clear</button>
              </span>
            ) : null}
            <button type="button" className="tbx-btn tbx-next" onClick={() => go(at + 1)} disabled={at >= n - 1}>{done ? "Next" : "Save & Next"}</button>
          </footer>
          <button type="button" className="tbx-arrow" onClick={() => setSide((x) => !x)} aria-label="Panel">{side ? "›" : "‹"}</button>
        </section>
        <aside className="tbx-side">
          <div className="tbx-user"><i>👤</i><b>Set {setIdx + 1}</b></div>
          {done ? (
            <div className="tbx-legend tbx-legend--3">
              <span><i className="is-ok">{t.right}</i>Correct</span>
              <span><i className="is-bad">{t.wrong}</i>Incorrect</span>
              <span><i>{t.skipped}</i>Unattempted</span>
              {t.ask ? <span><i className="is-ask">{t.ask}</i>Jaancho</span> : null}
            </div>
          ) : (
            <div className="tbx-legend tbx-legend--3">
              <span><i className="is-ok">{answered}</i>Answered</span>
              <span><i>{n - answered}</i>Not answered</span>
              <span><i className="is-mark">{marked}</i>Marked</span>
            </div>
          )}
          <div className="tbx-sechd">SECTION : <span>Set {setIdx + 1}</span></div>
          <div className="tbx-grid">
            {qs.map((x, i) => (
              <button key={x.id} type="button" className={`${cellCls(i)}${i === at ? " is-cur" : ""}`} onClick={() => go(i)}>{num(i)}</button>
            ))}
          </div>
          <div className="tbx-sidefoot">
            {done
              ? <button type="button" className="tbx-btn" onClick={back}>Sets</button>
              : <button type="button" className="tbx-btn tbx-submit" onClick={() => { if (window.confirm(`Submit karein? ${answered}/${n} ka jawab diya hai.`)) submit(); }}>Submit Test</button>}
          </div>
        </aside>
      </div>
    </div>
  );
}
