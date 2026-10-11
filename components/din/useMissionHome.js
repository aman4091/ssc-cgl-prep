"use client";

// 🏠 Homepage ke saare naye roop (components/home/Home*.js) ek hi data se
// chalte hain — ye hook wahi data jodta hai. Sab kuch lib/mission se: aaj ka
// din, phase, din ki timeline, CORE 5, topics, mocks, streak. Kuch naya
// hisaab nahi, sirf ek jagah ikattha.

import { useCallback, useEffect, useState } from "react";
import {
  getMission, getDone, toggleDone, currentDayNum, totalDays, totalMocks, planFor, buildTimeline,
  nowBlock, dayStats, mustComplete, streak, phaseOf, PHASES, getExam, daysBetween, dateOfDay,
  FLOOR, TARGET, PCT_NOW, PCT_TARGET, CLUSTER_TARGET, getMetrics, tickable, TARGETS, SECTIONS, checkpointDays,
} from "@/lib/mission";
import { dueCount, dueTotal, getFacts } from "@/lib/missionfacts";
import { getMocks, mockTotals, mockPercentile } from "@/lib/mockmarks";
import { dayKey } from "@/lib/daytime";

// "Maths: SI + CI" → ["Maths", "SI + CI"]; block ka apna naam (nm) ho to wahi.
export function splitTitle(b) {
  if (!b) return ["", ""];
  const i = b.t.indexOf(": ");
  if (b.nm) return [b.nm, i > 0 ? b.t.slice(i + 2) : ""];
  return i > 0 ? [b.t.slice(0, i), b.t.slice(i + 2)] : [b.t, ""];
}
export const hhmm = (min) =>
  min >= 60 ? `${Math.floor(min / 60)}h${min % 60 ? ` ${min % 60}m` : ""}` : `${min}m`;

// Block ka section → rang/icon (sab roop isi ko padhte hain).
export const SEC = {
  gs: { icon: "🌍", label: "GS", c: "#2f9e6e" },
  maths: { icon: "🧮", label: "Maths", c: "#3b6cff" },
  english: { icon: "📘", label: "English", c: "#a855f7" },
  reasoning: { icon: "🧠", label: "Reasoning", c: "#f59e0b" },
  mock: { icon: "📝", label: "Mock", c: "#e5484d" },
  rev: { icon: "🔁", label: "Revision", c: "#14b8a6" },
  life: { icon: "☕", label: "Life", c: "#94a3b8" },
  break: { icon: "☕", label: "Break", c: "#94a3b8" },
};
export const secOf = (b) => SEC[b && b.life ? "life" : b && b.sec] || SEC.life;

export default function useMissionHome() {
  const [st, setSt] = useState(null);
  const [now, setNow] = useState(() => new Date());

  const load = useCallback(() => {
    const m = getMission();
    const done = getDone();
    let mocks = [];
    try { mocks = getMocks("full"); } catch { /* ignore */ }
    let clusters = 0;
    try { clusters = getFacts().filter((f) => f.day === dayKey() && (f.sec === "gs" || f.sec === "ca")).length; } catch { /* ignore */ }
    setSt({ m, done, mocks, clusters, due: { n: dueCount(), total: dueTotal() }, metrics: getMetrics() });
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(() => setNow(new Date()), 15000);
    const on = () => load();
    for (const ev of ["cgl:mission-changed", "cgl:daily-changed", "cgl:sync-applied", "storage"]) window.addEventListener(ev, on);
    return () => {
      clearInterval(t);
      for (const ev of ["cgl:mission-changed", "cgl:daily-changed", "cgl:sync-applied", "storage"]) window.removeEventListener(ev, on);
    };
  }, [load]);

  if (!st) return null;
  const { m } = st;
  if (!m || !m.startDate) return { setup: true };

  const N = totalDays(m);
  const day = Math.max(0, currentDayNum(m));
  const dd = Math.min(Math.max(day, 1), N);
  const plan = planFor(dd, m);
  const phase = phaseOf(dd);
  const tl = buildTimeline(dd, m);
  const { cur, next, t } = nowBlock(tl, now);
  const doneToday = st.done[dd] || {};
  const stats = dayStats(dd, st.done, m);
  const core = tl.filter((b) => b.core);
  const work = tl.filter(tickable);
  const toExam = daysBetween(dayKey(), getExam());

  // 32 din ka naksha — har din: phase, full mock?, poora hua?
  const days = Array.from({ length: N }, (_, i) => {
    const n = i + 1;
    const p = planFor(n, m);
    return {
      n, date: dateOfDay(m.startDate, n), phase: phaseOf(n).k, mock: p && p.type === "A",
      ok: n < day ? mustComplete(n, st.done, m) : null, today: n === day, topic: p && p.g ? p.g.t.split(":")[0] : "",
      gT: p && p.g ? p.g.t : "", mT: p && p.m ? p.m.t : "", eT: p && p.e ? p.e.t : "", fm: p && p.fm,
    };
  });
  const last = st.mocks[0] || null;
  const lastTot = last ? mockTotals(last) : null;

  return {
    m, N, day, dd, plan, phase, phases: PHASES, tl, work, core, cur, next, nowMin: t,
    doneToday, stats, streak: streak(st.done, m), dayOK: mustComplete(dd, st.done, m),
    toExam, exam: getExam(), totalMocks: totalMocks(m), days,
    mocks: st.mocks.slice(0, 6).map((r) => ({ id: r.id, date: r.date, name: r.name, score: mockTotals(r).score, pct: mockPercentile(r) })),
    lastScore: lastTot ? lastTot.score : null, lastPct: last ? mockPercentile(last) : null,
    FLOOR, TARGET, PCT_NOW, PCT_TARGET, CLUSTER_TARGET, clusters: st.clusters, due: st.due,
    TARGETS, SECTIONS, cps: checkpointDays(m), mocksDone: st.mocks.length,
    toggle: (id) => { toggleDone(dd, id); load(); },
  };
}
