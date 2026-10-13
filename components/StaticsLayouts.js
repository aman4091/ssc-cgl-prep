"use client";

// 🪔 Statics (festival / tribe / dance …) yaad karne ke 20 roop — /statics page.
// Data wahi jo upar menu ke 🪔 se save hota hai (components/StaticsInfo,
// cgl.statics.info); har jawab ke hisse lib/staticsparse nikalta hai.

import { useEffect, useMemo, useState } from "react";
import Markdown from "./Markdown";
import { removeInfo } from "./StaticsInfo";
import { FIELD_LABEL, plain, firstLine, MONTH_NAMES } from "@/lib/staticsparse";
import "./statics.css";

export const ST_LAYOUTS = [
  { id: "1", name: "📖 Ek-ek padho" },
  { id: "2", name: "🗺️ Rajya ke hisaab se" },
  { id: "3", name: "🃏 Flashcard — naam → rajya" },
  { id: "4", name: "🔄 Ulta — pehchano kaun" },
  { id: "5", name: "🎯 MCQ — kis rajya ka?" },
  { id: "6", name: "🧩 Jodi milao" },
  { id: "7", name: "⚡ Sirf trick" },
  { id: "8", name: "📅 Mahine ke hisaab se" },
  { id: "9", name: "🏷️ Type ke hisaab se" },
  { id: "10", name: "📋 Table" },
  { id: "11", name: "✅ Sach ya Jhooth" },
  { id: "12", name: "🔍 Khoj" },
  { id: "13", name: "🙈 Cover method" },
  { id: "14", name: "⏱️ Speed 5 second" },
  { id: "15", name: "📦 Leitner dabbe" },
  { id: "16", name: "⚠️ Confusion wale" },
  { id: "17", name: "📝 SSC mein kaise aata hai" },
  { id: "18", name: "🎲 Random ek" },
  { id: "19", name: "🧾 Ek line revision" },
  { id: "20", name: "🗂️ Hissa-hissa kholo" },
];

const shuffle = (a) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const readJ = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k) || "null"); return v ?? d; } catch { return d; } };
const writeJ = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* quota */ } };
const Empty = ({ children }) => <div className="placeholder">{children}</div>;
function Nav({ i, n, go }) {
  return <div className="st-nav"><button type="button" onClick={() => go(-1)}>←</button><span>{i + 1} / {n}</span><button type="button" onClick={() => go(1)}>→</button></div>;
}
function useArrows(go) {
  useEffect(() => {
    const k = (e) => { if (e.target && /input|textarea|select/i.test(e.target.tagName)) return; if (e.key === "ArrowRight") go(1); else if (e.key === "ArrowLeft") go(-1); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  });
}
// Rajya ke alawa doosre rajya — MCQ / sach-jhooth ke galat option.
const otherStates = (it, items, n) => shuffle([...new Set(items.map((x) => x.state).filter((s) => s && s !== "—" && s !== it.state))]).slice(0, n);
const trickOf = (it) => firstLine(it.f.trick, 140);

// 1 · Ek-ek padho
function OneByOne({ items }) {
  const [i, setI] = useState(0);
  const n = items.length;
  const go = (d) => setI((x) => (x + d + n) % n);
  useArrows(go);
  const it = items[Math.min(i, n - 1)];
  return (
    <div className="st1">
      <div className="st-card">
        <div className="st-card__hd"><b>🪔 {it.term}</b><span className="st-tag">{it.type}</span><span className="st-tag">📍 {it.state}</span>
          <button type="button" className="st-del" title="Hatao" onClick={() => { if (window.confirm(`"${it.term}" hata dein?`)) removeInfo(it.id); }}>🗑️</button></div>
        <div className="st-body"><Markdown>{it.text}</Markdown></div>
      </div>
      <Nav i={Math.min(i, n - 1)} n={n} go={go} />
    </div>
  );
}

// 2 / 8 / 9 · jhund
function Groups({ items, keyOf, order }) {
  const groups = useMemo(() => {
    const m = new Map();
    for (const it of items) { const k = keyOf(it); if (!m.has(k)) m.set(k, []); m.get(k).push(it); }
    const g = [...m.entries()];
    return order ? g.sort(order) : g.sort((a, b) => b[1].length - a[1].length);
  }, [items, keyOf, order]);
  const [open, setOpen] = useState(null);
  return (
    <div className="st2">
      {groups.map(([k, list]) => (
        <section key={k} className="st2-g">
          <h3>{k} <span>{list.length}</span></h3>
          <div className="st2-chips">{list.map((it) => <button key={it.id} type="button" className={open === it.id ? "is-on" : ""} onClick={() => setOpen(open === it.id ? null : it.id)}>{it.term}</button>)}</div>
          {list.some((x) => x.id === open) ? <Detail it={list.find((x) => x.id === open)} /> : null}
        </section>
      ))}
    </div>
  );
}
function Detail({ it }) {
  return (
    <div className="st-detail">
      <p><b>{it.term}</b> — {firstLine(it.f.kya, 160)}</p>
      <p>📍 {it.state}{it.f.kab ? ` · 📅 ${firstLine(it.f.kab, 60)}` : ""}{it.f.god ? ` · 🛕 ${firstLine(it.f.god, 50)}` : ""}</p>
      {trickOf(it) ? <p className="st-trick">⚡ {trickOf(it)}</p> : null}
    </div>
  );
}

// 3 · Flashcard
function Flash({ items }) {
  const [order] = useState(() => shuffle(items));
  const [i, setI] = useState(0);
  const [f, setF] = useState(false);
  const n = order.length;
  const go = (d) => { setI((x) => (x + d + n) % n); setF(false); };
  useArrows(go);
  const it = order[i % n];
  return (
    <div className="st3">
      <div className={`st3-card${f ? " is-f" : ""}`} onClick={() => setF(!f)}>
        {!f ? <><small>dabao → jawab</small><h2>🪔 {it.term}</h2></> : <><h2>📍 {it.state}</h2><p>{firstLine(it.f.kya, 160)}</p>{it.f.kab ? <p>📅 {firstLine(it.f.kab, 80)}</p> : null}{trickOf(it) ? <p className="st-trick">⚡ {trickOf(it)}</p> : null}</>}
      </div>
      <Nav i={i % n} n={n} go={go} />
    </div>
  );
}

// 4 · Ulta
function Reverse({ items }) {
  const [order] = useState(() => shuffle(items));
  const [i, setI] = useState(0);
  const [show, setShow] = useState(false);
  const n = order.length;
  const go = (d) => { setI((x) => (x + d + n) % n); setShow(false); };
  useArrows(go);
  const it = order[i % n];
  return (
    <div className="st4">
      <div className="st-card st4-clue">
        <p className="st-tag">{it.type} · 📍 {it.state}</p>
        <p>{firstLine(it.f.kya, 200).replace(new RegExp(it.term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "ig"), "_____")}</p>
        {it.f.kab ? <p>📅 {firstLine(it.f.kab, 80)}</p> : null}
        <p className="st-q">Ye kya hai? Naam bolo…</p>
      </div>
      {show ? <h2 className="st-ans">🪔 {it.term}</h2> : <button type="button" className="st-go" onClick={() => setShow(true)}>👁️ Naam dikhao</button>}
      <Nav i={i % n} n={n} go={go} />
    </div>
  );
}

// 5 · MCQ
function Mcq({ items }) {
  const usable = items.filter((x) => x.state !== "—");
  const [order, setOrder] = useState(() => shuffle(usable));
  const [i, setI] = useState(0);
  const [pick, setPick] = useState(null);
  const [s, setS] = useState({ y: 0, n: 0 });
  const it = order[i];
  const opts = useMemo(() => (it ? shuffle([it.state, ...otherStates(it, items, 3)]) : []), [it]); // eslint-disable-line react-hooks/exhaustive-deps
  if (usable.length < 2) return <Empty>MCQ ke liye kam se kam 2 alag rajya wale chahiye.</Empty>;
  if (!it) return <div className="st-done"><b>Sab ho gaye — ✓ {s.y} · ✗ {s.n}</b><button type="button" className="st-go" onClick={() => { setOrder(shuffle(usable)); setI(0); setS({ y: 0, n: 0 }); }}>Phir se</button></div>;
  const choose = (o) => { if (pick) return; setPick(o); setS((x) => ({ y: x.y + (o === it.state ? 1 : 0), n: x.n + (o === it.state ? 0 : 1) })); };
  return (
    <div className="st5">
      <p className="st-score">✓ {s.y} · ✗ {s.n} · {i + 1}/{order.length}</p>
      <h2>🪔 {it.term} — kis rajya ka?</h2>
      <div className="st-opts">{opts.map((o) => <button key={o} type="button" className={pick ? (o === it.state ? "is-y" : o === pick ? "is-n" : "is-dim") : ""} onClick={() => choose(o)}>{o}</button>)}</div>
      {pick ? <><Detail it={it} /><button type="button" className="st-go" onClick={() => { setPick(null); setI(i + 1); }}>Agla →</button></> : null}
    </div>
  );
}

// 6 · Jodi milao
function Match({ items }) {
  const [set, setSet] = useState(() => shuffle(items).slice(0, 5));
  const rs = useMemo(() => shuffle(set), [set]); // eslint-disable-line react-hooks/exhaustive-deps
  const [a, setA] = useState(null);
  const [got, setGot] = useState({});
  const [bad, setBad] = useState(null);
  const tryB = (it) => {
    if (!a || got[it.id]) return;
    if (a.state === it.state) { setGot((g) => ({ ...g, [a.id]: true, [it.id + "r"]: true })); }
    else { setBad(it.id); setTimeout(() => setBad(null), 400); }
    setA(null);
  };
  const all = set.every((x) => got[x.id]);
  return (
    <div className="st6">
      <div className="st6-cols">
        <div>{set.map((it) => <button key={it.id} type="button" className={`${a && a.id === it.id ? "is-sel" : ""}${got[it.id] ? " is-ok" : ""}`} onClick={() => !got[it.id] && setA(it)}>🪔 {it.term}</button>)}</div>
        <div>{rs.map((it) => <button key={it.id} type="button" className={`${got[it.id + "r"] ? "is-ok" : ""}${bad === it.id ? " is-bad" : ""}`} onClick={() => tryB(it)}>📍 {it.state}</button>)}</div>
      </div>
      {all ? <button type="button" className="st-go" onClick={() => { setSet(shuffle(items).slice(0, 5)); setGot({}); }}>Naya set →</button> : null}
    </div>
  );
}

// 7 · Sirf trick
function Tricks({ items }) {
  const list = items.filter((x) => trickOf(x));
  if (!list.length) return <Empty>Kisi jawab mein ⚡ trick nahi mili.</Empty>;
  return <div className="st7">{list.map((it) => <div key={it.id} className="st7-it"><b>🪔 {it.term}</b><span>📍 {it.state}</span><p>⚡ {trickOf(it)}</p></div>)}</div>;
}

// 10 · Table
function Table({ items }) {
  return (
    <div className="st10"><table>
      <thead><tr><th>Naam</th><th>Rajya</th><th>Kab</th><th>Devta</th><th>⚡ Trick</th></tr></thead>
      <tbody>{items.map((it) => <tr key={it.id}><td><b>{it.term}</b></td><td>{it.state}</td><td>{firstLine(it.f.kab, 50)}</td><td>{firstLine(it.f.god, 40)}</td><td>{trickOf(it)}</td></tr>)}</tbody>
    </table></div>
  );
}

// 11 · Sach ya Jhooth
function TrueFalse({ items }) {
  const usable = items.filter((x) => x.state !== "—");
  const [qs] = useState(() => shuffle(usable).map((it) => { const t = Math.random() < 0.5; const o = otherStates(it, items, 1)[0]; return { it, shown: t || !o ? it.state : o }; }));
  const [i, setI] = useState(0);
  const [res, setRes] = useState(null);
  const [s, setS] = useState({ y: 0, n: 0 });
  if (!usable.length) return <Empty>Rajya wale statics nahi mile.</Empty>;
  const q = qs[i % qs.length];
  const truth = q.shown === q.it.state;
  const ans = (v) => { if (res) return; const ok = v === truth; setRes(ok ? "y" : "n"); setS((x) => ({ y: x.y + (ok ? 1 : 0), n: x.n + (ok ? 0 : 1) })); setTimeout(() => { setRes(null); setI(i + 1); }, ok ? 700 : 1800); };
  return (
    <div className="st11">
      <p className="st-score">✓ {s.y} · ✗ {s.n}</p>
      <div className={`st11-card${res ? ` is-${res}` : ""}`}><h2>🪔 {q.it.term}</h2><p>=</p><h2>📍 {q.shown}</h2>{res === "n" ? <p>Sahi: <b>{q.it.state}</b></p> : null}</div>
      <div className="st11-btns"><button type="button" className="is-n" onClick={() => ans(false)}>✗ Jhooth</button><button type="button" className="is-y" onClick={() => ans(true)}>✓ Sach</button></div>
    </div>
  );
}

// 12 · Khoj
function Search({ items }) {
  const [t, setT] = useState("");
  const q = t.trim().toLowerCase();
  const list = q ? items.filter((it) => `${it.term} ${plain(it.text)}`.toLowerCase().includes(q)) : items;
  return (
    <div className="st12">
      <input className="st-in" value={t} onChange={(e) => setT(e.target.value)} placeholder="🔍 Naam, rajya, devta, mahina… (jaise Assam, Shiva, March)" />
      <p className="st-score">{list.length} mile</p>
      {list.map((it) => <Detail key={it.id} it={it} />)}
    </div>
  );
}

// 13 · Cover method
function Cover({ items }) {
  const [open, setOpen] = useState({});
  const [hide, setHide] = useState("state");
  return (
    <div className="st13">
      <div className="st-row"><span>Chhupao:</span>{[["state", "Rajya"], ["term", "Naam"]].map(([k, l]) => <button key={k} type="button" className={hide === k ? "is-on" : ""} onClick={() => { setHide(k); setOpen({}); }}>{l}</button>)}<button type="button" onClick={() => setOpen({})}>↺ Sab dhako</button></div>
      <table><tbody>{items.map((it, k) => (
        <tr key={it.id} onClick={() => setOpen((o) => ({ ...o, [it.id]: !o[it.id] }))}>
          <td>{k + 1}</td>
          <td className={hide === "term" && !open[it.id] ? "is-cov" : ""}><b>{it.term}</b></td>
          <td className={hide === "state" && !open[it.id] ? "is-cov" : ""}>📍 {it.state}<small>{firstLine(it.f.kab, 40)}</small></td>
        </tr>
      ))}</tbody></table>
    </div>
  );
}

// 14 · Speed
function Speed({ items }) {
  const [order] = useState(() => shuffle(items));
  const [i, setI] = useState(0);
  const [t, setT] = useState(5);
  const [run, setRun] = useState(true);
  useEffect(() => {
    if (!run) return undefined;
    const id = setTimeout(() => { if (t > -2) setT(t - 1); else { setT(5); setI((k) => (k + 1) % order.length); } }, 1000);
    return () => clearTimeout(id);
  }, [t, run, order.length]);
  const it = order[i];
  return (
    <div className="st14">
      <div className="st14-clock">{t > 0 ? t : "⏰"}</div>
      <h2>🪔 {it.term}</h2>
      {t > 0 ? <p className="st-q">Rajya + kab — mann mein bolo…</p> : <Detail it={it} />}
      <div className="st-row"><button type="button" onClick={() => setRun(!run)}>{run ? "⏸ Roko" : "▶ Chalao"}</button><button type="button" onClick={() => { setT(5); setI((k) => (k + 1) % order.length); }}>Agla ⏭</button><span>{i + 1}/{order.length}</span></div>
    </div>
  );
}

// 15 · Leitner
const LB = "cgl.statics.leitner";
function Leitner({ items }) {
  const [box, setBox] = useState(() => readJ(LB, {}));
  const [f, setF] = useState(false);
  const bx = (it) => box[it.id] || 1;
  const counts = [1, 2, 3, 4, 5].map((b) => items.filter((it) => bx(it) === b).length);
  const low = counts.findIndex((c) => c > 0) + 1;
  const it = items.find((x) => bx(x) === low);
  const rate = (ok) => { const nb = { ...box, [it.id]: ok ? Math.min(5, bx(it) + 1) : 1 }; setBox(nb); writeJ(LB, nb); setF(false); };
  return (
    <div className="st15">
      <div className="st15-boxes">{counts.map((c, k) => <div key={k} className={low === k + 1 ? "is-cur" : ""}><b>{c}</b><small>Dabba {k + 1}</small></div>)}</div>
      {it ? (
        <div className="st-card st15-card">
          <h2>🪔 {it.term}</h2>
          {f ? <><Detail it={it} /><div className="st11-btns"><button type="button" className="is-n" onClick={() => rate(false)}>✗ Nahi aaya</button><button type="button" className="is-y" onClick={() => rate(true)}>✓ Aaya</button></div></> : <button type="button" className="st-go" onClick={() => setF(true)}>👁️ Jawab</button>}
        </div>
      ) : <Empty>Sab dabba 5 mein 🎉</Empty>}
    </div>
  );
}

// 16 / 17 · ek hissa sabka
function FieldList({ items, field, empty }) {
  const list = items.filter((it) => it.f[field]);
  if (!list.length) return <Empty>{empty}</Empty>;
  return <div className="st16">{list.map((it) => <div key={it.id} className="st-card"><h3>🪔 {it.term} <span className="st-tag">📍 {it.state}</span></h3><div className="st-body"><Markdown>{it.f[field]}</Markdown></div></div>)}</div>;
}

// 18 · Random
function Random({ items }) {
  const [it, setIt] = useState(() => items[Math.floor(Math.random() * items.length)]);
  const [show, setShow] = useState(false);
  return (
    <div className="st18">
      <div className="st-card"><h2>🎲 {it.term}</h2>{show ? <Detail it={it} /> : <button type="button" className="st-go" onClick={() => setShow(true)}>👁️ Batao</button>}</div>
      <button type="button" className="st-go" onClick={() => { setIt(items[Math.floor(Math.random() * items.length)]); setShow(false); }}>🎲 Aur ek</button>
    </div>
  );
}

// 19 · Ek line
function OneLine({ items }) {
  return <ol className="st19">{items.map((it) => <li key={it.id}><b>{it.term}</b> — {it.state}{it.f.kab ? ` · ${firstLine(it.f.kab, 40)}` : ""}{it.f.god ? ` · ${firstLine(it.f.god, 30)}` : ""}{trickOf(it) ? <span> · ⚡ {trickOf(it)}</span> : null}</li>)}</ol>;
}

// 20 · Hissa-hissa kholo
function Parts({ items }) {
  const [i, setI] = useState(0);
  const [open, setOpen] = useState({});
  const n = items.length;
  const go = (d) => { setI((x) => (x + d + n) % n); setOpen({}); };
  useArrows(go);
  const it = items[i % n];
  const keys = Object.keys(FIELD_LABEL).filter((k) => it.f[k]);
  return (
    <div className="st20">
      <h2>🪔 {it.term}</h2>
      {!keys.length ? <div className="st-body"><Markdown>{it.text}</Markdown></div> : keys.map((k) => (
        <div key={k} className={`st20-p${open[k] ? " is-open" : ""}`} onClick={() => setOpen((o) => ({ ...o, [k]: !o[k] }))}>
          <b>{FIELD_LABEL[k]}</b>
          {open[k] ? <div className="st-body"><Markdown>{it.f[k]}</Markdown></div> : <span className="st-q">dabao — pehle khud yaad karo</span>}
        </div>
      ))}
      <Nav i={i % n} n={n} go={go} />
    </div>
  );
}

const byState = (it) => `📍 ${it.state}`;
const byMonth = (it) => (it.month >= 0 ? `📅 ${MONTH_NAMES[it.month]}` : "📅 Pata nahi");
const monthOrder = (a, b) => { const ia = MONTH_NAMES.findIndex((m) => a[0].includes(m)); const ib = MONTH_NAMES.findIndex((m) => b[0].includes(m)); return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib); };
const byType = (it) => it.type;

export default function StaticsLayouts({ lay, items }) {
  if (!items.length) return null;
  return <div className="st-scope">{pickLayout(lay, items)}</div>;
}
function pickLayout(lay, items) {
  switch (String(lay)) {
    case "2": return <Groups items={items} keyOf={byState} />;
    case "3": return <Flash items={items} />;
    case "4": return <Reverse items={items} />;
    case "5": return <Mcq items={items} />;
    case "6": return <Match items={items} />;
    case "7": return <Tricks items={items} />;
    case "8": return <Groups items={items} keyOf={byMonth} order={monthOrder} />;
    case "9": return <Groups items={items} keyOf={byType} />;
    case "10": return <Table items={items} />;
    case "11": return <TrueFalse items={items} />;
    case "12": return <Search items={items} />;
    case "13": return <Cover items={items} />;
    case "14": return <Speed items={items} />;
    case "15": return <Leitner items={items} />;
    case "16": return <FieldList items={items} field="confusion" empty="Kisi jawab mein Confusion wala hissa nahi mila." />;
    case "17": return <FieldList items={items} field="ssc" empty="Kisi jawab mein SSC angle wala hissa nahi mila." />;
    case "18": return <Random items={items} />;
    case "19": return <OneLine items={items} />;
    case "20": return <Parts items={items} />;
    default: return <OneByOne items={items} />;
  }
}
