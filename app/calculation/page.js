"use client";

// 🧮 Calculation — jo ginti paper mein bina soche aani chahiye.
//
// Kaam ka tareeka har topic par ek hi hai: PEHLE DEKHO, PHIR TEST.
//   1. Topic ka apna dropdown — kaunsa hissa (table 11–20, square 30–40…).
//   2. 📖 Dekho — poora table/list saamne.
//   3. ▶️ Test — usi hisse ke sawaal ek ke baad ek, jab tak khud na roko.
//      Har jawab chaar option mein se chunna hai — pehle ginti wale type
//      karne hote the, owner ne "likhne ki jagah options" maange.
//
// Topic kabhi mix nahi hote — test hamesha usi deck ka rehta hai jo chuna
// hai (owner: "sabko mix mat kario alag alag hi rakhio").
//
// Sab kuch is device par banta hai — koi API, koi paisa nahi.
//
// 🎨 Upar dropdown se calculation sudhaarne ke 15 aur tareeke
// (components/CalcLayouts) — owner dekh kar ek chunega. "0" = yahi purana
// (topic ki tiles). Chunaav is device par `cgl.calclayout` mein.

import { useEffect, useMemo, useState } from "react";
import "./calc.css";
import { GROUPS, groupOf, buildDeck, shuffled, optionsFor } from "@/lib/calcdecks";
import CalcLayouts, { CL_LAYOUTS } from "@/components/CalcLayouts";
import { numOpts } from "@/lib/calcskills";
import "./layouts.css";

const LAY_KEY = "cgl.calclayout";

const KEY = "cgl.calc.best";   // { "tables|11-20": { best, done } }

function readBest() {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch { return {}; }
}
function writeBest(v) {
  try { localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* ignore */ }
}

// ── dekhne wala panna ────────────────────────────────────────────────────
function Show({ deck }) {
  return (
    <div className="cal-show">
      {deck.show.map((sec, i) => (
        <section key={i} className="cal-card">
          {sec.head ? <h3>{sec.head}</h3> : null}
          <dl>
            {sec.rows.map(([l, r], j) => (
              <div key={j}><dt>{l}</dt><dd>{r}</dd></div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}

// ── test ─────────────────────────────────────────────────────────────────
// Sawaal khatam ho jayein to dobara phent kar wahi deck chalta rehta hai —
// ruk tabhi hoga jab tum "⏹ Roko" dabao.
function Test({ deck, onStop, onScore }) {
  const [queue, setQueue] = useState(() => shuffled(deck.items));
  const [at, setAt] = useState(0);
  const [typed, setTyped] = useState("");
  const [mark, setMark] = useState(null);     // null | "ok" | "no"
  const [right, setRight] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);
  const [t0, setT0] = useState(() => Date.now());
  const [secs, setSecs] = useState(0);

  const item = queue[at] || null;
  // Likhna nahi, chunna (owner: "likhne ki jagah options de"). Ginti wale deck
  // ke galat option numOpts se — asli jaise; ginti na ho to deck se.
  const opts = useMemo(() => {
    if (!item) return [];
    if (deck.kind === "mcq") return optionsFor(item, deck.items);
    const o = numOpts(item.a);
    return o.length >= 4 ? o : optionsFor(item, deck.items);
  }, [deck, item]);

  useEffect(() => {
    const id = setInterval(() => setSecs(Math.round((Date.now() - t0) / 1000)), 500);
    return () => clearInterval(id);
  }, [t0]);

  const next = () => {
    setTyped(""); setMark(null); setT0(Date.now()); setSecs(0);
    setAt((p) => {
      const n = p + 1;
      if (n < queue.length) return n;
      setQueue(shuffled(deck.items));     // deck khatam — wahi deck dobara
      return 0;
    });
  };

  const settle = (ok) => {
    setMark(ok ? "ok" : "no");
    if (ok) {
      setRight((r) => r + 1);
      setStreak((s) => { const v = s + 1; setBest((b) => Math.max(b, v)); return v; });
      setTimeout(next, 450);
    } else {
      setWrong((w) => w + 1);
      setStreak(0);
    }
  };

  const pick = (o) => {
    if (!item || mark) return;
    setTyped(o);
    settle(o === item.a);
  };

  const stop = () => { onScore({ right, wrong, best }); onStop(); };

  if (!item) return <p className="cal-dim">Is hisse mein kuch nahi.</p>;
  return (
    <div className="cal-test">
      <div className="cal-score">
        <span className="cal-ok">✓ {right}</span>
        <span className="cal-no">✗ {wrong}</span>
        <span>🔥 {streak}{best > streak ? ` · best ${best}` : ""}</span>
        <span className="cal-dim">⏱ {secs}s</span>
        <button type="button" className="cal-stop" onClick={stop}>⏹ Roko</button>
      </div>

      <div className={`cal-q${mark === "ok" ? " is-ok" : mark === "no" ? " is-no" : ""}`}>
        <b>{item.q}</b>
        <div className="cal-opts">
            {opts.map((o) => (
              <button
                key={o}
                type="button"
                className={mark && o === item.a ? "is-ok" : mark === "no" && o === typed ? "is-no" : ""}
                onClick={() => pick(o)}
              >{o}</button>
            ))}
        </div>
      </div>

      {mark === "no" && (
        <p className="cal-ans">
          Sahi jawab: <b>{item.a}</b>
          <button type="button" className="btn btn--ghost btn--sm" onClick={next}>Agla →</button>
        </p>
      )}
    </div>
  );
}

// ── page ─────────────────────────────────────────────────────────────────
export default function CalculationPage() {
  // Har topic ka apna chuna hua hissa (dropdown).
  const [pick, setPick] = useState(() => {
    const o = {};
    for (const g of GROUPS) o[g.k] = g.variants[0].k;
    return o;
  });
  const [open, setOpen] = useState(null);        // { g, v, mode: "show" | "test" }
  const [best, setBest] = useState({});
  useEffect(() => { setBest(readBest()); }, []);
  const [lay, setLay] = useState("0");
  useEffect(() => { try { const v = localStorage.getItem(LAY_KEY); if (v && CL_LAYOUTS.some((l) => l.id === v)) setLay(v); } catch { /* private */ } }, []);
  const pickLay = (v) => { setLay(v); setOpen(null); try { localStorage.setItem(LAY_KEY, v); } catch { /* private */ } };
  const bar = (
    <div className="cl-bar">
      <select value={lay} onChange={(e) => pickLay(e.target.value)} aria-label="Practice ka tareeka">
        <option value="0">🎨 0 · Purana (topic: Dekho → Test)</option>
        {CL_LAYOUTS.map((l) => <option key={l.id} value={l.id}>🎨 {l.id} · {l.name}</option>)}
      </select>
    </div>
  );

  const deck = useMemo(() => (open ? buildDeck(open.g, open.v) : null), [open]);
  const g = open ? groupOf(open.g) : null;
  const vLabel = g ? (g.variants.find((v) => v.k === open.v) || {}).label : "";
  const id = open ? `${open.g}|${open.v}` : "";

  const saveScore = ({ right, wrong, best: b }) => {
    const all = { ...readBest() };
    const old = all[id] || { best: 0, right: 0, wrong: 0 };
    all[id] = { best: Math.max(old.best, b), right: old.right + right, wrong: old.wrong + wrong };
    writeBest(all); setBest(all);
  };

  if (lay !== "0") {
    return (
      <section className="section cal">
        <h1 className="cal-h1">🧮 Calculation</h1>
        {bar}
        <CalcLayouts lay={lay} />
      </section>
    );
  }

  if (open && deck) {
    return (
      <section className="section cal">
        <div className="cal-top">
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setOpen(null)}>← Saare topic</button>
          <h2 className="cal-h">{g.icon} {g.name} <span className="cal-dim">· {vLabel}</span></h2>
          <span className="cal-tabs">
            <button type="button" className={open.mode === "show" ? "is-on" : ""} onClick={() => setOpen({ ...open, mode: "show" })}>📖 Dekho</button>
            <button type="button" className={open.mode === "test" ? "is-on" : ""} onClick={() => setOpen({ ...open, mode: "test" })}>▶️ Test</button>
          </span>
        </div>
        {open.mode === "show"
          ? <Show deck={deck} />
          : <Test key={id} deck={deck} onStop={() => setOpen({ ...open, mode: "show" })} onScore={saveScore} />}
      </section>
    );
  }

  return (
    <section className="section cal">
      <h1 className="cal-h1">🧮 Calculation</h1>
      {bar}
      <p className="cal-dim cal-sub">
        Har topic ka apna hissa chuno — pehle <b>📖 Dekho</b>, phir <b>▶️ Test</b>. Test tab tak chalta
        hai jab tak tum <b>⏹ Roko</b> na dabao, aur hamesha usi topic ka rehta hai.
      </p>

      <div className="cal-grid">
        {GROUPS.map((gr) => {
          const v = pick[gr.k];
          const b = best[`${gr.k}|${v}`];
          return (
            <article key={gr.k} className="cal-tile">
              <h3><span className="cal-ic">{gr.icon}</span>{gr.name}</h3>
              <p className="cal-dim">{gr.sub}</p>
              <select value={v} onChange={(e) => setPick({ ...pick, [gr.k]: e.target.value })} aria-label={`${gr.name} ka hissa`}>
                {gr.variants.map((x) => <option key={x.k} value={x.k}>{x.label}</option>)}
              </select>
              <div className="cal-btns">
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => setOpen({ g: gr.k, v, mode: "show" })}>📖 Dekho</button>
                <button type="button" className="btn btn--primary btn--sm" onClick={() => setOpen({ g: gr.k, v, mode: "test" })}>▶️ Test</button>
              </div>
              {b && b.best ? <span className="cal-best">🔥 best {b.best} · ✓ {b.right}</span> : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
