"use client";

// 🧮 Calculation sudhaarne ke tareeke — /calculation par 🎨 dropdown. 15 mein
// se owner ne 6 rakhe (3 Seedhi, 5 Race, 6 Survival, 8 MCQ fatafat, 9 Sahi ya
// galat, 14 Chain) + "0" purana (topic ki tiles: 📖 Dekho → ▶️ Test). Number
// wahi purane. Jawab kahin bhi TYPE nahi karna — hamesha 4 option.
//
// Sawaal lib/calcskills se aate hain: mental maths (jod, ghataav, guna ki
// tricks, bhaag, %, √, ∛, decimal, BODMAS, approximation, unit digit) aur
// purane decks (tables, squares, cubes, fraction→%, SI/CI, formule).
// Har jawab `cgl.calc.stats` mein ginta hai (aage kaam aayega).

import { useEffect, useMemo, useRef, useState } from "react";
import { SKILLS, skillOf, withK, genLevel, numOpts, record } from "@/lib/calcskills";

export const CL_LAYOUTS = [
  { id: "3", name: "Seedhi (ladder) — 10 paayedaan" },
  { id: "5", name: "Race — ghost se muqabla" },
  { id: "6", name: "Survival — 3 jaan" },
  { id: "8", name: "MCQ fatafat" },
  { id: "9", name: "Sahi ya galat?" },
  { id: "14", name: "Chain calculation" },
]

const ri = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const lsGet = (k, d) => { try { return JSON.parse(localStorage.getItem(k) || "null") ?? d; } catch { return d; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* quota */ } };

// ── Skill chunne wali chips ─────────────────────────────────────────────
// allow: "all" (MCQ bhi chalega), "num" (sirf type wale), "arith" (sirf mental maths)
function SkillPick({ value, onChange, allow = "all", mix = true }) {
  const list = SKILLS.filter((x) => (allow === "arith" ? !x.deck : allow === "num" ? !x.deck || x.num : true));
  const cats = [...new Set(list.map((x) => x.cat))];
  return (
    <div className="clx-pick">
      {mix && <button type="button" className={value === "mix" ? "is-on" : ""} onClick={() => onChange("mix")}>🎲 Mix (mental maths)</button>}
      {cats.map((c) => (
        <div key={c} className="clx-cat">
          <b>{c}</b>
          {list.filter((x) => x.cat === c).map((x) => (
            <button key={x.k} type="button" className={value === x.k ? "is-on" : ""} onClick={() => onChange(x.k)}>{x.icon} {x.name}</button>
          ))}
        </div>
      ))}
    </div>
  );
}
function useSkill(key, def = "mix") {
  const [k, setK] = useState(() => (typeof window === "undefined" ? def : lsGet(`cgl.calc.pick.${key}`, def)));
  const set = (v) => { setK(v); lsSet(`cgl.calc.pick.${key}`, v); };
  return [skillOf(k) || k === "mix" ? k : def, set];
}
const SkillName = ({ k }) => { const s = skillOf(k); return <>{s ? `${s.icon} ${s.name}` : "🎲 Mix"}</>; };

// Jawab dene ka dabba — hamesha 4 option (owner: "likhne ki jagah options
// de"). Ginti wale sawaal ke galat option lib/calcskills numOpts se — asli
// jaise (aakhri ank / dahaai badla hua), taaki andaaze se nahi, hisaab se
// chuno.
function Ans({ item, onDone, disabled }) {
  const opts = useMemo(() => (item.kind === "mcq" ? item.opts : numOpts(item.a)), [item]);
  const [bad, setBad] = useState(null);
  useEffect(() => setBad(null), [item]);
  return (
    <div className="clx-opts">
      {opts.map((o) => (
        <button key={o} type="button" disabled={disabled || bad === o} className={bad === o ? "is-n" : ""}
          onClick={() => { const ok = o === item.a; if (!ok) setBad(o); onDone(ok, o); }}>{o}</button>
      ))}
    </div>
  );
}
const Q = ({ item, big }) => <div className={`clx-q${big ? " is-big" : ""}`}>{item.q}</div>;

// ─── 3 · Ladder ───
const RUNGS = ["add2", "sub2", "mul21", "add3", "sub3", "mul11", "pct", "mul22", "div", "sqrt"];
function Ladder() {
  const today = new Date().toISOString().slice(0, 10);
  const [rung, setRung] = useState(0);
  const [streak, setStreak] = useState(0);
  const [item, setItem] = useState(() => withK(RUNGS[0]));
  const [flash, setFlash] = useState(null);
  const saved = lsGet("cgl.calc.ladder", {});
  const t0 = useRef(Date.now());
  const done = (ok) => {
    record(item.sk, ok, Date.now() - t0.current);
    setFlash(ok ? "y" : "n");
    setTimeout(() => setFlash(null), 350);
    let r = rung, s = ok ? streak + 1 : 0;
    if (s >= 3) { r = rung + 1; s = 0; if (r > (saved[today] || 0)) lsSet("cgl.calc.ladder", { ...saved, [today]: r }); }
    setRung(r); setStreak(s);
    if (r < RUNGS.length) setItem(withK(RUNGS[r]));
    t0.current = Date.now();
  };
  return (
    <div className="cl3">
      <ol className="cl3-lad">
        {RUNGS.map((kk, i) => (
          <li key={kk} className={i < rung ? "is-done" : i === rung ? "is-cur" : ""}>
            <span>{i + 1}</span><SkillName k={kk} />{i === rung && <em>{"●".repeat(streak)}{"○".repeat(3 - streak)}</em>}
          </li>
        )).reverse()}
      </ol>
      <div className={`cl3-play${flash ? ` is-${flash}` : ""}`}>
        {rung >= RUNGS.length ? <div className="clx-result"><b>🏆</b><span>Poori seedhi chadh gaye!</span><button type="button" className="clx-go" onClick={() => { setRung(0); setStreak(0); setItem(withK(RUNGS[0])); }}>↺ Phir se</button></div> : (
          <>
            <p className="clx-dim">Paayedaan {rung + 1}: lagataar 3 sahi = upar. Aaj ka best: {saved[today] || 0}/10</p>
            <Q item={item} big />
            <Ans item={item} onDone={done} />
          </>
        )}
      </div>
    </div>
  );
}

// ─── 5 · Race ───
const GOAL = 15;
function Race() {
  const [k, setK] = useSkill("race");
  const [pace, setPace] = useState(5);
  const [run, setRun] = useState(false);
  const [me, setMe] = useState(0);
  const [t, setT] = useState(0);
  const [item, setItem] = useState(null);
  const t0 = useRef(0);
  const ghost = Math.min(GOAL, t / pace);
  const over = me >= GOAL || ghost >= GOAL;
  useEffect(() => {
    if (!run || over) return undefined;
    const x = setInterval(() => setT((v) => v + 0.2), 200);
    return () => clearInterval(x);
  }, [run, over]);
  const start = () => { setMe(0); setT(0); setItem(withK(k)); setRun(true); t0.current = Date.now(); };
  const done = (ok) => { record(item.sk, ok, Date.now() - t0.current); if (ok) setMe((m) => m + 1); setItem(withK(k)); t0.current = Date.now(); };
  return (
    <div className="cl5">
      <div className="cl5-track">
        <div className="cl5-lane"><span>🚗 Tum</span><i style={{ left: `${(me / GOAL) * 92}%` }}>🚗</i></div>
        <div className="cl5-lane is-g"><span>👻 Ghost ({pace}s/sawaal)</span><i style={{ left: `${(ghost / GOAL) * 92}%` }}>👻</i></div>
        <b className="cl5-flag">🏁</b>
      </div>
      {run && !over && item ? (
        <><p className="clx-dim">{me}/{GOAL} sahi · {Math.round(t)}s</p><Q item={item} big /><Ans item={item} onDone={done} /></>
      ) : (
        <>
          {over && <div className="clx-result"><b>{me >= GOAL ? "🏆 Jeet gaye!" : "👻 Ghost jeet gaya"}</b><span>{me}/{GOAL} · {Math.round(t)}s</span></div>}
          <div className="clx-row">Ghost ki raftaar: {[8, 5, 4, 3, 2].map((p) => <button key={p} type="button" className={pace === p ? "is-on" : ""} onClick={() => setPace(p)}>{p}s</button>)}</div>
          <SkillPick value={k} onChange={setK} />
          <button type="button" className="clx-go" onClick={start}>🏁 Race shuru</button>
        </>
      )}
    </div>
  );
}

// ─── 6 · Survival ───
function Survival() {
  const [lives, setLives] = useState(3);
  const [score, setScore] = useState(0);
  const [item, setItem] = useState(() => genLevel(0));
  const [shake, setShake] = useState(false);
  const [last, setLast] = useState(null);
  const best = lsGet("cgl.calc.survival", 0);
  const L = Math.min(4, Math.floor(score / 5));
  const t0 = useRef(Date.now());
  const done = (ok) => {
    record(item.sk, ok, Date.now() - t0.current);
    if (ok) { const s = score + 1; setScore(s); if (s > best) lsSet("cgl.calc.survival", s); setItem(genLevel(Math.min(4, Math.floor(s / 5)))); setLast(null); }
    else { setLives((l) => l - 1); setShake(true); setTimeout(() => setShake(false), 400); setLast(item); setItem(genLevel(L)); }
    t0.current = Date.now();
  };
  if (lives <= 0) return <div className="cl6"><div className="clx-result"><b>💀 {score}</b><span>Best {Math.max(best, score)}</span><button type="button" className="clx-go" onClick={() => { setLives(3); setScore(0); setItem(genLevel(0)); }}>↺ Phir se</button></div></div>;
  return (
    <div className={`cl6${shake ? " is-shake" : ""}`}>
      <div className="cl6-top"><span>{"❤️".repeat(lives)}{"🖤".repeat(3 - lives)}</span><b>Score {score}</b><span>Level {L + 1} · best {best}</span></div>
      <Q item={item} big />
      <Ans item={item} onDone={done} />
      {last && <p className="clx-n">Pichhla: {last.q} = {last.a}</p>}
      <p className="clx-dim">Har 5 sahi par level badhta hai — number bade, tricks mushkil.</p>
    </div>
  );
}

// ─── 8 · MCQ fatafat ───
function McqFast() {
  const [k, setK] = useSkill("mcq");
  const make = () => { const it = withK(k); return it.kind === "mcq" ? it : { ...it, opts: numOpts(it.a) }; };
  const [item, setItem] = useState(make);
  const [pickd, setPickd] = useState(null);
  const [st, setSt] = useState({ y: 0, n: 0, ms: 0, streak: 0 });
  const t0 = useRef(Date.now());
  useEffect(() => { setItem(make()); setPickd(null); t0.current = Date.now(); }, [k]); // eslint-disable-line react-hooks/exhaustive-deps
  const choose = (o) => {
    if (pickd) return;
    const ok = o === item.a, ms = Date.now() - t0.current;
    record(item.sk, ok, ms);
    setPickd(o);
    setSt((s) => ({ y: s.y + (ok ? 1 : 0), n: s.n + (ok ? 0 : 1), ms: s.ms + ms, streak: ok ? s.streak + 1 : 0 }));
    setTimeout(() => { setItem(make()); setPickd(null); t0.current = Date.now(); }, ok ? 350 : 1100);
  };
  const tot = st.y + st.n;
  return (
    <div className="cl8">
      <details className="clx-det"><summary>Skill: <SkillName k={k} /> (badlo)</summary><SkillPick value={k} onChange={setK} /></details>
      <div className="cl8-stats"><span>✓ {st.y}</span><span>✗ {st.n}</span><span>🔥 {st.streak}</span><span>⏱ {tot ? (st.ms / tot / 1000).toFixed(1) : "–"}s / sawaal</span></div>
      <Q item={item} big />
      <div className="cl8-opts">
        {item.opts.map((o, i) => (
          <button key={o} type="button" onClick={() => choose(o)} className={pickd ? (o === item.a ? "is-y" : o === pickd ? "is-n" : "is-dim") : ""}><kbd>{i + 1}</kbd>{o}</button>
        ))}
      </div>
    </div>
  );
}

// ─── 9 · Sahi ya galat ───
function Verify() {
  const [k, setK] = useSkill("verify");
  const make = () => {
    let it = withK(k);
    for (let g = 0; it.kind !== "num" && g < 5; g++) it = withK("mix");
    const truth = Math.random() < 0.5;
    const wrong = numOpts(it.a).find((o) => o !== it.a) || String(Number(it.a) + 10);
    return { it, truth, shown: truth ? it.a : wrong };
  };
  const [c, setC] = useState(make);
  const [st, setSt] = useState({ y: 0, n: 0, streak: 0, best: 0 });
  const [fb, setFb] = useState(null);
  const t0 = useRef(Date.now());
  useEffect(() => { setC(make()); t0.current = Date.now(); }, [k]); // eslint-disable-line react-hooks/exhaustive-deps
  const ans = (say) => {
    if (fb) return;
    const ok = say === c.truth;
    record(c.it.sk, ok, Date.now() - t0.current);
    setFb(ok ? "y" : "n");
    setSt((s) => { const sk = ok ? s.streak + 1 : 0; return { y: s.y + (ok ? 1 : 0), n: s.n + (ok ? 0 : 1), streak: sk, best: Math.max(s.best, sk) }; });
    setTimeout(() => { setFb(null); setC(make()); t0.current = Date.now(); }, ok ? 400 : 1300);
  };
  return (
    <div className="cl9">
      <details className="clx-det"><summary>Skill: <SkillName k={k} /> (badlo)</summary><SkillPick value={k} onChange={setK} allow="num" /></details>
      <div className="cl9-top"><span>🔥 {st.streak}</span><span>🏆 {st.best}</span><span>✓ {st.y} · ✗ {st.n}</span></div>
      <div className={`cl9-eq${fb ? ` is-${fb}` : ""}`}>
        <span>{c.it.q}</span><b>=</b><span>{c.shown}</span>
        {fb === "n" && <small>Sahi: {c.it.a}</small>}
      </div>
      <div className="cl9-btns"><button type="button" className="is-n" onClick={() => ans(false)}>✗ Galat</button><button type="button" className="is-y" onClick={() => ans(true)}>✓ Sahi</button></div>
      <p className="clx-dim">Poora hisaab mat karo — aakhri ank, andaaza, 9 ka jod (digit sum) se jaancho.</p>
    </div>
  );
}

// ─── 14 · Chain ───
function makeChain() {
  let cur = ri(11, 49); const start = cur; const steps = [];
  for (let j = 0; j < 6; j++) {
    const ops = ["+", "−", "×"]; const divs = [2, 3, 4, 5, 6, 7, 8, 9].filter((d) => cur % d === 0 && cur / d > 1);
    if (divs.length) ops.push("÷");
    const op = pick(ops); let x;
    if (op === "+") x = ri(11, 99); else if (op === "−") x = ri(2, Math.max(3, Math.min(99, cur - 1))); else if (op === "×") x = cur > 500 ? 2 : ri(2, 9); else x = pick(divs);
    cur = op === "+" ? cur + x : op === "−" ? cur - x : op === "×" ? cur * x : cur / x;
    steps.push({ op, x, r: cur });
  }
  return { start, steps };
}
function Chain() {
  const [c, setC] = useState(makeChain);
  const [at, setAt] = useState(0);
  const [bad, setBad] = useState([]);
  const [miss, setMiss] = useState(0);
  const done = at >= c.steps.length;
  const opts = useMemo(() => (done ? [] : numOpts(String(c.steps[at].r))), [c, at, done]);
  const choose = (o) => {
    const st = c.steps[at];
    const sk = st.op === "×" ? "mul21" : st.op === "÷" ? "div" : "add3";
    if (Number(o) === st.r) { setAt(at + 1); setBad([]); record(sk, true, 0); }
    else { setBad((b) => [...b, o]); setMiss((m) => m + 1); record(sk, false, 0); }
  };
  return (
    <div className="cl14">
      <div className="cl14-chain">
        <span className="cl14-n">{c.start}</span>
        {c.steps.map((st, i) => (
          <span key={i} className={`cl14-s${i < at ? " is-done" : i === at ? " is-cur" : ""}`}>
            <em>{st.op} {st.x}</em><b>{i < at ? st.r : i === at ? "?" : "…"}</b>
          </span>
        ))}
      </div>
      {!done ? (
        <>
          <p className="clx-dim cl14-ask">{at ? c.steps[at - 1].r : c.start} {c.steps[at].op} {c.steps[at].x} = ?</p>
          <div className="clx-opts">
            {opts.map((o) => <button key={o} type="button" disabled={bad.includes(o)} className={bad.includes(o) ? "is-n" : ""} onClick={() => choose(o)}>{o}</button>)}
          </div>
        </>
      ) : (
        <div className="clx-result"><b>🔗 Chain poori!</b><span>{miss ? `${miss} galti` : "ek bhi galti nahi"} · aakhri {c.steps[c.steps.length - 1].r}</span><button type="button" className="clx-go" onClick={() => { setC(makeChain()); setAt(0); setMiss(0); setBad([]); }}>Nayi chain</button></div>
      )}
      <p className="clx-dim">Pichhla jawab hi agla sawaal — dimaag mein number pakde rakhne ki practice.</p>
    </div>
  );
}

const COMP = { 3: Ladder, 5: Race, 6: Survival, 8: McqFast, 9: Verify, 14: Chain };

export default function CalcLayouts({ lay }) {
  const C = COMP[lay];
  if (!C) return null;
  return <div className={`clx clx--${lay}`}><C key={lay} /></div>;
}
