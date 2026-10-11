"use client";

// 🎨 Fact log (/mission/facts) ke 15 roop — owner dropdown se dekh kar ek
// chunega. Har roop wahi facts leta hai aur wahi kaam karta hai jo page:
// ✓ Aata tha / ✗ Nahi aata tha (lib/missionfacts reviewFact — 1/3/7/14 ka
// schedule wahi), 🗑️ hatao. Fact ka "sar" aur "points" usi tarah bante hain
// jaise revise card mein (Naam: baaki → sar + jawab, answerPoints se points).
//
//  1 Flip cards · 2 Topic folders · 3 Padaav board · 4 Aaj ki checklist ·
//  5 Swipe · 6 Spreadsheet · 7 Calendar · 8 Topic cloud · 9 Corkboard ·
// 10 Khali jagah · 11 Level map · 12 Speed round · 13 Heatmap ·
// 14 Cornell notes · 15 Spotlight search

import { useEffect, useMemo, useRef, useState } from "react";
import { FACT_SECS, GAPS, factView, reviewFact, removeFact } from "@/lib/missionfacts";
import { dayKey } from "@/lib/daytime";
import { addDays } from "@/lib/mission";
import { answerPoints } from "@/components/carevision/Recall";

export const FL_LAYOUTS = [
  { id: "1", name: "Flip cards — palat ke dekho" },
  { id: "2", name: "Topic folders" },
  { id: "3", name: "Padaav board (D+1 … pakka)" },
  { id: "4", name: "Aaj ki checklist" },
  { id: "5", name: "Swipe — ✗ baayen, ✓ daayen" },
  { id: "6", name: "Spreadsheet" },
  { id: "7", name: "Calendar — kis din kitne" },
  { id: "8", name: "Topic cloud" },
  { id: "9", name: "Corkboard — index cards" },
  { id: "10", name: "Khali jagah bharo" },
  { id: "11", name: "Level map — kaun kahan tak" },
  { id: "12", name: "Speed round — 6 sec" },
  { id: "13", name: "Heatmap — har fact ek khana" },
  { id: "14", name: "Cornell notes" },
  { id: "15", name: "Spotlight search" },
];

const SPLIT = /^(.{3,90}?)\s*(?::|—|–|=|→|\s-\s)\s*([\s\S]{2,})$/;
const SEC_C = { gs: "#10b981", ca: "#f59e0b", english: "#a855f7", maths: "#3b82f6" };
const STAGES = [...GAPS.map((g) => `D+${g}`), "Pakka"];
const dm = (k) => (k ? `${k.slice(8)}/${k.slice(5, 7)}` : "");

// Ek fact → padhne ki shakl.
function toModel(f, today) {
  const v = factView(f);
  const s = FACT_SECS.find((x) => x.k === f.sec) || FACT_SECS[0];
  const main = String(v.main || "").trim();
  // Ek line: "Naam: baaki" → sar + jawab. Kai line (🧹 saaf ki hui): pehli
  // line sar, baaki points.
  const nl = main.indexOf("\n");
  const m = nl < 0 ? SPLIT.exec(main) : [null, main.slice(0, nl).trim(), main.slice(nl + 1).trim()];
  const done = !(f.step < GAPS.length);
  return {
    f, id: f.id, s, c: SEC_C[f.sec] || "#94a3b8",
    topic: f.topic || "(bina topic)",
    head: m ? m[1] : (f.topic || `${s.label} fact`),
    body: m ? m[2] : main, pts: answerPoints(m ? m[2] : main), more: v.more,
    step: done ? GAPS.length : f.step, stage: done ? "Pakka" : `D+${GAPS[f.step]}`,
    due: f.due, isDue: !done && !!f.due && f.due <= today, done,
  };
}

function Body({ m, cls = "" }) {
  return m.pts
    ? <ul className={`flx-pts ${cls}`}>{m.pts.map((p, i) => <li key={i}>{p.head ? <><b>{p.head}</b> — </> : null}{p.rest}</li>)}</ul>
    : <p className={`flx-txt ${cls}`}>{m.body}</p>;
}

function Rate({ m, act, small }) {
  if (m.done) return <span className="flx-pakka">🏁 pakka</span>;
  return (
    <span className={`flx-rate${small ? " is-sm" : ""}`}>
      <button type="button" className="is-y" onClick={(e) => { e.stopPropagation(); act.yes(m.id); }}>✓ Aata tha</button>
      <button type="button" className="is-n" onClick={(e) => { e.stopPropagation(); act.no(m.id); }}>✗ Nahi</button>
    </span>
  );
}
const Del = ({ m, act }) => <button type="button" className="flx-del" title="Hata do" onClick={(e) => { e.stopPropagation(); act.del(m.id); }}>🗑️</button>;
const Tag = ({ m }) => <span className="flx-tag" style={{ "--c": m.c }}>{m.s.icon} {m.topic}</span>;

// ─── 1 · Flip cards ───
function Flip({ ms, act }) {
  const [fl, setFl] = useState({});
  return (
    <div className="fl1">
      {ms.map((m) => (
        <div key={m.id} className={`fl1-c${fl[m.id] ? " is-f" : ""}`} onClick={() => setFl((o) => ({ ...o, [m.id]: !o[m.id] }))}>
          <div className="fl1-in">
            <div className="fl1-front" style={{ "--c": m.c }}>
              <Tag m={m} />
              <h3>{m.head}</h3>
              <small>{m.isDue ? "🔴 aaj due" : m.stage} · tap karke palto</small>
            </div>
            <div className="fl1-back" style={{ "--c": m.c }}>
              <Body m={m} />
              <Rate m={m} act={act} small />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── 2 · Topic folders ───
function Folders({ ms, act }) {
  const topics = useMemo(() => {
    const g = new Map();
    for (const m of ms) { if (!g.has(m.topic)) g.set(m.topic, []); g.get(m.topic).push(m); }
    return [...g.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [ms]);
  const [t, setT] = useState("");
  const cur = topics.find(([k]) => k === t) || topics[0];
  return (
    <div className="fl2">
      <nav>
        {topics.map(([k, list]) => (
          <button key={k} type="button" className={cur && cur[0] === k ? "is-on" : ""} onClick={() => setT(k)}>
            <span>{cur && cur[0] === k ? "📂" : "📁"} {k}</span>
            <em>{list.filter((m) => m.isDue).length ? <i>{list.filter((m) => m.isDue).length}</i> : null}{list.length}</em>
          </button>
        ))}
      </nav>
      {cur && (
        <section>
          <h3>📂 {cur[0]} <small>{cur[1].length} fact</small></h3>
          {cur[1].map((m) => (
            <article key={m.id} className="fl2-f" style={{ "--c": m.c }}>
              <header><b>{m.head}</b><span>{m.isDue ? "🔴 aaj" : m.stage}</span><Del m={m} act={act} /></header>
              <Body m={m} />
              {m.isDue && <Rate m={m} act={act} small />}
            </article>
          ))}
        </section>
      )}
    </div>
  );
}

// ─── 3 · Padaav board ───
function Board({ ms, act }) {
  const [open, setOpen] = useState("");
  return (
    <div className="fl3">
      {STAGES.map((st, i) => {
        const list = ms.filter((m) => m.step === i);
        return (
          <section key={st} className="fl3-col" style={{ "--h": `${140 + i * 30}` }}>
            <h3><span>{st}</span><b>{list.length}</b></h3>
            {list.map((m) => (
              <div key={m.id} className={`fl3-card${m.isDue ? " is-due" : ""}`} style={{ "--c": m.c }} onClick={() => setOpen(open === m.id ? "" : m.id)}>
                <small>{m.s.icon} {m.topic}{m.due && !m.done ? ` · ${dm(m.due)}` : ""}</small>
                <b>{m.head}</b>
                {open === m.id && <><Body m={m} /><Rate m={m} act={act} small /></>}
              </div>
            ))}
          </section>
        );
      })}
    </div>
  );
}

// ─── 4 · Aaj ki checklist ───
function Checklist({ ms, act }) {
  const due = ms.filter((m) => m.isDue);
  // Kitne se shuru kiya tha — usi ke hisaab se ghera bharta hai.
  const start = useRef(due.length);
  useEffect(() => { if (due.length > start.current) start.current = due.length; }, [due.length]);
  const total = Math.max(start.current, due.length);
  const doneN = total - due.length;
  const pct = total ? Math.round((doneN / total) * 100) : 100;
  const [show, setShow] = useState({});
  return (
    <div className="fl4">
      <div className="fl4-top">
        <div className="fl4-ring" style={{ "--p": pct }}><b>{pct}%</b></div>
        <div>
          <h3>Aaj ke {total} fact</h3>
          <p>{due.length ? `${due.length} baaki — pehle khud yaad karo, phir 👁 dabao.` : "Sab ho gaya 🎉 Kal phir milte hain."}</p>
        </div>
      </div>
      {due.map((m) => (
        <div key={m.id} className="fl4-row" style={{ "--c": m.c }}>
          <button type="button" className="fl4-box" title="Aata tha" onClick={() => act.yes(m.id)} />
          <div className="fl4-main">
            <b>{m.head}</b> <span className="flx-dim">{m.s.icon} {m.topic} · {m.stage}</span>
            {show[m.id] ? <Body m={m} /> : <button type="button" className="fl4-eye" onClick={() => setShow((o) => ({ ...o, [m.id]: true }))}>👁 Dikhao</button>}
          </div>
          <button type="button" className="fl4-x" title="Nahi aata tha — kal phir" onClick={() => act.no(m.id)}>✗</button>
        </div>
      ))}
      {!due.length && <div className="fl4-empty">✅ Aaj ka kaam poora</div>}
    </div>
  );
}

// ─── 5 · Swipe ───
function Swipe({ ms, act }) {
  const pool = ms.filter((m) => m.isDue).length ? ms.filter((m) => m.isDue) : ms;
  const [k, setK] = useState(0);
  const [out, setOut] = useState("");
  const [show, setShow] = useState(false);
  const m = pool[k % Math.max(1, pool.length)];
  const go = (dir) => {
    if (!m) return;
    setOut(dir);
    setTimeout(() => {
      if (dir === "r") act.yes(m.id); else if (dir === "l") act.no(m.id);
      if (!m.isDue) setK((x) => x + 1);
      setOut(""); setShow(false);
    }, 260);
  };
  useEffect(() => {
    const on = (e) => {
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
      if (e.key === "ArrowRight") go("r"); else if (e.key === "ArrowLeft") go("l"); else if (e.key === " ") { setShow(true); e.preventDefault(); }
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  });
  if (!m) return <div className="fl4-empty">Koi fact nahi.</div>;
  return (
    <div className="fl5">
      <p className="flx-dim">{pool === ms ? "Aaj kuch due nahi — saare facts" : `Aaj ke ${pool.length} due`} · ← nahi aata · → aata tha · Space = dikhao</p>
      <div className="fl5-deck">
        <div className="fl5-ghost" /><div className="fl5-ghost is-2" />
        <article className={`fl5-card${out ? ` is-out-${out}` : ""}`} style={{ "--c": m.c }} onClick={() => setShow(true)}>
          <Tag m={m} />
          <h3>{m.head}</h3>
          {show ? <Body m={m} /> : <p className="fl5-hint">👆 tap karke jawab</p>}
          <small>{m.stage}</small>
        </article>
      </div>
      <div className="fl5-btns">
        <button type="button" className="is-n" onClick={() => go("l")}>✗</button>
        <button type="button" className="is-s" onClick={() => setShow(true)}>👁</button>
        <button type="button" className="is-y" onClick={() => go("r")}>✓</button>
      </div>
    </div>
  );
}

// ─── 6 · Spreadsheet ───
function Sheet({ ms, act }) {
  const [sort, setSort] = useState({ k: "due", d: 1 });
  const cols = [["sec", "Sub"], ["topic", "Topic"], ["head", "Fact"], ["step", "Padaav"], ["due", "Agla"]];
  const rows = useMemo(() => [...ms].sort((a, b) => {
    const va = sort.k === "sec" ? a.s.label : sort.k === "step" ? a.step : (a[sort.k] || "~");
    const vb = sort.k === "sec" ? b.s.label : sort.k === "step" ? b.step : (b[sort.k] || "~");
    return (va > vb ? 1 : va < vb ? -1 : 0) * sort.d;
  }), [ms, sort]);
  return (
    <div className="fl6">
      <table>
        <thead>
          <tr>
            <th>#</th>
            {cols.map(([k, l]) => (
              <th key={k} onClick={() => setSort((s) => ({ k, d: s.k === k ? -s.d : 1 }))}>{l}{sort.k === k ? (sort.d > 0 ? " ▲" : " ▼") : ""}</th>
            ))}
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((m, i) => (
            <tr key={m.id} className={m.isDue ? "is-due" : ""}>
              <td>{i + 1}</td>
              <td><span className="fl6-dot" style={{ background: m.c }} />{m.s.label}</td>
              <td>{m.topic}</td>
              <td title={m.body}><b>{m.head}</b><span>{m.body}</span></td>
              <td>{m.stage}</td>
              <td>{m.done ? "—" : m.isDue ? "aaj" : dm(m.due)}</td>
              <td className="fl6-act">{m.isDue && <Rate m={m} act={act} small />}<Del m={m} act={act} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── 7 · Calendar ───
function Calendar({ ms, act, today }) {
  const days = Array.from({ length: 28 }, (_, i) => addDays(today, i));
  const count = (d) => ms.filter((m) => !m.done && (d === today ? m.isDue : m.due === d)).length;
  const max = Math.max(1, ...days.map(count));
  const [sel, setSel] = useState(today);
  const list = ms.filter((m) => !m.done && (sel === today ? m.isDue : m.due === sel));
  const wd = (d) => new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", { weekday: "short" });
  const lead = new Date(`${today}T00:00:00`).getDay();
  return (
    <div className="fl7">
      <div className="fl7-grid">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <span key={d} className="fl7-wd">{d}</span>)}
        {Array.from({ length: lead }, (_, i) => <span key={`e${i}`} />)}
        {days.map((d) => {
          const n = count(d);
          return (
            <button key={d} type="button" className={`fl7-d${d === sel ? " is-on" : ""}${d === today ? " is-today" : ""}`} style={{ "--a": n / max }} onClick={() => setSel(d)}>
              <small>{d.slice(8)}</small>
              <b>{n || ""}</b>
            </button>
          );
        })}
      </div>
      <section className="fl7-list">
        <h3>{sel === today ? "Aaj (+ chhoote hue)" : `${dm(sel)} · ${wd(sel)}`} — {list.length} fact</h3>
        {list.map((m) => (
          <div key={m.id} className="fl7-f" style={{ "--c": m.c }}>
            <b>{m.head}</b> <span className="flx-dim">{m.stage}</span>
            <Body m={m} />
            {m.isDue && <Rate m={m} act={act} small />}
          </div>
        ))}
        {!list.length && <p className="flx-dim">Is din kuch nahi.</p>}
      </section>
    </div>
  );
}

// ─── 8 · Topic cloud ───
function Cloud({ ms, act }) {
  const topics = useMemo(() => {
    const g = new Map();
    for (const m of ms) { if (!g.has(m.topic)) g.set(m.topic, []); g.get(m.topic).push(m); }
    return [...g.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [ms]);
  const max = Math.max(1, ...topics.map(([, l]) => l.length));
  const [t, setT] = useState("");
  const list = (topics.find(([k]) => k === t) || [null, []])[1];
  return (
    <div className="fl8">
      <div className="fl8-cloud">
        {topics.map(([k, l]) => (
          <button key={k} type="button" className={t === k ? "is-on" : ""} onClick={() => setT(t === k ? "" : k)}
            style={{ fontSize: `${0.9 + (l.length / max) * 1.6}rem`, "--c": l[0].c }}>
            {k}<sup>{l.length}</sup>
          </button>
        ))}
      </div>
      {t ? (
        <div className="fl8-list">
          {list.map((m) => (
            <div key={m.id} className="fl8-f" style={{ "--c": m.c }}>
              <b>{m.head}</b><Body m={m} />
              <footer><span className="flx-dim">{m.stage}</span>{m.isDue && <Rate m={m} act={act} small />}</footer>
            </div>
          ))}
        </div>
      ) : <p className="flx-dim fl8-hint">Kisi topic par tap karo — bada naam = zyada facts.</p>}
    </div>
  );
}

// ─── 9 · Corkboard ───
function Cork({ ms, act }) {
  return (
    <div className="fl9">
      {ms.map((m, i) => (
        <div key={m.id} className="fl9-card" style={{ "--r": `${((i * 37) % 7) - 3}deg`, "--pin": m.c }}>
          <i className="fl9-pin" />
          <h3>{m.head}</h3>
          <Body m={m} />
          <footer>{m.topic} · {m.stage}{m.isDue ? " · 🔴" : ""}</footer>
          {m.isDue && <Rate m={m} act={act} small />}
        </div>
      ))}
    </div>
  );
}

// ─── 10 · Khali jagah ───
// Ank aur Bade-Akshar wale naam chhupa do — wahi to exam mein poochhe jaate hain.
const GAP_RE = /(\b\d[\d,.:/%]*\b|\b[A-Z][a-zA-Z]{2,}(?:\s+[A-Z][a-zA-Z]+)*)/g;
function Blanks({ text, open }) {
  const parts = String(text).split(GAP_RE);
  return parts.map((p, i) => (i % 2 ? <span key={i} className={`fl10-gap${open ? " is-open" : ""}`}>{p}</span> : p));
}
function Gaps({ ms, act }) {
  const [open, setOpen] = useState({});
  return (
    <div className="fl10">
      {ms.map((m, i) => (
        <div key={m.id} className={`fl10-q${open[m.id] ? " is-open" : ""}`} style={{ "--c": m.c }}>
          <span className="fl10-n">{i + 1}</span>
          <div>
            <b className="fl10-h">{m.head}</b>
            <p><Blanks text={m.body} open={open[m.id]} /></p>
            <div className="fl10-act">
              {!open[m.id]
                ? <button type="button" onClick={() => setOpen((o) => ({ ...o, [m.id]: true }))}>🔓 Bharo / dikhao</button>
                : m.isDue ? <Rate m={m} act={act} small /> : <span className="flx-dim">{m.stage}</span>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── 11 · Level map ───
function Levels({ ms, act }) {
  const [open, setOpen] = useState("");
  return (
    <div className="fl11">
      <div className="fl11-head"><span>Fact</span>{STAGES.map((s) => <b key={s}>{s}</b>)}</div>
      {ms.map((m) => (
        <div key={m.id} className="fl11-row" style={{ "--c": m.c }}>
          <button type="button" className="fl11-name" onClick={() => setOpen(open === m.id ? "" : m.id)}>
            <b>{m.head}</b><small>{m.s.icon} {m.topic}</small>
          </button>
          <div className="fl11-track">
            {STAGES.map((s, i) => (
              <i key={s} className={i < m.step ? "is-ok" : i === m.step ? (m.isDue ? "is-now" : "is-next") : ""}>{i < m.step ? "✓" : i === m.step ? (m.done ? "🏁" : m.isDue ? "!" : "") : ""}</i>
            ))}
          </div>
          {open === m.id && <div className="fl11-open"><Body m={m} /><Rate m={m} act={act} small /></div>}
        </div>
      ))}
    </div>
  );
}

// ─── 12 · Speed round ───
const SPEED = 6;
function Speed({ ms, act }) {
  const pool = useMemo(() => {
    const d = ms.filter((m) => m.isDue);
    return d.length ? d : ms;
  }, [ms]);
  const [run, setRun] = useState(false);
  const [k, setK] = useState(0);
  const [left, setLeft] = useState(SPEED);
  const [score, setScore] = useState({ y: 0, n: 0 });
  const [ids] = useState(() => pool.map((m) => m.id));
  const byId = new Map(ms.map((m) => [m.id, m]));
  const m = byId.get(ids[k]);
  useEffect(() => {
    if (!run || left <= 0) return undefined;
    const t = setTimeout(() => setLeft((x) => x - 1), 1000);
    return () => clearTimeout(t);
  }, [run, left]);
  const next = (good) => {
    if (m && m.isDue) (good ? act.yes : act.no)(m.id);
    setScore((s) => (good ? { ...s, y: s.y + 1 } : { ...s, n: s.n + 1 }));
    setK((x) => x + 1); setLeft(SPEED);
  };
  if (!run) {
    return (
      <div className="fl12 fl12-start">
        <h3>⚡ Speed round</h3>
        <p>Har fact ka sirf sar dikhega — {SPEED} second mein yaad karo, phir jawab khulega. {pool.length} fact.</p>
        <button type="button" onClick={() => { setRun(true); setK(0); setLeft(SPEED); setScore({ y: 0, n: 0 }); }}>▶ Shuru</button>
      </div>
    );
  }
  if (!m) {
    return (
      <div className="fl12 fl12-start">
        <h3>🏁 Round khatam</h3>
        <p><b className="c-y">✓ {score.y}</b> · <b className="c-n">✗ {score.n}</b></p>
        <button type="button" onClick={() => setRun(false)}>↺ Phir se</button>
      </div>
    );
  }
  const shown = left <= 0;
  return (
    <div className="fl12" style={{ "--c": m.c }}>
      <div className="fl12-bar"><i style={{ width: `${(left / SPEED) * 100}%` }} /></div>
      <div className="fl12-meta"><span>{k + 1} / {ids.length}</span><span>✓ {score.y} · ✗ {score.n}</span></div>
      <div className="fl12-clock">{shown ? "⏰" : left}</div>
      <h3>{m.head}</h3>
      {shown ? <Body m={m} /> : <button type="button" className="fl12-peek" onClick={() => setLeft(0)}>Abhi dikhao</button>}
      {shown && (
        <div className="fl12-btns">
          <button type="button" className="is-n" onClick={() => next(false)}>✗ Nahi aaya</button>
          <button type="button" className="is-y" onClick={() => next(true)}>✓ Aa gaya</button>
        </div>
      )}
    </div>
  );
}

// ─── 13 · Heatmap ───
function Heat({ ms, act }) {
  const [sel, setSel] = useState("");
  const m = ms.find((x) => x.id === sel);
  const groups = FACT_SECS.map((s) => ({ s, list: ms.filter((x) => x.f.sec === s.k) })).filter((g) => g.list.length);
  return (
    <div className="fl13">
      <div className="fl13-map">
        <div className="fl13-leg">
          <span><i className="h-due" /> aaj due</span>
          {STAGES.map((s, i) => <span key={s}><i className={`h-${i}`} /> {s}</span>)}
        </div>
        {groups.map(({ s, list }) => (
          <div key={s.k} className="fl13-g">
            <h4>{s.icon} {s.label} <small>{list.length}</small></h4>
            <div className="fl13-cells">
              {list.map((x) => (
                <button key={x.id} type="button" title={x.head} className={`${x.isDue ? "h-due" : `h-${x.step}`}${sel === x.id ? " is-on" : ""}`} onClick={() => setSel(x.id)} />
              ))}
            </div>
          </div>
        ))}
      </div>
      <aside className="fl13-side" style={{ "--c": m ? m.c : "var(--line)" }}>
        {m ? (
          <>
            <Tag m={m} />
            <h3>{m.head}</h3>
            <Body m={m} />
            <footer><span className="flx-dim">{m.stage}{m.due && !m.done ? ` · agla ${dm(m.due)}` : ""}</span><Del m={m} act={act} /></footer>
            {m.isDue && <Rate m={m} act={act} />}
          </>
        ) : <p className="flx-dim">Kisi khane par tap karo. Laal = aaj dohrana, hara jitna gehra = utna pakka.</p>}
      </aside>
    </div>
  );
}

// ─── 14 · Cornell notes ───
function Cornell({ ms, act }) {
  const topics = useMemo(() => {
    const g = new Map();
    for (const m of ms) { if (!g.has(m.topic)) g.set(m.topic, []); g.get(m.topic).push(m); }
    return [...g.entries()];
  }, [ms]);
  return (
    <div className="fl14">
      {topics.map(([t, list]) => (
        <section key={t} className="fl14-page">
          <header><b>{t}</b><span>{list[0].s.icon} {list[0].s.label} · {list.length} fact</span></header>
          <div className="fl14-cols">
            <div className="fl14-cue">Yaad-sutra</div><div className="fl14-cue">Notes</div>
            {list.map((m) => (
              <div key={m.id} className="fl14-row">
                <div className="fl14-l">{m.head}<small>{m.stage}</small></div>
                <div className="fl14-r"><Body m={m} />{m.isDue && <Rate m={m} act={act} small />}</div>
              </div>
            ))}
          </div>
          <footer><b>Saar:</b> {list.map((m) => m.head).join(" · ")}</footer>
        </section>
      ))}
    </div>
  );
}

// ─── 15 · Spotlight search ───
function Spot({ ms, act }) {
  const [q, setQ] = useState("");
  const [k, setK] = useState(0);
  const [open, setOpen] = useState("");
  const t = q.trim().toLowerCase();
  const res = t ? ms.filter((m) => `${m.head} ${m.body} ${m.topic}`.toLowerCase().includes(t)) : ms.filter((m) => m.isDue).slice(0, 8);
  const hi = (s) => {
    if (!t) return s;
    const i = s.toLowerCase().indexOf(t);
    return i < 0 ? s : <>{s.slice(0, i)}<mark>{s.slice(i, i + t.length)}</mark>{s.slice(i + t.length)}</>;
  };
  const cur = Math.min(k, Math.max(0, res.length - 1));
  return (
    <div className="fl15">
      <div className="fl15-box">
        <span>🔎</span>
        <input value={q} placeholder="Kuch bhi likho — Kerala, Article, 1857…" onChange={(e) => { setQ(e.target.value); setK(0); }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { setK(Math.min(res.length - 1, cur + 1)); e.preventDefault(); }
            else if (e.key === "ArrowUp") { setK(Math.max(0, cur - 1)); e.preventDefault(); }
            else if (e.key === "Enter" && res[cur]) setOpen(open === res[cur].id ? "" : res[cur].id);
          }} />
        <kbd>{res.length}</kbd>
      </div>
      <p className="flx-dim">{t ? `"${q}" — ${res.length} mile · ↑↓ chuno, Enter kholo` : "Khali box = aaj ke due (pehle 8)"}</p>
      <div className="fl15-res">
        {res.map((m, i) => (
          <div key={m.id} className={`fl15-r${i === cur ? " is-on" : ""}`} style={{ "--c": m.c }} onMouseEnter={() => setK(i)} onClick={() => setOpen(open === m.id ? "" : m.id)}>
            <span className="fl15-ic">{m.s.icon}</span>
            <div>
              <b>{hi(m.head)}</b>
              {open === m.id ? <><Body m={m} /><Rate m={m} act={act} small /></> : <small>{hi(m.body.slice(0, 110))}</small>}
            </div>
            <em>{m.topic}</em>
          </div>
        ))}
      </div>
    </div>
  );
}

const COMP = { 1: Flip, 2: Folders, 3: Board, 4: Checklist, 5: Swipe, 6: Sheet, 7: Calendar, 8: Cloud, 9: Cork, 10: Gaps, 11: Levels, 12: Speed, 13: Heat, 14: Cornell, 15: Spot };

export default function FactLayouts({ lay, facts, onChange }) {
  const today = dayKey();
  const ms = useMemo(() => facts.map((f) => toModel(f, today)), [facts, today]);
  const act = useMemo(() => ({
    yes: (id) => { reviewFact(id, true); onChange(); },
    no: (id) => { reviewFact(id, false); onChange(); },
    del: (id) => { if (confirm("Ye fact hata dein?")) { removeFact(id); onChange(); } },
  }), [onChange]);
  const C = COMP[lay];
  if (!C) return null;
  if (!ms.length) return <div className="placeholder">Abhi koi fact nahi. Neeche pehla fact jodo.</div>;
  return <div className={`flx flx--${lay}`}><C ms={ms} act={act} today={today} /></div>;
}
