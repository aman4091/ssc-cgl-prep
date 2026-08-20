"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  getWrongBook, getWrongById, isSubject, imagesOf, dayKey, dayLabel,
  subjectLabel, setInk, setOcrText,
  displayOrder,
} from "@/lib/wrongbook";
import { getDoneSet, isDone, toggleDone } from "@/lib/answersdone";
import {
  openInk, saveLocalInk, pushInk, emptyDoc, flushInkQueue, dropLocalInk,
  getConflictInk, clearConflictInk,
} from "@/lib/ink";
import { useImageUrls } from "@/lib/wrongimages";
import { setSyncPaused } from "@/lib/sync";
import { getQuiz, deleteQuiz } from "@/lib/storage";
import { recordAttempts } from "@/lib/qstats";
import { recordQuizAttempts } from "@/lib/qreview";
import { getSetResult, saveSetResult, marksOf, maxMarks, fmtMarks, accuracyOf } from "@/lib/settests";
import { doneKeyFor, markDoneMany } from "@/lib/qdone";
import { countMark } from "@/lib/qcounter";
import { notebookQ } from "@/lib/imgq";
import { makeSimilarQuiz } from "@/lib/similar";
import { readImageText } from "@/lib/client-ai";
import { imageBlob } from "@/lib/imgclip";
import InkCanvas, { PALETTE, PEN_SIZES } from "@/components/InkCanvas";
import WrongAnswerBlock from "@/components/WrongAnswerBlock";
import Markdown from "@/components/Markdown";

// ✍️ Solve — tablet par stylus se Wrong Notebook ke question ke neeche solution
// likhne ki jagah.
//
// Alag route isliye, /wrong ke card ke andar canvas thoos-ne ke bajay:
//  • Canvas ko apne poore area par `touch-action: none` chahiye. Card ki
//    scrolling list ke andar wo list ke apne scroll se ladta — "canvas ke paas
//    page scroll hi nahi hota" ya "likhne par page bhagta hai", dono kharab.
//  • Yahan poori screen chahiye: Navbar, Footer, orbs — kuch nahi.
//  • Prev/next ko viewport aur back button dono chahiye.
//
// URL wahi convention leta hai jo /wrong pehle se leta hai (?subject, ?d), taaki
// dono ke beech aana-jaana seedha rahe.

const LOCAL_MS = 700;    // IndexedDB — sasta, isliye jaldi
const CLOUD_MS = 6000;   // cloud upload band hai (lib/ink.js ka CLOUD switch) — sirf wapas chalu karne ke liye pada hai

// ⏱️ Per-question timer. Ek waqt chun lo — utna hi milta hai, phir agla question
// APNE AAP khul jata hai aur wahi waqt dobara chalu ho jata hai. Chain tab tak
// chalti hai jab tak khud na roko ya peeche na jao.
//
// Exam ki raftaar banane ke liye hai, isliye seconds mein — SSC mein ek maths
// question par itna hi waqt milta hai.
const TIMER_PRESETS = [36, 45, 60, 90];
// Device-local preference — `cgl.` prefix nahi, kyunki ye setting is device ki
// hai aur sync par bhejne layak nahi (aur wo localStorage waise bhi bhari hai).
const TIMER_KEY = "ink.timer";
const mmss = (s) => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.max(0, s) % 60).padStart(2, "0")}`;

// Quiz ke questions ko wrongbook-record ki shakl do.
//
// `id` stable rehna chahiye — ink isi se IndexedDB mein sambhalti hai, to reload
// ya wapas aane par har question ki apni writing wahi milti hai. `images: []`
// hone se image wala poora hissa apne aap chup jata hai, aur explanation
// `detail` mein jaata hai jahan se WrongAnswerBlock use dikhata hai.
function quizRecords(quizId, quiz) {
  if (!quiz || !Array.isArray(quiz.questions)) return [];
  return quiz.questions.map((q, i) => {
    // Maths aur Reasoning ke bank TASVEER ke hain: sawaal `qImg` mein hai aur
    // option `optImgs` mein — text wale `question`/`options` khali hote hain.
    // Pehle yahan sirf text uthaya jata tha, isliye un set par sawaal gayab
    // rehta tha aur sirf number dikhte the.
    const opts = Array.isArray(q.options) && q.options.filter(Boolean).length
      ? q.options
      : (Array.isArray(q.optText) && q.optText.filter(Boolean).length ? q.optText : []);
    // Tasveer wale question par uska text DOBARA mat likho — crop mein sawaal
    // pehle se poora likha hota hai. Sirf chapter ki Direction (instruction)
    // upar rehne do, wo aksar crop mein hoti hi nahi.
    const head = q.qImg ? (q.instruction || "") : (q.question || q.qText || "");
    return {
      id: `qz_${quizId}_${i}`,
      subject: quiz.subject || "math",
      q: {
        question: head,
        options: opts,
        // Option ki tasveerein — jahan text hai hi nahi.
        optImgs: Array.isArray(q.optImgs) ? q.optImgs : [],
        answer: Number.isInteger(q.answer) ? q.answer : 0,
        solution: q.solution || "",
      },
      // Sawaal ki tasveer wahi raasta leti hai jo wrong-book ki images leti
      // hain — useImageUrls URL ko waise hi aage bhej deta hai.
      images: q.qImg ? [{ url: q.qImg }] : [],
      solImg: q.solImg || "",
      // Asli question object — Mistake Notebook aur stats ko THEEK wahi
      // pehchaan chahiye jo screen wala test bhejta hai (lib/imgq), warna ek
      // hi question do alag naam se do baar chadh jata hai.
      _q: q,
      note: "",
      answer: "",
      qid: "",
      at: quiz.createdAt || new Date().toISOString(),
      detail: q.explanation || q.solution || "",
      _quiz: true,
    };
  });
}

function SolveInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const urlSubject = sp.get("subject");
  const subject = isSubject(urlSubject) ? urlSubject : "reasoning";
  const d = sp.get("d") || "all";
  const id = sp.get("id") || "";
  const quizId = sp.get("quiz") || "";
  // Wapas jaane ka pata — bhejne wala page deta hai (URL-encoded).
  const back = sp.get("back") ? decodeURIComponent(sp.get("back")) : "";
  // Poore test ki ghadi. Quiz player se "✍️ Stylus" dabane par bacha hua waqt
  // `?t=` mein saath aata hai — wahi 15-minute wala clock yahan aage chalta
  // hai. Iska per-question wale timer se koi lena-dena nahi; wo apni jagah
  // waisa hi hai (raftaar ke liye), ye poore paper ke liye.
  const examStart = Number(sp.get("t") || 0);
  const [examLeft, setExamLeft] = useState(examStart > 0 ? Math.floor(examStart) : 0);
  // Submit ho chuka ho to ghadi ruk jati hai — test khatam matlab khatam.
  const [submitted, setSubmitted] = useState(false);
  useEffect(() => {
    if (examStart <= 0 || submitted) return undefined;
    const t = setInterval(() => setExamLeft((v) => (v > 0 ? v - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [examStart, submitted]);

  // Wahi shelf jo /wrong par khuli thi — subject + date filter.
  //
  // List effect mein bharti hai, render ke dauraan nahi: getWrongBook()
  // localStorage padhta hai, jo server par hai hi nahi. Render mein padhte to
  // server khaali HTML bhejta aur client bhara hua — hydration mismatch, aur
  // React poora tree phenk kar dobara banata. /wrong bhi isi wajah se apne
  // items useEffect mein load karta hai.
  const [list, setList] = useState([]);
  const [qMeta, setQMeta] = useState(null);
  const [ready, setReady] = useState(false);

  // Do source ho sakte hain: wrong book ki shelf, ya ek generated quiz
  // (?quiz=<id>) — 🎯 20 similar ke naye questions.
  //
  // Quiz ke question ko wahi shakl de dete hain jo wrongbook record ki hai
  // (pseudo-record), taaki poora page — canvas, timer, prev/next, answer reveal,
  // WrongAnswerBlock — bina kisi badlaav ke chal jaye. Ink IndexedDB mein isi
  // synthetic id se sambhalti hai, to har generated question ki apni writing
  // bachti hai.
  useEffect(() => {
    if (quizId) {
      const load = () => {
        const quiz = getQuiz(quizId);
        setList(quizRecords(quizId, quiz));
        // Meta alag rakhte hain: quiz submit ke baad delete ho jata hai, par
        // Mistake Notebook ko subject/naam tabhi chahiye hote hain.
        setQMeta(quiz ? {
          source: quiz.source || "",
          subject: quiz.subject || "",
          title: quiz.title || "",
          // PYQ ke set ka pata — uska pichhla natija isi se milta hai.
          setKey: quiz.setKey || "",
          setIdx: quiz.setIdx ?? 0,
        } : null);
        setReady(true);
      };
      load();
      // 20 similar chhote batch mein bharta hai — naye questions aate hi list
      // mein aa jayein.
      const onAppend = (e) => { if (e.detail?.id === quizId) load(); };
      window.addEventListener("cgl:quiz-appended", onAppend);
      return () => window.removeEventListener("cgl:quiz-appended", onAppend);
    }
    const all = getWrongBook(subject);
    const shelf = d === "all" ? all : all.filter((r) => dayKey(r.at) === d);
    // WAHI kram jo /answers par dikhta hai (purana upar, naya neeche, ✅ neeche).
    // Pehle yahan getWrongBook ka apna newest-first kram chalta tha, aur nateeja
    // ye tha ki /answers ka pehla question yahan AAKHRI baithta — timer khatam
    // hone par "agla" hota hi nahi tha. Ek hi displayOrder dono jagah, taaki
    // dobara aisa na ho.
    setList(displayOrder(shelf, getDoneSet()));
    setReady(true);
    return undefined;
  }, [subject, d, quizId]);

  const found = list.findIndex((r) => r.id === id);
  const idx = Math.max(0, found);
  const rec = list[idx] || null;

  const [doc, setDoc] = useState(null);       // InkCanvas ko diya jane wala initial doc
  const [loading, setLoading] = useState(true);
  const [shown, setShown] = useState(false);  // answer reveal
  const [slim, setSlim] = useState(false);    // question pane collapse
  const [conflict, setConflict] = useState(null);
  const [state, setState] = useState("saved"); // saved | dirty | uploading | offline
  const [tool, setTool] = useState("pen");
  const [colorIdx, setColorIdx] = useState(0);
  const [sizeIdx, setSizeIdx] = useState(1);
  const [dark, setDark] = useState(false);
  const [, setStats] = useState({ strokes: 0 });

  const inkRef = useRef(null);
  const liveDoc = useRef(null);      // canvas ka latest doc
  const localT = useRef(null);
  const cloudT = useRef(null);
  const recRef = useRef(null);
  recRef.current = rec;

  const { urls, missing } = useImageUrls(rec ? imagesOf(rec) : []);

  // ── overlay: fullscreen + body lock ───────────────────────────────────────
  useEffect(() => {
    setDark(document.documentElement.getAttribute("data-theme") === "dark");
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Fullscreen best-effort — wahi pattern jo FullscreenRunner use karta hai.
    // Fail ho jaye to bhi .inkv overlay poori screen leta hi hai.
    try { document.documentElement.requestFullscreen?.().catch(() => {}); } catch { /* ignore */ }
    // IndexedDB storage pressure mein evict ho sakti hai — handwriting ke liye
    // ye maang lena zaroori hai, warna tablet ki jagah bharne par likha hua ja
    // sakta hai.
    try { navigator.storage?.persist?.(); } catch { /* ignore */ }
    return () => {
      document.body.style.overflow = prev;
      try { if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {}); } catch { /* ignore */ }
    };
  }, []);

  // Jab tak yahan likh rahe ho, background sync band. Uska poora-localStorage
  // hash main thread par chalta hai aur stroke ke beech aa jaye to nib rok deta
  // hai. Bahar niklte hi wapas chalu — tab wo pointer bhi le jayega.
  useEffect(() => {
    setSyncPaused(true);
    return () => setSyncPaused(false);
  }, []);

  // Ruki hui uploads — khulte hi aur online wapas aate hi.
  useEffect(() => {
    const flush = () => { flushInkQueue(getWrongById, setInk).catch(() => {}); };
    flush();
    window.addEventListener("online", flush);
    return () => window.removeEventListener("online", flush);
  }, []);

  // ── current record ka ink load ────────────────────────────────────────────
  useEffect(() => {
    if (!rec) { setLoading(false); return undefined; }
    let alive = true;
    setLoading(true);
    setShown(false);
    setConflict(null);
    (async () => {
      const r = await openInk(rec).catch(() => null);
      if (!alive) return;
      const next = r?.doc || emptyDoc();
      liveDoc.current = next;
      setDoc(next);
      setLoading(false);
      if (r?.conflict) setConflict(await getConflictInk(rec.id).catch(() => null));
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rec?.id]);

  // ── saving ────────────────────────────────────────────────────────────────

  // Pen kaagaz par ho to bhaari kaam mat karo — thodi der baad dobara try karo.
  //
  // Ye lag ki asli jad thi. onChange stroke KHATAM hone par 700ms ka timer
  // lagata hai. Agla stroke 500ms par shuru hua, to 700ms par save theek us
  // stroke ke BEECH chal padta tha. Aur saveLocalInk ke andar encodeDoc har
  // stroke ka har point ghoomta hai — yaani page jitna bharta jata, ye jhatka
  // utna hi bada hota jata. Isliye "shuru mein theek tha, baad mein atakne
  // laga".
  const deferIfDrawing = useCallback((fn, timerRef, ms = 350) => {
    if (inkRef.current?.isDrawing?.()) {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(fn, ms);
      return true;
    }
    return false;
  }, []);

  const flushLocal = useCallback(async () => {
    const r = recRef.current;
    if (!r || !liveDoc.current) return;
    if (deferIfDrawing(() => flushLocal(), localT)) return;
    clearTimeout(localT.current);
    try {
      await saveLocalInk(r.id, liveDoc.current);
      setState("saved");
    } catch {
      setState("offline");
    }
  }, [deferIfDrawing]);

  // Cloud upload ab band hai (lib/ink.js ka CLOUD switch) — handwriting isi
  // device par rehti hai. pushInk khud no-op hai, par call hi nahi karte taaki
  // encode+gzip ka kaam bhi na ho.
  const flushCloud = useCallback(async () => {
    if (!pushInk) return;
    const r = recRef.current;
    if (!r || !liveDoc.current) return;
    if (deferIfDrawing(() => flushCloud(), cloudT, 600)) return;
    clearTimeout(cloudT.current);
    try { await pushInk(r, liveDoc.current, setInk); } catch { /* device-local */ }
  }, [deferIfDrawing]);

  const onChange = useCallback((next) => {
    liveDoc.current = next;
    setState((s) => (s === "offline" ? s : "dirty"));
    clearTimeout(localT.current);
    localT.current = setTimeout(() => { flushLocal(); }, LOCAL_MS);
  }, [flushLocal]);

  // App background mein gaya / tab band — jo pending hai turant likh do.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") { flushLocal(); flushCloud(); }
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onHide);
      clearTimeout(localT.current);
      clearTimeout(cloudT.current);
    };
  }, [flushLocal, flushCloud]);

  // ── navigation ────────────────────────────────────────────────────────────
  // Local save ka INTEZAAR karke hi agla question kholte hain. "Next dabaya aur
  // page chala gaya" ek baar bhi ho gaya to is feature par bharosa khatam.
  const go = useCallback(async (nextIdx) => {
    const target = list[nextIdx];
    if (!target) return;
    await flushLocal();
    flushCloud();
    // URL ko naye sire se MAT banao — sirf `id` badlo.
    //
    // Pehle yahan poora pata dobara likha jata tha (`?quiz=..&id=..`), aur usme
    // `t` (ghadi) aur `back` (wapas ka pata) dono chhoot jate the. Nateeja:
    // pehla hi "agla question" dabate hi ghadi gayab ho jati thi (examStart
    // ab 0 padhta) aur back Answers page par bhej deta tha. Ek hi jad, do
    // shikayat.
    const next = new URLSearchParams(sp.toString());
    next.set("id", target.id);
    if (!quizId && !next.get("subject")) next.set("subject", subject);
    router.replace(`/wrong/solve?${next.toString()}`);
  }, [list, flushLocal, flushCloud, router, subject, quizId, sp]);

  // Wapas Answers page par — /wrong hata diya gaya hai, ab wahi list yahan
  // dikhti hai. Date filter uske paas nahi hai, isliye sirf subject le jaate hain.
  // Quiz mode se nikalte waqt quiz player par, taaki score/review mil sake.
  // Submit ho chuka ya nahi — exit ko ye chahiye, par wo state neeche banti
  // hai. Ref se padhna surakshit hai (render ke waqt nahi padha jata).
  const showResultRef = useRef(false);
  // Wahi wajah:  bhi exit se NEECHE banti hai.
  const listRef = useRef([]);

  const exit = useCallback(async () => {
    await flushLocal();
    flushCloud();
    // Jahan se aaye the wahin wapas. Bhejne wala page apna pata `?back=` mein
    // de deta hai (PYQ ka chapter, quiz ka page). Pehle yahan hamesha /answers
    // tha — reasoning ka set lagao aur back dabao to Answers page khul jata
    // tha, jo poori tarah bhatka deta hai.
    // PYQ ke set ka page hamesha khulta hai (QBoard set dobara bana leta hai).
    // Aam quiz submit hote hi delete ho jata hai, isliye uske BAAD wahan
    // bhejne ka matlab "Quiz not found" — tab Answers hi theek hai.
    // Bina submit kiye nikal rahe ho? To chuna hua option BHI aur rough work
    // BHI saaf. Set abhi diya hi nahi gaya — agli baar purane nishaan aur
    // aadhi-likhi copy saamne aane se lagta hai ki test beech mein pada hai.
    //
    // Sirf quiz/set ke pseudo-record par (`_quiz`). Wrong Notebook
    // ki asli handwriting ko haath NAHI lagate — wo mehnat se likhi hoti hai
    // aur mit gayi to wapas nahi aati.
    if (!showResultRef.current && quizId) {
      try { localStorage.removeItem(`ink.picks.${quizId}`); } catch { /* ignore */ }
      for (const r of listRef.current) {
        if (r?._quiz && r.id) { try { await dropLocalInk(r.id); } catch { /* ignore */ } }
      }
    }
    if (back && (qMeta?.source === "set" || !showResultRef.current)) { router.push(back); return; }
    router.push(`/answers?subject=${subject}`);
    // `showResult` deps mein JAAN-BOOJH KAR nahi hai — wo neeche declare hota
    // hai aur deps array render ke waqt hi padh liya jata hai, to yahan likhne
    // se "Cannot access 'showResult' before initialization" aata hai aur poora
    // page hi nahi khulta (wahi keeda jo stopTimer ke saath tha). Isliye ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flushLocal, flushCloud, router, subject, quizId, back, qMeta]);

  // ── Quiz mode: jawab chunna aur ant mein result ───────────────────────────
  //
  // Quiz ka poora matlab yahi hai ki answer beech mein na dikhe — pehle saare
  // question karo, phir ek saath dekho. Isliye yahan "Check karo" nahi hai;
  // option dabate hi bas agla question khul jata hai, sahi/galat kuch nahi
  // batata. Sab khatam hone par result screen aata hai.
  //
  // Picks localStorage mein (device-local, bina cgl. prefix) taaki galti se
  // reload ho jaye to attempt na ude.
  const [picks, setPicks] = useState({});
  const [showResult, setShowResult] = useState(false);
  showResultRef.current = showResult;
  listRef.current = list;
  const [resultRows, setResultRows] = useState([]);
  const picksKey = quizId ? `ink.picks.${quizId}` : "";

  // PYQ ka jo set pehle diya ja chuka hai, uska natija settests mein pada hai.
  // Wahi yahan bhi chahiye: kholte hi sahi/galat dikhe (test dobara shuru na
  // ho), aur submit par uske question notebook mein DOBARA na chadhein.
  const prior = qMeta?.setKey ? getSetResult(qMeta.setKey, qMeta.setIdx) : null;
  // Review mode = pehle ka natija saamne hai. 🙈 dabate hi ye band ho jata hai
  // aur set phir se khud solve karne ke liye khul jata hai.
  const [hideAns, setHideAns] = useState(false);
  const reviewing = !!prior && !hideAns;

  useEffect(() => {
    if (!picksKey) return;
    // Pehle ka attempt pada ho to wahi bhar do — warna khula hua set ek naye
    // test jaisa lagta tha aur pichhla kaam kahin dikhta hi nahi tha.
    // 🙈 chalu ho to pichhla attempt NAHI bharna — poora matlab hi yahi hai ki
    // set saaf mile. (Pehle yahan shart nahi thi, isliye chhupate hi picks
    // wapas bhar jate the aur jawab phir se dikhne lagta tha.)
    const saved = !hideAns && prior?.picks
      ? Object.fromEntries(list.map((r, i) => [r.id, prior.picks[i]?.opt]).filter(([, v]) => v !== undefined))
      : null;
    if (saved && Object.keys(saved).length) { setPicks(saved); setShowResult(false); return; }
    try { setPicks(JSON.parse(localStorage.getItem(picksKey) || "{}") || {}); }
    catch { setPicks({}); }
    setShowResult(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picksKey, list.length, hideAns]);

  const answered = list.filter((r) => picks[r.id] !== undefined).length;
  // Pichhli baar kaunsa option lagaya tha (aur sahi tha ya nahi) — 🙈 mode ka
  // "first attempt" nishaan isi se banta hai.
  const firstPickOf = (i) => prior?.picks?.[i]?.opt;
  const firstOkOf = (i) => !!prior?.picks?.[i]?.correct;
  // 🙈 chalu/band. Chalu karte hi apne chune hue option mit jate hain, taaki
  // set bilkul saaf mile.
  const toggleHide = () => {
    setHideAns((v) => {
      const next = !v;
      if (next) { setPicks({}); try { localStorage.removeItem(picksKey); } catch { /* ignore */ } }
      return next;
    });
    setShowResult(false);
  };

  // Quiz khatam — galat questions Mistake Notebook mein, phir quiz khud delete.
  //
  // Recording wahi do call hain jo quiz player use karta hai, taaki stylus se
  // diya gaya quiz bhi wahi nishaan chhode: qstats (attempt/accuracy) aur
  // qreview (Mistake Notebook ki wrong bucket).
  //
  // Quiz delete hone ke baad bhi result dikhna chahiye, isliye rows ka snapshot
  // pehle state mein le lete hain — screen `list` par tiki rehti to quiz hatte
  // hi khaali ho jati.
  const finish = useCallback((finalPicks) => {
    stopTimer();
    const rows = list.map((r, i) => {
      const p = finalPicks[r.id];
      const right = r.q?.answer ?? 0;
      return {
        id: r.id, i, p, right,
        question: r.q?.question || "",
        options: r.q?.options || [],
        // Tasveer wale bank ka natija bina inke khaali dikhta tha — na sawaal,
        // na "tumne kya lagaya".
        qImg: r.images?.[0]?.url || "",
        optImgs: r.q?.optImgs || [],
        detail: r.detail || "",
        nq: r._q,
        ok: p === right,
        skipped: p === undefined,
      };
    });
    setResultRows(rows);
    setShowResult(true);
    setSubmitted(true);

    try {
      // Pehchaan ASLI question se banti hai (aur tasveer wale bank mein uske
      // text-roop se, lib/imgq) — wahi jo screen wala test bhejta hai. Pehle
      // yahan ek naya object joda jata tha, isliye Maths/Reasoning ka wahi
      // question notebook mein DOOSRE naam se dobara chadh jata tha.
      const kind = qMeta?.subject === "reasoning" ? "reason" : "math";
      const nqOf = (x) => notebookQ(x.nq, x.nq?._card || kind)
        || { question: x.question, options: x.options, answer: x.right };
      const attempted = rows.filter((x) => !x.skipped);
      const items = attempted.map((x) => ({ q: nqOf(x), correct: x.ok }));
      recordAttempts(items);
      // PYQ ke set se aaya quiz? To galat/chhode question Mistake Notebook mein
      // jaane chahiye — bilkul waise hi jaise screen par test dene par jaate
      // hain. Baaki quiz (20 similar, notes ka quiz) ke liye `fromPyq` nahi
      // hota, isliye wo naya record nahi banate (lib/qreview ka niyam).
      const fromPyq = qMeta?.source === "set";
      const skipped = rows.filter((x) => x.skipped).map((x) => ({ q: nqOf(x), correct: false }));
      recordQuizAttempts([...items, ...(fromPyq ? skipped : [])].map((it) => ({
        ...it,
        subject: qMeta?.subject || "",
        source: fromPyq ? "chapter" : "similar",
        category: fromPyq ? (qMeta?.title || "PYQ set") : "Similar · stylus",
        fromPyq,
        // Ye set pehle diya ja chuka hai — to notebook mein NAYA record nahi
        // banega, sirf jo pehle se pada hai wo sudhrega. Warna har dobara-
        // attempt par wahi question phir se jama hota rehta.
        onlyExisting: !!prior,
      })));
      // PYQ ka set hai to uska NATIJA bhi wahin darj karo jahan screen wala
      // test karta hai. Bina iske chapter page par set "naya ka naya" dikhta
      // rehta tha — na marks, na "Attempt again", kuch nahi.
      if (fromPyq && qMeta?.setKey) {
        const rt = rows.filter((x) => x.ok).length;
        const ans = rows.filter((x) => !x.skipped).length;
        saveSetResult(qMeta.setKey, qMeta.setIdx, {
          right: rt,
          wrong: ans - rt,
          skipped: rows.length - ans,
          total: rows.length,
          sec: examStart > 0 ? Math.max(0, examStart - examLeft) : 0,
          picks: Object.fromEntries(
            rows.filter((x) => !x.skipped).map((x) => [x.i, { opt: x.p, correct: x.ok }]),
          ),
        });
        // Set de diya = uske saare question "ho gaye", aur "🔢 Aaj" mein bhi
        // gin lo — bilkul screen wale test jaisa.
        const qs = rows.map((x) => x.nq).filter(Boolean);
        markDoneMany(qs);
        for (const qq of qs) countMark(doneKeyFor(qq), qMeta.subject, true);
      }
    } catch { /* recording fail ho to bhi result dikhna chahiye */ }

    // Quiz ab bekaar hai — galat questions Mistake Notebook mein ja chuke.
    // Rakhne se sirf localStorage bharta hai (jo pehle se cap ke kagaar par hai).
    try { deleteQuiz(quizId); localStorage.removeItem(picksKey); } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list, quizId, picksKey, qMeta, examStart, examLeft]);
  // stopTimer deps mein JAAN-BOOJH KAR nahi hai: wo neeche timer wale hisse mein
  // declare hota hai, aur deps array render ke waqt hi evaluate ho jata hai —
  // yaani wahan use likhne se "Cannot access 'stopTimer' before initialization"
  // aata hai aur poora page hi nahi khulta. Body mein use karna theek hai, wo
  // baad mein chalti hai.

  // Ghadi zero = test khatam. Yahi to timer ka matlab hai, isliye submit khud
  // ho jata hai — natija isi parde par khulta hai, page nahi badalta.
  //
  // Ye SIRF tab hai jab ghadi chal rahi ho (?t= aaya ho). Pehle diya hua set
  // ya bina timer wala parda dekhte waqt kuch apne aap nahi hota.
  useEffect(() => {
    if (examStart > 0 && examLeft === 0 && quizId && !showResult) finish(picks);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examLeft, examStart, quizId, showResult]);

  const pick = (optIdx) => {
    if (!rec) return;
    const next = { ...picks, [rec.id]: optIdx };
    setPicks(next);
    try { localStorage.setItem(picksKey, JSON.stringify(next)); } catch { /* quota */ }
    // 🙈 mode aur pehle diye hue set mein aage NAHI bhagte: wahan option
    // dabane ka matlab hai "ab jawab dikhao" — aur agar screen turant badal
    // jaye to wo jawab dikhta hi nahi. Aur aakhri question par bhi khud submit
    // nahi hota; Result tum dabaoge.
    if (hideAns || prior) return;
    // Naye test mein: chuna aur aage — theek waise hi jaise timer khatam hone
    // par hota hai.
    if (idx < list.length - 1) setTimeout(() => go(idx + 1), 220);
    else finish(next);
  };

  // ── 🎯 20 similar ─────────────────────────────────────────────────────────
  // Isi question jaise 20 naye banao aur UNHE BHI yahin stylus se solve karo —
  // quiz player par jaane ki zaroorat nahi. Sirf maths/reasoning ke liye, kyunki
  // english/GS mein "similar" ka matlab nahi banta.
  const [simBusy, setSimBusy] = useState("");
  const canSimilar = rec && !rec._quiz && (rec.subject === "math" || rec.subject === "reasoning");

  const make20 = async () => {
    if (!rec) return;
    setSimBusy("…");
    try {
      // Generator ko TEXT chahiye. Image-only question par wo hota nahi, isliye
      // ek baar OCR chala kar record par cache kar lete hain — wo plain text hai,
      // to agli baar (aur dusre device par) dobara nahi padhna padta.
      let question = rec.q?.question || rec.ocrText || "";
      const options = (rec.q?.options || []).filter(Boolean);
      if (!question) {
        const imgs = imagesOf(rec);
        if (!imgs.length) throw new Error("Is question ka na text hai na image.");
        setSimBusy("OCR…");
        const blob = await imageBlob(imgs[0]);
        const { text } = await readImageText(blob, (p) => setSimBusy(`OCR ${Math.round(p * 100)}%`));
        question = (text || "").trim();
        if (!question) throw new Error("Image se text nahi mila.");
        setOcrText(rec.id, question);
      }
      setSimBusy("bana raha…");
      const newQuizId = await makeSimilarQuiz({ question, options }, rec.subject, "Similar · stylus");
      stopTimer();
      await flushLocal();
      router.push(`/wrong/solve?quiz=${newQuizId}`);
    } catch (e) {
      setSimBusy("");
      alert(e.message || "Similar nahi ban paye.");
    }
  };

  // ── ⏱️ Timer ──────────────────────────────────────────────────────────────
  // `dur` chuna hua waqt hai (yaad rehta hai), `running` chain chal rahi hai ya
  // nahi, `left` bacha hua waqt.
  const [dur, setDur] = useState(0);
  const [running, setRunning] = useState(false);
  const [left, setLeft] = useState(0);
  const [tOpen, setTOpen] = useState(false);

  useEffect(() => {
    try { setDur(Number(localStorage.getItem(TIMER_KEY)) || 0); } catch { /* ignore */ }
  }, []);

  const startTimer = (secs) => {
    setDur(secs);
    setLeft(secs);
    setRunning(true);
    setTOpen(false);
    try { localStorage.setItem(TIMER_KEY, String(secs)); } catch { /* ignore */ }
  };
  const stopTimer = () => { setRunning(false); setTOpen(false); };

  // Ghadi — har second ek.
  useEffect(() => {
    if (!running || !dur) return undefined;
    const id = setInterval(() => setLeft((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [running, dur]);

  // Waqt khatam — agla question apne aap. Aakhri par pahunch gaye to chain
  // apne aap ruk jati hai, warna wo wahin baar-baar bajti rehti.
  useEffect(() => {
    if (!running || left > 0) return;
    if (idx < list.length - 1) go(idx + 1);
    else setRunning(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left, running]);

  // Naya question khula (chahe timer se, chahe haath se) — ghadi phir se poori.
  useEffect(() => {
    if (running && dur) setLeft(dur);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rec?.id]);

  // ── ✅ Ho gaya ────────────────────────────────────────────────────────────
  // Wahi mark jo /answers ke card par hai (lib/answersdone.js), taaki tablet par
  // solve karte-karte hi nishaan lag jaye aur wo question wahan sabse neeche
  // chala jaye.
  //
  // Mark lagne par yahan ki list ko DOBARA sort NAHI karte, jaan-boojh kar: kram
  // page khulte waqt ek baar tay hota hai, aur beech mein badal dene se `idx`
  // khisak jata — ✅ dabate hi kisi aur question par pahunch jaate. Naya kram
  // agli baar khulne par.
  const [doneNow, setDoneNow] = useState(false);
  useEffect(() => {
    setDoneNow(rec && !rec._quiz ? isDone(rec.id) : false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rec?.id]);

  const markDone = () => {
    if (!rec) return;
    try { setDoneNow(toggleDone(rec.id)); } catch { /* localStorage bhara — mark chhod do */ }
  };

  // Eraser toggle karte waqt wapas usi tool par jaana hai jispar tha (pen ya
  // highlighter), isliye pichhla tool yaad rakhte hain.
  const prevTool = useRef("pen");
  const toggleEraser = useCallback(() => {
    setTool((t) => {
      if (t === "eraser") return prevTool.current || "pen";
      prevTool.current = t;
      return "eraser";
    });
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      // Mi Pen ke side buttons Bluetooth se PageUp/PageDown bhejte hain — wo
      // digitizer se nahi aate, isliye pointer event ke `buttons` mein kabhi
      // nahi dikhte. Yahi unhe pakadne ka ekmatra raasta hai.
      //
      // Is pen mein eraser waala ulta sira bhi nahi hai, isliye eraser ko
      // button par daalna sabse zyada kaam ka hai; dusra button undo.
      //
      // preventDefault zaroori hai — warna ye keys likhne wale kaagaz ko hi
      // scroll kar dengi. repeat wale ignore, warna button dabaye rakhne par
      // eraser jhilmilata rahega aur undo ka dhher lag jayega.
      if (e.key === "PageDown" || e.key === "PageUp") {
        e.preventDefault();
        if (e.repeat) return;
        if (e.key === "PageDown") toggleEraser();
        else inkRef.current?.undo();
        return;
      }
      if (e.key === "ArrowRight") go(idx + 1);
      else if (e.key === "ArrowLeft") go(idx - 1);
      else if (e.key === "Escape") exit();
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) inkRef.current?.redo();
        else inkRef.current?.undo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, exit, idx, toggleEraser]);

  if (!rec) {
    return (
      <div className="inkv">
        <div className="inkv__top">
          <button className="btn btn--ghost btn--sm" onClick={() => router.push("/answers")}>← Wapas</button>
          <span className="inkv__title">Solve</span>
        </div>
        <div className="placeholder" style={{ margin: 20 }}>
          {ready ? "Is shelf mein koi question nahi mila. 🤔" : "Khul raha hai…"}
        </div>
      </div>
    );
  }

  // Ink device-local hai, to "upload" jaisa koi haal nahi bacha. "offline" ab
  // sirf ek hi matlab rakhta hai: device par likhna hi fail ho gaya.
  const stateLabel = { saved: "💾 saved", dirty: "✍️ …", uploading: "💾 saved", offline: "⚠️ save fail" }[state];

  // Result — sab khatam hone ke baad ek saath. Har row se us question par wapas
  // ja sakte ho, taaki apna rough work dobara dekh sako.
  if (showResult && quizId) {
    const rows = resultRows;
    const score = rows.filter((x) => x.ok).length;
    const wrongN = rows.filter((x) => !x.ok).length;
    return (
      <div className="inkv">
        <div className="inkv__top">
          <button className="btn btn--ghost btn--sm" onClick={exit}>←</button>
          <span className="inkv__title">🏁 Result · {score}/{list.length}</span>
          <button className="btn btn--ghost btn--sm" style={{ marginLeft: "auto" }} onClick={() => setShowResult(false)}>
            ← Questions par wapas
          </button>
        </div>
        <div className="inkv__result">
          {/* Wahi hisaab jo screen wale test ke baad aata hai — Right, Wrong,
              Marks (+2 / -0.5), Accuracy aur Time. Pehle yahan sirf "5/25"
              likha aata tha aur baaki kuch nahi. */}
          {(() => {
            const attempted = rows.filter((x) => !x.skipped).length;
            const r = { right: score, wrong: attempted - score, total: rows.length };
            const secs = examStart > 0 ? Math.max(0, examStart - examLeft) : 0;
            return (
              <div className="qboard__result" style={{ marginBottom: 12 }}>
                <span className="res res--right"><b>{score}</b> Right</span>
                <span className="res res--wrong"><b>{attempted - score}</b> Wrong</span>
                <span className="res res--marks"><b>{fmtMarks(marksOf(r))}</b> / {maxMarks(rows.length)} Marks</span>
                <span className="res res--acc"><b>{accuracyOf(r)}%</b> Accuracy</span>
                {secs > 0 && <span className="res res--time"><b>{mmss(secs)}</b> Time</span>}
                <span className="res res--skip"><b>{rows.length - attempted}</b> Skipped</span>
              </div>
            );
          })()}
          <p className="muted" style={{ fontSize: "0.86rem", marginBottom: 12 }}>
            {wrongN > 0
              ? `❌ ${wrongN} galat/chhoda question Mistake Notebook mein chala gaya.`
              : "✅ Sab sahi."}
          </p>
          {rows.map(({ id: rid, i, p, right, ok, skipped, question, options, detail, qImg, optImgs }) => (
            <div key={rid} className={`inkv__rrow${ok ? " is-ok" : skipped ? " is-skip" : " is-bad"}`}>
              <div className="row between">
                <strong>{ok ? "✅" : skipped ? "⏭️" : "❌"} Q{i + 1}</strong>
                <button className="btn btn--ghost btn--sm" onClick={() => { setShowResult(false); go(i); }}>
                  ✍️ Rough work dekho
                </button>
              </div>
              {/* Tasveer wale bank mein `question` khali hota hai — wahan crop
                  hi sawaal hai, isliye natije mein bhi wahi dikhata hai. */}
              {qImg
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={qImg} alt={`Question ${i + 1}`} style={{ width: "100%", maxWidth: 520, borderRadius: 6, background: "#fff", margin: "6px 0" }} />
                : <p style={{ whiteSpace: "pre-wrap", margin: "6px 0" }}>{question}</p>}
              <p className="muted" style={{ fontSize: "0.86rem" }}>
                Tumne: {skipped ? "chhod diya" : `${String.fromCharCode(65 + p)}) ${options[p] ?? ""}`}
                {" · "}Sahi: {String.fromCharCode(65 + right)}) {options[right] ?? ""}
              </p>
              {optImgs?.length > 0 && (
                <p className="muted" style={{ fontSize: "0.86rem", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  {!skipped && <>Tumne: <img className="inkv__optimg" src={optImgs[p]} alt="tumhara jawab" /></>}
                  Sahi: <img className="inkv__optimg" src={optImgs[right]} alt="sahi jawab" />
                </p>
              )}
              {detail && (
                <div className="answer-box mt-8" style={{ fontSize: "0.88rem" }}>
                  <Markdown>{detail}</Markdown>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="inkv">
      <div className="inkv__top">
        <button className="btn btn--ghost btn--sm" onClick={exit} title="Wrong Notebook par wapas">←</button>
        <span className="inkv__title">
          {rec._quiz
            ? `🎯 Similar · ${subjectLabel(rec.subject)}`
            : `${subjectLabel(rec.subject)} · ${dayLabel(rec.at)}${rec.qid ? ` · 🔖 ${rec.qid}` : ""}`}
        </span>
        <span className="inkv__pill" style={{ marginLeft: "auto" }}>{stateLabel}</span>

        {examStart > 0 && !submitted && (
          <span
            className={`inkv__pill inkv__exam${examLeft <= 60 ? " is-low" : ""}`}
            title="Poore test ka bacha hua waqt — quiz player se saath aaya hai"
          >
            {examLeft > 0 ? `⏱ ${mmss(examLeft)}` : "⏱ samay khatam"}
          </span>
        )}

        {/* ⏱️ — band ho to ghadi ka nishaan, chalu ho to bacha hua waqt.
            Dabate hi waqt chunne ka chhota panel khulta hai. */}
        <div className="inkv__timer">
          <button
            className={`inkv__pill inkv__tbtn${running ? " is-on" : ""}${running && left <= 10 ? " is-low" : ""}`}
            onClick={() => setTOpen((v) => !v)}
            title="Har question ke liye waqt set karo"
          >
            {running ? `⏱ ${mmss(left)}` : "⏱"}
          </button>
          {tOpen && (
            <div className="inkv__tmenu">
              <span className="inkv__tnote">Har question ko itna waqt — phir agla apne aap</span>
              <div className="row" style={{ gap: 6 }}>
                {TIMER_PRESETS.map((s) => (
                  <button
                    key={s}
                    className={`btn btn--ghost btn--sm${dur === s && running ? " is-on" : ""}`}
                    onClick={() => startTimer(s)}
                  >
                    {s}s
                  </button>
                ))}
              </div>
              {running && (
                <button className="btn btn--ghost btn--sm btn--block mt-8" onClick={stopTimer}>⏹ Rok do</button>
              )}
            </div>
          )}
        </div>

        <span className="inkv__pill">{idx + 1}/{list.length}</span>
      </div>

      <div className="inkv__body">
        {/* Question palette — wahi jo test wale parde par hai: kaunsa question
            ho chuka, kaunsa baaki, aur seedha kisi par jaana. Sirf quiz mode
            mein; wrong-book ki shelf apni date/subject se chalti hai. */}
        {quizId && list.length > 1 && (
          <nav className="inkv__pal">
            {list.map((r, i) => {
              // Pehle diya hua set dekh rahe ho to number apna natija batata
              // hai — hara sahi, laal galat, dhundhla chhoda hua. 🙈 mode aur
              // naye test mein sirf "kiya ya nahi", warna rang hi jawab bata
              // deta.
              const p = picks[r.id];
              const state = reviewing
                ? (p === undefined ? "is-skip" : p === r.q?.answer ? "is-right" : "is-wrong")
                : (p !== undefined ? "is-ans" : "");
              return (
                <a key={r.id} onClick={() => go(i)} className={`${state}${i === idx ? " is-cur" : ""}`}>
                  {i + 1}
                </a>
              );
            })}
          </nav>
        )}
        <div className={`inkv__q${slim ? " inkv__q--slim" : ""}`}>
          <div className="row" style={{ gap: 6, marginBottom: slim ? 0 : 8 }}>
            <button className="btn btn--ghost btn--sm" onClick={() => setSlim((v) => !v)}>
              {slim ? "▼ Question" : "▲ Chhupao"}
            </button>
            {/* Quiz mode mein "Check karo" nahi — quiz ka matlab hi yahi hai ki
                answer beech mein na dikhe. Sab khatam hone par ek saath. */}
            {!slim && !quizId && (
              <button className="btn btn--ghost btn--sm" onClick={() => setShown((v) => !v)}>
                {shown ? "🙈 Hide" : "👁️ Check karo"}
              </button>
            )}
            {!slim && quizId && !submitted && !prior && (
              <button className="btn btn--ghost btn--sm" onClick={() => finish(picks)}>
                🏁 Result ({answered}/{list.length})
              </button>
            )}
            {/* Pehle diya hua set: jawab saamne hain. Ise dabate hi sab chhup
                jata hai aur set khud se dobara solve karne ke liye khul jata
                hai — jaise screen wale test mein hota hai. */}
            {!slim && quizId && prior && (
              <button className="btn btn--ghost btn--sm" onClick={toggleHide}>
                {hideAns ? "👁️ Answers dikhao" : "🙈 Answers chhupao"}
              </button>
            )}
            {/* Quiz ke pseudo-records wrong book mein hain hi nahi — unhe mark
                karne se sirf `cgl.answersDone` mein bekaar ids jama hoti. */}
            {!quizId && (
              <button
                className="btn btn--ghost btn--sm"
                aria-pressed={doneNow}
                onClick={markDone}
                title="Answers page par ye question sabse neeche chala jayega"
                style={{ marginLeft: "auto" }}
              >
                {doneNow ? "✅ Ho gaya" : "☑️ Ho gaya"}
              </button>
            )}
          </div>

          {!slim && (
            <>
              {urls.map((u, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={u} alt={`Question ${i + 1}`} />
              ))}
              {missing > 0 && (
                <p className="muted" style={{ fontSize: "0.8rem" }}>
                  📷 {missing} image is device par nahi hai (R2 par upload nahi hui thi).
                </p>
              )}

              {quizId ? (
                // Quiz: option dabao = jawab. Sahi/galat abhi nahi batate — bas
                // agla question khul jata hai. Nishaan sirf itna ki kaunsa chuna.
                <>
                  {rec.q?.question && <p style={{ fontWeight: 600, whiteSpace: "pre-wrap" }}>{rec.q.question}</p>}
                  <div className="mt-8" style={{ display: "grid", gap: 6 }}>
                    {(rec.q?.optImgs?.length
                      ? rec.q.optImgs
                      : (rec.q?.options || []).filter(Boolean)
                    ).map((o, i) => {
                      // Jawab kab khule: pehle diya hua set dekh rahe ho (tab
                      // shuru se), ya 🙈 mode mein is question ka jawab de
                      // diya ho. Naye test mein kabhi nahi.
                      const open = reviewing || (hideAns && picks[rec.id] !== undefined);
                      const right = open && i === rec.q?.answer;
                      const wrong = open && picks[rec.id] === i && i !== rec.q?.answer;
                      return (
                        <button
                          key={i}
                          className={`inkv__opt${picks[rec.id] === i ? " is-picked" : ""}${right ? " is-right" : ""}${wrong ? " is-wrong" : ""}`}
                          onClick={() => pick(i)}
                        >
                          <strong>{String.fromCharCode(65 + i)}</strong>{" "}
                          {rec.q?.optImgs?.length
                            // eslint-disable-next-line @next/next/no-img-element
                            ? <img className="inkv__optimg" src={o} alt={`Option ${String.fromCharCode(65 + i)}`} />
                            : o}
                          {/* 🙈 mode mein: pichhli baar isi option par haath
                              gaya tha. Jawab khulne ke BAAD hi dikhta hai. */}
                          {hideAns && open && firstPickOf(idx) === i && (
                            <span className={`qcard__first${firstOkOf(idx) ? " is-ok" : " is-bad"}`}>first attempt</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  {(reviewing || (hideAns && picks[rec.id] !== undefined)) && (
                    <div className="answer-box mt-8" style={{ fontSize: "0.9rem" }}>
                      <b style={{ color: "var(--success)" }}>
                        ✓ Sahi jawab: {String.fromCharCode(65 + (rec.q?.answer ?? 0))}
                      </b>
                      {rec.detail && <div className="mt-8"><Markdown>{rec.detail}</Markdown></div>}
                    </div>
                  )}
                </>
              ) : (
                /* Answer jaan-boojh kar chhupa hai — /wrong ke card par wo hamesha
                   dikhta hai, par yahan pehle likhna hai, phir check karna hai. */
                <WrongAnswerBlock rec={rec} shown={shown} hideAnswer />
              )}
            </>
          )}
        </div>

        <div className="inkv__ink">
          {conflict && (
            <div className="answer-box" style={{ position: "absolute", inset: "8px 8px auto", zIndex: 3 }}>
              <p style={{ fontSize: "0.84rem", fontWeight: 600 }}>
                ⚠️ Dusre device ki nayi writing aa gayi. Is device ka bina-save kiya kaam bacha liya gaya hai.
              </p>
              <div className="row mt-8" style={{ gap: 8 }}>
                <button
                  className="btn btn--primary btn--sm"
                  onClick={() => {
                    liveDoc.current = conflict.doc;
                    setDoc(conflict.doc);
                    onChange(conflict.doc);
                    clearConflictInk(rec.id);
                    setConflict(null);
                  }}
                >
                  ↩ Mera waala wapas lao
                </button>
                <button
                  className="btn btn--ghost btn--sm"
                  onClick={() => { clearConflictInk(rec.id); setConflict(null); }}
                >
                  Rehne do
                </button>
              </div>
            </div>
          )}
          {loading ? (
            <div className="placeholder" style={{ margin: 16 }}>Writing load ho rahi hai… ✍️</div>
          ) : (
            <InkCanvas
              ref={inkRef}
              initialDoc={doc}
              tool={tool}
              colorIdx={colorIdx}
              sizeIdx={sizeIdx}
              dark={dark}
              onChange={onChange}
              onStats={setStats}
            />
          )}
        </div>
      </div>

      <div className="inkv__tools">
        <button className="btn btn--ghost btn--sm" aria-pressed={tool === "pen"} onClick={() => setTool("pen")} title="Pen">✏️</button>
        <button className="btn btn--ghost btn--sm" aria-pressed={tool === "hl"} onClick={() => setTool("hl")} title="Highlighter">🖍️</button>
        <button className="btn btn--ghost btn--sm" aria-pressed={tool === "eraser"} onClick={toggleEraser} title="Eraser — pen ka NEECHE wala button bhi yahi karta hai">🧽</button>

        <span className="inkv__sep" />
        {PALETTE.map((c, i) => (
          <button
            key={i}
            className="inkv__swatch"
            aria-pressed={colorIdx === i}
            onClick={() => { setColorIdx(i); setTool((t) => (t === "eraser" ? "pen" : t)); }}
            title={c.name}
            style={{ background: dark ? c.dark : c.light }}
          />
        ))}

        <span className="inkv__sep" />
        {PEN_SIZES.map((s, i) => (
          <button key={i} className="btn btn--ghost btn--sm" aria-pressed={sizeIdx === i} onClick={() => setSizeIdx(i)} title={`Size ${i + 1}`}>
            {["·", "•", "⬤"][i]}
          </button>
        ))}

        <span className="inkv__sep" />
        <button className="btn btn--ghost btn--sm" onClick={() => inkRef.current?.undo()} disabled={!inkRef.current?.canUndo()} title="Undo — pen ka UPAR wala button bhi yahi karta hai">↩</button>
        <button className="btn btn--ghost btn--sm" onClick={() => inkRef.current?.redo()} disabled={!inkRef.current?.canRedo()} title="Redo">↪</button>
        <button
          className="btn btn--ghost btn--sm"
          onClick={() => { if (confirm("Poori writing mita du?")) inkRef.current?.clear(); }}
          title="Sab mitao"
        >
          🗑️
        </button>
        <button className="btn btn--ghost btn--sm" onClick={() => inkRef.current?.grow()} title="Aur jagah jodo">➕ jagah</button>

        <span className="inkv__sep" />
        {/* Peeche jaana = chain todna (tera niyam). Aage jaana chain ka hissa
            hai, isliye wo timer nahi rokta — bas nayi ghadi shuru ho jati hai. */}
        {canSimilar && (
          <button className="btn btn--ghost btn--sm" onClick={make20} disabled={!!simBusy}
            title="Isi type ke 20 naye questions banao — aur unhe bhi yahin stylus se solve karo">
            {simBusy || "🎯 20"}
          </button>
        )}
        <button className="btn btn--ghost btn--sm" onClick={() => { stopTimer(); go(idx - 1); }} disabled={idx <= 0}>← Q</button>
        <button className="btn btn--ghost btn--sm" onClick={() => go(idx + 1)} disabled={idx >= list.length - 1}>Q →</button>
        {/* Submit yahan neeche bhi — pen wale haath ke paas. Upar bhi ek hai,
            par ghadi khatam hone ka intezaar karne ki koi wajah nahi: jab lage
            ki ho gaya, yahin se khatam karo. */}
        {/* Ek baar submit ho gaya to dobara nahi — test khatam matlab khatam.
            Pehle diye hue set par bhi nahi (wahan dekhna hai, dena nahi). */}
        {quizId && !submitted && !prior && (
          <button className="btn btn--submit btn--sm" style={{ marginLeft: "auto" }} onClick={() => finish(picks)}>
            ✅ Submit ({answered}/{list.length})
          </button>
        )}
      </div>
    </div>
  );
}

export default function WrongSolvePage() {
  // useSearchParams ko Suspense chahiye, warna poora route static rendering se
  // bahar ho jata hai — /wrong bhi yahi karta hai.
  return (
    <Suspense fallback={<div className="placeholder">Loading…</div>}>
      <SolveInner />
    </Suspense>
  );
}
