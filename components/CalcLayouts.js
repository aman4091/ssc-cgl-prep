"use client";

// 🧮 Calculation sudhaarne ke 15 tareeke — /calculation par 🎨 dropdown se
// dekho, owner ek chunega. "0" = purana (topic ki tiles: 📖 Dekho → ▶️ Test).
//
// Sawaal lib/calcskills se aate hain: mental maths (jod, ghataav, guna ki
// tricks, bhaag, %, √, ∛, decimal, BODMAS, approximation, unit digit) aur
// purane decks (tables, squares, cubes, fraction→%, SI/CI, formule).
// Har jawab `cgl.calc.stats` mein ginta hai — "Kamzor jagah" wahi dikhata hai.

import { useEffect, useRef, useState } from "react";
import { SKILLS, ARITH, skillOf, withK, genLevel, check, numOpts, readStats, record, nice } from "@/lib/calcskills";

export const CL_LAYOUTS = [
  { id: "1", name: "Sprint — 60 second" },
  { id: "2", name: "Seekho + practice (trick ke saath)" },
  { id: "3", name: "Seedhi (ladder) — 10 paayedaan" },
  { id: "4", name: "Worksheet — 20 sawaal ek saath" },
  { id: "5", name: "Race — ghost se muqabla" },
  { id: "6", name: "Survival — 3 jaan" },
  { id: "7", name: "Ghadi se tez — har sawaal ka time" },
  { id: "8", name: "MCQ fatafat" },
  { id: "9", name: "Sahi ya galat?" },
  { id: "10", name: "Gayab number dhoondo" },
  { id: "11", name: "Keypad mode (phone jaisa)" },
  { id: "12", name: "Kamzor jagah — hisaab + practice" },
  { id: "13", name: "Flash jod (dikha ke chhupao)" },
  { id: "14", name: "Chain calculation" },
  { id: "15", name: "Andaaza (estimation)" },
];

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

// Jawab dene ka dabba — ginti ho to likho, formula ho to chuno.
function Ans({ item, onDone, auto = false, disabled }) {
  const [v, setV] = useState("");
  const ref = useRef(null);
  useEffect(() => { setV(""); ref.current?.focus(); }, [item]);
  if (item.kind === "mcq") {
    return (
      <div className="clx-opts">
        {item.opts.map((o) => <button key={o} type="button" disabled={disabled} onClick={() => onDone(o === item.a, o)}>{o}</button>)}
      </div>
    );
  }
  return (
    <form className="clx-in" onSubmit={(e) => { e.preventDefault(); if (v.trim()) onDone(check(item, v), v); }}>
      <input ref={ref} value={v} disabled={disabled} inputMode="decimal" autoComplete="off" placeholder="jawab…"
        onChange={(e) => { setV(e.target.value); if (auto && check(item, e.target.value)) onDone(true, e.target.value); }} />
      <button type="submit" disabled={disabled}>↵</button>
    </form>
  );
}
const Q = ({ item, big }) => <div className={`clx-q${big ? " is-big" : ""}`}>{item.q}</div>;

// ─── 1 · Sprint 60s ───
function Sprint() {
  const [k, setK] = useSkill("sprint");
  const [phase, setPhase] = useState("idle");
  const [left, setLeft] = useState(60);
  const [item, setItem] = useState(null);
  const [sc, setSc] = useState({ y: 0, n: 0 });
  const t0 = useRef(0);
  const best = lsGet("cgl.calc.sprint", {});
  useEffect(() => {
    if (phase !== "run") return undefined;
    if (left <= 0) { setPhase("done"); const b = lsGet("cgl.calc.sprint", {}); if (sc.y > (b[k] || 0)) lsSet("cgl.calc.sprint", { ...b, [k]: sc.y }); return undefined; }
    const x = setTimeout(() => setLeft((v) => v - 1), 1000);
    return () => clearTimeout(x);
  }, [phase, left]); // eslint-disable-line react-hooks/exhaustive-deps
  const start = () => { setSc({ y: 0, n: 0 }); setLeft(60); setItem(withK(k)); t0.current = Date.now(); setPhase("run"); };
  const done = (ok) => { record(item.sk, ok, Date.now() - t0.current); setSc((s) => (ok ? { ...s, y: s.y + 1 } : { ...s, n: s.n + 1 })); setItem(withK(k)); t0.current = Date.now(); };
  if (phase === "run" && item) {
    return (
      <div className="cl1">
        <div className="cl1-top"><span className="clx-y">✓ {sc.y}</span><b className={left <= 10 ? "is-hot" : ""}>{left}s</b><span className="clx-n">✗ {sc.n}</span></div>
        <div className="cl1-bar"><i style={{ width: `${(left / 60) * 100}%` }} /></div>
        <Q item={item} big />
        <Ans item={item} auto onDone={done} />
        <p className="clx-dim">Sahi likhte hi agla — galat par Enter = skip</p>
      </div>
    );
  }
  return (
    <div className="cl1">
      {phase === "done" && <div className="clx-result"><b>{sc.y}</b><span>sahi 60 second mein · ✗ {sc.n}</span></div>}
      <p className="clx-dim">Skill chuno — 60 second mein jitne ho sakein. Best: <b>{best[k] || 0}</b> (<SkillName k={k} />)</p>
      <SkillPick value={k} onChange={setK} />
      <button type="button" className="clx-go" onClick={start}>▶ 60 second shuru</button>
    </div>
  );
}

// ─── 2 · Seekho + practice ───
function Learn() {
  const [k, setK] = useSkill("learn", "add2");
  const [item, setItem] = useState(() => withK(k));
  const [fb, setFb] = useState(null);
  const [tip, setTip] = useState(false);
  const [sc, setSc] = useState({ y: 0, n: 0 });
  const t0 = useRef(Date.now());
  useEffect(() => { setItem(withK(k)); setFb(null); t0.current = Date.now(); }, [k]);
  const sk = skillOf(item.sk);
  const done = (ok, v) => { record(item.sk, ok, Date.now() - t0.current); setFb({ ok, v }); setSc((s) => (ok ? { ...s, y: s.y + 1 } : { ...s, n: s.n + 1 })); };
  const next = () => { setItem(withK(k)); setFb(null); setTip(false); t0.current = Date.now(); };
  return (
    <div className="cl2">
      <aside className="cl2-side"><SkillPick value={k} onChange={setK} /></aside>
      <div className="cl2-main">
        {sk && <div className="cl2-tip"><b>💡 {sk.name} ki trick</b><p>{sk.tip}</p></div>}
        <div className="cl2-card">
          <div className="clx-score"><span className="clx-y">✓ {sc.y}</span><span className="clx-n">✗ {sc.n}</span></div>
          <Q item={item} big />
          {!fb ? <Ans item={item} onDone={done} /> : (
            <div className={`clx-fb ${fb.ok ? "is-y" : "is-n"}`}>
              {fb.ok ? "✓ Sahi!" : <>✗ Tumne {fb.v} likha — sahi <b>{item.a}</b></>}
              <button type="button" onClick={next}>Agla →</button>
            </div>
          )}
          {!fb && sk && <button type="button" className="clx-link" onClick={() => setTip(!tip)}>{tip ? "Trick chhupao" : "💡 Is sawaal par trick yaad dilao"}</button>}
          {tip && !fb && sk && <p className="clx-dim">{sk.tip}</p>}
        </div>
      </div>
    </div>
  );
}

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

// ─── 4 · Worksheet ───
function Sheet() {
  const [k, setK] = useSkill("sheet", "mul21");
  const make = () => Array.from({ length: 20 }, () => withK(k));
  const [items, setItems] = useState(make);
  const [vals, setVals] = useState({});
  const [res, setRes] = useState(null);
  const [t0, setT0] = useState(() => Date.now());
  useEffect(() => { setItems(make()); setVals({}); setRes(null); setT0(Date.now()); }, [k]); // eslint-disable-line react-hooks/exhaustive-deps
  const grade = () => {
    const ok = items.map((it, i) => check(it, vals[i] || ""));
    const ms = (Date.now() - t0) / items.length;
    items.forEach((it, i) => record(it.sk, ok[i], ms));
    setRes({ ok, secs: Math.round((Date.now() - t0) / 1000) });
  };
  const score = res ? res.ok.filter(Boolean).length : 0;
  return (
    <div className="cl4">
      <details className="clx-det"><summary>Skill: <SkillName k={k} /> (badlo)</summary><SkillPick value={k} onChange={setK} allow="num" /></details>
      <div className="cl4-paper">
        <header><b>Worksheet</b><span>Naam: ____________</span>{res && <em>{score}/20 · {res.secs}s</em>}</header>
        <div className="cl4-grid">
          {items.map((it, i) => (
            <label key={i} className={res ? (res.ok[i] ? "is-y" : "is-n") : ""}>
              <small>{i + 1}.</small><span>{it.q} =</span>
              <input value={vals[i] || ""} disabled={!!res} inputMode="decimal" onChange={(e) => setVals((v) => ({ ...v, [i]: e.target.value }))} />
              {res && !res.ok[i] && <em>{it.a}</em>}
            </label>
          ))}
        </div>
      </div>
      {!res ? <button type="button" className="clx-go" onClick={grade}>✔ Jaancho</button> : <button type="button" className="clx-go" onClick={() => { setItems(make()); setVals({}); setRes(null); setT0(Date.now()); }}>📄 Nayi sheet</button>}
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
        <><p className="clx-dim">{me}/{GOAL} sahi · {Math.round(t)}s</p><Q item={item} big /><Ans item={item} auto onDone={done} /></>
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

// ─── 7 · Ghadi se tez ───
function Clock() {
  const [k, setK] = useSkill("clock");
  const [sec, setSec] = useState(6);
  const [run, setRun] = useState(false);
  const [item, setItem] = useState(null);
  const [left, setLeft] = useState(0);
  const [fb, setFb] = useState(null);
  const [sc, setSc] = useState({ y: 0, n: 0 });
  const next = () => { setItem(withK(k)); setLeft(sec * 10); setFb(null); };
  useEffect(() => {
    if (!run || fb || !item) return undefined;
    if (left <= 0) { record(item.sk, false, sec * 1000); setSc((s) => ({ ...s, n: s.n + 1 })); setFb({ ok: false, late: true }); setTimeout(next, 1200); return undefined; }
    const x = setTimeout(() => setLeft((v) => v - 1), 100);
    return () => clearTimeout(x);
  }, [run, left, fb, item]); // eslint-disable-line react-hooks/exhaustive-deps
  const done = (ok) => { record(item.sk, ok, (sec * 10 - left) * 100); setSc((s) => (ok ? { ...s, y: s.y + 1 } : { ...s, n: s.n + 1 })); setFb({ ok }); setTimeout(next, ok ? 300 : 1200); };
  if (!run) {
    return (
      <div className="cl7">
        <div className="clx-row">Har sawaal ka time: {[3, 5, 6, 8, 12].map((s) => <button key={s} type="button" className={sec === s ? "is-on" : ""} onClick={() => setSec(s)}>{s}s</button>)}</div>
        <SkillPick value={k} onChange={setK} />
        <button type="button" className="clx-go" onClick={() => { setRun(true); setSc({ y: 0, n: 0 }); next(); }}>⏱ Shuru</button>
      </div>
    );
  }
  const pct = (left / (sec * 10)) * 100;
  return (
    <div className="cl7">
      <div className="clx-score"><span className="clx-y">✓ {sc.y}</span><span className="clx-n">✗ {sc.n}</span><button type="button" className="clx-link" onClick={() => setRun(false)}>⏹ Roko</button></div>
      <div className="cl7-ring" style={{ "--p": pct }}><b>{(left / 10).toFixed(1)}</b></div>
      <Q item={item} big />
      {!fb ? <Ans item={item} onDone={done} /> : <div className={`clx-fb ${fb.ok ? "is-y" : "is-n"}`}>{fb.ok ? "✓" : <>{fb.late ? "⏰ Time khatam" : "✗"} — {item.a}</>}</div>}
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

// ─── 10 · Gayab number ───
function makeMissing() {
  const t = pick(["+", "−", "×", "÷"]);
  let a, b, c;
  if (t === "+") { a = ri(12, 999); b = ri(12, 999); c = a + b; }
  else if (t === "−") { a = ri(100, 999); b = ri(10, a); c = a - b; }
  else if (t === "×") { a = ri(11, 99); b = ri(3, 19); c = a * b; }
  else { b = ri(3, 19); c = ri(11, 99); a = b * c; }
  const hideA = Math.random() < 0.5;
  return { q: hideA ? `? ${t} ${b} = ${c}` : `${a} ${t} ? = ${c}`, a: String(hideA ? a : b), kind: "num", sk: t === "+" || t === "−" ? "add3" : t === "×" ? "mul21" : "div" };
}
function Missing() {
  const [item, setItem] = useState(makeMissing);
  const [fb, setFb] = useState(null);
  const [sc, setSc] = useState({ y: 0, n: 0 });
  const t0 = useRef(Date.now());
  const done = (ok) => { record(item.sk, ok, Date.now() - t0.current); setFb(ok); setSc((s) => (ok ? { ...s, y: s.y + 1 } : { ...s, n: s.n + 1 })); setTimeout(() => { setItem(makeMissing()); setFb(null); t0.current = Date.now(); }, ok ? 400 : 1400); };
  const [l, r] = item.q.split("?");
  return (
    <div className="cl10">
      <div className="clx-score"><span className="clx-y">✓ {sc.y}</span><span className="clx-n">✗ {sc.n}</span></div>
      <div className={`cl10-eq${fb === true ? " is-y" : fb === false ? " is-n" : ""}`}>{l}<i>{fb === null ? "?" : item.a}</i>{r}</div>
      <Ans item={item} onDone={done} disabled={fb !== null} />
      <p className="clx-dim">Ulta socho: jod ka ulta ghataav, guna ka ulta bhaag — SSC mein "?" wale sawaal isi se.</p>
    </div>
  );
}

// ─── 11 · Keypad ───
function Keypad() {
  const [k, setK] = useSkill("keypad", "mul21");
  const [item, setItem] = useState(() => withK(k));
  const [v, setV] = useState("");
  const [fb, setFb] = useState(null);
  const [sc, setSc] = useState({ y: 0, n: 0 });
  const t0 = useRef(Date.now());
  const next = () => { setItem(withK(k)); setV(""); setFb(null); t0.current = Date.now(); };
  useEffect(() => { next(); }, [k]); // eslint-disable-line react-hooks/exhaustive-deps
  const settle = (val) => {
    const ok = check(item, val);
    record(item.sk, ok, Date.now() - t0.current);
    setFb(ok ? "y" : "n"); setSc((s) => (ok ? { ...s, y: s.y + 1 } : { ...s, n: s.n + 1 }));
    setTimeout(next, ok ? 250 : 1100);
  };
  const press = (c) => {
    if (fb) return;
    if (c === "⌫") { setV((x) => x.slice(0, -1)); return; }
    if (c === "✓") { if (v) settle(v); return; }
    const nv = v + c;
    setV(nv);
    if (nv.length >= String(item.a).length) settle(nv);
  };
  useEffect(() => {
    const f = (e) => { if (/^[0-9.]$/.test(e.key)) press(e.key); else if (e.key === "Backspace") press("⌫"); else if (e.key === "Enter") press("✓"); };
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  });
  if (item.kind === "mcq") return <div className="cl11"><p className="clx-dim">Keypad sirf ginti wale skill ke liye — upar se koi aur skill chuno.</p><SkillPick value={k} onChange={setK} allow="num" /></div>;
  return (
    <div className="cl11">
      <details className="clx-det"><summary>Skill: <SkillName k={k} /> (badlo)</summary><SkillPick value={k} onChange={setK} allow="num" /></details>
      <div className="cl11-phone">
        <div className="clx-score"><span className="clx-y">✓ {sc.y}</span><span className="clx-n">✗ {sc.n}</span></div>
        <div className="cl11-q">{item.q}</div>
        <div className={`cl11-disp${fb ? ` is-${fb}` : ""}`}>{v || <i>{"_".repeat(String(item.a).length)}</i>}{fb === "n" && <small> → {item.a}</small>}</div>
        <div className="cl11-keys">{["7", "8", "9", "4", "5", "6", "1", "2", "3", ".", "0", "⌫"].map((c) => <button key={c} type="button" onClick={() => press(c)}>{c}</button>)}</div>
        <p className="clx-dim">Jitne ank jawab mein, utne dabate hi apne aap jaanch.</p>
      </div>
    </div>
  );
}

// ─── 12 · Kamzor jagah ───
function Weak() {
  const [stats, setStats] = useState(readStats);
  const rows = ARITH.map((s) => { const o = stats[s.k]; return { s, n: o?.n || 0, acc: o?.n ? o.ok / o.n : null, sec: o?.n ? o.ms / o.n / 1000 : null }; });
  const weak = [...rows].sort((a, b) => (a.acc ?? -1) - (b.acc ?? -1) || (b.sec ?? 99) - (a.sec ?? 99)).slice(0, 3);
  const [prac, setPrac] = useState(false);
  const [item, setItem] = useState(null);
  const [fb, setFb] = useState(null);
  const t0 = useRef(Date.now());
  const next = () => { setItem(withK(pick(weak).s.k)); setFb(null); t0.current = Date.now(); };
  const done = (ok) => { record(item.sk, ok, Date.now() - t0.current); setStats(readStats()); setFb(ok); setTimeout(next, ok ? 350 : 1300); };
  return (
    <div className="cl12">
      <table>
        <thead><tr><th>Skill</th><th>Sawaal</th><th>Sahi %</th><th>Time</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.s.k} className={weak.includes(r) ? "is-weak" : ""}>
              <td>{r.s.icon} {r.s.name}</td><td>{r.n}</td>
              <td><span className="cl12-bar"><i style={{ width: `${(r.acc ?? 0) * 100}%`, background: r.acc == null ? "transparent" : r.acc > 0.85 ? "#22c55e" : r.acc > 0.6 ? "#f59e0b" : "#ef4444" }} /></span>{r.acc == null ? "—" : `${Math.round(r.acc * 100)}%`}</td>
              <td>{r.sec == null ? "—" : `${r.sec.toFixed(1)}s`}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="cl12-side">
        <h3>🎯 Sabse kamzor 3</h3>
        <ol>{weak.map((w) => <li key={w.s.k}>{w.s.icon} {w.s.name}</li>)}</ol>
        {!prac ? <button type="button" className="clx-go" onClick={() => { setPrac(true); next(); }}>▶ Inhi ki practice</button> : item && (
          <div className="cl12-prac">
            <small className="clx-dim"><SkillName k={item.sk} /></small>
            <Q item={item} />
            {fb === null ? <Ans item={item} onDone={done} /> : <div className={`clx-fb ${fb ? "is-y" : "is-n"}`}>{fb ? "✓" : `✗ ${item.a}`}</div>}
          </div>
        )}
        <p className="clx-dim">Har tareeke ke jawab yahan jud-te hain. Laal = pehle isko.</p>
      </div>
    </div>
  );
}

// ─── 13 · Flash jod ───
function Flash() {
  const [cnt, setCnt] = useState(5);
  const [spd, setSpd] = useState(1000);
  const [dg, setDg] = useState(2);
  const [seq, setSeq] = useState(null);
  const [i, setI] = useState(-1);
  const [v, setV] = useState("");
  const [res, setRes] = useState(null);
  useEffect(() => {
    if (!seq || i >= seq.length) return undefined;
    const x = setTimeout(() => setI((y) => y + 1), spd);
    return () => clearTimeout(x);
  }, [seq, i, spd]);
  const start = () => {
    const s = []; let tot = 0;
    for (let j = 0; j < cnt; j++) { const mx = 10 ** dg - 1; let x = ri(dg === 1 ? 1 : 10 ** (dg - 1), mx); if (j > 0 && Math.random() < 0.35 && tot - x >= 0) x = -x; tot += x; s.push(x); }
    setSeq(s); setI(0); setV(""); setRes(null);
  };
  const total = seq ? seq.reduce((a, b) => a + b, 0) : 0;
  const showing = seq && i >= 0 && i < seq.length;
  return (
    <div className="cl13">
      {!seq || res ? (
        <>
          {res && <div className={`clx-result ${res.ok ? "" : "is-n"}`}><b>{res.ok ? "✓ Sahi!" : "✗"}</b><span>Jod tha {total} · {seq.map((x) => (x < 0 ? `− ${-x}` : `+ ${x}`)).join(" ")}</span></div>}
          <div className="clx-row">Kitne number: {[3, 5, 7, 10].map((c) => <button key={c} type="button" className={cnt === c ? "is-on" : ""} onClick={() => setCnt(c)}>{c}</button>)}</div>
          <div className="clx-row">Ank: {[1, 2, 3].map((c) => <button key={c} type="button" className={dg === c ? "is-on" : ""} onClick={() => setDg(c)}>{c} ank</button>)}</div>
          <div className="clx-row">Raftaar: {[[1500, "dheere"], [1000, "normal"], [600, "tez"], [400, "bahut tez"]].map(([s, l]) => <button key={s} type="button" className={spd === s ? "is-on" : ""} onClick={() => setSpd(s)}>{l}</button>)}</div>
          <button type="button" className="clx-go" onClick={start}>⚡ Flash shuru</button>
        </>
      ) : showing ? (
        <div className="cl13-flash" key={i}><span className={seq[i] < 0 ? "is-neg" : ""}>{i === 0 ? seq[i] : seq[i] < 0 ? `− ${-seq[i]}` : `+ ${seq[i]}`}</span><small>{i + 1}/{seq.length}</small></div>
      ) : (
        <form className="clx-in" onSubmit={(e) => { e.preventDefault(); setRes({ ok: Number(v) === total }); record(dg === 1 ? "add2" : dg === 2 ? "addn" : "add3", Number(v) === total, 0); }}>
          <input autoFocus value={v} onChange={(e) => setV(e.target.value)} inputMode="numeric" placeholder="kul jod?" /><button type="submit">↵</button>
        </form>
      )}
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
  const [v, setV] = useState("");
  const [bad, setBad] = useState(false);
  const [miss, setMiss] = useState(0);
  const done = at >= c.steps.length;
  const submit = (e) => {
    e.preventDefault();
    const st = c.steps[at];
    if (Number(v) === st.r) { setAt(at + 1); setV(""); setBad(false); record(st.op === "×" ? "mul21" : st.op === "÷" ? "div" : "add3", true, 0); }
    else { setBad(true); setMiss((m) => m + 1); record(st.op === "×" ? "mul21" : st.op === "÷" ? "div" : "add3", false, 0); }
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
        <form className={`clx-in${bad ? " is-bad" : ""}`} onSubmit={submit}>
          <input autoFocus value={v} onChange={(e) => { setV(e.target.value); setBad(false); }} inputMode="numeric" placeholder={`${at ? c.steps[at - 1].r : c.start} ${c.steps[at].op} ${c.steps[at].x} = ?`} /><button type="submit">↵</button>
        </form>
      ) : (
        <div className="clx-result"><b>🔗 Chain poori!</b><span>{miss ? `${miss} galti` : "ek bhi galti nahi"} · aakhri {c.steps[c.steps.length - 1].r}</span><button type="button" className="clx-go" onClick={() => { setC(makeChain()); setAt(0); setMiss(0); }}>Nayi chain</button></div>
      )}
      <p className="clx-dim">Pichhla jawab hi agla sawaal — dimaag mein number pakde rakhne ki practice.</p>
    </div>
  );
}

// ─── 15 · Andaaza ───
function makeEst() {
  const r = (a, b) => Math.round((ri(a, b) + Math.random()) * 100) / 100;
  return pick([
    () => { const a = r(20, 99), b = r(11, 99); return { q: `${a} × ${b}`, x: a * b }; },
    () => { const a = r(1000, 9999), b = r(11, 99); return { q: `${a} ÷ ${b}`, x: a / b }; },
    () => { const p = r(11, 89), y = r(100, 2000); return { q: `${p}% of ${y}`, x: (p * y) / 100 }; },
    () => { const a = r(100, 999), b = r(100, 999), c = r(10, 99); return { q: `${a} + ${b} × ${c}`, x: a + b * c }; },
    () => { const a = r(10, 50); return { q: `${a}²`, x: a * a }; },
    () => { const a = ri(200, 3000); return { q: `√${a}`, x: Math.sqrt(a) }; },
  ])();
}
function Estimate() {
  const [e, setE] = useState(makeEst);
  const [v, setV] = useState("");
  const [res, setRes] = useState(null);
  const [hist, setHist] = useState([]);
  const submit = (ev) => {
    ev.preventDefault();
    const g = Number(v); if (Number.isNaN(g) || !v) return;
    const err = Math.abs(g - e.x) / Math.abs(e.x) * 100;
    setRes({ err, g }); setHist((h) => [...h.slice(-19), err]);
    record("approx", err <= 5, 0);
  };
  const avg = hist.length ? hist.reduce((a, b) => a + b, 0) / hist.length : null;
  const grade = (x) => (x <= 2 ? ["🎯", "Ekdum paas!"] : x <= 5 ? ["👍", "Achha andaaza"] : x <= 10 ? ["🙂", "Theek-thaak"] : ["😬", "Door reh gaye"]);
  return (
    <div className="cl15">
      <p className="clx-dim">Poora hisaab mat karo — gol karke andaaza lagao. 5% ke andar = SSC ke liye kaafi.</p>
      <div className="cl15-q">≈ {e.q}</div>
      {!res ? (
        <form className="clx-in" onSubmit={submit}><input autoFocus value={v} onChange={(x) => setV(x.target.value)} inputMode="decimal" placeholder="tumhara andaaza" /><button type="submit">↵</button></form>
      ) : (
        <div className="cl15-res">
          <b>{grade(res.err)[0]} {grade(res.err)[1]}</b>
          <div className="cl15-scale"><i style={{ left: "50%" }} className="is-x" /><i style={{ left: `${Math.max(2, Math.min(98, 50 + ((res.g - e.x) / e.x) * 250))}%` }} className="is-g" /></div>
          <span>Tumhara {res.g} · asli {Math.round(e.x * 100) / 100} (≈ {nice(e.x)}) · galti {res.err.toFixed(1)}%</span>
          <button type="button" className="clx-go" onClick={() => { setE(makeEst()); setV(""); setRes(null); }}>Agla →</button>
        </div>
      )}
      {avg != null && <p className="clx-dim">Is baithak ki ausat galti: <b>{avg.toFixed(1)}%</b> ({hist.length} sawaal)</p>}
    </div>
  );
}

const COMP = { 1: Sprint, 2: Learn, 3: Ladder, 4: Sheet, 5: Race, 6: Survival, 7: Clock, 8: McqFast, 9: Verify, 10: Missing, 11: Keypad, 12: Weak, 13: Flash, 14: Chain, 15: Estimate };

export default function CalcLayouts({ lay }) {
  const C = COMP[lay];
  if (!C) return null;
  return <div className={`clx clx--${lay}`}><C key={lay} /></div>;
}
