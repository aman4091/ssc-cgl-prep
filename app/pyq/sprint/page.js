"use client";

// ⚡ Sprint — 100 question, 30 second har ek, poori screen par.
//
// Kaam ka kram:
//   1. Subject aur ginti chuno → us subject ke saare PYQ load hote hain aur
//      usmein se wo agle N nikalte hain jo sprint mein pehle NAHI aaye.
//   2. DeepSeek pehle 10 ke jawab EK-EK karke banata hai — screen par
//      saamne dikhte hue. 10 ban gaye ki daud shuru.
//   3. Daud chalte-chalte baaki 90 ke jawab peechhe banate rehte hain.
//      Ek jawab ~5 second mein aata hai, question har 30 second par badalta
//      hai — isliye jawab hamesha aage rehta hai.
//
// PYQ bank ke apne page isse bilkul alag hain: wahan ki ✅/stats/bookmark ko
// ye na padhta hai na chhoota hai. Sprint ka apna hisaab lib/sprint.js mein
// hai — isi se "agli baar agle 100" hota hai.

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./sprint.css";
import { ALL_SUBJECTS, loadAllSubject, loadOnePart, partsOf, sourcesFor, countsFor } from "@/lib/allbank";
import { vocabPool } from "@/lib/vocabpool";
import { TYPES as VOCAB_TYPES } from "@/lib/vocab";
import { loadCaBankIndex, loadCaBankMonth } from "@/lib/cabank";
import { getCurrentAffairsQuestions } from "@/lib/feed";
import { SUBJECTS as WB_SUBJECTS, getWrongBook, isPracticeable } from "@/lib/wrongbook";
import { sprintAnswer } from "@/lib/client-ai";
import SprintCard from "@/components/SprintCard";
import SprintAnswer from "@/components/SprintAnswer";
import {
  pickNext, markDone, doneCount, getAns, putAns, getMarks,
  qText, qOpts, qCorrect, sHash, toggleMark, clearDone, isVocab,
  getSets, saveSet, removeSet, newSetId, byHashes, doneBySlug, pickDone,
} from "@/lib/sprint";

const SECS = 30;      // ek question par itne second
const WARM = 10;      // itne jawab banne ke baad daud shuru
const COUNTS = [50, 100, 120];

// 🔤 Vocab bank ke bahar hai (lib/vocabpool) — wahan sawaal-jawab nahi, ek
// word aur uska matlab hota hai. Isliye uski apni entry, aur uske liye
// book/chapter ka koi matlab nahi.
const VOCAB = { slug: "vocab", label: "Vocab", icon: "🔤" };
// 📰 Current Affairs bhi bank ke bahar hai: mahine-wise ready-made bank
// (public/cabank) + jo tumne khud import kiya (feed).
const CA = { slug: "ca", label: "Current Affairs", icon: "📰" };
// 🔴 Answers page (Mistake Notebook) — jo galat hue ya chhode, wahi.
const WB = { slug: "wrong", label: "Mistake Notebook", icon: "🔴" };
const PICKS = [...ALL_SUBJECTS, VOCAB, CA, WB, { slug: "mix", label: "Mix — sab subject", icon: "🎲" }];
const NO_BOOKS = new Set(["mix", "vocab", "ca", "wrong"]);

// Notebook ki "book" wahi subject hai jo Answers page par chip banta hai.
const WB_KINDS = [{ key: "", label: "— Saare subject —" }, ...WB_SUBJECTS.map((x) => ({ key: x.key, label: `${x.icon} ${x.label}` }))];

// Vocab ki "book" uska TYPE hai — OWS / Idiom / Vocab. Khali = teeno mila-jula.
const VOCAB_KINDS = [{ key: "", label: "— Sab mila-jula —" }, ...VOCAB_TYPES.map((t) => ({ key: t.key, label: `${t.icon} ${t.label}` }))];

// CA ke saare question: pehle ready-made mahine, phir tumhare apne import
// kiye hue. `month` ho to sirf wahi mahina. Ek hi sawaal do baar na aaye.
async function loadCa(month) {
  const out = [];
  try {
    const idx = await loadCaBankIndex();
    const months = (idx.months || []).filter((m) => !month || m.period === month);
    for (const m of months) {
      const qs = await loadCaBankMonth(m.period);
      for (const q of qs) out.push({ ...q, _chapter: m.label || m.period });
    }
  } catch { /* bank na mile to apne wale hi sahi */ }
  // Apne import kiye hue ek hi thaili mein hain, mahine-wise nahi — isliye wo
  // tabhi jab koi ek mahina na chuna ho.
  if (!month) {
    try { for (const q of getCurrentAffairsQuestions()) out.push({ ...q, _chapter: "Mere import kiye" }); }
    catch { /* ignore */ }
  }
  return out;
}

function shuffled(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function labelOf(slug) { return (PICKS.find((x) => x.slug === slug) || {}).label || slug; }

// "Mix" = chaaron subject ek ke baad ek, asli paper jaisa. Round-robin isliye
// ki 100 mein se 90 ek hi subject ke na ho jayein.
async function loadMix(onStep) {
  const lists = [];
  for (const s of ALL_SUBJECTS) {
    onStep(`${s.label} load ho raha hai…`);
    lists.push({ meta: s, qs: await loadAllSubject(s.slug) });
  }
  const out = [];
  const at = lists.map(() => 0);
  for (let guard = 0; guard < 200000; guard++) {
    let moved = false;
    for (let i = 0; i < lists.length; i++) {
      const q = lists[i].qs[at[i]++];
      if (q) { out.push({ ...q, _slug: lists[i].meta.slug, _subj: lists[i].meta.label }); moved = true; }
    }
    if (!moved) break;
  }
  return out;
}

// Taiyaari wali list mein sirf jhaanki chahiye, isliye markdown ke nishaan
// (\_ \* $...$) hata dete hain — warna "Ministry of \_\_\_\_" aisa hi dikhta hai.
function preview(q) {
  return qText(q).replace(/\\(.)/g, "$1").replace(/[*_`$]/g, "").slice(0, 110);
}

export default function SprintPage() {
  // setup → loading → prep (pehle 10 ban rahe) → run → done
  const [phase, setPhase] = useState("setup");
  const [slug, setSlug] = useState("gs");
  // Book aur chapter — khali = us subject ka SAB kuch. ("sirf GKTricks ka
  // Statics karna hai" wali baat.)
  const [book, setBook] = useState("");
  const [chap, setChap] = useState("");
  const [parts, setParts] = useState([]);
  const [count, setCount] = useState(100);
  const [note, setNote] = useState("");
  const [batch, setBatch] = useState([]);
  const [ans, setAns] = useState({});     // hash -> jawab
  const [errs, setErrs] = useState({});   // hash -> gadbad ka message
  const [busy, setBusy] = useState("");   // abhi kis hash par kaam ho raha
  const [pos, setPos] = useState(0);
  const [left, setLeft] = useState(SECS);
  const [paused, setPaused] = useState(false);
  const [picked, setPicked] = useState(null);
  const [marked, setMarked] = useState(false);
  const [tally, setTally] = useState({ right: 0, wrong: 0 });
  const [doneN, setDoneN] = useState(0);
  const [markN, setMarkN] = useState(0);
  const [sets, setSets] = useState([]);
  // Har subject ke kitne question hain aur kitne ho chuke. Total index.json se
  // aata hai (question fetch kiye bina), aur "ho gaye" apne hisaab se.
  // Daud khatam hone par ye bhar jata hai — aur screen wapas shuru wale
  // page par, uske upar ek patti mein hisaab.
  const [summary, setSummary] = useState(null);
  // 📝 Test: wahi parda, par jawab tab tak chhupa rehta hai jab tak option
  // na chuno, aur waqt khatam hone par apne aap agla question NAHI aata —
  // exam mein bhi page apne aap nahi palatta.
  const [test, setTest] = useState(false);
  // Browser ka apna poora-screen (F11 jaisa). Hamara parda to pehle hi poori
  // window leta hai; ye browser ki patti bhi hata deta hai.
  const [fs, setFs] = useState(false);
  const [totals, setTotals] = useState({});
  const [caMonths, setCaMonths] = useState([]);
  const [doneMap, setDoneMap] = useState({});

  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);

  useEffect(() => { setDoneN(doneCount()); setMarkN(getMarks().length); setSets(getSets()); }, []);
  useEffect(() => { setDoneMap(doneBySlug()); }, [doneN]);
  useEffect(() => {
    const h = () => setFs(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", h);
    return () => document.removeEventListener("fullscreenchange", h);
  }, []);
  // Dono taraf try/catch — kuch browser mana kar dete hain, aur wo mana
  // karna daud rok dene layak baat nahi hai.
  const toggleFs = useCallback(() => {
    try {
      if (document.fullscreenElement) document.exitFullscreen();
      else document.documentElement.requestFullscreen();
    } catch { /* ignore */ }
  }, []);
  useEffect(() => {
    let ok = true;
    (async () => {
      for (const x of ALL_SUBJECTS) {
        const c = await countsFor(x.slug).catch(() => null);
        if (!ok) return;
        if (c) setTotals((t) => ({ ...t, [x.slug]: c.total }));
      }
      if (ok) setTotals((t) => ({ ...t, vocab: vocabPool().length }));
      // CA ki ginti bhi sirf index se — question fetch kiye bina.
      const idx = await loadCaBankIndex().catch(() => null);
      if (!ok) return;
      const mine = (() => { try { return getCurrentAffairsQuestions().length; } catch { return 0; } })();
      setCaMonths((idx && idx.months) || []);
      setTotals((t) => ({
        ...t,
        ca: ((idx && idx.total) || 0) + mine,
        wrong: (() => { try { return getWrongBook("").filter(isPracticeable).length; } catch { return 0; } })(),
      }));
    })();
    return () => { ok = false; };
  }, []);

  // Subject badla to book/chapter dono khali. Book chuni to uske chapter
  // (ginti ke saath) list mein — question abhi bhi fetch nahi hote, sirf
  // index padha jata hai.
  const books = useMemo(() => (NO_BOOKS.has(slug) ? [] : sourcesFor(slug)), [slug]);
  useEffect(() => { setBook(""); setChap(""); setParts([]); }, [slug]);
  useEffect(() => {
    let ok = true;
    setChap("");
    if (!book) { setParts([]); return undefined; }
    partsOf(slug, book).then((ps) => { if (ok) setParts(ps.filter((p) => (p.count || 0) > 0)); });
    return () => { ok = false; };
  }, [slug, book]);

  // ── "ho gaya" ka hisaab ────────────────────────────────────────────────
  // Har question par poora store dobara likhna bhaari hai (30,000 tak keys),
  // isliye 10-10 ke jatthe mein likhte hain — aur bahar nikalte waqt bacha
  // hua jattha bhi.
  const seen = useRef([]);
  const flush = useCallback(() => {
    if (!seen.current.length) return;
    markDone(seen.current);
    seen.current = [];
    setDoneN(doneCount());
  }, []);
  useEffect(() => {
    const h = () => flush();
    window.addEventListener("beforeunload", h);
    return () => { window.removeEventListener("beforeunload", h); flush(); };
  }, [flush]);

  // ── DeepSeek ka kaam, peechhe chalta hua ───────────────────────────────
  const fetchAll = useCallback(async (list) => {
    for (const q of list) {
      if (!alive.current) return;
      // 📰 Current Affairs par DeepSeek ko bulana hi nahi: uski jaankari
      // purani hai, aur source ka apna jawab pehle se saath aata hai. Paisa
      // bhi bachta hai.
      if (q._slug === "ca") continue;
      const h = sHash(q);
      // Pichhli baar bana hua jawab pada ho to dobara paisa nahi lagta.
      const old = getAns(q);
      if (old) { setAns((a) => ({ ...a, [h]: old })); continue; }
      setBusy(h);
      try {
        const { answer } = await sprintAnswer({
          question: qText(q),
          options: qOpts(q),
          correct: qCorrect(q),
          subject: q._subj || "",
          kind: isVocab(q) ? "vocab" : "",
        });
        if (!alive.current) return;
        putAns(q, answer);
        setAns((a) => ({ ...a, [h]: answer }));
      } catch (e) {
        if (!alive.current) return;
        setErrs((x) => ({ ...x, [h]: e.message }));
      } finally {
        setBusy("");
      }
    }
  }, []);

  // Kahan se question laane hain — ek hi jagah, taaki naya sprint aur
  // sambhala hua set dono isi raaste se chalein.
  const loadList = useCallback(async (s, b, c) => {
    if (s === "vocab") {
      // `b` yahan type hai (ows / idiom / vocab), khali = teeno.
      const all = vocabPool().filter((v) => !b || v.type === b);
      // Vocab pool alphabet ke kram mein aata hai — isliye pehle 100 mein ek
      // hi tarah ke word aa jaate the ("sirf idiom hi aa rahe hain"). Kram
      // random rakhne se har set mila-jula banta hai.
      return shuffled(all).map((v) => ({
        ...v, _kind: "vocab", _slug: "vocab", _subj: "Vocab",
        _srcLabel: "Vocab", _chapter: v.label || "",
      }));
    }
    if (s === "wrong") {
      // `b` = subject ("math"/"gs"/…), khali = saare. Sirf wahi record jinke
      // paas asli options hain — sirf-tasveer wale card yahan nahi chalte.
      return getWrongBook(b || "")
        .filter(isPracticeable)
        .map((r) => ({
          ...r.q,
          _slug: "wrong", _subj: (WB_SUBJECTS.find((x) => x.key === r.subject) || {}).label || "Mistake",
          _srcLabel: "Mistake Notebook",
          _chapter: r.category || r.source || "",
          explanation: r.q.explanation || r.answer || "",
        }));
    }
    if (s === "ca") {
      // `b` yahan mahina hai ("2026-07"), khali = saare mahine.
      const all = await loadCa(b);
      const seen = new Set();
      return all
        .filter((q) => { const k = String(q.question || "").trim().toLowerCase(); if (!k || seen.has(k)) return false; seen.add(k); return true; })
        .map((q) => ({
          ...q, _slug: "ca", _subj: "Current Affairs", _srcLabel: "Current Affairs",
          // CA ka jawab `detail` mein hai — card `explanation` padhta hai.
          explanation: q.explanation || q.detail || "",
        }));
    }
    if (b) {
      const qs = await loadOnePart(s, b, c);
      const meta = ALL_SUBJECTS.find((x) => x.slug === s);
      return qs.map((q) => ({ ...q, _slug: s, _subj: meta ? meta.label : "" }));
    }
    if (s === "mix") return loadMix(setNote);
    const meta = ALL_SUBJECTS.find((x) => x.slug === s);
    const qs = await loadAllSubject(s, (d, t) => setNote(`${meta.label} — ${d}/${t} chapter`));
    return qs.map((q) => ({ ...q, _slug: s, _subj: meta.label }));
  }, []);

  // `set` diya ho to wahi purana set dobara; `asTest` ho to jo ho CHUKE hain
  // unhi ka test — warna agle `count` naye.
  const start = useCallback(async (set, asTest) => {
    const s = set ? set.slug : slug;
    const b = set ? (set.book || "") : book;
    const c = set ? (set.chap || "") : chap;
    setPhase("loading");
    setNote(asTest ? "Test taiyaar ho raha hai…" : set ? `"${set.label}" wapas laa rahe hain…` : "Questions load ho rahe hain…");
    let list;
    try {
      list = await loadList(s, b, c);
    } catch (e) {
      setPhase("setup");
      setNote("Load nahi hue: " + e.message);
      return;
    }
    // Set ka test dete waqt kram badal dete hain — warna har test mein wahi
    // question usi jagah aate aur ratt jate.
    const pick = set ? (asTest ? shuffled(byHashes(list, set.hashes)) : byHashes(list, set.hashes))
      : asTest ? pickDone(list, count)
      : pickNext(list, count);
    if (!pick.length) {
      setPhase("setup");
      setNote(set ? "Is set ke question ab bank mein nahi mile."
        : asTest ? "Yahan abhi koi question hua hi nahi — pehle ek sprint chala lo."
        : "Yahan ke saare question sprint mein aa chuke. Neeche se hisaab saaf kar sakte ho, ya doosra chapter chuno.");
      return;
    }
    setTest(!!asTest);
    if (!set && !asTest) {
      // Naya set sambhal lo — taaki yahi 100 baad mein dobara chal sakein.
      const bookLabel = b
        ? (s === "vocab" ? (VOCAB_KINDS.find((x) => x.key === b) || {}).label
          : s === "ca" ? (caMonths.find((x) => x.period === b) || {}).label
          : s === "wrong" ? (WB_KINDS.find((x) => x.key === b) || {}).label
          : (books.find((x) => x.id === b) || {}).label)
        : "";
      const chapName = c ? (parts.find((x) => x.slug === c) || {}).name : "";
      const when = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short" });
      saveSet({
        id: newSetId(),
        label: [labelOf(s), bookLabel, chapName].filter(Boolean).join(" · ") + ` · ${pick.length} Q · ${when}`,
        slug: s, book: b, chap: c,
        hashes: pick.map(sHash),
      });
      setSets(getSets());
    }
    setBatch(pick);
    setAns({});
    setErrs({});
    setPos(0);
    setPicked(null);
    setTally({ right: 0, wrong: 0 });
    setPhase("prep");
    setNote("");
    fetchAll(pick);
  }, [slug, book, chap, books, parts, caMonths, count, fetchAll, loadList]);

  const cur = batch[pos] || null;
  const curH = cur ? sHash(cur) : "";

  // 💬 Poochho panel ko batao ki abhi kaun sa question saamne hai — wahan
  // se "is question ka jawab bana do" isi par lagta hai.
  useEffect(() => {
    const q = phase === "run" ? cur : null;
    try { window.dispatchEvent(new CustomEvent("cgl:sprint-q", { detail: { q } })); } catch { /* ignore */ }
  }, [phase, cur]);
  useEffect(() => () => {
    try { window.dispatchEvent(new CustomEvent("cgl:sprint-q", { detail: { q: null } })); } catch { /* ignore */ }
  }, []);

  // Panel se naya jawab laga — parda bina reload ke usi pal badal jaye.
  useEffect(() => {
    const h = (e) => {
      const d = (e && e.detail) || {};
      if (!d.h) return;
      setAns((x) => ({ ...x, [d.h]: d.text }));
      setErrs((x) => { const n = { ...x }; delete n[d.h]; return n; });
    };
    window.addEventListener("cgl:sprint-ans", h);
    return () => window.removeEventListener("cgl:sprint-ans", h);
  }, []);

  // Pehle WARM jawab ban gaye → daud shuru.
  const readyN = useMemo(
    () => batch.slice(0, WARM).filter((q) => ans[sHash(q)] || errs[sHash(q)]).length,
    [batch, ans, errs],
  );
  // CA ke batch mein koi AI call hoti hi nahi, isliye wahan taiyaari ka
  // intezaar bekaar hai — seedha daud.
  const noAi = batch.length > 0 && batch.every((q) => q._slug === "ca");
  useEffect(() => {
    if (phase !== "prep") return;
    if (noAi || readyN >= Math.min(WARM, batch.length)) setPhase("run");
  }, [phase, readyN, batch.length, noAi]);

  // Naya question saamne aaya: ghadi poori, chuna hua option saaf, aur ye
  // question "ho gaya" wali list mein.
  useEffect(() => {
    if (phase !== "run" || !cur) return;
    setLeft(SECS);
    setPicked(null);
    setMarked(false);
    seen.current.push(cur);
    if (seen.current.length >= 10) flush();
  }, [pos, phase, cur, flush]);

  // pos list se EK aage ja sakta hai — wahi "khatam" ka ishaara hai. Aise
  // likhne se do-teen baar jaldi-jaldi "aage" dabane par bhi har dabav ginti
  // mein aata hai (purana roop pichhle render ka pos dekhta tha, isliye teen
  // click sirf ek question aage le jate the).
  const lenRef = useRef(0);
  lenRef.current = batch.length;
  const next = useCallback(() => setPos((p) => Math.min(p + 1, lenRef.current)), []);
  const prev = useCallback(() => setPos((p) => Math.max(0, p - 1)), []);

  // Daud khatam — ek hi jagah: hisaab bhar do, browser ka poora-screen chhod
  // do, aur shuru wale page par wapas.
  const finish = useCallback(() => {
    flush();
    setSummary({ seen: Math.min(pos + 1, batch.length), right: tally.right, wrong: tally.wrong, test });
    try { if (document.fullscreenElement) document.exitFullscreen(); } catch { /* ignore */ }
    setPhase("setup");
    setNote("");
    setSets(getSets());
    window.scrollTo(0, 0);
  }, [flush, pos, batch.length, tally, test]);

  useEffect(() => {
    if (phase === "run" && batch.length && pos >= batch.length) finish();
  }, [phase, pos, batch.length, finish]);
  // Ghadi.
  useEffect(() => {
    if (phase !== "run" || paused) return undefined;
    // Test mein waqt khatam hone par bas jawab khul jata hai; aage khud
    // badhna hota hai.
    if (left <= 0) { if (!test) next(); return undefined; }
    const t = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [left, paused, phase, next, test]);

  // Daud ke dauraan page ke peechhe ka scroll band — warna fixed parde ke
  // peechhe poora PYQ page scroll hota rehta hai aur dayein ek bekaar patti
  // dikhti hai.
  useEffect(() => {
    if (phase !== "run") return undefined;
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = old; };
  }, [phase]);

  const mark = useCallback(() => {
    if (!cur) return;
    const on = toggleMark(cur, { src: cur._srcLabel, chapter: cur._chapter });
    setMarked(on);
    setMarkN(getMarks().length);
  }, [cur]);

  const choose = useCallback((i) => {
    if (picked != null || !cur) return;
    setPicked(i);
    // Vocab mein sahi option jaisa kuch nahi — wahan "✓ Yaad tha" khud sahi
    // maana jata hai aur "✗" galat (choose(-1)).
    const right = isVocab(cur) ? i >= 0 : i === cur.answer;
    setTally((t) => (right ? { ...t, right: t.right + 1 } : { ...t, wrong: t.wrong + 1 }));
  }, [picked, cur]);

  // Keyboard: space = ruko/chalo, ← → question, M = bookmark.
  useEffect(() => {
    if (phase !== "run") return undefined;
    const onKey = (e) => {
      if (e.target && /input|textarea|select/i.test(e.target.tagName)) return;
      if (e.key === " ") { e.preventDefault(); setPaused((p) => !p); }
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "m" || e.key === "M") mark();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, next, prev, mark]);

  // ── daud ───────────────────────────────────────────────────────────────
  if (phase === "run") {
    // Aakhri question ke baad ek pal ke liye cur khali hota hai — upar wala
    // effect usi pal mein finish() chala deta hai.
    if (!cur) return null;
    const madeN = Object.keys(ans).length;
    return (
      <div className="sp-wrap">
        <div className="sp-top">
          <span className="sp-top__n">{test ? "📝" : "⚡"} {pos + 1}/{batch.length}</span>
          <span className={`sp-clock${paused ? " is-pause" : left <= 10 ? " is-warn" : ""}`}>
            {paused ? "⏸ ruka hua" : `0:${String(left).padStart(2, "0")}`}
          </span>
          <span className="sp-top__dim">
            ✓ {tally.right} · ✗ {tally.wrong}
            {test || noAi ? "" : ` · 🐋 ${madeN}/${batch.length} taiyaar`}
          </span>
          <span className="sp-top__sp" />
          <button type="button" className={`sp-ibtn${marked ? " is-on" : ""}`} onClick={mark} title="Bookmark (M)">
            {marked ? "★" : "☆"}
          </button>
          <button type="button" className="sp-ibtn" onClick={() => setPaused((p) => !p)} title="Space">
            {paused ? "▶" : "⏸"}
          </button>
          <button type="button" className="sp-ibtn" onClick={toggleFs} title="Poori screen">
            {fs ? "⤡" : "⛶"}
          </button>
          <button type="button" className="sp-ibtn" onClick={finish} title="Sprint band karo">✕</button>
        </div>
        <div className="sp-bar"><div className="sp-bar__fill" style={{ width: `${((pos + 1) / batch.length) * 100}%` }} /></div>

        <div className="sp-body">
          <div className="sp-col">
            <SprintCard q={cur} n={pos + 1} total={batch.length} picked={picked} onPick={choose} />
          </div>
          <div className="sp-col">
            {test && picked == null && left > 0 ? (
              <div className="sp-wait">🤫 Pehle apna jawab chuno — uske baad hi khulega.{isVocab(cur) ? " (Neeche ke do button se.)" : ""}</div>
            ) : (
            <SprintAnswer
              qKey={curH}
              ds={ans[curH] || ""}
              err={errs[curH] || ""}
              loading={busy === curH}
              original={isVocab(cur) ? (cur.meaning || cur.def || "") : (cur.explanation || cur.solution || "")}
              solImg={cur.solImg || ""}
              // 📰 CA par sirf source ka apna jawab — koi tab nahi, koi
              // DeepSeek nahi.
              onlyOrig={cur._slug === "ca"}
            />
            )}
          </div>
        </div>

        <div className="sp-foot">
          {/* Vocab mein option hote hi nahi, isliye test ke liye ye do button
              hi "jawab" hain. */}
          {test && isVocab(cur) && picked == null && (
            <>
              <button type="button" className="sp-ibtn" onClick={() => choose(-1)}>✗ Nahi aata tha</button>
              <button type="button" className="sp-ibtn" onClick={() => choose(cur.answer ?? 0)}>✓ Yaad tha</button>
            </>
          )}
          <button type="button" className="sp-ibtn" onClick={prev} disabled={pos === 0}>← pichhla</button>
          <button type="button" className="sp-ibtn" onClick={next}>aage →</button>
          <span className="sp-keys">Space = ruko · ← → = question · M = bookmark</span>
        </div>
      </div>
    );
  }

  // ── taiyaari ───────────────────────────────────────────────────────────
  if (phase === "prep") {
    return (
      <section className="section" style={{ marginTop: 24 }}>
        <h2>🐋 Pehle {Math.min(WARM, batch.length)} jawab ban rahe hain…</h2>
        <p className="hint">
          {readyN}/{Math.min(WARM, batch.length)} ho gaye. Itne banne par daud apne aap shuru ho jayegi —
          baaki {Math.max(0, batch.length - WARM)} peechhe bante rahenge.
        </p>
        <div className="sp-prep">
          {batch.slice(0, WARM).map((q, i) => {
            const h = sHash(q);
            const ok = !!ans[h];
            const bad = !!errs[h];
            return (
              <div key={h + i} className={`sp-prep__row${ok ? " is-done" : bad ? " is-bad" : ""}`}>
                <span>{ok ? "✅" : bad ? "⚠️" : busy === h ? "⏳" : "·"}</span>
                <span className="sp-prep__txt">{bad ? errs[h] : preview(q)}</span>
              </div>
            );
          })}
        </div>
      </section>
    );
  }

  // ── shuru karne wali screen ────────────────────────────────────────────
  return (
    <>
      <section className="hero" style={{ paddingBottom: 8 }}>
        <div className="row between">
          <span className="hero__eyebrow">⚡ Sprint</span>
          <Link href="/pyq" className="btn btn--ghost btn--sm">← PYQ</Link>
        </div>
        <h1 className="hero__title" style={{ fontSize: "clamp(1.6rem, 4vw, 2.4rem)" }}>
          100 question, <span className="grad">ek ghanta</span>
        </h1>
        <p className="hero__sub">
          Har question par <b>30 second</b>, phir apne aap agla. Dayein taraf DeepSeek ka chhota jawab
          pehle se bana hua milega — book ka apna solution 📖 Asli tab mein. Jo question aa gaya wo
          agli baar nahi aayega.
        </p>
      </section>

      <section className="section">
        {/* Daud khatam — hisaab yahin, taaki agla sprint turant shuru ho sake. */}
        {summary && (
          <div className="sp-done">
            {summary.test ? (
              <>
                <b>📝 Test khatam</b> — {summary.seen} mein se{" "}
                <b>{summary.right} sahi</b> · {summary.wrong} galat
                {summary.right + summary.wrong
                  ? ` · ${Math.round((summary.right * 100) / (summary.right + summary.wrong))}%`
                  : ""}.
              </>
            ) : (
              <>
                <b>⚡ Sprint khatam</b> — {summary.seen} question dekhe · ✓ {summary.right} sahi · ✗ {summary.wrong} galat
                {markN ? ` · ★ ${markN} bookmark` : ""}.
                {" "}Ab tak kul <b>{doneN}</b> ho chuke — agli baar inke AGLE aayenge.
              </>
            )}
            <button type="button" className="linklike" onClick={() => setSummary(null)}> ✕</button>
          </div>
        )}
        <h3>1. Subject</h3>
        <div className="sp-picks">
          {PICKS.map((s) => (
            <button
              key={s.slug}
              type="button"
              className={`sp-pick${slug === s.slug ? " is-on" : ""}`}
              onClick={() => setSlug(s.slug)}
            >
              {s.icon} {s.label}
              {s.slug !== "mix" && (
                <span className="sp-pick__n">
                  {totals[s.slug] == null
                    ? "…"
                    : `${(doneMap[s.slug] || 0).toLocaleString("en-IN")} / ${totals[s.slug].toLocaleString("en-IN")}`}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Poora subject bhi ho sakta hai aur "sirf GKTricks ka Statics" bhi.
            Question yahan fetch nahi hote — sirf har bank ka index padha
            jata hai, isliye ye list turant bhar jati hai. */}
        {slug === "wrong" ? (
          <>
            <h3 className="mt-16">2. Kaun sa subject</h3>
            <div className="sp-selects">
              <label className="sp-sel">
                <span>Subject</span>
                <select value={book} onChange={(e) => setBook(e.target.value)}>
                  {WB_KINDS.map((k) => <option key={k.key} value={k.key}>{k.label}</option>)}
                </select>
              </label>
            </div>
            <p className="hint mt-8">Wahi question jo Answers page par pade hain — jo galat hue ya chhode.</p>
          </>
        ) : null}

        {slug === "ca" ? (
          <>
            <h3 className="mt-16">2. Kaun sa mahina</h3>
            <div className="sp-selects">
              <label className="sp-sel">
                <span>Mahina</span>
                <select value={book} onChange={(e) => setBook(e.target.value)}>
                  <option value="">— Saare mahine + mere import kiye —</option>
                  {caMonths.map((m) => (
                    <option key={m.period} value={m.period}>{m.label || m.period} ({m.count})</option>
                  ))}
                </select>
              </label>
            </div>
          </>
        ) : null}

        {slug === "vocab" ? (
          <>
            <h3 className="mt-16">2. Kis tarah ke word</h3>
            <div className="sp-selects">
              <label className="sp-sel">
                <span>Type</span>
                <select value={book} onChange={(e) => setBook(e.target.value)}>
                  {VOCAB_KINDS.map((k) => <option key={k.key} value={k.key}>{k.label}</option>)}
                </select>
              </label>
            </div>
            <p className="hint mt-8">Kram hamesha random rehta hai — ek hi tarah ke word ek saath nahi aayenge.</p>
          </>
        ) : null}

        {!NO_BOOKS.has(slug) ? (
          <>
            <h3 className="mt-16">2. Kahan se <span className="hint">(na chuno to poora subject)</span></h3>
            <div className="sp-selects">
              <label className="sp-sel">
                <span>Book</span>
                <select value={book} onChange={(e) => setBook(e.target.value)}>
                  <option value="">— Poora {labelOf(slug)} —</option>
                  {books.map((b) => <option key={b.id} value={b.id}>{b.icon} {b.label}</option>)}
                </select>
              </label>
              <label className="sp-sel">
                <span>Chapter</span>
                <select value={chap} onChange={(e) => setChap(e.target.value)} disabled={!book}>
                  <option value="">{book ? "— Is book ke saare chapter —" : "— pehle book chuno —"}</option>
                  {parts.map((p) => <option key={p.slug} value={p.slug}>{p.name} ({p.count})</option>)}
                </select>
              </label>
            </div>
          </>
        ) : null}

        <h3 className="mt-16">{slug === "mix" ? "2" : "3"}. Kitne question</h3>
        <div className="sp-picks">
          {COUNTS.map((c) => (
            <button
              key={c}
              type="button"
              className={`sp-pick${count === c ? " is-on" : ""}`}
              onClick={() => setCount(c)}
            >
              {c} <span className="sp-pick__sub">· {Math.round((c * SECS) / 60)} min</span>
            </button>
          ))}
        </div>

        {note ? <p className="hint mt-16">{note}</p> : null}

        <div className="row mt-16" style={{ gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => start()}
            disabled={phase === "loading"}
          >
            {phase === "loading" ? "…" : `⚡ Shuru karo — ${count} question`}
          </button>
          <Link href="/pyq/sprint/marks" className="btn btn--ghost btn--sm">★ Bookmarks ({markN})</Link>
        </div>

        {sets.length > 0 && (
          <>
            {/* 💾 Har daud ka set bach jata hai — wahi 100 question dobara
                chalane ke liye. Unke jawab pehle se bane pade hain, isliye
                dobara chalane mein paisa nahi lagta. */}
            <h3 className="mt-16">💾 Purane set</h3>
            <p className="hint">▶ se wahi set dobara padho · 📝 se usi set ka test do (jawab chhupa rehta hai)</p>
            <div className="sp-sets">
              {sets.map((st) => (
                <div key={st.id} className="sp-set">
                  <button type="button" className="sp-set__go" onClick={() => start(st)} disabled={phase === "loading"}>
                    ▶ {st.label}
                  </button>
                  {/* Isi set ka test — jawab save pade hain, isliye ek bhi naya
                      DeepSeek call nahi hota. */}
                  <button
                    type="button"
                    className="sp-set__del"
                    title="Is set ka test do"
                    onClick={() => start(st, true)}
                    disabled={phase === "loading"}
                  >📝</button>
                  <button
                    type="button"
                    className="sp-set__del"
                    title="Ye set hatao"
                    onClick={() => { removeSet(st.id); setSets(getSets()); }}
                  >🗑️</button>
                </div>
              ))}
            </div>
          </>
        )}

        <p className="hint mt-16">
          Ab tak <b>{doneN}</b> question ho chuke. · {count} question = {count} chhote DeepSeek call
          (har jawab teen line ka, sabse saste model se) — lagbhag ₹{Math.max(2, Math.round(count * 0.04))} ka kharcha.
          {doneN > 0 ? (
            <>
              {" "}
              <button
                type="button"
                className="linklike"
                onClick={() => {
                  if (!window.confirm(`${doneN} question ka hisaab saaf kar dein? Phir sab shuru se aayenge.`)) return;
                  clearDone();
                  setDoneN(0);
                  setNote("Hisaab saaf — ab pehle question se shuru hoga.");
                }}
              >
                hisaab saaf karo
              </button>
            </>
          ) : null}
        </p>
      </section>
    </>
  );
}
