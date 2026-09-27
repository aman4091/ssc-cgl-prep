"use client";

// 🅱 Din ki Timeline — poora din ek khadi samay-rekha par (05:30 → 23:00),
// jaise calendar ka din. Abhi wala block khula aur bada, "ABHI" ki laal
// lakeer, beete block halke, har kaam ke aage tick. Daayen chipka panel:
// countdown, CORE 5 ki ginti aur aaj ke topic.

import Link from "next/link";
import { Go, Tick, subjectsOf, BlockName, secOf, splitTitle } from "./parts";
import { hhmm } from "./useMissionHome";

export default function HomeTimeline({ d }) {
  const subs = subjectsOf(d);
  return (
    <div className="hB">
      <header className="hB-head">
        <div>
          <p className="hB-kicker" style={{ "--pc": d.phase.color }}>Phase {d.phase.k} · {d.phase.name}</p>
          <h1 className="hB-title">Day {d.day} <span>/ {d.N}</span></h1>
        </div>
        <div className="hB-head__r">
          <span className="hB-pill">⏳ <b>{d.toExam ?? "–"}</b> din · CGL</span>
          <span className="hB-pill">🔒 CORE <b>{d.stats.coreDone}/{d.stats.coreTotal}</b></span>
          <span className="hB-pill">🔥 <b>{d.streak}</b></span>
        </div>
      </header>

      <div className="hB-grid">
        <ol className="hB-tl">
          {d.tl.filter((b) => b.id !== "sleep").map((b) => {
            const isNow = d.cur && d.cur.id === b.id;
            const past = b.e <= d.nowMin;
            const ok = !!d.doneToday[b.id];
            const life = b.life || b.brk;
            const sc = secOf(b);
            return (
              <li
                key={b.id}
                className={`hB-b${isNow ? " is-now" : ""}${past ? " is-past" : ""}${ok ? " is-ok" : ""}${life ? " is-life" : ""}${b.core ? " is-core" : ""}`}
                style={{ "--sc": sc.c }}
              >
                <span className="hB-b__time">{b.start}<small>{hhmm(b.min)}</small></span>
                <span className="hB-b__dot" />
                <div className="hB-b__card">
                  {isNow && (
                    <span className="hB-now">
                      ● ABHI · {hhmm(Math.max(0, b.e - d.nowMin))} bacha
                      <i style={{ width: `${Math.min(100, ((d.nowMin - b.s) / Math.max(1, b.e - b.s)) * 100)}%` }} />
                    </span>
                  )}
                  <div className="hB-b__row">
                    <span className="hB-b__t"><BlockName b={b} /></span>
                    {b.core ? <span className="hB-core">CORE</span> : null}
                    {!life && <Tick ok={ok} onClick={() => d.toggle(b.id)} />}
                  </div>
                  {isNow && b.tg ? <p className="hB-b__tg">🎯 {b.tg}</p> : null}
                  {isNow && !life ? <div className="hB-b__go"><Go b={b} /></div> : null}
                </div>
              </li>
            );
          })}
        </ol>

        <aside className="hB-side">
          <section className="hB-card hB-count">
            <b>{d.toExam ?? "–"}</b>
            <span>din baaki · 27 Oct</span>
            <div className="hB-count__bar"><i style={{ width: `${(d.day / d.N) * 100}%` }} /></div>
            <small>{d.day} din ho gaye · {d.N - d.day} bache</small>
          </section>
          <section className="hB-card">
            <h3>📚 Aaj ke topic</h3>
            {subs.map((s) => (
              <div key={s.k} className="hB-sub" style={{ "--sc": s.c }}>
                <span className="hB-sub__l">{s.icon} {s.label}</span>
                <span className="hB-sub__t">{s.t}</span>
              </div>
            ))}
          </section>
          {d.next ? (
            <section className="hB-card hB-next">
              <span>Agla</span>
              <b>{d.next.start}</b>
              <em>{splitTitle(d.next)[0]}</em>
            </section>
          ) : null}
          <div className="hB-links">
            <Link href="/pyq/sprint" className="btn btn--primary btn--sm">⚡ Sprint</Link>
            <Link href="/mission/facts" className="btn btn--ghost btn--sm">🧠 Fact log ({d.due.n})</Link>
            <Link href="/mission/progress" className="btn btn--ghost btn--sm">🚩 Checkpoints</Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
