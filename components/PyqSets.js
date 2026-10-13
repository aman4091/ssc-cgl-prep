"use client";

// 📝 PYQ ke SET — har PYQ chapter 25-25 ke tukdon mein, har set 15 minute ka
// TEST. Owner: "padho hta de jaha pr sets hai" — ab sirf sets. Test ka parda
// owner ke Testbook/TCS screenshot jaisa (components/TestPage).
//
// Purana set system (components/QBoard) jaisa hisaab: card ko ExamMode context
// se `locked` milta hai (jawab chhupa), option chunte hi palette, aur Submit
// par poora set ek saath khulta hai. Natija lib/settests mein usi chapter-key
// se. Submit par wahi bookkeeping jo QBoard karta tha: stats, Mistake
// Notebook, "ho gaya", aaj ki ginti.
//
// 🔁 Jo galat hua ya chhoda → lib/wrongsets (page /wrong-sets) ke set mein.
// Wrong Sets wala page bhi yahi component chalata hai (`sets` + `sub` dekar),
// to wahan ka galat/chhoda phir agle wrong set mein — chakkar chalta rehta.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { ExamModeProvider } from "./ExamMode";
import PyqQuestionCard from "./PyqQuestionCard";
import MathQuestionCard from "./MathQuestionCard";
import ReasonQuestionCard from "./ReasonQuestionCard";
import TestPage, { clock } from "./TestPage";
import { getChapterResults, saveSetResult, accuracyOf, marksOf, maxMarks, fmtMarks } from "@/lib/settests";
import { pushWrong } from "@/lib/wrongsets";
import { progsFor, saveProg, clearProg } from "@/lib/setprog";
import { markDoneMany, doneKeyFor } from "@/lib/qdone";
import { countMark } from "@/lib/qcounter";
import { recordQuizAttempts } from "@/lib/qreview";
import { recordAttempts } from "@/lib/qstats";
import { subjectOfPath } from "@/lib/pomo";
import "./answers-play.css";

const SET_SIZE = 25;
const SET_MIN = 15;
// Kuch bank (jaise Medieval) mein jawab "2" (text) hai — pehle wo "bina
// jawab" gina jata tha, isliye galat sawaal Wrong Sets mein nahi jaate the.
const hasKey = (q) => typeof q?.answer === "number";
const normQ = (q) => (q && typeof q.answer === "string" && /^\s*\d+\s*$/.test(q.answer) ? { ...q, answer: Number(q.answer) } : q);
const SUBS = { maths: "math", math: "math", reasoning: "reasoning", english: "english", gs: "gs" };
export const SUB_LABEL = { math: "Maths", reasoning: "Reasoning", english: "English", gs: "GS" };

// Alag-alag bank ke sawaal (Wrong Sets) — card shakl dekh kar.
function cardFor(q, i, sub0, rk) {
  const sub = (q && q._sub) || sub0;
  const img = q && (q.qImg || q.optImgs || q.figOpts || q.qText != null);
  const name = `🔁 Wrong Sets · ${SUB_LABEL[sub] || ""}`;
  if (img && sub === "math") return <MathQuestionCard key={doneKeyFor(q)} q={q} index={i} subject="math" resumeKey={rk} chapterName={name} />;
  if (img && sub === "reasoning") return <ReasonQuestionCard key={doneKeyFor(q)} q={q} index={i} subject="reasoning" resumeKey={rk} chapterName={name} />;
  return <PyqQuestionCard key={doneKeyFor(q)} q={q} index={i} subject={sub} resumeKey={rk} chapterName={name} />;
}

export default function PyqSets({ list, sets: given, sub: subIn, subject, resumeKey, title = "PYQ", renderCard, setName = "Set", empty }) {
  const path = usePathname() || "";
  const sub = subIn || SUBS[subject] || SUBS[subjectOfPath(path)] || "gs";
  const rk = resumeKey || `pyq:${path}`;
  const all = useMemo(() => list || [], [list]);
  // Set ki list — Wrong Sets apne set khud deta hai, warna 25-25 ke tukde.
  const sets = useMemo(() => {
    if (given) return given;
    const out = [];
    for (let i = 0; i < all.length; i += SET_SIZE) out.push(all.slice(i, i + SET_SIZE));
    return out;
  }, [given, all]);
  const baseOf = (i) => (given ? 0 : i * SET_SIZE);
  const total = sets.reduce((a, s) => a + s.length, 0);

  const [results, setResults] = useState({});
  const [progs, setProgs] = useState({});
  useEffect(() => {
    const on = () => { setResults(getChapterResults(rk)); setProgs(progsFor(rk)); };
    on();
    window.addEventListener("cgl:settest-changed", on);
    window.addEventListener("cgl:sync-applied", on);
    return () => { window.removeEventListener("cgl:settest-changed", on); window.removeEventListener("cgl:sync-applied", on); };
  }, [rk]);

  const [open, setOpen] = useState(null);      // set ka number
  const [qs, setQs] = useState([]);
  const [done, setDone] = useState(false);
  const [cur, setCur] = useState(0);
  const [picks, setPicks] = useState({});      // i -> { opt, correct }
  const [review, setReview] = useState({});
  const [seen, setSeen] = useState({});
  const [left, setLeft] = useState(SET_MIN * 60);
  const [sec, setSec] = useState(0);
  const [round, setRound] = useState(0);
  const retryRef = useRef(false);
  const regRef = useRef({});
  const register = useCallback((i, qq) => { regRef.current[i] = qq; }, []);
  const running = open !== null && !done;
  const n = qs.length;

  useEffect(() => {
    if (!running) return undefined;
    const t = setInterval(() => setLeft((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [running]);
  useEffect(() => {
    if (open === null) return undefined;
    document.body.classList.add("exam-on");
    return () => document.body.classList.remove("exam-on");
  }, [open]);
  useEffect(() => { if (open !== null) setSeen((s) => (s[cur] ? s : { ...s, [cur]: true })); }, [cur, open]);

  // how: "test" (naya) | "resume" (chhoda hua) | "result"
  const start = (i, how) => {
    const prev = how === "result" ? results[i] : null;
    const pg = how === "resume" ? progs[i] : null;
    if (how === "test") clearProg(rk, i);
    retryRef.current = how !== "result" && !!results[i];
    regRef.current = {};
    setQs((sets[i] || []).map(normQ)); setOpen(i);
    setCur(pg ? pg.cur || 0 : 0); setReview(pg ? pg.review || {} : {}); setSeen(pg ? pg.seen || { 0: true } : { 0: true });
    setPicks(pg ? pg.picks || {} : prev && prev.picks ? prev.picks : {});
    setSec(prev ? prev.sec || 0 : 0);
    setDone(how === "result");
    setLeft(pg ? Math.max(1, pg.left || 0) : SET_MIN * 60);
    setRound((r) => r + 1);
  };
  const back = () => { setOpen(null); setDone(false); setQs([]); setProgs(progsFor(rk)); };
  // ⏸ Chalte test ka haal har badlav par — chhod do to set par Resume.
  useEffect(() => {
    if (!running) return;
    saveProg(rk, open, { picks, review, seen, cur, left });
  }, [running, rk, open, picks, review, seen, cur, left]);

  const keyed = qs.map((q, i) => (hasKey(q) ? i : -1)).filter((i) => i >= 0);
  const right = keyed.filter((i) => picks[i]?.correct).length;
  const answered = keyed.filter((i) => picks[i]).length;
  const wrong = answered - right;

  const submit = useCallback(() => {
    if (!running) return;
    const s = SET_MIN * 60 - left;
    setSec(s); setDone(true); setCur(0);
    clearProg(rk, open);
    saveSetResult(rk, open, {
      right, wrong, skipped: keyed.length - answered, total: keyed.length, sec: s,
      picks: Object.fromEntries(Object.entries(picks).map(([k, v]) => [k, { opt: v.opt, correct: v.correct }])),
    });
    // QBoard jaisa hisaab — stats, Mistake Notebook, ho gaya, aaj ki ginti.
    markDoneMany(qs);
    const rows = qs.map((qq, i) => ({ q: regRef.current[i] || qq, correct: !!picks[i]?.correct, attempted: !!picks[i], i })).filter(({ i }) => hasKey(qs[i]));
    const tried = rows.filter((r) => r.attempted);
    if (tried.length) recordAttempts(tried.map(({ q: qq, correct }) => ({ q: qq, correct })));
    recordQuizAttempts(rows.map(({ q: qq, correct }) => ({
      q: qq, correct, subject: qq?._subject || sub, source: "chapter",
      category: qq?._chapter || title, sec: 0,
      onlyExisting: retryRef.current || !!given, fromPyq: true,
    })));
    for (const qq of qs) countMark(doneKeyFor(qq), qq?._subject || sub, true);
    // 🔁 Galat + chhode → Wrong Sets (wahan bhi — chakkar).
    pushWrong(qs.filter((qq, i) => hasKey(qq) && !picks[i]?.correct).map((qq) => ({ ...qq, _sub: qq._sub || sub })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, left, picks, qs, open, rk, sub, title, given]);
  useEffect(() => { if (running && left === 0) submit(); }, [running, left, submit]);

  // ───────── parda 1: set chuno ─────────
  if (open === null) {
    const doneSets = sets.filter((_, i) => results[i]).length;
    return (
      <div className="tbx tbx-inline tbx-sets">
        <header className="tbx-head">
          <div className="tbx-title"><b>{title} · Sets</b><small>{total} sawaal — {sets.length} set · har set {SET_MIN} minute</small></div>
          <div className="tbx-head__r"><span className="tbx-today">✅ Set ho gaye: <b>{doneSets}</b> / {sets.length}</span></div>
        </header>
        <div className="tbx-setsbody">
          {!sets.length ? <p className="tbx-empty">{empty || "Abhi koi set nahi."}</p> : null}
          <div className="setgrid">
            {sets.map((chunk, i) => {
              const a = baseOf(i);
              const r = results[i];
              const pg = progs[i];
              const L = Math.max(1, chunk.length);
              return (
                <div key={i} className={`setcard${r ? " is-done" : ""}${pg ? " is-paused" : ""}`}>
                  {pg ? <button type="button" className="setcard__resume" onClick={() => start(i, "resume")}>⏸ Resume · {clock(pg.left || 0)} bacha</button> : null}
                  <button type="button" className="setcard__open" onClick={() => start(i, pg ? "resume" : r ? "result" : "test")}>
                    <span className="setcard__n">{setName} {i + 1}{r ? " ✓" : ""}</span>
                    <span className="setcard__meta">{given ? `${chunk.length} questions` : `Q ${a + 1}–${a + chunk.length} · ${chunk.length} questions`}</span>
                    <span className="setcard__bar setcard__bar--2">
                      <i style={{ width: `${r ? Math.round((r.right / L) * 100) : 0}%` }} />
                      <i className="is-bad" style={{ width: `${r ? Math.round(((r.wrong || 0) / L) * 100) : 0}%` }} />
                    </span>
                    {r ? <span className="setcard__score">{fmtMarks(marksOf(r))}/{maxMarks(r.total)} marks · {r.right} sahi · <em className="setcard__wrong">{r.wrong || 0} wrong</em> · {accuracyOf(r)}%</span> : null}
                  </button>
                  {r ? (
                    <span className="setcard__acts">
                      <button type="button" className="btn btn--sm" onClick={() => start(i, "test")}>🔁 Attempt again</button>
                      <button type="button" className="btn btn--ghost btn--sm" onClick={() => start(i, "result")}>📖 Result</button>
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
  const base = baseOf(open);
  const numOf = (i) => base + i + 1;
  const marked = Object.keys(review).filter((k) => review[k]).length;
  const go = (i) => setCur(Math.max(0, Math.min(n - 1, i)));
  const state = (i) => {
    if (done) return !hasKey(qs[i]) || !picks[i] ? "skip" : picks[i].correct ? "ok" : "bad";
    if (review[i]) return "mark";
    if (picks[i]) return "ans";
    return seen[i] ? "not" : "new";
  };
  const slot = {
    locked: !done, revealAll: done, index: at, register,
    pick: picks[at]?.opt,
    // Wahi option dobara chuno to saaf (owner). Card apna chuna hua mount par
    // padhta hai — saaf karne par naya key (round) dekar dobara banta hai.
    onPick: (opt) => {
      if (done) return;
      const ok = Number(qs[at]?.answer) === opt;
      if (picks[at]?.opt === opt) { setPicks((p) => { const c = { ...p }; delete c[at]; return c; }); setRound((r) => r + 1); return; }
      setPicks((p) => ({ ...p, [at]: { opt, correct: ok } }));
    },
  };
  const card = given || !renderCard ? cardFor(q, base + at, sub, rk) : renderCard(q, base + at, all);
  const t = { right, wrong, skipped: keyed.length - answered };
  return (
    <TestPage
      title={`${title} · ${setName} ${open + 1}`}
      section={`${setName} ${open + 1}`}
      n={n} at={at} onGo={go} numOf={numOf} state={state} left={left} done={done}
      answered={answered} marked={marked}
      tally={{ ...t, marks: `${fmtMarks(marksOf(t))}/${maxMarks(keyed.length)}`, time: clock(sec) }}
      onMark={() => { setReview((x) => ({ ...x, [at]: !x[at] })); go(at + 1); }}
      onNext={() => go(at + 1)}
      onSubmit={submit}
      onBack={back}
      onQuit={back}
    >
      <div key={`${round}-${at}`}>
        <ExamModeProvider value={slot}>{card}</ExamModeProvider>
      </div>
    </TestPage>
  );
}
