"use client";

// 🅲 32 din ka Naksha — poora mission ek calendar-board: har din ek tile,
// phase ke rang mein, beete din ✓ / ✗, full mock wale din 📝, aaj ka din bada
// aur chamakta. Board ke neeche "Aaj" — teen subject ke bade card aur ABHI ki
// patli patti. Mission ka pura safar ek nazar mein, aaj uske beech mein.

import Link from "next/link";
import { Go, subjectsOf, splitTitle, secOf } from "./parts";
import { hhmm } from "./useMissionHome";

export default function HomeMap({ d }) {
  const subs = subjectsOf(d);
  const fmt = (iso) => { const [, mo, dd] = iso.split("-"); return `${+dd}/${+mo}`; };
  return (
    <div className="hC">
      <header className="hC-head">
        <h1>🚀 CGL Mission <span>· {d.N} din</span></h1>
        <div className="hC-legend">
          {d.phases.map((p) => <span key={p.k} style={{ "--pc": p.color }}><i />{p.name}</span>)}
          <span><i className="ok" />Poora</span><span><i className="miss" />Chhoota</span>
        </div>
        <span className="hC-exam">🎯 Exam <b>{d.toExam ?? "–"}</b> din mein</span>
      </header>

      <section className="hC-board">
        {d.days.map((x) => (
          <Link
            key={x.n}
            href={`/mission/plan?day=${x.n}`}
            className={`hC-day ph${x.phase}${x.today ? " is-today" : ""}${x.ok === true ? " is-ok" : ""}${x.ok === false ? " is-miss" : ""}${x.n > d.day ? " is-fut" : ""}`}
            title={x.topic}
          >
            <span className="hC-day__n">D{x.n}</span>
            <span className="hC-day__dt">{fmt(x.date)}</span>
            <span className="hC-day__st">{x.ok === true ? "✓" : x.ok === false ? "✗" : x.mock ? "📝" : ""}</span>
            {x.today ? <span className="hC-day__tp">{x.topic}</span> : null}
          </Link>
        ))}
        <div className="hC-day hC-examday"><span className="hC-day__n">🎯</span><span className="hC-day__dt">27/10</span><span className="hC-day__tp">EXAM</span></div>
      </section>

      {d.cur && !d.cur.life && !d.cur.brk ? (
        <section className="hC-now" style={{ "--sc": secOf(d.cur).c }}>
          <span className="hC-now__l">▶ ABHI</span>
          <span className="hC-now__time">{d.cur.start}–{d.cur.end}</span>
          <span className="hC-now__t">{splitTitle(d.cur)[0]}</span>
          <span className="hC-now__left">⏳ {hhmm(Math.max(0, d.cur.e - d.nowMin))}</span>
          <Go b={d.cur} />
          <button className="btn btn--ghost btn--sm" onClick={() => d.toggle(d.cur.id)}>{d.doneToday[d.cur.id] ? "↩" : "✓ Ho gaya"}</button>
        </section>
      ) : null}

      <h2 className="hC-h">Aaj · Day {d.day} <span>{d.plan && d.plan.type === "A" ? `· 📝 Full mock ${d.plan.fm}` : "· Sectional din"}</span></h2>
      <section className="hC-subs">
        {subs.map((s) => (
          <article key={s.k} className="hC-sub" style={{ "--sc": s.c }}>
            <span className="hC-sub__ic">{s.icon}</span>
            <span className="hC-sub__l">{s.label}</span>
            <p className="hC-sub__t">{s.t}</p>
            {s.b ? <p className="hC-sub__tg">{s.b.start} · {s.b.tg}</p> : null}
            <div className="hC-sub__go">
              <Go b={s.b} />
              {s.b && d.doneToday[s.b.id] ? <span className="hC-ok">✓ ho gaya</span> : null}
            </div>
          </article>
        ))}
      </section>

      <footer className="hC-foot">
        <span>🔒 CORE <b>{d.stats.coreDone}/{d.stats.coreTotal}</b></span>
        <span>🔥 <b>{d.streak}</b> din</span>
        <span>🧠 <b>{d.due.n}</b> cluster due</span>
        <span>🎯 Percentile <b>{d.lastPct ?? d.PCT_NOW}</b> → {d.PCT_TARGET}</span>
        <Link href="/pyq/sprint" className="btn btn--primary btn--sm">⚡ Sprint</Link>
      </footer>
    </div>
  );
}
