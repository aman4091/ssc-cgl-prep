"use client";

// Homepage roop J–N. Sab components/home/useMissionHome ka hi data padhte hain.

import Link from "next/link";
import { Go, Tick, subjectsOf, BlockName, splitTitle, secOf } from "./parts";
import { hhmm } from "./useMissionHome";

const isDone = (d, b) => !!(b && d.doneToday[b.id]);

// 🅻 Subah ki Khabar — Home ek akhbaar ka pehla panna: aaj ki headline, ek
// chhota lead paragraph, "Aaj ka schedule" column aur "Aankde" ka dabba.
export function HomeBrief({ d }) {
  const p = d.plan || {};
  const g = p.g ? p.g.t.split(":")[0] : "", m = p.m ? p.m.t : "", e = p.e ? p.e.t : "";
  const date = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  return (
    <div className="hL">
      <header className="hL-mast">
        <span>{date}</span>
        <h1>The CGL Times</h1>
        <span>Day {d.day} of {d.N} · Phase {d.phase.k}</span>
      </header>
      <section className="hL-lead">
        <p className="hL-kick">{p.type === "A" ? `Aaj FULL MOCK ${p.fm}` : "Aaj sectional ka din"} · exam {d.toExam} din door</p>
        <h2>{g}{m ? `, ${m}` : ""}{e ? ` aur ${e.split("+")[0].trim()}` : ""}</h2>
        <p className="hL-deck">
          {d.phase.t} Aaj ke {d.stats.coreTotal} CORE kaam mein se {d.stats.coreDone} ho chuke hain;
          {d.cur && !d.cur.life ? ` abhi ${splitTitle(d.cur)[0]} chal raha hai (${hhmm(Math.max(0, d.cur.e - d.nowMin))} bacha).` : " abhi koi padhai ka block nahi."}
        </p>
        {d.cur && !d.cur.life ? <div className="hL-go"><Go b={d.cur} /><button className="btn btn--ghost btn--sm" onClick={() => d.toggle(d.cur.id)}>{isDone(d, d.cur) ? "↩ Undo" : "✓ Ho gaya"}</button></div> : null}
      </section>
      <div className="hL-cols">
        <section className="hL-col">
          <h3>Aaj ka schedule</h3>
          {d.work.map((b) => (
            <div key={b.id} className={`hL-li${isDone(d, b) ? " is-ok" : ""}${d.cur && d.cur.id === b.id ? " is-now" : ""}`}>
              <Tick ok={isDone(d, b)} onClick={() => d.toggle(b.id)} />
              <span className="hL-time">{b.start}</span>
              <span>{splitTitle(b)[0]}</span>
            </div>
          ))}
        </section>
        <section className="hL-col">
          <h3>Aankde</h3>
          <dl className="hL-nums">
            <div><dt>Exam tak</dt><dd>{d.toExam} din</dd></div>
            <div><dt>CORE aaj</dt><dd>{d.stats.coreDone}/{d.stats.coreTotal}</dd></div>
            <div><dt>Streak</dt><dd>{d.streak} din</dd></div>
            <div><dt>Cluster due</dt><dd>{d.due.n}</dd></div>
            <div><dt>Naye cluster</dt><dd>{d.clusters}/{d.CLUSTER_TARGET}</dd></div>
            <div><dt>Percentile</dt><dd>{d.lastPct ?? d.PCT_NOW} → {d.PCT_TARGET}</dd></div>
            <div><dt>Full mock</dt><dd>{d.mocksDone}/{d.totalMocks}</dd></div>
          </dl>
          <h3>Kal</h3>
          {d.days[d.dd] ? <p className="hL-tmrw">D{d.dd + 1}: {d.days[d.dd].gT.split(":")[0]} · {d.days[d.dd].mT}</p> : <p className="hL-tmrw">EXAM 🎯</p>}
          <Link href="/mission/plan" className="hL-more">Poora plan →</Link>
        </section>
      </div>
    </div>
  );
}
