"use client";

// 🪔 Bharat Sanskriti — sirf do tareeke (owner: baaki se "yaad hoga hi nahi"):
//
//   1. Kaun sa rajya?  — naam dikhe, 4 rajya mein se chuno. Jawab ke baad
//      Parmar ka note + us rajya ki TRICK LINE (jis shabd se ye yaad hota hai
//      wo highlight) + usi rajya ke baaki naam — ek saath poora jhund.
//   2. Match the following — SSC wala: List-I (4) ↔ List-II (4), code chuno.
//
// Galat hua to wahi cheez 3 sawaal baad phir aati hai, aur `cgl.culture.galti`
// mein ginti — agli baar bhi pehle wahi. Data: lib/sanskriti (Parmar Static).

import { useMemo, useState } from "react";
import {
  STATE_NAME, REGION, regionOf, TLABEL, TICON, CLASSICAL, CLASSICAL_FACTS, TRICKS, EXTRA,
  allItems, classicalQs, norm, statesOfName, readMine, writeMine, readGalti, markGalti,
} from "@/lib/sanskriti";

const shuffle = (a) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const sn = (k) => STATE_NAME[k] || k;

export const CATS = [
  { k: "mix", l: "🎲 Sab mix" },
  { k: "fd", l: "🥁 Folk dance" },
  { k: "fs", l: "🪔 Festival" },
  { k: "cd", l: "💃 Classical — rajya" },
  { k: "cq", l: "🎓 Classical — guru / baatein" },
];

// Trick line mein wo shabd chamkao jisse ye cheez yaad hoti hai.
function TrickLine({ text, hook }) {
  if (!text) return null;
  if (!hook) return <span>{text}</span>;
  const esc = hook.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = new RegExp(`(^|[^\\p{L}])(${esc})(?=$|[^\\p{L}])`, "iu").exec(text);
  if (!m) return <span>{text}</span>;
  const i = m.index + m[1].length;
  return <span>{text.slice(0, i)}<mark>{text.slice(i, i + m[2].length)}</mark>{text.slice(i + m[2].length)}</span>;
}

// Galti wale pehle; baaki random.
function order(list) {
  const g = readGalti();
  const bad = shuffle(list.filter((x) => g[x.id]));
  const rest = shuffle(list.filter((x) => !g[x.id]));
  return [...bad, ...rest];
}

// Ek rajya ke 3 galat option — pehle paas ke rajya, jo is naam wale na hon.
function stateOpts(items, it) {
  const bad = statesOfName(items, it.n);
  const near = shuffle(REGION[regionOf(it.st)].filter((k) => !bad.has(k) && STATE_NAME[k]));
  const far = shuffle(Object.keys(STATE_NAME).filter((k) => !bad.has(k) && !near.includes(k)));
  return shuffle([it.st, ...[...near, ...far].slice(0, 3)]);
}

// ─── 1 · Kaun sa rajya ───
function Which({ items, cat }) {
  const pool = useMemo(() => (cat === "cq" ? classicalQs() : items.filter((x) => cat === "mix" || x.t === cat)), [items, cat]);
  const [q, setQ] = useState(() => order(pool).map((x) => x.id));
  const byId = useMemo(() => new Map(pool.map((x) => [x.id, x])), [pool]);
  const it = byId.get(q[0]);
  const [p, setP] = useState(null);
  const [sc, setSc] = useState({ y: 0, n: 0 });
  const opts = useMemo(() => {
    if (!it) return [];
    if (cat === "cq") return shuffle([it.a, ...shuffle(CLASSICAL.map((c) => c.n).filter((n) => n !== it.a)).slice(0, 3)]);
    return stateOpts(items, it);
  }, [it, items, cat]);
  if (!it) return <div className="sk-done">🎉 Is chhaanti ke sab ho gaye. Doosri chhaanti chuno ya page dobara kholo.</div>;
  const right = cat === "cq" ? it.a : it.st;
  const okSet = cat === "cq" ? new Set([it.a]) : statesOfName(items, it.n);
  const choose = (o) => {
    if (p) return;
    const ok = okSet.has(o);
    markGalti(it.id, ok);
    setP(o);
    setSc((s) => (ok ? { ...s, y: s.y + 1 } : { ...s, n: s.n + 1 }));
  };
  const next = () => {
    const ok = okSet.has(p);
    setQ((x) => { const [h, ...r] = x; if (ok) return r; const c = [...r]; c.splice(Math.min(3, c.length), 0, h); return c; });
    setP(null);
  };
  const same = cat === "cq" ? [] : items.filter((x) => x.st === it.st && x.t === it.t && x.id !== it.id);
  const cls = cat === "cq" ? CLASSICAL.find((c) => c.n === it.a) : it.t === "cd" ? CLASSICAL.find((c) => c.n === it.n) : null;
  return (
    <div className="sk-quiz">
      <div className="sk-score"><span className="is-y">✓ {sc.y}</span><span className="is-n">✗ {sc.n}</span><span>bache {q.length}</span></div>
      <div className="sk-q">
        {cat === "cq"
          ? <><small>{it.kind === "guru" ? "Ye guru / kalakar kis classical nritya ke?" : "Ye baat kis classical nritya ki?"}</small><h2>{it.q}</h2></>
          : <><small>{TICON[it.t]} {TLABEL[it.t]} — kis rajya / UT ka?</small><h2>{it.n}</h2></>}
      </div>
      <div className="sk-opts">
        {opts.map((o) => (
          <button key={o} type="button" onClick={() => choose(o)}
            className={p ? (okSet.has(o) ? "is-y" : p === o ? "is-n" : "is-dim") : ""}>{cat === "cq" ? o : sn(o)}</button>
        ))}
      </div>
      {p && (
        <div className="sk-exp">
          <p className="sk-ans">{okSet.has(p) ? "✓ Sahi" : "✗ Galat"} — <b>{cat === "cq" ? it.a : sn(right)}</b>{cat !== "cq" && okSet.size > 1 ? <small> (ye {[...okSet].map(sn).join(", ")} mein bhi)</small> : null}</p>
          {it.note && cat !== "cq" && <p className="sk-note">📖 {it.note}</p>}
          {cat !== "cq" && TRICKS[it.t]?.[it.st] && <p className="sk-trick">🧠 <b>{sn(it.st)} ki trick:</b> <TrickLine text={TRICKS[it.t][it.st]} hook={it.hook} /></p>}
          {cls && (
            <div className="sk-cls">
              <b>💃 {cls.n} ({sn(cls.st)})</b>
              <ul>{cls.facts.map((f) => <li key={f}>{f}</li>)}</ul>
              <p><b>Guru:</b> {cls.guru.join(", ")}</p>
              <p className="sk-trick">🧠 <TrickLine text={cls.trick} hook="" /></p>
            </div>
          )}
          {same.length > 0 && (
            <div className="sk-same"><b>{sn(it.st)} ke aur {TLABEL[it.t].toLowerCase()}:</b> {same.map((x) => x.n).join(" · ")}</div>
          )}
          <button type="button" className="sk-go" onClick={next}>Agla →</button>
        </div>
      )}
    </div>
  );
}

// ─── 2 · Match the following ───
const L = ["A", "B", "C", "D"];
function perms(n) { const out = []; const go = (a, r) => { if (!r.length) out.push(a); else r.forEach((x, i) => go([...a, x], [...r.slice(0, i), ...r.slice(i + 1)])); }; go([], [...Array(n).keys()]); return out; }
const PERMS = perms(4);
function makeMatch(items, cat) {
  let left, right, rightLabel;
  if (cat === "cq") {
    const qs = shuffle(classicalQs());
    const picked = []; const used = new Set();
    for (const x of qs) { if (!used.has(x.a)) { used.add(x.a); picked.push(x); } if (picked.length === 4) break; }
    left = picked.map((x) => ({ id: x.id, n: x.q, key: x.a, note: "" }));
    rightLabel = (k) => k;
  } else {
    const pool = order(items.filter((x) => cat === "mix" || x.t === cat));
    const picked = []; const usedSt = new Set(); const usedN = new Set();
    for (const x of pool) {
      const bad = statesOfName(items, x.n);
      if ([...bad].some((s) => usedSt.has(s)) || usedN.has(norm(x.n))) continue;
      picked.push(x); usedSt.add(x.st); usedN.add(norm(x.n));
      if (picked.length === 4) break;
    }
    left = picked.map((x) => ({ id: x.id, n: x.n, key: x.st, note: x.note, t: x.t, hook: x.hook }));
    rightLabel = sn;
  }
  right = shuffle(left.map((x) => x.key));
  const truth = left.map((x) => right.indexOf(x.key));
  const wrong = shuffle(PERMS.filter((pm) => pm.some((v, i) => v !== truth[i]))).slice(0, 3);
  const codes = shuffle([truth, ...wrong]);
  return { left, right, rightLabel, truth, codes };
}
function Match({ items, cat }) {
  const [m, setM] = useState(() => makeMatch(items, cat));
  const [p, setP] = useState(null);
  const [sc, setSc] = useState({ y: 0, n: 0 });
  const isTrue = (c) => c.every((v, i) => v === m.truth[i]);
  const choose = (ci) => {
    if (p !== null) return;
    const ok = isTrue(m.codes[ci]);
    m.left.forEach((x, i) => markGalti(x.id, ok || m.codes[ci][i] === m.truth[i]));
    setP(ci); setSc((s) => (ok ? { ...s, y: s.y + 1 } : { ...s, n: s.n + 1 }));
  };
  if (m.left.length < 4) return <div className="sk-done">Is chhaanti mein kaafi cheezein nahi.</div>;
  return (
    <div className="sk-quiz">
      <div className="sk-score"><span className="is-y">✓ {sc.y}</span><span className="is-n">✗ {sc.n}</span></div>
      <p className="sk-mh">List-I ko List-II se milao:</p>
      <div className="sk-lists">
        <table>
          <thead><tr><th colSpan={2}>List-I</th><th colSpan={2}>List-II</th></tr></thead>
          <tbody>
            {m.left.map((x, i) => (
              <tr key={x.id}>
                <td className="sk-l">{L[i]}.</td><td>{x.n}{x.t ? <small> {TICON[x.t]}</small> : null}</td>
                <td className="sk-l">{i + 1}.</td><td>{m.rightLabel(m.right[i])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="sk-opts is-codes">
        {m.codes.map((c, ci) => (
          <button key={ci} type="button" onClick={() => choose(ci)}
            className={p !== null ? (isTrue(c) ? "is-y" : p === ci ? "is-n" : "is-dim") : ""}>
            <b>({ci + 1})</b> {c.map((v, i) => `${L[i]}-${v + 1}`).join(", ")}
          </button>
        ))}
      </div>
      {p !== null && (
        <div className="sk-exp">
          <ul className="sk-pairs">
            {m.left.map((x, i) => (
              <li key={x.id} className={m.codes[p][i] === m.truth[i] ? "is-y" : "is-n"}>
                <b>{x.n}</b> → <b>{m.rightLabel(x.key)}</b>
                {x.note ? <small> — {x.note}</small> : null}
                {x.t && TRICKS[x.t]?.[x.key] && x.hook ? <span className="sk-mini">🧠 <TrickLine text={TRICKS[x.t][x.key]} hook={x.hook} /></span> : null}
              </li>
            ))}
          </ul>
          <button type="button" className="sk-go" onClick={() => { setM(makeMatch(items, cat)); setP(null); }}>Agla →</button>
        </div>
      )}
    </div>
  );
}

// ─── Apna jodo ───
function AddOwn({ onClose }) {
  const [mine, setMine] = useState(readMine);
  const blank = { st: "AS", t: "fd", n: "", note: "" };
  const [f, setF] = useState(blank);
  const save = () => {
    if (!f.n.trim()) return;
    const next = [{ ...f, n: f.n.trim(), note: f.note.trim(), id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}` }, ...mine];
    setMine(next); writeMine(next); setF({ ...blank, st: f.st, t: f.t });
  };
  const del = (id) => { const next = mine.filter((x) => x.id !== id); setMine(next); writeMine(next); };
  return (
    <div className="sk-add">
      <div className="sk-addf">
        <select value={f.st} onChange={(e) => setF({ ...f, st: e.target.value })}>{Object.entries(STATE_NAME).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <select value={f.t} onChange={(e) => setF({ ...f, t: e.target.value })}><option value="fd">🥁 Folk dance</option><option value="fs">🪔 Festival</option></select>
        <input value={f.n} onChange={(e) => setF({ ...f, n: e.target.value })} placeholder="Naam" />
        <input value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="Note (kaun, kyun, kis devta ke liye…)" />
        <button type="button" className="sk-go" onClick={save}>➕ Jodo</button>
        <button type="button" onClick={onClose}>Band</button>
      </div>
      {mine.length > 0 && (
        <ul>{mine.map((x) => <li key={x.id}>{TICON[x.t]} <b>{x.n}</b> — {sn(x.st)} {x.note ? <small>· {x.note}</small> : null}<button type="button" onClick={() => del(x.id)}>🗑️</button></li>)}</ul>
      )}
    </div>
  );
}

export default function Sanskriti() {
  const [mode, setMode] = useState("which");
  const [cat, setCat] = useState("mix");
  const [add, setAdd] = useState(false);
  const [rev, setRev] = useState(0);
  const items = useMemo(() => allItems(readMine()), [rev]); // eslint-disable-line react-hooks/exhaustive-deps
  const n = (t) => items.filter((x) => x.t === t).length;
  return (
    <section className="section sk">
      <header className="sk-head">
        <div>
          <h1>🪔 Bharat Sanskriti</h1>
          <p>Parmar Static se · 🥁 {n("fd")} folk · 🪔 {n("fs")} festival · 💃 {n("cd")} classical ({classicalQs().length} guru/baatein)</p>
        </div>
        <div className="sk-tabs">
          <button type="button" className={mode === "which" ? "is-on" : ""} onClick={() => setMode("which")}>❓ Kaun sa rajya?</button>
          <button type="button" className={mode === "match" ? "is-on" : ""} onClick={() => setMode("match")}>🔗 Match the following</button>
          <button type="button" className={add ? "is-on" : ""} onClick={() => setAdd(!add)}>➕ Apna jodo</button>
        </div>
      </header>
      {add && <AddOwn onClose={() => { setAdd(false); setRev((r) => r + 1); }} />}
      <div className="sk-cats">{CATS.map((c) => <button key={c.k} type="button" className={cat === c.k ? "is-on" : ""} onClick={() => setCat(c.k)}>{c.l}</button>)}</div>
      {mode === "which" ? <Which key={`${cat}|${rev}`} items={items} cat={cat} /> : <Match key={`${cat}|${rev}`} items={items} cat={cat} />}
      <details className="sk-facts">
        <summary>📌 Chhoti baatein jo paper mein aati hain</summary>
        <h4>💃 Classical</h4>
        <ul>{CLASSICAL_FACTS.map((f) => <li key={f}>{f}</li>)}</ul>
        <h4>🔀 Milte-julte naam</h4>
        <ul>{EXTRA.similar.map((f) => <li key={f}>{f}</li>)}</ul>
        <h4>⚔️ Martial art nritya</h4>
        <ul>{EXTRA.martial.map((r) => <li key={r[0]}><b>{r[0]}</b> — {r[1]}</li>)}</ul>
        <h4>🎆 Naya saal (rajya-wise)</h4>
        <ul>{EXTRA.newyear.map((r) => <li key={r[0]}><b>{r[0]}</b> — {r[1]} ({r[2]})</li>)}</ul>
        <h4>🪔 Desh-bhar ke tyohar</h4>
        <ul>{EXTRA.important.map((r) => <li key={r[0]}><b>{r[0]}</b> — {r[1]}</li>)}</ul>
      </details>
    </section>
  );
}
