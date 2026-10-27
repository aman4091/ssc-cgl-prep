"use client";

// 🎯 /mission/tier2 — CGL Tier 2 ka 90-din plan (lib/tier2). Aaj ka din bada,
// neeche poora calendar. Tier 1 wala mission (lib/mission) waise hi hai.

import { useEffect, useState } from "react";
import { PHASES, phaseOf, tasksOf, isMockDay, totalDays, todayNum, daysLeft, dateOfDay, fmt, getExam, setExam, getStart, setStart, getDone, toggleDone } from "@/lib/tier2";
import { setExamDate, getExamDate } from "@/lib/daily";
import "./tier2.css";

export default function Tier2Page() {
  const [ready, setReady] = useState(false);
  const [sel, setSel] = useState(1);
  const [done, setDone] = useState({});
  const [exam, setExamS] = useState("");
  const [start, setStartS] = useState("");
  const [all, setAll] = useState(false);
  useEffect(() => {
    setExamS(getExam()); setStartS(getStart()); setDone(getDone());
    setSel(Math.min(Math.max(todayNum(), 1), totalDays()));
    setReady(true);
  }, []);
  if (!ready) return <div className="placeholder">…</div>;
  const N = totalDays(), today = todayNum(), left = daysLeft();
  const ph = phaseOf(sel);
  const tasks = tasksOf(sel);
  const dk = String(sel);
  const dn = new Set(done[dk] || []);
  const tick = (i) => setDone(toggleDone(dk, i));
  const put = (k, v) => { if (k === "exam") { setExam(v); setExamS(v); } else { setStart(v); setStartS(v); } };
  const doneDays = Object.entries(done).filter(([k, v]) => v.length >= Math.ceil(tasksOf(Number(k)).length * 0.6)).length;

  return (
    <section className="section t2">
      <header className="t2-head">
        <div>
          <div className="t2-eb">CGL Tier 2 · Paper 1</div>
          <h1>🎯 Mains mission</h1>
          <p className="hint">Tier 1 qualifying hai — merit yahin banti hai. English 135 · Maths 90 · Reasoning 90 · GA 75 · Computer 60. Har Q +3 / −1.</p>
        </div>
        <div className="t2-days"><b>{left}</b> din baaki<small>Day {today} / {N} · {doneDays} din poore</small></div>
      </header>

      <div className="t2-phases">
        {PHASES.map((p) => (
          <div key={p.k} className={`t2-phase${ph.k === p.k ? " is-on" : ""}`} style={{ "--c": p.color }}>
            <b>Phase {p.k} · {p.name}</b><small>D{p.from}–{p.to === 999 ? N : p.to}</small><p>{p.note}</p>
          </div>
        ))}
      </div>

      <article className="t2-day" style={{ "--c": ph.color }}>
        <div className="t2-day__top">
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setSel((s) => Math.max(1, s - 1))} disabled={sel <= 1}>‹</button>
          <div><b>Day {sel}</b> · {fmt(dateOfDay(sel))} {sel === today ? <span className="t2-today">AAJ</span> : null}{isMockDay(sel) ? <span className="t2-mock">MOCK</span> : null}
            <small>Phase {ph.k} · {ph.name}</small></div>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setSel((s) => Math.min(N, s + 1))} disabled={sel >= N}>›</button>
          {sel !== today ? <button type="button" className="btn btn--ghost btn--sm" onClick={() => setSel(Math.min(Math.max(today, 1), N))}>Aaj</button> : null}
        </div>
        <ul className="t2-tasks">
          {tasks.map((t, i) => (
            <li key={i} className={`${t.main ? "is-main" : ""}${dn.has(i) ? " is-done" : ""}`} onClick={() => tick(i)}>
              <span className="t2-tick">{dn.has(i) ? "✓" : ""}</span>
              <span className="t2-tag">{t.tag}</span>
              <span>{t.t}</span>
            </li>
          ))}
        </ul>
        <p className="hint">Mock wale din: PC par Test Recorder (Ctrl+Space / 1 / 2 / 3) + tablet par Rough pad — agle din repair usi ki report se.</p>
      </article>

      <details className="t2-all" open={all} onToggle={(e) => setAll(e.target.open)}>
        <summary>📅 Poora plan ({N} din)</summary>
        <div className="t2-grid">
          {Array.from({ length: N }, (_, i) => i + 1).map((n) => {
            const p = phaseOf(n); const d = (done[String(n)] || []).length;
            return (
              <button key={n} type="button" className={`t2-cell${n === sel ? " is-sel" : ""}${n === today ? " is-today" : ""}${isMockDay(n) ? " is-mock" : ""}`} style={{ "--c": p.color }} onClick={() => { setSel(n); window.scrollTo({ top: 0, behavior: "smooth" }); }} title={tasksOf(n)[0].t}>
                <b>{n}</b><small>{fmt(dateOfDay(n)).replace(/^\w+,?\s*/, "")}</small>{d ? <i>{d}✓</i> : null}
              </button>
            );
          })}
        </div>
      </details>

      <details className="t2-set">
        <summary>⚙️ Tareekh</summary>
        <label>Tier 2 exam (abhi confirm nahi — SSC calendar aane par badlo) <input type="date" value={exam} onChange={(e) => put("exam", e.target.value)} /></label>
        <label>Plan shuru <input type="date" value={start} onChange={(e) => put("start", e.target.value)} /></label>
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => { setExamDate(exam); try { window.dispatchEvent(new CustomEvent("cgl:exam-changed")); } catch { /* ignore */ } location.reload(); }} disabled={typeof window !== "undefined" && getExamDate() === exam}>
          📅 Upar ki patti (din baaki) par bhi Tier 2 ki tareekh lagao
        </button>
      </details>
    </section>
  );
}
