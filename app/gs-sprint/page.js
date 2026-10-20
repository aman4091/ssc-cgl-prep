"use client";

// 🔥 GS Sprint — 27 Oct 2026 ke CGL paper tak "GS HOT 22 TOPICS" PDF ka
// 7-din ka plan. Char tab: Plan (din-wise), Notes (22 topic, har ek ke neeche
// SSC traps), Quiz (145 MCQ, galat wale yaad rehte hain), Traps (sab ek list —
// exam ki subah ka padhna). Data lib/gssprint/. Progress localStorage mein
// (cgl.gss.*) — chhota hai, bigstore ki zaroorat nahi.

import { useEffect, useMemo, useState } from "react";
import { NOTES } from "@/lib/gssprint/notes";
import { QUIZ } from "@/lib/gssprint/quiz";
import "./gs-sprint.css";

const EXAM = new Date(2026, 9, 27);
const START = new Date(2026, 9, 20);

const PLAN = [
  { d: 1, date: "Mon 20 Oct", name: "Polity", why: "Highest weight; pure recall." },
  { d: 2, date: "Tue 21 Oct", name: "Modern History", why: "Dates & pairs — most asked." },
  { d: 3, date: "Wed 22 Oct", name: "Geography", why: "Mine–state and soil–crop pairs." },
  { d: 4, date: "Thu 23 Oct", name: "Economy", why: "Plans, policies, institutions." },
  { d: 5, date: "Fri 24 Oct", name: "Science + New Laws", why: "Biology & optics — formula-free marks." },
  { d: 6, date: "Sat 25 Oct", name: "Art & Culture", why: "Pair-matching; tricks work best here." },
  { d: 7, date: "Sun 26 Oct", name: "Current Affairs + Revision", why: "Fresh facts stick best when read last. Evening: Traps tab, twice." },
  { d: 8, date: "Mon 27 Oct", name: "Exam day", why: "Morning: Traps tab (20 min) → Quiz 'only my wrong ones' (15 min) → stop 1 hour before." },
];

const load = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } };

const dayNo = () => { const t = new Date(); t.setHours(0, 0, 0, 0); return Math.round((t - START) / 864e5) + 1; };
const daysLeft = () => { const t = new Date(); t.setHours(0, 0, 0, 0); return Math.max(0, Math.round((EXAM - t) / 864e5)); };

export default function GsSprintPage() {
  const [tab, setTab] = useState("plan");
  const [day, setDay] = useState(0);
  const [done, setDone] = useState([]);
  const [wrong, setWrong] = useState([]);
  const [left, setLeft] = useState(null);
  const [today, setToday] = useState(0);

  useEffect(() => {
    setTab(load("cgl.gss.tab", "plan"));
    setDay(load("cgl.gss.day", 0));
    setDone(load("cgl.gss.done", []));
    setWrong(load("cgl.gss.wrong", []));
    setLeft(daysLeft());
    setToday(dayNo());
  }, []);

  const go = (t) => { setTab(t); save("cgl.gss.tab", t); window.scrollTo({ top: 0 }); };
  const pickDay = (d) => { setDay(d); save("cgl.gss.day", d); };
  const toggleDone = (id) => setDone((p) => { const n = p.includes(id) ? p.filter((x) => x !== id) : [...p, id]; save("cgl.gss.done", n); return n; });
  const setWrongS = (n) => { setWrong(n); save("cgl.gss.wrong", n); };

  return (
    <div className="gss">
      <header className="gss-hd">
        <div>
          <small>SSC CGL 2026 · GS Hot 22 Topics</small>
          <h1>7-Day Sprint to 27 October</h1>
        </div>
        <div className="gss-count"><b>{left ?? "—"}</b><span>days left</span></div>
      </header>

      <nav className="gss-tabs" role="tablist">
        {[["plan", "Plan"], ["notes", "Notes"], ["quiz", "Quiz"], ["traps", "Traps"]].map(([k, l]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => go(k)}>{l}</button>
        ))}
      </nav>

      {tab === "plan" && <Plan today={today} open={(d) => { pickDay(d); go("notes"); }} />}
      {tab === "notes" && <Notes day={day} pickDay={pickDay} done={done} toggleDone={toggleDone} />}
      {tab === "quiz" && <Quiz wrong={wrong} setWrong={setWrongS} />}
      {tab === "traps" && <Traps />}
    </div>
  );
}

function Plan({ today, open }) {
  return (
    <>
      <p className="gss-lead">One subject block per day, so the whole PDF is covered once by 26 Oct and the heavy areas (Polity, History, Geography) get a second pass. Every day ends with a 15-minute recall of the previous day.</p>
      <div className="gss-rule">
        <b>Daily rhythm (≈3.5 h)</b>
        <div><b>Read</b> 90 min — Notes tab, one topic at a time, say each trap line aloud.</div>
        <div><b>Quiz</b> 30 min — Quiz tab, filter to today's day; re-attempt only the wrong ones.</div>
        <div><b>Recall</b> 15 min — yesterday's traps, cover and recite.</div>
        <div><b>Night</b> 20 min — today's "TOP 50 one-liners" lists from the PDF itself.</div>
      </div>
      <div className="gss-days">
        {PLAN.map((p) => {
          const topics = NOTES.filter((n) => n.day === p.d);
          return (
            <div key={p.d} className={`gss-day${p.d === today ? " is-today" : ""}`}>
              <div className="gss-day__d">{p.d < 8 ? `D${p.d}` : "EXAM"}<small>{p.date}</small></div>
              <div>
                <h3>{p.name}</h3>
                <div className="gss-why">{p.why}</div>
                {topics.length > 0 && <ul>{topics.map((t) => <li key={t.id}>{t.title}</li>)}</ul>}
                {p.d < 8 && (
                  <>
                    <div className="gss-slots"><span>Read 90m</span><span>Quiz 30m</span><span>Recall 15m</span><span>Night 20m</span></div>
                    <button type="button" className="gss-open" onClick={() => open(p.d)}>Open Day {p.d} notes →</button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function Notes({ day, pickDay, done, toggleDone }) {
  const list = NOTES.filter((n) => !day || n.day === day);
  return (
    <>
      <p className="gss-lead">Condensed English notes from all 22 topics. Tick a topic when done; ticks stay on this device.</p>
      <div className="gss-chips">
        <button type="button" aria-pressed={day === 0} onClick={() => pickDay(0)}>All</button>
        {PLAN.slice(0, 7).map((p) => <button key={p.d} type="button" aria-pressed={day === p.d} onClick={() => pickDay(p.d)}>Day {p.d} · {p.name}</button>)}
      </div>
      {list.map((n) => (
        <details key={n.id} className="gss-topic">
          <summary><h3>{done.includes(n.id) ? "✓ " : ""}{n.title}</h3><span>Day {n.day} · {n.group}</span></summary>
          <div className="gss-topic__body">
            {n.sections.map((s) => (
              <div key={s.h}><h4>{s.h}</h4><ul>{s.items.map((i, k) => <li key={k}>{i}</li>)}</ul></div>
            ))}
            <div className="gss-traps"><h4>SSC traps</h4><ul>{n.traps.map((t, k) => <li key={k}>{t}</li>)}</ul></div>
            <label className="gss-done"><input type="checkbox" checked={done.includes(n.id)} onChange={() => toggleDone(n.id)} /> Mark this topic done</label>
          </div>
        </details>
      ))}
    </>
  );
}

function Traps() {
  return (
    <>
      <p className="gss-lead">Every "SSC trap" from the notes in one list — the last thing to read on the morning of 27 Oct.</p>
      {PLAN.slice(0, 7).map((p) => (
        <div key={p.d}>
          <h2 className="gss-h2">Day {p.d} · {p.name}</h2>
          {NOTES.filter((n) => n.day === p.d).map((n) => (
            <div key={n.id} className="gss-topic gss-topic--flat"><h4>{n.title}</h4><ul>{n.traps.map((t, k) => <li key={k}>{t}</li>)}</ul></div>
          ))}
        </div>
      ))}
    </>
  );
}

function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

function Quiz({ wrong, setWrong }) {
  const [fDay, setFDay] = useState("all");
  const [mode, setMode] = useState("all");
  const [pool, setPool] = useState(null);
  const [pos, setPos] = useState(0);
  const [pick, setPick] = useState(null);
  const [right, setRight] = useState(0);
  const [answered, setAnswered] = useState(0);
  const wrongSet = useMemo(() => new Set(wrong), [wrong]);

  const start = () => {
    const p = QUIZ.map((_, i) => i).filter((i) => (fDay === "all" || QUIZ[i][0] === +fDay) && (mode === "all" || wrongSet.has(i)));
    setPool(shuffle(p)); setPos(0); setPick(null); setRight(0); setAnswered(0);
  };
  const answer = (k) => {
    if (pick !== null) return;
    const i = pool[pos], q = QUIZ[i], ok = k === q[3];
    setPick(k); setAnswered((a) => a + 1);
    if (ok) { setRight((r) => r + 1); if (wrongSet.has(i)) setWrong(wrong.filter((x) => x !== i)); }
    else if (!wrongSet.has(i)) setWrong([...wrong, i]);
  };
  const next = () => { setPos((p) => p + 1); setPick(null); };

  useEffect(() => {
    const f = (e) => {
      if (!pool) return;
      const k = "abcd".indexOf(e.key.toLowerCase());
      if (k >= 0 && pick === null) answer(k);
      else if (e.key === "Enter" && pick !== null) next();
    };
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  });

  const q = pool && pos < pool.length ? QUIZ[pool[pos]] : null;
  return (
    <>
      <p className="gss-lead">{QUIZ.length} MCQs built from the PDF's trap lists. Wrong answers are remembered so you can retry just those. Keys: A/B/C/D, Enter = next.</p>
      <div className="gss-qbar">
        <select value={fDay} onChange={(e) => setFDay(e.target.value)}>
          <option value="all">All days</option>
          {PLAN.slice(0, 7).map((p) => <option key={p.d} value={p.d}>Day {p.d} · {p.name}</option>)}
        </select>
        <select value={mode} onChange={(e) => setMode(e.target.value)}>
          <option value="all">All questions</option>
          <option value="wrong">Only my wrong ones</option>
        </select>
        <button type="button" className="btn btn--primary btn--sm" onClick={start}>Start</button>
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => setWrong([])}>Clear wrong list</button>
      </div>
      <div className="gss-score">
        <div><b>{answered}</b><span>answered</span></div>
        <div><b>{right}</b><span>correct</span></div>
        <div><b>{wrong.length}</b><span>in wrong list</span></div>
      </div>
      {!pool && <p className="muted">Press Start.</p>}
      {pool && !pool.length && <p className="muted">{mode === "wrong" ? "No wrong answers saved for this filter — good sign." : "No questions."}</p>}
      {pool && pool.length > 0 && !q && (
        <div className="gss-q">
          <div className="gss-q__text">Done: {right}/{pool.length} correct.</div>
          <div className="gss-exp">{wrong.length ? `${wrong.length} questions are in your wrong list. Switch mode to "Only my wrong ones" and press Start.` : "Wrong list is empty."}</div>
        </div>
      )}
      {q && (
        <div className="gss-q">
          <div className="gss-q__meta"><span>Q {pos + 1} / {pool.length}</span><span>Day {q[0]}</span></div>
          <div className="gss-q__text">{q[1]}</div>
          <div className="gss-opts">
            {q[2].map((o, k) => {
              let cls = "";
              if (pick !== null) { if (k === q[3]) cls = " is-ok"; else if (k === pick) cls = " is-bad"; }
              return <button key={k} type="button" className={cls} disabled={pick !== null} onClick={() => answer(k)}><b>{"ABCD"[k]}</b><span>{o}</span></button>;
            })}
          </div>
          {pick !== null && (
            <>
              <div className="gss-exp">{pick === q[3] ? "Correct. " : `Answer: ${"ABCD"[q[3]]}. `}{q[4]}</div>
              <button type="button" className="btn btn--primary btn--sm gss-next" onClick={next} autoFocus>Next →</button>
            </>
          )}
        </div>
      )}
    </>
  );
}
