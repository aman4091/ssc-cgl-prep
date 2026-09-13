"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import MissionDay from "@/components/MissionDay";
import {
  getDays, totalDays, totalMocks, getMission, getDone, toggleDone, currentDayNum, mustComplete, dayStats, dateOfDay, fmtDay,
  getExam, examBranch,
} from "@/lib/mission";

// /mission/plan — aaj se exam tak ke saare din ek grid mein. Tap karo to us din
// ki timeline (aage ka din dekh ke taiyaar raho; pichhla din tick bhi kar sakte ho).

const TYPE_LABEL = { A: "Full mock", B: "Build", C: "Taper" };

function PlanInner() {
  const sp = useSearchParams();
  const [m, setM] = useState(null);
  const [done, setDone] = useState({});
  const [sel, setSel] = useState(null);

  useEffect(() => {
    const mm = getMission();
    setM(mm);
    setDone(getDone());
    const q = Number(sp.get("day"));
    const today = currentDayNum(mm);
    const N = totalDays(mm);
    setSel(q >= 1 && q <= N ? q : Math.min(Math.max(today, 1), N));
    const on = () => { setM(getMission()); setDone(getDone()); };
    window.addEventListener("cgl:mission-changed", on);
    window.addEventListener("cgl:sync-applied", on);
    return () => { window.removeEventListener("cgl:mission-changed", on); window.removeEventListener("cgl:sync-applied", on); };
  }, [sp]);

  if (!m || !sel) return <div className="placeholder">…</div>;
  if (!m.startDate) {
    return (
      <section className="section">
        <div className="placeholder">Mission abhi shuru nahi hua — <Link href="/mission">yahan se shuru karo</Link>.</div>
      </section>
    );
  }
  const today = currentDayNum(m);
  const days = getDays(m);
  const N = days.length;
  const p = days.find((d) => d.day === sel);

  return (
    <>
      <section className="hero" style={{ paddingBottom: 6 }}>
        <span className="hero__eyebrow">📅 CGL Mission · {N} din</span>
        <h1 className="hero__title" style={{ fontSize: "clamp(1.5rem, 4vw, 2.2rem)" }}>
          {fmtDay(dateOfDay(m.startDate, 1))} → <span className="grad">{fmtDay(getExam())} exam{m.examConfirmed ? "" : " (?)"}</span>
        </h1>
        <p className="hero__sub">
          {totalMocks(m)} full mock · har din ek Maths topic, ek English rule, ek GS topic, CA ka ek mahina. 🚩 = checkpoint.
        </p>
        <p className="hint" style={{ margin: "4px 0 0" }}>{examBranch().t}{m.examConfirmed ? "" : " Date pakki nahi — aakhri 2 din tab tak build din."}</p>
      </section>

      <section className="section" style={{ marginTop: 8 }}>
        <div className="days-grid ms-days">
          {days.map((d) => {
            const ok = mustComplete(d.day, done, m);
            const s = dayStats(d.day, done, m);
            return (
              <button
                key={d.day}
                className={"day-cell glass-card" + (ok ? " is-done" : s.doneCount > 0 ? " is-part" : "") + (d.day === sel ? " is-sel" : "") + (d.day === today ? " is-today" : "")}
                onClick={() => setSel(d.day)}
              >
                <span className="day-cell__n">D{d.day}{d.checkpoint ? " 🚩" : ""}</span>
                <span className="day-cell__c">{fmtDay(dateOfDay(m.startDate, d.day)).replace(/,.*/, "")}</span>
                <span className="day-cell__c">{d.fm ? `FM ${d.fm}` : d.unconfTaper ? "Build (taper?)" : TYPE_LABEL[d.type]}{d.ext ? " · ext" : ""}</span>
                {ok && <span className="day-cell__tick">✓</span>}
              </button>
            );
          })}
        </div>
      </section>

      <section className="section">
        <div className="row between" style={{ marginBottom: 8 }}>
          <h2 style={{ fontSize: "1.1rem", margin: 0 }}>
            Day {sel} · {fmtDay(dateOfDay(m.startDate, sel))}
            {sel === today ? " (aaj)" : ""}
          </h2>
          {sel !== today && today >= 1 && today <= N && (
            <button className="btn btn--ghost btn--sm" onClick={() => setSel(today)}>Aaj pe wapas</button>
          )}
        </div>
        {p && p.m && (
          <div className="glass-card ms-alert ms-alert--info" style={{ marginBottom: 10 }}>
            <strong>Maths:</strong> {p.m.t} · <strong>English:</strong> {p.e.t} · <strong>GS:</strong> {p.g.t}
          </div>
        )}
        <MissionDay day={sel} mission={m} done={done} onToggle={(id) => setDone(toggleDone(sel, id))} nowMin={sel === today ? new Date().getHours() * 60 + new Date().getMinutes() : null} />
      </section>
    </>
  );
}

export default function MissionPlanPage() {
  return (
    <Suspense fallback={<div className="placeholder">…</div>}>
      <PlanInner />
    </Suspense>
  );
}
