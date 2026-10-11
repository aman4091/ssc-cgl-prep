"use client";

// 📅 Answers layout 6–15. Props (AnswersLayouts se): list, renderCard (upar
// revision patti ke saath), rawCard (bina patti), plan(r) (lib/ansrev ka
// schedule), onRev/onUnrev, bucketOf, chapterOf.
//
//   6  Aaj ki revision — sirf aaj ke + chhoote, D+ padaav ke hisaab se khane
//   7  Flashcard — ek-ek question, jawab chhupa; "Yaad tha" = revise
//   8  Agle 7 din — din-wise planner: kis din kaunse question dohrane hain
//   9  Leitner boxes — kitne padaav poore (0–4) ke hisaab se khane
//  10  Subject × Din heatmap — table, cell dabao to wahi question
//  11  Chapter-wise — chapter ke jatthe, andar tareekh se
//  12  Chhoote hue — jo padaav nikal gaye, sabse purana pehle
//  13  Dashboard — subject-wise aankde + D+ padaav ka funnel
//  14  Do-pane — baayen chhoti list, daayen chuna hua card
//  15  Gallery — 2–3 column card grid, tareekh ka badge

import { useMemo, useState } from "react";
import { dayKey } from "@/lib/wrongbook";
import { addDaysKey, GAPS } from "@/lib/ansrev";

const SUB = {
  math: { icon: "🧮", label: "Maths", c: "#3b6cff" },
  gs: { icon: "🌍", label: "GS", c: "#2f9e6e" },
  english: { icon: "📘", label: "English", c: "#a855f7" },
  reasoning: { icon: "🧠", label: "Reasoning", c: "#f59e0b" },
  other: { icon: "📎", label: "Other", c: "#94a3b8" },
};
const subOf = (k) => SUB[k] || SUB.other;
const SUBS = ["math", "gs", "english", "reasoning", "other"];
const today = () => dayKey(new Date().toISOString());
const shortD = (dk) => new Date(dk + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" });
const wk = (dk) => new Date(dk + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short" });
const snip = (r) => String(r.q?.question || r.ocrText || r.note || "").replace(/\s+/g, " ").trim();
const newest = (a, b) => String(b.at).localeCompare(String(a.at));
const Empty = ({ t }) => <p className="ansp__empty">{t}</p>;

// ─── 6 · Aaj ki revision ───
function TodayRev({ list, renderCard, plan }) {
  const groups = useMemo(() => {
    const g = { miss: [], ...Object.fromEntries(GAPS.map((x) => [x, []])), fresh: [] };
    for (const r of list) {
      const p = plan(r);
      const t = p.stages.find((s) => s.state === "today");
      if (t) g[t.gap].push(r);
      else if (p.overdue) g.miss.push(r);
      else if (p.age === 0) g.fresh.push(r);
    }
    return [
      { k: "miss", t: "⚠️ Chhoote hue — pehle ye", items: g.miss },
      ...GAPS.map((x) => ({ k: `d${x}`, t: `D+${x} — ${x === 1 ? "kal aaye the" : `${x} din pehle aaye the`}`, items: g[x] })),
      { k: "fresh", t: "🆕 Aaj aaye (D0) — kal D+1 par dohrana", items: g.fresh },
    ].filter((x) => x.items.length);
  }, [list, plan]);
  if (!groups.length) return <Empty t="🎉 Aaj dohrane ko kuch nahi — sab time par hai." />;
  let i = 0;
  return (
    <div className="al6">
      {groups.map((g) => (
        <section key={g.k} className={`al6-g al6-g--${g.k}`}>
          <h3>{g.t} <span>{g.items.length}</span></h3>
          <div className="al6-cards">{g.items.map((r) => renderCard(r, i++, false))}</div>
        </section>
      ))}
    </div>
  );
}

// ─── 7 · Flashcard ───
function Flashcards({ list, rawCard, plan, onRev }) {
  const deck = useMemo(() => {
    const due = list.filter((r) => { const p = plan(r); return (p.due || p.overdue) && !p.revisedToday; });
    return due.length ? due : list.filter((r) => !plan(r).revisedToday);
  }, [list]); // eslint-disable-line react-hooks/exhaustive-deps
  const [i, setI] = useState(0);
  const [show, setShow] = useState(false);
  const [score, setScore] = useState({ y: 0, n: 0 });
  if (!deck.length) return <Empty t="🎉 Aaj ke saare question dohra liye." />;
  if (i >= deck.length) {
    return (
      <div className="al7-end">
        <h2>Deck khatam 🎉</h2>
        <p>✅ Yaad tha: <b>{score.y}</b> · ❌ Nahi: <b>{score.n}</b></p>
        <button className="ansp__btn" onClick={() => { setI(0); setShow(false); setScore({ y: 0, n: 0 }); }}>🔁 Dobara</button>
      </div>
    );
  }
  const r = deck[i];
  const p = plan(r);
  const next = (ok) => {
    if (ok) onRev(r.id);
    setScore((s) => (ok ? { ...s, y: s.y + 1 } : { ...s, n: s.n + 1 }));
    setShow(false); setI(i + 1);
  };
  return (
    <div className="al7">
      <div className="al7-top">
        <span>{i + 1} / {deck.length}</span>
        <div className="al7-prog"><i style={{ width: `${(i / deck.length) * 100}%` }} /></div>
        <span className="al7-tag" style={{ "--sc": subOf(r.subject).c }}>{subOf(r.subject).icon} {subOf(r.subject).label} · {p.age ? `D+${p.age}` : "D0"}</span>
      </div>
      {snip(r) ? <p className="al7-q">{snip(r)}</p> : null}
      <div className={`al7-card${show ? " is-show" : ""}`}>
        {rawCard(r, i, false)}
      </div>
      {!show && <button className="al7-reveal" onClick={() => setShow(true)}>👀 Pehle khud socho — phir jawab dikhao</button>}
      {show && (
        <div className="al7-btns">
          <button className="al7-no" onClick={() => next(false)}>❌ Nahi aaya</button>
          <button className="al7-yes" onClick={() => next(true)}>✅ Yaad tha (revise)</button>
        </div>
      )}
    </div>
  );
}

// ─── 8 · Agle 7 din ───
function Planner({ list, renderCard, plan }) {
  const t = today();
  const days = useMemo(() => {
    const d = Array.from({ length: 7 }, (_, i) => ({ k: addDaysKey(t, i), items: [] }));
    for (const r of list) {
      const p = plan(r);
      for (const s of p.stages) {
        if (s.state === "ok") continue;
        const k = s.state === "miss" ? t : s.date;
        const day = d.find((x) => x.k === k);
        if (day && !day.items.some((x) => x.r.id === r.id)) day.items.push({ r, gap: s.gap, late: s.state === "miss" });
      }
    }
    return d;
  }, [list, plan, t]);
  const [sel, setSel] = useState(t);
  const cur = days.find((d) => d.k === sel) || days[0];
  return (
    <div className="al8">
      <div className="al8-week">
        {days.map((d, i) => (
          <button key={d.k} type="button" className={`al8-day${d.k === sel ? " is-on" : ""}`} onClick={() => setSel(d.k)}>
            <span>{i === 0 ? "AAJ" : i === 1 ? "KAL" : wk(d.k)}</span>
            <b>{shortD(d.k)}</b>
            <em>{d.items.length}</em>
            <div className="al8-mini">{d.items.slice(0, 12).map((x) => <i key={x.r.id} style={{ background: subOf(x.r.subject).c }} />)}</div>
          </button>
        ))}
      </div>
      <h2 className="al2-h">{sel === t ? "Aaj" : shortD(sel)} dohrane: {cur.items.length} <span>· D+ padaav ke saath</span></h2>
      {cur.items.length ? cur.items.map((x, i) => (
        <div key={x.r.uid} className="al8-row">
          <span className={`al8-gap${x.late ? " is-late" : ""}`}>D+{x.gap}{x.late ? " · der" : ""}</span>
          {renderCard(x.r, i, false)}
        </div>
      )) : <Empty t="Is din kuch nahi." />}
    </div>
  );
}

// ─── 9 · Leitner boxes ───
function Boxes({ list, renderCard, plan }) {
  const boxes = useMemo(() => {
    const b = Array.from({ length: 5 }, () => []);
    for (const r of list) b[plan(r).level].push(r);
    return b;
  }, [list, plan]);
  const names = ["📥 Naye (0/4)", "D+1 hua", "D+3 hua", "D+7 hua", "🏁 Pakke (D+14)"];
  const [sel, setSel] = useState(0);
  return (
    <div className="al9">
      <div className="al9-row">
        {boxes.map((b, i) => (
          <button key={i} type="button" className={`al9-box l${i}${sel === i ? " is-on" : ""}`} onClick={() => setSel(i)}>
            <b>{b.length}</b><span>{names[i]}</span>
            <div className="al9-stack">{b.slice(0, 8).map((r) => <i key={r.id} style={{ background: subOf(r.subject).c }} />)}</div>
          </button>
        ))}
      </div>
      <p className="al-bar">Har revise question ko agle dabbe mein le jaata hai. Laksh: sab 🏁 mein.</p>
      <div className="al9-cards">{[...boxes[sel]].sort(newest).map((r, i) => renderCard(r, i, false))}</div>
    </div>
  );
}

// ─── 10 · Subject × Din heatmap ───
function Heatmap({ list, renderCard, bucketOf }) {
  const days = useMemo(() => [...new Set(list.map((r) => dayKey(r.at)))].sort().reverse().slice(0, 21), [list]);
  const cell = useMemo(() => {
    const m = {};
    for (const r of list) { const k = `${bucketOf(r)}|${dayKey(r.at)}`; (m[k] ||= []).push(r); }
    return m;
  }, [list, bucketOf]);
  const max = Math.max(1, ...Object.values(cell).map((x) => x.length));
  const [sel, setSel] = useState("");
  const items = sel ? cell[sel] || [] : [];
  return (
    <div className="al10">
      <div className="al10-wrap">
        <table className="al10-t">
          <thead><tr><th />{days.map((d) => <th key={d}><span>{wk(d)}</span>{shortD(d)}</th>)}<th>Kul</th></tr></thead>
          <tbody>
            {SUBS.filter((s) => list.some((r) => bucketOf(r) === s)).map((s) => (
              <tr key={s}>
                <th style={{ color: subOf(s).c }}>{subOf(s).icon} {subOf(s).label}</th>
                {days.map((d) => {
                  const k = `${s}|${d}`; const n = (cell[k] || []).length;
                  return (
                    <td key={d}>
                      {n ? <button type="button" className={sel === k ? "is-on" : ""} style={{ "--sc": subOf(s).c, "--a": 0.2 + (n / max) * 0.8 }} onClick={() => setSel(sel === k ? "" : k)}>{n}</button> : <span className="al10-0">·</span>}
                    </td>
                  );
                })}
                <td className="al10-sum">{list.filter((r) => bucketOf(r) === s).length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {sel ? (
        <>
          <h2 className="al2-h">{subOf(sel.split("|")[0]).label} · {shortD(sel.split("|")[1])} <span>· {items.length} question</span></h2>
          {items.map((r, i) => renderCard(r, i, false))}
        </>
      ) : <p className="al-bar">Kisi khane par dabao — us din ke us subject ke question neeche khulenge.</p>}
    </div>
  );
}

// ─── 11 · Chapter-wise ───
function Chapters({ list, renderCard, chapterOf, bucketOf, plan }) {
  const groups = useMemo(() => {
    const m = new Map();
    for (const r of list) {
      const ch = chapterOf(r).ch || "";
      const k = `${bucketOf(r)}|${ch}`;
      if (!m.has(k)) m.set(k, { k, s: bucketOf(r), ch, items: [] });
      m.get(k).items.push(r);
    }
    return [...m.values()].map((g) => ({ ...g, items: g.items.sort(newest) })).sort((a, b) => b.items.length - a.items.length);
  }, [list, chapterOf, bucketOf]);
  const [open, setOpen] = useState(() => new Set(groups.slice(0, 1).map((g) => g.k)));
  let i = 0;
  return (
    <div className="al11">
      {groups.map((g) => {
        const due = g.items.filter((r) => { const p = plan(r); return p.due || p.overdue; }).length;
        const isOpen = open.has(g.k);
        return (
          <section key={g.k} className="al11-g" style={{ "--sc": subOf(g.s).c }}>
            <button type="button" className="al11-hd" onClick={() => setOpen((o) => { const n = new Set(o); if (n.has(g.k)) n.delete(g.k); else n.add(g.k); return n; })}>
              <span className="al11-s">{subOf(g.s).icon}</span>
              <b>{g.ch ? g.ch.replace(/-/g, " ") : `${subOf(g.s).label} · chapter pata nahi`}</b>
              <span className="al11-dates">{shortD(dayKey(g.items[g.items.length - 1].at))} → {shortD(dayKey(g.items[0].at))}</span>
              {due ? <span className="al11-due">🔁 {due}</span> : null}
              <span className="al11-n">{g.items.length}</span>
            </button>
            {isOpen && <div className="al11-cards">{g.items.map((r) => renderCard(r, i++, false))}</div>}
          </section>
        );
      })}
    </div>
  );
}

// ─── 12 · Chhoote hue ───
function Missed({ list, renderCard, plan }) {
  const rows = useMemo(() => list
    .map((r) => ({ r, p: plan(r) }))
    .filter((x) => x.p.overdue && !x.p.revisedToday)
    .map((x) => ({ ...x, first: x.p.stages.find((s) => s.state === "miss") }))
    .sort((a, b) => a.first.date.localeCompare(b.first.date)), [list, plan]);
  if (!rows.length) return <Empty t="🎉 Koi padaav nahi chhoota. Aise hi chalte raho." />;
  const t = today();
  return (
    <div className="al12">
      <p className="al12-note">⚠️ Inka koi D+ padaav nikal gaya. Sabse purana upar — aaj inhe dohra lo, schedule wahin se aage chalega.</p>
      {rows.map(({ r, first }, i) => {
        const late = Math.round((new Date(t + "T00:00:00") - new Date(first.date + "T00:00:00")) / 864e5);
        return (
          <div key={r.uid} className="al12-row">
            <span className="al12-late"><b>{late}</b> din der<small>D+{first.gap} · {shortD(first.date)}</small></span>
            <div className="al12-card">{renderCard(r, i, false)}</div>
          </div>
        );
      })}
    </div>
  );
}

// ─── 13 · Dashboard ───
function Dashboard({ list, renderCard, plan, bucketOf }) {
  const st = useMemo(() => {
    const by = {};
    const funnel = [list.length, 0, 0, 0, 0];
    for (const r of list) {
      const s = bucketOf(r); const p = plan(r);
      by[s] ||= { n: 0, due: 0, miss: 0, done: 0, wk: 0 };
      by[s].n++; if (p.due) by[s].due++; if (p.overdue) by[s].miss++; if (p.done) by[s].done++;
      if (p.age < 7) by[s].wk++;
      for (let k = 1; k <= p.level; k++) funnel[k]++;
    }
    return { by, funnel };
  }, [list, plan, bucketOf]);
  const due = useMemo(() => list.filter((r) => { const p = plan(r); return p.due || p.overdue; }).sort(newest), [list, plan]);
  return (
    <div className="al13">
      <div className="al13-subs">
        {SUBS.filter((s) => st.by[s]).map((s) => {
          const b = st.by[s];
          return (
            <div key={s} className="al13-s" style={{ "--sc": subOf(s).c }}>
              <h3>{subOf(s).icon} {subOf(s).label}</h3>
              <b className="al13-big">{b.n}</b><span>kul galat</span>
              <dl>
                <div><dt>Is hafte</dt><dd>{b.wk}</dd></div>
                <div><dt>Aaj dohrane</dt><dd className="c-due">{b.due}</dd></div>
                <div><dt>Chhoote</dt><dd className="c-miss">{b.miss}</dd></div>
                <div><dt>🏁 Pakke</dt><dd className="c-ok">{b.done}</dd></div>
              </dl>
            </div>
          );
        })}
      </div>
      <section className="al13-fun">
        <h3>Revision ka safar</h3>
        {["Aaye (D0)", "D+1 hua", "D+3 hua", "D+7 hua", "D+14 · pakke"].map((l, k) => (
          <div key={l} className="al13-bar"><span>{l}</span><i style={{ width: `${(st.funnel[k] / Math.max(1, st.funnel[0])) * 100}%` }} /><b>{st.funnel[k]}</b></div>
        ))}
      </section>
      <h2 className="al2-h">🔁 Aaj ke {due.length} <span>· dohrane + chhoote</span></h2>
      {due.map((r, i) => renderCard(r, i, false))}
    </div>
  );
}

// ─── 14 · Do-pane ───
function TwoPane({ list, rawCard, plan, onRev, onUnrev, bucketOf }) {
  const rows = useMemo(() => [...list].sort(newest), [list]);
  const [id, setId] = useState(() => (rows[0] ? rows[0].id : ""));
  const cur = rows.find((r) => r.id === id) || rows[0];
  if (!cur) return <Empty t="Kuch nahi." />;
  const p = plan(cur);
  let lastDay = "";
  return (
    <div className="al14">
      <nav className="al14-list">
        {rows.map((r, i) => {
          const dk = dayKey(r.at); const hd = dk !== lastDay; lastDay = dk; const q = plan(r);
          return (
            <div key={r.uid}>
              {hd && <div className="al14-day">{shortD(dk)} · {wk(dk)}</div>}
              <button type="button" className={`al14-it${r.id === cur.id ? " is-on" : ""}`} onClick={() => setId(r.id)}>
                <i style={{ background: subOf(bucketOf(r)).c }} />
                <span>{snip(r) || `Question ${i + 1}`}</span>
                <em className={q.due ? "c-due" : q.overdue ? "c-miss" : ""}>{q.due ? "aaj" : q.overdue ? "der" : q.done ? "🏁" : ""}</em>
              </button>
            </div>
          );
        })}
      </nav>
      <div className="al14-main">
        <div className="al14-head">
          <b>{subOf(bucketOf(cur)).icon} {subOf(bucketOf(cur)).label}</b> · {shortD(p.base)} · D+{p.age}
          {p.revisedToday
            ? <button className="rv-btn is-on" onClick={() => onUnrev(cur.id)}>✓ Aaj revise hua</button>
            : <button className="rv-btn" onClick={() => onRev(cur.id)}>🔁 Revise kiya</button>}
        </div>
        <div className="al14-tl">
          {[{ gap: 0, date: p.base, state: "ok" }, ...p.stages].map((s) => (
            <span key={s.gap} className={`al14-st is-${s.state}`}><i /><b>{s.gap ? `D+${s.gap}` : "D0"}</b><small>{shortD(s.date)}</small></span>
          ))}
        </div>
        {rawCard(cur, rows.indexOf(cur), false)}
      </div>
    </div>
  );
}

// ─── 15 · Gallery ───
function Gallery({ list, renderCard, plan, bucketOf }) {
  const [f, setF] = useState("all");
  const rows = useMemo(() => [...list].sort(newest).filter((r) => {
    const p = plan(r);
    return f === "all" ? true : f === "due" ? p.due || p.overdue : f === "week" ? p.age < 7 : p.done;
  }), [list, plan, f]);
  return (
    <div className="al15">
      <div className="al-bar">
        <span className="al15-f">
          {[["all", "Sab"], ["due", "🔁 Dohrane"], ["week", "Is hafte"], ["done", "🏁 Pakke"]].map(([k, l]) => (
            <button key={k} type="button" className={`ansp__btn${f === k ? " is-on" : ""}`} onClick={() => setF(k)}>{l}</button>
          ))}
        </span>
        <span>{rows.length} question</span>
      </div>
      <div className="al15-grid">
        {rows.map((r, i) => (
          <div key={r.uid} className="al15-it" style={{ "--sc": subOf(bucketOf(r)).c }}>
            {renderCard(r, i, false)}
          </div>
        ))}
      </div>
    </div>
  );
}

export const MoreLayouts = [
  { id: "6", name: "Aaj ki revision", C: TodayRev },
  { id: "7", name: "Flashcard", C: Flashcards },
  { id: "8", name: "Agle 7 din", C: Planner },
  { id: "9", name: "Leitner dabbe", C: Boxes },
  { id: "10", name: "Heatmap", C: Heatmap },
  { id: "11", name: "Chapter-wise", C: Chapters },
  { id: "12", name: "Chhoote hue", C: Missed },
  { id: "13", name: "Dashboard", C: Dashboard },
  { id: "14", name: "Do-pane", C: TwoPane },
  { id: "15", name: "Gallery", C: Gallery },
];
