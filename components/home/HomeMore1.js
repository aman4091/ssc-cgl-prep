"use client";

// Homepage roop E–I. Sab components/home/useMissionHome ka hi data padhte hain.

import Link from "next/link";
import { Go, Tick, subjectsOf, BlockName, splitTitle, secOf } from "./parts";
import { hhmm } from "./useMissionHome";

const isDone = (d, b) => !!(b && d.doneToday[b.id]);

// 🅴 Scoreboard — stadium ka LED board: exam tak ke din/ghante, aaj ka score
// (CORE), har section ka TARGET vs FLOOR, aur aaj ke kaam "fixtures" ki tarah.
export function HomeScore({ d }) {
  const hrs = d.toExam != null ? d.toExam * 24 - Math.floor(d.nowMin / 60) : null;
  return (
    <div className="hE">
      <section className="hE-board">
        <div className="hE-cell"><span>DIN</span><b>{String(d.toExam ?? 0).padStart(2, "0")}</b></div>
        <div className="hE-cell"><span>GHANTE</span><b>{hrs ?? "–"}</b></div>
        <div className="hE-mid">
          <span className="hE-mid__t">SSC CGL 2026</span>
          <span className="hE-mid__s">DAY {d.day}/{d.N} · {d.phase.name}</span>
        </div>
        <div className="hE-cell"><span>CORE</span><b>{d.stats.coreDone}-{d.stats.coreTotal}</b></div>
        <div className="hE-cell"><span>STREAK</span><b>{d.streak}</b></div>
      </section>

      <section className="hE-secs">
        {d.SECTIONS.map((s) => {
          const t = d.TARGET[s.k], f = d.FLOOR[s.k];
          return (
            <div key={s.k} className="hE-sec">
              <span className="hE-sec__ic">{s.icon}</span>
              <span className="hE-sec__l">{s.label}</span>
              <div className="hE-sec__bar"><i style={{ width: `${(f / 50) * 100}%` }} /><em style={{ left: `${(t / 50) * 100}%` }} /></div>
              <span className="hE-sec__n">FLOOR <b>{f}</b> · TARGET <b>{t}</b> / 50</span>
            </div>
          );
        })}
      </section>

      <section className="hE-fix">
        <h3>🏟️ Aaj ke match</h3>
        {d.work.map((b) => {
          const now = d.cur && d.cur.id === b.id;
          return (
            <div key={b.id} className={`hE-row${now ? " is-now" : ""}${isDone(d, b) ? " is-ok" : ""}`} style={{ "--sc": secOf(b).c }}>
              <span className="hE-row__t">{b.start}</span>
              <span className="hE-row__n">{splitTitle(b)[0]}</span>
              <span className="hE-row__s">{isDone(d, b) ? "JEETA ✓" : now ? "LIVE ●" : b.e <= d.nowMin ? "CHHOOTA" : "AAGE"}</span>
              <Tick ok={isDone(d, b)} onClick={() => d.toggle(b.id)} />
            </div>
          );
        })}
      </section>
      {d.cur && !d.cur.life ? <div className="hE-go"><Go b={d.cur} /></div> : null}
    </div>
  );
}

// 🅸 Subject Hub — char khane: GS, Maths, English, Mock+Revision. Har khane
// mein aaj ka topic aur us subject ke aaj ke saare block.
export function HomeSubjects({ d }) {
  const subs = subjectsOf(d);
  const topic = { gs: subs.find((s) => s.k === "gs"), maths: subs.find((s) => s.k === "maths"), english: subs.find((s) => s.k === "english") };
  const Q = [
    { k: "gs", icon: "🌍", t: "GS", c: "#2f9e6e", secs: ["gs"], links: [["/pyq/war", "🎯 PYQ"], ["/mission/facts", "🧠 Fact log"]] },
    { k: "maths", icon: "🧮", t: "Maths", c: "#3b6cff", secs: ["maths"], links: [["/notes/brahmastra", "📐 Formula"], ["/pyq/sprint", "⚡ Sprint"]] },
    { k: "english", icon: "📘", t: "English", c: "#a855f7", secs: ["english", "reasoning"], links: [["/notes/goldenrules", "🏅 Rules"], ["/vocab", "🔤 Vocab"]] },
    { k: "mock", icon: "📝", t: "Mock + Revision", c: "#e5484d", secs: ["mock", "rev"], links: [["/mock-marks", "📊 Marks"], ["/mission/analysis", "🔍 Analysis"]] },
  ];
  return (
    <div className="hI">
      <p className="hI-top">Day <b>{d.day}</b>/{d.N} · {d.phase.name} · CORE <b>{d.stats.coreDone}/{d.stats.coreTotal}</b> · exam <b>{d.toExam}</b> din</p>
      <div className="hI-grid">
        {Q.map((q) => {
          const bl = d.work.filter((b) => q.secs.includes(b.sec));
          const tp = topic[q.k];
          return (
            <section key={q.k} className="hI-q" style={{ "--sc": q.c }}>
              <header><span className="hI-q__ic">{q.icon}</span><h2>{q.t}</h2><span className="hI-q__n">{bl.filter((b) => isDone(d, b)).length}/{bl.length}</span></header>
              {tp ? <p className="hI-q__tp">{tp.t}</p> : null}
              <ul>
                {bl.map((b) => (
                  <li key={b.id} className={`${isDone(d, b) ? "is-ok" : ""}${d.cur && d.cur.id === b.id ? " is-now" : ""}`}>
                    <Tick ok={isDone(d, b)} onClick={() => d.toggle(b.id)} />
                    <span className="hI-time">{b.start}</span>
                    <span className="hI-t">{splitTitle(b)[0]}</span>
                    {d.cur && d.cur.id === b.id ? <Go b={b} /> : null}
                  </li>
                ))}
              </ul>
              <div className="hI-links">{q.links.map(([h, l]) => <Link key={h} href={h}>{l}</Link>)}</div>
            </section>
          );
        })}
      </div>
      {d.cur ? <p className="hI-now">▶ Abhi: <b>{splitTitle(d.cur)[0]}</b> · {hhmm(Math.max(0, d.cur.e - d.nowMin))} bacha</p> : null}
    </div>
  );
}
