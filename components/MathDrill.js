"use client";

// 🎯 Maths Skip drill — teen hisse (hisaab lib/mathdrill.js mein):
//   sort   — har question par kam waqt: ✅ Ho jayega / ⏭ Skip (waqt khatam = Skip)
//   lists  — baayen "Ho jayega", dayein "Skip"; har list par "40 sec mein karo"
//   solve  — ek list ke question 40 sec har ek: sahi + 40 ke andar = Under 40

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import SprintCard from "./SprintCard";
import SprintAnswer from "./SprintAnswer";
import {
  getCur, saveCur, markSeen, putResult, statsOf, saveHist, LIMIT, GAPS,
  getDue, nextDue, reviewResult, setMethod, methodOf,
} from "@/lib/mathdrill";

const clock = (n) => `${Math.floor(n / 60)}:${String(Math.max(0, n) % 60).padStart(2, "0")}`;
const KIND = { go: "✅ Ho jayega", skip: "⏭ Skip" };
const pct = (a, b) => (b ? Math.round((a * 100) / b) : 0);

function preview(q) {
  return String(q.question || "").replace(/\\(.)/g, "$1").replace(/[*_`$]/g, "").slice(0, 90);
}

function Badge({ r }) {
  if (!r) return <span className="dr-badge">—</span>;
  if (r.ok) return <span className="dr-badge is-ok">⏱️ {r.t}s</span>;
  if (r.timeout) return <span className="dr-badge is-bad">⌛ 40+</span>;
  if (r.gaveUp) return <span className="dr-badge is-bad">⏭ chhoda</span>;
  if (!r.right) return <span className="dr-badge is-bad">❌ galat</span>;
  return <span className="dr-badge is-bad">🐢 {r.t}s</span>;
}

// ── 1. chhanti ───────────────────────────────────────────────────────────
function Sort({ d, upd, onDone, onExit }) {
  const first = d.qs.findIndex((q) => !d.marks[q.h]);
  const [pos, setPos] = useState(first < 0 ? d.qs.length : first);
  const [left, setLeft] = useState(d.secs);
  const [paused, setPaused] = useState(false);
  const q = d.qs[pos];

  const decide = useCallback((kind) => {
    if (!q) return;
    markSeen([q.h]);
    upd((x) => ({ ...x, marks: { ...x.marks, [q.h]: kind } }));
    setLeft(d.secs); // isi pal — warna 0 par ruki ghadi agle ko bhi skip kar deti
    setPos((p) => p + 1);
  }, [q, upd, d.secs]);

  useEffect(() => { setLeft(d.secs); }, [pos, d.secs]);
  useEffect(() => { if (pos >= d.qs.length) onDone(); }, [pos, d.qs.length, onDone]);
  useEffect(() => {
    if (paused || !q) return undefined;
    if (left <= 0) { decide("skip"); return undefined; }
    const t = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [left, paused, q, decide]);
  useEffect(() => {
    const k = (e) => {
      if (e.key === "ArrowLeft") decide("go");
      else if (e.key === "ArrowRight") decide("skip");
      else if (e.key === " ") { e.preventDefault(); setPaused((p) => !p); }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [decide]);

  if (!q) return null;
  const go = Object.values(d.marks).filter((v) => v === "go").length;
  const sk = Object.values(d.marks).filter((v) => v === "skip").length;
  return (
    <div className="sp-wrap">
      <div className="sp-top">
        <span className="sp-top__n">🎯 Chhanti {pos + 1}/{d.qs.length}</span>
        <span className={`sp-clock${paused ? " is-pause" : left <= 2 ? " is-warn" : ""}`}>{paused ? "⏸ ruka hua" : clock(left)}</span>
        <span className="sp-top__dim">✅ {go} · ⏭ {sk}</span>
        <span className="sp-top__sp" />
        <button type="button" className="sp-ibtn" onClick={() => setPaused((p) => !p)} title="Space">{paused ? "▶" : "⏸"}</button>
        <button type="button" className="sp-ibtn" onClick={onExit} title="Band karo — jahan tak hua bacha rahega">✕</button>
      </div>
      <div className="sp-bar"><div className="sp-bar__fill" style={{ width: `${((pos + 1) / d.qs.length) * 100}%` }} /></div>
      <div className="dr-one">
        <SprintCard q={q} n={pos + 1} total={d.qs.length} picked={null} onPick={() => {}} />
      </div>
      <div className="sp-foot dr-foot">
        <button type="button" className="dr-big is-go" onClick={() => decide("go")}>✅ Ho jayega <small>←</small></button>
        <button type="button" className="dr-big is-skip" onClick={() => decide("skip")}>⏭ Skip <small>→</small></button>
      </div>
    </div>
  );
}

// ── 3. 40 sec wali daud ──────────────────────────────────────────────────
// Ek hi daud do jagah: drill ki list (onRecord = putResult) aur 🔁 dohrana
// (onRecord = reviewResult). onRecord ek chhoti line laut-a sakta hai —
// jaise "🔁 agla padaav D+3".
function Run({ list, title, statLine, onRecord, onDone, start = 0 }) {
  const [i, setI] = useState(start);
  const [t, setT] = useState(0);
  const [picked, setPicked] = useState(null);
  const [done, setDone] = useState(null);
  const [extra, setExtra] = useState("");
  const [paused, setPaused] = useState(false);
  const [method, setMethodTxt] = useState("");
  const [saved, setSaved] = useState(false);
  const q = list[i];

  const record = useCallback((r) => {
    if (!q) return;
    setDone(r);
    setExtra(onRecord(q, r) || "");
  }, [q, onRecord]);

  useEffect(() => {
    setT(0); setPicked(null); setDone(null); setExtra(""); setSaved(false);
    setMethodTxt(q ? methodOf(q.h) : "");
  }, [i, q]);
  useEffect(() => { if (!q) onDone(); }, [q, onDone]);
  useEffect(() => {
    if (done || paused || !q) return undefined;
    if (t >= LIMIT) { record({ ok: false, t: LIMIT, right: false, timeout: true }); return undefined; }
    const id = setTimeout(() => setT((s) => s + 1), 1000);
    return () => clearTimeout(id);
  }, [t, done, paused, q, record]);

  const choose = useCallback((k) => {
    if (done || !q) return;
    const right = k === q.answer;
    setPicked(k);
    record({ ok: right && t <= LIMIT, t: Math.max(1, t), right });
  }, [done, q, t, record]);
  const saveMethod = () => { if (q) { setMethod(q.h, method); setSaved(true); } };
  const next = useCallback(() => {
    if (q && method.trim() && !saved) setMethod(q.h, method);
    setI((x) => x + 1);
  }, [q, method, saved]);

  useEffect(() => {
    const h = (e) => {
      if (e.target && /input|textarea|select/i.test(e.target.tagName)) return;
      const k = "abcd".indexOf(String(e.key).toLowerCase());
      if (k >= 0 && !done) choose(k);
      else if ((e.key === "Enter" || e.key === "ArrowRight") && done) next();
      else if (e.key === " ") { e.preventDefault(); setPaused((p) => !p); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [choose, next, done]);

  if (!q) return null;
  const rem = LIMIT - t;
  const old = methodOf(q.h);
  return (
    <div className="sp-wrap">
      <div className="sp-top">
        <span className="sp-top__n">{title} · {i + 1}/{list.length}</span>
        <span className={`sp-clock${paused ? " is-pause" : rem <= 10 ? " is-warn" : ""}`}>{done ? `${done.t}s` : paused ? "⏸ ruka hua" : clock(rem)}</span>
        <span className="sp-top__dim">{statLine}</span>
        <span className="sp-top__sp" />
        <button type="button" className="sp-ibtn" onClick={() => setPaused((p) => !p)} title="Space">{paused ? "▶" : "⏸"}</button>
        <button type="button" className="sp-ibtn" onClick={onDone} title="Wapas">✕</button>
      </div>
      <div className="sp-bar"><div className="sp-bar__fill" style={{ width: `${((i + 1) / list.length) * 100}%` }} /></div>
      <div className="sp-body">
        <div className="sp-col">
          <SprintCard q={q} n={i + 1} total={list.length} picked={done ? (picked ?? -1) : null} onPick={choose} />
        </div>
        <div className="sp-col">
          {done ? (
            <>
              <div className={`dr-verdict ${done.ok ? "is-ok" : "is-bad"}`}>
                {done.ok ? `⏱️ Under 40 — ${done.t} sec mein sahi`
                  : done.timeout ? "⌛ 40 sec khatam — 40 se upar"
                  : done.gaveUp ? "⏭ Chhoda — 40 se upar"
                  : !done.right ? `❌ Galat (${done.t} sec) — 40 se upar`
                  : `🐢 Sahi, par ${done.t} sec — 40 se upar`}
                {extra ? <div className="dr-verdict__x">{extra}</div> : null}
              </div>
              {old ? <div className="dr-method-old">🧠 Tumhara method: <b>{old}</b></div> : null}
              <div className="dr-method">
                <label>🧠 Method ek line mein — agli baar question dekhte hi yahi yaad aaye</label>
                <div>
                  <input
                    value={method}
                    onChange={(e) => { setMethodTxt(e.target.value); setSaved(false); }}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); saveMethod(); } }}
                    placeholder="jaise: SI-CI 2 saal → diff = P(r/100)² · ya options se back-solve"
                  />
                  <button type="button" className="sp-ibtn" onClick={saveMethod}>{saved ? "✓" : "💾"}</button>
                </div>
              </div>
              <SprintAnswer qKey={q.h} ds="" original={q.explanation} solImg={q.solImg} onlyOrig />
            </>
          ) : (
            <div className="sp-wait">⏱️ Karo — {LIMIT} sec ke andar sahi option dabao. (A B C D keys bhi chalti hain.)</div>
          )}
        </div>
      </div>
      <div className="sp-foot">
        {done
          ? <button type="button" className="dr-big is-go" onClick={next}>{i + 1 < list.length ? "aage →" : "✔ Khatam"}</button>
          : <button type="button" className="sp-ibtn" onClick={() => record({ ok: false, t, right: false, gaveUp: true })}>⏭ Nahi ho raha — chhodo</button>}
      </div>
    </div>
  );
}

function Solve({ d, upd, kind, onDone }) {
  const list = useMemo(() => d.qs.filter((q) => d.marks[q.h] === kind), [d.qs, d.marks, kind]);
  const [start] = useState(() => { const f = list.findIndex((q) => !d.res[q.h]); return f < 0 ? 0 : f; });
  const onRecord = useCallback((q, r) => {
    putResult(q, r, kind);
    upd((x) => { const n = { ...x, res: { ...x.res, [q.h]: r } }; saveHist(n); return n; });
    return r.ok ? "" : `🔁 Kal (D+${GAPS[0]}) phir aayega — phir D+3, D+5, D+7`;
  }, [kind, upd]);
  const st = statsOf(d, kind);
  return <Run list={list} start={start} title={KIND[kind]} statLine={`⏱️ Under 40: ${st.u40} · 🐢 40+: ${st.o40}`} onRecord={onRecord} onDone={onDone} />;
}

// 🔁 Aaj ke dohrane — 40 se upar wale jinka din aa gaya.
export function Review({ onExit }) {
  const [list] = useState(() => getDue());
  const [tally, setTally] = useState({ ok: 0, bad: 0, m: 0 });
  const [end, setEnd] = useState(false);
  useEffect(() => {
    if (end) return undefined;
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = old; };
  }, [end]);
  const onRecord = useCallback((q, r) => {
    const res = reviewResult(q, r);
    setTally((x) => ({ ok: x.ok + (r.ok ? 1 : 0), bad: x.bad + (r.ok ? 0 : 1), m: x.m + (res.mastered ? 1 : 0) }));
    if (res.mastered) return "🏆 Chaaron padaav paar — ab ⏱️ Under 40 mein";
    return r.ok ? `🔁 Agla padaav D+${GAPS[res.stage]} (${res.stage}/${GAPS.length})` : `🔁 Kal (D+${GAPS[0]}) phir se`;
  }, []);
  const stop = useCallback(() => setEnd(true), []);
  if (!list.length || end) {
    const nd = nextDue();
    return (
      <section className="section" style={{ marginTop: 16 }}>
        <h2>🔁 Dohrana</h2>
        {list.length ? (
          <p><b className="ok">{tally.ok} baar 40 ke andar</b> · {tally.bad} phir kal · {tally.m ? `🏆 ${tally.m} pakke ho gaye.` : ""}</p>
        ) : <p className="hint">Aaj kuch due nahi.{nd ? ` Agla dohrana ${new Date(nd).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} ko.` : ""}</p>}
        <div className="row" style={{ gap: 8 }}>
          <button type="button" className="btn btn--ghost btn--sm" onClick={onExit}>← Sprint</button>
          <Link href="/pyq/sprint/under40" className="btn btn--ghost btn--sm">⏱️ Under 40 / 🐢 40+ page</Link>
        </div>
      </section>
    );
  }
  return <Run list={list} title="🔁 Dohrana" statLine={`✓ ${tally.ok} · ✗ ${tally.bad}`} onRecord={onRecord} onDone={stop} />;
}

// ── 2. dono list ─────────────────────────────────────────────────────────
function Col({ d, kind, onRun }) {
  const list = d.qs.filter((q) => d.marks[q.h] === kind);
  const st = statsOf(d, kind);
  const all = st.tried === st.n && st.n > 0;
  return (
    <div className={`dr-col is-${kind}`}>
      <div className="dr-col__hd">
        <h3>{KIND[kind]} <span>({st.n})</span></h3>
        {st.n > 0 && (
          <button type="button" className="btn btn--primary btn--sm" onClick={() => onRun(kind, all)}>
            {all ? "↺ Dobara 40 sec mein" : st.tried ? `▶ Jaari rakho (${st.n - st.tried} baaki)` : "⏱️ 40 sec mein karo"}
          </button>
        )}
      </div>
      {st.tried > 0 && (
        <div className="dr-stat">
          <b>{st.tried}</b> mein se <b className="ok">{st.u40} under 40</b> ({pct(st.u40, st.tried)}%) · <b className="bad">{st.o40} 40 se upar</b>
          <div className="dr-stat__say">
            {kind === "go"
              ? `Jo "ho jayega" bole the, unme se ${pct(st.u40, st.tried)}% sach mein 40 sec mein hue.${st.o40 ? ` ${st.o40} par zyada bharosa tha — paper mein ye time kha jaate.` : " Andaza ekdam sahi!"}`
              : st.u40 ? `Skip kiye mein se ${st.u40} 40 sec mein ho gaye — ye chhodne nahi the.` : "Skip ka faisla sahi tha — koi 40 sec mein nahi hua."}
          </div>
        </div>
      )}
      <ol className="dr-list">
        {list.map((q) => (
          <li key={q.h}>
            <span className="dr-list__q">
              {q.qImg ? <img src={q.qImg} alt="" loading="lazy" /> : preview(q)}
              {q._chapter ? <em>{q._chapter}</em> : null}
            </span>
            <Badge r={d.res[q.h]} />
          </li>
        ))}
        {!list.length && <li className="dr-empty">Koi nahi.</li>}
      </ol>
    </div>
  );
}

export default function MathDrill({ init, onExit }) {
  const [d, setD] = useState(() => init || getCur());
  const [phase, setPhase] = useState(() => {
    const c = init || getCur();
    return c && c.qs.some((q) => !c.marks[q.h]) ? "sort" : "lists";
  });
  const [kind, setKind] = useState("go");
  const upd = useCallback((fn) => setD((p) => { const n = fn(p); saveCur(n); return n; }), []);

  useEffect(() => {
    if (phase === "lists") return undefined;
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = old; };
  }, [phase]);

  const toLists = useCallback(() => { setPhase("lists"); window.scrollTo(0, 0); }, []);
  if (!d) {
    return (
      <section className="section" style={{ marginTop: 16 }}>
        <p>Drill nahi mila — Sprint par wapas jaakar 🎯 Skip drill dobara shuru karo.</p>
        <button type="button" className="btn btn--ghost btn--sm" onClick={onExit}>← Sprint</button>
      </section>
    );
  }
  if (phase === "sort") return <Sort d={d} upd={upd} onDone={toLists} onExit={onExit} />;
  if (phase === "solve") return <Solve key={kind} d={d} upd={upd} kind={kind} onDone={toLists} />;

  const run = (k, again) => {
    if (again) {
      upd((x) => {
        const res = { ...x.res };
        for (const q of x.qs) if (x.marks[q.h] === k) delete res[q.h];
        return { ...x, res };
      });
    }
    setKind(k);
    setPhase("solve");
  };
  const unsorted = d.qs.filter((q) => !d.marks[q.h]).length;
  return (
    <section className="section" style={{ marginTop: 16 }}>
      <div className="row between" style={{ flexWrap: "wrap", gap: 8 }}>
        <h2 style={{ margin: 0 }}>🎯 Skip drill · {d.qs.length} Q · {d.secs} sec chhanti</h2>
        <div className="row" style={{ gap: 8 }}>
          <Link href="/pyq/sprint/under40" className="btn btn--ghost btn--sm">⏱️ Under 40 / 🐢 40+ page</Link>
          <button type="button" className="btn btn--ghost btn--sm" onClick={onExit}>← Sprint</button>
        </div>
      </div>
      {unsorted > 0 && (
        <p className="hint mt-8">{unsorted} question ki chhanti baaki hai. <button type="button" className="linklike" onClick={() => setPhase("sort")}>Chhanti jaari rakho</button></p>
      )}
      <div className="dr-cols mt-16">
        <Col d={d} kind="go" onRun={run} />
        <Col d={d} kind="skip" onRun={run} />
      </div>
    </section>
  );
}
