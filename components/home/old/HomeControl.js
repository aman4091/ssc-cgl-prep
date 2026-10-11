"use client";

// 🅰 Mission Control — ek dashboard. Upar exam ka bada countdown + 32 din ki
// phase-patti, beech mein ABHI ka kaam aur aaj ke 3 subject, daayen CORE 5 ki
// checklist, streak aur target (percentile + FLOOR/TARGET).

import Link from "next/link";
import { Go, Tick, subjectsOf, BlockName, splitTitle, secOf } from "./parts";
import { hhmm } from "./useMissionHome";

export default function HomeControl({ d }) {
  const subs = subjectsOf(d);
  const pctW = Math.min(100, Math.max(0, ((d.lastPct ?? d.PCT_NOW) / 100) * 100));
  return (
    <div className="hA">
      {/* ---- Upar: countdown + 32 din ki patti ---- */}
      <section className="hA-top">
        <div className="hA-count">
          <span className="hA-count__n">{d.toExam ?? "–"}</span>
          <span className="hA-count__l">din baaki<br /><b>CGL · 27 Oct</b></span>
        </div>
        <div className="hA-journey">
          <div className="hA-journey__hd">
            <span>Day <b>{d.day}</b> / {d.N}</span>
            <span className="hA-phase" style={{ "--pc": d.phase.color }}>Phase {d.phase.k} · {d.phase.name}</span>
            {d.plan && d.plan.type === "A" ? <span className="hA-chip">📝 Aaj FULL MOCK {d.plan.fm}</span> : null}
          </div>
          <div className="hA-strip">
            {d.days.map((x) => (
              <span
                key={x.n}
                className={`hA-seg ph${x.phase}${x.today ? " is-today" : ""}${x.ok === true ? " is-ok" : ""}${x.ok === false ? " is-miss" : ""}`}
                title={`Day ${x.n} · ${x.date}${x.mock ? " · Full mock" : ""}`}
              >{x.mock ? "•" : ""}</span>
            ))}
          </div>
          <div className="hA-journey__ft">
            {d.phases.map((p) => <span key={p.k} style={{ "--pc": p.color }}>D{p.from}–{p.to} {p.name}</span>)}
          </div>
        </div>
      </section>

      <div className="hA-grid">
        {/* ---- Beech: ABHI + aaj ke subject ---- */}
        <div className="hA-main">
          {d.cur ? (
            <section className={`hA-now${d.doneToday[d.cur.id] ? " is-done" : ""}${d.cur.life || d.cur.brk ? " is-life" : ""}`} style={{ "--sc": secOf(d.cur).c }}>
              <div className="hA-now__row">
                <span className="hA-now__tag">▶ ABHI · {d.cur.start}–{d.cur.end}</span>
                {!d.cur.life && <span className="hA-now__left">⏳ {hhmm(Math.max(0, d.cur.e - d.nowMin))} bacha</span>}
              </div>
              <h2 className="hA-now__t"><BlockName b={d.cur} /></h2>
              {d.cur.tg ? <p className="hA-now__tg">🎯 {d.cur.tg}</p> : null}
              <div className="hA-now__bar"><i style={{ width: `${Math.min(100, ((d.nowMin - d.cur.s) / Math.max(1, d.cur.e - d.cur.s)) * 100)}%` }} /></div>
              {!d.cur.life && !d.cur.brk && (
                <div className="hA-now__btns">
                  <Go b={d.cur} />
                  <button className="btn btn--ghost btn--sm" onClick={() => d.toggle(d.cur.id)}>
                    {d.doneToday[d.cur.id] ? "↩ Undo" : "✓ Ho gaya"}
                  </button>
                </div>
              )}
              {d.next ? <p className="hA-now__next">Agla <b>{d.next.start}</b> · {splitTitle(d.next)[0]}</p> : null}
            </section>
          ) : (
            <section className="hA-now is-life"><h2 className="hA-now__t">Abhi koi block nahi</h2>{d.next && <p className="hA-now__next">Agla <b>{d.next.start}</b> · {splitTitle(d.next)[0]}</p>}</section>
          )}

          <h3 className="hA-h">📚 Aaj ke topic</h3>
          <div className="hA-subs">
            {subs.map((s) => (
              <article key={s.k} className="hA-sub" style={{ "--sc": s.c }}>
                <div className="hA-sub__hd"><span className="hA-sub__ic">{s.icon}</span>{s.label}{s.b && d.doneToday[s.b.id] ? <span className="hA-sub__ok">✓</span> : null}</div>
                <p className="hA-sub__t">{s.t}</p>
                <div className="hA-sub__ft">
                  {s.b ? <span className="hA-sub__tg">{s.b.start} · {s.b.tg}</span> : null}
                  <Go b={s.b} />
                </div>
              </article>
            ))}
          </div>
        </div>

        {/* ---- Daayen: CORE 5, streak, target ---- */}
        <aside className="hA-side">
          <section className="hA-card">
            <div className="hA-card__hd">
              <span>🔒 CORE 5</span>
              <span className="hA-ring" style={{ "--p": (d.stats.coreDone / Math.max(1, d.stats.coreTotal)) * 100 }}>
                <b>{d.stats.coreDone}/{d.stats.coreTotal}</b>
              </span>
            </div>
            {d.core.map((b) => (
              <div key={b.id} className={`hA-chk${d.doneToday[b.id] ? " is-on" : ""}`}>
                <Tick ok={!!d.doneToday[b.id]} onClick={() => d.toggle(b.id)} />
                <span className="hA-chk__t"><span className="hA-chk__time">{b.start}</span>{splitTitle(b)[0]}{b.gate ? " 🔒" : ""}</span>
              </div>
            ))}
            <p className="hA-note">{d.dayOK ? "✓ Aaj ka din count ho gaya" : "🔒 GS ke 3 block ke bina din count nahi hota"}</p>
          </section>

          <section className="hA-card hA-stats">
            <div><b>🔥 {d.streak}</b><span>din ki streak</span></div>
            <div><b>🧠 {d.due.n}</b><span>cluster due</span></div>
            <div><b>🧩 {d.clusters}/{d.CLUSTER_TARGET}</b><span>naye cluster</span></div>
          </section>

          <section className="hA-card">
            <div className="hA-card__hd"><span>🎯 Percentile</span><span className="hA-dim">{d.lastPct ?? d.PCT_NOW} → {d.PCT_TARGET}</span></div>
            <div className="hA-meter"><i style={{ width: `${pctW}%` }} /><em style={{ left: `${d.PCT_TARGET}%` }} /></div>
            <div className="hA-sc">
              <span>FLOOR <b>{d.FLOOR.total}</b></span>
              <span>TARGET <b>{d.TARGET.total}</b></span>
              <span>Aakhri mock <b>{d.lastScore ?? "—"}</b></span>
            </div>
            <Link href="/mission/progress" className="hA-link">🚩 Checkpoints →</Link>
          </section>

          <div className="hA-quick">
            <Link href="/pyq/sprint" className="btn btn--primary">⚡ Sprint 100 Q</Link>
            <Link href={`/mission/plan?day=${d.dd}`} className="btn btn--ghost">📅 Poora din</Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
