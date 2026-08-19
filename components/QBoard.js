"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { doneKeyFor, getDoneSet, markDoneMany } from "@/lib/qdone";
import { getCounts, countMark, COUNTER_SUBJECTS } from "@/lib/qcounter";
import { recordQuizAttempts } from "@/lib/qreview";
import { recordAttempts } from "@/lib/qstats";
import { getChapterResults, saveSetResult, accuracyOf, marksOf, maxMarks, fmtMarks } from "@/lib/settests";
import { ExamModeProvider } from "./ExamMode";

// 📚 Ek PYQ chapter ka board — asli online test.
//
// Do parde hain:
//   1. SET — chapter 25-25 ke tukdon mein bat jata hai (Set 1, Set 2 …), har
//      ek card. Jo set ho chuka hai uspar uska natija dikhta hai aur dobara
//      kholne par poochha jata hai: phir se test, ya solutions.
//   2. TEST — 15 minute ka clock, ek waqt par EK question, daayin numbered
//      palette aur uske NEECHE hisaab.
//
// Set list ke ASLI kram se katte hain (Set 1 = Q 1-25, hamesha wahi) — "ho
// gaye neeche" wali chhantayi yahan jaan-boojh kar nahi hai. Warna ek question
// mark karte hi saare set apne question badal lete aur "Set 3 ka natija" ka
// koi matlab hi na rehta.
//
// Test QUIZ ki tarah chalta hai: option chunte hi sahi/galat NAHI batata.
// Timer ka matlab hi tab hai jab jawab aakhir mein khule — isliye card ko
// ExamMode context se `locked` milta hai aur wo apna answer block, rang aur
// "Saved to Wrong" wali line sab band rakhta hai. Submit dabate hi poore set
// ke answer ek saath khul jaate hain.
//
// Palette ka rang:
//   test ke dauraan — neela = baaki, HARA = jawab diya, PEELA = review
//   submit ke baad  — HARA = sahi, LAAL = galat, dhundhla = chhoda hua

const SET_SIZE = 25;
const SET_MIN = 15;              // ek set = 15 minute, SSC ke section jaisa

// Kuch imported paper mein kisi question ki key hi nahi hoti (`answer: null`).
// Aise question par har option galat nikalta hai — na kuch hara hota hai, na
// koi jawab sahi ginta hai. Unhe hisaab se BAHAR rakhte hain: na Right/Wrong
// mein, na Mistake Notebook mein. Warna wo har baar jhooti galti banate hain.
const hasKey = (q) => typeof q?.answer === "number";

const two = (n) => String(n).padStart(2, "0");
const clock = (s) => `${two(Math.floor(Math.max(0, s) / 60))}:${two(Math.max(0, s) % 60)}`;

export default function QBoard({
  list,                       // page ki apni list (uske filters ke BAAD)
  subject,                    // counter kis subject mein ginega
  resumeKey,                  // chapter ki pehchaan — natije isi naam se sambhalte hain
  title = "Test",             // Mistake Notebook mein kis naam se jaayega
  renderCard,                 // (q, index, wholeList) => <Card/>
  emptyText = "Yahan koi question nahi.",
  // Quiz ke liye: poori list EK hi test hai, set chunne ka parda nahi aata.
  // (Generated quiz aur notes wala quiz apne aap mein ek paper hote hain.)
  single = false,
  // Dobara-attempt wala quiz: galat/chhode question notebook mein NAYA record
  // nahi banayenge (jo pehle se hai wo sudhrega).
  noNotebook = false,
  onSubmit,                   // submit ke baad page ka apna kaam (vocab din, etc.)
}) {
  const [setIdx, setSetIdx] = useState(single ? 0 : null);
  const [mode, setMode] = useState("test");     // "test" | "solutions"
  const [cur, setCur] = useState(0);
  const [picks, setPicks] = useState({});       // set ke andar ka number -> { opt, correct }
  const [review, setReview] = useState({});     // number -> true (Mark for Review)
  const [leftSec, setLeftSec] = useState(SET_MIN * 60);
  // Submit ke baad dikhane ke liye: number -> seconds.
  const [times, setTimes] = useState({});
  const [done, setDone] = useState(false);      // Submit ho gaya (ya solutions mode)
  const [fs, setFs] = useState(false);
  const [ask, setAsk] = useState(null);         // popup: kis set ke liye poochh rahe hain
  const [results, setResults] = useState({});   // pehle diye hue test
  const [ver, setVer] = useState(0);
  const [counts, setCounts] = useState({});
  // Ye set pehle bhi diya ja chuka hai (ya quiz khud dobara-attempt hai).
  const retryRef = useRef(false);

  useEffect(() => { setCounts(getCounts()); }, []);
  useEffect(() => {
    const h = () => { setVer((v) => v + 1); setCounts(getCounts()); };
    window.addEventListener("cgl:qdone-changed", h);
    window.addEventListener("cgl:counter-changed", h);
    return () => {
      window.removeEventListener("cgl:qdone-changed", h);
      window.removeEventListener("cgl:counter-changed", h);
    };
  }, []);

  useEffect(() => { setResults(getChapterResults(resumeKey)); }, [resumeKey, ver]);

  const all = useMemo(() => list || [], [list]);
  const total = all.length;
  // `single` mein poori list ek hi set hai.
  const size = single ? Math.max(total, 1) : SET_SIZE;
  const setCount = Math.ceil(total / size);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const doneSet = useMemo(() => getDoneSet(), [ver]);
  const doneCount = useMemo(
    () => all.reduce((a, q) => a + (doneSet.has(doneKeyFor(q)) ? 1 : 0), 0),
    [all, doneSet],
  );

  // Naya chapter (ya naya filter) aaya to seedha set wale parde par.
  useEffect(() => {
    setSetIdx(single ? 0 : null); setAsk(null); setCur(0);
    setPicks({}); setReview({}); setTimes({}); setDone(false); setLeftSec(SET_MIN * 60);
    retryRef.current = noNotebook;
    timeRef.current = { spent: {}, mark: single ? Date.now() : 0, at: 0 };
  }, [resumeKey, total, single, noNotebook]);

  // Clock. Solutions dekhte waqt nahi chalta. 0 par khud submit ho jata hai —
  // timer ka matlab hi yahi hai.
  useEffect(() => {
    if (setIdx === null || done) return undefined;
    const t = setInterval(() => setLeftSec((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [setIdx, done]);

  // Test ke dauraan page ka apna sar (chapter ka naam, Aaj/Total/Ho gaye) chhup
  // jata hai — wo page banata hai, QBoard nahi, isliye body par nishaan lagta
  // hai aur CSS use chhupa deti hai. Submit ke baad sab wapas.
  const hideChrome = setIdx !== null && !done;
  useEffect(() => {
    if (!hideChrome) return undefined;
    document.body.classList.add("exam-on");
    return () => document.body.classList.remove("exam-on");
  }, [hideChrome]);

  // Full screen — wahi test ka page, bas poori screen par. Alag runner nahi:
  // timer, palette aur hisaab jaisa yahan hai waisa hi wahan dikhna chahiye.
  // Har question par kitna waqt laga.
  //
  // `spent` mein jama hota hai, aur `mark` batata hai ki abhi wale question par
  // kab aaye the. Question badalte hi (ya submit par) beech ka waqt us number
  // ke khaate mein chadh jata hai. Ref isliye — har second state badalne se
  // poora set dobara render hota, aur ye aankda sirf submit ke waqt chahiye.
  const timeRef = useRef({ spent: {}, mark: 0, at: 0 });
  const flushTime = useCallback(() => {
    const t = timeRef.current;
    if (!t.mark) return;
    const add = Math.round((Date.now() - t.mark) / 1000);
    if (add > 0) t.spent[t.at] = (t.spent[t.at] || 0) + add;
    t.mark = Date.now();
  }, []);

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

  const toTop = useCallback(() => {
    setTimeout(() => {
      const box = rootRef.current;
      if (document.fullscreenElement && box) box.scrollTo({ top: 0, behavior: "smooth" });
      else window.scrollTo({ top: 0, behavior: "smooth" });
    }, 40);
  }, []);

  const from = setIdx === null ? 0 : setIdx * size;
  const setQs = useMemo(
    () => (setIdx === null ? [] : all.slice(from, from + size)),
    [all, setIdx, from, size],
  );

  const openSet = (i, how) => {
    const stored = getChapterResults(resumeKey)[i];
    const prev = how === "solutions" ? stored : null;
    // Dobara de rahe ho? To notebook mein NAYA question nahi jayega.
    retryRef.current = how === "test" && !!stored;
    timeRef.current = { spent: {}, mark: Date.now(), at: 0 };
    setAsk(null);
    setSetIdx(i);
    setMode(how);
    setCur(0);
    setReview({});
    setPicks(prev?.picks
      ? Object.fromEntries(Object.entries(prev.picks).map(([k, v]) => [k, { opt: v.opt, correct: v.correct }]))
      : {});
    setTimes(prev?.times || {});
    setDone(how === "solutions");
    setLeftSec(SET_MIN * 60);
    toTop();
  };

  const tapSet = (i) => {
    // Ek baar de chuke ho to pehle poochho — warna galti se click karte hi
    // pichhla natija mit jata.
    if (results[i]) setAsk(i);
    else openSet(i, "test");
  };

  const go = useCallback((i) => {
    flushTime();
    timeRef.current.at = Math.max(0, Math.min(i, setQs.length - 1));
    setCur((c) => {
      const n = setQs.length;
      if (!n) return c;
      return Math.max(0, Math.min(i, n - 1));
    });
    toTop();
  }, [setQs.length, flushTime, toTop]);

  // ← → se agla/pichla. Input/textarea mein type karte waqt nahi.
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

  // Palette apne aap abhi wale number par aa jaye (phone par wo horizontal
  // patti hai, wahan ye zyada zaroori hai). offsetTop kaam nahi karta — desktop
  // par rail sticky hai aur phone par static, to offsetParent badal jata hai.
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

  // Maths/Reasoning ke question TASVEER hain — unka notebook wala roop card
  // khud banata hai (`tq`: id + qText + optText). Wahi roop board ko chahiye
  // taaki chhoda hua question theek usi pehchaan se Mistake Notebook mein jaye
  // jis se card galat jawab bhejta hai; warna ek hi question do baar chadh
  // jata. Isliye card mount hote hi apna roop yahan darj kar deta hai.
  const regRef = useRef({});
  const register = useCallback((i, qq) => { regRef.current[i] = qq; }, []);

  // Har card ka apna slot: usi ka number, usi ka chuna hua option. Isse card ko
  // question ka koi key milana nahi padta.
  const slots = useMemo(() => setQs.map((_, i) => ({
    locked: !done,
    revealAll: done,
    index: i,
    register,
    pick: picks[i]?.opt,
    // Overwrite hota hai, guard nahi — test ke dauraan option badalna allowed
    // hai, isliye aakhri chuna hua hi ginta hai.
    onPick: (opt, correct) => setPicks((p) => ({ ...p, [i]: { opt, correct } })),
  })), [setQs, done, picks, register]);

  const n = setQs.length;
  // Bina key wale question kisi ginti mein nahi aate.
  const keyed = setQs.map((q, i) => (hasKey(q) ? i : -1)).filter((i) => i >= 0);
  const noKey = n - keyed.length;
  const right = keyed.filter((i) => picks[i]?.correct).length;
  const answered = keyed.filter((i) => picks[i]).length;
  const wrong = answered - right;
  const spent = SET_MIN * 60 - leftSec;

  const submit = useCallback(() => {
    if (done || setIdx === null) return;
    flushTime();
    const times = { ...timeRef.current.spent };
    timeRef.current.mark = 0;
    setTimes(times);
    setDone(true);
    saveSetResult(resumeKey, setIdx, {
      right, wrong, skipped: keyed.length - answered, total: keyed.length, sec: spent,
      times,
      picks: Object.fromEntries(
        Object.entries(picks).map(([k, v]) => [k, { opt: v.opt, correct: v.correct }]),
      ),
    });
    // Set de diya = uske saare question "ho gaye" — sirf sahi wale nahi. Ho
    // gaya ka matlab "ye kar chuka hoon", "ye sahi kiya tha" nahi.
    markDoneMany(setQs);

    // Poore set ka hisaab yahin darj hota hai — test ke dauraan kuch record
    // nahi hota, kyunki wahan jawab badla ja sakta hai. Sirf aakhri chuna hua
    // ginta hai.
    const rows = setQs
      .map((qq, i) => ({
        q: regRef.current[i] || qq,
        correct: !!picks[i]?.correct,
        attempted: !!picks[i],
        i,
      }))
      .filter(({ i }) => hasKey(setQs[i]));
    // Stats — sirf jo attempt kiye.
    const tried = rows.filter((r) => r.attempted);
    if (tried.length) recordAttempts(tried.map(({ q: qq, correct }) => ({ q: qq, correct })));
    // Mistake Notebook — saare. Galat aur CHHODE hue Wrong bucket mein jaate
    // hain (na aana bhi ek galti hai), sahi wale "attempted" mein.
    // Notebook mein NAYA question sirf PYQ ke set-test se jata hai (`single`
    // matlab quiz — vocab ka din, notes ka quiz, "20 similar" — wahan se kuch
    // naya nahi jodna). Sahi jawab bhi naya record nahi banata; wo sirf pehle
    // se pade question ko "ho gaya" nishaan deta hai. Dono shart lib/qreview
    // ke andar hain, isliye yahan se saara hisaab bhej dena theek hai.
    recordQuizAttempts(rows.map(({ q: qq, correct, i }) => ({
      q: qq, correct, subject: subject || "", source: "chapter", category: title,
      sec: times[i] || 0,
      onlyExisting: retryRef.current,
      fromPyq: !single,
    })));
    // "🔢 Aaj" ki ginti — ek question aaj ek hi baar ginta hai, isliye set
    // dobara dene par dobara nahi chadhta.
    for (const qq of setQs) countMark(doneKeyFor(qq), subject, true);
    setResults(getChapterResults(resumeKey));
    setCounts(getCounts());
    onSubmit?.({ right, wrong, skipped: n - answered, total: n, sec: spent });
    toTop();
  }, [done, setIdx, resumeKey, picks, setQs, keyed, right, wrong, answered, spent, subject, title, single, onSubmit, flushTime, toTop]);

  // Samay khatam — khud submit. Timer ka matlab hi yahi hai.
  useEffect(() => {
    if (setIdx !== null && !done && mode === "test" && leftSec === 0) submit();
  }, [leftSec, setIdx, done, mode, submit]);

  if (!total) return <div className="placeholder">{emptyText}</div>;

  // ---------- parda 1: set chuno ----------
  if (setIdx === null) {
    return (
      <div className="qboard__main">
        <div className="qboard__stats">
          {/* + / − hata diye: ginti ab khud "ho gaya" se aati hai (Submit par
              har question countMark se ginta hai), isliye haath se chhedne ki
              zaroorat nahi. Aur wo buttons ek dabane par do badha dete the —
              bumpCount ek state-updater ke ANDAR chal raha tha, jise React dev
              mein do baar bulata hai. */}
          {COUNTER_SUBJECTS.includes(subject) && (
            <span className="cnt" title="Aaj is subject ke kitne question hue (raat 3 baje reset)">
              🔢 Aaj: {counts[subject] || 0}
            </span>
          )}
          <span className="tot">📊 Total: {total}</span>
          <span className="did">✅ Ho gaye: {doneCount}</span>
          <span className="left">⏳ Baaki: {total - doneCount}</span>
        </div>

        <div className="setgrid">
          {Array.from({ length: setCount }, (_, i) => {
            const a = i * SET_SIZE;
            const chunk = all.slice(a, a + SET_SIZE);
            const dn = chunk.filter((x) => doneSet.has(doneKeyFor(x))).length;
            const r = results[i];
            return (
              <div key={i} className={`setcard${r ? " is-done" : ""}`}>
                <button className="setcard__open" onClick={() => tapSet(i)}>
                  <span className="setcard__n">Set {i + 1}{r ? " ✓" : ""}</span>
                  <span className="setcard__meta">Q {a + 1}–{a + chunk.length} · {chunk.length} questions</span>
                  {/* Patti ab SAHI jawabon ki hai. Pehle "ho gaye" ki thi, aur
                      set dete hi saare 25 ho gaye ho jate hain — isliye wo
                      hamesha poori hari dikhti thi aur kuch batati hi nahi. */}
                  <span className="setcard__bar">
                    <i style={{ width: `${Math.round(((r ? r.right : dn) / chunk.length) * 100)}%` }} />
                  </span>
                  {r ? (
                    <span className="setcard__score">
                      {fmtMarks(marksOf(r))}/{maxMarks(r.total)} marks · {r.right}/{r.total} sahi · {accuracyOf(r)}%
                    </span>
                  ) : (
                    <span className="setcard__done">✅ {dn} / {chunk.length} ho gaye</span>
                  )}
                </button>
                {r ? (
                  <span className="setcard__acts">
                    <button className="btn btn--sm" onClick={() => openSet(i, "test")}>🔁 Attempt again</button>
                    <button className="btn btn--ghost btn--sm" onClick={() => openSet(i, "solutions")}>📖 Result</button>
                  </span>
                ) : (
                  <span className="setcard__go">▶ Test shuru karo · ⏱ {SET_MIN} min</span>
                )}
              </div>
            );
          })}
        </div>

        {ask !== null && (
          <div className="setask" onClick={() => setAsk(null)}>
            <div className="setask__box" onClick={(e) => e.stopPropagation()}>
              <h3 className="setask__title">Set {ask + 1} pehle ho chuka hai</h3>
              <p className="setask__sub">
                {fmtMarks(marksOf(results[ask]))}/{maxMarks(results[ask].total)} marks ·
                {" "}{results[ask].right}/{results[ask].total} sahi · {accuracyOf(results[ask])}% ·
                ⏱ {clock(results[ask].sec)}
              </p>
              <div className="setask__acts">
                <button className="btn" onClick={() => openSet(ask, "test")}>🔁 Dobara test do</button>
                <button className="btn btn--ghost" onClick={() => openSet(ask, "solutions")}>📖 Solutions dekho</button>
                <button className="btn btn--ghost" onClick={() => setAsk(null)}>Rehne do</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ---------- parda 2: test ----------
  const at = Math.min(cur, n - 1);
  const low = leftSec <= 60;
  const acc = answered ? Math.round((right / answered) * 100) : 0;

  return (
    <div className={`qboard${fs ? " is-fs" : ""}${done ? "" : " is-locked"}`} ref={rootRef}>
      <aside className="qboard__rail">
        <nav className="qboard__side" ref={railRef}>
          {setQs.map((x, i) => {
            const p = picks[i];
            const state = done
              ? (!hasKey(x) ? "is-skip" : p ? (p.correct ? "is-right" : "is-wrong") : "is-skip")
              : (review[i] ? "is-review" : p ? "is-ans" : "");
            return (
              <a
                key={x._uid ?? x.id ?? i}
                onClick={() => go(i)}
                className={`${state}${i === at ? " is-cur" : ""}`}
                title={done ? `${times[i] || 0}s` : undefined}
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
              <span className="tally tally--ans">Right <b>{right}</b></span>
              <span className="tally tally--bad">Wrong <b>{wrong}</b></span>
              <span className="tally tally--not">Skipped <b>{keyed.length - answered}</b></span>
            </>
          ) : (
            <>
              <span className="tally tally--ans">Answered <b>{answered}</b></span>
              <span className="tally tally--not">Not Answered <b>{keyed.length - answered}</b></span>
              <span className="tally tally--rev">Marked for Review <b>{Object.values(review).filter(Boolean).length}</b></span>
            </>
          )}
        </div>
      </aside>

      <div className="qboard__main">
        <div className="qboard__top">
          {!single && (
            <button className="btn btn--ghost btn--sm" onClick={() => setSetIdx(null)}>← Sets</button>
          )}
          <span className="qboard__title">
            {single ? title : `Set ${setIdx + 1}`}{mode === "solutions" ? " · solutions" : ""}
          </span>

          {/* Ghadi sirf test ke dauraan. Submit ke baad kul waqt natije ki
              patti mein hai, isliye upar dobara dikhane ki zaroorat nahi. */}
          {mode === "test" && !done && (
            <span className={`qboard__clock${low ? " is-low" : ""}`}>
              <em>Time Left</em> {clock(leftSec)}
            </span>
          )}
          {/* Full screen aur Submit sirf test ke dauraan — natija dekhte waqt
              inka koi kaam nahi. */}
          {!done && (
            <>
              <button className="btn btn--ghost btn--sm" onClick={toggleFs}>
                {fs ? "⤢ Exit full screen" : "⛶ Full screen"}
              </button>
            </>
          )}
        </div>

        {done && (
          <div className="qboard__result">
            <span className="res res--right"><b>{right}</b> Right</span>
            <span className="res res--wrong"><b>{wrong}</b> Wrong</span>
            <span className="res res--marks">
              {/* Poore marks bhi sirf un question ke jinki key hai. */}
              <b>{fmtMarks(right * 2 - wrong * 0.5)}</b> / {maxMarks(keyed.length)} Marks
            </span>
            <span className="res res--acc"><b>{acc}%</b> Accuracy</span>
            <span className="res res--time"><b>{clock(mode === "solutions" ? (results[setIdx]?.sec || 0) : spent)}</b> Time</span>
            <span className="res res--skip"><b>{keyed.length - answered}</b> Skipped</span>
            {noKey > 0 && (
              <span className="res res--nokey" title="In question ki answer-key hi nahi hai, isliye ye kisi ginti mein nahi">
                <b>{noKey}</b> bina key
              </span>
            )}
            <button className="btn btn--sm" onClick={() => openSet(setIdx, "test")}>🔁 Attempt again</button>
          </div>
        )}

        {/* Previous / Save & Next sirf test ke dauraan. Natija dekhte waqt
            question palette se badla jata hai. */}
        {/* Testbook jaisi patti: Previous · Mark for Review · Save & Next ·
            Submit, sab beech mein. Sirf test ke dauraan — natija dekhte waqt
            question palette se badalte ho. */}
        {done ? null : (
        <div className="qboard__nav">
            <span className="qboard__pos">Question <b>{at + 1}</b> / {n}</span>
            <span className="qboard__navbtns">
              <button className="btn btn--ghost" onClick={() => go(at - 1)} disabled={at === 0}>← Previous</button>
              <button
                className={`btn btn--review${review[at] ? " is-on" : ""}`}
                onClick={() => setReview((r) => ({ ...r, [at]: !r[at] }))}
              >
                ⚑ {review[at] ? "Marked" : "Mark for Review"}
              </button>
              <button className="btn" onClick={() => go(at + 1)} disabled={at === n - 1}>Save &amp; Next →</button>
              <button className="btn btn--submit" onClick={submit}>✅ Submit Test</button>
            </span>
          </div>
        )}

        {/* Set ke saare card mount rehte hain, sirf ek dikhta hai — isliye
            peeche jaakar bhi apna chuna hua option waisa ka waisa milta hai. */}
        <div className="qboard__cards">
          {setQs.map((x, i) => (
            <div key={x._uid ?? x.id ?? i} style={i === at ? undefined : { display: "none" }}>
              {/* Submit ke baad hi — test ke dauraan ghadi dikhane se dhyaan
                  ghadi par chala jata hai, sawaal par nahi. */}
              {done && (
                <div className="qtime">⏱ Is question par {times[i] || 0}s lage</div>
              )}
              <ExamModeProvider value={slots[i]}>
                {renderCard(x, i, all)}
              </ExamModeProvider>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
