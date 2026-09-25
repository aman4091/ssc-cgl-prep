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
import { ALL_SUBJECTS, loadAllSubject } from "@/lib/allbank";
import { sprintAnswer } from "@/lib/client-ai";
import SprintCard from "@/components/SprintCard";
import SprintAnswer from "@/components/SprintAnswer";
import {
  pickNext, markDone, doneCount, getAns, putAns, getMarks,
  qText, qOpts, qCorrect, sHash, toggleMark, clearDone,
} from "@/lib/sprint";

const SECS = 30;      // ek question par itne second
const WARM = 10;      // itne jawab banne ke baad daud shuru
const COUNTS = [50, 100, 120];

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
      if (q) { out.push({ ...q, _subj: lists[i].meta.label }); moved = true; }
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

  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);

  useEffect(() => { setDoneN(doneCount()); setMarkN(getMarks().length); }, []);

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

  const start = useCallback(async () => {
    setPhase("loading");
    setNote("Questions load ho rahe hain…");
    let list;
    try {
      if (slug === "mix") list = await loadMix(setNote);
      else {
        const meta = ALL_SUBJECTS.find((s) => s.slug === slug);
        const qs = await loadAllSubject(slug, (d, t) => setNote(`${meta.label} — ${d}/${t} chapter`));
        list = qs.map((q) => ({ ...q, _subj: meta.label }));
      }
    } catch (e) {
      setPhase("setup");
      setNote("Load nahi hue: " + e.message);
      return;
    }
    const pick = pickNext(list, count);
    if (!pick.length) {
      setPhase("setup");
      setNote("Is subject ke saare question sprint mein aa chuke. Neeche se hisaab saaf kar sakte ho.");
      return;
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
  }, [slug, count, fetchAll]);

  const cur = batch[pos] || null;
  const curH = cur ? sHash(cur) : "";

  // Pehle WARM jawab ban gaye → daud shuru.
  const readyN = useMemo(
    () => batch.slice(0, WARM).filter((q) => ans[sHash(q)] || errs[sHash(q)]).length,
    [batch, ans, errs],
  );
  useEffect(() => {
    if (phase !== "prep") return;
    if (readyN >= Math.min(WARM, batch.length)) setPhase("run");
  }, [phase, readyN, batch.length]);

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

  useEffect(() => {
    if (phase === "run" && batch.length && pos >= batch.length) setPhase("done");
  }, [phase, pos, batch.length]);
  useEffect(() => { if (phase === "done") flush(); }, [phase, flush]);

  // Ghadi.
  useEffect(() => {
    if (phase !== "run" || paused) return undefined;
    if (left <= 0) { next(); return undefined; }
    const t = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [left, paused, phase, next]);

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
    setTally((t) => (i === cur.answer ? { ...t, right: t.right + 1 } : { ...t, wrong: t.wrong + 1 }));
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
    // effect usi pal mein "khatam" wali screen par le jata hai.
    if (!cur) return null;
    const madeN = Object.keys(ans).length;
    return (
      <div className="sp-wrap">
        <div className="sp-top">
          <span className="sp-top__n">⚡ {pos + 1}/{batch.length}</span>
          <span className={`sp-clock${paused ? " is-pause" : left <= 10 ? " is-warn" : ""}`}>
            {paused ? "⏸ ruka hua" : `0:${String(left).padStart(2, "0")}`}
          </span>
          <span className="sp-top__dim">
            ✓ {tally.right} · ✗ {tally.wrong} · 🐋 {madeN}/{batch.length} taiyaar
          </span>
          <span className="sp-top__sp" />
          <button type="button" className={`sp-ibtn${marked ? " is-on" : ""}`} onClick={mark} title="Bookmark (M)">
            {marked ? "★" : "☆"}
          </button>
          <button type="button" className="sp-ibtn" onClick={() => setPaused((p) => !p)} title="Space">
            {paused ? "▶" : "⏸"}
          </button>
          <button type="button" className="sp-ibtn" onClick={() => { flush(); setPhase("done"); }}>✕</button>
        </div>
        <div className="sp-bar"><div className="sp-bar__fill" style={{ width: `${((pos + 1) / batch.length) * 100}%` }} /></div>

        <div className="sp-body">
          <div className="sp-col">
            <SprintCard q={cur} n={pos + 1} total={batch.length} picked={picked} onPick={choose} />
          </div>
          <div className="sp-col">
            <SprintAnswer
              qKey={curH}
              ds={ans[curH] || ""}
              err={errs[curH] || ""}
              loading={busy === curH}
              original={cur.explanation || cur.solution || ""}
              solImg={cur.solImg || ""}
            />
          </div>
        </div>

        <div className="sp-foot">
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

  // ── daud khatam ────────────────────────────────────────────────────────
  if (phase === "done") {
    return (
      <section className="section" style={{ marginTop: 24 }}>
        <h2>⚡ Sprint khatam</h2>
        <p className="hint">
          {Math.min(pos + 1, batch.length)} question dekhe · ✓ {tally.right} sahi · ✗ {tally.wrong} galat · ★ {markN} bookmark.
          Ab tak kul <b>{doneN}</b> question ho chuke — agli baar inke AGLE aayenge.
        </p>
        <div className="row mt-16" style={{ gap: 8, flexWrap: "wrap" }}>
          <button type="button" className="btn btn--primary btn--sm" onClick={() => setPhase("setup")}>⚡ Naya sprint</button>
          <Link href="/pyq/sprint/marks" className="btn btn--ghost btn--sm">★ Bookmarks ({markN})</Link>
          <Link href="/pyq" className="btn btn--ghost btn--sm">← PYQ</Link>
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
        <h3>Subject</h3>
        <div className="chips mt-8">
          {[...ALL_SUBJECTS, { slug: "mix", label: "Mix — sab subject", icon: "🎲" }].map((s) => (
            <button
              key={s.slug}
              type="button"
              className={`chip chip--btn chip--lg${slug === s.slug ? " chip--syn" : ""}`}
              onClick={() => setSlug(s.slug)}
            >
              {s.icon} {s.label}
            </button>
          ))}
        </div>

        <h3 className="mt-16">Kitne question</h3>
        <div className="chips mt-8">
          {COUNTS.map((c) => (
            <button
              key={c}
              type="button"
              className={`chip chip--btn chip--lg${count === c ? " chip--syn" : ""}`}
              onClick={() => setCount(c)}
            >
              {c} <span className="sp-top__dim">· {Math.round((c * SECS) / 60)} min</span>
            </button>
          ))}
        </div>

        {note ? <p className="hint mt-16">{note}</p> : null}

        <div className="row mt-16" style={{ gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn btn--primary"
            onClick={start}
            disabled={phase === "loading"}
          >
            {phase === "loading" ? "…" : `⚡ Shuru karo — ${count} question`}
          </button>
          <Link href="/pyq/sprint/marks" className="btn btn--ghost btn--sm">★ Bookmarks ({markN})</Link>
        </div>

        <p className="hint mt-16">
          Ab tak <b>{doneN}</b> question ho chuke. · {count} question = {count} chhote DeepSeek call
          (har jawab teen line ka, sabse saste model se) — lagbhag ₹3–4 ka kharcha.
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
