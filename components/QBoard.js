"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { doneKeyFor, getDoneSet, markDoneMany } from "@/lib/qdone";
import { getCounts, countMark, COUNTER_SUBJECTS } from "@/lib/qcounter";
import { recordQuizAttempts } from "@/lib/qreview";
import { recordSlow } from "@/lib/qslow";
import { recordAttempts } from "@/lib/qstats";
import { getChapterResults, saveSetResult, accuracyOf, marksOf, maxMarks, fmtMarks } from "@/lib/settests";
import { saveQuiz, deleteQuiz } from "@/lib/storage";
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
  // Tablet par stylus se solve karne wala rasta (/wrong/solve). Diya ho to
  // test ke sar mein "✍️ Stylus" ka button aata hai; bacha hua waqt URL se
  // saath jaata hai, taaki wahan wahi 15-minute wali ghadi chalti rahe.
  stylusUrl,
  onSubmit,                   // submit ke baad page ka apna kaam (vocab din, etc.)
}) {
  const router = useRouter();
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
  // 🙈 Answers chhupao — natija dekh lene ke BAAD wahi set khud se dobara
  // solve karne ke liye. Sahi jawab, rang, solution: sab chhup jate hain aur
  // sirf option bachte hain. Option dabate hi us ek question ka jawab khulta
  // hai, aur uspar pichhli baar ka nishaan bhi ("first attempt").
  const [hideAns, setHideAns] = useState(false);
  const [rePicks, setRePicks] = useState({});
  // Card apna chuna hua option mount par hi padhta hai (useState ka pehla
  // value), isliye use dobara khaali karne ka ek hi tareeka hai — naya key de
  // kar remount karna.
  const [round, setRound] = useState(0);
  const toggleHide = () => {
    setRePicks({});
    setRound((r) => r + 1);
    setHideAns((v) => !v);
    toTop();
  };
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

  // Pichhli list ka nishaan — sirf ye jaanne ke liye ki nayi list "wahi list +
  // aur question" hai, ya sach mein doosri list.
  const shapeRef = useRef({ key: null, sig: "", n: 0 });

  // Naya chapter (ya naya filter) aaya to seedha set wale parde par.
  //
  // Lekin generated quiz DHIRE-DHIRE bharta hai: DeepSeek pehle 10 question
  // deta hai, quiz khul jata hai, aur baaki peeche se JUDTE rehte hain. Us
  // waqt sirf list lambi hoti hai — shuru ke question wahi ke wahi. Pehle
  // yahan `total` badalte hi poora reset chal jata tha, isliye 5 answer laga
  // kar baithe ho aur naye question aa jayein to sab ud jata tha: chune hue
  // option, review ke nishaan, ghadi, aur jis question par the wo bhi.
  // Isliye: agar chalta hua test khula hai aur nayi list purani ka aage-badha
  // roop hai, to kuch mat chhedo — naye question bas ANT mein aa kar baith
  // jayenge (picks number se ginte hain, isliye hilte nahi).
  useEffect(() => {
    const sigOf = (arr) => arr.map((q) => doneKeyFor(q)).join("|");
    const prev = shapeRef.current;
    const grew = setIdx !== null
      && prev.key === resumeKey
      && prev.n > 0 && total > prev.n
      && sigOf(all.slice(0, prev.n)) === prev.sig;
    shapeRef.current = { key: resumeKey, sig: sigOf(all), n: total };
    if (grew) return;
    setSetIdx(single ? 0 : null); setAsk(null); setCur(0);
    setPicks({}); setReview({}); setTimes({}); setDone(false); setLeftSec(SET_MIN * 60);
    setHideAns(false); setRePicks({});
    retryRef.current = noNotebook;
    timeRef.current = { spent: {}, mark: single ? Date.now() : 0, at: 0 };
    // `all`/`setIdx` jaan-boojh kar deps mein nahi: list ki pehchaan har append
    // par nayi banti hai (storage se dobara padhi jati hai), to unhe deps mein
    // daalne se wahi reset phir se chalne lagta jise ye rok raha hai. Effect ka
    // closure har render par naya banta hai, isliye yahan hamesha taaza list
    // hi milti hai.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // PYQ ka set stylus wale parde par: wahan ka rasta ek SAVED quiz maangta hai
  // (/wrong/solve?quiz=<id>), isliye isi set ke question ek asthayi quiz mein
  // daal dete hain. Id set ke naam se banti hai, to dobara kholne par wahi
  // quiz phir se bhar jata hai (nayi copy nahi banti), aur submit ke baad
  // solve page use khud delete kar deta hai.
  // `secs` = ghadi ke bache hue second. 0 do to stylus wala parda BINA ghadi ke
  // khulta hai — pehle diya hua set sirf pen se dobara solve karne ke liye.
  const openStylus = (i, secs) => {
    const qs = all.slice(i * size, i * size + size);
    if (!qs.length) return;
    const id = `set_${String(resumeKey || "set").replace(/[^A-Za-z0-9]+/g, "_")}_${i}`;
    try {
      deleteQuiz(id);
      saveQuiz({
        id,
        title: `${title} · Set ${i + 1}`,
        subject: subject || "",
        // Set ka pata — stylus wala parda isi se uska pichhla natija dhoondhta
        // hai (settests), taaki wahan sahi/galat pehle se dikhe aur dobara
        // wahi record notebook mein na chadhe.
        setKey: resumeKey || "",
        setIdx: i,
        // "set" hi wo nishaan hai jisse solve page jaanta hai ki galat/chhode
        // question Mistake Notebook mein bhejne hain.
        source: "set",
        createdAt: new Date().toISOString(),
        questions: qs,
      });
    } catch { /* quota — phir bhi khol kar dekh lete hain */ }
    // Back dabane par wahi page — jahan se set khola tha.
    const back = typeof window !== "undefined"
      ? encodeURIComponent(window.location.pathname + window.location.search)
      : "";
    router.push(
      `/wrong/solve?quiz=${encodeURIComponent(id)}${secs > 0 ? `&t=${secs}` : ""}${back ? `&back=${back}` : ""}`,
    );
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
    setHideAns(false); setRePicks({});
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
  //
  // Ye SIRF tab chalta hai jab question badle (ya test khule). Pehle iske paas
  // dependency array tha hi nahi, matlab har render ke baad chalta tha — aur
  // ghadi har second state badalti hai, to har second. Nateeja: patti apni
  // marzi se scroll hoti hi nahi thi. Tum 13 par ho aur 25 par jaana hai, patti
  // ko sarkaya — aur ek second baad wo khud ko wapas 13 par kheench laati.
  // Lagta tha ki position lock hai; asal mein har second ye effect use ghaseet
  // kar wapas la raha tha.
  const railRef = useRef(null);
  useEffect(() => {
    const r = railRef.current;
    const el = r?.querySelector("a.is-cur");
    if (!r || !el) return;
    const cr = r.getBoundingClientRect();
    const er = el.getBoundingClientRect();
    r.scrollTop += (er.top - cr.top) - (cr.height - er.height) / 2;
    r.scrollLeft += (er.left - cr.left) - (cr.width - er.width) / 2;
    // `cur` aur `setIdx` hi kaafi hain: question badalna, aur test ka khulna.
    // Naye question aane par (streaming quiz) jaan-boojh kar nahi — us waqt
    // tum patti mein kahin bhi ho sakte ho, aur wahan se hilana wahi purani
    // galti hogi.
  }, [cur, setIdx]);

  // Maths/Reasoning ke question TASVEER hain — unka notebook wala roop card
  // khud banata hai (`tq`: id + qText + optText). Wahi roop board ko chahiye
  // taaki chhoda hua question theek usi pehchaan se Mistake Notebook mein jaye
  // jis se card galat jawab bhejta hai; warna ek hi question do baar chadh
  // jata. Isliye card mount hote hi apna roop yahan darj kar deta hai.
  const regRef = useRef({});
  const register = useCallback((i, qq) => { regRef.current[i] = qq; }, []);

  // Har card ka apna slot: usi ka number, usi ka chuna hua option. Isse card ko
  // question ka koi key milana nahi padta.
  const slots = useMemo(() => setQs.map((_, i) => (hideAns
    // 🙈 mode: har question phir se band. Jis par dobara jawab de diya SIRF
    // wahi khulta hai — baaki chhupe rehte hain, warna ek option dabate hi
    // poore set ke jawab dikh jate.
    ? {
      locked: !rePicks[i],
      revealAll: !!rePicks[i],
      index: i,
      register,
      pick: rePicks[i]?.opt,
      onPick: (opt, correct) => setRePicks((p) => ({ ...p, [i]: { opt, correct } })),
      // Pichhli baar kya lagaya tha — card usi option par nishaan chipka deta
      // hai (laal agar galat tha, hara agar sahi).
      firstPick: picks[i]?.opt,
      firstCorrect: picks[i]?.correct,
    }
    : {
      locked: !done,
      revealAll: done,
      index: i,
      register,
      pick: picks[i]?.opt,
      // Overwrite hota hai, guard nahi — test ke dauraan option badalna allowed
      // hai, isliye aakhri chuna hua hi ginta hai.
      onPick: (opt, correct) => setPicks((p) => ({ ...p, [i]: { opt, correct } })),
    })), [setQs, done, picks, register, hideAns, rePicks]);

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
    // ⏱️ Time khaane wale — Maths/Reasoning ka jo question 60 second se zyada
    // le gaya wo /slow par chala jata hai. Yahan `rows` NAHI, poora `setQs`:
    // rows sirf key wale question rakhta hai aur usme sahi/galat ki chhantayi
    // hoti hai, jabki raftaar ka maamla teeno par barabar lagta hai — sahi,
    // galat, aur dekh kar chhoda hua. Subject na mile to lib/qslow khud hi
    // chhod deta hai, isliye yahan shart lagane ki zaroorat nahi.
    recordSlow(setQs.map((qq, i) => ({
      q: regRef.current[i] || qq,
      subject,
      category: title,
      sec: times[i] || 0,
      outcome: picks[i] ? (picks[i].correct ? "right" : "wrong") : "skip",
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
                    {/* Ho chuka set pen se dobara — bina ghadi ke. Naya test
                        dene ke liye ghadi wali "Attempt again" hai; ye sirf
                        kaagaz par solve karne ke liye hai. */}
                    <button className="btn btn--ghost btn--sm" onClick={() => openStylus(i, 0)}
                      title="Isi set ko tablet par pen se solve karo — bina timer ke">
                      ✍️ Stylus
                    </button>
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
  // 🙈 mode ka apna hisaab — button par hi dikhta hai.
  const reAnswered = Object.keys(rePicks).length;
  const reRight = Object.values(rePicks).filter((x) => x.correct).length;

  return (
    <div className={`qboard${fs ? " is-fs" : ""}${done ? "" : " is-locked"}${hideAns ? " is-hidden-ans" : ""}`} ref={rootRef}>
      <aside className="qboard__rail">
        <nav className="qboard__side" ref={railRef}>
          {setQs.map((x, i) => {
            const p = picks[i];
            // 🙈 mode mein palette bhi jawab nahi batata — warna rang dekh kar
            // hi pata chal jata ki kaunsa sahi tha. Sirf itna: dobara kiya ya
            // nahi.
            const state = hideAns
              ? (rePicks[i] ? "is-ans" : "")
              : done
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
          {hideAns ? (
            /* 🙈 mode ka apna hisaab — pehli baar ka natija yahan dikhana ulta
               pad jata: aankhon ke saamne wahi ginti rehti jo abhi chhupayi hai. */
            <>
              <span className="tally tally--ans">Dobara sahi <b>{reRight}</b></span>
              <span className="tally tally--bad">Dobara galat <b>{reAnswered - reRight}</b></span>
              <span className="tally tally--not">Baaki <b>{n - reAnswered}</b></span>
            </>
          ) : done ? (
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
              {stylusUrl ? (
                <Link
                  className="btn btn--ghost btn--sm"
                  href={`${stylusUrl}${stylusUrl.includes("?") ? "&" : "?"}t=${leftSec}&back=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname : "/")}`}
                  title="Tablet par stylus se solve karo — wahi ghadi wahan chalti rahegi"
                >
                  ✍️ Stylus
                </Link>
              ) : (
                <button className="btn btn--ghost btn--sm" onClick={() => openStylus(setIdx, leftSec)}
                  title="Isi set ke question tablet par pen se solve karo — wahi ghadi wahan chalti rahegi">
                  ✍️ Stylus
                </button>
              )}
              <button className="btn btn--ghost btn--sm" onClick={toggleFs}>
                {fs ? "⤢ Exit full screen" : "⛶ Full screen"}
              </button>
            </>
          )}
          {/* Natija dekh lene ke baad: wahi set khud se dobara solve karo.
              Sab jawab chhup jaate hain, sirf option bachte hain. */}
          {done && (
            <button className="btn btn--ghost btn--sm" onClick={toggleHide}>
              {hideAns
                ? `👁️ Answers dikhao${reAnswered ? ` · ${reRight}/${reAnswered} sahi` : ""}`
                : "🙈 Answers chhupao"}
            </button>
          )}
        </div>

        {done && !hideAns && (
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
        {done && !hideAns ? null : (
        <div className="qboard__nav">
            <span className="qboard__pos">Question <b>{at + 1}</b> / {n}</span>
            <span className="qboard__navbtns">
              <button className="btn btn--ghost" onClick={() => go(at - 1)} disabled={at === 0}>← Previous</button>
              {/* 🙈 mode koi test nahi hai — na review ka nishaan chahiye, na
                  Submit. Wahan sirf aage-peeche jaana hai. */}
              {!hideAns && (
                <button
                  className={`btn btn--review${review[at] ? " is-on" : ""}`}
                  onClick={() => setReview((r) => ({ ...r, [at]: !r[at] }))}
                >
                  ⚑ {review[at] ? "Marked" : "Mark for Review"}
                </button>
              )}
              <button className="btn" onClick={() => go(at + 1)} disabled={at === n - 1}>Save &amp; Next →</button>
              {!hideAns && (
                <button className="btn btn--submit" onClick={submit}>✅ Submit Test</button>
              )}
            </span>
          </div>
        )}

        {/* Set ke saare card mount rehte hain, sirf ek dikhta hai — isliye
            peeche jaakar bhi apna chuna hua option waisa ka waisa milta hai. */}
        <div className="qboard__cards">
          {setQs.map((x, i) => (
            <div key={`${round}:${x._uid ?? x.id ?? i}`} style={i === at ? undefined : { display: "none" }}>
              {/* Submit ke baad hi — test ke dauraan ghadi dikhane se dhyaan
                  ghadi par chala jata hai, sawaal par nahi. */}
              {done && !hideAns && (
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
