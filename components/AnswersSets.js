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

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getChapterResults, saveSetResult, moveResult, accuracyOf, marksOf, maxMarks, fmtMarks } from "@/lib/settests";
import TestPage, { clock } from "./TestPage";
import { progsFor, saveProg, clearProg } from "@/lib/setprog";
import { hashStr } from "@/lib/syncitems";

const SET_SIZE = 25;
const SET_MIN = 15;
const L = "ABCD";

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

export default function AnswersSets({ ctx }) {
  const all = ctx.list;
  const subs = [...new Set(all.map((x) => ctx.bucketOf(x)))].sort();
  const rkey = `answers:${subs.join("+") || "all"}`;
  const setCount = Math.ceil(all.length / SET_SIZE);
  // Har SET ki pehchaan uske sawaalon se (PyqSets jaisa) — list badle / naye
  // sawaal judein to purane set ka natija galat set par na chipke.
  const sigs = useMemo(() => Array.from({ length: setCount }, (_, i) => `s${hashStr(all.slice(i * SET_SIZE, i * SET_SIZE + SET_SIZE).map((r) => r.id).join("|"))}`), [all, setCount]);
  const kOf = (i) => sigs[i];
  const [results, setResults] = useState({});
  const [progs, setProgs] = useState({});
  useEffect(() => {
    const on = () => { setResults(getChapterResults(rkey)); setProgs(progsFor(rkey)); };
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
  // ⏱ Har sawaal par kitne second (Testbook jaisa "You: 00:11").
  const [times, setTimes] = useState({});
  const curRef = useRef(0);
  curRef.current = cur;
  const [seen, setSeen] = useState({});

  const qs = useMemo(() => (setIdx === null ? [] : all.slice(setIdx * SET_SIZE, setIdx * SET_SIZE + SET_SIZE)), [all, setIdx]);
  const keys = useMemo(() => qs.map(keyOf), [qs]);
  const n = qs.length;
  const running = setIdx !== null && !done;

  // Ghadi — 0 par apne aap submit.
  useEffect(() => {
    if (!running) return undefined;
    const t = setInterval(() => {
      setLeft((s) => (s > 0 ? s - 1 : 0));
      const c = curRef.current;
      setTimes((x) => ({ ...x, [c]: (x[c] || 0) + 1 }));
    }, 1000);
    return () => clearInterval(t);
  }, [running]);
  // Test ke dauraan 🚨 / 🍅 chhupe (QBoard jaisa).
  useEffect(() => {
    if (setIdx === null) return undefined;
    document.body.classList.add("exam-on");
    return () => document.body.classList.remove("exam-on");
  }, [setIdx]);
  useEffect(() => { if (setIdx !== null) setSeen((x) => (x[cur] ? x : { ...x, [cur]: true })); }, [cur, setIdx]);

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
    saveSetResult(rkey, kOf(setIdx), { ...t, sec: s, picks: pk, self: sf, times: times || {}, path: window.location.pathname + window.location.search.replace(/[?&]set=[^&]*/, "").replace(/^&/, "?"), title: `Answers · Set ${setIdx + 1}` });
  };

  const submit = useCallback(() => {
    if (!running) return;
    const s = SET_MIN * 60 - left;
    setSec(s); setDone(true); setCur(0);
    clearProg(rkey, kOf(setIdx));
    save(picks, self, s);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, left, picks, self, times]);
  useEffect(() => { if (running && left === 0) submit(); }, [running, left, submit]);

  // how: "test" (naya) | "resume" (chhoda hua) | "result"
  const open = (i, how) => {
    const prev = how === "result" ? results[kOf(i)] : null;
    const pg = how === "resume" ? progs[kOf(i)] : null;
    if (how === "test") clearProg(rkey, kOf(i));
    setSetIdx(i);
    setCur(pg ? pg.cur || 0 : 0); setReview(pg ? pg.review || {} : {}); setSeen(pg ? pg.seen || { 0: true } : { 0: true });
    setPicks(pg ? pg.picks || {} : prev ? prev.picks || {} : {});
    setSelf(prev ? prev.self || {} : {});
    setSec(prev ? prev.sec || 0 : 0);
    setTimes(pg ? pg.times || {} : prev ? prev.times || null : {});
    setDone(how === "result");
    setLeft(pg ? Math.max(1, pg.left || 0) : SET_MIN * 60);
  };
  const back = () => { setSetIdx(null); setDone(false); setProgs(progsFor(rkey)); };
  // 🩹 Set NUMBER wale purane natije ("#0", 13 Oct se) → set ki nayi pehchaan.
  useEffect(() => {
    for (let i = 0; i < setCount; i++) {
      const old = results[String(i)];
      if (!old || results[sigs[i]] || !(String(old.at || "") >= "2026-10-12T00:00")) continue;
      moveResult(rkey, String(i), sigs[i]);
    }
  }, [results, sigs, setCount, rkey]);

  // 🏠 Home ki report se "▶" — ?set=<pehchaan> se wahi set seedha.
  const autoRef = useRef(false);
  useEffect(() => {
    if (autoRef.current || !setCount || typeof window === "undefined") return;
    const want = new URLSearchParams(window.location.search).get("set");
    if (!want) return;
    const i = sigs.findIndex((x) => x === want);
    if (i < 0) return;
    autoRef.current = true;
    open(i, results[want] ? "result" : progs[want] ? "resume" : "test");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sigs, results, progs]);
  // ⏸ Chalte test ka haal — chhod do to set par Resume.
  useEffect(() => {
    if (!running) return;
    saveProg(rkey, kOf(setIdx), { picks, review, seen, cur, left, times, path: window.location.pathname + window.location.search, title: `${"Answers"} · Set ${(setIdx) + 1}` });
  }, [running, rkey, setIdx, picks, review, seen, cur, left, times, sigs]);
  const setMine = (i, v) => {
    const sf = { ...self, [i]: v };
    setSelf(sf);
    save(picks, sf, sec);
  };

  // ───────── parda 1: set chuno ─────────
  if (setIdx === null) {
    const doneSets = Array.from({ length: setCount }, (_, i) => results[kOf(i)]).filter(Boolean).length;
    return (
      <div className="tbx tbx-inline tbx-sets">
        <header className="tbx-head">
          <div className="tbx-title"><b>Answers · Sets</b><small>{all.length} sawaal — 25-25 ke {setCount} set · har set {SET_MIN} minute</small></div>
          <div className="tbx-head__r"><span className="tbx-today">✅ Set ho gaye: <b>{doneSets}</b> / {setCount}</span></div>
        </header>
        <div className="tbx-setsbody">
          <div className="setgrid">
            {Array.from({ length: setCount }, (_, i) => {
              const a = i * SET_SIZE;
              const chunk = all.slice(a, a + SET_SIZE);
              const r = results[kOf(i)];
              const pg = progs[kOf(i)];
              const L = Math.max(1, chunk.length);
              return (
                <div key={i} className={`setcard${r ? " is-done" : ""}${pg ? " is-paused" : ""}`}>
                  <button type="button" className="setcard__open" onClick={() => open(i, pg ? "resume" : r ? "result" : "test")}>
                    <span className="setcard__n">Set {i + 1}{r ? " ✓" : ""}</span>
                    <span className="setcard__meta">Q {a + 1}–{a + chunk.length} · {chunk.length} questions</span>
                    <span className="setcard__bar setcard__bar--2">
                      <i style={{ width: `${r ? Math.round((r.right / L) * 100) : 0}%` }} />
                      <i className="is-bad" style={{ width: `${r ? Math.round(((r.wrong || 0) / L) * 100) : 0}%` }} />
                    </span>
                    {r ? (
                      <span className="setcard__score">{fmtMarks(marksOf(r))}/{maxMarks(r.total)} marks · {r.right} sahi · <em className="setcard__wrong">{r.wrong || 0} wrong</em> · {accuracyOf(r)}%{r.ask ? ` · ${r.ask} jaanchna baaki` : ""}</span>
                    ) : null}
                  </button>
                  {pg ? (
                    <span className="setcard__acts">
                      <button type="button" className="btn btn--sm" onClick={() => open(i, "resume")}>Resume</button>
                      {r ? <button type="button" className="btn btn--ghost btn--sm" onClick={() => open(i, "result")}>📖 Result</button> : null}
                    </span>
                  ) : r ? (
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

  // ───────── parda 2: test / natija (components/TestPage — screenshot jaisa) ─────────
  const at = Math.min(cur, n - 1);
  const r = qs[at];
  // Set ke andar hamesha 1–25 (owner) — list ka asli number nahi.
  const num = (i) => i + 1;
  const opts = optsOf(r);
  const t = tally(picks, self);
  const answered = Object.keys(picks).length;
  const marked = Object.keys(review).filter((k) => review[k]).length;
  const go = (i) => setCur(Math.max(0, Math.min(n - 1, i)));
  const state = (i) => {
    if (done) return verdict(i);
    if (review[i]) return "mark";
    if (picks[i] != null) return "ans";
    return seen[i] ? "not" : "new";
  };
  return (
    <TestPage
      qTime={times ? times[at] || 0 : null}
      title={`Answers · Set ${setIdx + 1}`}
      section={`Set ${setIdx + 1}`}
      n={n} at={at} onGo={go} numOf={num} state={state} left={left} done={done}
      answered={answered} marked={marked}
      tally={{ ...t, marks: `${fmtMarks(marksOf(t))}/${maxMarks(n)}`, time: clock(sec) }}
      onMark={() => { setReview((x) => ({ ...x, [at]: !x[at] })); go(at + 1); }}
      onNext={() => go(at + 1)}
      onSubmit={submit}
      onBack={back}
      onQuit={back}
    >
      <div className="tbt-ansq">
        {ctx.renderCard(r, ctx.index.get(r.id) ?? 0, false, done ? {} : { chatLook: true, savedPick: null, savedHidden: false })}
      </div>
      <div className="tbt-opts">
        {opts.map((o, k) => {
          const cls = done
            ? (keys[at] === k ? " is-key" : "") + (picks[at] === k ? (keys[at] >= 0 ? (keys[at] === k ? "" : " is-bad") : " is-mine") : "")
            : "";
          return (
            <label key={k} className={`tbt-opt${cls}`}>
              <span><input type="radio" name={`o${at}`} checked={picks[at] === k} disabled={done} readOnly onClick={() => setPicks((p) => { const c = { ...p }; if (c[at] === k) delete c[at]; else c[at] = k; return c; })} /></span>
              <span>{o ? `${L[k]}) ${o}` : L[k]}</span>
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
    </TestPage>
  );
}
