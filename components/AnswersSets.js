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
// hai, dobara kholne par sirf "Result" (diya hua set dobara nahi).
//
// Set list ke ASLI kram se katte hain (Set 1 = Q 1–25, hamesha wahi) — "ho
// gaya neeche" wali chhantayi yahan nahi, warna set ke sawaal badalte rehte.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getChapterResults, saveSetResult, moveResult, markResult, accuracyOf, marksOf, maxMarks, fmtMarks } from "@/lib/settests";
import TestPage, { clock } from "./TestPage";
import { progsFor, saveProg, clearProg } from "@/lib/setprog";
import { hashStr } from "@/lib/syncitems";
import { savedKey, setSavedKey } from "@/lib/anskeys";
import { pushWrong } from "@/lib/wrongsets";

const SET_SIZE = 25;
const SET_MIN = 15;
const L = "ABCD";

// Sahi option ka number (0–3), ya -1 (pata nahi). Owner: "site apni taraf se
// anumaan na lagaye — main khud bataunga". Isliye sirf: (1) jo tumne bataya
// (lib/anskeys), (2) sawaal ke apne data ka sahi option (PYQ se aaye text wale
// sawaal — wo andaza nahi). Jawab ke text mein "Answer: (c)" dhoondhna HATA
// diya — wahi galat option laga deta tha ("Answer: A train…" → A).
function keyOf(r) {
  const sv = r && r.id ? savedKey(r.id) : -1;
  if (sv >= 0) return sv;
  const q = r && r.q;
  if (q && Array.isArray(q.options) && q.options.length >= 2) {
    if (Number.isInteger(q.answer)) return q.answer;
    if (/^\d+$/.test(String(q.answer ?? ""))) return Number(q.answer);
  }
  return -1;
}
// Wrong Sets mein Answers ka sawaal — poora record, nishaan `_ans` ke saath
// (components/AnsTestQ use dikhata hai).
const toWrong = (r) => ({ ...r, _ans: true, _sub: r.subject || "math" });
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
  // Natije padh liye? Tab tak Home ka ?set= set na khole (warna khaali
  // natije par naya test shuru ho jata tha — owner).
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const on = () => { setResults(getChapterResults(rkey)); setProgs(progsFor(rkey)); setReady(true); };
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
  // kv — sahi option bataate hi dobara padho.
  const [kv, setKv] = useState(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const keys = useMemo(() => qs.map(keyOf), [qs, kv]);
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
    saveSetResult(rkey, kOf(setIdx), { ...t, sec: s, picks: pk, self: sf, times: times || {}, ws: 1, path: window.location.pathname + window.location.search.replace(/[?&]set=[^&]*/, "").replace(/^&/, "?"), title: `Answers · Set ${setIdx + 1}` });
  };

  const submit = useCallback(() => {
    if (!running) return;
    const s = SET_MIN * 60 - left;
    setSec(s); setDone(true); setCur(0);
    clearProg(rkey, kOf(setIdx));
    save(picks, self, s);
    // 🔁 Galat + chhode → Wrong Sets (PYQ jaisa). Sahi option pata na ho aur
    // option laga ho ("jaancho") — wo tab jayega jab tum sahi option bataoge.
    pushWrong(qs.filter((_, i) => { const v = verdict(i); return v === "bad" || v === "skip"; }).map(toWrong));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, left, picks, self, times]);
  useEffect(() => { if (running && left === 0) submit(); }, [running, left, submit]);

  // how: "test" (naya) | "resume" (chhoda hua) | "result"
  const open = (i, how) => {
    if (results[kOf(i)]) how = "result";   // diya hua set dobara nahi — pehla natija hi pakka (owner)
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

  // 🩹 Is badlaav se PEHLE diye set (13 Oct se) — unke galat / chhode bhi ek
  // baar Wrong Sets mein (owner: "6 galat nikle, wrong set mein nahi gaye").
  useEffect(() => {
    for (let i = 0; i < setCount; i++) {
      const r = results[sigs[i]];
      if (!r || r.ws || !(String(r.at || "") >= "2026-10-12T00:00")) continue;
      const chunk = all.slice(i * SET_SIZE, i * SET_SIZE + SET_SIZE);
      const pk = r.picks || {};
      const bad = chunk.filter((rec, j) => {
        const k = keyOf(rec);
        if (pk[j] == null) return true;          // chhoda
        return k >= 0 && pk[j] !== k;            // galat (sahi pata ho tab)
      });
      pushWrong(bad.map(toWrong));
      markResult(rkey, sigs[i], { ws: 1 });
    }
  }, [results, sigs, setCount, rkey, all]);

  // 🏠 Home ki report se "▶" — ?set=<pehchaan> se wahi set seedha.
  const autoRef = useRef(false);
  useEffect(() => {
    if (!ready || autoRef.current || !setCount || typeof window === "undefined") return;
    const want = new URLSearchParams(window.location.search).get("set");
    if (!want) return;
    const i = sigs.findIndex((x) => x === want);
    if (i < 0) return;
    autoRef.current = true;
    open(i, results[want] ? "result" : progs[want] ? "resume" : "test");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sigs, results, progs, ready]);
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
  // "Sahi option kaunsa tha?" — record par hamesha ke liye, phir isi natije
  // ke marks dobara (neeche wala effect naye keys ke saath save karta hai).
  const keyDirty = useRef(false);
  const tellKey = (i, k) => {
    setSavedKey(qs[i].id, k);
    keyDirty.current = true;
    toldRef.current = i;
    setKv((x) => x + 1);
  };
  const toldRef = useRef(null);
  useEffect(() => {
    if (!keyDirty.current || !done || setIdx === null) return;
    keyDirty.current = false;
    save(picks, self, sec);
    const i = toldRef.current;
    toldRef.current = null;
    if (i != null && verdict(i) === "bad") pushWrong([toWrong(qs[i])]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kv]);

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
                <div key={i} className={`setcard${r ? " is-done" : ""}${pg && !r ? " is-paused" : ""}`}>
                  <button type="button" className="setcard__open" onClick={() => open(i, r ? "result" : pg ? "resume" : "test")}>
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
                  {pg && !r ? (
                    <span className="setcard__acts">
                      <button type="button" className="btn btn--sm" onClick={() => open(i, "resume")}>Resume</button>
                    </span>
                  ) : r ? (
                    <span className="setcard__acts">
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
      {/* Sahi option record mein nahi (ya tumne hi bataya tha) — poochho aur
          hamesha ke liye yaad rakho. */}
      {done ? (
        <div className="tbx-self">
          <span>{keys[at] < 0 ? "Sahi option kaunsa tha? Ek baar batao — aage ke liye yaad rahega, marks bhi isi se." : savedKey(r.id) >= 0 ? "Sahi option (tumhara bataya) — badalna ho to dabao:" : "Sahi option (sawaal ke data se) — galat ho to sahi dabao:"}{picks[at] != null ? <> · tumhara <b>{L[picks[at]]}</b></> : null}</span>
          {L.split("").map((ch, k) => (
            <button key={ch} type="button" className={keys[at] === k ? "is-on is-ok" : ""} onClick={() => tellKey(at, k)}>{ch}</button>
          ))}
        </div>
      ) : null}
    </TestPage>
  );
}
