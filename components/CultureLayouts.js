"use client";

// 🪔 Bharat Sanskriti ke 15 roop (/culture) — owner 🎨 dropdown se dekh kar
// chunega. Data lib/culture (28 rajya + 8 UT; classical / folk nritya,
// tyohar ka kyun-devta-mahina, janjati) + owner ke khud jode hue.
//
// Har quiz ki galti `cgl.culture.galti` mein — "Galti diary" wahi dohrata hai.

import { useEffect, useMemo, useState } from "react";
import { STATES, REGIONS, MONTHS, CLASSICAL, GODS, TLABEL, TICON, TILE, stateOf, readMine, writeMine } from "@/lib/culture";

export const CU_LAYOUTS = [
  { id: "1", name: "Bharat ka naksha — rajya chuno" },
  { id: "2", name: "Rajya ka ID card (ek-ek karke)" },
  { id: "3", name: "Classical nritya gallery" },
  { id: "4", name: "Classical ya Folk? chhaanto" },
  { id: "5", name: "Tyohar calendar (12 mahine)" },
  { id: "6", name: "Devta darbar — kis devta ke tyohar" },
  { id: "7", name: "Kahani + chhupe shabd" },
  { id: "8", name: "Ek naam, kai rajya (confusion)" },
  { id: "9", name: "Naksha quiz — sahi rajya dabao" },
  { id: "10", name: "Kaun sa rajya? (jawab ke saath samjhaana)" },
  { id: "11", name: "Kyun manate? Kis devta ka?" },
  { id: "12", name: "Kis mahine?" },
  { id: "13", name: "Bingo" },
  { id: "14", name: "Galti diary" },
  { id: "15", name: "Apna jodo / sudhaaro" },
];

const shuffle = (a) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const regC = (k) => (REGIONS.find((r) => r.k === k) || {}).c || "#94a3b8";
const sName = (k) => stateOf(k)?.n || k;

// ── galti diary ──
const GKEY = "cgl.culture.galti";
const readG = () => { try { return JSON.parse(localStorage.getItem(GKEY) || "{}") || {}; } catch { return {}; } };
function markG(id, ok) {
  try {
    const g = readG();
    if (ok) { if (g[id]) { g[id] -= 1; if (g[id] <= 0) delete g[id]; } } else g[id] = Math.min(3, (g[id] || 0) + 2);
    localStorage.setItem(GKEY, JSON.stringify(g));
  } catch { /* quota */ }
}

// ── chhaanti ki chips ──
function TypeChips({ value, onChange, allow = ["cd", "fd", "fs", "tr"] }) {
  return (
    <div className="cux-chips">
      <button type="button" className={value === "all" ? "is-on" : ""} onClick={() => onChange("all")}>Sab</button>
      {allow.map((t) => <button key={t} type="button" className={value === t ? "is-on" : ""} onClick={() => onChange(t)}>{TICON[t]} {TLABEL[t]}</button>)}
    </div>
  );
}
const Tag = ({ t }) => <span className={`cux-tag is-${t}`}>{TICON[t]} {TLABEL[t]}</span>;
const Why = ({ it }) => (it.t === "fs"
  ? <span className="cux-why">{it.why ? <>📖 {it.why}</> : null}{it.god && it.god !== "—" ? <> · 🙏 <b>{it.god}</b></> : null}{it.m ? <> · 📅 {MONTHS[it.m]}</> : null}</span>
  : it.note ? <span className="cux-why">{it.note}</span> : null);

// ── ek rajya ka poora panna ──
function StateSheet({ s, items }) {
  const mine = items.filter((x) => x.st === s.k && x.mine);
  const block = (t, rows) => (rows.length ? (
    <section className={`cus-b is-${t}`}>
      <h4>{TICON[t]} {TLABEL[t]} <small>{rows.length}</small></h4>
      <ul>{rows.map((r, i) => <li key={i}><b>{r.n}</b>{r.mine && <em className="cux-mine">apna</em>}<Why it={r} /></li>)}</ul>
    </section>
  ) : null);
  const conv = (t, arr) => arr.map((a) => (t === "fs" ? { t, n: a[0], why: a[1], god: a[2], m: a[3] } : { t, n: a[0], note: a[1] }));
  return (
    <div className="cus" style={{ "--rc": regC(s.reg) }}>
      <header><h3>{s.n}{s.ut ? <small> UT</small> : null}</h3><span>🏛️ {s.cap}</span></header>
      {s.trick && <p className="cus-trick">💡 {s.trick}</p>}
      {block("cd", [...conv("cd", s.cd), ...mine.filter((x) => x.t === "cd")])}
      {block("fd", [...conv("fd", s.fd), ...mine.filter((x) => x.t === "fd")])}
      {block("fs", [...conv("fs", s.fs), ...mine.filter((x) => x.t === "fs")])}
      {block("tr", [...conv("tr", s.tr), ...mine.filter((x) => x.t === "tr")])}
      {s.facts?.length ? <section className="cus-b is-facts"><h4>⭐ SSC facts</h4><ul>{s.facts.map((f, i) => <li key={i}>{f}</li>)}</ul></section> : null}
    </div>
  );
}

// ── tile naksha ──
function TileMap({ sel, onPick, mark = {}, label = (k) => k }) {
  return (
    <div className="cum">
      {STATES.map((s) => {
        const [c, r, w] = TILE[s.k];
        return (
          <button key={s.k} type="button" title={s.n} onClick={() => onPick(s.k)}
            className={`cum-t${sel === s.k ? " is-sel" : ""}${mark[s.k] ? ` is-${mark[s.k]}` : ""}${s.ut ? " is-ut" : ""}`}
            style={{ gridColumn: `${c + 1} / span ${w}`, gridRow: r + 1, "--rc": regC(s.reg) }}>
            <b>{label(s.k)}</b><small>{s.n.length > 14 ? s.n.split(" ")[0] : s.n}</small>
          </button>
        );
      })}
    </div>
  );
}

// ─── 1 · Naksha ───
function MapExplore({ items }) {
  const [sel, setSel] = useState("AS");
  const s = stateOf(sel);
  return (
    <div className="cu1">
      <div>
        <TileMap sel={sel} onPick={setSel} />
        <div className="cux-legend">{REGIONS.map((r) => <span key={r.k}><i style={{ background: r.c }} />{r.l}</span>)}</div>
      </div>
      <StateSheet s={s} items={items} />
    </div>
  );
}

// ─── 2 · ID card ───
function IdCard({ items }) {
  const [reg, setReg] = useState("all");
  const list = STATES.filter((s) => reg === "all" || s.reg === reg);
  const [i, setI] = useState(0);
  const s = list[Math.min(i, list.length - 1)];
  useEffect(() => {
    const f = (e) => { if (e.key === "ArrowRight") setI((x) => (x + 1) % list.length); if (e.key === "ArrowLeft") setI((x) => (x - 1 + list.length) % list.length); };
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, [list.length]);
  return (
    <div className="cu2">
      <div className="cux-chips">
        <button type="button" className={reg === "all" ? "is-on" : ""} onClick={() => { setReg("all"); setI(0); }}>Sab</button>
        {REGIONS.map((r) => <button key={r.k} type="button" className={reg === r.k ? "is-on" : ""} onClick={() => { setReg(r.k); setI(0); }} style={{ "--rc": r.c }}>{r.l}</button>)}
      </div>
      <div className="cu2-nav">
        <button type="button" onClick={() => setI((x) => (x - 1 + list.length) % list.length)}>←</button>
        <span>{i + 1} / {list.length}</span>
        <button type="button" onClick={() => setI((x) => (x + 1) % list.length)}>→</button>
      </div>
      <div className="cu2-card" key={s.k}><div className="cu2-strip" style={{ background: regC(s.reg) }}><b>{s.k}</b><span>{REGIONS.find((r) => r.k === s.reg)?.l}</span></div><StateSheet s={s} items={items} /></div>
    </div>
  );
}

// ─── 3 · Classical gallery ───
function Classical() {
  const [quiz, setQuiz] = useState(false);
  const [q, setQ] = useState(null);
  const [pickd, setPickd] = useState(null);
  const make = () => {
    const c = pick(CLASSICAL);
    const kind = pick(["st", "guru", "feat"]);
    const opts = shuffle([c, ...shuffle(CLASSICAL.filter((x) => x.n !== c.n)).slice(0, 3)]);
    return { c, kind, opts };
  };
  useEffect(() => { if (quiz) { setQ(make()); setPickd(null); } }, [quiz]);
  return (
    <div className="cu3">
      <div className="cux-chips"><button type="button" className={!quiz ? "is-on" : ""} onClick={() => setQuiz(false)}>📖 Padho</button><button type="button" className={quiz ? "is-on" : ""} onClick={() => setQuiz(true)}>❓ Quiz</button></div>
      {!quiz ? (
        <div className="cu3-grid">
          {CLASSICAL.map((c, i) => (
            <article key={c.n} style={{ "--rc": regC(stateOf(c.st).reg) }}>
              <span className="cu3-n">{i + 1}</span>
              <h3>{c.n}</h3>
              <p className="cu3-st">📍 {sName(c.st)}</p>
              <p><b>Kahan se:</b> {c.from}</p>
              <p><b>Pehchaan:</b> {c.feat}</p>
              <p><b>Guru / kalakar:</b> {c.guru}</p>
            </article>
          ))}
          <p className="cux-dim">Sangeet Natak Akademi — 8 classical; Sanskriti Mantralaya Chhau ko bhi (9). Kerala ke do: Kathakali + Mohiniyattam.</p>
        </div>
      ) : q && (
        <div className="cux-quiz">
          <p className="cux-q">
            {q.kind === "st" ? <>Is rajya ka classical nritya kaun sa? <b>{sName(q.c.st)}</b>{q.c.st === "KL" ? " (ek chuno)" : ""}</> : q.kind === "guru" ? <>Ye kalakar kis nritya ke? <b>{q.c.guru.split(",")[0]}</b></> : <>Kis nritya ki pehchaan: <b>{q.c.feat.split(",")[0]}</b></>}
          </p>
          <div className="cux-opts">
            {q.opts.map((o) => {
              const ok = q.kind === "st" ? o.st === q.c.st : o.n === q.c.n;
              return <button key={o.n} type="button" className={pickd ? (ok ? "is-y" : pickd === o.n ? "is-n" : "") : ""} onClick={() => !pickd && setPickd(o.n)}>{o.n}</button>;
            })}
          </div>
          {pickd && <><p className="cux-exp">{q.c.n} — {sName(q.c.st)} · {q.c.feat}</p><button type="button" className="cux-go" onClick={() => { setQ(make()); setPickd(null); }}>Agla →</button></>}
        </div>
      )}
    </div>
  );
}

// ─── 4 · Classical ya Folk ───
function SortCF({ items }) {
  const pool = useMemo(() => shuffle(items.filter((x) => x.t === "cd" || x.t === "fd")), [items]);
  const [i, setI] = useState(0);
  const [fb, setFb] = useState(null);
  const [sc, setSc] = useState({ y: 0, n: 0 });
  const it = pool[i % pool.length];
  const ans = (t) => {
    if (fb) return;
    const ok = t === it.t;
    markG(it.id, ok);
    setFb(ok ? "y" : "n"); setSc((s) => (ok ? { ...s, y: s.y + 1 } : { ...s, n: s.n + 1 }));
    setTimeout(() => { setFb(null); setI((x) => x + 1); }, ok ? 700 : 1800);
  };
  if (!it) return null;
  return (
    <div className="cu4">
      <div className="cux-score">✓ {sc.y} · ✗ {sc.n}</div>
      <div className={`cu4-card${fb ? ` is-${fb}` : ""}`}>
        <h2>{it.n}</h2>
        {fb && <p>{sName(it.st)} · {TLABEL[it.t]}{it.note ? ` — ${it.note}` : ""}</p>}
      </div>
      <div className="cu4-bins">
        <button type="button" className="is-c" onClick={() => ans("cd")}>💃 Classical<small>Sangeet Natak Akademi ke 8 (+ Chhau)</small></button>
        <button type="button" className="is-f" onClick={() => ans("fd")}>🥁 Folk (lok)<small>baaki sab</small></button>
      </div>
      <p className="cux-dim">SSC mein aksar: "In mein se kaun classical NAHI hai?" — isi ki practice.</p>
    </div>
  );
}

// ─── 5 · Tyohar calendar ───
function Calendar({ items }) {
  const [m, setM] = useState(new Date().getMonth() + 1);
  const fs = items.filter((x) => x.t === "fs");
  const cnt = (k) => fs.filter((x) => x.m === k).length;
  const list = fs.filter((x) => x.m === m);
  return (
    <div className="cu5">
      <div className="cu5-months">
        {MONTHS.slice(1).map((l, i) => (
          <button key={l} type="button" className={m === i + 1 ? "is-on" : ""} onClick={() => setM(i + 1)}><b>{l}</b><small>{cnt(i + 1)}</small></button>
        ))}
        <button type="button" className={m === 0 ? "is-on" : ""} onClick={() => setM(0)}><b>Alag</b><small>{cnt(0)}</small></button>
      </div>
      <div className="cu5-list">
        {list.map((x) => (
          <div key={x.id} className="cu5-f" style={{ "--rc": regC(stateOf(x.st).reg) }}>
            <b>{x.n}</b><span className="cu5-st">{sName(x.st)}</span><Why it={{ ...x, m: 0 }} />
          </div>
        ))}
        {!list.length && <p className="cux-dim">Is mahine kuch nahi likha.</p>}
      </div>
    </div>
  );
}

// ─── 6 · Devta darbar ───
function Gods({ items }) {
  const fs = items.filter((x) => x.t === "fs");
  const [g, setG] = useState("shiva");
  const list = fs.filter((x) => x.gk === g);
  return (
    <div className="cu6">
      <div className="cu6-gods">
        {GODS.map((x) => <button key={x.k} type="button" className={g === x.k ? "is-on" : ""} onClick={() => setG(x.k)}>{x.l}<small>{fs.filter((f) => f.gk === x.k).length}</small></button>)}
        <button type="button" className={g === "none" ? "is-on" : ""} onClick={() => setG("none")}>🎉 Koi devta nahi (naya saal / sanskriti)<small>{fs.filter((f) => f.gk === "none").length}</small></button>
      </div>
      <div className="cu6-list">
        {list.map((x) => (
          <div key={x.id} className="cu6-f"><b>{x.n}</b> <span>— {sName(x.st)}</span><p>🙏 {x.god} {x.why ? <>· {x.why}</> : null}</p></div>
        ))}
      </div>
    </div>
  );
}

// ─── 7 · Kahani + chhupe shabd ───
function Story({ items }) {
  const [k, setK] = useState(STATES[0].k);
  const [open, setOpen] = useState({});
  const s = stateOf(k);
  const mine = items.filter((x) => x.st === k);
  const lines = [
    ...s.cd.map(([n]) => ["💃 classical", n]),
    ...s.fd.slice(0, 6).map(([n]) => ["🥁 folk", n]),
    ...s.fs.slice(0, 6).map(([n, , g]) => ["🪔 tyohar", n, g]),
    ...s.tr.filter(([n]) => !n.startsWith("—")).slice(0, 5).map(([n]) => ["🏹 janjati", n]),
    ...mine.filter((x) => x.mine).map((x) => [TICON[x.t], x.n]),
  ];
  const all = Object.keys(open).length === lines.length;
  return (
    <div className="cu7">
      <select value={k} onChange={(e) => { setK(e.target.value); setOpen({}); }}>{STATES.map((x) => <option key={x.k} value={x.k}>{x.n}</option>)}</select>
      <div className="cu7-story">
        <p className="cu7-hook">💡 {s.trick}</p>
        <p className="cux-dim">Pehle khud bolo — phir dabbe par tap karke dekho.</p>
        <ul>
          {lines.map((l, i) => (
            <li key={i}><span>{l[0]}</span><button type="button" className={open[i] ? "is-open" : ""} onClick={() => setOpen((o) => ({ ...o, [i]: true }))}>{open[i] ? l[1] : "? ? ?"}</button>{l[2] && open[i] && l[2] !== "—" ? <em>🙏 {l[2]}</em> : null}</li>
          ))}
        </ul>
        <button type="button" className="cux-go" onClick={() => setOpen(all ? {} : Object.fromEntries(lines.map((_, i) => [i, true])))}>{all ? "↺ Sab chhupao" : "Sab dikhao"}</button>
      </div>
    </div>
  );
}

// ─── 8 · Ek naam kai rajya ───
const base = (n) => n.toLowerCase().replace(/\(.*?\)/g, "").replace(/[^a-z ]/g, "").trim().split(" ")[0];
function Confusion({ items }) {
  const groups = useMemo(() => {
    const g = new Map();
    for (const x of items) { const b = base(x.n); if (b.length < 3) continue; if (!g.has(b)) g.set(b, []); g.get(b).push(x); }
    return [...g.values()].filter((l) => new Set(l.map((x) => x.st)).size > 1).sort((a, b) => b.length - a.length);
  }, [items]);
  return (
    <div className="cu8">
      <p className="cux-dim">Ye naam ek se zyada rajya mein hain — SSC yahin phansata hai. Farak yaad rakho:</p>
      <div className="cu8-grid">
        {groups.map((l) => (
          <article key={l[0].id}>
            <h3>{l[0].n.split(" (")[0]}</h3>
            <ul>{l.map((x) => <li key={x.id}><b style={{ color: regC(stateOf(x.st).reg) }}>{sName(x.st)}</b> <Tag t={x.t} /> <span>{x.n !== l[0].n ? x.n : ""} {x.note || x.why || ""}</span></li>)}</ul>
          </article>
        ))}
      </div>
    </div>
  );
}

// ─── 9 · Naksha quiz ───
function MapQuiz({ items }) {
  const [type, setType] = useState("all");
  const pool = items.filter((x) => type === "all" || x.t === type);
  const [it, setIt] = useState(() => pick(pool));
  const [mark, setMark] = useState({});
  const [sc, setSc] = useState({ y: 0, n: 0 });
  useEffect(() => { setIt(pick(pool)); setMark({}); }, [type]); // eslint-disable-line react-hooks/exhaustive-deps
  const tap = (k) => {
    if (!it || mark[it.st] === "y") return;
    const ok = k === it.st;
    if (!Object.keys(mark).length) { markG(it.id, ok); setSc((s) => (ok ? { ...s, y: s.y + 1 } : { ...s, n: s.n + 1 })); }
    setMark((m) => ({ ...m, [k]: ok ? "y" : "n", ...(ok ? {} : {}) }));
    if (ok) setTimeout(() => { setIt(pick(pool)); setMark({}); }, 900);
  };
  if (!it) return null;
  return (
    <div className="cu9">
      <TypeChips value={type} onChange={setType} />
      <div className="cu9-q"><Tag t={it.t} /><h2>{it.n}</h2><span>✓ {sc.y} · ✗ {sc.n}</span></div>
      <TileMap onPick={tap} mark={mark} />
      {mark[it.st] === "y" && <p className="cux-exp">{sName(it.st)} <Why it={it} /></p>}
    </div>
  );
}

// ─── 10 · Kaun sa rajya ───
function WhichState({ items }) {
  const [type, setType] = useState("all");
  const pool = items.filter((x) => type === "all" || x.t === type);
  const make = () => {
    const it = pick(pool);
    const s = stateOf(it.st);
    const near = shuffle(STATES.filter((x) => x.k !== it.st && x.reg === s.reg)).slice(0, 2);
    const far = shuffle(STATES.filter((x) => x.k !== it.st && !near.includes(x))).slice(0, 3 - near.length);
    return { it, opts: shuffle([s, ...near, ...far]) };
  };
  const [q, setQ] = useState(make);
  const [p, setP] = useState(null);
  const [sc, setSc] = useState({ y: 0, n: 0 });
  useEffect(() => { setQ(make()); setP(null); }, [type]); // eslint-disable-line react-hooks/exhaustive-deps
  const choose = (k) => { if (p) return; const ok = k === q.it.st; markG(q.it.id, ok); setP(k); setSc((s) => (ok ? { ...s, y: s.y + 1 } : { ...s, n: s.n + 1 })); };
  return (
    <div className="cux-quiz">
      <TypeChips value={type} onChange={setType} />
      <div className="cux-score">✓ {sc.y} · ✗ {sc.n}</div>
      <p className="cux-q"><Tag t={q.it.t} /> <b>{q.it.n}</b> — kis rajya / UT ka?</p>
      <div className="cux-opts">{q.opts.map((o) => <button key={o.k} type="button" className={p ? (o.k === q.it.st ? "is-y" : p === o.k ? "is-n" : "") : ""} onClick={() => choose(o.k)}>{o.n}</button>)}</div>
      {p && (
        <div className="cux-exp">
          <b>{q.it.n} = {sName(q.it.st)}</b> <Why it={q.it} />
          <p>💡 {stateOf(q.it.st).trick}</p>
          <button type="button" className="cux-go" onClick={() => { setQ(make()); setP(null); }}>Agla →</button>
        </div>
      )}
    </div>
  );
}

// ─── 11 · Kyun / kis devta ───
function WhyGod({ items }) {
  const fs = items.filter((x) => x.t === "fs" && x.why);
  const make = () => {
    const kind = Math.random() < 0.5 ? "god" : "why";
    const pool = kind === "god" ? fs.filter((x) => x.god && x.god !== "—" && !x.god.startsWith("—")) : fs;
    const it = pick(pool);
    const val = (x) => (kind === "god" ? x.god : x.why);
    const others = shuffle(pool.filter((x) => val(x) !== val(it))).slice(0, 3);
    return { it, kind, opts: shuffle([it, ...others]), val };
  };
  const [q, setQ] = useState(make);
  const [p, setP] = useState(null);
  const [sc, setSc] = useState({ y: 0, n: 0 });
  const choose = (o) => { if (p) return; const ok = o.id === q.it.id; markG(q.it.id, ok); setP(o.id); setSc((s) => (ok ? { ...s, y: s.y + 1 } : { ...s, n: s.n + 1 })); };
  return (
    <div className="cux-quiz">
      <div className="cux-score">✓ {sc.y} · ✗ {sc.n}</div>
      <p className="cux-q">🪔 <b>{q.it.n}</b> ({sName(q.it.st)}) — {q.kind === "god" ? "kis devta / kiske liye?" : "kyun manaya jata hai?"}</p>
      <div className="cux-opts is-long">{q.opts.map((o) => <button key={o.id} type="button" className={p ? (o.id === q.it.id ? "is-y" : p === o.id ? "is-n" : "") : ""} onClick={() => choose(o)}>{q.val(o)}</button>)}</div>
      {p && <div className="cux-exp"><Why it={q.it} /><button type="button" className="cux-go" onClick={() => { setQ(make()); setP(null); }}>Agla →</button></div>}
    </div>
  );
}

// ─── 12 · Kis mahine ───
function MonthQuiz({ items }) {
  const fs = items.filter((x) => x.t === "fs" && x.m);
  const [it, setIt] = useState(() => pick(fs));
  const [p, setP] = useState(null);
  const [sc, setSc] = useState({ y: 0, n: 0 });
  const near = (a, b) => Math.min(Math.abs(a - b), 12 - Math.abs(a - b)) <= 1;
  const choose = (m) => { if (p) return; const ok = near(m, it.m); markG(it.id, ok); setP(m); setSc((s) => (ok ? { ...s, y: s.y + 1 } : { ...s, n: s.n + 1 })); };
  return (
    <div className="cux-quiz">
      <div className="cux-score">✓ {sc.y} · ✗ {sc.n}</div>
      <p className="cux-q">🪔 <b>{it.n}</b> ({sName(it.st)}) — lagbhag kis mahine? <small>(±1 mahina chalega)</small></p>
      <div className="cu12-m">{MONTHS.slice(1).map((l, i) => <button key={l} type="button" className={p ? (i + 1 === it.m ? "is-y" : p === i + 1 ? (near(p, it.m) ? "is-y" : "is-n") : "") : ""} onClick={() => choose(i + 1)}>{l}</button>)}</div>
      {p && <div className="cux-exp"><b>{MONTHS[it.m]}</b> <Why it={{ ...it, m: 0 }} /><button type="button" className="cux-go" onClick={() => { setIt(pick(fs)); setP(null); }}>Agla →</button></div>}
    </div>
  );
}

// ─── 13 · Bingo ───
const LINES = (() => { const L = []; for (let r = 0; r < 4; r++) L.push([0, 1, 2, 3].map((c) => r * 4 + c)); for (let c = 0; c < 4; c++) L.push([0, 1, 2, 3].map((r) => r * 4 + c)); L.push([0, 5, 10, 15], [3, 6, 9, 12]); return L; })();
function Bingo({ items }) {
  const [round, setRound] = useState(0);
  const board = useMemo(() => shuffle(STATES).slice(0, 16), [round]);
  const pool = useMemo(() => items.filter((x) => board.some((b) => b.k === x.st)), [items, board]);
  const [it, setIt] = useState(null);
  const [hit, setHit] = useState([]);
  const [bad, setBad] = useState(null);
  const [calls, setCalls] = useState(0);
  const next = (h = hit) => { const left = pool.filter((x) => !h.includes(x.st)); setIt(left.length ? pick(left) : null); setCalls((c) => c + 1); };
  useEffect(() => { setHit([]); setCalls(0); next([]); }, [board]); // eslint-disable-line react-hooks/exhaustive-deps
  const bingo = LINES.some((l) => l.every((i) => hit.includes(board[i].k)));
  const tap = (k) => {
    if (!it || bingo) return;
    if (k === it.st) { markG(it.id, true); const h = [...hit, k]; setHit(h); next(h); }
    else { markG(it.id, false); setBad(k); setTimeout(() => setBad(null), 500); }
  };
  return (
    <div className="cu13">
      {!bingo && it ? <div className="cu13-call"><Tag t={it.t} /><h2>{it.n}</h2><small>Call #{calls}</small></div> : <div className="cu13-call is-win"><h2>🎉 BINGO!</h2><small>{calls} call mein</small></div>}
      <div className="cu13-board">
        {board.map((s) => <button key={s.k} type="button" className={`${hit.includes(s.k) ? "is-hit" : ""}${bad === s.k ? " is-bad" : ""}`} onClick={() => tap(s.k)}>{s.n}</button>)}
      </div>
      <button type="button" className="cux-go" onClick={() => setRound((r) => r + 1)}>🔀 Naya board</button>
      <p className="cux-dim">Jo cheez bulai gayi, uska rajya board par dabao. Seedhi / tirchi line = Bingo.</p>
    </div>
  );
}

// ─── 14 · Galti diary ───
function Diary({ items }) {
  const [g, setG] = useState(readG);
  const list = items.filter((x) => g[x.id]);
  const [q, setQ] = useState(null);
  const [p, setP] = useState(null);
  const make = (l = list) => {
    if (!l.length) return null;
    const it = pick(l);
    const s = stateOf(it.st);
    return { it, opts: shuffle([s, ...shuffle(STATES.filter((x) => x.k !== s.k)).slice(0, 3)]) };
  };
  useEffect(() => { setQ(make()); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const choose = (k) => { if (p) return; markG(q.it.id, k === q.it.st); setP(k); };
  const nxt = () => { const ng = readG(); setG(ng); const l = items.filter((x) => ng[x.id]); setQ(make(l)); setP(null); };
  return (
    <div className="cu14">
      <p className="cux-dim">Har quiz ki galti yahan aati hai. Ek galti = 2 baar sahi karna padega, tab diary se hategi. Abhi <b>{list.length}</b> baaki.</p>
      {q ? (
        <div className="cux-quiz">
          <p className="cux-q"><Tag t={q.it.t} /> <b>{q.it.n}</b> <small>({"●".repeat(g[q.it.id] || 1)} baaki)</small></p>
          <div className="cux-opts">{q.opts.map((o) => <button key={o.k} type="button" className={p ? (o.k === q.it.st ? "is-y" : p === o.k ? "is-n" : "") : ""} onClick={() => choose(o.k)}>{o.n}</button>)}</div>
          {p && <div className="cux-exp"><b>{sName(q.it.st)}</b> <Why it={q.it} /><button type="button" className="cux-go" onClick={nxt}>Agla →</button></div>}
        </div>
      ) : <div className="cux-done">🎉 Diary khaali — koi galti baaki nahi. Kisi quiz (9–13) se shuru karo.</div>}
      {list.length > 0 && (
        <details className="cu14-all"><summary>Saari galtiyan ({list.length})</summary><ul>{list.map((x) => <li key={x.id}><b>{x.n}</b> — {sName(x.st)} <Tag t={x.t} /></li>)}</ul></details>
      )}
    </div>
  );
}

// ─── 15 · Apna jodo ───
function AddOwn() {
  const [mine, setMine] = useState(readMine);
  const blank = { st: "AS", t: "fd", n: "", note: "", why: "", god: "", m: "" };
  const [f, setF] = useState(blank);
  const [edit, setEdit] = useState(null);
  const save = () => {
    if (!f.n.trim()) return;
    const rec = { ...f, n: f.n.trim(), id: edit || `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}` };
    const next = edit ? mine.map((x) => (x.id === edit ? rec : x)) : [rec, ...mine];
    setMine(next); writeMine(next); setF({ ...blank, st: f.st, t: f.t }); setEdit(null);
  };
  const del = (id) => { const next = mine.filter((x) => x.id !== id); setMine(next); writeMine(next); };
  return (
    <div className="cu15">
      <div className="cu15-form">
        <h3>{edit ? "✏️ Badlo" : "➕ Naya jodo"}</h3>
        <label>Rajya / UT<select value={f.st} onChange={(e) => setF({ ...f, st: e.target.value })}>{STATES.map((s) => <option key={s.k} value={s.k}>{s.n}</option>)}</select></label>
        <label>Kya hai<select value={f.t} onChange={(e) => setF({ ...f, t: e.target.value })}>{Object.keys(TLABEL).map((t) => <option key={t} value={t}>{TICON[t]} {TLABEL[t]}</option>)}</select></label>
        <label>Naam<input value={f.n} onChange={(e) => setF({ ...f, n: e.target.value })} placeholder="jaise Bagurumba" /></label>
        {f.t === "fs" ? (
          <>
            <label>Kyun manate?<input value={f.why} onChange={(e) => setF({ ...f, why: e.target.value })} placeholder="fasal ke baad dhanyavaad…" /></label>
            <label>Kis devta ke liye?<input value={f.god} onChange={(e) => setF({ ...f, god: e.target.value })} placeholder="Shiva / — (koi nahi)" /></label>
            <label>Mahina<select value={f.m} onChange={(e) => setF({ ...f, m: e.target.value })}><option value="">—</option>{MONTHS.slice(1).map((l, i) => <option key={l} value={i + 1}>{l}</option>)}</select></label>
          </>
        ) : <label>Note (yaad rakhne layak)<input value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="kaun karta, kab, kyun…" /></label>}
        <div className="cu15-btns"><button type="button" className="cux-go" onClick={save}>{edit ? "💾 Save" : "➕ Jodo"}</button>{edit && <button type="button" onClick={() => { setEdit(null); setF(blank); }}>Radd</button>}</div>
        <p className="cux-dim">Jo jodoge wo naksha, ID card, calendar, devta darbar aur saare quiz mein apne aap aayega. Tumhare account mein save hota hai.</p>
      </div>
      <div className="cu15-list">
        <h3>Tumhare jode hue ({mine.length})</h3>
        {mine.map((x) => (
          <div key={x.id}><Tag t={x.t} /><b>{x.n}</b> <span>— {sName(x.st)}</span>{x.t === "fs" ? <small>{x.why} {x.god ? `· ${x.god}` : ""} {x.m ? `· ${MONTHS[x.m]}` : ""}</small> : x.note ? <small>{x.note}</small> : null}
            <span className="cu15-act"><button type="button" onClick={() => { setEdit(x.id); setF({ ...blank, ...x }); }}>✏️</button><button type="button" onClick={() => del(x.id)}>🗑️</button></span>
          </div>
        ))}
        {!mine.length && <p className="cux-dim">Abhi kuch nahi jodha. Koi dance / tyohar / janjati chhoot gayi ho to baayen se jodo.</p>}
      </div>
    </div>
  );
}

const COMP = { 1: MapExplore, 2: IdCard, 3: Classical, 4: SortCF, 5: Calendar, 6: Gods, 7: Story, 8: Confusion, 9: MapQuiz, 10: WhichState, 11: WhyGod, 12: MonthQuiz, 13: Bingo, 14: Diary, 15: AddOwn };

export default function CultureLayouts({ lay, items }) {
  const C = COMP[lay];
  if (!C) return null;
  return <div className={`cux cux--${lay}`}><C key={lay} items={items} /></div>;
}
