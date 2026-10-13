"use client";

// 📝 PYQ ke SET — har PYQ chapter 25-25 ke tukdon mein, har set 15 minute ka
// TEST, Testbook jaisa (Answers ke Sets — components/AnswersSets — wala hi
// roop). Owner: "baaki pyq mein bhi laga de same theme same type".
//
// Purana set system (components/QBoard) jaisa hi hisaab: card ko ExamMode
// context se `locked` milta hai (jawab chhupa), option chunte hi palette, aur
// Submit par poora set ek saath khulta hai. Natija lib/settests mein usi
// chapter-key se (QBoard wale purane natije bhi dikh jaate hain). Submit par
// wahi bookkeeping jo QBoard karta tha: stats, Mistake Notebook, "ho gaya",
// aaj ki ginti.
//
// 🔁 Jo galat hua ya chhoda — subject ki thaili (lib/setmiss) mein copy, aur
// isi parde par "Galti / Skip" ke naye set ban kar dikhte hain. Un set mein
// sahi kar diya to thaili se bahar.
//
// 📖 Padho tab = page ka purana roop (PyqDrill / 33 · Do pane) jaisa tha.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { ExamModeProvider } from "./ExamMode";
import PyqQuestionCard from "./PyqQuestionCard";
import MathQuestionCard from "./MathQuestionCard";
import ReasonQuestionCard from "./ReasonQuestionCard";
import { getChapterResults, saveSetResult, accuracyOf, marksOf, maxMarks, fmtMarks } from "@/lib/settests";
import { getMiss, addMiss, removeMiss } from "@/lib/setmiss";
import { markDoneMany, doneKeyFor } from "@/lib/qdone";
import { countMark } from "@/lib/qcounter";
import { recordQuizAttempts } from "@/lib/qreview";
import { recordAttempts } from "@/lib/qstats";
import { subjectOfPath } from "@/lib/pomo";
import "./answers-play.css";

const SET_SIZE = 25;
const SET_MIN = 15;
const MODE = "cgl.pyq.mode";
const two = (n) => String(n).padStart(2, "0");
const clock = (s) => `${two(Math.floor(Math.max(0, s) / 60))}:${two(Math.max(0, s) % 60)}`;
const hasKey = (q) => typeof q?.answer === "number";
const SUBS = { maths: "math", math: "math", reasoning: "reasoning", english: "english", gs: "gs" };
const SUB_LABEL = { math: "Maths", reasoning: "Reasoning", english: "English", gs: "GS" };

// Galti wale set mein sawaal alag-alag bank ke — card shakl dekh kar.
function cardFor(q, i, sub, rk) {
  const img = q && (q.qImg || q.optImgs || q.figOpts || q.qText != null);
  const name = `🔁 Galti / Skip · ${SUB_LABEL[sub] || ""}`;
  if (img && sub === "math") return <MathQuestionCard key={doneKeyFor(q)} q={q} index={i} subject="math" resumeKey={rk} chapterName={name} />;
  if (img && sub === "reasoning") return <ReasonQuestionCard key={doneKeyFor(q)} q={q} index={i} subject="reasoning" resumeKey={rk} chapterName={name} />;
  return <PyqQuestionCard key={doneKeyFor(q)} q={q} index={i} subject={sub} resumeKey={rk} chapterName={name} />;
}

export default function PyqSets({ list, subject, resumeKey, title = "PYQ", renderCard, padho }) {
  const path = usePathname() || "";
  const sub = SUBS[subject] || SUBS[subjectOfPath(path)] || "gs";
  const rk = resumeKey || `pyq:${path}`;
  const all = useMemo(() => list || [], [list]);
  const setCount = Math.ceil(all.length / SET_SIZE);

  const [mode, setMode] = useState("sets");
  useEffect(() => { try { const m = localStorage.getItem(MODE); if (m) setMode(m); } catch { /* ignore */ } }, []);
  const pickMode = (m) => { setMode(m); try { localStorage.setItem(MODE, m); } catch { /* ignore */ } };

  const [results, setResults] = useState({});
  const [miss, setMissList] = useState([]);
  useEffect(() => {
    const on = () => { setResults(getChapterResults(rk)); setMissList(getMiss(sub)); };
    on();
    window.addEventListener("cgl:settest-changed", on);
    window.addEventListener("cgl:setmiss", on);
    window.addEventListener("cgl:sync-applied", on);
    return () => {
      window.removeEventListener("cgl:settest-changed", on);
      window.removeEventListener("cgl:setmiss", on);
      window.removeEventListener("cgl:sync-applied", on);
    };
  }, [rk, sub]);
  const missCount = Math.ceil(miss.length / SET_SIZE);

  // open = { kind: "set" | "miss", i }
  const [open, setOpen] = useState(null);
  const [qs, setQs] = useState([]);
  const [done, setDone] = useState(false);
  const [cur, setCur] = useState(0);
  const [picks, setPicks] = useState({});     // i -> { opt, correct }
  const [review, setReview] = useState({});
  const [left, setLeft] = useState(SET_MIN * 60);
  const [sec, setSec] = useState(0);
  const [side, setSide] = useState(true);
  const [round, setRound] = useState(0);
  const retryRef = useRef(false);
  const regRef = useRef({});
  const register = useCallback((i, qq) => { regRef.current[i] = qq; }, []);
  const scrollRef = useRef(null);
  const running = !!open && !done;
  const n = qs.length;

  useEffect(() => {
    if (!running) return undefined;
    const t = setInterval(() => setLeft((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [running]);
  useEffect(() => {
    if (!open) return undefined;
    document.body.classList.add(running ? "exam-on" : "sets-res");
    return () => { document.body.classList.remove("exam-on"); document.body.classList.remove("sets-res"); };
  }, [open, running]);

  const start = (kind, i, how) => {
    const src = kind === "miss" ? miss : all;
    const chunk = src.slice(i * SET_SIZE, i * SET_SIZE + SET_SIZE);
    const prev = kind === "set" && how === "result" ? results[i] : null;
    retryRef.current = kind === "set" && how === "test" && !!results[i];
    regRef.current = {};
    setQs(chunk); setOpen({ kind, i }); setCur(0); setReview({});
    setPicks(prev && prev.picks ? prev.picks : {});
    setSec(prev ? prev.sec || 0 : 0);
    setDone(how === "result");
    setLeft(SET_MIN * 60);
    setRound((r) => r + 1);
    setSide(typeof window === "undefined" || window.innerWidth > 900);
  };
  const back = () => { setOpen(null); setDone(false); setQs([]); };

  const keyed = qs.map((q, i) => (hasKey(q) ? i : -1)).filter((i) => i >= 0);
  const right = keyed.filter((i) => picks[i]?.correct).length;
  const answered = keyed.filter((i) => picks[i]).length;
  const wrong = answered - right;

  const submit = useCallback(() => {
    if (!running) return;
    const s = SET_MIN * 60 - left;
    setSec(s); setDone(true); setCur(0);
    if (open.kind === "set") {
      saveSetResult(rk, open.i, {
        right, wrong, skipped: keyed.length - answered, total: keyed.length, sec: s,
        picks: Object.fromEntries(Object.entries(picks).map(([k, v]) => [k, { opt: v.opt, correct: v.correct }])),
      });
    }
    // QBoard jaisa hisaab — stats, Mistake Notebook, ho gaya, aaj ki ginti.
    markDoneMany(qs);
    const rows = qs.map((qq, i) => ({ q: regRef.current[i] || qq, correct: !!picks[i]?.correct, attempted: !!picks[i], i })).filter(({ i }) => hasKey(qs[i]));
    const tried = rows.filter((r) => r.attempted);
    if (tried.length) recordAttempts(tried.map(({ q: qq, correct }) => ({ q: qq, correct })));
    recordQuizAttempts(rows.map(({ q: qq, correct }) => ({
      q: qq, correct, subject: qq?._subject || sub, source: "chapter",
      category: qq?._chapter || title, sec: 0,
      onlyExisting: retryRef.current || open.kind === "miss", fromPyq: true,
    })));
    for (const qq of qs) countMark(doneKeyFor(qq), qq?._subject || sub, true);
    // 🔁 Galat + chhode → thaili; galti wale set mein sahi → bahar.
    const bad = qs.filter((qq, i) => hasKey(qq) && !picks[i]?.correct);
    const good = qs.filter((qq, i) => hasKey(qq) && picks[i]?.correct);
    addMiss(sub, bad);
    if (open.kind === "miss") removeMiss(sub, good);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, left, picks, qs, open, rk, sub, title]);
  useEffect(() => { if (running && left === 0) submit(); }, [running, left, submit]);

  const tabs = (
    <div className="tbx-sec">
      <span>SECTIONS</span>
      <button type="button" className={`tbx-tab${mode !== "sets" ? " is-on" : ""}`} onClick={() => pickMode("padho")}>📖 Padho</button>
      <button type="button" className={`tbx-tab${mode === "sets" ? " is-on" : ""}`} onClick={() => pickMode("sets")}>📝 Sets · Test</button>
    </div>
  );

  // ───────── Padho — page ka purana roop ─────────
  if (mode !== "sets" && !open) {
    return (
      <>
        <div className="tbx tbx-inline tbx-tabsonly">{tabs}</div>
        {typeof padho === "function" ? padho(() => pickMode("sets")) : padho}
      </>
    );
  }

  // ───────── parda 1: set chuno ─────────
  if (!open) {
    const doneSets = Array.from({ length: setCount }, (_, i) => results[i]).filter(Boolean).length;
    return (
      <div className="tbx tbx-inline tbx-sets">
        <header className="tbx-head">
          <div className="tbx-title"><b>{title} · Sets</b><small>{all.length} sawaal — 25-25 ke {setCount} set · har set {SET_MIN} minute</small></div>
          <div className="tbx-head__r"><span className="tbx-today">✅ Set ho gaye: <b>{doneSets}</b> / {setCount}</span></div>
        </header>
        {tabs}
        <div className="tbx-setsbody">
          {miss.length ? (
            <>
              <h3 className="tbx-setsh">🔁 Galti / Skip wale — {SUB_LABEL[sub]} ({miss.length} sawaal)</h3>
              <div className="setgrid">
                {Array.from({ length: missCount }, (_, i) => {
                  const a = i * SET_SIZE;
                  const c = Math.min(SET_SIZE, miss.length - a);
                  return (
                    <div key={`m${i}`} className="setcard is-miss">
                      <button type="button" className="setcard__open" onClick={() => start("miss", i, "test")}>
                        <span className="setcard__n">🔁 Galti Set {i + 1}</span>
                        <span className="setcard__meta">{c} questions · jo galat / chhode the</span>
                      </button>
                      <span className="setcard__go">▶ Test shuru karo · ⏱ {SET_MIN} min</span>
                    </div>
                  );
                })}
              </div>
              <h3 className="tbx-setsh">📚 Sets</h3>
            </>
          ) : null}
          <div className="setgrid">
            {Array.from({ length: setCount }, (_, i) => {
              const a = i * SET_SIZE;
              const chunk = all.slice(a, a + SET_SIZE);
              const r = results[i];
              return (
                <div key={i} className={`setcard${r ? " is-done" : ""}`}>
                  <button type="button" className="setcard__open" onClick={() => start("set", i, r ? "result" : "test")}>
                    <span className="setcard__n">Set {i + 1}{r ? " ✓" : ""}</span>
                    <span className="setcard__meta">Q {a + 1}–{a + chunk.length} · {chunk.length} questions</span>
                    <span className="setcard__bar"><i style={{ width: `${r ? Math.round((r.right / Math.max(1, chunk.length)) * 100) : 0}%` }} /></span>
                    {r ? <span className="setcard__score">{fmtMarks(marksOf(r))}/{maxMarks(r.total)} marks · {r.right}/{r.total} sahi · {accuracyOf(r)}%</span> : null}
                  </button>
                  {r ? (
                    <span className="setcard__acts">
                      <button type="button" className="btn btn--sm" onClick={() => start("set", i, "test")}>🔁 Attempt again</button>
                      <button type="button" className="btn btn--ghost btn--sm" onClick={() => start("set", i, "result")}>📖 Result</button>
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
  const q = qs[at];
  const isMiss = open.kind === "miss";
  const base = isMiss ? 0 : open.i * SET_SIZE;
  const num = (i) => base + i + 1;
  const label = isMiss ? `Galti Set ${open.i + 1}` : `Set ${open.i + 1}`;
  const marked = Object.keys(review).filter((k) => review[k]).length;
  const go = (i) => { setCur(Math.max(0, Math.min(n - 1, i))); if (scrollRef.current) scrollRef.current.scrollTop = 0; if (typeof window !== "undefined" && window.innerWidth <= 900) setSide(false); };
  const st = (i) => (!hasKey(qs[i]) ? "skip" : picks[i] ? (picks[i].correct ? "ok" : "bad") : "skip");
  const cellCls = (i) => (done
    ? (st(i) === "ok" ? "is-ok" : st(i) === "bad" ? "is-bad" : "")
    : review[i] ? "is-mark" : picks[i] ? "is-ok" : "");
  const slot = {
    locked: !done, revealAll: done, index: at, register,
    pick: picks[at]?.opt,
    onPick: (opt, correct) => { if (!done) setPicks((p) => ({ ...p, [at]: { opt, correct } })); },
  };
  const card = isMiss || !renderCard ? cardFor(q, base + at, sub, rk) : renderCard(q, base + at, all);
  const v = done ? st(at) : null;
  const t = { right, wrong, skipped: keyed.length - answered };
  return (
    <div className={`tbx tbx-test${done ? " is-done" : " is-run"}${side ? " is-side" : ""}`}>
      <header className="tbx-head">
        <div className="tbx-title">
          <b>{done ? "Result" : "Test"}</b>
          <small>{title} · {label}{isMiss ? "" : ` (Q ${num(0)}–${num(n - 1)})`}</small>
        </div>
        <div className="tbx-head__r">
          {done ? (
            <>
              <span className="tbx-today">{fmtMarks(marksOf(t))}/{maxMarks(keyed.length)} marks · <b>{right}</b> sahi · {wrong} galat · {t.skipped} chhode</span>
              <span className="tbx-today">⏱ {clock(sec)}</span>
              <button type="button" className="tbx-hbtn" onClick={back}>← Sets</button>
            </>
          ) : (
            <>
              <span className={`tbx-today tbx-clock${left <= 60 ? " is-low" : ""}`}>⏱ <b>{clock(left)}</b></span>
              <button type="button" className="tbx-hbtn tbx-msub" onClick={() => { if (window.confirm(`Submit karein? ${answered}/${keyed.length} ka jawab diya hai.`)) submit(); }}>Submit</button>
              <button type="button" className="tbx-hbtn" onClick={() => { if (window.confirm("Test chhod ke wapas? Natija save nahi hoga.")) back(); }}>✕</button>
            </>
          )}
        </div>
      </header>
      <div className="tbx-body">
        <section className="tbx-main">
          <div className="tbx-sec"><span>SECTIONS</span><b className="tbx-tab">{label}</b></div>
          <div className="tbx-scroll" ref={scrollRef}>
            <div className="tbx-qh">
              <b>Question No.{num(at)}</b>
              {done
                ? <span className={`tbx-badge${v === "ok" ? " is-ok" : v === "bad" ? " is-bad" : ""}`}>{v === "ok" ? "Correct" : v === "bad" ? "Incorrect" : "Skipped"}</span>
                : picks[at] ? <span className="tbx-badge is-ok">Answered</span> : <span className="tbx-badge">Not answered</span>}
            </div>
            <div className="tbx-q tbx-q--pyq" key={`${round}-${at}`}>
              <ExamModeProvider value={slot}>{card}</ExamModeProvider>
            </div>
          </div>
          <footer className="tbx-foot">
            <button type="button" className="tbx-btn tbx-prev" onClick={() => go(at - 1)} disabled={at <= 0}>Previous</button>
            {!done ? (
              <span className="tbx-foot__acts">
                <button type="button" className="tbx-btn" onClick={() => { setReview((x) => ({ ...x, [at]: !x[at] })); go(at + 1); }}>Mark for Review &amp; Next</button>
                <button type="button" className="tbx-btn" onClick={() => { setPicks((p) => { const c = { ...p }; delete c[at]; return c; }); setRound((r) => r + 1); }}>Clear</button>
              </span>
            ) : null}
            <button type="button" className="tbx-btn tbx-next" onClick={() => go(at + 1)} disabled={at >= n - 1}>{done ? "Next" : "Save & Next"}</button>
          </footer>
          <button type="button" className="tbx-arrow" onClick={() => setSide((x) => !x)} aria-label="Panel">{side ? "›" : "‹"}</button>
        </section>
        <aside className="tbx-side">
          <div className="tbx-user"><i>👤</i><b>{label}</b></div>
          {done ? (
            <div className="tbx-legend tbx-legend--3">
              <span><i className="is-ok">{right}</i>Correct</span>
              <span><i className="is-bad">{wrong}</i>Incorrect</span>
              <span><i>{t.skipped}</i>Unattempted</span>
            </div>
          ) : (
            <div className="tbx-legend tbx-legend--3">
              <span><i className="is-ok">{answered}</i>Answered</span>
              <span><i>{keyed.length - answered}</i>Not answered</span>
              <span><i className="is-mark">{marked}</i>Marked</span>
            </div>
          )}
          <div className="tbx-sechd">SECTION : <span>{label}</span></div>
          <div className="tbx-grid">
            {qs.map((x, i) => (
              <button key={doneKeyFor(x) + i} type="button" className={`${cellCls(i)}${i === at ? " is-cur" : ""}`} onClick={() => go(i)}>{num(i)}</button>
            ))}
          </div>
          <div className="tbx-sidefoot">
            {done
              ? <button type="button" className="tbx-btn" onClick={back}>Sets</button>
              : <button type="button" className="tbx-btn tbx-submit" onClick={() => { if (window.confirm(`Submit karein? ${answered}/${keyed.length} ka jawab diya hai.`)) submit(); }}>Submit Test</button>}
          </div>
        </aside>
      </div>
    </div>
  );
}
